import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useEmployeeAuth } from '../../context/EmployeeAuthContext';
import {
  Inbox,
  Phone,
  Mail,
  Building2,
  Clock,
  CheckCircle2,
  XCircle,
  UserPlus,
  ArrowUpRight,
  Package,
  AlertTriangle,
  User,
  ChevronDown,
  Search,
  Calendar,
  MessageSquare,
  Send,
  X
} from 'lucide-react';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const EmployeeInbox = () => {
  const { authFetch, user } = useEmployeeAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [callbacks, setCallbacks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || '');
  const [periodFilter, setPeriodFilter] = useState(searchParams.get('period') || '');
  const [showOverdue, setShowOverdue] = useState(searchParams.get('overdue') === 'true');
  const [managers, setManagers] = useState([]);
  const [assigningId, setAssigningId] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [commentModal, setCommentModal] = useState({ open: false, callbackId: null });
  const [commentText, setCommentText] = useState('');
  const [savingComment, setSavingComment] = useState(false);

  useEffect(() => {
    fetchCallbacks();
    fetchManagers();
  }, [statusFilter, showOverdue, periodFilter]);

  const fetchCallbacks = async () => {
    try {
      let url;
      if (showOverdue) {
        url = `${API_URL}/api/employee/callbacks/overdue`;
      } else {
        const params = new URLSearchParams();
        if (statusFilter) params.append('status', statusFilter);
        if (periodFilter) params.append('period', periodFilter);
        url = `${API_URL}/api/employee/callbacks${params.toString() ? '?' + params.toString() : ''}`;
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
    updateSearchParams({ status, period: periodFilter });
  };

  const handlePeriodChange = (period) => {
    setPeriodFilter(period);
    updateSearchParams({ status: statusFilter, period });
  };

  const updateSearchParams = ({ status, period }) => {
    const params = new URLSearchParams();
    if (status) params.set('status', status);
    if (period) params.set('period', period);
    setSearchParams(params);
  };

  const handleShowOverdue = () => {
    setStatusFilter('');
    setPeriodFilter('');
    setShowOverdue(true);
    setSearchParams({ overdue: 'true' });
  };

  const handleConvertCallback = async (callbackId, e) => {
    e?.stopPropagation();
    try {
      const response = await authFetch(`${API_URL}/api/employee/callbacks/${callbackId}/convert`, {
        method: 'POST'
      });
      if (response.ok) {
        const data = await response.json();
        toast.success('Клиент создан');
        navigate(`/employee/clients/${data.client_id}`);
      }
    } catch (error) {
      console.error('Failed to convert callback:', error);
      toast.error('Ошибка создания клиента');
    }
  };

  const handleUpdateStatus = async (callbackId, newStatus, e) => {
    e?.stopPropagation();
    try {
      const response = await authFetch(`${API_URL}/api/employee/callbacks/${callbackId}/status?status=${newStatus}`, {
        method: 'PUT'
      });
      if (response.ok) {
        const statusLabels = {
          new: 'Новая',
          processing: 'В работе',
          completed: 'Завершена',
          cancelled: 'Отменена'
        };
        toast.success(`Статус: ${statusLabels[newStatus]}`);
        fetchCallbacks();
      }
    } catch (error) {
      console.error('Failed to update status:', error);
      toast.error('Ошибка');
    }
  };

  const handleAssignToManager = async (callbackId, managerId, e) => {
    e?.stopPropagation();
    try {
      const response = await authFetch(`${API_URL}/api/superadmin/callbacks/${callbackId}/assign`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ manager_id: managerId })
      });
      if (response.ok) {
        setAssigningId(null);
        toast.success('Менеджер назначен');
        fetchCallbacks();
      }
    } catch (error) {
      console.error('Failed to assign callback:', error);
      toast.error('Ошибка назначения');
    }
  };

  const handleSaveComment = async () => {
    if (!commentText.trim()) return;

    setSavingComment(true);
    try {
      const response = await authFetch(`${API_URL}/api/employee/callbacks/${commentModal.callbackId}/comment`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ comment: commentText })
      });
      if (response.ok) {
        toast.success('Комментарий сохранён');
        setCommentModal({ open: false, callbackId: null });
        setCommentText('');
        fetchCallbacks();
      } else {
        toast.error('Ошибка сохранения');
      }
    } catch (error) {
      console.error('Failed to save comment:', error);
      toast.error('Ошибка сохранения');
    } finally {
      setSavingComment(false);
    }
  };

  const openCommentModal = (callback, e) => {
    e?.stopPropagation();
    setCommentText(callback.comment || '');
    setCommentModal({ open: true, callbackId: callback.id });
  };

  const isOverdue = (callback) => {
    if (!callback.sla_deadline || callback.status === 'completed' || callback.status === 'cancelled') {
      return false;
    }
    return new Date(callback.sla_deadline) < new Date();
  };

  const getTimeAgo = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'сейчас';
    if (diffMins < 60) return `${diffMins} мин`;
    if (diffHours < 24) return `${diffHours}ч`;
    return `${diffDays}д`;
  };

  const getSourceLabel = (source) => {
    const labels = {
      check_page: 'Проверка товара',
      quote_page: 'Запрос КП',
      contact_form: 'Контакт',
      unknown: 'Другое'
    };
    return labels[source] || source || 'Другое';
  };

  const formatPhone = (phone) => {
    if (!phone) return '';
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 11) {
      return `+7 (${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7, 9)}-${cleaned.slice(9)}`;
    }
    return phone;
  };

  // Статистика
  const stats = {
    total: callbacks.length,
    new: callbacks.filter(c => c.status === 'new').length,
    processing: callbacks.filter(c => c.status === 'processing').length,
    overdue: callbacks.filter(c => isOverdue(c)).length
  };

  // Фильтрация по поиску
  const filteredCallbacks = callbacks.filter(cb => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      cb.contact_name?.toLowerCase().includes(search) ||
      cb.contact_phone?.includes(search) ||
      cb.company_name?.toLowerCase().includes(search)
    );
  });

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
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Входящие заявки</h1>
          <p className="text-gray-500 text-sm mt-0.5">Заявки с сайта на обратный звонок</p>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="bg-white border border-gray-200 rounded-xl p-3 shadow-sm">
        <div className="flex flex-col gap-3">
          {/* Row 1: Status filters + Search */}
          <div className="flex flex-col lg:flex-row lg:items-center gap-3">
            {/* Filter tabs */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                onClick={() => handleStatusChange('')}
                className={`px-3 py-1.5 text-sm rounded-lg transition-colors font-medium ${
                  statusFilter === '' && !showOverdue
                    ? 'bg-yellow-500 text-gray-900'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                Все
                <span className="ml-1.5 text-xs opacity-70">{stats.total}</span>
              </button>
              <button
                onClick={() => handleStatusChange('new')}
                className={`px-3 py-1.5 text-sm rounded-lg transition-colors font-medium flex items-center gap-1.5 ${
                  statusFilter === 'new'
                    ? 'bg-yellow-500 text-gray-900'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                Новые
                {stats.new > 0 && (
                  <span className="px-1.5 py-0.5 text-xs bg-red-500 text-white rounded-full">{stats.new}</span>
                )}
              </button>
              <button
                onClick={() => handleStatusChange('processing')}
                className={`px-3 py-1.5 text-sm rounded-lg transition-colors font-medium ${
                  statusFilter === 'processing'
                    ? 'bg-yellow-500 text-gray-900'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                В работе
                <span className="ml-1.5 text-xs opacity-70">{stats.processing}</span>
              </button>
              <button
                onClick={() => handleStatusChange('completed')}
                className={`px-3 py-1.5 text-sm rounded-lg transition-colors font-medium ${
                  statusFilter === 'completed'
                    ? 'bg-yellow-500 text-gray-900'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                Завершённые
              </button>
              <button
                onClick={() => handleStatusChange('cancelled')}
                className={`px-3 py-1.5 text-sm rounded-lg transition-colors font-medium ${
                  statusFilter === 'cancelled'
                    ? 'bg-yellow-500 text-gray-900'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                Отменённые
              </button>
              {stats.overdue > 0 && (
                <button
                  onClick={handleShowOverdue}
                  className={`px-3 py-1.5 text-sm rounded-lg transition-colors font-medium flex items-center gap-1.5 ${
                    showOverdue
                      ? 'bg-red-500 text-white'
                      : 'bg-red-100 text-red-700 hover:bg-red-200'
                  }`}
                >
                  <AlertTriangle className="w-3.5 h-3.5" />
                  Просрочено
                  <span className="text-xs">{stats.overdue}</span>
                </button>
              )}
            </div>

            {/* Search */}
            <div className="flex-1 lg:max-w-xs">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Поиск по имени, телефону..."
                  className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-yellow-500"
                />
              </div>
            </div>
          </div>

          {/* Row 2: Period filter */}
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-gray-400" />
            <span className="text-sm text-gray-500">Период:</span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => handlePeriodChange('')}
                className={`px-2.5 py-1 text-xs rounded-md transition-colors ${
                  periodFilter === ''
                    ? 'bg-gray-200 text-gray-800'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                Все
              </button>
              <button
                onClick={() => handlePeriodChange('today')}
                className={`px-2.5 py-1 text-xs rounded-md transition-colors ${
                  periodFilter === 'today'
                    ? 'bg-gray-200 text-gray-800'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                Сегодня
              </button>
              <button
                onClick={() => handlePeriodChange('week')}
                className={`px-2.5 py-1 text-xs rounded-md transition-colors ${
                  periodFilter === 'week'
                    ? 'bg-gray-200 text-gray-800'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                Неделя
              </button>
              <button
                onClick={() => handlePeriodChange('month')}
                className={`px-2.5 py-1 text-xs rounded-md transition-colors ${
                  periodFilter === 'month'
                    ? 'bg-gray-200 text-gray-800'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                Месяц
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        {filteredCallbacks.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider w-20">
                    Время
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Клиент
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Телефон
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider w-28">
                    Тип
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider w-16">
                    Товары
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider w-32">
                    Статус
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider w-24">
                    Менеджер
                  </th>
                  <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider w-32">
                    Действия
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredCallbacks.map((callback) => {
                  const overdue = isOverdue(callback);
                  const isExpanded = expandedId === callback.id;

                  return (
                    <React.Fragment key={callback.id}>
                      <tr
                        onClick={() => setExpandedId(isExpanded ? null : callback.id)}
                        className={`hover:bg-gray-50 transition-colors cursor-pointer ${
                          overdue ? 'bg-red-50/50' : ''
                        } ${isExpanded ? 'bg-yellow-50' : ''}`}
                      >
                        {/* Время */}
                        <td className="px-4 py-3">
                          <div className="flex flex-col">
                            <span className={`text-sm font-medium ${overdue ? 'text-red-600' : 'text-gray-900'}`}>
                              {getTimeAgo(callback.created_at)}
                            </span>
                            {overdue && (
                              <span className="text-xs text-red-500 flex items-center gap-0.5">
                                <AlertTriangle className="w-3 h-3" />
                                SLA
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Клиент */}
                        <td className="px-4 py-3">
                          <div>
                            <div className="text-sm font-medium text-gray-900">{callback.contact_name}</div>
                            {callback.company_name && (
                              <div className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                                <Building2 className="w-3 h-3" />
                                {callback.company_name}
                              </div>
                            )}
                          </div>
                        </td>

                        {/* Телефон */}
                        <td className="px-4 py-3">
                          <a
                            href={`tel:${callback.contact_phone}`}
                            onClick={(e) => e.stopPropagation()}
                            className="text-sm text-gray-900 hover:text-yellow-600 flex items-center gap-1.5"
                          >
                            <Phone className="w-3.5 h-3.5 text-gray-400" />
                            {formatPhone(callback.contact_phone)}
                          </a>
                        </td>

                        {/* Тип заявки */}
                        <td className="px-4 py-3">
                          <span className="text-xs text-gray-600 bg-gray-100 px-2 py-1 rounded">
                            {getSourceLabel(callback.source)}
                          </span>
                        </td>

                        {/* Товары */}
                        <td className="px-4 py-3">
                          {callback.products && callback.products.length > 0 ? (
                            <span className="inline-flex items-center gap-1 text-sm text-gray-600">
                              <Package className="w-3.5 h-3.5 text-gray-400" />
                              {callback.products.length}
                            </span>
                          ) : (
                            <span className="text-gray-400 text-sm">-</span>
                          )}
                        </td>

                        {/* Статус - dropdown */}
                        <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                          <StatusDropdown
                            status={callback.status}
                            onChange={(newStatus) => handleUpdateStatus(callback.id, newStatus)}
                          />
                        </td>

                        {/* Менеджер */}
                        <td className="px-4 py-3">
                          {callback.assigned_email ? (
                            <span className="text-xs text-gray-600 truncate block max-w-[80px]" title={callback.assigned_email}>
                              {callback.assigned_email.split('@')[0]}
                            </span>
                          ) : managers.length > 0 ? (
                            <div className="relative" onClick={(e) => e.stopPropagation()}>
                              <button
                                onClick={() => setAssigningId(assigningId === callback.id ? null : callback.id)}
                                className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1"
                              >
                                <User className="w-3 h-3" />
                                Назначить
                              </button>
                              {assigningId === callback.id && (
                                <div className="absolute left-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-20 py-1 min-w-[160px]">
                                  {managers.map((manager) => (
                                    <button
                                      key={manager.id}
                                      onClick={(e) => handleAssignToManager(callback.id, manager.id, e)}
                                      className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                                    >
                                      <User className="w-3 h-3 text-gray-400" />
                                      <span className="truncate">{manager.name || manager.email.split('@')[0]}</span>
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-xs text-gray-400">-</span>
                          )}
                        </td>

                        {/* Действия */}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                            {/* Комментарий */}
                            <button
                              onClick={(e) => openCommentModal(callback, e)}
                              className={`p-1.5 rounded transition-colors ${
                                callback.comment
                                  ? 'text-blue-600 hover:bg-blue-50'
                                  : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
                              }`}
                              title={callback.comment || 'Добавить комментарий'}
                            >
                              <MessageSquare className="w-4 h-4" />
                            </button>

                            {/* Создать клиента */}
                            {!callback.client_id && (callback.status === 'new' || callback.status === 'processing') && (
                              <button
                                onClick={(e) => handleConvertCallback(callback.id, e)}
                                className="px-2 py-1 text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded transition-colors flex items-center gap-1"
                                title="Создать клиента"
                              >
                                <UserPlus className="w-3.5 h-3.5" />
                                КП
                              </button>
                            )}

                            {/* Открыть клиента */}
                            {callback.client_id && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigate(`/employee/clients/${callback.client_id}`);
                                }}
                                className="p-1.5 text-gray-400 hover:text-yellow-600 hover:bg-yellow-50 rounded transition-colors"
                                title="Открыть клиента"
                              >
                                <ArrowUpRight className="w-4 h-4" />
                              </button>
                            )}

                            {/* Раскрыть */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setExpandedId(isExpanded ? null : callback.id);
                              }}
                              className="p-1 text-gray-400 hover:text-gray-600 rounded transition-colors"
                            >
                              <ChevronDown className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* Expanded row */}
                      {isExpanded && (
                        <tr className="bg-yellow-50/50">
                          <td colSpan={8} className="px-4 py-4">
                            <div className="grid md:grid-cols-3 gap-4">
                              {/* Контакты */}
                              <div className="space-y-2">
                                <h4 className="text-xs font-medium text-gray-500 uppercase">Контакты</h4>
                                <div className="space-y-1.5">
                                  <a
                                    href={`tel:${callback.contact_phone}`}
                                    className="flex items-center gap-2 text-sm text-gray-700 hover:text-yellow-600"
                                  >
                                    <Phone className="w-4 h-4 text-gray-400" />
                                    {formatPhone(callback.contact_phone)}
                                  </a>
                                  {callback.contact_email && (
                                    <a
                                      href={`mailto:${callback.contact_email}`}
                                      className="flex items-center gap-2 text-sm text-gray-700 hover:text-yellow-600"
                                    >
                                      <Mail className="w-4 h-4 text-gray-400" />
                                      {callback.contact_email}
                                    </a>
                                  )}
                                  {callback.company_inn && (
                                    <div className="flex items-center gap-2 text-sm text-gray-600">
                                      <Building2 className="w-4 h-4 text-gray-400" />
                                      ИНН: {callback.company_inn}
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* Товары */}
                              {callback.products && callback.products.length > 0 && (
                                <div className="space-y-2">
                                  <h4 className="text-xs font-medium text-gray-500 uppercase">
                                    Товары ({callback.products.length})
                                  </h4>
                                  <div className="flex flex-wrap gap-1.5">
                                    {callback.products.map((product, idx) => (
                                      <span
                                        key={idx}
                                        className="px-2 py-1 bg-white border border-gray-200 rounded text-xs text-gray-700"
                                      >
                                        {product.name || product.subcategory_name || 'Товар'}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Комментарий */}
                              <div className="space-y-2">
                                <h4 className="text-xs font-medium text-gray-500 uppercase">Комментарий</h4>
                                {callback.comment ? (
                                  <p className="text-sm text-gray-600 bg-white p-2 rounded border border-gray-200">
                                    {callback.comment}
                                  </p>
                                ) : (
                                  <button
                                    onClick={(e) => openCommentModal(callback, e)}
                                    className="text-sm text-blue-600 hover:text-blue-700"
                                  >
                                    + Добавить комментарий
                                  </button>
                                )}
                              </div>
                            </div>

                            {/* Actions */}
                            <div className="flex items-center gap-2 mt-4 pt-4 border-t border-yellow-200">
                              {!callback.client_id && (callback.status === 'new' || callback.status === 'processing') && (
                                <button
                                  onClick={(e) => handleConvertCallback(callback.id, e)}
                                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-900 bg-yellow-500 hover:bg-yellow-600 rounded-lg transition-colors"
                                >
                                  <UserPlus className="w-4 h-4" />
                                  Создать клиента и КП
                                </button>
                              )}
                              {callback.client_id && (
                                <button
                                  onClick={() => navigate(`/employee/clients/${callback.client_id}`)}
                                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 rounded-lg transition-colors"
                                >
                                  Открыть карточку клиента
                                  <ArrowUpRight className="w-4 h-4" />
                                </button>
                              )}
                              <span className="text-xs text-gray-400 ml-auto">
                                Заявка #{callback.id} • {new Date(callback.created_at).toLocaleString('ru-RU')}
                              </span>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12">
            <Inbox className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <h3 className="text-lg font-medium text-gray-700 mb-1">Нет заявок</h3>
            <p className="text-gray-500 text-sm">
              {showOverdue ? 'Нет просроченных заявок' : statusFilter ? 'Нет заявок с выбранным статусом' : 'Входящих заявок пока нет'}
            </p>
          </div>
        )}
      </div>

      {/* Comment Modal */}
      {commentModal.open && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Комментарий к заявке</h3>
              <button
                onClick={() => setCommentModal({ open: false, callbackId: null })}
                className="p-1 text-gray-400 hover:text-gray-600 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4">
              <textarea
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Введите комментарий..."
                className="w-full h-32 p-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-yellow-500 resize-none"
              />
            </div>
            <div className="flex items-center justify-end gap-2 p-4 border-t border-gray-200">
              <button
                onClick={() => setCommentModal({ open: false, callbackId: null })}
                className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Отмена
              </button>
              <button
                onClick={handleSaveComment}
                disabled={savingComment}
                className="px-4 py-2 text-sm font-medium text-gray-900 bg-yellow-500 hover:bg-yellow-600 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {savingComment ? (
                  <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
                Сохранить
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Status dropdown component
const StatusDropdown = ({ status, onChange }) => {
  const [open, setOpen] = useState(false);

  const config = {
    new: { bg: 'bg-red-100', text: 'text-red-700', label: 'Новая' },
    processing: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'В работе' },
    completed: { bg: 'bg-green-100', text: 'text-green-700', label: 'Завершена' },
    cancelled: { bg: 'bg-gray-100', text: 'text-gray-600', label: 'Отменена' }
  };

  const options = [
    { value: 'new', label: 'Новая' },
    { value: 'processing', label: 'В работе' },
    { value: 'completed', label: 'Завершена' },
    { value: 'cancelled', label: 'Отменена' }
  ];

  const current = config[status] || config.new;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium cursor-pointer ${current.bg} ${current.text}`}
      >
        {current.label}
        <ChevronDown className={`w-3 h-3 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-20 py-1 min-w-[120px]">
            {options.map((opt) => (
              <button
                key={opt.value}
                onClick={() => {
                  onChange(opt.value);
                  setOpen(false);
                }}
                className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-50 ${
                  status === opt.value ? 'bg-gray-50 font-medium' : ''
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default EmployeeInbox;
