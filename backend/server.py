from fastapi import FastAPI, HTTPException, BackgroundTasks, Depends
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
from datetime import datetime
from urllib.parse import quote as url_quote

# Импорт генератора документов
from document_generator import generate_contract_pdf, generate_quote_pdf, generate_act_pdf

# Импорт авторизации и БД
from auth import (
    UserRegister, UserLogin, register_user, login_user,
    get_current_user, require_auth, require_admin, require_superadmin
)
from database import (
    CompanyDB, QuoteDB, ContractDB, CallbackDB, UserDB,
    get_next_contract_number, get_db
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
                {"id": "beer_alcohol_220300", "name": "пиво крепостью от 0,5 % до 8,6 % включительно,; пиво крепостью свыше 8", "tnved": "2203 00", "marking_status": "mandatory"},
                {"id": "beer_alcohol_220600", "name": "пиво крепостью от 0,5 % до 8,6 % включительно,; пиво крепостью свыше 8", "tnved": "2206 00", "marking_status": "mandatory"},
                {"id": "beer_alcohol_2206003100", "name": "сидр, пуаре", "tnved": "2206 00 310 0", "marking_status": "mandatory"},
                {"id": "beer_alcohol_2206005100", "name": "сидр, пуаре", "tnved": "2206 00 510 0", "marking_status": "mandatory"},
                {"id": "beer_alcohol_2206008100", "name": "сидр, пуаре", "tnved": "2206 00 810 0", "marking_status": "mandatory"},
                {"id": "beer_alcohol_2206003901", "name": "напитки слабоалкогольные брожения", "tnved": "2206 00 390 1", "marking_status": "mandatory"},
                {"id": "beer_alcohol_2206005901", "name": "напитки слабоалкогольные брожения", "tnved": "2206 00 590 1", "marking_status": "mandatory"},
                {"id": "beer_alcohol_2206008901", "name": "напитки слабоалкогольные брожения", "tnved": "2206 00 890 1", "marking_status": "mandatory"}
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
                {"id": "water_2201220110", "name": "Природные минеральные воды, газированные;", "tnved": "2201, в том числе 2201 10", "marking_status": "mandatory"},
                {"id": "water_2201220190", "name": "Воды, включая природные или искусственные минеральные, газированные, б", "tnved": "2201, в том числе 2201 90 000 0", "marking_status": "mandatory"},
                {"id": "water_108610310", "name": "Код 10.86.10.310", "tnved": "10.86.10.310", "marking_status": "mandatory"}
            ]},
            {"id": "tobacco", "name": "Табак", "icon": "cigarette", "products": [
                {"id": "tobacco_2402209000", "name": "сигареты", "tnved": "2402 20 900 0", "marking_status": "mandatory"},
                {"id": "tobacco_2402100000", "name": "табак для кальяна, сигары, сигары с обрезанными концами (черуты), сига", "tnved": "2402 10 000 0", "marking_status": "mandatory"},
                {"id": "tobacco_2403110000", "name": "табак для кальяна, сигары, сигары с обрезанными концами (черуты), сига", "tnved": "2403 11 000 0", "marking_status": "mandatory"},
                {"id": "tobacco_2403999008", "name": "табачные изделия, предназначенные для потребления путем нагревания;; к", "tnved": "2403 99 900 8", "marking_status": "mandatory"},
                {"id": "tobacco_2402201000", "name": "табак для кальяна, сигары, сигары с обрезанными концами (черуты), сига", "tnved": "2402 20 100 0", "marking_status": "mandatory"},
                {"id": "tobacco_2403191000", "name": "табак для кальяна, сигары, сигары с обрезанными концами (черуты), сига", "tnved": "2403 19 100 0", "marking_status": "mandatory"},
                {"id": "tobacco_2403991000", "name": "табак для кальяна, сигары, сигары с обрезанными концами (черуты), сига", "tnved": "2403 99 100 0", "marking_status": "mandatory"},
                {"id": "tobacco_2404110009", "name": "табачные изделия, предназначенные для потребления путем нагревания;; к", "tnved": "2404 11 000 9", "marking_status": "mandatory"},
                {"id": "tobacco_2404120000", "name": "Жидкости для электронных систем доставки никотина, в том числе безнико", "tnved": "2404 12 000 0", "marking_status": "mandatory"},
                {"id": "tobacco_2404190001", "name": "табачные изделия, предназначенные для потребления путем нагревания;; к", "tnved": "2404 19 000 1", "marking_status": "mandatory"},
                {"id": "tobacco_2404190009", "name": "Жидкости для электронных систем доставки никотина, в том числе безнико", "tnved": "2404 19 000 9", "marking_status": "mandatory"},
                {"id": "tobacco_2404110001", "name": "табачные изделия, предназначенные для потребления путем нагревания;; к", "tnved": "2404 11 000 1", "marking_status": "mandatory"}
            ]},
            {"id": "seafood", "name": "Морепродукты (икра)", "icon": "fish", "products": [
                {"id": "seafood_1604310000", "name": "Икра осетровых", "tnved": "1604310000", "marking_status": "mandatory"},
                {"id": "seafood_1604320010", "name": "Заменители икры осетровых: икра лососевых (красная икра)", "tnved": "1604320010", "marking_status": "mandatory"},
                {"id": "seafood_0305200000", "name": "Печень, икра и молоки рыб, сушеные, копченые, соленые или в рассоле", "tnved": "0305200000", "marking_status": "mandatory"},
                {"id": "seafood_0302910000", "name": "Печень, икра и молоки, свежие или охлажденные", "tnved": "0302910000", "marking_status": "mandatory"},
                {"id": "seafood_0303911000", "name": "Икра и молоки для производства дезоксирибонуклеиновой кислоты или суль", "tnved": "0303911000", "marking_status": "mandatory"},
                {"id": "seafood_0303919000", "name": "Прочие печень, икра и молоки, мороженые", "tnved": "0303919000", "marking_status": "mandatory"}
            ]},
            {"id": "oils", "name": "Растительные масла", "icon": "flask", "products": [
                {"id": "oils_1507109001", "name": "Отдельные виды пищевых растительных масел и масложировой продукции, уп", "tnved": "1507 10 900 1507 90 900 1508 10 900 0 1508 90 900 0 1509 1510 1511 10 900 1511 90 110 0 1511 90 190 1511 90 990 1512 11 910 1512 11 990 1512 19 900 1512 21 900 0 1512 29 900 0 1513 11 910 0 1513 11 990 1513 19 110 0 1513 19 190 1513 19 910 0 1513 19 990 1513 21 300 0 1513 21 900 1513 29 110 0 1513 29 190 1513 29 500 0 1513 29 900 1514 11 900 1514 19 900 1514 91 900 1514 99 900 1515 11 000 0 1515 19 900 0 1515 21 900 0 1515 29 900 0 1515 30 900 0 1515 50 190 0 1515 50 990 0 1515 90 110 0 1515 90 290 0 1515 90 390 0 1515 90 610 0 1515 90 690 0 1515 90 810 0 1515 90 890 0 1516 20 810 0 1516 20 960 1516 20 980 1517 1804 00 000 0", "marking_status": "mandatory"}
            ]},
            {"id": "pet_food", "name": "Корма для животных", "icon": "paw", "products": [
                {"id": "pet_food_109210100", "name": "Сухой корм", "tnved": "10.92.10.100", "marking_status": "mandatory"},
                {"id": "pet_food_109210110", "name": "Сухой корм животного происхождения", "tnved": "10.92.10.110", "marking_status": "mandatory"},
                {"id": "pet_food_109210111", "name": "Сухой корм животного происхождения для собак", "tnved": "10.92.10.111", "marking_status": "mandatory"},
                {"id": "pet_food_109210112", "name": "Сухой корм животного происхождения для кошек", "tnved": "10.92.10.112", "marking_status": "mandatory"},
                {"id": "pet_food_109210119", "name": "Сухой корм животного происхождения для прочих животных", "tnved": "10.92.10.119", "marking_status": "mandatory"},
                {"id": "pet_food_109210120", "name": "Сухой корм растительного происхождения", "tnved": "10.92.10.120", "marking_status": "mandatory"},
                {"id": "pet_food_109210190", "name": "Сухой корм прочий", "tnved": "10.92.10.190", "marking_status": "mandatory"},
                {"id": "pet_food_109210191", "name": "Сухой корм прочий для собак", "tnved": "10.92.10.191", "marking_status": "mandatory"},
                {"id": "pet_food_109210192", "name": "Сухой корм прочий для кошек", "tnved": "10.92.10.192", "marking_status": "mandatory"},
                {"id": "pet_food_109210199", "name": "Сухой корм прочий для прочих животных", "tnved": "10.92.10.199", "marking_status": "mandatory"},
                {"id": "pet_food_109210200", "name": "Влажный корм", "tnved": "10.92.10.200", "marking_status": "mandatory"},
                {"id": "pet_food_109210210", "name": "Влажный корм животного происхождения", "tnved": "10.92.10.210", "marking_status": "mandatory"},
                {"id": "pet_food_109210211", "name": "Влажный корм животного происхождения для собак", "tnved": "10.92.10.211", "marking_status": "mandatory"},
                {"id": "pet_food_109210212", "name": "Влажный корм животного происхождения для кошек", "tnved": "10.92.10.212", "marking_status": "mandatory"},
                {"id": "pet_food_109210219", "name": "Влажный корм животного происхождения для прочих животных", "tnved": "10.92.10.219", "marking_status": "mandatory"},
                {"id": "pet_food_109210220", "name": "Влажный корм растительного происхождения", "tnved": "10.92.10.220", "marking_status": "mandatory"},
                {"id": "pet_food_109210290", "name": "Влажный корм прочий", "tnved": "10.92.10.290", "marking_status": "mandatory"},
                {"id": "pet_food_109210291", "name": "Влажный корм прочий для собак", "tnved": "10.92.10.291", "marking_status": "mandatory"},
                {"id": "pet_food_109210292", "name": "Влажный корм прочий для кошек", "tnved": "10.92.10.292", "marking_status": "mandatory"},
                {"id": "pet_food_109210299", "name": "Влажный корм прочий для прочих животных", "tnved": "10.92.10.299", "marking_status": "mandatory"}
            ]},
            {"id": "canned", "name": "Консервированные продукты", "icon": "archive", "products": [
                {"id": "canned_1604160431", "name": "Рыбная консервная продукция и консервированная продукция из морепродук", "tnved": "1604 (кроме 1604 31 000 0, 1604 32 001 0), 1605 (кроме 1605 21 100 0, 1605 21 900 0), 2104 20 00", "marking_status": "mandatory"},
                {"id": "canned_1602200121", "name": "Мясная и плодоовощная консервация", "tnved": "1602, 2001, 2104 20 00, 2002, 2003, 2005 (кроме 2005 20), 2006 00, 2007 (кроме компотов и прочих напитков без содержания ягод или фруктов), 2008 (кроме 2008 11 и 2008 19)", "marking_status": "mandatory"}
            ]},
            {"id": "grocery", "name": "Бакалея", "icon": "shopping-basket", "products": [
                {"id": "grocery_1904101000", "name": "Снековая продукция (чипсы, начос, сухарики, гренки, кукурузные палочки", "tnved": "1904 10 100 0 1904 10 300 0 1904 10 900 0 1905 10 000 0 1905 40 100 0 1905 40 900 0 1905 90 550 0 1905 90 900 0 2005 20 200 0 2005 20 800 0", "marking_status": "mandatory"},
                {"id": "grocery_0712200000", "name": "Соусы, специи, приправы, пряности, сухие бульоны, сухие супы и уксусы", "tnved": "0712 20 000 0 0712 90 900 0 0904 0905 0906 0907 0908 0909 0910 1211 90 860 8 (в части пищевой продукции, за исключением смесей для изготовления напитков) 2103 2104 10 000 0 2209 00", "marking_status": "mandatory"}
            ]},
            {"id": "soft_drinks", "name": "Безалкогольные напитки", "icon": "glass-water", "products": [
                {"id": "soft_drinks_2202100000", "name": "11.07.19.131, 11.07.19.132, 11.07.19.134, 11.07.19.135, 11.07.19.136, ", "tnved": "2202 10 000 0, 2202 99 180 0, 2206 00 590 1, 2206 00 890 1", "marking_status": "mandatory"}
            ]},
            {"id": "non_alc_beer", "name": "Безалкогольное пиво", "icon": "beer", "products": [
                {"id": "non_alc_beer_2202910000", "name": "Безалкогольное пиво", "tnved": "2202 91 000 0", "marking_status": "mandatory"}
            ]},
            {"id": "sweets", "name": "Сладости", "icon": "candy", "products": [
                {"id": "sweets_1704", "name": "Кондитерские изделия из сахара (включая белый шоколад), не содержащие ", "tnved": "1704", "marking_status": "mandatory"},
                {"id": "sweets_1806180610", "name": "Шоколадные, ореховые и иные пасты", "tnved": "1806 (за исключением 1806 10, 1806 90 700 0)", "marking_status": "mandatory"},
                {"id": "sweets_1905190510", "name": "Мучные кондитерские изделия, пирожные, печенье и прочие хлебобулочные ", "tnved": "1905 (за исключением 1905 10 000 0, 1905 40, 1905 90 100 0, 1905 90 300 0, 1905 90 550 0, 1905 90 600 0, 1905 90 900 0)", "marking_status": "mandatory"},
                {"id": "sweets_200600", "name": "Овощи, фрукты, орехи, кожура плодов и другие части растений, консервир", "tnved": "2006 00", "marking_status": "mandatory"},
                {"id": "sweets_2007", "name": "Джемы, желе фруктовое, мармелады, пюре фруктовое или ореховое, паста ф", "tnved": "2007", "marking_status": "mandatory"},
                {"id": "sweets_2008", "name": "Фрукты, орехи и прочие съедобные части растений, приготовленные или ко", "tnved": "2008", "marking_status": "mandatory"},
                {"id": "sweets_2106210690", "name": "Сахаристые кондитерские изделия", "tnved": "2106 (за исключением 2106 90 980 1, 2106 90 980 2)", "marking_status": "mandatory"}
            ]},
            {"id": "instant_drinks", "name": "Растворимые напитки", "icon": "coffee", "products": [
                {"id": "instant_drinks_1806109000", "name": "Какао-порошок без добавок сахара или других подслащивающих веществ; ка", "tnved": "1806 10 900 0", "marking_status": "mandatory"},
                {"id": "instant_drinks_2106909808", "name": "Какао-порошок без добавок сахара или других подслащивающих веществ; ка", "tnved": "2106 90 980 8", "marking_status": "mandatory"},
                {"id": "instant_drinks_1805000000", "name": "Какао-порошок без добавок сахара или других подслащивающих веществ; ка", "tnved": "1805 00 000 0", "marking_status": "mandatory"},
                {"id": "instant_drinks_1806907000", "name": "Какао-порошок без добавок сахара или других подслащивающих веществ; ка", "tnved": "1806 90 700 0", "marking_status": "mandatory"},
                {"id": "instant_drinks_0902", "name": "Чай со вкусо-ароматическими добавками или без них;; Мате, или парагвай", "tnved": "0902", "marking_status": "mandatory"},
                {"id": "instant_drinks_0903000000", "name": "Чай со вкусо-ароматическими добавками или без них;; Мате, или парагвай", "tnved": "0903 00 000 0", "marking_status": "mandatory"},
                {"id": "instant_drinks_1211200000", "name": "Чай со вкусо-ароматическими добавками или без них;; Мате, или парагвай", "tnved": "1211 20 000 0", "marking_status": "mandatory"},
                {"id": "instant_drinks_1211908608", "name": "Чай со вкусо-ароматическими добавками или без них;; Мате, или парагвай", "tnved": "1211 90 860 8", "marking_status": "mandatory"},
                {"id": "instant_drinks_2101", "name": "Чай со вкусо-ароматическими добавками или без них;; Мате, или парагвай", "tnved": "2101", "marking_status": "mandatory"},
                {"id": "instant_drinks_0901", "name": "Кофе, жареный или нежареный, с кофеином или без кофеина; заменители ко", "tnved": "0901", "marking_status": "mandatory"}
            ]}
        ]
    },
    {
        "id": "pharma",
        "name": "Фармацевтика и здоровье",
        "icon": "pill",
        "subcategories": [
            {"id": "medicines", "name": "Лекарства", "icon": "pill", "products": [
                {"id": "medicines_3004300230", "name": "Код 3004 (кроме 3002, 3005 или 3006)", "tnved": "3004 (кроме 3002, 3005 или 3006)", "marking_status": "mandatory"},
                {"id": "medicines_3002150000", "name": "Код 3002150000", "tnved": "3002150000", "marking_status": "mandatory"}
            ]},
            {"id": "tsr", "name": "Технические средства реабилитации (ТСР)", "icon": "accessibility", "products": [
                {"id": "tsr_6602000000", "name": "трости опорные и тактильные, костыли, опоры, поручни;", "tnved": "6602 00 000 0", "marking_status": "mandatory"},
                {"id": "tsr_7326", "name": "трости опорные и тактильные, костыли, опоры, поручни;", "tnved": "7326", "marking_status": "mandatory"},
                {"id": "tsr_9021101000", "name": "трости опорные и тактильные, костыли, опоры, поручни;", "tnved": "9021 10 100 0", "marking_status": "mandatory"},
                {"id": "tsr_9021909009", "name": "трости опорные и тактильные, костыли, опоры, поручни;", "tnved": "9021 90 900 9", "marking_status": "mandatory"},
                {"id": "tsr_9403", "name": "трости опорные и тактильные, костыли, опоры, поручни;", "tnved": "9403", "marking_status": "mandatory"},
                {"id": "tsr_9620000009", "name": "трости опорные и тактильные, костыли, опоры, поручни;", "tnved": "9620 00 000 9", "marking_status": "mandatory"},
                {"id": "tsr_6212900000", "name": "ортезы, функциональные узлы протезов (из категории товаров \"части и п", "tnved": "6212 90 000 0", "marking_status": "mandatory"},
                {"id": "tsr_9021399000", "name": "ортезы, функциональные узлы протезов (из категории товаров \"части и п", "tnved": "9021 39 900 0", "marking_status": "mandatory"},
                {"id": "tsr_9019109009", "name": "противопролежневые матрацы и подушки;", "tnved": "9019 10 900 9", "marking_status": "mandatory"},
                {"id": "tsr_940421", "name": "противопролежневые матрацы и подушки;", "tnved": "9404 21", "marking_status": "mandatory"},
                {"id": "tsr_9404299000", "name": "противопролежневые матрацы и подушки;", "tnved": "9404 29 900 0", "marking_status": "mandatory"},
                {"id": "tsr_3006910000", "name": "специальные средства при нарушениях функций выделения (моче- и калопри", "tnved": "3006 91 000 0", "marking_status": "mandatory"},
                {"id": "tsr_9018390000", "name": "специальные средства при нарушениях функций выделения (моче- и калопри", "tnved": "9018 39 000 0", "marking_status": "mandatory"},
                {"id": "tsr_9401790009", "name": "кресла-стулья с санитарным оснащением;", "tnved": "9401 79 000 9", "marking_status": "mandatory"},
                {"id": "tsr_9402900000", "name": "кресла-стулья с санитарным оснащением;", "tnved": "9402 90 000 0", "marking_status": "mandatory"},
                {"id": "tsr_8713100000", "name": "кресла-стулья с санитарным оснащением;", "tnved": "8713 10 000 0", "marking_status": "mandatory"},
                {"id": "tsr_3926909200", "name": "специальные средства при нарушениях функций выделения (моче- и калопри", "tnved": "3926 90 920 0", "marking_status": "mandatory"},
                {"id": "tsr_3926909709", "name": "специальные средства при нарушениях функций выделения (моче- и калопри", "tnved": "3926 90 970 9", "marking_status": "mandatory"}
            ]},
            {"id": "vet", "name": "Ветеринарные препараты", "icon": "stethoscope", "products": [
                {"id": "vet_3002120002", "name": "Код 3002 12 000 2", "tnved": "3002 12 000 2", "marking_status": "mandatory"},
                {"id": "vet_3002150000", "name": "Код 3002 15 000 0", "tnved": "3002 15 000 0", "marking_status": "mandatory"},
                {"id": "vet_2936900009", "name": "Код 2936 90 000 9", "tnved": "2936 90 000 9", "marking_status": "mandatory"},
                {"id": "vet_2941900009", "name": "Код 2941 90 000 9", "tnved": "2941 90 000 9", "marking_status": "mandatory"},
                {"id": "vet_3001209000", "name": "Код 3001 20 900 0", "tnved": "3001 20 900 0", "marking_status": "mandatory"},
                {"id": "vet_3002120003", "name": "Код 3002 12 000 3", "tnved": "3002 12 000 3", "marking_status": "mandatory"},
                {"id": "vet_3002120009", "name": "Код 3002 12 000 9", "tnved": "3002 12 000 9", "marking_status": "mandatory"},
                {"id": "vet_3002420000", "name": "Код 3002 42 000 0 (за исключением вакцин, имеющих температурный режим ", "tnved": "3002 42 000 0 (за исключением вакцин, имеющих температурный режим хранения и транспортирования минус 60 градусов Цельсия или ниже)", "marking_status": "mandatory"},
                {"id": "vet_3002903000", "name": "Код 3002 90 300 0", "tnved": "3002 90 300 0", "marking_status": "mandatory"}
            ]},
            {"id": "pharma_raw", "name": "Фармацевтическое сырьё, лекарственные средства", "icon": "flask", "products": []},
            {"id": "medical_devices", "name": "Медицинские изделия", "icon": "heart-pulse", "products": [
                {"id": "medical_devices_9021101000", "name": "250220250230250250250260320560343610", "tnved": "9021 10 100 0", "marking_status": "mandatory"},
                {"id": "medical_devices_9021400000", "name": "113850173110202800202810204370210000228560302870", "tnved": "9021 40 000 0", "marking_status": "mandatory"},
                {"id": "medical_devices_9021909001", "name": "135820155760155800155820218190273880343410343540", "tnved": "9021 90 900 1", "marking_status": "mandatory"},
                {"id": "medical_devices_3926200000", "name": "1225401225601226101226301226401298001299001302201393101393501393601565", "tnved": "3926 20 000 04015 12 000 14015 12 000 94015 19 000 0", "marking_status": "mandatory"},
                {"id": "medical_devices_8421392008", "name": "131980152690152700182750209360292620336330375930", "tnved": "8421 39 200 88421 39 800 68539 49 000 09018 20 000 0", "marking_status": "mandatory"},
                {"id": "medical_devices_9022120000", "name": "135190142570280730282030", "tnved": "9022 12 000 09022 13 000 09022 14 000 09022 19 000 0", "marking_status": "mandatory"},
                {"id": "medical_devices_961900890", "name": "233730233900280360320550331320331330331830356150126750233860343580", "tnved": "9619 00 890", "marking_status": "mandatory"}
            ]},
            {"id": "supplements", "name": "БАД", "icon": "apple", "products": [
                {"id": "supplements_2202991800", "name": "Код 2202 99 180 0", "tnved": "2202 99 180 0", "marking_status": "mandatory"},
                {"id": "supplements_2202999100", "name": "Код 2202 99 910 0", "tnved": "2202 99 910 0", "marking_status": "mandatory"},
                {"id": "supplements_1602909909", "name": "Код 1602 90 990 9", "tnved": "1602 90 990 9", "marking_status": "mandatory"},
                {"id": "supplements_1904109000", "name": "Код 1904 10 900 0", "tnved": "1904 10 900 0", "marking_status": "mandatory"},
                {"id": "supplements_2202100000", "name": "Код 2202 10 000 0", "tnved": "2202 10 000 0", "marking_status": "mandatory"},
                {"id": "supplements_1704905500", "name": "Код 1704 90 550 0", "tnved": "1704 90 550 0", "marking_status": "mandatory"},
                {"id": "supplements_1806310000", "name": "Код 1806 31 000 0", "tnved": "1806 31 000 0", "marking_status": "mandatory"},
                {"id": "supplements_2106108000", "name": "Код 2106 10 800 0", "tnved": "2106 10 800 0", "marking_status": "mandatory"},
                {"id": "supplements_1806907000", "name": "Код 1806 90 700 0", "tnved": "1806 90 700 0", "marking_status": "mandatory"},
                {"id": "supplements_2106905800", "name": "Код 2106 90 580 0", "tnved": "2106 90 580 0", "marking_status": "mandatory"},
                {"id": "supplements_2106909801", "name": "Код 2106 90 980 1", "tnved": "2106 90 980 1", "marking_status": "mandatory"},
                {"id": "supplements_2106909808", "name": "Код 2106 90 980 8", "tnved": "2106 90 980 8", "marking_status": "mandatory"},
                {"id": "supplements_1211908608", "name": "Код 1211 90 860 8", "tnved": "1211 90 860 8", "marking_status": "mandatory"},
                {"id": "supplements_2101129201", "name": "Код 2101 12 920 1", "tnved": "2101 12 920 1", "marking_status": "mandatory"},
                {"id": "supplements_3002490001", "name": "Код 3002 49 000 1", "tnved": "3002 49 000 1", "marking_status": "mandatory"},
                {"id": "supplements_2936", "name": "Код 2936", "tnved": "2936", "marking_status": "mandatory"},
                {"id": "supplements_300120", "name": "Код 3001 20", "tnved": "3001 20", "marking_status": "mandatory"},
                {"id": "supplements_3002903000", "name": "Код 3002 90 300 0", "tnved": "3002 90 300 0", "marking_status": "mandatory"},
                {"id": "supplements_1204009000", "name": "Код 1204 00 900 0", "tnved": "1204 00 900 0", "marking_status": "mandatory"},
                {"id": "supplements_1208900000", "name": "Код 1208 90 000 0", "tnved": "1208 90 000 0", "marking_status": "mandatory"},
                {"id": "supplements_1210209000", "name": "Код 1210 20 900 0", "tnved": "1210 20 900 0", "marking_status": "mandatory"},
                {"id": "supplements_1212210000", "name": "Код 1212 21 000 0", "tnved": "1212 21 000 0", "marking_status": "mandatory"},
                {"id": "supplements_1302199000", "name": "Код 1302 19 900 0", "tnved": "1302 19 900 0", "marking_status": "mandatory"},
                {"id": "supplements_1504101000", "name": "Код 1504 10 100 0", "tnved": "1504 10 100 0", "marking_status": "mandatory"},
                {"id": "supplements_1504209000", "name": "Код 1504 20 900 0", "tnved": "1504 20 900 0", "marking_status": "mandatory"},
                {"id": "supplements_1515110000", "name": "Код 1515 11 000 0", "tnved": "1515 11 000 0", "marking_status": "mandatory"},
                {"id": "supplements_1515199000", "name": "Код 1515 19 900 0", "tnved": "1515 19 900 0", "marking_status": "mandatory"},
                {"id": "supplements_1515906900", "name": "Код 1515 90 690 0", "tnved": "1515 90 690 0", "marking_status": "mandatory"},
                {"id": "supplements_1515908900", "name": "Код 1515 90 890 0", "tnved": "1515 90 890 0", "marking_status": "mandatory"},
                {"id": "supplements_1516109000", "name": "Код 1516 10 900 0", "tnved": "1516 10 900 0", "marking_status": "mandatory"},
                {"id": "supplements_1517909900", "name": "Код 1517 90 990 0", "tnved": "1517 90 990 0", "marking_status": "mandatory"},
                {"id": "supplements_1702305000", "name": "Код 1702 30 500 0", "tnved": "1702 30 500 0", "marking_status": "mandatory"},
                {"id": "supplements_1702409000", "name": "Код 1702 40 900 0", "tnved": "1702 40 900 0", "marking_status": "mandatory"},
                {"id": "supplements_1702609500", "name": "Код 1702 60 950 0", "tnved": "1702 60 950 0", "marking_status": "mandatory"},
                {"id": "supplements_1702909500", "name": "Код 1702 90 950 0", "tnved": "1702 90 950 0", "marking_status": "mandatory"},
                {"id": "supplements_1704907100", "name": "Код 1704 90 710 0", "tnved": "1704 90 710 0", "marking_status": "mandatory"},
                {"id": "supplements_1704908200", "name": "Код 1704 90 820 0", "tnved": "1704 90 820 0", "marking_status": "mandatory"},
                {"id": "supplements_180632", "name": "Код 1806 32", "tnved": "1806 32", "marking_status": "mandatory"},
                {"id": "supplements_2106909300", "name": "Код 2106 90 930 0", "tnved": "2106 90 930 0", "marking_status": "mandatory"},
                {"id": "supplements_2106909803", "name": "Код 2106 90 980 3", "tnved": "2106 90 980 3", "marking_status": "mandatory"},
                {"id": "supplements_2922410000", "name": "Код 2922 41 000 0", "tnved": "2922 41 000 0", "marking_status": "mandatory"},
                {"id": "supplements_2922420000", "name": "Код 2922 42 000 0", "tnved": "2922 42 000 0", "marking_status": "mandatory"},
                {"id": "supplements_2923200000", "name": "Код 2923 20 000 0", "tnved": "2923 20 000 0", "marking_status": "mandatory"},
                {"id": "supplements_2923900009", "name": "Код 2923 90 000 9", "tnved": "2923 90 000 9", "marking_status": "mandatory"},
                {"id": "supplements_3002908000", "name": "Код 3002 90 800 0", "tnved": "3002 90 800 0", "marking_status": "mandatory"},
                {"id": "supplements_1212999509", "name": "Код 1212 99 950 9", "tnved": "1212 99 950 9", "marking_status": "mandatory"},
                {"id": "supplements_1302201000", "name": "Код 1302 20 100 0", "tnved": "1302 20 100 0", "marking_status": "mandatory"},
                {"id": "supplements_1302209000", "name": "Код 1302 20 900 0", "tnved": "1302 20 900 0", "marking_status": "mandatory"},
                {"id": "supplements_1504201000", "name": "Код 1504 20 100 0", "tnved": "1504 20 100 0", "marking_status": "mandatory"},
                {"id": "supplements_1516101000", "name": "Код 1516 10 100 0", "tnved": "1516 10 100 0", "marking_status": "mandatory"},
                {"id": "supplements_1603001000", "name": "Код 1603 00 100 0", "tnved": "1603 00 100 0", "marking_status": "mandatory"},
                {"id": "supplements_1806903100", "name": "Код 1806 90 310 0", "tnved": "1806 90 310 0", "marking_status": "mandatory"},
                {"id": "supplements_1901909800", "name": "Код 1901 90 980 0", "tnved": "1901 90 980 0", "marking_status": "mandatory"},
                {"id": "supplements_2102201100", "name": "Код 2102 20 110 0", "tnved": "2102 20 110 0", "marking_status": "mandatory"},
                {"id": "supplements_2922498500", "name": "Код 2922 49 850 0", "tnved": "2922 49 850 0", "marking_status": "mandatory"},
                {"id": "supplements_2925290000", "name": "Код 2925 29 000 0", "tnved": "2925 29 000 0", "marking_status": "mandatory"},
                {"id": "supplements_3502907000", "name": "Код 3502 90 700 0", "tnved": "3502 90 700 0", "marking_status": "mandatory"},
                {"id": "supplements_350300", "name": "Код 3503 00", "tnved": "3503 00", "marking_status": "mandatory"},
                {"id": "supplements_3802100000", "name": "Код 3802 10 000 0", "tnved": "3802 10 000 0", "marking_status": "mandatory"},
                {"id": "supplements_3913100000", "name": "Код 3913 10 000 0", "tnved": "3913 10 000 0", "marking_status": "mandatory"},
                {"id": "supplements_1504109900", "name": "Код 1504 10 990 0", "tnved": "1504 10 990 0", "marking_status": "mandatory"},
                {"id": "supplements_350790900", "name": "Код 3507 90 900", "tnved": "3507 90 900", "marking_status": "mandatory"}
            ]},
            {"id": "antiseptics", "name": "Антисептики и дезинфицирующие средства", "icon": "spray-can", "products": []},
            {"id": "wheelchairs", "name": "Кресла-коляски", "icon": "wheelchair", "products": [
                {"id": "wheelchairs_8713100000", "name": "Кресла-коляски с ручным приводом (без механических устройств для перед", "tnved": "8713 10 0000", "marking_status": "mandatory"},
                {"id": "wheelchairs_8713900000", "name": "Кресла-коляски электрические (прочие, оснащенные двигателем или другим", "tnved": "8713 90 0000", "marking_status": "mandatory"},
                {"id": "wheelchairs_309220000", "name": "Коляски инвалидные, кроме частей и принадлежностей", "tnved": "30.92.20.000", "marking_status": "mandatory"},
                {"id": "wheelchairs_325050190", "name": "Изделия медицинские, в том числе хирургические, прочие, не включенные ", "tnved": "32.50.50.190", "marking_status": "mandatory"},
                {"id": "wheelchairs_309910190", "name": "Средства транспортные и оборудование прочие, не включенные в другие гр", "tnved": "30.99.10.190", "marking_status": "mandatory"}
            ]},
            {"id": "sports_nutrition", "name": "Спортивное питание", "icon": "dumbbell", "products": [
                {"id": "sports_nutrition_0210150420", "name": "10.13.11, 10.13.12, 10.13.13, 10.41.12, 10.61.33, 10.62.13, 10.72.12.1", "tnved": "0210, 1504 20 900 0, 1702 50 000 0, 1702 90 500 0, 1704 90 980 0, 1806 20 950 0, 1806 31 000 0, 1806 32 100 0, 1806 32 900 0, 1806 90 700 0, 1806 90 900 0, 1904, 1905 31 190 0, 2106 10 200 0, 2106 10 800 0, 2106 90 930 0, 2106 90 980 3, 2106 90 980 8, 2202 10 000 0, 2202 99 180 0, 2202 99 990 0, 2836 30 000 0, 2836 40 000 0, 2836 50 000 0, 2836 60 000 0, 2914 62 000 0, 2918 30 000 0, 2922 41 000 0, 2922 42 000 0, 2922 49, 2923 90 000 9, 2924 19 000 9, 2925 29 000 0, 2930 40 100 0, 2930 90 160 0, 2933 29 900 0, 2933 99 800 8, 2936 24 000 0, 2936 25 000 0, 2936 27 000 0, 2936 28 000 0, 2936 29 000, 2939 30 000 0, 2940 00 000 0, 3502 20 910 0, 3504, 3507", "marking_status": "mandatory"}
            ]}
        ]
    },
    {
        "id": "cosmetics",
        "name": "Косметика, гигиена и бытовая химия",
        "icon": "sparkles",
        "subcategories": [
            {"id": "perfume", "name": "Духи и туалетная вода", "icon": "spray-can", "products": [
                {"id": "perfume_330300", "name": "Код 3303 00", "tnved": "3303 00", "marking_status": "mandatory"}
            ]},
            {"id": "cosmetics_hygiene", "name": "Косметика, бытовая химия и товары личной гигиены", "icon": "sparkles", "products": [
                {"id": "cosmetics_hygiene_3304330499", "name": "Косметические средства, декоративная косметика, средства для ухода за ", "tnved": "3304 ( кроме 3304 99 000 0, относящегося к парфюмерно-косметической продукции, предназначенной для гигиены рук, с заявленным в маркировке потребительской упаковки антимикробным действием) 3306 ( кроме 3306 20 000 0", "marking_status": "mandatory"},
                {"id": "cosmetics_hygiene_112025", "name": "Код 1 этап — с 1 мая 2025 года", "tnved": "1 этап — с 1 мая 2025 года", "marking_status": "mandatory"},
                {"id": "cosmetics_hygiene_3401340250", "name": "Мыло, моющие средства, бытовая химия и т.д.", "tnved": "3401 3402 50 000 0 3405 40 00 0", "marking_status": "mandatory"},
                {"id": "cosmetics_hygiene_212025", "name": "Код 2 этап — с 1 июля 2025 года", "tnved": "2 этап — с 1 июля 2025 года", "marking_status": "mandatory"},
                {"id": "cosmetics_hygiene_3305330733", "name": "Средства для волос, средства для бритья, дезодоранты, ароматизаторы и ", "tnved": "3305 3307 ( кроме 3307 41 000 0, 3307 90 000 1, 3307 90 000 2)", "marking_status": "mandatory"},
                {"id": "cosmetics_hygiene_312025", "name": "Код 3 этап — с 1 октября 2025 года", "tnved": "3 этап — с 1 октября 2025 года", "marking_status": "mandatory"},
                {"id": "cosmetics_hygiene_412025", "name": "Код 4 этап — с 1 декабря 2025 года", "tnved": "4 этап — с 1 декабря 2025 года", "marking_status": "mandatory"},
                {"id": "cosmetics_hygiene_8212101000", "name": "Бритвы и лезвия для них, включая полосовые заготовки для лезвий", "tnved": "8212 10 100 0 8212 10 900 0 8212 20 000 0 8212 90 000 0", "marking_status": "mandatory"}
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
                {"id": "light_industry_420310000", "name": "Предметы одежды, включая рабочую одежду, изготовленные из натуральной ", "tnved": "4203 10 000", "marking_status": "mandatory"},
                {"id": "light_industry_4203210000", "name": "Перчатки, рукавицы и митенки", "tnved": "4203 21 000 0", "marking_status": "mandatory"},
                {"id": "light_industry_6106", "name": "Блузки, блузы и блузоны трикотажные машинного или ручного вязания, жен", "tnved": "6106", "marking_status": "mandatory"},
                {"id": "light_industry_6201", "name": "Пальто, полупальто, накидки, плащи, куртки (включая лыжные), ветровки,", "tnved": "6201", "marking_status": "mandatory"},
                {"id": "light_industry_6202", "name": "Пальто, полупальто, накидки, плащи, куртки (включая лыжные), ветровки,", "tnved": "6202", "marking_status": "mandatory"},
                {"id": "light_industry_6302", "name": "Белье постельное, столовое, туалетное и кухонное.", "tnved": "6302", "marking_status": "mandatory"},
                {"id": "light_industry_6105", "name": "Рубашки трикотажные машинного или ручного вязания, мужские или для мал", "tnved": "6105", "marking_status": "mandatory"},
                {"id": "light_industry_4304000000", "name": "Предметы одежды из искусственного меха", "tnved": "4304 00 000 0", "marking_status": "mandatory"},
                {"id": "light_industry_6210", "name": "Одежда из фетра или нетканых материалов, текстильных материалов с проп", "tnved": "6210", "marking_status": "mandatory"},
                {"id": "light_industry_611300", "name": "Одежда из фетра или нетканых материалов, текстильных материалов с проп", "tnved": "6113 00", "marking_status": "mandatory"},
                {"id": "light_industry_6101", "name": "Пальто, куртки, плащи, плащи с капюшонами, анораки, ветровки, штормовк", "tnved": "6101", "marking_status": "mandatory"},
                {"id": "light_industry_6102", "name": "Пальто, куртки, плащи, плащи с капюшонами, анораки, ветровки, штормовк", "tnved": "6102", "marking_status": "mandatory"},
                {"id": "light_industry_6205", "name": "Рубашки мужские или для мальчиков", "tnved": "6205", "marking_status": "mandatory"},
                {"id": "light_industry_6206", "name": "Блузки, блузы и блузоны женские и для девочек", "tnved": "6206", "marking_status": "mandatory"},
                {"id": "light_industry_6211", "name": "Костюмы спортивные и лыжные предметы одежды прочие", "tnved": "6211", "marking_status": "mandatory"},
                {"id": "light_industry_6211110000", "name": "Купальные костюмы", "tnved": "6211 11 000 0", "marking_status": "mandatory"},
                {"id": "light_industry_6103", "name": "Костюмы, комплекты, пиджаки, блайзеры, брюки, комбинезоны с нагрудника", "tnved": "6103", "marking_status": "mandatory"},
                {"id": "light_industry_6104", "name": "Костюмы, комплекты, жакеты, блайзеры, платья, юбки, юбки-брюки, брюки,", "tnved": "6104", "marking_status": "mandatory"},
                {"id": "light_industry_6203", "name": "Костюмы, комплекты, пиджаки, блайзеры, брюки, комбинезоны с нагрудника", "tnved": "6203", "marking_status": "mandatory"},
                {"id": "light_industry_6204", "name": "Костюмы, комплекты, жакеты, блайзеры, платья, юбки, юбки-брюки, брюки,", "tnved": "6204", "marking_status": "mandatory"},
                {"id": "light_industry_6110", "name": "Свитеры, пуловеры, кардиганы, жилеты и аналогичные изделия трикотажные", "tnved": "6110", "marking_status": "mandatory"},
                {"id": "light_industry_6112110000", "name": "Костюмы спортивные, лыжные, трикотажные машинного или ручного вязания ", "tnved": "6112 11 000 0", "marking_status": "mandatory"},
                {"id": "light_industry_611231", "name": "Купальные костюмы", "tnved": "6112 31", "marking_status": "mandatory"},
                {"id": "light_industry_6112120000", "name": "Костюмы спортивные, лыжные, трикотажные машинного или ручного вязания ", "tnved": "6112 12 000 0", "marking_status": "mandatory"},
                {"id": "light_industry_6112190000", "name": "Костюмы спортивные, лыжные, трикотажные машинного или ручного вязания ", "tnved": "6112 19 000 0", "marking_status": "mandatory"},
                {"id": "light_industry_6112200000", "name": "Костюмы спортивные, лыжные, трикотажные машинного или ручного вязания ", "tnved": "6112 20 000 0", "marking_status": "mandatory"},
                {"id": "light_industry_6214", "name": "Шали, шарфы, кашне, мантильи, вуали и аналогичные изделия, галстуки, г", "tnved": "6214", "marking_status": "mandatory"},
                {"id": "light_industry_6215", "name": "Шали, шарфы, кашне, мантильи, вуали и аналогичные изделия, галстуки, г", "tnved": "6215", "marking_status": "mandatory"},
                {"id": "light_industry_6107", "name": "Майки и нательные фуфайки прочие, кальсоны, трусы, ночные сорочки, пиж", "tnved": "6107", "marking_status": "mandatory"},
                {"id": "light_industry_6207", "name": "Майки и нательные фуфайки прочие, кальсоны, трусы, ночные сорочки, пиж", "tnved": "6207", "marking_status": "mandatory"},
                {"id": "light_industry_6108", "name": "Майки и нательные фуфайки прочие, комбинации, нижние юбки, трусы, пант", "tnved": "6108", "marking_status": "mandatory"},
                {"id": "light_industry_6208", "name": "Майки и нательные фуфайки прочие, комбинации, нижние юбки, трусы, пант", "tnved": "6208", "marking_status": "mandatory"},
                {"id": "light_industry_6109", "name": "Майки, фуфайки с рукавами, прочие нательные фуфайки, и прочие нижние р", "tnved": "6109", "marking_status": "mandatory"},
                {"id": "light_industry_6111", "name": "Детская одежда и принадлежности к детской одежде", "tnved": "6111", "marking_status": "mandatory"},
                {"id": "light_industry_6209", "name": "Детская одежда и принадлежности к детской одежде", "tnved": "6209", "marking_status": "mandatory"},
                {"id": "light_industry_611239", "name": "Купальные костюмы", "tnved": "6112 39", "marking_status": "mandatory"},
                {"id": "light_industry_611241", "name": "Купальные костюмы", "tnved": "6112 41", "marking_status": "mandatory"},
                {"id": "light_industry_611249", "name": "Купальные костюмы", "tnved": "6112 49", "marking_status": "mandatory"},
                {"id": "light_industry_6211120000", "name": "Купальные костюмы", "tnved": "6211 12 000 0", "marking_status": "mandatory"},
                {"id": "light_industry_6115", "name": "Колготы, чулки, гольфы, носки и подследники и прочие чулочно-носочные ", "tnved": "6115", "marking_status": "mandatory"},
                {"id": "light_industry_420329", "name": "Перчатки, рукавицы и митенки", "tnved": "4203 29", "marking_status": "mandatory"},
                {"id": "light_industry_6116", "name": "Перчатки, рукавицы и митенки", "tnved": "6116", "marking_status": "mandatory"},
                {"id": "light_industry_6216000000", "name": "Перчатки, рукавицы и митенки", "tnved": "6216 00 000 0", "marking_status": "mandatory"},
                {"id": "light_industry_6114", "name": "Предметы одежды и принадлежности к одежде готовые прочие, в том числе ", "tnved": "6114", "marking_status": "mandatory"},
                {"id": "light_industry_6117100000", "name": "Предметы одежды и принадлежности к одежде готовые прочие, в том числе ", "tnved": "6117 10 000 0", "marking_status": "mandatory"},
                {"id": "light_industry_6117808001", "name": "Галстуки, галстуки-бабочки и шейные платки", "tnved": "6117 80 800 1", "marking_status": "mandatory"},
                {"id": "light_industry_6117801009", "name": "Предметы одежды и принадлежности к одежде готовые прочие, в том числе ", "tnved": "6117 80 100 9", "marking_status": "mandatory"},
                {"id": "light_industry_6117808009", "name": "Предметы одежды и принадлежности к одежде готовые прочие, в том числе ", "tnved": "6117 80 800 9", "marking_status": "mandatory"},
                {"id": "light_industry_6217100000", "name": "Предметы одежды и принадлежности к одежде готовые прочие, в том числе ", "tnved": "6217 10 000 0", "marking_status": "mandatory"},
                {"id": "light_industry_6213", "name": "Галстуки, галстуки-бабочки и шейные платки", "tnved": "6213", "marking_status": "mandatory"},
                {"id": "light_industry_6406909000", "name": "Гетры, гамаши и аналогичные изделия", "tnved": "6406 90 900 0", "marking_status": "mandatory"},
                {"id": "light_industry_6504000000", "name": "Шляпы и прочие головные уборы", "tnved": "6504 00 000 0", "marking_status": "mandatory"},
                {"id": "light_industry_650500", "name": "Шляпы и прочие головные уборы", "tnved": "6505 00", "marking_status": "mandatory"},
                {"id": "light_industry_650699", "name": "Шляпы и прочие головные уборы", "tnved": "6506 99", "marking_status": "mandatory"}
            ]},
            {"id": "shoes", "name": "Обувь", "icon": "footprints", "products": [
                {"id": "shoes_6401", "name": "Обувные товары", "tnved": "6401", "marking_status": "mandatory"},
                {"id": "shoes_6402", "name": "Обувные товары", "tnved": "6402", "marking_status": "mandatory"},
                {"id": "shoes_6403", "name": "Обувные товары", "tnved": "6403", "marking_status": "mandatory"},
                {"id": "shoes_6404", "name": "Обувные товары", "tnved": "6404", "marking_status": "mandatory"},
                {"id": "shoes_6405", "name": "Обувные товары", "tnved": "6405", "marking_status": "mandatory"}
            ]},
            {"id": "furs", "name": "Шубы", "icon": "shirt", "products": [
                {"id": "furs_4303109010", "name": "Предметы одежды из норки.", "tnved": "4303 10 901 0", "marking_status": "mandatory"},
                {"id": "furs_4303109020", "name": "Предметы одежды из нутрии.", "tnved": "4303 10 902 0", "marking_status": "mandatory"},
                {"id": "furs_4303109030", "name": "Предметы одежды из песца или лисицы.", "tnved": "4303 10 903 0", "marking_status": "mandatory"},
                {"id": "furs_4303109040", "name": "Предметы одежды из кролика или зайца.", "tnved": "4303 10 904 0", "marking_status": "mandatory"},
                {"id": "furs_4303109050", "name": "Предметы одежды из енота.", "tnved": "4303 10 905 0", "marking_status": "mandatory"},
                {"id": "furs_4303109060", "name": "Предметы одежды из овчины.", "tnved": "4303 10 906 0", "marking_status": "mandatory"},
                {"id": "furs_4303109080", "name": "Предметы одежды прочие.", "tnved": "4303 10 908 0", "marking_status": "mandatory"}
            ]},
            {"id": "toys", "name": "Детские игрушки", "icon": "puzzle", "products": [
                {"id": "toys_950300", "name": "Игрушки, предназначенные для детей в возрасте до 14 лет — самокаты, пе", "tnved": "9503 00", "marking_status": "mandatory"},
                {"id": "toys_9504400000", "name": "Код 9504 40 000 0", "tnved": "9504 40 000 0", "marking_status": "mandatory"},
                {"id": "toys_9504901000", "name": "Код 9504 90 100 0", "tnved": "9504 90 100 0", "marking_status": "mandatory"},
                {"id": "toys_9504908009", "name": "Код 9504 90 800 9", "tnved": "9504 90 800 9", "marking_status": "mandatory"}
            ]},
            {"id": "bicycles", "name": "Велосипеды", "icon": "bike", "products": [
                {"id": "bicycles_8711871200", "name": "Велосипеды (в том числе с установленным вспомогательным двигателем и т", "tnved": "8711 8712 00 8714 91 100 9503 00 100 9", "marking_status": "mandatory"}
            ]}
        ]
    },
    {
        "id": "auto",
        "name": "Автомобильная отрасль",
        "icon": "car",
        "subcategories": [
            {"id": "tires", "name": "Шины и покрышки", "icon": "circle", "products": [
                {"id": "tires_4011100003", "name": "Шины и покрышки пневматические резиновые новые", "tnved": "4011 10 000 3", "marking_status": "mandatory"},
                {"id": "tires_4011100009", "name": "Шины и покрышки пневматические резиновые новые", "tnved": "4011 10 000 9", "marking_status": "mandatory"},
                {"id": "tires_4011201000", "name": "Шины и покрышки пневматические резиновые новые", "tnved": "4011 20 100 0", "marking_status": "mandatory"},
                {"id": "tires_4011209000", "name": "Шины и покрышки пневматические резиновые новые", "tnved": "4011 20 900 0", "marking_status": "mandatory"},
                {"id": "tires_4011400000", "name": "Шины и покрышки пневматические резиновые новые", "tnved": "4011 40 000 0", "marking_status": "mandatory"},
                {"id": "tires_4011700000", "name": "Шины и покрышки пневматические резиновые новые", "tnved": "4011 70 000 0", "marking_status": "mandatory"},
                {"id": "tires_4011800000", "name": "Шины и покрышки пневматические резиновые новые", "tnved": "4011 80 000 0", "marking_status": "mandatory"},
                {"id": "tires_4011900000", "name": "Шины и покрышки пневматические резиновые новые", "tnved": "4011 90 000 0", "marking_status": "mandatory"}
            ]},
            {"id": "motor_oils", "name": "Моторные масла", "icon": "droplet", "products": [
                {"id": "motor_oils_2710198200", "name": "Моторные масла, компрессорное смазочное масло, турбинное смазочное мас", "tnved": "2710 19 820 0", "marking_status": "mandatory"},
                {"id": "motor_oils_2710198800", "name": "Масло для шестерен и масло для редукторов (например, масло трансмиссио", "tnved": "2710 19 880 0", "marking_status": "mandatory"},
                {"id": "motor_oils_3403191000", "name": "Прочие материалы смазочные, содержащие не в качестве основного компоне", "tnved": "3403 19 100 0", "marking_status": "mandatory"},
                {"id": "motor_oils_3403199000", "name": "Средства для смазки машин, механизмов и транспортных средств. В данную", "tnved": "3403 19 900 0", "marking_status": "mandatory"},
                {"id": "motor_oils_3403990000", "name": "Материалы смазочные (включая смазочно-охлаждающие эмульсии для режущих", "tnved": "3403 99 000 0", "marking_status": "mandatory"},
                {"id": "motor_oils_3819000000", "name": "Жидкости тормозные гидравлические и жидкости готовые прочие для гидрав", "tnved": "3819 00 000 0", "marking_status": "mandatory"},
                {"id": "motor_oils_3820000000", "name": "Антифризы и жидкости антиобледенительные готовые (например, омыватель ", "tnved": "3820 00 000 0", "marking_status": "mandatory"}
            ]}
        ]
    },
    {
        "id": "construction",
        "name": "Строительство и инфраструктура",
        "icon": "hard-hat",
        "subcategories": [
            {"id": "building_materials", "name": "Строительные материалы", "icon": "hammer", "products": [
                {"id": "building_materials_2520", "name": "Гипс строительный, технический, медицинский, формовочный", "tnved": "2520", "marking_status": "mandatory"},
                {"id": "building_materials_2523", "name": "Цементы общестроительные, портландцемент, шлакопортландцемент и др. (к", "tnved": "2523", "marking_status": "mandatory"},
                {"id": "building_materials_3816000000", "name": "Цементы огнеупорные, растворы строительные огнеупорные, бетоны огнеупо", "tnved": "3816 00 000 0", "marking_status": "mandatory"},
                {"id": "building_materials_3824509000", "name": "Смеси строительные, растворы строительные", "tnved": "3824 50 900 0", "marking_status": "mandatory"},
                {"id": "building_materials_3214", "name": "Шпатлевки, замазки, герметики, мастики, пасты (кроме 3214 90 000 1)", "tnved": "3214", "marking_status": "mandatory"}
            ]}
        ]
    },
    {
        "id": "electronics",
        "name": "Электроника и техника",
        "icon": "cpu",
        "subcategories": [
            {"id": "cameras", "name": "Фотоаппараты и лампы-вспышки", "icon": "camera", "products": [
                {"id": "cameras_9006900691", "name": "Код 9006 (кроме 9006 91 000 0, 9006 99 000 0)", "tnved": "9006 (кроме 9006 91 000 0, 9006 99 000 0)", "marking_status": "mandatory"}
            ]}
        ]
    },
    {
        "id": "pilot",
        "name": "Пилотные проекты",
        "icon": "rocket",
        "subcategories": [
            {"id": "titanium", "name": "Титановая металлопродукция (завершён)", "icon": "box", "products": []},
            {"id": "radio_electronics", "name": "Радиоэлектроника", "icon": "radio", "products": []},
            {"id": "fiber_optic", "name": "Оптоволокно", "icon": "cable", "products": []},
            {"id": "print_products", "name": "Печатная продукция (завершен)", "icon": "book", "products": []},
            {"id": "heating", "name": "Отопительные приборы", "icon": "thermometer", "products": []},
            {"id": "cables", "name": "Кабельная продукция", "icon": "cable", "products": []},
            {"id": "low_alcohol", "name": "Слабый алкоголь", "icon": "wine", "products": []},
            {"id": "medical_2", "name": "Медицинские изделия 2.0", "icon": "stethoscope", "products": []},
            {"id": "pyrotechnics", "name": "Пиротехника", "icon": "sparkles", "products": []},
            {"id": "polymer_pipes", "name": "Полимерные трубы", "icon": "cylinder", "products": []},
            {"id": "auto_parts", "name": "Автозапчасти", "icon": "wrench", "products": []},
            {"id": "hygiene", "name": "Средства гигиены", "icon": "sparkles", "products": []},
            {"id": "home_interior", "name": "Товары для дома и интерьера", "icon": "home", "products": []},
            {"id": "fertilizers", "name": "Удобрения", "icon": "leaf", "products": []},
            {"id": "pasta_cereals", "name": "Макароны, крупы, мёд", "icon": "wheat", "products": []},
            {"id": "meat_products", "name": "Мясные изделия", "icon": "beef", "products": []},
            {"id": "frozen_food", "name": "Полуфабрикаты и замороженная продукция", "icon": "snowflake", "products": []}
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
    # 12. Обучение/сервис - 1900 + 35% = 2565
    {
        "id": "training",
        "name": "Обучение/сервис",
        "description": "Обучение персонала работе с системой маркировки (почасовая оплата)",
        "price": 2565,
        "unit": "час",
        "category": "training",
        "order": 12
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
    # Beget SMTP defaults (порт 465 SSL - работает стабильно)
    smtp_host = os.getenv('SMTP_HOST', 'smtp.beget.com')
    smtp_port = os.getenv('SMTP_PORT', '465')
    smtp_user = os.getenv('SMTP_USER', 'noreply@promarkirui.ru')
    smtp_pass = os.getenv('SMTP_PASSWORD', 'wK2jnyo*t7jm')  # SMTP_PASSWORD (не SMTP_PASS)
    smtp_from = os.getenv('SMTP_FROM', smtp_user)
    smtp_use_tls = os.getenv('SMTP_USE_TLS', 'false').lower() == 'true'  # false = use SSL

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

def format_contact_email(data: ContactRequest) -> str:
    """Format contact form data into HTML email"""
    now = datetime.now().strftime("%d.%m.%Y %H:%M")
    return f"""
    <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <div style="background: linear-gradient(135deg, #FFDA07 0%, #F5C300 100%); padding: 20px; border-radius: 12px 12px 0 0;">
                <h2 style="margin: 0; color: #000;">Заявка на {data.request_type}</h2>
            </div>
            <div style="background: #fff; padding: 20px; border: 1px solid #eee; border-top: none; border-radius: 0 0 12px 12px;">
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
    """Send contact form to email"""

    # Отправляем на все адреса менеджеров
    contact_emails = os.getenv('CONTACT_TO_EMAIL', 'damirslk@mail.ru,turbin.ar8@gmail.com').split(',')
    subject = f"Заявка на {request.request_type} от {request.name}"
    body = format_contact_email(request)

    # Send email to all managers in background
    for email in contact_emails:
        background_tasks.add_task(send_email, email.strip(), subject, body)

    return {
        "status": "success",
        "message": "Ваша заявка принята! Мы свяжемся с вами в ближайшее время."
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
    return register_user(data.email, data.password)


@app.post("/api/auth/login")
async def api_login(data: UserLogin):
    """Вход в систему"""
    return login_user(data.email, data.password)


@app.get("/api/auth/me")
async def api_get_me(user: Dict = Depends(require_auth)):
    """Получить данные текущего пользователя"""
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
        cursor.execute('SELECT id, email, role, is_active, email_verified, created_at FROM users ORDER BY created_at DESC')
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

    if role not in ["client", "admin", "superadmin"]:
        raise HTTPException(status_code=400, detail="Недопустимая роль")

    existing = UserDB.get_by_email(email)
    if existing:
        raise HTTPException(status_code=400, detail="Email уже зарегистрирован")

    user_id = UserDB.create(email, password, role)
    return {"id": user_id, "email": email, "role": role}


@app.put("/api/admin/users/{user_id}")
async def api_admin_update_user(
    user_id: int,
    data: Dict,
    current_user: Dict = Depends(require_superadmin)
):
    """Обновить пользователя (только для суперадмина)"""
    with get_db() as conn:
        cursor = conn.cursor()

        updates = []
        values = []

        if "role" in data:
            if data["role"] not in ["client", "admin", "superadmin"]:
                raise HTTPException(status_code=400, detail="Недопустимая роль")
            updates.append("role = ?")
            values.append(data["role"])

        if "is_active" in data:
            updates.append("is_active = ?")
            values.append(1 if data["is_active"] else 0)

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


# ======================== ТЕСТ ТН ВЭД ========================

# Загружаем базу ТН ВЭД из JSON при старте
_tnved_data = None

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

    # Total from tnved.json
    data = get_tnved_data()
    total = len(data) if data else 0

    # Mandatory/Experiment from CATEGORIES_DATA (our curated products)
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

    return {
        "loaded": True,
        "total": total,
        "mandatory": mandatory,
        "experimental": experimental,
        "not_required": total - mandatory - experimental
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
