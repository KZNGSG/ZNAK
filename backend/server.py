from fastapi import FastAPI, HTTPException, BackgroundTasks, Depends, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from pydantic import BaseModel, EmailStr, field_validator
from typing import Optional, List, Dict
import os
from dotenv import load_dotenv
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.header import Header
from email.utils import formataddr
import logging
import httpx
import uuid
import json
from datetime import datetime, timedelta
from urllib.parse import quote as url_quote
from collections import defaultdict
import time

# Импорт генератора документов
from document_generator import generate_contract_pdf, generate_quote_pdf, generate_act_pdf

# Импорт авторизации и БД
from auth import (
    UserRegister, UserLogin, register_user, login_user,
    get_current_user, require_auth, require_admin, require_superadmin, require_employee
)
from database import (
    CompanyDB, QuoteDB, ContractDB, CallbackDB, UserDB,
    ClientDB, InteractionDB, CallbackDBExtended,
    NotificationSettingsDB, CRMSettingsDB, CallbackSLADB,
    get_next_contract_number, get_db, PartnerDB
)

# Load environment variables first
load_dotenv()

app = FastAPI(title="Про.Маркируй API")

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ======================== RATE LIMITING ========================
# Хранилище для rate limiting (email -> список timestamps запросов)
password_reset_attempts: Dict[str, List[float]] = defaultdict(list)

# Настройки rate limiting для forgot-password
FORGOT_PASSWORD_MAX_ATTEMPTS = 3  # Максимум запросов
FORGOT_PASSWORD_WINDOW_HOURS = 1  # За период (часы)


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

class CategoryGroup(BaseModel):
    id: str
    name: str
    status: str  # "mandatory" or "experiment"
    subcategories: List[Dict[str, str]]

class CheckProductRequest(BaseModel):
    category: str
    subcategory: str
    product: Optional[str] = None  # Product ID from CATEGORIES_DATA
    source: List[str]  # ["produce", "import", "buy_rf", "old_stock"] - множественный выбор
    volume: str  # "<100", "100-1000", "1000-10000", ">10000"

class CheckProductResponse(BaseModel):
    requires_marking: bool
    category: str
    subcategory: str
    subcategory_name: Optional[str] = None
    tnved: Optional[str] = None
    status: Optional[str] = None  # "mandatory" or "experiment"
    deadline: Optional[str] = None
    mandatory_since: Optional[str] = None
    timeline: Optional[Dict] = None  # Timeline info with who, requirements, etc.
    steps: List[str]
    message: str

class ImportRequest(BaseModel):
    country: str
    category: str

class ImportScheme(BaseModel):
    id: str
    title: str
    description: str
    pros: List[str]
    cons: List[str]
    fit_for: str

class EquipmentRequest(BaseModel):
    facility_type: str  # "production", "warehouse", "retail", "combined"
    daily_volume: str
    has_equipment: List[str]

class EquipmentItem(BaseModel):
    name: str
    purpose: str
    price_min: int
    price_max: int
    status: str  # "needed", "has"

class EquipmentResponse(BaseModel):
    items: List[EquipmentItem]
    budget_min: int
    budget_max: int

class ContactRequest(BaseModel):
    name: str
    phone: str
    email: Optional[EmailStr] = None
    request_type: str
    comment: Optional[str] = None
    consent: bool

    @field_validator('consent')
    @classmethod
    def check_consent(cls, v):
        if not v:
            raise ValueError('Необходимо согласие на обработку данных')
        return v

# ======================== TRAINING ENROLLMENT ========================

class TrainingEnrollRequest(BaseModel):
    name: str
    phone: str
    email: Optional[EmailStr] = None
    company: Optional[str] = None
    comment: Optional[str] = None
    plan_id: Optional[str] = None  # standard, premium, vip, cashier, accountant, corporate
    plan_name: Optional[str] = None
    plan_price: Optional[str] = None

# ======================== COMPANY LOOKUP ========================

class CompanyInfo(BaseModel):
    inn: str
    kpp: Optional[str] = None
    ogrn: Optional[str] = None
    name: str
    name_short: Optional[str] = None
    name_full: Optional[str] = None
    opf: Optional[str] = None  # Организационно-правовая форма
    type: Optional[str] = None  # LEGAL или INDIVIDUAL
    address: Optional[str] = None
    management_name: Optional[str] = None
    management_post: Optional[str] = None
    status: Optional[str] = None  # ACTIVE, LIQUIDATED, etc.

class INNLookupRequest(BaseModel):
    inn: str

# ======================== QUOTE (КП) SYSTEM ========================

class QuoteService(BaseModel):
    id: str
    name: str
    description: Optional[str] = None
    price: float  # Может быть дробным (1.62 ₽)
    unit: str  # "шт", "услуга", "месяц"
    category: str
    quantity: int = 1

class QuoteProduct(BaseModel):
    id: str
    name: str
    tnved: str
    category: str

class QuoteRequest(BaseModel):
    company: CompanyInfo
    products: List[QuoteProduct]
    services: List[QuoteService]
    contact_name: str
    contact_phone: str
    contact_email: Optional[str] = None

class QuoteResponse(BaseModel):
    quote_id: str
    company_name: str
    total_amount: int
    services_breakdown: List[Dict]
    created_at: str
    valid_until: str

# ======================== НОВАЯ СТРУКТУРА КАТЕГОРИЙ ========================
# 3 уровня: Категория → Подкатегория → Товары (products)
# Товары будут добавляться постепенно через админку

