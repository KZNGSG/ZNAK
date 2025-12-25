import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import {
  MessageSquare,
  Clock,
  ArrowLeft,
  Phone,
  Mail,
  User,
  CheckCircle2,
  Send,
  MapPin,
  Building2,
  HelpCircle,
  Loader2,
  Search
} from 'lucide-react';
import { motion } from 'framer-motion';
import SEO from '../components/SEO';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_API_URL || '';

// Источники откуда узнали
const SOURCES = [
  { value: 'search', label: 'Поиск (Яндекс, Google)' },
  { value: 'social', label: 'Социальные сети' },
  { value: 'recommendation', label: 'Рекомендация знакомых' },
  { value: 'telegram', label: 'Telegram бот' },
  { value: 'advertisement', label: 'Реклама' },
  { value: 'conference', label: 'Конференция / Выставка' },
  { value: 'partner', label: 'От партнёра' },
  { value: 'other', label: 'Другое' }
];

// Типы запросов
const REQUEST_TYPES = [
  { value: 'consultation', label: 'Консультация по маркировке' },
  { value: 'integration', label: 'Интеграция с Честный ЗНАК' },
  { value: 'training', label: 'Обучение сотрудников' },
  { value: 'equipment', label: 'Подбор оборудования' },
  { value: 'audit', label: 'Аудит процессов' },
  { value: 'other', label: 'Другой вопрос' }
];

