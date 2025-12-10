import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useEmployeeAuth } from '../../context/EmployeeAuthContext';
import {
  Inbox,
  Phone,
  Mail,
  Building2,
  CircleDot,
  Clock,
  CheckCircle2,
  XCircle,
  Filter,
  UserPlus,
  ArrowUpRight,
  Package
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const EmployeeInbox = () => {
  const { authFetch } = useEmployeeAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [callbacks, setCallbacks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || '');

  useEffect(() => {
    fetchCallbacks();
  }, [statusFilter]);

  const fetchCallbacks = async () => {
    try {
      const url = statusFilter
        ? `${API_URL}/api/employee/callbacks?status=${statusFilter}`
        : `${API_URL}/api/employee/callbacks`;
      const response = await authFetch(url);
      if (response.ok) {
        const data = await response.json();
        setCallbacks(data.callbacks);
      }
    } catch (error) {
      console.error('Failed to fetch callbacks:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = (status) => {
    setStatusFilter(status);
    if (status) {
      setSearchParams({ status });
    } else {
      setSearchParams({});
    }
  };

  const handleConvertCallback = async (callbackId) => {
    try {
      const response = await authFetch(`${API_URL}/api/employee/callbacks/${callbackId}/convert`, {
        method: 'POST'
      });
      if (response.ok) {
        const data = await response.json();
        navigate(`/employee/clients/${data.client_id}`);
      }
    } catch (error) {
      console.error('Failed to convert callback:', error);
    }
  };

  const handleAssignCallback = async (callbackId) => {
    try {
      const response = await authFetch(`${API_URL}/api/employee/callbacks/${callbackId}/assign`, {
        method: 'PUT'
      });
      if (response.ok) {
        fetchCallbacks();
      }
    } catch (error) {
      console.error('Failed to assign callback:', error);
    }
  };

  const handleUpdateStatus = async (callbackId, newStatus) => {
    try {
      const response = await authFetch(`${API_URL}/api/employee/callbacks/${callbackId}/status?status=${newStatus}`, {
        method: 'PUT'
      });
      if (response.ok) {
        fetchCallbacks();
      }
    } catch (error) {
      console.error('Failed to update status:', error);
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      new: { bg: 'bg-yellow-100', border: 'border-yellow-200', text: 'text-yellow-700', icon: CircleDot, label: 'Новая' },
      processing: { bg: 'bg-amber-100', border: 'border-amber-200', text: 'text-amber-700', icon: Clock, label: 'В работе' },
      completed: { bg: 'bg-emerald-100', border: 'border-emerald-200', text: 'text-emerald-700', icon: CheckCircle2, label: 'Завершена' },
      cancelled: { bg: 'bg-gray-100', border: 'border-gray-200', text: 'text-gray-600', icon: XCircle, label: 'Отменена' }
    };
    const style = styles[status] || styles.new;
    const Icon = style.icon;

    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium ${style.bg} ${style.border} ${style.text} border`}>
        <Icon className="w-3.5 h-3.5" />
        {style.label}
      </span>
    );
  };

  const getSourceLabel = (source) => {
    const labels = {
      check_page: 'Проверка товара',
      quote_page: 'Запрос КП',
      contact_form: 'Контактная форма',
      unknown: 'Другое'
    };
    return labels[source] || source || 'Другое';
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleString('ru-RU', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const statusOptions = [
    { value: '', label: 'Все заявки' },
    { value: 'new', label: 'Новые' },
    { value: 'processing', label: 'В работе' },
    { value: 'completed', label: 'Завершённые' },
    { value: 'cancelled', label: 'Отменённые' }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-gray-200 border-t-yellow-500"></div>
          <p className="text-gray-500 text-sm">Загрузка заявок...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Входящие заявки</h1>
          <p className="text-gray-500 mt-1">Заявки с сайта на обратный звонок</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <Filter className="w-4 h-4 text-gray-400" />
        {statusOptions.map((option) => (
          <button
            key={option.value}
            onClick={() => handleStatusChange(option.value)}
            className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
              statusFilter === option.value
                ? 'bg-yellow-100 text-yellow-700 border border-yellow-300'
                : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>

      {/* Callbacks List */}
      {callbacks.length > 0 ? (
        <div className="space-y-3">
          {callbacks.map((callback) => (
            <div
              key={callback.id}
              className="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-md transition-all"
            >
              <div className="flex items-start justify-between gap-4 mb-4">
                <div className="flex items-center gap-3">
                  {getStatusBadge(callback.status)}
                  <span className="text-sm text-gray-500">{getSourceLabel(callback.source)}</span>
                  <span className="text-sm text-gray-400">{formatDate(callback.created_at)}</span>
                </div>
                <span className="text-sm text-gray-400">#{callback.id}</span>
              </div>

              <div className="grid md:grid-cols-2 gap-4 mb-4">
                <div>
                  <div className="text-lg font-medium text-gray-900 mb-2">{callback.contact_name}</div>
                  <div className="space-y-1.5 text-sm">
                    <div className="flex items-center gap-2 text-gray-600">
                      <Phone className="w-4 h-4 text-gray-400" />
                      <a href={`tel:${callback.contact_phone}`} className="hover:text-yellow-600 transition-colors">
                        {callback.contact_phone}
                      </a>
                    </div>
                    {callback.contact_email && (
                      <div className="flex items-center gap-2 text-gray-600">
                        <Mail className="w-4 h-4 text-gray-400" />
                        <a href={`mailto:${callback.contact_email}`} className="hover:text-yellow-600 transition-colors">
                          {callback.contact_email}
                        </a>
                      </div>
                    )}
                    {callback.company_name && (
                      <div className="flex items-center gap-2 text-gray-600">
                        <Building2 className="w-4 h-4 text-gray-400" />
                        <span>{callback.company_name}</span>
                        {callback.company_inn && <span className="text-gray-400">ИНН: {callback.company_inn}</span>}
                      </div>
                    )}
                  </div>
                </div>

                {callback.products && callback.products.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 text-gray-500 text-sm mb-2">
                      <Package className="w-4 h-4" />
                      Товары ({callback.products.length})
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {callback.products.slice(0, 3).map((product, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-1 bg-gray-100 border border-gray-200 rounded text-xs text-gray-700"
                        >
                          {product.name || product.subcategory_name || 'Товар'}
                        </span>
                      ))}
                      {callback.products.length > 3 && (
                        <span className="px-2 py-1 text-xs text-gray-400">
                          +{callback.products.length - 3}
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {callback.comment && (
                <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-600">{callback.comment}</p>
                </div>
              )}

              <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                <div className="flex items-center gap-2">
                  {callback.status === 'new' && (
                    <button
                      onClick={() => handleAssignCallback(callback.id)}
                      className="px-3 py-1.5 text-sm font-medium text-yellow-700 hover:text-yellow-800 bg-yellow-100 hover:bg-yellow-200 border border-yellow-200 rounded-lg transition-colors"
                    >
                      Взять в работу
                    </button>
                  )}
                  {callback.status === 'processing' && (
                    <>
                      <button
                        onClick={() => handleUpdateStatus(callback.id, 'completed')}
                        className="px-3 py-1.5 text-sm font-medium text-emerald-700 hover:text-emerald-800 bg-emerald-100 hover:bg-emerald-200 border border-emerald-200 rounded-lg transition-colors"
                      >
                        Завершить
                      </button>
                      <button
                        onClick={() => handleUpdateStatus(callback.id, 'cancelled')}
                        className="px-3 py-1.5 text-sm font-medium text-gray-600 hover:text-gray-700 bg-gray-100 hover:bg-gray-200 border border-gray-200 rounded-lg transition-colors"
                      >
                        Отменить
                      </button>
                    </>
                  )}
                </div>

                {(callback.status === 'new' || callback.status === 'processing') && !callback.client_id && (
                  <button
                    onClick={() => handleConvertCallback(callback.id)}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-900 bg-yellow-500 hover:bg-yellow-600 rounded-lg transition-colors"
                  >
                    <UserPlus className="w-4 h-4" />
                    Создать клиента
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </button>
                )}

                {callback.client_id && (
                  <button
                    onClick={() => navigate(`/employee/clients/${callback.client_id}`)}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                  >
                    Открыть клиента
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
          <Inbox className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-700 mb-2">Нет заявок</h3>
          <p className="text-gray-500">
            {statusFilter ? 'Нет заявок с выбранным статусом' : 'Входящих заявок пока нет'}
          </p>
        </div>
      )}
    </div>
  );
};

export default EmployeeInbox;
