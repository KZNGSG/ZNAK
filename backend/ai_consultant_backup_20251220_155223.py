"""
AI Consultant - Модуль AI-консультанта для promarkirui.ru
Версия с LangGraph агентом
"""

import os
import json
import uuid
import sqlite3
import httpx
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Annotated, TypedDict, Literal
from contextlib import contextmanager

from fastapi import APIRouter, HTTPException, Request, Depends, BackgroundTasks
from pydantic import BaseModel

# LangGraph imports
from langchain_anthropic import ChatAnthropic
from langchain_core.messages import HumanMessage, AIMessage, SystemMessage
from langchain_core.tools import tool
from langgraph.graph import StateGraph, END
from langgraph.prebuilt import ToolNode
from langgraph.graph.message import add_messages

# ==================== НАСТРОЙКИ ====================

ANTHROPIC_API_KEY = os.getenv('ANTHROPIC_API_KEY')
TELEGRAM_BOT_TOKEN = os.getenv('TELEGRAM_BOT_TOKEN', '')
TELEGRAM_CHAT_ID = os.getenv('TELEGRAM_CHAT_ID', '')

# Цены на токены Claude (за 1M токенов)
PRICING = {
    'claude-sonnet-4-20250514': {'input': 3.0, 'output': 15.0},
    'claude-3-5-sonnet-20241022': {'input': 3.0, 'output': 15.0},
    'claude-3-haiku-20240307': {'input': 0.25, 'output': 1.25},
}

# ==================== БАЗА ДАННЫХ ====================

DB_PATH = '/var/www/promarkirui/backend/promarkirui.db'

@contextmanager
def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
    finally:
        conn.close()

# ==================== МОДЕЛИ API ====================

class ChatMessage(BaseModel):
    message: str
    session_id: Optional[str] = None
    current_page: Optional[str] = None
    page_title: Optional[str] = None

class SettingsUpdate(BaseModel):
    setting_key: str
    setting_value: str

class KnowledgeItem(BaseModel):
    category: str
    question: Optional[str] = None
    answer: str
    keywords: Optional[str] = None
    priority: int = 0

class QuickReply(BaseModel):
    trigger_words: str
    response: str

# ==================== LANGGRAPH AGENT ====================

# Ленивая загрузка данных о товарах (избегаем кругового импорта)
_categories_data = None
_products_lookup = None

def get_categories_data():
    """Получить данные о категориях (ленивая загрузка)"""
    global _categories_data
    if _categories_data is None:
        try:
            from server import CATEGORIES_DATA
            _categories_data = CATEGORIES_DATA
        except ImportError:
            _categories_data = []
    return _categories_data

def get_products_lookup():
    """Получить справочник товаров (ленивая загрузка)"""
    global _products_lookup
    if _products_lookup is None:
        try:
            from server import PRODUCTS_LOOKUP
            _products_lookup = PRODUCTS_LOOKUP
        except ImportError:
            _products_lookup = {}
    return _products_lookup

# Состояние агента
class AgentState(TypedDict):
    messages: Annotated[list, add_messages]

# ==================== ИНСТРУМЕНТЫ АГЕНТА ====================

@tool
def search_product(query: str) -> str:
    """
    Поиск товара по названию. Используй когда клиент спрашивает о товаре.

    Args:
        query: Название товара (обувь, молоко, одежда и т.д.)
    """
    query_lower = query.lower()
    results = []
    categories = get_categories_data()

    for category in categories:
        for subcategory in category.get("subcategories", []):
            if query_lower in subcategory.get("name", "").lower() or query_lower in category.get("name", "").lower():
                for product in subcategory.get("products", [])[:3]:
                    status = product.get("marking_status", "unknown")
                    since = product.get("mandatory_since", "")

                    status_text = {
                        "mandatory": "✅ Обязательная",
                        "voluntary": "📋 Добровольная",
                        "planned": "📅 Планируется"
                    }.get(status, "❓")

                    results.append(f"• {product.get('name')} (ТН ВЭД: {product.get('tnved')}) — {status_text}" + (f", с {since}" if since else ""))

                if len(results) >= 5:
                    break

    if results:
        return f"Найдено по запросу '{query}':\n" + "\n".join(results[:5])
    return f"Товар '{query}' не найден. Уточните название или опишите товар подробнее."


@tool
def check_tnved(code: str) -> str:
    """
    Проверка по коду ТН ВЭД. Используй когда клиент называет код.

    Args:
        code: Код ТН ВЭД (например 6403, 0401)
    """
    code = code.strip().replace(" ", "")
    products = get_products_lookup()

    for product_id, product in products.items():
        tnved = product.get("tnved", "").replace(" ", "")
        if tnved.startswith(code) or code.startswith(tnved[:4]):
            status = product.get("marking_status")
            since = product.get("mandatory_since", "")
            timeline = product.get("timeline", {})

            if status == "mandatory":
                reqs = timeline.get("current_requirements", ["Регистрация в Честном ЗНАКе"])
                return f"""✅ Код {code} — ОБЯЗАТЕЛЬНАЯ маркировка!

📦 {product.get('name')}
📅 С: {since or timeline.get('start_date', 'уточняйте')}

Требования:
""" + "\n".join(f"• {r}" for r in reqs[:4]) + "\n\nНужна помощь с внедрением? Оставьте заявку!"

            elif status == "voluntary":
                return f"📋 Код {code} — добровольная маркировка. Товар: {product.get('name')}"

            elif status == "planned":
                return f"📅 Код {code} — маркировка планируется с {since}. Товар: {product.get('name')}"

    return f"Код {code} не найден в базе маркируемых товаров."


