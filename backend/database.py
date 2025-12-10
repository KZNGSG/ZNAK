# -*- coding: utf-8 -*-
"""
База данных SQLite для Про.Маркируй
Хранение пользователей, компаний, КП, договоров
"""

import sqlite3
import os
from datetime import datetime, date
from typing import Optional, List, Dict, Any
from contextlib import contextmanager
import hashlib
import secrets

# Путь к базе данных
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, "data")
DB_PATH = os.path.join(DATA_DIR, "promarkirui.db")

# Создаём папку data если её нет
os.makedirs(DATA_DIR, exist_ok=True)


@contextmanager
def get_db():
    """Контекстный менеджер для работы с БД"""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row  # Возвращать dict-like объекты
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def init_database():
    """Инициализация базы данных - создание таблиц"""
    with get_db() as conn:
        cursor = conn.cursor()

        # Таблица пользователей
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                email TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                role TEXT DEFAULT 'client',  -- client, admin, superadmin
                is_active BOOLEAN DEFAULT 1,
                email_verified BOOLEAN DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')

        # Таблица токенов верификации email
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS email_verifications (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                token TEXT UNIQUE NOT NULL,
                expires_at TIMESTAMP NOT NULL,
                used BOOLEAN DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id)
            )
        ''')

        # Добавляем колонку email_verified если её нет (для существующих БД)
        try:
            cursor.execute('ALTER TABLE users ADD COLUMN email_verified BOOLEAN DEFAULT 0')
        except sqlite3.OperationalError:
            pass  # Колонка уже существует

        # Таблица компаний (клиентов)
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS companies (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER,  -- NULL если гостевой заказ
                inn TEXT NOT NULL,
                kpp TEXT,
                ogrn TEXT,
                name TEXT NOT NULL,
                name_short TEXT,
                name_full TEXT,
                opf TEXT,
                type TEXT,  -- LEGAL или INDIVIDUAL
                address TEXT,
                management_name TEXT,
                management_post TEXT,
                status TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id)
            )
        ''')

        # Таблица КП (коммерческих предложений)
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS quotes (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                quote_number TEXT UNIQUE NOT NULL,  -- КП-20251208-ABC123
                user_id INTEGER,  -- NULL если гостевой
                company_id INTEGER,
                services_json TEXT NOT NULL,  -- JSON с услугами
                total_amount REAL NOT NULL,
                contact_name TEXT,
                contact_phone TEXT,
                contact_email TEXT,
                status TEXT DEFAULT 'created',  -- created, sent, accepted, rejected, expired
                valid_until DATE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id),
                FOREIGN KEY (company_id) REFERENCES companies(id)
            )
        ''')

        # Таблица договоров
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS contracts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                contract_number TEXT UNIQUE NOT NULL,  -- ДОГ-081225-001
                quote_id INTEGER,  -- Связь с КП если есть
                user_id INTEGER,
                company_id INTEGER NOT NULL,
                services_json TEXT NOT NULL,
                total_amount REAL NOT NULL,
                status TEXT DEFAULT 'draft',  -- draft, signed, active, completed, cancelled
                signed_at TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (quote_id) REFERENCES quotes(id),
                FOREIGN KEY (user_id) REFERENCES users(id),
                FOREIGN KEY (company_id) REFERENCES companies(id)
            )
        ''')

        # Счётчик нумерации договоров по дням
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS contract_sequence (
                date_key TEXT PRIMARY KEY,  -- ДДММГГ
                last_number INTEGER DEFAULT 0
            )
        ''')

        # Таблица заявок на звонок
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS callbacks (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER,
                company_inn TEXT,
                company_name TEXT,
                contact_name TEXT NOT NULL,
                contact_phone TEXT NOT NULL,
                contact_email TEXT,
                products_json TEXT,  -- JSON с проверенными товарами
                comment TEXT,
                source TEXT,  -- откуда пришла заявка: check_page, quote_page, contact_form
                status TEXT DEFAULT 'new',  -- new, processing, completed, cancelled
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                processed_at TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id)
            )
        ''')

        # Добавляем колонку source если её нет (миграция)
        try:
            cursor.execute('ALTER TABLE callbacks ADD COLUMN source TEXT')
        except:
            pass  # Колонка уже существует

        # Таблица счетов
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS invoices (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                invoice_number TEXT UNIQUE NOT NULL,  -- СЧЁТ-081225-001
                contract_id INTEGER,
                company_id INTEGER NOT NULL,
                amount REAL NOT NULL,
                status TEXT DEFAULT 'created',  -- created, sent, paid, cancelled
                paid_at TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (contract_id) REFERENCES contracts(id),
                FOREIGN KEY (company_id) REFERENCES companies(id)
            )
        ''')

        # Таблица клиентов CRM (для менеджеров)
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS clients (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                inn TEXT,
                kpp TEXT,
                ogrn TEXT,
                company_name TEXT,
                company_type TEXT,  -- LEGAL или INDIVIDUAL
                contact_name TEXT NOT NULL,
                contact_phone TEXT NOT NULL,
                contact_email TEXT,
                contact_position TEXT,
                address TEXT,
                comment TEXT,
                source TEXT DEFAULT 'manual',  -- website, manual, callback
                status TEXT DEFAULT 'lead',  -- lead, active, regular, inactive
                assigned_manager_id INTEGER,  -- менеджер
                user_id INTEGER,  -- связь с зарегистрированным пользователем
                products_json TEXT,  -- JSON с товарами клиента
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (assigned_manager_id) REFERENCES users(id),
                FOREIGN KEY (user_id) REFERENCES users(id)
            )
        ''')

        # Таблица истории взаимодействий с клиентами
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS client_interactions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                client_id INTEGER NOT NULL,
                manager_id INTEGER NOT NULL,
                type TEXT NOT NULL,  -- call, email, meeting, document_sent, quote_created, contract_created, note
                subject TEXT,
                description TEXT,
                callback_id INTEGER,
                quote_id INTEGER,
                contract_id INTEGER,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (client_id) REFERENCES clients(id),
                FOREIGN KEY (manager_id) REFERENCES users(id),
                FOREIGN KEY (callback_id) REFERENCES callbacks(id),
                FOREIGN KEY (quote_id) REFERENCES quotes(id),
                FOREIGN KEY (contract_id) REFERENCES contracts(id)
            )
        ''')

        # Миграция: добавляем колонки в callbacks если их нет
        try:
            cursor.execute('ALTER TABLE callbacks ADD COLUMN assigned_to INTEGER REFERENCES users(id)')
        except:
            pass
        try:
            cursor.execute('ALTER TABLE callbacks ADD COLUMN client_id INTEGER REFERENCES clients(id)')
        except:
            pass
        try:
            cursor.execute('ALTER TABLE callbacks ADD COLUMN priority TEXT DEFAULT "normal"')
        except:
            pass

        # Миграция: добавляем client_id в quotes и contracts
        try:
            cursor.execute('ALTER TABLE quotes ADD COLUMN client_id INTEGER REFERENCES clients(id)')
        except:
            pass
        try:
            cursor.execute('ALTER TABLE contracts ADD COLUMN client_id INTEGER REFERENCES clients(id)')
        except:
            pass

        # Индексы для быстрого поиска
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_companies_inn ON companies(inn)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_companies_user ON companies(user_id)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_quotes_user ON quotes(user_id)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_contracts_user ON contracts(user_id)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_contracts_company ON contracts(company_id)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_clients_inn ON clients(inn)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_clients_manager ON clients(assigned_manager_id)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_clients_status ON clients(status)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_interactions_client ON client_interactions(client_id)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_callbacks_assigned ON callbacks(assigned_to)')

        print("Database initialized successfully!")


# ======================== ФУНКЦИИ ДЛЯ РАБОТЫ С ДАННЫМИ ========================

def hash_password(password: str) -> str:
    """Хеширование пароля"""
    salt = secrets.token_hex(16)
    hash_obj = hashlib.pbkdf2_hmac('sha256', password.encode(), salt.encode(), 100000)
    return f"{salt}${hash_obj.hex()}"


def verify_password(password: str, password_hash: str) -> bool:
    """Проверка пароля"""
    try:
        salt, hash_hex = password_hash.split('$')
        hash_obj = hashlib.pbkdf2_hmac('sha256', password.encode(), salt.encode(), 100000)
        return hash_obj.hex() == hash_hex
    except:
        return False


def get_next_contract_number() -> str:
    """Получить следующий номер договора в формате ДОГ-ДДММГГ-XXX"""
    today = datetime.now()
    date_key = today.strftime("%d%m%y")

    with get_db() as conn:
        cursor = conn.cursor()

        # Получаем текущий счётчик для сегодня
        cursor.execute(
            'SELECT last_number FROM contract_sequence WHERE date_key = ?',
            (date_key,)
        )
        row = cursor.fetchone()

        if row:
            next_num = row['last_number'] + 1
            cursor.execute(
                'UPDATE contract_sequence SET last_number = ? WHERE date_key = ?',
                (next_num, date_key)
            )
        else:
            next_num = 1
            cursor.execute(
                'INSERT INTO contract_sequence (date_key, last_number) VALUES (?, ?)',
                (date_key, next_num)
            )

        return f"ДОГ-{date_key}-{next_num:03d}"


def get_next_invoice_number() -> str:
    """Получить следующий номер счёта"""
    today = datetime.now()
    date_key = today.strftime("%d%m%y")

    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(
            'SELECT COUNT(*) as cnt FROM invoices WHERE invoice_number LIKE ?',
            (f"СЧЁТ-{date_key}-%",)
        )
        count = cursor.fetchone()['cnt']
        return f"СЧЁТ-{date_key}-{count + 1:03d}"


# ======================== CRUD ОПЕРАЦИИ ========================

class UserDB:
    """Операции с пользователями"""

    @staticmethod
    def create(email: str, password: str, role: str = 'client') -> int:
        """Создать пользователя"""
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute(
                'INSERT INTO users (email, password_hash, role) VALUES (?, ?, ?)',
                (email.lower(), hash_password(password), role)
            )
            return cursor.lastrowid

    @staticmethod
    def get_by_email(email: str) -> Optional[Dict]:
        """Получить пользователя по email"""
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute('SELECT * FROM users WHERE email = ?', (email.lower(),))
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
    def authenticate(email: str, password: str) -> Optional[Dict]:
        """Аутентификация пользователя"""
        user = UserDB.get_by_email(email)
        if user and verify_password(password, user['password_hash']):
            return user
        return None


class CompanyDB:
    """Операции с компаниями"""

    @staticmethod
    def create(data: Dict, user_id: int = None) -> int:
        """Создать/обновить компанию"""
        with get_db() as conn:
            cursor = conn.cursor()

            # Проверяем, есть ли уже такая компания у пользователя
            if user_id:
                cursor.execute(
                    'SELECT id FROM companies WHERE inn = ? AND user_id = ?',
                    (data['inn'], user_id)
                )
            else:
                cursor.execute(
                    'SELECT id FROM companies WHERE inn = ? AND user_id IS NULL',
                    (data['inn'],)
                )

            existing = cursor.fetchone()

            if existing:
                # Обновляем существующую
                cursor.execute('''
                    UPDATE companies SET
                        kpp = ?, ogrn = ?, name = ?, name_short = ?, name_full = ?,
                        opf = ?, type = ?, address = ?, management_name = ?,
                        management_post = ?, status = ?
                    WHERE id = ?
                ''', (
                    data.get('kpp'), data.get('ogrn'), data['name'],
                    data.get('name_short'), data.get('name_full'),
                    data.get('opf'), data.get('type'), data.get('address'),
                    data.get('management_name'), data.get('management_post'),
                    data.get('status'), existing['id']
                ))
                return existing['id']
            else:
                # Создаём новую
                cursor.execute('''
                    INSERT INTO companies (
                        user_id, inn, kpp, ogrn, name, name_short, name_full,
                        opf, type, address, management_name, management_post, status
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ''', (
                    user_id, data['inn'], data.get('kpp'), data.get('ogrn'),
                    data['name'], data.get('name_short'), data.get('name_full'),
                    data.get('opf'), data.get('type'), data.get('address'),
                    data.get('management_name'), data.get('management_post'),
                    data.get('status')
                ))
                return cursor.lastrowid

    @staticmethod
    def get_by_user(user_id: int) -> List[Dict]:
        """Получить все компании пользователя"""
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute('SELECT * FROM companies WHERE user_id = ?', (user_id,))
            return [dict(row) for row in cursor.fetchall()]


class QuoteDB:
    """Операции с КП"""

    @staticmethod
    def create(data: Dict) -> Dict:
        """Создать КП"""
        import json
        import uuid

        quote_number = f"КП-{datetime.now().strftime('%Y%m%d')}-{uuid.uuid4().hex[:6].upper()}"

        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute('''
                INSERT INTO quotes (
                    quote_number, user_id, company_id, services_json,
                    total_amount, contact_name, contact_phone, contact_email,
                    status, valid_until
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                quote_number,
                data.get('user_id'),
                data['company_id'],
                json.dumps(data['services'], ensure_ascii=False),
                data['total_amount'],
                data.get('contact_name'),
                data.get('contact_phone'),
                data.get('contact_email'),
                'created',
                data.get('valid_until')
            ))

            return {
                'id': cursor.lastrowid,
                'quote_number': quote_number
            }

    @staticmethod
    def get_by_user(user_id: int) -> List[Dict]:
        """Получить все КП пользователя"""
        import json
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute('''
                SELECT q.*, c.name as company_name, c.inn as company_inn
                FROM quotes q
                LEFT JOIN companies c ON q.company_id = c.id
                WHERE q.user_id = ?
                ORDER BY q.created_at DESC
            ''', (user_id,))
            results = []
            for row in cursor.fetchall():
                item = dict(row)
                item['services'] = json.loads(item['services_json'])
                del item['services_json']
                results.append(item)
            return results


