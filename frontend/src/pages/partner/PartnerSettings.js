import React, { useState } from 'react';
import { usePartnerAuth } from '../../context/PartnerAuthContext';
import {
  User,
  Phone,
  Mail,
  Building2,
  FileText,
  Save,
  Key,
  Shield
} from 'lucide-react';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const PartnerSettings = () => {
  const { partner, authFetch, refreshPartner } = usePartnerAuth();
  const [loading, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    contact_name: partner?.contact_name || '',
    contact_phone: partner?.contact_phone || ''
  });

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      const response = await authFetch(`${API_URL}/api/partner/settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        toast.success('Настройки сохранены');
        refreshPartner();
      } else {
        const data = await response.json();
        toast.error(data.detail || 'Ошибка сохранения');
      }
    } catch (error) {
      console.error('Failed to save settings:', error);
      toast.error('Ошибка сохранения');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Настройки профиля</h1>
        <p className="text-gray-500 mt-1">Управление данными партнёрского аккаунта</p>
      </div>

      {/* Profile info (read-only) */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
          <Shield className="w-5 h-5 text-amber-500" />
          <h2 className="font-semibold text-gray-900">Информация об аккаунте</h2>
        </div>
        <div className="p-6 space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="p-4 bg-gray-50 rounded-xl">
              <div className="flex items-center gap-2 mb-2">
                <Mail className="w-4 h-4 text-gray-400" />
                <span className="text-sm text-gray-500">Email</span>
              </div>
              <div className="font-medium text-gray-900">{partner?.contact_email}</div>
            </div>

            <div className="p-4 bg-gray-50 rounded-xl">
              <div className="flex items-center gap-2 mb-2">
                <Key className="w-4 h-4 text-gray-400" />
                <span className="text-sm text-gray-500">Реферальный код</span>
              </div>
              <div className="font-mono font-medium text-amber-600">{partner?.ref_code}</div>
            </div>

            {partner?.company_name && (
              <div className="p-4 bg-gray-50 rounded-xl">
                <div className="flex items-center gap-2 mb-2">
                  <Building2 className="w-4 h-4 text-gray-400" />
                  <span className="text-sm text-gray-500">Компания</span>
                </div>
                <div className="font-medium text-gray-900">{partner?.company_name}</div>
              </div>
            )}

            {partner?.inn && (
              <div className="p-4 bg-gray-50 rounded-xl">
                <div className="flex items-center gap-2 mb-2">
                  <FileText className="w-4 h-4 text-gray-400" />
                  <span className="text-sm text-gray-500">ИНН</span>
                </div>
                <div className="font-medium text-gray-900">{partner?.inn}</div>
              </div>
            )}
          </div>

          <div className="p-4 bg-amber-50 rounded-xl border border-amber-200">
            <div className="text-sm text-amber-800">
              <strong>Ставка комиссии:</strong> {partner?.commission_rate || 10}%
            </div>
            <div className="text-xs text-amber-600 mt-1">
              Для изменения ставки свяжитесь с менеджером
            </div>
          </div>
        </div>
      </div>

      {/* Editable settings */}
      <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
          <User className="w-5 h-5 text-amber-500" />
          <h2 className="font-semibold text-gray-900">Контактные данные</h2>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Контактное имя
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                name="contact_name"
                value={formData.contact_name}
                onChange={handleChange}
                className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-colors"
                placeholder="Иван Иванов"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Телефон
            </label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="tel"
                name="contact_phone"
                value={formData.contact_phone}
                onChange={handleChange}
                className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-colors"
                placeholder="+7 (999) 123-45-67"
              />
            </div>
          </div>

          <div className="pt-4">
            <button
              type="submit"
              disabled={loading}
              className="w-full md:w-auto px-6 py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-semibold rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Сохранение...
                </>
              ) : (
                <>
                  <Save className="w-5 h-5" />
                  Сохранить изменения
                </>
              )}
            </button>
          </div>
        </div>
      </form>

      {/* Security note */}
      <div className="bg-blue-50 rounded-2xl border border-blue-200 p-6">
        <h3 className="font-semibold text-blue-900 mb-2">Безопасность аккаунта</h3>
        <p className="text-sm text-blue-700 mb-3">
          Для смены пароля или email свяжитесь с вашим менеджером или службой поддержки.
        </p>
        <p className="text-xs text-blue-600">
          Никогда не сообщайте свой пароль третьим лицам. Сотрудники компании никогда не запрашивают пароль.
        </p>
      </div>
    </div>
  );
};

export default PartnerSettings;