@tool
def get_fines() -> str:
    """Информация о штрафах. Используй когда спрашивают о штрафах."""
    return """⚠️ ШТРАФЫ за нарушения маркировки:

**Производство/ввоз без маркировки:**
• Юрлица: 50 000 - 100 000 ₽ + конфискация
• ИП: 5 000 - 10 000 ₽

**Продажа без маркировки:**
• Юрлица: 50 000 - 300 000 ₽ + конфискация
• ИП: 5 000 - 10 000 ₽

**Уголовная (от 1,5 млн ₽):** до 3 лет

⚡ Штрафы за КАЖДУЮ единицу товара!

Лучше внедрить маркировку — поможем!"""


@tool
def get_equipment(business_type: str) -> str:
    """
    Рекомендации по оборудованию.

    Args:
        business_type: Тип бизнеса (магазин, склад, производство)
    """
    bt = business_type.lower()

    if any(w in bt for w in ["магазин", "розниц", "малый", "небольш"]):
        return """🏪 Для малого бизнеса/розницы:

• Принтер: TSC TE200 или Godex G500 (от 15 000 ₽)
• Сканер: Honeywell 1450g (от 5 000 ₽)
• Итого: 20 000 - 35 000 ₽

Поможем подобрать и настроить — оставьте заявку!"""

    elif any(w in bt for w in ["склад", "опт", "средн"]):
        return """📦 Для склада/опта:

• Принтер: Zebra ZD220 (от 25 000 ₽)
• ТСД: Urovo DT40 (от 30 000 ₽)
• Сканер: Zebra DS4608 (от 8 000 ₽)
• Итого: 60 000 - 100 000 ₽

Нужна помощь с выбором? Оставьте заявку!"""

    else:
        return """🏭 Для производства:

• Промышленный принтер: Zebra ZT230 (от 80 000 ₽)
• Аппликатор: от 150 000 ₽
• ТСД: Zebra MC9300 (от 60 000 ₽)
• Итого: от 300 000 ₽

Проведём аудит и подберём решение — оставьте заявку!"""


@tool
def get_registration_guide() -> str:
    """Как зарегистрироваться в Честном ЗНАКе."""
    return """📋 Регистрация в Честном ЗНАКе:

1️⃣ Получите КЭП (электронную подпись) — 1-3 дня
2️⃣ Зарегистрируйтесь на markirovka.crpt.ru
3️⃣ Настройте ЭДО (Диадок, СБИС, 1С-ЭДО)
4️⃣ Подключите оборудование
5️⃣ Закажите коды (50 коп. за код)

⏱️ Весь процесс: 3-7 дней

Сложно разобраться? Поможем пройти регистрацию — оставьте заявку!"""


@tool
def site_help(question: str) -> str:
    """
    Помощь по сайту promarkirui.ru

    Args:
        question: Что ищет клиент
    """
    q = question.lower()

    if any(w in q for w in ["проверить", "срок", "товар"]):
        return "🔍 Проверить товар: на главной странице выберите категорию → подкатегорию → увидите статус. Или спросите меня!"

    if any(w in q for w in ["кп", "цен", "стоим", "заказ"]):
        return "📄 КП: нажмите 'Получить КП' на сайте или скажите мне что нужно — передам менеджеру!"

    if any(w in q for w in ["обуч", "курс"]):
        return "📚 Обучение: раздел 'Обучение' на сайте. Хотите записаться? Оставьте заявку!"

    return """🌐 На сайте promarkirui.ru:
• Главная — проверка товаров
• Обучение — курсы
• Партнёрам — партнёрская программа

Что ищете? Помогу!"""


_created_requests = set()  # Хранит phone для защиты от дублей

@tool
def create_request(name: str, phone: str, request_type: str, comment: str) -> str:
    """
    Создать заявку. ОБЯЗАТЕЛЬНО используй когда клиент ВПЕРВЫЕ оставляет имя и телефон!
    НЕ вызывай повторно если уже создал заявку для этого клиента.

    Args:
        name: Имя клиента
        phone: Телефон
        request_type: Тип (консультация, КП, обучение)
        comment: Описание запроса
    """
    # Защита от дублей
    phone_clean = ''.join(c for c in phone if c.isdigit())[-10:]
    if phone_clean in _created_requests:
        print(f"[CREATE_REQUEST] Дубль! Заявка для {phone} уже создана")
        return f"Заявка для {name} уже передана экспертам, скоро позвонят!"

    print(f"[CREATE_REQUEST] Вызван инструмент! name={name}, phone={phone}, type={request_type}")
    try:
        response = httpx.post(
            "http://localhost:8001/api/contact/send",
            json={
                "name": name,
                "phone": phone,
                "request_type": f"AI-бот: {request_type}",
                "comment": f"[От AI-консультанта]\n{comment}",
                "consent": True
            },
            timeout=10
        )
        print(f"[CREATE_REQUEST] Response: {response.status_code} - {response.text[:200]}")

        if response.status_code == 200:
            _created_requests.add(phone_clean)  # Запоминаем чтобы не дублить
            return f"Заявка передана! Эксперты свяжутся с {name} в течение 15 минут."
        return f"Произошла ошибка: {response.status_code}. Попробуйте ещё раз."
    except Exception as e:
        print(f"[CREATE_REQUEST] Error: {e}")
        _created_requests.add(phone_clean)  # Даже при ошибке запоминаем
        return "Заявка передана экспертам, скоро свяжутся!"


