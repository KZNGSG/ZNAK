# -*- coding: utf-8 -*-
"""
Генератор документов: Договор, КП, Счёт
ИП Турбин Артём Анатольевич - promarkirui.ru
"""

import os
import io
from datetime import datetime
from typing import Dict, List, Optional
from num2words import num2words
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm, cm
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT, TA_JUSTIFY
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    Image, PageBreak, KeepTogether
)
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

# ======================== РЕГИСТРАЦИЯ ШРИФТОВ ДЛЯ КИРИЛЛИЦЫ ========================

# Пути к шрифтам DejaVuSans (поддерживают кириллицу)
FONT_PATHS = [
    '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',
    '/usr/share/fonts/dejavu/DejaVuSans.ttf',
    '/usr/share/fonts/TTF/DejaVuSans.ttf',
]
FONT_BOLD_PATHS = [
    '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',
    '/usr/share/fonts/dejavu/DejaVuSans-Bold.ttf',
    '/usr/share/fonts/TTF/DejaVuSans-Bold.ttf',
]

# Регистрируем шрифты
def register_fonts():
    """Регистрирует шрифты для поддержки кириллицы"""
    from reportlab.pdfbase.pdfmetrics import registerFontFamily

    font_registered = False
    bold_registered = False

    # Регистрируем обычный шрифт
    for path in FONT_PATHS:
        if os.path.exists(path):
            try:
                pdfmetrics.registerFont(TTFont('DejaVuSans', path))
                font_registered = True
                break
            except:
                continue

    # Регистрируем жирный шрифт
    for path in FONT_BOLD_PATHS:
        if os.path.exists(path):
            try:
                pdfmetrics.registerFont(TTFont('DejaVuSans-Bold', path))
                bold_registered = True
                break
            except:
                continue

    # Если не нашли DejaVuSans, используем стандартные шрифты
    if not font_registered:
        print("Warning: DejaVuSans font not found, using Helvetica (may have issues with Cyrillic)")
        return 'Helvetica', 'Helvetica-Bold'

    # Регистрируем семейство шрифтов для работы <b> тегов
    if font_registered and bold_registered:
        registerFontFamily(
            'DejaVuSans',
            normal='DejaVuSans',
            bold='DejaVuSans-Bold',
            italic='DejaVuSans',
            boldItalic='DejaVuSans-Bold'
        )

    return 'DejaVuSans', 'DejaVuSans-Bold'

# Регистрируем шрифты при импорте модуля
FONT_NORMAL, FONT_BOLD = register_fonts()

# ======================== РЕКВИЗИТЫ ИСПОЛНИТЕЛЯ ========================

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

# Пути к файлам
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
ASSETS_DIR = os.path.join(BASE_DIR, "assets")
LOGO_PATH = os.path.join(ASSETS_DIR, "logo.png")
SIGNATURE_PATH = os.path.join(ASSETS_DIR, "signature.png")
STAMP_PATH = os.path.join(ASSETS_DIR, "stamp.png")

# Создаём папку assets если её нет
os.makedirs(ASSETS_DIR, exist_ok=True)


# ======================== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ========================

def amount_to_words(amount: float) -> str:
    """Преобразует сумму в прописную форму на русском"""
    rubles = int(amount)
    kopecks = int(round((amount - rubles) * 100))

    rubles_word = num2words(rubles, lang='ru', to='cardinal')

    # Определяем склонение рублей
    last_digit = rubles % 10
    last_two = rubles % 100

    if last_two in [11, 12, 13, 14]:
        ruble_form = "рублей"
    elif last_digit == 1:
        ruble_form = "рубль"
    elif last_digit in [2, 3, 4]:
        ruble_form = "рубля"
    else:
        ruble_form = "рублей"

    # Определяем склонение копеек
    kop_last = kopecks % 10
    kop_last_two = kopecks % 100

    if kop_last_two in [11, 12, 13, 14]:
        kop_form = "копеек"
    elif kop_last == 1:
        kop_form = "копейка"
    elif kop_last in [2, 3, 4]:
        kop_form = "копейки"
    else:
        kop_form = "копеек"

    # Форматируем результат
    result = f"{rubles_word.capitalize()} {ruble_form} {kopecks:02d} {kop_form}"
    return result


def generate_contract_number(date: datetime = None) -> str:
    """Генерирует номер договора в формате ДОГ-ДДММГГ-XXX"""
    if date is None:
        date = datetime.now()

    date_part = date.strftime("%d%m%y")

    # В реальной системе здесь должен быть счётчик из БД
    # Пока используем простой счётчик на основе времени
    seq_number = 1  # TODO: Получать из БД

    return f"ДОГ-{date_part}-{seq_number:03d}"


def generate_invoice_number(date: datetime = None) -> str:
    """Генерирует номер счёта в формате СЧ-ДДММГГ-XXX"""
    if date is None:
        date = datetime.now()

    date_part = date.strftime("%d%m%y")
    seq_number = 1  # TODO: Получать из БД

    return f"СЧ-{date_part}-{seq_number:03d}"


def format_date_russian(date: datetime) -> str:
    """Форматирует дату на русском: 08 декабря 2024 г."""
    months = [
        "", "января", "февраля", "марта", "апреля", "мая", "июня",
        "июля", "августа", "сентября", "октября", "ноября", "декабря"
    ]
    return f"{date.day:02d} {months[date.month]} {date.year} г."


def format_price(price: float) -> str:
    """Форматирует цену для отображения"""
    if price == int(price):
        return f"{int(price):,}".replace(",", " ")
    return f"{price:,.2f}".replace(",", " ").replace(".", ",")


# ======================== СТИЛИ PDF ========================

