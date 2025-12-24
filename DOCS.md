# Документация promarkirui.ru

## Общая информация

- **Сайт:** https://promarkirui.ru
- **Сервер:** 93.189.231.162
- **Стек:** React (CRA + craco), TailwindCSS, Node.js API
- **Путь:** /var/www/promarkirui/

---

## Структура проекта

```
/var/www/promarkirui/
├── frontend/                 # React приложение
│   ├── src/
│   │   ├── components/       # Компоненты (Header, CitySelector, Footer)
│   │   ├── pages/            # Страницы
│   │   │   ├── HomePage.js
│   │   │   ├── CityPage.js   # Гео-страницы городов
│   │   │   └── ...
│   │   ├── data/
│   │   │   └── cities.js     # База данных 33 городов
│   │   └── index.js          # Точка входа (hydration для react-snap)
│   ├── build/                # Собранный проект со статическим HTML
│   │   ├── city/             # Пререндеренные HTML городов
│   │   │   ├── moskva/index.html
│   │   │   ├── novosibirsk/index.html
│   │   │   └── ... (33 города)
│   │   └── index.html
│   ├── public/
│   │   └── sitemap.xml       # Карта сайта
│   └── package.json          # Конфиг с react-snap
├── backend/                  # Node.js API (порт 8001)
├── DOCS.md                   # Эта документация
├── DEPLOY.md                 # Инструкция по деплою
└── SEO_GUIDE.md              # Руководство по SEO
```

---

## SEO-система: Как это работает

### Проблема SPA и SEO

React - это SPA (Single Page Application). Когда поисковик заходит на страницу, он видит пустой HTML:
```html
<div id="root"></div>
<script src="main.js"></script>
```

JavaScript загружается и рендерит контент, но старые боты этого не ждут.

### Решение: react-snap

**react-snap** - бесплатная библиотека, которая:
1. После сборки проекта запускает Puppeteer (headless Chrome)
2. Открывает каждую страницу сайта
3. Ждёт рендеринга React
4. Сохраняет готовый HTML в файлы

**Результат:** Поисковики сразу видят полный HTML с контентом.

### Как настроено

**package.json:**
```json
{
  "scripts": {
    "postbuild": "react-snap"
  },
  "reactSnap": {
    "puppeteerArgs": ["--no-sandbox", "--disable-setuid-sandbox"],
    "puppeteerExecutablePath": "/usr/bin/chromium-browser",
    "navigationTimeout": 60000,
    "inlineCss": false,
    "skipThirdPartyRequests": true,
    "include": [
      "/", "/check", "/timeline", "/equipment", "/training",
      "/about", "/partners", "/quote", "/import", "/checklist",
      "/scanner", "/consultation", "/knowledge",
      "/city/moskva", "/city/sankt-peterburg", "/city/novosibirsk",
      ... (все 33 города)
    ]
  }
}
```

**index.js (hydration):**
```javascript
import { createRoot, hydrateRoot } from 'react-dom/client';

const container = document.getElementById('root');

// Если есть пререндеренный HTML - гидратируем, иначе рендерим
if (container.hasChildNodes()) {
  hydrateRoot(container, <App />);
} else {
  createRoot(container).render(<App />);
}
```

### Nginx конфигурация

**/etc/nginx/sites-enabled/promarkirui:**
```nginx
location / {
    # Ищем: файл → папка → папка/index.html → fallback на SPA
    try_files $uri $uri/ $uri/index.html /index.html;
}
```

Это позволяет:
- /city/moskva → /city/moskva/index.html (статический HTML)
- /some-route → /index.html (SPA роутинг)

---

## Гео-страницы городов

### Список городов (33 шт.)

