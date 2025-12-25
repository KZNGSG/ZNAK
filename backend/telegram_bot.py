# -*- coding: utf-8 -*-
"""
Telegram бот для проверки маркировки товаров
Про.Маркируй - https://promarkirui.ru
Версия 5.0 - Справочник штрафов, документы, чек-листы
"""

import json
import logging
import os
import re
import hashlib
import sqlite3
from typing import Optional, Dict
from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup, KeyboardButton, ReplyKeyboardMarkup, ReplyKeyboardRemove
from telegram.ext import (
    Application,
    CommandHandler,
    MessageHandler,
    CallbackQueryHandler,
    ConversationHandler,
    filters,
    ContextTypes
)
from dotenv import load_dotenv

load_dotenv()

logging.basicConfig(
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    level=logging.INFO
)
logger = logging.getLogger(__name__)

DATA_DIR = os.path.join(os.path.dirname(__file__), 'data')
TNVED_MARKING_PATH = os.path.join(DATA_DIR, 'tnved_marking.json')
CATEGORY_REQUIREMENTS_PATH = os.path.join(DATA_DIR, 'category_requirements.json')
TIMELINE_PATH = os.path.join(DATA_DIR, 'marking_timeline.json')
DB_PATH = os.path.join(DATA_DIR, 'promarkirui.db')

tnved_marking: Dict = {}
category_requirements: Dict = {}
marking_timeline: Dict = {}
category_id_map: Dict = {}

# States для ConversationHandler
WAITING_PHONE, WAITING_CLIENT_TYPE, WAITING_CUSTOM_TYPE = range(3)

# Типы клиентов
CLIENT_TYPES = {
    'importer': 'Импортёр',
    'manufacturer': 'Производитель',
    'retailer': 'Розничный продавец',
    'wholesaler': 'Оптовик',
    'marketplace': 'Маркетплейс',
    'accountant': 'Бухгалтер',
    'consultant': 'Консультант/Юрист',
    'other': 'Другое'
}

# ==================== ШТРАФЫ ЗА МАРКИРОВКУ ====================

FINES_DATA = {
    'production': {
        'title': 'Производство/ввод без маркировки',
        'article': 'ст. 15.12 ч.1 КоАП РФ',
        'description': 'Производство или ввод в оборот товаров без маркировки',
        'fines': {
            'official': '5 000 — 10 000 ₽',
            'legal': '50 000 — 100 000 ₽'
        },
        'additional': '+ конфискация товара'
    },
    'sale': {
        'title': 'Продажа без маркировки',
        'article': 'ст. 15.12 ч.2 КоАП РФ',
        'description': 'Продажа, хранение, перевозка товаров без маркировки',
        'fines': {
            'citizen': '2 000 — 4 000 ₽',
            'official': '5 000 — 10 000 ₽',
            'legal': '50 000 — 300 000 ₽'
        },
        'additional': '+ конфискация товара'
    },
    'alcohol_tobacco_production': {
        'title': 'Производство алкоголя/табака без маркировки',
        'article': 'ст. 15.12 ч.3 КоАП РФ',
        'description': 'Производство алкогольной, табачной, никотинсодержащей продукции без маркировки',
        'fines': {
            'official': '300 000 — 500 000 ₽',
            'legal': '700 000 — 1 000 000 ₽'
        },
        'additional': '+ конфискация товара'
    },
    'alcohol_tobacco_sale': {
        'title': 'Оборот алкоголя/табака без маркировки',
        'article': 'ст. 15.12 ч.4 КоАП РФ',
        'description': 'Продажа алкогольной, табачной, никотинсодержащей продукции без маркировки',
        'fines': {
            'citizen': '100 000 — 150 000 ₽',
            'official': '300 000 — 500 000 ₽',
            'legal': '1 000 000 — 1 500 000 ₽'
        },
        'additional': '+ конфискация товара'
    },
    'data_violation': {
        'title': 'Нарушение передачи данных в ЧЗ',
        'article': 'ст. 15.12.1 КоАП РФ',
        'description': 'Непредставление или нарушение сроков передачи сведений в Честный ЗНАК',
        'fines': {
            'official': '1 000 — 10 000 ₽',
            'legal': '50 000 — 100 000 ₽'
        },
        'additional': 'Возможно предупреждение'
    }
}

# ==================== ДОКУМЕНТЫ ДЛЯ ИМПОРТА ====================

IMPORT_DOCUMENTS = {
    'basic': {
        'title': 'Базовый пакет документов',
        'docs': [
            'Контракт (договор) с иностранным поставщиком',
            'Инвойс (счёт-фактура)',
            'Упаковочный лист',
            'Транспортные документы (CMR, коносамент, авианакладная)',
            'Сертификат происхождения (при наличии преференций)',
            'Паспорт сделки (при сумме от 3 млн ₽)'
        ]
    },
    'marking': {
        'title': 'Для маркировки',
        'docs': [
            'Регистрация в ГИС МТ «Честный ЗНАК»',
            'Усиленная квалифицированная ЭЦП (УКЭП)',
            'Описание товаров в каталоге ГИС МТ',
            'Договор с оператором ЭДО',
            'Коды маркировки (заказ до ввоза или на таможенном складе)',
            'Отчёт о нанесении кодов маркировки'
        ]
    },
    'customs': {
        'title': 'Таможенные документы',
        'docs': [
            'Декларация на товары (ДТ)',
            'Декларация таможенной стоимости (ДТС)',
            'Разрешительные документы (сертификаты, декларации соответствия)',
            'Документы для расчёта таможенных платежей',
            'Классификационное решение ФТС (при необходимости)'
        ]
    },
    'special': {
        'title': 'Специальные (по категориям)',
        'categories': {
            'Лекарственные препараты': ['Регистрационное удостоверение', 'Сертификат GMP', 'Регистрация в МДЛП'],
            'Молочная продукция': ['Ветеринарный сертификат', 'Регистрация в «Меркурий»'],
            'Алкоголь': ['Лицензия на оборот алкоголя', 'Акцизные марки'],
            'Табак': ['Лицензия на оборот табака', 'Специальные марки'],
            'Парфюмерия': ['Декларация о соответствии ТР ТС'],
            'Обувь': ['Декларация о соответствии ТР ТС 017/2011']
        }
    }
}

# ==================== ПОЛЕЗНЫЕ ССЫЛКИ ====================

USEFUL_LINKS = {
    'chestnyznak': {
        'title': 'Честный ЗНАК',
        'url': 'https://chestnyznak.ru',
        'description': 'Официальный сайт системы маркировки'
    },
    'markirovka': {
        'title': 'Национальный каталог',
        'url': 'https://национальный-каталог.рф',
        'description': 'Каталог товаров для маркировки'
    },
    'fts': {
        'title': 'ФТС России',
        'url': 'https://customs.gov.ru',
        'description': 'Федеральная таможенная служба'
    },
    'promarkirui': {
        'title': 'Про.Маркируй',
        'url': 'https://promarkirui.ru',
        'description': 'Наш сервис — помощь с маркировкой'
    }
}

