import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useEmployeeAuth } from '../../context/EmployeeAuthContext';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Users,
  FileText,
  FileCheck,
  Inbox,
  ArrowRight,
  Calendar,
  DollarSign,
  Target,
  Activity,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Building2,
  Phone,
  AlertTriangle
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const SuperadminDashboard = () => {
  const { authFetch } = useEmployeeAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('week');

  useEffect(() => {
    fetchStats();
  }, [period]);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const response = await authFetch(`${API_URL}/api/superadmin/stats?period=${period}`);
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

  const formatMoney = (amount) => {
    if (!amount) return '0 ₽';
    return new Intl.NumberFormat('ru-RU').format(amount) + ' ₽';
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
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

  const getStatusBadge = (status, type = 'callback') => {
    const styles = {
      // Callbacks
      new: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'Новая' },
      processing: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'В работе' },
      completed: { bg: 'bg-emerald-100', text: 'text-emerald-700', label: 'Завершена' },
      // Quotes
      created: { bg: 'bg-gray-100', text: 'text-gray-700', label: 'Создано' },
      sent: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Отправлено' },
      accepted: { bg: 'bg-emerald-100', text: 'text-emerald-700', label: 'Принято' },
      rejected: { bg: 'bg-red-100', text: 'text-red-700', label: 'Отклонено' },
      // Contracts
      draft: { bg: 'bg-gray-100', text: 'text-gray-700', label: 'Черновик' },
      signed: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Подписан' },
      active: { bg: 'bg-emerald-100', text: 'text-emerald-700', label: 'Активен' }
    };
    const style = styles[status] || styles.new;
    return (
      <span className={`px-2 py-0.5 rounded text-xs font-medium ${style.bg} ${style.text}`}>
        {style.label}
      </span>
    );
  };

  if (loading && !stats) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-gray-200 border-t-yellow-500"></div>
          <p className="text-gray-500 text-sm">Загрузка аналитики...</p>
        </div>
      </div>
    );
  }

  const periodLabels = {
    day: 'Сегодня',
    week: 'За неделю',
    month: 'За месяц'
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Аналитика</h1>
          <p className="text-gray-500 mt-1">Обзор показателей бизнеса</p>
        </div>

        {/* Period Selector */}
        <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1">
          {['day', 'week', 'month'].map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
                period === p
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {p === 'day' ? 'День' : p === 'week' ? 'Неделя' : 'Месяц'}
            </button>
          ))}
        </div>
      </div>

      {/* Overdue Alert */}
      {stats?.callbacks?.overdue > 0 && (
        <Link
          to="/employee/inbox?overdue=true"
          className="block bg-red-50 border border-red-200 rounded-xl p-4 hover:bg-red-100 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
            <div className="flex-1">
              <div className="text-red-800 font-medium">Просроченные заявки!</div>
              <div className="text-red-600 text-sm">
                {stats.callbacks.overdue} {stats.callbacks.overdue === 1 ? 'заявка' : 'заявок'} требует внимания
              </div>
            </div>
            <ArrowRight className="w-5 h-5 text-red-400" />
          </div>
        </Link>
      )}

      {/* Main KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Заявки */}
        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <Inbox className="w-5 h-5 text-yellow-600" />
            </div>
            <span className="text-xs text-gray-400">{periodLabels[period]}</span>
          </div>
          <div className="text-2xl font-bold text-gray-900">{stats?.callbacks?.period || 0}</div>
          <div className="text-sm text-gray-500 mt-1">Новых заявок</div>
          <div className="flex items-center gap-2 mt-2 text-xs flex-wrap">
            <span className="text-yellow-600 font-medium">{stats?.callbacks?.new || 0} новых</span>
            <span className="text-gray-300">|</span>
            <span className="text-blue-600">{stats?.callbacks?.processing || 0} в работе</span>
            {stats?.callbacks?.overdue > 0 && (
              <>
                <span className="text-gray-300">|</span>
                <span className="text-red-600 font-medium">{stats.callbacks.overdue} просрочено</span>
              </>
            )}
          </div>
        </div>

        {/* Клиенты */}
        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 bg-emerald-100 rounded-lg">
              <Users className="w-5 h-5 text-emerald-600" />
            </div>
            <span className="text-xs text-gray-400">{periodLabels[period]}</span>
          </div>
          <div className="text-2xl font-bold text-gray-900">{stats?.clients?.period || 0}</div>
          <div className="text-sm text-gray-500 mt-1">Новых клиентов</div>
          <div className="flex items-center gap-2 mt-2 text-xs">
            <span className="text-emerald-600 font-medium">{stats?.clients?.total || 0} всего</span>
            <span className="text-gray-300">|</span>
            <span className="text-yellow-600">{stats?.clients?.leads || 0} лидов</span>
          </div>
        </div>

        {/* КП */}
        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <FileText className="w-5 h-5 text-blue-600" />
            </div>
            <span className="text-xs text-gray-400">{periodLabels[period]}</span>
          </div>
          <div className="text-2xl font-bold text-gray-900">{stats?.quotes?.period || 0}</div>
          <div className="text-sm text-gray-500 mt-1">КП создано</div>
          <div className="text-xs text-blue-600 font-medium mt-2">
            {formatMoney(stats?.quotes?.period_amount)}
          </div>
        </div>

        {/* Договоры */}
        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <FileCheck className="w-5 h-5 text-purple-600" />
            </div>
            <span className="text-xs text-gray-400">{periodLabels[period]}</span>
          </div>
          <div className="text-2xl font-bold text-gray-900">{stats?.contracts?.period || 0}</div>
          <div className="text-sm text-gray-500 mt-1">Договоров</div>
          <div className="text-xs text-purple-600 font-medium mt-2">
            {formatMoney(stats?.contracts?.period_amount)}
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Воронка продаж */}
        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Target className="w-5 h-5 text-gray-400" />
            <h3 className="font-medium text-gray-900">Воронка продаж</h3>
          </div>

          <div className="space-y-3">
            {[
              { label: 'Заявки', value: stats?.funnel?.callbacks || 0, color: 'bg-yellow-500', width: '100%' },
              { label: 'Клиенты', value: stats?.funnel?.clients || 0, color: 'bg-emerald-500', width: stats?.funnel?.callbacks ? `${(stats.funnel.clients / stats.funnel.callbacks * 100)}%` : '0%' },
              { label: 'КП', value: stats?.funnel?.quotes || 0, color: 'bg-blue-500', width: stats?.funnel?.callbacks ? `${(stats.funnel.quotes / stats.funnel.callbacks * 100)}%` : '0%' },
              { label: 'Договоры', value: stats?.funnel?.contracts || 0, color: 'bg-purple-500', width: stats?.funnel?.callbacks ? `${(stats.funnel.contracts / stats.funnel.callbacks * 100)}%` : '0%' }
            ].map((item, idx) => (
              <div key={idx}>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="text-gray-600">{item.label}</span>
                  <span className="font-medium text-gray-900">{item.value}</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${item.color} rounded-full transition-all duration-500`}
                    style={{ width: item.width }}
                  />
                </div>
              </div>
            ))}
          </div>

          {stats?.funnel?.callbacks > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-100">
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {((stats.funnel.contracts / stats.funnel.callbacks) * 100).toFixed(1)}%
                </div>
                <div className="text-xs text-gray-500">Конверсия в договор</div>
              </div>
            </div>
          )}
        </div>

        {/* Эффективность менеджеров */}
        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-gray-400" />
              <h3 className="font-medium text-gray-900">Менеджеры</h3>
            </div>
            <Link to="/employee/staff" className="text-xs text-yellow-600 hover:text-yellow-700">
              Все
            </Link>
          </div>

          {stats?.managers?.length > 0 ? (
            <div className="space-y-3">
              {stats.managers.slice(0, 5).map((manager, idx) => (
                <div key={manager.id} className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-medium ${
                    idx === 0 ? 'bg-yellow-100 text-yellow-700' :
                    idx === 1 ? 'bg-gray-100 text-gray-600' :
                    'bg-gray-50 text-gray-500'
                  }`}>
                    {idx + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-gray-900 truncate">{manager.email}</div>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <span>{manager.clients_count} кл.</span>
                      <span className="text-gray-300">•</span>
                      <span>{manager.quotes_count} КП</span>
                      <span className="text-gray-300">•</span>
                      <span className="text-emerald-600 font-medium">{manager.contracts_count} дог.</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-400 text-sm">
              Нет данных
            </div>
          )}
        </div>

        {/* Источники заявок */}
        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="w-5 h-5 text-gray-400" />
            <h3 className="font-medium text-gray-900">Источники заявок</h3>
          </div>

          {stats?.sources?.length > 0 ? (
            <div className="space-y-3">
              {stats.sources.map((source, idx) => {
                const total = stats.sources.reduce((sum, s) => sum + s.count, 0);
                const percent = total > 0 ? (source.count / total * 100).toFixed(0) : 0;
                const colors = ['bg-yellow-500', 'bg-blue-500', 'bg-emerald-500', 'bg-purple-500', 'bg-gray-400'];

                return (
                  <div key={source.source}>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="text-gray-600">{getSourceLabel(source.source)}</span>
                      <span className="text-gray-900 font-medium">{source.count} ({percent}%)</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${colors[idx] || colors[4]} rounded-full`}
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-400 text-sm">
              Нет данных
            </div>
          )}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Последние заявки */}
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <h3 className="font-medium text-gray-900">Последние заявки</h3>
            <Link to="/employee/inbox" className="text-xs text-yellow-600 hover:text-yellow-700 flex items-center gap-1">
              Все <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="divide-y divide-gray-50">
            {stats?.recent?.callbacks?.length > 0 ? stats.recent.callbacks.map((cb) => (
              <div key={cb.id} className="px-5 py-3 hover:bg-gray-50">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-gray-900">{cb.contact_name}</span>
                  {getStatusBadge(cb.status)}
                </div>
                <div className="text-xs text-gray-500">{cb.company_name || getSourceLabel(cb.source)}</div>
              </div>
            )) : (
              <div className="px-5 py-8 text-center text-gray-400 text-sm">Нет заявок</div>
            )}
          </div>
        </div>

        {/* Последние КП */}
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <h3 className="font-medium text-gray-900">Последние КП</h3>
            <Link to="/employee/quotes" className="text-xs text-yellow-600 hover:text-yellow-700 flex items-center gap-1">
              Все <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="divide-y divide-gray-50">
            {stats?.recent?.quotes?.length > 0 ? stats.recent.quotes.map((q) => (
              <div key={q.id} className="px-5 py-3 hover:bg-gray-50">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-gray-900">{q.quote_number}</span>
                  <span className="text-sm text-emerald-600 font-medium">{formatMoney(q.total_amount)}</span>
                </div>
                <div className="text-xs text-gray-500">{q.client_name || 'Без клиента'}</div>
              </div>
            )) : (
              <div className="px-5 py-8 text-center text-gray-400 text-sm">Нет КП</div>
            )}
          </div>
        </div>

        {/* Последние договоры */}
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <h3 className="font-medium text-gray-900">Последние договоры</h3>
            <Link to="/employee/contracts" className="text-xs text-yellow-600 hover:text-yellow-700 flex items-center gap-1">
              Все <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="divide-y divide-gray-50">
            {stats?.recent?.contracts?.length > 0 ? stats.recent.contracts.map((ct) => (
              <div key={ct.id} className="px-5 py-3 hover:bg-gray-50">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-gray-900">{ct.contract_number}</span>
                  <span className="text-sm text-purple-600 font-medium">{formatMoney(ct.total_amount)}</span>
                </div>
                <div className="text-xs text-gray-500">{ct.client_name || 'Без клиента'}</div>
              </div>
            )) : (
              <div className="px-5 py-8 text-center text-gray-400 text-sm">Нет договоров</div>
            )}
          </div>
        </div>
      </div>

      {/* Total Stats */}
      <div className="bg-gradient-to-r from-gray-900 to-gray-800 rounded-xl p-6 text-white">
        <div className="flex items-center gap-2 mb-4">
          <DollarSign className="w-5 h-5 text-yellow-400" />
          <h3 className="font-medium">Общая статистика</h3>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
          <div>
            <div className="text-3xl font-bold">{stats?.callbacks?.total || 0}</div>
            <div className="text-gray-400 text-sm">Всего заявок</div>
          </div>
          <div>
            <div className="text-3xl font-bold">{stats?.clients?.total || 0}</div>
            <div className="text-gray-400 text-sm">Всего клиентов</div>
          </div>
          <div>
            <div className="text-3xl font-bold">{formatMoney(stats?.quotes?.total_amount)}</div>
            <div className="text-gray-400 text-sm">Сумма всех КП</div>
          </div>
          <div>
            <div className="text-3xl font-bold text-yellow-400">{formatMoney(stats?.contracts?.total_amount)}</div>
            <div className="text-gray-400 text-sm">Сумма договоров</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SuperadminDashboard;
