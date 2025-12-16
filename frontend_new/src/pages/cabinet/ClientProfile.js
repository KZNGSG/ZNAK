import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'sonner';
import {
  User,
  Mail,
  Phone,
  Building2,
  Save,
  Shield,
  Bell,
  LogOut,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const ClientProfile = () => {
  const { user, token, logout } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: user?.name || '',
    phone: user?.phone || '',
    company_name: user?.company_name || '',
    inn: user?.inn || ''
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const [notifications, setNotifications] = useState({
    email_quotes: true,
    email_contracts: true,
    email_news: false
  });

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/api/client/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        toast.success('Профиль обновлён');
      } else {
        throw new Error('Ошибка обновления');
      }
    } catch (error) {
      console.error('Failed to update profile:', error);
      toast.error('Не удалось обновить профиль');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('Пароли не совпадают');
      return;
    }

    if (passwordData.newPassword.length < 6) {
      toast.error('Пароль должен быть не менее 6 символов');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/client/password`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          current_password: passwordData.currentPassword,
          new_password: passwordData.newPassword
        })
      });

      if (response.ok) {
        toast.success('Пароль изменён');
        setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      } else {
        const data = await response.json();
        throw new Error(data.detail || 'Ошибка смены пароля');
      }
    } catch (error) {
      console.error('Failed to change password:', error);
      toast.error(error.message || 'Не удалось изменить пароль');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Профиль и настройки</h1>
        <p className="text-gray-500 mt-1">Управление вашим аккаунтом</p>
      </div>

      {/* Email verification status */}
      <div className={`rounded-xl p-4 flex items-center gap-3 ${
        user?.email_verified ? 'bg-green-50 border border-green-200' : 'bg-yellow-50 border border-yellow-200'
      }`}>
        {user?.email_verified ? (
          <>
            <CheckCircle2 className="w-5 h-5 text-green-500" />
            <div>
              <p className="font-medium text-green-800">Email подтверждён</p>
              <p className="text-sm text-green-600">{user?.email}</p>
            </div>
          </>
        ) : (
          <>
            <AlertCircle className="w-5 h-5 text-yellow-500" />
            <div className="flex-1">
              <p className="font-medium text-yellow-800">Email не подтверждён</p>
              <p className="text-sm text-yellow-600">Проверьте почту {user?.email}</p>
            </div>
            <button className="px-4 py-2 bg-yellow-500 text-gray-900 text-sm font-medium rounded-lg hover:bg-yellow-400 transition-colors">
              Отправить повторно
            </button>
          </>
        )}
      </div>

      {/* Profile Form */}
      <form onSubmit={handleProfileUpdate} className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <div className="flex items-center gap-3 pb-4 border-b border-gray-100">
          <User className="w-5 h-5 text-gray-400" />
          <h2 className="font-semibold text-gray-900">Личные данные</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Имя
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Ваше имя"
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Телефон
            </label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="+7 (999) 123-45-67"
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Email
          </label>
          <input
            type="email"
            value={user?.email || ''}
            disabled
            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl bg-gray-50 text-gray-500"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Название компании
            </label>
            <input
              type="text"
              value={formData.company_name}
              onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
              placeholder="ООО «Компания»"
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              ИНН
            </label>
            <input
              type="text"
              value={formData.inn}
              onChange={(e) => setFormData({ ...formData, inn: e.target.value })}
              placeholder="1234567890"
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="flex items-center gap-2 px-5 py-2.5 bg-yellow-500 text-gray-900 font-medium rounded-xl hover:bg-yellow-400 disabled:opacity-50 transition-colors"
        >
          <Save className="w-4 h-4" />
          Сохранить изменения
        </button>
      </form>

      {/* Password Change */}
      <form onSubmit={handlePasswordChange} className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <div className="flex items-center gap-3 pb-4 border-b border-gray-100">
          <Shield className="w-5 h-5 text-gray-400" />
          <h2 className="font-semibold text-gray-900">Безопасность</h2>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Текущий пароль
          </label>
          <input
            type="password"
            value={passwordData.currentPassword}
            onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Новый пароль
            </label>
            <input
              type="password"
              value={passwordData.newPassword}
              onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
              placeholder="Минимум 6 символов"
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Подтвердите пароль
            </label>
            <input
              type="password"
              value={passwordData.confirmPassword}
              onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
              placeholder="Повторите пароль"
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading || !passwordData.currentPassword || !passwordData.newPassword}
          className="flex items-center gap-2 px-5 py-2.5 bg-gray-100 text-gray-700 font-medium rounded-xl hover:bg-gray-200 disabled:opacity-50 transition-colors"
        >
          <Shield className="w-4 h-4" />
          Изменить пароль
        </button>
      </form>

      {/* Notifications */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <div className="flex items-center gap-3 pb-4 border-b border-gray-100">
          <Bell className="w-5 h-5 text-gray-400" />
          <h2 className="font-semibold text-gray-900">Уведомления</h2>
        </div>

        <div className="space-y-3">
          <label className="flex items-center justify-between p-3 bg-gray-50 rounded-lg cursor-pointer">
            <div>
              <p className="font-medium text-gray-900">Новые КП</p>
              <p className="text-sm text-gray-500">Уведомления о новых коммерческих предложениях</p>
            </div>
            <input
              type="checkbox"
              checked={notifications.email_quotes}
              onChange={(e) => setNotifications({ ...notifications, email_quotes: e.target.checked })}
              className="w-5 h-5 rounded border-gray-300 text-yellow-500 focus:ring-yellow-500"
            />
          </label>

          <label className="flex items-center justify-between p-3 bg-gray-50 rounded-lg cursor-pointer">
            <div>
              <p className="font-medium text-gray-900">Договоры</p>
              <p className="text-sm text-gray-500">Уведомления об изменениях в договорах</p>
            </div>
            <input
              type="checkbox"
              checked={notifications.email_contracts}
              onChange={(e) => setNotifications({ ...notifications, email_contracts: e.target.checked })}
              className="w-5 h-5 rounded border-gray-300 text-yellow-500 focus:ring-yellow-500"
            />
          </label>

          <label className="flex items-center justify-between p-3 bg-gray-50 rounded-lg cursor-pointer">
            <div>
              <p className="font-medium text-gray-900">Новости и акции</p>
              <p className="text-sm text-gray-500">Информация о новых услугах и скидках</p>
            </div>
            <input
              type="checkbox"
              checked={notifications.email_news}
              onChange={(e) => setNotifications({ ...notifications, email_news: e.target.checked })}
              className="w-5 h-5 rounded border-gray-300 text-yellow-500 focus:ring-yellow-500"
            />
          </label>
        </div>
      </div>

      {/* Logout */}
      <div className="bg-red-50 rounded-xl border border-red-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-medium text-red-800">Выйти из аккаунта</h3>
            <p className="text-sm text-red-600">Вы будете перенаправлены на страницу входа</p>
          </div>
          <button
            onClick={logout}
            className="flex items-center gap-2 px-5 py-2.5 bg-red-500 text-white font-medium rounded-xl hover:bg-red-600 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Выйти
          </button>
        </div>
      </div>
    </div>
  );
};

export default ClientProfile;