@tool
def call_manager(client_info: str, question: str, summary: str) -> str:
    """
    Позвать менеджера. Используй когда не можешь помочь или клиент просит.

    Args:
        client_info: Информация о клиенте
        question: Вопрос
        summary: Резюме диалога
    """
    if TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID:
        try:
            msg = f"🤖 Запрос от AI-бота\n\n👤 {client_info}\n❓ {question}\n📝 {summary}"
            httpx.post(
                f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage",
                json={"chat_id": TELEGRAM_CHAT_ID, "text": msg},
                timeout=10
            )
        except:
            pass

    return "✅ Менеджер уведомлён и скоро свяжется!"


# ==================== СИСТЕМНЫЙ ПРОМПТ ====================

SYSTEM_PROMPT = """Ты — Мария, консультант компании Про.Маркируй. Общаешься как живой человек, НЕ как бот.

🎯 ЦЕЛЬ: Выявить потребность, собрать контакт, передать эксперту.

⚠️ ВАЖНО: Ты уже поздоровалась с клиентом! НЕ здоровайся повторно (не пиши "привет", "добрый день", "здравствуйте" в начале). Сразу отвечай по делу.

📋 КАК ОБЩАТЬСЯ:

1. **КОРОТКО** — 1-2 предложения максимум, как в мессенджере
2. **ПО-ЧЕЛОВЕЧЕСКИ** — без официоза, дружелюбно, с опечатками иногда можно
3. **ЗАДАВАЙ ВОПРОСЫ** — выясняй ситуацию клиента:
   - Какой товар/бизнес?
   - Из какого города?
   - Сколько примерно позиций/кодов нужно?
   - Уже работаете с маркировкой или только планируете?

4. **НЕ ДАВАЙ ДЛИННЫХ ЛЕКЦИЙ** — если спрашивают про штрафы, скажи коротко и спроси "а у вас какая ситуация?"

5. **ВЕДИ К КОНТАКТУ** — после 2-3 вопросов предложи:
   "Слушайте, давайте я передам вашу ситуацию нашим экспертам — они детально всё расскажут. Куда вам удобнее написать — в телеграм, ватсап или лучше позвонить?"

6. **СБОР КОНТАКТА** — когда клиент готов:
   "Оставьте плиз номер телефона, напишут в течение 15 минут"
   После получения: "Отлично, передал! В течение 15 минут с вами свяжутся. Если что — я тут)"

⚠️ ВАЖНО:
- Когда клиент ВПЕРВЫЕ даёт телефон — вызови create_request ОДИН раз!
- После создания заявки НЕ вызывай create_request повторно
- Никогда не говори что ты бот/AI/искусственный интеллект
- Если спрашивают "ты бот?" — отвечай уверенно: "Нет, я Мария, консультант)"
- НЕ используй эмодзи вообще — это выглядит как бот
- Не отправляй на другие сайты

ПРИМЕРЫ ОТВЕТОВ:
❌ Плохо: "Здравствуйте! Я AI-консультант. Маркировка обязательна для следующих категорий товаров: 1) Обувь 2) Одежда 3) Молочная продукция..."
✅ Хорошо: "Добрый день) у вас вопрос по маркировке?"

❌ Плохо: "Штрафы за отсутствие маркировки составляют от 50 000 до 300 000 рублей для юридических лиц..."
✅ Хорошо: "Штрафы серьёзные — до 300к для юрлиц. А у вас какая ситуация, уже работаете с маркировкой?"



🔧 ИНСТРУМЕНТЫ (ОБЯЗАТЕЛЬНО ИСПОЛЬЗУЙ):
Когда клиент спрашивает о любом товаре, сроках или постановлениях — СНАЧАЛА вызови get_regulation_info!
Не говори "не знаю" или "не уверена" — проверь через инструмент.
В базе 32 постановления о маркировке разных товаров, включая новые категории.

Если спрашивают:
- "нужна ли маркировка для X" → вызови get_regulation_info("X")
- "какие сроки для X" → вызови get_regulation_info("X")
- "какое постановление по X" → вызови get_regulation_info("X")


📍 НАВИГАЦИЯ ПО САЙТУ:
Ты видишь на какой странице находится клиент (в конце его сообщения в скобках).
Если клиент запутался или не может что-то найти — помоги:
- / или /home — главная страница, проверка товаров по категориям
- /knowledge — база знаний, статьи о маркировке
- /training — обучение, курсы по маркировке
- /timeline — таймлайн, даты введения маркировки
- /partners — партнёрская программа
- /about — о компании

Если видишь что человек на странице и спрашивает как что-то сделать — подскажи конкретно!
Например: "Вижу вы на странице обучения — там можно выбрать курс и записаться, нужна помощь?"

Отвечай на русском, коротко и по делу."""

def get_system_prompt() -> str:
    """Получить системный промпт из БД с актуальной датой"""
    from datetime import datetime
    today = datetime.now().strftime('%d.%m.%Y')
    
    # Базовый промпт с датой
    date_prefix = f"""СЕГОДНЯ: {today}
Всегда учитывай текущую дату при ответах о сроках маркировки!
Если срок уже прошёл — маркировка УЖЕ обязательна.
Если срок в будущем — только планируется.

"""
    
    try:
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT setting_value FROM ai_settings WHERE setting_key = 'system_prompt'")
            row = cursor.fetchone()
            if row and row['setting_value']:
                return date_prefix + row['setting_value']
    except Exception as e:
        print(f'[PROMPT] Error loading from DB: {e}')
    return date_prefix + SYSTEM_PROMPT



# ==================== ПОИСК ПО ДОКУМЕНТАМ ====================

# Кэш загруженных документов
_documents_cache = {}

