import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft, Clock, Calendar, Tag, ChevronRight,
  CheckCircle, AlertTriangle, FileText, ExternalLink,
  Shield, BookOpen
} from 'lucide-react';
import { Button } from '../components/ui/button';
import SEO from '../components/SEO';

// База статей
const ARTICLES_DATA = {
  'kak-zaregistrirovatsya-v-chestnom-znake': {
    title: 'Как зарегистрироваться в Честном ЗНАКе: пошаговая инструкция 2025',
    description: 'Подробная инструкция по регистрации в системе маркировки Честный ЗНАК. Какие документы нужны, сколько времени занимает, частые ошибки.',
    category: 'Честный ЗНАК',
    categorySlug: 'chestny-znak',
    readTime: 5,
    date: '2025-12-12',
    author: 'Команда Про.Маркируй',
    tags: ['регистрация', 'честный знак', 'инструкция'],
    content: `
## Что такое Честный ЗНАК?

**Честный ЗНАК** — это государственная система маркировки товаров в России. Она позволяет отслеживать путь товара от производителя до покупателя и бороться с контрафактом.

С 2019 года маркировка постепенно становится обязательной для всё большего числа товарных категорий: табак, обувь, одежда, парфюмерия, шины, молочная продукция и другие.

## Кому нужно регистрироваться?

Регистрация в системе обязательна для всех участников оборота маркированных товаров:

- **Производители** — наносят коды маркировки на товары
- **Импортёры** — маркируют товары до ввоза в РФ или на таможенном складе
- **Оптовики** — передают товары с кодами по цепочке
- **Розница** — продают товары конечным покупателям и выводят из оборота

## Что нужно для регистрации

Перед началом подготовьте:

1. **Квалифицированная электронная подпись (КЭП)** — получите в аккредитованном удостоверяющем центре
2. **Доступ в личный кабинет ФНС** — через портал nalog.ru
3. **Данные организации** — ИНН, ОГРН, юридический адрес

## Пошаговая инструкция

### Шаг 1. Получите электронную подпись

Если у вас ещё нет КЭП:
- Для ИП — получите бесплатно в ФНС
- Для юрлиц — закажите в аккредитованном УЦ (стоимость от 1500 до 5000 руб.)

### Шаг 2. Зайдите на сайт Честного ЗНАКа

1. Откройте сайт [crpt.ru](https://crpt.ru)
2. Нажмите «Войти» в правом верхнем углу
3. Выберите «Регистрация»

### Шаг 3. Авторизуйтесь через ЕСИА или КЭП

Выберите способ входа:
- **Через Госуслуги (ЕСИА)** — быстрее, если есть подтверждённая учётная запись
- **Через КЭП** — если нет аккаунта на Госуслугах

### Шаг 4. Заполните данные организации

Система автоматически подтянет данные из ЕГРЮЛ/ЕГРИП:
- Наименование организации
- ИНН / ОГРН
- Юридический адрес
- ФИО руководителя

Проверьте корректность и подтвердите.

### Шаг 5. Выберите товарные группы

Отметьте категории товаров, с которыми работаете:
- Табачная продукция
- Обувь
- Одежда и текстиль
- Парфюмерия
- Шины
- Фототехника
- И другие

### Шаг 6. Подпишите оферту

Ознакомьтесь с условиями и подпишите договор электронной подписью.

### Шаг 7. Дождитесь подтверждения

Регистрация занимает от нескольких минут до 1 рабочего дня. Уведомление придёт на email.

## Частые ошибки при регистрации

### Ошибка 1: Неверная электронная подпись
**Проблема:** Сертификат КЭП не подходит или истёк срок действия.
**Решение:** Проверьте срок действия сертификата и убедитесь, что он выпущен на руководителя организации.

### Ошибка 2: Несовпадение данных
**Проблема:** Данные в КЭП не совпадают с данными в ЕГРЮЛ.
**Решение:** Обновите данные в налоговой или перевыпустите КЭП.

### Ошибка 3: Не установлен криптопровайдер
**Проблема:** Браузер не видит электронную подпись.
**Решение:** Установите КриптоПро CSP или VipNet CSP.

## Что делать после регистрации?

После успешной регистрации:

1. **Настройте личный кабинет** — добавьте сотрудников, настройте уведомления
2. **Подключите ЭДО** — выберите оператора электронного документооборота
3. **Получите оборудование** — принтер этикеток, сканер штрих-кодов
4. **Закажите первые коды** — через личный кабинет или API

## FAQ

**Сколько стоит регистрация?**
Регистрация в системе Честный ЗНАК бесплатная. Платить нужно только за коды маркировки (50 копеек за код без НДС).

**Сколько времени занимает регистрация?**
От 10 минут до 1 рабочего дня, в зависимости от загруженности системы.

**Можно ли зарегистрировать несколько организаций?**
Да, каждая организация регистрируется отдельно под своим ИНН.

**Нужен ли договор с оператором ЭДО?**
Да, для передачи УПД между участниками оборота нужен оператор ЭДО (Контур, Такском, СБИС и др.).
    `,
    relatedArticles: [
      'kak-poluchit-kody-markirovki',
      'chto-takoe-kiz',
      'shtrafy-za-otsutstvie-markirovki-2025'
    ]
  },
  'shtrafy-za-otsutstvie-markirovki-2025': {
    title: 'Штрафы за отсутствие маркировки в 2025 году',
    description: 'Какие штрафы грозят за продажу товаров без маркировки. Размеры штрафов для ИП и юрлиц, как избежать наказания.',
    category: 'Штрафы',
    categorySlug: 'shtrafy',
    readTime: 4,
    date: '2025-12-10',
    author: 'Команда Про.Маркируй',
    tags: ['штрафы', 'ответственность', '2025'],
    content: `
## Виды нарушений и штрафы

### Производство без маркировки

За производство товаров без нанесения кодов маркировки:

| Нарушитель | Штраф |
|------------|-------|
| Должностное лицо | 5 000 — 10 000 руб. |
| ИП | 10 000 — 20 000 руб. |
| Юридическое лицо | 50 000 — 100 000 руб. |

**Важно:** Товар без маркировки конфискуется.

### Продажа без маркировки

За продажу товаров без кодов маркировки или с нечитаемыми кодами:

| Нарушитель | Штраф |
|------------|-------|
| Граждане | 2 000 — 4 000 руб. |
| Должностное лицо | 5 000 — 10 000 руб. |
| ИП | 10 000 — 20 000 руб. |
| Юридическое лицо | 50 000 — 300 000 руб. |

### Нарушение порядка маркировки

За нарушение правил нанесения или использования кодов:

| Нарушитель | Штраф |
|------------|-------|
| Должностное лицо | 1 000 — 10 000 руб. |
| ИП | 5 000 — 10 000 руб. |
| Юридическое лицо | 25 000 — 100 000 руб. |

## Уголовная ответственность

При крупных нарушениях (свыше 1,5 млн руб.) наступает уголовная ответственность по статье 171.1 УК РФ:

- Штраф до 300 000 руб.
- Принудительные работы до 3 лет
- Лишение свободы до 3 лет

При особо крупном размере (свыше 6 млн руб.):
- Штраф до 1 000 000 руб.
- Лишение свободы до 6 лет

## Как избежать штрафов

1. **Зарегистрируйтесь в Честном ЗНАКе** заблаговременно
2. **Настройте процессы** маркировки и учёта
3. **Обучите сотрудников** работе с кодами
4. **Проверяйте товары** при приёмке
5. **Своевременно выводите** товары из оборота

## FAQ

**Кто проверяет маркировку?**
Роспотребнадзор, ФНС, таможенные органы, а также автоматизированные системы контроля.

**Можно ли избежать штрафа при первом нарушении?**
В некоторых случаях возможно предупреждение вместо штрафа, если нарушение незначительное.
    `,
    relatedArticles: [
      'kak-zaregistrirovatsya-v-chestnom-znake',
      'markirovka-odezhdy-polnyj-gajd'
    ]
  },
  'markirovka-odezhdy-polnyj-gajd': {
    title: 'Маркировка одежды: полный гайд для продавцов',
    description: 'Всё о маркировке одежды: какие товары подлежат, как получить коды, как наносить, сроки и требования.',
    category: 'Честный ЗНАК',
    categorySlug: 'chestny-znak',
    readTime: 8,
    date: '2025-12-08',
    author: 'Команда Про.Маркируй',
    tags: ['одежда', 'маркировка', 'гайд'],
    content: `
## Какая одежда подлежит маркировке?

С 1 января 2021 года обязательной маркировке подлежат:

- Предметы одежды из натуральной и композиционной кожи
- Блузки трикотажные машинного или ручного вязания
- Пальто, полупальто, накидки, плащи, куртки
- Постельное бельё
- Столовое бельё
- Туалетное и кухонное бельё

### Коды ТН ВЭД для маркировки одежды

| Код ТН ВЭД | Описание |
|------------|----------|
| 4203 10 000 | Одежда из кожи |
| 6106 | Блузки трикотажные |
| 6201 | Пальто, куртки мужские |
| 6202 | Пальто, куртки женские |
| 6302 | Постельное, столовое бельё |

## Как получить коды маркировки

### Способ 1: Через личный кабинет

1. Войдите в ЛК на сайте crpt.ru
2. Перейдите в раздел «Коды маркировки»
3. Создайте заказ, указав количество и тип кодов
4. Оплатите заказ (50 коп. за код)
5. Скачайте готовые коды

### Способ 2: Через API

Для автоматизации процесса можно подключить API Честного ЗНАКа к вашей учётной системе.

### Способ 3: Через оператора

Закажите коды через оператора ЭДО или специализированную компанию.

## Как наносить маркировку

### Требования к этикетке

- **Размер кода:** минимум 10x10 мм
- **Контрастность:** чёрный код на белом фоне
- **Читаемость:** код должен легко сканироваться

### Оборудование для печати

- Термотрансферный принтер (от 15 000 руб.)
- Этикетки с клеевым слоем
- Риббон (красящая лента)

## FAQ

**Можно ли продавать остатки без маркировки?**
Нет, с 2021 года вся одежда из перечня должна быть промаркирована, включая остатки.

**Кто маркирует импортную одежду?**
Импортёр — до ввоза товара в РФ или на таможенном складе.
    `,
    relatedArticles: [
      'kak-zaregistrirovatsya-v-chestnom-znake',
      'top-5-printerov-dlya-markirovki'
    ]
  },
  'top-5-printerov-dlya-markirovki': {
    title: 'ТОП-5 принтеров для маркировки в 2025 году',
    description: 'Обзор лучших принтеров для печати этикеток с DataMatrix кодами. Сравнение цен, характеристик, плюсы и минусы.',
    category: 'Оборудование',
    categorySlug: 'oborudovanie',
    readTime: 7,
    date: '2025-12-05',
    author: 'Команда Про.Маркируй',
    tags: ['принтеры', 'оборудование', 'обзор'],
    content: `
## Критерии выбора принтера

При выборе принтера для маркировки обратите внимание на:

1. **Разрешение печати** — минимум 203 dpi, рекомендуется 300 dpi
2. **Скорость печати** — зависит от ваших объёмов
3. **Ширина печати** — выбирайте под размер этикеток
4. **Тип печати** — термотрансферный для долговечных этикеток

## ТОП-5 принтеров

### 1. TSC TE200 — лучший бюджетный

**Цена:** от 15 000 руб.

**Плюсы:**
- Доступная цена
- Простая настройка
- Надёжный

**Минусы:**
- Невысокая скорость
- Только 203 dpi

**Подходит для:** малого бизнеса с небольшими объёмами.

### 2. Zebra ZD421 — оптимальный выбор

**Цена:** от 25 000 руб.

**Плюсы:**
- 300 dpi разрешение
- Высокое качество печати
- Удобное ПО

**Минусы:**
- Дороже бюджетных моделей

**Подходит для:** среднего бизнеса.

### 3. Godex G500 — промышленный

**Цена:** от 35 000 руб.

**Плюсы:**
- Высокая скорость
- Металлический корпус
- Большой ресурс

**Минусы:**
- Высокая цена
- Габаритный

**Подходит для:** производств и складов.

### 4. Honeywell PC42t — компактный

**Цена:** от 20 000 руб.

**Плюсы:**
- Компактный размер
- Тихая работа
- USB и Ethernet

**Минусы:**
- Средняя скорость

**Подходит для:** офисов и небольших магазинов.

### 5. АТОЛ BP21 — российский

**Цена:** от 12 000 руб.

**Плюсы:**
- Самая низкая цена
- Российская поддержка
- Интеграция с 1С

**Минусы:**
- Базовый функционал

**Подходит для:** микробизнеса.

## Сравнительная таблица

| Модель | Цена | Разрешение | Скорость |
|--------|------|------------|----------|
| TSC TE200 | 15 000 | 203 dpi | 127 мм/с |
| Zebra ZD421 | 25 000 | 300 dpi | 152 мм/с |
| Godex G500 | 35 000 | 300 dpi | 178 мм/с |
| Honeywell PC42t | 20 000 | 203 dpi | 101 мм/с |
| АТОЛ BP21 | 12 000 | 203 dpi | 127 мм/с |
    `,
    relatedArticles: [
      'skaner-dlya-chestnogo-znaka',
      'markirovka-odezhdy-polnyj-gajd'
    ]
  },
  'kak-poluchit-kody-markirovki': {
    title: 'Как получить коды маркировки: 3 способа',
    description: 'Три способа получения кодов маркировки: через личный кабинет, через API, через оператора. Пошаговые инструкции.',
    category: 'Честный ЗНАК',
    categorySlug: 'chestny-znak',
    readTime: 6,
    date: '2025-12-03',
    author: 'Команда Про.Маркируй',
    tags: ['коды', 'получение', 'инструкция'],
    content: `
## Что такое код маркировки?

Код маркировки — это уникальный идентификатор товара в формате DataMatrix. Каждый код присваивается конкретной единице товара и содержит:

- GTIN (глобальный номер товара)
- Серийный номер
- Криптографическую подпись

## Стоимость кодов

**Базовая стоимость:** 50 копеек за код (без НДС)

Оплата производится после заказа кодов в личном кабинете.

## Способ 1: Через личный кабинет

Самый простой способ для небольших объёмов.

### Пошаговая инструкция:

1. Войдите в личный кабинет Честного ЗНАКа
2. Перейдите в раздел «Коды маркировки» → «Заказать»
3. Выберите товарную группу
4. Укажите GTIN товара (или создайте новый)
5. Введите количество кодов
6. Подтвердите заказ и оплатите
7. Скачайте готовые коды (обычно через 1-10 минут)

### Форматы выгрузки:
- PDF — для печати напрямую
- CSV — для загрузки в учётную систему
- XML — для интеграции

## Способ 2: Через API

Для автоматизации при больших объёмах.

### Преимущества:
- Автоматическое получение кодов
- Интеграция с учётной системой
- Нет ручной работы

### Как подключить:
1. Получите доступ к API в личном кабинете
2. Изучите документацию API
3. Настройте интеграцию в вашей системе

## Способ 3: Через оператора

Делегируйте получение кодов специализированной компании.

### Когда выбрать:
- Нет технических ресурсов
- Хотите сосредоточиться на бизнесе
- Нужна комплексная услуга

## FAQ

**Сколько кодов можно заказать за раз?**
До 10 миллионов кодов в одном заказе.

**Как долго действуют коды?**
Коды не имеют срока действия, но должны быть введены в оборот в течение 60 дней после получения.

**Можно ли вернуть неиспользованные коды?**
Нет, коды возврату не подлежат.
    `,
    relatedArticles: [
      'kak-zaregistrirovatsya-v-chestnom-znake',
      'chto-takoe-kiz'
    ]
  }
};

