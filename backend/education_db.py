# -*- coding: utf-8 -*-
"""
Модуль обучения для Про.Маркируй
Таблицы БД: курсы, главы, тесты, прогресс партнёров
"""

# ======================== ТАБЛИЦЫ ДЛЯ ДОБАВЛЕНИЯ В database.py ========================

EDUCATION_TABLES_SQL = '''
-- Курсы обучения
CREATE TABLE IF NOT EXISTS courses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,                    -- "Основы маркировки"
    description TEXT,                       -- Описание курса
    cover_url TEXT,                         -- URL обложки
    price REAL DEFAULT 0,                   -- Цена курса (0 = бесплатный)
    is_active BOOLEAN DEFAULT 1,            -- Активен ли курс
    sort_order INTEGER DEFAULT 0,           -- Порядок сортировки
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Главы курса
CREATE TABLE IF NOT EXISTS course_chapters (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    course_id INTEGER NOT NULL,
    title TEXT NOT NULL,                    -- "Глава 1: Введение"
    description TEXT,                       -- Краткое описание главы
    video_url TEXT,                         -- URL видео (YouTube/VK)
    video_duration INTEGER,                 -- Длительность в секундах
    content_html TEXT,                      -- Дополнительный текст/материалы
    sort_order INTEGER DEFAULT 0,           -- Порядок в курсе
    is_active BOOLEAN DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
);

-- Тесты к главам
CREATE TABLE IF NOT EXISTS chapter_tests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    chapter_id INTEGER NOT NULL,
    title TEXT DEFAULT 'Тест по главе',
    passing_score INTEGER DEFAULT 80,       -- Проходной балл в %
    max_attempts INTEGER DEFAULT 3,         -- Макс. попыток (0 = безлимит)
    questions_json TEXT NOT NULL,           -- JSON с вопросами
    -- Формат questions_json:
    -- [
    --   {
    --     "id": 1,
    --     "question": "Что такое маркировка?",
    --     "type": "single",  // single, multiple
    --     "options": ["Вариант 1", "Вариант 2", "Вариант 3", "Вариант 4"],
    --     "correct": [0],    // Индексы правильных ответов
    --     "explanation": "Пояснение к ответу"
    --   }
    -- ]
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (chapter_id) REFERENCES course_chapters(id) ON DELETE CASCADE
);

-- Прогресс партнёра по курсу
CREATE TABLE IF NOT EXISTS partner_course_progress (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    partner_id INTEGER NOT NULL,
    course_id INTEGER NOT NULL,
    status TEXT DEFAULT 'not_started',      -- not_started, in_progress, completed
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    certificate_url TEXT,                   -- URL сертификата PDF
    certificate_number TEXT,                -- Номер сертификата
    UNIQUE(partner_id, course_id),
    FOREIGN KEY (partner_id) REFERENCES partners(id) ON DELETE CASCADE,
    FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
);

-- Прогресс партнёра по главам
CREATE TABLE IF NOT EXISTS partner_chapter_progress (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    partner_id INTEGER NOT NULL,
    chapter_id INTEGER NOT NULL,
    status TEXT DEFAULT 'locked',           -- locked, available, in_progress, completed
    video_watched BOOLEAN DEFAULT 0,        -- Просмотрел ли видео
    video_progress INTEGER DEFAULT 0,       -- Прогресс видео в секундах
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    UNIQUE(partner_id, chapter_id),
    FOREIGN KEY (partner_id) REFERENCES partners(id) ON DELETE CASCADE,
    FOREIGN KEY (chapter_id) REFERENCES course_chapters(id) ON DELETE CASCADE
);

-- Попытки прохождения тестов
CREATE TABLE IF NOT EXISTS partner_test_attempts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    partner_id INTEGER NOT NULL,
    test_id INTEGER NOT NULL,
    attempt_number INTEGER DEFAULT 1,
    answers_json TEXT NOT NULL,             -- JSON с ответами партнёра
    score INTEGER NOT NULL,                 -- Набранный балл в %
    passed BOOLEAN DEFAULT 0,
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    finished_at TIMESTAMP,
    FOREIGN KEY (partner_id) REFERENCES partners(id) ON DELETE CASCADE,
    FOREIGN KEY (test_id) REFERENCES chapter_tests(id) ON DELETE CASCADE
);

-- Доступы партнёров к курсам (для платных курсов)
CREATE TABLE IF NOT EXISTS partner_course_access (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    partner_id INTEGER NOT NULL,
    course_id INTEGER NOT NULL,
    granted_by INTEGER,                     -- Кто дал доступ (admin user_id)
    granted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP,                   -- NULL = бессрочно
    payment_id TEXT,                        -- ID платежа если оплачено
    UNIQUE(partner_id, course_id),
    FOREIGN KEY (partner_id) REFERENCES partners(id) ON DELETE CASCADE,
    FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
);

-- Индексы для быстрого поиска
CREATE INDEX IF NOT EXISTS idx_partner_course_progress ON partner_course_progress(partner_id, course_id);
CREATE INDEX IF NOT EXISTS idx_partner_chapter_progress ON partner_chapter_progress(partner_id, chapter_id);
CREATE INDEX IF NOT EXISTS idx_partner_test_attempts ON partner_test_attempts(partner_id, test_id);
'''


