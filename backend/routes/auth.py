"""
API эндпоинты для авторизации и управления пользователями
"""
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Dict, List
from collections import defaultdict
import time
import logging

from auth import (
    UserRegister, UserLogin, register_user, login_user,
    require_auth, verify_email, resend_verification_email
)
from database import UserDB, PasswordResetDB
from email_service import generate_verification_token, send_password_reset_email
from config import FORGOT_PASSWORD_MAX_ATTEMPTS, FORGOT_PASSWORD_WINDOW_HOURS

router = APIRouter(prefix="/api/auth", tags=["auth"])
logger = logging.getLogger(__name__)

# ======================== RATE LIMITING ========================
# Хранилище для rate limiting (email -> список timestamps запросов)
password_reset_attempts: Dict[str, List[float]] = defaultdict(list)


def check_forgot_password_rate_limit(email: str) -> bool:
    """
    Проверяет rate limit для запросов сброса пароля.
    Возвращает True если лимит не превышен, False если превышен.
    """
    email_lower = email.lower().strip()
    current_time = time.time()
    window_seconds = FORGOT_PASSWORD_WINDOW_HOURS * 3600

    # Очищаем старые записи (старше окна)
    password_reset_attempts[email_lower] = [
        ts for ts in password_reset_attempts[email_lower]
        if current_time - ts < window_seconds
    ]

    # Проверяем количество попыток
    if len(password_reset_attempts[email_lower]) >= FORGOT_PASSWORD_MAX_ATTEMPTS:
        return False

    # Добавляем текущую попытку
    password_reset_attempts[email_lower].append(current_time)
    return True


def get_rate_limit_reset_time(email: str) -> int:
    """Возвращает время в минутах до сброса лимита"""
    email_lower = email.lower().strip()
    if not password_reset_attempts[email_lower]:
        return 0

    oldest_attempt = min(password_reset_attempts[email_lower])
    window_seconds = FORGOT_PASSWORD_WINDOW_HOURS * 3600
    reset_time = oldest_attempt + window_seconds - time.time()
    return max(1, int(reset_time / 60))  # Минимум 1 минута


# ======================== MODELS ========================

class ForgotPasswordRequest(BaseModel):
    email: str


class ResetPasswordRequest(BaseModel):
    token: str
    password: str


# ======================== ENDPOINTS ========================

@router.post("/register")
async def api_register(data: UserRegister):
    """Регистрация нового пользователя"""
    return register_user(data.email, data.password, name=data.name, phone=data.phone, inn=data.inn,
                         company_name=data.company_name, city=data.city, region=data.region, source=data.source)


@router.post("/login")
async def api_login(data: UserLogin):
    """Вход в систему"""
    return login_user(data.email, data.password)


@router.get("/me")
async def api_get_me(user: Dict = Depends(require_auth)):
    """Получить данные текущего пользователя"""
    # Получаем полные данные пользователя из БД
    full_user = UserDB.get_by_id(user["id"])
    if full_user:
        return {
            "id": full_user["id"],
            "email": full_user["email"],
            "role": full_user["role"],
            "name": full_user.get("name"),
            "phone": full_user.get("phone"),
            "inn": full_user.get("inn"),
            "company_name": full_user.get("company_name"),
            "city": full_user.get("city"),
            "region": full_user.get("region"),
            "email_verified": bool(full_user.get("email_verified", False))
        }
    return user


@router.get("/verify-email")
async def api_verify_email(token: str):
    """Подтверждение email по токену из письма"""
    return verify_email(token)


@router.post("/resend-verification")
async def api_resend_verification(user: Dict = Depends(require_auth)):
    """Повторная отправка письма подтверждения"""
    return resend_verification_email(user["id"], user["email"])


@router.post("/forgot-password")
async def api_forgot_password(data: ForgotPasswordRequest):
    """Запрос на сброс пароля - отправляет письмо с ссылкой"""
    email = data.email.lower().strip()

    # Rate limiting: максимум 3 запроса в час на один email
    if not check_forgot_password_rate_limit(email):
        minutes_left = get_rate_limit_reset_time(email)
        logger.warning(f"[RATE LIMIT] Password reset rate limit exceeded for {email}")
        raise HTTPException(
            status_code=429,
            detail=f"Слишком много запросов. Попробуйте через {minutes_left} мин."
        )

    # Ищем пользователя по email
    user = UserDB.get_by_email(email)

    # Всегда возвращаем успех, чтобы не раскрывать существование email
    if not user:
        return {"success": True, "message": "Если указанный email зарегистрирован, вы получите письмо с инструкциями"}

    if not user.get('is_active'):
        return {"success": True, "message": "Если указанный email зарегистрирован, вы получите письмо с инструкциями"}

    # Генерируем токен и сохраняем
    token = generate_verification_token()
    PasswordResetDB.create_token(user['id'], token)

    # Отправляем письмо
    email_sent = send_password_reset_email(user['email'], token)

    if not email_sent:
        print(f"[PASSWORD RESET] Failed to send email to {user['email']}")

    return {"success": True, "message": "Если указанный email зарегистрирован, вы получите письмо с инструкциями"}


@router.get("/verify-reset-token")
async def api_verify_reset_token(token: str):
    """Проверка токена сброса пароля (для валидации перед показом формы)"""
    token_data = PasswordResetDB.verify_token(token)

    if not token_data:
        raise HTTPException(
            status_code=400,
            detail="Недействительная или истёкшая ссылка сброса пароля"
        )

    return {"valid": True, "email": token_data['email']}


@router.post("/reset-password")
async def api_reset_password(data: ResetPasswordRequest):
    """Установка нового пароля по токену"""
    # Валидация пароля
    if len(data.password) < 6:
        raise HTTPException(
            status_code=400,
            detail="Пароль должен быть не менее 6 символов"
        )

    # Сбрасываем пароль
    success = PasswordResetDB.use_token(data.token, data.password)

    if not success:
        raise HTTPException(
            status_code=400,
            detail="Недействительная или истёкшая ссылка сброса пароля"
        )

    return {"success": True, "message": "Пароль успешно изменён. Теперь вы можете войти с новым паролем."}
