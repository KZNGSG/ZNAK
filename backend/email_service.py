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
from dotenv import load_dotenv

# Загружаем .env файл
load_dotenv()

# SMTP настройки Beget
# ВАЖНО: Все credentials должны быть в .env файле!
SMTP_HOST = os.getenv('SMTP_HOST', 'smtp.beget.com')
SMTP_PORT = int(os.getenv('SMTP_PORT', '465'))  # 465 для SSL
SMTP_USER = os.getenv('SMTP_USER', '')
SMTP_PASSWORD = os.getenv('SMTP_PASSWORD', '')  # ОБЯЗАТЕЛЬНО установить в .env
SMTP_FROM = os.getenv('SMTP_FROM', '') or SMTP_USER
SMTP_FROM_NAME = os.getenv('SMTP_FROM_NAME', 'Про.Маркируй')
SMTP_USE_TLS = os.getenv('SMTP_USE_TLS', 'false').lower() == 'true'  # false = use SSL

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
    from email.header import Header
    from email.utils import formataddr

    # Проверяем конфигурацию SMTP
    if not SMTP_USER or not SMTP_PASSWORD:
        print(f"[EMAIL ERROR] SMTP not configured! SMTP_USER={bool(SMTP_USER)}, SMTP_PASSWORD={bool(SMTP_PASSWORD)}")
        print("[EMAIL ERROR] Please set SMTP_USER, SMTP_PASSWORD in .env file")
        return False

    try:
        msg = MIMEMultipart('alternative')
        msg['Subject'] = Header(subject, 'utf-8')
        msg['From'] = formataddr((str(Header(SMTP_FROM_NAME, 'utf-8')), SMTP_FROM))
        msg['To'] = to_email

        # Текстовая версия
        if text_body:
            part1 = MIMEText(text_body, 'plain', 'utf-8')
            msg.attach(part1)

        # HTML версия
        part2 = MIMEText(html_body, 'html', 'utf-8')
        msg.attach(part2)

        print(f"[EMAIL] Connecting to SMTP server {SMTP_HOST}:{SMTP_PORT} (SSL={not SMTP_USE_TLS})...")

        # Подключаемся к SMTP серверу - используем тот же подход что и server.py
        if SMTP_USE_TLS:
            # TLS на порту 587 или 2525
            server = smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=30)
            server.starttls()
        else:
            # SSL на порту 465 (по умолчанию для Beget)
            server = smtplib.SMTP_SSL(SMTP_HOST, SMTP_PORT, timeout=30)

        print(f"[EMAIL] Logging in as {SMTP_USER}...")
        server.login(SMTP_USER, SMTP_PASSWORD)
        print(f"[EMAIL] Sending email to {to_email}...")
        server.send_message(msg)
        server.quit()

        print(f"[EMAIL SUCCESS] Email sent successfully to {to_email}")
        return True

    except smtplib.SMTPAuthenticationError as e:
        print(f"[EMAIL ERROR] SMTP Authentication failed for {SMTP_USER}: {e}")
        return False
    except smtplib.SMTPConnectError as e:
        print(f"[EMAIL ERROR] Could not connect to SMTP server {SMTP_HOST}:{SMTP_PORT}: {e}")
        return False
    except smtplib.SMTPException as e:
        print(f"[EMAIL ERROR] SMTP error sending to {to_email}: {e}")
        return False
    except Exception as e:
        print(f"[EMAIL ERROR] Unexpected error sending to {to_email}: {type(e).__name__}: {e}")
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


def send_staff_invitation_email(to_email: str, password: str, role: str = 'employee') -> bool:
    """
    Отправить приглашение сотруднику с данными для входа

    Args:
        to_email: Email сотрудника
        password: Временный пароль
        role: Роль (employee/superadmin)

    Returns:
        True если отправлено успешно
    """
    login_link = f"{SITE_URL}/employee/login"
    role_name = "Супер-администратор" if role == "superadmin" else "Сотрудник"

    subject = "Приглашение в систему Про.Маркируй"

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
                                CRM система управления маркировкой
                            </p>
                        </td>
                    </tr>

                    <!-- Content -->
                    <tr>
                        <td style="padding: 40px 32px;">
                            <h2 style="margin: 0 0 16px 0; color: #1f2937; font-size: 22px;">
                                🎉 Добро пожаловать в команду!
                            </h2>

                            <p style="margin: 0 0 24px 0; color: #6b7280; font-size: 16px; line-height: 1.6;">
                                Вам предоставлен доступ к системе Про.Маркируй в качестве <strong>{role_name}</strong>.
                            </p>

                            <div style="background-color: #f3f4f6; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
                                <p style="margin: 0 0 12px 0; color: #374151; font-size: 14px; font-weight: 600;">
                                    Ваши данные для входа:
                                </p>
                                <table style="width: 100%;">
                                    <tr>
                                        <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Email:</td>
                                        <td style="padding: 8px 0; color: #1f2937; font-size: 14px; font-weight: 500;">{to_email}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Пароль:</td>
                                        <td style="padding: 8px 0; color: #1f2937; font-size: 14px; font-weight: 500; font-family: monospace;">{password}</td>
                                    </tr>
                                </table>
                            </div>

                            <table width="100%" cellpadding="0" cellspacing="0">
                                <tr>
                                    <td align="center" style="padding: 24px 0;">
                                        <a href="{login_link}"
                                           style="display: inline-block; background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%); color: #000000; text-decoration: none; padding: 16px 48px; border-radius: 12px; font-weight: bold; font-size: 16px; box-shadow: 0 4px 14px rgba(251, 191, 36, 0.4);">
                                            Войти в систему
                                        </a>
                                    </td>
                                </tr>
                            </table>

                            <p style="margin: 24px 0 0 0; color: #9ca3af; font-size: 13px;">
                                ⚠️ Рекомендуем сменить пароль после первого входа в систему.
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
Приглашение в систему Про.Маркируй

Добро пожаловать в команду!

Вам предоставлен доступ к системе Про.Маркируй в качестве {role_name}.

Ваши данные для входа:
Email: {to_email}
Пароль: {password}

Для входа в систему перейдите по ссылке:
{login_link}

Рекомендуем сменить пароль после первого входа в систему.

--
С уважением,
Команда Про.Маркируй
{SITE_URL}
"""

    return send_email(to_email, subject, html_body, text_body)