def get_styles():
    """Возвращает стили для PDF документов"""
    styles = getSampleStyleSheet()

    # Основной текст
    styles.add(ParagraphStyle(
        name='Normal_RU',
        fontName=FONT_NORMAL,
        fontSize=10,
        leading=14,
        alignment=TA_JUSTIFY,
    ))

    # Заголовок документа
    styles.add(ParagraphStyle(
        name='DocTitle',
        fontName=FONT_BOLD,
        fontSize=14,
        leading=18,
        alignment=TA_CENTER,
        spaceAfter=6,
    ))

    # Подзаголовок
    styles.add(ParagraphStyle(
        name='DocSubtitle',
        fontName=FONT_NORMAL,
        fontSize=10,
        leading=14,
        alignment=TA_CENTER,
        spaceAfter=12,
    ))

    # Заголовок раздела
    styles.add(ParagraphStyle(
        name='SectionTitle',
        fontName=FONT_BOLD,
        fontSize=11,
        leading=14,
        alignment=TA_CENTER,
        spaceBefore=12,
        spaceAfter=6,
    ))

    # Текст договора
    styles.add(ParagraphStyle(
        name='ContractText',
        fontName=FONT_NORMAL,
        fontSize=9,
        leading=12,
        alignment=TA_JUSTIFY,
        firstLineIndent=1*cm,
    ))

    # Мелкий текст
    styles.add(ParagraphStyle(
        name='Small',
        fontName=FONT_NORMAL,
        fontSize=8,
        leading=10,
    ))

    # Реквизиты
    styles.add(ParagraphStyle(
        name='Requisites',
        fontName=FONT_NORMAL,
        fontSize=8,
        leading=10,
        alignment=TA_LEFT,
    ))

    return styles


# ======================== ГЕНЕРАЦИЯ ДОГОВОРА ========================

