import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import AdminLayout from '../../components/admin/AdminLayout';
import {
  Search,
  Filter,
  Phone,
  Mail,
  MessageSquare,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Eye
} from 'lucide-react';
import { motion } from 'framer-motion';

const API_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

const AdminContactsPage = () => {
  const { token } = useAuth();
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [selectedContact, setSelectedContact] = useState(null);
  const [showModal, setShowModal] = useState(false);

  const limit = 20;

  useEffect(() => {
    fetchContacts();
  }, [search, statusFilter, page]);

  const fetchContacts = async () => {
    try {
      const params = new URLSearchParams({
        limit: limit.toString(),
        offset: (page * limit).toString()
      });

      if (search) params.append('search', search);
      if (statusFilter) params.append('status', statusFilter);

      const response = await fetch(`${API_URL}/api/admin/contacts?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setContacts(data.contacts);
        setTotal(data.total);
      }
    } catch (error) {
      console.error('Failed to fetch contacts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (contactId, status, notes = '') => {
    try {
      const response = await fetch(`${API_URL}/api/admin/contacts/${contactId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status, notes })
      });

      if (response.ok) {
        fetchContacts();
        setShowModal(false);
        setSelectedContact(null);
      }
    } catch (error) {
      console.error('Failed to update contact:', error);
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      new: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
      in_progress: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
      completed: 'bg-green-500/10 text-green-400 border-green-500/20',
      rejected: 'bg-red-500/10 text-red-400 border-red-500/20'
    };

    const labels = {
      new: 'Новая',
      in_progress: 'В работе',
      completed: 'Завершена',
      rejected: 'Отклонена'
    };

    const icons = {
      new: AlertCircle,
      in_progress: Clock,
      completed: CheckCircle,
      rejected: XCircle
    };

    const Icon = icons[status] || AlertCircle;

    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium border ${styles[status] || styles.new}`}>
        <Icon size={12} />
        {labels[status] || status}
      </span>
    );
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getRequestTypeLabel = (type) => {
    const types = {
      'consultation': 'Консультация',
      'commercial': 'Коммерческое предложение',
      'equipment': 'Оснащение',
      'import': 'Импорт',
      'other': 'Другое'
    };
    return types[type] || type;
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">Заявки</h1>
            <p className="text-gray-400 mt-1">Всего: {total}</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-4">
          <div className="relative flex-1 min-w-[300px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
            <input
              type="text"
              placeholder="Поиск по имени, телефону, email..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(0);
              }}
              className="w-full pl-10 pr-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
            />
          </div>

          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(0);
              }}
              className="pl-10 pr-8 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-yellow-500"
            >
              <option value="">Все статусы</option>
              <option value="new">Новые</option>
              <option value="in_progress">В работе</option>
              <option value="completed">Завершенные</option>
              <option value="rejected">Отклоненные</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="bg-gray-800 rounded-2xl border border-gray-700 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-500"></div>
            </div>
          ) : contacts.length === 0 ? (
            <div className="text-center py-16 text-gray-500">
              Заявки не найдены
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-700/50">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-medium text-gray-400">#</th>
                    <th className="px-6 py-4 text-left text-sm font-medium text-gray-400">Контакт</th>
                    <th className="px-6 py-4 text-left text-sm font-medium text-gray-400">Тип</th>
                    <th className="px-6 py-4 text-left text-sm font-medium text-gray-400">Комментарий</th>
                    <th className="px-6 py-4 text-left text-sm font-medium text-gray-400">Статус</th>
                    <th className="px-6 py-4 text-left text-sm font-medium text-gray-400">Дата</th>
                    <th className="px-6 py-4 text-right text-sm font-medium text-gray-400">Действия</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {contacts.map((contact) => (
                    <motion.tr
                      key={contact.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="hover:bg-gray-700/30 transition-colors"
                    >
                      <td className="px-6 py-4 text-gray-500">
                        #{contact.id}
                      </td>
                      <td className="px-6 py-4">
                        <div className="space-y-1">
                          <div className="text-white font-medium">{contact.name}</div>
                          <div className="flex items-center gap-2 text-gray-400 text-sm">
                            <Phone size={14} />
                            {contact.phone}
                          </div>
                          {contact.email && (
                            <div className="flex items-center gap-2 text-gray-400 text-sm">
                              <Mail size={14} />
                              {contact.email}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-3 py-1 bg-gray-700 text-gray-300 rounded-lg text-sm">
                          {getRequestTypeLabel(contact.request_type)}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="max-w-xs truncate text-gray-400 text-sm">
                          {contact.comment || '-'}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {getStatusBadge(contact.status)}
                      </td>
                      <td className="px-6 py-4 text-gray-400 text-sm">
                        {formatDate(contact.created_at)}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => {
                              setSelectedContact(contact);
                              setShowModal(true);
                            }}
                            className="p-2 text-gray-400 hover:text-yellow-500 hover:bg-yellow-500/10 rounded-lg transition-all"
                          >
                            <Eye size={18} />
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {total > limit && (
            <div className="px-6 py-4 border-t border-gray-700 flex items-center justify-between">
              <div className="text-gray-400 text-sm">
                Показано {page * limit + 1} - {Math.min((page + 1) * limit, total)} из {total}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage(p => Math.max(0, p - 1))}
                  disabled={page === 0}
                  className="px-4 py-2 bg-gray-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-600 transition-colors"
                >
                  Назад
                </button>
                <button
                  onClick={() => setPage(p => p + 1)}
                  disabled={(page + 1) * limit >= total}
                  className="px-4 py-2 bg-gray-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-600 transition-colors"
                >
                  Вперед
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Contact Modal */}
        {showModal && selectedContact && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-gray-800 rounded-2xl p-6 w-full max-w-lg border border-gray-700"
            >
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h3 className="text-xl font-bold text-white">Заявка #{selectedContact.id}</h3>
                  <p className="text-gray-400 text-sm mt-1">{formatDate(selectedContact.created_at)}</p>
                </div>
                {getStatusBadge(selectedContact.status)}
              </div>

              <div className="space-y-4 mb-6">
                <div className="p-4 bg-gray-700/30 rounded-xl space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-yellow-500/10 flex items-center justify-center">
                      <span className="text-yellow-500 font-bold">
                        {selectedContact.name?.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <div className="text-white font-medium">{selectedContact.name}</div>
                      <div className="text-gray-400 text-sm">
                        {getRequestTypeLabel(selectedContact.request_type)}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-gray-300">
                    <Phone size={16} className="text-gray-500" />
                    <a href={`tel:${selectedContact.phone}`} className="hover:text-yellow-500">
                      {selectedContact.phone}
                    </a>
                  </div>

                  {selectedContact.email && (
                    <div className="flex items-center gap-2 text-gray-300">
                      <Mail size={16} className="text-gray-500" />
                      <a href={`mailto:${selectedContact.email}`} className="hover:text-yellow-500">
                        {selectedContact.email}
                      </a>
                    </div>
                  )}
                </div>

                {selectedContact.comment && (
                  <div className="p-4 bg-gray-700/30 rounded-xl">
                    <div className="flex items-center gap-2 text-gray-400 text-sm mb-2">
                      <MessageSquare size={14} />
                      Комментарий
                    </div>
                    <p className="text-gray-300">{selectedContact.comment}</p>
                  </div>
                )}

                {selectedContact.notes && (
                  <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl">
                    <div className="text-blue-400 text-sm mb-1">Заметки админа:</div>
                    <p className="text-gray-300">{selectedContact.notes}</p>
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <div className="text-gray-400 text-sm">Изменить статус:</div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => handleUpdateStatus(selectedContact.id, 'in_progress')}
                    className="px-4 py-2 bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 rounded-xl hover:bg-yellow-500/20 transition-colors"
                  >
                    В работу
                  </button>
                  <button
                    onClick={() => handleUpdateStatus(selectedContact.id, 'completed')}
                    className="px-4 py-2 bg-green-500/10 text-green-400 border border-green-500/20 rounded-xl hover:bg-green-500/20 transition-colors"
                  >
                    Завершить
                  </button>
                  <button
                    onClick={() => handleUpdateStatus(selectedContact.id, 'rejected')}
                    className="px-4 py-2 bg-red-500/10 text-red-400 border border-red-500/20 rounded-xl hover:bg-red-500/20 transition-colors"
                  >
                    Отклонить
                  </button>
                  <button
                    onClick={() => handleUpdateStatus(selectedContact.id, 'new')}
                    className="px-4 py-2 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-xl hover:bg-blue-500/20 transition-colors"
                  >
                    Вернуть
                  </button>
                </div>
              </div>

              <div className="flex gap-3 mt-6 pt-6 border-t border-gray-700">
                <button
                  onClick={() => {
                    setShowModal(false);
                    setSelectedContact(null);
                  }}
                  className="flex-1 px-4 py-3 bg-gray-700 text-white rounded-xl hover:bg-gray-600 transition-colors"
                >
                  Закрыть
                </button>
                <a
                  href={`tel:${selectedContact.phone}`}
                  className="flex-1 px-4 py-3 bg-yellow-500 text-gray-900 font-bold rounded-xl hover:bg-yellow-600 transition-colors text-center"
                >
                  Позвонить
                </a>
              </div>
            </motion.div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminContactsPage;