const ConsultationPage = () => {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  // DaData suggestions
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const suggestionsRef = useRef(null);
  const searchTimeout = useRef(null);

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    company: '',
    inn: '',
    request_type: '',
    source: '',
    comment: '',
    consent: false
  });

  const [errors, setErrors] = useState({});

  // Click outside to close suggestions
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(event.target)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Search company by name or INN
  const searchCompany = async (query) => {
    if (!query || query.length < 3) {
      setSuggestions([]);
      setShowSuggestions(false);
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

  // Handle company input change with debounce
  const handleCompanyChange = (e) => {
    const value = e.target.value;
    setFormData(prev => ({ ...prev, company: value, inn: '' }));

    if (searchTimeout.current) {
      clearTimeout(searchTimeout.current);
    }

    searchTimeout.current = setTimeout(() => {
      searchCompany(value);
    }, 300);
  };

  // Select company from suggestions
  const selectCompany = (company) => {
    setFormData(prev => ({
      ...prev,
      company: company.name,
      inn: company.inn || ''
    }));
    setSuggestions([]);
    setShowSuggestions(false);
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Укажите ваше имя';
    }

    if (!formData.phone.trim()) {
      newErrors.phone = 'Укажите телефон';
    } else if (!/^[\+]?[0-9\s\-\(\)]{10,}$/.test(formData.phone)) {
      newErrors.phone = 'Некорректный номер телефона';
    }

    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Некорректный email';
    }

    if (!formData.request_type) {
      newErrors.request_type = 'Выберите тип запроса';
    }

    if (!formData.source) {
      newErrors.source = 'Укажите откуда вы о нас узнали';
    }

    if (!formData.consent) {
      newErrors.consent = 'Необходимо согласие на обработку данных';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      toast.error('Заполните все обязательные поля');
      return;
    }

    setIsSubmitting(true);

    try {
      const sourceLabel = SOURCES.find(s => s.value === formData.source)?.label || formData.source;
      const requestTypeLabel = REQUEST_TYPES.find(r => r.value === formData.request_type)?.label || formData.request_type;

      const companyInfo = formData.inn
        ? `${formData.company} (ИНН: ${formData.inn})`
        : formData.company || 'Не указана';

      const response = await fetch(`${API_URL}/api/contact/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          phone: formData.phone,
          email: formData.email || null,
          request_type: requestTypeLabel,
          comment: `Компания: ${companyInfo}\nИсточник: ${sourceLabel}\n\n${formData.comment || ''}`,
          consent: formData.consent,
          source: `consultation_form_${formData.source}`
        }),
      });

      if (!response.ok) {
        throw new Error('Ошибка отправки');
      }

      setIsSubmitted(true);
      toast.success('Заявка успешно отправлена!');

    } catch (error) {
      console.error('Error submitting form:', error);
      toast.error('Ошибка отправки. Попробуйте позже или позвоните нам.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));

    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: null }));
    }
  };

  // Success state
  if (isSubmitted) {
    return (
      <div className="py-12 bg-gradient-to-b from-[rgb(var(--brand-yellow-50))] to-white min-h-screen">
        <SEO title='Заявка отправлена' />
        <div className="mx-auto max-w-[600px] px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-3xl p-10 border border-[rgb(var(--grey-200))] shadow-lg text-center"
          >
            <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 size={48} className="text-green-600" />
            </div>

            <h1 className="text-3xl font-bold text-[rgb(var(--black))] mb-4">
              Заявка отправлена!
            </h1>

            <p className="text-lg text-[rgb(var(--grey-600))] mb-8">
              Спасибо за обращение! Наш специалист свяжется с вами в ближайшее время.
            </p>

            <div className="space-y-3">
              <Button
                onClick={() => navigate('/')}
                className="btn-gradient rounded-xl px-8 py-3 w-full"
              >
                На главную
              </Button>

              <Button
                onClick={() => {
                  setIsSubmitted(false);
                  setFormData({
                    name: '',
                    phone: '',
                    email: '',
                    company: '',
                    inn: '',
                    request_type: '',
                    source: '',
                    comment: '',
                    consent: false
                  });
                }}
                variant="outline"
                className="rounded-xl px-8 py-3 w-full"
              >
                Отправить ещё заявку
              </Button>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="py-12 bg-gradient-to-b from-[rgb(var(--brand-yellow-50))] to-white min-h-screen">
      <SEO
        title='Консультация по маркировке'
        description='Бесплатная консультация эксперта по маркировке товаров. Ответим на все вопросы по системе Честный ЗНАК.'
        keywords='консультация маркировка, помощь честный знак'
        canonical='/consultation'
      />
      <div className="mx-auto max-w-[900px] px-4 sm:px-6 lg:px-8">
        {/* Back button */}
        <Button
          onClick={() => navigate('/')}
          variant="secondary"
          className="mb-8 rounded-xl flex items-center gap-2"
        >
          <ArrowLeft size={18} />
          На главную
        </Button>

        {/* Hero Section */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          className="text-center mb-10"
        >
          {/* Icon */}
          <div className="inline-flex p-5 rounded-3xl bg-gradient-to-br from-[rgb(var(--brand-yellow-100))] to-[rgb(var(--brand-yellow-200))] shadow-lg mb-6">
            <MessageSquare size={56} strokeWidth={2} className="text-[rgb(var(--grey-900))]" />
          </div>

          {/* Title */}
          <h1 className="text-3xl sm:text-4xl font-bold text-[rgb(var(--black))] mb-4">
            Консультация эксперта
          </h1>

          {/* Subtitle */}
          <p className="text-lg text-[rgb(var(--grey-600))] max-w-2xl mx-auto leading-relaxed">
            Оставьте заявку и наш специалист свяжется с вами для бесплатной консультации по маркировке товаров
          </p>
        </motion.div>

        {/* Main Form Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.7, delay: 0.2 }}
          className="bg-white rounded-3xl p-8 sm:p-10 border border-[rgb(var(--grey-200))] shadow-lg mb-10"
        >
          <form onSubmit={handleSubmit} className="space-y-6">

            {/* Name & Phone Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Name */}
              <div>
                <label className="block text-sm font-semibold text-[rgb(var(--grey-700))] mb-2">
                  Ваше имя <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[rgb(var(--grey-400))]" />
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="Иван Иванов"
                    className={`w-full pl-11 pr-4 py-3 rounded-xl border ${
                      errors.name ? 'border-red-400 bg-red-50' : 'border-[rgb(var(--grey-300))]'
                    } focus:border-[rgb(var(--brand-yellow-400))] focus:ring-2 focus:ring-[rgb(var(--brand-yellow-200))] outline-none transition-all`}
                  />
                </div>
                {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
              </div>

              {/* Phone */}
              <div>
                <label className="block text-sm font-semibold text-[rgb(var(--grey-700))] mb-2">
                  Телефон <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Phone size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[rgb(var(--grey-400))]" />
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder="+7 (999) 123-45-67"
                    className={`w-full pl-11 pr-4 py-3 rounded-xl border ${
                      errors.phone ? 'border-red-400 bg-red-50' : 'border-[rgb(var(--grey-300))]'
                    } focus:border-[rgb(var(--brand-yellow-400))] focus:ring-2 focus:ring-[rgb(var(--brand-yellow-200))] outline-none transition-all`}
                  />
                </div>
                {errors.phone && <p className="text-red-500 text-sm mt-1">{errors.phone}</p>}
              </div>
            </div>

            {/* Email & Company Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Email */}
              <div>
                <label className="block text-sm font-semibold text-[rgb(var(--grey-700))] mb-2">
                  Email
                </label>
                <div className="relative">
                  <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[rgb(var(--grey-400))]" />
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="email@company.ru"
                    className={`w-full pl-11 pr-4 py-3 rounded-xl border ${
                      errors.email ? 'border-red-400 bg-red-50' : 'border-[rgb(var(--grey-300))]'
                    } focus:border-[rgb(var(--brand-yellow-400))] focus:ring-2 focus:ring-[rgb(var(--brand-yellow-200))] outline-none transition-all`}
                  />
                </div>
                {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email}</p>}
              </div>

              {/* Company with DaData */}
              <div className="relative" ref={suggestionsRef}>
                <label className="block text-sm font-semibold text-[rgb(var(--grey-700))] mb-2">
                  Компания (название или ИНН)
                </label>
                <div className="relative">
                  <Building2 size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[rgb(var(--grey-400))]" />
                  <input
                    type="text"
                    value={formData.company}
                    onChange={handleCompanyChange}
                    onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                    placeholder="Начните вводить название или ИНН"
                    className="w-full pl-11 pr-10 py-3 rounded-xl border border-[rgb(var(--grey-300))] focus:border-[rgb(var(--brand-yellow-400))] focus:ring-2 focus:ring-[rgb(var(--brand-yellow-200))] outline-none transition-all"
                  />
                  {searchLoading && (
                    <Loader2 size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-[rgb(var(--grey-400))] animate-spin" />
                  )}
                  {!searchLoading && formData.company && (
                    <Search size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-[rgb(var(--grey-400))]" />
                  )}
                </div>

                {/* Suggestions dropdown */}
                {showSuggestions && suggestions.length > 0 && (
                  <div className="absolute z-50 w-full mt-1 bg-white border border-[rgb(var(--grey-200))] rounded-xl shadow-lg max-h-60 overflow-y-auto">
                    {suggestions.map((company, index) => (
                      <button
                        key={index}
                        type="button"
                        onClick={() => selectCompany(company)}
                        className="w-full px-4 py-3 text-left hover:bg-[rgb(var(--brand-yellow-50))] border-b border-[rgb(var(--grey-100))] last:border-b-0 transition-colors"
                      >
                        <div className="font-medium text-[rgb(var(--grey-900))] text-sm">
                          {company.name}
                        </div>
                        {company.inn && (
                          <div className="text-xs text-[rgb(var(--grey-500))] mt-0.5">
                            ИНН: {company.inn}
                            {company.address && ` • ${company.address.substring(0, 50)}...`}
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                )}

                {/* Show selected INN */}
                {formData.inn && (
                  <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                    <CheckCircle2 size={12} />
                    ИНН: {formData.inn}
                  </p>
                )}
              </div>
            </div>

            {/* Request Type */}
            <div>
              <label className="block text-sm font-semibold text-[rgb(var(--grey-700))] mb-2">
                Тип запроса <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <HelpCircle size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[rgb(var(--grey-400))]" />
                <select
                  name="request_type"
                  value={formData.request_type}
                  onChange={handleChange}
                  className={`w-full pl-11 pr-4 py-3 rounded-xl border ${
                    errors.request_type ? 'border-red-400 bg-red-50' : 'border-[rgb(var(--grey-300))]'
                  } focus:border-[rgb(var(--brand-yellow-400))] focus:ring-2 focus:ring-[rgb(var(--brand-yellow-200))] outline-none transition-all appearance-none bg-white cursor-pointer`}
                >
                  <option value="">Выберите тип запроса</option>
                  {REQUEST_TYPES.map(type => (
                    <option key={type.value} value={type.value}>{type.label}</option>
                  ))}
                </select>
              </div>
              {errors.request_type && <p className="text-red-500 text-sm mt-1">{errors.request_type}</p>}
            </div>

            {/* Source - REQUIRED */}
            <div>
              <label className="block text-sm font-semibold text-[rgb(var(--grey-700))] mb-2">
                Откуда вы о нас узнали? <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <MapPin size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[rgb(var(--grey-400))]" />
                <select
                  name="source"
                  value={formData.source}
                  onChange={handleChange}
                  className={`w-full pl-11 pr-4 py-3 rounded-xl border ${
                    errors.source ? 'border-red-400 bg-red-50' : 'border-[rgb(var(--grey-300))]'
                  } focus:border-[rgb(var(--brand-yellow-400))] focus:ring-2 focus:ring-[rgb(var(--brand-yellow-200))] outline-none transition-all appearance-none bg-white cursor-pointer`}
                >
                  <option value="">Выберите источник</option>
                  {SOURCES.map(source => (
                    <option key={source.value} value={source.value}>{source.label}</option>
                  ))}
                </select>
              </div>
              {errors.source && <p className="text-red-500 text-sm mt-1">{errors.source}</p>}
            </div>

            {/* Comment */}
            <div>
              <label className="block text-sm font-semibold text-[rgb(var(--grey-700))] mb-2">
                Комментарий / Вопрос
              </label>
              <textarea
                name="comment"
                value={formData.comment}
                onChange={handleChange}
                rows={4}
                placeholder="Опишите ваш вопрос или задачу..."
                className="w-full px-4 py-3 rounded-xl border border-[rgb(var(--grey-300))] focus:border-[rgb(var(--brand-yellow-400))] focus:ring-2 focus:ring-[rgb(var(--brand-yellow-200))] outline-none transition-all resize-none"
              />
            </div>

            {/* Consent */}
            <div className="flex items-start gap-3">
              <input
                type="checkbox"
                name="consent"
                id="consent"
                checked={formData.consent}
                onChange={handleChange}
                className="w-5 h-5 mt-0.5 rounded border-[rgb(var(--grey-300))] text-[rgb(var(--brand-yellow-500))] focus:ring-[rgb(var(--brand-yellow-400))] cursor-pointer"
              />
              <label htmlFor="consent" className="text-sm text-[rgb(var(--grey-600))] cursor-pointer">
                Я согласен на обработку персональных данных в соответствии с{' '}
                <a href="/privacy" className="text-[rgb(var(--brand-yellow-600))] hover:underline">
                  политикой конфиденциальности
                </a>
                <span className="text-red-500"> *</span>
              </label>
            </div>
            {errors.consent && <p className="text-red-500 text-sm -mt-4">{errors.consent}</p>}

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={isSubmitting}
              className="btn-gradient rounded-xl px-8 py-4 text-lg font-bold w-full flex items-center justify-center gap-3 shadow-lg hover:shadow-xl transition-all"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={24} className="animate-spin" />
                  Отправка...
                </>
              ) : (
                <>
                  <Send size={24} />
                  Отправить заявку
                </>
              )}
            </Button>

            <p className="text-center text-sm text-[rgb(var(--grey-500))]">
              Бесплатно • Ответим в течение часа в рабочее время
            </p>
          </form>
        </motion.div>

        {/* Features */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.3 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10"
        >
          <div className="p-6 rounded-2xl bg-white border border-[rgb(var(--grey-200))] shadow-sm text-center">
            <div className="w-14 h-14 rounded-xl bg-[rgb(var(--brand-yellow-100))] flex items-center justify-center mx-auto mb-4">
              <Clock size={28} className="text-[rgb(var(--grey-900))]" />
            </div>
            <h3 className="font-bold text-base text-[rgb(var(--black))] mb-2">Быстрый ответ</h3>
            <p className="text-sm text-[rgb(var(--grey-600))]">
              Перезвоним в течение часа в рабочее время
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-white border border-[rgb(var(--grey-200))] shadow-sm text-center">
            <div className="w-14 h-14 rounded-xl bg-[rgb(var(--brand-yellow-100))] flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 size={28} className="text-[rgb(var(--grey-900))]" />
            </div>
            <h3 className="font-bold text-base text-[rgb(var(--black))] mb-2">Бесплатно</h3>
            <p className="text-sm text-[rgb(var(--grey-600))]">
              Первичная консультация без оплаты
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-white border border-[rgb(var(--grey-200))] shadow-sm text-center">
            <div className="w-14 h-14 rounded-xl bg-[rgb(var(--brand-yellow-100))] flex items-center justify-center mx-auto mb-4">
              <MessageSquare size={28} className="text-[rgb(var(--grey-900))]" />
            </div>
            <h3 className="font-bold text-base text-[rgb(var(--black))] mb-2">Эксперты</h3>
            <p className="text-sm text-[rgb(var(--grey-600))]">
              Специалисты с опытом 5+ лет в маркировке
            </p>
          </div>
        </motion.div>

        {/* Popular Questions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.4 }}
          className="bg-[rgb(var(--grey-100))] rounded-2xl p-6"
        >
          <h3 className="font-bold text-lg text-[rgb(var(--black))] mb-4 flex items-center gap-2">
            <HelpCircle size={20} />
            Популярные вопросы
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              'Нужно ли маркировать одежду для продажи на Wildberries?',
              'Как получить коды маркировки для обуви?',
              'Какое оборудование нужно для маркировки?',
              'Какие штрафы за отсутствие маркировки?',
              'Как маркировать импортный товар?',
              'С чего начать внедрение маркировки?'
            ].map((question, idx) => (
              <div
                key={idx}
                className="p-3 rounded-xl bg-white border border-[rgb(var(--grey-200))] text-sm text-[rgb(var(--grey-700))]"
              >
                {question}
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default ConsultationPage;
