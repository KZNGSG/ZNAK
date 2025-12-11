import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useEmployeeAuth } from '../../context/EmployeeAuthContext';
import {
  FileText,
  FileCheck,
  Receipt,
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
  Download,
  Loader2
} from 'lucide-react';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const QUOTE_STATUS_CONFIG = {
  created: { label: 'Черновик', color: 'bg-gray-100 text-gray-600', icon: Clock },
  sent: { label: 'Отправлено', color: 'bg-blue-100 text-blue-600', icon: AlertCircle },
  accepted: { label: 'Принято', color: 'bg-green-100 text-green-600', icon: CheckCircle },
  rejected: { label: 'Отклонено', color: 'bg-red-100 text-red-600', icon: XCircle }
};

const CONTRACT_STATUS_CONFIG = {
  draft: { label: 'Черновик', color: 'bg-gray-100 text-gray-600', icon: Clock },
  sent: { label: 'Отправлен', color: 'bg-blue-100 text-blue-600', icon: AlertCircle },
  signed: { label: 'Подписан', color: 'bg-green-100 text-green-600', icon: CheckCircle },
  active: { label: 'Активен', color: 'bg-emerald-100 text-emerald-600', icon: CheckCircle },
  completed: { label: 'Завершён', color: 'bg-gray-100 text-gray-600', icon: CheckCircle },
  cancelled: { label: 'Отменён', color: 'bg-red-100 text-red-600', icon: XCircle }
};

const INVOICE_STATUS_CONFIG = {
  created: { label: 'Создан', color: 'bg-gray-100 text-gray-600', icon: Clock },
  sent: { label: 'Отправлен', color: 'bg-blue-100 text-blue-600', icon: AlertCircle },
  paid: { label: 'Оплачен', color: 'bg-green-100 text-green-600', icon: CheckCircle },
  overdue: { label: 'Просрочен', color: 'bg-red-100 text-red-600', icon: XCircle },
  cancelled: { label: 'Отменён', color: 'bg-gray-100 text-gray-600', icon: XCircle }
};

