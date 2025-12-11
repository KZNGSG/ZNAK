import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useEmployeeAuth } from '../../context/EmployeeAuthContext';
import {
  FileText,
  Search,
  Filter,
  Calendar,
  Building2,
  User,
  ChevronRight,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  ArrowUpDown,
  Plus,
  Download,
  Loader2
} from 'lucide-react';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const STATUS_CONFIG = {
  created: { label: 'Черновик', color: 'bg-gray-100 text-gray-600', icon: Clock },
  draft: { label: 'Черновик', color: 'bg-gray-100 text-gray-600', icon: Clock },
  sent: { label: 'Отправлено', color: 'bg-blue-100 text-blue-600', icon: AlertCircle },
  approved: { label: 'Одобрено', color: 'bg-green-100 text-green-600', icon: CheckCircle },
  accepted: { label: 'Одобрено', color: 'bg-green-100 text-green-600', icon: CheckCircle },
  rejected: { label: 'Отклонено', color: 'bg-red-100 text-red-600', icon: XCircle }
};

const EmployeeQuotes = () => {
  const { authFetch } = useEmployeeAuth();
  const [quotes, setQuotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortField, setSortField] = useState('created_at');
  const [sortDirection, setSortDirection] = useState('desc');
  const [downloadingId, setDownloadingId] = useState(null);

  useEffect(() => {
    fetchQuotes();
  }, [statusFilter]);

  const fetchQuotes = async () => {
    try {
      let url = `${API_URL}/api/employee/quotes`;
      if (statusFilter !== 'all') {
        url += `?status=${statusFilter}`;
      }
      const response = await authFetch(url);
      if (response.ok) {
        const data = await response.json();
        setQuotes(data.quotes || []);
      } else {
        toast.error('Ошибка загрузки КП');
      }
    } catch (error) {
      console.error('Failed to fetch quotes:', error);
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

  const handleDownloadPdf = async (quoteId, quoteNumber) => {
    setDownloadingId(quoteId);
    try {
      const response = await authFetch(`${API_URL}/api/employee/quotes/${quoteId}/pdf`);
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `КП_${quoteNumber}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        toast.success('КП скачано');
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

  const handleStatusChange = async (quoteId, newStatus) => {
    try {
      const response = await authFetch(`${API_URL}/api/employee/quotes/${quoteId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      if (response.ok) {
        toast.success('Статус обновлён');
        fetchQuotes();
      } else {
        const error = await response.json();
        toast.error(error.detail || 'Ошибка обновления статуса');
      }
    } catch (error) {
      console.error('Failed to update status:', error);
      toast.error('Ошибка обновления статуса');
    }
  };

  const filteredQuotes = quotes
    .filter(quote => {
      if (!searchTerm) return true;
      const search = searchTerm.toLowerCase();
      return (
        quote.quote_number?.toLowerCase().includes(search) ||
        quote.client_name?.toLowerCase().includes(search) ||
        quote.company_name?.toLowerCase().includes(search)
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
          <h1 className="text-2xl font-semibold text-gray-900">Коммерческие предложения</h1>
          <p className="text-gray-500 mt-1">Все КП в системе</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <FileText className="w-4 h-4" />
            <span>Всего: {quotes.length}</span>
          </div>
          <Link
            to="/employee/quote/new"
            className="flex items-center gap-2 px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-gray-900 font-medium rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            Создать КП
          </Link>
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
              placeholder="Поиск по номеру КП, клиенту..."
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
              <option value="created">Черновик</option>
              <option value="sent">Отправлено</option>
              <option value="accepted">Одобрено</option>
              <option value="rejected">Отклонено</option>
            </select>
          </div>
        </div>
      </div>

      {/* Quotes Table */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        {filteredQuotes.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th
                    className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('quote_number')}
                  >
                    <div className="flex items-center gap-1">
                      № КП
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
                {filteredQuotes.map((quote) => {
                  const statusConfig = STATUS_CONFIG[quote.status] || STATUS_CONFIG.draft;
                  const StatusIcon = statusConfig.icon;

                  return (
                    <tr key={quote.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-gray-400" />
                          <span className="text-sm font-medium text-gray-900">
                            {quote.quote_number}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div>
                          {quote.client_id ? (
                            <Link
                              to={`/employee/clients/${quote.client_id}`}
                              className="flex items-center gap-2 hover:text-yellow-600 transition-colors"
                            >
                              <User className="w-4 h-4 text-gray-400" />
                              <span className="text-sm text-gray-900 hover:text-yellow-600">{quote.client_name || '-'}</span>
                            </Link>
                          ) : (
                            <div className="flex items-center gap-2">
                              <User className="w-4 h-4 text-gray-400" />
                              <span className="text-sm text-gray-900">{quote.client_name || '-'}</span>
                            </div>
                          )}
                          {quote.company_name && (
                            <div className="flex items-center gap-2 mt-1">
                              <Building2 className="w-4 h-4 text-gray-300" />
                              <span className="text-xs text-gray-500">{quote.company_name}</span>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm font-medium text-gray-900">
                          {formatAmount(quote.total_amount)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <select
                          value={quote.status}
                          onChange={(e) => handleStatusChange(quote.id, e.target.value)}
                          className={`text-xs font-medium rounded-full px-2.5 py-1 border-0 cursor-pointer focus:outline-none focus:ring-2 focus:ring-yellow-500 ${statusConfig.color}`}
                        >
                          <option value="created">Черновик</option>
                          <option value="sent">Отправлено</option>
                          <option value="accepted">Одобрено</option>
                          <option value="rejected">Отклонено</option>
                        </select>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                          <Calendar className="w-4 h-4" />
                          {formatDate(quote.created_at)}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-gray-500">{quote.manager_email || '-'}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleDownloadPdf(quote.id, quote.quote_number)}
                            disabled={downloadingId === quote.id}
                            className="p-2 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors disabled:opacity-50"
                            title="Скачать PDF"
                          >
                            {downloadingId === quote.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Download className="w-4 h-4" />
                            )}
                          </button>
                          {quote.client_id && (
                            <Link
                              to={`/employee/clients/${quote.client_id}`}
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
            <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">
              {searchTerm || statusFilter !== 'all'
                ? 'КП не найдены'
                : 'Нет коммерческих предложений'}
            </p>
          </div>
        )}
      </div>

      {/* Summary Stats */}
      {quotes.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { status: 'created', label: 'Черновик', color: 'bg-gray-100 text-gray-600', icon: Clock },
            { status: 'sent', label: 'Отправлено', color: 'bg-blue-100 text-blue-600', icon: AlertCircle },
            { status: 'accepted', label: 'Одобрено', color: 'bg-green-100 text-green-600', icon: CheckCircle },
            { status: 'rejected', label: 'Отклонено', color: 'bg-red-100 text-red-600', icon: XCircle }
          ].map(({ status, label, color, icon: Icon }) => {
            const count = quotes.filter(q => q.status === status).length;
            return (
              <div key={status} className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${color}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-gray-900">{count}</div>
                    <div className="text-xs text-gray-500">{label}</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default EmployeeQuotes;
