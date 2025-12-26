"""
Общие утилиты для проекта
"""
import smtplib
import logging
import httpx
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.base import MIMEBase
from email import encoders
from email.header import Header
from email.utils import formataddr, formatdate
from typing import List, Optional
import os

from config import (
    SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD, 
    SMTP_FROM, SMTP_USE_TLS, TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID
)

logger = logging.getLogger(__name__)


# ======================== EMAIL FUNCTIONS ========================

async def send_email_beget(to_emails: List[str], subject: str, html_body: str, 
                           attachments: Optional[List] = None, from_name: str = "Про.Маркируй"):
    """Send email via SMTP with Beget configuration"""
    # Beget SMTP - все credentials из .env файла!
    smtp_host = SMTP_HOST
    smtp_port = SMTP_PORT
    smtp_user = SMTP_USER
    smtp_pass = SMTP_PASSWORD
    smtp_from = SMTP_FROM or smtp_user
    smtp_use_tls = SMTP_USE_TLS

    if not smtp_user or not smtp_pass:
        logger.error(f"[EMAIL ERROR] SMTP not configured! Set SMTP_USER and SMTP_PASSWORD in .env")
        return False

    try:
        msg = MIMEMultipart('alternative')
        msg['Subject'] = Header(subject, 'utf-8')
        msg['From'] = formataddr((from_name, smtp_from))
        msg['To'] = ', '.join(to_emails)
        msg['Date'] = formatdate(localtime=True)
        
        html_part = MIMEText(html_body, 'html', 'utf-8')
        msg.attach(html_part)
        
        if attachments:
            for attach in attachments:
                msg.attach(attach)
        
        # Подключение к SMTP
        if smtp_use_tls:
            server = smtplib.SMTP(smtp_host, int(smtp_port))
            server.starttls()
        else:
            server = smtplib.SMTP_SSL(smtp_host, int(smtp_port))
        
        server.login(smtp_user, smtp_pass)
        server.send_message(msg)
        server.quit()
        
        logger.info(f"[EMAIL] Successfully sent to {to_emails}")
        return True
        
    except Exception as e:
        logger.error(f"[EMAIL ERROR] Failed to send email: {str(e)}")
        return False


# ======================== TELEGRAM NOTIFICATIONS ========================

async def send_telegram_notification(message: str):
    """Отправка уведомления в Telegram"""
    if not TELEGRAM_BOT_TOKEN or not TELEGRAM_CHAT_ID:
        logger.warning("[TELEGRAM] Bot token or chat ID not configured")
        return False
    
    try:
        async with httpx.AsyncClient() as client:
            await client.post(
                f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage",
                json={
                    "chat_id": TELEGRAM_CHAT_ID,
                    "text": message,
                    "parse_mode": "HTML"
                },
                timeout=10
            )
        logger.info("[TELEGRAM] Notification sent successfully")
        return True
    except Exception as e:
        logger.error(f"[TELEGRAM ERROR] Failed to send notification: {str(e)}")
        return False
