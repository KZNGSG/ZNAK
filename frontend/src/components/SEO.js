import React from 'react';
import { Helmet } from 'react-helmet-async';

const SEO = ({
  title,
  description,
  keywords,
  canonical,
  ogType = 'website',
  ogImage = 'https://promarkirui.ru/og-image.png',
  noindex = false,
  schema = null
}) => {
  const siteName = 'Про.Маркируй';
  const baseUrl = 'https://promarkirui.ru';

  const fullTitle = title ? `${title} | ${siteName}` : `${siteName} - маркировка товаров под ключ`;
  const fullCanonical = canonical ? `${baseUrl}${canonical}` : baseUrl;

  return (
    <Helmet>
      {/* Основные мета-теги */}
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      {keywords && <meta name="keywords" content={keywords} />}
      <link rel="canonical" href={fullCanonical} />

      {/* Robots */}
      {noindex && <meta name="robots" content="noindex, nofollow" />}

      {/* Open Graph */}
      <meta property="og:type" content={ogType} />
      <meta property="og:url" content={fullCanonical} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={ogImage} />
      <meta property="og:site_name" content={siteName} />
      <meta property="og:locale" content="ru_RU" />

      {/* Twitter Card */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:url" content={fullCanonical} />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={ogImage} />

      {/* Schema.org JSON-LD */}
      {schema && (
        <script type="application/ld+json">
          {JSON.stringify(schema)}
        </script>
      )}
    </Helmet>
  );
};

// Готовые конфигурации для страниц
export const seoConfig = {
  home: {
    title: 'Маркировка товаров под ключ',
    description: 'Полное сопровождение маркировки товаров. Проверка подлежит ли товар маркировке, подбор оборудования, обучение работе с Честный ЗНАК. Бесплатная консультация!',
    keywords: 'маркировка товаров, честный знак, маркировка под ключ, сопровождение маркировки',
    canonical: '/'
  },
  check: {
    title: 'Проверка товара на маркировку',
    description: 'Бесплатно проверьте, подлежит ли ваш товар обязательной маркировке по коду ТН ВЭД. Актуальная база товаров системы Честный ЗНАК на 2025 год.',
    keywords: 'проверка маркировки, подлежит ли товар маркировке, ТН ВЭД маркировка, проверить товар',
    canonical: '/check'
  },
  timeline: {
    title: 'Сроки маркировки товаров 2025',
    description: 'Актуальные сроки ввода обязательной маркировки товаров в России. Календарь маркировки на 2025 год: одежда, обувь, молочка, вода, пиво и другие категории.',
    keywords: 'сроки маркировки, календарь маркировки 2025, когда маркировка обязательна, даты маркировки',
    canonical: '/timeline'
  },
  equipment: {
    title: 'Оборудование для маркировки товаров',
    description: 'Подбор оборудования для маркировки: принтеры этикеток, сканеры DataMatrix, терминалы сбора данных. Помощь в выборе под ваши задачи и бюджет.',
    keywords: 'оборудование для маркировки, принтер этикеток datamatrix, сканер честный знак, ТСД',
    canonical: '/equipment'
  },
  training: {
    title: 'Обучение маркировке товаров',
    description: 'Обучение сотрудников работе с системой маркировки Честный ЗНАК. Практические курсы: от регистрации до работы с ЭДО. Сертификат по окончании.',
    keywords: 'обучение маркировке, курсы честный знак, обучение работе с маркировкой',
    canonical: '/training'
  },
  knowledge: {
    title: 'База знаний по маркировке',
    description: 'Полезные статьи и инструкции по маркировке товаров. Ответы на частые вопросы, пошаговые руководства, новости системы Честный ЗНАК.',
    keywords: 'статьи о маркировке, инструкции честный знак, вопросы по маркировке',
    canonical: '/knowledge'
  },
  about: {
    title: 'О компании',
    description: 'Про.Маркируй - команда экспертов по маркировке товаров. Более 1000 успешных проектов. Помогаем бизнесу соответствовать требованиям Честного ЗНАКа.',
    keywords: 'про маркируй, компания маркировка, эксперты по маркировке',
    canonical: '/about'
  },
  contacts: {
    title: 'Контакты',
    description: 'Свяжитесь с нами для консультации по маркировке товаров. Телефон, email, форма обратной связи. Ответим на ваши вопросы в течение 30 минут.',
    keywords: 'контакты про маркируй, консультация по маркировке',
    canonical: '/contacts'
  }
};

// Schema.org разметки
export const schemas = {
  organization: {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": "Про.Маркируй",
    "url": "https://promarkirui.ru",
    "logo": "https://promarkirui.ru/logo.png",
    "description": "Полное сопровождение маркировки товаров",
    "address": {
      "@type": "PostalAddress",
      "addressCountry": "RU"
    },
    "contactPoint": {
      "@type": "ContactPoint",
      "contactType": "customer service",
      "availableLanguage": "Russian"
    }
  },
  website: {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "name": "Про.Маркируй",
    "url": "https://promarkirui.ru",
    "potentialAction": {
      "@type": "SearchAction",
      "target": "https://promarkirui.ru/search?q={search_term_string}",
      "query-input": "required name=search_term_string"
    }
  },
  breadcrumb: (items) => ({
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": items.map((item, index) => ({
      "@type": "ListItem",
      "position": index + 1,
      "name": item.name,
      "item": `https://promarkirui.ru${item.url}`
    }))
  })
};

export default SEO;