PRODUCT_KEYWORDS = {
    'обувь': {'codes': ['6401', '6402', '6403', '6404', '6405'], 'category': 'Обувь'},
    'кроссовки': {'codes': ['6403', '6404'], 'category': 'Обувь'},
    'туфли': {'codes': ['6403', '6404'], 'category': 'Обувь'},
    'ботинки': {'codes': ['6403', '6404'], 'category': 'Обувь'},
    'сапоги': {'codes': ['6401', '6402', '6403'], 'category': 'Обувь'},

    'одежда': {'codes': ['6201', '6202', '6203', '6204', '6205', '6206'], 'category': 'Легкая промышленность'},
    'куртка': {'codes': ['6201', '6202'], 'category': 'Легкая промышленность'},
    'белье': {'codes': ['6107', '6108'], 'category': 'Легкая промышленность'},

    'молоко': {'codes': ['0401', '0402'], 'category': 'Молочная продукция'},
    'молочка': {'codes': ['0401', '0402', '0403', '0404', '0405', '0406'], 'category': 'Молочная продукция'},
    'сыр': {'codes': ['0406'], 'category': 'Молочная продукция'},
    'творог': {'codes': ['0406'], 'category': 'Молочная продукция'},
    'кефир': {'codes': ['0403'], 'category': 'Молочная продукция'},
    'йогурт': {'codes': ['0403'], 'category': 'Молочная продукция'},
    'мороженое': {'codes': ['2105'], 'category': 'Молочная продукция'},

    'вода': {'codes': ['2201', '2202'], 'category': 'Упакованная вода'},
    'минералка': {'codes': ['2201'], 'category': 'Упакованная вода'},
    'газировка': {'codes': ['2202'], 'category': 'Безалкогольные напитки'},
    'сок': {'codes': ['2009'], 'category': 'Безалкогольные напитки'},

    'пиво': {'codes': ['2203'], 'category': 'Пиво и слабоалкогольные напитки'},
    'сидр': {'codes': ['2206'], 'category': 'Пиво и слабоалкогольные напитки'},

    'табак': {'codes': ['2401', '2402', '2403'], 'category': 'Табачная продукция'},
    'сигареты': {'codes': ['2402'], 'category': 'Табачная продукция'},
    'вейп': {'codes': ['2403'], 'category': 'Никотиносодержащая продукция'},

    'лекарства': {'codes': ['3001', '3002', '3003', '3004'], 'category': 'Лекарственные препараты'},
    'таблетки': {'codes': ['3004'], 'category': 'Лекарственные препараты'},
    'бад': {'codes': ['2106'], 'category': 'БАД'},

    'шины': {'codes': ['4011'], 'category': 'Шины и покрышки'},
    'покрышки': {'codes': ['4011'], 'category': 'Шины и покрышки'},
    'колеса': {'codes': ['4011'], 'category': 'Шины и покрышки'},

    'духи': {'codes': ['3303'], 'category': 'Парфюмерия'},
    'парфюм': {'codes': ['3303'], 'category': 'Парфюмерия'},

    'мех': {'codes': ['4301', '4302', '4303'], 'category': 'Товары из меха'},
    'шуба': {'codes': ['4303'], 'category': 'Товары из меха'},

    'ортез': {'codes': ['9021'], 'category': 'Технические средства реабилитации'},
    'ортезы': {'codes': ['9021'], 'category': 'Технические средства реабилитации'},
    'протез': {'codes': ['9021'], 'category': 'Технические средства реабилитации'},
    'протезы': {'codes': ['9021'], 'category': 'Технические средства реабилитации'},
    'коляска': {'codes': ['8713'], 'category': 'Кресла-коляски'},
    'велосипед': {'codes': ['8711', '8712'], 'category': 'Велосипеды'},

    'консервы': {'codes': ['1601', '1602', '1604', '1605'], 'category': 'Консервированная продукция'},
    'икра': {'codes': ['1604'], 'category': 'Икра'},
    'корм': {'codes': ['2309'], 'category': 'Корма для животных'},
}


# ==================== DATABASE ====================

def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def save_lead(telegram_id: int, username: str, first_name: str, last_name: str, phone: str = None, client_type: str = None):
    """Сохранить или обновить лида в БД"""
    try:
        conn = get_db()
        cursor = conn.cursor()

        cursor.execute("SELECT id FROM telegram_leads WHERE telegram_id = ?", (telegram_id,))
        existing = cursor.fetchone()

        if existing:
            if client_type:
                cursor.execute("""
                    UPDATE telegram_leads
                    SET username = ?, first_name = ?, last_name = ?,
                        phone = COALESCE(?, phone),
                        client_type = COALESCE(?, client_type),
                        last_activity = CURRENT_TIMESTAMP,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE telegram_id = ?
                """, (username, first_name, last_name, phone, client_type, telegram_id))
            else:
                cursor.execute("""
                    UPDATE telegram_leads
                    SET username = ?, first_name = ?, last_name = ?,
                        phone = COALESCE(?, phone),
                        last_activity = CURRENT_TIMESTAMP,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE telegram_id = ?
                """, (username, first_name, last_name, phone, telegram_id))
        else:
            cursor.execute("""
                INSERT INTO telegram_leads (telegram_id, username, first_name, last_name, phone, client_type)
                VALUES (?, ?, ?, ?, ?, ?)
            """, (telegram_id, username, first_name, last_name, phone, client_type))

        conn.commit()
        conn.close()
        logger.info(f"Lead saved: {telegram_id} ({first_name}) type={client_type}")
        return True
    except Exception as e:
        logger.error(f"Error saving lead: {e}")
        return False


def update_lead_query(telegram_id: int, query: str, category: str = None):
    """Обновить последний запрос и категории интересов"""
    try:
        conn = get_db()
        cursor = conn.cursor()

        cursor.execute("SELECT interested_categories FROM telegram_leads WHERE telegram_id = ?", (telegram_id,))
        row = cursor.fetchone()

        if row:
            categories = []
            if row['interested_categories']:
                try:
                    categories = json.loads(row['interested_categories'])
                except:
                    categories = []

            if category and category not in categories:
                categories.append(category)

            cursor.execute("""
                UPDATE telegram_leads
                SET last_query = ?,
                    interested_categories = ?,
                    queries_count = queries_count + 1,
                    last_activity = CURRENT_TIMESTAMP
                WHERE telegram_id = ?
            """, (query, json.dumps(categories, ensure_ascii=False), telegram_id))

            conn.commit()
        conn.close()
    except Exception as e:
        logger.error(f"Error updating lead query: {e}")


def check_lead_has_phone(telegram_id: int) -> bool:
    try:
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute("SELECT phone FROM telegram_leads WHERE telegram_id = ?", (telegram_id,))
        row = cursor.fetchone()
        conn.close()
        return row and row['phone'] and len(row['phone']) > 5
    except:
        return False


def check_lead_has_type(telegram_id: int) -> bool:
    try:
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute("SELECT client_type FROM telegram_leads WHERE telegram_id = ?", (telegram_id,))
        row = cursor.fetchone()
        conn.close()
        return row and row['client_type'] and len(row['client_type']) > 0
    except:
        return False

# ==================== PARTNER FUNCTIONS ====================

BOT_USERNAME = "promarkirui_bot"  # Имя бота для ссылок

def normalize_phone(phone: str) -> str:
    """Нормализация телефона: +79274521553"""
    if not phone:
        return ""
    # Убираем всё кроме цифр
    digits = re.sub(r'\D', '', phone)
    # Если начинается с 8, меняем на 7
    if digits.startswith('8') and len(digits) == 11:
        digits = '7' + digits[1:]
    # Добавляем + если нужно
    if not digits.startswith('+'):
        digits = '+' + digits
    return digits


def get_partner_by_telegram_id(telegram_id: int) -> Optional[Dict]:
    """Получить партнёра по telegram_id"""
    try:
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute('''
            SELECT id, ref_code, contact_name, company_name, contact_phone, 
                   contact_email, commission_rate, status, created_at
            FROM partners 
            WHERE telegram_id = ? AND status = 'active'
        ''', (telegram_id,))
        row = cursor.fetchone()
        conn.close()
        if row:
            return dict(row)
        return None
    except Exception as e:
        logger.error(f"Error getting partner by telegram_id: {e}")
        return None


def get_partner_by_phone(phone: str) -> Optional[Dict]:
    """Получить партнёра по телефону"""
    try:
        normalized = normalize_phone(phone)
        conn = get_db()
        cursor = conn.cursor()
        # Ищем по нормализованному телефону (убираем + для сравнения)
        cursor.execute('''
            SELECT id, ref_code, contact_name, company_name, contact_phone, 
                   contact_email, commission_rate, status, telegram_id, created_at
            FROM partners 
            WHERE REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(contact_phone, '+', ''), '-', ''), ' ', ''), '(', ''), ')', '') 
                  LIKE '%' || ? || '%'
              AND status = 'active'
        ''', (normalized.replace('+', '')[-10:],))  # Последние 10 цифр
        row = cursor.fetchone()
        conn.close()
        if row:
            return dict(row)
        return None
    except Exception as e:
        logger.error(f"Error getting partner by phone: {e}")
        return None


def get_partner_by_ref_code(ref_code: str) -> Optional[Dict]:
    """Получить партнёра по ref_code"""
    try:
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute('''
            SELECT id, ref_code, contact_name, company_name, contact_phone, 
                   contact_email, commission_rate, status, created_at
            FROM partners 
            WHERE ref_code = ? AND status = 'active'
        ''', (ref_code.upper(),))
        row = cursor.fetchone()
        conn.close()
        if row:
            return dict(row)
        return None
    except Exception as e:
        logger.error(f"Error getting partner by ref_code: {e}")
        return None