CATEGORIES_DATA = [
    {
        "id": "food_drinks",
        "name": "Продукты питания и напитки",
        "icon": "utensils",
        "subcategories": [
            {"id": "beer_alcohol", "name": "Пиво и слабоалкогольные напитки", "icon": "beer", "products": [
                {"id": "beer_alcohol_2203", "name": "пиво крепостью от 0,5 % до 8,6 % включительно,; пиво крепостью свыше 8", "tnved": "2203", "marking_status": "mandatory"},
                {"id": "beer_alcohol_220300", "name": "Пиво солодовое:", "tnved": "2203 00", "marking_status": "mandatory"},
                {"id": "beer_alcohol_2206", "name": "пиво крепостью от 0,5 % до 8,6 % включительно,; пиво крепостью свыше 8", "tnved": "2206", "marking_status": "mandatory"},
                {"id": "beer_alcohol_220600", "name": "Напитки прочие сброженные (например, сидр, сидр грушевый, напиток медо", "tnved": "2206 00", "marking_status": "mandatory"},
                {"id": "beer_alcohol_22060031", "name": "сидр, пуаре", "tnved": "2206 00 31", "marking_status": "mandatory"},
                {"id": "beer_alcohol_2206003100", "name": "сидр и грушевый сидр", "tnved": "2206 00 310 0", "marking_status": "mandatory"},
                {"id": "beer_alcohol_22060051", "name": "сидр, пуаре", "tnved": "2206 00 51", "marking_status": "mandatory"},
                {"id": "beer_alcohol_2206005100", "name": "сидр и грушевый сидр", "tnved": "2206 00 510 0", "marking_status": "mandatory"},
                {"id": "beer_alcohol_22060081", "name": "сидр, пуаре", "tnved": "2206 00 81", "marking_status": "mandatory"},
                {"id": "beer_alcohol_2206008100", "name": "сидр и грушевый сидр", "tnved": "2206 00 810 0", "marking_status": "mandatory"},
                {"id": "beer_alcohol_22060039", "name": "напитки слабоалкогольные брожения", "tnved": "2206 00 39", "marking_status": "mandatory"},
                {"id": "beer_alcohol_2206003901", "name": "с фактической концентрацией спирта не более 7 об.%", "tnved": "2206 00 390 1", "marking_status": "mandatory"},
                {"id": "beer_alcohol_22060059", "name": "напитки слабоалкогольные брожения", "tnved": "2206 00 59", "marking_status": "mandatory"},
                {"id": "beer_alcohol_2206005901", "name": "с фактической концентрацией спирта не более 7 об.%", "tnved": "2206 00 590 1", "marking_status": "mandatory"},
                {"id": "beer_alcohol_22060089", "name": "напитки слабоалкогольные брожения", "tnved": "2206 00 89", "marking_status": "mandatory"},
                {"id": "beer_alcohol_2206008901", "name": "с фактической концентрацией спирта не более 7 об.%", "tnved": "2206 00 890 1", "marking_status": "mandatory"}
            ]},
            {"id": "dairy", "name": "Молочная продукция", "icon": "milk", "products": [
                {
                    "id": "dairy_0401", "name": "Молоко и сливки несгущенные", "tnved": "0401",
                    "marking_status": "mandatory", "mandatory_since": "2021-12-01",
                    "timeline": {
                        "title": "Срок годности до 40 дней",
                        "start_date": "1 декабря 2021",
                        "who": ["Производители", "Импортёры", "Оптовики", "Розница"],
                        "current_requirements": [
                            "Регистрация в Честном ЗНАКе",
                            "Нанесение кодов маркировки",
                            "Передача данных при продаже на кассе",
                            "Электронный документооборот (ЭДО)"
                        ]
                    }
                },
                {
                    "id": "dairy_0402", "name": "Молоко и сливки сгущенные", "tnved": "0402",
                    "marking_status": "mandatory", "mandatory_since": "2021-09-01",
                    "timeline": {
                        "title": "Срок годности более 40 дней",
                        "start_date": "1 сентября 2021",
                        "who": ["Производители", "Импортёры", "Оптовики", "Розница"],
                        "current_requirements": [
                            "Регистрация в Честном ЗНАКе",
                            "Нанесение кодов маркировки",
                            "Передача данных при продаже на кассе",
                            "Электронный документооборот (ЭДО)"
                        ]
                    }
                },
                {
                    "id": "dairy_0403", "name": "Пахта, йогурт, кефир", "tnved": "0403",
                    "marking_status": "mandatory", "mandatory_since": "2021-12-01",
                    "timeline": {
                        "title": "Срок годности до 40 дней",
                        "start_date": "1 декабря 2021",
                        "who": ["Производители", "Импортёры", "Оптовики", "Розница"],
                        "current_requirements": [
                            "Регистрация в Честном ЗНАКе",
                            "Нанесение кодов маркировки",
                            "Передача данных при продаже на кассе",
                            "Электронный документооборот (ЭДО)"
                        ]
                    }
                },
                {
                    "id": "dairy_0404", "name": "Молочная сыворотка", "tnved": "0404",
                    "marking_status": "mandatory", "mandatory_since": "2021-09-01",
                    "timeline": {
                        "title": "Срок годности более 40 дней",
                        "start_date": "1 сентября 2021",
                        "who": ["Производители", "Импортёры", "Оптовики", "Розница"],
                        "current_requirements": [
                            "Регистрация в Честном ЗНАКе",
                            "Нанесение кодов маркировки",
                            "Передача данных при продаже на кассе",
                            "Электронный документооборот (ЭДО)"
                        ]
                    }
                },
                {
                    "id": "dairy_0405", "name": "Сливочное масло", "tnved": "0405",
                    "marking_status": "mandatory", "mandatory_since": "2021-09-01",
                    "timeline": {
                        "title": "Срок годности более 40 дней",
                        "start_date": "1 сентября 2021",
                        "who": ["Производители", "Импортёры", "Оптовики", "Розница"],
                        "current_requirements": [
                            "Регистрация в Честном ЗНАКе",
                            "Нанесение кодов маркировки",
                            "Передача данных при продаже на кассе",
                            "Электронный документооборот (ЭДО)"
                        ]
                    }
                },
                {
                    "id": "dairy_0406", "name": "Сыры и творог", "tnved": "0406",
                    "marking_status": "mandatory", "mandatory_since": "2021-06-01",
                    "timeline": {
                        "title": "Сыры — первая категория",
                        "start_date": "1 июня 2021",
                        "who": ["Производители", "Импортёры", "Оптовики", "Розница", "Фермеры (с 1.09.2024)"],
                        "current_requirements": [
                            "Регистрация в Честном ЗНАКе",
                            "Нанесение кодов маркировки",
                            "Передача данных при продаже на кассе",
                            "Разрешительный режим на кассах",
                            "Электронный документооборот (ЭДО)"
                        ]
                    }
                },
                {
                    "id": "dairy_210500", "name": "Мороженое", "tnved": "2105 00",
                    "marking_status": "mandatory", "mandatory_since": "2021-06-01",
                    "timeline": {
                        "title": "Мороженое — первая категория",
                        "start_date": "1 июня 2021",
                        "who": ["Производители", "Импортёры", "Оптовики", "Розница", "Фермеры (с 1.09.2024)"],
                        "current_requirements": [
                            "Регистрация в Честном ЗНАКе",
                            "Нанесение кодов маркировки",
                            "Передача данных при продаже на кассе",
                            "Разрешительный режим на кассах",
                            "Электронный документооборот (ЭДО)"
                        ]
                    }
                },
                {
                    "id": "dairy_2202999100", "name": "Молочные напитки (до 0,2% жира)", "tnved": "2202 99 910 0",
                    "marking_status": "mandatory", "mandatory_since": "2021-12-01",
                    "timeline": {
                        "title": "Молочные напитки",
                        "start_date": "1 декабря 2021",
                        "who": ["Производители", "Импортёры", "Оптовики", "Розница"],
                        "current_requirements": [
                            "Регистрация в Честном ЗНАКе",
                            "Нанесение кодов маркировки",
                            "Передача данных при продаже на кассе",
                            "Электронный документооборот (ЭДО)"
                        ]
                    }
                },
                {
                    "id": "dairy_2202999500", "name": "Молочные напитки (0,2-2% жира)", "tnved": "2202 99 950 0",
                    "marking_status": "mandatory", "mandatory_since": "2021-12-01",
                    "timeline": {
                        "title": "Молочные напитки",
                        "start_date": "1 декабря 2021",
                        "who": ["Производители", "Импортёры", "Оптовики", "Розница"],
                        "current_requirements": [
                            "Регистрация в Честном ЗНАКе",
                            "Нанесение кодов маркировки",
                            "Передача данных при продаже на кассе",
                            "Электронный документооборот (ЭДО)"
                        ]
                    }
                },
                {
                    "id": "dairy_2202999900", "name": "Молочные напитки (от 2% жира)", "tnved": "2202 99 990 0",
                    "marking_status": "mandatory", "mandatory_since": "2021-12-01",
                    "timeline": {
                        "title": "Молочные напитки",
                        "start_date": "1 декабря 2021",
                        "who": ["Производители", "Импортёры", "Оптовики", "Розница"],
                        "current_requirements": [
                            "Регистрация в Честном ЗНАКе",
                            "Нанесение кодов маркировки",
                            "Передача данных при продаже на кассе",
                            "Электронный документооборот (ЭДО)"
                        ]
                    }
                }
            ]},
            {"id": "water", "name": "Упакованная вода", "icon": "droplet", "products": [
                {"id": "water_220110_1", "name": "Природные минеральные воды газированные", "tnved": "2201 10", "marking_status": "mandatory"},
                {"id": "water_220110_2", "name": "Природные минеральные воды негазированные", "tnved": "2201 10", "marking_status": "mandatory"},
                {"id": "water_220110_3", "name": "Природные минеральные воды слабогазированные", "tnved": "2201 10", "marking_status": "mandatory"},
                {"id": "water_22019000_1", "name": "Вода питьевая газированная", "tnved": "2201 90 000 0", "marking_status": "mandatory"},
                {"id": "water_22019000_2", "name": "Вода питьевая негазированная", "tnved": "2201 90 000 0", "marking_status": "mandatory"},
                {"id": "water_22019000_3", "name": "Вода питьевая слабогазированная", "tnved": "2201 90 000 0", "marking_status": "mandatory"},
                {"id": "water_22019000_4", "name": "Вода питьевая прочая", "tnved": "2201 90 000 0", "marking_status": "mandatory"},
                {"id": "water_22019000_5", "name": "Вода для детского питания", "tnved": "2201 90 000 0", "marking_status": "mandatory"}
            ]},
            {"id": "tobacco", "name": "Табак", "icon": "cigarette", "products": [
                {"id": "tobacco_2402", "name": "Сигары, сигары с обрезанными концами, сигариллы и сигареты из табака и", "tnved": "2402", "marking_status": "mandatory"},
                {"id": "tobacco_240220", "name": "сигареты, содержащие табак:", "tnved": "2402 20", "marking_status": "mandatory"},
                {"id": "tobacco_24022090", "name": "сигареты", "tnved": "2402 20 90", "marking_status": "mandatory"},
                {"id": "tobacco_2402209000", "name": "прочие", "tnved": "2402 20 900 0", "marking_status": "mandatory"},
                {"id": "tobacco_2403", "name": "Прочий промышленно изготовленный табак и промышленные заменители табак", "tnved": "2403", "marking_status": "mandatory"},
                {"id": "tobacco_240311", "name": "табак для кальяна, сигары, сигары с обрезанными концами (черуты), сига", "tnved": "2403 11", "marking_status": "mandatory"},
                {"id": "tobacco_24031100", "name": "табак для кальяна, сигары, сигары с обрезанными концами (черуты), сига", "tnved": "2403 11 00", "marking_status": "mandatory"},
                {"id": "tobacco_2403110000", "name": "табак для кальяна, сигары, сигары с обрезанными концами (черуты), сига", "tnved": "2403 11 000 0", "marking_status": "mandatory"},
                {"id": "tobacco_240210", "name": "табак для кальяна, сигары, сигары с обрезанными концами (черуты), сига", "tnved": "2402 10", "marking_status": "mandatory"},
                {"id": "tobacco_24021000", "name": "табак для кальяна, сигары, сигары с обрезанными концами (черуты), сига", "tnved": "2402 10 00", "marking_status": "mandatory"},
                {"id": "tobacco_2402100000", "name": "сигары, сигары с обрезанными концами и сигариллы, содержащие табак", "tnved": "2402 10 000 0", "marking_status": "mandatory"},
                {"id": "tobacco_24022010", "name": "табак для кальяна, сигары, сигары с обрезанными концами (черуты), сига", "tnved": "2402 20 10", "marking_status": "mandatory"},
                {"id": "tobacco_2402201000", "name": "содержащие гвоздику", "tnved": "2402 20 100 0", "marking_status": "mandatory"},
                {"id": "tobacco_240319", "name": "прочий:", "tnved": "2403 19", "marking_status": "mandatory"},
                {"id": "tobacco_24031910", "name": "табак для кальяна, сигары, сигары с обрезанными концами (черуты), сига", "tnved": "2403 19 10", "marking_status": "mandatory"},
                {"id": "tobacco_2403191000", "name": "в первичных упаковках нетто-массой не более 500 г", "tnved": "2403 19 100 0", "marking_status": "mandatory"},
                {"id": "tobacco_240399", "name": "прочий:", "tnved": "2403 99", "marking_status": "mandatory"},
                {"id": "tobacco_24039910", "name": "табак для кальяна, сигары, сигары с обрезанными концами (черуты), сига", "tnved": "2403 99 10", "marking_status": "mandatory"},
                {"id": "tobacco_2403991000", "name": "жевательный и нюхательный табак", "tnved": "2403 99 100 0", "marking_status": "mandatory"},
                {"id": "tobacco_24039990", "name": "табачные изделия, предназначенные для потребления путем нагревания;; к", "tnved": "2403 99 90", "marking_status": "mandatory"},
                {"id": "tobacco_2403999008", "name": "прочий", "tnved": "2403 99 900 8", "marking_status": "mandatory"},
                {"id": "tobacco_2404", "name": "Продукция, содержащая табак, восстановленный табак, никотин, или замен", "tnved": "2404", "marking_status": "mandatory"},
                {"id": "tobacco_240411", "name": "табачные изделия, предназначенные для потребления путем нагревания;; к", "tnved": "2404 11", "marking_status": "mandatory"},
                {"id": "tobacco_24041100", "name": "табачные изделия, предназначенные для потребления путем нагревания;; к", "tnved": "2404 11 00", "marking_status": "mandatory"},
                {"id": "tobacco_2404110009", "name": "прочая", "tnved": "2404 11 000 9", "marking_status": "mandatory"},
                {"id": "tobacco_240419", "name": "табачные изделия, предназначенные для потребления путем нагревания;; к", "tnved": "2404 19", "marking_status": "mandatory"},
                {"id": "tobacco_24041900", "name": "табачные изделия, предназначенные для потребления путем нагревания;; к", "tnved": "2404 19 00", "marking_status": "mandatory"},
                {"id": "tobacco_2404190001", "name": "содержащая заменители табака", "tnved": "2404 19 000 1", "marking_status": "mandatory"},
                {"id": "tobacco_2404110001", "name": "содержащая \"гомогенизированный\" или \"восстановленный\" табак или табачн", "tnved": "2404 11 000 1", "marking_status": "mandatory"},
                {"id": "tobacco_240412", "name": "Жидкости для электронных систем доставки никотина, в том числе безнико", "tnved": "2404 12", "marking_status": "mandatory"},
                {"id": "tobacco_24041200", "name": "Жидкости для электронных систем доставки никотина, в том числе безнико", "tnved": "2404 12 00", "marking_status": "mandatory"},
                {"id": "tobacco_2404120000", "name": "прочая, содержащая никотин", "tnved": "2404 12 000 0", "marking_status": "mandatory"},
                {"id": "tobacco_2404190009", "name": "прочая", "tnved": "2404 19 000 9", "marking_status": "mandatory"}
            ]},
            {"id": "seafood", "name": "Морепродукты (икра)", "icon": "fish", "products": [
                {"id": "seafood_1604", "name": "Готовая или консервированная рыба; икра осетровых и ее заменители, изг", "tnved": "1604", "marking_status": "mandatory"},
                {"id": "seafood_160431", "name": "Икра осетровых", "tnved": "1604 31", "marking_status": "mandatory"},
                {"id": "seafood_16043100", "name": "Икра осетровых", "tnved": "1604 31 00", "marking_status": "mandatory"},
                {"id": "seafood_1604310000", "name": "икра осетровых", "tnved": "1604 31 000 0", "marking_status": "mandatory"},
                {"id": "seafood_160432", "name": "Заменители икры осетровых: икра лососевых (красная икра)", "tnved": "1604 32", "marking_status": "mandatory"},
                {"id": "seafood_16043200", "name": "Заменители икры осетровых: икра лососевых (красная икра)", "tnved": "1604 32 00", "marking_status": "mandatory"},
                {"id": "seafood_1604320010", "name": "икра лососевых (красная икра)", "tnved": "1604 32 001 0", "marking_status": "mandatory"},
                {"id": "seafood_0305", "name": "Рыба сушеная, соленая или в рассоле; рыба копченая, не подвергнутая ил", "tnved": "0305", "marking_status": "mandatory"},
                {"id": "seafood_030520", "name": "Печень, икра и молоки рыб, сушеные, копченые, соленые или в рассоле", "tnved": "0305 20", "marking_status": "mandatory"},
                {"id": "seafood_03052000", "name": "Печень, икра и молоки рыб, сушеные, копченые, соленые или в рассоле", "tnved": "0305 20 00", "marking_status": "mandatory"},
                {"id": "seafood_0305200000", "name": "печень, икра и молоки рыбы, сушеные, копченые, соленые или в рассоле", "tnved": "0305 20 000 0", "marking_status": "mandatory"},
                {"id": "seafood_0302", "name": "Печень, икра и молоки, свежие или охлажденные", "tnved": "0302", "marking_status": "mandatory"},
                {"id": "seafood_030291", "name": "Печень, икра и молоки, свежие или охлажденные", "tnved": "0302 91", "marking_status": "mandatory"},
                {"id": "seafood_03029100", "name": "Печень, икра и молоки, свежие или охлажденные", "tnved": "0302 91 00", "marking_status": "mandatory"},
                {"id": "seafood_0302910000", "name": "печень, икра и молоки", "tnved": "0302 91 000 0", "marking_status": "mandatory"},
                {"id": "seafood_0303", "name": "Икра и молоки для производства дезоксирибонуклеиновой кислоты или суль", "tnved": "0303", "marking_status": "mandatory"},
                {"id": "seafood_030391", "name": "печень, икра и молоки:", "tnved": "0303 91", "marking_status": "mandatory"},
                {"id": "seafood_03039110", "name": "Икра и молоки для производства дезоксирибонуклеиновой кислоты или суль", "tnved": "0303 91 10", "marking_status": "mandatory"},
                {"id": "seafood_0303911000", "name": "икра и молоки для производства дезоксирибонуклеиновой кислоты или суль", "tnved": "0303 91 100 0", "marking_status": "mandatory"},
                {"id": "seafood_03039190", "name": "Прочие печень, икра и молоки, мороженые", "tnved": "0303 91 90", "marking_status": "mandatory"},
                {"id": "seafood_0303919000", "name": "прочие", "tnved": "0303 91 900 0", "marking_status": "mandatory"}
            ]},
            {"id": "oils", "name": "Растительные масла", "icon": "flask", "products": [
                {"id": "oils_1507", "name": "Масло соевое и его фракции, нерафинированные или рафинированные, но бе", "tnved": "1507", "marking_status": "mandatory"},
                {"id": "oils_150710", "name": "масло сырое, нерафинированное или рафинированное гидратацией:", "tnved": "1507 10", "marking_status": "mandatory"},
                {"id": "oils_15071090", "name": "Отдельные виды пищевых растительных масел и масложировой продукции, уп", "tnved": "1507 10 90", "marking_status": "mandatory"},
                {"id": "oils_1507109001", "name": "в первичных упаковках нетто-объемом 10 л или менее", "tnved": "1507 10 900 1", "marking_status": "mandatory"}
            ]},
            {"id": "pet_food", "name": "Корма для животных", "icon": "paw", "products": [
                {"id": "pet_food_dry", "name": "Сухой корм", "tnved": "2309", "marking_status": "mandatory"},
                {"id": "pet_food_dry_animal", "name": "Сухой корм животного происхождения", "tnved": "2309", "marking_status": "mandatory"},
                {"id": "pet_food_dry_animal_dog", "name": "Сухой корм животного происхождения для собак", "tnved": "2309", "marking_status": "mandatory"},
                {"id": "pet_food_dry_animal_cat", "name": "Сухой корм животного происхождения для кошек", "tnved": "2309", "marking_status": "mandatory"},
                {"id": "pet_food_dry_animal_other", "name": "Сухой корм животного происхождения для прочих животных", "tnved": "2309", "marking_status": "mandatory"},
                {"id": "pet_food_dry_plant", "name": "Сухой корм растительного происхождения", "tnved": "2309", "marking_status": "mandatory"},
                {"id": "pet_food_dry_other", "name": "Сухой корм прочий", "tnved": "2309", "marking_status": "mandatory"},
                {"id": "pet_food_dry_other_dog", "name": "Сухой корм прочий для собак", "tnved": "2309", "marking_status": "mandatory"},
                {"id": "pet_food_dry_other_cat", "name": "Сухой корм прочий для кошек", "tnved": "2309", "marking_status": "mandatory"},
                {"id": "pet_food_dry_other_other", "name": "Сухой корм прочий для прочих животных", "tnved": "2309", "marking_status": "mandatory"},
                {"id": "pet_food_wet", "name": "Влажный корм", "tnved": "2309", "marking_status": "mandatory"},
                {"id": "pet_food_wet_animal", "name": "Влажный корм животного происхождения", "tnved": "2309", "marking_status": "mandatory"},
                {"id": "pet_food_wet_animal_dog", "name": "Влажный корм животного происхождения для собак", "tnved": "2309", "marking_status": "mandatory"},
                {"id": "pet_food_wet_animal_cat", "name": "Влажный корм животного происхождения для кошек", "tnved": "2309", "marking_status": "mandatory"},
                {"id": "pet_food_wet_animal_other", "name": "Влажный корм животного происхождения для прочих животных", "tnved": "2309", "marking_status": "mandatory"},
                {"id": "pet_food_wet_plant", "name": "Влажный корм растительного происхождения", "tnved": "2309", "marking_status": "mandatory"},
                {"id": "pet_food_wet_other", "name": "Влажный корм прочий", "tnved": "2309", "marking_status": "mandatory"},
                {"id": "pet_food_wet_other_dog", "name": "Влажный корм прочий для собак", "tnved": "2309", "marking_status": "mandatory"},
                {"id": "pet_food_wet_other_cat", "name": "Влажный корм прочий для кошек", "tnved": "2309", "marking_status": "mandatory"},
                {"id": "pet_food_wet_other_other", "name": "Влажный корм прочий для прочих животных", "tnved": "2309", "marking_status": "mandatory"}
            ]},
            {"id": "canned", "name": "Консервированные продукты", "icon": "archive", "products": [
                {"id": "canned_1604", "name": "Готовая или консервированная рыба; икра осетровых и ее заменители, изг", "tnved": "1604", "marking_status": "mandatory"},
                {"id": "canned_160416", "name": "Рыбная консервная продукция и консервированная продукция из морепродук", "tnved": "1604 16", "marking_status": "mandatory"},
                {"id": "canned_16041604", "name": "Рыбная консервная продукция и консервированная продукция из морепродук", "tnved": "1604 16 04", "marking_status": "mandatory"},
                {"id": "canned_1604160431", "name": "Рыбная консервная продукция и консервированная продукция из морепродук", "tnved": "1604 16 043 1", "marking_status": "mandatory"},
                {"id": "canned_1602", "name": "Готовые или консервированные продукты из мяса, мясных субпродуктов, кр", "tnved": "1602", "marking_status": "mandatory"},
                {"id": "canned_160220", "name": "из печени любых животных:", "tnved": "1602 20", "marking_status": "mandatory"},
                {"id": "canned_16022001", "name": "Мясная и плодоовощная консервация", "tnved": "1602 20 01", "marking_status": "mandatory"},
                {"id": "canned_1602200121", "name": "Мясная и плодоовощная консервация", "tnved": "1602 20 012 1", "marking_status": "mandatory"}
            ]},
            {"id": "grocery", "name": "Бакалея", "icon": "shopping-basket", "products": [
                {"id": "snacks_chips_potato", "name": "Чипсы картофельные", "tnved": "1904 10 100 0", "marking_status": "mandatory"},
                {"id": "snacks_chips_veg", "name": "Чипсы овощные", "tnved": "1904 10 300 0", "marking_status": "mandatory"},
                {"id": "snacks_chips_other", "name": "Чипсы прочие", "tnved": "1904 10 900 0", "marking_status": "mandatory"},
                {"id": "snacks_crispbread", "name": "Хлебцы хрустящие", "tnved": "1905 10 000 0", "marking_status": "mandatory"},
                {"id": "snacks_crackers", "name": "Сухарики", "tnved": "1905 40 100 0", "marking_status": "mandatory"},
                {"id": "snacks_croutons", "name": "Гренки", "tnved": "1905 40 900 0", "marking_status": "mandatory"},
                {"id": "snacks_corn_sticks", "name": "Кукурузные палочки", "tnved": "1905 90 550 0", "marking_status": "mandatory"},
                {"id": "snacks_nachos", "name": "Начос", "tnved": "1905 90 900 0", "marking_status": "mandatory"},
                {"id": "snacks_popcorn", "name": "Попкорн готовый", "tnved": "2005 20 200 0", "marking_status": "mandatory"},
                {"id": "snacks_other", "name": "Снековая продукция прочая", "tnved": "2005 20 800 0", "marking_status": "mandatory"},
                {"id": "spices_onion", "name": "Лук сушеный", "tnved": "0712 20 000 0", "marking_status": "mandatory"},
                {"id": "spices_veg_dried", "name": "Овощи сушеные прочие", "tnved": "0712 90 900 0", "marking_status": "mandatory"},
                {"id": "spices_pepper", "name": "Перец (род Piper)", "tnved": "0904", "marking_status": "mandatory"},
                {"id": "spices_vanilla", "name": "Ваниль", "tnved": "0905", "marking_status": "mandatory"},
                {"id": "spices_cinnamon", "name": "Корица и цветы коричного дерева", "tnved": "0906", "marking_status": "mandatory"},
                {"id": "spices_cloves", "name": "Гвоздика", "tnved": "0907", "marking_status": "mandatory"},
                {"id": "spices_nutmeg", "name": "Мускатный орех, мацис и кардамон", "tnved": "0908", "marking_status": "mandatory"},
                {"id": "spices_seeds", "name": "Семена аниса, бадьяна, кориандра, тмина", "tnved": "0909", "marking_status": "mandatory"},
                {"id": "spices_ginger", "name": "Имбирь, шафран, куркума, тимьян, лавровый лист", "tnved": "0910", "marking_status": "mandatory"},
                {"id": "spices_other", "name": "Пряности пищевые прочие", "tnved": "1211 90 860 8", "marking_status": "mandatory"},
                {"id": "sauces_main", "name": "Соусы и их компоненты, приправы", "tnved": "2103", "marking_status": "mandatory"},
                {"id": "sauces_mustard", "name": "Горчица готовая", "tnved": "2103", "marking_status": "mandatory"},
                {"id": "sauces_soups_dry", "name": "Сухие супы", "tnved": "2104 10 000 0", "marking_status": "mandatory"},
                {"id": "sauces_broth_dry", "name": "Сухие бульоны", "tnved": "2104 10 000 0", "marking_status": "mandatory"},
                {"id": "sauces_vinegar", "name": "Уксусы", "tnved": "2209 000", "marking_status": "mandatory"}
            ]},
            {"id": "soft_drinks", "name": "Безалкогольные напитки", "icon": "glass-water", "products": [
                {"id": "soft_drinks_2202100000", "name": "воды, включая минеральные и газированные, содержащие добавки сахара ил", "tnved": "2202 10 000 0", "marking_status": "mandatory"}
            ]},
            {"id": "non_alc_beer", "name": "Безалкогольное пиво", "icon": "beer", "products": [
                {"id": "non_alc_beer_220291", "name": "Безалкогольное пиво", "tnved": "2202 91", "marking_status": "mandatory"},
                {"id": "non_alc_beer_22029100", "name": "Безалкогольное пиво", "tnved": "2202 91 00", "marking_status": "mandatory"},
                {"id": "non_alc_beer_2202910000", "name": "безалкогольное пиво", "tnved": "2202 91 000 0", "marking_status": "mandatory"}
            ]},
            {"id": "sweets", "name": "Сладости", "icon": "candy", "products": [
                {"id": "sweets_1704", "name": "Кондитерские изделия из сахара (включая белый шоколад), не содержащие ", "tnved": "1704", "marking_status": "mandatory"},
                {"id": "sweets_1806", "name": "Шоколад и прочие готовые пищевые продукты, содержащие какао:", "tnved": "1806", "marking_status": "mandatory"},
                {"id": "sweets_180618", "name": "Шоколадные, ореховые и иные пасты", "tnved": "1806 18", "marking_status": "mandatory"},
                {"id": "sweets_18061806", "name": "Шоколадные, ореховые и иные пасты", "tnved": "1806 18 06", "marking_status": "mandatory"},
                {"id": "sweets_1806180610", "name": "Шоколадные, ореховые и иные пасты", "tnved": "1806 18 061 0", "marking_status": "mandatory"},
                {"id": "sweets_1905", "name": "Хлеб, мучные кондитерские изделия, пирожные, печенье и прочие хлебобул", "tnved": "1905", "marking_status": "mandatory"},
                {"id": "sweets_190519", "name": "Мучные кондитерские изделия, пирожные, печенье и прочие хлебобулочные ", "tnved": "1905 19", "marking_status": "mandatory"},
                {"id": "sweets_19051905", "name": "Мучные кондитерские изделия, пирожные, печенье и прочие хлебобулочные ", "tnved": "1905 19 05", "marking_status": "mandatory"},
                {"id": "sweets_1905190510", "name": "Мучные кондитерские изделия, пирожные, печенье и прочие хлебобулочные ", "tnved": "1905 19 051 0", "marking_status": "mandatory"},
                {"id": "sweets_2006", "name": "Овощи, фрукты, орехи, кожура плодов и другие части растений, консервир", "tnved": "2006", "marking_status": "mandatory"},
                {"id": "sweets_200600", "name": "Овощи, фрукты, орехи, кожура плодов и другие части растений, консервир", "tnved": "2006 00", "marking_status": "mandatory"},
                {"id": "sweets_2007", "name": "Джемы, желе фруктовое, мармелады, пюре фруктовое или ореховое, паста ф", "tnved": "2007", "marking_status": "mandatory"},
                {"id": "sweets_2008", "name": "Фрукты, орехи и прочие съедобные части растений, приготовленные или ко", "tnved": "2008", "marking_status": "mandatory"},
                {"id": "sweets_2106", "name": "Пищевые продукты, в другом месте не поименованные или не включенные:", "tnved": "2106", "marking_status": "mandatory"},
                {"id": "sweets_210621", "name": "Сахаристые кондитерские изделия", "tnved": "2106 21", "marking_status": "mandatory"},
                {"id": "sweets_21062106", "name": "Сахаристые кондитерские изделия", "tnved": "2106 21 06", "marking_status": "mandatory"},
                {"id": "sweets_2106210690", "name": "Сахаристые кондитерские изделия", "tnved": "2106 21 069 0", "marking_status": "mandatory"}
            ]},
            {"id": "instant_drinks", "name": "Растворимые напитки", "icon": "coffee", "products": [
                {"id": "instant_drinks_1806", "name": "Шоколад и прочие готовые пищевые продукты, содержащие какао:", "tnved": "1806", "marking_status": "mandatory"},
                {"id": "instant_drinks_2106", "name": "Пищевые продукты, в другом месте не поименованные или не включенные:", "tnved": "2106", "marking_status": "mandatory"},
                {"id": "instant_drinks_1805", "name": "Какао-порошок без добавок сахара или других подслащивающих веществ; ка", "tnved": "1805", "marking_status": "mandatory"},
                {"id": "instant_drinks_180500", "name": "Какао-порошок без добавок сахара или других подслащивающих веществ; ка", "tnved": "1805 00", "marking_status": "mandatory"},
                {"id": "instant_drinks_18050000", "name": "Какао-порошок без добавок сахара или других подслащивающих веществ; ка", "tnved": "1805 00 00", "marking_status": "mandatory"},
                {"id": "instant_drinks_1805000000", "name": "Какао-порошок без добавок сахара или других подслащивающих веществ", "tnved": "1805 00 000 0", "marking_status": "mandatory"},
                {"id": "instant_drinks_180610", "name": "какао-порошок с добавлением сахара или других подслащивающих веществ:", "tnved": "1806 10", "marking_status": "mandatory"},
                {"id": "instant_drinks_18061090", "name": "Какао-порошок без добавок сахара или других подслащивающих веществ; ка", "tnved": "1806 10 90", "marking_status": "mandatory"},
                {"id": "instant_drinks_1806109000", "name": "содержащий 80 мас.% или более сахарозы (включая инвертный сахар, выраж", "tnved": "1806 10 900 0", "marking_status": "mandatory"},
                {"id": "instant_drinks_180690", "name": "прочие:", "tnved": "1806 90", "marking_status": "mandatory"},
                {"id": "instant_drinks_18069070", "name": "Какао-порошок без добавок сахара или других подслащивающих веществ; ка", "tnved": "1806 90 70", "marking_status": "mandatory"},
                {"id": "instant_drinks_1806907000", "name": "готовые изделия, содержащие какао и предназначенные для производства и", "tnved": "1806 90 700 0", "marking_status": "mandatory"},
                {"id": "instant_drinks_210690", "name": "прочие:", "tnved": "2106 90", "marking_status": "mandatory"},
                {"id": "instant_drinks_21069098", "name": "Какао-порошок без добавок сахара или других подслащивающих веществ; ка", "tnved": "2106 90 98", "marking_status": "mandatory"},
                {"id": "instant_drinks_2106909808", "name": "прочие", "tnved": "2106 90 980 8", "marking_status": "mandatory"},
                {"id": "instant_drinks_0902", "name": "Чай со вкусо-ароматическими добавками или без них:", "tnved": "0902", "marking_status": "mandatory"},
                {"id": "instant_drinks_0903", "name": "Чай со вкусо-ароматическими добавками или без них;; Мате, или парагвай", "tnved": "0903", "marking_status": "mandatory"},
                {"id": "instant_drinks_090300", "name": "Чай со вкусо-ароматическими добавками или без них;; Мате, или парагвай", "tnved": "0903 00", "marking_status": "mandatory"},
                {"id": "instant_drinks_09030000", "name": "Чай со вкусо-ароматическими добавками или без них;; Мате, или парагвай", "tnved": "0903 00 00", "marking_status": "mandatory"},
                {"id": "instant_drinks_0903000000", "name": "Мате, или парагвайский чай", "tnved": "0903 00 000 0", "marking_status": "mandatory"},
                {"id": "instant_drinks_1211", "name": "Растения и их части (включая семена и плоды), используемые главным обр", "tnved": "1211", "marking_status": "mandatory"},
                {"id": "instant_drinks_121120", "name": "Чай со вкусо-ароматическими добавками или без них;; Мате, или парагвай", "tnved": "1211 20", "marking_status": "mandatory"},
                {"id": "instant_drinks_12112000", "name": "Чай со вкусо-ароматическими добавками или без них;; Мате, или парагвай", "tnved": "1211 20 00", "marking_status": "mandatory"},
                {"id": "instant_drinks_1211200000", "name": "корни женьшеня", "tnved": "1211 20 000 0", "marking_status": "mandatory"},
                {"id": "instant_drinks_121190", "name": "прочие:", "tnved": "1211 90", "marking_status": "mandatory"},
                {"id": "instant_drinks_12119086", "name": "Чай со вкусо-ароматическими добавками или без них;; Мате, или парагвай", "tnved": "1211 90 86", "marking_status": "mandatory"},
                {"id": "instant_drinks_1211908608", "name": "прочие", "tnved": "1211 90 860 8", "marking_status": "mandatory"},
                {"id": "instant_drinks_2101", "name": "Экстракты, эссенции и концентраты кофе, чая или мате, или парагвайског", "tnved": "2101", "marking_status": "mandatory"},
                {"id": "instant_drinks_0901", "name": "Кофе, жареный или нежареный, с кофеином или без кофеина; кофейная шелу", "tnved": "0901", "marking_status": "mandatory"}
            ]}
        ]
    },
    {
        "id": "pharma",
        "name": "Фармацевтика и здоровье",
        "icon": "pill",
        "subcategories": [
            {"id": "medicines", "name": "Лекарства", "icon": "pill", "products": [
                {"id": "medicines_3002", "name": "Кровь человеческая; кровь животных, приготовленная для использования в", "tnved": "3002", "marking_status": "mandatory"},
                {"id": "medicines_3002150000", "name": "иммунологические продукты, расфасованные в виде дозированных лекарстве", "tnved": "3002 15 000 0", "marking_status": "mandatory"}
            ]},
            {"id": "tsr", "name": "Технические средства реабилитации (ТСР)", "icon": "accessibility", "products": [
                {"id": "tsr_6602", "name": "трости опорные и тактильные, костыли, опоры, поручни;", "tnved": "6602", "marking_status": "mandatory"},
                {"id": "tsr_660200", "name": "трости опорные и тактильные, костыли, опоры, поручни;", "tnved": "6602 00", "marking_status": "mandatory"},
                {"id": "tsr_66020000", "name": "трости опорные и тактильные, костыли, опоры, поручни;", "tnved": "6602 00 00", "marking_status": "mandatory"},
                {"id": "tsr_6602000000", "name": "Трости, трости-сиденья, хлысты, кнуты для верховой езды и аналогичные ", "tnved": "6602 00 000 0", "marking_status": "mandatory"},
                {"id": "tsr_7326", "name": "Изделия из черных металлов прочие:", "tnved": "7326", "marking_status": "mandatory"},
                {"id": "tsr_9021", "name": "Приспособления ортопедические, включая костыли, хирургические ремни и ", "tnved": "9021", "marking_status": "mandatory"},
                {"id": "tsr_902110", "name": "приспособления ортопедические или для лечения переломов:", "tnved": "9021 10", "marking_status": "mandatory"},
                {"id": "tsr_90211010", "name": "трости опорные и тактильные, костыли, опоры, поручни;", "tnved": "9021 10 10", "marking_status": "mandatory"},
                {"id": "tsr_9021101000", "name": "приспособления ортопедические", "tnved": "9021 10 100 0", "marking_status": "mandatory"},
                {"id": "tsr_902190", "name": "прочие:", "tnved": "9021 90", "marking_status": "mandatory"},
                {"id": "tsr_90219090", "name": "трости опорные и тактильные, костыли, опоры, поручни;", "tnved": "9021 90 90", "marking_status": "mandatory"},
                {"id": "tsr_9021909009", "name": "прочие", "tnved": "9021 90 900 9", "marking_status": "mandatory"},
                {"id": "tsr_9403", "name": "Мебель прочая и ее части:", "tnved": "9403", "marking_status": "mandatory"},
                {"id": "tsr_9620", "name": "трости опорные и тактильные, костыли, опоры, поручни;", "tnved": "9620", "marking_status": "mandatory"},
                {"id": "tsr_962000", "name": "трости опорные и тактильные, костыли, опоры, поручни;", "tnved": "9620 00", "marking_status": "mandatory"},
                {"id": "tsr_96200000", "name": "трости опорные и тактильные, костыли, опоры, поручни;", "tnved": "9620 00 00", "marking_status": "mandatory"},
                {"id": "tsr_9620000009", "name": "прочие", "tnved": "9620 00 000 9", "marking_status": "mandatory"},
                {"id": "tsr_6212", "name": "Бюстгальтеры, пояса, корсеты, подтяжки, подвязки и аналогичные изделия", "tnved": "6212", "marking_status": "mandatory"},
                {"id": "tsr_621290", "name": "ортезы, функциональные узлы протезов (из категории товаров \"части и пр", "tnved": "6212 90", "marking_status": "mandatory"},
                {"id": "tsr_62129000", "name": "ортезы, функциональные узлы протезов (из категории товаров \"части и пр", "tnved": "6212 90 00", "marking_status": "mandatory"},
                {"id": "tsr_6212900000", "name": "прочие", "tnved": "6212 90 000 0", "marking_status": "mandatory"},
                {"id": "tsr_902139", "name": "прочие:", "tnved": "9021 39", "marking_status": "mandatory"},
                {"id": "tsr_90213990", "name": "ортезы, функциональные узлы протезов (из категории товаров \"части и пр", "tnved": "9021 39 90", "marking_status": "mandatory"},
                {"id": "tsr_9021399000", "name": "прочие", "tnved": "9021 39 900 0", "marking_status": "mandatory"},
                {"id": "tsr_9019", "name": "Устройства для механотерапии; аппараты массажные; аппаратура для психо", "tnved": "9019", "marking_status": "mandatory"},
                {"id": "tsr_901910", "name": "устройства для механотерапии; аппараты массажные; аппаратура для психо", "tnved": "9019 10", "marking_status": "mandatory"},
                {"id": "tsr_90191090", "name": "противопролежневые матрацы и подушки;", "tnved": "9019 10 90", "marking_status": "mandatory"},
                {"id": "tsr_9019109009", "name": "прочие", "tnved": "9019 10 900 9", "marking_status": "mandatory"},
                {"id": "tsr_9404", "name": "Основы матрацные; принадлежности постельные и аналогичные изделия мебл", "tnved": "9404", "marking_status": "mandatory"},
                {"id": "tsr_940421", "name": "из пористой резины или пластмассы, с покрытием или без покрытия:", "tnved": "9404 21", "marking_status": "mandatory"},
                {"id": "tsr_940429", "name": "из прочих материалов:", "tnved": "9404 29", "marking_status": "mandatory"},
                {"id": "tsr_94042990", "name": "противопролежневые матрацы и подушки;", "tnved": "9404 29 90", "marking_status": "mandatory"},
                {"id": "tsr_9404299000", "name": "прочие", "tnved": "9404 29 900 0", "marking_status": "mandatory"},
                {"id": "tsr_3006", "name": "специальные средства при нарушениях функций выделения (моче- и калопри", "tnved": "3006", "marking_status": "mandatory"},
                {"id": "tsr_300691", "name": "специальные средства при нарушениях функций выделения (моче- и калопри", "tnved": "3006 91", "marking_status": "mandatory"},
                {"id": "tsr_30069100", "name": "специальные средства при нарушениях функций выделения (моче- и калопри", "tnved": "3006 91 00", "marking_status": "mandatory"},
                {"id": "tsr_3006910000", "name": "приспособления, идентифицируемые как приспособления для стомического и", "tnved": "3006 91 000 0", "marking_status": "mandatory"},
                {"id": "tsr_9018", "name": "Приборы и устройства, применяемые в медицине, хирургии, стоматологии и", "tnved": "9018", "marking_status": "mandatory"},
                {"id": "tsr_901839", "name": "специальные средства при нарушениях функций выделения (моче- и калопри", "tnved": "9018 39", "marking_status": "mandatory"},
                {"id": "tsr_90183900", "name": "специальные средства при нарушениях функций выделения (моче- и калопри", "tnved": "9018 39 00", "marking_status": "mandatory"},
                {"id": "tsr_9018390000", "name": "прочие", "tnved": "9018 39 000 0", "marking_status": "mandatory"},
                {"id": "tsr_9401", "name": "кресла-стулья с санитарным оснащением;", "tnved": "9401", "marking_status": "mandatory"},
                {"id": "tsr_940179", "name": "кресла-стулья с санитарным оснащением;", "tnved": "9401 79", "marking_status": "mandatory"},
                {"id": "tsr_94017900", "name": "кресла-стулья с санитарным оснащением;", "tnved": "9401 79 00", "marking_status": "mandatory"},
                {"id": "tsr_9401790009", "name": "прочая", "tnved": "9401 79 000 9", "marking_status": "mandatory"},
                {"id": "tsr_9402", "name": "Мебель медицинская, хирургическая, стоматологическая или ветеринарная ", "tnved": "9402", "marking_status": "mandatory"},
                {"id": "tsr_940290", "name": "кресла-стулья с санитарным оснащением;", "tnved": "9402 90", "marking_status": "mandatory"},
                {"id": "tsr_94029000", "name": "кресла-стулья с санитарным оснащением;", "tnved": "9402 90 00", "marking_status": "mandatory"},
                {"id": "tsr_9402900000", "name": "прочая", "tnved": "9402 90 000 0", "marking_status": "mandatory"},
                {"id": "tsr_8713", "name": "Коляски для людей, не способных передвигаться, оснащенные или не оснащ", "tnved": "8713", "marking_status": "mandatory"},
                {"id": "tsr_871310", "name": "кресла-стулья с санитарным оснащением;", "tnved": "8713 10", "marking_status": "mandatory"},
                {"id": "tsr_87131000", "name": "кресла-стулья с санитарным оснащением;", "tnved": "8713 10 00", "marking_status": "mandatory"},
                {"id": "tsr_8713100000", "name": "без механических устройств для передвижения", "tnved": "8713 10 000 0", "marking_status": "mandatory"},
                {"id": "tsr_3926", "name": "специальные средства при нарушениях функций выделения (моче- и калопри", "tnved": "3926", "marking_status": "mandatory"},
                {"id": "tsr_392690", "name": "прочие:", "tnved": "3926 90", "marking_status": "mandatory"},
                {"id": "tsr_39269092", "name": "специальные средства при нарушениях функций выделения (моче- и калопри", "tnved": "3926 90 92", "marking_status": "mandatory"},
                {"id": "tsr_3926909200", "name": "изготовленные из листового материала", "tnved": "3926 90 920 0", "marking_status": "mandatory"},
                {"id": "tsr_39269097", "name": "специальные средства при нарушениях функций выделения (моче- и калопри", "tnved": "3926 90 97", "marking_status": "mandatory"},
                {"id": "tsr_3926909709", "name": "прочие", "tnved": "3926 90 970 9", "marking_status": "mandatory"}
            ]},
            {"id": "vet", "name": "Ветеринарные препараты", "icon": "stethoscope", "products": [
                {"id": "vet_3002", "name": "Кровь человеческая; кровь животных, приготовленная для использования в", "tnved": "3002", "marking_status": "mandatory"},
                {"id": "vet_3002150000", "name": "иммунологические продукты, расфасованные в виде дозированных лекарстве", "tnved": "3002 15 000 0", "marking_status": "mandatory"},
                {"id": "vet_2936", "name": "Провитамины и витамины, природные или синтезированные (включая природн", "tnved": "2936", "marking_status": "mandatory"},
                {"id": "vet_2936900009", "name": "прочие", "tnved": "2936 90 000 9", "marking_status": "mandatory"},
                {"id": "vet_2941", "name": "Антибиотики:", "tnved": "2941", "marking_status": "mandatory"},
                {"id": "vet_2941900009", "name": "прочие", "tnved": "2941 90 000 9", "marking_status": "mandatory"},
                {"id": "vet_3001", "name": "Железы и прочие органы, предназначенные для органотерапии, высушенные,", "tnved": "3001", "marking_status": "mandatory"},
                {"id": "vet_300120", "name": "экстракты желез или прочих органов или их секретов:", "tnved": "3001 20", "marking_status": "mandatory"},
                {"id": "vet_3001209000", "name": "прочие", "tnved": "3001 20 900 0", "marking_status": "mandatory"},
                {"id": "vet_3002120002", "name": "прочие", "tnved": "3002 12 000 2", "marking_status": "mandatory"},
                {"id": "vet_3002120003", "name": "гемоглобин, глобулины крови и сывороточные глобулины", "tnved": "3002 12 000 3", "marking_status": "mandatory"},
                {"id": "vet_3002120009", "name": "прочие", "tnved": "3002 12 000 9", "marking_status": "mandatory"},
                {"id": "vet_3002420000", "name": "вакцины ветеринарные", "tnved": "3002 42 000 0", "marking_status": "mandatory"},
                {"id": "vet_300290", "name": "прочие:", "tnved": "3002 90", "marking_status": "mandatory"},
                {"id": "vet_3002903000", "name": "кровь животных, приготовленная для использования в терапевтических, пр", "tnved": "3002 90 300 0", "marking_status": "mandatory"}
            ]},
            {"id": "pharma_raw", "name": "Фармацевтическое сырьё, лекарственные средства", "icon": "flask", "products": [
                {"id": "pharma_raw_2932", "name": "Фармсубстанции (с кислородом)", "tnved": "2932", "marking_status": "experiment"},
                {"id": "pharma_raw_2933", "name": "Фармсубстанции (с азотом)", "tnved": "2933", "marking_status": "experiment"},
                {"id": "pharma_raw_2934", "name": "Нуклеиновые кислоты", "tnved": "2934", "marking_status": "experiment"},
                {"id": "pharma_raw_2935", "name": "Сульфонамиды", "tnved": "2935", "marking_status": "experiment"},
                {"id": "pharma_raw_2936", "name": "Витамины", "tnved": "2936", "marking_status": "experiment"},
                {"id": "pharma_raw_2937", "name": "Гормоны", "tnved": "2937", "marking_status": "experiment"},
                {"id": "pharma_raw_2939", "name": "Гликозиды, алкалоиды", "tnved": "2939", "marking_status": "experiment"},
                {"id": "pharma_raw_2941", "name": "Антибиотики", "tnved": "2941", "marking_status": "experiment"},
                {"id": "pharma_raw_in_process", "name": "In-process продукты", "tnved": "-", "marking_status": "experiment"},
                {"id": "pharma_raw_in_bulk", "name": "In-bulk продукты", "tnved": "-", "marking_status": "experiment"},
                {"id": "pharma_raw_afs", "name": "АФС (активные фармацевтические субстанции)", "tnved": "-", "marking_status": "experiment"}
            ]},
            {"id": "medical_devices", "name": "Медицинские изделия", "icon": "heart-pulse", "products": [
                {"id": "medical_devices_9021", "name": "Приспособления ортопедические, включая костыли, хирургические ремни и ", "tnved": "9021", "marking_status": "mandatory"},
                {"id": "medical_devices_902110", "name": "приспособления ортопедические или для лечения переломов:", "tnved": "9021 10", "marking_status": "mandatory"},
                {"id": "medical_devices_90211010", "name": "трости опорные и тактильные, костыли, опоры, поручни;", "tnved": "9021 10 10", "marking_status": "mandatory"},
                {"id": "medical_devices_9021101000", "name": "приспособления ортопедические", "tnved": "9021 10 100 0", "marking_status": "mandatory"},
                {"id": "medical_devices_902190", "name": "прочие:", "tnved": "9021 90", "marking_status": "mandatory"},
                {"id": "medical_devices_90219090", "name": "трости опорные и тактильные, костыли, опоры, поручни;", "tnved": "9021 90 90", "marking_status": "mandatory"},
                {"id": "medical_devices_3926", "name": "специальные средства при нарушениях функций выделения (моче- и калопри", "tnved": "3926", "marking_status": "mandatory"},
                {"id": "medical_devices_8421", "name": "Центрифуги, включая центробежные сушилки; оборудование и устройства дл", "tnved": "8421", "marking_status": "mandatory"},
                {"id": "medical_devices_842139", "name": "прочее:", "tnved": "8421 39", "marking_status": "mandatory"},
                {"id": "medical_devices_84213920", "name": "131980152690152700182750209360292620336330375930", "tnved": "8421 39 20", "marking_status": "mandatory"},
                {"id": "medical_devices_8421392008", "name": "прочее", "tnved": "8421 39 200 8", "marking_status": "mandatory"},
                {"id": "medical_devices_902140", "name": "113850173110202800202810204370210000228560302870", "tnved": "9021 40", "marking_status": "mandatory"},
                {"id": "medical_devices_90214000", "name": "113850173110202800202810204370210000228560302870", "tnved": "9021 40 00", "marking_status": "mandatory"},
                {"id": "medical_devices_9021400000", "name": "аппараты слуховые, кроме частей и принадлежностей", "tnved": "9021 40 000 0", "marking_status": "mandatory"},
                {"id": "medical_devices_9021909001", "name": "стенты коронарные", "tnved": "9021 90 900 1", "marking_status": "mandatory"},
                {"id": "medical_devices_9022", "name": "Аппаратура, основанная на использовании рентгеновского, альфа-, бета- ", "tnved": "9022", "marking_status": "mandatory"},
                {"id": "medical_devices_902212", "name": "135190142570280730282030", "tnved": "9022 12", "marking_status": "mandatory"},
                {"id": "medical_devices_90221200", "name": "135190142570280730282030", "tnved": "9022 12 00", "marking_status": "mandatory"},
                {"id": "medical_devices_9022120000", "name": "компьютерные томографы", "tnved": "9022 12 000 0", "marking_status": "mandatory"},
                {"id": "medical_devices_9619", "name": "233730233900280360320550331320331330331830356150126750233860343580", "tnved": "9619", "marking_status": "mandatory"},
                {"id": "medical_devices_961900", "name": "Женские гигиенические прокладки и тампоны, пеленки, подгузники и анало", "tnved": "9619 00", "marking_status": "mandatory"},
                {"id": "medical_devices_96190089", "name": "233730233900280360320550331320331330331830356150126750233860343580", "tnved": "9619 00 89", "marking_status": "mandatory"},
                {"id": "medical_devices_392620", "name": "1225401225601226101226301226401298001299001302201393101393501393601565", "tnved": "3926 20", "marking_status": "mandatory"},
                {"id": "medical_devices_39262000", "name": "1225401225601226101226301226401298001299001302201393101393501393601565", "tnved": "3926 20 00", "marking_status": "mandatory"},
                {"id": "medical_devices_3926200000", "name": "одежда и принадлежности к одежде (включая перчатки, рукавицы и митенки", "tnved": "3926 20 000 0", "marking_status": "mandatory"}
            ]},
            {"id": "supplements", "name": "БАД", "icon": "apple", "products": [
                {"id": "supplements_220299", "name": "прочие:", "tnved": "2202 99", "marking_status": "mandatory"},
                {"id": "supplements_2202999100", "name": "менее 0,2 мас.%", "tnved": "2202 99 910 0", "marking_status": "mandatory"},
                {"id": "supplements_1602", "name": "Готовые или консервированные продукты из мяса, мясных субпродуктов, кр", "tnved": "1602", "marking_status": "mandatory"},
                {"id": "supplements_1904", "name": "Готовые пищевые продукты, полученные путем вздувания или обжаривания з", "tnved": "1904", "marking_status": "mandatory"},
                {"id": "supplements_190410", "name": "готовые пищевые продукты, полученные путем вздувания или обжаривания з", "tnved": "1904 10", "marking_status": "mandatory"},
                {"id": "supplements_2202100000", "name": "воды, включая минеральные и газированные, содержащие добавки сахара ил", "tnved": "2202 10 000 0", "marking_status": "mandatory"},
                {"id": "supplements_1704", "name": "Кондитерские изделия из сахара (включая белый шоколад), не содержащие ", "tnved": "1704", "marking_status": "mandatory"},
                {"id": "supplements_1806", "name": "Шоколад и прочие готовые пищевые продукты, содержащие какао:", "tnved": "1806", "marking_status": "mandatory"},
                {"id": "supplements_2106", "name": "Пищевые продукты, в другом месте не поименованные или не включенные:", "tnved": "2106", "marking_status": "mandatory"},
                {"id": "supplements_180690", "name": "прочие:", "tnved": "1806 90", "marking_status": "mandatory"},
                {"id": "supplements_18069070", "name": "Какао-порошок без добавок сахара или других подслащивающих веществ; ка", "tnved": "1806 90 70", "marking_status": "mandatory"},
                {"id": "supplements_1806907000", "name": "готовые изделия, содержащие какао и предназначенные для производства и", "tnved": "1806 90 700 0", "marking_status": "mandatory"},
                {"id": "supplements_210690", "name": "прочие:", "tnved": "2106 90", "marking_status": "mandatory"},
                {"id": "supplements_21069098", "name": "Какао-порошок без добавок сахара или других подслащивающих веществ; ка", "tnved": "2106 90 98", "marking_status": "mandatory"},
                {"id": "supplements_2106909808", "name": "прочие", "tnved": "2106 90 980 8", "marking_status": "mandatory"},
                {"id": "supplements_1211", "name": "Растения и их части (включая семена и плоды), используемые главным обр", "tnved": "1211", "marking_status": "mandatory"},
                {"id": "supplements_121190", "name": "прочие:", "tnved": "1211 90", "marking_status": "mandatory"},
                {"id": "supplements_12119086", "name": "Чай со вкусо-ароматическими добавками или без них;; Мате, или парагвай", "tnved": "1211 90 86", "marking_status": "mandatory"},
                {"id": "supplements_1211908608", "name": "прочие", "tnved": "1211 90 860 8", "marking_status": "mandatory"},
                {"id": "supplements_2101", "name": "Экстракты, эссенции и концентраты кофе, чая или мате, или парагвайског", "tnved": "2101", "marking_status": "mandatory"},
                {"id": "supplements_3002", "name": "Кровь человеческая; кровь животных, приготовленная для использования в", "tnved": "3002", "marking_status": "mandatory"},
                {"id": "supplements_2936", "name": "Провитамины и витамины, природные или синтезированные (включая природн", "tnved": "2936", "marking_status": "mandatory"},
                {"id": "supplements_3001", "name": "Железы и прочие органы, предназначенные для органотерапии, высушенные,", "tnved": "3001", "marking_status": "mandatory"},
                {"id": "supplements_300120", "name": "экстракты желез или прочих органов или их секретов:", "tnved": "3001 20", "marking_status": "mandatory"},
                {"id": "supplements_300290", "name": "прочие:", "tnved": "3002 90", "marking_status": "mandatory"},
                {"id": "supplements_3002903000", "name": "кровь животных, приготовленная для использования в терапевтических, пр", "tnved": "3002 90 300 0", "marking_status": "mandatory"},
                {"id": "supplements_120400", "name": "Семена льна, дробленые или недробленые:", "tnved": "1204 00", "marking_status": "mandatory"},
                {"id": "supplements_1204009000", "name": "прочие", "tnved": "1204 00 900 0", "marking_status": "mandatory"},
                {"id": "supplements_1208", "name": "Мука тонкого и грубого помола из семян или плодов масличных культур, к", "tnved": "1208", "marking_status": "mandatory"},
                {"id": "supplements_1208900000", "name": "прочая", "tnved": "1208 90 000 0", "marking_status": "mandatory"},
                {"id": "supplements_1210", "name": "Шишки хмеля, свежие или сушеные, дробленые или недробленые, в порошкоо", "tnved": "1210", "marking_status": "mandatory"},
                {"id": "supplements_121020", "name": "шишки хмеля дробленые, в порошкообразном виде или в виде гранул; лупул", "tnved": "1210 20", "marking_status": "mandatory"},
                {"id": "supplements_1210209000", "name": "прочие", "tnved": "1210 20 900 0", "marking_status": "mandatory"},
                {"id": "supplements_1212", "name": "Плоды рожкового дерева, морские и прочие водоросли, свекла сахарная и ", "tnved": "1212", "marking_status": "mandatory"},
                {"id": "supplements_1212210000", "name": "пригодные для употребления в пищу", "tnved": "1212 21 000 0", "marking_status": "mandatory"},
                {"id": "supplements_1302", "name": "Соки и экстракты растительные; пектиновые вещества, пектинаты и пектат", "tnved": "1302", "marking_status": "mandatory"},
                {"id": "supplements_130219", "name": "прочие:", "tnved": "1302 19", "marking_status": "mandatory"},
                {"id": "supplements_1302199000", "name": "прочие", "tnved": "1302 19 900 0", "marking_status": "mandatory"},
                {"id": "supplements_1504", "name": "Жиры, масла и их фракции, из рыбы или морских млекопитающих, нерафинир", "tnved": "1504", "marking_status": "mandatory"},
                {"id": "supplements_150410", "name": "жиры из печени рыбы и их фракции:", "tnved": "1504 10", "marking_status": "mandatory"},
                {"id": "supplements_1504101000", "name": "с содержанием витамина А не более 2500 МЕ/г", "tnved": "1504 10 100 0", "marking_status": "mandatory"},
                {"id": "supplements_150420", "name": "жиры и масла из рыбы и их фракции, кроме жира из печени:", "tnved": "1504 20", "marking_status": "mandatory"},
                {"id": "supplements_1504209000", "name": "прочие", "tnved": "1504 20 900 0", "marking_status": "mandatory"},
                {"id": "supplements_1515", "name": "Прочие нелетучие жиры и масла (включая масло жожоба) растительного или", "tnved": "1515", "marking_status": "mandatory"},
                {"id": "supplements_1515110000", "name": "масло сырое", "tnved": "1515 11 000 0", "marking_status": "mandatory"},
                {"id": "supplements_151519", "name": "прочие:", "tnved": "1515 19", "marking_status": "mandatory"},
                {"id": "supplements_1515199000", "name": "прочие", "tnved": "1515 19 900 0", "marking_status": "mandatory"},
                {"id": "supplements_151590", "name": "прочие:", "tnved": "1515 90", "marking_status": "mandatory"},
                {"id": "supplements_1515906900", "name": "в твердом виде, прочие; в жидком виде", "tnved": "1515 90 690 0", "marking_status": "mandatory"},
                {"id": "supplements_1515908900", "name": "в твердом виде, прочие; в жидком виде", "tnved": "1515 90 890 0", "marking_status": "mandatory"},
                {"id": "supplements_1516", "name": "Жиры и масла животного, растительного или микробиологического происхож", "tnved": "1516", "marking_status": "mandatory"},
                {"id": "supplements_151610", "name": "жиры и масла животного происхождения и их фракции:", "tnved": "1516 10", "marking_status": "mandatory"},
                {"id": "supplements_1516109000", "name": "прочие", "tnved": "1516 10 900 0", "marking_status": "mandatory"},
                {"id": "supplements_151790", "name": "прочие:", "tnved": "1517 90", "marking_status": "mandatory"},
                {"id": "supplements_1517909900", "name": "прочие", "tnved": "1517 90 990 0", "marking_status": "mandatory"},
                {"id": "supplements_160290", "name": "прочие, включая готовые продукты из крови любых животных:", "tnved": "1602 90", "marking_status": "mandatory"},
                {"id": "supplements_1602909909", "name": "прочие", "tnved": "1602 90 990 9", "marking_status": "mandatory"},
                {"id": "supplements_1702", "name": "Прочие сахара, включая химически чистые лактозу, мальтозу, глюкозу и ф", "tnved": "1702", "marking_status": "mandatory"},
                {"id": "supplements_170230", "name": "глюкоза и сироп глюкозы, не содержащие фруктозу или содержащие менее 2", "tnved": "1702 30", "marking_status": "mandatory"},
                {"id": "supplements_1702305000", "name": "в виде белого кристаллического порошка, агломерированного или неагломе", "tnved": "1702 30 500 0", "marking_status": "mandatory"},
                {"id": "supplements_170240", "name": "глюкоза и сироп глюкозы, содержащие в сухом состоянии не менее 20 мас.", "tnved": "1702 40", "marking_status": "mandatory"},
                {"id": "supplements_1702409000", "name": "прочие", "tnved": "1702 40 900 0", "marking_status": "mandatory"},
                {"id": "supplements_170260", "name": "фруктоза прочая и сироп фруктозы, содержащие в сухом состоянии более 5", "tnved": "1702 60", "marking_status": "mandatory"},
                {"id": "supplements_1702609500", "name": "прочие", "tnved": "1702 60 950 0", "marking_status": "mandatory"},
                {"id": "supplements_170290", "name": "прочие, включая инвертный сахар и прочие сахара и сахарные сиропы, сод", "tnved": "1702 90", "marking_status": "mandatory"},
                {"id": "supplements_1702909500", "name": "прочие", "tnved": "1702 90 950 0", "marking_status": "mandatory"},
                {"id": "supplements_170490", "name": "прочие:", "tnved": "1704 90", "marking_status": "mandatory"},
                {"id": "supplements_1704905500", "name": "пастилки от боли в горле и таблетки от кашля", "tnved": "1704 90 550 0", "marking_status": "mandatory"},
                {"id": "supplements_1704907100", "name": "леденцовая карамель, с начинкой или без начинки", "tnved": "1704 90 710 0", "marking_status": "mandatory"},
                {"id": "supplements_1704908200", "name": "отпрессованные таблетки", "tnved": "1704 90 820 0", "marking_status": "mandatory"},
                {"id": "supplements_1806310000", "name": "с начинкой", "tnved": "1806 31 000 0", "marking_status": "mandatory"},
                {"id": "supplements_180632", "name": "без начинки:", "tnved": "1806 32", "marking_status": "mandatory"},
                {"id": "supplements_1904109000", "name": "прочие", "tnved": "1904 10 900 0", "marking_status": "mandatory"},
                {"id": "supplements_210112", "name": "готовые продукты на основе этих экстрактов, эссенций или концентратов ", "tnved": "2101 12", "marking_status": "mandatory"},
                {"id": "supplements_2101129201", "name": "в первичных упаковках нетто-массой не более 3 кг", "tnved": "2101 12 920 1", "marking_status": "mandatory"},
                {"id": "supplements_210610", "name": "белковые концентраты и текстурированные белковые вещества:", "tnved": "2106 10", "marking_status": "mandatory"},
                {"id": "supplements_2106108000", "name": "прочие", "tnved": "2106 10 800 0", "marking_status": "mandatory"},
                {"id": "supplements_2106905800", "name": "прочие", "tnved": "2106 90 580 0", "marking_status": "mandatory"},
                {"id": "supplements_2106909300", "name": "не содержащие молочных жиров, сахарозы, изоглюкозы, глюкозы или крахма", "tnved": "2106 90 930 0", "marking_status": "mandatory"},
                {"id": "supplements_2106909801", "name": "жевательная резинка без сахара (сахарозы) и/или с использованием замен", "tnved": "2106 90 980 1", "marking_status": "mandatory"},
                {"id": "supplements_2106909803", "name": "смеси витаминов и минеральных веществ, предназначенные для сбалансиров", "tnved": "2106 90 980 3", "marking_status": "mandatory"},
                {"id": "supplements_2202991800", "name": "прочие", "tnved": "2202 99 180 0", "marking_status": "mandatory"},
                {"id": "supplements_2922", "name": "Аминосоединения, включающие кислородсодержащую функциональную группу:", "tnved": "2922", "marking_status": "mandatory"},
                {"id": "supplements_2922410000", "name": "лизин и его сложные эфиры; соли этих соединений", "tnved": "2922 41 000 0", "marking_status": "mandatory"},
                {"id": "supplements_2922420000", "name": "глутаминовая кислота и ее соли", "tnved": "2922 42 000 0", "marking_status": "mandatory"},
                {"id": "supplements_2923", "name": "Соли и гидроксиды четвертичного аммониевого основания; лецитины и фосф", "tnved": "2923", "marking_status": "mandatory"},
                {"id": "supplements_2923200000", "name": "лецитины и фосфоаминолипиды прочие", "tnved": "2923 20 000 0", "marking_status": "mandatory"},
                {"id": "supplements_2923900009", "name": "прочие", "tnved": "2923 90 000 9", "marking_status": "mandatory"},
                {"id": "supplements_3002490001", "name": "культуры микроорганизмов", "tnved": "3002 49 000 1", "marking_status": "mandatory"},
                {"id": "supplements_121299", "name": "прочие:", "tnved": "1212 99", "marking_status": "mandatory"},
                {"id": "supplements_1212999509", "name": "прочие", "tnved": "1212 99 950 9", "marking_status": "mandatory"},
                {"id": "supplements_130220", "name": "пектиновые вещества, пектинаты и пектаты:", "tnved": "1302 20", "marking_status": "mandatory"},
                {"id": "supplements_1302201000", "name": "сухие", "tnved": "1302 20 100 0", "marking_status": "mandatory"},
                {"id": "supplements_1302209000", "name": "прочие", "tnved": "1302 20 900 0", "marking_status": "mandatory"},
                {"id": "supplements_1504201000", "name": "твердые фракции", "tnved": "1504 20 100 0", "marking_status": "mandatory"},
                {"id": "supplements_1516101000", "name": "в первичных упаковках нетто-массой не более 1 кг", "tnved": "1516 10 100 0", "marking_status": "mandatory"},
                {"id": "supplements_160300", "name": "Экстракты и соки из мяса, рыбы или ракообразных, моллюсков или прочих ", "tnved": "1603 00", "marking_status": "mandatory"},
                {"id": "supplements_1603001000", "name": "в первичных упаковках нетто-массой 1 кг или менее", "tnved": "1603 00 100 0", "marking_status": "mandatory"},
                {"id": "supplements_1806903100", "name": "с начинкой", "tnved": "1806 90 310 0", "marking_status": "mandatory"},
                {"id": "supplements_190190", "name": "прочие:", "tnved": "1901 90", "marking_status": "mandatory"},
                {"id": "supplements_1901909800", "name": "прочие", "tnved": "1901 90 980 0", "marking_status": "mandatory"},
                {"id": "supplements_210220", "name": "дрожжи неактивные; прочие мертвые одноклеточные микроорганизмы:", "tnved": "2102 20", "marking_status": "mandatory"},
                {"id": "supplements_2102201100", "name": "в виде таблеток, кубиков или в аналогичной форме, или в первичных упак", "tnved": "2102 20 110 0", "marking_status": "mandatory"},
                {"id": "supplements_292249", "name": "прочие:", "tnved": "2922 49", "marking_status": "mandatory"},
                {"id": "supplements_2922498500", "name": "прочие", "tnved": "2922 49 850 0", "marking_status": "mandatory"},
                {"id": "supplements_2925", "name": "Соединения, содержащие карбоксимидную функциональную группу (включая с", "tnved": "2925", "marking_status": "mandatory"},
                {"id": "supplements_2925290000", "name": "прочие", "tnved": "2925 29 000 0", "marking_status": "mandatory"},
                {"id": "supplements_3502", "name": "Альбумины (включая концентраты двух или более сывороточных белков, сод", "tnved": "3502", "marking_status": "mandatory"},
                {"id": "supplements_350290", "name": "прочие:", "tnved": "3502 90", "marking_status": "mandatory"},
                {"id": "supplements_3502907000", "name": "прочие", "tnved": "3502 90 700 0", "marking_status": "mandatory"},
                {"id": "supplements_3802", "name": "Уголь активированный; продукты минеральные природные активированные; у", "tnved": "3802", "marking_status": "mandatory"},
                {"id": "supplements_3802100000", "name": "уголь активированный", "tnved": "3802 10 000 0", "marking_status": "mandatory"},
                {"id": "supplements_3913", "name": "Полимеры природные (например, альгиновая кислота) и полимеры природные", "tnved": "3913", "marking_status": "mandatory"},
                {"id": "supplements_3913100000", "name": "кислота альгиновая, ее соли и сложные эфиры", "tnved": "3913 10 000 0", "marking_status": "mandatory"},
                {"id": "supplements_1504109900", "name": "прочие", "tnved": "1504 10 990 0", "marking_status": "mandatory"},
                {"id": "supplements_3507", "name": "Ферменты; ферментные препараты, в другом месте не поименованные или не", "tnved": "3507", "marking_status": "mandatory"},
                {"id": "supplements_350790", "name": "прочие:", "tnved": "3507 90", "marking_status": "mandatory"}
            ]},
            {"id": "antiseptics", "name": "Антисептики и дезинфицирующие средства", "icon": "spray-can", "products": []},
            {"id": "wheelchairs", "name": "Кресла-коляски", "icon": "wheelchair", "products": [
                {"id": "wheelchairs_8713", "name": "Коляски для людей, не способных передвигаться, оснащенные или не оснащ", "tnved": "8713", "marking_status": "mandatory"},
                {"id": "wheelchairs_871310", "name": "кресла-стулья с санитарным оснащением;", "tnved": "8713 10", "marking_status": "mandatory"},
                {"id": "wheelchairs_87131000", "name": "кресла-стулья с санитарным оснащением;", "tnved": "8713 10 00", "marking_status": "mandatory"},
                {"id": "wheelchairs_8713100000", "name": "без механических устройств для передвижения", "tnved": "8713 10 000 0", "marking_status": "mandatory"},
                {"id": "wheelchairs_871390", "name": "Кресла-коляски электрические (прочие, оснащенные двигателем или другим", "tnved": "8713 90", "marking_status": "mandatory"},
                {"id": "wheelchairs_87139000", "name": "Кресла-коляски электрические (прочие, оснащенные двигателем или другим", "tnved": "8713 90 00", "marking_status": "mandatory"},
                {"id": "wheelchairs_8713900000", "name": "прочие", "tnved": "8713 90 000 0", "marking_status": "mandatory"},
                {"id": "wheelchairs_3092", "name": "Коляски инвалидные, кроме частей и принадлежностей", "tnved": "3092", "marking_status": "mandatory"},
                {"id": "wheelchairs_309220", "name": "Коляски инвалидные, кроме частей и принадлежностей", "tnved": "3092 20", "marking_status": "mandatory"},
                {"id": "wheelchairs_30922000", "name": "Коляски инвалидные, кроме частей и принадлежностей", "tnved": "3092 20 00", "marking_status": "mandatory"},
                {"id": "wheelchairs_3250", "name": "Изделия медицинские, в том числе хирургические, прочие, не включенные ", "tnved": "3250", "marking_status": "mandatory"},
                {"id": "wheelchairs_325050", "name": "Изделия медицинские, в том числе хирургические, прочие, не включенные ", "tnved": "3250 50", "marking_status": "mandatory"},
                {"id": "wheelchairs_32505019", "name": "Изделия медицинские, в том числе хирургические, прочие, не включенные ", "tnved": "3250 50 19", "marking_status": "mandatory"},
                {"id": "wheelchairs_3099", "name": "Средства транспортные и оборудование прочие, не включенные в другие гр", "tnved": "3099", "marking_status": "mandatory"},
                {"id": "wheelchairs_309910", "name": "Средства транспортные и оборудование прочие, не включенные в другие гр", "tnved": "3099 10", "marking_status": "mandatory"},
                {"id": "wheelchairs_30991019", "name": "Средства транспортные и оборудование прочие, не включенные в другие гр", "tnved": "3099 10 19", "marking_status": "mandatory"}
            ]},
            {"id": "sports_nutrition", "name": "Спортивное питание", "icon": "dumbbell", "products": [
                {"id": "sports_nutrition_0210", "name": "Мясо и пищевые мясные субпродукты, соленые, в рассоле, сушеные или коп", "tnved": "0210", "marking_status": "mandatory"}
            ]}
        ]
    },
    {
        "id": "cosmetics",
        "name": "Косметика, гигиена и бытовая химия",
        "icon": "sparkles",
        "subcategories": [
            {"id": "perfume", "name": "Духи и туалетная вода", "icon": "spray-can", "products": [
                {"id": "perfume_330300", "name": "Духи и туалетная вода:", "tnved": "3303 00", "marking_status": "mandatory"},
                {"id": "perfume_dukhi", "name": "Духи", "tnved": "3303 00", "marking_status": "mandatory"},
                {"id": "perfume_tualetnaya_voda", "name": "Туалетная вода", "tnved": "3303 00", "marking_status": "mandatory"},
                {"id": "perfume_odekolon", "name": "Одеколон", "tnved": "3303 00", "marking_status": "mandatory"},
                {"id": "perfume_parfyumernaya_voda", "name": "Парфюмерная вода", "tnved": "3303 00", "marking_status": "mandatory"},
                {"id": "perfume_nabory", "name": "Наборы парфюмерной продукции (импорт)", "tnved": "3303 00", "marking_status": "mandatory"}
            ]},
            {"id": "cosmetics_hygiene", "name": "Косметика, бытовая химия и товары личной гигиены", "icon": "sparkles", "products": [
                {"id": "cosmetics_hygiene_3304", "name": "Косметические средства или средства для макияжа и средства для ухода з", "tnved": "3304", "marking_status": "mandatory"},
                {"id": "cosmetics_hygiene_3401", "name": "Мыло; поверхностно-активные органические вещества и средства, применяе", "tnved": "3401", "marking_status": "mandatory"},
                {"id": "cosmetics_hygiene_340134", "name": "Мыло, моющие средства, бытовая химия и т.д.", "tnved": "3401 34", "marking_status": "mandatory"},
                {"id": "cosmetics_hygiene_34013402", "name": "Мыло, моющие средства, бытовая химия и т.д.", "tnved": "3401 34 02", "marking_status": "mandatory"},
                {"id": "cosmetics_hygiene_3401340250", "name": "Мыло, моющие средства, бытовая химия и т.д.", "tnved": "3401 34 025 0", "marking_status": "mandatory"},
                {"id": "cosmetics_hygiene_3305", "name": "Средства для волос:", "tnved": "3305", "marking_status": "mandatory"},
                {"id": "cosmetics_hygiene_330533", "name": "Средства для волос, средства для бритья, дезодоранты, ароматизаторы и ", "tnved": "3305 33", "marking_status": "mandatory"},
                {"id": "cosmetics_hygiene_33053307", "name": "Средства для волос, средства для бритья, дезодоранты, ароматизаторы и ", "tnved": "3305 33 07", "marking_status": "mandatory"},
                {"id": "cosmetics_hygiene_3305330733", "name": "Средства для волос, средства для бритья, дезодоранты, ароматизаторы и ", "tnved": "3305 33 073 3", "marking_status": "mandatory"},
                {"id": "cosmetics_hygiene_330433", "name": "Косметические средства, декоративная косметика, средства для ухода за ", "tnved": "3304 33", "marking_status": "mandatory"},
                {"id": "cosmetics_hygiene_33043304", "name": "Косметические средства, декоративная косметика, средства для ухода за ", "tnved": "3304 33 04", "marking_status": "mandatory"},
                {"id": "cosmetics_hygiene_3304330499", "name": "Косметические средства, декоративная косметика, средства для ухода за ", "tnved": "3304 33 049 9", "marking_status": "mandatory"},
                {"id": "cosmetics_hygiene_8212", "name": "Бритвы и лезвия для них (включая полосовые заготовки для лезвий):", "tnved": "8212", "marking_status": "mandatory"},
                {"id": "cosmetics_hygiene_821210", "name": "бритвы:", "tnved": "8212 10", "marking_status": "mandatory"},
                {"id": "cosmetics_hygiene_82121010", "name": "Бритвы и лезвия для них, включая полосовые заготовки для лезвий", "tnved": "8212 10 10", "marking_status": "mandatory"},
                {"id": "cosmetics_hygiene_8212101000", "name": "безопасные бритвы с несменяемыми лезвиями", "tnved": "8212 10 100 0", "marking_status": "mandatory"},
                {"id": "cosmetics_mylo_tualetnoe", "name": "Мыло туалетное", "tnved": "3401", "marking_status": "mandatory"},
                {"id": "cosmetics_mylo_hozyaystvennoe", "name": "Мыло хозяйственное", "tnved": "3401", "marking_status": "mandatory"},
                {"id": "cosmetics_moyushchie_pav", "name": "Моющие средства ПАВ", "tnved": "3402 50 000 0", "marking_status": "mandatory"},
                {"id": "cosmetics_chistka_obuvi", "name": "Средства для чистки обуви", "tnved": "3405 40 00 0", "marking_status": "mandatory"},
                {"id": "cosmetics_shampuni", "name": "Шампуни", "tnved": "3305", "marking_status": "mandatory"},
                {"id": "cosmetics_kondicionery_volos", "name": "Кондиционеры для волос", "tnved": "3305", "marking_status": "mandatory"},
                {"id": "cosmetics_laki_volos", "name": "Лаки для волос", "tnved": "3305", "marking_status": "mandatory"},
                {"id": "cosmetics_kraski_volos", "name": "Краски для волос", "tnved": "3305", "marking_status": "mandatory"},
                {"id": "cosmetics_sredstva_britya", "name": "Средства для бритья", "tnved": "3307", "marking_status": "mandatory"},
                {"id": "cosmetics_dezodoranty", "name": "Дезодоранты", "tnved": "3307", "marking_status": "mandatory"},
                {"id": "cosmetics_aromatizatory", "name": "Ароматизаторы помещений", "tnved": "3307", "marking_status": "mandatory"},
                {"id": "cosmetics_kremy_lico", "name": "Кремы для лица", "tnved": "3304", "marking_status": "mandatory"},
                {"id": "cosmetics_kremy_ruki_telo", "name": "Кремы для рук и тела", "tnved": "3304", "marking_status": "mandatory"},
                {"id": "cosmetics_dekorativnaya", "name": "Декоративная косметика", "tnved": "3304", "marking_status": "mandatory"},
                {"id": "cosmetics_laki_nogtey", "name": "Лаки для ногтей", "tnved": "3304", "marking_status": "mandatory"},
                {"id": "cosmetics_sredstva_zagara", "name": "Средства для загара", "tnved": "3304", "marking_status": "mandatory"},
                {"id": "cosmetics_zubnaya_pasta", "name": "Зубная паста", "tnved": "3306", "marking_status": "mandatory"},
                {"id": "cosmetics_opolaskivateli_rta", "name": "Ополаскиватели для рта", "tnved": "3306", "marking_status": "mandatory"},
                {"id": "cosmetics_britvy_bezopasnye", "name": "Бритвы безопасные", "tnved": "8212 10 100 0", "marking_status": "mandatory"},
                {"id": "cosmetics_britvy_prochie", "name": "Бритвы прочие", "tnved": "8212 10 900 0", "marking_status": "mandatory"},
                {"id": "cosmetics_lezviya_britv", "name": "Лезвия для бритв", "tnved": "8212 20 000 0", "marking_status": "mandatory"},
                {"id": "cosmetics_zagotovki_lezviy", "name": "Заготовки для лезвий", "tnved": "8212 90 000 0", "marking_status": "mandatory"}
            ]}
        ]
    },
    {
        "id": "non_food",
        "name": "Непродовольственные товары",
        "icon": "box",
        "subcategories": [
            {"id": "light_industry", "name": "Товары лёгкой промышленности", "icon": "shirt", "products": [
                {"id": "light_industry_6212", "name": "Бюстгальтеры, пояса, корсеты, подтяжки, подвязки и аналогичные изделия", "tnved": "6212", "marking_status": "mandatory"},
                {"id": "light_industry_4203", "name": "Предметы одежды и принадлежности к одежде, из натуральной кожи или ком", "tnved": "4203", "marking_status": "mandatory"},
                {"id": "light_industry_420310", "name": "Предметы одежды, включая рабочую одежду, изготовленные из натуральной ", "tnved": "4203 10", "marking_status": "mandatory"},
                {"id": "light_industry_42031000", "name": "Предметы одежды, включая рабочую одежду, изготовленные из натуральной ", "tnved": "4203 10 00", "marking_status": "mandatory"},
                {"id": "light_industry_6106", "name": "Блузки, блузы и блузоны трикотажные машинного или ручного вязания, жен", "tnved": "6106", "marking_status": "mandatory"},
                {"id": "light_industry_6201", "name": "Пальто, полупальто, накидки, плащи, куртки (включая лыжные), ветровки,", "tnved": "6201", "marking_status": "mandatory"},
                {"id": "light_industry_6202", "name": "Пальто, полупальто, накидки, плащи, куртки (включая лыжные), ветровки,", "tnved": "6202", "marking_status": "mandatory"},
                {"id": "light_industry_6302", "name": "Белье постельное, столовое, туалетное и кухонное:", "tnved": "6302", "marking_status": "mandatory"},
                {"id": "light_industry_6105", "name": "Рубашки трикотажные машинного или ручного вязания, мужские или для мал", "tnved": "6105", "marking_status": "mandatory"},
                {"id": "light_industry_4304", "name": "Предметы одежды из искусственного меха", "tnved": "4304", "marking_status": "mandatory"},
                {"id": "light_industry_430400", "name": "Предметы одежды из искусственного меха", "tnved": "4304 00", "marking_status": "mandatory"},
                {"id": "light_industry_43040000", "name": "Предметы одежды из искусственного меха", "tnved": "4304 00 00", "marking_status": "mandatory"},
                {"id": "light_industry_4304000000", "name": "Мех искусственный и изделия из него", "tnved": "4304 00 000 0", "marking_status": "mandatory"},
                {"id": "light_industry_6210", "name": "Одежда из фетра или нетканых материалов, текстильных материалов с проп", "tnved": "6210", "marking_status": "mandatory"},
                {"id": "light_industry_6113", "name": "Одежда из фетра или нетканых материалов, текстильных материалов с проп", "tnved": "6113", "marking_status": "mandatory"},
                {"id": "light_industry_611300", "name": "Одежда из фетра или нетканых материалов, текстильных материалов с проп", "tnved": "6113 00", "marking_status": "mandatory"},
                {"id": "light_industry_6101", "name": "Пальто, куртки, плащи, плащи с капюшонами, анораки, ветровки, штормовк", "tnved": "6101", "marking_status": "mandatory"},
                {"id": "light_industry_6102", "name": "Пальто, куртки, плащи, плащи с капюшонами, анораки, ветровки, штормовк", "tnved": "6102", "marking_status": "mandatory"},
                {"id": "light_industry_6205", "name": "Рубашки мужские или для мальчиков:", "tnved": "6205", "marking_status": "mandatory"},
                {"id": "light_industry_6206", "name": "Блузки, блузы и блузоны женские или для девочек:", "tnved": "6206", "marking_status": "mandatory"},
                {"id": "light_industry_6211", "name": "Костюмы спортивные, лыжные и купальные; предметы одежды прочие:", "tnved": "6211", "marking_status": "mandatory"},
                {"id": "light_industry_6103", "name": "Костюмы, комплекты, пиджаки, блайзеры, брюки, комбинезоны с нагрудника", "tnved": "6103", "marking_status": "mandatory"},
                {"id": "light_industry_6104", "name": "Костюмы, комплекты, жакеты, блайзеры, платья, юбки, юбки-брюки, брюки,", "tnved": "6104", "marking_status": "mandatory"},
                {"id": "light_industry_6203", "name": "Костюмы, комплекты, пиджаки, блайзеры, брюки, комбинезоны с нагрудника", "tnved": "6203", "marking_status": "mandatory"},
                {"id": "light_industry_6204", "name": "Костюмы, комплекты, жакеты, блайзеры, платья, юбки, юбки-брюки, брюки,", "tnved": "6204", "marking_status": "mandatory"},
                {"id": "light_industry_6110", "name": "Свитеры, пуловеры, кардиганы, жилеты и аналогичные изделия трикотажные", "tnved": "6110", "marking_status": "mandatory"},
                {"id": "light_industry_6112", "name": "Костюмы спортивные, лыжные и купальные трикотажные машинного или ручно", "tnved": "6112", "marking_status": "mandatory"},
                {"id": "light_industry_611211", "name": "Костюмы спортивные, лыжные, трикотажные машинного или ручного вязания ", "tnved": "6112 11", "marking_status": "mandatory"},
                {"id": "light_industry_61121100", "name": "Костюмы спортивные, лыжные, трикотажные машинного или ручного вязания ", "tnved": "6112 11 00", "marking_status": "mandatory"},
                {"id": "light_industry_6112110000", "name": "из хлопчатобумажной пряжи", "tnved": "6112 11 000 0", "marking_status": "mandatory"},
                {"id": "light_industry_611212", "name": "Костюмы спортивные, лыжные, трикотажные машинного или ручного вязания ", "tnved": "6112 12", "marking_status": "mandatory"},
                {"id": "light_industry_61121200", "name": "Костюмы спортивные, лыжные, трикотажные машинного или ручного вязания ", "tnved": "6112 12 00", "marking_status": "mandatory"},
                {"id": "light_industry_6112120000", "name": "из синтетических нитей", "tnved": "6112 12 000 0", "marking_status": "mandatory"},
                {"id": "light_industry_611219", "name": "Костюмы спортивные, лыжные, трикотажные машинного или ручного вязания ", "tnved": "6112 19", "marking_status": "mandatory"},
                {"id": "light_industry_61121900", "name": "Костюмы спортивные, лыжные, трикотажные машинного или ручного вязания ", "tnved": "6112 19 00", "marking_status": "mandatory"},
                {"id": "light_industry_6112190000", "name": "из прочих текстильных материалов", "tnved": "6112 19 000 0", "marking_status": "mandatory"},
                {"id": "light_industry_611220", "name": "Костюмы спортивные, лыжные, трикотажные машинного или ручного вязания ", "tnved": "6112 20", "marking_status": "mandatory"},
                {"id": "light_industry_61122000", "name": "Костюмы спортивные, лыжные, трикотажные машинного или ручного вязания ", "tnved": "6112 20 00", "marking_status": "mandatory"},
                {"id": "light_industry_6112200000", "name": "лыжные костюмы", "tnved": "6112 20 000 0", "marking_status": "mandatory"},
                {"id": "light_industry_6214", "name": "Шали, шарфы, кашне, мантильи, вуали и аналогичные изделия:", "tnved": "6214", "marking_status": "mandatory"},
                {"id": "light_industry_6215", "name": "Галстуки, галстуки-бабочки и шейные платки:", "tnved": "6215", "marking_status": "mandatory"},
                {"id": "light_industry_6107", "name": "Кальсоны, трусы, ночные сорочки, пижамы, купальные халаты, домашние ха", "tnved": "6107", "marking_status": "mandatory"},
                {"id": "light_industry_6207", "name": "Майки и нательные фуфайки прочие, кальсоны, трусы, ночные сорочки, пиж", "tnved": "6207", "marking_status": "mandatory"},
                {"id": "light_industry_6108", "name": "Комбинации, нижние юбки, трусы, панталоны, ночные сорочки, пижамы, пен", "tnved": "6108", "marking_status": "mandatory"},
                {"id": "light_industry_6208", "name": "Майки и нательные фуфайки прочие, комбинации, нижние юбки, трусы, пант", "tnved": "6208", "marking_status": "mandatory"},
                {"id": "light_industry_6109", "name": "Майки, фуфайки с рукавами и прочие нательные фуфайки трикотажные машин", "tnved": "6109", "marking_status": "mandatory"},
                {"id": "light_industry_6111", "name": "Детская одежда и принадлежности к детской одежде трикотажные машинного", "tnved": "6111", "marking_status": "mandatory"},
                {"id": "light_industry_6209", "name": "Детская одежда и принадлежности к детской одежде:", "tnved": "6209", "marking_status": "mandatory"},
                {"id": "light_industry_611231", "name": "из синтетических нитей:", "tnved": "6112 31", "marking_status": "mandatory"},
                {"id": "light_industry_611239", "name": "из прочих текстильных материалов:", "tnved": "6112 39", "marking_status": "mandatory"},
                {"id": "light_industry_611241", "name": "из синтетических нитей:", "tnved": "6112 41", "marking_status": "mandatory"},
                {"id": "light_industry_611249", "name": "из прочих текстильных материалов:", "tnved": "6112 49", "marking_status": "mandatory"},
                {"id": "light_industry_621111", "name": "Купальные костюмы", "tnved": "6211 11", "marking_status": "mandatory"},
                {"id": "light_industry_62111100", "name": "Купальные костюмы", "tnved": "6211 11 00", "marking_status": "mandatory"},
                {"id": "light_industry_6211110000", "name": "мужские или для мальчиков", "tnved": "6211 11 000 0", "marking_status": "mandatory"},
                {"id": "light_industry_621112", "name": "Купальные костюмы", "tnved": "6211 12", "marking_status": "mandatory"},
                {"id": "light_industry_62111200", "name": "Купальные костюмы", "tnved": "6211 12 00", "marking_status": "mandatory"},
                {"id": "light_industry_6211120000", "name": "женские или для девочек", "tnved": "6211 12 000 0", "marking_status": "mandatory"},
                {"id": "light_industry_6115", "name": "Колготы, чулки, гольфы, носки и подследники и прочие чулочно-носочные ", "tnved": "6115", "marking_status": "mandatory"},
                {"id": "light_industry_420321", "name": "Перчатки, рукавицы и митенки", "tnved": "4203 21", "marking_status": "mandatory"},
                {"id": "light_industry_42032100", "name": "Перчатки, рукавицы и митенки", "tnved": "4203 21 00", "marking_status": "mandatory"},
                {"id": "light_industry_4203210000", "name": "специально предназначенные для спортивных целей", "tnved": "4203 21 000 0", "marking_status": "mandatory"},
                {"id": "light_industry_420329", "name": "прочие:", "tnved": "4203 29", "marking_status": "mandatory"},
                {"id": "light_industry_6116", "name": "Перчатки, рукавицы и митенки трикотажные машинного или ручного вязания", "tnved": "6116", "marking_status": "mandatory"},
                {"id": "light_industry_6216", "name": "Перчатки, рукавицы и митенки", "tnved": "6216", "marking_status": "mandatory"},
                {"id": "light_industry_621600", "name": "Перчатки, рукавицы и митенки", "tnved": "6216 00", "marking_status": "mandatory"},
                {"id": "light_industry_62160000", "name": "Перчатки, рукавицы и митенки", "tnved": "6216 00 00", "marking_status": "mandatory"},
                {"id": "light_industry_6216000000", "name": "Перчатки, рукавицы и митенки", "tnved": "6216 00 000 0", "marking_status": "mandatory"},
                {"id": "light_industry_6114", "name": "Предметы одежды прочие трикотажные машинного или ручного вязания:", "tnved": "6114", "marking_status": "mandatory"},
                {"id": "light_industry_6117", "name": "Принадлежности к одежде трикотажные машинного или ручного вязания гото", "tnved": "6117", "marking_status": "mandatory"},
                {"id": "light_industry_611710", "name": "Предметы одежды и принадлежности к одежде готовые прочие, в том числе ", "tnved": "6117 10", "marking_status": "mandatory"},
                {"id": "light_industry_61171000", "name": "Предметы одежды и принадлежности к одежде готовые прочие, в том числе ", "tnved": "6117 10 00", "marking_status": "mandatory"},
                {"id": "light_industry_6117100000", "name": "шали, шарфы, кашне, мантильи, вуали и аналогичные изделия", "tnved": "6117 10 000 0", "marking_status": "mandatory"},
                {"id": "light_industry_611780", "name": "принадлежности прочие:", "tnved": "6117 80", "marking_status": "mandatory"},
                {"id": "light_industry_61178010", "name": "Предметы одежды и принадлежности к одежде готовые прочие, в том числе ", "tnved": "6117 80 10", "marking_status": "mandatory"},
                {"id": "light_industry_6117801009", "name": "прочие", "tnved": "6117 80 100 9", "marking_status": "mandatory"},
                {"id": "light_industry_61178080", "name": "Предметы одежды и принадлежности к одежде готовые прочие, в том числе ", "tnved": "6117 80 80", "marking_status": "mandatory"},
                {"id": "light_industry_6117808009", "name": "прочие", "tnved": "6117 80 800 9", "marking_status": "mandatory"},
                {"id": "light_industry_6217", "name": "Предметы одежды и принадлежности к одежде готовые прочие, в том числе ", "tnved": "6217", "marking_status": "mandatory"},
                {"id": "light_industry_621710", "name": "Предметы одежды и принадлежности к одежде готовые прочие, в том числе ", "tnved": "6217 10", "marking_status": "mandatory"},
                {"id": "light_industry_62171000", "name": "Предметы одежды и принадлежности к одежде готовые прочие, в том числе ", "tnved": "6217 10 00", "marking_status": "mandatory"},
                {"id": "light_industry_6217100000", "name": "принадлежности", "tnved": "6217 10 000 0", "marking_status": "mandatory"},
                {"id": "light_industry_6213", "name": "Платки:", "tnved": "6213", "marking_status": "mandatory"},
                {"id": "light_industry_6117808001", "name": "галстуки, галстуки-бабочки и шейные платки", "tnved": "6117 80 800 1", "marking_status": "mandatory"},
                {"id": "light_industry_6406", "name": "Детали обуви (включая заготовки верха обуви с прикрепленной или неприк", "tnved": "6406", "marking_status": "mandatory"},
                {"id": "light_industry_640690", "name": "прочие:", "tnved": "6406 90", "marking_status": "mandatory"},
                {"id": "light_industry_64069090", "name": "Гетры, гамаши и аналогичные изделия", "tnved": "6406 90 90", "marking_status": "mandatory"},
                {"id": "light_industry_6406909000", "name": "прочие", "tnved": "6406 90 900 0", "marking_status": "mandatory"},
                {"id": "light_industry_6504", "name": "Шляпы и прочие головные уборы", "tnved": "6504", "marking_status": "mandatory"},
                {"id": "light_industry_650400", "name": "Шляпы и прочие головные уборы", "tnved": "6504 00", "marking_status": "mandatory"},
                {"id": "light_industry_65040000", "name": "Шляпы и прочие головные уборы", "tnved": "6504 00 00", "marking_status": "mandatory"},
                {"id": "light_industry_6504000000", "name": "Шляпы и прочие головные уборы, плетеные или изготовленные путем соедин", "tnved": "6504 00 000 0", "marking_status": "mandatory"},
                {"id": "light_industry_6505", "name": "Шляпы и прочие головные уборы", "tnved": "6505", "marking_status": "mandatory"},
                {"id": "light_industry_650500", "name": "Шляпы и прочие головные уборы трикотажные машинного или ручного вязани", "tnved": "6505 00", "marking_status": "mandatory"},
                {"id": "light_industry_6506", "name": "Головные уборы прочие, с подкладкой или без подкладки или с отделкой и", "tnved": "6506", "marking_status": "mandatory"},
                {"id": "light_industry_650699", "name": "из прочих материалов:", "tnved": "6506 99", "marking_status": "mandatory"}
            ]},
            {"id": "shoes", "name": "Обувь", "icon": "footprints", "products": [
                {"id": "shoes_6401", "name": "Водонепроницаемая обувь с подошвой и с верхом из резины или пластмассы", "tnved": "6401", "marking_status": "mandatory"},
                {"id": "shoes_6402", "name": "Прочая обувь с подошвой и с верхом из резины или пластмассы:", "tnved": "6402", "marking_status": "mandatory"},
                {"id": "shoes_6403", "name": "Обувь с подошвой из резины, пластмассы, натуральной или композиционной", "tnved": "6403", "marking_status": "mandatory"},
                {"id": "shoes_6404", "name": "Обувь с подошвой из резины, пластмассы, натуральной или композиционной", "tnved": "6404", "marking_status": "mandatory"},
                {"id": "shoes_6405", "name": "Обувь прочая:", "tnved": "6405", "marking_status": "mandatory"},
                {"id": "shoes_sportivnaya", "name": "Обувь спортивная", "tnved": "6402; 6403; 6404", "marking_status": "mandatory"}
            ]},
            {"id": "furs", "name": "Шубы", "icon": "shirt", "products": [
                {"id": "furs_4303", "name": "Предметы одежды, принадлежности к одежде и прочие изделия, из натураль", "tnved": "4303", "marking_status": "mandatory"},
                {"id": "furs_430310", "name": "предметы одежды и принадлежности к одежде:", "tnved": "4303 10", "marking_status": "mandatory"},
                {"id": "furs_43031090", "name": "Предметы одежды из норки.", "tnved": "4303 10 90", "marking_status": "mandatory"},
                {"id": "furs_4303109010", "name": "предметы одежды из норки", "tnved": "4303 10 901 0", "marking_status": "mandatory"},
                {"id": "furs_4303109020", "name": "предметы одежды из нутрии", "tnved": "4303 10 902 0", "marking_status": "mandatory"},
                {"id": "furs_4303109030", "name": "предметы одежды из песца или лисицы", "tnved": "4303 10 903 0", "marking_status": "mandatory"},
                {"id": "furs_4303109040", "name": "предметы одежды из кролика или зайца", "tnved": "4303 10 904 0", "marking_status": "mandatory"},
                {"id": "furs_4303109050", "name": "предметы одежды из енота", "tnved": "4303 10 905 0", "marking_status": "mandatory"},
                {"id": "furs_4303109060", "name": "предметы одежды из овчины", "tnved": "4303 10 906 0", "marking_status": "mandatory"},
                {"id": "furs_4303109080", "name": "предметы одежды прочие", "tnved": "4303 10 908 0", "marking_status": "mandatory"}
            ]},
            {"id": "toys", "name": "Детские игрушки", "icon": "puzzle", "products": [
                {"id": "toys_9503", "name": "Игрушки, предназначенные для детей в возрасте до 14 лет — самокаты, пе", "tnved": "9503", "marking_status": "mandatory"},
                {"id": "toys_950300", "name": "Трехколесные велосипеды, самокаты, педальные автомобили и аналогичные ", "tnved": "9503 00", "marking_status": "mandatory"},
                {"id": "toys_9504", "name": "Консоли и оборудование для видеоигр, настольные или комнатные игры, вк", "tnved": "9504", "marking_status": "mandatory"},
                {"id": "toys_9504400000", "name": "карты игральные", "tnved": "9504 40 000 0", "marking_status": "mandatory"},
                {"id": "toys_950490", "name": "прочие:", "tnved": "9504 90", "marking_status": "mandatory"},
                {"id": "toys_9504901000", "name": "наборы электрических гоночных автомобилей для соревновательных игр", "tnved": "9504 90 100 0", "marking_status": "mandatory"},
                {"id": "toys_9504908009", "name": "прочие", "tnved": "9504 90 800 9", "marking_status": "mandatory"},
                {"id": "toys_kolyaski_kukol", "name": "Коляски для кукол", "tnved": "9503 00", "marking_status": "mandatory"},
                {"id": "toys_kukly", "name": "Куклы", "tnved": "9503 00", "marking_status": "mandatory"},
                {"id": "toys_igrushki_prochie", "name": "Игрушки прочие", "tnved": "9503 00", "marking_status": "mandatory"},
                {"id": "toys_modeli", "name": "Модели в масштабе", "tnved": "9503 00", "marking_status": "mandatory"},
                {"id": "toys_golovolomki", "name": "Головоломки всех видов", "tnved": "9503 00", "marking_status": "mandatory"}
            ]},
            {"id": "bicycles", "name": "Велосипеды", "icon": "bike", "products": [
                {"id": "bicycles_8711", "name": "Мотоциклы (включая мопеды) и велосипеды с установленным вспомогательны", "tnved": "8711", "marking_status": "mandatory"},
                {"id": "bicycles_871187", "name": "Велосипеды (в том числе с установленным вспомогательным двигателем и т", "tnved": "8711 87", "marking_status": "mandatory"},
                {"id": "bicycles_87118712", "name": "Велосипеды (в том числе с установленным вспомогательным двигателем и т", "tnved": "8711 87 12", "marking_status": "mandatory"},
                {"id": "bicycles_8711871200", "name": "Велосипеды (в том числе с установленным вспомогательным двигателем и т", "tnved": "8711 87 120 0", "marking_status": "mandatory"},
                {"id": "bicycles_871200", "name": "Велосипеды двухколёсные", "tnved": "8712 00", "marking_status": "mandatory"},
                {"id": "bicycles_871491100", "name": "Рамы велосипедные", "tnved": "8714 91 100", "marking_status": "mandatory"},
                {"id": "bicycles_950300100", "name": "Велосипеды трёхколёсные, самокаты детские", "tnved": "9503 00 100", "marking_status": "mandatory"}
            ]}
        ]
    },
    {
        "id": "auto",
        "name": "Автомобильная отрасль",
        "icon": "car",
        "subcategories": [
            {"id": "tires", "name": "Шины и покрышки", "icon": "circle", "products": [
                {"id": "tires_4011", "name": "Шины и покрышки пневматические резиновые новые:", "tnved": "4011", "marking_status": "mandatory"},
                {"id": "tires_401110", "name": "Шины и покрышки пневматические резиновые новые", "tnved": "4011 10", "marking_status": "mandatory"},
                {"id": "tires_40111000", "name": "Шины и покрышки пневматические резиновые новые", "tnved": "4011 10 00", "marking_status": "mandatory"},
                {"id": "tires_4011100003", "name": "с посадочным диаметром не более 16 дюймов", "tnved": "4011 10 000 3", "marking_status": "mandatory"},
                {"id": "tires_4011100009", "name": "прочие", "tnved": "4011 10 000 9", "marking_status": "mandatory"},
                {"id": "tires_401120", "name": "для автобусов или моторных транспортных средств для перевозки грузов:", "tnved": "4011 20", "marking_status": "mandatory"},
                {"id": "tires_40112010", "name": "Шины и покрышки пневматические резиновые новые", "tnved": "4011 20 10", "marking_status": "mandatory"},
                {"id": "tires_4011201000", "name": "с индексом нагрузки не более 121", "tnved": "4011 20 100 0", "marking_status": "mandatory"},
                {"id": "tires_40112090", "name": "Шины и покрышки пневматические резиновые новые", "tnved": "4011 20 90", "marking_status": "mandatory"},
                {"id": "tires_4011209000", "name": "с индексом нагрузки более 121", "tnved": "4011 20 900 0", "marking_status": "mandatory"},
                {"id": "tires_401140", "name": "Шины и покрышки пневматические резиновые новые", "tnved": "4011 40", "marking_status": "mandatory"},
                {"id": "tires_40114000", "name": "Шины и покрышки пневматические резиновые новые", "tnved": "4011 40 00", "marking_status": "mandatory"},
                {"id": "tires_4011400000", "name": "для мотоциклов", "tnved": "4011 40 000 0", "marking_status": "mandatory"},
                {"id": "tires_401170", "name": "Шины и покрышки пневматические резиновые новые", "tnved": "4011 70", "marking_status": "mandatory"},
                {"id": "tires_40117000", "name": "Шины и покрышки пневматические резиновые новые", "tnved": "4011 70 00", "marking_status": "mandatory"},
                {"id": "tires_4011700000", "name": "для сельскохозяйственных или лесохозяйственных транспортных средств и ", "tnved": "4011 70 000 0", "marking_status": "mandatory"},
                {"id": "tires_401180", "name": "Шины и покрышки пневматические резиновые новые", "tnved": "4011 80", "marking_status": "mandatory"},
                {"id": "tires_40118000", "name": "Шины и покрышки пневматические резиновые новые", "tnved": "4011 80 00", "marking_status": "mandatory"},
                {"id": "tires_4011800000", "name": "для транспортных средств и машин, используемых в строительстве, горном", "tnved": "4011 80 000 0", "marking_status": "mandatory"},
                {"id": "tires_401190", "name": "Шины и покрышки пневматические резиновые новые", "tnved": "4011 90", "marking_status": "mandatory"},
                {"id": "tires_40119000", "name": "Шины и покрышки пневматические резиновые новые", "tnved": "4011 90 00", "marking_status": "mandatory"},
                {"id": "tires_4011900000", "name": "прочие", "tnved": "4011 90 000 0", "marking_status": "mandatory"}
            ]},
            {"id": "motor_oils", "name": "Моторные масла", "icon": "droplet", "products": [
                {"id": "motor_oils_2710", "name": "Нефть и нефтепродукты, полученные из битуминозных пород, кроме сырых; ", "tnved": "2710", "marking_status": "mandatory"},
                {"id": "motor_oils_271019", "name": "прочие:", "tnved": "2710 19", "marking_status": "mandatory"},
                {"id": "motor_oils_27101982", "name": "Моторные масла, компрессорное смазочное масло, турбинное смазочное мас", "tnved": "2710 19 82", "marking_status": "mandatory"},
                {"id": "motor_oils_2710198200", "name": "моторные масла, компрессорное смазочное масло, турбинное смазочное мас", "tnved": "2710 19 820 0", "marking_status": "mandatory"},
                {"id": "motor_oils_27101988", "name": "Масло для шестерен и масло для редукторов (например, масло трансмиссио", "tnved": "2710 19 88", "marking_status": "mandatory"},
                {"id": "motor_oils_2710198800", "name": "масло для шестерен и масло для редукторов", "tnved": "2710 19 880 0", "marking_status": "mandatory"},
                {"id": "motor_oils_3403", "name": "Материалы смазочные (включая смазочно-охлаждающие эмульсии для режущих", "tnved": "3403", "marking_status": "mandatory"},
                {"id": "motor_oils_340319", "name": "прочие:", "tnved": "3403 19", "marking_status": "mandatory"},
                {"id": "motor_oils_34031910", "name": "Прочие материалы смазочные, содержащие не в качестве основного компоне", "tnved": "3403 19 10", "marking_status": "mandatory"},
                {"id": "motor_oils_3403191000", "name": "содержащие не в качестве основного компонента 70 мас.% или более нефти", "tnved": "3403 19 100 0", "marking_status": "mandatory"},
                {"id": "motor_oils_34031990", "name": "Средства для смазки машин, механизмов и транспортных средств. В данную", "tnved": "3403 19 90", "marking_status": "mandatory"},
                {"id": "motor_oils_3403199000", "name": "прочие", "tnved": "3403 19 900 0", "marking_status": "mandatory"},
                {"id": "motor_oils_340399", "name": "Материалы смазочные (включая смазочно-охлаждающие эмульсии для режущих", "tnved": "3403 99", "marking_status": "mandatory"},
                {"id": "motor_oils_34039900", "name": "Материалы смазочные (включая смазочно-охлаждающие эмульсии для режущих", "tnved": "3403 99 00", "marking_status": "mandatory"},
                {"id": "motor_oils_3403990000", "name": "прочие", "tnved": "3403 99 000 0", "marking_status": "mandatory"},
                {"id": "motor_oils_3819", "name": "Жидкости тормозные гидравлические и жидкости готовые прочие для гидрав", "tnved": "3819", "marking_status": "mandatory"},
                {"id": "motor_oils_381900", "name": "Жидкости тормозные гидравлические и жидкости готовые прочие для гидрав", "tnved": "3819 00", "marking_status": "mandatory"},
                {"id": "motor_oils_38190000", "name": "Жидкости тормозные гидравлические и жидкости готовые прочие для гидрав", "tnved": "3819 00 00", "marking_status": "mandatory"},
                {"id": "motor_oils_3819000000", "name": "Жидкости тормозные гидравлические и жидкости готовые прочие для гидрав", "tnved": "3819 00 000 0", "marking_status": "mandatory"},
                {"id": "motor_oils_3820", "name": "Антифризы и жидкости антиобледенительные готовые (например, омыватель ", "tnved": "3820", "marking_status": "mandatory"},
                {"id": "motor_oils_382000", "name": "Антифризы и жидкости антиобледенительные готовые (например, омыватель ", "tnved": "3820 00", "marking_status": "mandatory"},
                {"id": "motor_oils_38200000", "name": "Антифризы и жидкости антиобледенительные готовые (например, омыватель ", "tnved": "3820 00 00", "marking_status": "mandatory"},
                {"id": "motor_oils_3820000000", "name": "Антифризы и жидкости антиобледенительные готовые", "tnved": "3820 00 000 0", "marking_status": "mandatory"},
                {"id": "motor_oils_kompressornye", "name": "Компрессорные масла", "tnved": "2710 19 820 0", "marking_status": "mandatory"},
                {"id": "motor_oils_turbinnye", "name": "Турбинные масла", "tnved": "2710 19 820 0", "marking_status": "mandatory"},
                {"id": "motor_oils_reduktory", "name": "Масла для редукторов", "tnved": "2710 19 880 0", "marking_status": "mandatory"},
                {"id": "motor_oils_smazki_prochie", "name": "Смазки прочие (эмульсии, антикоррозионные)", "tnved": "3403 99 000 0", "marking_status": "mandatory"},
                {"id": "motor_oils_omyvateli", "name": "Омыватели стёкол", "tnved": "3820 00 000 0", "marking_status": "mandatory"}
            ]}
        ]
    },
    {
        "id": "construction",
        "name": "Строительство и инфраструктура",
        "icon": "hard-hat",
        "subcategories": [
            {"id": "building_materials", "name": "Строительные материалы", "icon": "hammer", "products": [
                {"id": "building_materials_2520", "name": "Гипс; ангидрит; гипсовые вяжущие (представляющие собой кальцинированны", "tnved": "2520", "marking_status": "mandatory"},
                {"id": "building_materials_2523", "name": "Портландцемент, цемент глиноземистый, цемент шлаковый, цемент суперсул", "tnved": "2523", "marking_status": "mandatory"},
                {"id": "building_materials_3816", "name": "Цементы огнеупорные, растворы строительные огнеупорные, бетоны огнеупо", "tnved": "3816", "marking_status": "mandatory"},
                {"id": "building_materials_381600", "name": "Цементы огнеупорные, растворы строительные огнеупорные, бетоны огнеупо", "tnved": "3816 00", "marking_status": "mandatory"},
                {"id": "building_materials_38160000", "name": "Цементы огнеупорные, растворы строительные огнеупорные, бетоны огнеупо", "tnved": "3816 00 00", "marking_status": "mandatory"},
                {"id": "building_materials_3816000000", "name": "Цементы огнеупорные, растворы строительные огнеупорные, бетоны огнеупо", "tnved": "3816 00 000 0", "marking_status": "mandatory"},
                {"id": "building_materials_3824", "name": "Готовые связующие вещества для производства литейных форм или литейных", "tnved": "3824", "marking_status": "mandatory"},
                {"id": "building_materials_382450", "name": "неогнеупорные строительные растворы и бетоны:", "tnved": "3824 50", "marking_status": "mandatory"},
                {"id": "building_materials_38245090", "name": "Смеси строительные, растворы строительные", "tnved": "3824 50 90", "marking_status": "mandatory"},
                {"id": "building_materials_3824509000", "name": "прочие", "tnved": "3824 50 900 0", "marking_status": "mandatory"},
                {"id": "building_materials_3214", "name": "Замазки стекольная и садовая, цементы смоляные, составы для уплотнения", "tnved": "3214", "marking_status": "mandatory"},
                {"id": "building_materials_gips_stroit", "name": "Гипс строительный", "tnved": "2520", "marking_status": "mandatory"},
                {"id": "building_materials_gips_tech", "name": "Гипс технический", "tnved": "2520", "marking_status": "mandatory"},
                {"id": "building_materials_gips_med", "name": "Гипс медицинский", "tnved": "2520", "marking_status": "mandatory"},
                {"id": "building_materials_gips_form", "name": "Гипс формовочный", "tnved": "2520", "marking_status": "mandatory"},
                {"id": "building_materials_portland_bez", "name": "Портландцемент без добавок", "tnved": "2523", "marking_status": "mandatory"},
                {"id": "building_materials_portland_s", "name": "Портландцемент с добавками", "tnved": "2523", "marking_status": "mandatory"},
                {"id": "building_materials_shlako", "name": "Шлакопортландцемент", "tnved": "2523", "marking_status": "mandatory"},
                {"id": "building_materials_kompozit", "name": "Цемент композиционный", "tnved": "2523", "marking_status": "mandatory"},
                {"id": "building_materials_belye", "name": "Портландцементы белые/цветные", "tnved": "2523", "marking_status": "mandatory"},
                {"id": "building_materials_tampon", "name": "Цемент тампонажный", "tnved": "2523", "marking_status": "mandatory"},
                {"id": "building_materials_glinozem", "name": "Цементы глинозёмистые", "tnved": "2523", "marking_status": "mandatory"},
                {"id": "building_materials_cement_proch", "name": "Цементы прочие", "tnved": "2523", "marking_status": "mandatory"},
                {"id": "building_materials_rastvory_ogn", "name": "Растворы огнеупорные", "tnved": "3816 00 000 0", "marking_status": "mandatory"},
                {"id": "building_materials_betony_ogn", "name": "Бетоны огнеупорные", "tnved": "3816 00 000 0", "marking_status": "mandatory"},
                {"id": "building_materials_rastvory_str", "name": "Растворы строительные", "tnved": "3824 50 900 0", "marking_status": "mandatory"},
                {"id": "building_materials_shpatlyovki", "name": "Шпатлёвки", "tnved": "3214", "marking_status": "mandatory"},
                {"id": "building_materials_zamazki", "name": "Замазки", "tnved": "3214", "marking_status": "mandatory"},
                {"id": "building_materials_germetiki", "name": "Герметики", "tnved": "3214", "marking_status": "mandatory"},
                {"id": "building_materials_mastiki", "name": "Мастики", "tnved": "3214", "marking_status": "mandatory"},
                {"id": "building_materials_pasty", "name": "Пасты строительные", "tnved": "3214", "marking_status": "mandatory"}
            ]}
        ]
    },
    {
        "id": "electronics",
        "name": "Электроника и техника",
        "icon": "cpu",
        "subcategories": [
            {"id": "cameras", "name": "Фотоаппараты и лампы-вспышки", "icon": "camera", "products": [
                {"id": "cameras_9006", "name": "Фотокамеры (кроме кинематографических)", "tnved": "9006", "marking_status": "mandatory", "mandatory_since": "2020-10-01",
                    "timeline": {
                        "title": "Фотоаппараты и лампы-вспышки",
                        "start_date": "1 октября 2020",
                        "who": ["Производители", "Импортёры", "Оптовики", "Розница"],
                        "current_requirements": [
                            "Регистрация в Честном ЗНАКе",
                            "Нанесение кодов маркировки",
                            "Передача данных при продаже на кассе",
                            "Электронный документооборот (ЭДО)",
                            "Разрешительный режим на кассах (с 01.11.2024)"
                        ]
                    }
                },
                {"id": "cameras_900610", "name": "Фотоаппараты для изготовления печатных пластин/цилиндров", "tnved": "9006 10", "marking_status": "mandatory"},
                {"id": "cameras_900630", "name": "Фотоаппараты специальные для подводной/аэросъёмки", "tnved": "9006 30", "marking_status": "mandatory"},
                {"id": "cameras_900640", "name": "Фотоаппараты для моментальной печати", "tnved": "9006 40", "marking_status": "mandatory"},
                {"id": "cameras_900651", "name": "Фотоаппараты прочие с видоискателем (зеркальные)", "tnved": "9006 51", "marking_status": "mandatory"},
                {"id": "cameras_900652", "name": "Фотоаппараты прочие для плёнки шириной менее 35мм", "tnved": "9006 52", "marking_status": "mandatory"},
                {"id": "cameras_900653", "name": "Фотоаппараты прочие для плёнки шириной 35мм", "tnved": "9006 53", "marking_status": "mandatory"},
                {"id": "cameras_900659", "name": "Фотоаппараты прочие", "tnved": "9006 59", "marking_status": "mandatory"},
                {"id": "cameras_900661", "name": "Лампы-вспышки с газоразрядной трубкой", "tnved": "9006 61", "marking_status": "mandatory"},
                {"id": "cameras_900669", "name": "Лампы-вспышки прочие", "tnved": "9006 69", "marking_status": "mandatory"}
            ]}
        ]
    },
    {
        "id": "pilot",
        "name": "Пилотные проекты",
        "icon": "rocket",
        "subcategories": [
            {
                "id": "pilot_титановая_металлопродукция",
                "name": "Титановая металлопродукция (завершен)",
                "products": [
                    {"id": "pilot_титановая_металлопродукция_8108_20_000_6", "name": "Слитки из титановых сплавов", "tnved": "8108 20 000 6", "marking_status": "not_required"},
                    {"id": "pilot_титановая_металлопродукция_8108_20_000_7", "name": "Слябы из титановых сплавов", "tnved": "8108 20 000 7", "marking_status": "not_required"},
                    {"id": "pilot_титановая_металлопродукция_8108_90_300_8", "name": "Прутки и биллеты из титановых сплавов", "tnved": "8108 90 300 8", "marking_status": "not_required"},
                    {"id": "pilot_титановая_металлопродукция_8108_90_300_8_1", "name": "Плиты и листы из титановых сплавов", "tnved": "8108 90 300 8", "marking_status": "not_required"},
                    {"id": "pilot_титановая_металлопродукция_8108_90_300_8_2", "name": "Поковки прямоугольной формы из титановых сплавов", "tnved": "8108 90 300 8", "marking_status": "not_required"},
                    {"id": "pilot_титановая_металлопродукция_8108_90_500_8", "name": "Плиты и листы из титановых сплавов", "tnved": "8108 90 500 8", "marking_status": "not_required"}
                ]
            },
            {
                "id": "pilot_оптоволоконная_продукция",
                "name": "Оптоволоконная продукция",
                "products": [
                    {"id": "pilot_оптоволоконная_продукция_9001_10_900_1", "name": "Волокна оптические", "tnved": "9001 10 900 1", "marking_status": "experiment"},
                    {"id": "pilot_оптоволоконная_продукция_8544_70_000_0", "name": "Кабели волоконно-оптические", "tnved": "8544 70 000 0", "marking_status": "experiment"}
                ]
            },
            {
                "id": "pilot_отопительные_приборы",
                "name": "Отопительные приборы",
                "products": [
                    {"id": "pilot_отопительные_приборы_7322_11_000_0", "name": "Радиаторы центрального отопления чугунные", "tnved": "7322 11 000 0", "marking_status": "experiment"},
                    {"id": "pilot_отопительные_приборы_7322_19_000_0", "name": "Радиаторы центрального отопления прочие", "tnved": "7322 19 000 0", "marking_status": "experiment"},
                    {"id": "pilot_отопительные_приборы_7616_99_100_2", "name": "Радиаторы алюминиевые", "tnved": "7616 99 100 2", "marking_status": "experiment"},
                    {"id": "pilot_отопительные_приборы_7616_99_100_3", "name": "Радиаторы алюминиевые", "tnved": "7616 99 100 3", "marking_status": "experiment"},
                    {"id": "pilot_отопительные_приборы_7616_99_900_8", "name": "Радиаторы алюминиевые прочие", "tnved": "7616 99 900 8", "marking_status": "experiment"},
                    {"id": "pilot_отопительные_приборы_7322_90_000_9", "name": "Конвекторы отопительные", "tnved": "7322 90 000 9", "marking_status": "experiment"},
                    {"id": "pilot_отопительные_приборы_7419_80_000_0", "name": "Конвекторы отопительные медные", "tnved": "7419 80 000 0", "marking_status": "experiment"},
                    {"id": "pilot_отопительные_приборы_8403_10_900_0", "name": "Котлы центрального отопления", "tnved": "8403 10 900 0", "marking_status": "experiment"}
                ]
            },
            {
                "id": "pilot_слабоалкогольная_продукция_до_9",
                "name": "Слабоалкогольная продукция (до 9%)",
                "products": [
                    {"id": "pilot_слабоалкогольная_продукция_до_9_2206_00_590_1", "name": "Алкогольная продукция до 9%", "tnved": "2206 00 590 1", "marking_status": "experiment"},
                    {"id": "pilot_слабоалкогольная_продукция_до_9_2206_00_390_1", "name": "Алкогольная продукция до 9%", "tnved": "2206 00 390 1", "marking_status": "experiment"},
                    {"id": "pilot_слабоалкогольная_продукция_до_9_2206_00_890_1", "name": "Алкогольная продукция до 9%", "tnved": "2206 00 890 1", "marking_status": "experiment"},
                    {"id": "pilot_слабоалкогольная_продукция_до_9_2208_90_690_1", "name": "Алкогольная продукция до 9%", "tnved": "2208 90 690 1", "marking_status": "experiment"},
                    {"id": "pilot_слабоалкогольная_продукция_до_9_2208_90_780_1", "name": "Алкогольная продукция до 9%", "tnved": "2208 90 780 1", "marking_status": "experiment"},
                    {"id": "pilot_слабоалкогольная_продукция_до_9_2206_00_390_9", "name": "Алкогольная продукция до 9%", "tnved": "2206 00 390 9", "marking_status": "experiment"},
                    {"id": "pilot_слабоалкогольная_продукция_до_9_2206_00_590_9", "name": "Алкогольная продукция до 9%", "tnved": "2206 00 590 9", "marking_status": "experiment"},
                    {"id": "pilot_слабоалкогольная_продукция_до_9_2206_00_890_9", "name": "Алкогольная продукция до 9%", "tnved": "2206 00 890 9", "marking_status": "experiment"},
                    {"id": "pilot_слабоалкогольная_продукция_до_9_2208_90_690_9", "name": "Алкогольная продукция до 9%", "tnved": "2208 90 690 9", "marking_status": "experiment"},
                    {"id": "pilot_слабоалкогольная_продукция_до_9_2208_90_780_9", "name": "Алкогольная продукция до 9%", "tnved": "2208 90 780 9", "marking_status": "experiment"}
                ]
            },
            {
                "id": "pilot_пиротехника_и_пожарная_безопасность",
                "name": "Пиротехника и пожарная безопасность",
                "products": [
                    {"id": "pilot_пиротехника_и_пожарная_безопасность_3604", "name": "Изделия пиротехнические I, II, III классов", "tnved": "3604", "marking_status": "experiment"},
                    {"id": "pilot_пиротехника_и_пожарная_безопасность_8424_10_000_0", "name": "Огнетушители", "tnved": "8424 10 000 0", "marking_status": "experiment"},
                    {"id": "pilot_пиротехника_и_пожарная_безопасность_3813_00_000_0", "name": "Составы и заряды для огнетушителей", "tnved": "3813 00 000 0", "marking_status": "experiment"},
                    {"id": "pilot_пиротехника_и_пожарная_безопасность_8526_92_000_8", "name": "Извещатели пожарные", "tnved": "8526 92 000 8", "marking_status": "experiment"},
                    {"id": "pilot_пиротехника_и_пожарная_безопасность_8531_10", "name": "Извещатели пожарные", "tnved": "8531 10", "marking_status": "experiment"},
                    {"id": "pilot_пиротехника_и_пожарная_безопасность_9022_29_000_0", "name": "Извещатели пожарные", "tnved": "9022 29 000 0", "marking_status": "experiment"},
                    {"id": "pilot_пиротехника_и_пожарная_безопасность_9027_10", "name": "Извещатели пожарные", "tnved": "9027 10", "marking_status": "experiment"},
                    {"id": "pilot_пиротехника_и_пожарная_безопасность_8504_40_300_4", "name": "Источники бесперебойного питания пожарной автоматики", "tnved": "8504 40 300 4", "marking_status": "experiment"},
                    {"id": "pilot_пиротехника_и_пожарная_безопасность_8504_40_300_8", "name": "Источники бесперебойного питания пожарной автоматики", "tnved": "8504 40 300 8", "marking_status": "experiment"},
                    {"id": "pilot_пиротехника_и_пожарная_безопасность_8504_40_550_0", "name": "Источники бесперебойного питания пожарной автоматики", "tnved": "8504 40 550 0", "marking_status": "experiment"},
                    {"id": "pilot_пиротехника_и_пожарная_безопасность_8504_40_830_0", "name": "Источники бесперебойного питания пожарной автоматики", "tnved": "8504 40 830 0", "marking_status": "experiment"},
                    {"id": "pilot_пиротехника_и_пожарная_безопасность_8504_40_850_0", "name": "Источники бесперебойного питания пожарной автоматики", "tnved": "8504 40 850 0", "marking_status": "experiment"},
                    {"id": "pilot_пиротехника_и_пожарная_безопасность_8504_40_870_0", "name": "Источники бесперебойного питания пожарной автоматики", "tnved": "8504 40 870 0", "marking_status": "experiment"},
                    {"id": "pilot_пиротехника_и_пожарная_безопасность_8504_40_910_0", "name": "Источники бесперебойного питания пожарной автоматики", "tnved": "8504 40 910 0", "marking_status": "experiment"},
                    {"id": "pilot_пиротехника_и_пожарная_безопасность_8517_62_000_9", "name": "Оповещатели пожарные", "tnved": "8517 62 000 9", "marking_status": "experiment"},
                    {"id": "pilot_пиротехника_и_пожарная_безопасность_8518_21_000_0", "name": "Оповещатели пожарные", "tnved": "8518 21 000 0", "marking_status": "experiment"},
                    {"id": "pilot_пиротехника_и_пожарная_безопасность_8518_22_000_9", "name": "Оповещатели пожарные", "tnved": "8518 22 000 9", "marking_status": "experiment"},
                    {"id": "pilot_пиротехника_и_пожарная_безопасность_8518_29_300_8", "name": "Оповещатели пожарные", "tnved": "8518 29 300 8", "marking_status": "experiment"},
                    {"id": "pilot_пиротехника_и_пожарная_безопасность_8518_29_960_0", "name": "Оповещатели пожарные", "tnved": "8518 29 960 0", "marking_status": "experiment"},
                    {"id": "pilot_пиротехника_и_пожарная_безопасность_8531_20_200_0", "name": "Выносные устройства индикации", "tnved": "8531 20 200 0", "marking_status": "experiment"},
                    {"id": "pilot_пиротехника_и_пожарная_безопасность_8531_80_950_0", "name": "Выносные устройства индикации", "tnved": "8531 80 950 0", "marking_status": "experiment"},
                    {"id": "pilot_пиротехника_и_пожарная_безопасность_8537_10", "name": "Приборы приемно-контрольные пожарные", "tnved": "8537 10", "marking_status": "experiment"},
                    {"id": "pilot_пиротехника_и_пожарная_безопасность_8517_61_000", "name": "Системы передачи извещений о пожаре", "tnved": "8517 61 000", "marking_status": "experiment"},
                    {"id": "pilot_пиротехника_и_пожарная_безопасность_8517_62_000", "name": "Системы передачи извещений о пожаре", "tnved": "8517 62 000", "marking_status": "experiment"},
                    {"id": "pilot_пиротехника_и_пожарная_безопасность_8517_69_390_0", "name": "Системы передачи извещений о пожаре", "tnved": "8517 69 390 0", "marking_status": "experiment"},
                    {"id": "pilot_пиротехника_и_пожарная_безопасность_8517_69_900_0", "name": "Системы передачи извещений о пожаре", "tnved": "8517 69 900 0", "marking_status": "experiment"}
                ]
            },
            {
                "id": "pilot_компоненты_транспортных_средств",
                "name": "Компоненты транспортных средств",
                "products": [
                    {"id": "pilot_компоненты_транспортных_средств_4823_90_859_7", "name": "Фильтры", "tnved": "4823 90 859 7", "marking_status": "experiment"},
                    {"id": "pilot_компоненты_транспортных_средств_5911_90_900_0", "name": "Фильтры", "tnved": "5911 90 900 0", "marking_status": "experiment"},
                    {"id": "pilot_компоненты_транспортных_средств_8421_23_000_0", "name": "Фильтры масляные", "tnved": "8421 23 000 0", "marking_status": "experiment"},
                    {"id": "pilot_компоненты_транспортных_средств_8421_29_000_9", "name": "Фильтры прочие", "tnved": "8421 29 000 9", "marking_status": "experiment"},
                    {"id": "pilot_компоненты_транспортных_средств_8421_31_000_0", "name": "Фильтры воздушные", "tnved": "8421 31 000 0", "marking_status": "experiment"},
                    {"id": "pilot_компоненты_транспортных_средств_8421_32_000_0", "name": "Фильтры воздушные", "tnved": "8421 32 000 0", "marking_status": "experiment"},
                    {"id": "pilot_компоненты_транспортных_средств_8421_39_200_8", "name": "Фильтры прочие", "tnved": "8421 39 200 8", "marking_status": "experiment"},
                    {"id": "pilot_компоненты_транспортных_средств_8421_99_000_6", "name": "Фильтры части", "tnved": "8421 99 000 6", "marking_status": "experiment"},
                    {"id": "pilot_компоненты_транспортных_средств_7007_11_100_1", "name": "Стекло закаленное безопасное", "tnved": "7007 11 100 1", "marking_status": "experiment"},
                    {"id": "pilot_компоненты_транспортных_средств_7007_11_100_9", "name": "Стекло закаленное безопасное", "tnved": "7007 11 100 9", "marking_status": "experiment"},
                    {"id": "pilot_компоненты_транспортных_средств_7007_11_900_0", "name": "Стекло закаленное безопасное", "tnved": "7007 11 900 0", "marking_status": "experiment"},
                    {"id": "pilot_компоненты_транспортных_средств_7007_21_200_1", "name": "Стекло многослойное безопасное", "tnved": "7007 21 200 1", "marking_status": "experiment"},
                    {"id": "pilot_компоненты_транспортных_средств_7007_21_200_9", "name": "Стекло многослойное безопасное", "tnved": "7007 21 200 9", "marking_status": "experiment"},
                    {"id": "pilot_компоненты_транспортных_средств_7007_21_800_9", "name": "Стекло многослойное безопасное", "tnved": "7007 21 800 9", "marking_status": "experiment"},
                    {"id": "pilot_компоненты_транспортных_средств_7007_29_000_0", "name": "Стекло многослойное безопасное", "tnved": "7007 29 000 0", "marking_status": "experiment"},
                    {"id": "pilot_компоненты_транспортных_средств_8511_10_000_1", "name": "Свечи зажигания", "tnved": "8511 10 000 1", "marking_status": "experiment"},
                    {"id": "pilot_компоненты_транспортных_средств_8511_10_000_9", "name": "Свечи зажигания", "tnved": "8511 10 000 9", "marking_status": "experiment"},
                    {"id": "pilot_компоненты_транспортных_средств_8708_22_000_1", "name": "Лобовые стекла", "tnved": "8708 22 000 1", "marking_status": "experiment"},
                    {"id": "pilot_компоненты_транспортных_средств_8708_22_000_9", "name": "Лобовые стекла", "tnved": "8708 22 000 9", "marking_status": "experiment"},
                    {"id": "pilot_компоненты_транспортных_средств_8708_30_910_1", "name": "Тормозные диски, колодки", "tnved": "8708 30 910 1", "marking_status": "experiment"},
                    {"id": "pilot_компоненты_транспортных_средств_8708_30_910_9", "name": "Тормозные диски, колодки", "tnved": "8708 30 910 9", "marking_status": "experiment"},
                    {"id": "pilot_компоненты_транспортных_средств_8708_30_990_9", "name": "Тормозные диски, колодки", "tnved": "8708 30 990 9", "marking_status": "experiment"},
                    {"id": "pilot_компоненты_транспортных_средств_8714_10_100_0", "name": "Тормозные диски, колодки мото", "tnved": "8714 10 100 0", "marking_status": "experiment"},
                    {"id": "pilot_компоненты_транспортных_средств_8708_70_500_1", "name": "Колеса ходовые, диски", "tnved": "8708 70 500 1", "marking_status": "experiment"},
                    {"id": "pilot_компоненты_транспортных_средств_8708_70_500_9", "name": "Колеса ходовые, диски", "tnved": "8708 70 500 9", "marking_status": "experiment"},
                    {"id": "pilot_компоненты_транспортных_средств_8708_70_990_1", "name": "Колеса ходовые, диски", "tnved": "8708 70 990 1", "marking_status": "experiment"},
                    {"id": "pilot_компоненты_транспортных_средств_8708_70_990_9", "name": "Колеса ходовые, диски", "tnved": "8708 70 990 9", "marking_status": "experiment"},
                    {"id": "pilot_компоненты_транспортных_средств_8714_10_300_0", "name": "Колеса ходовые мото", "tnved": "8714 10 300 0", "marking_status": "experiment"}
                ]
            },
            {
                "id": "pilot_товары_для_дома_и_интерьера",
                "name": "Товары для дома и интерьера",
                "products": [
                    {"id": "pilot_товары_для_дома_и_интерьера_3924_10_000_0", "name": "Посуда пластиковая столовая", "tnved": "3924 10 000 0", "marking_status": "experiment"},
                    {"id": "pilot_товары_для_дома_и_интерьера_3924_90_000_9", "name": "Посуда пластиковая прочая", "tnved": "3924 90 000 9", "marking_status": "experiment"},
                    {"id": "pilot_товары_для_дома_и_интерьера_4419", "name": "Посуда деревянная", "tnved": "4419", "marking_status": "experiment"},
                    {"id": "pilot_товары_для_дома_и_интерьера_4806_10_000_0", "name": "Бумага пергаментная", "tnved": "4806 10 000 0", "marking_status": "experiment"},
                    {"id": "pilot_товары_для_дома_и_интерьера_4806_20_000_0", "name": "Бумага жиронепроницаемая", "tnved": "4806 20 000 0", "marking_status": "experiment"},
                    {"id": "pilot_товары_для_дома_и_интерьера_4806_40_100_0", "name": "Бумага пергаментная прочая", "tnved": "4806 40 100 0", "marking_status": "experiment"},
                    {"id": "pilot_товары_для_дома_и_интерьера_4818_30_000_0", "name": "Скатерти бумажные", "tnved": "4818 30 000 0", "marking_status": "experiment"},
                    {"id": "pilot_товары_для_дома_и_интерьера_4823_61_000_0", "name": "Подносы бумажные", "tnved": "4823 61 000 0", "marking_status": "experiment"},
                    {"id": "pilot_товары_для_дома_и_интерьера_4823_69", "name": "Посуда бумажная прочая", "tnved": "4823 69", "marking_status": "experiment"},
                    {"id": "pilot_товары_для_дома_и_интерьера_6911", "name": "Посуда фарфоровая", "tnved": "6911", "marking_status": "experiment"},
                    {"id": "pilot_товары_для_дома_и_интерьера_6912_00", "name": "Посуда керамическая", "tnved": "6912 00", "marking_status": "experiment"},
                    {"id": "pilot_товары_для_дома_и_интерьера_7013", "name": "Посуда стеклянная", "tnved": "7013", "marking_status": "experiment"},
                    {"id": "pilot_товары_для_дома_и_интерьера_7323_91_000_0", "name": "Посуда чугунная эмалированная", "tnved": "7323 91 000 0", "marking_status": "experiment"},
                    {"id": "pilot_товары_для_дома_и_интерьера_7323_92_000_0", "name": "Посуда чугунная прочая", "tnved": "7323 92 000 0", "marking_status": "experiment"},
                    {"id": "pilot_товары_для_дома_и_интерьера_7323_93_000_0", "name": "Посуда из нержавеющей стали", "tnved": "7323 93 000 0", "marking_status": "experiment"},
                    {"id": "pilot_товары_для_дома_и_интерьера_7323_94_000_0", "name": "Посуда стальная эмалированная", "tnved": "7323 94 000 0", "marking_status": "experiment"},
                    {"id": "pilot_товары_для_дома_и_интерьера_7323_99_000_0", "name": "Посуда стальная прочая", "tnved": "7323 99 000 0", "marking_status": "experiment"},
                    {"id": "pilot_товары_для_дома_и_интерьера_7326_20_000_2", "name": "Изделия из проволоки", "tnved": "7326 20 000 2", "marking_status": "experiment"},
                    {"id": "pilot_товары_для_дома_и_интерьера_7418_10_100_0", "name": "Посуда медная", "tnved": "7418 10 100 0", "marking_status": "experiment"},
                    {"id": "pilot_товары_для_дома_и_интерьера_7615_10_100_0", "name": "Посуда алюминиевая", "tnved": "7615 10 100 0", "marking_status": "experiment"},
                    {"id": "pilot_товары_для_дома_и_интерьера_7615_10_300_0", "name": "Посуда алюминиевая", "tnved": "7615 10 300 0", "marking_status": "experiment"},
                    {"id": "pilot_товары_для_дома_и_интерьера_7615_10_800_9", "name": "Посуда алюминиевая прочая", "tnved": "7615 10 800 9", "marking_status": "experiment"},
                    {"id": "pilot_товары_для_дома_и_интерьера_8205_51_009_0", "name": "Инструменты кухонные", "tnved": "8205 51 009 0", "marking_status": "experiment"},
                    {"id": "pilot_товары_для_дома_и_интерьера_8211_10_000_0", "name": "Наборы ножей", "tnved": "8211 10 000 0", "marking_status": "experiment"},
                    {"id": "pilot_товары_для_дома_и_интерьера_8211_91_000", "name": "Ножи столовые", "tnved": "8211 91 000", "marking_status": "experiment"},
                    {"id": "pilot_товары_для_дома_и_интерьера_8211_92_000_0", "name": "Ножи кухонные", "tnved": "8211 92 000 0", "marking_status": "experiment"},
                    {"id": "pilot_товары_для_дома_и_интерьера_8213_00_000_0", "name": "Ножницы", "tnved": "8213 00 000 0", "marking_status": "experiment"},
                    {"id": "pilot_товары_для_дома_и_интерьера_8215", "name": "Столовые приборы", "tnved": "8215", "marking_status": "experiment"},
                    {"id": "pilot_товары_для_дома_и_интерьера_9616_10", "name": "Пульверизаторы", "tnved": "9616 10", "marking_status": "experiment"},
                    {"id": "pilot_товары_для_дома_и_интерьера_9617_00_000", "name": "Термосы", "tnved": "9617 00 000", "marking_status": "experiment"},
                    {"id": "pilot_товары_для_дома_и_интерьера_6307_10", "name": "Тряпки для уборки", "tnved": "6307 10", "marking_status": "experiment"},
                    {"id": "pilot_товары_для_дома_и_интерьера_9603_10_000_0", "name": "Метлы", "tnved": "9603 10 000 0", "marking_status": "experiment"},
                    {"id": "pilot_товары_для_дома_и_интерьера_9603_90", "name": "Щетки и швабры", "tnved": "9603 90", "marking_status": "experiment"},
                    {"id": "pilot_товары_для_дома_и_интерьера_9604_00_000_0", "name": "Сита", "tnved": "9604 00 000 0", "marking_status": "experiment"},
                    {"id": "pilot_товары_для_дома_и_интерьера_3406_00_000_0", "name": "Свечи", "tnved": "3406 00 000 0", "marking_status": "experiment"},
                    {"id": "pilot_товары_для_дома_и_интерьера_3926_40_000_0", "name": "Статуэтки пластиковые", "tnved": "3926 40 000 0", "marking_status": "experiment"},
                    {"id": "pilot_товары_для_дома_и_интерьера_4414", "name": "Рамки деревянные", "tnved": "4414", "marking_status": "experiment"},
                    {"id": "pilot_товары_для_дома_и_интерьера_4420_11_000_0", "name": "Статуэтки деревянные", "tnved": "4420 11 000 0", "marking_status": "experiment"},
                    {"id": "pilot_товары_для_дома_и_интерьера_4420_19_000_0", "name": "Статуэтки деревянные прочие", "tnved": "4420 19 000 0", "marking_status": "experiment"},
                    {"id": "pilot_товары_для_дома_и_интерьера_4421_10_000_0", "name": "Вешалки деревянные", "tnved": "4421 10 000 0", "marking_status": "experiment"},
                    {"id": "pilot_товары_для_дома_и_интерьера_4602", "name": "Изделия плетеные", "tnved": "4602", "marking_status": "experiment"},
                    {"id": "pilot_товары_для_дома_и_интерьера_6702", "name": "Искусственные цветы", "tnved": "6702", "marking_status": "experiment"},
                    {"id": "pilot_товары_для_дома_и_интерьера_6810_99_000_0", "name": "Изделия из цемента", "tnved": "6810 99 000 0", "marking_status": "experiment"},
                    {"id": "pilot_товары_для_дома_и_интерьера_6913", "name": "Статуэтки керамические", "tnved": "6913", "marking_status": "experiment"},
                    {"id": "pilot_товары_для_дома_и_интерьера_7009_91_000_0", "name": "Зеркала без рамы", "tnved": "7009 91 000 0", "marking_status": "experiment"},
                    {"id": "pilot_товары_для_дома_и_интерьера_7009_92_000_0", "name": "Зеркала в раме", "tnved": "7009 92 000 0", "marking_status": "experiment"},
                    {"id": "pilot_товары_для_дома_и_интерьера_8306_21_000_0", "name": "Статуэтки металлические", "tnved": "8306 21 000 0", "marking_status": "experiment"},
                    {"id": "pilot_товары_для_дома_и_интерьера_8306_29_000", "name": "Статуэтки металлические прочие", "tnved": "8306 29 000", "marking_status": "experiment"},
                    {"id": "pilot_товары_для_дома_и_интерьера_8306_30_000_0", "name": "Рамки для фото металлические", "tnved": "8306 30 000 0", "marking_status": "experiment"},
                    {"id": "pilot_товары_для_дома_и_интерьера_9105_19_000_0", "name": "Часы настенные", "tnved": "9105 19 000 0", "marking_status": "experiment"},
                    {"id": "pilot_товары_для_дома_и_интерьера_9105_29_000_0", "name": "Часы настенные прочие", "tnved": "9105 29 000 0", "marking_status": "experiment"},
                    {"id": "pilot_товары_для_дома_и_интерьера_9105_96_000_0", "name": "Часы настенные прочие", "tnved": "9105 96 000 0", "marking_status": "experiment"},
                    {"id": "pilot_товары_для_дома_и_интерьера_9405_50_000_0", "name": "Подсвечники", "tnved": "9405 50 000 0", "marking_status": "experiment"}
                ]
            },
            {
                "id": "pilot_бакалейная_продукция",
                "name": "Бакалейная продукция",
                "products": [
                    {"id": "pilot_бакалейная_продукция_0713_10_900_9", "name": "Горох прочий", "tnved": "0713 10 900 9", "marking_status": "experiment"},
                    {"id": "pilot_бакалейная_продукция_0713_20_000_0", "name": "Нут сушеный", "tnved": "0713 20 000 0", "marking_status": "experiment"},
                    {"id": "pilot_бакалейная_продукция_0713_31_000_0", "name": "Фасоль VINGA MUNGO", "tnved": "0713 31 000 0", "marking_status": "experiment"},
                    {"id": "pilot_бакалейная_продукция_0713_32_000_0", "name": "Фасоль мелкая красная (адзуки)", "tnved": "0713 32 000 0", "marking_status": "experiment"},
                    {"id": "pilot_бакалейная_продукция_0713_33_900_0", "name": "Фасоль обыкновенная", "tnved": "0713 33 900 0", "marking_status": "experiment"},
                    {"id": "pilot_бакалейная_продукция_0713_34_000_9", "name": "Земляной орех бамбарский", "tnved": "0713 34 000 9", "marking_status": "experiment"},
                    {"id": "pilot_бакалейная_продукция_0713_35_000_9", "name": "Коровий горох", "tnved": "0713 35 000 9", "marking_status": "experiment"},
                    {"id": "pilot_бакалейная_продукция_0713_39_000_9", "name": "Фасоль прочая", "tnved": "0713 39 000 9", "marking_status": "experiment"},
                    {"id": "pilot_бакалейная_продукция_0713_40_000_0", "name": "Чечевица", "tnved": "0713 40 000 0", "marking_status": "experiment"},
                    {"id": "pilot_бакалейная_продукция_0713_60_000_9", "name": "Голубиный горох", "tnved": "0713 60 000 9", "marking_status": "experiment"},
                    {"id": "pilot_бакалейная_продукция_0713_90_000_9", "name": "Прочие бобовые", "tnved": "0713 90 000 9", "marking_status": "experiment"},
                    {"id": "pilot_бакалейная_продукция_1006", "name": "Рис (кроме 1006 10)", "tnved": "1006", "marking_status": "experiment"},
                    {"id": "pilot_бакалейная_продукция_1007_90_000_0", "name": "Сорго зерновое", "tnved": "1007 90 000 0", "marking_status": "experiment"},
                    {"id": "pilot_бакалейная_продукция_1008_10_000_0", "name": "Гречиха", "tnved": "1008 10 000 0", "marking_status": "experiment"},
                    {"id": "pilot_бакалейная_продукция_1008_29_000_0", "name": "Просо и прочие злаки", "tnved": "1008 29 000 0", "marking_status": "experiment"},
                    {"id": "pilot_бакалейная_продукция_1008_50_000_0", "name": "Киноа", "tnved": "1008 50 000 0", "marking_status": "experiment"},
                    {"id": "pilot_бакалейная_продукция_1008_90_000_0", "name": "Прочие злаки", "tnved": "1008 90 000 0", "marking_status": "experiment"},
                    {"id": "pilot_бакалейная_продукция_1101_00", "name": "Мука пшеничная", "tnved": "1101 00", "marking_status": "experiment"},
                    {"id": "pilot_бакалейная_продукция_1102", "name": "Мука из зерна злаков", "tnved": "1102", "marking_status": "experiment"},
                    {"id": "pilot_бакалейная_продукция_1103", "name": "Крупа из зерна злаков", "tnved": "1103", "marking_status": "experiment"},
                    {"id": "pilot_бакалейная_продукция_1104", "name": "Зерно злаков обработанное", "tnved": "1104", "marking_status": "experiment"},
                    {"id": "pilot_бакалейная_продукция_1105", "name": "Мука картофельная, хлопья", "tnved": "1105", "marking_status": "experiment"},
                    {"id": "pilot_бакалейная_продукция_1106", "name": "Мука из бобовых", "tnved": "1106", "marking_status": "experiment"},
                    {"id": "pilot_бакалейная_продукция_1208", "name": "Мука из масличных культур", "tnved": "1208", "marking_status": "experiment"},
                    {"id": "pilot_бакалейная_продукция_1212", "name": "Продукты растительного происхождения", "tnved": "1212", "marking_status": "experiment"},
                    {"id": "pilot_бакалейная_продукция_1901_10_000_0", "name": "Готовые продукты для детей", "tnved": "1901 10 000 0", "marking_status": "experiment"},
                    {"id": "pilot_бакалейная_продукция_1901_20_000_0", "name": "Смеси для теста", "tnved": "1901 20 000 0", "marking_status": "experiment"},
                    {"id": "pilot_бакалейная_продукция_1902", "name": "Макаронные изделия", "tnved": "1902", "marking_status": "experiment"},
                    {"id": "pilot_бакалейная_продукция_1904_10", "name": "Готовые продукты из злаков вздутые", "tnved": "1904 10", "marking_status": "experiment"},
                    {"id": "pilot_бакалейная_продукция_1904_20", "name": "Мюсли, хлопья", "tnved": "1904 20", "marking_status": "experiment"},
                    {"id": "pilot_бакалейная_продукция_1904_30_000_0", "name": "Булгур", "tnved": "1904 30 000 0", "marking_status": "experiment"},
                    {"id": "pilot_бакалейная_продукция_1904_90", "name": "Злаки готовые прочие", "tnved": "1904 90", "marking_status": "experiment"},
                    {"id": "pilot_бакалейная_продукция_1905_90", "name": "Смеси для хлебобулочных изделий", "tnved": "1905 90", "marking_status": "experiment"},
                    {"id": "pilot_бакалейная_продукция_2004_90_500_0", "name": "Горох и фасоль в стручках", "tnved": "2004 90 500 0", "marking_status": "experiment"},
                    {"id": "pilot_бакалейная_продукция_2005_20_100_0", "name": "Картофель быстрого приготовления", "tnved": "2005 20 100 0", "marking_status": "experiment"},
                    {"id": "pilot_бакалейная_продукция_2005_40_000_0", "name": "Горох консервированный", "tnved": "2005 40 000 0", "marking_status": "experiment"},
                    {"id": "pilot_бакалейная_продукция_2005_51_000_0", "name": "Фасоль лущеная консервированная", "tnved": "2005 51 000 0", "marking_status": "experiment"},
                    {"id": "pilot_бакалейная_продукция_2005_59_000_0", "name": "Фасоль прочая консервированная", "tnved": "2005 59 000 0", "marking_status": "experiment"},
                    {"id": "pilot_бакалейная_продукция_0409_00_000_0", "name": "Мёд натуральный", "tnved": "0409 00 000 0", "marking_status": "experiment"},
                    {"id": "pilot_бакалейная_продукция_1212_99_950_9", "name": "Продукты растительные пищевые", "tnved": "1212 99 950 9", "marking_status": "experiment"},
                    {"id": "pilot_бакалейная_продукция_1702", "name": "Искусственный мёд, сахара прочие", "tnved": "1702", "marking_status": "experiment"}
                ]
            },
            {
                "id": "pilot_полуфабрикаты_и_замороженная_продукция",
                "name": "Полуфабрикаты и замороженная продукция",
                "products": [
                    {"id": "pilot_полуфабрикаты_и_замороженная_продукция_0201", "name": "Мясо крупного рогатого скота, свежее или охлажденное", "tnved": "0201", "marking_status": "experiment"},
                    {"id": "pilot_полуфабрикаты_и_замороженная_продукция_0202", "name": "Мясо крупного рогатого скота, замороженное", "tnved": "0202", "marking_status": "experiment"},
                    {"id": "pilot_полуфабрикаты_и_замороженная_продукция_0203", "name": "Свинина свежая, охлажденная или замороженная", "tnved": "0203", "marking_status": "experiment"},
                    {"id": "pilot_полуфабрикаты_и_замороженная_продукция_0204", "name": "Баранина или козлятина", "tnved": "0204", "marking_status": "experiment"},
                    {"id": "pilot_полуфабрикаты_и_замороженная_продукция_0205_00", "name": "Мясо лошадей, ослов, мулов", "tnved": "0205 00", "marking_status": "experiment"},
                    {"id": "pilot_полуфабрикаты_и_замороженная_продукция_0206", "name": "Пищевые субпродукты", "tnved": "0206", "marking_status": "experiment"},
                    {"id": "pilot_полуфабрикаты_и_замороженная_продукция_0207", "name": "Мясо и субпродукты домашней птицы", "tnved": "0207", "marking_status": "experiment"},
                    {"id": "pilot_полуфабрикаты_и_замороженная_продукция_0208", "name": "Прочее мясо и субпродукты", "tnved": "0208", "marking_status": "experiment"},
                    {"id": "pilot_полуфабрикаты_и_замороженная_продукция_0209", "name": "Свиной жир и жир птицы", "tnved": "0209", "marking_status": "experiment"},
                    {"id": "pilot_полуфабрикаты_и_замороженная_продукция_0304", "name": "Филе рыбное и прочее мясо рыбы", "tnved": "0304", "marking_status": "experiment"},
                    {"id": "pilot_полуфабрикаты_и_замороженная_продукция_0306", "name": "Ракообразные", "tnved": "0306", "marking_status": "experiment"},
                    {"id": "pilot_полуфабрикаты_и_замороженная_продукция_0307", "name": "Моллюски", "tnved": "0307", "marking_status": "experiment"},
                    {"id": "pilot_полуфабрикаты_и_замороженная_продукция_0710", "name": "Овощи замороженные", "tnved": "0710", "marking_status": "experiment"},
                    {"id": "pilot_полуфабрикаты_и_замороженная_продукция_0811", "name": "Фрукты и орехи замороженные", "tnved": "0811", "marking_status": "experiment"},
                    {"id": "pilot_полуфабрикаты_и_замороженная_продукция_1501_10_900_0", "name": "Жир свиной топленый", "tnved": "1501 10 900 0", "marking_status": "experiment"},
                    {"id": "pilot_полуфабрикаты_и_замороженная_продукция_1501_20_900_0", "name": "Жир свиной прочий", "tnved": "1501 20 900 0", "marking_status": "experiment"},
                    {"id": "pilot_полуфабрикаты_и_замороженная_продукция_1501_90_000_0", "name": "Жир домашней птицы", "tnved": "1501 90 000 0", "marking_status": "experiment"},
                    {"id": "pilot_полуфабрикаты_и_замороженная_продукция_1601_00", "name": "Колбасы и аналогичные продукты из мяса", "tnved": "1601 00", "marking_status": "experiment"},
                    {"id": "pilot_полуфабрикаты_и_замороженная_продукция_1602", "name": "Готовые или консервированные продукты из мяса", "tnved": "1602", "marking_status": "experiment"},
                    {"id": "pilot_полуфабрикаты_и_замороженная_продукция_1604", "name": "Готовая или консервированная рыба", "tnved": "1604", "marking_status": "experiment"},
                    {"id": "pilot_полуфабрикаты_и_замороженная_продукция_1901_20_000_0", "name": "Смеси для приготовления", "tnved": "1901 20 000 0", "marking_status": "experiment"},
                    {"id": "pilot_полуфабрикаты_и_замороженная_продукция_1902", "name": "Макаронные изделия замороженные", "tnved": "1902", "marking_status": "experiment"},
                    {"id": "pilot_полуфабрикаты_и_замороженная_продукция_1904_90_100_0", "name": "Злаки готовые", "tnved": "1904 90 100 0", "marking_status": "experiment"},
                    {"id": "pilot_полуфабрикаты_и_замороженная_продукция_1905_90", "name": "Хлебобулочные изделия замороженные", "tnved": "1905 90", "marking_status": "experiment"},
                    {"id": "pilot_полуфабрикаты_и_замороженная_продукция_2003", "name": "Грибы готовые или консервированные", "tnved": "2003", "marking_status": "experiment"},
                    {"id": "pilot_полуфабрикаты_и_замороженная_продукция_2004", "name": "Овощи готовые замороженные", "tnved": "2004", "marking_status": "experiment"},
                    {"id": "pilot_полуфабрикаты_и_замороженная_продукция_2005", "name": "Овощи готовые незамороженные", "tnved": "2005", "marking_status": "experiment"},
                    {"id": "pilot_полуфабрикаты_и_замороженная_продукция_2104", "name": "Супы, бульоны готовые", "tnved": "2104", "marking_status": "experiment"},
                    {"id": "pilot_полуфабрикаты_и_замороженная_продукция_2106", "name": "Пищевые продукты прочие (кроме исключений)", "tnved": "2106", "marking_status": "experiment"}
                ]
            },
            {
                "id": "pilot_радиоэлектроника_i_этап",
                "name": "Радиоэлектроника (I этап) (завершен)",
                "products": [
                    {"id": "pilot_радиоэлектроника_i_этап_8504_40_830_0", "name": "Выпрямители прочие", "tnved": "8504 40 830 0", "marking_status": "not_required"},
                    {"id": "pilot_радиоэлектроника_i_этап_8504_40_910_0", "name": "Преобразователи статические прочие", "tnved": "8504 40 910 0", "marking_status": "not_required"},
                    {"id": "pilot_радиоэлектроника_i_этап_8536_49_000_0", "name": "Реле на напряжение не более 1000 В", "tnved": "8536 49 000 0", "marking_status": "not_required"},
                    {"id": "pilot_радиоэлектроника_i_этап_8536_69_900_8", "name": "Штепсели и розетки", "tnved": "8536 69 900 8", "marking_status": "not_required"},
                    {"id": "pilot_радиоэлектроника_i_этап_8536_90_100_0", "name": "Соединители для проводов и кабелей", "tnved": "8536 90 100 0", "marking_status": "not_required"},
                    {"id": "pilot_радиоэлектроника_i_этап_8536_90_850_0", "name": "Аппаратура электрическая прочая", "tnved": "8536 90 850 0", "marking_status": "not_required"},
                    {"id": "pilot_радиоэлектроника_i_этап_8537_10_980_0", "name": "Пульты, панели, распределительные щиты", "tnved": "8537 10 980 0", "marking_status": "not_required"},
                    {"id": "pilot_радиоэлектроника_i_этап_8539", "name": "Лампы накаливания и газоразрядные", "tnved": "8539", "marking_status": "not_required"},
                    {"id": "pilot_радиоэлектроника_i_этап_8541_41_000", "name": "Светодиоды (LED)", "tnved": "8541 41 000", "marking_status": "not_required"},
                    {"id": "pilot_радиоэлектроника_i_этап_8541_42_000_0", "name": "Фотогальванические элементы", "tnved": "8541 42 000 0", "marking_status": "not_required"},
                    {"id": "pilot_радиоэлектроника_i_этап_8541_43_000_0", "name": "Фоточувствительные приборы", "tnved": "8541 43 000 0", "marking_status": "not_required"},
                    {"id": "pilot_радиоэлектроника_i_этап_8541_49_000_0", "name": "Приборы полупроводниковые прочие", "tnved": "8541 49 000 0", "marking_status": "not_required"},
                    {"id": "pilot_радиоэлектроника_i_этап_8512_20_000", "name": "Приборы освещения для транспорта", "tnved": "8512 20 000", "marking_status": "not_required"},
                    {"id": "pilot_радиоэлектроника_i_этап_8513_10_000_0", "name": "Фонари портативные", "tnved": "8513 10 000 0", "marking_status": "not_required"},
                    {"id": "pilot_радиоэлектроника_i_этап_9405_11_00", "name": "Люстры и светильники потолочные", "tnved": "9405 11 00", "marking_status": "not_required"},
                    {"id": "pilot_радиоэлектроника_i_этап_9405_19_00", "name": "Светильники прочие", "tnved": "9405 19 00", "marking_status": "not_required"},
                    {"id": "pilot_радиоэлектроника_i_этап_9405_21_00", "name": "Лампы настольные LED", "tnved": "9405 21 00", "marking_status": "not_required"},
                    {"id": "pilot_радиоэлектроника_i_этап_9405_29_00", "name": "Лампы настольные прочие", "tnved": "9405 29 00", "marking_status": "not_required"},
                    {"id": "pilot_радиоэлектроника_i_этап_9405_31_000_0", "name": "Гирлянды световые LED", "tnved": "9405 31 000 0", "marking_status": "not_required"},
                    {"id": "pilot_радиоэлектроника_i_этап_9405_39_000_0", "name": "Гирлянды световые прочие", "tnved": "9405 39 000 0", "marking_status": "not_required"},
                    {"id": "pilot_радиоэлектроника_i_этап_9405_41_00", "name": "Фотогальванические светильники", "tnved": "9405 41 00", "marking_status": "not_required"},
                    {"id": "pilot_радиоэлектроника_i_этап_9405_42_00", "name": "Светильники LED прочие", "tnved": "9405 42 00", "marking_status": "not_required"},
                    {"id": "pilot_радиоэлектроника_i_этап_9405_49_00", "name": "Светильники прочие", "tnved": "9405 49 00", "marking_status": "not_required"},
                    {"id": "pilot_радиоэлектроника_i_этап_9405_92_000_8", "name": "Части светильников пластиковые", "tnved": "9405 92 000 8", "marking_status": "not_required"},
                    {"id": "pilot_радиоэлектроника_i_этап_9405_99_000_8", "name": "Части светильников прочие", "tnved": "9405 99 000 8", "marking_status": "not_required"}
                ]
            },
            {
                "id": "pilot_радиоэлектроника_ii_этап",
                "name": "Радиоэлектроника (II этап) (завершен)",
                "products": [
                    {"id": "pilot_радиоэлектроника_ii_этап_8471_30_000_0", "name": "Ноутбуки портативные до 10 кг", "tnved": "8471 30 000 0", "marking_status": "not_required"},
                    {"id": "pilot_радиоэлектроника_ii_этап_8517_11_000_0", "name": "Телефоны проводные с беспроводной трубкой", "tnved": "8517 11 000 0", "marking_status": "not_required"},
                    {"id": "pilot_радиоэлектроника_ii_этап_8517_13_000_0", "name": "Смартфоны", "tnved": "8517 13 000 0", "marking_status": "not_required"},
                    {"id": "pilot_радиоэлектроника_ii_этап_8517_14_000_0", "name": "Телефоны для сотовых сетей прочие", "tnved": "8517 14 000 0", "marking_status": "not_required"},
                    {"id": "pilot_радиоэлектроника_ii_этап_8517_18_000_0", "name": "Телефонные аппараты прочие", "tnved": "8517 18 000 0", "marking_status": "not_required"}
                ]
            },
            {
                "id": "pilot_радиоэлектроника_iii_этап",
                "name": "Радиоэлектроника (III этап) (завершен)",
                "products": [
                    {"id": "pilot_радиоэлектроника_iii_этап_8534_00_110_0", "name": "Печатные схемы многослойные", "tnved": "8534 00 110 0", "marking_status": "not_required"},
                    {"id": "pilot_радиоэлектроника_iii_этап_8534_00_190_0", "name": "Печатные схемы прочие", "tnved": "8534 00 190 0", "marking_status": "not_required"},
                    {"id": "pilot_радиоэлектроника_iii_этап_8534_00_900_0", "name": "Печатные схемы с пассивными элементами", "tnved": "8534 00 900 0", "marking_status": "not_required"}
                ]
            },
            {
                "id": "pilot_радиоэлектроника_iv_этап",
                "name": "Радиоэлектроника (IV этап)",
                "products": [
                    {"id": "pilot_радиоэлектроника_iv_этап_8543_40_000_0", "name": "Электронные сигареты многоразовые", "tnved": "8543 40 000 0", "marking_status": "experiment"}
                ]
            },
            {
                "id": "pilot_печатная_продукция",
                "name": "Печатная продукция (завершен)",
                "products": [
                    {"id": "pilot_печатная_продукция_4901_99_000_0", "name": "Учебники печатные общеобразовательные", "tnved": "4901 99 000 0", "marking_status": "not_required"}
                ]
            },
            {
                "id": "pilot_кабельная_продукция",
                "name": "Кабельная продукция",
                "products": [
                    {"id": "pilot_кабельная_продукция_8544_49_990_0", "name": "Кабели и провода на напряжение 1000 В", "tnved": "8544 49 990 0", "marking_status": "experiment"},
                    {"id": "pilot_кабельная_продукция_8544_49_910_8", "name": "Кабели с изолированными проводниками >0,51 мм", "tnved": "8544 49 910 8", "marking_status": "experiment"}
                ]
            },
            {
                "id": "pilot_медицинские_изделия_2.0",
                "name": "Медицинские изделия 2.0",
                "products": [
                    {"id": "pilot_медицинские_изделия_2.0_4014_10_000_0", "name": "Презервативы", "tnved": "4014 10 000 0", "marking_status": "experiment"},
                    {"id": "pilot_медицинские_изделия_2.0_9018_31", "name": "Шприцы", "tnved": "9018 31", "marking_status": "experiment"},
                    {"id": "pilot_медицинские_изделия_2.0_9018_90_500", "name": "Инфузионные системы", "tnved": "9018 90 500", "marking_status": "experiment"},
                    {"id": "pilot_медицинские_изделия_2.0_3005_10_000_0", "name": "Салфетки медицинские", "tnved": "3005 10 000 0", "marking_status": "experiment"},
                    {"id": "pilot_медицинские_изделия_2.0_3005_90_310_0", "name": "Салфетки медицинские", "tnved": "3005 90 310 0", "marking_status": "experiment"},
                    {"id": "pilot_медицинские_изделия_2.0_3005_90_500_0", "name": "Салфетки медицинские", "tnved": "3005 90 500 0", "marking_status": "experiment"},
                    {"id": "pilot_медицинские_изделия_2.0_3005_90_990_0", "name": "Салфетки медицинские прочие", "tnved": "3005 90 990 0", "marking_status": "experiment"},
                    {"id": "pilot_медицинские_изделия_2.0_4803_00_900_0", "name": "Салфетки бумажные медицинские", "tnved": "4803 00 900 0", "marking_status": "experiment"},
                    {"id": "pilot_медицинские_изделия_2.0_4818_20", "name": "Салфетки носовые медицинские", "tnved": "4818 20", "marking_status": "experiment"},
                    {"id": "pilot_медицинские_изделия_2.0_4818_30_000_0", "name": "Скатерти медицинские", "tnved": "4818 30 000 0", "marking_status": "experiment"},
                    {"id": "pilot_медицинские_изделия_2.0_4818_90", "name": "Изделия бумажные медицинские", "tnved": "4818 90", "marking_status": "experiment"},
                    {"id": "pilot_медицинские_изделия_2.0_5603", "name": "Нетканые материалы медицинские", "tnved": "5603", "marking_status": "experiment"},
                    {"id": "pilot_медицинские_изделия_2.0_6307_90_920_0", "name": "Изделия текстильные медицинские", "tnved": "6307 90 920 0", "marking_status": "experiment"},
                    {"id": "pilot_медицинские_изделия_2.0_6307_90_980_0", "name": "Изделия текстильные медицинские прочие", "tnved": "6307 90 980 0", "marking_status": "experiment"},
                    {"id": "pilot_медицинские_изделия_2.0_3307_90_000_8", "name": "Салфетки косметические медицинские", "tnved": "3307 90 000 8", "marking_status": "experiment"},
                    {"id": "pilot_медицинские_изделия_2.0_3926_90_970_9", "name": "Пробирки пластиковые", "tnved": "3926 90 970 9", "marking_status": "experiment"},
                    {"id": "pilot_медицинские_изделия_2.0_7010_10_000_0", "name": "Пробирки стеклянные (ампулы)", "tnved": "7010 10 000 0", "marking_status": "experiment"},
                    {"id": "pilot_медицинские_изделия_2.0_7017", "name": "Пробирки лабораторные стеклянные", "tnved": "7017", "marking_status": "experiment"},
                    {"id": "pilot_медицинские_изделия_2.0_9019_10", "name": "Аппаратура для озоновой/кислородной терапии", "tnved": "9019 10", "marking_status": "experiment"},
                    {"id": "pilot_медицинские_изделия_2.0_9019_20_000_0", "name": "Аппаратура терапевтическая дыхательная", "tnved": "9019 20 000 0", "marking_status": "experiment"},
                    {"id": "pilot_медицинские_изделия_2.0_9018_90_840_9", "name": "Инкубаторы для новорожденных", "tnved": "9018 90 840 9", "marking_status": "experiment"},
                    {"id": "pilot_медицинские_изделия_2.0_3006_10_900_0", "name": "Филлеры для пластической хирургии", "tnved": "3006 10 900 0", "marking_status": "experiment"},
                    {"id": "pilot_медицинские_изделия_2.0_9021_90_900_9", "name": "Имплантаты косметические (нити)", "tnved": "9021 90 900 9", "marking_status": "experiment"},
                    {"id": "pilot_медицинские_изделия_2.0_3926_20_000_0", "name": "Маски медицинские пластиковые", "tnved": "3926 20 000 0", "marking_status": "experiment"},
                    {"id": "pilot_медицинские_изделия_2.0_4818_90_100_0", "name": "Маски медицинские бумажные", "tnved": "4818 90 100 0", "marking_status": "experiment"},
                    {"id": "pilot_медицинские_изделия_2.0_9020_00_000_0", "name": "Маски медицинские дыхательные", "tnved": "9020 00 000 0", "marking_status": "experiment"}
                ]
            },
            {
                "id": "pilot_полимерные_трубы",
                "name": "Полимерные трубы",
                "products": [
                    {"id": "pilot_полимерные_трубы_3917_21_100_0", "name": "Трубы бесшовные из полимеров этилена", "tnved": "3917 21 100 0", "marking_status": "experiment"},
                    {"id": "pilot_полимерные_трубы_3917_22", "name": "Трубы из полимеров пропилена (кроме 3917 22 900 1)", "tnved": "3917 22", "marking_status": "experiment"},
                    {"id": "pilot_полимерные_трубы_3917_23", "name": "Трубы из полимеров винилхлорида", "tnved": "3917 23", "marking_status": "experiment"},
                    {"id": "pilot_полимерные_трубы_3917_29_000_9", "name": "Трубы из прочих пластмасс", "tnved": "3917 29 000 9", "marking_status": "experiment"},
                    {"id": "pilot_полимерные_трубы_3917_31_000_8", "name": "Трубы гибкие, давление ≥27,6 МПа", "tnved": "3917 31 000 8", "marking_status": "experiment"},
                    {"id": "pilot_полимерные_трубы_3917_32_000", "name": "Трубы не армированные без фитингов", "tnved": "3917 32 000", "marking_status": "experiment"},
                    {"id": "pilot_полимерные_трубы_3917_33_000_9", "name": "Трубы не армированные с фитингами", "tnved": "3917 33 000 9", "marking_status": "experiment"},
                    {"id": "pilot_полимерные_трубы_3917_40_000_9", "name": "Фитинги из пластмасс", "tnved": "3917 40 000 9", "marking_status": "experiment"},
                    {"id": "pilot_полимерные_трубы_3901_20_900_9", "name": "Композиции полиэтилена для труб", "tnved": "3901 20 900 9", "marking_status": "experiment"},
                    {"id": "pilot_полимерные_трубы_3902_10_000_0", "name": "Композиции полипропилена для труб", "tnved": "3902 10 000 0", "marking_status": "experiment"},
                    {"id": "pilot_полимерные_трубы_3904_10_000_9", "name": "Композиции поливинилхлорида для труб", "tnved": "3904 10 000 9", "marking_status": "experiment"}
                ]
            },
            {
                "id": "pilot_средства_гигиены",
                "name": "Средства гигиены",
                "products": [
                    {"id": "pilot_средства_гигиены_9603_21_000_0", "name": "Щетки зубные", "tnved": "9603 21 000 0", "marking_status": "experiment"},
                    {"id": "pilot_средства_гигиены_9603_29_300_0", "name": "Щетки для волос", "tnved": "9603 29 300 0", "marking_status": "experiment"},
                    {"id": "pilot_средства_гигиены_9603_29_800_0", "name": "Помазки, щеточки для ногтей/ресниц", "tnved": "9603 29 800 0", "marking_status": "experiment"},
                    {"id": "pilot_средства_гигиены_5601_21_100_0", "name": "Вата из хлопковых волокон", "tnved": "5601 21 100 0", "marking_status": "experiment"},
                    {"id": "pilot_средства_гигиены_5601_21_900_0", "name": "Вата из хлопковых волокон прочая", "tnved": "5601 21 900 0", "marking_status": "experiment"},
                    {"id": "pilot_средства_гигиены_8214_20_000_0", "name": "Наборы маникюрные/педикюрные", "tnved": "8214 20 000 0", "marking_status": "experiment"},
                    {"id": "pilot_средства_гигиены_4818_10_100_0", "name": "Бумага туалетная", "tnved": "4818 10 100 0", "marking_status": "experiment"},
                    {"id": "pilot_средства_гигиены_4818_10_900_0", "name": "Бумага туалетная прочая", "tnved": "4818 10 900 0", "marking_status": "experiment"},
                    {"id": "pilot_средства_гигиены_4818_20_100_0", "name": "Платки носовые, косметические салфетки", "tnved": "4818 20 100 0", "marking_status": "experiment"},
                    {"id": "pilot_средства_гигиены_4818_20_910_0", "name": "Полотенца для рук", "tnved": "4818 20 910 0", "marking_status": "experiment"},
                    {"id": "pilot_средства_гигиены_4818_20_990_0", "name": "Полотенца для рук прочие", "tnved": "4818 20 990 0", "marking_status": "experiment"},
                    {"id": "pilot_средства_гигиены_9615_11_000_0", "name": "Расчески из резины/пластмасс", "tnved": "9615 11 000 0", "marking_status": "experiment"},
                    {"id": "pilot_средства_гигиены_9615_19_000_0", "name": "Расчески прочие", "tnved": "9615 19 000 0", "marking_status": "experiment"},
                    {"id": "pilot_средства_гигиены_9619_00", "name": "Прокладки, тампоны, подгузники", "tnved": "9619 00", "marking_status": "experiment"},
                    {"id": "pilot_средства_гигиены_9019_10_900_9", "name": "Аппараты массажные", "tnved": "9019 10 900 9", "marking_status": "experiment"},
                    {"id": "pilot_средства_гигиены_2513_10_000_0", "name": "Пемза", "tnved": "2513 10 000 0", "marking_status": "experiment"},
                    {"id": "pilot_средства_гигиены_8203_20_000_1", "name": "Пинцеты", "tnved": "8203 20 000 1", "marking_status": "experiment"},
                    {"id": "pilot_средства_гигиены_3306_20_000_0", "name": "Нити зубные (зубной шелк)", "tnved": "3306 20 000 0", "marking_status": "experiment"},
                    {"id": "pilot_средства_гигиены_3924_90_000_1", "name": "Губки и мочалки пластиковые", "tnved": "3924 90 000 1", "marking_status": "experiment"},
                    {"id": "pilot_средства_гигиены_7323_10_000_0", "name": "Губки и мочалки металлические", "tnved": "7323 10 000 0", "marking_status": "experiment"},
                    {"id": "pilot_средства_гигиены_7418_10_900_0", "name": "Губки медные", "tnved": "7418 10 900 0", "marking_status": "experiment"},
                    {"id": "pilot_средства_гигиены_7615_10_800_1", "name": "Губки алюминиевые", "tnved": "7615 10 800 1", "marking_status": "experiment"}
                ]
            },
            {
                "id": "pilot_удобрения",
                "name": "Удобрения",
                "products": [
                    {"id": "pilot_удобрения_3105", "name": "Удобрения минеральные (N, P, K)", "tnved": "3105", "marking_status": "experiment"},
                    {"id": "pilot_удобрения_2834_21_000_0", "name": "Нитраты калия", "tnved": "2834 21 000 0", "marking_status": "experiment"},
                    {"id": "pilot_удобрения_2834_29_800_0", "name": "Нитраты прочие", "tnved": "2834 29 800 0", "marking_status": "experiment"},
                    {"id": "pilot_удобрения_2835_24_000_0", "name": "Фосфаты калия", "tnved": "2835 24 000 0", "marking_status": "experiment"}
                ]
            },
            {
                "id": "pilot_мясные_изделия",
                "name": "Мясные изделия",
                "products": [
                    {"id": "pilot_мясные_изделия_1601_00", "name": "Колбасы и аналогичные продукты", "tnved": "1601 00", "marking_status": "experiment"},
                    {"id": "pilot_мясные_изделия_1602", "name": "Готовые/консервированные продукты из мяса", "tnved": "1602", "marking_status": "experiment"},
                    {"id": "pilot_мясные_изделия_0209_00", "name": "Свиной жир и жир птицы", "tnved": "0209 00", "marking_status": "experiment"},
                    {"id": "pilot_мясные_изделия_0210_11", "name": "Свиные окорока, лопатки необваленные", "tnved": "0210 11", "marking_status": "experiment"},
                    {"id": "pilot_мясные_изделия_0210_12", "name": "Свиные грудинки", "tnved": "0210 12", "marking_status": "experiment"},
                    {"id": "pilot_мясные_изделия_0210_19", "name": "Прочие части туш свиней", "tnved": "0210 19", "marking_status": "experiment"},
                    {"id": "pilot_мясные_изделия_0210_20", "name": "Мясо КРС соленое/сушеное/копченое", "tnved": "0210 20", "marking_status": "experiment"},
                    {"id": "pilot_мясные_изделия_0210_99_100_0", "name": "Мясо лошадей соленое/сушеное", "tnved": "0210 99 100 0", "marking_status": "experiment"},
                    {"id": "pilot_мясные_изделия_0210_99_210_0", "name": "Баранина/козлятина необваленная", "tnved": "0210 99 210 0", "marking_status": "experiment"},
                    {"id": "pilot_мясные_изделия_0210_99_290_0", "name": "Баранина/козлятина обваленная", "tnved": "0210 99 290 0", "marking_status": "experiment"},
                    {"id": "pilot_мясные_изделия_0210_99_310_0", "name": "Мясо северных оленей", "tnved": "0210 99 310 0", "marking_status": "experiment"},
                    {"id": "pilot_мясные_изделия_0210_99_390_0", "name": "Прочее мясо", "tnved": "0210 99 390 0", "marking_status": "experiment"},
                    {"id": "pilot_мясные_изделия_0210_99_410_0", "name": "Печень", "tnved": "0210 99 410 0", "marking_status": "experiment"},
                    {"id": "pilot_мясные_изделия_0210_99_490_0", "name": "Субпродукты свиные прочие", "tnved": "0210 99 490 0", "marking_status": "experiment"},
                    {"id": "pilot_мясные_изделия_0210_99_510_0", "name": "Диафрагма КРС", "tnved": "0210 99 510 0", "marking_status": "experiment"},
                    {"id": "pilot_мясные_изделия_0210_99_590_0", "name": "Субпродукты КРС прочие", "tnved": "0210 99 590 0", "marking_status": "experiment"},
                    {"id": "pilot_мясные_изделия_0210_99_710_0", "name": "Жирная печень гусей/уток соленая", "tnved": "0210 99 710 0", "marking_status": "experiment"},
                    {"id": "pilot_мясные_изделия_0210_99_790_0", "name": "Жирная печень гусей/уток прочая", "tnved": "0210 99 790 0", "marking_status": "experiment"},
                    {"id": "pilot_мясные_изделия_0210_99_850_0", "name": "Жирная печень прочая", "tnved": "0210 99 850 0", "marking_status": "experiment"},
                    {"id": "pilot_мясные_изделия_1501_10_900_0", "name": "Лярд прочий", "tnved": "1501 10 900 0", "marking_status": "experiment"},
                    {"id": "pilot_мясные_изделия_1501_20_900_0", "name": "Жир свиной прочий", "tnved": "1501 20 900 0", "marking_status": "experiment"},
                    {"id": "pilot_мясные_изделия_1501_90_000_0", "name": "Жир свиной и жир птицы прочий", "tnved": "1501 90 000 0", "marking_status": "experiment"}
                ]
            }
        ]
    }
]

