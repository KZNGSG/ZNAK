import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const SEO_CONFIG = {
  '/': {
    title: 'Про.Маркируй - полное сопровождение в маркировке товаров',
    description: 'Про.Маркируй - ваш надёжный партнёр в маркировке товаров. Проверка товаров по ТН ВЭД, подбор оборудования, консультации по системе Честный ЗНАК.',
    keywords: 'маркировка товаров, честный знак, DataMatrix, маркировка одежды, маркировка обуви, проверка маркировки'
  },
  '/check': {
    title: 'Проверка товаров на маркировку | Про.Маркируй',
    description: 'Проверьте, подлежит ли ваш товар обязательной маркировке. База ТН ВЭД с 25,000+ кодами. Узнайте сроки и требования к маркировке.',
    keywords: 'проверка маркировки, ТН ВЭД, подлежит ли товар маркировке, честный знак проверка, коды ТН ВЭД'
  },
  '/timeline': {
    title: 'Сроки маркировки товаров 2024-2025 | Про.Маркируй',
    description: 'Актуальные сроки введения обязательной маркировки по категориям товаров. Календарь дедлайнов и этапов маркировки в России.',
    keywords: 'сроки маркировки, дедлайны маркировки, этапы маркировки, календарь маркировки, обязательная маркировка сроки'
  },
  '/equipment': {
    title: 'Оборудование для маркировки товаров | Про.Маркируй',
    description: 'Подбор оборудования для маркировки: принтеры этикеток, сканеры DataMatrix, ТСД. Рекомендации по выбору оборудования под ваши задачи.',
    keywords: 'оборудование для маркировки, принтер этикеток, сканер DataMatrix, ТСД для маркировки, принтер для честного знака'
  },
  '/contact': {
    title: 'Контакты | Про.Маркируй',
    description: 'Свяжитесь с нами для консультации по маркировке товаров. Мы поможем с подключением к Честному ЗНАКу и выбором оборудования.',
    keywords: 'контакты про маркируй, консультация по маркировке, помощь с маркировкой'
  },
  '/partners': {
    title: 'Партнёрская программа | Про.Маркируй',
    description: 'Станьте партнёром Про.Маркируй и зарабатывайте на рекомендациях. Выгодные условия сотрудничества для интеграторов и консультантов.',
    keywords: 'партнёрская программа маркировка, стать партнёром, сотрудничество маркировка'
  },
  '/quote': {
    title: 'Запрос коммерческого предложения | Про.Маркируй',
    description: 'Получите персональное коммерческое предложение на услуги маркировки. Расчёт стоимости оборудования и внедрения за 24 часа.',
    keywords: 'коммерческое предложение маркировка, расчёт стоимости маркировки, КП маркировка'
  },
  '/knowledge': {
    title: 'База знаний по маркировке товаров | Про.Маркируй',
    description: 'Полезные статьи о маркировке товаров: регистрация в Честном ЗНАКе, оборудование, штрафы, импорт. Пошаговые инструкции и гайды.',
    keywords: 'база знаний маркировка, статьи о маркировке, честный знак инструкции, гайды по маркировке'
  },
  '/about': {
    title: 'О сервисе Про.Маркируй | Полное сопровождение маркировки',
    description: 'Про.Маркируй — сервис, созданный для упрощения работы с маркировкой товаров. Проверка товаров, база знаний, подбор оборудования, консультации экспертов.',
    keywords: 'о нас про маркируй, сервис маркировки, помощь с маркировкой, честный знак консультации'
  },
  '/import': {
    title: 'Импорт товаров с маркировкой | Про.Маркируй',
    description: 'Как правильно завезти и промаркировать импортный товар. Пошаговые схемы маркировки для импорта из Китая, ЕС, СНГ.',
    keywords: 'импорт маркировка, маркировка импортных товаров, импорт из китая маркировка, таможня маркировка'
  },
  '/consultation': {
    title: 'AI-консультант по маркировке | Про.Маркируй',
    description: 'Умный AI-помощник ответит на любые вопросы о маркировке товаров. Бесплатная консультация онлайн 24/7.',
    keywords: 'консультация по маркировке, ai консультант, вопросы по маркировке, помощь с честным знаком'
  },
  '/checklist': {
    title: 'Чек-лист для начала маркировки | Про.Маркируй',
    description: 'Пошаговый чек-лист для подключения к системе маркировки Честный ЗНАК. ЭЦП, регистрация, оборудование — всё в одном месте.',
    keywords: 'чек-лист маркировка, как начать маркировку, регистрация честный знак, эцп для маркировки'
  },
  '/scanner': {
    title: 'Проверка кода маркировки | Про.Маркируй',
    description: 'Проверьте подлинность товара по коду маркировки DataMatrix. Онлайн-сканер для проверки кодов Честный ЗНАК.',
    keywords: 'проверить код маркировки, сканер datamatrix, проверка честный знак, подлинность товара'
  },
  '/training': {
    title: 'Обучение маркировке товаров | Академия Про.Маркируй',
    description: 'Профессиональное обучение работе с Честным ЗНАКом. 32 часа практики с экспертом, живые занятия, гарантия результата. Курсы для предпринимателей и сотрудников.',
    keywords: 'обучение маркировке, курсы честный знак, обучение честный знак, курсы маркировка товаров, академия маркировки'
  }
};

