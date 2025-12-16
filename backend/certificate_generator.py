# -*- coding: utf-8 -*-
"""
Генератор PDF сертификатов для модуля обучения
Использует ReportLab для создания красивых сертификатов
"""

from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib import colors
from reportlab.lib.units import mm, cm
from reportlab.pdfgen import canvas
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib.colors import HexColor
from io import BytesIO
import datetime
import os
import qrcode
from PIL import Image


class CertificateGenerator:
    """Генератор PDF сертификатов"""

    def __init__(self, fonts_dir="fonts"):
        """
        Инициализация генератора
        fonts_dir - папка со шрифтами (нужен .ttf файл для русского языка)
        """
        self.fonts_dir = fonts_dir
        self._register_fonts()

    def _register_fonts(self):
        """Регистрация шрифтов для PDF"""
        # Попробуем найти шрифты
        fonts_to_try = [
            ("DejaVuSans", "DejaVuSans.ttf"),
            ("DejaVuSans-Bold", "DejaVuSans-Bold.ttf"),
            ("Roboto", "Roboto-Regular.ttf"),
            ("Roboto-Bold", "Roboto-Bold.ttf"),
        ]

        for font_name, font_file in fonts_to_try:
            font_path = os.path.join(self.fonts_dir, font_file)
            if os.path.exists(font_path):
                try:
                    pdfmetrics.registerFont(TTFont(font_name, font_path))
                except:
                    pass

        # Также попробуем системные шрифты
        system_fonts = [
            "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
            "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
        ]
        for font_path in system_fonts:
            if os.path.exists(font_path):
                font_name = os.path.basename(font_path).replace(".ttf", "")
                try:
                    pdfmetrics.registerFont(TTFont(font_name, font_path))
                except:
                    pass

    def generate_certificate(
        self,
        partner_name: str,
        company_name: str,
        course_title: str,
        certificate_number: str,
        completed_at: str,
        logo_path: str = None,
        verify_url: str = None
    ) -> bytes:
        """
        Генерирует PDF сертификат

        Returns: bytes - PDF файл в байтах
        """
        buffer = BytesIO()

        # A4 альбомная ориентация
        width, height = landscape(A4)
        c = canvas.Canvas(buffer, pagesize=landscape(A4))

        # Цвета
        primary_color = HexColor("#6366f1")  # Indigo/Purple
        secondary_color = HexColor("#8b5cf6")  # Purple
        gold_color = HexColor("#d97706")  # Amber/Gold
        text_color = HexColor("#1f2937")  # Gray-800
        light_text = HexColor("#6b7280")  # Gray-500

        # Фоновый градиент (рамка)
        self._draw_border(c, width, height, primary_color, secondary_color)

        # Декоративные элементы
        self._draw_decorations(c, width, height, primary_color)

        # Логотип (если есть)
        if logo_path and os.path.exists(logo_path):
            c.drawImage(logo_path, width/2 - 50, height - 100, width=100, height=50, preserveAspectRatio=True)
            y_start = height - 130
        else:
            # Текст "ПРО.МАРКИРУЙ"
            c.setFont("DejaVuSans-Bold" if "DejaVuSans-Bold" in pdfmetrics.getRegisteredFontNames() else "Helvetica-Bold", 24)
            c.setFillColor(primary_color)
            c.drawCentredString(width/2, height - 80, "ПРО.МАРКИРУЙ")
            y_start = height - 110

        # Заголовок "СЕРТИФИКАТ"
        c.setFont("DejaVuSans-Bold" if "DejaVuSans-Bold" in pdfmetrics.getRegisteredFontNames() else "Helvetica-Bold", 48)
        c.setFillColor(text_color)
        c.drawCentredString(width/2, y_start - 30, "СЕРТИФИКАТ")

        # Подзаголовок
        c.setFont("DejaVuSans" if "DejaVuSans" in pdfmetrics.getRegisteredFontNames() else "Helvetica", 16)
        c.setFillColor(light_text)
        c.drawCentredString(width/2, y_start - 55, "о прохождении обучения")

        # Разделительная линия
        c.setStrokeColor(gold_color)
        c.setLineWidth(2)
        c.line(width/2 - 100, y_start - 75, width/2 + 100, y_start - 75)

        # Имя партнёра
        c.setFont("DejaVuSans-Bold" if "DejaVuSans-Bold" in pdfmetrics.getRegisteredFontNames() else "Helvetica-Bold", 28)
        c.setFillColor(text_color)
        c.drawCentredString(width/2, y_start - 120, partner_name)

        # Компания (если есть)
        if company_name:
            c.setFont("DejaVuSans" if "DejaVuSans" in pdfmetrics.getRegisteredFontNames() else "Helvetica", 14)
            c.setFillColor(light_text)
            c.drawCentredString(width/2, y_start - 145, company_name)
            y_offset = 170
        else:
            y_offset = 150

        # Текст "успешно завершил(а) курс"
        c.setFont("DejaVuSans" if "DejaVuSans" in pdfmetrics.getRegisteredFontNames() else "Helvetica", 14)
        c.setFillColor(light_text)
        c.drawCentredString(width/2, y_start - y_offset, "успешно завершил(а) курс")

        # Название курса
        c.setFont("DejaVuSans-Bold" if "DejaVuSans-Bold" in pdfmetrics.getRegisteredFontNames() else "Helvetica-Bold", 20)
        c.setFillColor(primary_color)
        c.drawCentredString(width/2, y_start - y_offset - 30, f"«{course_title}»")

        # Дата и номер сертификата
        try:
            if isinstance(completed_at, str):
                date_obj = datetime.datetime.fromisoformat(completed_at.replace("Z", "+00:00"))
            else:
                date_obj = completed_at
            date_str = date_obj.strftime("%d.%m.%Y")
        except:
            date_str = completed_at

        c.setFont("DejaVuSans" if "DejaVuSans" in pdfmetrics.getRegisteredFontNames() else "Helvetica", 12)
        c.setFillColor(light_text)

        # Левая колонка - дата
        c.drawString(80, 80, f"Дата выдачи: {date_str}")

        # Правая колонка - номер
        c.drawRightString(width - 80, 80, f"Сертификат №{certificate_number}")

        # QR код для верификации (если есть URL)
        if verify_url:
            qr = qrcode.QRCode(version=1, box_size=2, border=1)
            qr.add_data(verify_url)
            qr.make(fit=True)
            qr_img = qr.make_image(fill_color="black", back_color="white")

            qr_buffer = BytesIO()
            qr_img.save(qr_buffer, format='PNG')
            qr_buffer.seek(0)

            c.drawImage(qr_buffer, width - 120, 90, width=40, height=40)
            c.setFont("DejaVuSans" if "DejaVuSans" in pdfmetrics.getRegisteredFontNames() else "Helvetica", 8)
            c.drawCentredString(width - 100, 85, "Проверить")

        c.save()
        buffer.seek(0)
        return buffer.getvalue()

    def _draw_border(self, c, width, height, color1, color2):
        """Рисует декоративную рамку"""
        border_width = 15

        # Внешняя рамка
        c.setStrokeColor(color1)
        c.setLineWidth(3)
        c.rect(20, 20, width - 40, height - 40)

        # Внутренняя рамка
        c.setStrokeColor(color2)
        c.setLineWidth(1)
        c.rect(30, 30, width - 60, height - 60)

        # Угловые декорации
        corner_size = 30
        for x, y in [(30, 30), (30, height - 30), (width - 30, 30), (width - 30, height - 30)]:
            c.setFillColor(color1)
            if x == 30 and y == 30:
                c.line(x, y, x + corner_size, y)
                c.line(x, y, x, y + corner_size)
            elif x == 30 and y == height - 30:
                c.line(x, y, x + corner_size, y)
                c.line(x, y, x, y - corner_size)
            elif x == width - 30 and y == 30:
                c.line(x, y, x - corner_size, y)
                c.line(x, y, x, y + corner_size)
            else:
                c.line(x, y, x - corner_size, y)
                c.line(x, y, x, y - corner_size)

    def _draw_decorations(self, c, width, height, color):
        """Рисует декоративные элементы"""
        c.setStrokeColor(color)
        c.setFillColor(color)
        c.setLineWidth(0.5)

        # Декоративные линии по бокам
        c.line(50, height/2 - 50, 50, height/2 + 50)
        c.line(width - 50, height/2 - 50, width - 50, height/2 + 50)


