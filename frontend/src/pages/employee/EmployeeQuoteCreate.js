import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useEmployeeAuth } from '../../context/EmployeeAuthContext';
import {
  ArrowLeft,
  Plus,
  Trash2,
  FileText,
  Building2,
  Calculator,
  Send,
  Package
} from 'lucide-react';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

// Прайс-лист услуг маркировки
const SERVICE_CATALOG = [
  { id: 1, name: 'Регистрация в системе Честный ЗНАК', price: 5000, unit: 'шт' },
  { id: 2, name: 'Получение УКЭП (электронная подпись)', price: 3500, unit: 'шт' },
  { id: 3, name: 'Настройка ЭДО', price: 3000, unit: 'шт' },
  { id: 4, name: 'Маркировка товара (до 100 ед.)', price: 15000, unit: 'партия' },
  { id: 5, name: 'Маркировка товара (100-500 ед.)', price: 25000, unit: 'партия' },
  { id: 6, name: 'Маркировка товара (500-1000 ед.)', price: 40000, unit: 'партия' },
  { id: 7, name: 'Маркировка товара (от 1000 ед.)', price: 60000, unit: 'партия' },
  { id: 8, name: 'Описание товаров в каталоге ГС1', price: 500, unit: 'товар' },
  { id: 9, name: 'Консультация по маркировке', price: 2000, unit: 'час' },
  { id: 10, name: 'Обучение работе с Честный ЗНАК', price: 5000, unit: 'сессия' },
  { id: 11, name: 'Интеграция с 1С', price: 15000, unit: 'шт' },
  { id: 12, name: 'Подготовка документов для импорта', price: 10000, unit: 'комплект' },
];

