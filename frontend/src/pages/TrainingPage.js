import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  GraduationCap, Users, Target, CheckCircle2, Clock, Star,
  BookOpen, Award, Headphones, ArrowRight, ChevronDown, ChevronUp,
  Briefcase, TrendingUp, Shield, Zap, MessageCircle, Calendar,
  Play, FileCheck, Laptop, Building2, UserCheck, Rocket,
  BadgeCheck, Mail, X, Loader2, Check
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import SEO from '../components/SEO';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL || 'https://promarkirui.ru';

// Модули курса
const COURSE_MODULES = [
  {
    id: 1,
    title: 'Основы системы маркировки',
    duration: '4 часа',
    icon: BookOpen,
    topics: [
      'Архитектура ГИС МТ "Честный ЗНАК" изнутри',
      'Все роли участников: производитель, импортёр, опт, розница',
      'Товарные группы: особенности и подводные камни каждой',
      'Законодательная база и ответственность',
      'Структура кодов Data Matrix'
    ]
  },
  {
    id: 2,
    title: 'Регистрация и настройка',
    duration: '3 часа',
    icon: UserCheck,
    topics: [
      'Регистрация компании в системе от А до Я',
      'Настройка ЭЦП для всех сотрудников',
      'Подключение ЭДО-оператора с роумингом',
      'Интеграция с 1С (УТ, ERP, Розница, БП)',
      'Настройка прав доступа и ролей'
    ]
  },
  {
    id: 3,
    title: 'Работа с кодами маркировки',
    duration: '6 часов',
    icon: Target,
    topics: [
      'Заказ кодов: ручной, через API, массовый импорт',
      'Агрегация и разагрегация: логика и практика',
      'Печать этикеток: настройка принтеров, макеты, GS1',
      'Контроль качества печати и считывания',
      'Перемаркировка: когда нужна и как делать правильно'
    ]
  },
  {
    id: 4,
    title: 'Электронный документооборот',
    duration: '4 часа',
    icon: FileCheck,
    topics: [
      'УПД: формирование, отправка, приёмка',
      'Возвраты и корректировочные документы',
      'Частичная приёмка товаров',
      'Работа с расхождениями и спорами',
      'Автоматизация документооборота'
    ]
  },
  {
    id: 5,
    title: 'Ввод и вывод из оборота',
    duration: '4 часа',
    icon: TrendingUp,
    topics: [
      'Все сценарии ввода: производство, импорт, остатки, комиссия',
      'Все сценарии вывода: розница, списание, экспорт, возврат',
      'Кассовые операции: интеграция ККТ + маркировка',
      'Работа с агрегатами и наборами',
      'Особенности для разных товарных групп'
    ]
  },
  {
    id: 6,
    title: 'Импорт маркированных товаров',
    duration: '4 часа',
    icon: Building2,
    topics: [
      'Схемы маркировки: на таможне vs на складе',
      'Работа с таможенным брокером',
      'FCS-коды и таможенные декларации',
      'Особенности импорта из Китая, ЕС, СНГ',
      'Практика: разбор реальных поставок'
    ]
  },
  {
    id: 7,
    title: 'Отчётность и контроль',
    duration: '3 часа',
    icon: Shield,
    topics: [
      'Мониторинг ошибок в личном кабинете',
      'Аналитические отчёты для руководства',
      'Подготовка к проверкам Роспотребнадзора',
      'Исправление "зависших" кодов',
      'Работа с блокировками и ограничениями'
    ]
  },
  {
    id: 8,
    title: 'Автоматизация процессов',
    duration: '4 часа',
    icon: Zap,
    topics: [
      'API Честного ЗНАКа: практическое применение',
      'Интеграция с WMS и ERP-системами',
      'Автоматические отчёты и уведомления',
      'Масштабирование на несколько юрлиц',
      'Оптимизация бизнес-процессов'
    ]
  }
];

