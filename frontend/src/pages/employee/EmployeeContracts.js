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
  FileText
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

  useEffect(() => {
    fetchContracts();
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
        setContracts(data);
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

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
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
      if (sortField === 'amount') {
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
  const totalAmount = contracts.reduce((sum, c) => sum + (Number(c.amount) || 0), 0);
  const activeAmount = contracts
    .filter(c => c.status === 'active')
    .reduce((sum, c) => sum + (Number(c.amount) || 0), 0);

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

          {/* Status Filter */}
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-yellow-500"
            >
              <option value="all">Все статусы</option>
              <option value="draft">Черновик</option>
              <option value="active">Активный</option>
              <option value="completed">Завершён</option>
              <option value="cancelled">Отменён</option>
            </select>
          </div>
        </div>
      </div>

      {/* Contracts Table */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        {filteredContracts.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
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
                    onClick={() => handleSort('amount')}
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
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredContracts.map((contract) => {
                  const statusConfig = STATUS_CONFIG[contract.status] || STATUS_CONFIG.draft;
                  const StatusIcon = statusConfig.icon;

                  return (
                    <tr key={contract.id} className="hover:bg-gray-50 transition-colors">
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
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4 text-gray-400" />
                            <span className="text-sm text-gray-900">{contract.client_name || '-'}</span>
                          </div>
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
                          {formatAmount(contract.amount)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full ${statusConfig.color}`}>
                          <StatusIcon className="w-3 h-3" />
                          {statusConfig.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                          <Calendar className="w-4 h-4" />
                          {formatDate(contract.created_at)}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Link
                          to={`/employee/clients/${contract.client_id}`}
                          className="p-2 text-gray-400 hover:text-yellow-600 hover:bg-yellow-50 rounded-lg transition-colors inline-flex"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </Link>
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
              .reduce((sum, c) => sum + (Number(c.amount) || 0), 0);
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
    </div>
  );
};

export default EmployeeContracts;