const EmployeeDocuments = () => {
  const { authFetch } = useEmployeeAuth();
  const [activeTab, setActiveTab] = useState('quotes');
  const [documents, setDocuments] = useState({ quotes: [], contracts: [], invoices: [] });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortField, setSortField] = useState('created_at');
  const [sortDirection, setSortDirection] = useState('desc');
  const [downloadingId, setDownloadingId] = useState(null);

  useEffect(() => {
    fetchAllDocuments();
  }, []);

  const fetchAllDocuments = async () => {
    setLoading(true);
    try {
      // Fetch all documents in parallel
      const [quotesRes, contractsRes] = await Promise.all([
        authFetch(`${API_URL}/api/employee/quotes`),
        authFetch(`${API_URL}/api/employee/contracts`)
      ]);

      const quotesJson = quotesRes.ok ? await quotesRes.json() : { quotes: [] };
      const contractsJson = contractsRes.ok ? await contractsRes.json() : { contracts: [] };

      const quotesData = quotesJson.quotes || [];
      const contractsData = contractsJson.contracts || [];

      // Extract invoices from contracts or fetch separately if endpoint exists
      const invoices = contractsData
        .filter(c => c.invoice_number)
        .map(c => ({
          id: c.id,
          invoice_number: c.invoice_number || `СЧ-${c.contract_number?.replace('ДОГ-', '')}`,
          contract_number: c.contract_number,
          client_name: c.client_name,
          company_name: c.company_name,
          total_amount: c.total_amount,
          status: c.payment_status || 'created',
          created_at: c.created_at,
          client_id: c.client_id
        }));

      setDocuments({
        quotes: quotesData,
        contracts: contractsData,
        invoices: invoices
      });
    } catch (error) {
      console.error('Failed to fetch documents:', error);
      toast.error('Ошибка загрузки документов');
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

  const handleDownloadPdf = async (doc) => {
    const docId = doc.id;
    const docNumber = doc.quote_number || doc.contract_number;
    const type = activeTab === 'quotes' ? 'quotes' : 'contracts';

    setDownloadingId(docId);
    try {
      const response = await authFetch(`${API_URL}/api/employee/${type}/${docId}/pdf`);
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${activeTab === 'quotes' ? 'КП' : 'Договор'}_${docNumber}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        toast.success('Документ скачан');
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

  const handleStatusChange = async (doc, newStatus) => {
    const docId = doc.id;
    const type = activeTab === 'quotes' ? 'quotes' : 'contracts';

    try {
      const response = await authFetch(`${API_URL}/api/employee/${type}/${docId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      if (response.ok) {
        toast.success('Статус обновлён');
        fetchAllDocuments();
      } else {
        const error = await response.json();
        toast.error(error.detail || 'Ошибка обновления статуса');
      }
    } catch (error) {
      console.error('Failed to update status:', error);
      toast.error('Ошибка обновления статуса');
    }
  };

  const getStatusConfig = (type, status) => {
    if (type === 'quotes') return QUOTE_STATUS_CONFIG[status] || QUOTE_STATUS_CONFIG.created;
    if (type === 'contracts') return CONTRACT_STATUS_CONFIG[status] || CONTRACT_STATUS_CONFIG.draft;
    return INVOICE_STATUS_CONFIG[status] || INVOICE_STATUS_CONFIG.created;
  };

  const getFilteredDocuments = () => {
    const docs = documents[activeTab] || [];

    return docs
      .filter(doc => {
        if (!searchTerm) return true;
        const search = searchTerm.toLowerCase();
        const number = doc.quote_number || doc.contract_number || doc.invoice_number || '';
        return (
          number.toLowerCase().includes(search) ||
          doc.client_name?.toLowerCase().includes(search) ||
          doc.company_name?.toLowerCase().includes(search)
        );
      })
      .filter(doc => {
        if (statusFilter === 'all') return true;
        return doc.status === statusFilter;
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
  };

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

  const getStatusOptions = () => {
    if (activeTab === 'quotes') {
      return Object.entries(QUOTE_STATUS_CONFIG).map(([value, config]) => ({
        value,
        label: config.label
      }));
    }
    if (activeTab === 'contracts') {
      return Object.entries(CONTRACT_STATUS_CONFIG).map(([value, config]) => ({
        value,
        label: config.label
      }));
    }
    return Object.entries(INVOICE_STATUS_CONFIG).map(([value, config]) => ({
      value,
      label: config.label
    }));
  };

  const tabs = [
    { id: 'quotes', label: 'КП', icon: FileText, count: documents.quotes.length },
    { id: 'contracts', label: 'Договоры', icon: FileCheck, count: documents.contracts.length },
    { id: 'invoices', label: 'Счета', icon: Receipt, count: documents.invoices.length }
  ];

  const filteredDocs = getFilteredDocuments();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-gray-200 border-t-yellow-500"></div>
          <p className="text-gray-500 text-sm">Загрузка документов...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Реестр документов</h1>
          <p className="text-gray-500 mt-1">Все КП, договоры и счета в системе</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border border-gray-200 rounded-xl p-1 shadow-sm inline-flex">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                setStatusFilter('all');
              }}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'bg-yellow-500 text-gray-900'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
              <span className={`px-2 py-0.5 rounded-full text-xs ${
                activeTab === tab.id
                  ? 'bg-yellow-600 text-yellow-100'
                  : 'bg-gray-200 text-gray-600'
              }`}>
                {tab.count}
              </span>
            </button>
          );
        })}
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
              placeholder="Поиск по номеру, клиенту..."
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
              {getStatusOptions().map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Documents Table */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        {filteredDocs.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th
                    className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort(activeTab === 'quotes' ? 'quote_number' : activeTab === 'contracts' ? 'contract_number' : 'invoice_number')}
                  >
                    <div className="flex items-center gap-1">
                      № документа
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
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredDocs.map((doc) => {
                  const docNumber = doc.quote_number || doc.contract_number || doc.invoice_number;
                  const statusConfig = getStatusConfig(activeTab, doc.status);
                  const StatusIcon = statusConfig.icon;
                  const Icon = activeTab === 'quotes' ? FileText : activeTab === 'contracts' ? FileCheck : Receipt;

                  return (
                    <tr key={doc.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Icon className="w-4 h-4 text-gray-400" />
                          <span className="text-sm font-medium text-gray-900">
                            {docNumber}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4 text-gray-400" />
                            <span className="text-sm text-gray-900">{doc.client_name || '-'}</span>
                          </div>
                          {doc.company_name && (
                            <div className="flex items-center gap-2 mt-1">
                              <Building2 className="w-4 h-4 text-gray-300" />
                              <span className="text-xs text-gray-500">{doc.company_name}</span>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm font-medium text-gray-900">
                          {formatAmount(doc.total_amount)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {activeTab === 'invoices' ? (
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full ${statusConfig.color}`}>
                            <StatusIcon className="w-3 h-3" />
                            {statusConfig.label}
                          </span>
                        ) : (
                          <select
                            value={doc.status}
                            onChange={(e) => handleStatusChange(doc, e.target.value)}
                            className={`text-xs font-medium rounded-full px-2.5 py-1 border-0 cursor-pointer focus:outline-none focus:ring-2 focus:ring-yellow-500 ${statusConfig.color}`}
                          >
                            {getStatusOptions().map(opt => (
                              <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                          </select>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                          <Calendar className="w-4 h-4" />
                          {formatDate(doc.created_at)}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          {activeTab !== 'invoices' && (
                            <button
                              onClick={() => handleDownloadPdf(doc)}
                              disabled={downloadingId === doc.id}
                              className="p-2 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors disabled:opacity-50"
                              title="Скачать PDF"
                            >
                              {downloadingId === doc.id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Download className="w-4 h-4" />
                              )}
                            </button>
                          )}
                          {doc.client_id && (
                            <Link
                              to={`/employee/clients/${doc.client_id}`}
                              className="p-2 text-gray-400 hover:text-yellow-600 hover:bg-yellow-50 rounded-lg transition-colors inline-flex"
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
                ? 'Документы не найдены'
                : `Нет ${activeTab === 'quotes' ? 'КП' : activeTab === 'contracts' ? 'договоров' : 'счетов'}`}
            </p>
          </div>
        )}
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-yellow-100">
              <FileText className="w-5 h-5 text-yellow-700" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">{documents.quotes.length}</div>
              <div className="text-xs text-gray-500">Всего КП</div>
            </div>
          </div>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-100">
              <FileCheck className="w-5 h-5 text-emerald-700" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">{documents.contracts.length}</div>
              <div className="text-xs text-gray-500">Договоров</div>
            </div>
          </div>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-100">
              <Receipt className="w-5 h-5 text-blue-700" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">{documents.invoices.length}</div>
              <div className="text-xs text-gray-500">Счетов</div>
            </div>
          </div>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-100">
              <CheckCircle className="w-5 h-5 text-purple-700" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">
                {formatAmount(
                  documents.contracts
                    .filter(c => c.status === 'signed' || c.status === 'active')
                    .reduce((sum, c) => sum + (Number(c.total_amount) || 0), 0)
                )}
              </div>
              <div className="text-xs text-gray-500">По договорам</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmployeeDocuments;