// Тарифы
const PRICING_PLANS = [
  {
    id: 'standard',
    name: 'Стандарт',
    price: '50 000',
    description: 'Полный курс для самостоятельной работы',
    popular: false,
    features: [
      { text: '32 часа онлайн-занятий', included: true },
      { text: 'Все 8 модулей программы', included: true },
      { text: 'Рабочие материалы и чек-листы', included: true },
      { text: 'Сертификат о прохождении', included: true },
      { text: 'Поддержка 14 дней после курса', included: true },
      { text: 'Практика на вашем ЛК', included: false },
      { text: 'Настройка вашей 1С', included: false },
      { text: 'Личный чат с экспертом', included: false },
    ]
  },
  {
    id: 'premium',
    name: 'Премиум',
    price: '80 000',
    description: 'Курс + практика на вашей компании',
    popular: true,
    features: [
      { text: '32 часа онлайн-занятий', included: true },
      { text: 'Все 8 модулей программы', included: true },
      { text: 'Рабочие материалы и чек-листы', included: true },
      { text: 'Сертификат о прохождении', included: true },
      { text: 'Поддержка 30 дней после курса', included: true },
      { text: 'Практика на вашем ЛК', included: true },
      { text: 'Настройка вашей 1С', included: true },
      { text: 'Личный чат с экспертом', included: false },
    ]
  },
  {
    id: 'vip',
    name: 'VIP',
    price: '150 000',
    description: 'Полное сопровождение',
    popular: false,
    features: [
      { text: '32 часа онлайн-занятий', included: true },
      { text: 'Все 8 модулей программы', included: true },
      { text: 'Рабочие материалы и чек-листы', included: true },
      { text: 'Сертификат о прохождении', included: true },
      { text: 'Поддержка 90 дней после курса', included: true },
      { text: 'Практика на вашем ЛК', included: true },
      { text: 'Настройка вашей 1С', included: true },
      { text: 'Личный чат с экспертом 24/7', included: true },
    ]
  }
];

// Дополнительные форматы
const ADDITIONAL_FORMATS = [
  {
    id: 'cashier',
    name: 'Мини-курс для кассиров',
    duration: '4 часа практики',
    price: '10 000'
  },
  {
    id: 'accountant',
    name: 'Курс для бухгалтера',
    duration: '8 часов практики',
    price: '20 000'
  },
  {
    id: 'corporate',
    name: 'Корпоративное',
    duration: 'до 10 человек',
    price: 'от 120 000'
  }
];

// Для кого курс
const TARGET_AUDIENCE = [
  {
    icon: Briefcase,
    title: 'Предприниматели',
    description: 'ИП и владельцы бизнеса, которых коснулась или скоро коснётся обязательная маркировка',
    color: 'blue'
  },
  {
    icon: Users,
    title: 'Сотрудники компаний',
    description: 'Бухгалтеры, кладовщики, менеджеры — все, кто работает с маркированным товаром',
    color: 'green'
  },
  {
    icon: Building2,
    title: 'Руководители',
    description: 'Директора и топ-менеджеры, которым нужно понимать процессы и контролировать работу',
    color: 'purple'
  },
  {
    icon: Rocket,
    title: 'Партнёры',
    description: 'Интеграторы, консультанты, бухгалтерские компании — обучитесь и зарабатывайте вместе с нами',
    color: 'yellow'
  }
];

// Преимущества
const ADVANTAGES = [
  {
    icon: Play,
    title: 'Живые занятия',
    description: 'Не записанные видео, а диалог с экспертом. Задавайте вопросы и получайте ответы сразу'
  },
  {
    icon: Laptop,
    title: 'Практика на вашем ЛК',
    description: 'Работаем с вашими реальными товарами, кодами и документами'
  },
  {
    icon: Target,
    title: 'Решаем ваши кейсы',
    description: 'Разбираем именно ваши ошибки, проблемы и специфику бизнеса'
  },
  {
    icon: Award,
    title: 'Гарантия результата',
    description: 'Если после курса остались вопросы — доучиваем бесплатно'
  },
  {
    icon: Headphones,
    title: 'Поддержка после курса',
    description: 'Не бросаем после обучения. Отвечаем на вопросы в чате'
  },
  {
    icon: BadgeCheck,
    title: 'Сертификат',
    description: 'Официальное подтверждение компетенций для вас и работодателя'
  }
];