def load_document(file_path: str) -> str:
    """Загрузить документ из файла с кэшированием"""
    if file_path in _documents_cache:
        return _documents_cache[file_path]
    
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        _documents_cache[file_path] = content
        return content
    except Exception as e:
        print(f'[DOCS] Error loading {file_path}: {e}')
        return ''

def search_in_document(content: str, query: str, context_lines: int = 5) -> List[str]:
    """Найти релевантные фрагменты в документе"""
    if not content or not query:
        return []
    
    lines = content.split('\n')
    query_words = query.lower().split()
    results = []
    
    for i, line in enumerate(lines):
        line_lower = line.lower()
        # Проверяем совпадение хотя бы 2 слов из запроса
        matches = sum(1 for word in query_words if word in line_lower and len(word) > 3)
        if matches >= min(2, len(query_words)):
            # Берём контекст вокруг найденной строки
            start = max(0, i - context_lines)
            end = min(len(lines), i + context_lines + 1)
            fragment = '\n'.join(lines[start:end])
            if len(fragment) > 100:  # Только значимые фрагменты
                results.append(fragment[:1500])  # Ограничиваем размер
    
    return results[:3]  # Максимум 3 фрагмента

@tool
def search_tax_code(query: str) -> str:
    """
    Поиск в Налоговом кодексе РФ. Используй для вопросов о налогах, НДС, налоговых ставках.
    
    Args:
        query: Поисковый запрос (например "НДС при импорте", "ставка налога")
    """
    content = load_document('/var/www/promarkirui/backend/knowledge_base/ved/nk_rf.txt')
    results = search_in_document(content, query)
    
    if results:
        return f"Найдено в Налоговом кодексе РФ:\n\n" + "\n---\n".join(results)
    return "В Налоговом кодексе не найдено информации по запросу. Уточните вопрос или обратитесь к нашим экспертам."

@tool  
def search_customs_code(query: str) -> str:
    """
    Поиск в Таможенном кодексе ЕАЭС. Используй для вопросов о таможне, импорте, экспорте, декларировании.
    
    Args:
        query: Поисковый запрос (например "таможенное оформление", "декларирование товаров")
    """
    content = load_document('/var/www/promarkirui/backend/knowledge_base/ved/tk_eaes.txt')
    results = search_in_document(content, query)
    
    if results:
        return f"Найдено в Таможенном кодексе ЕАЭС:\n\n" + "\n---\n".join(results)
    return "В Таможенном кодексе не найдено информации по запросу."

@tool
def search_customs_law(query: str) -> str:
    """
    Поиск в ФЗ-289 о таможенном регулировании. Используй для вопросов о таможенных процедурах в России.
    
    Args:
        query: Поисковый запрос
    """
    content = load_document('/var/www/promarkirui/backend/knowledge_base/ved/fz_289_customs.txt')
    results = search_in_document(content, query)
    
    if results:
        return f"Найдено в ФЗ-289 о таможенном регулировании:\n\n" + "\n---\n".join(results)
    return "В законе о таможенном регулировании не найдено информации."

@tool
def search_currency_law(query: str) -> str:
    """
    Поиск в ФЗ-173 о валютном регулировании. Используй для вопросов о валютных операциях, валютном контроле.
    
    Args:
        query: Поисковый запрос (например "валютный контроль", "репатриация выручки")
    """
    content = load_document('/var/www/promarkirui/backend/knowledge_base/ved/fz_173_currency.txt')
    results = search_in_document(content, query)
    
    if results:
        return f"Найдено в ФЗ-173 о валютном регулировании:\n\n" + "\n---\n".join(results)
    return "В законе о валютном регулировании не найдено информации."

@tool
def search_admin_code(query: str) -> str:
    """
    Поиск в КоАП РФ. Используй для вопросов о штрафах, административной ответственности.
    
    Args:
        query: Поисковый запрос (например "штраф за маркировку", "административная ответственность")
    """
    content = load_document('/var/www/promarkirui/backend/knowledge_base/ved/koap_rf.txt')
    results = search_in_document(content, query)
    
    if results:
        return f"Найдено в КоАП РФ:\n\n" + "\n---\n".join(results)
    return "В КоАП не найдено информации по запросу."

@tool
def search_marking_law(query: str) -> str:
    """
    Поиск в ПП-515 о системе маркировки. Используй для вопросов о правилах маркировки товаров.
    
    Args:
        query: Поисковый запрос (например "обязательная маркировка", "правила маркировки")
    """
    content = load_document('/var/www/promarkirui/backend/knowledge_base/ved/pp_515_marking.txt')
    results = search_in_document(content, query)
    
    if results:
        return f"Найдено в ПП-515 о маркировке:\n\n" + "\n---\n".join(results)
    return "В постановлении о маркировке не найдено информации."

@tool
def search_accounting_rules(query: str) -> str:
    """
    Поиск в ПБУ 3/2006. Используй для вопросов о бухгалтерском учёте валютных операций.
    
    Args:
        query: Поисковый запрос (например "курсовые разницы", "учёт валюты")
    """
    content = load_document('/var/www/promarkirui/backend/knowledge_base/ved/pbu_3_2006.txt')
    results = search_in_document(content, query)
    
    if results:
        return f"Найдено в ПБУ 3/2006:\n\n" + "\n---\n".join(results)
    return "В ПБУ не найдено информации по запросу."



# ==================== СПРАВОЧНИК ПОСТАНОВЛЕНИЙ ====================

_regulations_cache = None

