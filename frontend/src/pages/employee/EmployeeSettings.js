import React, { useState, useEffect } from 'react';
import { useEmployeeAuth } from '../../context/EmployeeAuthContext';
import {
  Settings,
  Bell,
  Clock,
  Mail,
  Plus,
  Trash2,
  Save,
  Check,
  X,
  AlertTriangle
} from 'lucide-react';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const EmployeeSettings = () => {
  const { authFetch, isSuperAdmin } = useEmployeeAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [settings, setSettings] = useState({});
  const [newEmail, setNewEmail] = useState('');
  const [slaHours, setSlaHours] = useState('24');

  useEffect(() => {
    if (isSuperAdmin) {
      fetchData();
    }
  }, [isSuperAdmin]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [notifRes, settingsRes] = await Promise.all([
        authFetch(`${API_URL}/api/superadmin/notifications`),
        authFetch(`${API_URL}/api/superadmin/settings`)
      ]);

      if (notifRes.ok) {
        const data = await notifRes.json();
        setNotifications(data.notifications || []);
      }

      if (settingsRes.ok) {
        const data = await settingsRes.json();
        setSettings(data.settings || {});
        if (data.settings?.sla_hours) {
          setSlaHours(data.settings.sla_hours.value);
        }
      }
    } catch (error) {
      console.error('Failed to fetch settings:', error);
      toast.error('Ошибка загрузки настроек');
    } finally {
      setLoading(false);
    }
  };

  const handleAddEmail = async () => {
    if (!newEmail.trim() || !newEmail.includes('@')) {
      toast.error('Введите корректный email');
      return;
    }

    try {
      const response = await authFetch(`${API_URL}/api/superadmin/notifications`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: newEmail.trim(),
          notify_new_callback: true,
          notify_overdue: true
        })
      });

      if (response.ok) {
        toast.success('Email добавлен');
        setNewEmail('');
        fetchData();
      } else {
        toast.error('Ошибка добавления');
      }
    } catch (error) {
      toast.error('Ошибка добавления');
    }
  };

  const handleToggleNotification = async (id, field, currentValue) => {
    try {
      const response = await authFetch(`${API_URL}/api/superadmin/notifications/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: !currentValue })
      });

      if (response.ok) {
        fetchData();
      }
    } catch (error) {
      toast.error('Ошибка обновления');
    }
  };

  const handleDeleteNotification = async (id) => {
    if (!window.confirm('Удалить этот email из уведомлений?')) return;

    try {
      const response = await authFetch(`${API_URL}/api/superadmin/notifications/${id}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        toast.success('Email удалён');
        fetchData();
      }
    } catch (error) {
      toast.error('Ошибка удаления');
    }
  };

  const handleSaveSLA = async () => {
    const hours = parseInt(slaHours);
    if (isNaN(hours) || hours < 1 || hours > 168) {
      toast.error('Введите корректное количество часов (1-168)');
      return;
    }

    setSaving(true);
    try {
      const response = await authFetch(`${API_URL}/api/superadmin/settings/sla_hours`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          value: hours.toString(),
          description: 'Время на обработку заявки в часах'
        })
      });

      if (response.ok) {
        toast.success('SLA сохранён');
      } else {
        toast.error('Ошибка сохранения');
      }
    } catch (error) {
      toast.error('Ошибка сохранения');
    } finally {
      setSaving(false);
    }
  };

  if (!isSuperAdmin) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertTriangle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
          <h2 className="text-lg font-medium text-gray-900">Доступ ограничен</h2>
          <p className="text-gray-500">Эта страница доступна только для суперадмина</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-gray-200 border-t-yellow-500"></div>
          <p className="text-gray-500 text-sm">Загрузка настроек...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-gray-900 flex items-center gap-2">
          <Settings className="w-6 h-6" />
          Настройки CRM
        </h1>
        <p className="text-gray-500 mt-1">Управление уведомлениями и параметрами системы</p>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Уведомления */}
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm">
          <div className="px-5 py-4 border-b border-gray-100">
            <h3 className="font-medium text-gray-900 flex items-center gap-2">
              <Bell className="w-5 h-5 text-yellow-500" />
              Email-уведомления
            </h3>
            <p className="text-sm text-gray-500 mt-1">
              Получатели уведомлений о новых заявках и просрочках
            </p>
          </div>

          <div className="p-5 space-y-4">
            {/* Add new email */}
            <div className="flex gap-2">
              <input
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="Добавить email..."
                className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500/20 focus:border-yellow-500"
              />
              <button
                onClick={handleAddEmail}
                className="px-4 py-2 bg-yellow-500 text-gray-900 rounded-lg hover:bg-yellow-600 transition-colors flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Добавить
              </button>
            </div>

            {/* List of emails */}
            {notifications.length > 0 ? (
              <div className="space-y-2">
                {notifications.map((notif) => (
                  <div
                    key={notif.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <Mail className="w-4 h-4 text-gray-400" />
                      <span className="text-sm text-gray-900">{notif.email}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleToggleNotification(notif.id, 'notify_new_callback', notif.notify_new_callback)}
                        className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                          notif.notify_new_callback
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-gray-100 text-gray-400'
                        }`}
                        title="Новые заявки"
                      >
                        Заявки
                      </button>
                      <button
                        onClick={() => handleToggleNotification(notif.id, 'notify_overdue', notif.notify_overdue)}
                        className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                          notif.notify_overdue
                            ? 'bg-red-100 text-red-700'
                            : 'bg-gray-100 text-gray-400'
                        }`}
                        title="Просрочки"
                      >
                        Просрочки
                      </button>
                      <button
                        onClick={() => handleDeleteNotification(notif.id)}
                        className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-400">
                <Mail className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Нет настроенных получателей</p>
                <p className="text-xs">Добавьте email для получения уведомлений</p>
              </div>
            )}
          </div>
        </div>

        {/* SLA Settings */}
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm">
          <div className="px-5 py-4 border-b border-gray-100">
            <h3 className="font-medium text-gray-900 flex items-center gap-2">
              <Clock className="w-5 h-5 text-blue-500" />
              SLA - Время на обработку
            </h3>
            <p className="text-sm text-gray-500 mt-1">
              Максимальное время на обработку заявки
            </p>
          </div>

          <div className="p-5 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Время на обработку (часов)
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  min="1"
                  max="168"
                  value={slaHours}
                  onChange={(e) => setSlaHours(e.target.value)}
                  className="w-32 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500/20 focus:border-yellow-500"
                />
                <button
                  onClick={handleSaveSLA}
                  disabled={saving}
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center gap-2 disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  {saving ? 'Сохранение...' : 'Сохранить'}
                </button>
              </div>
              <p className="text-xs text-gray-400 mt-2">
                После истечения этого времени заявка будет помечена как просроченная
              </p>
            </div>

            {/* Quick presets */}
            <div>
              <p className="text-sm text-gray-500 mb-2">Быстрый выбор:</p>
              <div className="flex flex-wrap gap-2">
                {[2, 4, 8, 24, 48].map((hours) => (
                  <button
                    key={hours}
                    onClick={() => setSlaHours(hours.toString())}
                    className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                      slaHours === hours.toString()
                        ? 'bg-blue-100 text-blue-700 border border-blue-200'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {hours} ч
                  </button>
                ))}
              </div>
            </div>

            {/* Info box */}
            <div className="p-4 bg-yellow-50 border border-yellow-100 rounded-lg">
              <h4 className="text-sm font-medium text-yellow-800 mb-1">Как работает SLA</h4>
              <ul className="text-xs text-yellow-700 space-y-1">
                <li>• Каждая новая заявка получает дедлайн обработки</li>
                <li>• Просроченные заявки отмечаются красным в списке</li>
                <li>• Superadmin получает уведомления о просрочках</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmployeeSettings;