class ContractDB:
    """Операции с договорами"""

    @staticmethod
    def create(data: Dict) -> Dict:
        """Создать договор"""
        import json

        contract_number = get_next_contract_number()

        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute('''
                INSERT INTO contracts (
                    contract_number, quote_id, user_id, company_id,
                    services_json, total_amount, status
                ) VALUES (?, ?, ?, ?, ?, ?, ?)
            ''', (
                contract_number,
                data.get('quote_id'),
                data.get('user_id'),
                data['company_id'],
                json.dumps(data['services'], ensure_ascii=False),
                data['total_amount'],
                'draft'
            ))

            return {
                'id': cursor.lastrowid,
                'contract_number': contract_number
            }

    @staticmethod
    def get_by_user(user_id: int) -> List[Dict]:
        """Получить все договоры пользователя"""
        import json
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute('''
                SELECT ct.*, c.name as company_name, c.inn as company_inn
                FROM contracts ct
                LEFT JOIN companies c ON ct.company_id = c.id
                WHERE ct.user_id = ?
                ORDER BY ct.created_at DESC
            ''', (user_id,))
            results = []
            for row in cursor.fetchall():
                item = dict(row)
                item['services'] = json.loads(item['services_json'])
                del item['services_json']
                results.append(item)
            return results


