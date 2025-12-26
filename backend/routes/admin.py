"""
API эндпоинты для администраторов
/api/admin/* - административные функции
/api/superadmin/* - функции суперадминистратора
"""
from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks
from pydantic import BaseModel, EmailStr
from typing import Dict, List, Optional
import logging
from datetime import datetime, timedelta

from database import hash_password
import secrets
import string

def generate_random_password(length=12):
    """Генерация случайного пароля"""
    alphabet = string.ascii_letters + string.digits + "!@#$%^&*"
    return "".join(secrets.choice(alphabet) for _ in range(length))
from auth import (
    require_admin, require_superadmin, require_employee
    
)
from database import get_db, UserDB, PartnerDB
from education_db import EducationDB
from email_service import send_user_invitation_email, send_password_reset_email

router = APIRouter(tags=["admin"])
logger = logging.getLogger(__name__)

# ======================== PYDANTIC MODELS ========================

class UserCreateRequest(BaseModel):
    email: EmailStr
    role: str  # 'employee', 'admin', 'superadmin'
    name: Optional[str] = None
    send_invitation: bool = True


class UserUpdateRequest(BaseModel):
    email: Optional[EmailStr] = None
    role: Optional[str] = None
    name: Optional[str] = None
    is_active: Optional[bool] = None


class SettingUpdateRequest(BaseModel):
    value: str


class NotificationCreateRequest(BaseModel):
    title: str
    message: str
    type: str = "info"  # info, warning, success, error
    target_role: Optional[str] = None  # Если None - для всех


class NotificationUpdateRequest(BaseModel):
    title: Optional[str] = None
    message: Optional[str] = None
    type: Optional[str] = None
    is_active: Optional[bool] = None


class CallbackAssignRequest(BaseModel):
    manager_id: int


class CourseCreateRequest(BaseModel):
    title: str
    description: str
    category: Optional[str] = None


