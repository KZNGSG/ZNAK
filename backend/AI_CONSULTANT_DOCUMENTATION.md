# AI-Консультант Про.Маркируй — Техническая документация

## Обзор системы

AI-консультант "Мария" — интеллектуальный чат-бот для консультаций по маркировке товаров. Использует Claude Sonnet 4 с Document-First архитектурой для точных ответов на основе постановлений.

---

## Архитектура

### Document-First Architecture

```
Сообщение клиента
       ↓
   [ROUTER] — классификация без LLM (экономия токенов)
       ↓
   Нужен поиск?
   ├── ДА → [SEARCH] — поиск в RTF/TXT документах
   │            ↓
   └── НЕТ ────→ [AGENT] — генерация ответа с контекстом
                    ↓
                [TOOLS] — вызов инструментов (create_request и др.)
                    ↓
                 Ответ
```

### Файлы системы

| Файл | Путь | Описание |
|------|------|----------|
| `ai_consultant.py` | `/var/www/promarkirui/backend/` | Основной модуль AI-консультанта |
| `server.py` | `/var/www/promarkirui/backend/` | FastAPI сервер |
| `database.py` | `/var/www/promarkirui/backend/` | Работа с базой данных |
| `AIChatWidget_v2.js` | `/var/www/promarkirui/frontend/` | React-виджет чата |
| `EmployeeDashboard.js` | `/var/www/promarkirui/frontend/src/pages/employee/` | Панель менеджера |
| `EmployeeInbox.js` | `/var/www/promarkirui/frontend/src/pages/employee/` | Входящие заявки |

### Базы данных

| База | Путь | Таблицы |
|------|------|---------|
| Основная | `/var/www/promarkirui/backend/data/promarkirui.db` | callbacks, clients, users, contracts, quotes |
| AI-модуль | `/var/www/promarkirui/backend/promarkirui.db` | ai_conversations, ai_messages, ai_settings |

---

## Функции AI-консультанта

### 1. Классификация сообщений (Router)

**Файл:** `ai_consultant.py`, функция `classify_message()`

Определяет:
- Тип вопроса: `greeting`, `product_question`, `ved_question`, `marking_question`
- Нужен ли поиск в документах
- Приоритет клиента: `low`, `medium`, `high`
- Рекомендация перенаправить на сайт

**Сигналы приоритета:**

LOW (неперспективные):
- "просто интересно", "курсовая", "диплом", "студент", "для себя"

HIGH (перспективные):
- "ИП", "ООО", "производство", "импорт", "оптом", "партия", "срочно", "штраф"

### 2. Отсечение нерелевантных запросов

**Файл:** `ai_consultant.py`, функция `check_irrelevant_request()`

Автоматически отклоняет:
- Студентов с курсовыми/дипломами
- "Просто интересно" запросы
- Запросы "для учёбы"

Ответ: "Мы консультируем только по рабочим вопросам маркировки для бизнеса. Для учёбы рекомендую официальный сайт честныйзнак.рф"

### 3. Поиск в документах

**Файл:** `ai_consultant.py`, функции `search_in_rtf()`, `search_in_ved_doc()`

**Директории документов:**
- Постановления: `/var/www/promarkirui/backend/knowledge_base/regulations/`
- ВЭД документы: `/var/www/promarkirui/backend/knowledge_base/ved/`

**Маппинг товаров на постановления:**
```python
PRODUCT_TO_REGULATION = {
    'обувь': {'file_pattern': '860', 'pp_number': '860'},
    'молоко': {'file_pattern': '2099', 'pp_number': '2099'},
    'одежда': {'file_pattern': '1956', 'pp_number': '1956'},
    'пиво': {'file_pattern': '2173', 'pp_number': '2173'},
    'икра': {'file_pattern': '2028', 'pp_number': '2028'},
    # ... 40+ товаров
}
```

### 4. Фразы-паузы

**Файл:** `ai_consultant.py`

При поиске в документах добавляются фразы:
- "Секундочку, гляну в постановлении..."
- "Сейчас уточню по документам..."
- "Секунду, посмотрю в кодексе..." (для ВЭД)

**Расчёт задержки:**
```python
delay = base_delay (800ms) + len(text) * 12ms + search_delay (1500ms)
# Ограничение: 1000-5000ms
```

### 5. Создание заявок

**Файл:** `ai_consultant.py`, функция `create_request()`