# Build lookup dictionary for quick access (новая 3-уровневая структура)
PRODUCTS_LOOKUP = {}
for category in CATEGORIES_DATA:
    for sub in category.get("subcategories", []):
        for product in sub.get("products", []):
            PRODUCTS_LOOKUP[product["id"]] = {
                "category_id": category["id"],
                "category_name": category["name"],
                "subcategory_id": sub["id"],
                "subcategory_name": sub["name"],
                "name": product["name"],
                "tnved": product.get("tnved", ""),
                "marking_status": product.get("marking_status", "not_required"),
                "mandatory_since": product.get("mandatory_since"),
                "timeline": product.get("timeline")
            }

MARKING_STEPS = [
    "Зарегистрироваться в системе Честный ЗНАК (честныйзнак.рф)",
    "Получить усиленную квалифицированную электронную подпись (УКЭП)",
    "Настроить электронный документооборот (ЭДО)",
    "Заказать коды маркировки в личном кабинете",
    "Нанести коды маркировки на товар (принтер этикеток)",
    "Ввести товар в оборот через систему Честный ЗНАК"
]

EXPERIMENT_STEPS = [
    "Эксперимент по маркировке данной категории товаров продолжается",
    "Рекомендуем следить за новостями на сайте честныйзнак.рф",
    "При необходимости — зарегистрироваться в системе заблаговременно",
    "Подготовить техническую инфраструктуру (ЭДО, принтеры этикеток)"
]

