# -*- coding: utf-8 -*-
"""
Модуль базы данных SQLite для системы Про.Маркируй
"""

import sqlite3
import os
from datetime import datetime
from typing import Optional, List, Dict, Any
from contextlib import contextmanager
import bcrypt

# Путь к базе данных
DB_PATH = os.getenv('DB_PATH', os.path.join(os.path.dirname(__file__), 'promarkirui.db'))


@contextmanager
def get_db():
    """Контекстный менеджер для подключения к БД"""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
        conn.commit()
    except Exception as e:
        conn.rollback()
        raise e
    finally:
        conn.close()


def init_database():
    """Инициализация базы данных"""
    with get_db() as conn:
        cursor = conn.cursor()

        # Таблица пользователей
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                email TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                role TEXT DEFAULT 'client',
                name TEXT,
                phone TEXT,
                company_name TEXT,
                inn TEXT,
                city TEXT,
                email_verified INTEGER DEFAULT 0,
                verification_token TEXT,
                reset_token TEXT,
                reset_token_expires TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                last_login TIMESTAMP
            )
        ''')

        # Таблица контактных заявок
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS contacts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                phone TEXT NOT NULL,
                email TEXT,
                request_type TEXT NOT NULL,
                comment TEXT,
                status TEXT DEFAULT 'new',
                assigned_to INTEGER,
                notes TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (assigned_to) REFERENCES users(id)
            )
        ''')

        # Таблица проверок товаров (история)
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS product_checks (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER,
                session_id TEXT,
                category TEXT NOT NULL,
                subcategory TEXT NOT NULL,
                subcategory_name TEXT,
                tnved TEXT,
                requires_marking INTEGER,
                status TEXT,
                source TEXT,
                ip_address TEXT,
                user_agent TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id)
            )
        ''')

        # Таблица статистики посещений
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS page_views (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                page TEXT NOT NULL,
                session_id TEXT,
                user_id INTEGER,
                ip_address TEXT,
                user_agent TEXT,
                referrer TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id)
            )
        ''')

        # Индексы для быстрого поиска
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_users_role ON users(role)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_contacts_status ON contacts(status)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_contacts_created ON contacts(created_at)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_checks_created ON product_checks(created_at)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_views_created ON page_views(created_at)')

    print("Database initialized successfully!")


