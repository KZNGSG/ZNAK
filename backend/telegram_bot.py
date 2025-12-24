# -*- coding: utf-8 -*-
"""
Telegram бот для проверки маркировки товаров
Про.Маркируй - https://promarkirui.ru
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
WAITING_PHONE, WAITING_CLIENT_TYPE = range(2)

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
        return f"Сроки для {category} не найдены."

    cat_name = timeline_data['category']
    data = timeline_data['data']
    events = data.get('events', [])
    status = data.get('status_label', '')

    text = "СРОКИ МАРКИРОВКИ\n\n"
    text += f"Категория: {cat_name}\n"
    text += f"Статус: {status}\n\n"

    key_events = {'registration': [], 'mandatory_start': [], 'retail': [], 'ban': [], 'retail_permission': []}

    for event in events:
        event_type = event.get('type', '')
        if event_type in key_events:
            key_events[event_type].append(event)

    shown = set()

    if key_events['registration']:
        e = key_events['registration'][0]
        audiences = ', '.join(e.get('audiences_display', []))
        text += f"Регистрация:\n{e['date_display']} - {audiences}\n\n"
        shown.add(e['date'])

    if key_events['mandatory_start']:
        text += "Старт маркировки:\n"
        for e in key_events['mandatory_start'][:3]:
            if e['date'] not in shown:
                title_short = e['title'].replace('Старт маркировки ', '').replace('Старт обязательной маркировки ', '')[:50]
                text += f"- {e['date_display']} - {title_short}\n"
                shown.add(e['date'])
        text += "\n"

    if key_events['ban']:
        e = key_events['ban'][0]
        text += f"Запрет немаркированного:\n{e['date_display']}\n\n"

    text += "promarkirui.ru/timeline"
    return text


def format_marking_result(info: Dict) -> str:
    entry = info['entries'][0]
    code = info['code']
    group = entry.get('group', 'Не указана')
    subcategory = entry.get('subcategory', 'Не указана')
    product = entry.get('product', 'Не указан')

    result = "ТОВАР ПОДЛЕЖИТ МАРКИРОВКЕ\n\n"
    result += f"Код ТНВЭД: {code}\n"

    if info.get('match_type') == 'prefix':
        result += f"Найден по: {info['matched_prefix']}\n"

    result += f"\nГруппа: {group}\n"
    result += f"Категория: {subcategory}\n"
    product_short = product[:100] + '...' if len(product) > 100 else product
    result += f"Товар: {product_short}\n"

    details = get_category_details(subcategory)
    if details:
        decree = details['data'].get('decree', {})
        result += f"\nПП РФ No {decree.get('number', '?')} от {decree.get('date', '?')}\n"

    result += "\npromarkirui.ru"
    return result


def format_keyword_result(keyword_data: Dict, search_text: str) -> str:
    if 'codes' in keyword_data:
        codes = keyword_data['codes']
        category = keyword_data['category']

        result = "ТОВАР ПОДЛЕЖИТ МАРКИРОВКЕ\n\n"
        result += f"Запрос: {search_text}\n"
        result += f"Категория: {category}\n\n"
        result += "Коды ТНВЭД:\n"

        for code in codes[:4]:
            if code in tnved_marking:
                entry = tnved_marking[code][0]
                product_name = entry.get('product', '')[:30]
                result += f"- {code} - {product_name}\n"
            else:
                result += f"- {code}\n"

        details = get_category_details(category)
        if details:
            decree = details['data'].get('decree', {})
            result += f"\nПП РФ No {decree.get('number', '?')} от {decree.get('date', '?')}\n"

        result += "\npromarkirui.ru"
        return result

    if 'search_results' in keyword_data:
        results = keyword_data['search_results']
        result = f"НАЙДЕНЫ ТОВАРЫ\n\nЗапрос: {search_text}\n\n"

        for item in results[:4]:
            code = item['code']
            entry = item['entry']
            product = entry.get('product', '')[:30]
            result += f"- {code} - {product}\n"

        result += "\npromarkirui.ru"
        return result

    return None


def format_not_found(text: str) -> str:
    return (
        f"{text} - не найдено\n\n"
        f"- Товар не подлежит маркировке\n"
        f"- Или попробуйте другое название\n\n"
        f"Примеры: обувь, молоко, пиво, 6403\n\n"
        f"promarkirui.ru/consultation"
    )


def create_buttons(category: str):
    cat_id = get_category_id(category)
    return InlineKeyboardMarkup([
        [InlineKeyboardButton("Сроки введения", callback_data=f"t:{cat_id}")],
        [InlineKeyboardButton("Исключения", callback_data=f"e:{cat_id}")],
        [InlineKeyboardButton("Консультация", url="https://promarkirui.ru/consultation")]
    ])


# ==================== HANDLERS ====================

async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Обработчик /start"""
    user = update.effective_user
    telegram_id = user.id
    username = user.username
    first_name = user.first_name or ""
    last_name = user.last_name or ""

    save_lead(telegram_id, username, first_name, last_name)

    has_phone = check_lead_has_phone(telegram_id)
    has_type = check_lead_has_type(telegram_id)

    if has_phone and has_type:
        keyboard = InlineKeyboardMarkup([
            [InlineKeyboardButton("Категории", callback_data="cat")],
            [InlineKeyboardButton("promarkirui.ru", url="https://promarkirui.ru")]
        ])

        await update.message.reply_text(
            f"С возвращением, {first_name}!\n\n"
            "Отправьте название товара или код ТНВЭД для проверки.\n\n"
            "Примеры: обувь, молоко, 6403",
            reply_markup=keyboard
        )
        return ConversationHandler.END

    if has_phone and not has_type:
        return await ask_client_type(update, context)

    keyboard = ReplyKeyboardMarkup(
        [[KeyboardButton("Поделиться номером", request_contact=True)]],
        resize_keyboard=True,
        one_time_keyboard=True
    )

    await update.message.reply_text(
        f"Привет, {first_name}!\n\n"
        "Я помогу проверить, подлежит ли товар обязательной маркировке.\n\n"
        "Поделитесь номером телефона для:\n"
        "- Получения уведомлений об изменениях сроков\n"
        "- Возможности получить консультацию\n\n"
        "Нажмите кнопку ниже",
        reply_markup=keyboard
    )

    return WAITING_PHONE