const EmployeeQuoteCreate = () => {
  const { id: clientId } = useParams();
  const navigate = useNavigate();
  const { authFetch } = useEmployeeAuth();

  const [client, setClient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [services, setServices] = useState([]);
  const [showCatalog, setShowCatalog] = useState(false);

  useEffect(() => {
    fetchClient();
  }, [clientId]);

  const fetchClient = async () => {
    try {
      const response = await authFetch(`${API_URL}/api/employee/clients/${clientId}`);
      if (response.ok) {
        const data = await response.json();
        setClient(data);
      } else {
        toast.error('Клиент не найден');
        navigate('/employee/clients');
      }
    } catch (error) {
      console.error('Failed to fetch client:', error);
      toast.error('Ошибка загрузки');
    } finally {
      setLoading(false);
    }
  };

  const addService = (service) => {
    const existing = services.find(s => s.id === service.id);
    if (existing) {
      setServices(services.map(s =>
        s.id === service.id ? { ...s, quantity: s.quantity + 1 } : s
      ));
    } else {
      setServices([...services, { ...service, quantity: 1 }]);
    }
    setShowCatalog(false);
  };

  const addCustomService = () => {
    const newService = {
      id: `custom_${Date.now()}`,
      name: '',
      price: 0,
      quantity: 1,
      unit: 'шт',
      isCustom: true
    };
    setServices([...services, newService]);
  };

  const updateService = (id, field, value) => {
    setServices(services.map(s =>
      s.id === id ? { ...s, [field]: value } : s
    ));
  };

  const removeService = (id) => {
    setServices(services.filter(s => s.id !== id));
  };

  const totalAmount = services.reduce((sum, s) => sum + (s.price * s.quantity), 0);

  const handleSubmit = async () => {
    if (services.length === 0) {
      toast.error('Добавьте хотя бы одну услугу');
      return;
    }

    const emptyService = services.find(s => !s.name || s.price <= 0);
    if (emptyService) {
      toast.error('Заполните все поля услуг');
      return;
    }

    setSubmitting(true);
    try {
      const response = await authFetch(`${API_URL}/api/employee/clients/${clientId}/quote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(services.map(s => ({
          name: s.name,
          price: s.price,
          quantity: s.quantity,
          unit: s.unit
        })))
      });

      if (response.ok) {
        const data = await response.json();
        toast.success(`КП ${data.quote_number} создано`);
        navigate(`/employee/clients/${clientId}`);
      } else {
        const error = await response.json();
        toast.error(error.detail || 'Ошибка создания КП');
      }
    } catch (error) {
      console.error('Failed to create quote:', error);
      toast.error('Ошибка создания КП');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-gray-200 border-t-yellow-500"></div>
          <p className="text-gray-500 text-sm">Загрузка...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(`/employee/clients/${clientId}`)}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Создание КП</h1>
            <p className="text-gray-500 mt-1">для {client?.contact_name}</p>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Services */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-medium text-gray-900">Услуги</h2>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowCatalog(!showCatalog)}
                  className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-yellow-700 bg-yellow-100 hover:bg-yellow-200 border border-yellow-200 rounded-lg transition-colors"
                >
                  <Package className="w-4 h-4" />
                  Из каталога
                </button>
                <button
                  onClick={addCustomService}
                  className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 border border-gray-200 rounded-lg transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Своя услуга
                </button>
              </div>
            </div>

            {/* Service Catalog Dropdown */}
            {showCatalog && (
              <div className="mb-4 p-4 bg-gray-50 rounded-xl border border-gray-200 max-h-64 overflow-y-auto">
                <div className="grid gap-2">
                  {SERVICE_CATALOG.map((service) => (
                    <button
                      key={service.id}
                      onClick={() => addService(service)}
                      className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-100 hover:border-yellow-300 hover:bg-yellow-50 transition-colors text-left"
                    >
                      <span className="text-sm text-gray-900">{service.name}</span>
                      <span className="text-sm font-medium text-gray-600">
                        {service.price.toLocaleString()} ₽/{service.unit}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Services List */}
            {services.length > 0 ? (
              <div className="space-y-3">
                {services.map((service, index) => (
                  <div
                    key={service.id}
                    className="p-4 bg-gray-50 rounded-xl border border-gray-200"
                  >
                    <div className="flex items-start gap-4">
                      <div className="flex-1 grid sm:grid-cols-4 gap-3">
                        <div className="sm:col-span-2">
                          <label className="block text-xs text-gray-500 mb-1">Услуга</label>
                          {service.isCustom ? (
                            <input
                              type="text"
                              value={service.name}
                              onChange={(e) => updateService(service.id, 'name', e.target.value)}
                              placeholder="Название услуги"
                              className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:border-yellow-500"
                            />
                          ) : (
                            <div className="text-sm text-gray-900 py-2">{service.name}</div>
                          )}
                        </div>
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">Цена, ₽</label>
                          <input
                            type="number"
                            value={service.price}
                            onChange={(e) => updateService(service.id, 'price', Number(e.target.value))}
                            className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:border-yellow-500"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">Кол-во</label>
                          <input
                            type="number"
                            min="1"
                            value={service.quantity}
                            onChange={(e) => updateService(service.id, 'quantity', Number(e.target.value))}
                            className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:border-yellow-500"
                          />
                        </div>
                      </div>
                      <div className="flex items-center gap-3 pt-6">
                        <div className="text-right min-w-[80px]">
                          <div className="text-sm font-medium text-gray-900">
                            {(service.price * service.quantity).toLocaleString()} ₽
                          </div>
                        </div>
                        <button
                          onClick={() => removeService(service.id)}
                          className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <Package className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">Добавьте услуги из каталога или создайте свою</p>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Client Info */}
          <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <Building2 className="w-4 h-4 text-gray-400" />
              <h3 className="text-sm font-medium text-gray-600">Клиент</h3>
            </div>
            <div className="space-y-2">
              <div className="text-gray-900 font-medium">{client?.contact_name}</div>
              {client?.company_name && (
                <div className="text-sm text-gray-500">{client.company_name}</div>
              )}
              {client?.inn && (
                <div className="text-xs text-gray-400">ИНН: {client.inn}</div>
              )}
            </div>
          </div>

          {/* Total */}
          <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <Calculator className="w-4 h-4 text-gray-400" />
              <h3 className="text-sm font-medium text-gray-600">Итого</h3>
            </div>
            <div className="text-3xl font-bold text-gray-900">
              {totalAmount.toLocaleString()} ₽
            </div>
            <div className="text-sm text-gray-500 mt-1">
              {services.length} {services.length === 1 ? 'услуга' : services.length < 5 ? 'услуги' : 'услуг'}
            </div>
          </div>

          {/* Actions */}
          <button
            onClick={handleSubmit}
            disabled={submitting || services.length === 0}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-yellow-500 hover:bg-yellow-600 disabled:bg-gray-200 disabled:text-gray-400 text-gray-900 font-medium rounded-xl transition-colors"
          >
            {submitting ? (
              <div className="w-5 h-5 border-2 border-gray-400 border-t-gray-900 rounded-full animate-spin" />
            ) : (
              <>
                <FileText className="w-5 h-5" />
                Создать КП
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default EmployeeQuoteCreate;
