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
  TrendingUp
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
      new: { bg: 'bg-yellow-500/10', border: 'border-yellow-500/20', text: 'text-yellow-400', icon: CircleDot, label: 'Новая' },
      processing: { bg: 'bg-amber-500/10', border: 'border-amber-500/20', text: 'text-amber-400', icon: Clock, label: 'В работе' },
      completed: { bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', text: 'text-emerald-400', icon: CheckCircle2, label: 'Завершена' },
      cancelled: { bg: 'bg-slate-500/10', border: 'border-slate-500/20', text: 'text-slate-400', icon: XCircle, label: 'Отменена' }
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
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-slate-700 border-t-yellow-500"></div>
          <p className="text-slate-500 text-sm">Загрузка данных...</p>
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
    }
  ];

  const colorStyles = {
    yellow: 'from-yellow-500/20 to-yellow-600/5 border-yellow-500/20 text-yellow-400',
    amber: 'from-amber-500/20 to-amber-600/5 border-amber-500/20 text-amber-400',
    emerald: 'from-emerald-500/20 to-emerald-600/5 border-emerald-500/20 text-emerald-400',
    purple: 'from-purple-500/20 to-purple-600/5 border-purple-500/20 text-purple-400'
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-white">Панель менеджера</h1>
          <p className="text-slate-500 mt-1">Обзор заявок и клиентов</p>
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
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Link
              key={index}
              to={stat.link}
              className={`group relative overflow-hidden rounded-xl border bg-gradient-to-br ${colorStyles[stat.color]} p-5 transition-all hover:scale-[1.02]`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-slate-400 text-sm">{stat.label}</p>
                  <p className="text-3xl font-semibold text-white mt-1">{stat.value}</p>
                </div>
                <div className={`p-2 rounded-lg bg-slate-900/50 ${colorStyles[stat.color].split(' ').pop()}`}>
                  <Icon className="w-5 h-5" strokeWidth={1.5} />
                </div>
              </div>
              <ArrowRight className="absolute bottom-4 right-4 w-4 h-4 text-slate-600 group-hover:text-slate-400 group-hover:translate-x-1 transition-all" />
            </Link>
          );
        })}
      </div>

      {/* Recent Callbacks */}
      <div className="bg-slate-900/50 border border-slate-800/50 rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800/50">
          <h2 className="text-lg font-medium text-white">Последние заявки</h2>
          <Link
            to="/employee/inbox"
            className="text-sm text-yellow-400 hover:text-yellow-300 transition-colors"
          >
            Все заявки
          </Link>
        </div>

        {stats?.recent_callbacks?.length > 0 ? (
          <div className="divide-y divide-slate-800/50">
            {stats.recent_callbacks.map((callback) => (
              <div key={callback.id} className="px-5 py-4 hover:bg-slate-800/30 transition-colors">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      {getStatusBadge(callback.status)}
                      <span className="text-xs text-slate-500">
                        {getSourceLabel(callback.source)}
                      </span>
                      <span className="text-xs text-slate-600">
                        {formatDate(callback.created_at)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-white font-medium">{callback.contact_name}</span>
                      {callback.company_name && (
                        <span className="text-slate-500 text-sm flex items-center gap-1">
                          <Building2 className="w-3.5 h-3.5" />
                          {callback.company_name}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-slate-400">
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
                        className="px-3 py-1.5 text-xs font-medium text-yellow-400 hover:text-yellow-300 bg-yellow-500/10 hover:bg-yellow-500/20 border border-yellow-500/20 rounded-lg transition-colors"
                      >
                        Взять в работу
                      </button>
                    )}
                    {(callback.status === 'new' || callback.status === 'processing') && (
                      <button
                        onClick={() => handleConvertCallback(callback.id)}
                        className="px-3 py-1.5 text-xs font-medium text-emerald-400 hover:text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 rounded-lg transition-colors"
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
            <Inbox className="w-12 h-12 text-slate-700 mx-auto mb-3" />
            <p className="text-slate-500">Нет заявок</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default EmployeeDashboard;
