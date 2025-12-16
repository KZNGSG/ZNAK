import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useEmployeeAuth } from '../../context/EmployeeAuthContext';
import {
  Users,
  UserPlus,
  Search,
  Filter,
  Phone,
  Mail,
  Building2,
  ArrowUpRight,
  TrendingUp,
  UserCheck,
  Star,
  UserX,
  FileText,
  FileCheck,
  Plus,
  AlertCircle,
  Trash2,
  CheckSquare,
  Square,
  MapPin
} from 'lucide-react';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const EmployeeClients = () => {
  const { authFetch } = useEmployeeAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || '');
  
  // Bulk delete state
  const [selectedIds, setSelectedIds] = useState([]);
  const [deleting, setDeleting] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  useEffect(() => {
    fetchClients();
  }, [statusFilter]);

  useEffect(() => {
    setSelectedIds([]);
  }, [statusFilter]);

  const fetchClients = async () => {
    try {
      let url = `${API_URL}/api/employee/clients`;
      const params = new URLSearchParams();
      if (statusFilter) params.append('status', statusFilter);
      if (params.toString()) url += `?${params.toString()}`;

      const response = await authFetch(url);
      if (response.ok) {
        const data = await response.json();
        setClients(data.clients);
      }
    } catch (error) {
      console.error('Failed to fetch clients:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      fetchClients();
      return;
    }

    setLoading(true);
    try {
      const response = await authFetch(`${API_URL}/api/employee/clients?search=${encodeURIComponent(searchQuery)}`);
      if (response.ok) {
        const data = await response.json();
        setClients(data.clients);
      }
    } catch (error) {
      console.error('Failed to search clients:', error);
    } finally {
      setLoading(false);
    }
  };

  // Bulk delete functions
  const toggleSelectAll = () => {
    if (selectedIds.length === clients.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(clients.map(c => c.id));
    }
  };

  const toggleSelectOne = (id, e) => {
    e?.stopPropagation();
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    
    setDeleting(true);
    try {
      const response = await authFetch(`${API_URL}/api/employee/clients/bulk-delete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selectedIds })
      });
      
      if (response.ok) {
        const data = await response.json();
        toast.success(`Удалено клиентов: ${data.deleted_count}`);
        setSelectedIds([]);
        setDeleteConfirm(false);
        fetchClients();
      } else {
        toast.error('Ошибка удаления');
      }
    } catch (error) {
      console.error('Failed to delete clients:', error);
      toast.error('Ошибка удаления');
    } finally {
      setDeleting(false);
    }
  };

  const handleDeleteSingle = async (id, e) => {
    e?.stopPropagation();
    if (!window.confirm('Удалить этого клиента?')) return;
    
    try {
      const response = await authFetch(`${API_URL}/api/employee/clients/${id}`, {
        method: 'DELETE'
      });
      
      if (response.ok) {
        toast.success('Клиент удалён');
        fetchClients();
      } else {
        toast.error('Ошибка удаления');
      }
    } catch (error) {
      console.error('Failed to delete client:', error);
      toast.error('Ошибка удаления');
    }
  };

  const handleStatusChange = (status) => {
    setStatusFilter(status);
    setSearchQuery('');
    if (status) {
      setSearchParams({ status });
    } else {
      setSearchParams({});
    }
  };

  const formatAmount = (amount) => {
    if (!amount) return '0';
    return Number(amount).toLocaleString('ru-RU');
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  // Статистика
  const stats = {
    total: clients.length,
    leads: clients.filter(c => c.status === 'lead').length,
    active: clients.filter(c => c.status === 'active').length,
    withoutQuotes: clients.filter(c => !c.quotes_count).length
  };

  const statusOptions = [
    { value: '', label: 'Все клиенты' },
    { value: 'lead', label: 'Лиды' },
    { value: 'active', label: 'Активные' },
    { value: 'regular', label: 'Постоянные' },
    { value: 'inactive', label: 'Неактивные' }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-gray-200 border-t-yellow-500"></div>
          <p className="text-gray-500 text-sm">Загрузка клиентов...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Клиенты</h1>
          <p className="text-gray-500 text-sm mt-0.5">База клиентов компании</p>
        </div>
        <Link
          to="/employee/clients/new"
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-yellow-500 hover:bg-yellow-600 text-gray-900 text-sm font-medium rounded-xl transition-colors"
        >
          <UserPlus className="w-4 h-4" />
          Новый клиент
        </Link>
      </div>

      {/* Bulk delete bar */}
      {selectedIds.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CheckSquare className="w-5 h-5 text-red-600" />
            <span className="text-sm font-medium text-red-800">
              Выбрано: {selectedIds.length}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSelectedIds([])}
              className="px-3 py-1.5 text-sm text-gray-600 hover:bg-red-100 rounded-lg transition-colors"
            >
              Отменить
            </button>
            <button
              onClick={() => setDeleteConfirm(true)}
              className="px-4 py-1.5 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors flex items-center gap-2"
            >
              <Trash2 className="w-4 h-4" />
              Удалить
            </button>
          </div>
        </div>
      )}

      {/* Filters & Search */}
      <div className="bg-white border border-gray-200 rounded-xl p-3 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center gap-3">
          {/* Filter tabs */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              onClick={() => handleStatusChange('')}
              className={`px-3 py-1.5 text-sm rounded-lg transition-colors font-medium ${
                statusFilter === ''
                  ? 'bg-yellow-500 text-gray-900'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Все
              <span className="ml-1.5 text-xs opacity-70">{stats.total}</span>
            </button>
            <button
              onClick={() => handleStatusChange('lead')}
              className={`px-3 py-1.5 text-sm rounded-lg transition-colors font-medium ${
                statusFilter === 'lead'
                  ? 'bg-yellow-500 text-gray-900'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Лиды
              {stats.leads > 0 && <span className="ml-1.5 text-xs opacity-70">{stats.leads}</span>}
            </button>
            <button
              onClick={() => handleStatusChange('active')}
              className={`px-3 py-1.5 text-sm rounded-lg transition-colors font-medium ${
                statusFilter === 'active'
                  ? 'bg-yellow-500 text-gray-900'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Активные
              {stats.active > 0 && <span className="ml-1.5 text-xs opacity-70">{stats.active}</span>}
            </button>
            <button
              onClick={() => handleStatusChange('regular')}
              className={`px-3 py-1.5 text-sm rounded-lg transition-colors font-medium ${
                statusFilter === 'regular'
                  ? 'bg-yellow-500 text-gray-900'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Постоянные
            </button>
            <button
              onClick={() => handleStatusChange('inactive')}
              className={`px-3 py-1.5 text-sm rounded-lg transition-colors font-medium ${
                statusFilter === 'inactive'
                  ? 'bg-yellow-500 text-gray-900'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Неактивные
            </button>
          </div>

          {/* Search */}
          <div className="flex-1 flex gap-2">
            <div className="relative flex-1 lg:max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="Поиск по имени, ИНН, телефону..."
                className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-yellow-500"
              />
            </div>
            <button
              onClick={handleSearch}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium rounded-lg transition-colors"
            >
              Найти
            </button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        {clients.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-4 py-3 w-12">
                    <button
                      onClick={toggleSelectAll}
                      className="p-1 hover:bg-gray-200 rounded transition-colors"
                    >
                      {selectedIds.length === clients.length && clients.length > 0 ? (
                        <CheckSquare className="w-5 h-5 text-yellow-600" />
                      ) : (
                        <Square className="w-5 h-5 text-gray-400" />
                      )}
                    </button>
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Клиент
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Контакты
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider w-28">
                    Город
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider w-20">
                    Задачи
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider w-24">
                    Статус
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider w-20">
                    КП
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider w-24">
                    Договоры
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
                {clients.map((client) => {
                  const hasNoContracts = client.status === 'lead' && client.quotes_count > 0 && !client.contracts_count;
                  const isSelected = selectedIds.includes(client.id);

                  return (
                    <tr
                      key={client.id}
                      onClick={() => navigate(`/employee/clients/${client.id}`)}
                      className={`hover:bg-gray-50 transition-colors cursor-pointer ${isSelected ? 'bg-yellow-100/50' : ''}`}
                    >
                      {/* Checkbox */}
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={(e) => toggleSelectOne(client.id, e)}
                          className="p-1 hover:bg-gray-200 rounded transition-colors"
                        >
                          {isSelected ? (
                            <CheckSquare className="w-5 h-5 text-yellow-600" />
                          ) : (
                            <Square className="w-5 h-5 text-gray-400" />
                          )}
                        </button>
                      </td>

                      {/* Клиент */}
                      <td className="px-4 py-3">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{client.contact_name}</div>
                          {client.company_name && (
                            <div className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                              <Building2 className="w-3 h-3" />
                              {client.company_name}
                            </div>
                          )}
                          {client.inn && (
                            <div className="text-xs text-gray-400 mt-0.5">
                              ИНН: {client.inn}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Контакты */}
                      <td className="px-4 py-3">
                        <div className="space-y-0.5 text-sm">
                          <div className="flex items-center gap-1.5 text-gray-600">
                            <Phone className="w-3.5 h-3.5 text-gray-400" />
                            {client.contact_phone}
                          </div>
                          {client.contact_email && (
                            <div className="flex items-center gap-1.5 text-gray-500 text-xs">
                              <Mail className="w-3 h-3 text-gray-400" />
                              {client.contact_email}
                            </div>
                          )}
                        </div>
                      </td>


                      {/* Город */}
                      <td className="px-4 py-3">
                        {(client.city || client.address) ? (
                          <span className="text-sm text-gray-600">{client.city || client.address}</span>
                        ) : (
                          <span className="text-xs text-gray-300">—</span>
                        )}
                      </td>

                      {/* Задачи */}
                      <td className="px-4 py-3">
                        {client.tasks_count > 0 ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-violet-100 text-violet-700 text-xs font-medium rounded-full">
                            <CheckSquare className="w-3 h-3" />
                            {client.tasks_count}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-300">—</span>
                        )}
                      </td>
                      {/* Статус */}
                      <td className="px-4 py-3">
                        <StatusBadge status={client.status} />
                      </td>

                      {/* КП */}
                      <td className="px-4 py-3">
                        {client.quotes_count > 0 ? (
                          <div className="flex items-center gap-1.5">
                            <FileText className="w-3.5 h-3.5 text-gray-400" />
                            <span className="text-sm text-gray-900">{client.quotes_count}</span>
                            <span className="text-xs text-gray-400">
                              ({formatAmount(client.quotes_total)})
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-orange-500 flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" />
                            нет
                          </span>
                        )}
                      </td>

                      {/* Договоры */}
                      <td className="px-4 py-3">
                        {client.contracts_count > 0 ? (
                          <div className="flex items-center gap-1.5">
                            <FileCheck className="w-3.5 h-3.5 text-emerald-500" />
                            <span className="text-sm text-gray-900">{client.contracts_count}</span>
                            <span className="text-xs text-gray-400">
                              ({formatAmount(client.contracts_total)})
                            </span>
                          </div>
                        ) : hasNoContracts ? (
                          <span className="text-xs text-yellow-600">ожидает</span>
                        ) : (
                          <span className="text-xs text-gray-400">-</span>
                        )}
                      </td>

                      {/* Менеджер */}
                      <td className="px-4 py-3">
                        {client.manager_name ? (
                          <span className="text-xs text-gray-600 truncate block max-w-[80px]" title={client.manager_email}>
                            {client.manager_name}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400">-</span>
                        )}
                      </td>

                      {/* Действия */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/employee/clients/${client.id}?action=quote`);
                            }}
                            className="px-2 py-1 text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded transition-colors flex items-center gap-1"
                            title="Создать КП"
                          >
                            <Plus className="w-3 h-3" />
                            КП
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/employee/clients/${client.id}`);
                            }}
                            className="p-1.5 text-gray-400 hover:text-yellow-600 hover:bg-yellow-50 rounded transition-colors"
                            title="Открыть карточку"
                          >
                            <ArrowUpRight className="w-4 h-4" />
                          </button>
                          <button
                            onClick={(e) => handleDeleteSingle(client.id, e)}
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                            title="Удалить"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12">
            <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <h3 className="text-lg font-medium text-gray-700 mb-1">Нет клиентов</h3>
            <p className="text-gray-500 text-sm mb-4">
              {searchQuery ? 'По вашему запросу ничего не найдено' : 'Добавьте первого клиента'}
            </p>
            <Link
              to="/employee/clients/new"
              className="inline-flex items-center gap-2 px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-gray-900 text-sm font-medium rounded-lg transition-colors"
            >
              <UserPlus className="w-4 h-4" />
              Создать клиента
            </Link>
          </div>
        )}
      </div>

      {/* Delete confirmation modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="p-6">
              <div className="flex items-center justify-center w-12 h-12 mx-auto mb-4 bg-red-100 rounded-full">
                <Trash2 className="w-6 h-6 text-red-600" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 text-center mb-2">
                Удалить клиентов?
              </h3>
              <p className="text-sm text-gray-500 text-center">
                Вы уверены, что хотите удалить {selectedIds.length} {selectedIds.length === 1 ? 'клиента' : selectedIds.length < 5 ? 'клиентов' : 'клиентов'}? 
                Это действие нельзя отменить.
              </p>
            </div>
            <div className="flex items-center justify-end gap-2 p-4 border-t border-gray-200">
              <button
                onClick={() => setDeleteConfirm(false)}
                className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Отмена
              </button>
              <button
                onClick={handleBulkDelete}
                disabled={deleting}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {deleting ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
                Удалить
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Status badge component
const StatusBadge = ({ status }) => {
  const config = {
    lead: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'Лид', icon: TrendingUp },
    active: { bg: 'bg-emerald-100', text: 'text-emerald-700', label: 'Активный', icon: UserCheck },
    regular: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Постоянный', icon: Star },
    inactive: { bg: 'bg-gray-100', text: 'text-gray-600', label: 'Неактивный', icon: UserX }
  };
  const style = config[status] || config.lead;
  const Icon = style.icon;

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${style.bg} ${style.text}`}>
      <Icon className="w-3 h-3" />
      {style.label}
    </span>
  );
};

export default EmployeeClients;
