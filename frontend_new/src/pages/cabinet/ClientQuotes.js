import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  FileText,
  Download,
  Eye,
  Calendar,
  Building2,
  Search,
  Filter,
  FileX,
  CheckCircle,
  XCircle
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const ClientQuotes = () => {
  const { token } = useAuth();
  const [quotes, setQuotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    const fetchQuotes = async () => {
      if (!token) return;

      try {
        const response = await fetch(`${API_URL}/api/client/quotes`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
          const data = await response.json();
          setQuotes(data || []);
        }
      } catch (error) {
        console.error('Failed to fetch quotes:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchQuotes();
  }, [token]);

  const getStatusBadge = (status) => {
    const statusMap = {
      'draft': { label: 'Черновик', color: 'bg-gray-100 text-gray-600' },
      'sent': { label: 'Отправлено', color: 'bg-blue-100 text-blue-600' },
      'viewed': { label: 'Просмотрено', color: 'bg-yellow-100 text-yellow-600' },
      'accepted': { label: 'Принято', color: 'bg-green-100 text-green-600' },
      'rejected': { label: 'Отклонено', color: 'bg-red-100 text-red-600' },
      'expired': { label: 'Истекло', color: 'bg-gray-100 text-gray-600' }
    };
    const statusInfo = statusMap[status] || { label: status, color: 'bg-gray-100 text-gray-600' };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusInfo.color}`}>
        {statusInfo.label}
      </span>
    );
  };

  const handleAcceptQuote = async (quoteId) => {
    try {
      const response = await fetch(`${API_URL}/api/client/quotes/${quoteId}/accept`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        setQuotes(quotes.map(q =>
          q.id === quoteId ? { ...q, status: 'accepted' } : q
        ));
      }
    } catch (error) {
      console.error('Failed to accept quote:', error);
    }
  };

  const handleRejectQuote = async (quoteId) => {
    try {
      const response = await fetch(`${API_URL}/api/client/quotes/${quoteId}/reject`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        setQuotes(quotes.map(q =>
          q.id === quoteId ? { ...q, status: 'rejected' } : q
        ));
      }
    } catch (error) {
      console.error('Failed to reject quote:', error);
    }
  };

  const filteredQuotes = quotes.filter(quote => {
    const matchesSearch = !searchQuery ||
      quote.number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      quote.company_name?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || quote.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Коммерческие предложения</h1>
        <p className="text-gray-500 mt-1">КП от менеджеров для рассмотрения</p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Поиск по номеру..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-400" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:border-yellow-500 bg-white"
          >
            <option value="all">Все статусы</option>
            <option value="sent">Отправлено</option>
            <option value="viewed">Просмотрено</option>
            <option value="accepted">Принято</option>
            <option value="rejected">Отклонено</option>
          </select>
        </div>
      </div>

      {/* Quotes List */}
      {filteredQuotes.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <FileX className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {quotes.length === 0 ? 'Нет коммерческих предложений' : 'Ничего не найдено'}
          </h3>
          <p className="text-gray-500">
            {quotes.length === 0
              ? 'Вам пока не отправляли КП'
              : 'Попробуйте изменить параметры поиска'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredQuotes.map((quote) => (
            <div
              key={quote.id}
              className="bg-white rounded-xl border border-gray-200 p-5 hover:border-yellow-400 hover:shadow-md transition-all"
            >
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
                    <FileText className="w-6 h-6 text-blue-500" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-gray-900">
                        КП №{quote.number || quote.id}
                      </h3>
                      {getStatusBadge(quote.status)}
                    </div>
                    <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                      {quote.company_name && (
                        <div className="flex items-center gap-1">
                          <Building2 className="w-4 h-4" />
                          {quote.company_name}
                        </div>
                      )}
                      <div className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {new Date(quote.created_at).toLocaleDateString('ru-RU')}
                      </div>
                    </div>
                    {quote.total_amount && (
                      <div className="mt-2 text-lg font-semibold text-gray-900">
                        {quote.total_amount.toLocaleString('ru-RU')} ₽
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {/* Actions for sent/viewed quotes */}
                  {(quote.status === 'sent' || quote.status === 'viewed') && (
                    <>
                      <button
                        onClick={() => handleAcceptQuote(quote.id)}
                        className="flex items-center gap-1 px-3 py-2 bg-green-50 text-green-600 hover:bg-green-100 rounded-lg transition-colors text-sm font-medium"
                      >
                        <CheckCircle className="w-4 h-4" />
                        Принять
                      </button>
                      <button
                        onClick={() => handleRejectQuote(quote.id)}
                        className="flex items-center gap-1 px-3 py-2 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg transition-colors text-sm font-medium"
                      >
                        <XCircle className="w-4 h-4" />
                        Отклонить
                      </button>
                    </>
                  )}
                  <button className="p-2 text-gray-400 hover:text-yellow-600 hover:bg-yellow-50 rounded-lg transition-colors" title="Просмотреть">
                    <Eye className="w-5 h-5" />
                  </button>
                  {quote.file_url && (
                    <a
                      href={quote.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                      title="Скачать"
                    >
                      <Download className="w-5 h-5" />
                    </a>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ClientQuotes;
