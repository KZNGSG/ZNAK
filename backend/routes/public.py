"""
Публичные API эндпоинты
/api/contact/send - контактная форма
/api/training/enroll - запись на обучение
/api/equipment/* - подбор оборудования
"""
from fastapi import APIRouter, BackgroundTasks, HTTPException
from pydantic import BaseModel, EmailStr, field_validator
from typing import Optional, List
from datetime import datetime
import os
import logging
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.header import Header
from email.utils import formataddr
import httpx

logger = logging.getLogger(__name__)

# ======================== ROUTER ========================
router = APIRouter(prefix="/api", tags=["public"])

# ======================== PYDANTIC MODELS ========================

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
    source: Optional[str] = None  # ai_consultant, contact_form, check_page, quote_page

    @field_validator('consent')
    @classmethod
    def check_consent(cls, v):
        if not v:
            raise ValueError('Необходимо согласие на обработку данных')
        return v

class TrainingEnrollRequest(BaseModel):
    name: str
    phone: str
    email: Optional[EmailStr] = None
    company: Optional[str] = None
    comment: Optional[str] = None
    plan_id: Optional[str] = None  # standard, premium, vip, cashier, accountant, corporate
    plan_name: Optional[str] = None
    plan_price: Optional[str] = None

# ======================== CONSTANTS ========================

EQUIPMENT_DATABASE = {
    "printer": {"name": "Принтер этикеток", "purpose": "Печать DataMatrix кодов на этикетках", "price_min": 15000, "price_max": 80000},
    "scanner": {"name": "Сканер штрих-кодов", "purpose": "Считывание и проверка кодов маркировки", "price_min": 8000, "price_max": 35000},
    "tsd": {"name": "Терминал сбора данных (ТСД)", "purpose": "Мобильное сканирование и учёт товаров", "price_min": 25000, "price_max": 70000},
    "software": {"name": "Программа учёта", "purpose": "Интеграция с Честным ЗНАКом, учёт движения товаров", "price_min": 0, "price_max": 50000}
}

# ======================== HELPER FUNCTIONS ========================

def send_email(to_email: str, subject: str, body: str) -> bool:
    """Send email via SMTP with Beget configuration"""
    smtp_host = os.getenv('SMTP_HOST', 'smtp.beget.com')
    smtp_port = os.getenv('SMTP_PORT', '465')
    smtp_user = os.getenv('SMTP_USER', '')
    smtp_pass = os.getenv('SMTP_PASSWORD', '')
    smtp_from = os.getenv('SMTP_FROM', '') or smtp_user
    smtp_use_tls = os.getenv('SMTP_USE_TLS', 'false').lower() == 'true'

    if not smtp_user or not smtp_pass:
        logger.error(f"[EMAIL ERROR] SMTP not configured! Set SMTP_USER and SMTP_PASSWORD in .env")
        return False

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

def format_callback_telegram(callback_id: int, contact_name: str, contact_phone: str, source: str, products: list = None, comment: str = None):
    """Форматировать сообщение о новой заявке для Telegram"""
    source_labels = {
        'check_page': 'Проверка товара',
        'quote_page': 'Запрос КП',
        'contact_form': 'Контактная форма',
        'unknown': 'Другое'
    }
    source_label = source_labels.get(source, source or 'Сайт')
    
    text = f"""🔔 <b>Новая заявка #{callback_id}</b>

👤 <b>{contact_name}</b>
📞 {contact_phone}
📍 Источник: {source_label}"""
    
    if products:
        text += "\n\n📦 <b>Товары:</b>"
        for p in products[:5]:  # Max 5 products
            name = p.get('name', '')[:50]
            tnved = p.get('tnved', '')
            text += f"\n• {name} ({tnved})"
        if len(products) > 5:
            text += f"\n... и ещё {len(products) - 5}"
    
    if comment:
        text += f"\n\n💬 {comment[:200]}"
    
    text += f"\n\n🔗 <a href=\"https://promarkirui.ru/employee/inbox\">Открыть в CRM</a>"
    
    return text

async def send_telegram_notification(text: str):
    """Отправить уведомление в Telegram"""
    TELEGRAM_BOT_TOKEN = os.getenv('TELEGRAM_BOT_TOKEN', '')
    TELEGRAM_CHAT_ID = os.getenv('TELEGRAM_CHAT_ID', '')
    
    if not TELEGRAM_BOT_TOKEN or not TELEGRAM_CHAT_ID:
        logger.info("Telegram not configured")
        return False
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage",
                json={
                    "chat_id": TELEGRAM_CHAT_ID,
                    "text": text,
                    "parse_mode": "HTML"
                },
                timeout=10.0
            )
            return response.status_code == 200
    except Exception as e:
        logger.error(f"Failed to send Telegram notification: {e}")
        return False

# ======================== ENDPOINTS ========================

@router.post("/equipment/recommend", response_model=EquipmentResponse)
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

@router.post("/contact/send")
async def send_contact(request: ContactRequest, background_tasks: BackgroundTasks):
    """Send contact form to email and save to database"""
    from database import CallbackDB

    # Определяем источник
    source = request.source or "contact_form"

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
        "source": source
    }
    callback_id = CallbackDB.create(callback_data)

    # Telegram — не отправляем если от AI (AI сам отправляет своё сообщение)
    if source != "ai_consultant":
        tg_text = format_callback_telegram(callback_id, request.name, request.phone, source, [], request.comment)
        background_tasks.add_task(send_telegram_notification, tg_text)

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


@router.post("/training/enroll")
async def training_enroll(request: TrainingEnrollRequest, background_tasks: BackgroundTasks):
    """Отправка заявки на обучение"""
    from database import CallbackDB

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