// Простой парсер Markdown
const parseMarkdown = (text) => {
  if (!text) return [];

  const lines = text.trim().split('\n');
  const elements = [];
  let inTable = false;
  let tableRows = [];
  let inList = false;
  let listItems = [];

  const processLine = (line, index) => {
    // Заголовки
    if (line.startsWith('## ')) {
      return <h2 key={index} className="text-2xl font-bold text-gray-900 mt-8 mb-4">{line.slice(3)}</h2>;
    }
    if (line.startsWith('### ')) {
      return <h3 key={index} className="text-xl font-bold text-gray-900 mt-6 mb-3">{line.slice(4)}</h3>;
    }

    // Жирный текст
    let content = line;
    content = content.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');

    // Ссылки
    content = content.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">$1</a>');

    // Таблицы
    if (line.startsWith('|')) {
      return null; // Обработаем отдельно
    }

    // Списки
    if (line.startsWith('- ')) {
      return (
        <li key={index} className="flex items-start gap-2 text-gray-700">
          <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
          <span dangerouslySetInnerHTML={{ __html: content.slice(2) }} />
        </li>
      );
    }

    // Нумерованные списки
    if (/^\d+\.\s/.test(line)) {
      const num = line.match(/^(\d+)\./)[1];
      return (
        <li key={index} className="flex items-start gap-3 text-gray-700">
          <span className="flex-shrink-0 w-6 h-6 rounded-full bg-yellow-100 text-yellow-700 text-sm font-bold flex items-center justify-center">
            {num}
          </span>
          <span dangerouslySetInnerHTML={{ __html: content.replace(/^\d+\.\s/, '') }} />
        </li>
      );
    }

    // Пустые строки
    if (!line.trim()) {
      return <div key={index} className="h-4" />;
    }

    // Обычный параграф
    return <p key={index} className="text-gray-700 leading-relaxed" dangerouslySetInnerHTML={{ __html: content }} />;
  };

  // Обработка таблиц
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];

    if (line.startsWith('|')) {
      // Начало таблицы
      const tableLines = [];
      while (i < lines.length && lines[i].startsWith('|')) {
        if (!lines[i].includes('---')) {
          tableLines.push(lines[i]);
        }
        i++;
      }

      if (tableLines.length > 0) {
        const headers = tableLines[0].split('|').filter(c => c.trim());
        const rows = tableLines.slice(1).map(row => row.split('|').filter(c => c.trim()));

        elements.push(
          <div key={`table-${i}`} className="overflow-x-auto my-4">
            <table className="min-w-full border border-gray-200 rounded-lg overflow-hidden">
              <thead className="bg-gray-50">
                <tr>
                  {headers.map((h, idx) => (
                    <th key={idx} className="px-4 py-3 text-left text-sm font-semibold text-gray-900 border-b">
                      {h.trim()}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, rowIdx) => (
                  <tr key={rowIdx} className={rowIdx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    {row.map((cell, cellIdx) => (
                      <td key={cellIdx} className="px-4 py-3 text-sm text-gray-700 border-b">
                        {cell.trim()}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      }
      continue;
    }

    const element = processLine(line, i);
    if (element) {
      elements.push(element);
    }
    i++;
  }

  return elements;
};

const ArticlePage = () => {
  const { articleId } = useParams();
  const article = ARTICLES_DATA[articleId];

  if (!article) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white py-20">
        <div className="mx-auto max-w-[800px] px-4 text-center">
          <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Статья не найдена</h1>
          <p className="text-gray-600 mb-6">К сожалению, запрашиваемая статья не существует.</p>
          <Link
            to="/knowledge"
            className="inline-flex items-center gap-2 px-6 py-3 bg-yellow-400 text-gray-900 rounded-xl font-medium hover:bg-yellow-500 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Вернуться к базе знаний
          </Link>
        </div>
      </div>
    );
  }

  const relatedArticles = (article.relatedArticles || [])
    .map(id => ARTICLES_DATA[id])
    .filter(Boolean)
    .slice(0, 3);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <SEO
        title={`${article.title} | Про.Маркируй`}
        description={article.description}
        keywords={article.tags.join(', ')}
      />

      {/* Breadcrumbs */}
      <div className="bg-white border-b">
        <div className="mx-auto max-w-[800px] px-4 py-4">
          <nav className="flex items-center gap-2 text-sm">
            <Link to="/" className="text-gray-500 hover:text-gray-700">Главная</Link>
            <ChevronRight className="w-4 h-4 text-gray-400" />
            <Link to="/knowledge" className="text-gray-500 hover:text-gray-700">База знаний</Link>
            <ChevronRight className="w-4 h-4 text-gray-400" />
            <span className="text-gray-900 font-medium truncate">{article.title}</span>
          </nav>
        </div>
      </div>

      <article className="mx-auto max-w-[800px] px-4 py-8">
        {/* Header */}
        <motion.header
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center gap-2 mb-4">
            <span className="px-3 py-1 rounded-lg text-sm font-medium bg-blue-100 text-blue-700">
              {article.category}
            </span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4 leading-tight">
            {article.title}
          </h1>

          <p className="text-lg text-gray-600 mb-6">
            {article.description}
          </p>

          <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500 pb-6 border-b">
            <span className="flex items-center gap-1.5">
              <Clock className="w-4 h-4" />
              {article.readTime} мин чтения
            </span>
            <span className="flex items-center gap-1.5">
              <Calendar className="w-4 h-4" />
              {new Date(article.date).toLocaleDateString('ru-RU', {
                day: 'numeric',
                month: 'long',
                year: 'numeric'
              })}
            </span>
          </div>
        </motion.header>

        {/* Content */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="prose-custom"
        >
          {parseMarkdown(article.content)}
        </motion.div>

        {/* Tags */}
        <div className="flex flex-wrap gap-2 mt-8 pt-8 border-t">
          {article.tags.map(tag => (
            <Link
              key={tag}
              to={`/knowledge?tag=${tag}`}
              className="flex items-center gap-1 px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200 transition-colors"
            >
              <Tag className="w-3.5 h-3.5" />
              {tag}
            </Link>
          ))}
        </div>

        {/* CTA */}
        <div className="mt-8 p-6 bg-gradient-to-br from-yellow-400 to-yellow-500 rounded-2xl">
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <div className="flex-1 text-center sm:text-left">
              <h3 className="text-xl font-bold text-gray-900 mb-1">
                Нужна помощь с маркировкой?
              </h3>
              <p className="text-gray-800">
                Наши эксперты помогут разобраться и настроить процессы
              </p>
            </div>
            <Link
              to="/contact"
              className="flex-shrink-0 px-6 py-3 bg-gray-900 text-white rounded-xl font-medium hover:bg-gray-800 transition-colors"
            >
              Получить консультацию
            </Link>
          </div>
        </div>

        {/* Related Articles */}
        {relatedArticles.length > 0 && (
          <div className="mt-12">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Читайте также</h2>
            <div className="grid gap-4">
              {relatedArticles.map(relArticle => (
                <Link
                  key={relArticle.title}
                  to={`/knowledge/${Object.keys(ARTICLES_DATA).find(k => ARTICLES_DATA[k] === relArticle)}`}
                  className="flex items-center gap-4 p-4 bg-white border border-gray-200 rounded-xl hover:border-blue-300 hover:shadow-md transition-all group"
                >
                  <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                    <BookOpen className="w-5 h-5 text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-gray-900 group-hover:text-blue-600 transition-colors truncate">
                      {relArticle.title}
                    </h3>
                    <p className="text-sm text-gray-500">{relArticle.readTime} мин чтения</p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-blue-600 transition-colors" />
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Back Button */}
        <div className="mt-8 text-center">
          <Link
            to="/knowledge"
            className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Вернуться к базе знаний
          </Link>
        </div>
      </article>
    </div>
  );
};

export default ArticlePage;
