import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  Building2, FileText, Ship, Package, Briefcase, Printer, Code, Factory,
  Check, ChevronDown, ChevronUp, ArrowRight, Calculator, Users, BarChart3,
  FileCheck, Handshake, MapPin, Search, Phone, Mail, User, MessageSquare
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { toast } from 'sonner';
import SEO from '../components/SEO';

const API_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

const PartnersPage = () => {
  const [openFaq, setOpenFaq] = useState(null);
  const [selectedType, setSelectedType] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const formRef = useRef(null);
  const repFormRef = useRef(null);

  const [formData, setFormData] = useState({
    company_name: '',
    contact_name: '',
    contact_phone: '',
    contact_email: '',
    partner_type: '',
    comment: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Форма представителя
  const [showRepForm, setShowRepForm] = useState(false);
  const [repFormData, setRepFormData] = useState({
    contact_name: '',
    contact_phone: '',
    contact_email: '',
    city: '',
    region: '',
    company_name: '',
    inn: '',
    experience: '',
    comment: ''
  });
  const [isRepSubmitting, setIsRepSubmitting] = useState(false);

  // Автозаполнение компании
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [companySelected, setCompanySelected] = useState(false);
  const [inn, setInn] = useState('');
  const suggestionsRef = useRef(null);
  const searchTimeout = useRef(null);

  const partnerTypes = [
    { id: 'certification', icon: Building2, title: 'Центры сертификации', desc: 'Клиент получил сертификат — предложите маркировку' },
    { id: 'edo_ofd', icon: FileText, title: 'Операторы ЭДО и ОФД', desc: 'Ваши клиенты уже работают с документами' },
    { id: 'customs', icon: Ship, title: 'Таможенные брокеры', desc: 'Импортёрам нужна маркировка до выпуска товара' },
    { id: 'fulfillment', icon: Package, title: 'Склады и фулфилмент', desc: 'Добавьте маркировку в список услуг склада' },
    { id: 'accounting', icon: Briefcase, title: 'Бухгалтерские компании', desc: 'Помогите клиентам разобраться с маркировкой' },
    { id: 'equipment', icon: Printer, title: 'Поставщики оборудования', desc: 'Продали принтер — направьте за настройкой к нам' },
    { id: '1c_integrator', icon: Code, title: '1С-интеграторы', desc: 'Внедряете 1С — маркировка часть проекта' },
    { id: 'packaging', icon: Factory, title: 'Производители упаковки', desc: 'Печатаете этикетки — предлагайте полный цикл' }
  ];

  const steps = [
    { num: 1, title: 'Рекомендуете нас', desc: 'Клиент спросил про маркировку — дайте вашу партнёрскую ссылку' },
    { num: 2, title: 'Мы делаем работу', desc: 'Консультируем, подключаем, настраиваем. Клиент доволен.' },
    { num: 3, title: 'Вы получаете комиссию', desc: 'От 5% с каждой оплаты. Выплаты каждый месяц.' }
  ];

  const conditions = [
    { label: 'Комиссия', value: 'от 5% с каждого клиента' },
    { label: 'Выплаты', value: '1 раз в месяц' },
    { label: 'Куда', value: 'Р/с ООО, ИП или самозанятому' },
    { label: 'Материалы', value: 'Презентации, памятки, скрипты' },
    { label: 'Обучение', value: 'Расскажем всё о маркировке' },
    { label: 'Поддержка', value: 'Менеджер на связи' }
  ];

  const representativeFeatures = [
    { text: 'Эксклюзив на город — все заявки из региона ваши', highlight: true },
    { text: 'Повышенная комиссия — до 20%', highlight: true },
    { text: 'Совместный бренд — работаете под нашим именем', highlight: false },
    { text: 'Полная поддержка — обучение, CRM, материалы', highlight: false },
    { text: 'Минимум вложений — не нужен офис на старте', highlight: false }
  ];

  const freeCities = ['Казань', 'Новосибирск', 'Екатеринбург', 'Нижний Новгород', 'Самара', 'Ростов-на-Дону'];

  const faqs = [
    { q: 'Какой процент комиссии?', a: 'От 5% до 20%. Зависит от объёма и формата сотрудничества. Представители получают больше.' },
    { q: 'Как получить выплату?', a: 'Раз в месяц на расчётный счёт ООО/ИП или как самозанятый.' },
    { q: 'Нужно ли разбираться в маркировке?', a: 'Нет. Мы обучим и дадим материалы. Вы только приводите клиента.' },
    { q: 'Что нужно, чтобы стать представителем?', a: 'Желание развивать направление в своём городе. Офис не обязателен.' },
    { q: 'Работаете только с юрлицами?', a: 'Нет, работаем и с самозанятыми.' }
  ];

  // Закрытие выпадающего списка при клике вне
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(event.target)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Поиск компаний
  const searchCompanies = async (query) => {
    if (query.length < 3) {
      setSuggestions([]);
      return;
    }

    setSearchLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/company/suggest`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inn: query })
      });

      if (response.ok) {
        const data = await response.json();
        setSuggestions(data.suggestions || []);
        setShowSuggestions(true);
      }
    } catch (error) {
      console.error('Company search error:', error);
    } finally {
      setSearchLoading(false);
    }
  };

  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchQuery(value);
    setCompanySelected(false);

    if (searchTimeout.current) {
      clearTimeout(searchTimeout.current);
    }

    searchTimeout.current = setTimeout(() => {
      searchCompanies(value);
    }, 300);
  };

  const selectCompany = (company) => {
    setInn(company.inn || '');
    setFormData({ ...formData, company_name: company.name || '' });
    setSearchQuery(company.name || '');
    setCompanySelected(true);
    setShowSuggestions(false);
  };

  const clearCompany = () => {
    setInn('');
    setFormData({ ...formData, company_name: '' });
    setSearchQuery('');
    setCompanySelected(false);
  };

  const formatPhone = (value) => {
    let cleaned = value.replace(/\D/g, '');
    if (cleaned.length > 11) cleaned = cleaned.slice(0, 11);
    if (cleaned.length > 0 && cleaned[0] !== '7') cleaned = '7' + cleaned;

    let formatted = '+7';
    if (cleaned.length > 1) formatted += ' (' + cleaned.slice(1, 4);
    if (cleaned.length >= 5) formatted += ') ' + cleaned.slice(4, 7);
    if (cleaned.length >= 8) formatted += '-' + cleaned.slice(7, 9);
    if (cleaned.length >= 10) formatted += '-' + cleaned.slice(9, 11);

    return formatted;
  };

  const handleTypeSelect = (type) => {
    setSelectedType(type.id);
    setFormData({ ...formData, partner_type: type.id });
    setShowForm(true);

    // Скролл к форме
    setTimeout(() => {
      formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.contact_name || !formData.contact_phone || !formData.contact_email) {
      toast.error('Заполните все обязательные поля');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch(`${API_URL}/api/partner-request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company_name: formData.company_name || searchQuery,
          contact_name: formData.contact_name,
          contact_phone: formData.contact_phone,
          contact_email: formData.contact_email,
          partner_type: formData.partner_type || 'other',
          comment: formData.comment
        })
      });

      if (response.ok) {
        toast.success('Заявка отправлена! Мы свяжемся с вами в ближайшее время.');
        setFormData({
          company_name: '',
          contact_name: '',
          contact_phone: '',
          contact_email: '',
          partner_type: '',
          comment: ''
        });
        setSearchQuery('');
        setCompanySelected(false);
        setInn('');
        setSelectedType(null);
        setShowForm(false);
      } else {
        throw new Error('Failed to submit');
      }
    } catch (error) {
      toast.error('Ошибка отправки. Попробуйте позже или позвоните нам.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getSelectedTypeName = () => {
    const type = partnerTypes.find(t => t.id === selectedType);
    return type ? type.title : '';
  };

  // Отправка формы представителя
  const handleRepSubmit = async (e) => {
    e.preventDefault();

    if (!repFormData.contact_name || !repFormData.contact_phone || !repFormData.contact_email || !repFormData.city) {
      toast.error('Заполните все обязательные поля');
      return;
    }

    setIsRepSubmitting(true);

    try {
      const response = await fetch(`${API_URL}/api/representative-request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(repFormData)
      });

      if (response.ok) {
        toast.success('Заявка отправлена! Мы свяжемся с вами в ближайшее время.');
        setRepFormData({
          contact_name: '',
          contact_phone: '',
          contact_email: '',
          city: '',
          region: '',
          company_name: '',
          inn: '',
          experience: '',
          comment: ''
        });
        setShowRepForm(false);
      } else {
        throw new Error('Failed to submit');
      }
    } catch (error) {
      toast.error('Ошибка отправки. Попробуйте позже или позвоните нам.');
    } finally {
      setIsRepSubmitting(false);
    }
  };

  const handleShowRepForm = () => {
    setShowRepForm(true);
    setTimeout(() => {
      repFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
  };

  return (
    <div className="min-h-screen">
      <SEO title='Партнерская программа' description='Станьте партнером Про.Маркируй. Зарабатывайте на маркировке товаров.' keywords='партнерская программа маркировка' canonical='/partners' />
      {/* Hero Section */}
      <section className="relative py-16 sm:py-20 noise-bg overflow-hidden">
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

        <div className="relative mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7 }}
              className="space-y-6"
            >
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/90 backdrop-blur-sm border-2 border-[rgb(var(--brand-yellow-300))] shadow-md">
                <Handshake size={18} className="text-[rgb(var(--brand-yellow-600))]" />
                <span className="text-sm font-bold text-[rgb(var(--black))]">Партнёрская программа</span>
              </div>

              <h1 className="text-4xl sm:text-5xl font-bold leading-[1.05] tracking-tight text-[rgb(var(--black))]">
                Зарабатывайте на маркировке{' '}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#FFDA07] to-[#F5C300]" style={{WebkitTextStroke: '1px rgba(0,0,0,0.1)'}}>
                  вместе с нами
                </span>
              </h1>

              <p className="text-lg text-[rgb(var(--grey-700))] leading-relaxed max-w-xl font-medium">
                Приглашаем к сотрудничеству компании, которые работают с бизнесом.
                Комиссия <strong className="text-[rgb(var(--black))] font-bold bg-[rgb(var(--brand-yellow-100))] px-2 py-0.5 rounded">от 5% до 20%</strong> с каждого клиента.
              </p>

              <div className="flex flex-wrap items-center gap-4 pt-2">
                <Link
                  to="/partner/login"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white border-2 border-[rgb(var(--brand-yellow-400))] text-[rgb(var(--black))] font-semibold hover:bg-[rgb(var(--brand-yellow-50))] hover:border-[rgb(var(--brand-yellow-500))] transition-all shadow-sm"
                >
                  Уже партнёр? Войти <ArrowRight size={16} />
                </Link>
              </div>
            </motion.div>

            {/* Right: Calculator preview */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.7, delay: 0.2 }}
              className="hidden lg:block"
            >
              <div className="bg-white rounded-3xl shadow-2xl p-6 border border-gray-100">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 bg-gradient-to-br from-[rgb(var(--brand-yellow-400))] to-[rgb(var(--brand-yellow-500))] rounded-xl flex items-center justify-center">
                    <Calculator size={20} className="text-black" />
                  </div>
                  <div>
                    <h3 className="font-bold text-[rgb(var(--black))]">Калькулятор дохода</h3>
                    <p className="text-sm text-gray-500">Личный кабинет партнёра</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="bg-gray-50 rounded-xl p-4">
                    <p className="text-sm text-gray-500 mb-1">Клиентов в месяц</p>
                    <div className="h-2 bg-gray-200 rounded-full">
                      <div className="h-2 bg-[rgb(var(--brand-yellow-500))] rounded-full w-3/4"></div>
                    </div>
                    <p className="text-right text-lg font-bold mt-1">15</p>
                  </div>

                  <div className="bg-gray-50 rounded-xl p-4">
                    <p className="text-sm text-gray-500 mb-1">Средний чек клиента</p>
                    <p className="text-lg font-bold">45 000 ₽</p>
                  </div>

                  <div className="bg-gradient-to-r from-[rgb(var(--brand-yellow-100))] to-[rgb(var(--brand-yellow-200))] rounded-xl p-4 border-2 border-[rgb(var(--brand-yellow-400))]">
                    <p className="text-sm text-gray-600 mb-1">Ваш доход в месяц</p>
                    <p className="text-3xl font-bold text-[rgb(var(--black))]">33 750 ₽</p>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Partner Types + Integrated Form */}
      <section id="partner-types" className="py-16 sm:py-20 bg-white">
        <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-10"
          >
            <h2 className="text-3xl sm:text-4xl font-bold text-[rgb(var(--black))] mb-3">
              Выберите свою сферу
            </h2>
            <p className="text-lg text-[rgb(var(--grey-600))] max-w-2xl mx-auto">
              Кликните на карточку — откроется форма заявки
            </p>
          </motion.div>

          {/* Partner Type Cards - Clickable */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 mb-10">
            {partnerTypes.map((type, index) => (
              <motion.button
                key={type.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.05 }}
                onClick={() => handleTypeSelect(type)}
                className={`relative text-left p-5 rounded-2xl border-2 transition-all duration-200 ${
                  selectedType === type.id
                    ? 'bg-[rgb(var(--brand-yellow-50))] border-[rgb(var(--brand-yellow-500))] shadow-lg scale-[1.02]'
                    : 'bg-white border-gray-200 hover:border-[rgb(var(--brand-yellow-300))] hover:shadow-md'
                }`}
              >
                {selectedType === type.id && (
                  <div className="absolute top-3 right-3">
                    <div className="w-6 h-6 bg-[rgb(var(--brand-yellow-500))] rounded-full flex items-center justify-center">
                      <Check size={14} className="text-black" />
                    </div>
                  </div>
                )}
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center mb-3 ${
                  selectedType === type.id
                    ? 'bg-[rgb(var(--brand-yellow-500))]'
                    : 'bg-gradient-to-br from-[rgb(var(--brand-yellow-100))] to-[rgb(var(--brand-yellow-200))]'
                }`}>
                  <type.icon size={22} className={selectedType === type.id ? 'text-black' : 'text-[rgb(var(--brand-yellow-700))]'} />
                </div>
                <h3 className="font-bold text-[rgb(var(--black))] text-sm mb-1">{type.title}</h3>
                <p className="text-xs text-[rgb(var(--grey-500))] line-clamp-2">{type.desc}</p>
              </motion.button>
            ))}
          </div>

          {/* Integrated Form - appears after selection */}
          {showForm && (
            <motion.div
              ref={formRef}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="max-w-2xl mx-auto"
            >
              <div className="bg-gradient-to-br from-[rgb(var(--brand-yellow-50))] to-white rounded-3xl p-6 sm:p-8 border-2 border-[rgb(var(--brand-yellow-200))] shadow-xl">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-[rgb(var(--brand-yellow-500))] rounded-xl flex items-center justify-center">
                      <FileText size={20} className="text-black" />
                    </div>
                    <div>
                      <h3 className="font-bold text-[rgb(var(--black))]">Заявка на партнёрство</h3>
                      <p className="text-sm text-gray-500">Заполните форму — мы свяжемся</p>
                    </div>
                  </div>
                </div>

                {/* Selected type badge */}
                <div className="flex items-center gap-2 mb-6 p-3 bg-white rounded-xl border border-[rgb(var(--brand-yellow-300))]">
                  <span className="text-sm text-gray-600">Вы выбрали:</span>
                  <span className="font-semibold text-[rgb(var(--black))]">{getSelectedTypeName()}</span>
                  <button
                    onClick={() => { setSelectedType(null); setShowForm(false); }}
                    className="ml-auto text-sm text-gray-500 hover:text-red-500"
                  >
                    Изменить
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                  {/* Company search */}
                  <div>
                    <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                      <div className="w-5 h-5 rounded-full bg-[rgb(var(--brand-yellow-500))] flex items-center justify-center text-xs text-black font-bold">1</div>
                      Компания
                    </label>

                    {!companySelected ? (
                      <div className="relative" ref={suggestionsRef}>
                        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                          type="text"
                          value={searchQuery}
                          onChange={handleSearchChange}
                          onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                          placeholder="Введите ИНН или название..."
                          className="w-full pl-10 pr-10 py-3 rounded-xl border-2 border-[rgb(var(--brand-yellow-200))] bg-white focus:border-[rgb(var(--brand-yellow-500))] focus:ring-2 focus:ring-[rgb(var(--brand-yellow-100))] outline-none transition-all"
                        />
                        {searchLoading && (
                          <div className="absolute right-3 top-1/2 -translate-y-1/2">
                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-[rgb(var(--brand-yellow-500))]"></div>
                          </div>
                        )}

                        {showSuggestions && suggestions.length > 0 && (
                          <div className="absolute z-50 w-full mt-1 bg-white border-2 border-[rgb(var(--brand-yellow-200))] rounded-xl shadow-xl max-h-48 overflow-y-auto">
                            {suggestions.map((company, index) => (
                              <button
                                key={index}
                                type="button"
                                onClick={() => selectCompany(company)}
                                className="w-full px-4 py-3 text-left hover:bg-[rgb(var(--brand-yellow-50))] border-b border-gray-100 last:border-b-0"
                              >
                                <div className="font-medium text-gray-900 text-sm">{company.name}</div>
                                <div className="text-xs text-gray-500">ИНН: {company.inn}</div>
                              </button>
                            ))}
                          </div>
                        )}
                        <p className="text-xs text-gray-500 mt-1">Или введите название вручную</p>
                      </div>
                    ) : (
                      <div className="bg-emerald-50 border-2 border-emerald-200 rounded-xl p-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-semibold text-gray-900 text-sm">{formData.company_name}</div>
                            {inn && <div className="text-xs text-gray-600">ИНН: {inn}</div>}
                          </div>
                          <button type="button" onClick={clearCompany} className="text-sm text-gray-500 hover:text-red-500">
                            Изменить
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Contact person */}
                  <div>
                    <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                      <div className="w-5 h-5 rounded-full bg-[rgb(var(--brand-yellow-500))] flex items-center justify-center text-xs text-black font-bold">2</div>
                      Контактное лицо
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="relative">
                        <User size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                          type="text"
                          required
                          value={formData.contact_name}
                          onChange={(e) => setFormData({...formData, contact_name: e.target.value})}
                          placeholder="ФИО *"
                          className="w-full pl-10 py-3 rounded-xl border border-gray-200 focus:border-[rgb(var(--brand-yellow-500))] focus:ring-2 focus:ring-[rgb(var(--brand-yellow-100))] outline-none"
                        />
                      </div>
                      <div className="relative">
                        <Phone size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                          type="tel"
                          required
                          value={formData.contact_phone}
                          onChange={(e) => setFormData({...formData, contact_phone: formatPhone(e.target.value)})}
                          placeholder="Телефон *"
                          className="w-full pl-10 py-3 rounded-xl border border-gray-200 focus:border-[rgb(var(--brand-yellow-500))] focus:ring-2 focus:ring-[rgb(var(--brand-yellow-100))] outline-none"
                        />
                      </div>
                    </div>
                    <div className="relative mt-3">
                      <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        type="email"
                        required
                        value={formData.contact_email}
                        onChange={(e) => setFormData({...formData, contact_email: e.target.value})}
                        placeholder="Email *"
                        className="w-full pl-10 py-3 rounded-xl border border-gray-200 focus:border-[rgb(var(--brand-yellow-500))] focus:ring-2 focus:ring-[rgb(var(--brand-yellow-100))] outline-none"
                      />
                    </div>
                  </div>

                  {/* Comment */}
                  <div>
                    <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                      <MessageSquare size={16} className="text-gray-400" />
                      Комментарий (опционально)
                    </label>
                    <textarea
                      value={formData.comment}
                      onChange={(e) => setFormData({...formData, comment: e.target.value})}
                      placeholder="Расскажите о вашем опыте или задайте вопрос..."
                      rows={3}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-[rgb(var(--brand-yellow-500))] focus:ring-2 focus:ring-[rgb(var(--brand-yellow-100))] outline-none resize-none"
                    />
                  </div>

                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full btn-gradient rounded-xl py-4 text-base font-bold h-auto"
                  >
                    {isSubmitting ? (
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    ) : (
                      <>Отправить заявку <ArrowRight size={18} className="ml-2" /></>
                    )}
                  </Button>
                </form>
              </div>
            </motion.div>
          )}

          {/* CTA if no selection */}
          {!showForm && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center mt-8"
            >
              <p className="text-gray-500 mb-3">Не нашли свою сферу?</p>
              <Button
                onClick={() => {
                  setSelectedType('other');
                  setFormData({ ...formData, partner_type: 'other' });
                  setShowForm(true);
                }}
                className="btn-gradient rounded-xl px-8 py-4 text-base font-bold h-auto shadow-lg hover:shadow-xl"
              >
                Оставить заявку (другая сфера) <ArrowRight size={18} className="ml-2" />
              </Button>
            </motion.div>
          )}
        </div>
      </section>

      {/* How it works */}
      <section className="py-16 sm:py-20 noise-bg">
        <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl sm:text-4xl font-bold text-[rgb(var(--black))] mb-4">
              Как это работает
            </h2>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {steps.map((step, index) => (
              <motion.div
                key={step.num}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.2 }}
                className="relative"
              >
                <div className="bg-white rounded-2xl p-8 shadow-lg h-full">
                  <div className="w-14 h-14 bg-gradient-to-br from-[rgb(var(--brand-yellow-400))] to-[rgb(var(--brand-yellow-500))] rounded-full flex items-center justify-center mb-6 shadow-lg">
                    <span className="text-2xl font-bold text-[rgb(var(--black))]">{step.num}</span>
                  </div>
                  <h3 className="text-xl font-bold text-[rgb(var(--black))] mb-3">{step.title}</h3>
                  <p className="text-[rgb(var(--grey-600))]">{step.desc}</p>
                </div>
                {index < 2 && (
                  <div className="hidden md:block absolute top-1/2 -right-4 transform -translate-y-1/2 z-10">
                    <ArrowRight size={32} className="text-[rgb(var(--brand-yellow-500))]" />
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Conditions */}
      <section className="py-16 sm:py-20 bg-white">
        <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl sm:text-4xl font-bold text-[rgb(var(--black))] mb-4">
              Условия партнёрства
            </h2>
          </motion.div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6">
            {conditions.map((item, index) => (
              <motion.div
                key={item.label}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="bg-[rgb(var(--grey-50))] rounded-2xl p-6"
              >
                <p className="text-sm text-[rgb(var(--grey-500))] mb-1">{item.label}</p>
                <p className="font-bold text-[rgb(var(--black))]">{item.value}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Regional Partnership - LIGHT VERSION */}
      <section id="representative" className="py-16 sm:py-20 noise-bg">
        <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="bg-white rounded-3xl p-8 sm:p-12 shadow-xl border-2 border-[rgb(var(--brand-yellow-200))] relative overflow-hidden"
          >
            {/* Decorative element */}
            <div className="absolute top-0 right-0 w-72 h-72 bg-gradient-to-br from-[rgb(var(--brand-yellow-100))] to-[rgb(var(--brand-yellow-200))] rounded-full -translate-y-1/2 translate-x-1/2 opacity-50" />

            <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-10 items-start">
              <div>
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[rgb(var(--brand-yellow-100))] mb-6">
                  <MapPin size={18} className="text-[rgb(var(--brand-yellow-700))]" />
                  <span className="text-sm font-bold text-[rgb(var(--brand-yellow-800))]">Региональное партнёрство</span>
                </div>

                <h2 className="text-3xl sm:text-4xl font-bold text-[rgb(var(--black))] mb-4">
                  Станьте представителем в своём городе
                </h2>
                <p className="text-[rgb(var(--grey-600))] mb-6">
                  Хотите больше, чем комиссию? Откройте представительство Про.Маркируй в своём регионе.
                </p>

                <ul className="space-y-3 mb-8">
                  {representativeFeatures.map((feature, index) => (
                    <li key={index} className="flex items-start gap-3">
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
                        feature.highlight ? 'bg-[rgb(var(--brand-yellow-500))]' : 'bg-[rgb(var(--brand-yellow-200))]'
                      }`}>
                        <Check size={12} className={feature.highlight ? 'text-black' : 'text-[rgb(var(--brand-yellow-700))]'} />
                      </div>
                      <span className={feature.highlight ? 'text-[rgb(var(--black))] font-medium' : 'text-[rgb(var(--grey-600))]'}>
                        {feature.text}
                      </span>
                    </li>
                  ))}
                </ul>

                {/* Free cities */}
                <div className="bg-gradient-to-br from-[rgb(var(--brand-yellow-50))] to-[rgb(var(--brand-yellow-100))] rounded-2xl p-5 border border-[rgb(var(--brand-yellow-200))] mb-6">
                  <div className="flex items-center gap-2 mb-3">
                    <MapPin size={18} className="text-[rgb(var(--brand-yellow-600))]" />
                    <span className="font-bold text-[rgb(var(--black))] text-sm">Свободные города</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {freeCities.map(city => (
                      <span key={city} className="px-3 py-1 bg-white rounded-full text-xs font-medium text-[rgb(var(--grey-700))] border border-[rgb(var(--brand-yellow-200))]">
                        {city}
                      </span>
                    ))}
                    <span className="px-3 py-1 bg-[rgb(var(--brand-yellow-500))] rounded-full text-xs font-bold text-black">
                      +40 городов
                    </span>
                  </div>
                </div>

                {!showRepForm && (
                  <div className="flex flex-wrap gap-4">
                    <Button
                      onClick={handleShowRepForm}
                      className="btn-gradient rounded-xl px-6 py-3 font-bold"
                    >
                      Стать представителем <ArrowRight size={18} className="ml-2" />
                    </Button>
                    <a href="tel:+78005505461" className="flex items-center gap-2 text-[rgb(var(--grey-600))] hover:text-[rgb(var(--black))] transition-colors">
                      <Phone size={18} />
                      <span>Позвонить</span>
                    </a>
                  </div>
                )}
              </div>

              {/* Representative Form */}
              <div ref={repFormRef}>
                {showRepForm ? (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-gradient-to-br from-[rgb(var(--brand-yellow-50))] to-white rounded-2xl p-6 border-2 border-[rgb(var(--brand-yellow-300))] shadow-lg"
                  >
                    <div className="flex items-center justify-between mb-5">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-[rgb(var(--brand-yellow-500))] rounded-xl flex items-center justify-center">
                          <MapPin size={20} className="text-black" />
                        </div>
                        <div>
                          <h3 className="font-bold text-[rgb(var(--black))]">Заявка на представительство</h3>
                          <p className="text-xs text-gray-500">Заполните форму — мы свяжемся</p>
                        </div>
                      </div>
                      <button
                        onClick={() => setShowRepForm(false)}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        ✕
                      </button>
                    </div>

                    <form onSubmit={handleRepSubmit} className="space-y-4">
                      {/* City & Region */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs font-semibold text-gray-600 mb-1 block">Город *</label>
                          <div className="relative">
                            <MapPin size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                              type="text"
                              required
                              value={repFormData.city}
                              onChange={(e) => setRepFormData({...repFormData, city: e.target.value})}
                              placeholder="Ваш город"
                              className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-gray-200 focus:border-[rgb(var(--brand-yellow-500))] focus:ring-2 focus:ring-[rgb(var(--brand-yellow-100))] outline-none text-sm"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="text-xs font-semibold text-gray-600 mb-1 block">Регион</label>
                          <input
                            type="text"
                            value={repFormData.region}
                            onChange={(e) => setRepFormData({...repFormData, region: e.target.value})}
                            placeholder="Область/край"
                            className="w-full px-3 py-2.5 rounded-xl border border-gray-200 focus:border-[rgb(var(--brand-yellow-500))] focus:ring-2 focus:ring-[rgb(var(--brand-yellow-100))] outline-none text-sm"
                          />
                        </div>
                      </div>

                      {/* Contact person */}
                      <div>
                        <label className="text-xs font-semibold text-gray-600 mb-1 block">Контактное лицо *</label>
                        <div className="relative">
                          <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                          <input
                            type="text"
                            required
                            value={repFormData.contact_name}
                            onChange={(e) => setRepFormData({...repFormData, contact_name: e.target.value})}
                            placeholder="ФИО"
                            className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-gray-200 focus:border-[rgb(var(--brand-yellow-500))] focus:ring-2 focus:ring-[rgb(var(--brand-yellow-100))] outline-none text-sm"
                          />
                        </div>
                      </div>

                      {/* Phone & Email */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs font-semibold text-gray-600 mb-1 block">Телефон *</label>
                          <div className="relative">
                            <Phone size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                              type="tel"
                              required
                              value={repFormData.contact_phone}
                              onChange={(e) => setRepFormData({...repFormData, contact_phone: formatPhone(e.target.value)})}
                              placeholder="+7 (___) ___-__-__"
                              className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-gray-200 focus:border-[rgb(var(--brand-yellow-500))] focus:ring-2 focus:ring-[rgb(var(--brand-yellow-100))] outline-none text-sm"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="text-xs font-semibold text-gray-600 mb-1 block">Email *</label>
                          <div className="relative">
                            <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                              type="email"
                              required
                              value={repFormData.contact_email}
                              onChange={(e) => setRepFormData({...repFormData, contact_email: e.target.value})}
                              placeholder="email@example.com"
                              className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-gray-200 focus:border-[rgb(var(--brand-yellow-500))] focus:ring-2 focus:ring-[rgb(var(--brand-yellow-100))] outline-none text-sm"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Company (optional) */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs font-semibold text-gray-600 mb-1 block">Компания (если есть)</label>
                          <input
                            type="text"
                            value={repFormData.company_name}
                            onChange={(e) => setRepFormData({...repFormData, company_name: e.target.value})}
                            placeholder="ООО или ИП"
                            className="w-full px-3 py-2.5 rounded-xl border border-gray-200 focus:border-[rgb(var(--brand-yellow-500))] focus:ring-2 focus:ring-[rgb(var(--brand-yellow-100))] outline-none text-sm"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-semibold text-gray-600 mb-1 block">ИНН</label>
                          <input
                            type="text"
                            value={repFormData.inn}
                            onChange={(e) => setRepFormData({...repFormData, inn: e.target.value})}
                            placeholder="ИНН компании"
                            className="w-full px-3 py-2.5 rounded-xl border border-gray-200 focus:border-[rgb(var(--brand-yellow-500))] focus:ring-2 focus:ring-[rgb(var(--brand-yellow-100))] outline-none text-sm"
                          />
                        </div>
                      </div>

                      {/* Experience */}
                      <div>
                        <label className="text-xs font-semibold text-gray-600 mb-1 block">Опыт в продажах/маркировке</label>
                        <select
                          value={repFormData.experience}
                          onChange={(e) => setRepFormData({...repFormData, experience: e.target.value})}
                          className="w-full px-3 py-2.5 rounded-xl border border-gray-200 focus:border-[rgb(var(--brand-yellow-500))] focus:ring-2 focus:ring-[rgb(var(--brand-yellow-100))] outline-none text-sm bg-white"
                        >
                          <option value="">Выберите...</option>
                          <option value="no_experience">Нет опыта, но хочу научиться</option>
                          <option value="sales_experience">Есть опыт в продажах</option>
                          <option value="marking_experience">Работал с маркировкой</option>
                          <option value="own_business">Есть свой бизнес в смежной сфере</option>
                        </select>
                      </div>

                      {/* Comment */}
                      <div>
                        <label className="text-xs font-semibold text-gray-600 mb-1 block">Комментарий</label>
                        <textarea
                          value={repFormData.comment}
                          onChange={(e) => setRepFormData({...repFormData, comment: e.target.value})}
                          placeholder="Расскажите о себе или задайте вопрос..."
                          rows={2}
                          className="w-full px-3 py-2.5 rounded-xl border border-gray-200 focus:border-[rgb(var(--brand-yellow-500))] focus:ring-2 focus:ring-[rgb(var(--brand-yellow-100))] outline-none resize-none text-sm"
                        />
                      </div>

                      <Button
                        type="submit"
                        disabled={isRepSubmitting}
                        className="w-full btn-gradient rounded-xl py-3 text-sm font-bold h-auto"
                      >
                        {isRepSubmitting ? (
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-black"></div>
                        ) : (
                          <>Отправить заявку <ArrowRight size={16} className="ml-2" /></>
                        )}
                      </Button>
                    </form>
                  </motion.div>
                ) : (
                  <div className="hidden lg:block">
                    <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-md text-center">
                      <div className="w-16 h-16 bg-gradient-to-br from-[rgb(var(--brand-yellow-400))] to-[rgb(var(--brand-yellow-500))] rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <MapPin size={32} className="text-black" />
                      </div>
                      <h3 className="font-bold text-[rgb(var(--black))] mb-2">Готовы стать представителем?</h3>
                      <p className="text-sm text-gray-500 mb-4">Заполните форму и мы свяжемся с вами в течение дня</p>
                      <Button
                        onClick={handleShowRepForm}
                        className="btn-gradient rounded-xl px-6 py-2.5 font-bold text-sm"
                      >
                        Заполнить заявку
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Partner Cabinet Features */}
      <section className="py-16 sm:py-20 bg-white">
        <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <h2 className="text-3xl sm:text-4xl font-bold text-[rgb(var(--black))] mb-4">
                Личный кабинет партнёра
              </h2>
              <p className="text-lg text-[rgb(var(--grey-600))] mb-8">
                Прозрачная статистика и удобные инструменты
              </p>

              <div className="space-y-4">
                {[
                  { text: 'Персональная реферальная ссылка' },
                  { text: 'Калькулятор потенциального дохода' },
                  { text: 'Статистика по привлечённым клиентам' },
                  { text: 'Готовые материалы для продаж' },
                  { text: 'Обучение по маркировке' },
                  { text: 'База знаний и инструкции' }
                ].map((item, index) => (
                  <motion.div
                    key={item.text}
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: index * 0.1 }}
                    className="flex items-center gap-4"
                  >
                    <div className="w-10 h-10 bg-[rgb(var(--brand-yellow-100))] rounded-xl flex items-center justify-center flex-shrink-0">
                      <Check size={20} className="text-[rgb(var(--brand-yellow-700))]" />
                    </div>
                    <span className="text-[rgb(var(--grey-800))] font-medium">{item.text}</span>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="bg-gradient-to-br from-[rgb(var(--grey-100))] to-[rgb(var(--grey-200))] rounded-3xl p-8"
            >
              <div className="bg-white rounded-2xl shadow-xl p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="font-bold text-[rgb(var(--black))]">Статистика</h3>
                  <span className="text-sm text-gray-500">Декабрь 2025</span>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-50 rounded-xl p-4 text-center">
                    <Users size={24} className="mx-auto text-[rgb(var(--brand-yellow-600))] mb-2" />
                    <p className="text-2xl font-bold">12</p>
                    <p className="text-xs text-gray-500">Клиентов</p>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-4 text-center">
                    <FileText size={24} className="mx-auto text-[rgb(var(--brand-yellow-600))] mb-2" />
                    <p className="text-2xl font-bold">8</p>
                    <p className="text-xs text-gray-500">КП</p>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-4 text-center">
                    <Check size={24} className="mx-auto text-green-500 mb-2" />
                    <p className="text-2xl font-bold">5</p>
                    <p className="text-xs text-gray-500">Оплачено</p>
                  </div>
                  <div className="bg-[rgb(var(--brand-yellow-100))] rounded-xl p-4 text-center">
                    <span className="text-2xl font-bold">28 500 ₽</span>
                    <p className="text-xs text-gray-600">Комиссия</p>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-16 sm:py-20 noise-bg">
        <div className="mx-auto max-w-[800px] px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl sm:text-4xl font-bold text-[rgb(var(--black))] mb-4">
              Частые вопросы
            </h2>
          </motion.div>

          <div className="space-y-3">
            {faqs.map((faq, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="bg-white rounded-xl overflow-hidden shadow-sm"
              >
                <button
                  onClick={() => setOpenFaq(openFaq === index ? null : index)}
                  className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-gray-50 transition-colors"
                >
                  <span className="font-semibold text-[rgb(var(--black))]">{faq.q}</span>
                  {openFaq === index ? (
                    <ChevronUp size={20} className="text-[rgb(var(--grey-500))] flex-shrink-0" />
                  ) : (
                    <ChevronDown size={20} className="text-[rgb(var(--grey-500))] flex-shrink-0" />
                  )}
                </button>
                {openFaq === index && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="px-6 pb-4"
                  >
                    <p className="text-[rgb(var(--grey-600))]">{faq.a}</p>
                  </motion.div>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-16 sm:py-20 bg-white">
        <div className="mx-auto max-w-[800px] px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl sm:text-4xl font-bold text-[rgb(var(--black))] mb-4">
              Начните зарабатывать на маркировке
            </h2>
            <p className="text-[rgb(var(--grey-600))] mb-8">
              Выберите свою сферу и оставьте заявку — мы свяжемся в течение дня
            </p>
            <Button
              onClick={() => document.getElementById('partner-types')?.scrollIntoView({ behavior: 'smooth' })}
              className="btn-gradient rounded-2xl px-10 py-5 text-lg font-bold h-auto shadow-xl hover:shadow-2xl"
            >
              Выбрать сферу <ArrowRight size={24} className="ml-2" />
            </Button>
          </motion.div>
        </div>
      </section>
    </div>
  );
};

export default PartnersPage;