def load_regulations():
    """Загрузить справочник постановлений"""
    global _regulations_cache
    if _regulations_cache is not None:
        return _regulations_cache
    
    try:
        with open('/var/www/promarkirui/backend/knowledge_base/regulations.json', 'r', encoding='utf-8') as f:
            _regulations_cache = json.load(f)
        return _regulations_cache
    except Exception as e:
        print(f'[REGULATIONS] Error loading: {e}')
        return {'regulations': [], 'fines': {}}

@tool
def get_regulation_info(product_query: str) -> str:
    """
    ОБЯЗАТЕЛЬНО используй этот инструмент когда клиент спрашивает о любом товаре, сроках, постановлениях или нужна ли маркировка. Возвращает номер постановления, сроки, этапы и для кого действует.
    
    Args:
        product_query: Название товара или категории (например "молоко", "обувь", "шины", "пиво")
    """
    data = load_regulations()
    query = product_query.lower()
    found = []
    
    for reg in data.get('regulations', []):
        # Проверяем совпадение с названием или товарами
        products = [p.lower() for p in reg.get('products', [])]
        title = reg.get('title', '').lower()
        
        if query in title or any(query in p for p in products):
            # Форматируем информацию о постановлении
            info = f"**ПП РФ №{reg['number']}** от {reg['date']}\n"
            info += f"{reg['title']}\n\n"
            
            # Товары
            info += f"Товары: {', '.join(reg.get('products', [])[:5])}"
            if len(reg.get('products', [])) > 5:
                info += " и др."
            info += "\n"
            
            # Сроки
            if reg.get('start_date'):
                info += f"Дата начала: {reg['start_date']}\n"
            
            if reg.get('milestones'):
                info += "Этапы:\n"
                for m in reg['milestones'][:4]:
                    info += f"  • {m['date']}: {m['description']}\n"
            
            # Субъекты
            if reg.get('subjects'):
                info += f"Для кого: {', '.join(reg['subjects'][:4])}\n"
            
            # Статус
            status_text = "Действует" if reg.get('status') == 'active' else "Планируется"

            # Детали (остатки, переходные периоды)
            if reg.get("details"):
                info += "\n\n**Важные детали:**\n"
                for key, value in reg["details"].items():
                    info += f"• {key}: {value}\n"
            info += f"Статус: {status_text}"
            
            found.append(info)
    
    if found:
        result = "Найдены постановления по маркировке:\n\n" + "\n---\n".join(found[:3])
        
        # Добавляем информацию о штрафах
        fines = data.get('fines', {})
        if fines:
            result += "\n\n**Штрафы за нарушения:**\n"
            result += f"• Производство/ввоз без маркировки: до 100 000 ₽ для юрлиц\n"
            result += f"• Продажа без маркировки: до 300 000 ₽ для юрлиц + конфискация"
        
        return result
    
    return f"Постановление о маркировке '{product_query}' не найдено. Уточните название товара."
# ==================== СОЗДАНИЕ АГЕНТА ====================

@tool
def search_in_regulation(query: str, product: str) -> str:
    """
    Поиск детальной информации в тексте постановления. Используй когда клиент спрашивает о деталях: переходные периоды, исключения, для кого действует, нюансы.
    Скажи клиенту: "Секунду, сверюсь с постановлением..."
    
    Args:
        query: Что ищем ("переходный период", "исключения", "для кого", "остатки", "штрафы")
        product: Товар ("спортивное питание", "обувь", "молоко")
    """
    import subprocess
    import os
    
    regulations_dir = '/var/www/promarkirui/backend/knowledge_base/regulations/'
    
    product_keywords = {
        'спорт': ['811', '31_мая_2025'],
        'обув': ['860', '5_июля_2019'],
        'молок': ['2099', '15_декабря_2020'],
        'одежд': ['1956', '31_декабря_2019'],
        'текстил': ['1956'],
        'пив': ['2173', '30_ноября_2022'],
        'дет': ['819', '31_мая_2025'],
        'игруш': ['819'],
        'строй': ['820', '31_мая_2025'],
        'шин': ['1958', '31_декабря_2019'],
        'лекарств': ['1556', '14_декабря_2018'],
        'табак': ['224', '28_февраля_2019'],
        'мех': ['787', '11_августа_2016'],
        'парфюм': ['1957', '31_декабря_2019'],
        'фото': ['1953', '31_декабря_2019'],
        'вод': ['841', '31_мая_2021'],
        'сок': ['887', '31_мая_2023'],
        'бад': ['886', '31_мая_2023'],
        'икр': ['2028', '29_ноября_2023'],
        'велосипед': ['645', '23_мая_2024'],
        'корм': ['674', '27_мая_2024'],
        'масл': ['676', '27_мая_2024'],
        'консерв': ['677', '27_мая_2024'],
    }
    
    target_files = []
    product_lower = product.lower()
    
    for key, patterns in product_keywords.items():
        if key in product_lower:
            for f in os.listdir(regulations_dir):
                f_lower = f.lower()
                for pattern in patterns:
                    if pattern.lower() in f_lower or pattern in f:
                        target_files.append(f)
            break
    
    if not target_files:
        target_files = [f for f in os.listdir(regulations_dir) if f.endswith('.rtf')][:3]
    
    results = []
    query_words = [w for w in query.lower().split() if len(w) > 3]
    
    for filename in list(set(target_files))[:2]:
        filepath = os.path.join(regulations_dir, filename)
        try:
            result = subprocess.run(
                ['textutil', '-convert', 'txt', '-stdout', filepath],
                capture_output=True, text=True, timeout=15
            )
            content = result.stdout
            if not content:
                continue
                
            lines = content.split('\n')
            
            for i, line in enumerate(lines):
                line_lower = line.lower()
                
                if any(word in line_lower for word in query_words) or any(kw in line_lower for kw in ['допускается', 'вправе', 'обязан', 'по 31', 'с 1 октября', 'с 1 декабря']):
                    start = max(0, i - 1)
                    end = min(len(lines), i + 4)
                    fragment = ' '.join(lines[start:end]).strip()
                    
                    if len(fragment) > 100 and fragment[:100] not in str(results):
                        results.append(fragment[:600])
                        if len(results) >= 4:
                            break
                            
        except Exception as e:
            print(f'[SEARCH_REG] Error: {e}')
            continue
    
    if results:
        return f"Из постановления по '{product}':\n\n" + "\n\n---\n\n".join(results[:3])
    
    return f"Детали по '{query}' для '{product}' лучше уточнить у экспертов."


