from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr, field_validator
from typing import Optional, List, Dict
import os
from dotenv import load_dotenv
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import logging

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
    subcategories: List[Dict[str, str]]

class CheckProductRequest(BaseModel):
    category: str
    subcategory: str
    source: str  # "produce", "import", "buy_rf", "old_stock"
    volume: str  # "<100", "100-1000", "1000-10000", ">10000"

class CheckProductResponse(BaseModel):
    requires_marking: bool
    category: str
    subcategory: str
    tnved: Optional[str] = None
    deadline: Optional[str] = None
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

# ======================== DATA ========================

CATEGORIES_DATA = [
    {
        "id": "food",
        "name": "Продукты питания и напитки",
        "subcategories": [
            {"id": "beer", "name": "Пиво и слабоалкогольные напитки"},
            {"id": "milk", "name": "Молочная продукция"},
            {"id": "water", "name": "Упакованная вода"},
            {"id": "tobacco", "name": "Табак"},
            {"id": "caviar", "name": "Морепродукты (икра)"},
            {"id": "oils", "name": "Растительные масла"},
            {"id": "pet_food", "name": "Корма для животных"},
            {"id": "canned", "name": "Консервированные продукты"},
            {"id": "grocery", "name": "Бакалея"},
            {"id": "soft_drinks", "name": "Безалкогольные напитки"},
            {"id": "non_alc_beer", "name": "Безалкогольное пиво"},
            {"id": "sweets", "name": "Сладости"},
            {"id": "instant_drinks", "name": "Растворимые напитки"}
        ]
    },
    {
        "id": "pharma",
        "name": "Фармацевтика и здоровье",
        "subcategories": [
            {"id": "medicines", "name": "Лекарственные препараты"},
            {"id": "supplements", "name": "БАДы"},
            {"id": "medical_devices", "name": "Медицинские изделия"},
            {"id": "antiseptics", "name": "Антисептики"}
        ]
    },
    {
        "id": "cosmetics",
        "name": "Косметика, гигиена и бытовая химия",
        "subcategories": [
            {"id": "perfume", "name": "Парфюмерия"},
            {"id": "cosmetics_items", "name": "Косметика"},
            {"id": "household_chemicals", "name": "Бытовая химия"},
            {"id": "hygiene", "name": "Средства гигиены"}
        ]
    },
    {
        "id": "non_food",
        "name": "Непродовольственные товары",
        "subcategories": [
            {"id": "clothing", "name": "Одежда"},
            {"id": "shoes", "name": "Обувь"},
            {"id": "light_industry", "name": "Товары лёгкой промышленности"},
            {"id": "fur", "name": "Меховые изделия"},
            {"id": "cameras", "name": "Фотоаппараты и лампы-вспышки"}
        ]
    },
    {
        "id": "auto",
        "name": "Автомобильная отрасль",
        "subcategories": [
            {"id": "tires", "name": "Шины и покрышки"},
            {"id": "motor_oils", "name": "Моторные масла"}
        ]
    },
    {
        "id": "construction",
        "name": "Строительство и инфраструктура",
        "subcategories": [
            {"id": "building_materials", "name": "Строительные материалы (пилот)"}
        ]
    },
    {
        "id": "electronics",
        "name": "Электроника и техника",
        "subcategories": [
            {"id": "computers", "name": "Компьютеры и ноутбуки (пилот)"},
            {"id": "smartphones", "name": "Смартфоны и телефоны (пилот)"}
        ]
    },
    {
        "id": "pilot",
        "name": "Пилотные проекты",
        "subcategories": [
            {"id": "optical_fiber", "name": "Оптоволокно"},
            {"id": "bicycles", "name": "Велосипеды"},
            {"id": "kids_goods", "name": "Детские товары"}
        ]
    }
]

MARKING_RULES = {
    "medicines": {"requires": True, "deadline": "с 2020 года", "tnved": "30"},
    "tobacco": {"requires": True, "deadline": "с 2019 года", "tnved": "2401-2403"},
    "shoes": {"requires": True, "deadline": "с 2020 года", "tnved": "6401-6405"},
    "clothing": {"requires": True, "deadline": "с 2021 года", "tnved": "61-62"},
    "perfume": {"requires": True, "deadline": "с 2020 года", "tnved": "3303-3307"},
    "tires": {"requires": True, "deadline": "с 2020 года", "tnved": "4011"},
    "cameras": {"requires": True, "deadline": "с 2020 года", "tnved": "9006"},
    "milk": {"requires": True, "deadline": "с 2020 года", "tnved": "0401-0406"},
    "water": {"requires": True, "deadline": "с 2021 года", "tnved": "2201"},
    "beer": {"requires": True, "deadline": "с 2022 года", "tnved": "2203"},
    "fur": {"requires": True, "deadline": "с 2019 года", "tnved": "4303"},
    "medical_devices": {"requires": True, "deadline": "с 2021 года", "tnved": "90"},
    "supplements": {"requires": True, "deadline": "с 2022 года", "tnved": "2106"},
    "antiseptics": {"requires": True, "deadline": "с 2021 года", "tnved": "3808"},
    "light_industry": {"requires": True, "deadline": "с 2021 года", "tnved": "различные"},
    # Пилотные и не требующие маркировку
    "building_materials": {"requires": False, "deadline": None, "tnved": None},
    "computers": {"requires": False, "deadline": None, "tnved": None},
    "smartphones": {"requires": False, "deadline": None, "tnved": None},
    "optical_fiber": {"requires": False, "deadline": None, "tnved": None},
    "bicycles": {"requires": False, "deadline": None, "tnved": None},
    "kids_goods": {"requires": False, "deadline": None, "tnved": None},
    "cosmetics_items": {"requires": False, "deadline": None, "tnved": None},
    "household_chemicals": {"requires": False, "deadline": None, "tnved": None},
    "hygiene": {"requires": False, "deadline": None, "tnved": None},
    "caviar": {"requires": False, "deadline": None, "tnved": None},
    "oils": {"requires": False, "deadline": None, "tnved": None},
    "pet_food": {"requires": False, "deadline": None, "tnved": None},
    "canned": {"requires": False, "deadline": None, "tnved": None},
    "grocery": {"requires": False, "deadline": None, "tnved": None},
    "soft_drinks": {"requires": False, "deadline": None, "tnved": None},
    "non_alc_beer": {"requires": False, "deadline": None, "tnved": None},
    "sweets": {"requires": False, "deadline": None, "tnved": None},
    "instant_drinks": {"requires": False, "deadline": None, "tnved": None},
    "motor_oils": {"requires": False, "deadline": None, "tnved": None},
}

