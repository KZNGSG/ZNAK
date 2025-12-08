import React, { useState, useEffect } from 'react';
import { useAdminAuth } from '../../context/AdminAuthContext';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const AdminDashboard = () => {
  const { authFetch } = useAdminAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await authFetch(`${API_URL}/api/admin/stats`);
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const statCards = stats ? [
    { label: 'Пользователей', value: stats.total_users, icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z', color: 'blue' },
    { label: 'Заявок на звонок', value: stats.total_callbacks, icon: 'M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z', color: 'green' },
    { label: 'Новых заявок', value: stats.pending_callbacks, icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z', color: 'yellow' },
    { label: 'Компаний', value: stats.total_companies, icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4', color: 'purple' },
  ] : [];

  const colorClasses = {
    blue: 'bg-blue-500/20 text-blue-400',
    green: 'bg-green-500/20 text-green-400',
    yellow: 'bg-yellow-500/20 text-yellow-400',
    purple: 'bg-purple-500/20 text-purple-400',
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
      <h1 className="text-2xl font-bold text-white mb-6">Панель управления</h1>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {statCards.map((stat, index) => (
          <div key={index} className="bg-gray-800 rounded-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">{stat.label}</p>
                <p className="text-3xl font-bold text-white mt-1">{stat.value}</p>
              </div>
              <div className={`p-3 rounded-lg ${colorClasses[stat.color]}`}>
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={stat.icon} />
                </svg>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Recent Activity */}
      <div className="bg-gray-800 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Последние заявки</h2>
        {stats?.recent_callbacks?.length > 0 ? (
          <div className="space-y-3">
            {stats.recent_callbacks.map((callback, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg">
                <div>
                  <p className="text-white font-medium">{callback.name}</p>
                  <p className="text-gray-400 text-sm">{callback.phone}</p>
                </div>
                <div className="text-right">
                  <span className={`px-2 py-1 rounded text-xs ${
                    callback.status === 'new' ? 'bg-yellow-500/20 text-yellow-400' :
                    callback.status === 'processed' ? 'bg-green-500/20 text-green-400' :
                    'bg-gray-500/20 text-gray-400'
                  }`}>
                    {callback.status === 'new' ? 'Новая' :
                     callback.status === 'processed' ? 'Обработана' :
                     callback.status}
                  </span>
                  <p className="text-gray-500 text-xs mt-1">
                    {new Date(callback.created_at).toLocaleDateString('ru-RU')}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-400 text-center py-4">Нет заявок</p>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