| Город | URL | Priority |
|-------|-----|----------|
| Москва | /city/moskva | 0.9 |
| Санкт-Петербург | /city/sankt-peterburg | 0.9 |
| Новосибирск | /city/novosibirsk | 0.8 |
| Екатеринбург | /city/ekaterinburg | 0.8 |
| Казань | /city/kazan | 0.8 |
| Нижний Новгород | /city/nizhny-novgorod | 0.8 |
| Челябинск | /city/chelyabinsk | 0.8 |
| Самара | /city/samara | 0.8 |
| Омск | /city/omsk | 0.8 |
| Ростов-на-Дону | /city/rostov-na-donu | 0.8 |
| Уфа | /city/ufa | 0.8 |
| Красноярск | /city/krasnoyarsk | 0.8 |
| Воронеж | /city/voronezh | 0.8 |
| Пермь | /city/perm | 0.8 |
| Волгоград | /city/volgograd | 0.8 |
| Краснодар | /city/krasnodar | 0.8 |
| Саратов | /city/saratov | 0.8 |
| Тюмень | /city/tyumen | 0.8 |
| Тольятти | /city/tolyatti | 0.8 |
| Ижевск | /city/izhevsk | 0.8 |
| Барнаул | /city/barnaul | 0.8 |
| Иркутск | /city/irkutsk | 0.8 |
| Ульяновск | /city/ulyanovsk | 0.8 |
| Хабаровск | /city/khabarovsk | 0.8 |
| Ярославль | /city/yaroslavl | 0.8 |
| Владивосток | /city/vladivostok | 0.8 |
| Махачкала | /city/makhachkala | 0.8 |
| Томск | /city/tomsk | 0.8 |
| Оренбург | /city/orenburg | 0.8 |
| Кемерово | /city/kemerovo | 0.8 |
| Новокузнецк | /city/novokuznetsk | 0.8 |
| Рязань | /city/ryazan | 0.8 |
| Астрахань | /city/astrakhan | 0.8 |

### База данных городов

**Файл:** `src/data/cities.js`

```javascript
export const CITIES = [
  {
    slug: 'novosibirsk',
    name: 'Новосибирск',
    nameGenitive: 'Новосибирска',        // Родительный падеж
    namePrepositional: 'Новосибирске',   // Предложный падеж  
    nameLocative: 'в Новосибирске',      // Локатив
    region: 'Новосибирская область',
    population: '1 625 000',
    phoneCode: '+7 (383)',
    coordinates: { lat: 55.0084, lng: 82.9357 },
    description: 'Крупнейший город Сибири...',
    localKeywords: [
      'маркировка товаров новосибирск',
      'честный знак новосибирск',
      'маркировка продукции новосибирск'
    ],
    nearbyAreas: ['Бердск', 'Искитим', 'Академгородок'],
    features: ['Крупнейший город Сибири', 'Научный центр']
  },
  // ... ещё 32 города
];

// Функции:
export function getCityBySlug(slug) { ... }
export function getCityByName(name) { ... }
export function getAllCitySlugs() { ... }
export function getCityFAQ(city) { ... }  // Генерирует FAQ для JSON-LD
```

### SEO-контент каждой страницы

Каждая гео-страница содержит:
- **Title:** "Маркировка товаров в {Город} | Про.Маркируй"
- **H1:** "Маркировка товаров в {Город}"
- **Description:** уникальное описание с названием города и региона
- **Keywords:** локальные ключевые слова
- **JSON-LD Schema:**
  - LocalBusiness (с координатами)
  - FAQPage (4 вопроса-ответа)
  - BreadcrumbList

---

## CitySelector (Выбор города в шапке)

**Файл:** `src/components/CitySelector.js`

### Функционал:
1. **Автоопределение по IP** - через ipapi.co API
2. **Определение по GPS** - через Nominatim (OpenStreetMap)
3. **Ручной выбор** - dropdown с поиском
4. **Сохранение** - в localStorage
5. **Редирект** - при выборе города с гео-страницей → /city/{slug}

### Важно для react-snap:
```javascript
// Проверка на пререндеринг
const isPrerendering = typeof navigator !== 'undefined' 
  && navigator.userAgent === 'ReactSnap';

// При пререндеринге - не делаем fetch, ставим Москву по умолчанию
if (isPrerendering) {
  setCity('Москва');
  return;
}
```

---

## Команды

