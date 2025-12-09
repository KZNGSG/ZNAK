import React, { useState, useEffect } from 'react';
import { useAdminAuth } from '../../context/AdminAuthContext';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const AdminCallbacksPage = () => {
  const { authFetch } = useAdminAuth();
  const [callbacks, setCallbacks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    fetchCallbacks();
  }, []);

  const fetchCallbacks = async () => {
    try {
      const response = await authFetch(`${API_URL}/api/admin/callbacks`);
      if (response.ok) {
        const data = await response.json();
        setCallbacks(data);
      }
    } catch (error) {
      console.error('Failed to fetch callbacks:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (callbackId, status) => {
    try {
      const response = await authFetch(`${API_URL}/api/admin/callbacks/${callbackId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });

      if (response.ok) {
        fetchCallbacks();
      }
    } catch (error) {
      console.error('Failed to update callback:', error);
    }
  };

  const filteredCallbacks = callbacks.filter(cb => {
    if (filter === 'all') return true;
    return cb.status === filter;
  });

  const statusLabels = {
    new: 'Новая',
    in_progress: 'В работе',
    processed: 'Обработана',
    cancelled: 'Отменена'
  };

  const statusColors = {
    new: 'bg-yellow-500/20 text-yellow-400',
    in_progress: 'bg-blue-500/20 text-blue-400',
    processed: 'bg-green-500/20 text-green-400',
    cancelled: 'bg-red-500/20 text-red-400'
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-400"></div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-6">Заявки на звонок</h1>

      {/* Filters */}
      <div className="flex gap-2 mb-6">
        {['all', 'new', 'in_progress', 'processed', 'cancelled'].map((status) => (
          <button
            key={status}
            onClick={() => setFilter(status)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === status
                ? 'bg-yellow-500 text-gray-900'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white'
            }`}
          >
            {status === 'all' ? 'Все' : statusLabels[status]}
            {status !== 'all' && (
              <span className="ml-1">
                ({callbacks.filter(cb => cb.status === status).length})
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Callbacks List */}
      <div className="space-y-4">
        {filteredCallbacks.map((callback) => (
          <div key={callback.id} className="bg-gray-800 rounded-xl p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="text-lg font-semibold text-white">{callback.name}</h3>
                  <span className={`px-2 py-1 rounded text-xs ${statusColors[callback.status]}`}>
                    {statusLabels[callback.status]}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-400">
                      <span className="text-gray-500">Телефон:</span>{' '}
                      <a href={`tel:${callback.phone}`} className="text-white hover:text-yellow-400">
                        {callback.phone}
                      </a>
                    </p>
                    {callback.email && (
                      <p className="text-gray-400">
                        <span className="text-gray-500">Email:</span>{' '}
                        <a href={`mailto:${callback.email}`} className="text-white hover:text-yellow-400">
                          {callback.email}
                        </a>
                      </p>
                    )}
                  </div>
                  <div>
                    {callback.product_gtin && (
                      <p className="text-gray-400">
                        <span className="text-gray-500">GTIN товара:</span>{' '}
                        <span className="text-white">{callback.product_gtin}</span>
                      </p>
                    )}
                    <p className="text-gray-400">
                      <span className="text-gray-500">Дата:</span>{' '}
                      <span className="text-white">
                        {new Date(callback.created_at).toLocaleString('ru-RU')}
                      </span>
                    </p>
                  </div>
                </div>

                {callback.message && (
                  <div className="mt-3 p-3 bg-gray-700/50 rounded-lg">
                    <p className="text-gray-300 text-sm">{callback.message}</p>
                  </div>
                )}
              </div>

              {/* Status Actions */}
              <div className="flex flex-col gap-2 ml-4">
                {callback.status !== 'processed' && (
                  <button
                    onClick={() => updateStatus(callback.id, 'processed')}
                    className="px-3 py-1.5 bg-green-500/20 text-green-400 rounded text-sm hover:bg-green-500/30"
                  >
                    Обработано
                  </button>
                )}
                {callback.status === 'new' && (
                  <button
                    onClick={() => updateStatus(callback.id, 'in_progress')}
                    className="px-3 py-1.5 bg-blue-500/20 text-blue-400 rounded text-sm hover:bg-blue-500/30"
                  >
                    В работу
                  </button>
                )}
                {callback.status !== 'cancelled' && callback.status !== 'processed' && (
                  <button
                    onClick={() => updateStatus(callback.id, 'cancelled')}
                    className="px-3 py-1.5 bg-red-500/20 text-red-400 rounded text-sm hover:bg-red-500/30"
                  >
                    Отменить
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}

        {filteredCallbacks.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            <svg className="w-12 h-12 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
            </svg>
            <p>Заявки не найдены</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminCallbacksPage;