const DEFAULT_SEO = {
  title: 'Про.Маркируй - полное сопровождение в маркировке',
  description: 'Про.Маркируй - полное сопровождение в маркировке товаров. Проверка товаров, подбор оборудования, консультации по системе Честный ЗНАК.',
  keywords: 'маркировка товаров, честный знак, DataMatrix, ТН ВЭД'
};

const SITE_URL = 'https://promarkirui.ru';
const SITE_NAME = 'Про.Маркируй';

// JSON-LD структурированные данные для организации
const organizationSchema = {
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": "Про.Маркируй",
  "url": "https://promarkirui.ru",
  "logo": "https://promarkirui.ru/favicon.svg",
  "description": "Полное сопровождение в маркировке товаров. Проверка, оборудование, консультации.",
  "contactPoint": {
    "@type": "ContactPoint",
    "contactType": "customer service",
    "availableLanguage": "Russian"
  },
  "sameAs": []
};

// JSON-LD для веб-сайта
const websiteSchema = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  "name": "Про.Маркируй",
  "url": "https://promarkirui.ru",
  "potentialAction": {
    "@type": "SearchAction",
    "target": "https://promarkirui.ru/check?q={search_term_string}",
    "query-input": "required name=search_term_string"
  }
};

// Генерация BreadcrumbList
const generateBreadcrumbs = (pathname) => {
  const paths = pathname.split('/').filter(Boolean);
  if (paths.length === 0) return null;

  const breadcrumbNames = {
    'check': 'Проверка товаров',
    'timeline': 'Сроки маркировки',
    'equipment': 'Оборудование',
    'training': 'Обучение',
    'contact': 'Контакты',
    'about': 'О нас',
    'partners': 'Партнёрам',
    'quote': 'Запрос КП',
    'knowledge': 'База знаний',
    'import': 'Импорт товаров',
    'consultation': 'Консультация',
    'checklist': 'Чек-лист',
    'scanner': 'Сканер кодов'
  };

  const items = [
    {
      "@type": "ListItem",
      "position": 1,
      "name": "Главная",
      "item": SITE_URL
    }
  ];

  let currentPath = '';
  paths.forEach((path, index) => {
    currentPath += `/${path}`;
    const name = breadcrumbNames[path] || path;
    items.push({
      "@type": "ListItem",
      "position": index + 2,
      "name": name,
      "item": `${SITE_URL}${currentPath}`
    });
  });

  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": items
  };
};

const SEO = ({
  title: customTitle,
  description: customDescription,
  keywords: customKeywords,
  noindex = false
}) => {
  const location = useLocation();
  const pathname = location.pathname;

  // Получаем SEO данные для текущей страницы
  const pageConfig = SEO_CONFIG[pathname] || DEFAULT_SEO;
  const title = customTitle || pageConfig.title;
  const description = customDescription || pageConfig.description;
  const keywords = customKeywords || pageConfig.keywords;
  const canonicalUrl = `${SITE_URL}${pathname === '/' ? '' : pathname}`;

  useEffect(() => {
    // Обновляем title
    document.title = title;

    // Функция для обновления или создания мета-тега
    const updateMetaTag = (name, content, property = false) => {
      const attr = property ? 'property' : 'name';
      let meta = document.querySelector(`meta[${attr}="${name}"]`);
      if (!meta) {
        meta = document.createElement('meta');
        meta.setAttribute(attr, name);
        document.head.appendChild(meta);
      }
      meta.setAttribute('content', content);
    };

    // Обновляем мета-теги
    updateMetaTag('description', description);
    updateMetaTag('keywords', keywords);

    // Open Graph
    updateMetaTag('og:title', title, true);
    updateMetaTag('og:description', description, true);
    updateMetaTag('og:url', canonicalUrl, true);
    updateMetaTag('og:type', 'website', true);
    updateMetaTag('og:site_name', SITE_NAME, true);
    updateMetaTag('og:locale', 'ru_RU', true);

    // Twitter
    updateMetaTag('twitter:title', title);
    updateMetaTag('twitter:description', description);
    updateMetaTag('twitter:url', canonicalUrl);

    // Robots
    if (noindex) {
      updateMetaTag('robots', 'noindex, nofollow');
    } else {
      updateMetaTag('robots', 'index, follow');
    }

    // Canonical URL
    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.setAttribute('rel', 'canonical');
      document.head.appendChild(canonical);
    }
    canonical.setAttribute('href', canonicalUrl);

    // JSON-LD структурированные данные
    const updateJsonLd = (id, schema) => {
      let script = document.getElementById(id);
      if (!script) {
        script = document.createElement('script');
        script.id = id;
        script.type = 'application/ld+json';
        document.head.appendChild(script);
      }
      script.textContent = JSON.stringify(schema);
    };

    // Добавляем схемы
    updateJsonLd('schema-organization', organizationSchema);
    updateJsonLd('schema-website', websiteSchema);

    // Breadcrumbs (только для вложенных страниц)
    const breadcrumbs = generateBreadcrumbs(pathname);
    if (breadcrumbs) {
      updateJsonLd('schema-breadcrumbs', breadcrumbs);
    } else {
      const breadcrumbScript = document.getElementById('schema-breadcrumbs');
      if (breadcrumbScript) {
        breadcrumbScript.remove();
      }
    }

    // Cleanup не нужен - теги остаются при переходе между страницами
  }, [title, description, keywords, canonicalUrl, pathname, noindex]);

  return null; // Компонент не рендерит ничего в DOM
};

export default SEO;