def link_partner_telegram(partner_id: int, telegram_id: int) -> bool:
    """Привязать telegram_id к партнёру"""
    try:
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute('''
            UPDATE partners SET telegram_id = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        ''', (telegram_id, partner_id))
        conn.commit()
        conn.close()
        return True
    except Exception as e:
        logger.error(f"Error linking partner telegram: {e}")
        return False


def save_lead_with_ref(telegram_id: int, username: str, first_name: str, 
                       last_name: str, phone: str = None, client_type: str = None,
                       ref_code: str = None):
    """Сохранить лида с реферальным кодом"""
    try:
        conn = get_db()
        cursor = conn.cursor()
        
        cursor.execute("SELECT id, ref_code FROM telegram_leads WHERE telegram_id = ?", (telegram_id,))
        existing = cursor.fetchone()
        
        if existing:
            # Обновляем, но НЕ перезаписываем ref_code если уже есть
            if ref_code and not existing['ref_code']:
                cursor.execute('''
                    UPDATE telegram_leads
                    SET username = ?, first_name = ?, last_name = ?,
                        phone = COALESCE(?, phone),
                        client_type = COALESCE(?, client_type),
                        ref_code = ?,
                        last_activity = CURRENT_TIMESTAMP,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE telegram_id = ?
                ''', (username, first_name, last_name, phone, client_type, ref_code, telegram_id))
            else:
                cursor.execute('''
                    UPDATE telegram_leads
                    SET username = ?, first_name = ?, last_name = ?,
                        phone = COALESCE(?, phone),
                        client_type = COALESCE(?, client_type),
                        last_activity = CURRENT_TIMESTAMP,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE telegram_id = ?
                ''', (username, first_name, last_name, phone, client_type, telegram_id))
        else:
            cursor.execute('''
                INSERT INTO telegram_leads (telegram_id, username, first_name, last_name, phone, client_type, ref_code)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            ''', (telegram_id, username, first_name, last_name, phone, client_type, ref_code))
        
        conn.commit()
        conn.close()
        logger.info(f"Lead saved: {telegram_id} ({first_name}) ref={ref_code}")
        return True
    except Exception as e:
        logger.error(f"Error saving lead with ref: {e}")
        return False


def get_partner_stats(partner_id: int = None, ref_code: str = None) -> Dict:
    """Получить статистику партнёра (telegram + сайт)"""
    try:
        conn = get_db()
        cursor = conn.cursor()
        
        if not ref_code and partner_id:
            cursor.execute("SELECT ref_code, commission_rate FROM partners WHERE id = ?", (partner_id,))
            row = cursor.fetchone()
            ref_code = row['ref_code'] if row else None
            commission_rate = row['commission_rate'] if row else 10.0
        else:
            cursor.execute("SELECT commission_rate FROM partners WHERE ref_code = ?", (ref_code.upper() if ref_code else '',))
            row = cursor.fetchone()
            commission_rate = row['commission_rate'] if row else 10.0
        
        if not ref_code:
            conn.close()
            return {'referrals_count': 0, 'referrals_with_phone': 0, 'earned': 0, 'quotes_count': 0}
        
        # Считаем рефералов из Telegram
        cursor.execute('''
            SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN phone IS NOT NULL AND phone != '' THEN 1 ELSE 0 END) as with_phone
            FROM telegram_leads
            WHERE ref_code = ?
        ''', (ref_code.upper(),))
        tg_row = cursor.fetchone()
        tg_referrals = tg_row['total'] if tg_row else 0
        tg_with_phone = tg_row['with_phone'] if tg_row else 0
        
        # Считаем заявки с сайта (КП)
        cursor.execute('''
            SELECT 
                COUNT(*) as quotes_count,
                COALESCE(SUM(total_amount), 0) as quotes_amount
            FROM quotes
            WHERE ref_code = ?
        ''', (ref_code.upper(),))
        site_row = cursor.fetchone()
        quotes_count = site_row['quotes_count'] if site_row else 0
        quotes_amount = site_row['quotes_amount'] if site_row else 0
        
        # Считаем комиссию с оплаченных договоров
        cursor.execute('''
            SELECT COALESCE(SUM(c.total_amount), 0) as paid_amount
            FROM contracts c
            JOIN quotes q ON c.quote_id = q.id
            WHERE q.ref_code = ? AND c.status IN ('signed', 'active', 'completed')
        ''', (ref_code.upper(),))
        paid_row = cursor.fetchone()
        paid_amount = paid_row['paid_amount'] if paid_row else 0
        earned = paid_amount * commission_rate / 100
        
        conn.close()
        
        return {
            'referrals_count': tg_referrals + quotes_count,  # Всего рефералов
            'referrals_with_phone': tg_with_phone,
            'quotes_count': quotes_count,  # Заявок с сайта
            'quotes_amount': quotes_amount,
            'earned': earned,
            'commission_rate': commission_rate
        }
    except Exception as e:
        logger.error(f"Error getting partner stats: {e}")
        return {'referrals_count': 0, 'referrals_with_phone': 0, 'earned': 0, 'quotes_count': 0}

def get_partner_referrals(ref_code: str, limit: int = 10) -> list:
    """Получить список рефералов партнёра"""
    try:
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute("""
            SELECT 
                q.contact_name as first_name,
                q.quote_number,
                q.created_at,
                q.contact_phone as phone,
                q.total_amount,
                q.status,
                CASE WHEN q.contact_phone IS NOT NULL AND q.contact_phone != "" THEN 1 ELSE 0 END as has_phone
            FROM quotes q
            WHERE q.ref_code = ?
            ORDER BY q.created_at DESC
            LIMIT ?
        """, (ref_code, limit))
        rows = cursor.fetchall()
        conn.close()
        return [dict(row) for row in rows]
    except Exception as e:
        logger.error(f"Error getting partner referrals: {e}")
        return []



# ==================== DATA LOADING ====================

def get_category_id(category: str) -> str:
    short_id = hashlib.md5(category.encode()).hexdigest()[:8]
    category_id_map[short_id] = category
    return short_id


def get_category_by_id(cat_id: str) -> Optional[str]:
    return category_id_map.get(cat_id)


def load_data():
    global tnved_marking, category_requirements, marking_timeline

    try:
        with open(TNVED_MARKING_PATH, 'r', encoding='utf-8') as f:
            tnved_marking = json.load(f)
        logger.info(f"Загружено {len(tnved_marking)} кодов ТНВЭД")
    except Exception as e:
        logger.error(f"Ошибка загрузки tnved_marking.json: {e}")

    try:
        with open(CATEGORY_REQUIREMENTS_PATH, 'r', encoding='utf-8') as f:
            category_requirements = json.load(f)
        for cat_name in category_requirements.keys():
            get_category_id(cat_name)
    except Exception as e:
        logger.error(f"Ошибка загрузки category_requirements.json: {e}")

    try:
        with open(TIMELINE_PATH, 'r', encoding='utf-8') as f:
            marking_timeline = json.load(f)
        for cat_name in marking_timeline.get('categories', {}).keys():
            get_category_id(cat_name)
    except Exception as e:
        logger.error(f"Ошибка загрузки marking_timeline.json: {e}")


# ==================== SEARCH FUNCTIONS ====================

def normalize_code(code: str) -> str:
    return re.sub(r'\s+', '', code.strip())


def find_by_keyword(text: str) -> Optional[Dict]:
    text_lower = text.lower().strip()

    if text_lower in PRODUCT_KEYWORDS:
        return PRODUCT_KEYWORDS[text_lower]

    for keyword, data in PRODUCT_KEYWORDS.items():
        if keyword in text_lower or text_lower in keyword:
            return data

    results = []
    for code, entries in tnved_marking.items():
        for entry in entries:
            product = entry.get('product', '').lower()
            subcategory = entry.get('subcategory', '').lower()
            if text_lower in product or text_lower in subcategory:
                results.append({'code': code, 'entry': entry})
                if len(results) >= 5:
                    break
        if len(results) >= 5:
            break

    if results:
        return {
            'search_results': results,
            'category': results[0]['entry'].get('subcategory', 'Не указана')
        }
    return None