// Результаты обучения
const LEARNING_OUTCOMES = [
  'Самостоятельно работаете в ЛК Честный ЗНАК без ошибок',
  'Настроена интеграция с вашей учётной системой',
  'Понимаете все процессы маркировки от А до Я',
  'Знаете, как готовиться к проверкам',
  'Экономите на услугах подрядчиков',
  'Можете обучать своих сотрудников',
  'Получаете сертификат о прохождении курса',
  'Имеете поддержку экспертов после обучения'
];

// FAQ
const FAQ_ITEMS = [
  {
    question: 'Нужны ли какие-то начальные знания?',
    answer: 'Нет, курс подходит для начинающих. Мы объясняем всё с нуля, простым языком. Главное — иметь компьютер с доступом в интернет и желание разобраться.'
  },
  {
    question: 'Как проходят занятия?',
    answer: 'Занятия проходят онлайн через Zoom или Google Meet. Вы видите экран преподавателя, можете задавать вопросы голосом или в чате. Запись занятий предоставляется для повторения.'
  },
  {
    question: 'Можно ли обучить нескольких сотрудников?',
    answer: 'Да! Для корпоративного обучения (до 10 человек) действует специальная цена от 120 000 ₽. Также есть отдельные мини-курсы для кассиров и бухгалтеров.'
  },
  {
    question: 'Что если я не смогу присутствовать на занятии?',
    answer: 'Все занятия записываются. Вы получите запись и сможете посмотреть в удобное время. Также можно перенести занятие, предупредив за 24 часа.'
  },
  {
    question: 'Как стать партнёром?',
    answer: 'После прохождения курса вы можете стать нашим партнёром и зарабатывать на консультациях по маркировке. Мы предоставим методические материалы, поддержку и клиентов по партнёрской программе.'
  },
  {
    question: 'Есть ли рассрочка?',
    answer: 'Да, возможна рассрочка на 2-3 месяца без переплаты. Также работаем с юридическими лицами по договору с постоплатой.'
  }
];

// Компонент модуля курса
const CourseModule = ({ module, isOpen, onToggle }) => {
  const Icon = module.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="bg-white rounded-2xl border border-gray-200 overflow-hidden hover:border-yellow-300 transition-colors"
    >
      <button
        onClick={onToggle}
        className="w-full p-6 flex items-center justify-between text-left"
      >
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-yellow-100 flex items-center justify-center">
            <Icon className="w-6 h-6 text-yellow-600" />
          </div>
          <div>
            <h3 className="font-bold text-gray-900">
              Модуль {module.id}. {module.title}
            </h3>
            <p className="text-sm text-gray-500 flex items-center gap-1 mt-1">
              <Clock className="w-4 h-4" />
              {module.duration}
            </p>
          </div>
        </div>
        {isOpen ? (
          <ChevronUp className="w-5 h-5 text-gray-400" />
        ) : (
          <ChevronDown className="w-5 h-5 text-gray-400" />
        )}
      </button>

      {isOpen && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          className="px-6 pb-6"
        >
          <ul className="space-y-2 ml-16">
            {module.topics.map((topic, idx) => (
              <li key={idx} className="flex items-start gap-2 text-gray-600">
                <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                <span>{topic}</span>
              </li>
            ))}
          </ul>
        </motion.div>
      )}
    </motion.div>
  );
};

