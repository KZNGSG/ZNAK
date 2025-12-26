"""
API эндпоинты для партнёров
/api/employee/partners/* - управление партнёрами сотрудниками
/api/partner/* - кабинет партнёра
/api/ref/* - реферальные ссылки
"""
from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks
from pydantic import BaseModel
from typing import Dict, List, Optional
import logging
from datetime import datetime

from auth import require_employee, require_partner, require_admin
from database import get_db, PartnerDB
from education_db import EducationDB

router = APIRouter(tags=["partners"])
logger = logging.getLogger(__name__)

# ======================== PYDANTIC MODELS ========================

class PartnerCreateRequest(BaseModel):
    partner_type: str  # 'legal' or 'individual'
    contact_name: str
    contact_phone: str
    contact_email: str
    company_name: Optional[str] = None
    inn: Optional[str] = None
    commission_rate: float = 10.0


class PartnerUpdateRequest(BaseModel):
    partner_type: Optional[str] = None
    contact_name: Optional[str] = None
    contact_phone: Optional[str] = None
    contact_email: Optional[str] = None
    company_name: Optional[str] = None
    inn: Optional[str] = None
    commission_rate: Optional[float] = None
    status: Optional[str] = None


class CommissionUpdateRequest(BaseModel):
    commission_rate: float
    notify_partner: bool = False
    reason: Optional[str] = None


class InviteAcceptRequest(BaseModel):
    token: str
    password: str


class SubmitTestRequest(BaseModel):
    answers: Dict


# ======================== EMPLOYEE PARTNER MANAGEMENT ========================

@router.get("/api/employee/partners")
async def get_partners(status: Optional[str] = None, current_user: dict = Depends(require_employee)):
    """Получить список партнёров"""
    partners = PartnerDB.get_all(status)

    # Подсчитываем статистику
    total = len(partners)
    active = sum(1 for p in partners if p.get('status') == 'active')
    pending = sum(1 for p in partners if p.get('status') == 'pending')

    return {
        "partners": partners,
        "stats": {
            "total": total,
            "active": active,
            "pending": pending
        }
    }


@router.post("/api/employee/partners")
async def create_partner(data: PartnerCreateRequest, current_user: dict = Depends(require_employee)):
    """Создать партнёра"""
    try:
        result = PartnerDB.create(data.dict(), created_by=current_user.get('id'))
        return {
            "success": True,
            "partner_id": result['id'],
            "ref_code": result['ref_code'],
            "password": result['password']
        }
    except Exception as e:
        logger.error(f"Failed to create partner: {e}")
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/api/employee/partners/{partner_id}")
async def get_partner(partner_id: int, current_user: dict = Depends(require_employee)):
    """Получить партнёра по ID"""
    partner = PartnerDB.get_by_id(partner_id)
    if not partner:
        raise HTTPException(status_code=404, detail="Partner not found")
    return partner


@router.put("/api/employee/partners/{partner_id}")
async def update_partner(partner_id: int, data: PartnerUpdateRequest, current_user: dict = Depends(require_employee)):
    """Обновить партнёра"""
    success = PartnerDB.update(partner_id, data.dict(exclude_unset=True))
    if not success:
        raise HTTPException(status_code=404, detail="Partner not found")
    return {"success": True}


@router.post("/api/employee/partners/{partner_id}/activate")
async def activate_partner(partner_id: int, current_user: dict = Depends(require_employee)):
    """Активировать партнёра"""
    success = PartnerDB.update(partner_id, {"status": "active"})
    if not success:
        raise HTTPException(status_code=404, detail="Partner not found")
    return {"success": True}


@router.post("/api/employee/partners/{partner_id}/deactivate")
async def deactivate_partner(partner_id: int, current_user: dict = Depends(require_employee)):
    """Деактивировать партнёра"""
    success = PartnerDB.update(partner_id, {"status": "inactive"})
    if not success:
        raise HTTPException(status_code=404, detail="Partner not found")
    return {"success": True}


