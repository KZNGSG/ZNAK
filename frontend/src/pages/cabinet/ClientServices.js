import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'sonner';
import {
  FileCheck,
  Tag,
  Barcode,
  Package,
  Send,
  CheckCircle2,
  ArrowRight
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const ClientServices = () => {
  const { token, user } = useAuth();
  const [selectedService, setSelectedService] = useState(null);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    comment: '',
    quantity: ''
  });
  const [submitted, setSubmitted] = useState(false);

  const services = [
    {
      id: 'marking',
      title: 'Маркировка товаров',
      description: 'Получение кодов маркировки для вашей продукции',
      icon: Tag,
      color: 'from-yellow-400 to-yellow-500',
      features: ['Коды Data Matrix', 'Регистрация в Честном ЗНАКе', 'Интеграция с учётной системой']
    },
    {
      id: 'certificate',
      title: 'Сертификация',
      description: 'Оформление сертификатов и деклараций соответствия',
      icon: FileCheck,
      color: 'from-green-400 to-green-500',
      features: ['Сертификаты ГОСТ Р', 'Декларации соответствия', 'Технические регламенты']
    },
    {
      id: 'barcode',
      title: 'Штрихкоды EAN',
      description: 'Получение штрихкодов для торговых сетей',
      icon: Barcode,
      color: 'from-blue-400 to-blue-500',
      features: ['EAN-13 штрихкоды', 'Регистрация в GS1', 'Штрихкоды для маркетплейсов']
    },
    {
      id: 'consulting',
      title: 'Консультация',
      description: 'Ответы на вопросы по маркировке и сертификации',
      icon: Package,
      color: 'from-purple-400 to-purple-500',
      features: ['Бесплатная консультация', 'Аудит готовности', 'Рекомендации по внедрению']
    }
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!selectedService) {
      toast.error('Выберите услугу');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/callbacks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: user?.email?.split('@')[0] || 'Клиент',
          phone: user?.phone || '',
          email: user?.email || '',
          source: 'cabinet_services',
          service_type: selectedService,
          comment: formData.comment,
          quantity: formData.quantity
        })
      });

      if (response.ok) {
        setSubmitted(true);
        toast.success('Заявка успешно отправлена!');
      } else {
        throw new Error('Ошибка отправки');
      }
    } catch (error) {
      console.error('Failed to submit:', error);
      toast.error('Не удалось отправить заявку');
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="max-w-lg mx-auto text-center py-12">
        <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
          <CheckCircle2 className="w-10 h-10 text-green-500" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-3">Заявка отправлена!</h2>
        <p className="text-gray-500 mb-6">
          Наш менеджер свяжется с вами в ближайшее время для уточнения деталей.
        </p>
        <button
          onClick={() => {
            setSubmitted(false);
            setSelectedService(null);
            setFormData({ comment: '', quantity: '' });
          }}
          className="px-6 py-3 bg-yellow-500 text-gray-900 font-medium rounded-xl hover:bg-yellow-400 transition-colors"
        >
          Заказать ещё услугу
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Заказать услуги</h1>
        <p className="text-gray-500 mt-1">Выберите необходимую услугу и оставьте заявку</p>
      </div>

      {/* Services Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {services.map((service) => {
          const Icon = service.icon;
          const isSelected = selectedService === service.id;

          return (
            <button
              key={service.id}
              onClick={() => setSelectedService(service.id)}
              className={`text-left p-5 rounded-xl border-2 transition-all duration-200 ${
                isSelected
                  ? 'border-yellow-500 bg-yellow-50 shadow-lg'
                  : 'border-gray-200 bg-white hover:border-yellow-400 hover:shadow-md'
              }`}
            >
              <div className="flex items-start gap-4">
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${service.color} flex items-center justify-center flex-shrink-0`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 mb-1">{service.title}</h3>
                  <p className="text-sm text-gray-500 mb-3">{service.description}</p>
                  <ul className="space-y-1">
                    {service.features.map((feature, idx) => (
                      <li key={idx} className="flex items-center gap-2 text-xs text-gray-600">
                        <CheckCircle2 className="w-3 h-3 text-green-500" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>
                {isSelected && (
                  <div className="w-6 h-6 rounded-full bg-yellow-500 flex items-center justify-center">
                    <CheckCircle2 className="w-4 h-4 text-white" />
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Order Form */}
      {selectedService && (
        <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          <h3 className="font-semibold text-gray-900">Детали заказа</h3>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Количество товаров (если применимо)
            </label>
            <input
              type="text"
              value={formData.quantity}
              onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
              placeholder="Например: 1000 единиц"
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Комментарий к заявке
            </label>
            <textarea
              value={formData.comment}
              onChange={(e) => setFormData({ ...formData, comment: e.target.value })}
              placeholder="Опишите вашу задачу или вопрос..."
              rows={4}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500 resize-none"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-yellow-500 text-gray-900 font-medium rounded-xl hover:bg-yellow-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? (
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-gray-900"></div>
            ) : (
              <>
                <Send className="w-5 h-5" />
                Отправить заявку
              </>
            )}
          </button>
        </form>
      )}

      {/* Contact Info */}
      <div className="bg-gray-50 rounded-xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <p className="text-gray-900 font-medium">Нужна срочная консультация?</p>
          <p className="text-sm text-gray-500">Позвоните нам или напишите в мессенджер</p>
        </div>
        <a
          href="tel:+78001234567"
          className="flex items-center gap-2 px-5 py-2.5 bg-white border border-gray-200 rounded-xl hover:border-yellow-400 transition-colors text-gray-900 font-medium"
        >
          Позвонить
          <ArrowRight className="w-4 h-4" />
        </a>
      </div>
    </div>
  );
};

export default ClientServices;
