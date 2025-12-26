"""
API эндпоинты для управления клиентами
/api/employee/clients/*
"""
from fastapi import APIRouter, Depends, HTTPException
from typing import Dict, Optional, List
from pydantic import BaseModel

from auth import require_employee
from database import ClientDB, InteractionDB, get_db

router = APIRouter(tags=["clients"])


# --- Pydantic модели ---

class ClientCreate(BaseModel):
    contact_name: str
    contact_phone: str
    contact_email: Optional[str] = None
    contact_position: Optional[str] = None
    company_name: Optional[str] = None
    company_type: Optional[str] = None  # LEGAL или INDIVIDUAL
    inn: Optional[str] = None
    kpp: Optional[str] = None
    ogrn: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    director_name: Optional[str] = None  # ФИО генерального директора
    comment: Optional[str] = None
    source: Optional[str] = "manual"
    status: Optional[str] = "lead"
    products: Optional[List[Dict]] = []


class ClientUpdate(BaseModel):
    contact_name: Optional[str] = None
    contact_phone: Optional[str] = None
    contact_email: Optional[str] = None
    contact_position: Optional[str] = None
    company_name: Optional[str] = None
    company_type: Optional[str] = None
    inn: Optional[str] = None
    kpp: Optional[str] = None
    ogrn: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    director_name: Optional[str] = None
    comment: Optional[str] = None
    status: Optional[str] = None
    products: Optional[List[Dict]] = None


class InteractionCreate(BaseModel):
    type: str  # call, email, meeting, document_sent, note
    subject: Optional[str] = None
    description: Optional[str] = None


class BulkDeleteRequest(BaseModel):
    ids: List[int]


# --- CRUD операции с клиентами ---

@router.get("/clients")
async def get_clients(
    status: Optional[str] = None,
    search: Optional[str] = None,
    user: Dict = Depends(require_employee)
):
    """
    Получить клиентов с статистикой по КП и договорам.
    """
    if search:
        clients = ClientDB.search(search)
    else:
        clients = ClientDB.get_all(status=status)

    # Добавляем статистику по КП и договорам для каждого клиента
    with get_db() as conn:
        cursor = conn.cursor()
        for client in clients:
            client_id = client['id']

            # Количество и сумма КП
            cursor.execute('''
                SELECT COUNT(*) as count, COALESCE(SUM(total_amount), 0) as total
                FROM quotes WHERE client_id = ?
            ''', (client_id,))
            quotes_stats = cursor.fetchone()
            client['quotes_count'] = quotes_stats['count'] if quotes_stats else 0
            client['quotes_total'] = quotes_stats['total'] if quotes_stats else 0

            # Количество и сумма договоров
            cursor.execute('''
                SELECT COUNT(*) as count, COALESCE(SUM(total_amount), 0) as total
                FROM contracts WHERE client_id = ?
            ''', (client_id,))
            contracts_stats = cursor.fetchone()
            client['contracts_count'] = contracts_stats['count'] if contracts_stats else 0
            client['contracts_total'] = contracts_stats['total'] if contracts_stats else 0

            # Менеджер
            if client.get('assigned_manager_id'):
                cursor.execute('SELECT email, name FROM users WHERE id = ?', (client['assigned_manager_id'],))
                manager = cursor.fetchone()
                if manager:
                    client['manager_name'] = manager['name'] or manager['email'].split('@')[0]
                    client['manager_email'] = manager['email']

            # Количество задач
            cursor.execute("SELECT COUNT(*) as cnt FROM tasks WHERE client_id = ? AND status != 'completed'", (client_id,))
            tasks_row = cursor.fetchone()
            client["tasks_count"] = tasks_row["cnt"] if tasks_row else 0

    return {"clients": clients}


@router.get("/clients/check-duplicate")
async def check_duplicate(
    phone: str = None,
    email: str = None,
    inn: str = None,
    user: Dict = Depends(require_employee)
):
    """Проверить есть ли клиент с таким телефоном/email/ИНН"""
    duplicates = []
    
    with get_db() as conn:
        cursor = conn.cursor()
        
        if phone and len(phone) >= 5:
            # Очищаем телефон от форматирования для поиска
            clean_phone = ''.join(filter(str.isdigit, phone))
            if len(clean_phone) >= 5:
                cursor.execute('''
                    SELECT id, contact_name, company_name, contact_phone, contact_email
                    FROM clients 
                    WHERE REPLACE(REPLACE(REPLACE(REPLACE(contact_phone, ' ', ''), '-', ''), '(', ''), ')', '') LIKE ?
                    LIMIT 5
                ''', (f'%{clean_phone[-10:]}%',))
                for row in cursor.fetchall():
                    duplicates.append({
                        "id": row["id"],
                        "name": row["contact_name"],
                        "company": row["company_name"],
                        "phone": row["contact_phone"],
                        "email": row["contact_email"],
                        "match_type": "phone"
                    })
        
        if email and len(email) >= 3 and '@' in email:
            cursor.execute('''
                SELECT id, contact_name, company_name, contact_phone, contact_email
                FROM clients 
                WHERE LOWER(contact_email) = LOWER(?)
                LIMIT 5
            ''', (email,))
            for row in cursor.fetchall():
                if not any(d["id"] == row["id"] for d in duplicates):
                    duplicates.append({
                        "id": row["id"],
                        "name": row["contact_name"],
                        "company": row["company_name"],
                        "phone": row["contact_phone"],
                        "email": row["contact_email"],
                        "match_type": "email"
                    })
        
        if inn and len(inn) >= 10:
            cursor.execute('''
                SELECT id, contact_name, company_name, contact_phone, contact_email, inn
                FROM clients 
                WHERE inn = ?
                LIMIT 5
            ''', (inn,))
            for row in cursor.fetchall():
                if not any(d["id"] == row["id"] for d in duplicates):
                    duplicates.append({
                        "id": row["id"],
                        "name": row["contact_name"],
                        "company": row["company_name"],
                        "phone": row["contact_phone"],
                        "email": row["contact_email"],
                        "match_type": "inn"
                    })
    
    return {
        "has_duplicates": len(duplicates) > 0,
        "duplicates": duplicates
    }