# ======================== ФУНКЦИИ ДЛЯ РАБОТЫ С ОБУЧЕНИЕМ ========================

class EducationDB:
    """Класс для работы с обучением в БД"""

    @staticmethod
    def init_tables(conn):
        """Создать таблицы обучения"""
        cursor = conn.cursor()
        cursor.executescript(EDUCATION_TABLES_SQL)
        conn.commit()

    # ========== КУРСЫ ==========

    @staticmethod
    def get_all_courses(conn, include_inactive=False):
        """Получить все курсы"""
        cursor = conn.cursor()
        if include_inactive:
            cursor.execute('''
                SELECT c.*,
                    (SELECT COUNT(*) FROM course_chapters WHERE course_id = c.id) as chapters_count
                FROM courses c
                ORDER BY c.sort_order, c.id
            ''')
        else:
            cursor.execute('''
                SELECT c.*,
                    (SELECT COUNT(*) FROM course_chapters WHERE course_id = c.id AND is_active = 1) as chapters_count
                FROM courses c
                WHERE c.is_active = 1
                ORDER BY c.sort_order, c.id
            ''')
        return [dict(row) for row in cursor.fetchall()]

    @staticmethod
    def get_course(conn, course_id):
        """Получить курс по ID"""
        cursor = conn.cursor()
        cursor.execute('SELECT * FROM courses WHERE id = ?', (course_id,))
        row = cursor.fetchone()
        return dict(row) if row else None

    @staticmethod
    def create_course(conn, title, description=None, cover_url=None, price=0):
        """Создать курс"""
        cursor = conn.cursor()
        cursor.execute('''
            INSERT INTO courses (title, description, cover_url, price)
            VALUES (?, ?, ?, ?)
        ''', (title, description, cover_url, price))
        conn.commit()
        return cursor.lastrowid

    @staticmethod
    def update_course(conn, course_id, **kwargs):
        """Обновить курс"""
        allowed = ['title', 'description', 'cover_url', 'price', 'is_active', 'sort_order']
        updates = {k: v for k, v in kwargs.items() if k in allowed}
        if not updates:
            return False

        set_clause = ', '.join([f"{k} = ?" for k in updates.keys()])
        values = list(updates.values()) + [course_id]

        cursor = conn.cursor()
        cursor.execute(f'UPDATE courses SET {set_clause}, updated_at = CURRENT_TIMESTAMP WHERE id = ?', values)
        conn.commit()
        return cursor.rowcount > 0

    # ========== ГЛАВЫ ==========

    @staticmethod
    def get_course_chapters(conn, course_id, include_inactive=False):
        """Получить главы курса"""
        cursor = conn.cursor()
        if include_inactive:
            cursor.execute('''
                SELECT ch.*,
                    (SELECT COUNT(*) FROM chapter_tests WHERE chapter_id = ch.id) as has_test
                FROM course_chapters ch
                WHERE ch.course_id = ?
                ORDER BY ch.sort_order, ch.id
            ''', (course_id,))
        else:
            cursor.execute('''
                SELECT ch.*,
                    (SELECT COUNT(*) FROM chapter_tests WHERE chapter_id = ch.id) as has_test
                FROM course_chapters ch
                WHERE ch.course_id = ? AND ch.is_active = 1
                ORDER BY ch.sort_order, ch.id
            ''', (course_id,))
        return [dict(row) for row in cursor.fetchall()]

    @staticmethod
    def get_chapter(conn, chapter_id):
        """Получить главу по ID"""
        cursor = conn.cursor()
        cursor.execute('SELECT * FROM course_chapters WHERE id = ?', (chapter_id,))
        row = cursor.fetchone()
        return dict(row) if row else None

    @staticmethod
    def create_chapter(conn, course_id, title, description=None, video_url=None, video_duration=None, content_html=None):
        """Создать главу"""
        cursor = conn.cursor()
        # Определяем порядок
        cursor.execute('SELECT COALESCE(MAX(sort_order), 0) + 1 FROM course_chapters WHERE course_id = ?', (course_id,))
        sort_order = cursor.fetchone()[0]

        cursor.execute('''
            INSERT INTO course_chapters (course_id, title, description, video_url, video_duration, content_html, sort_order)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        ''', (course_id, title, description, video_url, video_duration, content_html, sort_order))
        conn.commit()
        return cursor.lastrowid

    @staticmethod
    def update_chapter(conn, chapter_id, **kwargs):
        """Обновить главу"""
        allowed = ['title', 'description', 'video_url', 'video_duration', 'content_html', 'sort_order', 'is_active']
        updates = {k: v for k, v in kwargs.items() if k in allowed}
        if not updates:
            return False

        set_clause = ', '.join([f"{k} = ?" for k in updates.keys()])
        values = list(updates.values()) + [chapter_id]

        cursor = conn.cursor()
        cursor.execute(f'UPDATE course_chapters SET {set_clause} WHERE id = ?', values)
        conn.commit()
        return cursor.rowcount > 0

    @staticmethod
    def delete_chapter(conn, chapter_id):
        """Удалить главу"""
        cursor = conn.cursor()
        cursor.execute('DELETE FROM course_chapters WHERE id = ?', (chapter_id,))
        conn.commit()
        return cursor.rowcount > 0

    # ========== ТЕСТЫ ==========

    @staticmethod
    def get_chapter_test(conn, chapter_id):
        """Получить тест главы"""
        cursor = conn.cursor()
        cursor.execute('SELECT * FROM chapter_tests WHERE chapter_id = ?', (chapter_id,))
        row = cursor.fetchone()
        return dict(row) if row else None

    @staticmethod
    def create_or_update_test(conn, chapter_id, questions_json, passing_score=80, max_attempts=3, title='Тест по главе'):
        """Создать или обновить тест"""
        cursor = conn.cursor()

        # Проверяем есть ли уже тест
        cursor.execute('SELECT id FROM chapter_tests WHERE chapter_id = ?', (chapter_id,))
        existing = cursor.fetchone()

        if existing:
            cursor.execute('''
                UPDATE chapter_tests
                SET questions_json = ?, passing_score = ?, max_attempts = ?, title = ?
                WHERE chapter_id = ?
            ''', (questions_json, passing_score, max_attempts, title, chapter_id))
        else:
            cursor.execute('''
                INSERT INTO chapter_tests (chapter_id, questions_json, passing_score, max_attempts, title)
                VALUES (?, ?, ?, ?, ?)
            ''', (chapter_id, questions_json, passing_score, max_attempts, title))

        conn.commit()
        return cursor.lastrowid if not existing else existing[0]

    # ========== ПРОГРЕСС ПАРТНЁРА ==========

    @staticmethod
    def get_partner_courses(conn, partner_id):
        """Получить курсы партнёра с прогрессом"""
        cursor = conn.cursor()
        cursor.execute('''
            SELECT
                c.*,
                COALESCE(pcp.status, 'not_started') as progress_status,
                pcp.started_at,
                pcp.completed_at,
                pcp.certificate_url,
                pcp.certificate_number,
                (SELECT COUNT(*) FROM course_chapters WHERE course_id = c.id AND is_active = 1) as total_chapters,
                (SELECT COUNT(*) FROM partner_chapter_progress pchp
                 JOIN course_chapters ch ON pchp.chapter_id = ch.id
                 WHERE pchp.partner_id = ? AND ch.course_id = c.id AND pchp.status = 'completed') as completed_chapters,
                CASE
                    WHEN pca.id IS NOT NULL OR c.price = 0 THEN 1
                    ELSE 0
                END as has_access
            FROM courses c
            LEFT JOIN partner_course_progress pcp ON pcp.course_id = c.id AND pcp.partner_id = ?
            LEFT JOIN partner_course_access pca ON pca.course_id = c.id AND pca.partner_id = ?
                AND (pca.expires_at IS NULL OR pca.expires_at > CURRENT_TIMESTAMP)
            WHERE c.is_active = 1
            ORDER BY c.sort_order, c.id
        ''', (partner_id, partner_id, partner_id))
        return [dict(row) for row in cursor.fetchall()]

    @staticmethod
    def get_partner_course_detail(conn, partner_id, course_id):
        """Получить детали курса для партнёра с главами и прогрессом"""
        cursor = conn.cursor()

        # Курс
        cursor.execute('''
            SELECT
                c.*,
                COALESCE(pcp.status, 'not_started') as progress_status,
                pcp.started_at,
                pcp.completed_at,
                pcp.certificate_url,
                pcp.certificate_number,
                CASE
                    WHEN pca.id IS NOT NULL OR c.price = 0 THEN 1
                    ELSE 0
                END as has_access
            FROM courses c
            LEFT JOIN partner_course_progress pcp ON pcp.course_id = c.id AND pcp.partner_id = ?
            LEFT JOIN partner_course_access pca ON pca.course_id = c.id AND pca.partner_id = ?
                AND (pca.expires_at IS NULL OR pca.expires_at > CURRENT_TIMESTAMP)
            WHERE c.id = ?
        ''', (partner_id, partner_id, course_id))

        course_row = cursor.fetchone()
        if not course_row:
            return None

        course = dict(course_row)

        # Главы с прогрессом
        cursor.execute('''
            SELECT
                ch.*,
                COALESCE(pchp.status, 'locked') as progress_status,
                pchp.video_watched,
                pchp.video_progress,
                pchp.started_at,
                pchp.completed_at,
                (SELECT COUNT(*) FROM chapter_tests WHERE chapter_id = ch.id) as has_test,
                (SELECT MAX(passed) FROM partner_test_attempts pta
                 JOIN chapter_tests ct ON pta.test_id = ct.id
                 WHERE ct.chapter_id = ch.id AND pta.partner_id = ?) as test_passed
            FROM course_chapters ch
            LEFT JOIN partner_chapter_progress pchp ON pchp.chapter_id = ch.id AND pchp.partner_id = ?
            WHERE ch.course_id = ? AND ch.is_active = 1
            ORDER BY ch.sort_order, ch.id
        ''', (partner_id, partner_id, course_id))

        chapters = [dict(row) for row in cursor.fetchall()]

        # Разблокируем первую главу если курс доступен
        if course['has_access'] and chapters:
            if chapters[0]['progress_status'] == 'locked':
                chapters[0]['progress_status'] = 'available'

            # Разблокируем следующие главы если предыдущие завершены
            for i in range(1, len(chapters)):
                if chapters[i-1]['progress_status'] == 'completed' and chapters[i]['progress_status'] == 'locked':
                    chapters[i]['progress_status'] = 'available'

        course['chapters'] = chapters
        return course

    @staticmethod
    def start_chapter(conn, partner_id, chapter_id):
        """Начать главу"""
        cursor = conn.cursor()

        # Проверяем есть ли уже запись
        cursor.execute('SELECT id FROM partner_chapter_progress WHERE partner_id = ? AND chapter_id = ?',
                      (partner_id, chapter_id))
        existing = cursor.fetchone()

        if existing:
            cursor.execute('''
                UPDATE partner_chapter_progress
                SET status = 'in_progress', started_at = COALESCE(started_at, CURRENT_TIMESTAMP)
                WHERE partner_id = ? AND chapter_id = ?
            ''', (partner_id, chapter_id))
        else:
            cursor.execute('''
                INSERT INTO partner_chapter_progress (partner_id, chapter_id, status, started_at)
                VALUES (?, ?, 'in_progress', CURRENT_TIMESTAMP)
            ''', (partner_id, chapter_id))

        # Также обновляем прогресс курса
        chapter = EducationDB.get_chapter(conn, chapter_id)
        if chapter:
            cursor.execute('SELECT id FROM partner_course_progress WHERE partner_id = ? AND course_id = ?',
                          (partner_id, chapter['course_id']))
            if not cursor.fetchone():
                cursor.execute('''
                    INSERT INTO partner_course_progress (partner_id, course_id, status, started_at)
                    VALUES (?, ?, 'in_progress', CURRENT_TIMESTAMP)
                ''', (partner_id, chapter['course_id']))
            else:
                cursor.execute('''
                    UPDATE partner_course_progress
                    SET status = 'in_progress', started_at = COALESCE(started_at, CURRENT_TIMESTAMP)
                    WHERE partner_id = ? AND course_id = ? AND status = 'not_started'
                ''', (partner_id, chapter['course_id']))

        conn.commit()
        return True

    @staticmethod
    def update_video_progress(conn, partner_id, chapter_id, progress_seconds, watched=False):
        """Обновить прогресс просмотра видео"""
        cursor = conn.cursor()
        cursor.execute('''
            UPDATE partner_chapter_progress
            SET video_progress = ?, video_watched = ?
            WHERE partner_id = ? AND chapter_id = ?
        ''', (progress_seconds, 1 if watched else 0, partner_id, chapter_id))
        conn.commit()
        return cursor.rowcount > 0

    @staticmethod
    def complete_chapter(conn, partner_id, chapter_id):
        """Завершить главу"""
        cursor = conn.cursor()
        cursor.execute('''
            UPDATE partner_chapter_progress
            SET status = 'completed', completed_at = CURRENT_TIMESTAMP
            WHERE partner_id = ? AND chapter_id = ?
        ''', (partner_id, chapter_id))

        # Проверяем не завершён ли весь курс
        chapter = EducationDB.get_chapter(conn, chapter_id)
        if chapter:
            cursor.execute('''
                SELECT COUNT(*) as total,
                    SUM(CASE WHEN pchp.status = 'completed' THEN 1 ELSE 0 END) as completed
                FROM course_chapters ch
                LEFT JOIN partner_chapter_progress pchp ON pchp.chapter_id = ch.id AND pchp.partner_id = ?
                WHERE ch.course_id = ? AND ch.is_active = 1
            ''', (partner_id, chapter['course_id']))

            row = cursor.fetchone()
            if row and row['total'] == row['completed']:
                # Курс завершён!
                cursor.execute('''
                    UPDATE partner_course_progress
                    SET status = 'completed', completed_at = CURRENT_TIMESTAMP
                    WHERE partner_id = ? AND course_id = ?
                ''', (partner_id, chapter['course_id']))

        conn.commit()
        return True

    # ========== ТЕСТЫ ПАРТНЁРА ==========

    @staticmethod
    def get_partner_test_attempts(conn, partner_id, test_id):
        """Получить попытки партнёра по тесту"""
        cursor = conn.cursor()
        cursor.execute('''
            SELECT * FROM partner_test_attempts
            WHERE partner_id = ? AND test_id = ?
            ORDER BY attempt_number DESC
        ''', (partner_id, test_id))
        return [dict(row) for row in cursor.fetchall()]

    @staticmethod
    def submit_test(conn, partner_id, test_id, answers_json):
        """Сдать тест"""
        import json
        cursor = conn.cursor()

        # Получаем тест
        cursor.execute('SELECT * FROM chapter_tests WHERE id = ?', (test_id,))
        test_row = cursor.fetchone()
        if not test_row:
            return None

        test = dict(test_row)
        questions = json.loads(test['questions_json'])
        answers = json.loads(answers_json) if isinstance(answers_json, str) else answers_json

        # Проверяем количество попыток
        cursor.execute('''
            SELECT COUNT(*) FROM partner_test_attempts
            WHERE partner_id = ? AND test_id = ?
        ''', (partner_id, test_id))
        attempts_count = cursor.fetchone()[0]

        if test['max_attempts'] > 0 and attempts_count >= test['max_attempts']:
            return {'error': 'Превышено максимальное количество попыток'}

        # Считаем результат
        correct = 0
        total = len(questions)

        for q in questions:
            q_id = str(q['id'])
            if q_id in answers:
                user_answer = answers[q_id]
                if isinstance(user_answer, list):
                    if set(user_answer) == set(q['correct']):
                        correct += 1
                else:
                    if user_answer in q['correct']:
                        correct += 1

        score = int((correct / total) * 100) if total > 0 else 0
        passed = score >= test['passing_score']

        # Сохраняем попытку
        cursor.execute('''
            INSERT INTO partner_test_attempts (partner_id, test_id, attempt_number, answers_json, score, passed, finished_at)
            VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        ''', (partner_id, test_id, attempts_count + 1, json.dumps(answers), score, passed))

        # Если сдал - завершаем главу
        if passed:
            cursor.execute('SELECT chapter_id FROM chapter_tests WHERE id = ?', (test_id,))
            chapter_id = cursor.fetchone()[0]
            conn.commit()
            EducationDB.complete_chapter(conn, partner_id, chapter_id)
        else:
            conn.commit()

        return {
            'score': score,
            'passed': passed,
            'correct': correct,
            'total': total,
            'passing_score': test['passing_score'],
            'attempts_left': test['max_attempts'] - attempts_count - 1 if test['max_attempts'] > 0 else -1
        }

    # ========== ДОСТУП К КУРСАМ ==========

    @staticmethod
    def grant_course_access(conn, partner_id, course_id, granted_by=None, expires_at=None, payment_id=None):
        """Выдать доступ к курсу"""
        cursor = conn.cursor()
        cursor.execute('''
            INSERT OR REPLACE INTO partner_course_access (partner_id, course_id, granted_by, expires_at, payment_id)
            VALUES (?, ?, ?, ?, ?)
        ''', (partner_id, course_id, granted_by, expires_at, payment_id))
        conn.commit()
        return True

    @staticmethod
    def revoke_course_access(conn, partner_id, course_id):
        """Отозвать доступ к курсу"""
        cursor = conn.cursor()
        cursor.execute('DELETE FROM partner_course_access WHERE partner_id = ? AND course_id = ?',
                      (partner_id, course_id))
        conn.commit()
        return cursor.rowcount > 0

    # ========== СТАТИСТИКА ДЛЯ АДМИНКИ ==========

    @staticmethod
    def get_education_stats(conn):
        """Общая статистика по обучению"""
        cursor = conn.cursor()

        stats = {}

        # Всего курсов
        cursor.execute('SELECT COUNT(*) FROM courses WHERE is_active = 1')
        stats['total_courses'] = cursor.fetchone()[0]

        # Всего глав
        cursor.execute('SELECT COUNT(*) FROM course_chapters WHERE is_active = 1')
        stats['total_chapters'] = cursor.fetchone()[0]

        # Партнёров обучается
        cursor.execute("SELECT COUNT(DISTINCT partner_id) FROM partner_course_progress WHERE status = 'in_progress'")
        stats['partners_learning'] = cursor.fetchone()[0]

        # Партнёров завершили
        cursor.execute("SELECT COUNT(DISTINCT partner_id) FROM partner_course_progress WHERE status = 'completed'")
        stats['partners_completed'] = cursor.fetchone()[0]

        # Средний прогресс
        cursor.execute('''
            SELECT AVG(progress) FROM (
                SELECT partner_id,
                    CAST(SUM(CASE WHEN pchp.status = 'completed' THEN 1 ELSE 0 END) AS FLOAT) /
                    NULLIF(COUNT(*), 0) * 100 as progress
                FROM partner_chapter_progress pchp
                GROUP BY partner_id
            )
        ''')
        avg = cursor.fetchone()[0]
        stats['average_progress'] = round(avg, 1) if avg else 0

        return stats

    @staticmethod
    def get_partners_progress(conn, course_id=None):
        """Прогресс партнёров по обучению"""
        cursor = conn.cursor()

        query = '''
            SELECT
                p.id as partner_id,
                p.company_name,
                p.contact_name,
                p.contact_email,
                c.id as course_id,
                c.title as course_title,
                pcp.status as course_status,
                pcp.started_at,
                pcp.completed_at,
                pcp.certificate_number,
                (SELECT COUNT(*) FROM course_chapters WHERE course_id = c.id AND is_active = 1) as total_chapters,
                (SELECT COUNT(*) FROM partner_chapter_progress pchp
                 JOIN course_chapters ch ON pchp.chapter_id = ch.id
                 WHERE pchp.partner_id = p.id AND ch.course_id = c.id AND pchp.status = 'completed') as completed_chapters,
                (SELECT MAX(pta.finished_at) FROM partner_test_attempts pta
                 JOIN chapter_tests ct ON pta.test_id = ct.id
                 JOIN course_chapters ch ON ct.chapter_id = ch.id
                 WHERE pta.partner_id = p.id AND ch.course_id = c.id) as last_activity
            FROM partners p
            JOIN partner_course_progress pcp ON pcp.partner_id = p.id
            JOIN courses c ON c.id = pcp.course_id
            WHERE p.is_active = 1
        '''

        params = []
        if course_id:
            query += ' AND c.id = ?'
            params.append(course_id)

        query += ' ORDER BY pcp.started_at DESC'

        cursor.execute(query, params)
        return [dict(row) for row in cursor.fetchall()]
