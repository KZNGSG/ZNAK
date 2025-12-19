import React from 'react';
import { Helmet } from 'react-helmet-async';

const GlobalSchema = () => {
  const organizationSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": "Про.Маркируй",
    "url": "https://promarkirui.ru",
    "logo": "https://promarkirui.ru/logo.png",
    "description": "Полное сопровождение маркировки товаров. Проверка, оборудование, обучение работе с Честный ЗНАК.",
    "address": {
      "@type": "PostalAddress",
      "addressCountry": "RU",
      "addressLocality": "Россия"
    },
    "contactPoint": {
      "@type": "ContactPoint",
      "contactType": "customer service",
      "availableLanguage": "Russian"
    }
  };

  const websiteSchema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "name": "Про.Маркируй",
    "url": "https://promarkirui.ru",
    "description": "Маркировка товаров под ключ",
    "potentialAction": {
      "@type": "SearchAction",
      "target": {
        "@type": "EntryPoint",
        "urlTemplate": "https://promarkirui.ru/knowledge?search={search_term_string}"
      },
      "query-input": "required name=search_term_string"
    }
  };

  return (
    <Helmet>
      <script type="application/ld+json">
        {JSON.stringify(organizationSchema)}
      </script>
      <script type="application/ld+json">
        {JSON.stringify(websiteSchema)}
      </script>
    </Helmet>
  );
};

export default GlobalSchema;