// Компонент тарифа
const PricingCard = ({ plan, onSelect }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className={`relative bg-white rounded-3xl border-2 p-8 ${
        plan.popular
          ? 'border-yellow-400 shadow-xl shadow-yellow-100'
          : 'border-gray-200'
      }`}
    >
      {plan.popular && (
        <div className="absolute -top-4 left-1/2 -translate-x-1/2 whitespace-nowrap">
          <span className="bg-yellow-400 text-gray-900 px-4 py-1.5 rounded-full text-sm font-bold shadow-md">
            Популярный
          </span>
        </div>
      )}

      <div className="text-center mb-6">
        <h3 className="text-2xl font-bold text-gray-900 mb-2">{plan.name}</h3>
        <p className="text-gray-500 text-sm">{plan.description}</p>
        <div className="mt-4">
          <span className="text-4xl font-bold text-gray-900">{plan.price}</span>
          <span className="text-gray-500 ml-1">₽</span>
        </div>
      </div>

      <ul className="space-y-3 mb-8">
        {plan.features.map((feature, idx) => (
          <li key={idx} className="flex items-center gap-3">
            {feature.included ? (
              <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
            ) : (
              <div className="w-5 h-5 rounded-full border-2 border-gray-200 flex-shrink-0" />
            )}
            <span className={feature.included ? 'text-gray-700' : 'text-gray-400'}>
              {feature.text}
            </span>
          </li>
        ))}
      </ul>

      <Button
        onClick={() => onSelect(plan)}
        className={`w-full py-6 text-lg font-bold rounded-xl ${
          plan.popular
            ? 'bg-yellow-400 hover:bg-yellow-500 text-gray-900'
            : 'bg-gray-900 hover:bg-gray-800 text-white'
        }`}
      >
        Записаться на курс
      </Button>
    </motion.div>
  );
};

// Компонент FAQ
const FAQItem = ({ item, isOpen, onToggle }) => {
  return (
    <div className="border-b border-gray-200 last:border-0">
      <button
        onClick={onToggle}
        className="w-full py-5 flex items-center justify-between text-left"
      >
        <span className="font-medium text-gray-900 pr-4">{item.question}</span>
        {isOpen ? (
          <ChevronUp className="w-5 h-5 text-gray-400 flex-shrink-0" />
        ) : (
          <ChevronDown className="w-5 h-5 text-gray-400 flex-shrink-0" />
        )}
      </button>
      {isOpen && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          className="pb-5"
        >
          <p className="text-gray-600">{item.answer}</p>
        </motion.div>
      )}
    </div>
  );
};