**Собираемые данные:**
- `name` — имя клиента
- `phone` — телефон
- `product` — товар
- `volume` — объём
- `city` — город
- `has_experience` — опыт с маркировкой
- `documents` — какие документы есть
- `pain_point` — проблема клиента
- `request_type` — тип заявки

**Формат резюме:**
```
Клиент из Краснодара, продукция — сыр, объём 2 тонны в месяц,
только начинает работать с маркировкой, есть декларация.
```

**Куда отправляется:**
1. База данных (таблица `callbacks`, source: `ai_consultant`)
2. Telegram
3. Email менеджерам

### 6. Инструменты агента

| Инструмент | Описание |
|------------|----------|
| `search_product` | Поиск товара по названию |
| `check_tnved` | Проверка по коду ТН ВЭД |
| `get_fines` | Информация о штрафах |
| `get_equipment` | Рекомендации по оборудованию |
| `get_registration_guide` | Инструкция по регистрации в ЧЗ |
| `site_help` | Помощь по сайту |
| `create_request` | Создание заявки |
| `call_manager` | Вызов менеджера |
| `get_regulation_info` | Информация о постановлении |

---

## API Endpoints

### AI Chat

```
POST /api/ai/chat
```

**Request:**
```json
{
  "message": "текст сообщения",
  "session_id": "uuid (опционально)",
  "current_page": "/page-url",
  "page_title": "Название страницы"
}
```

**Response:**
```json
{
  "response": "Ответ консультанта",
  "session_id": "uuid",
  "typing_delay": 2500,
  "had_document_search": true
}
```

### Удаление заявок

```
DELETE /api/employee/callbacks/{callback_id}
DELETE /api/admin/callbacks/{callback_id}
```

### Статистика AI

```
GET /api/ai/stats
```

---

## Панель менеджера

### Источники заявок

| source | Отображение |
|--------|-------------|
| `ai_consultant` | AI-консультант |
| `contact_form` | Контактная форма |
| `check_page` | Проверка товара |
| `quote_page` | Запрос КП |

### Функции

- Просмотр всех заявок
- Фильтрация по статусу (новые, в работе, завершённые)
- Удаление заявок (кнопка корзины)
- Создание клиента из заявки
- Взятие в работу

---

## Системный промпт

**Ключевые правила:**

1. **Формат ответа:** 1 фраза + 1 вопрос
2. **Сбор информации:** товар → объём → опыт → документы → город → имя/телефон
3. **Запрещено:** списки, инструкции, лекции, больше 2 предложений

**Примеры хороших ответов:**
- "О, тапочки! А домашние или пляжные?"
- "Понял, обувь. Сколько пар везёте?"
- "Серьёзный объём! С маркировкой уже работали?"

---

## Настройки

### Переменные окружения

```bash
ANTHROPIC_API_KEY=sk-ant-...
TELEGRAM_BOT_TOKEN=...
TELEGRAM_CHAT_ID=...
CONTACT_TO_EMAIL=email1@mail.ru,email2@mail.ru
```

### Модель

- **Модель:** Claude Sonnet 4 (`claude-sonnet-4-20250514`)
- **Temperature:** 0.2
- **Max tokens:** 300

---

## Логи и мониторинг

### Просмотр логов

```bash
journalctl -u promarkirui -f
```

### Статистика токенов

```sql
SELECT
  date(created_at) as date,
  SUM(tokens_input) as input,
  SUM(tokens_output) as output,
  SUM(cost_usd) as cost
FROM ai_token_usage
GROUP BY date(created_at)
ORDER BY date DESC;
```

---

## Перезапуск сервиса

```bash
systemctl restart promarkirui
```

### Пересборка фронтенда

```bash
cd /var/www/promarkirui/frontend
npm run build
```

---

## Изменения от 20.12.2025

### Новые функции

1. **Document-First Architecture** — поиск в документах до генерации ответа
2. **Отсечение нерелевантных** — автоматический отказ студентам
3. **Фразы-паузы** — "Секундочку, гляну..."
4. **Динамический typing_delay** — зависит от длины ответа
5. **Удаление заявок** — кнопка в панели менеджера
6. **Источник ai_consultant** — для статистики
7. **Человеческое резюме** — вместо полей структурированный текст
8. **Исправление времени** — корректный часовой пояс

### Изменённые файлы

- `ai_consultant.py` — полная переработка
- `server.py` — добавлены DELETE endpoints, source в ContactRequest
- `EmployeeDashboard.js` — кнопка удаления, исправление времени
- `EmployeeInbox.js` — исправление времени, источник AI-консультант
- `AIChatWidget_v2.js` — использование typing_delay из API