COUNTRIES = [
    {"code": "AE", "name": "ОАЭ (Дубай)", "flag": "🇦🇪"},
    {"code": "CN", "name": "Китай", "flag": "🇨🇳"},
    {"code": "TR", "name": "Турция", "flag": "🇹🇷"},
    {"code": "KZ", "name": "Казахстан", "flag": "🇰🇿"},
    {"code": "BY", "name": "Беларусь", "flag": "🇧🇾"},
    {"code": "EU", "name": "Европа", "flag": "🇪🇺"},
    {"code": "OTHER", "name": "Другая страна", "flag": "🌍"}
]

IMPORT_SCHEMES = [
    {
        "id": "abroad",
        "title": "Маркировка за рубежом",
        "description": "Вы отправляете коды маркировки поставщику, он наносит их на товар, товар приходит уже промаркированный",
        "pros": ["Товар сразу готов к продаже", "Не нужно своё оборудование"],
        "cons": ["Нужен надёжный поставщик", "Сложнее контролировать качество"],
        "fit_for": "Крупных регулярных поставок"
    },
    {
        "id": "customs_warehouse",
        "title": "Маркировка на таможенном складе",
        "description": "Товар приходит без маркировки, маркируется на лицензированном складе в России до выпуска в оборот",
        "pros": ["Не зависите от поставщика", "Профессиональное оборудование"],
        "cons": ["Дополнительные расходы на услуги склада", "Увеличение времени растаможки"],
        "fit_for": "Средних партий, разных поставщиков"
    },
    {
        "id": "own_warehouse",
        "title": "Маркировка на своём складе",
        "description": "Товар растамаживается, вы маркируете его самостоятельно на своём складе",
        "pros": ["Полный контроль", "Минимальные расходы при больших объёмах"],
        "cons": ["Нужно своё оборудование", "Требуется обученный персонал"],
        "fit_for": "Собственного производства, больших объёмов"
    }
]

