"""
API эндпоинты для управления заявками (callbacks)
/api/employee/callbacks/* - эндпоинты для менеджеров  
/api/admin/callbacks/* - эндпоинты для администраторов
"""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional, List, Dict
import json
import logging

# Import auth dependencies
from auth import require_employee, require_admin
from database import CallbackDB, CallbackDBExtended, CallbackSLADB, get_db

logger = logging.getLogger(__name__)

# ======================== ROUTER ========================
router = APIRouter(prefix="/api", tags=["callbacks"])

# ======================== PYDANTIC MODELS ========================

class BulkDeleteRequest(BaseModel):
    ids: List[int]

# ======================== ENDPOINTS ========================

# --- Admin Callbacks ---
@router.get("/admin/callbacks")
async def api_admin_get_callbacks(user: Dict = Depends(require_admin)):
    """Получить все заявки на звонок (админка)"""
    callbacks = CallbackDB.get_all()
    return callbacks


@router.put("/admin/callbacks/{callback_id}")
async def api_admin_update_callback(
    callback_id: int,
    data: Dict,
    user: Dict = Depends(require_admin)
):
    """Обновить статус заявки"""
    status = data.get("status")
    if status:
        CallbackDB.update_status(callback_id, status)
    return {"success": True}


@router.delete("/admin/callbacks/{callback_id}")
async def api_admin_delete_callback(
    callback_id: int,
    user: Dict = Depends(require_admin)
):
    """Удалить заявку (только для админов)"""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute('DELETE FROM callbacks WHERE id = ?', (callback_id,))
        conn.commit()
        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Заявка не найдена")
    return {"success": True, "message": "Заявка удалена"}


# --- Employee Callbacks ---
@router.get("/employee/callbacks")
async def api_employee_get_callbacks(
    status: Optional[str] = None,
    period: Optional[str] = None,
    user: Dict = Depends(require_employee)
):
    """Получить все заявки с фильтрацией по периоду"""
    with get_db() as conn:
        cursor = conn.cursor()
        query = '''
            SELECT cb.*, u.email as assigned_email, c.contact_name as client_name
            FROM callbacks cb
            LEFT JOIN users u ON cb.assigned_to = u.id
            LEFT JOIN clients c ON cb.client_id = c.id
            WHERE 1=1
        '''
        params = []

        if status:
            query += ' AND cb.status = ?'
            params.append(status)

        # Фильтр по периоду
        if period == 'today':
            query += " AND date(cb.created_at, 'localtime') = date('now', 'localtime')"
        elif period == 'week':
            query += " AND cb.created_at >= datetime('now', '-7 days', 'localtime')"
        elif period == 'month':
            query += " AND cb.created_at >= datetime('now', '-30 days', 'localtime')"

        query += ' ORDER BY cb.created_at DESC'
        cursor.execute(query, params)

        results = []
        for row in cursor.fetchall():
            item = dict(row)
            item['products'] = json.loads(item['products_json']) if item.get('products_json') else []
            if 'products_json' in item:
                del item['products_json']
            results.append(item)

    return {"callbacks": results}


@router.get("/employee/callbacks/overdue")
async def api_get_overdue_callbacks(user: Dict = Depends(require_employee)):
    """Получить просроченные заявки"""
    # Superadmin видит все, employee только свои
    if user['role'] == 'superadmin':
        callbacks = CallbackSLADB.get_overdue()
    else:
        callbacks = CallbackSLADB.get_overdue(assigned_to=user['id'])
    return {"callbacks": callbacks, "count": len(callbacks)}


@router.get("/employee/callbacks/{callback_id}")
async def api_employee_get_callback(
    callback_id: int,
    user: Dict = Depends(require_employee)
):
    """Получить заявку по ID"""
    callback = CallbackDBExtended.get_by_id(callback_id)
    if not callback:
        raise HTTPException(status_code=404, detail="Заявка не найдена")
    return callback


@router.put("/employee/callbacks/{callback_id}/assign")
async def api_employee_assign_callback(
    callback_id: int,
    user: Dict = Depends(require_employee)
):
    """Взять заявку в работу"""
    success = CallbackDBExtended.assign_to(callback_id, user["id"])
    if not success:
        raise HTTPException(status_code=404, detail="Заявка не найдена")
    return {"success": True, "message": "Заявка взята в работу"}


@router.put("/employee/callbacks/{callback_id}/status")
async def api_employee_update_callback_status(
    callback_id: int,
    status: str,
    user: Dict = Depends(require_employee)
):
    """Обновить статус заявки"""
    if status not in ['new', 'processing', 'completed', 'cancelled']:
        raise HTTPException(status_code=400, detail="Недопустимый статус")
    CallbackDB.update_status(callback_id, status)
    return {"success": True}


@router.put("/employee/callbacks/{callback_id}/comment")
async def api_employee_update_callback_comment(
    callback_id: int,
    data: dict,
    user: Dict = Depends(require_employee)
):
    """Обновить комментарий заявки"""
    comment = data.get('comment', '')
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(
            'UPDATE callbacks SET comment = ? WHERE id = ?',
            (comment, callback_id)
        )
        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Заявка не найдена")
    return {"success": True}


@router.delete("/employee/callbacks/{callback_id}")
async def api_employee_delete_callback(
    callback_id: int,
    user: Dict = Depends(require_employee)
):
    """Удалить одну заявку"""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("DELETE FROM callbacks WHERE id = ?", (callback_id,))
        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Заявка не найдена")
    return {"success": True}


@router.post("/employee/callbacks/bulk-delete")
async def api_employee_bulk_delete_callbacks(
    request: BulkDeleteRequest,
    user: Dict = Depends(require_employee)
):
    """Массовое удаление заявок"""
    if not request.ids:
        raise HTTPException(status_code=400, detail="Не выбраны заявки")
    with get_db() as conn:
        cursor = conn.cursor()
        placeholders = ",".join(["?"] * len(request.ids))
        cursor.execute(f"DELETE FROM callbacks WHERE id IN ({placeholders})", request.ids)
        deleted_count = cursor.rowcount
    return {"success": True, "deleted_count": deleted_count}
