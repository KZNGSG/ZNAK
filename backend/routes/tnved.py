"""
API эндпоинты для ТНВЭД и маркировки
/api/tnved/* - поиск и статистика ТН ВЭД
/api/check/* - проверка товаров на маркировку
/api/marking/timeline/* - сроки маркировки
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List, Dict
from datetime import datetime, timedelta
import os
import json
import logging

logger = logging.getLogger(__name__)

# ======================== ROUTER ========================
router = APIRouter(prefix="/api", tags=["tnved"])

# ======================== CACHE ========================
_tnved_data = None
_tnved_stats_cache = None
_timeline_data_cache = None

# ======================== PYDANTIC MODELS ========================

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

# ======================== DATA LOADING FUNCTIONS ========================

def get_tnved_data():
    """Загрузить данные ТН ВЭД из JSON"""
    global _tnved_data
    if _tnved_data is None:
        json_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'data', 'tnved.json')
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
        # Import here to avoid circular dependency
        from server import CATEGORIES_DATA
        
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
            timeline_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'data', 'marking_timeline.json')
            if os.path.exists(timeline_path):
                with open(timeline_path, 'r', encoding='utf-8') as f:
                    _timeline_data_cache = json.load(f)
                logger.info("Loaded marking_timeline.json")
        except Exception as e:
            logger.error(f"Failed to load marking_timeline.json: {e}")
            _timeline_data_cache = {}
    return _timeline_data_cache

def get_timeline_stats_with_upcoming():
    """Расчёт статистики с ближайшими дедлайнами"""
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

# ======================== CONSTANTS ========================

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

# ======================== ENDPOINTS ========================

@router.get("/check/categories")
async def get_categories():
    """Get all product categories and subcategories"""
    from server import CATEGORIES_DATA
    return {"groups": CATEGORIES_DATA}

@router.get("/check/init")
async def get_check_init():
    """Unified endpoint for initial page load - returns categories, stats, timeline in one request"""
    from server import CATEGORIES_DATA
    
    timeline_stats = get_timeline_stats_with_upcoming()

    return {
        "groups": CATEGORIES_DATA,
        "tnved_stats": get_tnved_stats_cached(),
        "timeline_stats": timeline_stats
    }

@router.post("/check/assess", response_model=CheckProductResponse)
async def assess_product(request: CheckProductRequest):
    """Assess if product requires marking"""
    from server import PRODUCTS_LOOKUP, TNVED_LOOKUP

    # Look up product by product ID first
    product = None
    if request.product:
        product = PRODUCTS_LOOKUP.get(request.product)

        # If not found by ID, try to extract TNVED code from product ID (e.g. "tnved_2203" -> "2203")
        if not product and request.product.startswith("tnved_"):
            tnved_code = request.product.replace("tnved_", "")
            product = TNVED_LOOKUP.get(tnved_code)

            # Try with spaces if not found (e.g. "220300" -> "2203 00")
            if not product and len(tnved_code) >= 4:
                # Try common patterns: 220300 -> 2203 00, 22030031 -> 2203 00 31
                for i in range(4, len(tnved_code)):
                    spaced = tnved_code[:4] + " " + tnved_code[4:i] + (" " + tnved_code[i:] if i < len(tnved_code) else "")
                    product = TNVED_LOOKUP.get(spaced.strip())
                    if product:
                        break

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

@router.get("/tnved/search")
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


@router.get("/tnved/stats")
async def api_tnved_stats():
    """Статистика: всего кодов из tnved.json, обязательных/эксперимент из CATEGORIES_DATA"""
    return get_tnved_stats_cached()


@router.get("/marking/timeline/stats")
async def api_timeline_stats():
    """Статистика по срокам маркировки с ближайшими дедлайнами"""
    stats = get_timeline_stats_with_upcoming()
    return {"statistics": stats}


@router.get("/marking/timeline")
async def api_timeline():
    """Полные данные по срокам маркировки"""
    data = get_timeline_data_cached()
    if not data:
        return {"categories": {}, "groups": [], "statistics": {}}

    return data


@router.get("/marking/timeline/category/{category_id}")
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
