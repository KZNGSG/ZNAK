"""
API эндпоинты для счетов
/api/employee/invoices/* - управление счетами сотрудниками
/api/invoices/* - публичные эндпоинты (PDF, email)
"""
from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks, Response
from pydantic import BaseModel
from typing import Dict, List, Optional
import json
import logging
from datetime import datetime, timedelta
from urllib.parse import quote

from auth import require_employee
from database import get_db, ClientDB, InteractionDB
from document_generator import generate_invoice_pdf
from email_service import send_email

router = APIRouter(tags=["invoices"])
logger = logging.getLogger(__name__)

# ======================== PYDANTIC MODELS ========================

class InvoiceCreateRequest(BaseModel):
    """Запрос на создание счёта"""
    contract_id: int
    description: str
    amount: float
    services: Optional[List[Dict]] = None
    due_date: Optional[str] = None  # YYYY-MM-DD
    is_additional: bool = True  # Дополнительный счёт к договору


class InvoiceUpdateRequest(BaseModel):
    """Обновление статуса счёта"""
    status: str  # created, sent, paid, cancelled


class InvoiceEmailRequest(BaseModel):
    email: str
    client_name: Optional[str] = None


class EmployeeInvoiceFullRequest(BaseModel):
    contract_id: int
    company: Dict = {}
    products: List[Dict] = []
    services: List[Dict] = []
    contact_name: Optional[str] = None
    contact_phone: Optional[str] = None
    contact_email: Optional[str] = None


class BulkDeleteRequest(BaseModel):
    ids: List[int]


# ======================== HELPER FUNCTIONS ========================

def get_next_invoice_number(contract_number: str = None, contract_id: int = None) -> str:
    """Генерирует следующий номер счёта в формате СЧ-{номер_договора}/{порядковый}"""
    
    if contract_number:
        # Убираем префикс DOG- если есть
        base_number = contract_number.replace('DOG-', '').replace('dog-', '')
        
        with get_db() as conn:
            cursor = conn.cursor()
            # Считаем сколько счетов уже есть по этому договору
            if contract_id:
                cursor.execute(
                    "SELECT COUNT(*) FROM invoices WHERE contract_id = ?",
                    (contract_id,)
                )
            else:
                cursor.execute(
                    "SELECT COUNT(*) FROM invoices WHERE invoice_number LIKE ?",
                    (f"СЧ-{base_number}/%",)
                )
            row = cursor.fetchone()
            next_num = (row[0] or 0) + 1
        
        return f"СЧ-{base_number}/{next_num}"
    else:
        # Fallback - старый формат если нет contract_number
        today = datetime.now()
        date_prefix = today.strftime("%y%m%d")
        
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute(
                "SELECT MAX(CAST(SUBSTR(invoice_number, -4) AS INTEGER)) FROM invoices WHERE invoice_number LIKE ?",
                (f"СЧ-{date_prefix}-%",)
            )
            row = cursor.fetchone()
            next_num = (row[0] or 0) + 1
        
        return f"СЧ-{date_prefix}-{next_num:04d}"


# ======================== INVOICE CRUD ENDPOINTS ========================

@router.post("/api/employee/invoices")
async def create_invoice(
    request: InvoiceCreateRequest,
    user: Dict = Depends(require_employee)
):
    """Создать счёт (основной или дополнительный к договору)"""
    
    # Получаем данные договора
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM contracts WHERE id = ?", (request.contract_id,))
        contract = cursor.fetchone()
        
        if not contract:
            raise HTTPException(status_code=404, detail="Договор не найден")
        
        contract = dict(contract)
    
    # Генерируем номер счёта
    invoice_number = get_next_invoice_number(contract['contract_number'], contract['id'])
    
    # Рассчитываем дату оплаты (по умолчанию +7 дней)
    if request.due_date:
        due_date = request.due_date
    else:
        due_date = (datetime.now() + timedelta(days=7)).strftime("%Y-%m-%d")
    
    # Сохраняем счёт
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO invoices (
                invoice_number, contract_id, company_id, amount,
                description, services_json, manager_id, due_date, is_additional, status
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            invoice_number,
            request.contract_id,
            contract["company_id"],
            request.amount,
            request.description,
            json.dumps(request.services, ensure_ascii=False) if request.services else None,
            user["id"],
            due_date,
            1 if request.is_additional else 0,
            "created"
        ))
        invoice_id = cursor.lastrowid
    
    logger.info(f"Invoice created: {invoice_number} for contract {contract['contract_number']}")
    
    return {
        "success": True,
        "invoice_id": invoice_id,
        "invoice_number": invoice_number
    }