@router.post("/api/employee/partners/{partner_id}/invite")
async def send_partner_invite(
    partner_id: int,
    background_tasks: BackgroundTasks,
    current_user: dict = Depends(require_employee)
):
    """Отправить приглашение партнёру"""
    partner = PartnerDB.get_by_id(partner_id)
    if not partner:
        raise HTTPException(status_code=404, detail="Partner not found")
    
    email = partner.get('contact_email')
    if not email:
        raise HTTPException(status_code=400, detail="У партнёра нет email")
    
    # Генерация токена приглашения
    from email_service import generate_invite_token, send_partner_invite_email
    token = generate_invite_token(partner_id)
    
    # Сохраняем токен
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            UPDATE partners SET invite_token = ?, invite_token_created = ? 
            WHERE id = ?
        """, (token, datetime.now().isoformat(), partner_id))
    
    # Отправляем email в фоне
    background_tasks.add_task(
        send_partner_invite_email,
        email,
        partner.get('contact_name', 'Партнёр'),
        token
    )
    
    logger.info(f"Invite sent to partner {partner_id}")
    return {"success": True, "message": f"Приглашение отправлено на {email}"}


@router.delete("/api/employee/partners/{partner_id}")
async def delete_partner_employee(partner_id: int, current_user: dict = Depends(require_employee)):
    """Удалить партнёра (сотрудник)"""
    success = PartnerDB.delete(partner_id)
    if not success:
        raise HTTPException(status_code=404, detail="Partner not found")
    return {"success": True}


@router.put("/api/employee/partners/{partner_id}/commission")
async def update_partner_commission(
    partner_id: int, 
    data: CommissionUpdateRequest, 
    background_tasks: BackgroundTasks,
    current_user: dict = Depends(require_employee)
):
    """Обновить комиссию партнёра с опциональным уведомлением"""
    
    # Получаем текущие данные партнёра
    partner = PartnerDB.get_by_id(partner_id)
    if not partner:
        raise HTTPException(status_code=404, detail="Partner not found")
    
    old_rate = partner.get('commission_rate', 1.0)
    new_rate = data.commission_rate
    
    # Валидация
    if new_rate < 0 or new_rate > 100:
        raise HTTPException(status_code=400, detail="Комиссия должна быть от 0 до 100%")
    
    # Обновляем комиссию
    success = PartnerDB.update(partner_id, {'commission_rate': new_rate})
    if not success:
        raise HTTPException(status_code=500, detail="Ошибка обновления")
    
    # Логируем изменение
    logger.info(f"Commission changed for partner {partner_id}: {old_rate}% -> {new_rate}% by {current_user.get('email')}")
    
    # Отправляем уведомление если нужно
    if data.notify_partner and partner.get('contact_email'):
        try:
            from email_service import send_commission_change_notification
            background_tasks.add_task(
                send_commission_change_notification,
                to_email=partner['contact_email'],
                contact_name=partner.get('contact_name', 'Партнёр'),
                old_rate=old_rate,
                new_rate=new_rate,
                reason=data.reason
            )
        except Exception as e:
            logger.error(f"Failed to send commission notification: {e}")
    
    return {
        "success": True,
        "old_rate": old_rate,
        "new_rate": new_rate,
        "notified": data.notify_partner
    }


# ======================== ADMIN PARTNER MANAGEMENT ========================

@router.delete("/api/admin/partners/{partner_id}")
async def delete_partner_admin(partner_id: int, current_user: dict = Depends(require_admin)):
    """Удалить партнёра (администратор)"""
    success = PartnerDB.delete(partner_id)
    if not success:
        raise HTTPException(status_code=404, detail="Partner not found")
    return {"success": True}


# ======================== PARTNER PORTAL ========================

@router.get("/api/partner/me")
async def get_partner_profile(user: Dict = Depends(require_partner)):
    """Получить профиль партнёра"""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM partners WHERE user_id = ?", (user['id'],))
        partner = cursor.fetchone()
        if not partner:
            raise HTTPException(status_code=404, detail="Партнёр не найден")
        return dict(partner)


@router.get("/api/partner/stats")
async def get_partner_stats(user: Dict = Depends(require_partner)):
    """Получить статистику партнёра"""
    with get_db() as conn:
        cursor = conn.cursor()
        
        # Получаем partner_id
        cursor.execute("SELECT id, ref_code FROM partners WHERE user_id = ?", (user['id'],))
        partner = cursor.fetchone()
        if not partner:
            raise HTTPException(status_code=404, detail="Партнёр не найден")
        
        partner_id = partner['id']
        ref_code = partner['ref_code']
        
        # Статистика по лидам
        cursor.execute("SELECT COUNT(*) FROM clients WHERE ref_code = ?", (ref_code,))
        total_leads = cursor.fetchone()[0]
        
        # Статистика по конверсии
        cursor.execute("""
            SELECT COUNT(*) FROM clients c
            INNER JOIN contracts ct ON c.id = ct.client_id
            WHERE c.ref_code = ?
        """, (ref_code,))
        converted = cursor.fetchone()[0]
        
        # Статистика по выручке
        cursor.execute("""
            SELECT COALESCE(SUM(ct.total_amount), 0) FROM clients c
            INNER JOIN contracts ct ON c.id = ct.client_id
            WHERE c.ref_code = ?
        """, (ref_code,))
        total_revenue = cursor.fetchone()[0]
        
        # Статистика по комиссии
        cursor.execute("SELECT commission_rate FROM partners WHERE id = ?", (partner_id,))
        commission_rate = cursor.fetchone()[0] or 0
        
        earned_commission = total_revenue * (commission_rate / 100)
        
        return {
            "total_leads": total_leads,
            "converted": converted,
            "conversion_rate": round((converted / total_leads * 100) if total_leads > 0 else 0, 2),
            "total_revenue": total_revenue,
            "commission_rate": commission_rate,
            "earned_commission": earned_commission
        }


@router.get("/api/partner/leads")
async def get_partner_leads(user: Dict = Depends(require_partner)):
    """Получить список лидов партнёра"""
    with get_db() as conn:
        cursor = conn.cursor()
        
        cursor.execute("SELECT ref_code FROM partners WHERE user_id = ?", (user['id'],))
        partner = cursor.fetchone()
        if not partner:
            raise HTTPException(status_code=404, detail="Партнёр не найден")
        
        ref_code = partner['ref_code']
        
        # Получаем лидов
        cursor.execute("""
            SELECT 
                c.id, c.company_name, c.contact_name, c.contact_phone, c.contact_email,
                c.created_at, c.status,
                COUNT(DISTINCT ct.id) as contracts_count,
                COALESCE(SUM(ct.total_amount), 0) as total_revenue
            FROM clients c
            LEFT JOIN contracts ct ON c.id = ct.client_id
            WHERE c.ref_code = ?
            GROUP BY c.id
            ORDER BY c.created_at DESC
        """, (ref_code,))
        
        leads = [dict(row) for row in cursor.fetchall()]
        
        return {"leads": leads}


# ======================== REFERRAL SYSTEM ========================

@router.get("/api/ref/{ref_code}")
async def process_referral_link(ref_code: str):
    """Обработать переход по реферальной ссылке"""
    with get_db() as conn:
        cursor = conn.cursor()
        
        # Проверяем существование партнёра
        cursor.execute("SELECT id, contact_name, status FROM partners WHERE ref_code = ?", (ref_code,))
        partner = cursor.fetchone()
        
        if not partner:
            raise HTTPException(status_code=404, detail="Неверная реферальная ссылка")
        
        if partner['status'] != 'active':
            raise HTTPException(status_code=400, detail="Партнёр неактивен")
        
        # Увеличиваем счётчик кликов
        cursor.execute("""
            UPDATE partners SET referral_clicks = referral_clicks + 1
            WHERE id = ?
        """, (partner['id'],))
        
        logger.info(f"Referral link clicked: {ref_code}")
        
        return {
            "success": True,
            "ref_code": ref_code,
            "partner_name": partner['contact_name'],
            "redirect_url": "https://promarkirui.ru/request?ref=" + ref_code
        }


# ======================== PARTNER INVITE SYSTEM ========================

@router.get("/api/partner/invite/{token}")
async def get_invite_info(token: str):
    """Получить информацию о приглашении"""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT id, contact_name, contact_email, status
            FROM partners 
            WHERE invite_token = ?
        """, (token,))
        partner = cursor.fetchone()
        
        if not partner:
            raise HTTPException(status_code=404, detail="Неверный токен приглашения")
        
        return {
            "name": partner['contact_name'],
            "email": partner['contact_email'],
            "status": partner['status']
        }