MARKING_STEPS = [
    "Зарегистрироваться в системе Честный ЗНАК (честныйзнак.рф)",
    "Получить усиленную квалифицированную электронную подпись (УКЭП)",
    "Настроить электронный документооборот (ЭДО)",
    "Заказать коды маркировки в личном кабинете",
    "Нанести коды маркировки на товар (принтер этикеток)",
    "Ввести товар в оборот через систему Честный ЗНАК"
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

# ======================== EMAIL FUNCTIONS ========================

def send_email(to_email: str, subject: str, body: str) -> bool:
    """Send email via SMTP with environment configuration"""
    smtp_host = os.getenv('SMTP_HOST')
    smtp_port = os.getenv('SMTP_PORT', '587')
    smtp_user = os.getenv('SMTP_USER')
    smtp_pass = os.getenv('SMTP_PASS')
    smtp_from = os.getenv('SMTP_FROM', smtp_user)
    smtp_use_tls = os.getenv('SMTP_USE_TLS', 'true').lower() == 'true'
    
    # Dry-run mode if SMTP not configured
    if not smtp_host or not smtp_user or not smtp_pass:
        logger.warning("SMTP not configured. Running in dry-run mode.")
        logger.info(f"[DRY-RUN] Would send email to: {to_email}")
        logger.info(f"[DRY-RUN] Subject: {subject}")
        logger.info(f"[DRY-RUN] Body: {body}")
        return True
    
    try:
        msg = MIMEMultipart('alternative')
        msg['Subject'] = subject
        msg['From'] = smtp_from
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
        # Don't raise exception, just log and return False
        return False

def format_contact_email(data: ContactRequest) -> str:
    """Format contact form data into HTML email"""
    return f"""
    <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <h2 style="color: #1E3A8A;">Новая заявка с сайта Про.Маркируй</h2>
            <table style="border-collapse: collapse; width: 100%; max-width: 600px;">
                <tr>
                    <td style="padding: 8px; background-color: #f8f9fa; font-weight: bold;">Имя:</td>
                    <td style="padding: 8px;">{data.name}</td>
                </tr>
                <tr>
                    <td style="padding: 8px; background-color: #f8f9fa; font-weight: bold;">Телефон:</td>
                    <td style="padding: 8px;">{data.phone}</td>
                </tr>
                <tr>
                    <td style="padding: 8px; background-color: #f8f9fa; font-weight: bold;">Email:</td>
                    <td style="padding: 8px;">{data.email or 'Не указан'}</td>
                </tr>
                <tr>
                    <td style="padding: 8px; background-color: #f8f9fa; font-weight: bold;">Тип запроса:</td>
                    <td style="padding: 8px;">{data.request_type}</td>
                </tr>
                <tr>
                    <td style="padding: 8px; background-color: #f8f9fa; font-weight: bold;">Комментарий:</td>
                    <td style="padding: 8px;">{data.comment or 'Не указан'}</td>
                </tr>
            </table>
            <p style="margin-top: 20px; color: #666; font-size: 12px;">
                Отправлено: {data.phone}<br>
                С согласием на обработку персональных данных
            </p>
        </body>
    </html>
    """

# ======================== API ENDPOINTS ========================

@app.get("/api/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "ok", "service": "promarkirui"}

@app.get("/api/check/categories")
async def get_categories():
    """Get all product categories and subcategories"""
    return {"groups": CATEGORIES_DATA}

@app.post("/api/check/assess", response_model=CheckProductResponse)
async def assess_product(request: CheckProductRequest):
    """Assess if product requires marking"""
    
    # Get marking rules for subcategory
    rules = MARKING_RULES.get(request.subcategory, {"requires": False})
    
    if rules.get("requires", False):
        return CheckProductResponse(
            requires_marking=True,
            category=request.category,
            subcategory=request.subcategory,
            tnved=rules.get("tnved"),
            deadline=rules.get("deadline"),
            steps=MARKING_STEPS,
            message=f"Ваш товар подлежит обязательной маркировке {rules.get('deadline', '')}"
        )
    else:
        return CheckProductResponse(
            requires_marking=False,
            category=request.category,
            subcategory=request.subcategory,
            tnved=None,
            deadline=None,
            steps=[],
            message="Ваш товар пока не подлежит маркировке. Следите за обновлениями — перечень товаров расширяется."
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
    # Return all schemes regardless of country/category for simplicity
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
    
    contact_email = os.getenv('CONTACT_TO_EMAIL', 'info@promarkirui.ru')
    subject = f"Новая заявка: {request.request_type}"
    body = format_contact_email(request)
    
    # Send email in background
    background_tasks.add_task(send_email, contact_email, subject, body)
    
    return {
        "status": "success",
        "message": "Ваша заявка принята! Мы свяжемся с вами в ближайшее время."
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
