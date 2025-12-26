"""
API эндпоинты для управления коммерческими предложениями
/api/employee/quotes/*
/api/cabinet/quotes
"""
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response
from typing import Dict, Optional, List
from urllib.parse import quote as url_quote
from pydantic import BaseModel
import json

from auth import require_employee, require_auth
from database import QuoteDB, ClientDB, get_db

router = APIRouter(tags=["quotes"])


# --- Pydantic модели ---

class BulkDeleteRequest(BaseModel):
    ids: List[int]


# --- Эндпоинты для сотрудников ---

@router.get("/employee/quotes")
async def get_quotes(
    status: Optional[str] = None,
    client_id: Optional[int] = None,
    user: Dict = Depends(require_employee)
):
    """Получить все КП с информацией о менеджерах и клиентах"""
    with get_db() as conn:
        cursor = conn.cursor()

        query = '''
            SELECT q.*,
                   COALESCE(q.contact_name, c.contact_name, comp.name) as client_name,
                   c.company_name,
                   m.email as manager_email,
                   m.name as manager_name,
                   comp.name as company_legal_name,
                   comp.inn as company_inn
            FROM quotes q
            LEFT JOIN clients c ON q.client_id = c.id
            LEFT JOIN users m ON q.manager_id = m.id
            LEFT JOIN companies comp ON q.company_id = comp.id
            WHERE 1=1
        '''
        params = []

        if status:
            query += ' AND q.status = ?'
            params.append(status)
        if client_id:
            query += ' AND q.client_id = ?'
            params.append(client_id)

        query += ' ORDER BY q.created_at DESC'
        cursor.execute(query, params)

        quotes = []
        for row in cursor.fetchall():
            item = dict(row)
            item['services'] = json.loads(item['services_json']) if item.get('services_json') else []
            if 'services_json' in item:
                del item['services_json']
            quotes.append(item)

    return {"quotes": quotes}


@router.put("/employee/quotes/{quote_id}/status")
async def update_quote_status(
    quote_id: int,
    status: str,
    user: Dict = Depends(require_employee)
):
    """Обновить статус КП"""
    if status not in ['created', 'sent', 'accepted', 'rejected']:
        raise HTTPException(status_code=400, detail="Недопустимый статус")

    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute('SELECT * FROM quotes WHERE id = ?', (quote_id,))
        quote = cursor.fetchone()
        if not quote:
            raise HTTPException(status_code=404, detail="КП не найдено")

        cursor.execute(
            'UPDATE quotes SET status = ? WHERE id = ?',
            (status, quote_id)
        )

    return {"success": True, "status": status}


@router.get("/employee/quotes/{quote_id}/pdf")
async def download_quote_pdf(
    quote_id: int,
    user: Dict = Depends(require_employee)
):
    """Скачать PDF КП"""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute('SELECT * FROM quotes WHERE id = ?', (quote_id,))
        quote = cursor.fetchone()
        if not quote:
            raise HTTPException(status_code=404, detail="КП не найдено")
        quote = dict(quote)

        # Получаем данные компании
        company = None
        if quote.get('company_id'):
            cursor.execute('SELECT * FROM companies WHERE id = ?', (quote['company_id'],))
            company = cursor.fetchone()
            if company:
                company = dict(company)

        # Получаем данные клиента
        client = None
        if quote.get('client_id'):
            client = ClientDB.get_by_id(quote['client_id'])

    # Подготавливаем данные для PDF
    services = json.loads(quote['services_json']) if quote.get('services_json') else []

    client_info = {
        'inn': company.get('inn', '') if company else (client.get('inn', '') if client else ''),
        'kpp': company.get('kpp', '') if company else (client.get('kpp', '') if client else ''),
        'ogrn': company.get('ogrn', '') if company else (client.get('ogrn', '') if client else ''),
        'name': company.get('name', '') if company else (client.get('company_name', '') if client else ''),
        'address': company.get('address', '') if company else (client.get('address', '') if client else ''),
        'management_name': company.get('management_name', '') if company else (client.get('director_name', '') if client else ''),
        'management_post': company.get('management_post', 'Генеральный директор') if company else 'Генеральный директор',
        'contact_name': client.get('contact_name', '') if client else '',
        'contact_phone': client.get('contact_phone', '') if client else '',
        'contact_email': client.get('contact_email', '') if client else ''
    }

    # Генерируем PDF
    from document_generator import generate_quote_pdf
    contact_info = {
        'name': client_info.get('contact_name', ''),
        'phone': client_info.get('contact_phone', ''),
        'email': client_info.get('contact_email', '')
    }
    pdf_bytes = generate_quote_pdf(
        client_info=client_info,
        services=services,
        total_amount=quote.get('total_amount', 0),
        quote_id=quote['quote_number'],
        contact_info=contact_info
    )

    # URL-кодируем имя файла для кириллицы
    filename = f"КП_{quote['quote_number']}.pdf"
    filename_encoded = url_quote(filename)

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f"attachment; filename*=UTF-8''{filename_encoded}"
        }
    )


@router.delete("/employee/quotes/{quote_id}")
async def delete_quote(
    quote_id: int,
    user: Dict = Depends(require_employee)
):
    """Удалить одно КП"""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("DELETE FROM quotes WHERE id = ?", (quote_id,))
        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="КП не найдено")
    return {"success": True}


@router.post("/employee/quotes/bulk-delete")
async def bulk_delete_quotes(
    request: BulkDeleteRequest,
    user: Dict = Depends(require_employee)
):
    """Массовое удаление КП"""
    if not request.ids:
        raise HTTPException(status_code=400, detail="Не выбраны КП")
    
    with get_db() as conn:
        cursor = conn.cursor()
        placeholders = ",".join(["?"] * len(request.ids))
        cursor.execute(f"DELETE FROM quotes WHERE id IN ({placeholders})", request.ids)
        deleted_count = cursor.rowcount
    
    return {"success": True, "deleted_count": deleted_count}


# --- Эндпоинты для клиентов (личный кабинет) ---

@router.get("/cabinet/quotes")
async def get_user_quotes(user: Dict = Depends(require_auth)):
    """Получить все КП пользователя"""
    quotes = QuoteDB.get_by_user(user["id"])
    return {"quotes": quotes}