def find_marking_info(code: str) -> Optional[Dict]:
    code = normalize_code(code)

    if code in tnved_marking:
        return {'code': code, 'entries': tnved_marking[code], 'match_type': 'exact'}

    for length in range(len(code) - 1, 3, -1):
        prefix = code[:length]
        if prefix in tnved_marking:
            return {'code': code, 'matched_prefix': prefix, 'entries': tnved_marking[prefix], 'match_type': 'prefix'}

    return None


def get_category_details(subcategory: str) -> Optional[Dict]:
    subcategory_lower = subcategory.lower().strip()

    for cat_name, cat_data in category_requirements.items():
        if cat_name.lower() == subcategory_lower:
            return {'category': cat_name, 'data': cat_data}

    for cat_name, cat_data in category_requirements.items():
        if subcategory_lower in cat_name.lower() or cat_name.lower() in subcategory_lower:
            return {'category': cat_name, 'data': cat_data}

    return None


def get_timeline_for_category(category: str) -> Optional[Dict]:
    category_lower = category.lower().strip()
    categories = marking_timeline.get('categories', {})

    for cat_name, cat_data in categories.items():
        if cat_name.lower() == category_lower:
            return {'category': cat_name, 'data': cat_data}

    for cat_name, cat_data in categories.items():
        if category_lower in cat_name.lower() or cat_name.lower() in category_lower:
            return {'category': cat_name, 'data': cat_data}

    return None


# ==================== FORMATTERS ====================

def format_timeline(category: str) -> str:
    timeline_data = get_timeline_for_category(category)

    if not timeline_data:
        return f"Сроки для «{category}» не найдены."

    cat_name = timeline_data['category']
    data = timeline_data['data']
    events = data.get('events', [])
    status = data.get('status_label', '')

    text = "📅 СРОКИ МАРКИРОВКИ\n"
    text += "━━━━━━━━━━━━━━━━━━━━\n\n"
    text += f"📦 {cat_name}\n"
    text += f"📊 Статус: {status}\n\n"

    key_events = {'registration': [], 'mandatory_start': [], 'retail': [], 'ban': [], 'retail_permission': []}

    for event in events:
        event_type = event.get('type', '')
        if event_type in key_events:
            key_events[event_type].append(event)

    shown = set()

    if key_events['registration']:
        e = key_events['registration'][0]
        audiences = ', '.join(e.get('audiences_display', []))
        text += f"📝 Регистрация:\n   {e['date_display']} — {audiences}\n\n"
        shown.add(e['date'])

    if key_events['mandatory_start']:
        text += "🚀 Старт маркировки:\n"
        for e in key_events['mandatory_start'][:3]:
            if e['date'] not in shown:
                title_short = e['title'].replace('Старт маркировки ', '').replace('Старт обязательной маркировки ', '')[:50]
                text += f"   • {e['date_display']} — {title_short}\n"
                shown.add(e['date'])
        text += "\n"

    if key_events['ban']:
        e = key_events['ban'][0]
        text += f"⛔ Запрет немаркированного:\n   {e['date_display']}\n\n"

    text += "━━━━━━━━━━━━━━━━━━━━\n"
    text += "🌐 promarkirui.ru/timeline"
    return text


def format_marking_result(info: Dict) -> str:
    entry = info['entries'][0]
    code = info['code']
    group = entry.get('group', 'Не указана')
    subcategory = entry.get('subcategory', 'Не указана')
    product = entry.get('product', 'Не указан')

    result = "✅ ТОВАР ПОДЛЕЖИТ МАРКИРОВКЕ\n"
    result += "━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n"
    result += f"🔢 Код ТНВЭД: {code}\n"

    if info.get('match_type') == 'prefix':
        result += f"   (найден по: {info['matched_prefix']})\n"

    result += f"\n📁 Группа: {group}\n"
    result += f"📦 Категория: {subcategory}\n"
    product_short = product[:100] + '...' if len(product) > 100 else product
    result += f"🏷 Товар: {product_short}\n"

    details = get_category_details(subcategory)
    if details:
        decree = details['data'].get('decree', {})
        result += f"\n📋 ПП РФ № {decree.get('number', '?')} от {decree.get('date', '?')}\n"

    result += "\n━━━━━━━━━━━━━━━━━━━━━━━━━━\n"
    result += "🌐 promarkirui.ru"
    return result


def format_keyword_result(keyword_data: Dict, search_text: str) -> str:
    if 'codes' in keyword_data:
        codes = keyword_data['codes']
        category = keyword_data['category']

        result = "✅ ТОВАР ПОДЛЕЖИТ МАРКИРОВКЕ\n"
        result += "━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n"
        result += f"🔍 Запрос: {search_text}\n"
        result += f"📦 Категория: {category}\n\n"
        result += "🔢 Коды ТНВЭД:\n"

        for code in codes[:4]:
            if code in tnved_marking:
                entry = tnved_marking[code][0]
                product_name = entry.get('product', '')[:30]
                result += f"   • {code} — {product_name}\n"
            else:
                result += f"   • {code}\n"

        details = get_category_details(category)
        if details:
            decree = details['data'].get('decree', {})
            result += f"\n📋 ПП РФ № {decree.get('number', '?')} от {decree.get('date', '?')}\n"

        result += "\n━━━━━━━━━━━━━━━━━━━━━━━━━━\n"
        result += "🌐 promarkirui.ru"
        return result

    if 'search_results' in keyword_data:
        results = keyword_data['search_results']
        result = f"🔍 НАЙДЕНЫ ТОВАРЫ\n"
        result += "━━━━━━━━━━━━━━━━━━━━\n\n"
        result += f"Запрос: {search_text}\n\n"

        for item in results[:4]:
            code = item['code']
            entry = item['entry']
            product = entry.get('product', '')[:30]
            result += f"   • {code} — {product}\n"

        result += "\n━━━━━━━━━━━━━━━━━━━━\n"
        result += "🌐 promarkirui.ru"
        return result

    return None


def format_not_found(text: str) -> str:
    return (
        f"❌ «{text}» — не найдено\n"
        f"━━━━━━━━━━━━━━━━━━━━\n\n"
        f"Возможные причины:\n"
        f"• Товар не подлежит маркировке\n"
        f"• Попробуйте другое название\n\n"
        f"💡 Примеры: обувь, молоко, пиво, 6403\n\n"
        f"━━━━━━━━━━━━━━━━━━━━\n"
        f"📞 Нужна помощь? promarkirui.ru/consultation"
    )


def format_checklist(category: str) -> str:
    """Форматирование чек-листа подключения к маркировке"""
    details = get_category_details(category)

    if not details:
        return f"Чек-лист для «{category}» не найден."

    cat_name = details['category']
    data = details['data']
    checklist = data.get('checklist', [])
    deadlines = data.get('deadlines', {})

    text = "✅ ЧЕК-ЛИСТ ПОДКЛЮЧЕНИЯ\n"
    text += "━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n"
    text += f"📦 {cat_name}\n\n"

    if checklist:
        for i, item in enumerate(checklist, 1):
            text += f"☐ {i}. {item}\n"

    if deadlines:
        text += "\n⏰ Важные сроки:\n"
        deadline_labels = {
            'registration': 'Регистрация',
            'marking_report': 'Отчёт о нанесении',
            'upd_transfer': 'Передача УПД'
        }
        for key, label in deadline_labels.items():
            if key in deadlines:
                text += f"   • {label}: {deadlines[key]}\n"

    text += "\n━━━━━━━━━━━━━━━━━━━━━━━━━━\n"
    text += "📞 Помощь: promarkirui.ru/consultation"
    return text


def format_exceptions(category: str) -> str:
    """Форматирование исключений из маркировки"""
    details = get_category_details(category)

    if not details:
        return f"Исключения для «{category}» не найдены."

    cat_name = details['category']
    data = details['data']
    exceptions = data.get('exceptions', [])

    text = "⚠️ ИСКЛЮЧЕНИЯ ИЗ МАРКИРОВКИ\n"
    text += "━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n"
    text += f"📦 {cat_name}\n\n"
    text += "Не требуют маркировки:\n\n"

    if exceptions:
        for item in exceptions:
            text += f"• {item}\n"
    else:
        text += "Исключений не найдено.\n"
        text += "Все товары категории подлежат маркировке."

    text += "\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"
    text += "🌐 promarkirui.ru"
    return text