EQUIPMENT_DATABASE = {
    "printer": {"name": "Принтер этикеток", "purpose": "Печать DataMatrix кодов на этикетках", "price_min": 15000, "price_max": 80000},
    "scanner": {"name": "Сканер штрих-кодов", "purpose": "Считывание и проверка кодов маркировки", "price_min": 8000, "price_max": 35000},
    "tsd": {"name": "Терминал сбора данных (ТСД)", "purpose": "Мобильное сканирование и учёт товаров", "price_min": 25000, "price_max": 70000},
    "software": {"name": "Программа учёта", "purpose": "Интеграция с Честным ЗНАКом, учёт движения товаров", "price_min": 0, "price_max": 50000}
}

# ======================== ПРАЙС-ЛИСТ УСЛУГ ========================

# Прайс-лист услуг (цены с наценкой +35%)
# Услуги с тарифами имеют min_qty и max_qty для автоматического подбора цены
SERVICES_PRICELIST = [
    # 1. Аудит рабочего места - БЕСПЛАТНО
    {
        "id": "audit",
        "name": "Аудит рабочего места",
        "description": "Бесплатный аудит готовности вашего рабочего места к маркировке",
        "price": 0,
        "unit": "услуга",
        "category": "setup",
        "order": 1
    },
    # 2. Подготовка рабочего места - 4500 + 35% = 6075
    {
        "id": "workplace_setup",
        "name": "Подготовка рабочего места",
        "description": "Полная настройка рабочего места для работы с маркировкой",
        "price": 6075,
        "unit": "услуга",
        "category": "setup",
        "order": 2
    },
    # 3. Регистрация в Честном ЗНАКе - 1800 + 35% = 2430
    {
        "id": "reg_chz",
        "name": "Регистрация в Честном ЗНАКе",
        "description": "Регистрация компании в системе Честный ЗНАК",
        "price": 2430,
        "unit": "услуга",
        "category": "registration",
        "order": 3
    },
    # 4. Регистрация в Национальном Каталоге - 2500 + 35% = 3375
    {
        "id": "reg_catalog",
        "name": "Регистрация в Национальном Каталоге",
        "description": "Регистрация в Национальном каталоге товаров",
        "price": 3375,
        "unit": "услуга",
        "category": "registration",
        "order": 4
    },
    # 5. Заведение карточек товаров (GTIN) - тарифы с диапазонами
    {
        "id": "gtin_1_5",
        "name": "Заведение карточек товаров (GTIN)",
        "description": "Создание карточек товаров с присвоением GTIN",
        "price": 1620,
        "unit": "шт",
        "category": "gtin",
        "tier": "1-5",
        "min_qty": 1,
        "max_qty": 5,
        "order": 5
    },
    {
        "id": "gtin_6_50",
        "name": "Заведение карточек товаров (GTIN)",
        "description": "Создание карточек товаров с присвоением GTIN",
        "price": 810,
        "unit": "шт",
        "category": "gtin",
        "tier": "6-50",
        "min_qty": 6,
        "max_qty": 50,
        "order": 5
    },
    {
        "id": "gtin_51_500",
        "name": "Заведение карточек товаров (GTIN)",
        "description": "Создание карточек товаров с присвоением GTIN",
        "price": 540,
        "unit": "шт",
        "category": "gtin",
        "tier": "51-500",
        "min_qty": 51,
        "max_qty": 500,
        "order": 5
    },
    {
        "id": "gtin_501_2000",
        "name": "Заведение карточек товаров (GTIN)",
        "description": "Создание карточек товаров с присвоением GTIN",
        "price": 432,
        "unit": "шт",
        "category": "gtin",
        "tier": "501-2000",
        "min_qty": 501,
        "max_qty": 2000,
        "order": 5
    },
    {
        "id": "gtin_2000_plus",
        "name": "Заведение карточек товаров (GTIN)",
        "description": "Создание карточек товаров с присвоением GTIN",
        "price": 270,
        "unit": "шт",
        "category": "gtin",
        "tier": "от 2000",
        "min_qty": 2001,
        "max_qty": 999999,
        "order": 5
    },
    # 6. Выгрузка кодов маркировки - тарифы с диапазонами
    {
        "id": "codes_1_500",
        "name": "Выгрузка кодов маркировки",
        "description": "Выгрузка кодов маркировки из системы ЧЗ",
        "price": 1.62,
        "unit": "шт",
        "category": "codes",
        "tier": "1-500",
        "min_qty": 1,
        "max_qty": 500,
        "order": 6
    },
    {
        "id": "codes_501_5000",
        "name": "Выгрузка кодов маркировки",
        "description": "Выгрузка кодов маркировки из системы ЧЗ",
        "price": 1.22,
        "unit": "шт",
        "category": "codes",
        "tier": "501-5000",
        "min_qty": 501,
        "max_qty": 5000,
        "order": 6
    },
    {
        "id": "codes_5001_50000",
        "name": "Выгрузка кодов маркировки",
        "description": "Выгрузка кодов маркировки из системы ЧЗ",
        "price": 1.08,
        "unit": "шт",
        "category": "codes",
        "tier": "5001-50000",
        "min_qty": 5001,
        "max_qty": 50000,
        "order": 6
    },
    {
        "id": "codes_50000_plus",
        "name": "Выгрузка кодов маркировки",
        "description": "Выгрузка кодов маркировки из системы ЧЗ",
        "price": 0.68,
        "unit": "шт",
        "category": "codes",
        "tier": "от 50000",
        "min_qty": 50001,
        "max_qty": 999999,
        "order": 6
    },
    # 7. Ввод в оборот - тарифы с диапазонами
    {
        "id": "turnover_1_500",
        "name": "Ввод в оборот",
        "description": "Ввод товаров в оборот через систему ЧЗ",
        "price": 1.35,
        "unit": "шт",
        "category": "turnover",
        "tier": "1-500",
        "min_qty": 1,
        "max_qty": 500,
        "order": 7
    },
    {
        "id": "turnover_501_5000",
        "name": "Ввод в оборот",
        "description": "Ввод товаров в оборот через систему ЧЗ",
        "price": 1.08,
        "unit": "шт",
        "category": "turnover",
        "tier": "501-5000",
        "min_qty": 501,
        "max_qty": 5000,
        "order": 7
    },
    {
        "id": "turnover_5001_50000",
        "name": "Ввод в оборот",
        "description": "Ввод товаров в оборот через систему ЧЗ",
        "price": 0.81,
        "unit": "шт",
        "category": "turnover",
        "tier": "5001-50000",
        "min_qty": 5001,
        "max_qty": 50000,
        "order": 7
    },
    {
        "id": "turnover_50000_plus",
        "name": "Ввод в оборот",
        "description": "Ввод товаров в оборот через систему ЧЗ",
        "price": 0.68,
        "unit": "шт",
        "category": "turnover",
        "tier": "от 50000",
        "min_qty": 50001,
        "max_qty": 999999,
        "order": 7
    },
    # 8. Подготовка УПД - тарифы с диапазонами
    {
        "id": "upd_1_10",
        "name": "Подготовка УПД",
        "description": "Подготовка универсальных передаточных документов",
        "price": 405,
        "unit": "шт",
        "category": "upd",
        "tier": "1-10",
        "min_qty": 1,
        "max_qty": 10,
        "order": 8
    },
    {
        "id": "upd_11_30",
        "name": "Подготовка УПД",
        "description": "Подготовка универсальных передаточных документов",
        "price": 203,
        "unit": "шт",
        "category": "upd",
        "tier": "11-30",
        "min_qty": 11,
        "max_qty": 30,
        "order": 8
    },
    {
        "id": "upd_31_100",
        "name": "Подготовка УПД",
        "description": "Подготовка универсальных передаточных документов",
        "price": 135,
        "unit": "шт",
        "category": "upd",
        "tier": "31-100",
        "min_qty": 31,
        "max_qty": 100,
        "order": 8
    },
    {
        "id": "upd_100_plus",
        "name": "Подготовка УПД",
        "description": "Подготовка универсальных передаточных документов",
        "price": 68,
        "unit": "шт",
        "category": "upd",
        "tier": "от 100",
        "min_qty": 101,
        "max_qty": 999999,
        "order": 8
    },
    # 9. Подключение ЭДО - 3500 + 35% = 4725
    {
        "id": "edo_setup",
        "name": "Подключение ЭДО",
        "description": "Подключение и настройка электронного документооборота",
        "price": 4725,
        "unit": "услуга",
        "category": "edo",
        "order": 9
    },
    # 10. Настройка оборудования - 2500 + 35% = 3375
    {
        "id": "equipment_setup",
        "name": "Настройка оборудования",
        "description": "Настройка оборудования для работы с маркировкой",
        "price": 3375,
        "unit": "услуга",
        "category": "equipment",
        "order": 10
    },
    # 11. Создание КИЗов (КМ) - тарифы с диапазонами
    {
        "id": "kiz_1_500",
        "name": "Создание КИЗов (КМ)",
        "description": "Создание контрольных идентификационных знаков",
        "price": 2.03,
        "unit": "шт",
        "category": "kiz",
        "tier": "1-500",
        "min_qty": 1,
        "max_qty": 500,
        "order": 11
    },
    {
        "id": "kiz_501_5000",
        "name": "Создание КИЗов (КМ)",
        "description": "Создание контрольных идентификационных знаков",
        "price": 1.62,
        "unit": "шт",
        "category": "kiz",
        "tier": "501-5000",
        "min_qty": 501,
        "max_qty": 5000,
        "order": 11
    },
    {
        "id": "kiz_5001_50000",
        "name": "Создание КИЗов (КМ)",
        "description": "Создание контрольных идентификационных знаков",
        "price": 1.35,
        "unit": "шт",
        "category": "kiz",
        "tier": "5001-50000",
        "min_qty": 5001,
        "max_qty": 50000,
        "order": 11
    },
    {
        "id": "kiz_50000_plus",
        "name": "Создание КИЗов (КМ)",
        "description": "Создание контрольных идентификационных знаков",
        "price": 1.08,
        "unit": "шт",
        "category": "kiz",
        "tier": "от 50000",
        "min_qty": 50001,
        "max_qty": 999999,
        "order": 11
    },
    # 12. Обучение - почасовая оплата
    {
        "id": "training_hourly",
        "name": "Обучение (почасовое)",
        "description": "Обучение персонала работе с системой маркировки (почасовая оплата)",
        "price": 10000,
        "unit": "час",
        "category": "training",
        "order": 12
    },
    # 13. Обучение - тариф Стандарт
    {
        "id": "training_standard",
        "name": "Курс «Стандарт»",
        "description": "Полный курс обучения маркировке: 32 часа онлайн-занятий, все 8 модулей, материалы и сертификат",
        "price": 50000,
        "unit": "курс",
        "category": "training",
        "order": 13
    },
    # 14. Обучение - тариф Премиум
    {
        "id": "training_premium",
        "name": "Курс «Премиум»",
        "description": "Курс + практика на вашей компании: настройка 1С, практика в вашем ЛК, поддержка 30 дней",
        "price": 80000,
        "unit": "курс",
        "category": "training",
        "order": 14
    },
    # 15. Обучение - тариф VIP
    {
        "id": "training_vip",
        "name": "Курс «VIP»",
        "description": "Полное сопровождение: индивидуальный график, личный чат с экспертом 24/7, поддержка 90 дней",
        "price": 150000,
        "unit": "курс",
        "category": "training",
        "order": 15
    },
    # 16. Мини-курс для кассиров
    {
        "id": "training_cashier",
        "name": "Мини-курс для кассиров",
        "description": "4 часа практики работы с маркированными товарами на кассе",
        "price": 10000,
        "unit": "курс",
        "category": "training",
        "order": 16
    },
    # 17. Курс для бухгалтера
    {
        "id": "training_accountant",
        "name": "Курс для бухгалтера",
        "description": "8 часов практики: документооборот, отчётность, интеграция с 1С",
        "price": 20000,
        "unit": "курс",
        "category": "training",
        "order": 17
    },
    # 18. Корпоративное обучение
    {
        "id": "training_corporate",
        "name": "Корпоративное обучение",
        "description": "Обучение группы до 10 человек с адаптацией под специфику вашей компании",
        "price": 120000,
        "unit": "группа",
        "category": "training",
        "order": 18
    },
]

