import React, { useState, useEffect } from 'react';
import { useEmployeeAuth } from '../../context/EmployeeAuthContext';
import {
  Handshake,
  Plus,
  Search,
  Filter,
  Mail,
  Phone,
  Building2,
  User,
  Copy,
  Check,
  Send,
  Eye,
  Edit2,
  Trash2,
  X,
  AlertCircle,
  TrendingUp,
  Users,
  DollarSign
} from 'lucide-react';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const EmployeePartners = () => {
  const { authFetch, isSuperAdmin } = useEmployeeAuth();
  const [partners, setPartners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedPartner, setSelectedPartner] = useState(null);
  const [commissionModal, setCommissionModal] = useState({ open: false, partner: null });
  const [copiedCode, setCopiedCode] = useState(null);

  useEffect(() => {
    fetchPartners();
  }, [statusFilter]);

  const fetchPartners = async () => {
    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.append('status', statusFilter);

      const response = await authFetch(`${API_URL}/api/employee/partners?${params}`);
      if (response.ok) {
        const data = await response.json();
        setPartners(data.partners);
      }
    } catch (error) {
      console.error('Failed to fetch partners:', error);
      toast.error('Ошибка загрузки партнёров');
    } finally {
      setLoading(false);
    }
  };

  const copyRefLink = (refCode) => {
    const link = `${window.location.origin}/quote?ref=${refCode}`;
    navigator.clipboard.writeText(link);
    setCopiedCode(refCode);
    toast.success('Ссылка скопирована!');
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const sendInvitation = async (partnerId) => {
    try {
      const response = await authFetch(`${API_URL}/api/employee/partners/${partnerId}/invite`, {
        method: 'POST'
      });

      if (response.ok) {
        toast.success('Приглашение отправлено');
        fetchPartners();
      } else {
        const data = await response.json();
        toast.error(data.detail || 'Ошибка отправки');
      }
    } catch (error) {
      console.error('Failed to send invitation:', error);
      toast.error('Ошибка отправки приглашения');
    }
  };


  const updateCommission = async (partnerId, newRate, notify, reason) => {
    try {
      const response = await authFetch(`${API_URL}/api/employee/partners/${partnerId}/commission`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          commission_rate: newRate,
          notify_partner: notify,
          reason: reason || null
        })
      });

      if (response.ok) {
        const data = await response.json();
        toast.success(data.notified 
          ? "Комиссия изменена, партнёр уведомлён" 
          : "Комиссия изменена");
        setCommissionModal({ open: false, partner: null });
        fetchPartners();
      } else {
        const error = await response.json();
        toast.error(error.detail || "Ошибка изменения комиссии");
      }
    } catch (error) {
      console.error("Failed to update commission:", error);
      toast.error("Ошибка обновления");
    }
  };

  const togglePartnerStatus = async (partnerId, activate) => {
    try {
      const endpoint = activate ? 'activate' : 'deactivate';
      const response = await authFetch(`${API_URL}/api/employee/partners/${partnerId}/${endpoint}`, {
        method: 'POST'
      });

      if (response.ok) {
        toast.success(activate ? 'Партнёр активирован' : 'Партнёр деактивирован');
        fetchPartners();
      } else {
        const data = await response.json();
        toast.error(data.detail || 'Ошибка');
      }
    } catch (error) {
      console.error('Failed to toggle status:', error);
      toast.error('Ошибка изменения статуса');
    }
  };

  const deletePartner = async (partnerId) => {
    if (!window.confirm('Удалить партнёра? Это действие необратимо.')) return;

    try {
      const response = await authFetch(`${API_URL}/api/employee/partners/${partnerId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        toast.success('Партнёр удалён');
        fetchPartners();
        setSelectedPartner(null);
      } else {
        const data = await response.json();
        toast.error(data.detail || 'Ошибка удаления');
      }
    } catch (error) {
      console.error('Failed to delete partner:', error);
      toast.error('Ошибка удаления');
    }
  };

  const filteredPartners = partners.filter(p =>
    p.contact_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.contact_email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.company_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.ref_code?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusBadge = (status) => {
    const styles = {
      active: 'bg-emerald-100 text-emerald-700',
      pending: 'bg-amber-100 text-amber-700',
      inactive: 'bg-gray-100 text-gray-600'
    };
    const labels = {
      active: 'Активен',
      pending: 'Ожидает',
      inactive: 'Неактивен'
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status] || styles.pending}`}>
        {labels[status] || status}
      </span>
    );
  };

  // Stats
  const activeCount = partners.filter(p => p.status === 'active').length;
  const pendingCount = partners.filter(p => p.status === 'pending').length;
  const totalLeads = partners.reduce((sum, p) => sum + (p.total_leads || 0), 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-yellow-200 border-t-yellow-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Handshake className="w-7 h-7 text-yellow-500" />
            Партнёры
          </h1>
          <p className="text-gray-500 mt-1">Управление партнёрской программой</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-white font-medium rounded-xl transition-colors"
        >
          <Plus className="w-5 h-5" />
          Добавить партнёра
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="text-2xl font-bold text-gray-900">{partners.length}</div>
          <div className="text-sm text-gray-500">Всего партнёров</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="text-2xl font-bold text-emerald-600">{activeCount}</div>
          <div className="text-sm text-gray-500">Активных</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="text-2xl font-bold text-amber-600">{pendingCount}</div>
          <div className="text-sm text-gray-500">Ожидают активации</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="text-2xl font-bold text-blue-600">{totalLeads}</div>
          <div className="text-sm text-gray-500">Привлечено клиентов</div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Поиск по имени, email, компании или коду..."
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500/20 focus:border-yellow-500"
            />
          </div>
          <div className="flex gap-2">
            {['all', 'active', 'pending', 'inactive'].map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  statusFilter === status
                    ? 'bg-yellow-100 text-yellow-700'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {status === 'all' && 'Все'}
                {status === 'active' && 'Активные'}
                {status === 'pending' && 'Ожидают'}
                {status === 'inactive' && 'Неактивные'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Partners table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {filteredPartners.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Партнёр
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Контакты
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Код
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                    Комиссия
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                    Клиенты
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                    Статус
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    Действия
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredPartners.map((partner) => (
                  <tr key={partner.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-yellow-100 flex items-center justify-center">
                          {partner.partner_type === 'legal' ? (
                            <Building2 className="w-5 h-5 text-yellow-600" />
                          ) : (
                            <User className="w-5 h-5 text-yellow-600" />
                          )}
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">{partner.contact_name}</div>
                          {partner.company_name && (
                            <div className="text-sm text-gray-500">{partner.company_name}</div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-600">{partner.contact_email}</div>
                      <div className="text-sm text-gray-400">{partner.contact_phone}</div>
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => copyRefLink(partner.ref_code)}
                        className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded font-mono text-sm transition-colors"
                      >
                        {partner.ref_code}
                        {copiedCode === partner.ref_code ? (
                          <Check className="w-4 h-4 text-emerald-500" />
                        ) : (
                          <Copy className="w-4 h-4 text-gray-400" />
                        )}
                      </button>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button onClick={() => setCommissionModal({ open: true, partner })} className="font-medium text-amber-600 hover:text-amber-700 hover:bg-amber-50 px-3 py-1 rounded-lg transition-colors" title="Изменить комиссию">{partner.commission_rate}%</button>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="font-medium text-gray-900">{partner.total_leads || 0}</span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      {getStatusBadge(partner.status)}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => sendInvitation(partner.id)}
                          className="p-2 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Отправить приглашение"
                        >
                          <Send className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setSelectedPartner(partner)}
                          className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                          title="Подробнее"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {partner.status === 'active' ? (
                          <button
                            onClick={() => togglePartnerStatus(partner.id, false)}
                            className="p-2 text-gray-400 hover:text-amber-500 hover:bg-amber-50 rounded-lg transition-colors"
                            title="Деактивировать"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        ) : (
                          <button
                            onClick={() => togglePartnerStatus(partner.id, true)}
                            className="p-2 text-gray-400 hover:text-emerald-500 hover:bg-emerald-50 rounded-lg transition-colors"
title="Активировать"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => deletePartner(partner.id)}
                          className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          title="Удалить партнёра"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="px-6 py-12 text-center">
            <Handshake className="w-12 h-12 mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500">Партнёры не найдены</p>
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <CreatePartnerModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
            fetchPartners();
          }}
          authFetch={authFetch}
        />
      )}

      {/* Detail Modal */}
      {selectedPartner && (
        <PartnerDetailModal
          partner={selectedPartner}
          onClose={() => setSelectedPartner(null)}
          onDelete={isSuperAdmin ? deletePartner : null}
          authFetch={authFetch}
        />
      )}

      {/* Commission Edit Modal */}
      <CommissionEditModal
        isOpen={commissionModal.open}
        partner={commissionModal.partner}
        onClose={() => setCommissionModal({ open: false, partner: null })}
        onSave={updateCommission}
      />
    </div>
  );
};

// Create Partner Modal
const CreatePartnerModal = ({ onClose, onSuccess, authFetch }) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    partner_type: 'individual',
    contact_name: '',
    contact_phone: '',
    contact_email: '',
    inn: '',
    company_name: '',
    commission_rate: 10
  });

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await authFetch(`${API_URL}/api/employee/partners`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        const data = await response.json();
        toast.success('Партнёр создан');
        onSuccess();
      } else {
        const data = await response.json();
        toast.error(data.detail || 'Ошибка создания');
      }
    } catch (error) {
      console.error('Failed to create partner:', error);
      toast.error('Ошибка создания партнёра');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Новый партнёр</h2>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Тип партнёра</label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="partner_type"
                  value="individual"
                  checked={formData.partner_type === 'individual'}
                  onChange={handleChange}
                  className="text-yellow-500 focus:ring-yellow-500"
                />
                <span>Физлицо</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="partner_type"
                  value="legal"
                  checked={formData.partner_type === 'legal'}
                  onChange={handleChange}
                  className="text-yellow-500 focus:ring-yellow-500"
                />
                <span>Юрлицо</span>
              </label>
            </div>
          </div>

          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Контактное лицо *</label>
            <input
              type="text"
              name="contact_name"
              value={formData.contact_name}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500/20 focus:border-yellow-500"
              placeholder="Иван Иванов"
            />
          </div>

          {/* Company name (for legal) */}
          {formData.partner_type === 'legal' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Название компании</label>
              <input
                type="text"
                name="company_name"
                value={formData.company_name}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500/20 focus:border-yellow-500"
                placeholder="ООО Компания"
              />
            </div>
          )}

          {/* INN (for legal) */}
          {formData.partner_type === 'legal' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">ИНН *</label>
              <input
                type="text"
                name="inn"
                value={formData.inn}
                onChange={handleChange}
                required={formData.partner_type === 'legal'}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500/20 focus:border-yellow-500"
                placeholder="1234567890"
              />
            </div>
          )}

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Email *</label>
            <input
              type="email"
              name="contact_email"
              value={formData.contact_email}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500/20 focus:border-yellow-500"
              placeholder="partner@company.ru"
            />
          </div>

          {/* Phone */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Телефон *</label>
            <input
              type="tel"
              name="contact_phone"
              value={formData.contact_phone}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500/20 focus:border-yellow-500"
              placeholder="+7 (999) 123-45-67"
            />
          </div>

          {/* Commission */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Комиссия (%)</label>
            <input
              type="number"
              name="commission_rate"
              value={formData.commission_rate}
              onChange={handleChange}
              min="1"
              max="50"
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500/20 focus:border-yellow-500"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-200 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
            >
              Отмена
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
            >
              {loading ? 'Создание...' : 'Создать'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Partner Detail Modal
const PartnerDetailModal = ({ partner, onClose, onDelete, authFetch }) => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, [partner.id]);

  const fetchStats = async () => {
    try {
      const response = await authFetch(`${API_URL}/api/employee/partners/${partner.id}`);
      if (response.ok) {
        const data = await response.json();
        setStats(data.stats);
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error);
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

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Информация о партнёре</h2>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Partner info */}
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-yellow-100 flex items-center justify-center">
              {partner.partner_type === 'legal' ? (
                <Building2 className="w-8 h-8 text-yellow-600" />
              ) : (
                <User className="w-8 h-8 text-yellow-600" />
              )}
            </div>
            <div>
              <h3 className="text-xl font-semibold text-gray-900">{partner.contact_name}</h3>
              {partner.company_name && (
                <p className="text-gray-500">{partner.company_name}</p>
              )}
              <p className="text-sm text-gray-400">
                {partner.partner_type === 'legal' ? 'Юридическое лицо' : 'Физическое лицо'}
              </p>
            </div>
          </div>

          {/* Contact info */}
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <Mail className="w-5 h-5 text-gray-400" />
              <span>{partner.contact_email}</span>
            </div>
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <Phone className="w-5 h-5 text-gray-400" />
              <span>{partner.contact_phone}</span>
            </div>
            {partner.inn && (
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <Building2 className="w-5 h-5 text-gray-400" />
                <span>ИНН: {partner.inn}</span>
              </div>
            )}
          </div>

          {/* Ref code */}
          <div className="p-4 bg-yellow-50 rounded-xl border border-yellow-200">
            <div className="text-sm text-yellow-700 mb-1">Реферальный код</div>
            <div className="font-mono text-xl font-bold text-yellow-800">{partner.ref_code}</div>
            <div className="text-xs text-yellow-600 mt-1">Комиссия: {partner.commission_rate}%</div>
          </div>

          {/* Stats */}
          {loading ? (
            <div className="flex justify-center py-4">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-yellow-200 border-t-yellow-500"></div>
            </div>
          ) : stats && (
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-gray-50 rounded-lg text-center">
                <div className="text-2xl font-bold text-gray-900">{stats.total_leads || 0}</div>
                <div className="text-sm text-gray-500">Клиентов</div>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg text-center">
                <div className="text-2xl font-bold text-gray-900">{formatCurrency(stats.total_amount)}</div>
                <div className="text-sm text-gray-500">Сумма КП</div>
              </div>
              <div className="p-4 bg-emerald-50 rounded-lg text-center">
                <div className="text-2xl font-bold text-emerald-600">{formatCurrency(stats.paid_amount)}</div>
                <div className="text-sm text-gray-500">Оплачено</div>
              </div>
              <div className="p-4 bg-purple-50 rounded-lg text-center">
                <div className="text-2xl font-bold text-purple-600">{formatCurrency(stats.total_commission)}</div>
                <div className="text-sm text-gray-500">Комиссия</div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t border-gray-200">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-200 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
            >
              Закрыть
            </button>
            {onDelete && (
              <button
                onClick={() => onDelete(partner.id)}
                className="px-4 py-2 border border-red-200 text-red-600 font-medium rounded-lg hover:bg-red-50 transition-colors"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// Commission Edit Modal Component
const CommissionEditModal = ({ isOpen, partner, onClose, onSave }) => {
  const [newRate, setNewRate] = useState(partner?.commission_rate || 1);
  const [notifyPartner, setNotifyPartner] = useState(true);
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (partner) {
      setNewRate(partner.commission_rate || 1);
      setNotifyPartner(true);
      setReason("");
    }
  }, [partner]);

  if (!isOpen || !partner) return null;

  const isIncrease = newRate > (partner.commission_rate || 1);
  const isDecrease = newRate < (partner.commission_rate || 1);

  const handleSave = async () => {
    setSaving(true);
    await onSave(partner.id, newRate, notifyPartner, reason);
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Изменить комиссию</h3>
            <p className="text-sm text-gray-500">{partner.contact_name}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="flex items-center justify-center gap-6 py-4 bg-gradient-to-r from-amber-50 to-yellow-50 rounded-xl">
            <div className="text-center">
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Текущая</p>
              <p className="text-2xl font-bold text-gray-400 line-through">{partner.commission_rate}%</p>
            </div>
            <div className="text-2xl text-amber-400">→</div>
            <div className="text-center">
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Новая</p>
              <p className={`text-3xl font-bold ${isIncrease ? "text-emerald-500" : isDecrease ? "text-amber-500" : "text-gray-600"}`}>
                {newRate}%
              </p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Размер комиссии: <span className="text-amber-600 font-bold">{newRate}%</span>
            </label>
            <input
              type="range"
              min="0.5"
              max="20"
              step="0.5"
              value={newRate}
              onChange={(e) => setNewRate(parseFloat(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-amber-500"
            />
            <div className="flex justify-between text-xs text-gray-400 mt-1">
              <span>0.5%</span>
              <span>10%</span>
              <span>20%</span>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {[1, 2, 3, 5, 10, 15].map((rate) => (
              <button
                key={rate}
                onClick={() => setNewRate(rate)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  newRate === rate ? "bg-amber-500 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {rate}%
              </button>
            ))}
          </div>

          <label className="flex items-start gap-3 p-4 bg-blue-50 rounded-xl cursor-pointer hover:bg-blue-100 transition-colors">
            <input
              type="checkbox"
              checked={notifyPartner}
              onChange={(e) => setNotifyPartner(e.target.checked)}
              className="w-5 h-5 rounded border-gray-300 text-amber-500 focus:ring-amber-500 mt-0.5"
            />
            <div>
              <p className="font-medium text-gray-900">Уведомить партнёра</p>
              <p className="text-sm text-gray-500">
                {isIncrease ? "Отправим поздравление о повышении комиссии" : "Отправим уведомление об изменении условий"}
              </p>
            </div>
          </label>

          {notifyPartner && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Комментарий для партнёра <span className="text-gray-400">(необязательно)</span>
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder={isIncrease ? "Например: За отличные результаты!" : "Причина изменения..."}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent resize-none"
                rows={2}
              />
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-gray-100 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-3 border border-gray-200 text-gray-700 font-medium rounded-xl hover:bg-gray-50 transition-colors"
          >
            Отмена
          </button>
          <button
            onClick={handleSave}
            disabled={saving || newRate === partner.commission_rate}
            className={`flex-1 px-4 py-3 font-medium rounded-xl transition-colors flex items-center justify-center gap-2 ${
              newRate === partner.commission_rate
                ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                : isIncrease
                  ? "bg-emerald-500 hover:bg-emerald-600 text-white"
                  : "bg-amber-500 hover:bg-amber-600 text-white"
            }`}
          >
            {saving ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                {isIncrease ? <TrendingUp className="w-5 h-5" /> : <Edit2 className="w-5 h-5" />}
                {isIncrease ? "Повысить" : "Сохранить"}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default EmployeePartners;
