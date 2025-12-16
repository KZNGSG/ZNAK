import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useEmployeeAuth } from '../../context/EmployeeAuthContext';
import {
  FileCheck,
  Search,
  Filter,
  Calendar,
  Building2,
  User,
  ChevronRight,
  Clock,
  CheckCircle,
  XCircle,
  PlayCircle,
  ArrowUpDown,
  FileText,
  Download,
  Loader2,
  Trash2,
  CheckSquare,
  Square
} from 'lucide-react';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const STATUS_CONFIG = {
  draft: { label: 'Черновик', color: 'bg-gray-100 text-gray-600', icon: Clock },
  active: { label: 'Активный', color: 'bg-green-100 text-green-600', icon: PlayCircle },
  completed: { label: 'Завершён', color: 'bg-blue-100 text-blue-600', icon: CheckCircle },
  cancelled: { label: 'Отменён', color: 'bg-red-100 text-red-600', icon: XCircle }
};

const EmployeeContracts = () => {
  const { authFetch } = useEmployeeAuth();
  const [contracts, setContracts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortField, setSortField] = useState('created_at');
  const [sortDirection, setSortDirection] = useState('desc');
  const [downloadingId, setDownloadingId] = useState(null);
  
  // Bulk delete state
  const [selectedIds, setSelectedIds] = useState([]);
  const [deleting, setDeleting] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  useEffect(() => {
    fetchContracts();
  }, [statusFilter]);

  useEffect(() => {
    setSelectedIds([]);
  }, [statusFilter]);

  const fetchContracts = async () => {
    try {
      let url = `${API_URL}/api/employee/contracts`;
      if (statusFilter !== 'all') {
        url += `?status=${statusFilter}`;
      }
      const response = await authFetch(url);
      if (response.ok) {
        const data = await response.json();
        setContracts(data.contracts || []);
      } else {
        toast.error('Ошибка загрузки договоров');
      }
    } catch (error) {
      console.error('Failed to fetch contracts:', error);
      toast.error('Ошибка загрузки');
    } finally {
      setLoading(false);
    }
  };

  // Bulk delete functions
  const toggleSelectAll = () => {
    if (selectedIds.length === filteredContracts.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredContracts.map(c => c.id));
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
      const response = await authFetch(`${API_URL}/api/employee/contracts/bulk-delete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selectedIds })
      });
      
      if (response.ok) {
        const data = await response.json();
        toast.success(`Удалено договоров: ${data.deleted_count}`);
        setSelectedIds([]);
        setDeleteConfirm(false);
        fetchContracts();
      } else {
        toast.error('Ошибка удаления');
      }
    } catch (error) {
      console.error('Failed to delete contracts:', error);
      toast.error('Ошибка удаления');
    } finally {
      setDeleting(false);
    }
  };

  const handleDeleteSingle = async (id, e) => {
    e?.stopPropagation();
    if (!window.confirm('Удалить этот договор?')) return;
    
    try {
      const response = await authFetch(`${API_URL}/api/employee/contracts/${id}`, {
        method: 'DELETE'
      });
      
      if (response.ok) {
        toast.success('Договор удалён');
        fetchContracts();
      } else {
        toast.error('Ошибка удаления');
      }
    } catch (error) {
      console.error('Failed to delete contract:', error);
      toast.error('Ошибка удаления');
    }
  };

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const handleDownloadPdf = async (contractId, contractNumber) => {
    setDownloadingId(contractId);
    try {
      const response = await authFetch(`${API_URL}/api/employee/contracts/${contractId}/pdf`);
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Договор_${contractNumber}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        toast.success('Договор скачан');
      } else {
        toast.error('Ошибка скачивания');
      }
    } catch (error) {
      console.error('Failed to download PDF:', error);
      toast.error('Ошибка скачивания');
    } finally {
      setDownloadingId(null);
    }
  };

  const handleStatusChange = async (contractId, newStatus) => {
    try {
      const response = await authFetch(`${API_URL}/api/employee/contracts/${contractId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      if (response.ok) {
        toast.success('Статус обновлён');
        fetchContracts();
      } else {
        const error = await response.json();
        toast.error(error.detail || 'Ошибка обновления статуса');
      }
    } catch (error) {
      console.error('Failed to update status:', error);
      toast.error('Ошибка обновления статуса');
    }
  };

  const filteredContracts = contracts
    .filter(contract => {
      if (!searchTerm) return true;
      const search = searchTerm.toLowerCase();
      return (
        contract.contract_number?.toLowerCase().includes(search) ||
        contract.client_name?.toLowerCase().includes(search) ||
        contract.company_name?.toLowerCase().includes(search)
      );
    })
    .sort((a, b) => {
      let aVal = a[sortField];
      let bVal = b[sortField];
      if (sortField === 'total_amount') {
        aVal = Number(aVal) || 0;
        bVal = Number(bVal) || 0;
      }
      if (sortDirection === 'asc') {
        return aVal > bVal ? 1 : -1;
      }
      return aVal < bVal ? 1 : -1;
    });

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const formatAmount = (amount) => {
    if (!amount) return '0 ₽';
    return Number(amount).toLocaleString('ru-RU') + ' ₽';
  };

  // Calculate totals
  const totalAmount = contracts.reduce((sum, c) => sum + (Number(c.total_amount) || 0), 0);
  const activeAmount = contracts
    .filter(c => c.status === 'active')
    .reduce((sum, c) => sum + (Number(c.total_amount) || 0), 0);

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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Договоры</h1>
          <p className="text-gray-500 mt-1">Все договоры в системе</p>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-2 text-gray-500">
            <FileCheck className="w-4 h-4" />
            <span>Всего: {contracts.length}</span>
          </div>
          <div className="text-green-600 font-medium">
            Активных: {formatAmount(activeAmount)}
          </div>
        </div>
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

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
          <div className="text-sm text-gray-500 mb-1">Всего договоров</div>
          <div className="text-2xl font-bold text-gray-900">{contracts.length}</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
          <div className="text-sm text-gray-500 mb-1">Общая сумма</div>
          <div className="text-2xl font-bold text-gray-900">{formatAmount(totalAmount)}</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
          <div className="text-sm text-gray-500 mb-1">Активные</div>
          <div className="text-2xl font-bold text-green-600">
            {contracts.filter(c => c.status === 'active').length}
          </div>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
          <div className="text-sm text-gray-500 mb-1">Завершённые</div>
          <div className="text-2xl font-bold text-blue-600">
            {contracts.filter(c => c.status === 'completed').length}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Поиск по номеру договора, клиенту..."
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-yellow-500"
            />
          </div>
          {/* Status filter */}
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-yellow-500"
            >
              <option value="all">Все статусы</option>
              <option value="draft">Черновики</option>
              <option value="active">Активные</option>
              <option value="completed">Завершённые</option>
              <option value="cancelled">Отменённые</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        {filteredContracts.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-4 py-3 w-12">
                    <button
                      onClick={toggleSelectAll}
                      className="p-1 hover:bg-gray-200 rounded transition-colors"
                    >
                      {selectedIds.length === filteredContracts.length && filteredContracts.length > 0 ? (
                        <CheckSquare className="w-5 h-5 text-yellow-600" />
                      ) : (
                        <Square className="w-5 h-5 text-gray-400" />
                      )}
                    </button>
                  </th>
                  <th
                    className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('contract_number')}
                  >
                    <div className="flex items-center gap-1">
                      № Договора
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                  <th
                    className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('client_name')}
                  >
                    <div className="flex items-center gap-1">
                      Клиент
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    КП
                  </th>
                  <th
                    className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('total_amount')}
                  >
                    <div className="flex items-center gap-1">
                      Сумма
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Статус
                  </th>
                  <th
                    className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('created_at')}
                  >
                    <div className="flex items-center gap-1">
                      Дата
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Менеджер
                  </th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredContracts.map((contract) => {
                  const statusConfig = STATUS_CONFIG[contract.status] || STATUS_CONFIG.draft;
                  const StatusIcon = statusConfig.icon;
                  const isSelected = selectedIds.includes(contract.id);

                  return (
                    <tr key={contract.id} className={`hover:bg-gray-50 transition-colors ${isSelected ? 'bg-yellow-100/50' : ''}`}>
                      <td className="px-4 py-3">
                        <button
                          onClick={(e) => toggleSelectOne(contract.id, e)}
                          className="p-1 hover:bg-gray-200 rounded transition-colors"
                        >
                          {isSelected ? (
                            <CheckSquare className="w-5 h-5 text-yellow-600" />
                          ) : (
                            <Square className="w-5 h-5 text-gray-400" />
                          )}
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <FileCheck className="w-4 h-4 text-gray-400" />
                          <span className="text-sm font-medium text-gray-900">
                            {contract.contract_number}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div>
                          {contract.client_id ? (
                            <Link
                              to={`/employee/clients/${contract.client_id}`}
                              className="flex items-center gap-2 hover:text-yellow-600 transition-colors"
                            >
                              <User className="w-4 h-4 text-gray-400" />
                              <span className="text-sm text-gray-900 hover:text-yellow-600">{contract.client_name || '-'}</span>
                            </Link>
                          ) : (
                            <div className="flex items-center gap-2">
                              <User className="w-4 h-4 text-gray-400" />
                              <span className="text-sm text-gray-900">{contract.client_name || '-'}</span>
                            </div>
                          )}
                          {contract.company_name && (
                            <div className="flex items-center gap-2 mt-1">
                              <Building2 className="w-4 h-4 text-gray-300" />
                              <span className="text-xs text-gray-500">{contract.company_name}</span>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {contract.quote_number ? (
                          <div className="flex items-center gap-1 text-sm text-gray-500">
                            <FileText className="w-3 h-3" />
                            {contract.quote_number}
                          </div>
                        ) : (
                          <span className="text-sm text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm font-medium text-gray-900">
                          {formatAmount(contract.total_amount)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <select
                          value={contract.status}
                          onChange={(e) => handleStatusChange(contract.id, e.target.value)}
                          className={`text-xs font-medium rounded-full px-2.5 py-1 border-0 cursor-pointer focus:outline-none focus:ring-2 focus:ring-yellow-500 ${statusConfig.color}`}
                        >
                          <option value="draft">Черновик</option>
                          <option value="active">Активный</option>
                          <option value="completed">Завершён</option>
                          <option value="cancelled">Отменён</option>
                        </select>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                          <Calendar className="w-4 h-4" />
                          {formatDate(contract.created_at)}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-gray-500">{contract.manager_email || '-'}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleDownloadPdf(contract.id, contract.contract_number)}
                            disabled={downloadingId === contract.id}
                            className="p-2 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors disabled:opacity-50"
                            title="Скачать PDF"
                          >
                            {downloadingId === contract.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Download className="w-4 h-4" />
                            )}
                          </button>
                          <button
                            onClick={(e) => handleDeleteSingle(contract.id, e)}
                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Удалить"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                          {contract.client_id && (
                            <Link
                              to={`/employee/clients/${contract.client_id}`}
                              className="p-2 text-gray-400 hover:text-yellow-600 hover:bg-yellow-50 rounded-lg transition-colors"
                              title="Карточка клиента"
                            >
                              <ChevronRight className="w-4 h-4" />
                            </Link>
                          )}
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
            <FileCheck className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">
              {searchTerm || statusFilter !== 'all'
                ? 'Договоры не найдены'
                : 'Нет договоров'}
            </p>
          </div>
        )}
      </div>

      {/* Status Distribution */}
      {contracts.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Object.entries(STATUS_CONFIG).map(([status, config]) => {
            const count = contracts.filter(c => c.status === status).length;
            const amount = contracts
              .filter(c => c.status === status)
              .reduce((sum, c) => sum + (Number(c.total_amount) || 0), 0);
            const Icon = config.icon;
            return (
              <div key={status} className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
                <div className="flex items-center gap-3 mb-2">
                  <div className={`p-2 rounded-lg ${config.color}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="text-sm font-medium text-gray-700">{config.label}</div>
                </div>
                <div className="text-xl font-bold text-gray-900">{count}</div>
                <div className="text-xs text-gray-500">{formatAmount(amount)}</div>
              </div>
            );
          })}
        </div>
      )}

      {/* Delete confirmation modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="p-6">
              <div className="flex items-center justify-center w-12 h-12 mx-auto mb-4 bg-red-100 rounded-full">
                <Trash2 className="w-6 h-6 text-red-600" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 text-center mb-2">
                Удалить договоры?
              </h3>
              <p className="text-sm text-gray-500 text-center">
                Вы уверены, что хотите удалить {selectedIds.length} {selectedIds.length === 1 ? 'договор' : selectedIds.length < 5 ? 'договора' : 'договоров'}? 
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

export default EmployeeContracts;
