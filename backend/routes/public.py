"""
Публичные API эндпоинты (без авторизации)
/api/check/* - проверка маркировки
/api/import/* - импорт
/api/equipment/* - оборудование  
/api/contact/* - контакты
/api/training/* - обучение
/api/company/* - компании
/api/quote/* - создание КП
"""
from fastapi import APIRouter

router = APIRouter(tags=["public"])

# Эндпоинты будут добавлены позже
