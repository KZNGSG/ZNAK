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
  DollarSign,
  Target,
  Activity,
  Clock,
  AlertTriangle,
  Zap,
  Timer,
  Calendar,
  X
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const SuperadminDashboard = () => {
  const { authFetch } = useEmployeeAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('week');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [customDateFrom, setCustomDateFrom] = useState('');
  const [customDateTo, setCustomDateTo] = useState('');

  useEffect(() => {
    fetchStats();
  }, [period]);

  const fetchStats = async () => {
    setLoading(true);
    try {
      let url = `${API_URL}/api/superadmin/stats?period=${period}`;
      if (period === 'custom' && customDateFrom && customDateTo) {
        url += `&date_from=${customDateFrom}&date_to=${customDateTo}`;
      }
      const response = await authFetch(url);
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

  const handleApplyCustomPeriod = () => {
    if (customDateFrom && customDateTo) {
      setPeriod('custom');
      setShowDatePicker(false);
      fetchStats();
    }
  };

  const formatMoney = (amount) => {
    if (!amount) return '0 ₽';
    if (amount >= 1000000) {
      return (amount / 1000000).toFixed(1) + ' млн ₽';
    }
    if (amount >= 1000) {
      return (amount / 1000).toFixed(0) + ' тыс ₽';
    }
    return new Intl.NumberFormat('ru-RU').format(amount) + ' ₽';
  };

  const formatMoneyFull = (amount) => {
    if (!amount) return '0 ₽';
    return new Intl.NumberFormat('ru-RU').format(amount) + ' ₽';
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

  const getManagerName = (manager) => {
    if (manager.name) return manager.name;
    const emailPart = manager.email?.split('@')[0] || '';
    return emailPart.charAt(0).toUpperCase() + emailPart.slice(1);
  };

  const calcChange = (current, previous) => {
    if (!previous || previous === 0) {
      if (current > 0) return { value: 100, direction: 'up' };
      return { value: 0, direction: 'neutral' };
    }
    const change = ((current - previous) / previous) * 100;
    return {
      value: Math.abs(change).toFixed(0),
      direction: change > 0 ? 'up' : change < 0 ? 'down' : 'neutral'
    };
  };

  const ChangeIndicator = ({ current, previous, goodDirection = 'up' }) => {
    const change = calcChange(current, previous);
    if (change.direction === 'neutral') return null;

    const isGood = change.direction === goodDirection;
    const Icon = change.direction === 'up' ? TrendingUp : TrendingDown;

    return (
      <span className={`inline-flex items-center gap-0.5 text-xs font-medium ${
        isGood ? 'text-emerald-600' : 'text-red-500'
      }`}>
        <Icon className="w-3 h-3" />
        {change.value}%
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
    day: 'за день',
    week: 'за неделю',
    month: 'за месяц',
    custom: customDateFrom && customDateTo ? `${customDateFrom} - ${customDateTo}` : 'за период'
  };

  const prevPeriodLabels = {
    day: 'vs вчера',
    week: 'vs пред. неделя',
    month: 'vs пред. месяц',
    custom: 'vs пред. период'
  };

  const funnelData = [
    {
      label: 'Заявки',
      value: stats?.funnel?.callbacks || 0,
      color: 'bg-yellow-500',
      conversion: null
    },
    {
      label: 'Клиенты',
      value: stats?.funnel?.clients || 0,
      color: 'bg-emerald-500',
      conversion: stats?.funnel?.callbacks > 0
        ? ((stats.funnel.clients / stats.funnel.callbacks) * 100).toFixed(1)
        : 0
    },
    {
      label: 'КП',
      value: stats?.funnel?.quotes || 0,
      color: 'bg-blue-500',
      conversion: stats?.funnel?.clients > 0
        ? ((stats.funnel.quotes / stats.funnel.clients) * 100).toFixed(1)
        : 0
    },
    {
      label: 'Договоры',
      value: stats?.funnel?.contracts || 0,
      color: 'bg-purple-500',
      conversion: stats?.funnel?.quotes > 0
        ? ((stats.funnel.contracts / stats.funnel.quotes) * 100).toFixed(1)
        : 0
    }
  ];

  const totalConversion = stats?.funnel?.callbacks > 0
    ? ((stats.funnel.contracts / stats.funnel.callbacks) * 100).toFixed(1)
    : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Аналитика</h1>
          <p className="text-gray-500 mt-1">Показатели бизнеса {periodLabels[period]}</p>
        </div>

        {/* Period Selector */}
        <div className="flex items-center gap-2">
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
          
          {/* Custom period button */}
          <div className="relative">
            <button
              onClick={() => setShowDatePicker(!showDatePicker)}
              className={`p-2.5 rounded-lg transition-all ${
                period === 'custom'
                  ? 'bg-yellow-500 text-gray-900'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
              title="Выбрать период"
            >
              <Calendar className="w-5 h-5" />
            </button>
            
            {/* Date picker dropdown */}
            {showDatePicker && (
              <div className="absolute right-0 top-full mt-2 bg-white border border-gray-200 rounded-xl shadow-xl p-4 z-50 w-72">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-medium text-gray-900">Выбрать период</h4>
                  <button
                    onClick={() => setShowDatePicker(false)}
                    className="p-1 text-gray-400 hover:text-gray-600 rounded"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">От</label>
                    <input
                      type="date"
                      value={customDateFrom}
                      onChange={(e) => setCustomDateFrom(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-yellow-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">До</label>
                    <input
                      type="date"
                      value={customDateTo}
                      onChange={(e) => setCustomDateTo(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-yellow-500"
                    />
                  </div>
                  <button
                    onClick={handleApplyCustomPeriod}
                    disabled={!customDateFrom || !customDateTo}
                    className="w-full px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-gray-900 font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Применить
                  </button>
                </div>
              </div>
            )}
          </div>
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

      {/* Main KPI Cards with Comparison */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Заявки */}
        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <Inbox className="w-5 h-5 text-yellow-600" />
            </div>
            <ChangeIndicator
              current={stats?.callbacks?.period}
              previous={stats?.callbacks?.prev_period}
            />
          </div>
          <div className="text-3xl font-bold text-gray-900">{stats?.callbacks?.period || 0}</div>
          <div className="text-sm text-gray-500 mt-1">Новых заявок</div>
          <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-100">
            <div className="flex-1">
              <div className="text-xs text-gray-400">{prevPeriodLabels[period]}</div>
              <div className="text-sm font-medium text-gray-600">{stats?.callbacks?.prev_period || 0}</div>
            </div>
            <div className="flex-1 text-right">
              <div className="text-xs text-gray-400">Всего</div>
              <div className="text-sm font-medium text-gray-900">{stats?.callbacks?.total || 0}</div>
            </div>
          </div>
        </div>

        {/* Клиенты */}
        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 bg-emerald-100 rounded-lg">
              <Users className="w-5 h-5 text-emerald-600" />
            </div>
            <ChangeIndicator
              current={stats?.clients?.period}
              previous={stats?.clients?.prev_period}
            />
          </div>
          <div className="text-3xl font-bold text-gray-900">{stats?.clients?.period || 0}</div>
          <div className="text-sm text-gray-500 mt-1">Новых клиентов</div>
          <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-100">
            <div className="flex-1">
              <div className="text-xs text-gray-400">{prevPeriodLabels[period]}</div>
              <div className="text-sm font-medium text-gray-600">{stats?.clients?.prev_period || 0}</div>
            </div>
            <div className="flex-1 text-right">
              <div className="text-xs text-gray-400">Лидов</div>
              <div className="text-sm font-medium text-yellow-600">{stats?.clients?.leads || 0}</div>
            </div>
          </div>
        </div>

        {/* КП */}
        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <FileText className="w-5 h-5 text-blue-600" />
            </div>
            <ChangeIndicator
              current={stats?.quotes?.period_amount}
              previous={stats?.quotes?.prev_period_amount}
            />
          </div>
          <div className="text-3xl font-bold text-gray-900">{stats?.quotes?.period || 0}</div>
          <div className="text-sm text-gray-500 mt-1">КП создано</div>
          <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-100">
            <div className="flex-1">
              <div className="text-xs text-gray-400">Сумма</div>
              <div className="text-sm font-medium text-blue-600">{formatMoney(stats?.quotes?.period_amount)}</div>
            </div>
            <div className="flex-1 text-right">
              <div className="text-xs text-gray-400">Ср. чек</div>
              <div className="text-sm font-medium text-gray-900">{formatMoney(stats?.quotes?.period_avg_check)}</div>
            </div>
          </div>
        </div>

        {/* Договоры */}
        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <FileCheck className="w-5 h-5 text-purple-600" />
            </div>
            <ChangeIndicator
              current={stats?.contracts?.period_amount}
              previous={stats?.contracts?.prev_period_amount}
            />
          </div>
          <div className="text-3xl font-bold text-gray-900">{stats?.contracts?.period || 0}</div>
          <div className="text-sm text-gray-500 mt-1">Договоров</div>
          <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-100">
            <div className="flex-1">
              <div className="text-xs text-gray-400">Сумма</div>
              <div className="text-sm font-medium text-purple-600">{formatMoney(stats?.contracts?.period_amount)}</div>
            </div>
            <div className="flex-1 text-right">
              <div className="text-xs text-gray-400">Ср. чек</div>
              <div className="text-sm font-medium text-gray-900">{formatMoney(stats?.contracts?.period_avg_check)}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Conversion Time & Avg Check */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-amber-50 to-yellow-50 border border-yellow-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Timer className="w-4 h-4 text-yellow-600" />
            <span className="text-xs text-yellow-700 font-medium">Скорость обработки</span>
          </div>
          <div className="text-2xl font-bold text-gray-900">
            {stats?.conversion?.callback_to_client_hours || 0}ч
          </div>
          <div className="text-xs text-gray-500 mt-1">от заявки до клиента</div>
        </div>

        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-4 h-4 text-blue-600" />
            <span className="text-xs text-blue-700 font-medium">Цикл сделки</span>
          </div>
          <div className="text-2xl font-bold text-gray-900">
            {stats?.conversion?.client_to_contract_days || 0} дн
          </div>
          <div className="text-xs text-gray-500 mt-1">от клиента до договора</div>
        </div>

        <div className="bg-gradient-to-br from-emerald-50 to-green-50 border border-emerald-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="w-4 h-4 text-emerald-600" />
            <span className="text-xs text-emerald-700 font-medium">Средний чек КП</span>
          </div>
          <div className="text-2xl font-bold text-gray-900">
            {formatMoney(stats?.quotes?.avg_check)}
          </div>
          <div className="text-xs text-gray-500 mt-1">за все время</div>
        </div>

        <div className="bg-gradient-to-br from-purple-50 to-violet-50 border border-purple-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Zap className="w-4 h-4 text-purple-600" />
            <span className="text-xs text-purple-700 font-medium">Средний чек договора</span>
          </div>
          <div className="text-2xl font-bold text-gray-900">
            {formatMoney(stats?.contracts?.avg_check)}
          </div>
          <div className="text-xs text-gray-500 mt-1">за все время</div>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Воронка продаж */}
        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Target className="w-5 h-5 text-gray-400" />
              <h3 className="font-medium text-gray-900">Воронка продаж</h3>
            </div>
            <div className="text-xs text-gray-400">всего</div>
          </div>

          <div className="space-y-4">
            {funnelData.map((item, idx) => {
              const maxValue = funnelData[0].value || 1;
              const width = (item.value / maxValue * 100);

              return (
                <div key={idx}>
                  <div className="flex items-center justify-between text-sm mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-gray-700 font-medium">{item.label}</span>
                      {item.conversion !== null && (
                        <span className="text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">
                          {item.conversion}%
                        </span>
                      )}
                    </div>
                    <span className="font-semibold text-gray-900">{item.value}</span>
                  </div>
                  <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${item.color} rounded-full transition-all duration-500`}
                      style={{ width: `${Math.max(width, item.value > 0 ? 3 : 0)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-5 pt-4 border-t border-gray-100">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">Общая конверсия</span>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold text-purple-600">{totalConversion}%</span>
                <span className="text-xs text-gray-400">заявка → договор</span>
              </div>
            </div>
          </div>
        </div>

        {/* Эффективность менеджеров */}
        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-gray-400" />
              <h3 className="font-medium text-gray-900">Эффективность менеджеров</h3>
            </div>
            <Link to="/employee/staff" className="text-xs text-yellow-600 hover:text-yellow-700">
              Все
            </Link>
          </div>

          {stats?.managers?.length > 0 ? (
            <div className="space-y-3">
              {stats.managers.slice(0, 5).map((manager, idx) => {
                const managerConversion = manager.clients_count > 0
                  ? ((manager.contracts_count / manager.clients_count) * 100).toFixed(0)
                  : 0;

                return (
                  <div key={manager.id} className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold ${
                      idx === 0 ? 'bg-yellow-100 text-yellow-700' :
                      idx === 1 ? 'bg-gray-100 text-gray-600' :
                      idx === 2 ? 'bg-orange-50 text-orange-600' :
                      'bg-gray-50 text-gray-400'
                    }`}>
                      {idx + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-gray-900 truncate font-medium">
                        {getManagerName(manager)}
                      </div>
                      <div className="flex items-center gap-3 text-xs mt-0.5">
                        <span className="text-gray-500">{manager.clients_count} кл.</span>
                        <span className="text-blue-600">{manager.quotes_count} КП</span>
                        <span className="text-purple-600 font-medium">{manager.contracts_count} дог.</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-bold text-emerald-600">{managerConversion}%</div>
                      <div className="text-[10px] text-gray-400">конверсия</div>
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
                const bgColors = ['bg-yellow-50', 'bg-blue-50', 'bg-emerald-50', 'bg-purple-50', 'bg-gray-50'];

                return (
                  <div key={source.source} className={`p-3 rounded-lg ${bgColors[idx] || bgColors[4]}`}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700">{getSourceLabel(source.source)}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-bold text-gray-900">{source.count}</span>
                        <span className="text-xs text-gray-500">({percent}%)</span>
                      </div>
                    </div>
                    <div className="h-1.5 bg-white/60 rounded-full overflow-hidden">
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

      {/* Total Stats Footer - Светлая версия */}
      <div className="bg-gradient-to-r from-yellow-50 to-amber-50 border border-yellow-200 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <DollarSign className="w-5 h-5 text-yellow-600" />
            </div>
            <h3 className="font-medium text-gray-900">Итоговые показатели</h3>
          </div>
          <span className="text-xs text-gray-500 bg-white px-2 py-1 rounded">за все время</span>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white/60 rounded-xl p-4">
            <div className="text-3xl font-bold text-gray-900">{stats?.callbacks?.total || 0}</div>
            <div className="text-gray-500 text-sm mt-1">Всего заявок</div>
          </div>
          <div className="bg-white/60 rounded-xl p-4">
            <div className="text-3xl font-bold text-gray-900">{stats?.clients?.total || 0}</div>
            <div className="text-gray-500 text-sm mt-1">Всего клиентов</div>
          </div>
          <div className="bg-white/60 rounded-xl p-4">
            <div className="text-3xl font-bold text-blue-600">{formatMoneyFull(stats?.quotes?.total_amount)}</div>
            <div className="text-gray-500 text-sm mt-1">Сумма всех КП</div>
          </div>
          <div className="bg-white/60 rounded-xl p-4">
            <div className="text-3xl font-bold text-emerald-600">{formatMoneyFull(stats?.contracts?.total_amount)}</div>
            <div className="text-gray-500 text-sm mt-1">Сумма договоров</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SuperadminDashboard;