def generate_contract_pdf(
    client_info: Dict,
    services: List[Dict],
    total_amount: float,
    contract_number: str = None,
    contract_date: datetime = None
) -> bytes:
    """
    Генерирует PDF договора.

    Args:
        client_info: Данные заказчика (name, inn, kpp, address, manager_name, manager_post, basis)
        services: Список услуг [{name, quantity, unit, price, subtotal}, ...]
        total_amount: Итоговая сумма
        contract_number: Номер договора (если None - генерируется автоматически)
        contract_date: Дата договора (если None - текущая дата)

    Returns:
        bytes: PDF документ
    """

    if contract_date is None:
        contract_date = datetime.now()

    if contract_number is None:
        contract_number = generate_contract_number(contract_date)

    # Создаём буфер для PDF
    buffer = io.BytesIO()

    # Создаём документ
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        rightMargin=1.5*cm,
        leftMargin=1.5*cm,
        topMargin=1*cm,
        bottomMargin=1*cm,
    )

    styles = get_styles()
    story = []

    # === ШАПКА ===
    # Логотип (если есть)
    if os.path.exists(LOGO_PATH):
        logo = Image(LOGO_PATH, width=4*cm, height=1*cm)
        story.append(logo)
        story.append(Spacer(1, 0.3*cm))

    # Заголовок
    story.append(Paragraph(
        f"<b>ДОГОВОР № {contract_number}</b>",
        styles['DocTitle']
    ))

    story.append(Paragraph(
        "на оказание услуг по работе с системой маркировки «Честный ЗНАК»",
        styles['DocSubtitle']
    ))

    # Город и дата (таблица для выравнивания)
    date_str = format_date_russian(contract_date)
    city_date_table = Table(
        [[Paragraph(EXECUTOR_INFO['city'], styles['Normal_RU']),
          Paragraph(date_str, styles['Normal_RU'])]],
        colWidths=[9*cm, 9*cm]
    )
    city_date_table.setStyle(TableStyle([
        ('ALIGN', (0, 0), (0, 0), 'LEFT'),
        ('ALIGN', (1, 0), (1, 0), 'RIGHT'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ]))
    story.append(city_date_table)
    story.append(Spacer(1, 0.5*cm))

    # === ПРЕАМБУЛА ===
    client_name = client_info.get('name') or 'Наименование организации'
    client_inn = client_info.get('inn') or ''
    client_kpp = client_info.get('kpp') or ''
    client_manager_name = client_info.get('management_name') or 'ФИО руководителя'
    client_manager_post = client_info.get('management_post') or 'Генеральный директор'
    client_basis = client_info.get('basis') or 'Устава'

    preamble = f"""
    <b>Индивидуальный предприниматель Турбин Артём Анатольевич</b>, именуемый в дальнейшем
    «Исполнитель», действующий на основании свидетельства о государственной регистрации
    ОГРНИП {EXECUTOR_INFO['ogrnip']}, с одной стороны, и
    <br/><br/>
    <b>{client_name}</b>, ИНН {client_inn}{f', КПП {client_kpp}' if client_kpp else ''},
    в лице {client_manager_post} {client_manager_name}, действующего на основании {client_basis},
    именуемый в дальнейшем «Заказчик», с другой стороны, совместно именуемые «Стороны»,
    заключили настоящий Договор о нижеследующем:
    """
    story.append(Paragraph(preamble, styles['ContractText']))
    story.append(Spacer(1, 0.3*cm))

    # === РАЗДЕЛ 1. ПРЕДМЕТ ДОГОВОРА ===
    story.append(Paragraph("1. ПРЕДМЕТ ДОГОВОРА", styles['SectionTitle']))

    section1_text = """
    1.1. Исполнитель обязуется оказать Заказчику услуги по работе с государственной
    информационной системой мониторинга за оборотом товаров, подлежащих обязательной
    маркировке средствами идентификации (ГИС МТ «Честный ЗНАК»), а Заказчик обязуется
    принять и оплатить оказанные услуги в порядке и на условиях, предусмотренных
    настоящим Договором.
    <br/><br/>
    1.2. Перечень, объём и стоимость услуг определяются в Приложении № 1 к настоящему
    Договору (Спецификация услуг), которое является неотъемлемой частью Договора.
    <br/><br/>
    1.3. Услуги оказываются дистанционно посредством удалённого доступа к информационным
    системам Заказчика либо путём предоставления Заказчику результатов работ в электронном виде.
    """
    story.append(Paragraph(section1_text, styles['ContractText']))

    # === РАЗДЕЛ 2. СТОИМОСТЬ И ПОРЯДОК ОПЛАТЫ ===
    story.append(Paragraph("2. СТОИМОСТЬ УСЛУГ И ПОРЯДОК ОПЛАТЫ", styles['SectionTitle']))

    amount_words = amount_to_words(total_amount)
    section2_text = f"""
    2.1. Стоимость услуг по настоящему Договору составляет: <b>{format_price(total_amount)}
    ({amount_words})</b> рублей. НДС не облагается в связи с применением Исполнителем
    упрощённой системы налогообложения.
    <br/><br/>
    2.2. Оплата услуг производится Заказчиком на условиях 100% (стопроцентной) предоплаты
    в течение 3 (трёх) календарных дней с момента выставления счёта.
    <br/><br/>
    2.3. Оплата производится одним из следующих способов:
    <br/>— безналичным переводом на расчётный счёт Исполнителя по реквизитам, указанным
    в разделе 9 настоящего Договора;
    <br/>— банковской картой через платёжный сервис Исполнителя.
    <br/><br/>
    2.4. Обязательства Заказчика по оплате считаются исполненными с момента поступления
    денежных средств на расчётный счёт Исполнителя.
    """
    story.append(Paragraph(section2_text, styles['ContractText']))

    # === РАЗДЕЛ 3. СРОКИ ОКАЗАНИЯ УСЛУГ ===
    story.append(Paragraph("3. СРОКИ ОКАЗАНИЯ УСЛУГ", styles['SectionTitle']))

    section3_text = """
    3.1. Исполнитель приступает к оказанию услуг в течение 2 (двух) рабочих дней с момента
    поступления оплаты и предоставления Заказчиком необходимых данных и доступов.
    <br/><br/>
    3.2. Срок оказания услуг составляет 10 (десять) рабочих дней с момента предоставления
    Заказчиком всех необходимых данных и доступов для соответствующего этапа работ.
    <br/><br/>
    3.3. Срок оказания услуг приостанавливается на период ожидания от Заказчика необходимых
    данных, документов или доступов.
    <br/><br/>
    3.4. Если Заказчик не предоставляет запрошенные данные или доступы в течение 30 (тридцати)
    календарных дней с момента запроса Исполнителя, услуги считаются оказанными в полном объёме.
    """
    story.append(Paragraph(section3_text, styles['ContractText']))

    # === РАЗДЕЛ 4-8 (сокращённо) ===
    story.append(Paragraph("4. ОБЯЗАННОСТИ СТОРОН", styles['SectionTitle']))
    section4_text = """
    4.1. Исполнитель обязуется оказать услуги качественно и в установленные сроки,
    информировать Заказчика о ходе выполнения работ, обеспечить конфиденциальность информации.
    <br/><br/>
    4.2. Заказчик обязуется своевременно предоставить все необходимые данные и доступы,
    оплатить услуги в установленные сроки, принять оказанные услуги.
    """
    story.append(Paragraph(section4_text, styles['ContractText']))

    story.append(Paragraph("5. ПОРЯДОК СДАЧИ-ПРИЁМКИ УСЛУГ", styles['SectionTitle']))
    section5_text = """
    5.1. По завершении оказания услуг Исполнитель направляет Заказчику Акт выполненных работ.
    <br/><br/>
    5.2. Заказчик в течение 3 (трёх) рабочих дней подписывает Акт либо направляет мотивированный отказ.
    <br/><br/>
    5.3. При отсутствии ответа в указанный срок услуги считаются принятыми в полном объёме.
    """
    story.append(Paragraph(section5_text, styles['ContractText']))

    story.append(Paragraph("6. ОТВЕТСТВЕННОСТЬ СТОРОН", styles['SectionTitle']))
    section6_text = """
    6.1. Стороны несут ответственность в соответствии с законодательством РФ.
    <br/><br/>
    6.2. Ответственность Исполнителя ограничена суммой полученной оплаты за услуги.
    """
    story.append(Paragraph(section6_text, styles['ContractText']))

    story.append(Paragraph("7. КОНФИДЕНЦИАЛЬНОСТЬ", styles['SectionTitle']))
    section7_text = """
    7.1. Стороны обязуются не разглашать конфиденциальную информацию, полученную в рамках Договора.
    """
    story.append(Paragraph(section7_text, styles['ContractText']))

    story.append(Paragraph("8. ЗАКЛЮЧИТЕЛЬНЫЕ ПОЛОЖЕНИЯ", styles['SectionTitle']))
    section8_text = """
    8.1. Договор вступает в силу с момента подписания и действует до исполнения обязательств.
    <br/><br/>
    8.2. Споры разрешаются путём переговоров, при недостижении согласия — в Арбитражном суде
    Алтайского края.
    <br/><br/>
    8.3. Договор составлен в двух экземплярах. Обмен документами допускается посредством ЭДО.
    """
    story.append(Paragraph(section8_text, styles['ContractText']))

    # === РАЗДЕЛ 9. РЕКВИЗИТЫ И ПОДПИСИ ===
    story.append(Spacer(1, 0.5*cm))
    story.append(Paragraph("9. РЕКВИЗИТЫ И ПОДПИСИ СТОРОН", styles['SectionTitle']))
    story.append(Spacer(1, 0.3*cm))

    # Таблица реквизитов
    exec_reqs = f"""<b>ИСПОЛНИТЕЛЬ:</b><br/><br/>
    {EXECUTOR_INFO['name']}<br/>
    ИНН: {EXECUTOR_INFO['inn']}<br/>
    ОГРНИП: {EXECUTOR_INFO['ogrnip']}<br/>
    Адрес: {EXECUTOR_INFO['address']}<br/>
    Р/с: {EXECUTOR_INFO['bank_account']}<br/>
    Банк: {EXECUTOR_INFO['bank_name']}<br/>
    БИК: {EXECUTOR_INFO['bank_bik']}<br/>
    К/с: {EXECUTOR_INFO['bank_corr']}<br/>
    Тел: {EXECUTOR_INFO['phone']}<br/>
    Email: {EXECUTOR_INFO['email']}
    """

    client_reqs = f"""<b>ЗАКАЗЧИК:</b><br/><br/>
    {client_name}<br/>
    ИНН: {client_inn}{f'<br/>КПП: {client_kpp}' if client_kpp else ''}<br/>
    Адрес: {client_info.get('address', '_________________')}
    """

    reqs_table = Table([
        [Paragraph(exec_reqs, styles['Requisites']),
         Paragraph(client_reqs, styles['Requisites'])]
    ], colWidths=[9*cm, 9*cm])

    reqs_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('LEFTPADDING', (0, 0), (-1, -1), 0),
        ('RIGHTPADDING', (0, 0), (-1, -1), 0),
    ]))

    story.append(reqs_table)
    story.append(Spacer(1, 0.5*cm))

    # Блок подписей с картинками
    # Подпись исполнителя
    if os.path.exists(SIGNATURE_PATH):
        story.append(Table([
            [Image(SIGNATURE_PATH, width=4*cm, height=1.5*cm), ""]
        ], colWidths=[9*cm, 9*cm]))

    story.append(Table([
        [Paragraph("_________________ / Турбин А.А. /", styles['Requisites']),
         Paragraph("_________________ / ____________ /", styles['Requisites'])]
    ], colWidths=[9*cm, 9*cm]))

    # Печать исполнителя
    if os.path.exists(STAMP_PATH):
        story.append(Spacer(1, 0.3*cm))
        story.append(Table([
            [Image(STAMP_PATH, width=3*cm, height=3*cm), Paragraph("М.П.", styles['Requisites'])]
        ], colWidths=[9*cm, 9*cm]))
    else:
        story.append(Table([
            [Paragraph("М.П.", styles['Requisites']),
             Paragraph("М.П.", styles['Requisites'])]
        ], colWidths=[9*cm, 9*cm]))

    # === ПРИЛОЖЕНИЕ 1 ===
    story.append(PageBreak())

    story.append(Paragraph(
        f"<b>Приложение № 1</b><br/>к Договору № {contract_number} от {date_str}",
        styles['DocTitle']
    ))
    story.append(Paragraph("<b>СПЕЦИФИКАЦИЯ УСЛУГ</b>", styles['DocSubtitle']))
    story.append(Spacer(1, 0.5*cm))

    # Таблица услуг
    table_data = [["№", "Наименование услуги", "Кол-во", "Ед.", "Цена, ₽", "Сумма, ₽"]]

    for idx, service in enumerate(services, 1):
        price = service.get('price', 0)
        quantity = service.get('quantity', 1)
        subtotal = service.get('subtotal', price * quantity)
        table_data.append([
            str(idx),
            service.get('name', ''),
            str(quantity),
            service.get('unit', 'шт'),
            format_price(price),
            format_price(subtotal),
        ])

    # Итого
    table_data.append(["", "", "", "", "ИТОГО:", format_price(total_amount)])

    services_table = Table(table_data, colWidths=[1*cm, 8*cm, 1.5*cm, 1.5*cm, 2.5*cm, 2.5*cm])
    services_table.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (-1, -1), FONT_NORMAL),
        ('BACKGROUND', (0, 0), (-1, 0), colors.Color(0.9, 0.9, 0.9)),
        ('FONTNAME', (0, 0), (-1, 0), FONT_BOLD),
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('ALIGN', (0, 0), (-1, 0), 'CENTER'),
        ('ALIGN', (2, 1), (-1, -1), 'CENTER'),
        ('ALIGN', (4, 1), (5, -1), 'RIGHT'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('GRID', (0, 0), (-1, -2), 0.5, colors.black),
        ('FONTNAME', (4, -1), (5, -1), FONT_BOLD),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
    ]))

    story.append(services_table)
    story.append(Spacer(1, 0.5*cm))

    story.append(Paragraph(
        f"Итого по спецификации: <b>{format_price(total_amount)} ({amount_words})</b> рублей.",
        styles['Normal_RU']
    ))
    story.append(Paragraph("НДС не облагается.", styles['Normal_RU']))

    # Подписи под спецификацией
    story.append(Spacer(1, 1*cm))
    story.append(Table([
        [Paragraph("<b>Исполнитель:</b>", styles['Requisites']),
         Paragraph("<b>Заказчик:</b>", styles['Requisites'])]
    ], colWidths=[9*cm, 9*cm]))

    # Подпись исполнителя в приложении
    if os.path.exists(SIGNATURE_PATH):
        story.append(Table([
            [Image(SIGNATURE_PATH, width=4*cm, height=1.5*cm), ""]
        ], colWidths=[9*cm, 9*cm]))

    story.append(Table([
        [Paragraph("_________________ / Турбин А.А. /", styles['Requisites']),
         Paragraph("_________________ / ____________ /", styles['Requisites'])]
    ], colWidths=[9*cm, 9*cm]))

    # Печать в приложении
    if os.path.exists(STAMP_PATH):
        story.append(Spacer(1, 0.3*cm))
        story.append(Table([
            [Image(STAMP_PATH, width=3*cm, height=3*cm), Paragraph("М.П.", styles['Requisites'])]
        ], colWidths=[9*cm, 9*cm]))

    # === СЧЁТ НА ОПЛАТУ ===
    story.append(PageBreak())

    # Логотип на счёте
    if os.path.exists(LOGO_PATH):
        logo = Image(LOGO_PATH, width=4*cm, height=1*cm)
        story.append(logo)
        story.append(Spacer(1, 0.3*cm))

    # Номер счёта (берём из номера договора)
    invoice_number = contract_number.replace("ДОГ", "СЧ")

    story.append(Paragraph(
        f"<b>СЧЁТ НА ОПЛАТУ № {invoice_number}</b>",
        styles['DocTitle']
    ))
    story.append(Paragraph(
        f"от {date_str}",
        styles['DocSubtitle']
    ))
    story.append(Spacer(1, 0.5*cm))

    # Блок "Получатель"
    receiver_info = f"""
    <b>Получатель:</b> {EXECUTOR_INFO['name']}<br/>
    <b>ИНН:</b> {EXECUTOR_INFO['inn']}<br/>
    <b>Расчётный счёт:</b> {EXECUTOR_INFO['bank_account']}<br/>
    <b>Банк:</b> {EXECUTOR_INFO['bank_name']}<br/>
    <b>БИК:</b> {EXECUTOR_INFO['bank_bik']}<br/>
    <b>Корр. счёт:</b> {EXECUTOR_INFO['bank_corr']}
    """
    story.append(Paragraph(receiver_info, styles['Normal_RU']))
    story.append(Spacer(1, 0.5*cm))

    # Блок "Плательщик"
    payer_info = f"""
    <b>Плательщик:</b> {client_name}<br/>
    <b>ИНН:</b> {client_inn}{f', КПП: {client_kpp}' if client_kpp else ''}<br/>
    <b>Адрес:</b> {client_info.get('address', '—')}
    """
    story.append(Paragraph(payer_info, styles['Normal_RU']))
    story.append(Spacer(1, 0.5*cm))

    # Основание
    story.append(Paragraph(
        f"<b>Основание:</b> Договор № {contract_number} от {date_str}",
        styles['Normal_RU']
    ))
    story.append(Spacer(1, 0.5*cm))

    # Таблица услуг для счёта
    invoice_table_data = [["№", "Наименование", "Кол-во", "Ед.", "Цена, ₽", "Сумма, ₽"]]

    for idx, service in enumerate(services, 1):
        price = service.get('price', 0)
        quantity = service.get('quantity', 1)
        subtotal = service.get('subtotal', price * quantity)
        invoice_table_data.append([
            str(idx),
            service.get('name', ''),
            str(quantity),
            service.get('unit', 'шт'),
            format_price(price),
            format_price(subtotal),
        ])

    # Итого
    invoice_table_data.append(["", "", "", "", "ИТОГО:", format_price(total_amount)])

    invoice_table = Table(invoice_table_data, colWidths=[1*cm, 8*cm, 1.5*cm, 1.5*cm, 2.5*cm, 2.5*cm])
    invoice_table.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (-1, -1), FONT_NORMAL),
        ('BACKGROUND', (0, 0), (-1, 0), colors.Color(0.2, 0.4, 0.8)),  # Синий
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('FONTNAME', (0, 0), (-1, 0), FONT_BOLD),
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('ALIGN', (0, 0), (-1, 0), 'CENTER'),
        ('ALIGN', (2, 1), (-1, -1), 'CENTER'),
        ('ALIGN', (4, 1), (5, -1), 'RIGHT'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('GRID', (0, 0), (-1, -2), 0.5, colors.black),
        ('FONTNAME', (4, -1), (5, -1), FONT_BOLD),
        ('FONTSIZE', (4, -1), (5, -1), 11),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
    ]))

    story.append(invoice_table)
    story.append(Spacer(1, 0.5*cm))

    # Сумма прописью
    story.append(Paragraph(
        f"<b>Всего к оплате: {format_price(total_amount)} ({amount_words}) рублей.</b>",
        styles['Normal_RU']
    ))
    story.append(Paragraph("НДС не облагается в связи с применением УСН.", styles['Small']))

    story.append(Spacer(1, 1*cm))

    # Подпись на счёте
    story.append(Paragraph("<b>Руководитель:</b>", styles['Normal_RU']))

    if os.path.exists(SIGNATURE_PATH):
        story.append(Table([
            [Image(SIGNATURE_PATH, width=4*cm, height=1.5*cm)]
        ], colWidths=[17*cm]))

    story.append(Paragraph("_________________ / Турбин А.А. /", styles['Normal_RU']))

    # Печать на счёте
    if os.path.exists(STAMP_PATH):
        story.append(Spacer(1, 0.3*cm))
        stamp_table = Table([
            [Image(STAMP_PATH, width=3*cm, height=3*cm)]
        ], colWidths=[17*cm])
        stamp_table.setStyle(TableStyle([
            ('ALIGN', (0, 0), (0, 0), 'LEFT'),
            ('LEFTPADDING', (0, 0), (0, 0), 0),
        ]))
        story.append(stamp_table)

    story.append(Spacer(1, 1*cm))

    # Важная информация
    payment_note = """
    <b>ВНИМАНИЕ!</b> Оплата данного счёта означает согласие с условиями Договора.
    Счёт действителен в течение 5 (пяти) банковских дней.
    """
    story.append(Paragraph(payment_note, styles['Small']))

    # Собираем PDF
    doc.build(story)

    buffer.seek(0)
    return buffer.getvalue()