async def ask_client_type(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Спросить тип клиента"""
    keyboard = InlineKeyboardMarkup([
        [InlineKeyboardButton("Импортёр", callback_data="type:importer")],
        [InlineKeyboardButton("Производитель", callback_data="type:manufacturer")],
        [InlineKeyboardButton("Розничный продавец", callback_data="type:retailer")],
        [InlineKeyboardButton("Оптовик", callback_data="type:wholesaler")],
        [InlineKeyboardButton("Маркетплейс", callback_data="type:marketplace")],
        [InlineKeyboardButton("Бухгалтер", callback_data="type:accountant")],
        [InlineKeyboardButton("Консультант/Юрист", callback_data="type:consultant")],
        [InlineKeyboardButton("Другое", callback_data="type:other")]
    ])

    text = "Укажите ваш тип деятельности:\n\nЭто поможет давать более релевантную информацию"

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
            "Спасибо! Номер сохранён.",
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
            "Спасибо! Номер сохранён.",
            reply_markup=ReplyKeyboardRemove()
        )
        return await ask_client_type(update, context)

    keyboard = ReplyKeyboardMarkup(
        [[KeyboardButton("Поделиться номером", request_contact=True)]],
        resize_keyboard=True,
        one_time_keyboard=True
    )

    await update.message.reply_text(
        "Пожалуйста, нажмите кнопку «Поделиться номером» ниже\n\n"
        "Или введите номер вручную: +79991234567",
        reply_markup=keyboard
    )

    return WAITING_PHONE


async def receive_client_type(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Получение типа клиента"""
    query = update.callback_query
    await query.answer()

    data = query.data

    if data.startswith("type:"):
        client_type = data[5:]
        user = query.from_user

        save_lead(user.id, user.username, user.first_name, user.last_name, client_type=client_type)

        type_label = CLIENT_TYPES.get(client_type, 'Не указано')

        keyboard = InlineKeyboardMarkup([
            [InlineKeyboardButton("Категории", callback_data="cat")],
            [InlineKeyboardButton("promarkirui.ru", url="https://promarkirui.ru")]
        ])

        await query.edit_message_text(
            f"Отлично! Вы: {type_label}\n\n"
            "Теперь отправьте название товара или код ТНВЭД для проверки.\n\n"
            "Примеры: обувь, молоко, шины, 6403",
            reply_markup=keyboard
        )

        return ConversationHandler.END

    return WAITING_CLIENT_TYPE


async def help_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await update.message.reply_text(
        "Справка\n\n"
        "Отправьте название товара или код ТНВЭД.\n\n"
        "Примеры:\n"
        "обувь, молоко, шины, пиво, ортезы\n"
        "6403, 0401, 4011, 2203, 9021\n\n"
        "promarkirui.ru"
    )


async def categories_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    text = "Категории маркировки:\n\n"
    for i, (cat_name, cat_data) in enumerate(category_requirements.items(), 1):
        decree = cat_data.get('decree', {})
        text += f"{i}. {cat_name}\n   No {decree.get('number', '?')}\n\n"
    await update.message.reply_text(text)


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
            buttons = create_buttons(category)
        else:
            buttons = InlineKeyboardMarkup([[
                InlineKeyboardButton("Консультация", url="https://promarkirui.ru/consultation")
            ]])

        await update.message.reply_text(result, reply_markup=buttons)
    else:
        await update.message.reply_text(format_not_found(text))


async def process_code(update: Update, code: str):
    user = update.effective_user
    code = normalize_code(code)
    info = find_marking_info(code)

    if info:
        category = info['entries'][0].get('subcategory', '')
        update_lead_query(user.id, code, category)

        result = format_marking_result(info)
        buttons = create_buttons(category)
        await update.message.reply_text(result, reply_markup=buttons)
    else:
        await update.message.reply_text(format_not_found(code))


async def callback_handler(update: Update, context: ContextTypes.DEFAULT_TYPE):
    query = update.callback_query
    await query.answer()

    data = query.data

    if data.startswith("type:"):
        return await receive_client_type(update, context)

    if data == "cat":
        text = "Категории:\n\n"
        for i, (cat_name, cat_data) in enumerate(category_requirements.items(), 1):
            decree = cat_data.get('decree', {})
            text += f"{i}. {cat_name}\n   No {decree.get('number', '?')}\n\n"
        await query.edit_message_text(text)

    elif data.startswith("t:"):
        cat_id = data[2:]
        category = get_category_by_id(cat_id)
        text = format_timeline(category) if category else "Категория не найдена."
        await query.edit_message_text(text)

    elif data.startswith("e:"):
        cat_id = data[2:]
        category = get_category_by_id(cat_id)

        if category:
            details = get_category_details(category)
            if details and details['data'].get('exceptions'):
                text = f"Исключения\n\n{details['category']}\n\n"
                for item in details['data']['exceptions']:
                    text += f"- {item}\n"
                text += "\npromarkirui.ru"
            else:
                text = "Исключения не найдены."
        else:
            text = "Категория не найдена."

        await query.edit_message_text(text)


async def error_handler(update: Update, context: ContextTypes.DEFAULT_TYPE):
    logger.error(f"Error: {context.error}")


def main():
    load_data()

    token = os.getenv('TELEGRAM_BOT_TOKEN')
    if not token:
        logger.error("TELEGRAM_BOT_TOKEN не найден")
        return

    app = Application.builder().token(token).build()

    conv_handler = ConversationHandler(
        entry_points=[CommandHandler("start", start)],
        states={
            WAITING_PHONE: [
                MessageHandler(filters.CONTACT, receive_contact),
                MessageHandler(filters.TEXT & ~filters.COMMAND, handle_phone_text),
            ],
            WAITING_CLIENT_TYPE: [
                CallbackQueryHandler(receive_client_type, pattern="^type:"),
            ],
        },
        fallbacks=[CommandHandler("start", start)],
        per_message=False,
    )

    app.add_handler(conv_handler)
    app.add_handler(CommandHandler("help", help_command))
    app.add_handler(CommandHandler("categories", categories_command))
    app.add_handler(CallbackQueryHandler(callback_handler))
    app.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, handle_message))
    app.add_error_handler(error_handler)

    logger.info("Бот запущен...")
    app.run_polling(allowed_updates=Update.ALL_TYPES)


if __name__ == '__main__':
    main()