# API endpoint для скачивания сертификата
# Добавить в education_api.py:

"""
from certificate_generator import CertificateGenerator
from fastapi.responses import Response

@app.get("/api/partner/courses/{course_id}/certificate/download")
async def download_certificate(course_id: int, current_user: dict = Depends(require_partner)):
    '''Скачать PDF сертификат'''
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute('''
            SELECT pcp.*, c.title as course_title, p.contact_name, p.company_name
            FROM partner_course_progress pcp
            JOIN courses c ON c.id = pcp.course_id
            JOIN partners p ON p.id = pcp.partner_id
            WHERE pcp.partner_id = ? AND pcp.course_id = ? AND pcp.status = 'completed'
        ''', (current_user['partner_id'], course_id))

        row = cursor.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Курс не завершён")

        data = dict(row)

        # Генерируем номер если нет
        if not data.get('certificate_number'):
            import datetime
            cert_num = f"CERT-{datetime.datetime.now().strftime('%Y%m%d')}-{current_user['partner_id']}-{course_id}"
            cursor.execute('''
                UPDATE partner_course_progress
                SET certificate_number = ?
                WHERE partner_id = ? AND course_id = ?
            ''', (cert_num, current_user['partner_id'], course_id))
            conn.commit()
            data['certificate_number'] = cert_num

        # Генерируем PDF
        generator = CertificateGenerator()
        pdf_bytes = generator.generate_certificate(
            partner_name=data['contact_name'],
            company_name=data['company_name'],
            course_title=data['course_title'],
            certificate_number=data['certificate_number'],
            completed_at=data['completed_at'],
            verify_url=f"https://promarkirui.ru/verify/{data['certificate_number']}"
        )

        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={
                "Content-Disposition": f"attachment; filename=certificate_{data['certificate_number']}.pdf"
            }
        )
"""


# Пример использования
if __name__ == "__main__":
    generator = CertificateGenerator()

    pdf = generator.generate_certificate(
        partner_name="Иванов Иван Иванович",
        company_name="ООО \"Тестовая Компания\"",
        course_title="Основы работы с маркировкой товаров",
        certificate_number="CERT-20241215-001-001",
        completed_at="2024-12-15T10:30:00Z",
        verify_url="https://promarkirui.ru/verify/CERT-20241215-001-001"
    )

    with open("test_certificate.pdf", "wb") as f:
        f.write(pdf)
    print("Сертификат сохранён: test_certificate.pdf")
