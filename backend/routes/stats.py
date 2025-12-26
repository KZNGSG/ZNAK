"""
API эндпоинты для статистики и аналитики
/api/admin/stats - статистика для админов
/api/employee/stats - статистика для сотрудников
/api/superadmin/stats - расширенная статистика
"""
from fastapi import APIRouter, Depends
from typing import Dict
import logging
from datetime import datetime, timedelta

from auth import require_admin, require_employee, require_superadmin
from database import get_db, ClientDB, QuoteDB, ContractDB

router = APIRouter(tags=["stats"])
logger = logging.getLogger(__name__)

# ======================== ADMIN STATS ========================

@router.get("/api/admin/stats")
async def get_admin_stats(user: Dict = Depends(require_admin)):
    """Получить статистику (админка)"""
    with get_db() as conn:
        cursor = conn.cursor()

        # Количество пользователей
        cursor.execute('SELECT COUNT(*) as cnt FROM users')
        users_count = cursor.fetchone()['cnt']

        # Количество компаний
        cursor.execute('SELECT COUNT(*) as cnt FROM companies')
        companies_count = cursor.fetchone()['cnt']

        # Всего заявок
        cursor.execute('SELECT COUNT(*) as cnt FROM callbacks')
        total_callbacks = cursor.fetchone()['cnt']

        # Количество новых заявок
        cursor.execute("SELECT COUNT(*) as cnt FROM callbacks WHERE status = 'new'")
        new_callbacks = cursor.fetchone()['cnt']

        # Последние 5 заявок
        cursor.execute('''
            SELECT id, contact_name as name, contact_phone as phone, status, created_at
            FROM callbacks
            ORDER BY created_at DESC
            LIMIT 5
        ''')
        recent_callbacks = [dict(row) for row in cursor.fetchall()]

    return {
        "total_users": users_count,
        "total_companies": companies_count,
        "total_callbacks": total_callbacks,
        "pending_callbacks": new_callbacks,
        "recent_callbacks": recent_callbacks
    }


# ======================== EMPLOYEE STATS ========================

@router.get("/api/employee/stats")
async def get_employee_stats(user: Dict = Depends(require_employee)):
    """Статистика для Employee Dashboard"""
    with get_db() as conn:
        cursor = conn.cursor()

        # Новые заявки
        cursor.execute("SELECT COUNT(*) as cnt FROM callbacks WHERE status = 'new'")
        new_callbacks = cursor.fetchone()['cnt']

        # Заявки в работе
        cursor.execute("SELECT COUNT(*) as cnt FROM callbacks WHERE status = 'processing'")
        processing_callbacks = cursor.fetchone()['cnt']

        # Всего клиентов
        client_stats = ClientDB.get_stats()

        # Последние заявки
        cursor.execute('''
            SELECT id, contact_name, contact_phone, contact_email, company_name,
                   status, source, created_at
            FROM callbacks
            ORDER BY created_at DESC
            LIMIT 10
        ''')
        recent_callbacks = [dict(row) for row in cursor.fetchall()]

    # Статистика КП и Договоров
    quote_stats = QuoteDB.get_stats()
    contract_stats = ContractDB.get_stats()

    return {
        "new_callbacks": new_callbacks,
        "processing_callbacks": processing_callbacks,
        "clients": client_stats,
        "quotes": quote_stats,
        "contracts": contract_stats,
        "recent_callbacks": recent_callbacks
    }


# ======================== SUPERADMIN STATS ========================