@router.get("/api/employee/invoices")
async def get_invoices(
    contract_id: Optional[int] = None,
    status: Optional[str] = None,
    user: Dict = Depends(require_employee)
):
    """Получить список счетов"""
    
    with get_db() as conn:
        cursor = conn.cursor()
        
        query = """
            SELECT i.*, i.amount as total_amount,
                   c.contract_number,
                   comp.name as company_name,
                   comp.inn as company_inn,
                   m.email as manager_email
            FROM invoices i
            LEFT JOIN contracts c ON i.contract_id = c.id
            LEFT JOIN companies comp ON i.company_id = comp.id
            LEFT JOIN users m ON i.manager_id = m.id
            WHERE 1=1
        """
        params = []
        
        if contract_id:
            query += " AND i.contract_id = ?"
            params.append(contract_id)
        
        if status:
            query += " AND i.status = ?"
            params.append(status)
        
        query += " ORDER BY i.created_at DESC"
        
        cursor.execute(query, params)
        invoices = []
        for row in cursor.fetchall():
            item = dict(row)
            item["services"] = json.loads(item["services_json"]) if item.get("services_json") else []
            if "services_json" in item:
                del item["services_json"]
            invoices.append(item)
    
    return {"invoices": invoices}


@router.get("/api/employee/contracts/{contract_id}/invoices")
async def get_contract_invoices(
    contract_id: int,
    user: Dict = Depends(require_employee)
):
    """Получить все счета по договору"""
    
    with get_db() as conn:
        cursor = conn.cursor()
        
        # Получаем договор
        cursor.execute("""
            SELECT c.*, comp.name as company_name, comp.inn as company_inn
            FROM contracts c
            LEFT JOIN companies comp ON c.company_id = comp.id
            WHERE c.id = ?
        """, (contract_id,))
        contract = cursor.fetchone()
        
        if not contract:
            raise HTTPException(status_code=404, detail="Договор не найден")
        
        contract = dict(contract)
        contract["services"] = json.loads(contract["services_json"]) if contract.get("services_json") else []
        if "services_json" in contract:
            del contract["services_json"]
        
        # Получаем счета
        cursor.execute("""
            SELECT * FROM invoices 
            WHERE contract_id = ?
            ORDER BY created_at DESC
        """, (contract_id,))
        
        invoices = []
        total_invoiced = 0
        total_paid = 0
        
        for row in cursor.fetchall():
            item = dict(row)
            item["services"] = json.loads(item["services_json"]) if item.get("services_json") else []
            if "services_json" in item:
                del item["services_json"]
            invoices.append(item)
            total_invoiced += item["amount"]
            if item["status"] == "paid":
                total_paid += item["amount"]
    
    return {
        "contract": contract,
        "invoices": invoices,
        "summary": {
            "contract_amount": contract["total_amount"],
            "total_invoiced": total_invoiced,
            "total_paid": total_paid,
            "remaining": contract["total_amount"] - total_paid
        }
    }


@router.put("/api/employee/invoices/{invoice_id}/status")
async def update_invoice_status(
    invoice_id: int,
    request: InvoiceUpdateRequest,
    user: Dict = Depends(require_employee)
):
    """Обновить статус счёта"""
    
    with get_db() as conn:
        cursor = conn.cursor()
        
        # Получаем счёт
        cursor.execute("SELECT * FROM invoices WHERE id = ?", (invoice_id,))
        invoice = cursor.fetchone()
        
        if not invoice:
            raise HTTPException(status_code=404, detail="Счёт не найден")
        
        invoice = dict(invoice)
        old_status = invoice["status"]
        
        # Обновляем статус
        if request.status == "paid":
            cursor.execute("""
                UPDATE invoices SET status = ?, paid_at = ?
                WHERE id = ?
            """, (request.status, datetime.now().isoformat(), invoice_id))
            
            # Обновляем оплату в договоре
            cursor.execute("""
                SELECT SUM(amount) FROM invoices 
                WHERE contract_id = ? AND status = 'paid'
            """, (invoice["contract_id"],))
            total_paid = cursor.fetchone()[0] or 0
            
            # Получаем сумму договора
            cursor.execute("SELECT total_amount FROM contracts WHERE id = ?", (invoice["contract_id"],))
            contract_amount = cursor.fetchone()[0] or 0
            
            # Определяем статус оплаты
            if total_paid >= contract_amount:
                payment_status = "paid"
            elif total_paid > 0:
                payment_status = "partial"
            else:
                payment_status = "unpaid"
            
            # Обновляем договор
            cursor.execute("""
                UPDATE contracts SET paid_amount = ?, payment_status = ?
                WHERE id = ?
            """, (total_paid, payment_status, invoice["contract_id"]))
            
        else:
            cursor.execute("""
                UPDATE invoices SET status = ?
                WHERE id = ?
            """, (request.status, invoice_id))
    
    logger.info(f"Invoice {invoice_id} status changed: {old_status} -> {request.status}")
    
    return {
        "success": True,
        "old_status": old_status,
        "new_status": request.status
    }