class EmailVerificationDB:
    """Операции с верификацией email"""

    @staticmethod
    def create_token(user_id: int, token: str, expires_hours: int = 24) -> int:
        """Создать токен верификации"""
        from datetime import timedelta
        expires_at = datetime.now() + timedelta(hours=expires_hours)

        with get_db() as conn:
            cursor = conn.cursor()
            # Удаляем старые неиспользованные токены для этого пользователя
            cursor.execute(
                'DELETE FROM email_verifications WHERE user_id = ? AND used = 0',
                (user_id,)
            )
            # Создаём новый токен
            cursor.execute(
                '''INSERT INTO email_verifications (user_id, token, expires_at)
                   VALUES (?, ?, ?)''',
                (user_id, token, expires_at)
            )
            return cursor.lastrowid

    @staticmethod
    def verify_token(token: str) -> Optional[Dict]:
        """
        Проверить токен и пометить email как подтверждённый.
        Возвращает данные пользователя если успешно, None если токен невалидный.
        """
        with get_db() as conn:
            cursor = conn.cursor()

            # Находим токен
            cursor.execute('''
                SELECT ev.*, u.email, u.id as user_id
                FROM email_verifications ev
                JOIN users u ON ev.user_id = u.id
                WHERE ev.token = ? AND ev.used = 0
            ''', (token,))
            row = cursor.fetchone()

            if not row:
                return None

            verification = dict(row)

            # Проверяем срок действия
            expires_at = datetime.fromisoformat(verification['expires_at'])
            if datetime.now() > expires_at:
                return None

            # Помечаем токен как использованный
            cursor.execute(
                'UPDATE email_verifications SET used = 1 WHERE id = ?',
                (verification['id'],)
            )

            # Помечаем email как подтверждённый
            cursor.execute(
                'UPDATE users SET email_verified = 1 WHERE id = ?',
                (verification['user_id'],)
            )

            return {
                'user_id': verification['user_id'],
                'email': verification['email']
            }

    @staticmethod
    def is_verified(user_id: int) -> bool:
        """Проверить, подтверждён ли email пользователя"""
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute(
                'SELECT email_verified FROM users WHERE id = ?',
                (user_id,)
            )
            row = cursor.fetchone()
            return bool(row and row['email_verified'])


