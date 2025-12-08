# -*- coding: utf-8 -*-
"""
JWT аутентификация для системы Про.Маркируй
"""

import os
import jwt
from datetime import datetime, timedelta
from typing import Optional, Dict
from fastapi import HTTPException, Depends, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from database import UserDB

# Секретный ключ для JWT (в продакшене использовать .env)
JWT_SECRET = os.getenv('JWT_SECRET', 'promarkirui-super-secret-key-change-in-production-2024')
JWT_ALGORITHM = 'HS256'
JWT_EXPIRATION_HOURS = int(os.getenv('JWT_EXPIRATION_HOURS', '24'))

security = HTTPBearer(auto_error=False)


def create_access_token(user_id: int, email: str, role: str) -> str:
    """Создать JWT токен"""
    payload = {
        'user_id': user_id,
        'email': email,
        'role': role,
        'exp': datetime.utcnow() + timedelta(hours=JWT_EXPIRATION_HOURS),
        'iat': datetime.utcnow()
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def decode_token(token: str) -> Optional[Dict]:
    """Декодировать JWT токен"""
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None


def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> Optional[Dict]:
    """Получить текущего пользователя из токена"""
    if not credentials:
        return None

    payload = decode_token(credentials.credentials)
    if not payload:
        return None

    user = UserDB.get_by_id(payload['user_id'])
    if not user:
        return None

    return {
        'id': user['id'],
        'email': user['email'],
        'role': user['role'],
        'name': user.get('name'),
        'phone': user.get('phone')
    }


def require_auth(credentials: HTTPAuthorizationCredentials = Depends(security)) -> Dict:
    """Требовать авторизацию"""
    if not credentials:
        raise HTTPException(status_code=401, detail="Требуется авторизация")

    payload = decode_token(credentials.credentials)
    if not payload:
        raise HTTPException(status_code=401, detail="Недействительный или истекший токен")

    user = UserDB.get_by_id(payload['user_id'])
    if not user:
        raise HTTPException(status_code=401, detail="Пользователь не найден")

    return {
        'id': user['id'],
        'email': user['email'],
        'role': user['role'],
        'name': user.get('name'),
        'phone': user.get('phone')
    }


def require_admin(credentials: HTTPAuthorizationCredentials = Depends(security)) -> Dict:
    """Требовать роль admin или superadmin"""
    user = require_auth(credentials)

    if user['role'] not in ['admin', 'superadmin']:
        raise HTTPException(status_code=403, detail="Недостаточно прав доступа")

    return user


def require_superadmin(credentials: HTTPAuthorizationCredentials = Depends(security)) -> Dict:
    """Требовать роль superadmin"""
    user = require_auth(credentials)

    if user['role'] != 'superadmin':
        raise HTTPException(status_code=403, detail="Требуются права суперадмина")

    return user


def authenticate_user(email: str, password: str) -> Optional[Dict]:
    """Аутентифицировать пользователя"""
    user = UserDB.get_by_email(email)
    if not user:
        return None

    if not UserDB.verify_password(password, user['password_hash']):
        return None

    # Обновляем время последнего входа
    UserDB.update_last_login(user['id'])

    return {
        'id': user['id'],
        'email': user['email'],
        'role': user['role'],
        'name': user.get('name'),
        'phone': user.get('phone')
    }
