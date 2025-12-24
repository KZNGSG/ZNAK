import React, { useState, useEffect } from 'react';
import { Phone, User, Calendar, Filter, Send, Check, X, RefreshCw, Users, Building2, Store, Package, Calculator, Scale, HelpCircle, Trash2 } from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

// Типы клиентов с иконками
const CLIENT_TYPES = {
  importer: { label: 'Импортёр', icon: Package, color: 'bg-blue-100 text-blue-700' },
  manufacturer: { label: 'Производитель', icon: Building2, color: 'bg-green-100 text-green-700' },
  retailer: { label: 'Розница', icon: Store, color: 'bg-purple-100 text-purple-700' },
  wholesaler: { label: 'Оптовик', icon: Package, color: 'bg-orange-100 text-orange-700' },
  marketplace: { label: 'Маркетплейс', icon: Store, color: 'bg-pink-100 text-pink-700' },
  accountant: { label: 'Бухгалтер', icon: Calculator, color: 'bg-yellow-100 text-yellow-700' },
  consultant: { label: 'Консультант', icon: Scale, color: 'bg-indigo-100 text-indigo-700' },
  other: { label: 'Другое', icon: HelpCircle, color: 'bg-gray-100 text-gray-700' }
};

const STATUS_LABELS = {
  new: { label: 'Новый', color: 'bg-blue-100 text-blue-800' },
  contacted: { label: 'Связались', color: 'bg-yellow-100 text-yellow-800' },
  client: { label: 'Клиент', color: 'bg-green-100 text-green-800' },
  inactive: { label: 'Неактивен', color: 'bg-gray-100 text-gray-800' }
};

const getToken = () => {
  return localStorage.getItem('employee_token') ||
         localStorage.getItem('admin_token') ||
         localStorage.getItem('auth_token');
};