# Категории услуг: tiered=True означает услугу с тарифной сеткой (калькулятор)
SERVICE_CATEGORIES = {
    "setup": {"name": "Подготовка", "icon": "settings", "order": 1, "tiered": False},
    "registration": {"name": "Регистрация", "icon": "clipboard-check", "order": 2, "tiered": False},
    "gtin": {"name": "Карточки товаров (GTIN)", "icon": "tag", "order": 3, "tiered": True},
    "codes": {"name": "Выгрузка кодов маркировки", "icon": "qr-code", "order": 4, "tiered": True},
    "turnover": {"name": "Ввод в оборот", "icon": "arrow-right-circle", "order": 5, "tiered": True},
    "upd": {"name": "Подготовка УПД", "icon": "file-text", "order": 6, "tiered": True},
    "edo": {"name": "ЭДО", "icon": "send", "order": 7, "tiered": False},
    "equipment": {"name": "Оборудование", "icon": "printer", "order": 8, "tiered": False},
    "kiz": {"name": "Создание КИЗов", "icon": "barcode", "order": 9, "tiered": True},
    "training": {"name": "Обучение", "icon": "graduation-cap", "order": 10, "tiered": False},
}

# ======================== EMAIL FUNCTIONS ========================

def send_email(to_email: str, subject: str, body: str) -> bool:
    """Send email via SMTP with Beget configuration"""
    # Beget SMTP - все credentials из .env файла!
    smtp_host = os.getenv('SMTP_HOST', 'smtp.beget.com')
    smtp_port = os.getenv('SMTP_PORT', '465')
    smtp_user = os.getenv('SMTP_USER', '')
    smtp_pass = os.getenv('SMTP_PASSWORD', '')  # ОБЯЗАТЕЛЬНО установить в .env
    smtp_from = os.getenv('SMTP_FROM', '') or smtp_user
    smtp_use_tls = os.getenv('SMTP_USE_TLS', 'false').lower() == 'true'  # false = use SSL

    # Проверяем конфигурацию
    if not smtp_user or not smtp_pass:
        logger.error(f"[EMAIL ERROR] SMTP not configured! Set SMTP_USER and SMTP_PASSWORD in .env")
        return False

    # Log email attempt
    logger.info(f"Sending email to {to_email}, subject: {subject}")

    try:
        msg = MIMEMultipart('alternative')
        msg['Subject'] = Header(subject, 'utf-8')
        msg['From'] = formataddr((str(Header('Про.Маркируй', 'utf-8')), smtp_from))
        msg['To'] = to_email

        part = MIMEText(body, 'html', 'utf-8')
        msg.attach(part)

        if smtp_use_tls:
            server = smtplib.SMTP(smtp_host, int(smtp_port))
            server.starttls()
        else:
            server = smtplib.SMTP_SSL(smtp_host, int(smtp_port))

        server.login(smtp_user, smtp_pass)
        server.send_message(msg)
        server.quit()

        logger.info(f"Email sent successfully to {to_email}")
        return True
    except Exception as e:
        logger.error(f"Failed to send email: {str(e)}")
        return False

def format_contact_email(data: ContactRequest, callback_id: int = None) -> str:
    """Format contact form data into HTML email"""
    now = datetime.now().strftime("%d.%m.%Y %H:%M")
    crm_url = os.getenv('SITE_URL', 'https://promarkirui.ru')
    callback_link = f"{crm_url}/employee/inbox" if callback_id else ""

    return f"""
    <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <div style="background: linear-gradient(135deg, #FFDA07 0%, #F5C300 100%); padding: 20px; border-radius: 12px 12px 0 0;">
                <h2 style="margin: 0; color: #000;">Заявка #{callback_id or 'N/A'} на {data.request_type}</h2>
            </div>
            <div style="background: #fff; padding: 20px; border: 1px solid #eee; border-top: none;">
                <table style="border-collapse: collapse; width: 100%; max-width: 600px;">
                    <tr>
                        <td style="padding: 12px; background-color: #f8f9fa; font-weight: bold; width: 150px;">Имя:</td>
                        <td style="padding: 12px; font-size: 16px;">{data.name}</td>
                    </tr>
                    <tr>
                        <td style="padding: 12px; background-color: #f8f9fa; font-weight: bold;">Телефон:</td>
                        <td style="padding: 12px; font-size: 16px;"><a href="tel:{data.phone}" style="color: #1E3A8A;">{data.phone}</a></td>
                    </tr>
                    <tr>
                        <td style="padding: 12px; background-color: #f8f9fa; font-weight: bold;">Email:</td>
                        <td style="padding: 12px;">{f'<a href="mailto:{data.email}" style="color: #1E3A8A;">{data.email}</a>' if data.email else 'Не указан'}</td>
                    </tr>
                    <tr>
                        <td style="padding: 12px; background-color: #f8f9fa; font-weight: bold;">Тип запроса:</td>
                        <td style="padding: 12px;">{data.request_type}</td>
                    </tr>
                    <tr>
                        <td style="padding: 12px; background-color: #f8f9fa; font-weight: bold;">Комментарий:</td>
                        <td style="padding: 12px;">{data.comment or 'Не указан'}</td>
                    </tr>
                </table>
                <p style="margin-top: 20px; color: #666; font-size: 12px;">
                    Отправлено: {now}<br>
                    С согласием на обработку персональных данных
                </p>
            </div>
            <div style="background: #f8f9fa; padding: 15px; border-radius: 0 0 12px 12px; text-align: center; border: 1px solid #e5e7eb; border-top: none;">
                <a href="{callback_link}" style="display: inline-block; background: #FFDA07; color: #000; text-decoration: none; padding: 10px 20px; border-radius: 8px; font-weight: bold;">Открыть в CRM</a>
            </div>
        </body>
    </html>
    """

# ======================== API ENDPOINTS ========================