class CallbackDB:
    """Операции с заявками на звонок"""

    @staticmethod
    def create(data: Dict) -> int:
        """Создать заявку на звонок"""
        import json

        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute('''
                INSERT INTO callbacks (
                    user_id, company_inn, company_name, contact_name,
                    contact_phone, contact_email, products_json, comment, source
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                data.get('user_id'),
                data.get('company_inn'),
                data.get('company_name'),
                data['contact_name'],
                data['contact_phone'],
                data.get('contact_email'),
                json.dumps(data.get('products', []), ensure_ascii=False),
                data.get('comment'),
                data.get('source', 'unknown')
            ))
            return cursor.lastrowid

    @staticmethod
    def get_all(status: str = None) -> List[Dict]:
        """Получить все заявки (для админки)"""
        import json
        with get_db() as conn:
            cursor = conn.cursor()
            if status:
                cursor.execute(
                    'SELECT * FROM callbacks WHERE status = ? ORDER BY created_at DESC',
                    (status,)
                )
            else:
                cursor.execute('SELECT * FROM callbacks ORDER BY created_at DESC')
            results = []
            for row in cursor.fetchall():
                item = dict(row)
                item['products'] = json.loads(item['products_json']) if item['products_json'] else []
                del item['products_json']
                results.append(item)
            return results

    @staticmethod
    def update_status(callback_id: int, status: str):
        """Обновить статус заявки"""
        with get_db() as conn:
            cursor = conn.cursor()
            if status in ['processed', 'completed']:
                cursor.execute(
                    'UPDATE callbacks SET status = ?, processed_at = CURRENT_TIMESTAMP WHERE id = ?',
                    (status, callback_id)
                )
            else:
                cursor.execute(
                    'UPDATE callbacks SET status = ? WHERE id = ?',
                    (status, callback_id)
                )


class ClientDB:
    """Операции с клиентами CRM"""

    @staticmethod
    def create(data: Dict, manager_id: int = None) -> int:
        """Создать клиента"""
        import json

        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute('''
                INSERT INTO clients (
                    inn, kpp, ogrn, company_name, company_type,
                    contact_name, contact_phone, contact_email, contact_position,
                    address, comment, source, status, assigned_manager_id, user_id, products_json
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                data.get('inn'),
                data.get('kpp'),
                data.get('ogrn'),
                data.get('company_name'),
                data.get('company_type'),
                data['contact_name'],
                data['contact_phone'],
                data.get('contact_email'),
                data.get('contact_position'),
                data.get('address'),
                data.get('comment'),
                data.get('source', 'manual'),
                data.get('status', 'lead'),
                manager_id,
                data.get('user_id'),
                json.dumps(data.get('products', []), ensure_ascii=False)
            ))
            return cursor.lastrowid

    @staticmethod
    def get_by_id(client_id: int) -> Optional[Dict]:
        """Получить клиента по ID"""
        import json
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute('SELECT * FROM clients WHERE id = ?', (client_id,))
            row = cursor.fetchone()
            if row:
                item = dict(row)
                item['products'] = json.loads(item['products_json']) if item['products_json'] else []
                del item['products_json']
                return item
            return None

    @staticmethod
    def get_all(status: str = None, manager_id: int = None) -> List[Dict]:
        """Получить всех клиентов с фильтрами"""
        import json
        with get_db() as conn:
            cursor = conn.cursor()
            query = 'SELECT * FROM clients WHERE 1=1'
            params = []

            if status:
                query += ' AND status = ?'
                params.append(status)
            if manager_id:
                query += ' AND assigned_manager_id = ?'
                params.append(manager_id)

            query += ' ORDER BY created_at DESC'
            cursor.execute(query, params)

            results = []
            for row in cursor.fetchall():
                item = dict(row)
                item['products'] = json.loads(item['products_json']) if item['products_json'] else []
                del item['products_json']
                results.append(item)
            return results

    @staticmethod
    def update(client_id: int, data: Dict) -> bool:
        """Обновить клиента"""
        import json
        with get_db() as conn:
            cursor = conn.cursor()

            # Собираем только переданные поля
            fields = []
            values = []

            updateable_fields = [
                'inn', 'kpp', 'ogrn', 'company_name', 'company_type',
                'contact_name', 'contact_phone', 'contact_email', 'contact_position',
                'address', 'comment', 'status', 'assigned_manager_id'
            ]

            for field in updateable_fields:
                if field in data:
                    fields.append(f'{field} = ?')
                    values.append(data[field])

            if 'products' in data:
                fields.append('products_json = ?')
                values.append(json.dumps(data['products'], ensure_ascii=False))

            if not fields:
                return False

            fields.append('updated_at = CURRENT_TIMESTAMP')
            values.append(client_id)

            cursor.execute(
                f'UPDATE clients SET {", ".join(fields)} WHERE id = ?',
                values
            )
            return cursor.rowcount > 0

    @staticmethod
    def delete(client_id: int) -> bool:
        """Удалить клиента"""
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute('DELETE FROM clients WHERE id = ?', (client_id,))
            return cursor.rowcount > 0

    @staticmethod
    def search(query: str) -> List[Dict]:
        """Поиск клиентов по имени, компании, телефону, ИНН"""
        import json
        with get_db() as conn:
            cursor = conn.cursor()
            search_term = f'%{query}%'
            cursor.execute('''
                SELECT * FROM clients
                WHERE contact_name LIKE ? OR company_name LIKE ?
                   OR contact_phone LIKE ? OR inn LIKE ? OR contact_email LIKE ?
                ORDER BY created_at DESC
                LIMIT 50
            ''', (search_term, search_term, search_term, search_term, search_term))

            results = []
            for row in cursor.fetchall():
                item = dict(row)
                item['products'] = json.loads(item['products_json']) if item['products_json'] else []
                del item['products_json']
                results.append(item)
            return results

    @staticmethod
    def get_stats() -> Dict:
        """Статистика по клиентам"""
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute('''
                SELECT
                    COUNT(*) as total,
                    SUM(CASE WHEN status = 'lead' THEN 1 ELSE 0 END) as leads,
                    SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active,
                    SUM(CASE WHEN status = 'regular' THEN 1 ELSE 0 END) as regular,
                    SUM(CASE WHEN status = 'inactive' THEN 1 ELSE 0 END) as inactive
                FROM clients
            ''')
            row = cursor.fetchone()
            return dict(row) if row else {}


