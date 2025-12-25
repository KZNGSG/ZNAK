# -*- coding: utf-8 -*-
import sqlite3
import asyncio
from telegram import Bot, InlineKeyboardButton, InlineKeyboardMarkup
import os
from dotenv import load_dotenv

load_dotenv()

async def send_broadcast():
    token = os.getenv('TELEGRAM_BOT_TOKEN')
    bot = Bot(token)

    # Получаем всех пользователей
    conn = sqlite3.connect('data/promarkirui.db')
    cursor = conn.cursor()
    cursor.execute('SELECT telegram_id, first_name FROM telegram_leads WHERE telegram_id IS NOT NULL')
    users = cursor.fetchall()
    conn.close()

    message = '''🎉 <b>Новый функционал!</b>

Привет! В боте появился <b>📖 Справочник</b> — раздел с полезной информацией:

⚖️ <b>Штрафы за нарушения</b>
Актуальные суммы из КоАП РФ для граждан, должностных лиц и компаний

📄 <b>Документы для импорта</b>
Полный список документов для таможни и маркировки

✅ <b>Чек-лист подключения</b>
Пошаговый план подключения к маркировке по категориям

🔗 <b>Полезные ссылки</b>
Честный ЗНАК, ФТС, Национальный каталог

Нажмите <b>📖 Справочник</b> в меню, чтобы попробовать!'''

    keyboard = InlineKeyboardMarkup([
        [InlineKeyboardButton("📖 Открыть Справочник", callback_data="handbook")],
        [InlineKeyboardButton("🏠 Главное меню", callback_data="main_menu")]
    ])

    sent = 0
    failed = 0

    for telegram_id, first_name in users:
        try:
            await bot.send_message(
                chat_id=telegram_id,
                text=message,
                parse_mode='HTML',
                reply_markup=keyboard
            )
            sent += 1
            print(f'Отправлено: {first_name} ({telegram_id})')
        except Exception as e:
            failed += 1
            print(f'Ошибка {first_name} ({telegram_id}): {e}')

        await asyncio.sleep(0.5)

    print(f'\nИтого: отправлено {sent}, ошибок {failed}')

if __name__ == '__main__':
    asyncio.run(send_broadcast())
