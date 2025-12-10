# -*- coding: utf-8 -*-
"""
JWT Авторизация для Про.Маркируй
"""

import os
from datetime import datetime, timedelta
from typing import Optional, Dict
from functools import wraps

import jwt
from fastapi import HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, EmailStr

from database import UserDB, EmailVerificationDB, verify_password
from email_service import generate_verification_token, send_verification_email

# Секретный ключ для JWT (в проде брать из .env)
SECRET_KEY = os.getenv('JWT_SECRET_KEY', 'promarkirui-super-secret-key-change-in-production')
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_HOURS = 24 * 7  # 7 дней

security = HTTPBearer(auto_error=False)


# ======================== МОДЕЛИ ========================

class UserRegister(BaseModel):
    email: EmailStr
    password: str


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: Dict


class UserResponse(BaseModel):
    id: int
    email: str
    role: str


# ======================== JWT ФУНКЦИИ ========================

def create_access_token(user_id: int, email: str, role: str) -> str:
    """Создать JWT токен"""
    expire = datetime.utcnow() + timedelta(hours=ACCESS_TOKEN_EXPIRE_HOURS)
    payload = {
        "sub": str(user_id),
        "email": email,
        "role": role,
        "exp": expire,
        "iat": datetime.utcnow()
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def decode_token(token: str) -> Optional[Dict]:
    """Декодировать JWT токен"""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        return None  # Токен истёк
    except jwt.InvalidTokenError:
        return None  # Невалидный токен


# ======================== ЗАВИСИМОСТИ FASTAPI ========================

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security)
) -> Optional[Dict]:
    """
    Получить текущего пользователя из JWT токена.
    Возвращает None если токен не предоставлен (гостевой режим).
    """
    if not credentials:
        return None

    token = credentials.credentials
    payload = decode_token(token)

    if not payload:
        return None

    user = UserDB.get_by_id(int(payload["sub"]))
    if not user or not user.get('is_active'):
        return None

    return {
        "id": user["id"],
        "email": user["email"],
        "role": user["role"]
    }


async def require_auth(
    credentials: HTTPAuthorizationCredentials = Depends(security)
) -> Dict:
    """
    Требовать авторизацию. Выбрасывает 401 если не авторизован.
    """
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Требуется авторизация",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = credentials.credentials
    payload = decode_token(token)

    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Недействительный или истёкший токен",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user = UserDB.get_by_id(int(payload["sub"]))
    if not user or not user.get('is_active'):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Пользователь не найден или деактивирован",
        )

    return {
        "id": user["id"],
        "email": user["email"],
        "role": user["role"]
    }


async def require_admin(user: Dict = Depends(require_auth)) -> Dict:
    """Требовать права администратора"""
    if user["role"] not in ["admin", "superadmin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Требуются права администратора"
        )
    return user


async def require_superadmin(user: Dict = Depends(require_auth)) -> Dict:
    """Требовать права суперадмина"""
    if user["role"] != "superadmin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Требуются права суперадминистратора"
        )
    return user


async def require_employee(user: Dict = Depends(require_auth)) -> Dict:
    """Требовать права сотрудника (employee, admin, superadmin)"""
    if user["role"] not in ["employee", "admin", "superadmin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Требуются права сотрудника"
        )
    return user


# ======================== СЕРВИСНЫЕ ФУНКЦИИ ========================

def register_user(email: str, password: str) -> Dict:
    """Зарегистрировать нового пользователя"""
    # Проверяем, не занят ли email
    existing = UserDB.get_by_email(email)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email уже зарегистрирован"
        )

    # Валидация пароля
    if len(password) < 6:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Пароль должен быть не менее 6 символов"
        )

    # Создаём пользователя
    user_id = UserDB.create(email, password)
    user = UserDB.get_by_id(user_id)

    # Генерируем токен верификации и отправляем email
    verification_token = generate_verification_token()
    EmailVerificationDB.create_token(user_id, verification_token)

    # Отправляем письмо подтверждения (async в фоне)
    email_sent = send_verification_email(email, verification_token)
    if not email_sent:
        print(f"Warning: Failed to send verification email to {email}")

    # Генерируем JWT токен
    token = create_access_token(user["id"], user["email"], user["role"])

    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": user["id"],
            "email": user["email"],
            "role": user["role"],
            "email_verified": False
        },
        "message": "Письмо с подтверждением отправлено на вашу почту"
    }


def login_user(email: str, password: str) -> Dict:
    """Войти в систему"""
    user = UserDB.authenticate(email, password)

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Неверный email или пароль"
        )

    if not user.get('is_active'):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Аккаунт деактивирован"
        )

    # Генерируем токен
    token = create_access_token(user["id"], user["email"], user["role"])

    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": user["id"],
            "email": user["email"],
            "role": user["role"],
            "email_verified": bool(user.get('email_verified', False))
        }
    }


def verify_email(token: str) -> Dict:
    """Подтвердить email по токену"""
    result = EmailVerificationDB.verify_token(token)

    if not result:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Недействительная или истёкшая ссылка подтверждения"
        )

    return {
        "success": True,
        "message": "Email успешно подтверждён",
        "email": result['email']
    }


def resend_verification_email(user_id: int, email: str) -> Dict:
    """Повторно отправить письмо подтверждения"""
    # Проверяем, не подтверждён ли уже email
    if EmailVerificationDB.is_verified(user_id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email уже подтверждён"
        )

    # Генерируем новый токен
    verification_token = generate_verification_token()
    EmailVerificationDB.create_token(user_id, verification_token)

    # Отправляем письмо
    email_sent = send_verification_email(email, verification_token)

    if not email_sent:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Не удалось отправить письмо. Попробуйте позже."
        )

    return {
        "success": True,
        "message": "Письмо с подтверждением отправлено"
    }


def create_admin_user(email: str, password: str, role: str = "admin") -> Dict:
    """Создать администратора (только для суперадмина)"""
    if role not in ["admin", "superadmin"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Недопустимая роль"
        )

    existing = UserDB.get_by_email(email)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email уже зарегистрирован"
        )

    user_id = UserDB.create(email, password, role)
    return {"id": user_id, "email": email, "role": role}