def format_fines_list() -> str:
    """Список всех штрафов"""
    text = "⚖️ ШТРАФЫ ЗА МАРКИРОВКУ\n"
    text += "━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n"
    text += "Выберите тип нарушения:\n\n"

    icons = {
        'production': '🏭',
        'sale': '🏪',
        'alcohol_tobacco_production': '🍺',
        'alcohol_tobacco_sale': '🚬',
        'data_violation': '📊'
    }

    for key, fine in FINES_DATA.items():
        icon = icons.get(key, '📋')
        text += f"{icon} {fine['title']}\n"

    text += "\n━━━━━━━━━━━━━━━━━━━━━━━━━━"
    return text


def format_fine_detail(fine_key: str) -> str:
    """Детальная информация о штрафе"""
    fine = FINES_DATA.get(fine_key)
    if not fine:
        return "Информация о штрафе не найдена."

    text = f"⚖️ {fine['title'].upper()}\n"
    text += "━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n"
    text += f"📋 {fine['article']}\n\n"
    text += f"{fine['description']}\n\n"
    text += "💰 Размер штрафа:\n"

    fine_labels = {
        'citizen': '👤 Граждане',
        'official': '👔 Должн. лица',
        'legal': '🏢 Юр. лица'
    }

    for key, label in fine_labels.items():
        if key in fine['fines']:
            text += f"   {label}: {fine['fines'][key]}\n"

    if fine.get('additional'):
        text += f"\n⚠️ {fine['additional']}\n"

    text += "\n━━━━━━━━━━━━━━━━━━━━━━━━━━\n"
    text += "📞 Консультация: promarkirui.ru"
    return text


def format_import_docs() -> str:
    """Список документов для импорта"""
    text = "📄 ДОКУМЕНТЫ ДЛЯ ИМПОРТА\n"
    text += "━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n"

    for section_key, section in IMPORT_DOCUMENTS.items():
        if section_key == 'special':
            continue
        text += f"📁 {section['title']}:\n"
        for doc in section['docs'][:4]:
            text += f"   • {doc}\n"
        text += "\n"

    text += "━━━━━━━━━━━━━━━━━━━━━━━━━━\n"
    text += "🌐 promarkirui.ru/import"
    return text


def format_useful_links() -> str:
    """Полезные ссылки"""
    text = "🔗 ПОЛЕЗНЫЕ ССЫЛКИ\n"
    text += "━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n"

    for key, link in USEFUL_LINKS.items():
        text += f"🔹 {link['title']}\n"
        text += f"   {link['description']}\n"
        text += f"   {link['url']}\n\n"

    text += "━━━━━━━━━━━━━━━━━━━━━━━━━━"
    return text


# ==================== MENU BUILDERS ====================

def create_main_menu():
    """Главное меню бота"""
    return InlineKeyboardMarkup([
        [InlineKeyboardButton("🔍 Проверить товар", callback_data="new_search")],
        [InlineKeyboardButton("📚 Все категории", callback_data="cat")],
        [InlineKeyboardButton("📖 Справочник", callback_data="handbook")],
        [
            InlineKeyboardButton("🤖 AI-консультант", callback_data="ai_consultant"),
            InlineKeyboardButton("📞 Консультация", url="https://promarkirui.ru/consultation")
        ],
        [
            InlineKeyboardButton("🎓 Обучение", url="https://promarkirui.ru/training"),
            InlineKeyboardButton("🤝 Партнёрам", callback_data="partners")
        ],
        [InlineKeyboardButton("🌐 promarkirui.ru", url="https://promarkirui.ru")]
    ])


def create_handbook_menu():
    """Меню справочника"""
    return InlineKeyboardMarkup([
        [InlineKeyboardButton("⚖️ Штрафы за нарушения", callback_data="hb:fines")],
        [InlineKeyboardButton("📄 Документы для импорта", callback_data="hb:import_docs")],
        [InlineKeyboardButton("🔗 Полезные ссылки", callback_data="hb:links")],
        [InlineKeyboardButton("🏠 Главное меню", callback_data="main_menu")]
    ])


def create_fines_menu():
    """Меню штрафов"""
    return InlineKeyboardMarkup([
        [InlineKeyboardButton("🏭 Производство без маркировки", callback_data="fine:production")],
        [InlineKeyboardButton("🏪 Продажа без маркировки", callback_data="fine:sale")],
        [InlineKeyboardButton("🍺 Алкоголь/табак (производство)", callback_data="fine:alcohol_tobacco_production")],
        [InlineKeyboardButton("🚬 Алкоголь/табак (продажа)", callback_data="fine:alcohol_tobacco_sale")],
        [InlineKeyboardButton("📊 Нарушение передачи данных", callback_data="fine:data_violation")],
        [
            InlineKeyboardButton("◀️ Назад", callback_data="handbook"),
            InlineKeyboardButton("🏠 Меню", callback_data="main_menu")
        ]
    ])


def create_result_buttons(category: str):
    """Кнопки после результата поиска - расширенные"""
    cat_id = get_category_id(category)
    return InlineKeyboardMarkup([
        [
            InlineKeyboardButton("📅 Сроки", callback_data=f"t:{cat_id}"),
            InlineKeyboardButton("⚠️ Исключения", callback_data=f"e:{cat_id}")
        ],
        [
            InlineKeyboardButton("✅ Чек-лист", callback_data=f"c:{cat_id}"),
            InlineKeyboardButton("⚖️ Штрафы", callback_data="hb:fines")
        ],
        [
            InlineKeyboardButton("🔍 Новый поиск", callback_data="new_search"),
            InlineKeyboardButton("📚 Категории", callback_data="cat")
        ],
        [InlineKeyboardButton("📞 Консультация", url="https://promarkirui.ru/consultation")],
        [InlineKeyboardButton("🏠 Главное меню", callback_data="main_menu")]
    ])


def create_back_menu():
    """Кнопки навигации назад"""
    return InlineKeyboardMarkup([
        [
            InlineKeyboardButton("🔍 Новый поиск", callback_data="new_search"),
            InlineKeyboardButton("📚 Категории", callback_data="cat")
        ],
        [InlineKeyboardButton("🏠 Главное меню", callback_data="main_menu")]
    ])


def create_back_to_handbook():
    """Кнопка назад в справочник"""
    return InlineKeyboardMarkup([
        [
            InlineKeyboardButton("◀️ Назад", callback_data="handbook"),
            InlineKeyboardButton("🏠 Меню", callback_data="main_menu")
        ]
    ])


def create_back_to_fines():
    """Кнопка назад к штрафам"""
    return InlineKeyboardMarkup([
        [
            InlineKeyboardButton("◀️ К штрафам", callback_data="hb:fines"),
            InlineKeyboardButton("🏠 Меню", callback_data="main_menu")
        ]
    ])


def create_search_menu():
    """Меню во время поиска"""
    return InlineKeyboardMarkup([
        [InlineKeyboardButton("📚 Все категории", callback_data="cat")],
        [InlineKeyboardButton("🏠 Главное меню", callback_data="main_menu")]
    ])


def create_category_detail_menu(cat_id: str):
    """Меню после просмотра деталей категории"""
    return InlineKeyboardMarkup([
        [
            InlineKeyboardButton("📅 Сроки", callback_data=f"t:{cat_id}"),
            InlineKeyboardButton("⚠️ Исключения", callback_data=f"e:{cat_id}")
        ],
        [
            InlineKeyboardButton("✅ Чек-лист", callback_data=f"c:{cat_id}"),
            InlineKeyboardButton("⚖️ Штрафы", callback_data="hb:fines")
        ],
        [
            InlineKeyboardButton("◀️ Категории", callback_data="cat"),
            InlineKeyboardButton("🏠 Меню", callback_data="main_menu")
        ]
    ])


# ==================== HANDLERS ====================