@router.delete("/api/employee/invoices/{invoice_id}")
async def delete_invoice(
    invoice_id: int,
    user: Dict = Depends(require_employee)
):
    """Удалить счёт (только черновики)"""
    with get_db() as conn:
        cursor = conn.cursor()
        
        cursor.execute("SELECT status FROM invoices WHERE id = ?", (invoice_id,))
        invoice = cursor.fetchone()
        
        if not invoice:
            raise HTTPException(status_code=404, detail="Счёт не найден")
        
        if invoice["status"] not in ["created"]:
            raise HTTPException(status_code=400, detail="Можно удалить только черновики счетов")
        
        cursor.execute("DELETE FROM invoices WHERE id = ?", (invoice_id,))
    
    return {"success": True}


@router.post("/api/employee/invoices/bulk-delete")
async def bulk_delete_invoices(
    request: BulkDeleteRequest,
    user: Dict = Depends(require_employee)
):
    """Массовое удаление счетов"""
    if not request.ids:
        raise HTTPException(status_code=400, detail="Не выбраны счета")
    
    with get_db() as conn:
        cursor = conn.cursor()
        placeholders = ",".join(["?"] * len(request.ids))
        cursor.execute(f"DELETE FROM invoices WHERE id IN ({placeholders})", request.ids)
        deleted_count = cursor.rowcount
    
    return {"success": True, "deleted_count": deleted_count}


# ======================== INVOICE PDF & EMAIL ========================

@router.get("/api/invoices/{invoice_id}/pdf")
async def get_invoice_pdf(
    invoice_id: int,
    user: Dict = Depends(require_employee)
):
    """Сгенерировать PDF счёта"""
    # Get invoice data
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT i.*, c.contract_number, comp.name as company_name, comp.inn, comp.kpp, comp.address
            FROM invoices i
            LEFT JOIN contracts c ON i.contract_id = c.id
            LEFT JOIN companies comp ON i.company_id = comp.id
            WHERE i.id = ?
        """, (invoice_id,))
        invoice = cursor.fetchone()
        
        if not invoice:
            raise HTTPException(status_code=404, detail="Счёт не найден")
        invoice = dict(invoice)
    
    # Prepare client info
    client_info = {
        "name": invoice.get("company_name") or invoice.get("client_name") or "",
        "inn": invoice.get("inn") or "",
        "kpp": invoice.get("kpp") or "",
        "address": invoice.get("address") or "",
    }
    
    # Parse services
    services_json = invoice.get("services_json", "[]")
    services = json.loads(services_json) if services_json else []
    
    # Prepare services list
    services_list = []
    for s in services:
        qty = s.get("quantity", 1)
        price = s.get("price", 0)
        services_list.append({
            "name": s.get("name", ""),
            "quantity": qty,
            "unit": s.get("unit", "шт"),
            "price": price,
            "subtotal": qty * price
        })
    
    # Generate PDF
    pdf_bytes = generate_invoice_pdf(
        client_info=client_info,
        services=services_list,
        total_amount=invoice.get("amount", 0),
        invoice_number=invoice.get("invoice_number", str(invoice_id)),
        contract_number=invoice.get("contract_number"),
    )
    
    # Return PDF
    filename = f"Счёт_{invoice.get('invoice_number', invoice_id)}.pdf"
    filename_encoded = quote(filename, safe="")
    
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename*=UTF-8''{filename_encoded}"}
    )


@router.post("/api/invoices/{invoice_id}/send-email")
async def send_invoice_email(
    invoice_id: int,
    request: InvoiceEmailRequest,
    background_tasks: BackgroundTasks,
    user: Dict = Depends(require_employee)
):
    """Отправить счёт на email клиента"""
    # Get invoice data
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT i.*, c.contract_number, comp.name as company_name
            FROM invoices i
            LEFT JOIN contracts c ON i.contract_id = c.id
            LEFT JOIN companies comp ON i.company_id = comp.id
            WHERE i.id = ?
        """, (invoice_id,))
        invoice = cursor.fetchone()
        
        if not invoice:
            raise HTTPException(status_code=404, detail="Счёт не найден")
        invoice = dict(invoice)
    
    # Prepare email
    client_name = request.client_name or invoice.get("company_name") or invoice.get("client_name") or "Клиент"
    invoice_number = invoice.get("invoice_number") or f"#{invoice_id}"
    amount = invoice.get("amount", 0)
    contract_num = invoice.get("contract_number") or "N/A"
    
    subject = f"Счёт {invoice_number} от Про.Маркируй"
    body = f"""Здравствуйте, {client_name}!

Направляем вам счёт {invoice_number} на сумму {amount:,.0f} руб.

Счёт по договору: {contract_num}

Для оплаты используйте следующие реквизиты:
ИП Низамов Дамир Рустемович
ИНН: 165921962906
Расчётный счёт: 40802810200003471856
Банк: АО "ТИНЬКОФФ БАНК"
БИК: 044525974
К/с: 30101810145250000974

В назначении платежа укажите: Оплата по счёту {invoice_number}

С уважением,
Команда Про.Маркируй
https://promarkirui.ru
"""
    
    # Send email
    background_tasks.add_task(send_email, request.email, subject, body)
    
    # Log interaction
    try:
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT client_id FROM contracts WHERE id = ?", (invoice.get("contract_id"),))
            contract = cursor.fetchone()
            if contract:
                InteractionDB.create({
                    "client_id": contract["client_id"],
                    "manager_id": user["id"],
                    "type": "email_sent",
                    "subject": f"Отправлен счёт {invoice_number}",
                    "description": f"Счёт на {amount:,.0f} руб. отправлен на {request.email}"
                })
    except:
        pass
    
    return {"success": True, "message": f"Счёт отправлен на {request.email}"}