@router.get("/api/superadmin/stats")
async def get_superadmin_stats(
    period: str = "week",
    user: Dict = Depends(require_superadmin)
):
    """Расширенная статистика для Superadmin Dashboard"""
    
    # Определяем текущий и предыдущий периоды для сравнения
    now = datetime.now()
    if period == "day":
        start_date = now.replace(hour=0, minute=0, second=0, microsecond=0)
        prev_start = start_date - timedelta(days=1)
        prev_end = start_date
    elif period == "week":
        start_date = now - timedelta(days=7)
        prev_start = now - timedelta(days=14)
        prev_end = start_date
    elif period == "month":
        start_date = now - timedelta(days=30)
        prev_start = now - timedelta(days=60)
        prev_end = start_date
    else:
        start_date = now - timedelta(days=7)
        prev_start = now - timedelta(days=14)
        prev_end = start_date

    start_str = start_date.strftime('%Y-%m-%d %H:%M:%S')
    prev_start_str = prev_start.strftime('%Y-%m-%d %H:%M:%S')
    prev_end_str = prev_end.strftime('%Y-%m-%d %H:%M:%S')

    with get_db() as conn:
        cursor = conn.cursor()

        # === ЗАЯВКИ ===
        cursor.execute("SELECT COUNT(*) as cnt FROM callbacks WHERE status = 'new'")
        new_callbacks = cursor.fetchone()['cnt']

        cursor.execute("SELECT COUNT(*) as cnt FROM callbacks WHERE status = 'processing'")
        processing_callbacks = cursor.fetchone()['cnt']

        cursor.execute("SELECT COUNT(*) as cnt FROM callbacks WHERE created_at >= ?", (start_str,))
        period_callbacks = cursor.fetchone()['cnt']

        cursor.execute("SELECT COUNT(*) as cnt FROM callbacks WHERE created_at >= ? AND created_at < ?",
                      (prev_start_str, prev_end_str))
        prev_period_callbacks = cursor.fetchone()['cnt']

        cursor.execute("SELECT COUNT(*) as cnt FROM callbacks")
        total_callbacks = cursor.fetchone()['cnt']

        # === КЛИЕНТЫ ===
        cursor.execute('''
            SELECT
                COUNT(*) as total,
                SUM(CASE WHEN status = 'lead' THEN 1 ELSE 0 END) as leads,
                SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active,
                SUM(CASE WHEN status = 'regular' THEN 1 ELSE 0 END) as regular,
                SUM(CASE WHEN status = 'inactive' THEN 1 ELSE 0 END) as inactive
            FROM clients
        ''')
        client_stats = dict(cursor.fetchone())

        cursor.execute("SELECT COUNT(*) as cnt FROM clients WHERE created_at >= ?", (start_str,))
        period_clients = cursor.fetchone()['cnt']

        cursor.execute("SELECT COUNT(*) as cnt FROM clients WHERE created_at >= ? AND created_at < ?",
                      (prev_start_str, prev_end_str))
        prev_period_clients = cursor.fetchone()['cnt']

        # === КОММЕРЧЕСКИЕ ПРЕДЛОЖЕНИЯ ===
        cursor.execute('''
            SELECT
                COUNT(*) as total,
                SUM(CASE WHEN status = 'draft' THEN 1 ELSE 0 END) as drafts,
                SUM(CASE WHEN status = 'sent' THEN 1 ELSE 0 END) as sent,
                SUM(CASE WHEN status = 'accepted' THEN 1 ELSE 0 END) as accepted,
                SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) as rejected
            FROM quotes
        ''')
        quote_stats = dict(cursor.fetchone())

        cursor.execute("SELECT COUNT(*) as cnt FROM quotes WHERE created_at >= ?", (start_str,))
        period_quotes = cursor.fetchone()['cnt']

        cursor.execute("SELECT COUNT(*) as cnt FROM quotes WHERE created_at >= ? AND created_at < ?",
                      (prev_start_str, prev_end_str))
        prev_period_quotes = cursor.fetchone()['cnt']

        # === ДОГОВОРЫ ===
        cursor.execute('''
            SELECT
                COUNT(*) as total,
                SUM(CASE WHEN status = 'draft' THEN 1 ELSE 0 END) as drafts,
                SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active,
                SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
                SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled,
                COALESCE(SUM(total_amount), 0) as total_revenue,
                COALESCE(SUM(paid_amount), 0) as total_paid
            FROM contracts
        ''')
        contract_stats = dict(cursor.fetchone())

        cursor.execute("SELECT COUNT(*) as cnt FROM contracts WHERE created_at >= ?", (start_str,))
        period_contracts = cursor.fetchone()['cnt']

        cursor.execute("SELECT COUNT(*) as cnt FROM contracts WHERE created_at >= ? AND created_at < ?",
                      (prev_start_str, prev_end_str))
        prev_period_contracts = cursor.fetchone()['cnt']

        # Выручка за период
        cursor.execute("SELECT COALESCE(SUM(total_amount), 0) as revenue FROM contracts WHERE created_at >= ?", 
                      (start_str,))
        period_revenue = cursor.fetchone()['revenue']

        cursor.execute("SELECT COALESCE(SUM(total_amount), 0) as revenue FROM contracts WHERE created_at >= ? AND created_at < ?",
                      (prev_start_str, prev_end_str))
        prev_period_revenue = cursor.fetchone()['revenue']

        # === ПАРТНЁРЫ ===
        cursor.execute('''
            SELECT
                COUNT(*) as total,
                SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active,
                SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
                SUM(CASE WHEN status = 'inactive' THEN 1 ELSE 0 END) as inactive
            FROM partners
        ''')
        partner_stats = dict(cursor.fetchone())

        # === ПОЛЬЗОВАТЕЛИ ===
        cursor.execute("SELECT COUNT(*) as cnt FROM users")
        total_users = cursor.fetchone()['cnt']

        cursor.execute("SELECT COUNT(*) as cnt FROM users WHERE is_active = 1")
        active_users = cursor.fetchone()['cnt']

    # Вычисляем изменения
    def calc_change(current, previous):
        if previous == 0:
            return 100 if current > 0 else 0
        return round(((current - previous) / previous) * 100, 2)

    return {
        "period": period,
        "callbacks": {
            "new": new_callbacks,
            "processing": processing_callbacks,
            "total": total_callbacks,
            "period_count": period_callbacks,
            "change": calc_change(period_callbacks, prev_period_callbacks)
        },
        "clients": {
            **client_stats,
            "period_count": period_clients,
            "change": calc_change(period_clients, prev_period_clients)
        },
        "quotes": {
            **quote_stats,
            "period_count": period_quotes,
            "change": calc_change(period_quotes, prev_period_quotes)
        },
        "contracts": {
            **contract_stats,
            "period_count": period_contracts,
            "change": calc_change(period_contracts, prev_period_contracts),
            "period_revenue": period_revenue,
            "revenue_change": calc_change(period_revenue, prev_period_revenue)
        },
        "partners": partner_stats,
        "users": {
            "total": total_users,
            "active": active_users
        }
    }