// Модальное окно записи на курс
const EnrollmentModal = ({ isOpen, onClose, selectedPlan }) => {
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    company: '',
    comment: ''
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name || !formData.phone) {
      toast.error('Заполните обязательные поля');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/api/training/enroll`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          plan_id: selectedPlan?.id,
          plan_name: selectedPlan?.name,
          plan_price: selectedPlan?.price
        }),
      });

      if (response.ok) {
        setSuccess(true);
        toast.success('Заявка отправлена! Мы свяжемся с вами в ближайшее время.');
      } else {
        throw new Error('Ошибка отправки');
      }
    } catch (error) {
      toast.error('Произошла ошибка. Попробуйте позже.');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({ name: '', phone: '', email: '', company: '', comment: '' });
    setSuccess(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
        onClick={handleClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="bg-white rounded-3xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="sticky top-0 bg-white border-b border-gray-100 p-6 rounded-t-3xl">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Запись на курс</h2>
                {selectedPlan && (
                  <p className="text-gray-500 mt-1">
                    Тариф: <span className="font-semibold text-yellow-600">{selectedPlan.name}</span>
                    {' — '}{selectedPlan.price} ₽
                  </p>
                )}
              </div>
              <button
                onClick={handleClose}
                className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
              >
                <X className="w-6 h-6 text-gray-400" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-6">
            {success ? (
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="text-center py-8"
              >
                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Check className="w-10 h-10 text-green-600" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Заявка отправлена!</h3>
                <p className="text-gray-600 mb-6">
                  Мы свяжемся с вами в течение часа, чтобы обсудить детали обучения.
                </p>
                <Button
                  onClick={handleClose}
                  className="bg-gray-900 hover:bg-gray-800 text-white px-8 py-3 rounded-xl"
                >
                  Закрыть
                </Button>
              </motion.div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Ваше имя <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="text"
                    placeholder="Иван Иванов"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-yellow-400"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Телефон <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="tel"
                    placeholder="+7 (999) 123-45-67"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-yellow-400"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <Input
                    type="email"
                    placeholder="email@example.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-yellow-400"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Компания
                  </label>
                  <Input
                    type="text"
                    placeholder="Название компании"
                    value={formData.company}
                    onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-yellow-400"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Комментарий
                  </label>
                  <textarea
                    placeholder="Расскажите о ваших задачах или вопросах"
                    value={formData.comment}
                    onChange={(e) => setFormData({ ...formData, comment: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-yellow-400 resize-none"
                    rows={3}
                  />
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-yellow-400 hover:bg-yellow-500 text-gray-900 py-4 text-lg font-bold rounded-xl disabled:opacity-50"
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Отправляем...
                    </span>
                  ) : (
                    'Отправить заявку'
                  )}
                </Button>

                <p className="text-xs text-gray-500 text-center">
                  Нажимая кнопку, вы соглашаетесь с{' '}
                  <Link to="/privacy" className="text-yellow-600 hover:underline">
                    политикой конфиденциальности
                  </Link>
                </p>
              </form>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

const TrainingPage = () => {
  const [openModule, setOpenModule] = useState(1);
  const [openFaq, setOpenFaq] = useState(null);
  const [showEnrollModal, setShowEnrollModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);

  const handleSelectPlan = (plan) => {
    setSelectedPlan(plan);
    setShowEnrollModal(true);
  };

  const handleEnrollClick = () => {
    // Скролл к тарифам
    document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' });
  };

  // JSON-LD Schema для SEO
  useEffect(() => {
    // Course Schema
    const courseSchema = {
      "@context": "https://schema.org",
      "@type": "Course",
      "name": "Обучение маркировке товаров — Академия Про.Маркируй",
      "description": "Профессиональное обучение работе с системой Честный ЗНАК. 32 часа практики с экспертом, 8 модулей программы, гарантия результата.",
      "provider": {
        "@type": "Organization",
        "name": "Про.Маркируй",
        "url": "https://promarkirui.ru"
      },
      "hasCourseInstance": [
        {
          "@type": "CourseInstance",
          "courseMode": "Online",
          "courseWorkload": "PT32H",
          "instructor": {
            "@type": "Organization",
            "name": "Эксперты Про.Маркируй"
          }
        }
      ],
      "offers": [
        {
          "@type": "Offer",
          "name": "Стандарт",
          "price": "50000",
          "priceCurrency": "RUB",
          "availability": "https://schema.org/InStock"
        },
        {
          "@type": "Offer",
          "name": "Премиум",
          "price": "80000",
          "priceCurrency": "RUB",
          "availability": "https://schema.org/InStock"
        },
        {
          "@type": "Offer",
          "name": "VIP",
          "price": "150000",
          "priceCurrency": "RUB",
          "availability": "https://schema.org/InStock"
        }
      ],
      "about": [
        "Маркировка товаров",
        "Честный ЗНАК",
        "Data Matrix",
        "Электронный документооборот",
        "1С интеграция"
      ],
      "audience": {
        "@type": "Audience",
        "audienceType": "Предприниматели, сотрудники компаний, руководители, партнёры"
      },
      "educationalLevel": "Начинающий - Продвинутый",
      "inLanguage": "ru"
    };

    // FAQ Schema
    const faqSchema = {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      "mainEntity": FAQ_ITEMS.map(item => ({
        "@type": "Question",
        "name": item.question,
        "acceptedAnswer": {
          "@type": "Answer",
          "text": item.answer
        }
      }))
    };

    // Add schemas to head
    const addSchema = (id, schema) => {
      let script = document.getElementById(id);
      if (!script) {
        script = document.createElement('script');
        script.id = id;
        script.type = 'application/ld+json';
        document.head.appendChild(script);
      }
      script.textContent = JSON.stringify(schema);
    };

    addSchema('training-course-schema', courseSchema);
    addSchema('training-faq-schema', faqSchema);

    return () => {
      const courseScript = document.getElementById('training-course-schema');
      const faqScript = document.getElementById('training-faq-schema');
      if (courseScript) courseScript.remove();
      if (faqScript) faqScript.remove();
    };
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <SEO
        title="Обучение маркировке товаров | Академия Про.Маркируй"
        description="Профессиональное обучение работе с Честным ЗНАКом. 32 часа практики, живые занятия с экспертом, гарантия результата. Курсы для предпринимателей и сотрудников."
        keywords="обучение маркировке, курсы честный знак, обучение честный знак, курсы маркировка товаров"
      />

      {/* Hero Section */}
      <section className="relative py-16 lg:py-24 overflow-hidden">
        {/* Gradient Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-yellow-50 via-white to-blue-50" />
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.5 }}
          className="absolute top-20 right-10 w-[600px] h-[600px] rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(250,204,21,0.3) 0%, rgba(250,204,21,0) 70%)',
            filter: 'blur(80px)'
          }}
        />
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.3 }}
          className="absolute bottom-0 left-10 w-[400px] h-[400px] rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(59,130,246,0.2) 0%, rgba(59,130,246,0) 70%)',
            filter: 'blur(60px)'
          }}
        />

        <div className="relative mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
            >
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-yellow-100 border border-yellow-300 mb-6">
                <GraduationCap className="w-5 h-5 text-yellow-600" />
                <span className="text-sm font-semibold text-yellow-700">Академия Про.Маркируй</span>
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 mb-6 leading-tight">
                Научим работать с маркировкой{' '}
                <span className="text-yellow-500">без ошибок</span>
              </h1>

              <p className="text-xl text-gray-600 mb-8 leading-relaxed">
                Единственный курс, после которого вы забудете о проблемах с Честным ЗНАКом навсегда.
                <span className="font-semibold text-gray-900"> 32 часа практики</span> с экспертом на ваших реальных задачах.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 mb-8">
                <Button
                  onClick={handleEnrollClick}
                  className="w-full sm:w-auto bg-yellow-400 hover:bg-yellow-500 text-gray-900 px-8 py-6 text-lg font-bold rounded-xl shadow-lg shadow-yellow-200"
                >
                  Записаться на курс
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
                <a href="#program">
                  <Button variant="outline" className="w-full sm:w-auto border-2 border-gray-300 hover:border-gray-400 px-8 py-6 text-lg rounded-xl">
                    Смотреть программу
                  </Button>
                </a>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-6">
                <div>
                  <div className="text-3xl font-bold text-gray-900">32</div>
                  <div className="text-sm text-gray-500">часа обучения</div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-gray-900">8</div>
                  <div className="text-sm text-gray-500">модулей</div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-gray-900">100%</div>
                  <div className="text-sm text-gray-500">практики</div>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="relative"
            >
              {/* Decorative Card */}
              <div className="relative bg-white rounded-3xl shadow-2xl p-8 border border-gray-100">
                <div className="absolute -top-4 -right-4 w-20 h-20 bg-yellow-400 rounded-2xl flex items-center justify-center shadow-lg">
                  <GraduationCap className="w-10 h-10 text-gray-900" />
                </div>

                <h3 className="text-xl font-bold text-gray-900 mb-6">После обучения вы сможете:</h3>

                <ul className="space-y-4">
                  {LEARNING_OUTCOMES.slice(0, 6).map((outcome, idx) => (
                    <li key={idx} className="flex items-start gap-3">
                      <CheckCircle2 className="w-6 h-6 text-green-500 flex-shrink-0" />
                      <span className="text-gray-700">{outcome}</span>
                    </li>
                  ))}
                </ul>

              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Target Audience */}
      <section className="py-16 bg-white">
        <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              Для кого это обучение?
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Курс подходит всем, кто сталкивается с обязательной маркировкой товаров
            </p>
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {TARGET_AUDIENCE.map((item, idx) => {
              const Icon = item.icon;
              const colors = {
                blue: 'bg-blue-100 text-blue-600 border-blue-200',
                green: 'bg-green-100 text-green-600 border-green-200',
                purple: 'bg-purple-100 text-purple-600 border-purple-200',
                yellow: 'bg-yellow-100 text-yellow-600 border-yellow-200'
              };

              return (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: idx * 0.1 }}
                  className="bg-white rounded-2xl border border-gray-200 p-6 hover:shadow-lg transition-shadow"
                >
                  <div className={`w-14 h-14 rounded-xl ${colors[item.color]} border flex items-center justify-center mb-4`}>
                    <Icon className="w-7 h-7" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 mb-2">{item.title}</h3>
                  <p className="text-gray-600 text-sm">{item.description}</p>
                </motion.div>
              );
            })}
          </div>

          {/* Partner CTA */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mt-12 bg-gradient-to-r from-gray-900 to-gray-800 rounded-3xl p-8 lg:p-12"
          >
            <div className="grid lg:grid-cols-2 gap-8 items-center">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-yellow-400/20 border border-yellow-400/30 mb-4">
                  <Rocket className="w-4 h-4 text-yellow-400" />
                  <span className="text-sm font-medium text-yellow-400">Партнёрская программа</span>
                </div>
                <h3 className="text-2xl lg:text-3xl font-bold text-white mb-4">
                  Зарабатывайте на маркировке вместе с нами
                </h3>
                <p className="text-gray-300 mb-6">
                  Пройдите обучение и станьте сертифицированным партнёром Про.Маркируй.
                  Консультируйте клиентов, получайте комиссию с каждой сделки.
                  Мы обеспечим вас клиентами и поддержкой.
                </p>
                <Link to="/partners">
                  <Button className="bg-yellow-400 hover:bg-yellow-500 text-gray-900 px-6 py-3 font-bold rounded-xl">
                    Узнать о партнёрстве
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </Button>
                </Link>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white/10 rounded-2xl p-6 text-center">
                  <div className="text-3xl font-bold text-yellow-400 mb-1">%</div>
                  <div className="text-sm text-gray-300">комиссия с продаж</div>
                </div>
                <div className="bg-white/10 rounded-2xl p-6 text-center">
                  <div className="text-3xl font-bold text-yellow-400 mb-1">∞</div>
                  <div className="text-sm text-gray-300">потолка дохода нет</div>
                </div>
                <div className="bg-white/10 rounded-2xl p-6 text-center">
                  <div className="text-3xl font-bold text-yellow-400 mb-1">24/7</div>
                  <div className="text-sm text-gray-300">поддержка партнёров</div>
                </div>
                <div className="bg-white/10 rounded-2xl p-6 text-center">
                  <div className="text-3xl font-bold text-yellow-400 mb-1">0 ₽</div>
                  <div className="text-sm text-gray-300">вход в программу</div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Why Us */}
      <section className="py-16 bg-gray-50">
        <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              Почему выбирают нас, а не конкурентов?
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Мы не просто рассказываем теорию — мы решаем ваши реальные задачи
            </p>
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {ADVANTAGES.map((item, idx) => {
              const Icon = item.icon;
              return (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: idx * 0.1 }}
                  className="bg-white rounded-2xl p-6 border border-gray-200 hover:border-yellow-300 transition-colors"
                >
                  <div className="w-12 h-12 rounded-xl bg-yellow-100 flex items-center justify-center mb-4">
                    <Icon className="w-6 h-6 text-yellow-600" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 mb-2">{item.title}</h3>
                  <p className="text-gray-600 text-sm">{item.description}</p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Program */}
      <section id="program" className="py-16 bg-white">
        <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              Программа обучения
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              8 модулей, 32 часа практики — от основ до продвинутых техник автоматизации
            </p>
          </motion.div>

          <div className="space-y-4 max-w-3xl mx-auto">
            {COURSE_MODULES.map((module) => (
              <CourseModule
                key={module.id}
                module={module}
                isOpen={openModule === module.id}
                onToggle={() => setOpenModule(openModule === module.id ? null : module.id)}
              />
            ))}
          </div>

          {/* Total time */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mt-8 max-w-3xl mx-auto bg-yellow-50 rounded-2xl p-6 border border-yellow-200"
          >
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-3">
                <Clock className="w-8 h-8 text-yellow-600" />
                <div>
                  <p className="font-bold text-gray-900">Общая продолжительность</p>
                  <p className="text-gray-600">32 академических часа</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Calendar className="w-8 h-8 text-yellow-600" />
                <div>
                  <p className="font-bold text-gray-900">Формат занятий</p>
                  <p className="text-gray-600">2-3 раза в неделю по 2-3 часа</p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-16 bg-gray-50">
        <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              Выберите подходящий тариф
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Инвестиция в знания окупается уже в первый месяц работы
            </p>
          </motion.div>

          <div className="grid lg:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {PRICING_PLANS.map((plan) => (
              <PricingCard key={plan.id} plan={plan} onSelect={handleSelectPlan} />
            ))}
          </div>

          {/* Additional courses */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mt-12 bg-white rounded-2xl border border-gray-200 p-8"
          >
            <h3 className="text-xl font-bold text-gray-900 mb-6 text-center">
              Дополнительные форматы
            </h3>
            <div className="grid sm:grid-cols-3 gap-6">
              {ADDITIONAL_FORMATS.map((format) => (
                <div key={format.id} className="text-center p-6 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors">
                  <p className="font-bold text-gray-900 mb-1">{format.name}</p>
                  <p className="text-sm text-gray-500 mb-3">{format.duration}</p>
                  <p className="text-2xl font-bold text-yellow-600 mb-4">{format.price} ₽</p>
                  <Button
                    onClick={() => handleSelectPlan({ id: format.id, name: format.name, price: format.price })}
                    variant="outline"
                    className="w-full border-2 border-gray-300 hover:border-yellow-400 hover:bg-yellow-50 rounded-xl py-2"
                  >
                    Выбрать
                  </Button>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-16 bg-white">
        <div className="mx-auto max-w-[800px] px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              Частые вопросы
            </h2>
          </motion.div>

          <div className="bg-gray-50 rounded-2xl p-6 lg:p-8">
            {FAQ_ITEMS.map((item, idx) => (
              <FAQItem
                key={idx}
                item={item}
                isOpen={openFaq === idx}
                onToggle={() => setOpenFaq(openFaq === idx ? null : idx)}
              />
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 bg-gradient-to-br from-yellow-400 to-yellow-500">
        <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center"
          >
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              Готовы начать обучение?
            </h2>
            <p className="text-xl text-gray-800 mb-8 max-w-2xl mx-auto">
              Оставьте заявку, и мы свяжемся с вами в течение часа,
              чтобы подобрать оптимальный формат обучения
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
              <Button
                onClick={handleEnrollClick}
                className="bg-gray-900 hover:bg-gray-800 text-white px-8 py-6 text-lg font-bold rounded-xl shadow-lg"
              >
                Выбрать тариф
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </div>

            <div className="flex items-center justify-center text-gray-800">
              <a href="mailto:info@promarkirui.ru" className="flex items-center gap-2 hover:text-gray-900">
                <Mail className="w-5 h-5" />
                <span className="font-medium">info@promarkirui.ru</span>
              </a>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Модальное окно записи */}
      <EnrollmentModal
        isOpen={showEnrollModal}
        onClose={() => setShowEnrollModal(false)}
        selectedPlan={selectedPlan}
      />
    </div>
  );
};

export default TrainingPage;
