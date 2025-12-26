"""
Конфигурация проекта Про.Маркируй
Все настройки, константы и пути к ресурсам
"""
import os
from dotenv import load_dotenv

load_dotenv()

# ======================== EMAIL НАСТРОЙКИ ========================
SMTP_HOST = os.getenv('SMTP_HOST', 'smtp.beget.com')
SMTP_PORT = os.getenv('SMTP_PORT', '465')
SMTP_USER = os.getenv('SMTP_USER', '')
SMTP_PASSWORD = os.getenv('SMTP_PASSWORD', '')
SMTP_FROM = os.getenv('SMTP_FROM', '') or SMTP_USER
SMTP_USE_TLS = os.getenv('SMTP_USE_TLS', 'false').lower() == 'true'

# Адреса менеджеров для уведомлений
CONTACT_TO_EMAIL = os.getenv('CONTACT_TO_EMAIL', 'damirslk@mail.ru,turbin.ar8@gmail.com')
MANAGER_EMAILS = CONTACT_TO_EMAIL.split(',')

# Защищенный админский email (нельзя удалить)
PROTECTED_ADMIN_EMAIL = 'damirslk@mail.ru'

# ======================== TELEGRAM ========================
TELEGRAM_BOT_TOKEN = os.getenv('TELEGRAM_BOT_TOKEN', '')
TELEGRAM_CHAT_ID = os.getenv('TELEGRAM_CHAT_ID', '')

# ======================== ПУТИ К ФАЙЛАМ ========================
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
ASSETS_DIR = os.path.join(BASE_DIR, "assets")
LOGO_PATH = os.path.join(ASSETS_DIR, "logo.png")
SIGNATURE_PATH = os.path.join(ASSETS_DIR, "signature.png")
STAMP_PATH = os.path.join(ASSETS_DIR, "stamp.png")

# Пути к шрифтам (для PDF генератора)
FONT_PATHS = [
    "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
    "/System/Library/Fonts/Supplemental/Arial.ttf",
    os.path.join(ASSETS_DIR, "DejaVuSans.ttf")
]

FONT_BOLD_PATHS = [
    "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
    "/System/Library/Fonts/Supplemental/Arial Bold.ttf",
    os.path.join(ASSETS_DIR, "DejaVuSans-Bold.ttf")
]

# ======================== ИНФОРМАЦИЯ ОБ ИСПОЛНИТЕЛЕ ========================
EXECUTOR_INFO = {
    "name": "ИП Турбин Артём Анатольевич",
    "name_short": "ИП Турбин А.А.",
    "inn": "226702642061",
    "ogrnip": "320222500067536",
    "address": "656006, Россия, Алтайский край, г. Барнаул, ул. Лазурная 57, оф. 409L",
    "city": "г. Барнаул",
    "bank_account": "40802810112500014192",
    "bank_name": "ООО «Банк Точка»",
    "bank_bik": "044525104",
    "bank_corr": "30101810745374525104",
    "phone": "+7 927 452 1553",
    "email": "info@promarkirui.ru",
    "website": "promarkirui.ru",
    "tax_system": "УСН (НДС не облагается)",
}

# ======================== RATE LIMITING ========================
FORGOT_PASSWORD_MAX_ATTEMPTS = 3  # Максимум запросов на сброс пароля
FORGOT_PASSWORD_WINDOW_HOURS = 1  # За период (часы)

# ======================== EMAIL ACCOUNTS (IMAP/SMTP) ========================
EMAIL_ACCOUNTS = [
    {
        'email': 'info@promarkirui.ru',
        'name': 'Инфо',
        'imap_host': 'imap.beget.com',
        'smtp_host': 'smtp.beget.com',
        'password': os.getenv('EMAIL_INFO_PASSWORD', '')
    },
    {
        'email': 'support@promarkirui.ru',
        'name': 'Поддержка',
        'imap_host': 'imap.beget.com',
        'smtp_host': 'smtp.beget.com',
        'password': os.getenv('EMAIL_SUPPORT_PASSWORD', '')
    }
]