class CourseUpdateRequest(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    is_active: Optional[bool] = None


class ChapterCreateRequest(BaseModel):
    title: str
    content: str
    order_num: int
    video_url: Optional[str] = None


class ChapterUpdateRequest(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    order_num: Optional[int] = None
    video_url: Optional[str] = None


class GrantAccessRequest(BaseModel):
    partner_id: int
    course_id: int


class TelegramLeadUpdateRequest(BaseModel):
    status: Optional[str] = None
    notes: Optional[str] = None
    assigned_to: Optional[int] = None


class BroadcastRequest(BaseModel):
    message: str
    target_group: str = "all"  # all, active, inactive


# ======================== USER MANAGEMENT ========================

@router.get("/api/admin/users")
async def get_users(
    role: Optional[str] = None,
    current_user: Dict = Depends(require_admin)
):
    """Получить список пользователей"""
    users = UserDB.get_all()
    
    if role:
        users = [u for u in users if u.get('role') == role]
    
    # Скрываем пароли
    for user in users:
        if 'password' in user:
            del user['password']
    
    return {"users": users}


@router.post("/api/admin/users")
async def create_user(
    data: UserCreateRequest,
    background_tasks: BackgroundTasks,
    current_user: Dict = Depends(require_admin)
):
    """Создать пользователя"""
    
    # Проверяем существование email
    existing = UserDB.get_by_email(data.email)
    if existing:
        raise HTTPException(status_code=400, detail="Email уже используется")
    
    # Генерируем временный пароль
    temp_password = generate_random_password()
    hashed_password = hash_password(temp_password)
    
    # Создаём пользователя
    user_data = {
        "email": data.email,
        "password": hashed_password,
        "role": data.role,
        "name": data.name,
        "is_verified": 1 if data.send_invitation else 0,
        "is_active": 1
    }
    
    user_id = UserDB.create(user_data)
    
    # Отправляем приглашение
    if data.send_invitation:
        background_tasks.add_task(
            send_user_invitation_email,
            data.email,
            data.name or data.email,
            temp_password
        )
    
    logger.info(f"User created: {data.email} with role {data.role} by {current_user.get('email')}")
    
    return {
        "success": True,
        "user_id": user_id,
        "temp_password": temp_password if not data.send_invitation else None
    }


@router.post("/api/admin/users/{user_id}/send-invitation")
async def resend_user_invitation(
    user_id: int,
    background_tasks: BackgroundTasks,
    current_user: Dict = Depends(require_admin)
):
    """Повторно отправить приглашение пользователю"""
    user = UserDB.get_by_id(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="Пользователь не найден")
    
    # Генерируем новый временный пароль
    temp_password = generate_random_password()
    hashed_password = hash_password(temp_password)
    
    # Обновляем пароль
    UserDB.update(user_id, {"password": hashed_password})
    
    # Отправляем email
    background_tasks.add_task(
        send_user_invitation_email,
        user['email'],
        user.get('name') or user['email'],
        temp_password
    )
    
    logger.info(f"Invitation resent to user {user_id} by {current_user.get('email')}")
    
    return {"success": True, "message": "Приглашение отправлено"}


@router.put("/api/admin/users/{user_id}")
async def update_user(
    user_id: int,
    data: UserUpdateRequest,
    current_user: Dict = Depends(require_admin)
):
    """Обновить пользователя"""
    
    # Проверяем существование пользователя
    user = UserDB.get_by_id(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="Пользователь не найден")
    
    # Запрещаем редактировать собственную роль
    if user_id == current_user['id'] and data.role and data.role != user['role']:
        raise HTTPException(status_code=400, detail="Нельзя изменить собственную роль")
    
    # Обновляем данные
    update_data = data.dict(exclude_unset=True)
    success = UserDB.update(user_id, update_data)
    
    if not success:
        raise HTTPException(status_code=500, detail="Ошибка обновления")
    
    logger.info(f"User {user_id} updated by {current_user.get('email')}")
    
    return {"success": True}


@router.delete("/api/admin/users/{user_id}")
async def delete_user(
    user_id: int,
    current_user: Dict = Depends(require_admin)
):
    """Удалить пользователя"""
    
    # Запрещаем удалять себя
    if user_id == current_user['id']:
        raise HTTPException(status_code=400, detail="Нельзя удалить собственный аккаунт")
    
    user = UserDB.get_by_id(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="Пользователь не найден")
    
    success = UserDB.delete(user_id)
    if not success:
        raise HTTPException(status_code=500, detail="Ошибка удаления")
    
    logger.info(f"User {user_id} deleted by {current_user.get('email')}")
    
    return {"success": True}


# ======================== SUPERADMIN SETTINGS ========================

@router.get("/api/superadmin/settings")
async def get_settings(current_user: Dict = Depends(require_superadmin)):
    """Получить системные настройки"""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM settings")
        settings = {row['key']: row['value'] for row in cursor.fetchall()}
    
    return {"settings": settings}


@router.put("/api/superadmin/settings/{key}")
async def update_setting(
    key: str,
    data: SettingUpdateRequest,
    current_user: Dict = Depends(require_superadmin)
):
    """Обновить системную настройку"""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO settings (key, value, updated_at)
            VALUES (?, ?, ?)
            ON CONFLICT(key) DO UPDATE SET value = ?, updated_at = ?
        """, (key, data.value, datetime.now().isoformat(), data.value, datetime.now().isoformat()))
    
    logger.info(f"Setting {key} updated by {current_user.get('email')}")
    
    return {"success": True}


# ======================== NOTIFICATIONS ========================

@router.get("/api/superadmin/notifications")
async def get_notifications(current_user: Dict = Depends(require_superadmin)):
    """Получить список системных уведомлений"""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM notifications ORDER BY created_at DESC")
        notifications = [dict(row) for row in cursor.fetchall()]
    
    return {"notifications": notifications}


@router.post("/api/superadmin/notifications")
async def create_notification(
    data: NotificationCreateRequest,
    current_user: Dict = Depends(require_superadmin)
):
    """Создать системное уведомление"""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO notifications (title, message, type, target_role, created_by, is_active)
            VALUES (?, ?, ?, ?, ?, 1)
        """, (data.title, data.message, data.type, data.target_role, current_user['id']))
        notification_id = cursor.lastrowid
    
    logger.info(f"Notification created by {current_user.get('email')}")
    
    return {"success": True, "notification_id": notification_id}


@router.put("/api/superadmin/notifications/{notification_id}")
async def update_notification(
    notification_id: int,
    data: NotificationUpdateRequest,
    current_user: Dict = Depends(require_superadmin)
):
    """Обновить системное уведомление"""
    update_data = data.dict(exclude_unset=True)
    
    if not update_data:
        raise HTTPException(status_code=400, detail="Нет данных для обновления")
    
    with get_db() as conn:
        cursor = conn.cursor()
        
        # Формируем запрос обновления
        set_clause = ", ".join([f"{k} = ?" for k in update_data.keys()])
        values = list(update_data.values()) + [notification_id]
        
        cursor.execute(f"""
            UPDATE notifications SET {set_clause}, updated_at = ?
            WHERE id = ?
        """, values + [datetime.now().isoformat()])
        
        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Уведомление не найдено")
    
    return {"success": True}


@router.delete("/api/superadmin/notifications/{notification_id}")
async def delete_notification(
    notification_id: int,
    current_user: Dict = Depends(require_superadmin)
):
    """Удалить системное уведомление"""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("DELETE FROM notifications WHERE id = ?", (notification_id,))
        
        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Уведомление не найдено")
    
    return {"success": True}


# ======================== CALLBACK ASSIGNMENT ========================

@router.put("/api/superadmin/callbacks/{callback_id}/assign")
async def assign_callback(
    callback_id: int,
    data: CallbackAssignRequest,
    current_user: Dict = Depends(require_superadmin)
):
    """Назначить обработчика для обратного звонка"""
    with get_db() as conn:
        cursor = conn.cursor()
        
        # Проверяем существование callback
        cursor.execute("SELECT * FROM callbacks WHERE id = ?", (callback_id,))
        callback = cursor.fetchone()
        if not callback:
            raise HTTPException(status_code=404, detail="Обратный звонок не найден")
        
        # Проверяем существование менеджера
        cursor.execute("SELECT * FROM users WHERE id = ? AND role IN ('employee', 'admin')", (data.manager_id,))
        manager = cursor.fetchone()
        if not manager:
            raise HTTPException(status_code=404, detail="Менеджер не найден")
        
        # Назначаем
        cursor.execute("""
            UPDATE callbacks SET assigned_to = ?, status = 'assigned', updated_at = ?
            WHERE id = ?
        """, (data.manager_id, datetime.now().isoformat(), callback_id))
    
    logger.info(f"Callback {callback_id} assigned to {data.manager_id} by {current_user.get('email')}")
    
    return {"success": True}


# ======================== EDUCATION MANAGEMENT ========================

@router.get("/api/admin/education/stats")
async def get_education_stats(user: Dict = Depends(require_admin)):
    """Статистика по обучению"""
    with get_db() as conn:
        stats = EducationDB.get_education_stats(conn)
        # Добавляем дополнительные поля для совместимости с фронтендом
        stats['partners_in_progress'] = stats.get('partners_learning', 0)
        stats['certificates_issued'] = stats.get('partners_completed', 0)
        stats['avg_completion_rate'] = stats.get('average_progress', 0)
        return stats


@router.get("/api/admin/education/progress")
async def get_partners_progress(
    course_id: Optional[int] = None,
    user: Dict = Depends(require_admin)
):
    """Получить прогресс партнёров по курсам"""
    with get_db() as conn:
        cursor = conn.cursor()
        
        query = """
            SELECT 
                p.id, p.contact_name, p.contact_email,
                c.id as course_id, c.title as course_title,
                COUNT(ch.id) as total_chapters,
                SUM(CASE WHEN cp.status = 'completed' THEN 1 ELSE 0 END) as completed_chapters,
                ROUND(CAST(SUM(CASE WHEN cp.status = 'completed' THEN 1 ELSE 0 END) AS FLOAT) / COUNT(ch.id) * 100, 2) as progress_percent
            FROM partners p
            INNER JOIN partner_course_access pca ON p.id = pca.partner_id
            INNER JOIN courses c ON pca.course_id = c.id
            LEFT JOIN chapters ch ON c.id = ch.course_id
            LEFT JOIN chapter_progress cp ON ch.id = cp.chapter_id AND p.id = cp.partner_id
        """
        
        params = []
        if course_id:
            query += " WHERE c.id = ?"
            params.append(course_id)
        
        query += " GROUP BY p.id, c.id ORDER BY p.contact_name, c.title"
        
        cursor.execute(query, params)
        progress = [dict(row) for row in cursor.fetchall()]
        
        return {"progress": progress}


@router.get("/api/admin/education/courses")
async def get_courses(user: Dict = Depends(require_admin)):
    """Получить список курсов"""
    with get_db() as conn:
        courses = EducationDB.get_all_courses(conn)
        return {"courses": courses}


@router.post("/api/admin/education/courses")
async def create_course(data: CourseCreateRequest, user: Dict = Depends(require_admin)):
    """Создать курс"""
    with get_db() as conn:
        course_id = EducationDB.create_course(conn, data.dict())
        logger.info(f"Course created: {data.title}")
        return {"success": True, "course_id": course_id}


@router.put("/api/admin/education/courses/{course_id}")
async def update_course(
    course_id: int,
    data: CourseUpdateRequest,
    user: Dict = Depends(require_admin)
):
    """Обновить курс"""
    with get_db() as conn:
        success = EducationDB.update_course(conn, course_id, data.dict(exclude_unset=True))
        if not success:
            raise HTTPException(status_code=404, detail="Курс не найден")
        return {"success": True}


@router.delete("/api/admin/education/courses/{course_id}")
async def delete_course(course_id: int, user: Dict = Depends(require_admin)):
    """Удалить курс"""
    with get_db() as conn:
        success = EducationDB.delete_course(conn, course_id)
        if not success:
            raise HTTPException(status_code=404, detail="Курс не найден")
        return {"success": True}


@router.get("/api/admin/education/courses/{course_id}/chapters")
async def get_course_chapters(course_id: int, user: Dict = Depends(require_admin)):
    """Получить главы курса"""
    with get_db() as conn:
        chapters = EducationDB.get_course_chapters(conn, course_id)
        return {"chapters": chapters}


@router.post("/api/admin/education/courses/{course_id}/chapters")
async def create_chapter(
    course_id: int,
    data: ChapterCreateRequest,
    user: Dict = Depends(require_admin)
):
    """Создать главу курса"""
    with get_db() as conn:
        chapter_data = data.dict()
        chapter_data['course_id'] = course_id
        chapter_id = EducationDB.create_chapter(conn, chapter_data)
        return {"success": True, "chapter_id": chapter_id}


@router.put("/api/admin/education/chapters/{chapter_id}")
async def update_chapter(
    chapter_id: int,
    data: ChapterUpdateRequest,
    user: Dict = Depends(require_admin)
):
    """Обновить главу"""
    with get_db() as conn:
        success = EducationDB.update_chapter(conn, chapter_id, data.dict(exclude_unset=True))
        if not success:
            raise HTTPException(status_code=404, detail="Глава не найдена")
        return {"success": True}


@router.delete("/api/admin/education/chapters/{chapter_id}")
async def delete_chapter(chapter_id: int, user: Dict = Depends(require_admin)):
    """Удалить главу"""
    with get_db() as conn:
        success = EducationDB.delete_chapter(conn, chapter_id)
        if not success:
            raise HTTPException(status_code=404, detail="Глава не найдена")
        return {"success": True}


@router.post("/api/admin/education/grant-access")
async def grant_course_access(data: GrantAccessRequest, user: Dict = Depends(require_admin)):
    """Предоставить доступ к курсу"""
    with get_db() as conn:
        success = EducationDB.grant_access(conn, data.partner_id, data.course_id)
        if not success:
            raise HTTPException(status_code=400, detail="Ошибка предоставления доступа")
        return {"success": True}


@router.delete("/api/admin/education/access/{partner_id}/{course_id}")
async def revoke_course_access(
    partner_id: int,
    course_id: int,
    user: Dict = Depends(require_admin)
):
    """Отозвать доступ к курсу"""
    with get_db() as conn:
        success = EducationDB.revoke_access(conn, partner_id, course_id)
        if not success:
            raise HTTPException(status_code=404, detail="Доступ не найден")
        return {"success": True}


@router.get("/api/admin/education/courses/{course_id}/access")
async def get_course_access(course_id: int, user: Dict = Depends(require_admin)):
    """Получить список партнёров с доступом к курсу"""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT p.*, pca.granted_at
            FROM partners p
            INNER JOIN partner_course_access pca ON p.id = pca.partner_id
            WHERE pca.course_id = ?
            ORDER BY pca.granted_at DESC
        """, (course_id,))
        partners = [dict(row) for row in cursor.fetchall()]
        return {"partners": partners}


@router.post("/api/admin/education/courses/{course_id}/grant-all")
async def grant_course_to_all(course_id: int, user: Dict = Depends(require_admin)):
    """Предоставить доступ к курсу всем активным партнёрам"""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT id FROM partners WHERE status = 'active'")
        partners = cursor.fetchall()
        
        count = 0
        for partner in partners:
            try:
                EducationDB.grant_access(conn, partner['id'], course_id)
                count += 1
            except:
                pass
        
        return {"success": True, "granted_count": count}


# ======================== TELEGRAM LEADS ========================

@router.get("/api/admin/telegram-leads")
async def get_telegram_leads(
    status: Optional[str] = None,
    user: Dict = Depends(require_admin)
):
    """Получить лиды из Telegram"""
    with get_db() as conn:
        cursor = conn.cursor()
        
        query = "SELECT * FROM telegram_leads WHERE 1=1"
        params = []
        
        if status:
            query += " AND status = ?"
            params.append(status)
        
        query += " ORDER BY created_at DESC"
        
        cursor.execute(query, params)
        leads = [dict(row) for row in cursor.fetchall()]
        
        return {"leads": leads}


@router.get("/api/admin/telegram-leads/{lead_id}")
async def get_telegram_lead(lead_id: int, user: Dict = Depends(require_admin)):
    """Получить лид из Telegram"""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM telegram_leads WHERE id = ?", (lead_id,))
        lead = cursor.fetchone()
        
        if not lead:
            raise HTTPException(status_code=404, detail="Лид не найден")
        
        return dict(lead)


@router.put("/api/admin/telegram-leads/{lead_id}")
async def update_telegram_lead(
    lead_id: int,
    data: TelegramLeadUpdateRequest,
    user: Dict = Depends(require_admin)
):
    """Обновить лид из Telegram"""
    update_data = data.dict(exclude_unset=True)
    
    if not update_data:
        raise HTTPException(status_code=400, detail="Нет данных для обновления")
    
    with get_db() as conn:
        cursor = conn.cursor()
        
        set_clause = ", ".join([f"{k} = ?" for k in update_data.keys()])
        values = list(update_data.values()) + [datetime.now().isoformat(), lead_id]
        
        cursor.execute(f"""
            UPDATE telegram_leads SET {set_clause}, updated_at = ?
            WHERE id = ?
        """, values)
        
        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Лид не найден")
    
    return {"success": True}


@router.delete("/api/admin/telegram-leads/{lead_id}")
async def delete_telegram_lead(lead_id: int, user: Dict = Depends(require_admin)):
    """Удалить лид из Telegram"""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("DELETE FROM telegram_leads WHERE id = ?", (lead_id,))
        
        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Лид не найден")
    
    return {"success": True}


@router.post("/api/admin/telegram-broadcast")
async def send_telegram_broadcast(
    data: BroadcastRequest,
    background_tasks: BackgroundTasks,
    user: Dict = Depends(require_admin)
):
    """Отправить массовое сообщение в Telegram"""
    from telegram_bot import send_broadcast_message
    
    background_tasks.add_task(
        send_broadcast_message,
        data.message,
        data.target_group
    )
    
    logger.info(f"Telegram broadcast initiated by {user.get('email')}")
    
    return {"success": True, "message": "Рассылка запущена"}


@router.get("/api/admin/telegram-stats")
async def get_telegram_stats(user: Dict = Depends(require_admin)):
    """Получить статистику Telegram бота"""
    with get_db() as conn:
        cursor = conn.cursor()
        
        # Общее количество пользователей
        cursor.execute("SELECT COUNT(*) FROM telegram_users")
        total_users = cursor.fetchone()[0]
        
        # Активные пользователи (были активны за последние 30 дней)
        cursor.execute("""
            SELECT COUNT(*) FROM telegram_users 
            WHERE last_activity > datetime('now', '-30 days')
        """)
        active_users = cursor.fetchone()[0]
        
        # Лиды
        cursor.execute("SELECT COUNT(*) FROM telegram_leads WHERE status = 'new'")
        new_leads = cursor.fetchone()[0]
        
        cursor.execute("SELECT COUNT(*) FROM telegram_leads WHERE status = 'contacted'")
        contacted_leads = cursor.fetchone()[0]
        
        return {
            "total_users": total_users,
            "active_users": active_users,
            "new_leads": new_leads,
            "contacted_leads": contacted_leads
        }