class UserDB:
    """Операции с пользователями"""

    @staticmethod
    def hash_password(password: str) -> str:
        """Хеширование пароля"""
        return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

    @staticmethod
    def verify_password(password: str, password_hash: str) -> bool:
        """Проверка пароля"""
        return bcrypt.checkpw(password.encode('utf-8'), password_hash.encode('utf-8'))

    @staticmethod
    def create(email: str, password: str, role: str = 'client', **kwargs) -> int:
        """Создать пользователя"""
        password_hash = UserDB.hash_password(password)

        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute('''
                INSERT INTO users (email, password_hash, role, name, phone, company_name, inn, city)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                email, password_hash, role,
                kwargs.get('name'), kwargs.get('phone'),
                kwargs.get('company_name'), kwargs.get('inn'), kwargs.get('city')
            ))
            return cursor.lastrowid

    @staticmethod
    def get_by_email(email: str) -> Optional[Dict]:
        """Получить пользователя по email"""
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute('SELECT * FROM users WHERE email = ?', (email,))
            row = cursor.fetchone()
            return dict(row) if row else None

    @staticmethod
    def get_by_id(user_id: int) -> Optional[Dict]:
        """Получить пользователя по ID"""
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute('SELECT * FROM users WHERE id = ?', (user_id,))
            row = cursor.fetchone()
            return dict(row) if row else None

    @staticmethod
    def get_all(limit: int = 100, offset: int = 0, role: str = None, search: str = None) -> List[Dict]:
        """Получить список пользователей"""
        with get_db() as conn:
            cursor = conn.cursor()
            query = 'SELECT id, email, role, name, phone, company_name, inn, city, email_verified, created_at, last_login FROM users WHERE 1=1'
            params = []

            if role:
                query += ' AND role = ?'
                params.append(role)

            if search:
                query += ' AND (email LIKE ? OR name LIKE ? OR phone LIKE ? OR company_name LIKE ?)'
                search_pattern = f'%{search}%'
                params.extend([search_pattern] * 4)

            query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?'
            params.extend([limit, offset])

            cursor.execute(query, params)
            return [dict(row) for row in cursor.fetchall()]

    @staticmethod
    def count(role: str = None, search: str = None) -> int:
        """Подсчитать пользователей"""
        with get_db() as conn:
            cursor = conn.cursor()
            query = 'SELECT COUNT(*) FROM users WHERE 1=1'
            params = []

            if role:
                query += ' AND role = ?'
                params.append(role)

            if search:
                query += ' AND (email LIKE ? OR name LIKE ? OR phone LIKE ? OR company_name LIKE ?)'
                search_pattern = f'%{search}%'
                params.extend([search_pattern] * 4)

            cursor.execute(query, params)
            return cursor.fetchone()[0]

    @staticmethod
    def update(user_id: int, **kwargs) -> bool:
        """Обновить пользователя"""
        allowed_fields = ['name', 'phone', 'company_name', 'inn', 'city', 'role', 'email_verified']
        updates = {k: v for k, v in kwargs.items() if k in allowed_fields and v is not None}

        if not updates:
            return False

        updates['updated_at'] = datetime.now().isoformat()

        with get_db() as conn:
            cursor = conn.cursor()
            set_clause = ', '.join([f'{k} = ?' for k in updates.keys()])
            values = list(updates.values()) + [user_id]
            cursor.execute(f'UPDATE users SET {set_clause} WHERE id = ?', values)
            return cursor.rowcount > 0

    @staticmethod
    def delete(user_id: int) -> bool:
        """Удалить пользователя"""
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute('DELETE FROM users WHERE id = ?', (user_id,))
            return cursor.rowcount > 0

    @staticmethod
    def update_last_login(user_id: int):
        """Обновить время последнего входа"""
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute('UPDATE users SET last_login = ? WHERE id = ?',
                         (datetime.now().isoformat(), user_id))


class ContactDB:
    """Операции с заявками"""

    @staticmethod
    def create(name: str, phone: str, request_type: str, email: str = None, comment: str = None) -> int:
        """Создать заявку"""
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute('''
                INSERT INTO contacts (name, phone, email, request_type, comment)
                VALUES (?, ?, ?, ?, ?)
            ''', (name, phone, email, request_type, comment))
            return cursor.lastrowid

    @staticmethod
    def get_all(limit: int = 100, offset: int = 0, status: str = None, search: str = None) -> List[Dict]:
        """Получить список заявок"""
        with get_db() as conn:
            cursor = conn.cursor()
            query = 'SELECT * FROM contacts WHERE 1=1'
            params = []

            if status:
                query += ' AND status = ?'
                params.append(status)

            if search:
                query += ' AND (name LIKE ? OR phone LIKE ? OR email LIKE ?)'
                search_pattern = f'%{search}%'
                params.extend([search_pattern] * 3)

            query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?'
            params.extend([limit, offset])

            cursor.execute(query, params)
            return [dict(row) for row in cursor.fetchall()]

    @staticmethod
    def count(status: str = None, search: str = None) -> int:
        """Подсчитать заявки"""
        with get_db() as conn:
            cursor = conn.cursor()
            query = 'SELECT COUNT(*) FROM contacts WHERE 1=1'
            params = []

            if status:
                query += ' AND status = ?'
                params.append(status)

            if search:
                query += ' AND (name LIKE ? OR phone LIKE ? OR email LIKE ?)'
                search_pattern = f'%{search}%'
                params.extend([search_pattern] * 3)

            cursor.execute(query, params)
            return cursor.fetchone()[0]

    @staticmethod
    def update_status(contact_id: int, status: str, notes: str = None, assigned_to: int = None) -> bool:
        """Обновить статус заявки"""
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute('''
                UPDATE contacts
                SET status = ?, notes = ?, assigned_to = ?, updated_at = ?
                WHERE id = ?
            ''', (status, notes, assigned_to, datetime.now().isoformat(), contact_id))
            return cursor.rowcount > 0

    @staticmethod
    def get_by_id(contact_id: int) -> Optional[Dict]:
        """Получить заявку по ID"""
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute('SELECT * FROM contacts WHERE id = ?', (contact_id,))
            row = cursor.fetchone()
            return dict(row) if row else None


class StatsDB:
    """Статистика"""

    @staticmethod
    def log_product_check(category: str, subcategory: str, subcategory_name: str = None,
                          tnved: str = None, requires_marking: bool = None, status: str = None,
                          source: str = None, user_id: int = None, session_id: str = None,
                          ip_address: str = None, user_agent: str = None):
        """Логировать проверку товара"""
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute('''
                INSERT INTO product_checks
                (user_id, session_id, category, subcategory, subcategory_name, tnved,
                 requires_marking, status, source, ip_address, user_agent)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (user_id, session_id, category, subcategory, subcategory_name, tnved,
                  1 if requires_marking else 0, status, source, ip_address, user_agent))

    @staticmethod
    def log_page_view(page: str, session_id: str = None, user_id: int = None,
                      ip_address: str = None, user_agent: str = None, referrer: str = None):
        """Логировать просмотр страницы"""
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute('''
                INSERT INTO page_views (page, session_id, user_id, ip_address, user_agent, referrer)
                VALUES (?, ?, ?, ?, ?, ?)
            ''', (page, session_id, user_id, ip_address, user_agent, referrer))

    @staticmethod
    def get_dashboard_stats() -> Dict[str, Any]:
        """Получить статистику для дашборда"""
        with get_db() as conn:
            cursor = conn.cursor()

            # Общая статистика
            stats = {}

            # Пользователи
            cursor.execute('SELECT COUNT(*) FROM users')
            stats['total_users'] = cursor.fetchone()[0]

            cursor.execute("SELECT COUNT(*) FROM users WHERE role = 'client'")
            stats['total_clients'] = cursor.fetchone()[0]

            # Заявки
            cursor.execute('SELECT COUNT(*) FROM contacts')
            stats['total_contacts'] = cursor.fetchone()[0]

            cursor.execute("SELECT COUNT(*) FROM contacts WHERE status = 'new'")
            stats['new_contacts'] = cursor.fetchone()[0]

            # Проверки товаров
            cursor.execute('SELECT COUNT(*) FROM product_checks')
            stats['total_checks'] = cursor.fetchone()[0]

            # Проверки за сегодня
            cursor.execute("SELECT COUNT(*) FROM product_checks WHERE date(created_at) = date('now')")
            stats['checks_today'] = cursor.fetchone()[0]

            # Просмотры за сегодня
            cursor.execute("SELECT COUNT(*) FROM page_views WHERE date(created_at) = date('now')")
            stats['views_today'] = cursor.fetchone()[0]

            # Топ категорий
            cursor.execute('''
                SELECT category, COUNT(*) as cnt
                FROM product_checks
                GROUP BY category
                ORDER BY cnt DESC
                LIMIT 5
            ''')
            stats['top_categories'] = [{'category': row[0], 'count': row[1]} for row in cursor.fetchall()]

            # Заявки по типам
            cursor.execute('''
                SELECT request_type, COUNT(*) as cnt
                FROM contacts
                GROUP BY request_type
                ORDER BY cnt DESC
            ''')
            stats['contacts_by_type'] = [{'type': row[0], 'count': row[1]} for row in cursor.fetchall()]

            # Регистрации за последние 7 дней
            cursor.execute('''
                SELECT date(created_at) as day, COUNT(*) as cnt
                FROM users
                WHERE created_at >= date('now', '-7 days')
                GROUP BY day
                ORDER BY day
            ''')
            stats['registrations_7days'] = [{'date': row[0], 'count': row[1]} for row in cursor.fetchall()]

            # Проверки за последние 7 дней
            cursor.execute('''
                SELECT date(created_at) as day, COUNT(*) as cnt
                FROM product_checks
                WHERE created_at >= date('now', '-7 days')
                GROUP BY day
                ORDER BY day
            ''')
            stats['checks_7days'] = [{'date': row[0], 'count': row[1]} for row in cursor.fetchall()]

            return stats


# Инициализация БД при импорте
if not os.path.exists(DB_PATH):
    init_database()
