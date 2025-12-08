# -*- coding: utf-8 -*-
"""
Email сервис для Про.Маркируй
Отправка писем через SMTP Beget
"""

import os
import smtplib
import secrets
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime, timedelta
from typing import Optional

# SMTP настройки Beget (noreply для автоматических писем)
SMTP_HOST = os.getenv('SMTP_HOST', 'smtp.beget.com')
SMTP_PORT = int(os.getenv('SMTP_PORT', '465'))
SMTP_USER = os.getenv('SMTP_USER', 'noreply@promarkirui.ru')
SMTP_PASSWORD = os.getenv('SMTP_PASSWORD', 'wK2jnyo*t7jm')
SMTP_FROM = os.getenv('SMTP_FROM', 'noreply@promarkirui.ru')
SMTP_FROM_NAME = os.getenv('SMTP_FROM_NAME', 'Про.Маркируй')
SMTP_USE_SSL = os.getenv('SMTP_USE_SSL', 'true').lower() == 'true'

# URL сайта для ссылок в письмах
SITE_URL = os.getenv('SITE_URL', 'https://promarkirui.ru')


def generate_verification_token() -> str:
    """Генерация токена верификации"""
    return secrets.token_urlsafe(32)


def send_email(to_email: str, subject: str, html_body: str, text_body: str = None) -> bool:
    """
    Отправить email через SMTP

    Args:
        to_email: Email получателя
        subject: Тема письма
        html_body: HTML содержимое
        text_body: Текстовое содержимое (опционально)

    Returns:
        True если отправлено успешно
    """
    try:
        msg = MIMEMultipart('alternative')
        msg['Subject'] = subject
        msg['From'] = f'{SMTP_FROM_NAME} <{SMTP_FROM}>'
        msg['To'] = to_email

        # Текстовая версия
        if text_body:
            part1 = MIMEText(text_body, 'plain', 'utf-8')
            msg.attach(part1)

        # HTML версия
        part2 = MIMEText(html_body, 'html', 'utf-8')
        msg.attach(part2)

        # Подключаемся к SMTP серверу
        if SMTP_USE_SSL:
            # SSL соединение (порт 465)
            with smtplib.SMTP_SSL(SMTP_HOST, SMTP_PORT) as server:
                server.login(SMTP_USER, SMTP_PASSWORD)
                server.sendmail(SMTP_FROM, to_email, msg.as_string())
        else:
            # TLS соединение (порт 587 или 2525)
            with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
                server.starttls()
                server.login(SMTP_USER, SMTP_PASSWORD)
                server.sendmail(SMTP_FROM, to_email, msg.as_string())

        print(f"Email sent successfully to {to_email}")
        return True

    except Exception as e:
        print(f"Failed to send email to {to_email}: {e}")
        return False