@router.post("/api/partner/accept-invite")
async def accept_partner_invite(request: InviteAcceptRequest):
    """Принять приглашение партнёра"""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM partners WHERE invite_token = ?", (request.token,))
        partner = cursor.fetchone()
        
        if not partner:
            raise HTTPException(status_code=404, detail="Неверный токен приглашения")
        
        partner = dict(partner)
        
        # Создаём пользователя для партнёра
        from database import hash_password
        
        hashed_password = hash_password(request.password)
        cursor.execute("""
            INSERT INTO users (email, password, role, is_verified)
            VALUES (?, ?, 'partner', 1)
        """, (partner['contact_email'], hashed_password))
        user_id = cursor.lastrowid
        
        # Связываем партнёра с пользователем
        cursor.execute("""
            UPDATE partners 
            SET user_id = ?, status = 'active', invite_token = NULL
            WHERE id = ?
        """, (user_id, partner['id']))
    
    logger.info(f"Partner {partner['id']} accepted invite")
    return {"success": True, "message": "Приглашение принято"}


# ======================== PARTNER EDUCATION ========================

@router.get("/api/partner/courses")
async def get_partner_courses(user: Dict = Depends(require_partner)):
    """Получить курсы для партнёра"""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute('SELECT id FROM partners WHERE user_id = ?', (user['id'],))
        partner_row = cursor.fetchone()
        if not partner_row:
            raise HTTPException(status_code=404, detail="Партнёр не найден")
        
        partner_id = partner_row['id']
        courses = EducationDB.get_partner_courses(conn, partner_id)
        
        return {"courses": courses}