# ======================== ГЕНЕРАЦИЯ КП (PDF) ========================

def generate_quote_pdf(
    client_info: Dict,
    services: List[Dict],
    total_amount: float,
    quote_id: str,
    contact_info: Dict,
    created_at: datetime = None,
    valid_until: str = None,
) -> bytes:
    """
    Генерирует PDF коммерческого предложения.
    """

    if created_at is None:
        created_at = datetime.now()

    buffer = io.BytesIO()

    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        rightMargin=1.5*cm,
        leftMargin=1.5*cm,
        topMargin=1.5*cm,
        bottomMargin=1.5*cm,
    )

    styles = get_styles()
    story = []

    # === ШАПКА ===
    if os.path.exists(LOGO_PATH):
        logo = Image(LOGO_PATH, width=5*cm, height=1.2*cm)
        story.append(logo)

    story.append(Spacer(1, 0.5*cm))

    # Заголовок
    story.append(Paragraph(
        f"<b>КОММЕРЧЕСКОЕ ПРЕДЛОЖЕНИЕ № {quote_id}</b>",
        styles['DocTitle']
    ))
    story.append(Paragraph(
        f"от {format_date_russian(created_at)}",
        styles['DocSubtitle']
    ))

    story.append(Spacer(1, 0.5*cm))

    # Кому
    client_name = client_info.get('name', '')
    contact_name = contact_info.get('name', '')

    story.append(Paragraph(f"<b>Для:</b> {client_name}", styles['Normal_RU']))
    if contact_name:
        story.append(Paragraph(f"<b>Контактное лицо:</b> {contact_name}", styles['Normal_RU']))

    story.append(Spacer(1, 0.5*cm))

    # Вступление
    intro = """
    Благодарим за интерес к нашим услугам! Предлагаем Вам сотрудничество по работе
    с системой маркировки «Честный ЗНАК». Мы оказываем полный спектр услуг: регистрация
    в ГИС МТ, создание карточек товаров, выгрузка кодов маркировки, ввод в оборот и многое другое.
    """
    story.append(Paragraph(intro, styles['ContractText']))
    story.append(Spacer(1, 0.5*cm))

    # Таблица услуг
    story.append(Paragraph("<b>ПЕРЕЧЕНЬ УСЛУГ:</b>", styles['Normal_RU']))
    story.append(Spacer(1, 0.3*cm))

    table_data = [["№", "Наименование услуги", "Кол-во", "Цена", "Сумма"]]

    for idx, service in enumerate(services, 1):
        price = service.get('price', 0)
        quantity = service.get('quantity', 1)
        subtotal = service.get('subtotal', price * quantity)

        table_data.append([
            str(idx),
            service.get('name', ''),
            f"{quantity} {service.get('unit', 'шт')}",
            format_price(price) + " ₽",
            format_price(subtotal) + " ₽",
        ])

    # Итого
    table_data.append(["", "", "", "ИТОГО:", f"{format_price(total_amount)} ₽"])

    services_table = Table(table_data, colWidths=[1*cm, 9*cm, 2*cm, 2.5*cm, 2.5*cm])
    services_table.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (-1, -1), FONT_NORMAL),
        ('BACKGROUND', (0, 0), (-1, 0), colors.Color(1, 0.85, 0)),  # Жёлтый
        ('FONTNAME', (0, 0), (-1, 0), FONT_BOLD),
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('ALIGN', (0, 0), (-1, 0), 'CENTER'),
        ('ALIGN', (2, 1), (-1, -1), 'CENTER'),
        ('ALIGN', (3, 1), (4, -1), 'RIGHT'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('GRID', (0, 0), (-1, -2), 0.5, colors.black),
        ('FONTNAME', (3, -1), (4, -1), FONT_BOLD),
        ('FONTSIZE', (3, -1), (4, -1), 11),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
    ]))

    story.append(services_table)
    story.append(Spacer(1, 0.5*cm))

    # Итоговая сумма
    amount_words = amount_to_words(total_amount)
    story.append(Paragraph(
        f"<b>Итого: {format_price(total_amount)} рублей</b> ({amount_words})",
        styles['Normal_RU']
    ))
    story.append(Paragraph("НДС не облагается (УСН).", styles['Small']))

    story.append(Spacer(1, 0.5*cm))

    # Условия
    if valid_until:
        story.append(Paragraph(
            f"<b>Срок действия предложения:</b> до {valid_until}",
            styles['Normal_RU']
        ))

    story.append(Spacer(1, 0.5*cm))

    # Преимущества
    advantages = """
    <b>Почему выбирают нас:</b><br/>
    • Опыт работы с маркировкой более 3 лет<br/>
    • Работаем со всеми товарными группами<br/>
    • Удалённое оказание услуг по всей России<br/>
    • Гарантия качества и поддержка 24/7
    """
    story.append(Paragraph(advantages, styles['ContractText']))

    story.append(Spacer(1, 1*cm))

    # Контакты
    story.append(Paragraph("<b>НАШИ КОНТАКТЫ:</b>", styles['Normal_RU']))
    contacts = f"""
    {EXECUTOR_INFO['name']}<br/>
    Телефон: {EXECUTOR_INFO['phone']}<br/>
    Email: {EXECUTOR_INFO['email']}<br/>
    Сайт: {EXECUTOR_INFO['website']}
    """
    story.append(Paragraph(contacts, styles['Normal_RU']))

    story.append(Spacer(1, 1*cm))

    # Подпись
    story.append(Paragraph("С уважением,", styles['Normal_RU']))
    story.append(Paragraph(f"<b>{EXECUTOR_INFO['name_short']}</b>", styles['Normal_RU']))

    story.append(Spacer(1, 0.5*cm))

    # Подпись руководителя (изображение) - используем таблицу для выравнивания влево
    if os.path.exists(SIGNATURE_PATH):
        try:
            sig_table = Table([
                [Image(SIGNATURE_PATH, width=4*cm, height=1.5*cm)]
            ], colWidths=[17*cm])
            sig_table.setStyle(TableStyle([
                ('ALIGN', (0, 0), (0, 0), 'LEFT'),
                ('LEFTPADDING', (0, 0), (0, 0), 0),
            ]))
            story.append(sig_table)
        except:
            pass

    story.append(Paragraph("_________________ / Турбин А.А. /", styles['Normal_RU']))

    # Печать - используем таблицу для выравнивания влево
    if os.path.exists(STAMP_PATH):
        story.append(Spacer(1, 0.3*cm))
        try:
            stamp_table = Table([
                [Image(STAMP_PATH, width=3*cm, height=3*cm)]
            ], colWidths=[17*cm])
            stamp_table.setStyle(TableStyle([
                ('ALIGN', (0, 0), (0, 0), 'LEFT'),
                ('LEFTPADDING', (0, 0), (0, 0), 0),
            ]))
            story.append(stamp_table)
        except:
            pass

    # Собираем PDF
    doc.build(story)

    buffer.seek(0)
    return buffer.getvalue()