const AdminTelegramPage = () => {
  const [leads, setLeads] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({ status: 'all', clientType: 'all', hasPhone: 'all' });
  const [broadcastText, setBroadcastText] = useState('');
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });
  const [selectedLeads, setSelectedLeads] = useState(new Set());
  const [selectAll, setSelectAll] = useState(false);

  useEffect(() => {
    fetchLeads();
  }, [filter]);

  const fetchLeads = async () => {
    try {
      const token = getToken();
      let url = API_URL + '/api/admin/telegram-leads?';
      const params = [];

      if (filter.status !== 'all') params.push('status=' + filter.status);
      if (filter.clientType !== 'all') params.push('client_type=' + filter.clientType);
      if (filter.hasPhone === 'yes') params.push('has_phone=true');
      if (filter.hasPhone === 'no') params.push('has_phone=false');

      url += params.join('&');

      const response = await fetch(url, {
        headers: { 'Authorization': 'Bearer ' + token }
      });

      const data = await response.json();
      setLeads(data.leads || []);
      setStats(data.stats || {});
      setSelectedLeads(new Set());
      setSelectAll(false);
    } catch (error) {
      console.error('Error fetching leads:', error);
      setMessage({ text: 'Ошибка загрузки', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const updateLead = async (leadId, updates) => {
    try {
      const token = getToken();
      await fetch(API_URL + '/api/admin/telegram-leads/' + leadId, {
        method: 'PUT',
        headers: {
          'Authorization': 'Bearer ' + token,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updates)
      });
      fetchLeads();
    } catch (error) {
      console.error('Error updating lead:', error);
    }
  };

  const deleteLead = async (leadId, leadName) => {
    if (!window.confirm(`Удалить пользователя ${leadName}?`)) {
      return;
    }

    try {
      const token = getToken();
      await fetch(API_URL + '/api/admin/telegram-leads/' + leadId, {
        method: 'DELETE',
        headers: {
          'Authorization': 'Bearer ' + token
        }
      });
      setMessage({ text: 'Пользователь удалён', type: 'success' });
      fetchLeads();
    } catch (error) {
      console.error('Error deleting lead:', error);
      setMessage({ text: 'Ошибка удаления', type: 'error' });
    }
  };

  const deleteSelected = async () => {
    if (selectedLeads.size === 0) return;

    if (!window.confirm(`Удалить ${selectedLeads.size} выбранных пользователей?`)) {
      return;
    }

    try {
      const token = getToken();
      let deleted = 0;
      for (const leadId of selectedLeads) {
        await fetch(API_URL + '/api/admin/telegram-leads/' + leadId, {
          method: 'DELETE',
          headers: { 'Authorization': 'Bearer ' + token }
        });
        deleted++;
      }
      setMessage({ text: `Удалено: ${deleted}`, type: 'success' });
      setSelectedLeads(new Set());
      fetchLeads();
    } catch (error) {
      console.error('Error deleting leads:', error);
      setMessage({ text: 'Ошибка удаления', type: 'error' });
    }
  };

  const sendBroadcast = async () => {
    if (!broadcastText.trim()) {
      setMessage({ text: 'Введите текст сообщения', type: 'error' });
      return;
    }

    if (selectedLeads.size === 0) {
      setMessage({ text: 'Выберите получателей', type: 'error' });
      return;
    }

    if (!window.confirm(`Отправить рассылку ${selectedLeads.size} получателям?`)) {
      return;
    }

    setSending(true);
    setMessage({ text: '', type: '' });

    try {
      const token = getToken();
      const response = await fetch(API_URL + '/api/admin/telegram-broadcast', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + token,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: broadcastText,
          lead_ids: Array.from(selectedLeads)
        })
      });

      const data = await response.json();
      setMessage({
        text: `Отправлено: ${data.sent}, ошибок: ${data.failed}`,
        type: data.sent > 0 ? 'success' : 'error'
      });
      if (data.sent > 0) {
        setBroadcastText('');
        setSelectedLeads(new Set());
        setSelectAll(false);
      }
    } catch (error) {
      setMessage({ text: 'Ошибка отправки', type: 'error' });
    } finally {
      setSending(false);
    }
  };

  const toggleSelectAll = () => {
    if (selectAll) {
      setSelectedLeads(new Set());
    } else {
      setSelectedLeads(new Set(leads.map(l => l.id)));
    }
    setSelectAll(!selectAll);
  };

  const toggleLead = (id) => {
    const newSelected = new Set(selectedLeads);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedLeads(newSelected);
    setSelectAll(newSelected.size === leads.length);
  };

  const selectByType = (type) => {
    const filtered = leads.filter(l => l.client_type === type);
    setSelectedLeads(new Set(filtered.map(l => l.id)));
    setSelectAll(false);
  };

  const selectWithPhone = () => {
    const filtered = leads.filter(l => l.phone && l.phone.length > 5);
    setSelectedLeads(new Set(filtered.map(l => l.id)));
    setSelectAll(false);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleString('ru-RU', {
      day: '2-digit', month: '2-digit', year: '2-digit',
      hour: '2-digit', minute: '2-digit'
    });
  };

  const formatPhone = (phone) => {
    if (!phone) return null;
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 11) {
      return `+${cleaned[0]} (${cleaned.slice(1,4)}) ${cleaned.slice(4,7)}-${cleaned.slice(7,9)}-${cleaned.slice(9)}`;
    }
    return phone;
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <RefreshCw className="w-6 h-6 animate-spin text-blue-600" />
        <span className="ml-2">Загрузка...</span>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Telegram Бот</h1>
        <button
          onClick={fetchLeads}
          className="flex items-center gap-2 px-3 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
        >
          <RefreshCw className="w-4 h-4" />
          Обновить
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <div className="bg-white p-4 rounded-xl shadow-sm border">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Users className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-800">{stats.total || 0}</div>
              <div className="text-sm text-gray-500">Всего</div>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <Phone className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-800">{stats.with_phone || 0}</div>
              <div className="text-sm text-gray-500">С телефоном</div>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Check className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-800">{stats.subscribed || 0}</div>
              <div className="text-sm text-gray-500">Подписчики</div>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-100 rounded-lg">
              <Calendar className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-800">{stats.today || 0}</div>
              <div className="text-sm text-gray-500">Сегодня</div>
            </div>
          </div>
        </div>
      </div>

      {/* Broadcast Section */}
      <div className="bg-white p-4 rounded-xl shadow-sm border mb-6">
        <div className="flex items-center gap-2 mb-3">
          <Send className="w-5 h-5 text-blue-600" />
          <h2 className="font-semibold text-gray-800">Рассылка</h2>
          {selectedLeads.size > 0 && (
            <span className="ml-auto text-sm bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
              Выбрано: {selectedLeads.size}
            </span>
          )}
        </div>

        <textarea
          className="w-full border border-gray-200 rounded-lg p-3 mb-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          rows="3"
          placeholder="Текст сообщения..."
          value={broadcastText}
          onChange={(e) => setBroadcastText(e.target.value)}
        />

        <div className="flex flex-wrap gap-2 items-center">
          <div className="flex gap-1 flex-wrap">
            <button
              className="text-xs px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded"
              onClick={toggleSelectAll}
            >
              {selectAll ? 'Снять все' : 'Выбрать все'}
            </button>
            <button
              className="text-xs px-2 py-1 bg-green-100 hover:bg-green-200 text-green-700 rounded"
              onClick={selectWithPhone}
            >
              С телефоном
            </button>
            {Object.entries(CLIENT_TYPES).slice(0, 4).map(([key, val]) => (
              <button
                key={key}
                className={`text-xs px-2 py-1 rounded ${val.color} hover:opacity-80`}
                onClick={() => selectByType(key)}
              >
                {val.label}
              </button>
            ))}
          </div>

          <div className="ml-auto flex gap-2">
            {selectedLeads.size > 0 && (
              <button
                className="flex items-center gap-1 bg-red-100 text-red-700 px-3 py-2 rounded-lg hover:bg-red-200"
                onClick={deleteSelected}
              >
                <Trash2 className="w-4 h-4" />
                Удалить
              </button>
            )}
            <button
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={sendBroadcast}
              disabled={sending || selectedLeads.size === 0}
            >
              {sending ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              Отправить
            </button>
          </div>
        </div>

        {message.text && (
          <div className={`mt-3 p-2 rounded text-sm ${
            message.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
          }`}>
            {message.text}
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-xl shadow-sm border mb-4">
        <div className="flex items-center gap-2 mb-3">
          <Filter className="w-4 h-4 text-gray-500" />
          <span className="text-sm font-medium text-gray-700">Фильтры</span>
        </div>
        <div className="flex flex-wrap gap-2">
          <select
            className="text-sm border rounded-lg px-3 py-2 bg-white"
            value={filter.status}
            onChange={(e) => setFilter({...filter, status: e.target.value})}
          >
            <option value="all">Все статусы</option>
            <option value="new">Новые</option>
            <option value="contacted">Связались</option>
            <option value="client">Клиенты</option>
            <option value="inactive">Неактивные</option>
          </select>

          <select
            className="text-sm border rounded-lg px-3 py-2 bg-white"
            value={filter.clientType}
            onChange={(e) => setFilter({...filter, clientType: e.target.value})}
          >
            <option value="all">Все типы</option>
            {Object.entries(CLIENT_TYPES).map(([key, val]) => (
              <option key={key} value={key}>{val.label}</option>
            ))}
          </select>

          <select
            className="text-sm border rounded-lg px-3 py-2 bg-white"
            value={filter.hasPhone}
            onChange={(e) => setFilter({...filter, hasPhone: e.target.value})}
          >
            <option value="all">Телефон: все</option>
            <option value="yes">С телефоном</option>
            <option value="no">Без телефона</option>
          </select>
        </div>
      </div>

      {/* Leads Table */}
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={selectAll}
                    onChange={toggleSelectAll}
                    className="w-4 h-4 rounded border-gray-300"
                  />
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Клиент</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Тип</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Телефон</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Запросы</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Статус</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Дата</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {leads.map((lead) => {
                const clientType = CLIENT_TYPES[lead.client_type] || null;
                const status = STATUS_LABELS[lead.status] || STATUS_LABELS.new;
                const IconComponent = clientType?.icon || User;

                return (
                  <tr
                    key={lead.id}
                    className={`hover:bg-gray-50 ${selectedLeads.has(lead.id) ? 'bg-blue-50' : ''}`}
                  >
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selectedLeads.has(lead.id)}
                        onChange={() => toggleLead(lead.id)}
                        className="w-4 h-4 rounded border-gray-300"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                          <User className="w-5 h-5 text-gray-500" />
                        </div>
                        <div>
                          <div className="font-medium text-gray-800">
                            {lead.first_name} {lead.last_name}
                          </div>
                          <div className="text-sm text-gray-500">
                            {lead.username ? `@${lead.username}` : 'без username'}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {clientType ? (
                        <span className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full ${clientType.color}`}>
                          <IconComponent className="w-3 h-3" />
                          {clientType.label}
                        </span>
                      ) : (
                        <span className="text-gray-400 text-sm">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {lead.phone ? (
                        <a
                          href={`tel:${lead.phone}`}
                          className="flex items-center gap-1 text-blue-600 hover:underline"
                        >
                          <Phone className="w-4 h-4" />
                          {formatPhone(lead.phone)}
                        </a>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm">
                        <span className="font-medium">{lead.queries_count || 0}</span>
                        <span className="text-gray-500"> запр.</span>
                      </div>
                      {lead.last_query && (
                        <div className="text-xs text-gray-500 truncate max-w-[120px]" title={lead.last_query}>
                          {lead.last_query}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <select
                        className={`text-xs px-2 py-1 rounded-full border-0 ${status.color}`}
                        value={lead.status || 'new'}
                        onChange={(e) => updateLead(lead.id, { status: e.target.value })}
                      >
                        <option value="new">Новый</option>
                        <option value="contacted">Связались</option>
                        <option value="client">Клиент</option>
                        <option value="inactive">Неактивен</option>
                      </select>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {formatDate(lead.created_at)}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => deleteLead(lead.id, `${lead.first_name} ${lead.last_name}`)}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Удалить"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {leads.length === 0 && (
          <div className="p-12 text-center">
            <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <div className="text-gray-500">Лидов пока нет</div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminTelegramPage;
