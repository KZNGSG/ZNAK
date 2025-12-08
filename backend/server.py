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
import httpx
import uuid

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
    type: str  # LEGAL или INDIVIDUAL
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
    description: str
    price: int
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

# ======================== FULL PRODUCT DATABASE (299 items) ========================

CATEGORIES_DATA = [
    {
        "id": "fur",
        "name": "Меховые изделия",
        "status": "mandatory",
        "subcategories": [
            {"id": "fur_mink", "name": "Шубы из норки", "tnved": "4303109010"},
            {"id": "fur_nutria", "name": "Шубы из нутрии", "tnved": "4303109020"},
            {"id": "fur_fox", "name": "Шубы из песца/лисицы", "tnved": "4303109030"},
            {"id": "fur_rabbit", "name": "Шубы из кролика/зайца", "tnved": "4303109040"},
            {"id": "fur_raccoon", "name": "Шубы из енота", "tnved": "4303109050"},
            {"id": "fur_sheep", "name": "Шубы из овчины", "tnved": "4303109060"},
            {"id": "fur_other", "name": "Шубы из прочего меха", "tnved": "4303109080"},
        ]
    },
    {
        "id": "tobacco",
        "name": "Табачная продукция",
        "status": "mandatory",
        "subcategories": [
            {"id": "cigarettes", "name": "Сигареты", "tnved": "2402209000"},
            {"id": "cigars", "name": "Сигары", "tnved": "2402100000"},
            {"id": "cigarettes_filter", "name": "Сигареты с фильтром", "tnved": "2402201000"},
            {"id": "tobacco_smoking", "name": "Табак курительный", "tnved": "2403191000"},
            {"id": "tobacco_hookah", "name": "Табак для кальяна", "tnved": "2403110000"},
            {"id": "tobacco_chew", "name": "Табак жевательный/нюхательный", "tnved": "2403991000"},
            {"id": "sticks_other", "name": "Стики для нагревания (прочие)", "tnved": "2403999008"},
            {"id": "sticks", "name": "Стики для нагревания", "tnved": "2404110001"},
            {"id": "sticks_other2", "name": "Стики для нагревания (прочие)", "tnved": "2404110009"},
            {"id": "tobacco_free_mix", "name": "Бестабачные смеси для нагревания", "tnved": "2404190001"},
            {"id": "vape_liquid_nic", "name": "Жидкости для вейпов (никотин)", "tnved": "2404120000"},
            {"id": "vape_liquid_other", "name": "Жидкости для вейпов (прочие)", "tnved": "2404190009"},
        ]
    },
    {
        "id": "shoes",
        "name": "Обувь",
        "status": "mandatory",
        "subcategories": [
            {"id": "shoes_rubber_water", "name": "Обувь водонепроницаемая резиновая", "tnved": "6401100000"},
            {"id": "boots_rubber_knee", "name": "Сапоги резиновые (закрывающие колено)", "tnved": "6401921000"},
            {"id": "boots_rubber_other", "name": "Сапоги резиновые (прочие)", "tnved": "6401929000"},
            {"id": "shoes_rubber_other", "name": "Обувь резиновая прочая", "tnved": "6401990000"},
            {"id": "shoes_sport_ski", "name": "Спортивная обувь (лыжная)", "tnved": "6402121000"},
            {"id": "shoes_sport_other", "name": "Спортивная обувь (прочая)", "tnved": "6402129000"},
            {"id": "shoes_plastic", "name": "Обувь с верхом из пластмассы", "tnved": "6402190000"},
            {"id": "sandals_plastic", "name": "Сандалии с пластиковым верхом", "tnved": "6402200000"},
            {"id": "shoes_leather_sport", "name": "Обувь кожаная (спортивная)", "tnved": "6403120000"},
            {"id": "shoes_leather_sport_other", "name": "Обувь кожаная (прочая спортивная)", "tnved": "6403190000"},
            {"id": "sandals_leather", "name": "Сандалии кожаные", "tnved": "6403200000"},
            {"id": "shoes_leather_wood", "name": "Обувь кожаная с деревянной подошвой", "tnved": "6403400000"},
            {"id": "boots_leather", "name": "Ботинки кожаные (закрывают лодыжку)", "tnved": "6403510500"},
            {"id": "shoes_textile", "name": "Обувь текстильная", "tnved": "6404110000"},
            {"id": "shoes_textile_home", "name": "Обувь текстильная (домашняя)", "tnved": "6404191000"},
            {"id": "shoes_textile_other", "name": "Обувь текстильная прочая", "tnved": "6404199000"},
            {"id": "shoes_other_leather", "name": "Обувь прочая (верх кожа)", "tnved": "6405100001"},
            {"id": "shoes_other_textile", "name": "Обувь прочая (верх текстиль)", "tnved": "6405201000"},
            {"id": "shoes_other", "name": "Обувь прочая", "tnved": "6405901000"},
        ]
    },
    {
        "id": "perfume",
        "name": "Парфюмерия",
        "status": "mandatory",
        "subcategories": [
            {"id": "perfume_spirits", "name": "Духи", "tnved": "3303001000"},
            {"id": "perfume_toilet", "name": "Туалетная вода", "tnved": "3303009000"},
        ]
    },
    {
        "id": "photo",
        "name": "Фототовары",
        "status": "mandatory",
        "subcategories": [
            {"id": "camera_instant", "name": "Фотокамеры моментальной печати", "tnved": "9006300000"},
            {"id": "camera_auto", "name": "Фотокамеры с автопроявлением", "tnved": "9006400000"},
            {"id": "camera_digital_slr", "name": "Фотокамеры цифровые (зеркальные)", "tnved": "9006531000"},
            {"id": "camera_digital_other", "name": "Фотокамеры цифровые прочие", "tnved": "9006538001"},
            {"id": "flash", "name": "Фотовспышки", "tnved": "9006610000"},
            {"id": "flash_lamp", "name": "Лампы-вспышки", "tnved": "9006690001"},
        ]
    },
    {
        "id": "tires",
        "name": "Шины",
        "status": "mandatory",
        "subcategories": [
            {"id": "tires_car_new", "name": "Шины легковые новые", "tnved": "4011100003"},
            {"id": "tires_car_other", "name": "Шины легковые прочие", "tnved": "4011100009"},
            {"id": "tires_truck_radial", "name": "Шины грузовые (радиальные)", "tnved": "4011201000"},
            {"id": "tires_truck_other", "name": "Шины грузовые прочие", "tnved": "4011209000"},
            {"id": "tires_moto", "name": "Шины мотоциклетные", "tnved": "4011400000"},
            {"id": "tires_agro", "name": "Шины сельскохозяйственные", "tnved": "4011700000"},
            {"id": "tires_construction", "name": "Шины строительные", "tnved": "4011800000"},
            {"id": "tires_other", "name": "Шины прочие", "tnved": "4011900000"},
        ]
    },
    {
        "id": "clothing",
        "name": "Одежда",
        "status": "mandatory",
        "subcategories": [
            {"id": "clothes_leather_m", "name": "Одежда из кожи (мужская)", "tnved": "4203100001"},
            {"id": "clothes_leather_w", "name": "Одежда из кожи (женская)", "tnved": "4203100009"},
            {"id": "coat_m_wool", "name": "Пальто, куртки мужские (шерсть)", "tnved": "6201200000"},
            {"id": "coat_m_cotton", "name": "Пальто, куртки мужские (хлопок)", "tnved": "6201300000"},
            {"id": "coat_m_synth", "name": "Пальто, куртки мужские (синтетика)", "tnved": "6201400000"},
            {"id": "coat_m_other", "name": "Пальто, куртки мужские прочие", "tnved": "6201900000"},
            {"id": "coat_w_wool", "name": "Пальто, куртки женские (шерсть)", "tnved": "6202200000"},
            {"id": "coat_w_cotton", "name": "Пальто, куртки женские (хлопок)", "tnved": "6202300000"},
            {"id": "coat_w_synth", "name": "Пальто, куртки женские (синтетика)", "tnved": "6202400001"},
            {"id": "coat_w_other", "name": "Пальто, куртки женские прочие", "tnved": "6202900001"},
            {"id": "suit_m", "name": "Костюмы мужские", "tnved": "6203110000"},
            {"id": "suit_m_wool", "name": "Костюмы мужские (шерсть)", "tnved": "6203120000"},
            {"id": "jacket_m", "name": "Пиджаки мужские", "tnved": "6203310000"},
            {"id": "pants_m", "name": "Брюки мужские", "tnved": "6203411000"},
            {"id": "suit_w", "name": "Костюмы женские", "tnved": "6204110000"},
            {"id": "jacket_w", "name": "Жакеты женские", "tnved": "6204310000"},
            {"id": "dress", "name": "Платья", "tnved": "6204410000"},
            {"id": "skirt", "name": "Юбки", "tnved": "6204510000"},
            {"id": "pants_w", "name": "Брюки женские", "tnved": "6204611000"},
            {"id": "shirt_m", "name": "Рубашки мужские", "tnved": "6205200000"},
            {"id": "blouse_w", "name": "Блузки женские", "tnved": "6206100000"},
            {"id": "sweater", "name": "Свитеры, пуловеры", "tnved": "6110111000"},
            {"id": "cardigan", "name": "Кардиганы", "tnved": "6110121001"},
            {"id": "jumper", "name": "Джемперы", "tnved": "6110201000"},
            {"id": "shawl", "name": "Шали", "tnved": "6214100000"},
            {"id": "kerchief", "name": "Платки", "tnved": "6214200000"},
            {"id": "scarf", "name": "Шарфы", "tnved": "6214300000"},
            {"id": "tie", "name": "Галстуки", "tnved": "6215100000"},
            {"id": "bowtie", "name": "Галстуки-бабочки", "tnved": "6215200000"},
            {"id": "underwear_m_knit", "name": "Трусы мужские (трикотаж)", "tnved": "6107110000"},
            {"id": "underwear_m_cotton", "name": "Трусы мужские (хлопок)", "tnved": "6107120000"},
            {"id": "pajamas_m", "name": "Пижамы мужские (трикотаж)", "tnved": "6107210000"},
            {"id": "robe_m", "name": "Халаты мужские", "tnved": "6107910000"},
            {"id": "slip_w", "name": "Комбинации женские", "tnved": "6108110000"},
            {"id": "underwear_w", "name": "Трусы женские", "tnved": "6108210000"},
            {"id": "nightgown", "name": "Ночные сорочки", "tnved": "6108310000"},
            {"id": "robe_w", "name": "Халаты женские", "tnved": "6108910000"},
            {"id": "tshirt_cotton", "name": "Майки, футболки (хлопок)", "tnved": "6109100000"},
            {"id": "tshirt_synth", "name": "Майки, футболки (синтетика)", "tnved": "6109902000"},
            {"id": "bra", "name": "Бюстгальтеры", "tnved": "6212101000"},
            {"id": "garter", "name": "Пояса для чулок", "tnved": "6212200000"},
            {"id": "corset", "name": "Корсеты, грации", "tnved": "6212300000"},
            {"id": "tights", "name": "Колготки", "tnved": "6115101001"},
            {"id": "stockings", "name": "Чулки", "tnved": "6115210000"},
            {"id": "knee_highs", "name": "Гольфы", "tnved": "6115220000"},
            {"id": "socks", "name": "Носки", "tnved": "6115940000"},
            {"id": "swimsuit_w", "name": "Купальники женские", "tnved": "6112410000"},
            {"id": "swimsuit_m", "name": "Плавки мужские", "tnved": "6112310000"},
            {"id": "baby_clothes_knit", "name": "Одежда для детей 0-3 (трикотаж)", "tnved": "6111201000"},
            {"id": "baby_clothes_cotton", "name": "Одежда для детей 0-3 (хлопок)", "tnved": "6111301000"},
            {"id": "baby_clothes_other", "name": "Одежда для детей 0-3 прочая", "tnved": "6111901100"},
            {"id": "hat_felt", "name": "Головные уборы (фетр)", "tnved": "6504000000"},
            {"id": "hat_knit", "name": "Головные уборы (трикотаж)", "tnved": "6505001000"},
            {"id": "hat_knitted", "name": "Головные уборы (вязаные)", "tnved": "6505003000"},
            {"id": "hat_other", "name": "Головные уборы прочие", "tnved": "6506991000"},
            {"id": "gloves_leather", "name": "Перчатки кожаные", "tnved": "4203210000"},
            {"id": "gloves_knit", "name": "Перчатки трикотажные", "tnved": "6116102000"},
            {"id": "mittens", "name": "Варежки", "tnved": "6116910000"},
        ]
    },
    {
        "id": "textile",
        "name": "Текстиль",
        "status": "mandatory",
        "subcategories": [
            {"id": "bedding_silk", "name": "Белье постельное (из шелка)", "tnved": "6302100001"},
            {"id": "bedding_other", "name": "Белье постельное прочее", "tnved": "6302100009"},
            {"id": "bedding_cotton_print", "name": "Белье постельное (хлопок, набивное)", "tnved": "6302210000"},
            {"id": "bedding_cotton_other", "name": "Белье постельное (хлопок, прочее)", "tnved": "6302221000"},
            {"id": "bedding_synth", "name": "Белье постельное (синтетика)", "tnved": "6302310001"},
            {"id": "table_linen", "name": "Белье столовое", "tnved": "6302400000"},
            {"id": "towels_cotton", "name": "Белье туалетное/кухонное (хлопок)", "tnved": "6302600000"},
        ]
    },
    {
        "id": "milk",
        "name": "Молочная продукция",
        "status": "mandatory",
        "subcategories": [
            {"id": "milk_1pct", "name": "Молоко (до 1% жира)", "tnved": "0401101000"},
            {"id": "milk_6pct", "name": "Молоко (1-6% жира)", "tnved": "0401201101"},
            {"id": "cream_21pct", "name": "Сливки (до 21% жира)", "tnved": "0401401000"},
            {"id": "cream_high", "name": "Сливки (более 21% жира)", "tnved": "0401501100"},
            {"id": "milk_powder", "name": "Молоко сухое", "tnved": "0402101100"},
            {"id": "milk_condensed", "name": "Молоко сгущённое", "tnved": "0402911000"},
            {"id": "yogurt", "name": "Йогурт", "tnved": "0403201100"},
            {"id": "kefir", "name": "Кефир", "tnved": "0403901100"},
            {"id": "sour_cream", "name": "Сметана", "tnved": "0403905101"},
            {"id": "whey", "name": "Сыворотка молочная", "tnved": "0404100200"},
            {"id": "butter", "name": "Масло сливочное", "tnved": "0405101100"},
            {"id": "cheese_fresh", "name": "Сыр свежий (незрелый)", "tnved": "0406103000"},
            {"id": "cottage_cheese", "name": "Творог", "tnved": "0406105001"},
            {"id": "cheese_grated", "name": "Сыр тёртый/порошкообразный", "tnved": "0406200000"},
            {"id": "cheese_processed", "name": "Сыр плавленый", "tnved": "0406301000"},
            {"id": "cheese_mold", "name": "Сыр с плесенью", "tnved": "0406401000"},
            {"id": "cheese_other", "name": "Сыры прочие", "tnved": "0406900100"},
            {"id": "icecream", "name": "Мороженое", "tnved": "2105001000"},
            {"id": "icecream_other", "name": "Мороженое прочее", "tnved": "2105009100"},
            {"id": "milk_drinks", "name": "Молочные напитки", "tnved": "2202999100"},
        ]
    },
    {
        "id": "drinks",
        "name": "Напитки",
        "status": "mandatory",
        "subcategories": [
            # Вода
            {"id": "water_mineral_gas", "name": "Вода минеральная (газированная)", "tnved": "2201101100"},
            {"id": "water_mineral_still", "name": "Вода минеральная (негазированная)", "tnved": "2201101900"},
            {"id": "water_mineral_other", "name": "Вода минеральная прочая", "tnved": "2201109000"},
            {"id": "water_drinking", "name": "Вода питьевая", "tnved": "2201900000"},
            # Безалкогольные
            {"id": "soft_drinks_sweet", "name": "Безалкогольные напитки (сладкие)", "tnved": "2202100000"},
            {"id": "soft_drinks_milk", "name": "Безалкогольные напитки (с молоком)", "tnved": "2202991100"},
            {"id": "soft_drinks_plant", "name": "Напитки на растительном сырье", "tnved": "2202991100"},
            {"id": "soft_drinks_other", "name": "Безалкогольные напитки прочие", "tnved": "2202991800"},
            {"id": "energy_drink", "name": "Энергетические напитки", "tnved": "2202991700"},
            # Соки (с 1.09.2023)
            {"id": "juice_orange", "name": "Сок апельсиновый", "tnved": "2009120000"},
            {"id": "juice_grape", "name": "Сок виноградный", "tnved": "2009610000"},
            {"id": "juice_apple", "name": "Сок яблочный", "tnved": "2009710000"},
            {"id": "juice_tomato", "name": "Сок томатный", "tnved": "2009501000"},
            {"id": "juice_pineapple", "name": "Сок ананасовый", "tnved": "2009410000"},
            {"id": "juice_mixed", "name": "Соки смешанные", "tnved": "2009900000"},
            {"id": "juice_vegetable", "name": "Соки овощные", "tnved": "2009909700"},
            {"id": "nectar", "name": "Нектары", "tnved": "2009890000"},
            # Морсы и компоты (с 1.09.2023)
            {"id": "mors_berry", "name": "Морсы ягодные", "tnved": "2009890000"},
            {"id": "mors_fruit", "name": "Морсы фруктовые", "tnved": "2009890000"},
            {"id": "compote_fruit", "name": "Компоты фруктовые", "tnved": "2007991000"},
            {"id": "compote_berry", "name": "Компоты ягодные", "tnved": "2008991900"},
            # Квас
            {"id": "kvass", "name": "Квас", "tnved": "2206005901"},
            {"id": "kvass_bread", "name": "Квас хлебный", "tnved": "2202100000"},
            # Пиво (с 1.03.2023)
            {"id": "beer_malt", "name": "Пиво солодовое", "tnved": "2203000100"},
            {"id": "beer_other", "name": "Пиво прочее", "tnved": "2203000900"},
            {"id": "beer_strong", "name": "Пиво (крепкое)", "tnved": "2203001000"},
            {"id": "beer_non_alc", "name": "Безалкогольное пиво", "tnved": "2202910000"},
            {"id": "beer_craft", "name": "Пиво крафтовое", "tnved": "2203000100"},
            # Сидр и прочие
            {"id": "cider_apple", "name": "Сидр яблочный", "tnved": "2206003100"},
            {"id": "cider_pear", "name": "Сидр грушевый (перри)", "tnved": "2206003901"},
            {"id": "cider_other", "name": "Сидр прочий", "tnved": "2206008100"},
            {"id": "mead", "name": "Медовуха", "tnved": "2206005100"},
            {"id": "fermented_other", "name": "Напитки брожения прочие", "tnved": "2206008100"},
        ]
    },
    {
        "id": "supplements",
        "name": "БАДы",
        "status": "mandatory",
        "subcategories": [
            {"id": "vitamin_abcde", "name": "Витамины A, B, C, D, E", "tnved": "2936210000"},
            {"id": "vitamin_b1", "name": "Витамин B1 (тиамин)", "tnved": "2936220001"},
            {"id": "vitamin_b2", "name": "Витамин B2 (рибофлавин)", "tnved": "2936230000"},
            {"id": "vitamin_b3", "name": "Витамин B3 (ниацин)", "tnved": "2936240000"},
            {"id": "vitamin_b5", "name": "Витамин B5 (пантотеновая кислота)", "tnved": "2936250000"},
            {"id": "vitamin_b6", "name": "Витамин B6", "tnved": "2936260000"},
            {"id": "vitamin_b12", "name": "Витамин B12", "tnved": "2936270000"},
            {"id": "vitamin_c", "name": "Витамин C (аскорбиновая кислота)", "tnved": "2936280000"},
            {"id": "vitamins_other", "name": "Витамины прочие", "tnved": "2936290001"},
            {"id": "provitamins", "name": "Провитамины", "tnved": "2936900001"},
            {"id": "supplements_food", "name": "БАД (пищевые добавки)", "tnved": "2106909801"},
            {"id": "supplements_vitamin", "name": "БАД (витаминно-минеральные)", "tnved": "2106909803"},
            {"id": "supplements_other", "name": "БАД прочие", "tnved": "2106909808"},
        ]
    },
    {
        "id": "food",
        "name": "Продукты питания",
        "status": "mandatory",
        "subcategories": [
            {"id": "caviar_sturgeon", "name": "Икра осетровых", "tnved": "1604310000"},
            {"id": "caviar_salmon", "name": "Икра лососёвых (красная)", "tnved": "1604320010"},
            {"id": "canned_fish", "name": "Консервы из рыбы", "tnved": "1604110000"},
            {"id": "canned_herring", "name": "Консервы из сельди", "tnved": "1604121000"},
            {"id": "canned_sardines", "name": "Консервы из сардин", "tnved": "1604131100"},
            {"id": "canned_tuna", "name": "Консервы из тунца", "tnved": "1604142100"},
            {"id": "canned_mackerel", "name": "Консервы из скумбрии", "tnved": "1604151100"},
            {"id": "canned_salmon", "name": "Консервы из лосося", "tnved": "1604191000"},
            {"id": "canned_meat", "name": "Консервы из мяса", "tnved": "1602100010"},
            {"id": "pate", "name": "Паштеты", "tnved": "1602201000"},
            {"id": "canned_poultry", "name": "Консервы из птицы", "tnved": "1602311100"},
            {"id": "canned_vegetables", "name": "Консервы овощные", "tnved": "2001100000"},
            {"id": "canned_tomatoes", "name": "Томаты консервированные", "tnved": "2002101000"},
            {"id": "canned_mushrooms", "name": "Грибы консервированные", "tnved": "2003102000"},
            {"id": "canned_peas", "name": "Горошек консервированный", "tnved": "2005400000"},
            {"id": "canned_corn", "name": "Кукуруза консервированная", "tnved": "2005800000"},
            {"id": "jam", "name": "Джемы, варенье", "tnved": "2007101010"},
            {"id": "compote", "name": "Компоты", "tnved": "2008201100"},
            {"id": "oil_soy", "name": "Масло соевое", "tnved": "1507109001"},
            {"id": "oil_peanut", "name": "Масло арахисовое", "tnved": "1508109000"},
            {"id": "oil_olive", "name": "Масло оливковое", "tnved": "1509200000"},
            {"id": "oil_palm", "name": "Масло пальмовое", "tnved": "1511109002"},
            {"id": "oil_sunflower", "name": "Масло подсолнечное", "tnved": "1512119101"},
            {"id": "oil_coconut", "name": "Масло кокосовое", "tnved": "1513119100"},
            {"id": "oil_rapeseed", "name": "Масло рапсовое", "tnved": "1514119001"},
            {"id": "oil_flax", "name": "Масло льняное", "tnved": "1515110000"},
            {"id": "oil_sesame", "name": "Масло кунжутное", "tnved": "1515309000"},
            {"id": "margarine", "name": "Маргарин", "tnved": "1517101000"},
        ]
    },
    {
        "id": "pet_food",
        "name": "Корма для животных",
        "status": "mandatory",
        "subcategories": [
            {"id": "pet_food_dry", "name": "Корма сухие для собак/кошек", "tnved": "2309101100"},
            {"id": "pet_food_wet", "name": "Корма влажные для собак/кошек", "tnved": "2309109000"},
            {"id": "bird_food", "name": "Корма для птиц", "tnved": "2309901000"},
            {"id": "pet_treats", "name": "Лакомства для животных", "tnved": "2309909601"},
        ]
    },
    {
        "id": "medical",
        "name": "Медицинские изделия",
        "status": "mandatory",
        "subcategories": [
            {"id": "wheelchair_manual", "name": "Кресла-коляски ручные", "tnved": "8713100000"},
            {"id": "wheelchair_electric", "name": "Кресла-коляски электрические", "tnved": "8713900000"},
            {"id": "diapers_adult", "name": "Подгузники для взрослых", "tnved": "9619008901"},
            {"id": "pads_urological", "name": "Прокладки урологические", "tnved": "9619008909"},
            {"id": "ortho_shoes", "name": "Ортопедическая обувь", "tnved": "9021101000"},
            {"id": "ortho_insoles", "name": "Стельки ортопедические", "tnved": "9021101000"},
            {"id": "stents", "name": "Стенты коронарные", "tnved": "9021909001"},
            {"id": "gloves_medical_rubber", "name": "Перчатки медицинские (резиновые)", "tnved": "4015120001"},
            {"id": "gloves_medical_plastic", "name": "Перчатки медицинские (пластик)", "tnved": "3926200000"},
            {"id": "gloves_medical_nitrile", "name": "Перчатки медицинские (нитрил)", "tnved": "4015120009"},
            {"id": "gloves_medical_latex", "name": "Перчатки медицинские (латекс)", "tnved": "4015190000"},
            # Добавлено с 1.09.2023
            {"id": "hearing_aid", "name": "Слуховые аппараты", "tnved": "9021400000"},
            {"id": "ct_scanner", "name": "Компьютерные томографы", "tnved": "9022120000"},
            {"id": "ct_scanner_dental", "name": "Томографы стоматологические", "tnved": "9022130000"},
            {"id": "ct_scanner_other", "name": "Томографы прочие", "tnved": "9022140000"},
            {"id": "air_purifier", "name": "Обеззараживатели воздуха", "tnved": "8421392008"},
            {"id": "air_recirculator", "name": "Рециркуляторы бактерицидные", "tnved": "8421398006"},
            {"id": "uv_lamp", "name": "Лампы бактерицидные", "tnved": "8539490000"},
        ]
    },
    {
        "id": "antiseptics",
        "name": "Антисептики",
        "status": "mandatory",
        "subcategories": [
            {"id": "antiseptic_cosmetic", "name": "Антисептики косметические", "tnved": "3304990000"},
            {"id": "antiseptic_skin", "name": "Антисептики кожные", "tnved": "3808941000"},
            {"id": "disinfectant", "name": "Дезинфицирующие средства", "tnved": "3808943000"},
        ]
    },
    {
        "id": "cosmetics",
        "name": "Косметика",
        "status": "mandatory",
        "subcategories": [
            {"id": "shampoo", "name": "Шампуни", "tnved": "3305100000"},
            {"id": "hair_perm", "name": "Средства для завивки волос", "tnved": "3305200000"},
            {"id": "hair_spray", "name": "Лаки для волос", "tnved": "3305300000"},
            {"id": "hair_lotion", "name": "Лосьоны для волос", "tnved": "3305900001"},
            {"id": "toothpaste", "name": "Зубные пасты", "tnved": "3306100000"},
            {"id": "oral_care", "name": "Средства для полости рта", "tnved": "3306900000"},
            {"id": "shaving", "name": "Средства для бритья", "tnved": "3307100000"},
            {"id": "deodorant", "name": "Дезодоранты", "tnved": "3307200000"},
            {"id": "bath_salts", "name": "Соли для ванн", "tnved": "3307300000"},
            {"id": "air_freshener", "name": "Ароматизаторы воздуха", "tnved": "3307490000"},
            {"id": "manicure", "name": "Средства для маникюра", "tnved": "3304300000"},
            {"id": "lipstick", "name": "Помады", "tnved": "3304100000"},
            {"id": "mascara", "name": "Тушь, тени", "tnved": "3304200000"},
            {"id": "powder", "name": "Пудра", "tnved": "3304910000"},
            {"id": "skin_cream", "name": "Кремы для кожи", "tnved": "3304990000"},
        ]
    },
    {
        "id": "household",
        "name": "Бытовая химия",
        "status": "mandatory",
        "subcategories": [
            {"id": "soap_toilet", "name": "Мыло туалетное", "tnved": "3401110001"},
            {"id": "soap_household", "name": "Мыло хозяйственное", "tnved": "3401190000"},
            {"id": "soap_liquid", "name": "Жидкое мыло", "tnved": "3401201000"},
            {"id": "detergent", "name": "Стиральные порошки", "tnved": "3402500000"},
            {"id": "cleaner", "name": "Чистящие средства", "tnved": "3405400000"},
        ]
    },
    {
        "id": "veterinary",
        "name": "Ветеринарные препараты",
        "status": "mandatory",
        "subcategories": [
            {"id": "vet_vaccines", "name": "Вакцины ветеринарные", "tnved": "3002120002"},
            {"id": "vet_antibiotics", "name": "Антибиотики ветеринарные", "tnved": "2941900009"},
            {"id": "vet_medicines", "name": "Лекарства ветеринарные", "tnved": "3004100001"},
        ]
    },
    {
        "id": "tsr",
        "name": "Технические средства реабилитации",
        "status": "mandatory",
        "subcategories": [
            {"id": "cane", "name": "Трости опорные", "tnved": "6602000000"},
            {"id": "crutches", "name": "Костыли", "tnved": "9021101000"},
            {"id": "walkers", "name": "Ходунки", "tnved": "9021909009"},
            {"id": "orthosis", "name": "Ортезы", "tnved": "9021399000"},
            {"id": "mattress_anti_decubitus", "name": "Матрасы противопролежневые", "tnved": "9404211000"},
            {"id": "pillow_anti_decubitus", "name": "Подушки противопролежневые", "tnved": "9019109009"},
            {"id": "colostomy_bags", "name": "Калоприёмники", "tnved": "3006910000"},
            {"id": "commode_chair", "name": "Кресла-стулья с санитарным оснащением", "tnved": "9401790009"},
        ]
    },
    {
        "id": "grocery",
        "name": "Бакалея",
        "status": "mandatory",
        "subcategories": [
            {"id": "ketchup", "name": "Кетчуп, томатный соус", "tnved": "2103100000"},
            {"id": "soy_sauce", "name": "Соевый соус", "tnved": "2103200000"},
            {"id": "mustard", "name": "Горчица", "tnved": "2103301000"},
            {"id": "mayonnaise", "name": "Майонез", "tnved": "2103901000"},
            {"id": "sauces_other", "name": "Соусы прочие", "tnved": "2103909001"},
            {"id": "vinegar", "name": "Уксус", "tnved": "2209001100"},
            {"id": "pepper_black", "name": "Перец чёрный", "tnved": "0904110000"},
            {"id": "pepper_ground", "name": "Перец молотый", "tnved": "0904120000"},
            {"id": "vanilla", "name": "Ваниль", "tnved": "0905100000"},
            {"id": "cinnamon", "name": "Корица", "tnved": "0906110000"},
            {"id": "cloves", "name": "Гвоздика", "tnved": "0907100000"},
            {"id": "nutmeg", "name": "Мускатный орех", "tnved": "0908110000"},
            {"id": "cardamom", "name": "Кардамон", "tnved": "0908310000"},
            {"id": "ginger", "name": "Имбирь", "tnved": "0910110000"},
            {"id": "turmeric", "name": "Куркума", "tnved": "0910300000"},
            {"id": "popcorn", "name": "Попкорн", "tnved": "1904101000"},
            {"id": "grain_snacks", "name": "Снеки из зерна", "tnved": "1904103000"},
            {"id": "chips", "name": "Чипсы", "tnved": "2005202000"},
            {"id": "dry_soup", "name": "Супы сухие", "tnved": "2104100000"},
        ]
    },
    {
        "id": "bicycles",
        "name": "Велосипеды",
        "status": "mandatory",
        "subcategories": [
            {"id": "moped", "name": "Мотовелосипеды", "tnved": "8711100000"},
            {"id": "bicycle_other", "name": "Велосипеды прочие", "tnved": "8711900000"},
            {"id": "bicycle_racing", "name": "Велосипеды гоночные", "tnved": "8712003000"},
            {"id": "bicycle_city", "name": "Велосипеды городские", "tnved": "8712007000"},
            {"id": "bicycle_frame", "name": "Велосипедные рамы", "tnved": "8714911001"},
        ]
    },
    # =============== ОБЯЗАТЕЛЬНЫЕ С 2025 ГОДА ===============
    {
        "id": "construction",
        "name": "Стройматериалы",
        "status": "mandatory",  # с 1.09.2025
        "subcategories": [
            {"id": "gypsum", "name": "Гипс", "tnved": "2520100000"},
            {"id": "cement_clinker", "name": "Цементный клинкер", "tnved": "2523100000"},
            {"id": "cement_portland", "name": "Цемент портландцемент", "tnved": "2523210000"},
            {"id": "cement_other", "name": "Цемент прочий", "tnved": "2523290000"},
            {"id": "cement_alumina", "name": "Цемент глинозёмистый", "tnved": "2523300000"},
            {"id": "foam", "name": "Пена монтажная", "tnved": "3214101001"},
            {"id": "putty", "name": "Шпатлёвка", "tnved": "3214109000"},
            {"id": "construction_mix", "name": "Смеси строительные сухие", "tnved": "3816000000"},
            {"id": "sealant", "name": "Герметики", "tnved": "3214101009"},
            {"id": "mortar", "name": "Растворы и бетоны", "tnved": "3824509000"},
        ]
    },
    {
        "id": "auto_chemistry",
        "name": "Смазочные материалы и автожидкости",
        "status": "mandatory",  # с 1.03.2025
        "subcategories": [
            {"id": "motor_oil", "name": "Моторные масла", "tnved": "2710198200"},
            {"id": "lubricant", "name": "Масла смазочные прочие", "tnved": "2710198800"},
            {"id": "lubricant_synthetic", "name": "Смазки синтетические", "tnved": "3403191000"},
            {"id": "lubricant_other", "name": "Смазочные материалы прочие", "tnved": "3403199000"},
            {"id": "lubricant_prep", "name": "Смазочные препараты", "tnved": "3403990000"},
            {"id": "antifreeze", "name": "Антифризы", "tnved": "3820000000"},
            {"id": "brake_fluid", "name": "Тормозные жидкости", "tnved": "3819000000"},
        ]
    },
    {
        "id": "toys",
        "name": "Игрушки",
        "status": "mandatory",  # с 1.09.2025
        "subcategories": [
            {"id": "toys_wheeled", "name": "Игрушки на колёсах", "tnved": "9503001009"},
            {"id": "dolls", "name": "Куклы", "tnved": "9503002100"},
            {"id": "toy_trains", "name": "Игрушечные поезда", "tnved": "9503003000"},
            {"id": "construction_sets", "name": "Конструкторы", "tnved": "9503003500"},
            {"id": "soft_toys", "name": "Мягкие игрушки", "tnved": "9503004100"},
            {"id": "toy_instruments", "name": "Музыкальные игрушки", "tnved": "9503005000"},
            {"id": "puzzles", "name": "Пазлы", "tnved": "9503006000"},
            {"id": "toys_other", "name": "Игрушки прочие", "tnved": "9503009000"},
            {"id": "board_games", "name": "Настольные игры", "tnved": "9504400000"},
            {"id": "video_games", "name": "Видеоигровые приставки", "tnved": "9504901000"},
        ]
    },
    {
        "id": "sweets",
        "name": "Сладости и кондитерские изделия",
        "status": "mandatory",  # с 31.05.2025
        "subcategories": [
            {"id": "gum", "name": "Жевательная резинка", "tnved": "1704101000"},
            {"id": "candy", "name": "Конфеты", "tnved": "1704901000"},
            {"id": "caramel", "name": "Карамель", "tnved": "1704905100"},
            {"id": "dragee", "name": "Драже", "tnved": "1704907100"},
            {"id": "toffee", "name": "Ирис", "tnved": "1704908200"},
            {"id": "chocolate_milk", "name": "Шоколад молочный", "tnved": "1806310000"},
            {"id": "chocolate_filled", "name": "Шоколад с начинкой", "tnved": "1806321000"},
            {"id": "chocolate_other", "name": "Шоколад прочий", "tnved": "1806907000"},
            {"id": "cocoa_products", "name": "Изделия из какао", "tnved": "1806909000"},
            {"id": "cookies", "name": "Печенье", "tnved": "1905311100"},
            {"id": "waffles", "name": "Вафли", "tnved": "1905321100"},
            {"id": "gingerbread", "name": "Пряники", "tnved": "1905901000"},
        ]
    },
    {
        "id": "sports_nutrition",
        "name": "Спортивное питание",
        "status": "mandatory",  # с 31.05.2025
        "subcategories": [
            {"id": "protein", "name": "Протеин", "tnved": "2106909801"},
            {"id": "gainer", "name": "Гейнер", "tnved": "2106909803"},
            {"id": "bcaa", "name": "BCAA аминокислоты", "tnved": "2106909808"},
            {"id": "creatine", "name": "Креатин", "tnved": "2106905800"},
            {"id": "pre_workout", "name": "Предтренировочные комплексы", "tnved": "2106909300"},
            {"id": "sports_bars", "name": "Спортивные батончики", "tnved": "1704905500"},
            {"id": "isotonic", "name": "Изотоники", "tnved": "2202991800"},
        ]
    },
    {
        "id": "radioelectronics",
        "name": "Радиоэлектронная продукция",
        "status": "mandatory",  # с 28.11.2025
        "subcategories": [
            {"id": "smartphone", "name": "Смартфоны", "tnved": "8517130000"},
            {"id": "laptop", "name": "Ноутбуки", "tnved": "8471300000"},
            {"id": "tablet", "name": "Планшеты", "tnved": "8471410000"},
            {"id": "tv", "name": "Телевизоры", "tnved": "8528720000"},
            {"id": "monitor", "name": "Мониторы", "tnved": "8528520000"},
            {"id": "router", "name": "Роутеры", "tnved": "8517620000"},
            {"id": "printer", "name": "Принтеры", "tnved": "8443321000"},
            {"id": "keyboard", "name": "Клавиатуры", "tnved": "8471608000"},
            {"id": "mouse", "name": "Компьютерные мыши", "tnved": "8471609000"},
            {"id": "headphones", "name": "Наушники", "tnved": "8518300001"},
            {"id": "speakers", "name": "Колонки", "tnved": "8518220000"},
        ]
    },
    # =============== ЭКСПЕРИМЕНТЫ ===============
    {
        "id": "fiber_optic",
        "name": "Оптоволокно",
        "status": "experiment",
        "subcategories": [
            {"id": "fiber_cable", "name": "Кабели оптоволоконные", "tnved": "8544700000"},
            {"id": "fiber_optic", "name": "Волокна оптические", "tnved": "9001109001"},
        ]
    },
    {
        "id": "instant_drinks",
        "name": "Напитки растворимые",
        "status": "experiment",
        "subcategories": [
            {"id": "coffee_beans", "name": "Кофе в зёрнах", "tnved": "0901110001"},
            {"id": "coffee_ground", "name": "Кофе молотый", "tnved": "0901210001"},
            {"id": "coffee_instant", "name": "Кофе растворимый", "tnved": "2101110011"},
            {"id": "tea_green", "name": "Чай зелёный", "tnved": "0902100001"},
            {"id": "tea_black", "name": "Чай чёрный", "tnved": "0902300001"},
            {"id": "mate", "name": "Мате", "tnved": "0903000000"},
            {"id": "cocoa_powder", "name": "Какао-порошок", "tnved": "1805000000"},
        ]
    },
]