async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Обработчик /start с поддержкой реферальных ссылок"""
    user = update.effective_user
    telegram_id = user.id
    username = user.username
    first_name = user.first_name or ""
    last_name = user.last_name or ""
    
    # Парсим реферальный код из /start REF_CODE
    ref_code = None
    if context.args and len(context.args) > 0:
        potential_ref = context.args[0].upper()
        # Проверяем что это валидный ref_code (6 символов, буквы/цифры)
        if re.match(r'^[A-Z0-9]{6}$', potential_ref):
            # Проверяем существование партнёра
            partner = get_partner_by_ref_code(potential_ref)
            if partner:
                ref_code = potential_ref
                logger.info(f"User {telegram_id} came from partner {ref_code}")

    # Сохраняем лида с ref_code
    save_lead_with_ref(telegram_id, username, first_name, last_name, ref_code=ref_code)

    has_phone = check_lead_has_phone(telegram_id)
    has_type = check_lead_has_type(telegram_id)

    if has_phone and has_type:
        welcome_text = (
            f"👋 С возвращением, {first_name}!\n"
            "━━━━━━━━━━━━━━━━━━━━━━━━\n\n"
            "Я помогу проверить, подлежит ли\n"
            "ваш товар обязательной маркировке.\n\n"
            "💡 Напишите название товара\n"
            "   или код ТНВЭД\n\n"
            "Примеры: обувь, молоко, 6403\n"
            "━━━━━━━━━━━━━━━━━━━━━━━━"
        )
        await update.message.reply_text(welcome_text, reply_markup=create_main_menu())
        return ConversationHandler.END

    if has_phone and not has_type:
        return await ask_client_type(update, context)

    keyboard = ReplyKeyboardMarkup(
        [[KeyboardButton("📱 Поделиться номером", request_contact=True)]],
        resize_keyboard=True,
        one_time_keyboard=True
    )

    welcome_text = (
        f"👋 Привет, {first_name}!\n"
        "━━━━━━━━━━━━━━━━━━━━━━━━\n\n"
        "Я — бот сервиса Про.Маркируй\n"
        "Помогу проверить маркировку товаров.\n\n"
        "📱 Поделитесь номером телефона:\n"
        "• Уведомления об изменениях сроков\n"
        "• Возможность консультации\n\n"
        "👇 Нажмите кнопку ниже"
    )

    await update.message.reply_text(welcome_text, reply_markup=keyboard)

    return WAITING_PHONE

async def ask_client_type(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Спросить тип клиента"""
    keyboard = InlineKeyboardMarkup([
        [
            InlineKeyboardButton("📦 Импортёр", callback_data="type:importer"),
            InlineKeyboardButton("🏭 Производитель", callback_data="type:manufacturer")
        ],
        [
            InlineKeyboardButton("🏪 Розница", callback_data="type:retailer"),
            InlineKeyboardButton("📊 Оптовик", callback_data="type:wholesaler")
        ],
        [
            InlineKeyboardButton("🛒 Маркетплейс", callback_data="type:marketplace"),
            InlineKeyboardButton("📋 Бухгалтер", callback_data="type:accountant")
        ],
        [InlineKeyboardButton("⚖️ Консультант / Юрист", callback_data="type:consultant")],
        [InlineKeyboardButton("✏️ Другое (ввести)", callback_data="type:custom")]
    ])

    text = (
        "👤 Кто вы?\n"
        "━━━━━━━━━━━━━━━━━━━━\n\n"
        "Выберите тип деятельности:\n"
        "Это поможет подобрать\n"
        "релевантную информацию"
    )

    if update.callback_query:
        await update.callback_query.edit_message_text(text, reply_markup=keyboard)
    else:
        await update.message.reply_text(text, reply_markup=keyboard)

    return WAITING_CLIENT_TYPE


