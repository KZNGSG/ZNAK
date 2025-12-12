import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';
import SEO from '../components/SEO';
import {
  Mail, Lock, User, ArrowRight, LogIn, UserPlus, Building2, Phone,
  AlertCircle, Send, MapPin, Search, CheckCircle, ChevronDown
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

// Варианты "Откуда узнали"
const SOURCE_OPTIONS = [
  { value: '', label: 'Выберите вариант...' },
  { value: 'search', label: 'Поиск в интернете (Яндекс, Google)' },
  { value: 'recommendation', label: 'Рекомендация коллег/партнёров' },
  { value: 'social', label: 'Социальные сети' },
  { value: 'ads', label: 'Реклама' },
  { value: 'event', label: 'Выставка/конференция' },
  { value: 'честный_знак', label: 'Сайт Честного ЗНАКа' },
  { value: 'other', label: 'Другое' }
];

const LoginPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, register, isAuthenticated, user, loading: authLoading, resendVerification, logout } = useAuth();

  const [mode, setMode] = useState('login'); // 'login' or 'register'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  // Поля для регистрации
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [inn, setInn] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [city, setCity] = useState('');
  const [region, setRegion] = useState('');
  const [source, setSource] = useState('');
  const [sourceOther, setSourceOther] = useState('');

  // Автодополнение компаний
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const suggestionsRef = useRef(null);
  const searchTimeout = useRef(null);

  // Состояние для неподтверждённого email
  const [showEmailNotVerified, setShowEmailNotVerified] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);

  // Функция определения редиректа по роли
  const getRedirectByRole = (role) => {
    switch (role) {
      case 'superadmin':
      case 'employee':
        return '/employee';
      case 'client':
      default:
        return '/cabinet';
    }
  };

  // Редирект если уже авторизован
  useEffect(() => {
    if (!authLoading && isAuthenticated && user) {
      const isStaff = ['employee', 'superadmin'].includes(user.role);
      if (isStaff || user.email_verified) {
        const from = location.state?.from || getRedirectByRole(user.role);
        navigate(from, { replace: true });
      } else {
        setShowEmailNotVerified(true);
      }
    }
  }, [isAuthenticated, authLoading, navigate, location, user]);

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

  // Поиск компаний через DaData
  const searchCompanies = async (query) => {
    if (query.length < 4) {
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

  // Обработка ввода в поле поиска компании
  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchQuery(value);

    if (searchTimeout.current) {
      clearTimeout(searchTimeout.current);
    }

    searchTimeout.current = setTimeout(() => {
      searchCompanies(value);
    }, 300);
  };

  // Выбор компании из списка
  const selectCompany = (company) => {
    setInn(company.inn || '');
    setCompanyName(company.name || '');
    setSearchQuery(company.name || '');

    const address = company.address || '';
    const addressParts = address.split(',').map(s => s.trim());

    let foundRegion = '';
    let foundCity = '';

    for (const part of addressParts) {
      const lowerPart = part.toLowerCase();
      if (lowerPart.includes('область') || lowerPart.includes('край') ||
          lowerPart.includes('республика') || lowerPart.includes('округ') ||
          lowerPart.includes('обл') || lowerPart.includes('респ')) {
        foundRegion = part;
      }
      if (lowerPart.startsWith('г ') || lowerPart.startsWith('г.') ||
          lowerPart.includes('город')) {
        foundCity = part.replace(/^г\.?\s*/i, '').replace(/город\s*/i, '');
      }
    }

    if (!foundCity && addressParts.length > 1) {
      const secondPart = addressParts[1];
      if (secondPart && !secondPart.match(/^\d/)) {
        foundCity = secondPart.replace(/^г\.?\s*/i, '');
      }
    }

    setRegion(foundRegion);
    setCity(foundCity);
    setShowSuggestions(false);
  };

  const clearCompany = () => {
    setInn('');
    setCompanyName('');
    setCity('');
    setRegion('');
    setSearchQuery('');
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

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!email || !password) {
      toast.error('Заполните email и пароль');
      return;
    }

    if (mode === 'register') {
      if (!fullName.trim()) {
        toast.error('Введите ФИО');
        return;
      }
      if (!phone || phone.length < 18) {
        toast.error('Введите корректный телефон');
        return;
      }
      if (!inn || (inn.length !== 10 && inn.length !== 12)) {
        toast.error('Выберите компанию из списка или введите ИНН (10 или 12 цифр)');
        return;
      }
      if (!source) {
        toast.error('Укажите, откуда вы узнали о нас');
        return;
      }
      if (source === 'other' && !sourceOther.trim()) {
        toast.error('Укажите источник в поле "Другое"');
        return;
      }
      if (password !== confirmPassword) {
        toast.error('Пароли не совпадают');
        return;
      }
      if (password.length < 6) {
        toast.error('Пароль должен быть не менее 6 символов');
        return;
      }
    }

    setLoading(true);
    try {
      let result;
      if (mode === 'login') {
        result = await login(email, password);

        const isStaff = ['employee', 'superadmin'].includes(result.user.role);
        if (!isStaff && !result.user.email_verified) {
          setShowEmailNotVerified(true);
          toast.warning('Подтвердите email для входа в личный кабинет');
          return;
        }

        toast.success('Добро пожаловать!');
        const userRole = result?.user?.role || 'client';
        const from = location.state?.from || getRedirectByRole(userRole);
        navigate(from, { replace: true });
      } else {
        // Формируем источник
        const finalSource = source === 'other' ? sourceOther : source;

        result = await register(email, password, {
          name: fullName,
          phone: phone,
          inn: inn,
          company_name: companyName,
          city: city,
          region: region,
          source: finalSource
        });
        toast.success('Регистрация успешна! Проверьте почту для подтверждения.');
        setShowEmailNotVerified(true);
      }
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResendVerification = async () => {
    setResendLoading(true);
    try {
      await resendVerification();
      toast.success('Письмо отправлено повторно');
    } catch (error) {
      toast.error(error.message);
    } finally {
      setResendLoading(false);
    }
  };

  const handleLogoutAndReset = () => {
    logout();
    setShowEmailNotVerified(false);
    setMode('login');
    setEmail('');
    setPassword('');
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[rgb(var(--brand-yellow-500))]"></div>
      </div>
    );
  }

  // Показываем блок "Подтвердите email"
  if (showEmailNotVerified && isAuthenticated && user && !user.email_verified) {
    return (
      <div className="py-12 bg-gradient-to-b from-slate-50 to-white min-h-screen">
        <div className="mx-auto max-w-md px-4">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-500 mb-4">
              <AlertCircle size={32} className="text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Подтвердите email</h1>
            <p className="text-gray-600 mt-2">
              Для доступа в личный кабинет необходимо подтвердить email
            </p>
          </div>

          <div className="bg-white rounded-2xl border-2 border-amber-200 p-8 shadow-lg">
            <div className="bg-amber-50 rounded-xl p-4 mb-6">
              <p className="text-amber-800 text-sm">
                Мы отправили письмо на <strong>{user.email}</strong>.
                Перейдите по ссылке в письме для подтверждения.
              </p>
            </div>

            <div className="space-y-4">
              <p className="text-gray-600 text-sm text-center">
                Не получили письмо?
              </p>
              <Button
                onClick={handleResendVerification}
                disabled={resendLoading}
                variant="outline"
                className="w-full rounded-xl border-2 border-amber-400 text-amber-700 hover:bg-amber-50 flex items-center justify-center gap-2"
              >
                {resendLoading ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-amber-500"></div>
                ) : (
                  <>
                    <Send size={18} />
                    Отправить повторно
                  </>
                )}
              </Button>

              <div className="text-center pt-4 border-t border-gray-200">
                <button
                  onClick={handleLogoutAndReset}
                  className="text-sm text-gray-500 hover:text-gray-700"
                >
                  Войти с другим аккаунтом
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="py-8 bg-gradient-to-b from-slate-50 to-white min-h-screen">
      <SEO noindex={true} />
      <div className={`mx-auto px-4 ${mode === 'register' ? 'max-w-2xl' : 'max-w-md'}`}>
        {/* Logo */}
        <div className="text-center mb-6">
          <Link to="/" className="inline-flex items-center gap-2 group mb-4">
            <div className="flex items-center gap-0.5 p-2.5 rounded-xl bg-gradient-to-br from-yellow-100 to-yellow-200 group-hover:scale-105 transition-transform shadow-md">
              <div className="grid grid-cols-2 gap-1">
                <div className="w-2.5 h-2.5 bg-yellow-500 rounded-sm"></div>
                <div className="w-2.5 h-2.5 bg-gray-800 rounded-sm"></div>
                <div className="w-2.5 h-2.5 bg-gray-800 rounded-sm"></div>
                <div className="w-2.5 h-2.5 bg-yellow-500 rounded-sm"></div>
              </div>
            </div>
            <span className="text-xl font-bold text-gray-900">
              Про<span className="text-yellow-500">.</span>Маркируй
            </span>
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">
            {mode === 'login' ? 'Вход в личный кабинет' : 'Регистрация'}
          </h1>
          <p className="text-gray-600 mt-1">
            {mode === 'login'
              ? 'Войдите, чтобы видеть ваши договоры и КП'
              : 'Введите ИНН — данные компании заполнятся автоматически'}
          </p>
        </div>

        {/* Form Card */}
        <div className="bg-white rounded-2xl border-2 border-gray-200 p-6 sm:p-8 shadow-lg">
          {/* Mode Tabs */}
          <div className="flex rounded-xl bg-gray-100 p-1 mb-6">
            <button
              onClick={() => setMode('login')}
              className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                mode === 'login'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <LogIn size={16} />
              Вход
            </button>
            <button
              onClick={() => setMode('register')}
              className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                mode === 'register'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <UserPlus size={16} />
              Регистрация
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit}>
            {mode === 'register' ? (
              <>
                {/* Шаг 1: Компания */}
                <div className="mb-6">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-6 h-6 rounded-full bg-yellow-500 flex items-center justify-center text-white text-xs font-bold">1</div>
                    <span className="font-semibold text-gray-900">Найдите свою компанию</span>
                  </div>

                  {!inn ? (
                    <div className="relative" ref={suggestionsRef}>
                      <div className="relative">
                        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <Input
                          type="text"
                          value={searchQuery}
                          onChange={handleSearchChange}
                          onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                          placeholder="Введите ИНН или название компании..."
                          className="pl-10 pr-10 py-3 text-base border-2 border-yellow-200 focus:border-yellow-400 bg-yellow-50/50"
                        />
                        {searchLoading && (
                          <div className="absolute right-3 top-1/2 -translate-y-1/2">
                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-yellow-500"></div>
                          </div>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mt-1.5 flex items-center gap-1">
                        <span className="text-yellow-600">💡</span>
                        Введите минимум 4 символа — данные заполнятся автоматически
                      </p>

                      {/* Выпадающий список */}
                      {showSuggestions && suggestions.length > 0 && (
                        <div className="absolute z-50 w-full mt-1 bg-white border-2 border-yellow-200 rounded-xl shadow-xl max-h-64 overflow-y-auto">
                          {suggestions.map((company, index) => (
                            <button
                              key={index}
                              type="button"
                              onClick={() => selectCompany(company)}
                              className="w-full px-4 py-3 text-left hover:bg-yellow-50 border-b border-gray-100 last:border-b-0 transition-colors"
                            >
                              <div className="font-medium text-gray-900 text-sm">{company.name}</div>
                              <div className="text-xs text-gray-500 mt-0.5">
                                ИНН: {company.inn}
                                {company.address && (
                                  <span className="ml-2 text-gray-400">{company.address.slice(0, 50)}...</span>
                                )}
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="bg-emerald-50 border-2 border-emerald-200 rounded-xl p-4">
                      <div className="flex items-start gap-3">
                        <div className="p-2 bg-emerald-100 rounded-lg">
                          <CheckCircle size={20} className="text-emerald-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-gray-900">{companyName}</div>
                          <div className="text-sm text-gray-600 mt-0.5">ИНН: {inn}</div>
                          {(city || region) && (
                            <div className="flex items-center gap-1 mt-1 text-xs text-gray-500">
                              <MapPin size={12} />
                              {[region, city].filter(Boolean).join(', ')}
                            </div>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={clearCompany}
                          className="text-sm text-gray-500 hover:text-red-500 font-medium"
                        >
                          Изменить
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Шаг 2: Контактное лицо */}
                <div className="mb-6">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-6 h-6 rounded-full bg-yellow-500 flex items-center justify-center text-white text-xs font-bold">2</div>
                    <span className="font-semibold text-gray-900">Контактное лицо</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="fullName" className="text-sm font-medium text-gray-700">
                        ФИО <span className="text-red-500">*</span>
                      </Label>
                      <div className="relative mt-1">
                        <User size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <Input
                          id="fullName"
                          type="text"
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          placeholder="Иванов Иван Иванович"
                          className="pl-10"
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="phone" className="text-sm font-medium text-gray-700">
                        Телефон <span className="text-red-500">*</span>
                      </Label>
                      <div className="relative mt-1">
                        <Phone size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <Input
                          id="phone"
                          type="tel"
                          value={phone}
                          onChange={(e) => setPhone(formatPhone(e.target.value))}
                          placeholder="+7 (___) ___-__-__"
                          className="pl-10"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Шаг 3: Данные для входа */}
                <div className="mb-6">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-6 h-6 rounded-full bg-yellow-500 flex items-center justify-center text-white text-xs font-bold">3</div>
                    <span className="font-semibold text-gray-900">Данные для входа</span>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="email" className="text-sm font-medium text-gray-700">
                        Email <span className="text-red-500">*</span>
                      </Label>
                      <div className="relative mt-1">
                        <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <Input
                          id="email"
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="example@company.ru"
                          className="pl-10"
                          autoComplete="email"
                        />
                      </div>
                      <p className="text-xs text-gray-500 mt-1">На этот адрес придёт письмо для подтверждения</p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="password" className="text-sm font-medium text-gray-700">
                          Пароль <span className="text-red-500">*</span>
                        </Label>
                        <div className="relative mt-1">
                          <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                          <Input
                            id="password"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Минимум 6 символов"
                            className="pl-10"
                            autoComplete="new-password"
                          />
                        </div>
                      </div>

                      <div>
                        <Label htmlFor="confirmPassword" className="text-sm font-medium text-gray-700">
                          Подтверждение <span className="text-red-500">*</span>
                        </Label>
                        <div className="relative mt-1">
                          <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                          <Input
                            id="confirmPassword"
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder="Повторите пароль"
                            className="pl-10"
                            autoComplete="new-password"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Откуда узнали */}
                <div className="mb-6">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-6 h-6 rounded-full bg-gray-300 flex items-center justify-center text-white text-xs font-bold">?</div>
                    <span className="font-semibold text-gray-900">Откуда вы узнали о нас? <span className="text-red-500">*</span></span>
                  </div>

                  <div className="relative">
                    <select
                      value={source}
                      onChange={(e) => setSource(e.target.value)}
                      className="w-full px-4 py-2.5 pr-10 border-2 border-gray-200 rounded-xl text-sm bg-white appearance-none cursor-pointer focus:border-yellow-400 focus:outline-none focus:ring-2 focus:ring-yellow-100"
                    >
                      {SOURCE_OPTIONS.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                    <ChevronDown size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                  </div>

                  {source === 'other' && (
                    <div className="mt-3">
                      <Input
                        type="text"
                        value={sourceOther}
                        onChange={(e) => setSourceOther(e.target.value)}
                        placeholder="Укажите источник..."
                        className="border-2"
                      />
                    </div>
                  )}
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full btn-gradient rounded-xl py-3 flex items-center justify-center gap-2 text-base font-semibold"
                >
                  {loading ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  ) : (
                    <>
                      Зарегистрироваться
                      <ArrowRight size={18} />
                    </>
                  )}
                </Button>
              </>
            ) : (
              /* Форма входа */
              <div className="space-y-4">
                <div>
                  <Label htmlFor="email" className="text-sm font-medium text-gray-700">Email</Label>
                  <div className="relative mt-1">
                    <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="example@company.ru"
                      className="pl-10"
                      autoComplete="email"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password" className="text-sm font-medium text-gray-700">Пароль</Label>
                    <Link to="/forgot-password" className="text-xs text-yellow-600 hover:underline">
                      Забыли пароль?
                    </Link>
                  </div>
                  <div className="relative mt-1">
                    <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <Input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Ваш пароль"
                      className="pl-10"
                      autoComplete="current-password"
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full btn-gradient rounded-xl py-3 flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  ) : (
                    <>
                      Войти
                      <ArrowRight size={18} />
                    </>
                  )}
                </Button>
              </div>
            )}
          </form>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">или</span>
            </div>
          </div>

          {/* Guest CTA */}
          <div className="text-center">
            <p className="text-sm text-gray-600 mb-3">
              Не хотите регистрироваться?
            </p>
            <Button
              onClick={() => navigate('/check')}
              variant="outline"
              className="rounded-xl border-2 border-yellow-400 text-yellow-700 hover:bg-yellow-50"
            >
              Проверить товары без регистрации
            </Button>
          </div>
        </div>

        {/* Bottom Info */}
        <p className="text-center text-xs text-gray-500 mt-6">
          Продолжая, вы соглашаетесь с условиями использования сервиса
        </p>

        {/* Employee Login Link */}
        <div className="text-center mt-4 pt-4 border-t border-gray-200">
          <a
            href="/employee/login"
            className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
          >
            Вход для сотрудников →
          </a>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
