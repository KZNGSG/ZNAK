import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Lock, CheckCircle, XCircle, Loader2, ArrowRight, Eye, EyeOff } from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const ResetPasswordPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [status, setStatus] = useState('loading'); // loading, valid, invalid, success, error
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Verify token on page load
  useEffect(() => {
    if (token) {
      verifyToken(token);
    } else {
      setStatus('invalid');
      setErrorMessage('Отсутствует токен сброса пароля');
    }
  }, [token]);

  const verifyToken = async (resetToken) => {
    try {
      const response = await fetch(
        `${API_URL}/api/auth/verify-reset-token?token=${encodeURIComponent(resetToken)}`
      );

      if (response.ok) {
        const data = await response.json();
        setStatus('valid');
        setEmail(data.email || '');
      } else {
        const error = await response.json();
        setStatus('invalid');
        setErrorMessage(error.detail || 'Недействительная ссылка');
      }
    } catch (error) {
      console.error('Token verification error:', error);
      setStatus('invalid');
      setErrorMessage('Ошибка соединения с сервером');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (password.length < 6) {
      setErrorMessage('Пароль должен быть не менее 6 символов');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage('Пароли не совпадают');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/api/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password })
      });

      if (response.ok) {
        setStatus('success');
      } else {
        const error = await response.json();
        setStatus('error');
        setErrorMessage(error.detail || 'Ошибка сброса пароля');
      }
    } catch (error) {
      console.error('Reset password error:', error);
      setStatus('error');
      setErrorMessage('Ошибка соединения с сервером');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="py-12 bg-gradient-to-b from-slate-50 to-white min-h-screen flex items-center justify-center">
      <div className="mx-auto max-w-md px-4 w-full">
        <div className="bg-white rounded-3xl border-2 border-gray-200 overflow-hidden shadow-xl">
          {/* Loading State */}
          {status === 'loading' && (
            <>
              <div className="bg-gradient-to-r from-[rgb(var(--brand-yellow-400))] to-[rgb(var(--brand-yellow-500))] px-8 py-8 text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-white/20 mb-4">
                  <Loader2 size={32} className="text-black animate-spin" />
                </div>
                <h1 className="text-2xl font-bold text-black">Проверка ссылки</h1>
              </div>
              <div className="p-8 text-center">
                <p className="text-gray-600">Проверяем ссылку сброса пароля...</p>
              </div>
            </>
          )}

          {/* Valid Token - Show Form */}
          {status === 'valid' && (
            <>
              <div className="bg-gradient-to-r from-[rgb(var(--brand-yellow-400))] to-[rgb(var(--brand-yellow-500))] px-8 py-8 text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-white/20 mb-4">
                  <Lock size={32} className="text-black" />
                </div>
                <h1 className="text-2xl font-bold text-black">Новый пароль</h1>
              </div>
              <div className="p-8">
                {email && (
                  <p className="text-sm text-gray-600 text-center mb-4">
                    Сброс пароля для: <span className="font-semibold">{email}</span>
                  </p>
                )}

                <form onSubmit={handleSubmit}>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="password" className="text-sm font-medium text-gray-700">
                        Новый пароль
                      </Label>
                      <div className="relative mt-1">
                        <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                        <Input
                          id="password"
                          type={showPassword ? 'text' : 'password'}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="Минимум 6 символов"
                          className="pl-10 pr-10 py-3 rounded-xl"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                          {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="confirmPassword" className="text-sm font-medium text-gray-700">
                        Подтвердите пароль
                      </Label>
                      <div className="relative mt-1">
                        <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                        <Input
                          id="confirmPassword"
                          type={showPassword ? 'text' : 'password'}
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="Повторите пароль"
                          className="pl-10 py-3 rounded-xl"
                          required
                        />
                      </div>
                    </div>
                  </div>

                  {errorMessage && (
                    <div className="mt-4 p-3 bg-red-50 text-red-600 text-sm rounded-xl">
                      {errorMessage}
                    </div>
                  )}

                  <Button
                    type="submit"
                    disabled={loading || !password || !confirmPassword}
                    className="w-full mt-6 btn-gradient rounded-xl py-3 flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="animate-spin" size={18} />
                        Сохранение...
                      </>
                    ) : (
                      <>
                        <Lock size={18} />
                        Сохранить пароль
                      </>
                    )}
                  </Button>
                </form>
              </div>
            </>
          )}

          {/* Success State */}
          {status === 'success' && (
            <>
              <div className="bg-gradient-to-r from-emerald-400 to-emerald-500 px-8 py-8 text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-white/20 mb-4">
                  <CheckCircle size={32} className="text-white" />
                </div>
                <h1 className="text-2xl font-bold text-white">Пароль изменён!</h1>
              </div>
              <div className="p-8">
                <div className="text-center mb-6">
                  <p className="text-gray-600 mb-4">
                    Ваш пароль успешно изменён. Теперь вы можете войти с новым паролем.
                  </p>
                </div>

                <Button
                  onClick={() => navigate('/login')}
                  className="w-full btn-gradient rounded-xl py-3 flex items-center justify-center gap-2"
                >
                  Войти в систему
                  <ArrowRight size={18} />
                </Button>
              </div>
            </>
          )}

          {/* Invalid Token / Error State */}
          {(status === 'invalid' || status === 'error') && (
            <>
              <div className="bg-gradient-to-r from-red-400 to-red-500 px-8 py-8 text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-white/20 mb-4">
                  <XCircle size={32} className="text-white" />
                </div>
                <h1 className="text-2xl font-bold text-white">
                  {status === 'invalid' ? 'Ссылка недействительна' : 'Ошибка'}
                </h1>
              </div>
              <div className="p-8">
                <div className="text-center mb-6">
                  <p className="text-gray-600 mb-4">{errorMessage}</p>
                  <div className="bg-gray-50 rounded-xl p-4 text-sm text-gray-600">
                    <p className="mb-2">Возможные причины:</p>
                    <ul className="text-left list-disc list-inside space-y-1">
                      <li>Ссылка уже была использована</li>
                      <li>Срок действия ссылки истёк (1 час)</li>
                      <li>Ссылка повреждена</li>
                    </ul>
                  </div>
                </div>

                <div className="space-y-3">
                  <Button
                    onClick={() => navigate('/forgot-password')}
                    className="w-full btn-gradient rounded-xl py-3"
                  >
                    Запросить новую ссылку
                  </Button>
                  <Link
                    to="/login"
                    className="block text-center text-sm text-gray-500 hover:text-gray-700"
                  >
                    Вернуться к входу
                  </Link>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-gray-500 mt-6">
          Возникли проблемы? Напишите нам на{' '}
          <a href="mailto:info@promarkirui.ru" className="text-[rgb(var(--brand-yellow-600))] hover:underline">
            info@promarkirui.ru
          </a>
        </p>
      </div>
    </div>
  );
};

export default ResetPasswordPage;
