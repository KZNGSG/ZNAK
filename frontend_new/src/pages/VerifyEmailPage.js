import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { CheckCircle, XCircle, Loader2, Mail, ArrowRight } from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const VerifyEmailPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [status, setStatus] = useState('loading'); // loading, success, error
  const [email, setEmail] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (token) {
      verifyEmail(token);
    } else {
      setStatus('error');
      setErrorMessage('Отсутствует токен подтверждения');
    }
  }, [token]);

  const verifyEmail = async (verificationToken) => {
    try {
      const response = await fetch(
        `${API_URL}/api/auth/verify-email?token=${encodeURIComponent(verificationToken)}`
      );

      if (response.ok) {
        const data = await response.json();
        setStatus('success');
        setEmail(data.email || '');
      } else {
        const error = await response.json();
        setStatus('error');
        setErrorMessage(error.detail || 'Ошибка подтверждения email');
      }
    } catch (error) {
      console.error('Verification error:', error);
      setStatus('error');
      setErrorMessage('Ошибка соединения с сервером');
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
                <h1 className="text-2xl font-bold text-black">Подтверждение email</h1>
              </div>
              <div className="p-8 text-center">
                <p className="text-gray-600">Проверяем ссылку подтверждения...</p>
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
                <h1 className="text-2xl font-bold text-white">Email подтверждён!</h1>
              </div>
              <div className="p-8">
                <div className="text-center mb-6">
                  <p className="text-gray-600 mb-2">
                    Ваш email успешно подтверждён
                  </p>
                  {email && (
                    <p className="text-lg font-semibold text-gray-900">{email}</p>
                  )}
                </div>

                <div className="bg-emerald-50 rounded-xl p-4 mb-6">
                  <p className="text-sm text-emerald-700">
                    Теперь вам доступны все функции личного кабинета:
                    сохранение проверок, договоры и коммерческие предложения.
                  </p>
                </div>

                <div className="space-y-3">
                  <Button
                    onClick={() => navigate('/cabinet')}
                    className="w-full btn-gradient rounded-xl py-3 flex items-center justify-center gap-2"
                  >
                    Перейти в личный кабинет
                    <ArrowRight size={18} />
                  </Button>
                  <Button
                    onClick={() => navigate('/check')}
                    variant="outline"
                    className="w-full rounded-xl py-3"
                  >
                    Проверить товары
                  </Button>
                </div>
              </div>
            </>
          )}

          {/* Error State */}
          {status === 'error' && (
            <>
              <div className="bg-gradient-to-r from-red-400 to-red-500 px-8 py-8 text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-white/20 mb-4">
                  <XCircle size={32} className="text-white" />
                </div>
                <h1 className="text-2xl font-bold text-white">Ошибка подтверждения</h1>
              </div>
              <div className="p-8">
                <div className="text-center mb-6">
                  <p className="text-gray-600 mb-4">{errorMessage}</p>
                  <div className="bg-gray-50 rounded-xl p-4 text-sm text-gray-600">
                    <p className="mb-2">Возможные причины:</p>
                    <ul className="text-left list-disc list-inside space-y-1">
                      <li>Ссылка уже была использована</li>
                      <li>Срок действия ссылки истёк (24 часа)</li>
                      <li>Ссылка повреждена</li>
                    </ul>
                  </div>
                </div>

                <div className="space-y-3">
                  <Button
                    onClick={() => navigate('/login')}
                    className="w-full btn-gradient rounded-xl py-3 flex items-center justify-center gap-2"
                  >
                    <Mail size={18} />
                    Войти и отправить повторно
                  </Button>
                  <Link
                    to="/"
                    className="block text-center text-sm text-gray-500 hover:text-gray-700"
                  >
                    Вернуться на главную
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

export default VerifyEmailPage;
