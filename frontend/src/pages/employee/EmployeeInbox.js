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
  Package,
  AlertTriangle,
  User,
  ChevronDown
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const EmployeeInbox = () => {
  const { authFetch, isSuperAdmin, user } = useEmployeeAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [callbacks, setCallbacks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || '');
  const [showOverdue, setShowOverdue] = useState(searchParams.get('overdue') === 'true');
  const [managers, setManagers] = useState([]);
  const [assigningId, setAssigningId] = useState(null);

  useEffect(() => {
    fetchCallbacks();
    if (isSuperAdmin) {
      fetchManagers();
    }
  }, [statusFilter, showOverdue, isSuperAdmin]);

  const fetchCallbacks = async () => {
    try {
      let url;
      if (showOverdue) {
        url = `${API_URL}/api/employee/callbacks/overdue`;
      } else {
        url = statusFilter
          ? `${API_URL}/api/employee/callbacks?status=${statusFilter}`
          : `${API_URL}/api/employee/callbacks`;
      }
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

  const fetchManagers = async () => {
    try {
      const response = await authFetch(`${API_URL}/api/employee/managers`);
      if (response.ok) {
        const data = await response.json();
        setManagers(data.managers || []);
      }
    } catch (error) {
      console.error('Failed to fetch managers:', error);
    }
  };

  const handleStatusChange = (status) => {
    setShowOverdue(false);
    setStatusFilter(status);
    if (status) {
      setSearchParams({ status });
    } else {
      setSearchParams({});
    }
  };

  const handleShowOverdue = () => {
    setStatusFilter('');
    setShowOverdue(true);
    setSearchParams({ overdue: 'true' });
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

  const handleAssignToManager = async (callbackId, managerId) => {
    try {
      const response = await authFetch(`${API_URL}/api/superadmin/callbacks/${callbackId}/assign`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ manager_id: managerId })
      });
      if (response.ok) {
        setAssigningId(null);
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

  const isOverdue = (callback) => {
    if (!callback.sla_deadline || callback.status === 'completed' || callback.status === 'cancelled') {
      return false;
    }
    return new Date(callback.sla_deadline) < new Date();
  };

  const getStatusBadge = (status, callback) => {
    const overdue = isOverdue(callback);

    const styles = {
      new: { bg: 'bg-yellow-100', border: 'border-yellow-200', text: 'text-yellow-700', icon: CircleDot, label: 'Новая' },
      processing: { bg: 'bg-amber-100', border: 'border-amber-200', text: 'text-amber-700', icon: Clock, label: 'В работе' },
      completed: { bg: 'bg-emerald-100', border: 'border-emerald-200', text: 'text-emerald-700', icon: CheckCircle2, label: 'Завершена' },
      cancelled: { bg: 'bg-gray-100', border: 'border-gray-200', text: 'text-gray-600', icon: XCircle, label: 'Отменена' }
    };
    const style = styles[status] || styles.new;
    const Icon = style.icon;

    return (
      <div className="flex items-center gap-2">
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium ${style.bg} ${style.border} ${style.text} border`}>
          <Icon className="w-3.5 h-3.5" />
          {style.label}
        </span>
        {overdue && (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium bg-red-100 border border-red-200 text-red-700">
            <AlertTriangle className="w-3 h-3" />
            Просрочена
          </span>
        )}
      </div>
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
              statusFilter === option.value && !showOverdue
                ? 'bg-yellow-100 text-yellow-700 border border-yellow-300'
                : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            {option.label}
          </button>
        ))}
        <button
          onClick={handleShowOverdue}
          className={`px-3 py-1.5 text-sm rounded-lg transition-colors flex items-center gap-1.5 ${
            showOverdue
              ? 'bg-red-100 text-red-700 border border-red-300'
              : 'bg-white text-red-600 border border-gray-200 hover:bg-red-50'
          }`}
        >
          <AlertTriangle className="w-3.5 h-3.5" />
          Просроченные
        </button>
      </div>

      {/* Callbacks List */}
      {callbacks.length > 0 ? (
        <div className="space-y-3">
          {callbacks.map((callback) => (
            <div
              key={callback.id}
              className={`bg-white border rounded-xl p-5 hover:shadow-md transition-all ${
                isOverdue(callback) ? 'border-red-200 bg-red-50/30' : 'border-gray-200'
              }`}
            >
              <div className="flex items-start justify-between gap-4 mb-4">
                <div className="flex items-center gap-3 flex-wrap">
                  {getStatusBadge(callback.status, callback)}
                  <span className="text-sm text-gray-500">{getSourceLabel(callback.source)}</span>
                  <span className="text-sm text-gray-400">{formatDate(callback.created_at)}</span>
                </div>
                <div className="flex items-center gap-2">
                  {callback.assigned_email && (
                    <span className="text-xs text-gray-500 flex items-center gap-1">
                      <User className="w-3 h-3" />
                      {callback.assigned_email.split('@')[0]}
                    </span>
                  )}
                  <span className="text-sm text-gray-400">#{callback.id}</span>
                </div>
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
                <div className="flex items-center gap-2 flex-wrap">
                  {callback.status === 'new' && (
                    <>
                      <button
                        onClick={() => handleAssignCallback(callback.id)}
                        className="px-3 py-1.5 text-sm font-medium text-yellow-700 hover:text-yellow-800 bg-yellow-100 hover:bg-yellow-200 border border-yellow-200 rounded-lg transition-colors"
                      >
                        Взять в работу
                      </button>

                      {/* Superadmin: assign to specific manager */}
                      {isSuperAdmin && managers.length > 0 && (
                        <div className="relative">
                          <button
                            onClick={() => setAssigningId(assigningId === callback.id ? null : callback.id)}
                            className="px-3 py-1.5 text-sm font-medium text-blue-700 hover:text-blue-800 bg-blue-100 hover:bg-blue-200 border border-blue-200 rounded-lg transition-colors flex items-center gap-1"
                          >
                            <User className="w-3.5 h-3.5" />
                            Назначить
                            <ChevronDown className="w-3.5 h-3.5" />
                          </button>

                          {assigningId === callback.id && (
                            <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10 py-1 min-w-[200px]">
                              {managers.map((manager) => (
                                <button
                                  key={manager.id}
                                  onClick={() => handleAssignToManager(callback.id, manager.id)}
                                  className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                                >
                                  <User className="w-4 h-4 text-gray-400" />
                                  <span className="truncate">{manager.email}</span>
                                  {manager.role === 'superadmin' && (
                                    <span className="text-xs text-purple-600 bg-purple-100 px-1.5 py-0.5 rounded">SA</span>
                                  )}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </>
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
            {showOverdue ? 'Нет просроченных заявок' : statusFilter ? 'Нет заявок с выбранным статусом' : 'Входящих заявок пока нет'}
          </p>
        </div>
      )}
    </div>
  );
};

export default EmployeeInbox;