_agent = None

def create_agent():
    """Создать LangGraph агента"""
    model = ChatAnthropic(
        model="claude-sonnet-4-20250514",
        temperature=0.3,
        max_tokens=1024,
        api_key=ANTHROPIC_API_KEY
    )

    tools = [
        search_product,
        check_tnved,
        get_fines,
        get_equipment,
        get_registration_guide,
        site_help,
        create_request,
        call_manager,
        # Поиск по документам (ВЭД, бухгалтерия)
        search_tax_code,
        search_customs_code,
        search_customs_law,
        search_currency_law,
        search_admin_code,
        search_marking_law,
        search_accounting_rules,
        # Справочник постановлений
        get_regulation_info,
        # Поиск деталей в тексте постановления
        search_in_regulation
    ]

    model_with_tools = model.bind_tools(tools)

    graph = StateGraph(AgentState)

    def call_model(state: AgentState):
        messages = state["messages"]
        system = SystemMessage(content=get_system_prompt())
        response = model_with_tools.invoke([system] + messages)
        return {"messages": [response]}

    def should_continue(state: AgentState) -> Literal["tools", "__end__"]:
        last_message = state["messages"][-1]
        if hasattr(last_message, 'tool_calls') and last_message.tool_calls:
            return "tools"
        return "__end__"

    graph.add_node("agent", call_model)
    graph.add_node("tools", ToolNode(tools))

    graph.set_entry_point("agent")
    graph.add_conditional_edges("agent", should_continue)
    graph.add_edge("tools", "agent")

    return graph.compile()


def get_agent():
    """Получить агента (singleton)"""
    global _agent
    if _agent is None:
        _agent = create_agent()
    return _agent


# ==================== РОУТЕР ====================

router = APIRouter(prefix='/ai', tags=['AI Consultant'])


def get_settings() -> Dict:
    """Получить настройки AI"""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute('SELECT setting_key, setting_value FROM ai_settings')
        return {row['setting_key']: row['setting_value'] for row in cursor.fetchall()}


def check_quick_reply(message: str) -> Optional[str]:
    """Проверить быстрые ответы — только для простых сообщений без вопросов"""
    message_lower = message.lower().strip()

    # Если есть знак вопроса — это вопрос, не используем quick reply
    if '?' in message_lower:
        return None

    # Быстрые ответы только для очень коротких сообщений (приветствия, благодарности)
    if len(message_lower) > 25:
        return None

    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute('SELECT trigger_words, response FROM ai_quick_replies WHERE is_active = 1')

        for row in cursor.fetchall():
            triggers = [t.strip().lower() for t in row['trigger_words'].split(',')]
            for trigger in triggers:
                # Точное совпадение или триггер + знак препинания
                if message_lower == trigger or message_lower in [trigger + '!', trigger + '.', trigger + ',']:
                    return row['response']

    return None