# ======================== DASHBOARD STATS ========================

@router.get("/api/stats/dashboard")
async def get_dashboard_stats(user: Dict = Depends(require_employee)):
    """Общая статистика для дашборда"""
    with get_db() as conn:
        cursor = conn.cursor()
        
        # Основные метрики
        cursor.execute("SELECT COUNT(*) FROM callbacks WHERE status = 'new'")
        new_callbacks = cursor.fetchone()[0]
        
        cursor.execute("SELECT COUNT(*) FROM clients")
        total_clients = cursor.fetchone()[0]
        
        cursor.execute("SELECT COUNT(*) FROM quotes WHERE status = 'sent'")
        active_quotes = cursor.fetchone()[0]
        
        cursor.execute("SELECT COUNT(*) FROM contracts WHERE status = 'active'")
        active_contracts = cursor.fetchone()[0]
        
        cursor.execute("SELECT COALESCE(SUM(total_amount), 0) FROM contracts WHERE status IN ('active', 'completed')")
        total_revenue = cursor.fetchone()[0]
        
        cursor.execute("SELECT COALESCE(SUM(paid_amount), 0) FROM contracts")
        paid_revenue = cursor.fetchone()[0]
        
        # Активность за последние 7 дней
        week_ago = (datetime.now() - timedelta(days=7)).strftime('%Y-%m-%d')
        
        cursor.execute("SELECT COUNT(*) FROM callbacks WHERE created_at >= ?", (week_ago,))
        week_callbacks = cursor.fetchone()[0]
        
        cursor.execute("SELECT COUNT(*) FROM clients WHERE created_at >= ?", (week_ago,))
        week_clients = cursor.fetchone()[0]
        
        cursor.execute("SELECT COUNT(*) FROM contracts WHERE created_at >= ?", (week_ago,))
        week_contracts = cursor.fetchone()[0]
        
        return {
            "new_callbacks": new_callbacks,
            "total_clients": total_clients,
            "active_quotes": active_quotes,
            "active_contracts": active_contracts,
            "total_revenue": total_revenue,
            "paid_revenue": paid_revenue,
            "unpaid_revenue": total_revenue - paid_revenue,
            "week_activity": {
                "callbacks": week_callbacks,
                "clients": week_clients,
                "contracts": week_contracts
            }
        }


# ======================== TNVED STATS ========================

@router.get("/api/tnved/stats")
async def get_tnved_stats(user: Dict = Depends(require_employee)):
    """Статистика по поиску ТН ВЭД кодов"""
    with get_db() as conn:
        cursor = conn.cursor()
        
        # Всего поисков
        cursor.execute("SELECT COUNT(*) FROM tnved_searches")
        total_searches = cursor.fetchone()[0]
        
        # Поиски за последние 30 дней
        month_ago = (datetime.now() - timedelta(days=30)).strftime('%Y-%m-%d')
        cursor.execute("SELECT COUNT(*) FROM tnved_searches WHERE created_at >= ?", (month_ago,))
        month_searches = cursor.fetchone()[0]
        
        # Популярные запросы
        cursor.execute("""
            SELECT query, COUNT(*) as count
            FROM tnved_searches
            GROUP BY query
            ORDER BY count DESC
            LIMIT 10
        """)
        popular_queries = [dict(row) for row in cursor.fetchall()]
        
        return {
            "total_searches": total_searches,
            "month_searches": month_searches,
            "popular_queries": popular_queries
        }


# ======================== EMAIL STATS ========================

@router.get("/api/email/stats")
async def get_email_stats(user: Dict = Depends(require_admin)):
    """Статистика по email рассылкам"""
    with get_db() as conn:
        cursor = conn.cursor()
        
        # Всего отправлено
        cursor.execute("SELECT COUNT(*) FROM email_logs")
        total_sent = cursor.fetchone()[0]
        
        # Успешно доставлено
        cursor.execute("SELECT COUNT(*) FROM email_logs WHERE status = 'delivered'")
        delivered = cursor.fetchone()[0]
        
        # Ошибки
        cursor.execute("SELECT COUNT(*) FROM email_logs WHERE status = 'failed'")
        failed = cursor.fetchone()[0]
        
        # За последние 7 дней
        week_ago = (datetime.now() - timedelta(days=7)).strftime('%Y-%m-%d')
        cursor.execute("SELECT COUNT(*) FROM email_logs WHERE created_at >= ?", (week_ago,))
        week_sent = cursor.fetchone()[0]
        
        return {
            "total_sent": total_sent,
            "delivered": delivered,
            "failed": failed,
            "delivery_rate": round((delivered / total_sent * 100) if total_sent > 0 else 0, 2),
            "week_sent": week_sent
        }