@router.get("/api/partner/courses/{course_id}")
async def get_partner_course_details(course_id: int, user: Dict = Depends(require_partner)):
    """Получить детали курса для партнёра"""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute('SELECT id FROM partners WHERE user_id = ?', (user['id'],))
        partner_row = cursor.fetchone()
        if not partner_row:
            raise HTTPException(status_code=404, detail="Партнёр не найден")
        
        partner_id = partner_row['id']
        course = EducationDB.get_course_with_progress(conn, course_id, partner_id)
        
        if not course:
            raise HTTPException(status_code=404, detail="Курс не найден")
        
        return course


@router.post("/api/partner/chapters/{chapter_id}/start")
async def start_chapter(chapter_id: int, user: Dict = Depends(require_partner)):
    """Начать главу курса"""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute('SELECT id FROM partners WHERE user_id = ?', (user['id'],))
        partner_row = cursor.fetchone()
        if not partner_row:
            raise HTTPException(status_code=404, detail="Партнёр не найден")
        
        partner_id = partner_row['id']
        
        # Проверяем доступ к главе
        cursor.execute("""
            SELECT c.id FROM chapters c
            INNER JOIN courses co ON c.course_id = co.id
            INNER JOIN partner_course_access pca ON co.id = pca.course_id
            WHERE c.id = ? AND pca.partner_id = ?
        """, (chapter_id, partner_id))
        
        if not cursor.fetchone():
            raise HTTPException(status_code=403, detail="Нет доступа к этой главе")
        
        # Создаём или обновляем прогресс
        cursor.execute("""
            INSERT INTO chapter_progress (partner_id, chapter_id, status, started_at)
            VALUES (?, ?, 'in_progress', ?)
            ON CONFLICT(partner_id, chapter_id) DO UPDATE SET
                status = 'in_progress',
                started_at = COALESCE(started_at, ?)
        """, (partner_id, chapter_id, datetime.now().isoformat(), datetime.now().isoformat()))
        
        return {"success": True}


@router.post("/api/partner/chapters/{chapter_id}/video-progress")
async def update_video_progress(
    chapter_id: int,
    request: Dict,
    user: Dict = Depends(require_partner)
):
    """Обновить прогресс просмотра видео"""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute('SELECT id FROM partners WHERE user_id = ?', (user['id'],))
        partner_row = cursor.fetchone()
        if not partner_row:
            raise HTTPException(status_code=404, detail="Партнёр не найден")
        
        partner_id = partner_row['id']
        progress_percent = request.get('progress_percent', 0)
        
        # Обновляем прогресс
        cursor.execute("""
            UPDATE chapter_progress 
            SET video_progress = ?, updated_at = ?
            WHERE partner_id = ? AND chapter_id = ?
        """, (progress_percent, datetime.now().isoformat(), partner_id, chapter_id))
        
        # Если видео просмотрено на 90%+, отмечаем как завершённое
        if progress_percent >= 90:
            cursor.execute("""
                UPDATE chapter_progress 
                SET video_watched = 1, status = 'completed'
                WHERE partner_id = ? AND chapter_id = ?
            """, (partner_id, chapter_id))
        
        return {"success": True}


