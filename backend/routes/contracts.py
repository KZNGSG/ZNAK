"""
API эндпоинты для управления договорами
/api/employee/contracts/*
/api/cabinet/contracts
"""
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response
from typing import Dict, Optional, List
from urllib.parse import quote as url_quote
from pydantic import BaseModel
import json

from auth import require_employee, require_auth
from database import ContractDB, ClientDB, get_db

router = APIRouter(tags=["contracts"])


# --- Pydantic модели ---

class BulkDeleteRequest(BaseModel):
    ids: List[int]


# --- Эндпоинты для сотрудников ---

@router.get("/employee/contracts")
async def get_contracts(
    status: Optional[str] = None,
    client_id: Optional[int] = None,
    user: Dict = Depends(require_employee)
):
    """Получить все договоры с информацией о менеджерах и клиентах"""
    with get_db() as conn:
        cursor = conn.cursor()

        query = '''
            SELECT ct.*,
                   c.contact_name as client_name,
                   c.company_name,
                   m.email as manager_email,
                   comp.name as company_legal_name,
                   comp.inn as company_inn,
                   q.quote_number,
                   (SELECT COUNT(*) FROM invoices WHERE contract_id = ct.id AND deleted_at IS NULL) as invoices_count,
                   (SELECT COALESCE(SUM(amount), 0) FROM invoices WHERE contract_id = ct.id AND deleted_at IS NULL) as invoices_total,
                   (SELECT COALESCE(SUM(amount), 0) FROM invoices WHERE contract_id = ct.id AND status = 'paid' AND deleted_at IS NULL) as invoices_paid
            FROM contracts ct
            LEFT JOIN clients c ON ct.client_id = c.id
            LEFT JOIN users m ON ct.manager_id = m.id
            LEFT JOIN companies comp ON ct.company_id = comp.id
            LEFT JOIN quotes q ON ct.quote_id = q.id
            WHERE 1=1
        '''
        params = []

        if status:
            query += ' AND ct.status = ?'
            params.append(status)
        if client_id:
            query += ' AND ct.client_id = ?'
            params.append(client_id)

        query += ' ORDER BY ct.created_at DESC'
        cursor.execute(query, params)

        contracts = []
        for row in cursor.fetchall():
            item = dict(row)
            item['services'] = json.loads(item['services_json']) if item.get('services_json') else []
            if 'services_json' in item:
                del item['services_json']
            contracts.append(item)

    return {"contracts": contracts}


@router.put("/employee/contracts/{contract_id}/status")
async def update_contract_status(
    contract_id: int,
    status: str,
    user: Dict = Depends(require_employee)
):
    """Обновить статус договора"""
    if status not in ['draft', 'sent', 'signed', 'active', 'completed', 'cancelled']:
        raise HTTPException(status_code=400, detail="Недопустимый статус")

    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute('SELECT * FROM contracts WHERE id = ?', (contract_id,))
        contract = cursor.fetchone()
        if not contract:
            raise HTTPException(status_code=404, detail="Договор не найден")

        cursor.execute(
            'UPDATE contracts SET status = ? WHERE id = ?',
            (status, contract_id)
        )

    return {"success": True, "status": status}


@router.get("/employee/contracts/{contract_id}/pdf")
async def download_contract_pdf(
    contract_id: int,
    user: Dict = Depends(require_employee)
):
    """Скачать PDF договора"""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute('SELECT * FROM contracts WHERE id = ?', (contract_id,))
        contract = cursor.fetchone()
        if not contract:
            raise HTTPException(status_code=404, detail="Договор не найден")
        contract = dict(contract)

        # Получаем данные компании
        cursor.execute('SELECT * FROM companies WHERE id = ?', (contract['company_id'],))
        company = cursor.fetchone()
        if not company:
            raise HTTPException(status_code=404, detail="Компания не найдена")
        company = dict(company)

        # Получаем данные клиента если есть
        client = None
        if contract.get('client_id'):
            client = ClientDB.get_by_id(contract['client_id'])

    # Подготавливаем данные для PDF
    services = json.loads(contract['services_json']) if contract.get('services_json') else []

    client_info = {
        'inn': company.get('inn') or '',
        'kpp': company.get('kpp') or '',
        'ogrn': company.get('ogrn') or '',
        'name': company.get('name') or '',
        'address': company.get('address') or '',
        'management_name': company.get('management_name') or (client.get('director_name') if client else None) or None,
        'management_post': company.get('management_post') or 'Генеральный директор',
        'contact_name': (client.get('contact_name') if client else None) or '',
        'contact_phone': (client.get('contact_phone') if client else None) or '',
        'contact_email': (client.get('contact_email') if client else None) or ''
    }

    # Генерируем PDF
    from document_generator import generate_contract_pdf
    pdf_bytes = generate_contract_pdf(
        client_info=client_info,
        services=services,
        total_amount=contract['total_amount'],
        contract_number=contract['contract_number']
    )

    # URL-кодируем имя файла для кириллицы
    filename = f"Договор_{contract['contract_number']}.pdf"
    filename_encoded = url_quote(filename)

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f"attachment; filename*=UTF-8''{filename_encoded}"
        }
    )


@router.delete("/employee/contracts/{contract_id}")
async def delete_contract(
    contract_id: int,
    user: Dict = Depends(require_employee)
):
    """Удалить один договор"""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("DELETE FROM contracts WHERE id = ?", (contract_id,))
        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Договор не найден")
    return {"success": True}


@router.post("/employee/contracts/bulk-delete")
async def bulk_delete_contracts(
    request: BulkDeleteRequest,
    user: Dict = Depends(require_employee)
):
    """Массовое удаление договоров"""
    if not request.ids:
        raise HTTPException(status_code=400, detail="Не выбраны договоры")
    
    with get_db() as conn:
        cursor = conn.cursor()
        placeholders = ",".join(["?"] * len(request.ids))
        cursor.execute(f"DELETE FROM contracts WHERE id IN ({placeholders})", request.ids)
        deleted_count = cursor.rowcount
    
    return {"success": True, "deleted_count": deleted_count}


# --- Эндпоинты для клиентов (личный кабинет) ---

@router.get("/cabinet/contracts")
async def get_user_contracts(user: Dict = Depends(require_auth)):
    """Получить все договоры пользователя"""
    contracts = ContractDB.get_by_user(user["id"])
    return {"contracts": contracts}