### Пересборка проекта
```bash
cd /var/www/promarkirui/frontend
npm run build
# react-snap автоматически запустится после build
# Займёт 2-3 минуты на 74 страницы
```

### Проверка SEO
```bash
# Проверить title
curl -sL "https://promarkirui.ru/city/novosibirsk" | grep -o '<title>[^<]*</title>'

# Проверить H1
curl -sL "https://promarkirui.ru/city/novosibirsk" | grep -o '<h1[^>]*>[^<]*</h1>'

# Проверить JSON-LD схемы (должно быть 3)
curl -sL "https://promarkirui.ru/city/novosibirsk" | grep -o 'application/ld+json' | wc -l

# Проверить как видит Googlebot
curl -sL -A "Googlebot" "https://promarkirui.ru/city/moskva" | head -100
```

### Перезагрузка nginx
```bash
nginx -t && systemctl reload nginx
```

### Проверка статических файлов
```bash
ls -la /var/www/promarkirui/frontend/build/city/
# Должно быть 33 папки

head -5 /var/www/promarkirui/frontend/build/city/moskva/index.html
# Должен быть полный HTML, не пустой div
```

---

## Добавление нового города

### 1. Добавить в cities.js
```javascript
{
  slug: 'novyy-gorod',
  name: 'Новый Город',
  nameGenitive: 'Нового Города',
  namePrepositional: 'Новом Городе',
  nameLocative: 'в Новом Городе',
  region: 'Область',
  population: '100 000',
  phoneCode: '+7 (XXX)',
  coordinates: { lat: XX.XX, lng: XX.XX },
  description: 'Описание города для SEO...',
  localKeywords: [
    'маркировка новый город',
    'честный знак новый город'
  ],
  nearbyAreas: ['Город1', 'Город2'],
  features: ['Особенность 1', 'Особенность 2']
}
```

### 2. Добавить в package.json
В секцию `reactSnap.include`:
```json
"/city/novyy-gorod"
```

### 3. Добавить в sitemap.xml
```xml
<url>
  <loc>https://promarkirui.ru/city/novyy-gorod</loc>
  <lastmod>2025-12-23</lastmod>
  <changefreq>monthly</changefreq>
  <priority>0.8</priority>
</url>
```

### 4. Пересобрать
```bash
npm run build
```

---

## Prerender.io (отключён)

Ранее использовался Prerender.io (9/мес) для рендеринга страниц для ботов.

**Сейчас отключён** - используется react-snap (бесплатно).

Токен Prerender.io (если понадобится): `KLr8ejpCHIMYkDkn2Wle`

### Если нужно вернуть Prerender.io:

Добавить в nginx перед `try_files`:
```nginx
map $http_user_agent $prerender_ua {
    default       0;
    "~*googlebot" 1;
    "~*yandex"    1;
    # ... другие боты
}

location / {
    if ($prerender_ua = 1) {
        rewrite (.*) /prerenderio last;
    }
    try_files $uri $uri/ $uri/index.html /index.html;
}

location /prerenderio {
    proxy_set_header X-Prerender-Token KLr8ejpCHIMYkDkn2Wle;
    resolver 8.8.8.8;
    proxy_pass https://service.prerender.io/https://$host$request_uri;
}
```

---

## Известные особенности

### react-snap и мета-теги

Некоторые страницы могут иметь дефолтные мета-теги в `<head>` (title, description), но правильный контент в `<body>` (H1, текст).

**Причина:** react-helmet не всегда успевает обновить head до снятия снапшота.

**Влияние на SEO:** Минимальное. Поисковики читают весь контент страницы, не только мета-теги. H1 и текст важнее.

---

## Полезные ссылки

- **Prerender.io:** https://prerender.io/ (токен: KLr8ejpCHIMYkDkn2Wle)
- **ipapi.co:** https://ipapi.co/ (определение города по IP)
- **Nominatim:** https://nominatim.openstreetmap.org/ (геокодинг)
- **react-snap:** https://github.com/stereobooster/react-snap

---

*Обновлено: 2025-12-23*
