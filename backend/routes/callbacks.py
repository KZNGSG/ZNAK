"""
API эндпоинты для обратных звонков
/api/callback/*
"""
from fastapi import APIRouter

router = APIRouter(prefix="/api/callback", tags=["callbacks"])

# Эндпоинты будут добавлены позже