# ======================== INVOICE FULL CREATION ========================

@router.post("/api/employee/clients/{client_id}/invoice/full")
async def create_client_invoice_full(
    client_id: int,
    request: EmployeeInvoiceFullRequest,
    user: Dict = Depends(require_employee)
):
    """Создать счёт для клиента с выбором товаров/услуг"""
    client = ClientDB.get_by_id(client_id)
    if not client:
        raise HTTPException(status_code=404, detail="Клиент не найден")

    # Проверяем договор
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM contracts WHERE id = ?", (request.contract_id,))
        contract = cursor.fetchone()
        if not contract:
            raise HTTPException(status_code=404, detail="Договор не найден")
        contract = dict(contract)

    # Рассчитываем сумму услуг
    services_breakdown = []
    total_amount = 0

    for service in request.services:
        quantity = service.get('quantity', 1)
        price = service.get('price', 0)
        subtotal = price * quantity
        total_amount += subtotal

        services_breakdown.append({
            'id': service.get('id'),
            'name': service.get('name'),
            'description': service.get('description', ''),
            'price': price,
            'unit': service.get('unit', 'шт'),
            'quantity': quantity,
            'subtotal': subtotal
        })

    # Генерируем номер счёта
    invoice_number = get_next_invoice_number(contract['contract_number'], contract['id'])

    # Создаём счёт
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO invoices (
                invoice_number, contract_id, company_id, amount,
                status, description, services_json, manager_id, client_name
            ) VALUES (?, ?, ?, ?, 'created', ?, ?, ?, ?)
        """, (
            invoice_number,
            request.contract_id,
            contract.get('company_id'),
            total_amount,
            f'Счёт по договору {contract["contract_number"]}',
            json.dumps(services_breakdown, ensure_ascii=False),
            user['id'],
            client.get('company_name') or client.get('contact_name')
        ))
        invoice_id = cursor.lastrowid

    # Добавляем в историю
    InteractionDB.create({
        'client_id': client_id,
        'manager_id': user["id"],
        'type': 'invoice_created',
        'subject': f'Создан счёт {invoice_number}',
        'description': f'Сумма: {total_amount:,.0f} ₽. По договору {contract["contract_number"]}',
        'contract_id': request.contract_id
    })

    logger.info(f"Invoice created: {invoice_number} for client {client_id}")

    return {
        "success": True,
        "invoice_id": invoice_id,
        "invoice_number": invoice_number,
        "total_amount": total_amount,
        "services_breakdown": services_breakdown,
        "created_at": datetime.now().isoformat()
    }
