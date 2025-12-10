import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';
import { Mail, Lock, User, ArrowRight, LogIn, UserPlus, Building2, Phone, AlertCircle, Send, MapPin, Search } from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

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
  // Сотрудники (employee/superadmin) НЕ требуют подтверждения email
  useEffect(() => {
    if (!authLoading && isAuthenticated && user) {
      const isStaff = ['employee', 'superadmin'].includes(user.role);
      if (isStaff || user.email_verified) {
        // Сотрудники или клиенты с подтверждённым email - редирект
        const from = location.state?.from || getRedirectByRole(user.role);
        navigate(from, { replace: true });
      } else {
        // Только клиенты без подтверждённого email видят блок верификации
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

    // Debounce поиска
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

    // Парсим адрес для получения города и региона
    const address = company.address || '';
    const addressParts = address.split(',').map(s => s.trim());

    // Ищем регион и город в адресе
    let foundRegion = '';
    let foundCity = '';

    for (const part of addressParts) {
      const lowerPart = part.toLowerCase();
      // Проверяем на регион/область/край/республика
      if (lowerPart.includes('область') || lowerPart.includes('край') ||
          lowerPart.includes('республика') || lowerPart.includes('округ') ||
          lowerPart.includes('обл') || lowerPart.includes('респ')) {
        foundRegion = part;
      }
      // Проверяем на город
      if (lowerPart.startsWith('г ') || lowerPart.startsWith('г.') ||
          lowerPart.includes('город')) {
        foundCity = part.replace(/^г\.?\s*/i, '').replace(/город\s*/i, '');
      }
    }

    // Если город не найден, берём первую часть после индекса
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

        // Проверяем подтверждение email (только для клиентов, не для сотрудников)
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
        result = await register(email, password, {
          name: fullName,
          phone: phone,
          inn: inn,
          company_name: companyName,
          city: city,
          region: region
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
    <div className="py-12 bg-gradient-to-b from-slate-50 to-white min-h-screen">
      <div className="mx-auto max-w-md px-4">
        {/* Logo / Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-[rgb(var(--brand-yellow-400))] to-[rgb(var(--brand-yellow-600))] mb-4">
            <User size={32} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">
            {mode === 'login' ? 'Вход в личный кабинет' : 'Регистрация'}
          </h1>
          <p className="text-gray-600 mt-2">
            {mode === 'login'
              ? 'Войдите, чтобы видеть ваши договоры и КП'
              : 'Создайте аккаунт для работы с документами'}
          </p>
        </div>

        {/* Form Card */}
        <div className="bg-white rounded-2xl border-2 border-gray-200 p-8 shadow-lg">
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
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Поля только для регистрации */}
            {mode === 'register' && (
              <>
                {/* ФИО */}
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

                {/* Поиск компании */}
                <div className="relative" ref={suggestionsRef}>
                  <Label htmlFor="companySearch" className="text-sm font-medium text-gray-700">
                    Компания (ИНН или название) <span className="text-red-500">*</span>
                  </Label>
                  <div className="relative mt-1">
                    <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <Input
                      id="companySearch"
                      type="text"
                      value={searchQuery}
                      onChange={handleSearchChange}
                      onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                      placeholder="Начните вводить ИНН или название..."
                      className="pl-10 pr-10"
                    />
                    {searchLoading && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-yellow-500"></div>
                      </div>
                    )}
                  </div>

                  {/* Выпадающий список */}
                  {showSuggestions && suggestions.length > 0 && (
                    <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-64 overflow-y-auto">
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
                              <span className="ml-2">{company.address.slice(0, 50)}...</span>
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}

                  <p className="text-xs text-gray-500 mt-1">
                    Введите минимум 4 символа для поиска
                  </p>
                </div>

                {/* ИНН (показываем выбранный) */}
                {inn && (
                  <div className="bg-green-50 border border-green-200 rounded-xl p-3">
                    <div className="flex items-start gap-3">
                      <Building2 size={18} className="text-green-600 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-gray-900 text-sm truncate">{companyName}</div>
                        <div className="text-xs text-gray-600">ИНН: {inn}</div>
                        {(city || region) && (
                          <div className="flex items-center gap-1 mt-1 text-xs text-gray-500">
                            <MapPin size={12} />
                            {[region, city].filter(Boolean).join(', ')}
                          </div>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setInn('');
                          setCompanyName('');
                          setCity('');
                          setRegion('');
                          setSearchQuery('');
                        }}
                        className="text-gray-400 hover:text-red-500 text-xs"
                      >
                        Изменить
                      </button>
                    </div>
                  </div>
                )}

                {/* Телефон */}
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
              </>
            )}

            {/* Email */}
            <div>
              <Label htmlFor="email" className="text-sm font-medium text-gray-700">
                Email {mode === 'register' && <span className="text-red-500">*</span>}
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
              {mode === 'register' && (
                <p className="text-xs text-gray-500 mt-1">На этот адрес придёт письмо для подтверждения</p>
              )}
            </div>

            {/* Пароль */}
            <div>
              <Label htmlFor="password" className="text-sm font-medium text-gray-700">
                Пароль {mode === 'register' && <span className="text-red-500">*</span>}
              </Label>
              <div className="relative mt-1">
                <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={mode === 'register' ? 'Минимум 6 символов' : 'Ваш пароль'}
                  className="pl-10"
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                />
              </div>
            </div>

            {/* Подтверждение пароля */}
            {mode === 'register' && (
              <div>
                <Label htmlFor="confirmPassword" className="text-sm font-medium text-gray-700">
                  Подтверждение пароля <span className="text-red-500">*</span>
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
            )}

            <Button
              type="submit"
              disabled={loading}
              className="w-full btn-gradient rounded-xl py-3 flex items-center justify-center gap-2"
            >
              {loading ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              ) : (
                <>
                  {mode === 'login' ? 'Войти' : 'Зарегистрироваться'}
                  <ArrowRight size={18} />
                </>
              )}
            </Button>
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
              className="rounded-xl border-2 border-[rgb(var(--brand-yellow-500))] text-[rgb(var(--brand-yellow-700))] hover:bg-[rgb(var(--brand-yellow-50))]"
            >
              Проверить товары без регистрации
            </Button>
          </div>
        </div>

        {/* Bottom Info */}
        <p className="text-center text-xs text-gray-500 mt-6">
          Продолжая, вы соглашаетесь с условиями использования сервиса
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