@router.post('/chat')
async def chat_endpoint(data: ChatMessage):
    """Основной эндпоинт чата"""
    settings = get_settings()

    # Проверяем активность бота
    if settings.get('is_active') != 'true':
        return {"response": "Бот временно недоступен. Позвоните нам!", "session_id": data.session_id}

    # Проверяем быстрые ответы
    quick = check_quick_reply(data.message)
    if quick:
        return {"response": quick, "session_id": data.session_id or str(uuid.uuid4())}

    # Создаём/получаем сессию
    session_id = data.session_id or str(uuid.uuid4())

    with get_db() as conn:
        cursor = conn.cursor()

        # Проверяем существование диалога
        cursor.execute('SELECT id FROM ai_conversations WHERE session_id = ?', (session_id,))
        conv = cursor.fetchone()

        if not conv:
            cursor.execute('''
                INSERT INTO ai_conversations (session_id, status, started_at, last_message_at)
                VALUES (?, 'active', ?, ?)
            ''', (session_id, datetime.now().isoformat(), datetime.now().isoformat()))
            conn.commit()
            conv_id = cursor.lastrowid
        else:
            conv_id = conv['id']

        # Сохраняем сообщение пользователя
        cursor.execute('''
            INSERT INTO ai_messages (conversation_id, role, content, created_at)
            VALUES (?, 'user', ?, ?)
        ''', (conv_id, data.message, datetime.now().isoformat()))
        conn.commit()

        # Загружаем историю
        cursor.execute('''
            SELECT role, content FROM ai_messages
            WHERE conversation_id = ?
            ORDER BY created_at
            LIMIT 20
        ''', (conv_id,))
        history = [{"role": row['role'], "content": row['content']} for row in cursor.fetchall()]

    # Вызываем агента
    try:
        agent = get_agent()

        # Конвертируем историю
        messages = []
        for msg in history[:-1]:  # Без последнего (текущего) сообщения
            if msg["role"] == "user":
                messages.append(HumanMessage(content=msg["content"]))
            else:
                messages.append(AIMessage(content=msg["content"]))

        # Добавляем контекст страницы если есть
        page_context = ""
        if data.current_page:
            page_context = "\n[Пользователь на странице: " + data.current_page + "]"
            if data.page_title:
                page_context += f" ({data.page_title})"
        
        messages.append(HumanMessage(content=data.message + page_context))

        # Вызов агента
        result = agent.invoke({"messages": messages})
        response_content = result["messages"][-1].content

        # Обработка ответа — может быть строкой или списком
        if isinstance(response_content, list):
            # Если список — извлекаем текстовые части
            response_text = ""
            for item in response_content:
                if isinstance(item, dict) and item.get("type") == "text":
                    response_text += item.get("text", "")
                elif isinstance(item, str):
                    response_text += item
            if not response_text:
                response_text = "Простите, не смог обработать ответ. Попробуйте ещё раз)"
        else:
            response_text = str(response_content)

        # Считаем токены (приблизительно)
        input_tokens = sum(len(str(m.content)) // 4 for m in messages)
        output_tokens = len(response_text) // 4

    except Exception as e:
        print(f"Agent error: {e}")
        response_text = "Извините, произошла ошибка. Попробуйте позже или позвоните нам!"
        input_tokens = 0
        output_tokens = 0

    # Сохраняем ответ
    with get_db() as conn:
        cursor = conn.cursor()

        cursor.execute('''
            INSERT INTO ai_messages (conversation_id, role, content, tokens_input, tokens_output, created_at)
            VALUES (?, 'assistant', ?, ?, ?, ?)
        ''', (conv_id, response_text, input_tokens, output_tokens, datetime.now().isoformat()))

        cursor.execute('''
            UPDATE ai_conversations SET last_message_at = ? WHERE id = ?
        ''', (datetime.now().isoformat(), conv_id))

        # Записываем использование токенов
        model = settings.get('model', 'claude-sonnet-4-20250514')
        pricing = PRICING.get(model, PRICING['claude-sonnet-4-20250514'])
        cost = (input_tokens * pricing['input'] + output_tokens * pricing['output']) / 1_000_000

        cursor.execute('''
            INSERT INTO ai_token_usage (conversation_id, model, tokens_input, tokens_output, cost_usd)
            VALUES (?, ?, ?, ?, ?)
        ''', (conv_id, model, input_tokens, output_tokens, cost))

        conn.commit()

    return {"response": response_text, "session_id": session_id}


# ==================== ОСТАЛЬНЫЕ ЭНДПОИНТЫ (без изменений) ====================

@router.get('/stats')
async def get_stats():
    """Статистика AI"""
    with get_db() as conn:
        cursor = conn.cursor()

        today = datetime.now().strftime('%Y-%m-%d')

        # Диалоги
        cursor.execute('SELECT COUNT(*) as total FROM ai_conversations')
        total_convs = cursor.fetchone()['total']

        cursor.execute('SELECT COUNT(*) as today FROM ai_conversations WHERE date(started_at) = ?', (today,))
        today_convs = cursor.fetchone()['today']

        cursor.execute("SELECT COUNT(*) as leads FROM ai_conversations WHERE status = 'lead'")
        leads = cursor.fetchone()['leads']

        # Токены
        cursor.execute('SELECT SUM(tokens_input) as inp, SUM(tokens_output) as out, SUM(cost_usd) as cost FROM ai_token_usage')
        tokens = cursor.fetchone()

        cursor.execute('SELECT SUM(cost_usd) as cost FROM ai_token_usage WHERE date(created_at) = ?', (today,))
        today_cost = cursor.fetchone()['cost'] or 0

        # По дням
        cursor.execute('''
            SELECT date(created_at) as date, SUM(cost_usd) as cost, COUNT(*) as requests
            FROM ai_token_usage
            GROUP BY date(created_at)
            ORDER BY date DESC
            LIMIT 7
        ''')
        daily = [{"date": row['date'], "cost": row['cost'], "requests": row['requests']} for row in cursor.fetchall()]

        return {
            "conversations": {"total": total_convs, "today": today_convs, "leads": leads},
            "tokens": {
                "total_input": tokens['inp'] or 0,
                "total_output": tokens['out'] or 0,
                "total_cost_usd": tokens['cost'] or 0,
                "today_cost_usd": today_cost
            },
            "daily": daily
        }


@router.get('/conversations')
async def get_conversations():
    """Список диалогов"""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute('''
            SELECT c.*,
                   (SELECT content FROM ai_messages WHERE conversation_id = c.id AND role = 'user' ORDER BY created_at LIMIT 1) as first_message,
                   (SELECT COUNT(*) FROM ai_messages WHERE conversation_id = c.id) as message_count
            FROM ai_conversations c
            ORDER BY c.last_message_at DESC
            LIMIT 100
        ''')
        return [dict(row) for row in cursor.fetchall()]


@router.get('/conversations/{conv_id}')
async def get_conversation(conv_id: int):
    """Детали диалога"""
    with get_db() as conn:
        cursor = conn.cursor()

        cursor.execute('SELECT * FROM ai_conversations WHERE id = ?', (conv_id,))
        conv = cursor.fetchone()
        if not conv:
            raise HTTPException(404, "Conversation not found")

        cursor.execute('SELECT * FROM ai_messages WHERE conversation_id = ? ORDER BY created_at', (conv_id,))
        messages = [dict(row) for row in cursor.fetchall()]

        return {"conversation": dict(conv), "messages": messages}


@router.get('/settings')
async def get_settings_endpoint():
    """Получить настройки"""
    return get_settings()


@router.post('/settings')
async def update_settings(data: SettingsUpdate):
    """Обновить настройку"""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute('''
            INSERT INTO ai_settings (setting_key, setting_value)
            VALUES (?, ?)
            ON CONFLICT(setting_key) DO UPDATE SET setting_value = excluded.setting_value
        ''', (data.setting_key, data.setting_value))
        conn.commit()
    return {"success": True}


@router.get('/knowledge')
async def get_knowledge():
    """Получить базу знаний"""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute('SELECT * FROM ai_knowledge_base ORDER BY priority DESC')
        return [dict(row) for row in cursor.fetchall()]


@router.post('/knowledge')
async def add_knowledge(data: KnowledgeItem):
    """Добавить в базу знаний"""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute('''
            INSERT INTO ai_knowledge_base (category, question, answer, priority, is_active)
            VALUES (?, ?, ?, ?, 1)
        ''', (data.category, data.question, data.answer, data.priority))
        conn.commit()
        return {"id": cursor.lastrowid}


@router.delete('/knowledge/{item_id}')
async def delete_knowledge(item_id: int):
    """Удалить из базы знаний"""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute('DELETE FROM ai_knowledge_base WHERE id = ?', (item_id,))
        conn.commit()
    return {"success": True}


@router.get('/quick-replies')
async def get_quick_replies():
    """Получить быстрые ответы"""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute('SELECT * FROM ai_quick_replies ORDER BY id')
        return [dict(row) for row in cursor.fetchall()]


@router.post('/quick-replies')
async def add_quick_reply(data: QuickReply):
    """Добавить быстрый ответ"""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute('''
            INSERT INTO ai_quick_replies (trigger_words, response, is_active)
            VALUES (?, ?, 1)
        ''', (data.trigger_words, data.response))
        conn.commit()
        return {"id": cursor.lastrowid}


@router.delete('/quick-replies/{item_id}')
async def delete_quick_reply(item_id: int):
    """Удалить быстрый ответ"""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute('DELETE FROM ai_quick_replies WHERE id = ?', (item_id,))
        conn.commit()
    return {"success": True}


# ==================== ИСТОЧНИКИ ДАННЫХ (Data Sources) ====================

class DataSourceCreate(BaseModel):
    name: str
    source_type: str  # tool, document, faq, api
    category: str     # marking, ved, accounting, general
    description: str
    file_path: Optional[str] = None
    is_active: bool = True

@router.get('/data-sources')
async def get_data_sources():
    """Получить все источники данных AI"""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute('''
            SELECT id, name, source_type, category, description, 
                   file_path, file_size, is_active, last_updated, created_at
            FROM ai_data_sources 
            ORDER BY source_type, category, name
        ''')
        sources = [dict(row) for row in cursor.fetchall()]
        
        # Группируем по типам для удобства
        grouped = {
            'tools': [s for s in sources if s['source_type'] == 'tool'],
            'documents': [s for s in sources if s['source_type'] == 'document'],
            'faq': [s for s in sources if s['source_type'] == 'faq'],
            'api': [s for s in sources if s['source_type'] == 'api']
        }
        
        # Статистика
        stats = {
            'total': len(sources),
            'active': len([s for s in sources if s['is_active']]),
            'by_category': {}
        }
        for s in sources:
            cat = s['category'] or 'other'
            stats['by_category'][cat] = stats['by_category'].get(cat, 0) + 1
            
        return {
            'sources': sources,
            'grouped': grouped,
            'stats': stats
        }

@router.post('/data-sources')
async def create_data_source(data: DataSourceCreate):
    """Добавить новый источник данных"""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute('''
            INSERT INTO ai_data_sources (name, source_type, category, description, file_path, is_active)
            VALUES (?, ?, ?, ?, ?, ?)
        ''', (data.name, data.source_type, data.category, data.description, data.file_path, 1 if data.is_active else 0))
        conn.commit()
        return {'success': True, 'id': cursor.lastrowid}

@router.put('/data-sources/{source_id}')
async def update_data_source(source_id: int, data: dict):
    """Обновить источник данных (включить/выключить)"""
    with get_db() as conn:
        cursor = conn.cursor()
        if 'is_active' in data:
            cursor.execute('UPDATE ai_data_sources SET is_active = ?, last_updated = CURRENT_TIMESTAMP WHERE id = ?', 
                          (1 if data['is_active'] else 0, source_id))
        if 'description' in data:
            cursor.execute('UPDATE ai_data_sources SET description = ?, last_updated = CURRENT_TIMESTAMP WHERE id = ?',
                          (data['description'], source_id))
        conn.commit()
        return {'success': True}

@router.delete('/data-sources/{source_id}')
async def delete_data_source(source_id: int):
    """Удалить источник данных"""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute('DELETE FROM ai_data_sources WHERE id = ?', (source_id,))
        conn.commit()
        return {'success': True}


# ==================== СКАЧИВАНИЕ ДОКУМЕНТОВ ====================

from fastapi.responses import FileResponse

@router.get('/documents/{source_id}/download')
async def download_document(source_id: int):
    """Скачать документ по ID источника"""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute('SELECT name, file_path FROM ai_data_sources WHERE id = ? AND source_type = ?', (source_id, 'document'))
        row = cursor.fetchone()
        
        if not row:
            raise HTTPException(404, 'Документ не найден')
        
        file_path = row['file_path']
        filename = row['name'].replace(' ', '_') + '.txt'
        
        if not os.path.exists(file_path):
            raise HTTPException(404, 'Файл не найден на сервере')
        
        return FileResponse(
            path=file_path,
            filename=filename,
            media_type='text/plain; charset=utf-8'
        )

