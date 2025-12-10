import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useEmployeeAuth } from '../../context/EmployeeAuthContext';
import {
  ArrowLeft,
  User,
  Building2,
  Phone,
  Mail,
  MapPin,
  FileText,
  Save,
  Loader2,
  Search
} from 'lucide-react';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const EmployeeClientNew = () => {
  const navigate = useNavigate();
  const { authFetch } = useEmployeeAuth();

  const [loading, setLoading] = useState(false);
  const [innLoading, setInnLoading] = useState(false);
  const [formData, setFormData] = useState({
    contact_name: '',
    contact_phone: '',
    contact_email: '',
    contact_position: '',
    company_name: '',
    company_type: 'LEGAL',
    inn: '',
    kpp: '',
    ogrn: '',
    address: '',
    comment: '',
    source: 'manual',
    status: 'lead'
  });

  const handleChange = (field, value) => {
    setFormData({ ...formData, [field]: value });
  };

  const handleInnLookup = async () => {
    if (!formData.inn || formData.inn.length < 10) {
      toast.error('Введите корректный ИНН (10 или 12 цифр)');
      return;
    }

    setInnLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/company/suggest`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inn: formData.inn })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.suggestions && data.suggestions.length > 0) {
          const company = data.suggestions[0].data;
          setFormData({
            ...formData,
            company_name: company.name?.short_with_opf || company.name?.full_with_opf || '',
            kpp: company.kpp || '',
            ogrn: company.ogrn || '',
            address: company.address?.unrestricted_value || '',
            company_type: company.type === 'INDIVIDUAL' ? 'INDIVIDUAL' : 'LEGAL',
            contact_name: formData.contact_name || company.management?.name || ''
          });
          toast.success('Данные компании загружены');
        } else {
          toast.info('Компания не найдена по ИНН');
        }
      }
    } catch (error) {
      console.error('INN lookup failed:', error);
      toast.error('Ошибка поиска по ИНН');
    } finally {
      setInnLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.contact_name || !formData.contact_phone) {
      toast.error('Заполните обязательные поля');
      return;
    }

    setLoading(true);
    try {
      const response = await authFetch(`${API_URL}/api/employee/clients`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        const data = await response.json();
        toast.success('Клиент создан');
        navigate(`/employee/clients/${data.client_id}`);
      } else {
        const error = await response.json();
        toast.error(error.detail || 'Ошибка создания клиента');
      }
    } catch (error) {
      console.error('Failed to create client:', error);
      toast.error('Ошибка создания клиента');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => navigate('/employee/clients')}
          className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Новый клиент</h1>
          <p className="text-gray-500 mt-1">Создание карточки клиента</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Contact Info */}
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <User className="w-5 h-5 text-gray-400" />
            <h2 className="text-lg font-medium text-gray-900">Контактная информация</h2>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-600 mb-1.5">
                Имя контакта <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.contact_name}
                onChange={(e) => handleChange('contact_name', e.target.value)}
                placeholder="Иван Иванов"
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:border-yellow-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1.5">Должность</label>
              <input
                type="text"
                value={formData.contact_position}
                onChange={(e) => handleChange('contact_position', e.target.value)}
                placeholder="Директор"
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:border-yellow-500"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1.5">
                Телефон <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="tel"
                  value={formData.contact_phone}
                  onChange={(e) => handleChange('contact_phone', e.target.value)}
                  placeholder="+7 999 123-45-67"
                  className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:border-yellow-500"
                  required
                />
              </div>
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1.5">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="email"
                  value={formData.contact_email}
                  onChange={(e) => handleChange('contact_email', e.target.value)}
                  placeholder="ivan@company.ru"
                  className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:border-yellow-500"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Company Info */}
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Building2 className="w-5 h-5 text-gray-400" />
            <h2 className="text-lg font-medium text-gray-900">Данные компании</h2>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            {/* INN with lookup */}
            <div>
              <label className="block text-sm text-gray-600 mb-1.5">ИНН</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={formData.inn}
                  onChange={(e) => handleChange('inn', e.target.value.replace(/\D/g, ''))}
                  placeholder="7712345678"
                  maxLength={12}
                  className="flex-1 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:border-yellow-500"
                />
                <button
                  type="button"
                  onClick={handleInnLookup}
                  disabled={innLoading}
                  className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-xl transition-colors disabled:opacity-50"
                >
                  {innLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Search className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm text-gray-600 mb-1.5">Тип</label>
              <select
                value={formData.company_type}
                onChange={(e) => handleChange('company_type', e.target.value)}
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:border-yellow-500"
              >
                <option value="LEGAL">Юридическое лицо</option>
                <option value="INDIVIDUAL">ИП</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm text-gray-600 mb-1.5">Название компании</label>
              <input
                type="text"
                value={formData.company_name}
                onChange={(e) => handleChange('company_name', e.target.value)}
                placeholder="ООО «Компания»"
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:border-yellow-500"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-600 mb-1.5">КПП</label>
              <input
                type="text"
                value={formData.kpp}
                onChange={(e) => handleChange('kpp', e.target.value.replace(/\D/g, ''))}
                placeholder="771201001"
                maxLength={9}
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:border-yellow-500"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-600 mb-1.5">ОГРН</label>
              <input
                type="text"
                value={formData.ogrn}
                onChange={(e) => handleChange('ogrn', e.target.value.replace(/\D/g, ''))}
                placeholder="1177746123456"
                maxLength={15}
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:border-yellow-500"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm text-gray-600 mb-1.5">Адрес</label>
              <div className="relative">
                <MapPin className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => handleChange('address', e.target.value)}
                  placeholder="г. Москва, ул. Примерная, д. 1"
                  className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:border-yellow-500"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Additional Info */}
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <FileText className="w-5 h-5 text-gray-400" />
            <h2 className="text-lg font-medium text-gray-900">Дополнительно</h2>
          </div>

          <div>
            <label className="block text-sm text-gray-600 mb-1.5">Комментарий</label>
            <textarea
              value={formData.comment}
              onChange={(e) => handleChange('comment', e.target.value)}
              placeholder="Любые заметки о клиенте..."
              rows={4}
              className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:border-yellow-500 resize-none"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-4">
          <button
            type="button"
            onClick={() => navigate('/employee/clients')}
            className="px-6 py-2.5 text-gray-500 hover:text-gray-700 transition-colors"
          >
            Отмена
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex items-center gap-2 px-6 py-2.5 bg-yellow-500 hover:bg-yellow-600 text-gray-900 font-medium rounded-xl transition-colors disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Сохранение...
              </>
            ) : (
              <>
                <Save className="w-5 h-5" />
                Создать клиента
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default EmployeeClientNew;