# ======================== ГЕНЕРАЦИЯ АКТА ВЫПОЛНЕННЫХ РАБОТ ========================

def generate_act_pdf(
    client_info: Dict,
    services: List[Dict],
    total_amount: float,
    contract_number: str,
    contract_date: datetime,
    act_number: str = None,
    act_date: datetime = None,
) -> bytes:
    """
    Генерирует PDF акта выполненных работ.

    Args:
        client_info: Данные заказчика
        services: Список услуг
        total_amount: Итоговая сумма
        contract_number: Номер договора
        contract_date: Дата договора
        act_number: Номер акта (если None - генерируется из договора)
        act_date: Дата акта (если None - текущая дата)

    Returns:
        bytes: PDF документ
    """

    if act_date is None:
        act_date = datetime.now()

    if act_number is None:
        act_number = contract_number.replace("ДОГ", "АКТ")

    buffer = io.BytesIO()

    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        rightMargin=1.5*cm,
        leftMargin=1.5*cm,
        topMargin=1*cm,
        bottomMargin=1*cm,
    )

    styles = get_styles()
    story = []

    # === ШАПКА ===
    if os.path.exists(LOGO_PATH):
        logo = Image(LOGO_PATH, width=4*cm, height=1*cm)
        story.append(logo)
        story.append(Spacer(1, 0.3*cm))

    # Заголовок
    story.append(Paragraph(
        f"<b>АКТ № {act_number}</b>",
        styles['DocTitle']
    ))
    story.append(Paragraph(
        "сдачи-приёмки оказанных услуг",
        styles['DocSubtitle']
    ))

    # Город и дата
    act_date_str = format_date_russian(act_date)
    contract_date_str = format_date_russian(contract_date)

    city_date_table = Table(
        [[Paragraph(EXECUTOR_INFO['city'], styles['Normal_RU']),
          Paragraph(act_date_str, styles['Normal_RU'])]],
        colWidths=[9*cm, 9*cm]
    )
    city_date_table.setStyle(TableStyle([
        ('ALIGN', (0, 0), (0, 0), 'LEFT'),
        ('ALIGN', (1, 0), (1, 0), 'RIGHT'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ]))
    story.append(city_date_table)
    story.append(Spacer(1, 0.5*cm))

    # Преамбула акта
    client_name = client_info.get('name') or 'Наименование организации'
    client_inn = client_info.get('inn') or ''
    client_manager_name = client_info.get('management_name') or 'ФИО руководителя'
    client_manager_post = client_info.get('management_post') or 'Генеральный директор'

    preamble = f"""
    <b>{EXECUTOR_INFO['name']}</b>, именуемый в дальнейшем «Исполнитель», с одной стороны, и
    <b>{client_name}</b>, ИНН {client_inn}, в лице {client_manager_post} {client_manager_name},
    именуемый в дальнейшем «Заказчик», с другой стороны, составили настоящий Акт о нижеследующем:
    """
    story.append(Paragraph(preamble, styles['ContractText']))
    story.append(Spacer(1, 0.5*cm))

    # Основание
    story.append(Paragraph(
        f"<b>Основание:</b> Договор № {contract_number} от {contract_date_str}",
        styles['Normal_RU']
    ))
    story.append(Spacer(1, 0.5*cm))

    # Текст акта
    act_text = """
    1. Исполнитель оказал, а Заказчик принял следующие услуги:
    """
    story.append(Paragraph(act_text, styles['Normal_RU']))
    story.append(Spacer(1, 0.3*cm))

    # Таблица услуг
    table_data = [["№", "Наименование услуги", "Кол-во", "Ед.", "Цена, ₽", "Сумма, ₽"]]

    for idx, service in enumerate(services, 1):
        price = service.get('price', 0)
        quantity = service.get('quantity', 1)
        subtotal = service.get('subtotal', price * quantity)
        table_data.append([
            str(idx),
            service.get('name', ''),
            str(quantity),
            service.get('unit', 'шт'),
            format_price(price),
            format_price(subtotal),
        ])

    # Итого
    table_data.append(["", "", "", "", "ИТОГО:", format_price(total_amount)])

    services_table = Table(table_data, colWidths=[1*cm, 8*cm, 1.5*cm, 1.5*cm, 2.5*cm, 2.5*cm])
    services_table.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (-1, -1), FONT_NORMAL),
        ('BACKGROUND', (0, 0), (-1, 0), colors.Color(0.2, 0.6, 0.3)),  # Зелёный
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('FONTNAME', (0, 0), (-1, 0), FONT_BOLD),
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('ALIGN', (0, 0), (-1, 0), 'CENTER'),
        ('ALIGN', (2, 1), (-1, -1), 'CENTER'),
        ('ALIGN', (4, 1), (5, -1), 'RIGHT'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('GRID', (0, 0), (-1, -2), 0.5, colors.black),
        ('FONTNAME', (4, -1), (5, -1), FONT_BOLD),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
    ]))

    story.append(services_table)
    story.append(Spacer(1, 0.5*cm))

    # Сумма прописью
    amount_words = amount_to_words(total_amount)
    story.append(Paragraph(
        f"<b>Итого оказано услуг на сумму: {format_price(total_amount)} ({amount_words}) рублей.</b>",
        styles['Normal_RU']
    ))
    story.append(Paragraph("НДС не облагается в связи с применением Исполнителем УСН.", styles['Small']))

    story.append(Spacer(1, 0.5*cm))

    # Заключительные положения акта
    conclusion = """
    2. Вышеперечисленные услуги выполнены полностью и в срок. Заказчик претензий по объёму,
    качеству и срокам оказания услуг не имеет.
    <br/><br/>
    3. Настоящий Акт составлен в двух экземплярах, имеющих одинаковую юридическую силу,
    по одному для каждой из сторон.
    """
    story.append(Paragraph(conclusion, styles['ContractText']))

    story.append(Spacer(1, 1*cm))

    # Подписи сторон
    story.append(Paragraph("ПОДПИСИ СТОРОН:", styles['SectionTitle']))
    story.append(Spacer(1, 0.5*cm))

    # Таблица реквизитов
    exec_reqs = f"""<b>ИСПОЛНИТЕЛЬ:</b><br/><br/>
    {EXECUTOR_INFO['name']}<br/>
    ИНН: {EXECUTOR_INFO['inn']}
    """

    client_reqs = f"""<b>ЗАКАЗЧИК:</b><br/><br/>
    {client_name}<br/>
    ИНН: {client_inn}
    """

    reqs_table = Table([
        [Paragraph(exec_reqs, styles['Requisites']),
         Paragraph(client_reqs, styles['Requisites'])]
    ], colWidths=[9*cm, 9*cm])

    reqs_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('LEFTPADDING', (0, 0), (-1, -1), 0),
        ('RIGHTPADDING', (0, 0), (-1, -1), 0),
    ]))

    story.append(reqs_table)
    story.append(Spacer(1, 0.5*cm))

    # Подписи с изображениями
    if os.path.exists(SIGNATURE_PATH):
        story.append(Table([
            [Image(SIGNATURE_PATH, width=4*cm, height=1.5*cm), ""]
        ], colWidths=[9*cm, 9*cm]))

    story.append(Table([
        [Paragraph("_________________ / Турбин А.А. /", styles['Requisites']),
         Paragraph("_________________ / ____________ /", styles['Requisites'])]
    ], colWidths=[9*cm, 9*cm]))

    # Печать
    if os.path.exists(STAMP_PATH):
        story.append(Spacer(1, 0.3*cm))
        story.append(Table([
            [Image(STAMP_PATH, width=3*cm, height=3*cm), Paragraph("М.П.", styles['Requisites'])]
        ], colWidths=[9*cm, 9*cm]))
    else:
        story.append(Table([
            [Paragraph("М.П.", styles['Requisites']),
             Paragraph("М.П.", styles['Requisites'])]
        ], colWidths=[9*cm, 9*cm]))

    # Собираем PDF
    doc.build(story)

    buffer.seek(0)
    return buffer.getvalue()


