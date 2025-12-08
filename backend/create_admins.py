# -*- coding: utf-8 -*-
"""
Скрипт для создания суперадминов
"""

from database import UserDB, init_database, get_db

def create_superadmins():
    """Создать суперадминов"""

    admins = [
        {"email": "89274521553@promarkirui.ru", "password": "admin", "role": "superadmin"},
        {"email": "89053752538@promarkirui.ru", "password": "admin", "role": "superadmin"},
    ]

    for admin in admins:
        # Проверяем существует ли уже
        existing = UserDB.get_by_email(admin["email"])
        if existing:
            print(f"Пользователь {admin['email']} уже существует (id={existing['id']}, role={existing['role']})")
            # Обновляем роль на superadmin если нужно
            if existing['role'] != 'superadmin':
                with get_db() as conn:
                    cursor = conn.cursor()
                    cursor.execute(
                        'UPDATE users SET role = ? WHERE id = ?',
                        ('superadmin', existing['id'])
                    )
                print(f"  -> Роль обновлена на superadmin")
        else:
            user_id = UserDB.create(admin["email"], admin["password"], admin["role"])
            # Сразу подтверждаем email для админов
            with get_db() as conn:
                cursor = conn.cursor()
                cursor.execute(
                    'UPDATE users SET email_verified = 1 WHERE id = ?',
                    (user_id,)
                )
            print(f"Создан суперадмин: {admin['email']} (id={user_id})")

    print("\nГотово! Суперадмины:")
    print("  Логин: 89274521553@promarkirui.ru / Пароль: admin")
    print("  Логин: 89053752538@promarkirui.ru / Пароль: admin")


if __name__ == "__main__":
    create_superadmins()