# Build lookup dictionary for quick access
PRODUCTS_LOOKUP = {}
for category in CATEGORIES_DATA:
    for sub in category["subcategories"]:
        PRODUCTS_LOOKUP[sub["id"]] = {
            "category_id": category["id"],
            "category_name": category["name"],
            "category_status": category["status"],
            "name": sub["name"],
            "tnved": sub["tnved"]
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
    # 5. Заведение карточек товаров (GTIN) - разные тарифы
    {
        "id": "gtin_1_5",
        "name": "Заведение карточек товаров (GTIN) 1-5 шт",
        "description": "Создание карточек товаров с присвоением GTIN (от 1 до 5 штук)",
        "price": 1620,
        "unit": "шт",
        "category": "gtin",
        "tier": "1-5",
        "order": 5
    },
    {
        "id": "gtin_6_50",
        "name": "Заведение карточек товаров (GTIN) 6-50 шт",
        "description": "Создание карточек товаров с присвоением GTIN (от 6 до 50 штук)",
        "price": 810,
        "unit": "шт",
        "category": "gtin",
        "tier": "6-50",
        "order": 5
    },
    {
        "id": "gtin_51_500",
        "name": "Заведение карточек товаров (GTIN) 51-500 шт",
        "description": "Создание карточек товаров с присвоением GTIN (от 51 до 500 штук)",
        "price": 540,
        "unit": "шт",
        "category": "gtin",
        "tier": "51-500",
        "order": 5
    },
    {
        "id": "gtin_501_2000",
        "name": "Заведение карточек товаров (GTIN) 501-2000 шт",
        "description": "Создание карточек товаров с присвоением GTIN (от 501 до 2000 штук)",
        "price": 432,
        "unit": "шт",
        "category": "gtin",
        "tier": "501-2000",
        "order": 5
    },
    {
        "id": "gtin_2000_plus",
        "name": "Заведение карточек товаров (GTIN) от 2000 шт",
        "description": "Создание карточек товаров с присвоением GTIN (от 2000 штук)",
        "price": 270,
        "unit": "шт",
        "category": "gtin",
        "tier": "2000+",
        "order": 5
    },
    # 6. Выгрузка кодов маркировки - разные тарифы
    {
        "id": "codes_1_500",
        "name": "Выгрузка кодов маркировки 1-500 шт",
        "description": "Выгрузка кодов маркировки из системы ЧЗ (от 1 до 500 штук)",
        "price": 1.62,
        "unit": "шт",
        "category": "codes",
        "tier": "1-500",
        "order": 6
    },
    {
        "id": "codes_501_5000",
        "name": "Выгрузка кодов маркировки 501-5000 шт",
        "description": "Выгрузка кодов маркировки из системы ЧЗ (от 501 до 5000 штук)",
        "price": 1.22,
        "unit": "шт",
        "category": "codes",
        "tier": "501-5000",
        "order": 6
    },
    {
        "id": "codes_5001_50000",
        "name": "Выгрузка кодов маркировки 5001-50000 шт",
        "description": "Выгрузка кодов маркировки из системы ЧЗ (от 5001 до 50000 штук)",
        "price": 1.08,
        "unit": "шт",
        "category": "codes",
        "tier": "5001-50000",
        "order": 6
    },
    {
        "id": "codes_50000_plus",
        "name": "Выгрузка кодов маркировки от 50000 шт",
        "description": "Выгрузка кодов маркировки из системы ЧЗ (от 50000 штук)",
        "price": 0.68,
        "unit": "шт",
        "category": "codes",
        "tier": "50000+",
        "order": 6
    },
    # 7. Ввод в оборот - разные тарифы
    {
        "id": "turnover_1_500",
        "name": "Ввод в оборот 1-500 шт",
        "description": "Ввод товаров в оборот через систему ЧЗ (от 1 до 500 штук)",
        "price": 1.35,
        "unit": "шт",
        "category": "turnover",
        "tier": "1-500",
        "order": 7
    },
    {
        "id": "turnover_501_5000",
        "name": "Ввод в оборот 501-5000 шт",
        "description": "Ввод товаров в оборот через систему ЧЗ (от 501 до 5000 штук)",
        "price": 1.08,
        "unit": "шт",
        "category": "turnover",
        "tier": "501-5000",
        "order": 7
    },
    {
        "id": "turnover_5001_50000",
        "name": "Ввод в оборот 5001-50000 шт",
        "description": "Ввод товаров в оборот через систему ЧЗ (от 5001 до 50000 штук)",
        "price": 0.81,
        "unit": "шт",
        "category": "turnover",
        "tier": "5001-50000",
        "order": 7
    },
    {
        "id": "turnover_50000_plus",
        "name": "Ввод в оборот от 50000 шт",
        "description": "Ввод товаров в оборот через систему ЧЗ (от 50000 штук)",
        "price": 0.68,
        "unit": "шт",
        "category": "turnover",
        "tier": "50000+",
        "order": 7
    },
    # 8. Подготовка УПД - разные тарифы
    {
        "id": "upd_1_10",
        "name": "Подготовка УПД 1-10 шт",
        "description": "Подготовка универсальных передаточных документов (от 1 до 10 штук)",
        "price": 405,
        "unit": "шт",
        "category": "upd",
        "tier": "1-10",
        "order": 8
    },
    {
        "id": "upd_11_30",
        "name": "Подготовка УПД 11-30 шт",
        "description": "Подготовка универсальных передаточных документов (от 11 до 30 штук)",
        "price": 203,
        "unit": "шт",
        "category": "upd",
        "tier": "11-30",
        "order": 8
    },
    {
        "id": "upd_31_100",
        "name": "Подготовка УПД 31-100 шт",
        "description": "Подготовка универсальных передаточных документов (от 31 до 100 штук)",
        "price": 135,
        "unit": "шт",
        "category": "upd",
        "tier": "31-100",
        "order": 8
    },
    {
        "id": "upd_100_plus",
        "name": "Подготовка УПД от 100 шт",
        "description": "Подготовка универсальных передаточных документов (от 100 штук)",
        "price": 68,
        "unit": "шт",
        "category": "upd",
        "tier": "100+",
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
    # 11. Создание КИЗов (КМ) - разные тарифы
    {
        "id": "kiz_1_500",
        "name": "Создание КИЗов (КМ) 1-500 шт",
        "description": "Создание контрольных идентификационных знаков (от 1 до 500 штук)",
        "price": 2.03,
        "unit": "шт",
        "category": "kiz",
        "tier": "1-500",
        "order": 11
    },
    {
        "id": "kiz_501_5000",
        "name": "Создание КИЗов (КМ) 501-5000 шт",
        "description": "Создание контрольных идентификационных знаков (от 501 до 5000 штук)",
        "price": 1.62,
        "unit": "шт",
        "category": "kiz",
        "tier": "501-5000",
        "order": 11
    },
    {
        "id": "kiz_5001_50000",
        "name": "Создание КИЗов (КМ) 5001-50000 шт",
        "description": "Создание контрольных идентификационных знаков (от 5001 до 50000 штук)",
        "price": 1.35,
        "unit": "шт",
        "category": "kiz",
        "tier": "5001-50000",
        "order": 11
    },
    {
        "id": "kiz_50000_plus",
        "name": "Создание КИЗов (КМ) от 50000 шт",
        "description": "Создание контрольных идентификационных знаков (от 50000 штук)",
        "price": 1.08,
        "unit": "шт",
        "category": "kiz",
        "tier": "50000+",
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

SERVICE_CATEGORIES = {
    "setup": {"name": "Подготовка", "icon": "settings", "order": 1},
    "registration": {"name": "Регистрация", "icon": "clipboard-check", "order": 2},
    "gtin": {"name": "Карточки товаров (GTIN)", "icon": "tag", "order": 3},
    "codes": {"name": "Выгрузка кодов", "icon": "qr-code", "order": 4},
    "turnover": {"name": "Ввод в оборот", "icon": "arrow-right-circle", "order": 5},
    "upd": {"name": "Подготовка УПД", "icon": "file-text", "order": 6},
    "edo": {"name": "ЭДО", "icon": "send", "order": 7},
    "equipment": {"name": "Оборудование", "icon": "printer", "order": 8},
    "kiz": {"name": "Создание КИЗов", "icon": "barcode", "order": 9},
    "training": {"name": "Обучение", "icon": "graduation-cap", "order": 10},
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
    return {"status": "ok", "service": "promarkirui", "products_count": len(PRODUCTS_LOOKUP)}

@app.get("/api/check/categories")
async def get_categories():
    """Get all product categories and subcategories"""
    return {"groups": CATEGORIES_DATA}

@app.post("/api/check/assess", response_model=CheckProductResponse)
async def assess_product(request: CheckProductRequest):
    """Assess if product requires marking"""

    # Look up product in database
    product = PRODUCTS_LOOKUP.get(request.subcategory)

    if product:
        is_mandatory = product["category_status"] == "mandatory"
        is_experiment = product["category_status"] == "experiment"

        if is_mandatory:
            return CheckProductResponse(
                requires_marking=True,
                category=request.category,
                subcategory=request.subcategory,
                subcategory_name=product["name"],
                tnved=product["tnved"],
                status="mandatory",
                deadline="Действует",
                steps=MARKING_STEPS,
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

    contact_email = os.getenv('CONTACT_TO_EMAIL', 'info@promarkirui.ru')
    subject = f"Новая заявка: {request.request_type}"
    body = format_contact_email(request)

    # Send email in background
    background_tasks.add_task(send_email, contact_email, subject, body)

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
                d = item.get("data", {})
                name_data = d.get("name", {})
                address_data = d.get("address", {})
                management = d.get("management", {})
                state = d.get("state", {})
                opf = d.get("opf", {})

                suggestion = {
                    "inn": d.get("inn"),
                    "kpp": d.get("kpp"),
                    "ogrn": d.get("ogrn"),
                    "name": item.get("value"),
                    "name_short": name_data.get("short_with_opf"),
                    "name_full": name_data.get("full_with_opf"),
                    "opf": opf.get("short"),
                    "type": d.get("type"),  # LEGAL или INDIVIDUAL
                    "address": address_data.get("unrestricted_value") or address_data.get("value"),
                    "management_name": management.get("name"),
                    "management_post": management.get("post"),
                    "status": state.get("status")  # ACTIVE, LIQUIDATED, etc.
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

    # Также отправляем уведомление менеджеру
    manager_email = os.getenv('CONTACT_TO_EMAIL', 'info@promarkirui.ru')
    manager_body = format_quote_notification(quote_data)
    background_tasks.add_task(
        send_email,
        manager_email,
        f"Новая заявка на КП: {quote_id}",
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

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
