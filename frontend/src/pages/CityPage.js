import React from 'react';
import { useParams, Navigate, Link, useNavigate } from 'react-router-dom';
import { MapPin, Phone, CheckCircle, ArrowRight, Users, Building2, Package, HelpCircle, FileText, BookOpen, Settings } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '../components/ui/button';
import SEO from '../components/SEO';
import { getCityBySlug, getCityFAQ } from '../data/cities';

const CityPage = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const city = getCityBySlug(slug);

  if (!city) {
    return <Navigate to="/" replace />;
  }

  const faq = getCityFAQ(city);

  const actions = [
    {
      icon: BookOpen,
      title: 'База знаний',
      description: `Статьи и инструкции по маркировке для бизнеса ${city.namePrepositional}`,
      path: '/knowledge',
    },
    {
      icon: Settings,
      title: 'Оборудование',
      description: `Подберём оборудование для маркировки с доставкой по ${city.region}`,
      path: '/equipment',
    },
    {
      icon: FileText,
      title: 'Получить КП',
      description: 'Рассчитаем стоимость маркировки для вашего бизнеса',
      path: '/quote',
    },
  ];

  // JSON-LD Schema
  const schema = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "LocalBusiness",
        "@id": `https://promarkirui.ru/city/${city.slug}#business`,
        "name": `Про.Маркируй - Маркировка товаров ${city.namePrepositional}`,
        "description": `Услуги маркировки товаров ${city.namePrepositional}. ${city.description}`,
        "url": `https://promarkirui.ru/city/${city.slug}`,
        "telephone": "+7 (495) 128-99-63",
        "areaServed": {
          "@type": "City",
          "name": city.name
        },
        "geo": {
          "@type": "GeoCoordinates",
          "latitude": city.coordinates.lat,
          "longitude": city.coordinates.lng
        }
      },
      {
        "@type": "FAQPage",
        "mainEntity": faq.map(item => ({
          "@type": "Question",
          "name": item.question,
          "acceptedAnswer": {
            "@type": "Answer",
            "text": item.answer
          }
        }))
      },
      {
        "@type": "BreadcrumbList",
        "itemListElement": [
          { "@type": "ListItem", "position": 1, "name": "Главная", "item": "https://promarkirui.ru" },
          { "@type": "ListItem", "position": 2, "name": `Маркировка ${city.namePrepositional}`, "item": `https://promarkirui.ru/city/${city.slug}` }
        ]
      }
    ]
  };

  return (
    <div className="fade-in">
      <SEO
        title={`Маркировка товаров ${city.namePrepositional}`}
        description={`Услуги маркировки товаров ${city.namePrepositional}. Регистрация в Честном ЗНАКе, поставка оборудования, обучение. ${city.region}.`}
        keywords={city.localKeywords.join(', ')}
        canonical={`/city/${city.slug}`}
        schema={schema}
      />

      {/* Hero Section */}
      <section className="relative py-20 sm:py-32 noise-bg overflow-hidden">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.4 }}
          transition={{ duration: 1 }}
          className="absolute -top-20 -right-20 w-[600px] h-[600px] rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(255,218,7,0.2) 0%, rgba(255,218,7,0) 70%)',
            filter: 'blur(80px)'
          }}
        />
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.35 }}
          transition={{ duration: 1, delay: 0.2 }}
          className="absolute bottom-0 -left-20 w-[700px] h-[700px] rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(245,195,0,0.15) 0%, rgba(245,195,0,0) 70%)',
            filter: 'blur(90px)'
          }}
        />

        <div className="relative mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
            className="max-w-3xl"
          >
            <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white/90 backdrop-blur-sm border-2 border-[rgb(var(--brand-yellow-300))] shadow-md mb-6">
              <MapPin className="w-4 h-4 text-[rgb(var(--brand-yellow-500))]" />
              <span className="text-sm font-bold text-[rgb(var(--black))]">{city.region}</span>
            </div>
            
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-[1.05] tracking-tight text-[rgb(var(--black))] mb-6">
              Маркировка товаров <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#FFDA07] to-[#F5C300]" style={{WebkitTextStroke: '1px rgba(0,0,0,0.1)'}}>{city.namePrepositional}</span>
            </h1>
            
            <p className="text-lg md:text-xl text-[rgb(var(--grey-700))] leading-relaxed max-w-2xl font-medium mb-8">
              {city.description} Помогаем бизнесу подключиться к системе <strong className="text-[rgb(var(--black))] font-bold bg-[rgb(var(--brand-yellow-100))] px-2 py-0.5 rounded">Честный ЗНАК</strong> и организовать маркировку продукции.
            </p>
            
            <div className="flex flex-wrap gap-4">
              <Button
                onClick={() => navigate('/check')}
                className="btn-gradient btn-pulse rounded-2xl px-8 py-4 text-base font-bold h-auto"
              >
                Проверить товар →
              </Button>
              <Button
                onClick={() => navigate('/quote')}
                variant="outline"
                className="rounded-2xl px-8 py-4 text-base font-bold h-auto border-2 border-[rgb(var(--grey-300))]"
              >
                Рассчитать стоимость
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-white border-b border-[rgb(var(--grey-200))]">
        <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {[
              { icon: Users, value: city.population, label: 'Население' },
              { icon: Building2, value: '500+', label: 'Клиентов в регионе' },
              { icon: Package, value: '15+', label: 'Категорий товаров' },
              { icon: Phone, value: `+7 (${city.phoneCode})`, label: 'Код города' },
            ].map((stat, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="text-center"
              >
                <div className="icon-wrapper icon-wrapper-yellow p-4 rounded-2xl shadow-lg mx-auto mb-4 w-fit">
                  <stat.icon className="w-8 h-8" />
                </div>
                <div className="text-2xl md:text-3xl font-bold text-[rgb(var(--black))]">{stat.value}</div>
                <div className="text-sm text-[rgb(var(--grey-600))] font-medium">{stat.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Actions Section */}
      <section className="py-20 section-yellow-tint">
        <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-[rgb(var(--black))] mb-4">
              Наши услуги {city.namePrepositional}
            </h2>
            <p className="text-lg text-[rgb(var(--grey-700))] max-w-2xl mx-auto font-medium">
              Полный комплекс услуг по маркировке товаров для бизнеса
            </p>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {actions.map((action, index) => {
              const Icon = action.icon;
              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.2 + index * 0.1 }}
                  onClick={() => navigate(action.path)}
                  className="group relative bg-white rounded-2xl p-7 overflow-hidden cursor-pointer card-hover border-2 border-[rgb(var(--grey-300))]"
                  style={{ boxShadow: 'var(--shadow-layer)' }}
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-[rgb(var(--brand-yellow-100))] via-[rgb(var(--brand-yellow-50))] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-400" />
                  <div className="relative">
                    <div className="icon-wrapper icon-wrapper-yellow p-5 rounded-2xl shadow-lg mb-5 transition-all duration-300 group-hover:scale-110">
                      <Icon size={36} strokeWidth={2.5} />
                    </div>
                    <h3 className="text-lg font-bold text-[rgb(var(--black))] mb-3">{action.title}</h3>
                    <p className="text-sm text-[rgb(var(--grey-600))] leading-relaxed font-medium">{action.description}</p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-white">
        <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-[rgb(var(--black))] mb-4">
              Почему выбирают нас {city.namePrepositional}
            </h2>
          </div>
          <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {city.features.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: index % 2 === 0 ? -20 : 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="flex items-start gap-4 p-5 bg-[rgb(var(--grey-100))] rounded-2xl"
              >
                <div className="w-8 h-8 rounded-full bg-[rgb(var(--brand-yellow-100))] flex items-center justify-center flex-shrink-0">
                  <CheckCircle className="w-5 h-5 text-[rgb(var(--brand-yellow-600))]" />
                </div>
                <span className="text-[rgb(var(--grey-700))] font-medium">{feature}</span>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Nearby Areas */}
      <section className="py-16 section-yellow-tint">
        <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-[rgb(var(--black))] mb-4">
            Работаем по всему региону
          </h2>
          <p className="text-[rgb(var(--grey-700))] mb-8 font-medium">
            Помимо {city.nameGenitive}, мы обслуживаем:
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            {city.nearbyAreas.map((area, index) => (
              <motion.span 
                key={index}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
                className="bg-white px-5 py-2.5 rounded-full text-[rgb(var(--grey-700))] font-medium border-2 border-[rgb(var(--grey-200))] shadow-sm"
              >
                {area}
              </motion.span>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20 bg-white">
        <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center gap-3 mb-12">
            <div className="icon-wrapper icon-wrapper-yellow p-3 rounded-xl">
              <HelpCircle className="w-6 h-6" />
            </div>
            <h2 className="text-3xl font-bold text-[rgb(var(--black))]">Частые вопросы</h2>
          </div>
          <div className="max-w-3xl mx-auto space-y-4">
            {faq.map((item, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="bg-[rgb(var(--grey-100))] rounded-2xl p-6 border-2 border-[rgb(var(--grey-200))]"
              >
                <h3 className="text-lg font-bold text-[rgb(var(--black))] mb-3">{item.question}</h3>
                <p className="text-[rgb(var(--grey-600))] leading-relaxed">{item.answer}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 noise-bg">
        <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
          >
            <h2 className="text-3xl sm:text-4xl font-bold text-[rgb(var(--black))] mb-6">
              Готовы начать маркировку {city.namePrepositional}?
            </h2>
            <p className="text-lg text-[rgb(var(--grey-700))] mb-8 max-w-2xl mx-auto font-medium">
              Получите бесплатную консультацию. Расскажем о всех этапах и рассчитаем стоимость.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Button
                onClick={() => navigate('/consultation')}
                className="btn-gradient btn-pulse rounded-2xl px-8 py-4 text-base font-bold h-auto"
              >
                Получить консультацию
              </Button>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
};

export default CityPage;
