import React, { useState } from 'react';
import {
  BookOpen,
  FileText,
  HelpCircle,
  Phone,
  Mail,
  MessageCircle,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  CheckCircle
} from 'lucide-react';

const PartnerMaterials = () => {
  const [openFaq, setOpenFaq] = useState(null);

  const services = [
    {
      title: 'Регистрация в системе Честный ЗНАК',
      description: 'Помощь в регистрации и настройке личного кабинета для работы с маркировкой товаров',
      price: 'от 5 000 руб.'
    },
    {
      title: 'Получение УКЭП',
      description: 'Оформление усиленной квалифицированной электронной подписи для работы с маркировкой',
      price: 'от 3 000 руб.'
    },
    {
      title: 'Интеграция с 1С и ЭДО',
      description: 'Настройка обмена данными между учётной системой и Честный ЗНАК',
      price: 'от 15 000 руб.'
    },
    {
      title: 'Заказ и нанесение кодов',
      description: 'Полный цикл работы с кодами маркировки: заказ, оплата, нанесение, ввод в оборот',
      price: 'от 1 руб./код'
    },
    {
      title: 'Обучение персонала',
      description: 'Онлайн и офлайн обучение работе с маркировкой для сотрудников компании',
      price: 'от 10 000 руб.'
    },
    {
      title: 'Аудит готовности',
      description: 'Проверка готовности компании к обязательной маркировке и рекомендации по подготовке',
      price: 'от 20 000 руб.'
    }
  ];

  const faqItems = [
    {
      question: 'Что такое обязательная маркировка товаров?',
      answer: 'Обязательная маркировка — это система отслеживания товаров от производителя до конечного потребителя. Каждый товар получает уникальный код DataMatrix, который содержит информацию о производителе, партии и характеристиках товара. Система "Честный ЗНАК" контролирует оборот маркированной продукции.'
    },
    {
      question: 'Какие товары подлежат обязательной маркировке?',
      answer: 'Обязательной маркировке подлежат: табачная продукция, обувь, лекарства, шины, парфюмерия, фототехника, одежда и текстиль, молочная продукция, бутилированная вода, БАДы, антисептики, пиво и пивные напитки, и другие категории товаров. Список постоянно расширяется.'
    },
    {
      question: 'Какие штрафы за отсутствие маркировки?',
      answer: 'За производство и продажу товаров без маркировки предусмотрены штрафы: для должностных лиц — от 5 000 до 10 000 руб., для юридических лиц — от 50 000 до 300 000 руб. При крупных нарушениях возможна конфискация товара и уголовная ответственность.'
    },
    {
      question: 'Как быстро можно начать работу с маркировкой?',
      answer: 'Сроки зависят от готовности компании. При наличии ЭЦП и базового оборудования процесс регистрации и настройки занимает 3-5 рабочих дней. Полная интеграция с учётной системой — от 1 до 4 недель в зависимости от сложности.'
    },
    {
      question: 'Нужно ли специальное оборудование?',
      answer: 'Для работы с маркировкой требуется: компьютер с доступом в интернет, ЭЦП (электронная подпись), 2D-сканер штрих-кодов, принтер этикеток (для нанесения кодов). Для розницы — онлайн-касса с поддержкой маркировки.'
    },
    {
      question: 'Как рассчитывается моя комиссия?',
      answer: 'Комиссия начисляется от суммы оплаченного клиентом коммерческого предложения. Процент комиссии указан в вашем партнёрском договоре (обычно 10%). Комиссия выплачивается после получения оплаты от клиента.'
    }
  ];

  const toggleFaq = (index) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Материалы партнёра</h1>
        <p className="text-gray-500 mt-1">Информация об услугах, FAQ и контакты поддержки</p>
      </div>

      {/* Services */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
          <FileText className="w-5 h-5 text-amber-500" />
          <h2 className="font-semibold text-gray-900">Наши услуги</h2>
        </div>
        <div className="p-6">
          <div className="grid md:grid-cols-2 gap-4">
            {services.map((service, index) => (
              <div
                key={index}
                className="p-4 bg-gray-50 rounded-xl border border-gray-100 hover:border-amber-200 transition-colors"
              >
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-medium text-gray-900">{service.title}</h3>
                  <span className="text-sm font-semibold text-amber-600 whitespace-nowrap ml-2">
                    {service.price}
                  </span>
                </div>
                <p className="text-sm text-gray-600">{service.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Key selling points */}
      <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl border border-amber-200 p-6">
        <h2 className="font-semibold text-amber-900 mb-4">Почему клиенты выбирают нас</h2>
        <div className="grid md:grid-cols-2 gap-4">
          {[
            'Опыт работы с 2019 года',
            'Более 500 успешных проектов',
            'Техподдержка 7 дней в неделю',
            'Работаем со всеми категориями товаров',
            'Гарантия результата',
            'Фиксированные цены без скрытых платежей'
          ].map((point, index) => (
            <div key={index} className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-amber-600 flex-shrink-0" />
              <span className="text-amber-800">{point}</span>
            </div>
          ))}
        </div>
      </div>

      {/* FAQ */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
          <HelpCircle className="w-5 h-5 text-amber-500" />
          <h2 className="font-semibold text-gray-900">Часто задаваемые вопросы</h2>
        </div>
        <div className="divide-y divide-gray-100">
          {faqItems.map((item, index) => (
            <div key={index} className="px-6">
              <button
                onClick={() => toggleFaq(index)}
                className="w-full py-4 flex items-center justify-between text-left"
              >
                <span className="font-medium text-gray-900 pr-4">{item.question}</span>
                {openFaq === index ? (
                  <ChevronUp className="w-5 h-5 text-gray-400 flex-shrink-0" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-gray-400 flex-shrink-0" />
                )}
              </button>
              {openFaq === index && (
                <div className="pb-4 text-gray-600 text-sm leading-relaxed">
                  {item.answer}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Contacts */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
          <MessageCircle className="w-5 h-5 text-amber-500" />
          <h2 className="font-semibold text-gray-900">Контакты поддержки</h2>
        </div>
        <div className="p-6">
          <p className="text-gray-600 mb-4">
            Если у вас есть вопросы или нужна помощь — свяжитесь с нами:
          </p>
          <div className="grid md:grid-cols-3 gap-4">
            <a
              href="tel:+79999999999"
              className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
            >
              <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
                <Phone className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <div className="text-sm text-gray-500">Телефон</div>
                <div className="font-medium text-gray-900">+7 (999) 999-99-99</div>
              </div>
            </a>

            <a
              href="mailto:partner@promarkirui.ru"
              className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
            >
              <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
                <Mail className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <div className="text-sm text-gray-500">Email</div>
                <div className="font-medium text-gray-900">partner@promarkirui.ru</div>
              </div>
            </a>

            <a
              href="https://t.me/promarkirui"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
            >
              <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
                <MessageCircle className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <div className="text-sm text-gray-500">Telegram</div>
                <div className="font-medium text-gray-900 flex items-center gap-1">
                  @promarkirui
                  <ExternalLink className="w-3 h-3" />
                </div>
              </div>
            </a>
          </div>
        </div>
      </div>

      {/* Useful links */}
      <div className="bg-blue-50 rounded-2xl border border-blue-200 p-6">
        <h3 className="font-semibold text-blue-900 mb-3">Полезные ресурсы</h3>
        <div className="space-y-2">
          <a
            href="https://честныйзнак.рф"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-blue-700 hover:text-blue-800"
          >
            <ExternalLink className="w-4 h-4" />
            Официальный сайт Честный ЗНАК
          </a>
          <a
            href="https://promarkirui.ru/check"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-blue-700 hover:text-blue-800"
          >
            <ExternalLink className="w-4 h-4" />
            Проверка товара по коду маркировки
          </a>
          <a
            href="https://promarkirui.ru/timeline"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-blue-700 hover:text-blue-800"
          >
            <ExternalLink className="w-4 h-4" />
            Сроки обязательной маркировки
          </a>
        </div>
      </div>
    </div>
  );
};

export default PartnerMaterials;