@app.get("/api/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "ok", "service": "promarkirui", "products_count": len(PRODUCTS_LOOKUP)}

@app.get("/api/check/categories")
async def get_categories():
    """Get all product categories and subcategories"""
    return {"groups": CATEGORIES_DATA}

@app.get("/api/check/init")
async def get_check_init():
    """Unified endpoint for initial page load - returns categories, stats, timeline in one request"""
    timeline_stats = get_timeline_stats_with_upcoming()

    return {
        "groups": CATEGORIES_DATA,
        "tnved_stats": get_tnved_stats_cached(),
        "timeline_stats": timeline_stats
    }

@app.post("/api/check/assess", response_model=CheckProductResponse)
async def assess_product(request: CheckProductRequest):
    """Assess if product requires marking"""

    # Look up product by product ID first, then by subcategory
    product = None
    if request.product:
        product = PRODUCTS_LOOKUP.get(request.product)

    if product:
        marking_status = product.get("marking_status", "not_required")
        is_mandatory = marking_status == "mandatory"
        is_experiment = marking_status == "experiment"
        timeline = product.get("timeline")
        mandatory_since = product.get("mandatory_since")

        if is_mandatory:
            # Format deadline from timeline
            deadline = f"с {timeline['start_date']}" if timeline else "Действует"

            return CheckProductResponse(
                requires_marking=True,
                category=request.category,
                subcategory=request.subcategory,
                subcategory_name=product["name"],
                tnved=product["tnved"],
                status="mandatory",
                deadline=deadline,
                mandatory_since=mandatory_since,
                timeline=timeline,
                steps=timeline.get("current_requirements", MARKING_STEPS) if timeline else MARKING_STEPS,
                message=f"Товар «{product['name']}» подлежит обязательной маркировке. Код ТН ВЭД: {product['tnved']}"
            )
        elif is_experiment:
            return CheckProductResponse(
                requires_marking=False,
                category=request.category,
                subcategory=request.subcategory,
                subcategory_name=product["name"],
                tnved=product["tnved"],
                status="experiment",
                deadline="Эксперимент",
                mandatory_since=None,
                timeline=timeline,
                steps=EXPERIMENT_STEPS,
                message=f"Товар «{product['name']}» участвует в эксперименте по маркировке. Код ТН ВЭД: {product['tnved']}. Обязательная маркировка пока не введена."
            )

    return CheckProductResponse(
        requires_marking=False,
        category=request.category,
        subcategory=request.subcategory,
        tnved=None,
        status=None,
        deadline=None,
        mandatory_since=None,
        timeline=None,
        steps=[],
        message="Информация о данном товаре не найдена в базе. Рекомендуем уточнить на сайте честныйзнак.рф"
    )

@app.get("/api/import/countries")
async def get_countries():
    """Get list of countries for import"""
    return {"countries": COUNTRIES}

@app.get("/api/import/categories")
async def get_import_categories():
    """Get categories for import (reuse check categories)"""
    return {"groups": CATEGORIES_DATA}

@app.get("/api/import/schemes")
async def get_import_schemes(country: str, category: str):
    """Get import schemes for selected country and category"""
    return {"schemes": IMPORT_SCHEMES}

@app.post("/api/equipment/recommend", response_model=EquipmentResponse)
async def recommend_equipment(request: EquipmentRequest):
    """Recommend equipment based on facility type and volume"""

    items = []
    total_min = 0
    total_max = 0

    for eq_id, eq_data in EQUIPMENT_DATABASE.items():
        has_it = eq_id in request.has_equipment
        status = "has" if has_it else "needed"

        items.append(EquipmentItem(
            name=eq_data["name"],
            purpose=eq_data["purpose"],
            price_min=eq_data["price_min"],
            price_max=eq_data["price_max"],
            status=status
        ))

        if not has_it:
            total_min += eq_data["price_min"]
            total_max += eq_data["price_max"]

    return EquipmentResponse(
        items=items,
        budget_min=total_min,
        budget_max=total_max
    )

@app.post("/api/contact/send")
async def send_contact(request: ContactRequest, background_tasks: BackgroundTasks):
    """Send contact form to email and save to database"""

    # Сохраняем заявку в БД
    callback_data = {
        "user_id": None,
        "contact_name": request.name,
        "contact_phone": request.phone,
        "contact_email": request.email,
        "company_inn": None,
        "company_name": None,
        "products": [],
        "comment": f"Тип запроса: {request.request_type}\n{request.comment or ''}",
        "source": "contact_form"
    }
    callback_id = CallbackDB.create(callback_data)

    # Отправляем на все адреса менеджеров
    contact_emails = os.getenv('CONTACT_TO_EMAIL', 'damirslk@mail.ru,turbin.ar8@gmail.com').split(',')
    subject = f"Заявка #{callback_id} на {request.request_type} от {request.name}"
    body = format_contact_email(request, callback_id)

    # Send email to all managers in background
    for email in contact_emails:
        background_tasks.add_task(send_email, email.strip(), subject, body)

    return {
        "status": "success",
        "message": "Ваша заявка принята! Мы свяжемся с вами в ближайшее время.",
        "callback_id": callback_id
    }


# ======================== TRAINING ENROLLMENT ========================

def format_training_enrollment_email(request: TrainingEnrollRequest, enrollment_id: int) -> str:
    """Форматирование email для заявки на обучение"""
    plan_info = ""
    if request.plan_name:
        plan_info = f"""
        <tr>
            <td style="padding: 8px 16px; border-bottom: 1px solid #e5e7eb; color: #6b7280;">Тариф:</td>
            <td style="padding: 8px 16px; border-bottom: 1px solid #e5e7eb; font-weight: 500;">{request.plan_name}</td>
        </tr>
        """
    if request.plan_price:
        plan_info += f"""
        <tr>
            <td style="padding: 8px 16px; border-bottom: 1px solid #e5e7eb; color: #6b7280;">Стоимость:</td>
            <td style="padding: 8px 16px; border-bottom: 1px solid #e5e7eb; font-weight: 500;">{request.plan_price} ₽</td>
        </tr>
        """

    return f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f3f4f6; padding: 20px;">
        <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
            <!-- Header -->
            <div style="background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%); padding: 24px; text-align: center;">
                <h1 style="margin: 0; color: white; font-size: 24px;">🎓 Заявка на обучение #{enrollment_id}</h1>
            </div>

            <!-- Content -->
            <div style="padding: 24px;">
                <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                        <td style="padding: 8px 16px; border-bottom: 1px solid #e5e7eb; color: #6b7280;">Имя:</td>
                        <td style="padding: 8px 16px; border-bottom: 1px solid #e5e7eb; font-weight: 500;">{request.name}</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px 16px; border-bottom: 1px solid #e5e7eb; color: #6b7280;">Телефон:</td>
                        <td style="padding: 8px 16px; border-bottom: 1px solid #e5e7eb; font-weight: 500;">
                            <a href="tel:{request.phone}" style="color: #7c3aed;">{request.phone}</a>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding: 8px 16px; border-bottom: 1px solid #e5e7eb; color: #6b7280;">Email:</td>
                        <td style="padding: 8px 16px; border-bottom: 1px solid #e5e7eb; font-weight: 500;">
                            <a href="mailto:{request.email or '-'}" style="color: #7c3aed;">{request.email or '-'}</a>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding: 8px 16px; border-bottom: 1px solid #e5e7eb; color: #6b7280;">Компания:</td>
                        <td style="padding: 8px 16px; border-bottom: 1px solid #e5e7eb; font-weight: 500;">{request.company or '-'}</td>
                    </tr>
                    {plan_info}
                    <tr>
                        <td style="padding: 8px 16px; border-bottom: 1px solid #e5e7eb; color: #6b7280;">Комментарий:</td>
                        <td style="padding: 8px 16px; border-bottom: 1px solid #e5e7eb;">{request.comment or '-'}</td>
                    </tr>
                </table>
            </div>

            <!-- Footer -->
            <div style="background-color: #f9fafb; padding: 16px 24px; text-align: center;">
                <p style="margin: 0; color: #6b7280; font-size: 14px;">
                    Заявка создана: {datetime.now().strftime('%d.%m.%Y %H:%M')}
                </p>
            </div>
        </div>
    </body>
    </html>
    """


@app.post("/api/training/enroll")
async def training_enroll(request: TrainingEnrollRequest, background_tasks: BackgroundTasks):
    """Отправка заявки на обучение"""

    if not request.name or not request.phone:
        raise HTTPException(status_code=400, detail="Имя и телефон обязательны")

    # Сохраняем заявку в БД как callback
    plan_info = ""
    if request.plan_name:
        plan_info = f"Тариф: {request.plan_name}"
    if request.plan_price:
        plan_info += f" ({request.plan_price} ₽)"

    callback_data = {
        "user_id": None,
        "contact_name": request.name,
        "contact_phone": request.phone,
        "contact_email": request.email,
        "company_inn": None,
        "company_name": request.company,
        "products": [],
        "comment": f"🎓 ЗАЯВКА НА ОБУЧЕНИЕ\n{plan_info}\n\n{request.comment or ''}".strip(),
        "source": "training_enrollment"
    }
    enrollment_id = CallbackDB.create(callback_data)

    # Отправляем на все адреса менеджеров
    contact_emails = os.getenv('CONTACT_TO_EMAIL', 'damirslk@mail.ru,turbin.ar8@gmail.com').split(',')
    subject = f"🎓 Заявка на обучение #{enrollment_id} от {request.name}"
    if request.plan_name:
        subject += f" - {request.plan_name}"
    body = format_training_enrollment_email(request, enrollment_id)

    # Send email to all managers in background
    for email in contact_emails:
        background_tasks.add_task(send_email, email.strip(), subject, body)

    logger.info(f"Training enrollment #{enrollment_id} received from {request.name}, plan: {request.plan_name}")

    return {
        "status": "success",
        "message": "Заявка на обучение принята! Мы свяжемся с вами в ближайшее время.",
        "enrollment_id": enrollment_id
    }


# ======================== DADATA COMPANY LOOKUP ========================

DADATA_API_KEY = os.getenv('DADATA_API_KEY', '')
DADATA_SECRET_KEY = os.getenv('DADATA_SECRET_KEY', '')

@app.post("/api/company/suggest")
async def suggest_company(request: INNLookupRequest):
    """
    Поиск компании по ИНН или ОГРН через DaData Suggestions API.
    Возвращает до 10 подсказок с реквизитами для договора и счёта.
    Работает как автокомплит - начинает искать с 3 символов.
    """
    query = request.inn.strip()

    if not query:
        raise HTTPException(status_code=400, detail="ИНН или ОГРН не указан")

    # Минимум 3 символа для поиска
    if len(query) < 3:
        return {"suggestions": []}

    # Если DaData не настроена, возвращаем тестовые данные
    if not DADATA_API_KEY:
        logger.warning("DaData API key not configured, returning mock data")
        # Генерируем тестовые подсказки на основе введённого запроса
        mock_suggestions = []
        base_inns = [
            ("7707083893", "ПАО Сбербанк", "117997, г Москва, ул Вавилова, д 19"),
            ("7736050003", "ПАО Газпром", "117997, г Москва, ул Наметкина, д 16"),
            ("7703399903", "ООО Яндекс", "119021, г Москва, ул Льва Толстого, д 16"),
            ("7710140679", "ПАО Ростелеком", "191167, г Санкт-Петербург, наб Синопская, д 14"),
            ("7702070139", "ПАО МТС", "109147, г Москва, ул Марксистская, д 4"),
            ("7743013902", "ПАО Магнит", "350072, г Краснодар, ул Солнечная, д 15/5"),
            ("7825706086", "ООО Лента", "197374, г Санкт-Петербург, ул Савушкина, д 112"),
            ("7714617793", "ООО Озон", "123112, г Москва, Пресненская наб, д 10"),
            ("7704340310", "ООО Вайлдберриз", "142181, Московская обл, г Подольск"),
            ("5047228659", "ООО Мегамаркет", "140000, Московская обл, г Люберцы"),
        ]

        for inn, name, address in base_inns:
            if query in inn or query.lower() in name.lower():
                mock_suggestions.append({
                    "inn": inn,
                    "kpp": inn[:4] + "01001" if len(inn) == 10 else None,
                    "ogrn": "102" + inn + "95"[:13-len(inn)] if len(inn) == 10 else "30" + inn,
                    "name": name,
                    "name_short": name,
                    "name_full": name,
                    "opf": name.split()[0],
                    "type": "LEGAL" if len(inn) == 10 else "INDIVIDUAL",
                    "address": address,
                    "management_name": "Иванов Иван Иванович",
                    "management_post": "Генеральный директор",
                    "status": "ACTIVE"
                })
                if len(mock_suggestions) >= 10:
                    break

        # Если ничего не нашли, добавляем тестовую компанию
        if not mock_suggestions:
            mock_suggestions.append({
                "inn": query + "0" * (10 - len(query)) if len(query) < 10 else query[:10],
                "kpp": "770701001",
                "ogrn": "1027700132195",
                "name": f"ООО «Компания {query}»",
                "name_short": f"ООО «Компания {query}»",
                "name_full": f"Общество с ограниченной ответственностью «Компания {query}»",
                "opf": "ООО",
                "type": "LEGAL",
                "address": "123456, г. Москва, ул. Тестовая, д. 1",
                "management_name": "Иванов Иван Иванович",
                "management_post": "Генеральный директор",
                "status": "ACTIVE"
            })

        return {"suggestions": mock_suggestions}

    try:
        async with httpx.AsyncClient() as client:
            # Используем Suggestions API (автокомплит), а не findById
            response = await client.post(
                "https://suggestions.dadata.ru/suggestions/api/4_1/rs/suggest/party",
                headers={
                    "Content-Type": "application/json",
                    "Accept": "application/json",
                    "Authorization": f"Token {DADATA_API_KEY}"
                },
                json={
                    "query": query,
                    "count": 10,
                    "status": ["ACTIVE"]  # Только действующие компании
                },
                timeout=10.0
            )

            if response.status_code != 200:
                logger.error(f"DaData error: {response.status_code} - {response.text}")
                raise HTTPException(status_code=502, detail="Ошибка сервиса DaData")

            data = response.json()
            suggestions = []

            for item in data.get("suggestions", []):
                d = item.get("data") or {}
                name_data = d.get("name") or {}
                address_data = d.get("address") or {}
                management = d.get("management") or {}
                state = d.get("state") or {}
                opf = d.get("opf") or {}

                suggestion = {
                    "inn": d.get("inn"),
                    "kpp": d.get("kpp"),
                    "ogrn": d.get("ogrn"),
                    "name": item.get("value"),
                    "name_short": name_data.get("short_with_opf"),
                    "name_full": name_data.get("full_with_opf"),
                    "opf": opf.get("short"),
                    "type": d.get("type"),  # LEGAL или INDIVIDUAL
                    "address": (address_data.get("unrestricted_value") or address_data.get("value")) if address_data else None,
                    "management_name": management.get("name") if management else None,
                    "management_post": management.get("post") if management else None,
                    "status": state.get("status") if state else None  # ACTIVE, LIQUIDATED, etc.
                }
                suggestions.append(suggestion)

            return {"suggestions": suggestions}

    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="Сервис DaData не отвечает")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"DaData lookup error: {str(e)}")
        raise HTTPException(status_code=500, detail="Ошибка при поиске компании")

# ======================== QUOTE (КП) ENDPOINTS ========================

@app.get("/api/services/list")
async def get_services_list():
    """Получить прайс-лист услуг"""
    return {
        "services": SERVICES_PRICELIST,
        "categories": SERVICE_CATEGORIES
    }

@app.post("/api/quote/create")
async def create_quote(request: QuoteRequest, background_tasks: BackgroundTasks):
    """
    Создать коммерческое предложение.
    Рассчитывает итоговую сумму и отправляет КП на email.
    """
    from datetime import datetime, timedelta

    # Генерируем номер КП
    quote_id = f"КП-{datetime.now().strftime('%Y%m%d')}-{uuid.uuid4().hex[:6].upper()}"

    # Рассчитываем итог по услугам
    services_breakdown = []
    total_amount = 0

    for service in request.services:
        subtotal = service.price * service.quantity
        total_amount += subtotal
        services_breakdown.append({
            "id": service.id,
            "name": service.name,
            "price": service.price,
            "quantity": service.quantity,
            "unit": service.unit,
            "subtotal": subtotal
        })

    # Дата создания и срок действия
    created_at = datetime.now()
    valid_until = created_at + timedelta(days=14)  # КП действует 14 дней

    quote_data = {
        "quote_id": quote_id,
        "company": request.company.dict(),
        "products": [p.dict() for p in request.products],
        "services_breakdown": services_breakdown,
        "total_amount": total_amount,
        "contact": {
            "name": request.contact_name,
            "phone": request.contact_phone,
            "email": request.contact_email
        },
        "created_at": created_at.isoformat(),
        "valid_until": valid_until.strftime("%d.%m.%Y")
    }

    # Отправляем КП на email в фоне
    if request.contact_email:
        email_body = format_quote_email(quote_data)
        background_tasks.add_task(
            send_email,
            request.contact_email,
            f"Коммерческое предложение {quote_id} от Про.Маркируй",
            email_body
        )

    # Отправляем уведомление всем менеджерам
    manager_emails = os.getenv('CONTACT_TO_EMAIL', 'damirslk@mail.ru,turbin.ar8@gmail.com').split(',')
    manager_body = format_quote_notification(quote_data)
    for email in manager_emails:
        background_tasks.add_task(
            send_email,
            email.strip(),
            f"Заявка на КП: {quote_id} от {request.company.name}",
            manager_body
        )

    return {
        "status": "success",
        "quote_id": quote_id,
        "company_name": request.company.name,
        "total_amount": total_amount,
        "services_breakdown": services_breakdown,
        "created_at": created_at.strftime("%d.%m.%Y %H:%M"),
        "valid_until": valid_until.strftime("%d.%m.%Y"),
        "message": "КП успешно сформировано!"
    }

def format_quote_email(quote_data: dict) -> str:
    """Форматирует КП для отправки клиенту"""
    services_rows = ""
    for idx, s in enumerate(quote_data["services_breakdown"], 1):
        services_rows += f"""
        <tr>
            <td style="padding: 12px; border-bottom: 1px solid #eee;">{idx}</td>
            <td style="padding: 12px; border-bottom: 1px solid #eee;">{s['name']}</td>
            <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: center;">{s['quantity']} {s['unit']}</td>
            <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: right;">{s['price']:,} ₽</td>
            <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: right; font-weight: bold;">{s['subtotal']:,} ₽</td>
        </tr>
        """

    company = quote_data["company"]

    return f"""
    <html>
    <body style="font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 800px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #FFDA07 0%, #F5C300 100%); padding: 30px; border-radius: 16px 16px 0 0;">
            <h1 style="margin: 0; color: #000; font-size: 28px;">Коммерческое предложение</h1>
            <p style="margin: 10px 0 0; color: #333; font-size: 16px;">№ {quote_data['quote_id']}</p>
        </div>

        <div style="background: #fff; padding: 30px; border: 1px solid #eee; border-top: none;">
            <div style="background: #f8f9fa; padding: 20px; border-radius: 12px; margin-bottom: 30px;">
                <h3 style="margin: 0 0 15px; color: #333;">Реквизиты заказчика</h3>
                <table style="width: 100%;">
                    <tr>
                        <td style="padding: 5px 0; color: #666; width: 150px;">Компания:</td>
                        <td style="padding: 5px 0; font-weight: 600;">{company['name']}</td>
                    </tr>
                    <tr>
                        <td style="padding: 5px 0; color: #666;">ИНН:</td>
                        <td style="padding: 5px 0;">{company['inn']}</td>
                    </tr>
                    {'<tr><td style="padding: 5px 0; color: #666;">КПП:</td><td style="padding: 5px 0;">' + company.get('kpp', '') + '</td></tr>' if company.get('kpp') else ''}
                    <tr>
                        <td style="padding: 5px 0; color: #666;">Адрес:</td>
                        <td style="padding: 5px 0;">{company.get('address', '—')}</td>
                    </tr>
                </table>
            </div>

            <h3 style="color: #333; margin-bottom: 15px;">Состав услуг</h3>
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
                <thead>
                    <tr style="background: #f8f9fa;">
                        <th style="padding: 12px; text-align: left; border-bottom: 2px solid #FFDA07;">№</th>
                        <th style="padding: 12px; text-align: left; border-bottom: 2px solid #FFDA07;">Наименование</th>
                        <th style="padding: 12px; text-align: center; border-bottom: 2px solid #FFDA07;">Кол-во</th>
                        <th style="padding: 12px; text-align: right; border-bottom: 2px solid #FFDA07;">Цена</th>
                        <th style="padding: 12px; text-align: right; border-bottom: 2px solid #FFDA07;">Сумма</th>
                    </tr>
                </thead>
                <tbody>
                    {services_rows}
                </tbody>
                <tfoot>
                    <tr style="background: linear-gradient(135deg, #FFDA07 0%, #F5C300 100%);">
                        <td colspan="4" style="padding: 15px; font-weight: bold; font-size: 18px;">ИТОГО:</td>
                        <td style="padding: 15px; text-align: right; font-weight: bold; font-size: 18px;">{quote_data['total_amount']:,} ₽</td>
                    </tr>
                </tfoot>
            </table>

            <div style="background: #fff3cd; padding: 15px; border-radius: 8px; border-left: 4px solid #FFDA07; margin-bottom: 20px;">
                <strong>Предложение действительно до:</strong> {quote_data['valid_until']}
            </div>

            <div style="text-align: center; padding: 20px;">
                <a href="https://promarkirui.ru/contact" style="display: inline-block; background: linear-gradient(135deg, #FFDA07 0%, #F5C300 100%); color: #000; padding: 15px 40px; border-radius: 12px; text-decoration: none; font-weight: bold; font-size: 16px;">
                    Оформить заказ
                </a>
            </div>
        </div>

        <div style="background: #1f2937; padding: 20px; border-radius: 0 0 16px 16px; text-align: center;">
            <p style="margin: 0; color: #9ca3af; font-size: 14px;">
                Про.Маркируй — сервис подключения к системе маркировки Честный ЗНАК<br>
                <a href="https://promarkirui.ru" style="color: #FFDA07;">promarkirui.ru</a> | info@promarkirui.ru
            </p>
        </div>
    </body>
    </html>
    """

def format_quote_notification(quote_data: dict) -> str:
    """Форматирует уведомление о новом КП для менеджера"""
    company = quote_data["company"]
    contact = quote_data["contact"]

    services_list = ""
    for s in quote_data["services_breakdown"]:
        services_list += f"• {s['name']} × {s['quantity']} = {s['subtotal']:,} ₽\n"

    return f"""
    <html>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <h2 style="color: #1E3A8A;">🎯 Новая заявка на КП #{quote_data['quote_id']}</h2>

        <h3>Компания:</h3>
        <ul>
            <li><strong>{company['name']}</strong></li>
            <li>ИНН: {company['inn']}</li>
            <li>Адрес: {company.get('address', '—')}</li>
        </ul>

        <h3>Контактное лицо:</h3>
        <ul>
            <li>Имя: {contact['name']}</li>
            <li>Телефон: <a href="tel:{contact['phone']}">{contact['phone']}</a></li>
            <li>Email: {contact.get('email', '—')}</li>
        </ul>

        <h3>Услуги:</h3>
        <pre style="background: #f5f5f5; padding: 15px; border-radius: 8px;">{services_list}</pre>

        <h2 style="color: #059669;">💰 Итого: {quote_data['total_amount']:,} ₽</h2>

        <p style="color: #666; font-size: 12px;">
            Создано: {quote_data['created_at']}<br>
            Действует до: {quote_data['valid_until']}
        </p>
    </body>
    </html>
    """

# ======================== AI CHAT (OpenAI ChatKit) ========================

# ChatKit workflow ID with configured prompt and vector database
CHATKIT_WORKFLOW_ID = os.getenv('CHATKIT_WORKFLOW_ID', 'wf_69333a7229648190a17d2a1519d676ec078aefd89b4f760e')

class ChatMessage(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    messages: List[ChatMessage]

class ChatKitSessionRequest(BaseModel):
    user_id: Optional[str] = None

@app.post("/api/chatkit/session")
async def create_chatkit_session(request: ChatKitSessionRequest = None):
    """Create a new ChatKit session and return client_secret for frontend"""
    openai_api_key = os.getenv('OPENAI_API_KEY')

    if not openai_api_key:
        raise HTTPException(status_code=500, detail="OpenAI API key not configured")

    try:
        # Generate a unique user ID if not provided
        user_id = request.user_id if request and request.user_id else str(uuid.uuid4())

        async with httpx.AsyncClient() as client:
            # Create ChatKit session using the official API
            response = await client.post(
                "https://api.openai.com/v1/chatkit/sessions",
                headers={
                    "Content-Type": "application/json",
                    "Authorization": f"Bearer {openai_api_key}",
                    "OpenAI-Beta": "chatkit_beta=v1"
                },
                json={
                    "workflow": {"id": CHATKIT_WORKFLOW_ID},
                    "user": user_id
                },
                timeout=30.0
            )

            if response.status_code != 200:
                logger.error(f"ChatKit session error: {response.status_code} - {response.text}")
                raise HTTPException(status_code=500, detail="Failed to create ChatKit session")

            data = response.json()
            client_secret = data.get("client_secret")

            return {
                "client_secret": client_secret,
                "workflow_id": CHATKIT_WORKFLOW_ID,
                "user_id": user_id
            }

    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="Service timeout")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"ChatKit session error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to create ChatKit session")

@app.post("/api/chatkit/refresh")
async def refresh_chatkit_session(current_client_secret: str = None):
    """Refresh an existing ChatKit session"""
    openai_api_key = os.getenv('OPENAI_API_KEY')

    if not openai_api_key:
        raise HTTPException(status_code=500, detail="OpenAI API key not configured")

    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                "https://api.openai.com/v1/chatkit/sessions/refresh",
                headers={
                    "Content-Type": "application/json",
                    "Authorization": f"Bearer {openai_api_key}",
                    "OpenAI-Beta": "chatkit_beta=v1"
                },
                json={
                    "client_secret": current_client_secret
                },
                timeout=30.0
            )

            if response.status_code != 200:
                logger.error(f"ChatKit refresh error: {response.status_code} - {response.text}")
                # If refresh fails, create a new session
                return await create_chatkit_session()

            data = response.json()
            return {"client_secret": data.get("client_secret")}

    except Exception as e:
        logger.error(f"ChatKit refresh error: {str(e)}")
        return await create_chatkit_session()

# Keep the fallback chat endpoint for non-ChatKit usage
@app.post("/api/ai/chat")
async def ai_chat(request: ChatRequest):
    """Fallback AI chat endpoint using OpenAI Chat Completions API"""
    openai_api_key = os.getenv('OPENAI_API_KEY')

    if not openai_api_key:
        raise HTTPException(status_code=500, detail="OpenAI API key not configured")

    FALLBACK_PROMPT = """Ты — эксперт-консультант Алекс по маркировке товаров в системе «Честный ЗНАК» из сервиса ПроМаркируй.
Отвечай коротко (2-4 предложения), дружелюбно. Помогай с вопросами о маркировке товаров.
На любые нетематические вопросы отвечай: «Я консультант по маркировке. По этому вопросу помочь не смогу.»
Предлагай помощь на promarkirui.ru/check"""

    try:
        messages = [{"role": "system", "content": FALLBACK_PROMPT}]
        for msg in request.messages[-10:]:
            messages.append({"role": msg.role, "content": msg.content})

        async with httpx.AsyncClient() as client:
            response = await client.post(
                "https://api.openai.com/v1/chat/completions",
                headers={
                    "Content-Type": "application/json",
                    "Authorization": f"Bearer {openai_api_key}"
                },
                json={
                    "model": "gpt-4o-mini",
                    "messages": messages,
                    "max_tokens": 1000,
                    "temperature": 0.7
                },
                timeout=60.0
            )

            if response.status_code != 200:
                logger.error(f"OpenAI error: {response.status_code} - {response.text}")
                raise HTTPException(status_code=500, detail="AI service error")

            data = response.json()
            return {"response": data["choices"][0]["message"]["content"]}

    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="AI service timeout")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"AI chat error: {str(e)}")
        raise HTTPException(status_code=500, detail="AI service error")

# ======================== ГЕНЕРАЦИЯ ДОКУМЕНТОВ ========================

class ContractGenerateRequest(BaseModel):
    """Запрос на генерацию договора"""
    company: CompanyInfo
    services: List[QuoteService]
    contact_name: str
    contact_phone: str
    contact_email: Optional[str] = None


@app.post("/api/contract/generate")
async def generate_contract(request: ContractGenerateRequest):
    """
    Генерирует PDF договора.
    Возвращает PDF файл для скачивания.
    """
    try:
        # Подготавливаем данные клиента
        client_info = {
            "name": request.company.name,
            "name_short": request.company.name_short or request.company.name,
            "inn": request.company.inn,
            "kpp": request.company.kpp or "",
            "ogrn": request.company.ogrn or "",
            "address": request.company.address or "",
            "manager_name": request.company.management_name or request.contact_name,
            "manager_post": request.company.management_post or "Директор",
            "basis": "Устава" if request.company.type == "LEGAL" else "ОГРНИП",
        }

        # Подготавливаем услуги
        services_list = []
        total_amount = 0
        for s in request.services:
            subtotal = s.price * s.quantity
            total_amount += subtotal
            services_list.append({
                "name": s.name,
                "quantity": s.quantity,
                "unit": s.unit,
                "price": s.price,
                "subtotal": subtotal
            })

        # Генерируем PDF
        pdf_bytes = generate_contract_pdf(
            client_info=client_info,
            services=services_list,
            total_amount=total_amount
        )

        # Формируем имя файла (URL-кодируем для заголовка)
        contract_date = datetime.now()
        contract_number = f"DOG-{contract_date.strftime('%d%m%y')}-001"
        filename = f"Contract_{contract_number}_{request.company.inn}.pdf"
        filename_encoded = url_quote(filename)

        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={
                "Content-Disposition": f"attachment; filename=\"{filename}\"; filename*=UTF-8''{filename_encoded}"
            }
        )

    except Exception as e:
        logger.error(f"Contract generation error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Ошибка генерации договора: {str(e)}")


class QuotePDFRequest(BaseModel):
    """Запрос на генерацию PDF коммерческого предложения"""
    quote_id: str
    company: CompanyInfo
    services: List[QuoteService]
    contact_name: str
    contact_phone: str
    contact_email: Optional[str] = None
    valid_until: Optional[str] = None


@app.post("/api/quote/pdf")
async def generate_quote_pdf_endpoint(request: QuotePDFRequest):
    """
    Генерирует PDF коммерческого предложения.
    Возвращает PDF файл для скачивания.
    """
    try:
        # Подготавливаем данные клиента
        client_info = {
            "name": request.company.name,
            "name_short": request.company.name_short or request.company.name,
            "inn": request.company.inn,
            "kpp": request.company.kpp or "",
            "address": request.company.address or "",
        }

        # Подготавливаем контактные данные
        contact_info = {
            "name": request.contact_name,
            "phone": request.contact_phone,
            "email": request.contact_email or "",
        }

        # Подготавливаем услуги
        services_list = []
        total_amount = 0
        for s in request.services:
            subtotal = s.price * s.quantity
            total_amount += subtotal
            services_list.append({
                "name": s.name,
                "quantity": s.quantity,
                "unit": s.unit,
                "price": s.price,
                "subtotal": subtotal
            })

        # Генерируем PDF
        pdf_bytes = generate_quote_pdf(
            client_info=client_info,
            services=services_list,
            total_amount=total_amount,
            quote_id=request.quote_id,
            contact_info=contact_info,
            valid_until=request.valid_until
        )

        # Формируем имя файла (URL-кодируем для поддержки кириллицы)
        from urllib.parse import quote
        filename = f"KP_{request.quote_id}_{request.company.inn}.pdf"
        filename_encoded = quote(filename, safe='')

        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={
                "Content-Disposition": f"attachment; filename*=UTF-8''{filename_encoded}"
            }
        )

    except Exception as e:
        logger.error(f"Quote PDF generation error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Ошибка генерации КП: {str(e)}")


class ActGenerateRequest(BaseModel):
    """Запрос на генерацию акта выполненных работ"""
    contract_number: str
    contract_date: str  # ISO format date string
    company: CompanyInfo
    services: List[QuoteService]
    contact_name: str


@app.post("/api/act/generate")
async def generate_act(request: ActGenerateRequest):
    """
    Генерирует PDF акта выполненных работ.
    Возвращает PDF файл для скачивания.
    """
    try:
        # Подготавливаем данные клиента
        client_info = {
            "name": request.company.name,
            "name_short": request.company.name_short or request.company.name,
            "inn": request.company.inn,
            "kpp": request.company.kpp or "",
            "ogrn": request.company.ogrn or "",
            "address": request.company.address or "",
            "management_name": request.company.management_name or request.contact_name,
            "management_post": request.company.management_post or "Директор",
        }

        # Подготавливаем услуги
        services_list = []
        total_amount = 0
        for s in request.services:
            subtotal = s.price * s.quantity
            total_amount += subtotal
            services_list.append({
                "name": s.name,
                "quantity": s.quantity,
                "unit": s.unit,
                "price": s.price,
                "subtotal": subtotal
            })

        # Парсим дату договора
        contract_date = datetime.fromisoformat(request.contract_date.replace('Z', '+00:00'))

        # Генерируем PDF
        pdf_bytes = generate_act_pdf(
            client_info=client_info,
            services=services_list,
            total_amount=total_amount,
            contract_number=request.contract_number,
            contract_date=contract_date
        )

        # Формируем имя файла
        act_number = request.contract_number.replace("ДОГ", "АКТ").replace("DOG", "ACT")
        filename = f"Act_{act_number}_{request.company.inn}.pdf"
        filename_encoded = url_quote(filename)

        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={
                "Content-Disposition": f"attachment; filename=\"{filename}\"; filename*=UTF-8''{filename_encoded}"
            }
        )

    except Exception as e:
        logger.error(f"Act generation error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Ошибка генерации акта: {str(e)}")


# ======================== АВТОРИЗАЦИЯ ========================

@app.post("/api/auth/register")
async def api_register(data: UserRegister):
    """Регистрация нового пользователя"""
    return register_user(data.email, data.password, name=data.name, phone=data.phone, inn=data.inn,
                         company_name=data.company_name, city=data.city, region=data.region, source=data.source)


@app.post("/api/auth/login")
async def api_login(data: UserLogin):
    """Вход в систему"""
    return login_user(data.email, data.password)


@app.get("/api/auth/me")
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


@app.get("/api/auth/verify-email")
async def api_verify_email(token: str):
    """Подтверждение email по токену из письма"""
    from auth import verify_email
    return verify_email(token)


@app.post("/api/auth/resend-verification")
async def api_resend_verification(user: Dict = Depends(require_auth)):
    """Повторная отправка письма подтверждения"""
    from auth import resend_verification_email
    return resend_verification_email(user["id"], user["email"])


class ForgotPasswordRequest(BaseModel):
    email: str


class ResetPasswordRequest(BaseModel):
    token: str
    password: str


@app.post("/api/auth/forgot-password")
async def api_forgot_password(data: ForgotPasswordRequest):
    """Запрос на сброс пароля - отправляет письмо с ссылкой"""
    from database import UserDB, PasswordResetDB
    from email_service import generate_verification_token, send_password_reset_email

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


@app.get("/api/auth/verify-reset-token")
async def api_verify_reset_token(token: str):
    """Проверка токена сброса пароля (для валидации перед показом формы)"""
    from database import PasswordResetDB

    token_data = PasswordResetDB.verify_token(token)

    if not token_data:
        raise HTTPException(
            status_code=400,
            detail="Недействительная или истёкшая ссылка сброса пароля"
        )

    return {"valid": True, "email": token_data['email']}


@app.post("/api/auth/reset-password")
async def api_reset_password(data: ResetPasswordRequest):
    """Установка нового пароля по токену"""
    from database import PasswordResetDB

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


# ======================== ЛИЧНЫЙ КАБИНЕТ ========================

@app.get("/api/cabinet/quotes")
async def api_get_user_quotes(user: Dict = Depends(require_auth)):
    """Получить все КП пользователя"""
    quotes = QuoteDB.get_by_user(user["id"])
    return {"quotes": quotes}


@app.get("/api/cabinet/contracts")
async def api_get_user_contracts(user: Dict = Depends(require_auth)):
    """Получить все договоры пользователя"""
    contracts = ContractDB.get_by_user(user["id"])
    return {"contracts": contracts}


@app.get("/api/cabinet/companies")
async def api_get_user_companies(user: Dict = Depends(require_auth)):
    """Получить все компании пользователя"""
    companies = CompanyDB.get_by_user(user["id"])
    return {"companies": companies}


# ======================== ЗАЯВКИ НА ЗВОНОК ========================

class CallbackRequest(BaseModel):
    # Поддерживаем оба формата: name/phone (фронтенд) и contact_name/contact_phone
    contact_name: Optional[str] = None
    contact_phone: Optional[str] = None
    name: Optional[str] = None  # Альтернативное поле от фронтенда
    phone: Optional[str] = None  # Альтернативное поле от фронтенда
    contact_email: Optional[str] = None
    company_inn: Optional[str] = None
    company_name: Optional[str] = None
    products: Optional[List[Dict]] = None
    comment: Optional[str] = None
    source: Optional[str] = None  # откуда пришла заявка: check_page, quote_page, contact_form


def format_callback_email(callback_id: int, data: CallbackRequest, contact_name: str, contact_phone: str) -> str:
    """Форматирование email для заявки на звонок"""
    from datetime import datetime

    # Определяем читаемый источник
    source_labels = {
        'check_page': '📋 Страница проверки товаров',
        'quote_page': '📝 Страница КП',
        'contact_form': '📞 Форма обратной связи',
        'unknown': '❓ Неизвестно'
    }
    source_label = source_labels.get(data.source, data.source or 'Не указан')

    # Формируем список товаров
    products_html = ""
    if data.products:
        products_html = """
        <h3 style="color: #1E3A8A; margin-top: 20px;">🛒 Проверенные товары:</h3>
        <table style="border-collapse: collapse; width: 100%;">
            <tr style="background-color: #f8f9fa;">
                <th style="padding: 8px; border: 1px solid #ddd; text-align: left;">Товар</th>
                <th style="padding: 8px; border: 1px solid #ddd; text-align: left;">ТН ВЭД</th>
                <th style="padding: 8px; border: 1px solid #ddd; text-align: left;">Маркировка</th>
            </tr>
        """
        for p in data.products:
            marking_status = "✅ Требуется" if p.get('requires_marking') else (
                "🧪 Эксперимент" if p.get('status') == 'experiment' else "❌ Не требуется"
            )
            products_html += f"""
            <tr>
                <td style="padding: 8px; border: 1px solid #ddd;">{p.get('name', '—')}</td>
                <td style="padding: 8px; border: 1px solid #ddd; font-family: monospace;">{p.get('tnved', '—')}</td>
                <td style="padding: 8px; border: 1px solid #ddd;">{marking_status}</td>
            </tr>
            """
        products_html += "</table>"

    return f"""
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"></head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px;">
        <div style="background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%); padding: 20px; border-radius: 12px 12px 0 0;">
            <h1 style="margin: 0; color: #000;">🔔 Новая заявка #{callback_id}</h1>
            <p style="margin: 5px 0 0 0; color: rgba(0,0,0,0.7);">{datetime.now().strftime('%d.%m.%Y %H:%M')}</p>
        </div>

        <div style="background: #fff; padding: 20px; border: 1px solid #e5e7eb; border-top: none;">
            <h3 style="color: #1E3A8A; margin-top: 0;">📍 Источник заявки:</h3>
            <p style="font-size: 16px; font-weight: bold; color: #059669;">{source_label}</p>

            <h3 style="color: #1E3A8A;">👤 Контактные данные:</h3>
            <table style="border-collapse: collapse; width: 100%;">
                <tr>
                    <td style="padding: 8px; background-color: #f8f9fa; font-weight: bold; width: 120px;">Имя:</td>
                    <td style="padding: 8px;">{contact_name}</td>
                </tr>
                <tr>
                    <td style="padding: 8px; background-color: #f8f9fa; font-weight: bold;">Телефон:</td>
                    <td style="padding: 8px;"><a href="tel:{contact_phone}" style="color: #2563eb; font-weight: bold;">{contact_phone}</a></td>
                </tr>
                <tr>
                    <td style="padding: 8px; background-color: #f8f9fa; font-weight: bold;">Email:</td>
                    <td style="padding: 8px;">{data.contact_email or '—'}</td>
                </tr>
                <tr>
                    <td style="padding: 8px; background-color: #f8f9fa; font-weight: bold;">Компания:</td>
                    <td style="padding: 8px;">{data.company_name or '—'}</td>
                </tr>
                <tr>
                    <td style="padding: 8px; background-color: #f8f9fa; font-weight: bold;">ИНН:</td>
                    <td style="padding: 8px;">{data.company_inn or '—'}</td>
                </tr>
            </table>

            {products_html}

            {f'<h3 style="color: #1E3A8A; margin-top: 20px;">💬 Комментарий:</h3><p style="background: #f8f9fa; padding: 12px; border-radius: 8px;">{data.comment}</p>' if data.comment else ''}
        </div>

        <div style="background: #f8f9fa; padding: 15px; border-radius: 0 0 12px 12px; text-align: center; border: 1px solid #e5e7eb; border-top: none;">
            <p style="margin: 0; color: #6b7280; font-size: 12px;">Про.Маркируй • promarkirui.ru</p>
        </div>
    </body>
    </html>
    """


@app.post("/api/callback/create")
async def api_create_callback(
    data: CallbackRequest,
    background_tasks: BackgroundTasks,
    user: Optional[Dict] = Depends(get_current_user)
):
    """Создать заявку на звонок"""
    # Поддержка обоих форматов полей
    contact_name = data.contact_name or data.name or "Не указано"
    contact_phone = data.contact_phone or data.phone or "Не указан"

    callback_data = {
        "user_id": user["id"] if user else None,
        "contact_name": contact_name,
        "contact_phone": contact_phone,
        "contact_email": data.contact_email,
        "company_inn": data.company_inn,
        "company_name": data.company_name,
        "products": data.products or [],
        "comment": data.comment,
        "source": data.source or "unknown"
    }

    callback_id = CallbackDB.create(callback_data)

    # Отправляем уведомление всем менеджерам
    manager_emails = os.getenv('CONTACT_TO_EMAIL', 'damirslk@mail.ru,turbin.ar8@gmail.com').split(',')
    source_name = {
        "check_page": "проверки товара",
        "quote_page": "коммерческого предложения",
        "contact_form": "контактной формы"
    }.get(data.source or "", "звонка")
    subject = f"Заявка на обратный звонок ({source_name}) #{callback_id}"
    body = format_callback_email(callback_id, data, contact_name, contact_phone)
    for email in manager_emails:
        background_tasks.add_task(send_email, email.strip(), subject, body)

    return {"status": "success", "callback_id": callback_id}


# ======================== ПАРТНЁРСКИЕ ЗАЯВКИ ========================

class PartnerRequestData(BaseModel):
    company_name: str
    contact_name: str
    contact_phone: str
    contact_email: str
    partner_type: str
    comment: Optional[str] = None


class RepresentativeRequestData(BaseModel):
    """Заявка на региональное представительство"""
    contact_name: str
    contact_phone: str
    contact_email: str
    city: str
    region: Optional[str] = None
    company_name: Optional[str] = None
    inn: Optional[str] = None
    experience: Optional[str] = None  # Опыт в продажах/маркировке
    comment: Optional[str] = None

@app.post("/api/partner-request")
async def api_create_partner_request(
    data: PartnerRequestData,
    background_tasks: BackgroundTasks
):
    """Создать заявку на партнёрство (публичная страница)"""

    # Сохраняем как callback с особым типом
    callback_data = {
        "user_id": None,
        "contact_name": data.contact_name,
        "contact_phone": data.contact_phone,
        "contact_email": data.contact_email,
        "company_inn": None,
        "company_name": data.company_name,
        "products": [],
        "comment": f"[Заявка на партнёрство]\nТип: {data.partner_type}\n{data.comment or ''}",
        "source": "partner_request"
    }

    callback_id = CallbackDB.create(callback_data)

    # Отправляем уведомление менеджерам
    manager_emails = os.getenv('CONTACT_TO_EMAIL', 'damirslk@mail.ru,turbin.ar8@gmail.com').split(',')

    partner_type_names = {
        "integrator": "Системный интегратор",
        "accounting": "Бухгалтерские услуги",
        "logistics": "ВЭД/Логистика",
        "fulfillment": "Фулфилмент",
        "consultant": "Бизнес-консультант",
        "printing": "Типография/Принтинг",
        "it": "IT-компания",
        "other": "Другое"
    }

    subject = f"Заявка на партнёрство #{callback_id}"
    body = f"""
    <h2>Новая заявка на партнёрство</h2>
    <table style="border-collapse: collapse; width: 100%;">
        <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Компания:</strong></td><td style="padding: 8px; border: 1px solid #ddd;">{data.company_name}</td></tr>
        <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Контактное лицо:</strong></td><td style="padding: 8px; border: 1px solid #ddd;">{data.contact_name}</td></tr>
        <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Телефон:</strong></td><td style="padding: 8px; border: 1px solid #ddd;">{data.contact_phone}</td></tr>
        <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Email:</strong></td><td style="padding: 8px; border: 1px solid #ddd;">{data.contact_email}</td></tr>
        <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Тип партнёра:</strong></td><td style="padding: 8px; border: 1px solid #ddd;">{partner_type_names.get(data.partner_type, data.partner_type)}</td></tr>
        <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Комментарий:</strong></td><td style="padding: 8px; border: 1px solid #ddd;">{data.comment or '-'}</td></tr>
    </table>
    <p style="margin-top: 20px; color: #666;">Заявка создана через страницу "Партнёрам"</p>
    """

    for email in manager_emails:
        background_tasks.add_task(send_email, email.strip(), subject, body)

    return {"status": "success", "request_id": callback_id}


@app.post("/api/representative-request")
async def api_create_representative_request(
    data: RepresentativeRequestData,
    background_tasks: BackgroundTasks
):
    """Создать заявку на региональное представительство"""

    # Сохраняем как callback с особым типом
    callback_data = {
        "user_id": None,
        "contact_name": data.contact_name,
        "contact_phone": data.contact_phone,
        "contact_email": data.contact_email,
        "company_inn": data.inn,
        "company_name": data.company_name or f"Представитель: {data.city}",
        "products": [],
        "comment": f"[ЗАЯВКА НА ПРЕДСТАВИТЕЛЬСТВО]\nГород: {data.city}\nРегион: {data.region or '-'}\nОпыт: {data.experience or '-'}\nКомментарий: {data.comment or '-'}",
        "source": "representative_request"
    }

    callback_id = CallbackDB.create(callback_data)

    # Отправляем уведомление менеджерам
    manager_emails = os.getenv('CONTACT_TO_EMAIL', 'damirslk@mail.ru,turbin.ar8@gmail.com').split(',')

    subject = f"🌟 ЗАЯВКА НА ПРЕДСТАВИТЕЛЬСТВО #{callback_id} — {data.city}"
    body = f"""
    <div style="font-family: Arial, sans-serif; max-width: 600px;">
        <div style="background: linear-gradient(135deg, #FFDA07, #F5C300); padding: 20px; border-radius: 12px 12px 0 0;">
            <h2 style="margin: 0; color: #000;">🌟 Заявка на региональное представительство</h2>
        </div>
        <div style="background: #fff; padding: 20px; border: 1px solid #ddd; border-top: none; border-radius: 0 0 12px 12px;">
            <table style="width: 100%; border-collapse: collapse;">
                <tr>
                    <td style="padding: 12px; border-bottom: 1px solid #eee; font-weight: bold; width: 40%;">🏙️ Город:</td>
                    <td style="padding: 12px; border-bottom: 1px solid #eee; color: #000; font-size: 16px;"><strong>{data.city}</strong></td>
                </tr>
                <tr>
                    <td style="padding: 12px; border-bottom: 1px solid #eee; font-weight: bold;">📍 Регион:</td>
                    <td style="padding: 12px; border-bottom: 1px solid #eee;">{data.region or 'Не указан'}</td>
                </tr>
                <tr>
                    <td style="padding: 12px; border-bottom: 1px solid #eee; font-weight: bold;">👤 Контактное лицо:</td>
                    <td style="padding: 12px; border-bottom: 1px solid #eee;">{data.contact_name}</td>
                </tr>
                <tr>
                    <td style="padding: 12px; border-bottom: 1px solid #eee; font-weight: bold;">📞 Телефон:</td>
                    <td style="padding: 12px; border-bottom: 1px solid #eee;"><a href="tel:{data.contact_phone}">{data.contact_phone}</a></td>
                </tr>
                <tr>
                    <td style="padding: 12px; border-bottom: 1px solid #eee; font-weight: bold;">📧 Email:</td>
                    <td style="padding: 12px; border-bottom: 1px solid #eee;"><a href="mailto:{data.contact_email}">{data.contact_email}</a></td>
                </tr>
                <tr>
                    <td style="padding: 12px; border-bottom: 1px solid #eee; font-weight: bold;">🏢 Компания:</td>
                    <td style="padding: 12px; border-bottom: 1px solid #eee;">{data.company_name or 'Физ. лицо'}</td>
                </tr>
                <tr>
                    <td style="padding: 12px; border-bottom: 1px solid #eee; font-weight: bold;">📋 ИНН:</td>
                    <td style="padding: 12px; border-bottom: 1px solid #eee;">{data.inn or 'Не указан'}</td>
                </tr>
                <tr>
                    <td style="padding: 12px; border-bottom: 1px solid #eee; font-weight: bold;">💼 Опыт:</td>
                    <td style="padding: 12px; border-bottom: 1px solid #eee;">{data.experience or 'Не указан'}</td>
                </tr>
                <tr>
                    <td style="padding: 12px; font-weight: bold;">💬 Комментарий:</td>
                    <td style="padding: 12px;">{data.comment or '-'}</td>
                </tr>
            </table>
            <p style="margin-top: 20px; padding: 15px; background: #f8f9fa; border-radius: 8px; color: #666; font-size: 14px;">
                Заявка создана через страницу "Партнёрам" → "Стать представителем"
            </p>
        </div>
    </div>
    """

    for email in manager_emails:
        background_tasks.add_task(send_email, email.strip(), subject, body)

    return {"status": "success", "request_id": callback_id}


# ======================== АДМИНКА ========================

@app.get("/api/admin/callbacks")
async def api_admin_get_callbacks(user: Dict = Depends(require_admin)):
    """Получить все заявки на звонок (админка)"""
    callbacks = CallbackDB.get_all()
    return callbacks


@app.put("/api/admin/callbacks/{callback_id}")
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


@app.get("/api/admin/users")
async def api_admin_get_users(user: Dict = Depends(require_admin)):
    """Получить всех пользователей (админка)"""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute('''
            SELECT id, email, role, is_active, email_verified, created_at,
                   name, phone, last_login, invitation_sent_at
            FROM users ORDER BY created_at DESC
        ''')
        rows = cursor.fetchall()
        return [dict(row) for row in rows]


@app.post("/api/admin/users")
async def api_admin_create_user(
    data: Dict,
    user: Dict = Depends(require_superadmin)
):
    """Создать нового пользователя (только для суперадмина)"""
    email = data.get("email")
    password = data.get("password")
    role = data.get("role", "client")

    if not email or not password:
        raise HTTPException(status_code=400, detail="Email и пароль обязательны")

    if role not in ["client", "employee", "superadmin"]:
        raise HTTPException(status_code=400, detail="Недопустимая роль")

    existing = UserDB.get_by_email(email)
    if existing:
        raise HTTPException(status_code=400, detail="Email уже зарегистрирован")

    user_id = UserDB.create(email, password, role)
    return {"id": user_id, "email": email, "role": role}


@app.post("/api/admin/users/{user_id}/send-invitation")
async def api_admin_send_invitation(
    user_id: int,
    data: Dict,
    user: Dict = Depends(require_superadmin)
):
    """Отправить приглашение сотруднику на email"""
    from email_service import send_staff_invitation_email

    target_user = UserDB.get_by_id(user_id)
    if not target_user:
        raise HTTPException(status_code=404, detail="Пользователь не найден")

    if target_user['role'] not in ['employee', 'superadmin']:
        raise HTTPException(status_code=400, detail="Приглашения отправляются только сотрудникам")

    # Получаем пароль из запроса (временный пароль для письма)
    temp_password = data.get('password', '')
    if not temp_password:
        raise HTTPException(status_code=400, detail="Укажите пароль для отправки в приглашении")

    email_sent = send_staff_invitation_email(
        to_email=target_user['email'],
        password=temp_password,
        role=target_user['role']
    )

    if not email_sent:
        raise HTTPException(status_code=500, detail="Ошибка отправки email. Проверьте настройки SMTP.")

    # Сохраняем время отправки приглашения
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(
            'UPDATE users SET invitation_sent_at = CURRENT_TIMESTAMP WHERE id = ?',
            (user_id,)
        )

    return {"success": True, "message": "Приглашение отправлено"}


# Защищённый email главного администратора - нельзя деактивировать/удалить/изменить роль
PROTECTED_ADMIN_EMAIL = 'damirslk@mail.ru'


@app.put("/api/admin/users/{user_id}")
async def api_admin_update_user(
    user_id: int,
    data: Dict,
    current_user: Dict = Depends(require_superadmin)
):
    """Обновить пользователя (только для суперадмина)"""
    # Проверяем, не пытаемся ли изменить защищённого админа
    target_user = UserDB.get_by_id(user_id)
    if target_user and target_user.get('email', '').lower() == PROTECTED_ADMIN_EMAIL:
        # Запрещаем деактивацию и изменение роли для главного админа
        if "is_active" in data and not data["is_active"]:
            raise HTTPException(status_code=403, detail="Нельзя деактивировать главного администратора")
        if "role" in data and data["role"] != "superadmin":
            raise HTTPException(status_code=403, detail="Нельзя изменить роль главного администратора")

    with get_db() as conn:
        cursor = conn.cursor()

        updates = []
        values = []

        if "role" in data:
            if data["role"] not in ["client", "employee", "superadmin"]:
                raise HTTPException(status_code=400, detail="Недопустимая роль")
            updates.append("role = ?")
            values.append(data["role"])

        if "is_active" in data:
            updates.append("is_active = ?")
            values.append(1 if data["is_active"] else 0)

        if "name" in data:
            updates.append("name = ?")
            values.append(data["name"])

        if "phone" in data:
            updates.append("phone = ?")
            values.append(data["phone"])

        if updates:
            values.append(user_id)
            cursor.execute(
                f'UPDATE users SET {", ".join(updates)} WHERE id = ?',
                values
            )

    return {"success": True}


@app.delete("/api/admin/users/{user_id}")
async def api_admin_delete_user(
    user_id: int,
    current_user: Dict = Depends(require_superadmin)
):
    """Удалить пользователя (только для суперадмина)"""
    if user_id == current_user["id"]:
        raise HTTPException(status_code=400, detail="Нельзя удалить самого себя")

    # Проверяем, не пытаемся ли удалить защищённого админа
    target_user = UserDB.get_by_id(user_id)
    if target_user and target_user.get('email', '').lower() == PROTECTED_ADMIN_EMAIL:
        raise HTTPException(status_code=403, detail="Нельзя удалить главного администратора")

    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute('DELETE FROM users WHERE id = ?', (user_id,))

    return {"success": True}


@app.get("/api/admin/stats")
async def api_admin_get_stats(user: Dict = Depends(require_admin)):
    """Получить статистику (админка)"""
    with get_db() as conn:
        cursor = conn.cursor()

        # Количество пользователей
        cursor.execute('SELECT COUNT(*) as cnt FROM users')
        users_count = cursor.fetchone()['cnt']

        # Количество компаний
        cursor.execute('SELECT COUNT(*) as cnt FROM companies')
        companies_count = cursor.fetchone()['cnt']

        # Всего заявок
        cursor.execute('SELECT COUNT(*) as cnt FROM callbacks')
        total_callbacks = cursor.fetchone()['cnt']

        # Количество новых заявок
        cursor.execute("SELECT COUNT(*) as cnt FROM callbacks WHERE status = 'new'")
        new_callbacks = cursor.fetchone()['cnt']

        # Последние 5 заявок
        cursor.execute('''
            SELECT id, contact_name as name, contact_phone as phone, status, created_at
            FROM callbacks
            ORDER BY created_at DESC
            LIMIT 5
        ''')
        recent_callbacks = [dict(row) for row in cursor.fetchall()]

    return {
        "total_users": users_count,
        "total_companies": companies_count,
        "total_callbacks": total_callbacks,
        "pending_callbacks": new_callbacks,
        "recent_callbacks": recent_callbacks
    }


# ======================== EMPLOYEE DASHBOARD API ========================

# Pydantic модели для Employee API
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
    director_name: Optional[str] = None  # ФИО генерального директора
    comment: Optional[str] = None
    status: Optional[str] = None
    products: Optional[List[Dict]] = None

class InteractionCreate(BaseModel):
    type: str  # call, email, meeting, document_sent, note
    subject: Optional[str] = None
    description: Optional[str] = None


# --- Статистика для дашборда ---
@app.get("/api/employee/stats")
async def api_employee_stats(user: Dict = Depends(require_employee)):
    """Статистика для Employee Dashboard"""
    with get_db() as conn:
        cursor = conn.cursor()

        # Новые заявки
        cursor.execute("SELECT COUNT(*) as cnt FROM callbacks WHERE status = 'new'")
        new_callbacks = cursor.fetchone()['cnt']

        # Заявки в работе
        cursor.execute("SELECT COUNT(*) as cnt FROM callbacks WHERE status = 'processing'")
        processing_callbacks = cursor.fetchone()['cnt']

        # Всего клиентов
        client_stats = ClientDB.get_stats()

        # Последние заявки
        cursor.execute('''
            SELECT id, contact_name, contact_phone, contact_email, company_name,
                   status, source, created_at
            FROM callbacks
            ORDER BY created_at DESC
            LIMIT 10
        ''')
        recent_callbacks = [dict(row) for row in cursor.fetchall()]

    # Статистика КП и Договоров
    quote_stats = QuoteDB.get_stats()
    contract_stats = ContractDB.get_stats()

    return {
        "new_callbacks": new_callbacks,
        "processing_callbacks": processing_callbacks,
        "clients": client_stats,
        "quotes": quote_stats,
        "contracts": contract_stats,
        "recent_callbacks": recent_callbacks
    }


# --- Расширенная статистика для Superadmin ---
@app.get("/api/superadmin/stats")
async def api_superadmin_stats(
    period: str = "week",
    user: Dict = Depends(require_superadmin)
):
    """Расширенная статистика для Superadmin Dashboard"""
    from datetime import timedelta

    # Определяем текущий и предыдущий периоды для сравнения
    now = datetime.now()
    if period == "day":
        start_date = now.replace(hour=0, minute=0, second=0, microsecond=0)
        prev_start = start_date - timedelta(days=1)
        prev_end = start_date
    elif period == "week":
        start_date = now - timedelta(days=7)
        prev_start = now - timedelta(days=14)
        prev_end = start_date
    elif period == "month":
        start_date = now - timedelta(days=30)
        prev_start = now - timedelta(days=60)
        prev_end = start_date
    else:
        start_date = now - timedelta(days=7)
        prev_start = now - timedelta(days=14)
        prev_end = start_date

    start_str = start_date.strftime('%Y-%m-%d %H:%M:%S')
    prev_start_str = prev_start.strftime('%Y-%m-%d %H:%M:%S')
    prev_end_str = prev_end.strftime('%Y-%m-%d %H:%M:%S')

    with get_db() as conn:
        cursor = conn.cursor()

        # === ЗАЯВКИ ===
        cursor.execute("SELECT COUNT(*) as cnt FROM callbacks WHERE status = 'new'")
        new_callbacks = cursor.fetchone()['cnt']

        cursor.execute("SELECT COUNT(*) as cnt FROM callbacks WHERE status = 'processing'")
        processing_callbacks = cursor.fetchone()['cnt']

        cursor.execute("SELECT COUNT(*) as cnt FROM callbacks WHERE created_at >= ?", (start_str,))
        period_callbacks = cursor.fetchone()['cnt']

        # Заявки за предыдущий период
        cursor.execute("SELECT COUNT(*) as cnt FROM callbacks WHERE created_at >= ? AND created_at < ?",
                      (prev_start_str, prev_end_str))
        prev_period_callbacks = cursor.fetchone()['cnt']

        cursor.execute("SELECT COUNT(*) as cnt FROM callbacks")
        total_callbacks = cursor.fetchone()['cnt']

        # === КЛИЕНТЫ ===
        cursor.execute('''
            SELECT
                COUNT(*) as total,
                SUM(CASE WHEN status = 'lead' THEN 1 ELSE 0 END) as leads,
                SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active,
                SUM(CASE WHEN status = 'regular' THEN 1 ELSE 0 END) as regular,
                SUM(CASE WHEN status = 'inactive' THEN 1 ELSE 0 END) as inactive
            FROM clients
        ''')
        client_stats = dict(cursor.fetchone())

        cursor.execute("SELECT COUNT(*) as cnt FROM clients WHERE created_at >= ?", (start_str,))
        period_clients = cursor.fetchone()['cnt']

        # Клиенты за предыдущий период
        cursor.execute("SELECT COUNT(*) as cnt FROM clients WHERE created_at >= ? AND created_at < ?",
                      (prev_start_str, prev_end_str))
        prev_period_clients = cursor.fetchone()['cnt']

        # === КП ===
        cursor.execute('''
            SELECT
                COUNT(*) as total,
                SUM(CASE WHEN status = 'created' THEN 1 ELSE 0 END) as created,
                SUM(CASE WHEN status = 'sent' THEN 1 ELSE 0 END) as sent,
                SUM(CASE WHEN status = 'accepted' THEN 1 ELSE 0 END) as accepted,
                SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) as rejected,
                COALESCE(SUM(total_amount), 0) as total_amount
            FROM quotes
        ''')
        quote_stats = dict(cursor.fetchone())

        cursor.execute('''
            SELECT COUNT(*) as cnt, COALESCE(SUM(total_amount), 0) as amount
            FROM quotes WHERE created_at >= ?
        ''', (start_str,))
        row = cursor.fetchone()
        period_quotes = row['cnt']
        period_quotes_amount = row['amount']

        # КП за предыдущий период
        cursor.execute('''
            SELECT COUNT(*) as cnt, COALESCE(SUM(total_amount), 0) as amount
            FROM quotes WHERE created_at >= ? AND created_at < ?
        ''', (prev_start_str, prev_end_str))
        row = cursor.fetchone()
        prev_period_quotes = row['cnt']
        prev_period_quotes_amount = row['amount']

        # === ДОГОВОРЫ ===
        cursor.execute('''
            SELECT
                COUNT(*) as total,
                SUM(CASE WHEN status = 'draft' THEN 1 ELSE 0 END) as draft,
                SUM(CASE WHEN status = 'signed' THEN 1 ELSE 0 END) as signed,
                SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active,
                SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
                COALESCE(SUM(total_amount), 0) as total_amount
            FROM contracts
        ''')
        contract_stats = dict(cursor.fetchone())

        cursor.execute('''
            SELECT COUNT(*) as cnt, COALESCE(SUM(total_amount), 0) as amount
            FROM contracts WHERE created_at >= ?
        ''', (start_str,))
        row = cursor.fetchone()
        period_contracts = row['cnt']
        period_contracts_amount = row['amount']

        # Договоры за предыдущий период
        cursor.execute('''
            SELECT COUNT(*) as cnt, COALESCE(SUM(total_amount), 0) as amount
            FROM contracts WHERE created_at >= ? AND created_at < ?
        ''', (prev_start_str, prev_end_str))
        row = cursor.fetchone()
        prev_period_contracts = row['cnt']
        prev_period_contracts_amount = row['amount']

        # === СРЕДНИЙ ЧЕК ===
        avg_quote_check = quote_stats['total_amount'] / quote_stats['total'] if quote_stats['total'] > 0 else 0
        avg_contract_check = contract_stats['total_amount'] / contract_stats['total'] if contract_stats['total'] > 0 else 0

        # Средний чек за период
        period_avg_quote = period_quotes_amount / period_quotes if period_quotes > 0 else 0
        period_avg_contract = period_contracts_amount / period_contracts if period_contracts > 0 else 0

        # Средний чек за предыдущий период
        prev_avg_quote = prev_period_quotes_amount / prev_period_quotes if prev_period_quotes > 0 else 0
        prev_avg_contract = prev_period_contracts_amount / prev_period_contracts if prev_period_contracts > 0 else 0

        # === ВРЕМЯ КОНВЕРСИИ (от клиента до договора) ===
        # Примечание: связь callback_id -> client не хранится, поэтому считаем только client -> contract
        avg_callback_to_client_hours = 0  # Нет данных о связи заявка-клиент

        cursor.execute('''
            SELECT AVG(
                CAST((julianday(ct.created_at) - julianday(c.created_at)) AS INTEGER)
            ) as avg_days
            FROM contracts ct
            INNER JOIN clients c ON ct.client_id = c.id
            WHERE ct.created_at >= ?
        ''', (start_str,))
        row = cursor.fetchone()
        avg_client_to_contract_days = row['avg_days'] or 0

        # === ВОРОНКА ПРОДАЖ ===
        funnel = {
            "callbacks": total_callbacks,
            "clients": client_stats['total'] or 0,
            "quotes": quote_stats['total'] or 0,
            "contracts": contract_stats['total'] or 0
        }

        # === СТАТИСТИКА ПО МЕНЕДЖЕРАМ ===
        cursor.execute('''
            SELECT
                u.id,
                u.email,
                COUNT(DISTINCT c.id) as clients_count,
                COUNT(DISTINCT q.id) as quotes_count,
                COUNT(DISTINCT ct.id) as contracts_count,
                COALESCE(SUM(ct.total_amount), 0) as contracts_amount
            FROM users u
            LEFT JOIN clients c ON c.assigned_manager_id = u.id
            LEFT JOIN quotes q ON q.client_id IN (SELECT id FROM clients WHERE assigned_manager_id = u.id)
            LEFT JOIN contracts ct ON ct.client_id IN (SELECT id FROM clients WHERE assigned_manager_id = u.id)
            WHERE u.role IN ('employee', 'superadmin')
            GROUP BY u.id, u.email
            ORDER BY contracts_count DESC
        ''')
        managers_stats = [dict(row) for row in cursor.fetchall()]

        # === ИСТОЧНИКИ ЗАЯВОК ===
        cursor.execute('''
            SELECT
                COALESCE(source, 'unknown') as source,
                COUNT(*) as count
            FROM callbacks
            GROUP BY source
            ORDER BY count DESC
        ''')
        sources = [dict(row) for row in cursor.fetchall()]

        # === ПОСЛЕДНИЕ АКТИВНОСТИ ===
        cursor.execute('''
            SELECT cb.id, cb.contact_name, cb.company_name, cb.status, cb.source, cb.created_at
            FROM callbacks cb
            ORDER BY cb.created_at DESC
            LIMIT 5
        ''')
        recent_callbacks = [dict(row) for row in cursor.fetchall()]

        cursor.execute('''
            SELECT q.id, q.quote_number, q.total_amount, q.status, q.created_at,
                   c.contact_name as client_name
            FROM quotes q
            LEFT JOIN clients c ON q.client_id = c.id
            ORDER BY q.created_at DESC
            LIMIT 5
        ''')
        recent_quotes = [dict(row) for row in cursor.fetchall()]

        cursor.execute('''
            SELECT ct.id, ct.contract_number, ct.total_amount, ct.status, ct.created_at,
                   c.contact_name as client_name
            FROM contracts ct
            LEFT JOIN clients c ON ct.client_id = c.id
            ORDER BY ct.created_at DESC
            LIMIT 5
        ''')
        recent_contracts = [dict(row) for row in cursor.fetchall()]

    # === ПРОСРОЧЕННЫЕ ЗАЯВКИ ===
    overdue_count = CallbackSLADB.get_overdue_count()

    return {
        "period": period,
        "callbacks": {
            "new": new_callbacks,
            "processing": processing_callbacks,
            "period": period_callbacks,
            "prev_period": prev_period_callbacks,
            "total": total_callbacks,
            "overdue": overdue_count
        },
        "clients": {
            **client_stats,
            "period": period_clients,
            "prev_period": prev_period_clients
        },
        "quotes": {
            **quote_stats,
            "period": period_quotes,
            "period_amount": period_quotes_amount,
            "prev_period": prev_period_quotes,
            "prev_period_amount": prev_period_quotes_amount,
            "avg_check": avg_quote_check,
            "period_avg_check": period_avg_quote,
            "prev_avg_check": prev_avg_quote
        },
        "contracts": {
            **contract_stats,
            "period": period_contracts,
            "period_amount": period_contracts_amount,
            "prev_period": prev_period_contracts,
            "prev_period_amount": prev_period_contracts_amount,
            "avg_check": avg_contract_check,
            "period_avg_check": period_avg_contract,
            "prev_avg_check": prev_avg_contract
        },
        "funnel": funnel,
        "conversion": {
            "callback_to_client_hours": round(avg_callback_to_client_hours, 1),
            "client_to_contract_days": round(avg_client_to_contract_days, 1)
        },
        "managers": managers_stats,
        "sources": sources,
        "recent": {
            "callbacks": recent_callbacks,
            "quotes": recent_quotes,
            "contracts": recent_contracts
        }
    }


# --- Настройки уведомлений (Superadmin) ---
@app.get("/api/superadmin/notifications")
async def api_get_notification_settings(user: Dict = Depends(require_superadmin)):
    """Получить настройки уведомлений"""
    return {"notifications": NotificationSettingsDB.get_all()}


@app.post("/api/superadmin/notifications")
async def api_add_notification_setting(
    data: Dict,
    user: Dict = Depends(require_superadmin)
):
    """Добавить email для уведомлений"""
    email = data.get("email")
    if not email:
        raise HTTPException(status_code=400, detail="Email обязателен")

    notification_id = NotificationSettingsDB.add(
        email=email,
        notify_new_callback=data.get("notify_new_callback", True),
        notify_overdue=data.get("notify_overdue", True)
    )
    return {"id": notification_id, "success": True}


@app.put("/api/superadmin/notifications/{notification_id}")
async def api_update_notification_setting(
    notification_id: int,
    data: Dict,
    user: Dict = Depends(require_superadmin)
):
    """Обновить настройку уведомления"""
    success = NotificationSettingsDB.update(notification_id, data)
    return {"success": success}


@app.delete("/api/superadmin/notifications/{notification_id}")
async def api_delete_notification_setting(
    notification_id: int,
    user: Dict = Depends(require_superadmin)
):
    """Удалить настройку уведомления"""
    success = NotificationSettingsDB.delete(notification_id)
    return {"success": success}


# --- Настройки CRM (SLA и др.) ---
@app.get("/api/superadmin/settings")
async def api_get_crm_settings(user: Dict = Depends(require_superadmin)):
    """Получить все настройки CRM"""
    return {"settings": CRMSettingsDB.get_all()}


@app.put("/api/superadmin/settings/{key}")
async def api_update_crm_setting(
    key: str,
    data: Dict,
    user: Dict = Depends(require_superadmin)
):
    """Обновить настройку CRM"""
    value = data.get("value")
    if value is None:
        raise HTTPException(status_code=400, detail="Значение обязательно")

    CRMSettingsDB.set(key, str(value), data.get("description"))
    return {"success": True}


# --- Просроченные заявки ---
@app.get("/api/employee/callbacks/overdue")
async def api_get_overdue_callbacks(user: Dict = Depends(require_employee)):
    """Получить просроченные заявки"""
    # Superadmin видит все, employee только свои
    if user['role'] == 'superadmin':
        callbacks = CallbackSLADB.get_overdue()
    else:
        callbacks = CallbackSLADB.get_overdue(assigned_to=user['id'])

    return {"callbacks": callbacks, "count": len(callbacks)}


# --- Профиль сотрудника ---
@app.get("/api/employee/profile")
async def api_get_employee_profile(user: Dict = Depends(require_employee)):
    """Получить профиль текущего сотрудника"""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute('''
            SELECT id, email, name, phone, role, created_at
            FROM users WHERE id = ?
        ''', (user["id"],))
        row = cursor.fetchone()
        if row:
            return dict(row)
    raise HTTPException(status_code=404, detail="Пользователь не найден")


@app.put("/api/employee/profile")
async def api_update_employee_profile(data: Dict, user: Dict = Depends(require_employee)):
    """Обновить профиль сотрудника (имя, телефон)"""
    name = data.get("name")
    phone = data.get("phone")

    if not name or len(name.strip()) < 2:
        raise HTTPException(status_code=400, detail="Введите ФИО (минимум 2 символа)")

    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute('''
            UPDATE users SET name = ?, phone = ? WHERE id = ?
        ''', (name.strip(), phone, user["id"]))

    return {"success": True, "name": name.strip()}


# --- Список менеджеров (для назначения заявок) ---
@app.get("/api/employee/managers")
async def api_get_managers(user: Dict = Depends(require_employee)):
    """Получить список менеджеров для назначения заявок"""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute('''
            SELECT id, email, name, role
            FROM users
            WHERE role IN ('employee', 'superadmin') AND is_active = 1
            ORDER BY name, email
        ''')
        managers = [dict(row) for row in cursor.fetchall()]
    return {"managers": managers}


# --- Назначение заявки на конкретного менеджера (для Superadmin) ---
@app.put("/api/superadmin/callbacks/{callback_id}/assign")
async def api_superadmin_assign_callback(
    callback_id: int,
    data: Dict,
    user: Dict = Depends(require_superadmin)
):
    """Назначить заявку на конкретного менеджера (только superadmin)"""
    manager_id = data.get("manager_id")
    if not manager_id:
        raise HTTPException(status_code=400, detail="manager_id обязателен")

    success = CallbackDBExtended.assign_to(callback_id, manager_id)
    return {"success": success}


# --- Назначение заявки на себя (для любого менеджера) ---
@app.put("/api/employee/callbacks/{callback_id}/assign")
async def api_employee_assign_callback(
    callback_id: int,
    data: Dict,
    user: Dict = Depends(require_employee)
):
    """Назначить заявку на менеджера (employee может назначить только на себя, superadmin - на любого)"""
    manager_id = data.get("manager_id")
    if not manager_id:
        raise HTTPException(status_code=400, detail="manager_id обязателен")

    # Employee может назначить только на себя, superadmin - на любого
    if user["role"] == "employee" and manager_id != user["id"]:
        raise HTTPException(status_code=403, detail="Вы можете назначить заявку только на себя")

    success = CallbackDBExtended.assign_to(callback_id, manager_id)
    return {"success": success}


# --- Список КП для менеджеров ---
@app.get("/api/employee/quotes")
async def api_employee_get_quotes(
    status: Optional[str] = None,
    client_id: Optional[int] = None,
    user: Dict = Depends(require_employee)
):
    """Получить все КП с информацией о менеджерах и клиентах"""
    with get_db() as conn:
        cursor = conn.cursor()

        query = '''
            SELECT q.*,
                   c.contact_name as client_name,
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


# --- Обновить статус КП ---
@app.put("/api/employee/quotes/{quote_id}/status")
async def api_employee_update_quote_status(
    quote_id: int,
    request: Request,
    user: Dict = Depends(require_employee)
):
    """Обновить статус КП"""
    data = await request.json()
    new_status = data.get('status')

    if new_status not in ['created', 'sent', 'accepted', 'rejected']:
        raise HTTPException(status_code=400, detail="Недопустимый статус")

    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute('SELECT * FROM quotes WHERE id = ?', (quote_id,))
        quote = cursor.fetchone()
        if not quote:
            raise HTTPException(status_code=404, detail="КП не найдено")

        cursor.execute(
            'UPDATE quotes SET status = ? WHERE id = ?',
            (new_status, quote_id)
        )

    return {"success": True, "status": new_status}


# --- Скачать PDF КП ---
@app.get("/api/employee/quotes/{quote_id}/pdf")
async def api_employee_download_quote_pdf(
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


# --- Список договоров для менеджеров ---
@app.get("/api/employee/contracts")
async def api_employee_get_contracts(
    status: Optional[str] = None,
    client_id: Optional[int] = None,
    user: Dict = Depends(require_employee)
):
    """Получить все договоры с информацией о менеджерах и клиентах"""
    with get_db() as conn:
        cursor = conn.cursor()

        query = '''
            SELECT ct.*,
                   c.contact_name as client_name,
                   c.company_name,
                   m.email as manager_email,
                   comp.name as company_legal_name,
                   comp.inn as company_inn,
                   q.quote_number
            FROM contracts ct
            LEFT JOIN clients c ON ct.client_id = c.id
            LEFT JOIN users m ON ct.manager_id = m.id
            LEFT JOIN companies comp ON ct.company_id = comp.id
            LEFT JOIN quotes q ON ct.quote_id = q.id
            WHERE 1=1
        '''
        params = []

        if status:
            query += ' AND ct.status = ?'
            params.append(status)
        if client_id:
            query += ' AND ct.client_id = ?'
            params.append(client_id)

        query += ' ORDER BY ct.created_at DESC'
        cursor.execute(query, params)

        contracts = []
        for row in cursor.fetchall():
            item = dict(row)
            item['services'] = json.loads(item['services_json']) if item.get('services_json') else []
            if 'services_json' in item:
                del item['services_json']
            contracts.append(item)

    return {"contracts": contracts}


# --- Заявки (Callbacks) ---
@app.get("/api/employee/callbacks")
async def api_employee_get_callbacks(
    status: Optional[str] = None,
    period: Optional[str] = None,
    user: Dict = Depends(require_employee)
):
    """Получить все заявки с фильтрацией по периоду"""
    import json

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

        # Фильтр по периоду (используем localtime для корректного сравнения)
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


@app.get("/api/employee/callbacks/{callback_id}")
async def api_employee_get_callback(
    callback_id: int,
    user: Dict = Depends(require_employee)
):
    """Получить заявку по ID"""
    callback = CallbackDBExtended.get_by_id(callback_id)
    if not callback:
        raise HTTPException(status_code=404, detail="Заявка не найдена")
    return callback


@app.put("/api/employee/callbacks/{callback_id}/assign")
async def api_employee_assign_callback(
    callback_id: int,
    user: Dict = Depends(require_employee)
):
    """Взять заявку в работу"""
    success = CallbackDBExtended.assign_to(callback_id, user["id"])
    if not success:
        raise HTTPException(status_code=404, detail="Заявка не найдена")
    return {"success": True, "message": "Заявка взята в работу"}


@app.put("/api/employee/callbacks/{callback_id}/status")
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


@app.put("/api/employee/callbacks/{callback_id}/comment")
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


@app.post("/api/employee/callbacks/{callback_id}/convert")
async def api_employee_convert_callback(
    callback_id: int,
    user: Dict = Depends(require_employee)
):
    """Конвертировать заявку в клиента"""
    client_id = CallbackDBExtended.convert_to_client(callback_id, user["id"])
    if not client_id:
        raise HTTPException(status_code=404, detail="Заявка не найдена")

    # Обновляем статус заявки
    CallbackDB.update_status(callback_id, 'completed')

    return {"success": True, "client_id": client_id}


# --- Клиенты ---
@app.get("/api/employee/clients")
async def api_employee_get_clients(
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

    return {"clients": clients}


@app.post("/api/employee/clients")
async def api_employee_create_client(
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


@app.get("/api/employee/clients/{client_id}")
async def api_employee_get_client(
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


@app.put("/api/employee/clients/{client_id}")
async def api_employee_update_client(
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


@app.delete("/api/employee/clients/{client_id}")
async def api_employee_delete_client(
    client_id: int,
    user: Dict = Depends(require_superadmin)
):
    """Удалить клиента (только для superadmin)"""
    success = ClientDB.delete(client_id)
    if not success:
        raise HTTPException(status_code=404, detail="Клиент не найден")
    return {"success": True}


# --- История взаимодействий ---
@app.get("/api/employee/clients/{client_id}/history")
async def api_employee_get_client_history(
    client_id: int,
    user: Dict = Depends(require_employee)
):
    """Получить историю взаимодействий с клиентом"""
    history = InteractionDB.get_by_client(client_id)
    return {"history": history}


@app.post("/api/employee/clients/{client_id}/history")
async def api_employee_add_interaction(
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


# --- КП для клиента ---
@app.post("/api/employee/clients/{client_id}/quote")
async def api_employee_create_client_quote(
    client_id: int,
    services: List[Dict],
    background_tasks: BackgroundTasks,
    user: Dict = Depends(require_employee)
):
    """Создать КП для клиента"""
    client = ClientDB.get_by_id(client_id)
    if not client:
        raise HTTPException(status_code=404, detail="Клиент не найден")

    # Рассчитываем сумму
    total_amount = sum(s.get('price', 0) * s.get('quantity', 1) for s in services)

    # Создаём или получаем компанию
    company_id = None
    if client.get('inn'):
        company_data = {
            'inn': client['inn'],
            'kpp': client.get('kpp'),
            'ogrn': client.get('ogrn'),
            'name': client.get('company_name', client['contact_name']),
            'type': client.get('company_type', 'LEGAL'),
            'address': client.get('address'),
            'management_name': client.get('director_name'),
            'management_post': 'Генеральный директор'
        }
        company_id = CompanyDB.create(company_data)

    # Создаём КП
    from datetime import timedelta
    valid_until = (datetime.now() + timedelta(days=14)).date()

    quote_data = {
        'user_id': client.get('user_id'),
        'company_id': company_id,
        'services': services,
        'total_amount': total_amount,
        'contact_name': client['contact_name'],
        'contact_phone': client['contact_phone'],
        'contact_email': client.get('contact_email'),
        'valid_until': valid_until.isoformat()
    }

    result = QuoteDB.create(quote_data)

    # Связываем КП с клиентом
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(
            'UPDATE quotes SET client_id = ? WHERE id = ?',
            (client_id, result['id'])
        )

    # Добавляем в историю
    InteractionDB.create({
        'client_id': client_id,
        'manager_id': user["id"],
        'type': 'quote_created',
        'subject': f'Создано КП {result["quote_number"]}',
        'description': f'Сумма: {total_amount:,.0f} ₽',
        'quote_id': result['id']
    })

    return {
        "success": True,
        "quote_id": result['id'],
        "quote_number": result['quote_number'],
        "total_amount": total_amount
    }


# --- Полное КП для клиента (с товарами и услугами как у клиента) ---
class EmployeeQuoteFullRequest(BaseModel):
    company: Dict
    products: List[Dict] = []
    services: List[Dict]
    contact_name: str
    contact_phone: str
    contact_email: Optional[str] = None


@app.post("/api/employee/clients/{client_id}/quote/full")
async def api_employee_create_client_quote_full(
    client_id: int,
    request: EmployeeQuoteFullRequest,
    background_tasks: BackgroundTasks,
    user: Dict = Depends(require_employee)
):
    """Создать полное КП для клиента (как в клиентском интерфейсе)"""
    client = ClientDB.get_by_id(client_id)
    if not client:
        raise HTTPException(status_code=404, detail="Клиент не найден")

    # Рассчитываем сумму услуг
    services_breakdown = []
    total_amount = 0

    for service in request.services:
        quantity = service.get('quantity', 1)
        price = service.get('price', 0)
        subtotal = price * quantity
        total_amount += subtotal

        services_breakdown.append({
            'id': service.get('id'),
            'name': service.get('name'),
            'description': service.get('description', ''),
            'price': price,
            'unit': service.get('unit', 'шт'),
            'quantity': quantity,
            'subtotal': subtotal
        })

    # Создаём или получаем компанию
    company_id = None
    if request.company.get('inn'):
        company_data = {
            'inn': request.company.get('inn'),
            'kpp': request.company.get('kpp'),
            'ogrn': request.company.get('ogrn'),
            'name': request.company.get('name', client['contact_name']),
            'type': client.get('company_type', 'LEGAL'),
            'address': request.company.get('address'),
            'management_name': request.company.get('management_name') or client.get('director_name'),
            'management_post': request.company.get('management_post') or 'Генеральный директор'
        }
        company_id = CompanyDB.create(company_data)

    # Создаём КП
    from datetime import timedelta
    valid_until = (datetime.now() + timedelta(days=14)).date()

    quote_data = {
        'user_id': client.get('user_id'),
        'company_id': company_id,
        'services': request.services,
        'total_amount': total_amount,
        'contact_name': request.contact_name,
        'contact_phone': request.contact_phone,
        'contact_email': request.contact_email,
        'valid_until': valid_until.isoformat()
    }

    result = QuoteDB.create(quote_data)

    # Связываем КП с клиентом
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(
            'UPDATE quotes SET client_id = ? WHERE id = ?',
            (client_id, result['id'])
        )

    # Обновляем товары клиента если они переданы
    if request.products:
        ClientDB.update(client_id, {'products': request.products})

    # Добавляем в историю
    InteractionDB.create({
        'client_id': client_id,
        'manager_id': user["id"],
        'type': 'quote_created',
        'subject': f'Создано КП {result["quote_number"]}',
        'description': f'Сумма: {total_amount:,.0f} ₽. Услуг: {len(request.services)}. Товаров: {len(request.products)}',
        'quote_id': result['id']
    })

    return {
        "success": True,
        "quote_id": result['quote_number'],
        "total_amount": total_amount,
        "services_breakdown": services_breakdown,
        "valid_until": valid_until.isoformat(),
        "created_at": datetime.now().isoformat()
    }


# --- Создать договор с полными данными (услуги, товары) ---
# ВАЖНО: этот роут должен быть ПЕРЕД /contract, иначе FastAPI матчит /contract первым
@app.post("/api/employee/clients/{client_id}/contract/full")
async def api_employee_create_contract_full(
    client_id: int,
    request: Request,
    user: Dict = Depends(require_employee)
):
    """Создать договор с товарами и услугами (аналог КП, но сразу договор)"""
    data = await request.json()

    client = ClientDB.get_by_id(client_id)
    if not client:
        raise HTTPException(status_code=404, detail="Клиент не найден")

    if not client.get('inn'):
        raise HTTPException(
            status_code=400,
            detail="Заполните данные компании клиента (ИНН) перед созданием договора"
        )

    # Создаём компанию из данных клиента
    company_data = {
        'inn': client['inn'],
        'kpp': client.get('kpp'),
        'ogrn': client.get('ogrn'),
        'name': client.get('company_name') or client.get('contact_name'),
        'type': client.get('company_type', 'LEGAL'),
        'address': client.get('address'),
        'management_name': client.get('director_name'),
        'management_post': 'Генеральный директор'
    }
    company_id = CompanyDB.create(company_data)

    # Получаем услуги из запроса
    services_list = data.get('services', [])
    products_list = data.get('products', [])

    # Считаем общую сумму
    total_amount = sum(
        (s.get('price', 0) * s.get('quantity', 1))
        for s in services_list
    )

    # Создаём договор с услугами
    contract_data = {
        'quote_id': None,
        'user_id': client.get('user_id'),
        'manager_id': user['id'],
        'client_id': client_id,
        'company_id': company_id,
        'services': services_list,
        'total_amount': total_amount
    }

    result = ContractDB.create(contract_data)

    # Добавляем в историю
    InteractionDB.create({
        'client_id': client_id,
        'manager_id': user["id"],
        'type': 'contract_created',
        'subject': f'Создан договор {result["contract_number"]}',
        'description': f'Сумма: {total_amount:,.0f} ₽. Услуг: {len(services_list)}. Товаров: {len(products_list)}',
        'contract_id': result['id']
    })

    return {
        "success": True,
        "contract_id": result['id'],
        "contract_number": result['contract_number'],
        "total_amount": total_amount
    }


# --- Создать договор напрямую (без КП) ---
# ВАЖНО: этот роут должен быть ПЕРЕД /contract, иначе FastAPI матчит /contract первым
@app.post("/api/employee/clients/{client_id}/contract/direct")
async def api_employee_create_contract_direct(
    client_id: int,
    user: Dict = Depends(require_employee)
):
    """Создать пустой договор для клиента (без КП)"""
    client = ClientDB.get_by_id(client_id)
    if not client:
        raise HTTPException(status_code=404, detail="Клиент не найден")

    if not client.get('inn'):
        raise HTTPException(
            status_code=400,
            detail="Заполните данные компании клиента (ИНН) перед созданием договора"
        )

    # Создаём компанию из данных клиента
    company_data = {
        'inn': client['inn'],
        'kpp': client.get('kpp'),
        'ogrn': client.get('ogrn'),
        'name': client.get('company_name') or client.get('contact_name'),
        'type': client.get('company_type', 'LEGAL'),
        'address': client.get('address'),
        'management_name': client.get('director_name'),
        'management_post': 'Генеральный директор'
    }
    company_id = CompanyDB.create(company_data)

    # Создаём договор без услуг (будут добавлены позже или пустые)
    contract_data = {
        'quote_id': None,
        'user_id': client.get('user_id'),
        'manager_id': user['id'],
        'client_id': client_id,
        'company_id': company_id,
        'services': [],
        'total_amount': 0
    }

    result = ContractDB.create(contract_data)

    # Добавляем в историю
    InteractionDB.create({
        'client_id': client_id,
        'manager_id': user["id"],
        'type': 'contract_created',
        'subject': f'Создан договор {result["contract_number"]}',
        'description': 'Договор создан напрямую (без КП)',
        'contract_id': result['id']
    })

    return {
        "success": True,
        "contract_id": result['id'],
        "contract_number": result['contract_number']
    }


# --- Договор для клиента (из КП) ---
@app.post("/api/employee/clients/{client_id}/contract")
async def api_employee_create_client_contract(
    client_id: int,
    quote_id: int = None,
    services: List[Dict] = None,
    user: Dict = Depends(require_employee)
):
    """Создать договор для клиента (из КП или напрямую)"""
    client = ClientDB.get_by_id(client_id)
    if not client:
        raise HTTPException(status_code=404, detail="Клиент не найден")

    # Если указан quote_id - создаём договор из КП
    if quote_id:
        with get_db() as conn:
            cursor = conn.cursor()
            # Ищем КП по id (без проверки client_id для старых КП)
            cursor.execute('SELECT * FROM quotes WHERE id = ?', (quote_id,))
            quote = cursor.fetchone()
            if not quote:
                raise HTTPException(status_code=404, detail="КП не найдено")
            quote = dict(quote)
            services_data = json.loads(quote['services_json'])
            total_amount = quote['total_amount']
            company_id = quote.get('company_id')

            # Если у КП нет company_id, создаём компанию из данных клиента
            if not company_id and client.get('inn'):
                company_data = {
                    'inn': client['inn'],
                    'kpp': client.get('kpp'),
                    'ogrn': client.get('ogrn'),
                    'name': client.get('company_name') or client.get('contact_name'),
                    'type': client.get('company_type', 'LEGAL'),
                    'address': client.get('address'),
                    'management_name': client.get('director_name'),
                    'management_post': 'Генеральный директор'
                }
                company_id = CompanyDB.create(company_data)

            # Если всё ещё нет company_id - у клиента нет данных компании
            if not company_id:
                raise HTTPException(
                    status_code=400,
                    detail="Заполните данные компании клиента (ИНН) перед созданием договора"
                )
    elif services:
        # Создаём напрямую из списка услуг
        total_amount = sum(s.get('price', 0) * s.get('quantity', 1) for s in services)
        services_data = services
        # Создаём или получаем компанию
        company_id = None
        if client.get('inn'):
            company_data = {
                'inn': client['inn'],
                'kpp': client.get('kpp'),
                'ogrn': client.get('ogrn'),
                'name': client.get('company_name', client['contact_name']),
                'type': client.get('company_type', 'LEGAL'),
                'address': client.get('address'),
                'management_name': client.get('director_name'),
                'management_post': 'Генеральный директор'
            }
            company_id = CompanyDB.create(company_data)
        else:
            raise HTTPException(
                status_code=400,
                detail="Заполните данные компании клиента (ИНН) перед созданием договора"
            )
    else:
        raise HTTPException(status_code=400, detail="Укажите quote_id или services")

    # Создаём договор
    contract_data = {
        'quote_id': quote_id,
        'user_id': client.get('user_id'),
        'manager_id': user['id'],  # Текущий менеджер
        'client_id': client_id,
        'company_id': company_id,
        'services': services_data,
        'total_amount': total_amount
    }

    result = ContractDB.create(contract_data)

    # Связываем договор с клиентом
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(
            'UPDATE contracts SET client_id = ? WHERE id = ?',
            (client_id, result['id'])
        )
        # Обновляем статус КП если был указан
        if quote_id:
            cursor.execute(
                'UPDATE quotes SET status = ? WHERE id = ?',
                ('accepted', quote_id)
            )

    # Добавляем в историю
    InteractionDB.create({
        'client_id': client_id,
        'manager_id': user["id"],
        'type': 'contract_created',
        'subject': f'Создан договор {result["contract_number"]}',
        'description': f'Сумма: {total_amount:,.0f} ₽' + (f' (из КП #{quote_id})' if quote_id else ''),
        'contract_id': result['id']
    })

    return {
        "success": True,
        "contract_id": result['id'],
        "contract_number": result['contract_number'],
        "total_amount": total_amount
    }


# --- Обновить статус договора ---
@app.put("/api/employee/contracts/{contract_id}/status")
async def api_employee_update_contract_status(
    contract_id: int,
    request: Request,
    user: Dict = Depends(require_employee)
):
    """Обновить статус договора"""
    data = await request.json()
    new_status = data.get('status')

    if new_status not in ['draft', 'sent', 'signed', 'active', 'completed', 'cancelled']:
        raise HTTPException(status_code=400, detail="Недопустимый статус")

    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute('SELECT * FROM contracts WHERE id = ?', (contract_id,))
        contract = cursor.fetchone()
        if not contract:
            raise HTTPException(status_code=404, detail="Договор не найден")

        cursor.execute(
            'UPDATE contracts SET status = ? WHERE id = ?',
            (new_status, contract_id)
        )

    return {"success": True, "status": new_status}


# --- Скачать PDF договора ---
@app.get("/api/employee/contracts/{contract_id}/pdf")
async def api_employee_download_contract_pdf(
    contract_id: int,
    user: Dict = Depends(require_employee)
):
    """Скачать PDF договора"""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute('SELECT * FROM contracts WHERE id = ?', (contract_id,))
        contract = cursor.fetchone()
        if not contract:
            raise HTTPException(status_code=404, detail="Договор не найден")
        contract = dict(contract)

        # Получаем данные компании
        cursor.execute('SELECT * FROM companies WHERE id = ?', (contract['company_id'],))
        company = cursor.fetchone()
        if not company:
            raise HTTPException(status_code=404, detail="Компания не найдена")
        company = dict(company)

        # Получаем данные клиента если есть
        client = None
        if contract.get('client_id'):
            client = ClientDB.get_by_id(contract['client_id'])

    # Подготавливаем данные для PDF
    services = json.loads(contract['services_json']) if contract.get('services_json') else []

    client_info = {
        'inn': company.get('inn') or '',
        'kpp': company.get('kpp') or '',
        'ogrn': company.get('ogrn') or '',
        'name': company.get('name') or '',
        'address': company.get('address') or '',
        'management_name': company.get('management_name') or (client.get('director_name') if client else None) or None,
        'management_post': company.get('management_post') or 'Генеральный директор',
        'contact_name': (client.get('contact_name') if client else None) or '',
        'contact_phone': (client.get('contact_phone') if client else None) or '',
        'contact_email': (client.get('contact_email') if client else None) or ''
    }

    # Генерируем PDF
    from document_generator import generate_contract_pdf
    pdf_bytes = generate_contract_pdf(
        client_info=client_info,
        services=services,
        total_amount=contract['total_amount'],
        contract_number=contract['contract_number']
    )

    # URL-кодируем имя файла для кириллицы
    filename = f"Договор_{contract['contract_number']}.pdf"
    filename_encoded = url_quote(filename)

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f"attachment; filename*=UTF-8''{filename_encoded}"
        }
    )


# --- Отправка документов ---
@app.post("/api/employee/clients/{client_id}/send-documents")
async def api_employee_send_documents(
    client_id: int,
    document_type: str,  # quote, contract, invoice
    document_id: int,
    background_tasks: BackgroundTasks,
    user: Dict = Depends(require_employee)
):
    """Отправить документы клиенту на email"""
    client = ClientDB.get_by_id(client_id)
    if not client:
        raise HTTPException(status_code=404, detail="Клиент не найден")

    if not client.get('contact_email'):
        raise HTTPException(status_code=400, detail="У клиента не указан email")

    # TODO: Интеграция с email_service для отправки документов
    # Пока просто логируем

    InteractionDB.create({
        'client_id': client_id,
        'manager_id': user["id"],
        'type': 'email',
        'subject': f'Отправлен {document_type}',
        'description': f'Документ #{document_id} отправлен на {client["contact_email"]}'
    })

    return {"success": True, "message": f"Документ отправлен на {client['contact_email']}"}


# ======================== ТЕСТ ТН ВЭД ========================

# Загружаем базу ТН ВЭД из JSON при старте (с кэшированием)
_tnved_data = None
_tnved_stats_cache = None
_timeline_data_cache = None

def get_tnved_data():
    """Загрузить данные ТН ВЭД из JSON"""
    global _tnved_data
    if _tnved_data is None:
        import json
        json_path = os.path.join(os.path.dirname(__file__), 'data', 'tnved.json')
        try:
            with open(json_path, 'r', encoding='utf-8') as f:
                _tnved_data = json.load(f)
            logger.info(f"Loaded {len(_tnved_data)} TNVED codes from JSON")
        except FileNotFoundError:
            logger.warning("TNVED JSON not found, returning empty list")
            _tnved_data = []
    return _tnved_data

def get_tnved_stats_cached():
    """Закэшированная статистика ТН ВЭД"""
    global _tnved_stats_cache
    if _tnved_stats_cache is None:
        data = get_tnved_data()
        total = len(data) if data else 0
        mandatory = 0
        experimental = 0
        for category in CATEGORIES_DATA:
            for subcategory in category.get("subcategories", []):
                for product in subcategory.get("products", []):
                    status = product.get("marking_status", "not_required")
                    if status == "mandatory":
                        mandatory += 1
                    elif status == "experiment":
                        experimental += 1
        _tnved_stats_cache = {
            "loaded": True,
            "total": total,
            "mandatory": mandatory,
            "experimental": experimental,
            "not_required": total - mandatory - experimental
        }
    return _tnved_stats_cache

def get_timeline_data_cached():
    """Закэшированные данные timeline"""
    global _timeline_data_cache
    if _timeline_data_cache is None:
        try:
            timeline_path = os.path.join(os.path.dirname(__file__), 'data', 'marking_timeline.json')
            if os.path.exists(timeline_path):
                with open(timeline_path, 'r', encoding='utf-8') as f:
                    _timeline_data_cache = json.load(f)
                logger.info("Loaded marking_timeline.json")
        except Exception as e:
            logger.error(f"Failed to load marking_timeline.json: {e}")
            _timeline_data_cache = {}
    return _timeline_data_cache


@app.get("/api/tnved/search")
async def api_tnved_search(q: str = "", limit: int = 50):
    """Поиск по базе ТН ВЭД"""
    if not q or len(q) < 2:
        return {"results": [], "query": q}

    data = get_tnved_data()
    q_lower = q.lower()
    q_digits = q.replace(' ', '')

    results = []
    for item in data:
        # Поиск по коду
        if q_digits.isdigit():
            if item['code'].startswith(q_digits):
                results.append(item)
        # Поиск по названию
        elif q_lower in item['name'].lower():
            results.append(item)

        if len(results) >= limit:
            break

    return {"results": results, "query": q, "count": len(results)}


@app.get("/api/tnved/stats")
async def api_tnved_stats():
    """Статистика: всего кодов из tnved.json, обязательных/эксперимент из CATEGORIES_DATA"""
    return get_tnved_stats_cached()


# ======================== TIMELINE API ========================

def get_timeline_stats_with_upcoming():
    """Расчёт статистики с ближайшими дедлайнами"""
    from datetime import datetime, timedelta

    data = get_timeline_data_cached()
    if not data:
        return {
            "active": 0,
            "partial": 0,
            "upcoming_count": 0,
            "upcoming_events": []
        }

    categories = data.get("categories", {})
    today = datetime.now().date()
    six_months_later = today + timedelta(days=180)

    active = 0
    partial = 0
    upcoming_events = []

    for cat_name, cat_data in categories.items():
        status = cat_data.get("status", "")
        if status == "active":
            active += 1
        elif status == "partial":
            partial += 1

        # Собираем будущие события
        for event in cat_data.get("events", []):
            if not event.get("is_completed", False):
                date_str = event.get("date", "")
                if date_str:
                    try:
                        event_date = datetime.strptime(date_str, "%Y-%m-%d").date()
                        if today < event_date <= six_months_later:
                            upcoming_events.append({
                                "date": date_str,
                                "date_display": event.get("date_display", ""),
                                "category": cat_name,
                                "title": event.get("title", ""),
                                "type_label": event.get("type_label", ""),
                                "description": event.get("description", "")[:200] if event.get("description") else ""
                            })
                    except:
                        pass

    # Сортируем по дате
    upcoming_events.sort(key=lambda x: x["date"])

    return {
        "active": active,
        "partial": partial,
        "upcoming_count": len(upcoming_events),
        "upcoming_events": upcoming_events[:10]  # Топ 10 ближайших
    }

@app.get("/api/marking/timeline/stats")
async def api_timeline_stats():
    """Статистика по срокам маркировки с ближайшими дедлайнами"""
    stats = get_timeline_stats_with_upcoming()
    return {"statistics": stats}


@app.get("/api/marking/timeline")
async def api_timeline():
    """Полные данные по срокам маркировки"""
    data = get_timeline_data_cached()
    if not data:
        return {"categories": {}, "groups": [], "statistics": {}}

    return data


@app.get("/api/marking/timeline/category/{category_id}")
async def api_timeline_category(category_id: str):
    """Данные по конкретной категории"""
    data = get_timeline_data_cached()
    if not data or "categories" not in data:
        raise HTTPException(status_code=404, detail="Category not found")

    categories = data.get("categories", {})

    if category_id in categories:
        return categories[category_id]

    from urllib.parse import unquote
    decoded_id = unquote(category_id)
    for cat_name, cat_data in categories.items():
        if cat_name == decoded_id or cat_data.get("id") == category_id:
            return cat_data

    raise HTTPException(status_code=404, detail="Category not found")


# ======================== PILOT EXPERIMENTS API ========================

def get_pilot_experiments_data():
    """Load pilot_experiments.json"""
    try:
        path = os.path.join(os.path.dirname(__file__), 'data', 'pilot_experiments.json')
        if os.path.exists(path):
            with open(path, 'r', encoding='utf-8') as f:
                return json.load(f)
    except Exception as e:
        logger.error(f"Failed to load pilot_experiments.json: {e}")
    return None


@app.get("/api/pilot/experiments")
async def api_pilot_experiments():
    """Список всех пилотных экспериментов"""
    data = get_pilot_experiments_data()
    if not data:
        return {"experiments": [], "total": 0, "active_count": 0, "completed_count": 0}

    return {
        "experiments": list(data.get("experiments", {}).values()),
        "total": data.get("total_experiments", 0),
        "active_count": data.get("active_count", 0),
        "completed_count": data.get("completed_count", 0)
    }


@app.get("/api/pilot/stats")
async def api_pilot_stats():
    """Статистика по пилотным проектам"""
    data = get_pilot_experiments_data()
    if not data:
        return {"total": 0, "active": 0, "completed": 0, "products_count": 0}

    total_products = sum(
        exp.get("products_count", 0)
        for exp in data.get("experiments", {}).values()
    )

    return {
        "total": data.get("total_experiments", 0),
        "active": data.get("active_count", 0),
        "completed": data.get("completed_count", 0),
        "products_count": total_products
    }


# ======================== PARTNER API ========================

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

@app.get("/api/employee/partners")
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

@app.post("/api/employee/partners")
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

@app.get("/api/employee/partners/{partner_id}")
async def get_partner(partner_id: int, current_user: dict = Depends(require_employee)):
    """Получить партнёра по ID"""
    partner = PartnerDB.get_by_id(partner_id)
    if not partner:
        raise HTTPException(status_code=404, detail="Partner not found")

    # Получаем статистику
    stats = PartnerDB.get_stats(partner_id)

    return {
        "partner": partner,
        "stats": stats
    }

@app.put("/api/employee/partners/{partner_id}")
async def update_partner(partner_id: int, data: PartnerUpdateRequest, current_user: dict = Depends(require_employee)):
    """Обновить партнёра"""
    update_data = {k: v for k, v in data.dict().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="No data to update")

    success = PartnerDB.update(partner_id, update_data)
    if not success:
        raise HTTPException(status_code=404, detail="Partner not found")

    return {"success": True}

@app.post("/api/employee/partners/{partner_id}/activate")
async def activate_partner(partner_id: int, current_user: dict = Depends(require_employee)):
    """Активировать партнёра"""
    success = PartnerDB.activate(partner_id)
    if not success:
        raise HTTPException(status_code=404, detail="Partner not found")
    return {"success": True}

@app.post("/api/employee/partners/{partner_id}/deactivate")
async def deactivate_partner(partner_id: int, current_user: dict = Depends(require_employee)):
    """Деактивировать партнёра"""
    success = PartnerDB.deactivate(partner_id)
    if not success:
        raise HTTPException(status_code=404, detail="Partner not found")
    return {"success": True}

@app.post("/api/employee/partners/{partner_id}/invite")
async def send_partner_invite(partner_id: int, current_user: dict = Depends(require_employee)):
    """Отправить приглашение партнёру"""
    partner = PartnerDB.get_by_id(partner_id)
    if not partner:
        raise HTTPException(status_code=404, detail="Partner not found")

    try:
        import secrets
        import hashlib

        # Генерируем короткий пароль (8 символов)
        new_password = secrets.token_hex(4)

        # Хэшируем тем же методом что и в database.py (pbkdf2_hmac)
        salt = secrets.token_hex(16)
        hash_obj = hashlib.pbkdf2_hmac('sha256', new_password.encode(), salt.encode(), 100000)
        hashed_password = f"{salt}${hash_obj.hex()}"

        # Обновляем пароль пользователя
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute('UPDATE users SET password_hash = ? WHERE id = ?',
                          (hashed_password, partner['user_id']))

        # Отправляем email с приглашением
        from email_service import send_partner_invitation_email
        send_partner_invitation_email(
            to_email=partner['contact_email'],
            password=new_password,
            ref_code=partner['ref_code'],
            contact_name=partner['contact_name']
        )

        # Активируем партнёра
        PartnerDB.activate(partner_id)

        return {"success": True, "message": "Приглашение отправлено"}
    except Exception as e:
        logger.error(f"Failed to send partner invite: {e}")
        raise HTTPException(status_code=500, detail=f"Ошибка отправки: {str(e)}")

@app.delete("/api/employee/partners/{partner_id}")
async def delete_partner(partner_id: int, current_user: dict = Depends(require_employee)):
    """Удалить партнёра (для сотрудников)"""
    success = PartnerDB.delete(partner_id)
    if not success:
        raise HTTPException(status_code=404, detail="Partner not found")
    return {"success": True}

@app.delete("/api/admin/partners/{partner_id}")
async def admin_delete_partner(partner_id: int, current_user: dict = Depends(require_superadmin)):
    """Удалить партнёра (для супер-админов)"""
    success = PartnerDB.delete(partner_id)
    if not success:
        raise HTTPException(status_code=404, detail="Partner not found")
    return {"success": True}

# Partner cabinet API
@app.get("/api/partner/me")
async def get_partner_me(current_user: dict = Depends(require_auth)):
    """Получить данные текущего партнёра"""
    if current_user.get('role') != 'partner':
        raise HTTPException(status_code=403, detail="Not a partner")

    partner = PartnerDB.get_by_user_id(current_user['id'])
    if not partner:
        raise HTTPException(status_code=404, detail="Partner not found")

    return {"partner": partner}

@app.get("/api/partner/stats")
async def get_partner_stats(current_user: dict = Depends(require_auth)):
    """Получить статистику партнёра"""
    if current_user.get('role') != 'partner':
        raise HTTPException(status_code=403, detail="Not a partner")

    partner = PartnerDB.get_by_user_id(current_user['id'])
    if not partner:
        raise HTTPException(status_code=404, detail="Partner not found")

    stats = PartnerDB.get_stats(partner['id'])
    return stats

@app.get("/api/partner/leads")
async def get_partner_leads(current_user: dict = Depends(require_auth)):
    """Получить клиентов партнёра"""
    if current_user.get('role') != 'partner':
        raise HTTPException(status_code=403, detail="Not a partner")

    partner = PartnerDB.get_by_user_id(current_user['id'])
    if not partner:
        raise HTTPException(status_code=404, detail="Partner not found")

    leads = PartnerDB.get_leads(partner['id'])
    return {"leads": leads}

# Public API for ref code validation
@app.get("/api/ref/{ref_code}")
async def validate_ref_code(ref_code: str):
    """Проверить валидность реферального кода"""
    partner = PartnerDB.get_by_ref_code(ref_code)
    if not partner:
        raise HTTPException(status_code=404, detail="Invalid ref code")

    return {
        "valid": True,
        "partner_name": partner.get('company_name') or partner.get('contact_name')
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
