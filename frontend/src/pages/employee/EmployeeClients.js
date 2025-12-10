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
  MoreHorizontal
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const EmployeeClients = () => {
  const { authFetch } = useEmployeeAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || '');

  useEffect(() => {
    fetchClients();
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

  const handleStatusChange = (status) => {
    setStatusFilter(status);
    setSearchQuery('');
    if (status) {
      setSearchParams({ status });
    } else {
      setSearchParams({});
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      lead: { bg: 'bg-yellow-100', border: 'border-yellow-200', text: 'text-yellow-700', icon: TrendingUp, label: 'Лид' },
      active: { bg: 'bg-emerald-100', border: 'border-emerald-200', text: 'text-emerald-700', icon: UserCheck, label: 'Активный' },
      regular: { bg: 'bg-amber-100', border: 'border-amber-200', text: 'text-amber-700', icon: Star, label: 'Постоянный' },
      inactive: { bg: 'bg-gray-100', border: 'border-gray-200', text: 'text-gray-600', icon: UserX, label: 'Неактивный' }
    };
    const style = styles[status] || styles.lead;
    const Icon = style.icon;

    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium ${style.bg} ${style.border} ${style.text} border`}>
        <Icon className="w-3.5 h-3.5" />
        {style.label}
      </span>
    );
  };

  const getSourceLabel = (source) => {
    const labels = {
      website: 'Сайт',
      manual: 'Вручную',
      callback: 'Заявка'
    };
    return labels[source] || source || 'Другое';
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

  const statusOptions = [
    { value: '', label: 'Все клиенты', count: clients.length },
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Клиенты</h1>
          <p className="text-gray-500 mt-1">База клиентов компании</p>
        </div>
        <Link
          to="/employee/clients/new"
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-yellow-500 hover:bg-yellow-600 text-gray-900 text-sm font-medium rounded-xl transition-colors"
        >
          <UserPlus className="w-4 h-4" />
          Новый клиент
        </Link>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="Поиск по имени, компании, телефону, ИНН..."
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500"
          />
        </div>
        <button
          onClick={handleSearch}
          className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium rounded-xl transition-colors"
        >
          Искать
        </button>
      </div>

      {/* Status Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <Filter className="w-4 h-4 text-gray-400" />
        {statusOptions.map((option) => (
          <button
            key={option.value}
            onClick={() => handleStatusChange(option.value)}
            className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
              statusFilter === option.value
                ? 'bg-yellow-100 text-yellow-700 border border-yellow-300'
                : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>

      {/* Clients List */}
      {clients.length > 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="text-left px-5 py-4 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Клиент
                  </th>
                  <th className="text-left px-5 py-4 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Контакты
                  </th>
                  <th className="text-left px-5 py-4 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Статус
                  </th>
                  <th className="text-left px-5 py-4 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Источник
                  </th>
                  <th className="text-left px-5 py-4 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Дата
                  </th>
                  <th className="text-right px-5 py-4"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {clients.map((client) => (
                  <tr
                    key={client.id}
                    className="hover:bg-gray-50 transition-colors cursor-pointer"
                    onClick={() => navigate(`/employee/clients/${client.id}`)}
                  >
                    <td className="px-5 py-4">
                      <div>
                        <div className="font-medium text-gray-900">{client.contact_name}</div>
                        {client.company_name && (
                          <div className="flex items-center gap-1.5 mt-1 text-sm text-gray-500">
                            <Building2 className="w-3.5 h-3.5" />
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
                    <td className="px-5 py-4">
                      <div className="space-y-1 text-sm">
                        <div className="flex items-center gap-1.5 text-gray-600">
                          <Phone className="w-3.5 h-3.5 text-gray-400" />
                          {client.contact_phone}
                        </div>
                        {client.contact_email && (
                          <div className="flex items-center gap-1.5 text-gray-600">
                            <Mail className="w-3.5 h-3.5 text-gray-400" />
                            {client.contact_email}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      {getStatusBadge(client.status)}
                    </td>
                    <td className="px-5 py-4 text-sm text-gray-500">
                      {getSourceLabel(client.source)}
                    </td>
                    <td className="px-5 py-4 text-sm text-gray-400">
                      {formatDate(client.created_at)}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/employee/clients/${client.id}`);
                        }}
                        className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                      >
                        <ArrowUpRight className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
          <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-700 mb-2">Нет клиентов</h3>
          <p className="text-gray-500 mb-6">
            {searchQuery ? 'По вашему запросу ничего не найдено' : 'Добавьте первого клиента'}
          </p>
          <Link
            to="/employee/clients/new"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-yellow-500 hover:bg-yellow-600 text-gray-900 text-sm font-medium rounded-xl transition-colors"
          >
            <UserPlus className="w-4 h-4" />
            Создать клиента
          </Link>
        </div>
      )}
    </div>
  );
};

export default EmployeeClients;
