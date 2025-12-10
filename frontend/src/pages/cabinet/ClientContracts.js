import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  FileCheck,
  Download,
  Eye,
  Calendar,
  Building2,
  Search,
  Filter,
  FileX
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const ClientContracts = () => {
  const { token } = useAuth();
  const [contracts, setContracts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    const fetchContracts = async () => {
      if (!token) return;

      try {
        const response = await fetch(`${API_URL}/api/client/contracts`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
          const data = await response.json();
          setContracts(data || []);
        }
      } catch (error) {
        console.error('Failed to fetch contracts:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchContracts();
  }, [token]);

  const getStatusBadge = (status) => {
    const statusMap = {
      'draft': { label: 'Черновик', color: 'bg-gray-100 text-gray-600' },
      'sent': { label: 'Отправлен', color: 'bg-blue-100 text-blue-600' },
      'signed': { label: 'Подписан', color: 'bg-green-100 text-green-600' },
      'active': { label: 'Активный', color: 'bg-green-100 text-green-600' },
      'completed': { label: 'Завершён', color: 'bg-gray-100 text-gray-600' },
      'cancelled': { label: 'Отменён', color: 'bg-red-100 text-red-600' }
    };
    const statusInfo = statusMap[status] || { label: status, color: 'bg-gray-100 text-gray-600' };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusInfo.color}`}>
        {statusInfo.label}
      </span>
    );
  };

  const filteredContracts = contracts.filter(contract => {
    const matchesSearch = !searchQuery ||
      contract.number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      contract.company_name?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || contract.status === statusFilter;
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
        <h1 className="text-2xl font-bold text-gray-900">Договоры</h1>
        <p className="text-gray-500 mt-1">Все ваши договоры с компанией</p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Поиск по номеру или компании..."
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
            <option value="draft">Черновик</option>
            <option value="sent">Отправлен</option>
            <option value="signed">Подписан</option>
            <option value="active">Активный</option>
            <option value="completed">Завершён</option>
          </select>
        </div>
      </div>

      {/* Contracts List */}
      {filteredContracts.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <FileX className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {contracts.length === 0 ? 'Нет договоров' : 'Ничего не найдено'}
          </h3>
          <p className="text-gray-500">
            {contracts.length === 0
              ? 'У вас пока нет оформленных договоров'
              : 'Попробуйте изменить параметры поиска'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredContracts.map((contract) => (
            <div
              key={contract.id}
              className="bg-white rounded-xl border border-gray-200 p-5 hover:border-yellow-400 hover:shadow-md transition-all"
            >
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-green-50 flex items-center justify-center flex-shrink-0">
                    <FileCheck className="w-6 h-6 text-green-500" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-gray-900">
                        Договор №{contract.number || contract.id}
                      </h3>
                      {getStatusBadge(contract.status)}
                    </div>
                    <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                      {contract.company_name && (
                        <div className="flex items-center gap-1">
                          <Building2 className="w-4 h-4" />
                          {contract.company_name}
                        </div>
                      )}
                      <div className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {new Date(contract.created_at).toLocaleDateString('ru-RU')}
                      </div>
                    </div>
                    {contract.total_amount && (
                      <div className="mt-2 text-lg font-semibold text-gray-900">
                        {contract.total_amount.toLocaleString('ru-RU')} ₽
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button className="p-2 text-gray-400 hover:text-yellow-600 hover:bg-yellow-50 rounded-lg transition-colors" title="Просмотреть">
                    <Eye className="w-5 h-5" />
                  </button>
                  {contract.file_url && (
                    <a
                      href={contract.file_url}
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

export default ClientContracts;