# ======================== ТЕСТ ========================

if __name__ == "__main__":
    # Тестовые данные
    test_client = {
        "name": "ООО «Тестовая компания»",
        "inn": "7707083893",
        "kpp": "770701001",
        "address": "г. Москва, ул. Тестовая, д. 1",
        "management_name": "Иванов Иван Иванович",
        "management_post": "Генеральный директор",
        "basis": "Устава",
    }

    test_services = [
        {"name": "Регистрация в Честном ЗНАКе", "quantity": 1, "unit": "услуга", "price": 2430, "subtotal": 2430},
        {"name": "Выгрузка кодов маркировки", "quantity": 2500, "unit": "шт", "price": 1.22, "subtotal": 3050},
        {"name": "Ввод в оборот", "quantity": 2500, "unit": "шт", "price": 1.08, "subtotal": 2700},
    ]

    total = sum(s['subtotal'] for s in test_services)

    # Генерируем договор
    contract_pdf = generate_contract_pdf(test_client, test_services, total)
    with open("test_contract.pdf", "wb") as f:
        f.write(contract_pdf)
    print(f"Договор сохранён: test_contract.pdf ({len(contract_pdf)} bytes)")

    # Генерируем КП
    quote_pdf = generate_quote_pdf(
        test_client,
        test_services,
        total,
        quote_id="КП-20241208-ABC123",
        contact_info={"name": "Иванов И.И."},
        valid_until="22.12.2024"
    )
    with open("test_quote.pdf", "wb") as f:
        f.write(quote_pdf)
    print(f"КП сохранено: test_quote.pdf ({len(quote_pdf)} bytes)")

    # Генерируем Акт
    from datetime import datetime
    act_pdf = generate_act_pdf(
        test_client,
        test_services,
        total,
        contract_number="ДОГ-091224-001",
        contract_date=datetime.now(),
    )
    with open("test_act.pdf", "wb") as f:
        f.write(act_pdf)
    print(f"Акт сохранён: test_act.pdf ({len(act_pdf)} bytes)")
