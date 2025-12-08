import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';
import { Mail, Lock, User, ArrowRight, LogIn, UserPlus } from 'lucide-react';

const LoginPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, register, isAuthenticated, loading: authLoading } = useAuth();

  const [mode, setMode] = useState('login'); // 'login' or 'register'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  // Редирект если уже авторизован
  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      const from = location.state?.from || '/cabinet';
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, authLoading, navigate, location]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!email || !password) {
      toast.error('Заполните все поля');
      return;
    }

    if (mode === 'register') {
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
      if (mode === 'login') {
        await login(email, password);
        toast.success('Добро пожаловать!');
      } else {
        await register(email, password);
        toast.success('Регистрация успешна!');
      }
      const from = location.state?.from || '/cabinet';
      navigate(from, { replace: true });
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[rgb(var(--brand-yellow-500))]"></div>
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
              : 'Создайте аккаунт для сохранения документов'}
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
            <div>
              <Label htmlFor="email" className="text-sm font-medium text-gray-700">
                Email
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
            </div>

            <div>
              <Label htmlFor="password" className="text-sm font-medium text-gray-700">
                Пароль
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

            {mode === 'register' && (
              <div>
                <Label htmlFor="confirmPassword" className="text-sm font-medium text-gray-700">
                  Подтверждение пароля
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