@router.post("/clients")
async def create_client(
    data: ClientCreate,
    user: Dict = Depends(require_employee)
):
    """Создать нового клиента"""
    client_id = ClientDB.create(data.model_dump(), user["id"])

    # Добавляем запись в историю
    InteractionDB.create({
        'client_id': client_id,
        'manager_id': user["id"],
        'type': 'note',
        'subject': 'Клиент создан',
        'description': f'Клиент создан вручную. Источник: {data.source}'
    })

    return {"success": True, "client_id": client_id}


@router.get("/clients/{client_id}")
async def get_client(
    client_id: int,
    user: Dict = Depends(require_employee)
):
    """Получить клиента по ID с историей"""
    client = ClientDB.get_by_id(client_id)
    if not client:
        raise HTTPException(status_code=404, detail="Клиент не найден")

    # Получаем историю взаимодействий
    history = InteractionDB.get_by_client(client_id)

    # Получаем документы клиента (КП, договоры)
    with get_db() as conn:
        cursor = conn.cursor()

        # КП
        cursor.execute('''
            SELECT id, quote_number, total_amount, status, created_at
            FROM quotes WHERE client_id = ?
            ORDER BY created_at DESC
        ''', (client_id,))
        quotes = [dict(row) for row in cursor.fetchall()]

        # Договоры
        cursor.execute('''
            SELECT id, contract_number, total_amount, status, created_at
            FROM contracts WHERE client_id = ?
            ORDER BY created_at DESC
        ''', (client_id,))
        contracts = [dict(row) for row in cursor.fetchall()]

    return {
        **client,
        "history": history,
        "quotes": quotes,
        "contracts": contracts
    }


@router.put("/clients/{client_id}")
async def update_client(
    client_id: int,
    data: ClientUpdate,
    user: Dict = Depends(require_employee)
):
    """Обновить клиента"""
    # Фильтруем None значения
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}

    if not update_data:
        raise HTTPException(status_code=400, detail="Нет данных для обновления")

    success = ClientDB.update(client_id, update_data)
    if not success:
        raise HTTPException(status_code=404, detail="Клиент не найден")

    # Логируем изменение статуса
    if 'status' in update_data:
        InteractionDB.create({
            'client_id': client_id,
            'manager_id': user["id"],
            'type': 'note',
            'subject': 'Статус изменён',
            'description': f'Новый статус: {update_data["status"]}'
        })

    return {"success": True}


@router.delete("/clients/{client_id}")
async def delete_client(
    client_id: int,
    user: Dict = Depends(require_employee)
):
    """Удалить клиента"""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("DELETE FROM clients WHERE id = ?", (client_id,))
        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Клиент не найден")
    return {"success": True}


@router.post("/clients/bulk-delete")
async def bulk_delete_clients(
    request: BulkDeleteRequest,
    user: Dict = Depends(require_employee)
):
    """Массовое удаление клиентов"""
    if not request.ids:
        raise HTTPException(status_code=400, detail="Не выбраны клиенты")
    
    with get_db() as conn:
        cursor = conn.cursor()
        placeholders = ",".join(["?"] * len(request.ids))
        cursor.execute(f"DELETE FROM clients WHERE id IN ({placeholders})", request.ids)
        deleted_count = cursor.rowcount
    
    return {"success": True, "deleted_count": deleted_count}


# --- История взаимодействий ---

@router.get("/clients/{client_id}/history")
async def get_client_history(
    client_id: int,
    user: Dict = Depends(require_employee)
):
    """Получить историю взаимодействий с клиентом"""
    history = InteractionDB.get_by_client(client_id)
    return {"history": history}


@router.post("/clients/{client_id}/history")
async def add_interaction(
    client_id: int,
    data: InteractionCreate,
    user: Dict = Depends(require_employee)
):
    """Добавить запись в историю взаимодействий"""
    # Проверяем существование клиента
    client = ClientDB.get_by_id(client_id)
    if not client:
        raise HTTPException(status_code=404, detail="Клиент не найден")

    interaction_id = InteractionDB.create({
        'client_id': client_id,
        'manager_id': user["id"],
        'type': data.type,
        'subject': data.subject,
        'description': data.description
    })

    return {"success": True, "interaction_id": interaction_id}