class InteractionDB:
    """Операции с историей взаимодействий"""

    @staticmethod
    def create(data: Dict) -> int:
        """Создать запись о взаимодействии"""
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute('''
                INSERT INTO client_interactions (
                    client_id, manager_id, type, subject, description,
                    callback_id, quote_id, contract_id
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                data['client_id'],
                data['manager_id'],
                data['type'],
                data.get('subject'),
                data.get('description'),
                data.get('callback_id'),
                data.get('quote_id'),
                data.get('contract_id')
            ))
            return cursor.lastrowid

    @staticmethod
    def get_by_client(client_id: int, limit: int = 50) -> List[Dict]:
        """Получить историю взаимодействий с клиентом"""
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute('''
                SELECT ci.*, u.email as manager_email
                FROM client_interactions ci
                LEFT JOIN users u ON ci.manager_id = u.id
                WHERE ci.client_id = ?
                ORDER BY ci.created_at DESC
                LIMIT ?
            ''', (client_id, limit))
            return [dict(row) for row in cursor.fetchall()]

    @staticmethod
    def get_recent(manager_id: int = None, limit: int = 20) -> List[Dict]:
        """Получить последние взаимодействия"""
        with get_db() as conn:
            cursor = conn.cursor()
            if manager_id:
                cursor.execute('''
                    SELECT ci.*, c.contact_name, c.company_name
                    FROM client_interactions ci
                    LEFT JOIN clients c ON ci.client_id = c.id
                    WHERE ci.manager_id = ?
                    ORDER BY ci.created_at DESC
                    LIMIT ?
                ''', (manager_id, limit))
            else:
                cursor.execute('''
                    SELECT ci.*, c.contact_name, c.company_name
                    FROM client_interactions ci
                    LEFT JOIN clients c ON ci.client_id = c.id
                    ORDER BY ci.created_at DESC
                    LIMIT ?
                ''', (limit,))
            return [dict(row) for row in cursor.fetchall()]


# Расширяем CallbackDB
class CallbackDBExtended(CallbackDB):
    """Расширенные операции с заявками"""

    @staticmethod
    def assign_to(callback_id: int, manager_id: int) -> bool:
        """Назначить заявку менеджеру"""
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute(
                'UPDATE callbacks SET assigned_to = ?, status = ? WHERE id = ?',
                (manager_id, 'processing', callback_id)
            )
            return cursor.rowcount > 0

    @staticmethod
    def link_to_client(callback_id: int, client_id: int) -> bool:
        """Связать заявку с клиентом"""
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute(
                'UPDATE callbacks SET client_id = ? WHERE id = ?',
                (client_id, callback_id)
            )
            return cursor.rowcount > 0

    @staticmethod
    def get_all_extended(status: str = None, assigned_to: int = None) -> List[Dict]:
        """Получить все заявки с расширенной информацией"""
        import json
        with get_db() as conn:
            cursor = conn.cursor()
            query = '''
                SELECT cb.*, u.email as assigned_email, c.contact_name as client_name
                FROM callbacks cb
                LEFT JOIN users u ON cb.assigned_to = u.id
                LEFT JOIN clients c ON cb.client_id = c.id
                WHERE 1=1
            '''
            params = []

            if status:
                query += ' AND cb.status = ?'
                params.append(status)
            if assigned_to:
                query += ' AND cb.assigned_to = ?'
                params.append(assigned_to)

            query += ' ORDER BY cb.created_at DESC'
            cursor.execute(query, params)

            results = []
            for row in cursor.fetchall():
                item = dict(row)
                item['products'] = json.loads(item['products_json']) if item.get('products_json') else []
                if 'products_json' in item:
                    del item['products_json']
                results.append(item)
            return results

    @staticmethod
    def get_by_id(callback_id: int) -> Optional[Dict]:
        """Получить заявку по ID"""
        import json
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute('''
                SELECT cb.*, u.email as assigned_email
                FROM callbacks cb
                LEFT JOIN users u ON cb.assigned_to = u.id
                WHERE cb.id = ?
            ''', (callback_id,))
            row = cursor.fetchone()
            if row:
                item = dict(row)
                item['products'] = json.loads(item['products_json']) if item.get('products_json') else []
                if 'products_json' in item:
                    del item['products_json']
                return item
            return None

    @staticmethod
    def convert_to_client(callback_id: int, manager_id: int) -> Optional[int]:
        """Конвертировать заявку в клиента"""
        callback = CallbackDBExtended.get_by_id(callback_id)
        if not callback:
            return None

        client_data = {
            'contact_name': callback['contact_name'],
            'contact_phone': callback['contact_phone'],
            'contact_email': callback.get('contact_email'),
            'company_name': callback.get('company_name'),
            'inn': callback.get('company_inn'),
            'source': 'callback',
            'status': 'lead',
            'products': callback.get('products', []),
            'comment': callback.get('comment')
        }

        client_id = ClientDB.create(client_data, manager_id)

        # Связываем заявку с клиентом
        CallbackDBExtended.link_to_client(callback_id, client_id)

        # Добавляем запись в историю
        InteractionDB.create({
            'client_id': client_id,
            'manager_id': manager_id,
            'type': 'callback',
            'subject': 'Заявка с сайта',
            'description': f'Клиент создан из заявки #{callback_id}. Источник: {callback.get("source", "unknown")}',
            'callback_id': callback_id
        })

        return client_id


# Инициализация БД при импорте модуля
init_database()