async def receive_contact(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Получение контакта"""
    user = update.effective_user
    contact = update.message.contact

    if contact:
        phone = contact.phone_number
        save_lead(user.id, user.username, user.first_name, user.last_name, phone)

        await update.message.reply_text(
            "✅ Спасибо! Номер сохранён.",
            reply_markup=ReplyKeyboardRemove()
        )

        return await ask_client_type(update, context)

    return WAITING_PHONE


async def handle_phone_text(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Если пользователь пишет текст вместо нажатия кнопки"""
    text = update.message.text.strip()

    phone_pattern = re.match(r'^[\+]?[0-9\s\-\(\)]{10,}$', text)

    if phone_pattern:
        user = update.effective_user
        save_lead(user.id, user.username, user.first_name, user.last_name, text)

        await update.message.reply_text(
            "✅ Спасибо! Номер сохранён.",
            reply_markup=ReplyKeyboardRemove()
        )
        return await ask_client_type(update, context)

    keyboard = ReplyKeyboardMarkup(
        [[KeyboardButton("📱 Поделиться номером", request_contact=True)]],
        resize_keyboard=True,
        one_time_keyboard=True
    )

    await update.message.reply_text(
        "⚠️ Нажмите кнопку «Поделиться номером»\nили введите номер: +79991234567",
        reply_markup=keyboard
    )

    return WAITING_PHONE


async def receive_client_type(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Получение типа клиента"""
    query = update.callback_query
    await query.answer()

    data = query.data

    if data == "type:custom":
        await query.edit_message_text(
            "✏️ Напишите кто вы:\n"
            "━━━━━━━━━━━━━━━━━━━━\n\n"
            "Например: логист, таможенный\n"
            "брокер, склад, курьер..."
        )
        return WAITING_CUSTOM_TYPE

    if data.startswith("type:"):
        client_type = data[5:]
        user = query.from_user

        save_lead(user.id, user.username, user.first_name, user.last_name, client_type=client_type)

        type_label = CLIENT_TYPES.get(client_type, client_type)

        success_text = (
            f"✅ Отлично! Вы: {type_label}\n"
            "━━━━━━━━━━━━━━━━━━━━━━━━\n\n"
            "Теперь вы можете:\n\n"
            "🔍 Проверить товар — напишите\n"
            "   название или код ТНВЭД\n\n"
            "💡 Примеры: обувь, молоко, 6403\n"
            "━━━━━━━━━━━━━━━━━━━━━━━━"
        )

        await query.edit_message_text(success_text, reply_markup=create_main_menu())

        return ConversationHandler.END

    return WAITING_CLIENT_TYPE


async def receive_custom_type(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Получение кастомного типа клиента"""
    text = update.message.text.strip()
    user = update.effective_user

    save_lead(user.id, user.username, user.first_name, user.last_name, client_type=text)

    success_text = (
        f"✅ Отлично! Вы: {text}\n"
        "━━━━━━━━━━━━━━━━━━━━━━━━\n\n"
        "Теперь вы можете:\n\n"
        "🔍 Проверить товар — напишите\n"
        "   название или код ТНВЭД\n\n"
        "💡 Примеры: обувь, молоко, 6403\n"
        "━━━━━━━━━━━━━━━━━━━━━━━━"
    )

    await update.message.reply_text(success_text, reply_markup=create_main_menu())

    return ConversationHandler.END


async def help_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    help_text = (
        "❓ СПРАВКА\n"
        "━━━━━━━━━━━━━━━━━━━━━━━━\n\n"
        "🔍 Как проверить товар:\n"
        "   Напишите название или код ТНВЭД\n\n"
        "💡 Примеры запросов:\n"
        "   • обувь, молоко, шины\n"
        "   • пиво, ортезы, духи\n"
        "   • 6403, 0401, 4011\n\n"
        "📚 Команды:\n"
        "   /menu — главное меню\n"
        "   /categories — все категории\n"
        "   /fines — штрафы\n"
        "   /help — эта справка\n"
        "━━━━━━━━━━━━━━━━━━━━━━━━"
    )
    await update.message.reply_text(help_text, reply_markup=create_main_menu())


async def menu_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Команда /menu - показать главное меню"""
    menu_text = (
        "🏠 ГЛАВНОЕ МЕНЮ\n"
        "━━━━━━━━━━━━━━━━━━━━━━━━\n\n"
        "Выберите действие или напишите\n"
        "название товара для проверки\n"
        "━━━━━━━━━━━━━━━━━━━━━━━━"
    )
    await update.message.reply_text(menu_text, reply_markup=create_main_menu())


async def fines_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Команда /fines - показать штрафы"""
    await update.message.reply_text(format_fines_list(), reply_markup=create_fines_menu())


async def categories_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    text = "📚 КАТЕГОРИИ МАРКИРОВКИ\n"
    text += "━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n"
    for i, (cat_name, cat_data) in enumerate(category_requirements.items(), 1):
        decree = cat_data.get('decree', {})
        text += f"{i}. {cat_name}\n   📋 ПП РФ № {decree.get('number', '?')}\n\n"
    text += "━━━━━━━━━━━━━━━━━━━━━━━━━━"
    await update.message.reply_text(text, reply_markup=create_back_menu())


async def handle_message(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Обработка текстовых сообщений"""
    text = update.message.text.strip()
    user = update.effective_user

    code = normalize_code(text)
    if re.match(r'^\d{4,10}$', code):
        await process_code(update, code)
        return

    keyword_data = find_by_keyword(text)

    if keyword_data:
        category = keyword_data.get('category', '')
        update_lead_query(user.id, text, category)

        result = format_keyword_result(keyword_data, text)

        if category:
            buttons = create_result_buttons(category)
        else:
            buttons = create_back_menu()

        await update.message.reply_text(result, reply_markup=buttons)
    else:
        await update.message.reply_text(
            format_not_found(text),
            reply_markup=create_back_menu()
        )


async def process_code(update: Update, code: str):
    user = update.effective_user
    code = normalize_code(code)
    info = find_marking_info(code)

    if info:
        category = info['entries'][0].get('subcategory', '')
        update_lead_query(user.id, code, category)

        result = format_marking_result(info)
        buttons = create_result_buttons(category)
        await update.message.reply_text(result, reply_markup=buttons)
    else:
        await update.message.reply_text(
            format_not_found(code),
            reply_markup=create_back_menu()
        )



# ==================== PARTNER HANDLERS ====================

async def handle_partners_menu(query, user):
    """Обработчик кнопки Партнёрам"""
    telegram_id = user.id
    
    # Проверяем, является ли пользователь партнёром
    partner = get_partner_by_telegram_id(telegram_id)
    
    if partner:
        # Пользователь — партнёр, показываем кабинет
        return await show_partner_cabinet(query, partner)
    
    # Проверяем по телефону (может партнёр, но не привязан telegram)
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT phone FROM telegram_leads WHERE telegram_id = ?", (telegram_id,))
    row = cursor.fetchone()
    conn.close()
    
    if row and row['phone']:
        partner = get_partner_by_phone(row['phone'])
        if partner:
            # Нашли партнёра по телефону — привязываем telegram_id
            link_partner_telegram(partner['id'], telegram_id)
            return await show_partner_cabinet(query, partner)
    
    # Не партнёр — показываем информацию о программе
    return await show_partner_info(query)


async def show_partner_info(query):
    """Показать информацию о партнёрской программе"""
    text = (
        "🤝 ПАРТНЁРСКАЯ ПРОГРАММА\n"
        "━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n"
        "Зарабатывайте с Про.Маркируй!\n\n"
        "💰 Ваши выгоды:\n"
        "• 1% с каждого платежа клиента\n"
        "• Пожизненное закрепление клиентов\n"
        "• Выплаты на карту или ИП/ООО\n\n"
        "📊 Как это работает:\n"
        "1. Вы получаете уникальную ссылку\n"
        "2. Делитесь с клиентами\n"
        "3. Получаете 1% с их платежей\n\n"
        "✅ Подходит для:\n"
        "• Бухгалтеров и консультантов\n"
        "• Логистов и таможенников\n"
        "• Владельцев бизнес-сообществ\n"
        "━━━━━━━━━━━━━━━━━━━━━━━━━━"
    )
    
    keyboard = InlineKeyboardMarkup([
        [InlineKeyboardButton("📝 Стать партнёром", url="https://promarkirui.ru/partners")],
        [InlineKeyboardButton("🔑 Я уже партнёр", callback_data="partner_login")],
        [InlineKeyboardButton("🏠 Главное меню", callback_data="main_menu")]
    ])
    
    await query.edit_message_text(text, reply_markup=keyboard)


async def show_partner_cabinet(query, partner):
    """Показать кабинет партнёра"""
    ref_code = partner['ref_code']
    name = partner.get('contact_name', 'Партнёр')
    
    # Получаем статистику
    stats = get_partner_stats(ref_code=ref_code)
    
    earned = stats.get('earned', 0)
    earned_str = f"{earned:,.0f}".replace(',', ' ') if earned else "0"
    
    text = (
        f"🤝 ПАРТНЁРСКИЙ КАБИНЕТ\n"
        f"━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n"
        f"👤 {name}\n"
        f"📋 Код: {ref_code}\n\n"
        f"📊 Ваша статистика:\n"
        f"👥 Рефералов всего: {stats.get('referrals_count', 0)}\n"
        f"📝 Заявок с сайта: {stats.get('quotes_count', 0)}\n"
        f"💰 Заработано: {earned_str} ₽\n\n"
        f"🔗 Ссылки для приглашений:\n"
        f"📱 Бот: t.me/{BOT_USERNAME}?start={ref_code}\n"
        f"🌐 Сайт: promarkirui.ru/quote?ref={ref_code}\n"
        f"━━━━━━━━━━━━━━━━━━━━━━━━━━"
    )
    
    keyboard = InlineKeyboardMarkup([
        [InlineKeyboardButton("📋 Скопировать ссылку", callback_data="partner_copy_link")],
        [InlineKeyboardButton("👥 Мои рефералы", callback_data="partner_referrals")],
        [InlineKeyboardButton("🌐 Полный кабинет", url="https://promarkirui.ru/partner/login")],
        [InlineKeyboardButton("🏠 Главное меню", callback_data="main_menu")]
    ])
    
    await query.edit_message_text(text, reply_markup=keyboard)

async def show_partner_referrals(query, partner):
    """Показать список рефералов партнёра"""
    ref_code = partner['ref_code']
    referrals = get_partner_referrals(ref_code, limit=10)
    
    if not referrals:
        text = (
            "👥 ВАШИ РЕФЕРАЛЫ\n"
            "━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n"
            "У вас пока нет рефералов.\n\n"
            "🔗 Поделитесь ссылкой:\n"
            f"t.me/{BOT_USERNAME}?start={ref_code}\n\n"
            "Отправьте её клиентам, коллегам\n"
            "или в профильные чаты.\n"
            "━━━━━━━━━━━━━━━━━━━━━━━━━━"
        )
    else:
        text = (
            f"👥 ВАШИ РЕФЕРАЛЫ ({len(referrals)})\n"
            "━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n"
        )
        
        for i, ref in enumerate(referrals, 1):
            name = ref.get('first_name', 'Пользователь')
            phone_icon = "📱" if ref.get("has_phone") else "◻️"
            amount = ref.get("total_amount", 0) or 0
            amount_str = f" • {int(amount):,}₽".replace(",", " ") if amount else ""
            date = ref.get('created_at', '')[:10]
            text += f"{i}. {phone_icon} {name}{amount_str} — {date}\n"
        
        text += "\n━━━━━━━━━━━━━━━━━━━━━━━━━━"
    
    keyboard = InlineKeyboardMarkup([
        [InlineKeyboardButton("◀️ Назад", callback_data="partners")],
        [InlineKeyboardButton("🏠 Меню", callback_data="main_menu")]
    ])
    
    await query.edit_message_text(text, reply_markup=keyboard)


async def handle_partner_copy_link(query, partner):
    """Показать ссылку для копирования"""
    ref_code = partner['ref_code']
    
    # В Telegram нельзя скопировать в буфер, но можно показать ссылку отдельным сообщением
    link = f"https://t.me/{BOT_USERNAME}?start={ref_code}"
    
    text = (
        "📋 ВАША РЕФЕРАЛЬНАЯ ССЫЛКА\n"
        "━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n"
        "Нажмите на ссылку и удерживайте,\n"
        "чтобы скопировать:\n\n"
        f"{link}\n\n"
        "Или перешлите это сообщение!\n"
        "━━━━━━━━━━━━━━━━━━━━━━━━━━"
    )
    
    keyboard = InlineKeyboardMarkup([
        [InlineKeyboardButton("◀️ Назад в кабинет", callback_data="partners")],
        [InlineKeyboardButton("🏠 Меню", callback_data="main_menu")]
    ])
    
    await query.edit_message_text(text, reply_markup=keyboard)


async def handle_partner_login(query, user):
    """Партнёр пытается войти по телефону"""
    text = (
        "🔑 ВХОД ДЛЯ ПАРТНЁРОВ\n"
        "━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n"
        "Если вы уже партнёр, но бот\n"
        "вас не узнал — проверьте:\n\n"
        "1. Вы поделились номером телефона?\n"
        "   (тем же, что при регистрации)\n\n"
        "2. Телефон совпадает с анкетой\n"
        "   на promarkirui.ru/partners\n\n"
        "Если проблема осталась — напишите\n"
        "в поддержку на сайте.\n"
        "━━━━━━━━━━━━━━━━━━━━━━━━━━"
    )
    
    keyboard = InlineKeyboardMarkup([
        [InlineKeyboardButton("📞 Связаться с поддержкой", url="https://promarkirui.ru/contacts")],
        [InlineKeyboardButton("◀️ Назад", callback_data="partners")],
        [InlineKeyboardButton("🏠 Меню", callback_data="main_menu")]
    ])
    
    await query.edit_message_text(text, reply_markup=keyboard)


async def callback_handler(update: Update, context: ContextTypes.DEFAULT_TYPE):
    query = update.callback_query
    await query.answer()

    data = query.data

    # Обработка выбора типа клиента
    if data.startswith("type:"):
        return await receive_client_type(update, context)


    # ==================== PARTNER CALLBACKS ====================
    
    elif data == "partners":
        # Главное меню партнёров
        user = query.from_user
        return await handle_partners_menu(query, user)
    
    elif data == "partner_login":
        # Партнёр пытается войти
        user = query.from_user
        return await handle_partner_login(query, user)
    
    elif data == "partner_referrals":
        # Список рефералов
        user = query.from_user
        partner = get_partner_by_telegram_id(user.id)
        if partner:
            return await show_partner_referrals(query, partner)
        else:
            return await show_partner_info(query)
    
    elif data == "partner_copy_link":
        # Копировать ссылку
        user = query.from_user
        partner = get_partner_by_telegram_id(user.id)
        if partner:
            return await handle_partner_copy_link(query, partner)
        else:
            return await show_partner_info(query)


    elif data == "main_menu":
        menu_text = (
            "🏠 ГЛАВНОЕ МЕНЮ\n"
            "━━━━━━━━━━━━━━━━━━━━━━━━\n\n"
            "Выберите действие или напишите\n"
            "название товара для проверки\n"
            "━━━━━━━━━━━━━━━━━━━━━━━━"
        )
        await query.edit_message_text(menu_text, reply_markup=create_main_menu())

    elif data == "handbook":
        # Справочник
        text = (
            "📖 СПРАВОЧНИК\n"
            "━━━━━━━━━━━━━━━━━━━━━━━━\n\n"
            "Полезная информация для работы\n"
            "с маркировкой товаров\n"
            "━━━━━━━━━━━━━━━━━━━━━━━━"
        )
        await query.edit_message_text(text, reply_markup=create_handbook_menu())

    elif data == "hb:fines":
        # Штрафы
        await query.edit_message_text(format_fines_list(), reply_markup=create_fines_menu())

    elif data.startswith("fine:"):
        # Детали штрафа
        fine_key = data[5:]
        await query.edit_message_text(format_fine_detail(fine_key), reply_markup=create_back_to_fines())

    elif data == "hb:import_docs":
        # Документы для импорта
        await query.edit_message_text(format_import_docs(), reply_markup=create_back_to_handbook())

    elif data == "hb:links":
        # Полезные ссылки
        await query.edit_message_text(format_useful_links(), reply_markup=create_back_to_handbook())

    elif data == "new_search":
        search_text = (
            "🔍 ПОИСК ТОВАРА\n"
            "━━━━━━━━━━━━━━━━━━━━━━━━\n\n"
            "Напишите название товара\n"
            "или код ТНВЭД:\n\n"
            "💡 Примеры:\n"
            "   обувь, молоко, шины, 6403\n"
            "━━━━━━━━━━━━━━━━━━━━━━━━"
        )
        await query.edit_message_text(search_text, reply_markup=create_search_menu())

    elif data == "ai_consultant":
        ai_text = (
            "🤖 AI-КОНСУЛЬТАНТ\n"
            "━━━━━━━━━━━━━━━━━━━━━━━━\n\n"
            "🚀 Скоро!\n\n"
            "Умный помощник по маркировке:\n"
            "• Ответы на вопросы 24/7\n"
            "• Анализ документов\n"
            "• Персональные рекомендации\n\n"
            "Пока — обратитесь за консультацией\n"
            "на сайт promarkirui.ru\n"
            "━━━━━━━━━━━━━━━━━━━━━━━━"
        )
        await query.edit_message_text(ai_text, reply_markup=create_back_menu())

    elif data == "cat":
        text = "📚 КАТЕГОРИИ МАРКИРОВКИ\n"
        text += "━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n"

        buttons = []
        for cat_name in category_requirements.keys():
            cat_id = get_category_id(cat_name)
            # Сокращаем длинные названия
            short_name = cat_name if len(cat_name) <= 25 else cat_name[:22] + "..."
            buttons.append([InlineKeyboardButton(f"📦 {short_name}", callback_data=f"cat:{cat_id}")])

        buttons.append([InlineKeyboardButton("🏠 Главное меню", callback_data="main_menu")])

        await query.edit_message_text(text + "Выберите категорию:", reply_markup=InlineKeyboardMarkup(buttons))

    elif data.startswith("cat:"):
        # Просмотр категории
        cat_id = data[4:]
        category = get_category_by_id(cat_id)
        if category:
            details = get_category_details(category)
            if details:
                cat_data = details['data']
                decree = cat_data.get('decree', {})

                text = f"📦 {category.upper()}\n"
                text += "━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n"
                full_name = decree.get('full_name', f"ПП РФ № {decree.get('number', '?')}")
                text += f"📋 {full_name}\n\n"
                text += "Выберите раздел:\n"

                await query.edit_message_text(text, reply_markup=create_category_detail_menu(cat_id))
            else:
                await query.edit_message_text(f"Категория «{category}» не найдена.", reply_markup=create_back_menu())
        else:
            await query.edit_message_text("Категория не найдена.", reply_markup=create_back_menu())

    elif data.startswith("t:"):
        # Timeline
        cat_id = data[2:]
        category = get_category_by_id(cat_id)
        if category:
            await query.edit_message_text(format_timeline(category), reply_markup=create_category_detail_menu(cat_id))
        else:
            await query.edit_message_text("Категория не найдена.", reply_markup=create_back_menu())

    elif data.startswith("e:"):
        # Exceptions
        cat_id = data[2:]
        category = get_category_by_id(cat_id)
        if category:
            await query.edit_message_text(format_exceptions(category), reply_markup=create_category_detail_menu(cat_id))
        else:
            await query.edit_message_text("Категория не найдена.", reply_markup=create_back_menu())

    elif data.startswith("c:"):
        # Checklist
        cat_id = data[2:]
        category = get_category_by_id(cat_id)
        if category:
            await query.edit_message_text(format_checklist(category), reply_markup=create_category_detail_menu(cat_id))
        else:
            await query.edit_message_text("Категория не найдена.", reply_markup=create_back_menu())


def main():
    """Запуск бота"""
    load_data()

    token = os.getenv("TELEGRAM_BOT_TOKEN")
    if not token:
        logger.error("TELEGRAM_BOT_TOKEN не найден!")
        return

    application = Application.builder().token(token).build()

    conv_handler = ConversationHandler(
        entry_points=[CommandHandler("start", start)],
        states={
            WAITING_PHONE: [
                MessageHandler(filters.CONTACT, receive_contact),
                MessageHandler(filters.TEXT & ~filters.COMMAND, handle_phone_text)
            ],
            WAITING_CLIENT_TYPE: [
                CallbackQueryHandler(receive_client_type, pattern="^type:")
            ],
            WAITING_CUSTOM_TYPE: [
                MessageHandler(filters.TEXT & ~filters.COMMAND, receive_custom_type)
            ]
        },
        fallbacks=[CommandHandler("start", start)],
        allow_reentry=True
    )

    application.add_handler(conv_handler)
    application.add_handler(CommandHandler("help", help_command))
    application.add_handler(CommandHandler("menu", menu_command))
    application.add_handler(CommandHandler("categories", categories_command))
    application.add_handler(CommandHandler("fines", fines_command))
    application.add_handler(CallbackQueryHandler(callback_handler))
    application.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, handle_message))

    logger.info("Бот запущен!")
    application.run_polling(allowed_updates=Update.ALL_TYPES)


if __name__ == "__main__":
    main()
