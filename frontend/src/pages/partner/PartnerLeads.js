import React, { useState, useEffect } from 'react';
import { usePartnerAuth } from '../../context/PartnerAuthContext';
import {
  Users,
  Clock,
  CheckCircle,
  XCircle,
  FileText,
  Search,
  Filter,
  ChevronDown
} from 'lucide-react';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const PartnerLeads = () => {
  const { partner, authFetch } = usePartnerAuth();
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    fetchLeads();
  }, []);

  const fetchLeads = async () => {
    try {
      const response = await authFetch(`${API_URL}/api/partner/leads`);
      if (response.ok) {
        const data = await response.json();
        setLeads(data.leads);
      }
    } catch (error) {
      console.error('Failed to fetch leads:', error);
      toast.error('Ошибка загрузки данных');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'RUB',
      minimumFractionDigits: 0
    }).format(amount || 0);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const getStatusIcon = (status, isPaid) => {
    if (isPaid) return <CheckCircle className="w-5 h-5 text-emerald-500" />;
    switch (status) {
      case 'accepted':
        return <FileText className="w-5 h-5 text-blue-500" />;
      case 'rejected':
        return <XCircle className="w-5 h-5 text-red-500" />;
      default:
        return <Clock className="w-5 h-5 text-amber-500" />;
    }
  };

  const getStatusBadge = (status, isPaid) => {
    if (isPaid) {
      return <span className="px-2 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-medium">Оплачено</span>;
    }
    const styles = {
      draft: 'bg-gray-100 text-gray-600',
      sent: 'bg-blue-100 text-blue-700',
      viewed: 'bg-amber-100 text-amber-700',
      accepted: 'bg-green-100 text-green-700',
      rejected: 'bg-red-100 text-red-700'
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status] || styles.draft}`}>
        {status === 'draft' && 'Черновик'}
        {status === 'sent' && 'Отправлено'}
        {status === 'viewed' && 'Просмотрено'}
        {status === 'accepted' && 'Принято'}
        {status === 'rejected' && 'Отклонено'}
      </span>
    );
  };

  const filteredLeads = leads.filter(lead => {
    if (statusFilter === 'paid' && !lead.is_paid) return false;
    if (statusFilter === 'pending' && lead.is_paid) return false;
    return true;
  });

  // Calculate totals
  const totalAmount = filteredLeads.reduce((sum, l) => sum + (l.total_amount || 0), 0);
  const totalCommission = filteredLeads.reduce((sum, l) => sum + (l.commission || 0), 0);
  const paidCommission = filteredLeads.filter(l => l.is_paid).reduce((sum, l) => sum + (l.commission || 0), 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-amber-200 border-t-amber-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Мои клиенты</h1>
        <p className="text-gray-500 mt-1">Заявки, привлечённые по вашей ссылке</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="text-sm text-gray-500 mb-1">Всего заявок</div>
          <div className="text-2xl font-bold text-gray-900">{filteredLeads.length}</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="text-sm text-gray-500 mb-1">Общая сумма КП</div>
          <div className="text-2xl font-bold text-gray-900">{formatCurrency(totalAmount)}</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="text-sm text-gray-500 mb-1">Комиссия ({partner?.commission_rate || 10}%)</div>
          <div className="text-2xl font-bold text-emerald-600">{formatCurrency(paidCommission)}</div>
          <div className="text-xs text-gray-400 mt-1">
            Потенциально: {formatCurrency(totalCommission)}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Filter className="w-4 h-4" />
            Фильтр:
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                statusFilter === 'all'
                  ? 'bg-amber-100 text-amber-700'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Все ({leads.length})
            </button>
            <button
              onClick={() => setStatusFilter('paid')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                statusFilter === 'paid'
                  ? 'bg-emerald-100 text-emerald-700'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Оплачено ({leads.filter(l => l.is_paid).length})
            </button>
            <button
              onClick={() => setStatusFilter('pending')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                statusFilter === 'pending'
                  ? 'bg-amber-100 text-amber-700'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              В работе ({leads.filter(l => !l.is_paid).length})
            </button>
          </div>
        </div>
      </div>

      {/* Leads table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {filteredLeads.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Заявка
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Дата
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Статус
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Сумма КП
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Комиссия
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Менеджер
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredLeads.map((lead) => (
                  <tr key={lead.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        {getStatusIcon(lead.status, lead.is_paid)}
                        <span className="font-medium text-gray-900">#{lead.id}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {formatDate(lead.created_at)}
                    </td>
                    <td className="px-6 py-4">
                      {getStatusBadge(lead.status, lead.is_paid)}
                    </td>
                    <td className="px-6 py-4 text-right font-medium text-gray-900">
                      {formatCurrency(lead.total_amount)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className={lead.is_paid ? 'text-emerald-600 font-semibold' : 'text-gray-400'}>
                        {formatCurrency(lead.commission)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {lead.manager_name || 'Не назначен'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="px-6 py-12 text-center">
            <Users className="w-12 h-12 mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500">Нет заявок по выбранному фильтру</p>
          </div>
        )}
      </div>

      {/* Info note */}
      <div className="bg-blue-50 rounded-xl border border-blue-200 p-4">
        <p className="text-sm text-blue-700">
          <strong>Примечание:</strong> Комиссия начисляется после оплаты клиентом. Контактные данные клиентов скрыты для защиты конфиденциальности.
        </p>
      </div>
    </div>
  );
};

export default PartnerLeads;