@router.get("/api/partner/chapters/{chapter_id}/test")
async def get_chapter_test(chapter_id: int, user: Dict = Depends(require_partner)):
    """Получить тест главы"""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute('SELECT id FROM partners WHERE user_id = ?', (user['id'],))
        partner_row = cursor.fetchone()
        if not partner_row:
            raise HTTPException(status_code=404, detail="Партнёр не найден")
        
        partner_id = partner_row['id']
        
        # Проверяем доступ
        cursor.execute("""
            SELECT t.* FROM tests t
            INNER JOIN chapters c ON t.chapter_id = c.id
            INNER JOIN courses co ON c.course_id = co.id
            INNER JOIN partner_course_access pca ON co.id = pca.course_id
            WHERE t.chapter_id = ? AND pca.partner_id = ?
        """, (chapter_id, partner_id))
        
        test = cursor.fetchone()
        if not test:
            raise HTTPException(status_code=404, detail="Тест не найден")
        
        test = dict(test)
        
        # Получаем вопросы
        cursor.execute("""
            SELECT id, question_text, question_type, options_json
            FROM test_questions
            WHERE test_id = ?
            ORDER BY order_num
        """, (test['id'],))
        
        import json
        questions = []
        for row in cursor.fetchall():
            q = dict(row)
            q['options'] = json.loads(q.get('options_json', '[]'))
            del q['options_json']
            questions.append(q)
        
        test['questions'] = questions
        
        return test


@router.post("/api/partner/tests/{test_id}/submit")
async def submit_test(
    test_id: int,
    request: SubmitTestRequest,
    user: Dict = Depends(require_partner)
):
    """Сдать тест"""
    import json as json_lib
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute('SELECT id FROM partners WHERE user_id = ?', (user['id'],))
        partner_row = cursor.fetchone()
        if not partner_row:
            raise HTTPException(status_code=404, detail="Партнёр не найден")
        partner_id = partner_row['id']

        result = EducationDB.submit_test(
            conn,
            partner_id,
            test_id,
            json_lib.dumps(request.answers)
        )

        if result and 'error' in result:
            raise HTTPException(status_code=400, detail=result['error'])

        return result


@router.get("/api/partner/courses/{course_id}/certificate")
async def get_certificate_status(course_id: int, user: Dict = Depends(require_partner)):
    """Получить статус сертификата"""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute('SELECT id, contact_name FROM partners WHERE user_id = ?', (user['id'],))
        partner = cursor.fetchone()
        if not partner:
            raise HTTPException(status_code=404, detail="Партнёр не найден")
        
        partner_id = partner['id']
        
        # Проверяем прогресс курса
        cursor.execute("""
            SELECT COUNT(*) as total, SUM(CASE WHEN cp.status = 'completed' THEN 1 ELSE 0 END) as completed
            FROM chapters c
            LEFT JOIN chapter_progress cp ON c.id = cp.chapter_id AND cp.partner_id = ?
            WHERE c.course_id = ?
        """, (partner_id, course_id))
        
        progress = cursor.fetchone()
        total = progress['total']
        completed = progress['completed']
        
        is_completed = total > 0 and completed == total
        
        # Проверяем наличие сертификата
        cursor.execute("""
            SELECT * FROM certificates
            WHERE partner_id = ? AND course_id = ?
        """, (partner_id, course_id))
        
        certificate = cursor.fetchone()
        
        return {
            "is_completed": is_completed,
            "has_certificate": certificate is not None,
            "certificate": dict(certificate) if certificate else None,
            "progress": {
                "total": total,
                "completed": completed,
                "percent": round((completed / total * 100) if total > 0 else 0, 2)
            }
        }


@router.get("/api/partner/courses/{course_id}/certificate/download")
async def download_certificate(course_id: int, user: Dict = Depends(require_partner)):
    """Скачать сертификат"""
    from fastapi.responses import FileResponse
    import os
    
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute('SELECT id FROM partners WHERE user_id = ?', (user['id'],))
        partner = cursor.fetchone()
        if not partner:
            raise HTTPException(status_code=404, detail="Партнёр не найден")
        
        partner_id = partner['id']
        
        # Получаем сертификат
        cursor.execute("""
            SELECT * FROM certificates
            WHERE partner_id = ? AND course_id = ?
        """, (partner_id, course_id))
        
        certificate = cursor.fetchone()
        if not certificate:
            raise HTTPException(status_code=404, detail="Сертификат не найден")
        
        certificate = dict(certificate)
        file_path = certificate.get('file_path')
        
        if not file_path or not os.path.exists(file_path):
            raise HTTPException(status_code=404, detail="Файл сертификата не найден")
        
        return FileResponse(
            path=file_path,
            media_type='application/pdf',
            filename=f"Certificate_{certificate['id']}.pdf"
        )
