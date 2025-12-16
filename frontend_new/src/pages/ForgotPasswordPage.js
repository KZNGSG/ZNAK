import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Mail, ArrowLeft, Loader2, CheckCircle } from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const ForgotPasswordPage = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/api/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase() })
      });

      if (response.ok) {
        setSent(true);
      } else {
        const data = await response.json();
        setError(data.detail || 'Произошла ошибка');
      }
    } catch (err) {
      console.error('Forgot password error:', err);
      setError('Ошибка соединения с сервером');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="py-12 bg-gradient-to-b from-slate-50 to-white min-h-screen flex items-center justify-center">
      <div className="mx-auto max-w-md px-4 w-full">
        <div className="bg-white rounded-3xl border-2 border-gray-200 overflow-hidden shadow-xl">
          {/* Header */}
          <div className="bg-gradient-to-r from-[rgb(var(--brand-yellow-400))] to-[rgb(var(--brand-yellow-500))] px-8 py-8 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-white/20 mb-4">
              {sent ? (
                <CheckCircle size={32} className="text-black" />
              ) : (
                <Mail size={32} className="text-black" />
              )}
            </div>
            <h1 className="text-2xl font-bold text-black">
              {sent ? 'Письмо отправлено' : 'Восстановление пароля'}
            </h1>
          </div>

          {/* Content */}
          <div className="p-8">
            {sent ? (
              <>
                <div className="text-center mb-6">
                  <p className="text-gray-600 mb-4">
                    Если указанный email зарегистрирован в системе, вы получите письмо с инструкциями по сбросу пароля.
                  </p>
                  <div className="bg-amber-50 rounded-xl p-4 text-sm text-amber-700">
                    Проверьте папку "Спам", если письмо не пришло в течение нескольких минут.
                  </div>
                </div>
                <div className="space-y-3">
                  <Link
                    to="/login"
                    className="block w-full text-center btn-gradient rounded-xl py-3 font-medium"
                  >
                    Вернуться к входу
                  </Link>
                </div>
              </>
            ) : (
              <form onSubmit={handleSubmit}>
                <div className="mb-6">
                  <p className="text-gray-600 text-sm mb-4">
                    Введите email, указанный при регистрации. Мы отправим вам ссылку для сброса пароля.
                  </p>

                  <Label htmlFor="email" className="text-sm font-medium text-gray-700">
                    Email
                  </Label>
                  <div className="relative mt-1">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="your@email.com"
                      className="pl-10 py-3 rounded-xl"
                      required
                    />
                  </div>
                </div>

                {error && (
                  <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded-xl">
                    {error}
                  </div>
                )}

                <Button
                  type="submit"
                  disabled={loading || !email}
                  className="w-full btn-gradient rounded-xl py-3 flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <Loader2 className="animate-spin" size={18} />
                      Отправка...
                    </>
                  ) : (
                    <>
                      <Mail size={18} />
                      Отправить ссылку
                    </>
                  )}
                </Button>

                <Link
                  to="/login"
                  className="mt-4 flex items-center justify-center gap-2 text-sm text-gray-500 hover:text-gray-700"
                >
                  <ArrowLeft size={16} />
                  Вернуться к входу
                </Link>
              </form>
            )}
          </div>
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

export default ForgotPasswordPage;