def send_verification_email(to_email: str, token: str) -> bool:
    """
    Отправить письмо для подтверждения email

    Args:
        to_email: Email для подтверждения
        token: Токен верификации

    Returns:
        True если отправлено успешно
    """
    verification_link = f"{SITE_URL}/verify-email?token={token}"

    subject = "Подтверждение регистрации на Про.Маркируй"

    html_body = f"""
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f8fafc;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8fafc; padding: 40px 20px;">
        <tr>
            <td align="center">
                <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: #ffffff; border-radius: 16px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                    <!-- Header -->
                    <tr>
                        <td style="background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%); padding: 32px; border-radius: 16px 16px 0 0; text-align: center;">
                            <h1 style="margin: 0; color: #000000; font-size: 28px; font-weight: bold;">
                                Про.Маркируй
                            </h1>
                            <p style="margin: 8px 0 0 0; color: rgba(0,0,0,0.7); font-size: 14px;">
                                Сервис проверки маркировки товаров
                            </p>
                        </td>
                    </tr>

                    <!-- Content -->
                    <tr>
                        <td style="padding: 40px 32px;">
                            <h2 style="margin: 0 0 16px 0; color: #1f2937; font-size: 22px;">
                                Подтвердите ваш email
                            </h2>

                            <p style="margin: 0 0 24px 0; color: #6b7280; font-size: 16px; line-height: 1.6;">
                                Благодарим за регистрацию на сервисе Про.Маркируй!
                                Для завершения регистрации, пожалуйста, подтвердите ваш email адрес.
                            </p>

                            <table width="100%" cellpadding="0" cellspacing="0">
                                <tr>
                                    <td align="center" style="padding: 24px 0;">
                                        <a href="{verification_link}"
                                           style="display: inline-block; background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%); color: #000000; text-decoration: none; padding: 16px 48px; border-radius: 12px; font-weight: bold; font-size: 16px; box-shadow: 0 4px 14px rgba(251, 191, 36, 0.4);">
                                            Подтвердить email
                                        </a>
                                    </td>
                                </tr>
                            </table>

                            <p style="margin: 24px 0 0 0; color: #9ca3af; font-size: 14px; line-height: 1.6;">
                                Или скопируйте ссылку в браузер:<br>
                                <a href="{verification_link}" style="color: #f59e0b; word-break: break-all;">
                                    {verification_link}
                                </a>
                            </p>

                            <p style="margin: 24px 0 0 0; color: #9ca3af; font-size: 13px;">
                                Ссылка действительна 24 часа. Если вы не регистрировались на нашем сайте, просто проигнорируйте это письмо.
                            </p>
                        </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                        <td style="background-color: #f8fafc; padding: 24px 32px; border-radius: 0 0 16px 16px; text-align: center;">
                            <p style="margin: 0; color: #9ca3af; font-size: 12px;">
                                &copy; {datetime.now().year} Про.Маркируй. Все права защищены.
                            </p>
                            <p style="margin: 8px 0 0 0; color: #9ca3af; font-size: 12px;">
                                <a href="{SITE_URL}" style="color: #f59e0b;">promarkirui.ru</a>
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
"""

    text_body = f"""
Подтверждение регистрации на Про.Маркируй

Благодарим за регистрацию на сервисе Про.Маркируй!

Для завершения регистрации, пожалуйста, перейдите по ссылке:
{verification_link}

Ссылка действительна 24 часа.

Если вы не регистрировались на нашем сайте, просто проигнорируйте это письмо.

--
С уважением,
Команда Про.Маркируй
{SITE_URL}
"""

    return send_email(to_email, subject, html_body, text_body)


def send_password_reset_email(to_email: str, token: str) -> bool:
    """
    Отправить письмо для сброса пароля

    Args:
        to_email: Email пользователя
        token: Токен сброса пароля

    Returns:
        True если отправлено успешно
    """
    reset_link = f"{SITE_URL}/reset-password?token={token}"

    subject = "Сброс пароля на Про.Маркируй"

    html_body = f"""
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f8fafc;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8fafc; padding: 40px 20px;">
        <tr>
            <td align="center">
                <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: #ffffff; border-radius: 16px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                    <!-- Header -->
                    <tr>
                        <td style="background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%); padding: 32px; border-radius: 16px 16px 0 0; text-align: center;">
                            <h1 style="margin: 0; color: #000000; font-size: 28px; font-weight: bold;">
                                Про.Маркируй
                            </h1>
                        </td>
                    </tr>

                    <!-- Content -->
                    <tr>
                        <td style="padding: 40px 32px;">
                            <h2 style="margin: 0 0 16px 0; color: #1f2937; font-size: 22px;">
                                Сброс пароля
                            </h2>

                            <p style="margin: 0 0 24px 0; color: #6b7280; font-size: 16px; line-height: 1.6;">
                                Вы запросили сброс пароля для вашего аккаунта на Про.Маркируй.
                                Нажмите кнопку ниже, чтобы создать новый пароль.
                            </p>

                            <table width="100%" cellpadding="0" cellspacing="0">
                                <tr>
                                    <td align="center" style="padding: 24px 0;">
                                        <a href="{reset_link}"
                                           style="display: inline-block; background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%); color: #000000; text-decoration: none; padding: 16px 48px; border-radius: 12px; font-weight: bold; font-size: 16px;">
                                            Сбросить пароль
                                        </a>
                                    </td>
                                </tr>
                            </table>

                            <p style="margin: 24px 0 0 0; color: #9ca3af; font-size: 13px;">
                                Ссылка действительна 1 час. Если вы не запрашивали сброс пароля, просто проигнорируйте это письмо.
                            </p>
                        </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                        <td style="background-color: #f8fafc; padding: 24px 32px; border-radius: 0 0 16px 16px; text-align: center;">
                            <p style="margin: 0; color: #9ca3af; font-size: 12px;">
                                &copy; {datetime.now().year} Про.Маркируй
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
"""

    text_body = f"""
Сброс пароля на Про.Маркируй

Вы запросили сброс пароля для вашего аккаунта.

Для создания нового пароля перейдите по ссылке:
{reset_link}

Ссылка действительна 1 час.

Если вы не запрашивали сброс пароля, просто проигнорируйте это письмо.

--
С уважением,
Команда Про.Маркируй
"""

    return send_email(to_email, subject, html_body, text_body)
