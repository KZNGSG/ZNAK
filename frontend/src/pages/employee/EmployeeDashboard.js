import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useEmployeeAuth } from '../../context/EmployeeAuthContext';
import {
  Inbox,
  Users,
  Clock,
  UserPlus,
  ArrowRight,
  Phone,
  Mail,
  Building2,
  CircleDot,
  CheckCircle2,
  XCircle,
  TrendingUp,
  FileText,
  ScrollText
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const EmployeeDashboard = () => {
  const { authFetch } = useEmployeeAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await authFetch(`${API_URL}/api/employee/stats`);
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    } finally {
      setLoading(false);
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
        fetchStats(); // Refresh data
      }
    } catch (error) {
      console.error('Failed to assign callback:', error);
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
      <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium ${style.bg} ${style.border} ${style.text} border`}>
        <Icon className="w-3 h-3" />
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
    const now = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 60) return `${minutes} мин назад`;
    if (hours < 24) return `${hours} ч назад`;
    if (days < 7) return `${days} дн назад`;
    return date.toLocaleDateString('ru-RU');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-gray-200 border-t-yellow-500"></div>
          <p className="text-gray-500 text-sm">Загрузка данных...</p>
        </div>
      </div>
    );
  }

  const statCards = [
    {
      label: 'Новые заявки',
      value: stats?.new_callbacks || 0,
      icon: Inbox,
      color: 'yellow',
      link: '/employee/inbox?status=new'
    },
    {
      label: 'В работе',
      value: stats?.processing_callbacks || 0,
      icon: Clock,
      color: 'amber',
      link: '/employee/inbox?status=processing'
    },
    {
      label: 'Всего клиентов',
      value: stats?.clients?.total || 0,
      icon: Users,
      color: 'emerald',
      link: '/employee/clients'
    },
    {
      label: 'Активных лидов',
      value: stats?.clients?.leads || 0,
      icon: TrendingUp,
      color: 'purple',
      link: '/employee/clients?status=lead'
    },
    {
      label: 'Коммерческих предложений',
      value: stats?.quotes?.total || 0,
      icon: FileText,
      color: 'blue',
      link: '/employee/quotes'
    },
    {
      label: 'Договоров',
      value: stats?.contracts?.total || 0,
      icon: ScrollText,
      color: 'indigo',
      link: '/employee/contracts'
    }
  ];

  const colorStyles = {
    yellow: 'bg-yellow-50 border-yellow-200 text-yellow-600',
    amber: 'bg-amber-50 border-amber-200 text-amber-600',
    emerald: 'bg-emerald-50 border-emerald-200 text-emerald-600',
    purple: 'bg-purple-50 border-purple-200 text-purple-600',
    blue: 'bg-blue-50 border-blue-200 text-blue-600',
    indigo: 'bg-indigo-50 border-indigo-200 text-indigo-600'
  };

  const iconBgStyles = {
    yellow: 'bg-yellow-100 text-yellow-600',
    amber: 'bg-amber-100 text-amber-600',
    emerald: 'bg-emerald-100 text-emerald-600',
    purple: 'bg-purple-100 text-purple-600',
    blue: 'bg-blue-100 text-blue-600',
    indigo: 'bg-indigo-100 text-indigo-600'
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Панель менеджера</h1>
          <p className="text-gray-500 mt-1">Обзор заявок и клиентов</p>
        </div>
        <Link
          to="/employee/clients/new"
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-yellow-500 hover:bg-yellow-600 text-gray-900 text-sm font-medium rounded-xl transition-colors"
        >
          <UserPlus className="w-4 h-4" />
          Новый клиент
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {statCards.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Link
              key={index}
              to={stat.link}
              className={`group relative overflow-hidden rounded-xl border ${colorStyles[stat.color]} p-5 transition-all hover:shadow-md`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-gray-600 text-sm">{stat.label}</p>
                  <p className="text-3xl font-semibold text-gray-900 mt-1">{stat.value}</p>
                </div>
                <div className={`p-2 rounded-lg ${iconBgStyles[stat.color]}`}>
                  <Icon className="w-5 h-5" strokeWidth={1.5} />
                </div>
              </div>
              <ArrowRight className="absolute bottom-4 right-4 w-4 h-4 text-gray-300 group-hover:text-gray-500 group-hover:translate-x-1 transition-all" />
            </Link>
          );
        })}
      </div>

      {/* Recent Callbacks */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">Последние заявки</h2>
          <Link
            to="/employee/inbox"
            className="text-sm text-yellow-600 hover:text-yellow-700 transition-colors"
          >
            Все заявки
          </Link>
        </div>

        {stats?.recent_callbacks?.length > 0 ? (
          <div className="divide-y divide-gray-100">
            {stats.recent_callbacks.map((callback) => (
              <div key={callback.id} className="px-5 py-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      {getStatusBadge(callback.status)}
                      <span className="text-xs text-gray-500">
                        {getSourceLabel(callback.source)}
                      </span>
                      <span className="text-xs text-gray-400">
                        {formatDate(callback.created_at)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-gray-900 font-medium">{callback.contact_name}</span>
                      {callback.company_name && (
                        <span className="text-gray-500 text-sm flex items-center gap-1">
                          <Building2 className="w-3.5 h-3.5" />
                          {callback.company_name}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <span className="flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5" />
                        {callback.contact_phone}
                      </span>
                      {callback.contact_email && (
                        <span className="flex items-center gap-1.5">
                          <Mail className="w-3.5 h-3.5" />
                          {callback.contact_email}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {callback.status === 'new' && (
                      <button
                        onClick={() => handleAssignCallback(callback.id)}
                        className="px-3 py-1.5 text-xs font-medium text-yellow-700 hover:text-yellow-800 bg-yellow-100 hover:bg-yellow-200 border border-yellow-200 rounded-lg transition-colors"
                      >
                        Взять в работу
                      </button>
                    )}
                    {(callback.status === 'new' || callback.status === 'processing') && (
                      <button
                        onClick={() => handleConvertCallback(callback.id)}
                        className="px-3 py-1.5 text-xs font-medium text-emerald-700 hover:text-emerald-800 bg-emerald-100 hover:bg-emerald-200 border border-emerald-200 rounded-lg transition-colors"
                      >
                        Создать клиента
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="px-5 py-12 text-center">
            <Inbox className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">Нет заявок</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default EmployeeDashboard;
