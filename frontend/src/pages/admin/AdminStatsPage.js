import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import AdminLayout from '../../components/admin/AdminLayout';
import {
  BarChart3,
  TrendingUp,
  Users,
  CheckCircle,
  Eye,
  Calendar
} from 'lucide-react';
import { motion } from 'framer-motion';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8001';

const AdminStatsPage = () => {
  const { token } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await fetch(`${API_URL}/api/admin/stats`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

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

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-500"></div>
        </div>
      </AdminLayout>
    );
  }

  const maxChecks = Math.max(...(stats?.checks_7days?.map(d => d.count) || [1]));
  const maxRegistrations = Math.max(...(stats?.registrations_7days?.map(d => d.count) || [1]));

  return (
    <AdminLayout>
      <div className="space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-white">Статистика</h1>
          <p className="text-gray-400 mt-1">Аналитика и показатели системы</p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gray-800 rounded-2xl p-6 border border-gray-700"
          >
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-blue-500/10">
                <Users className="w-6 h-6 text-blue-400" />
              </div>
              <div>
                <div className="text-3xl font-bold text-white">{stats?.total_users || 0}</div>
                <div className="text-gray-400">Пользователей</div>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-gray-800 rounded-2xl p-6 border border-gray-700"
          >
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-yellow-500/10">
                <CheckCircle className="w-6 h-6 text-yellow-400" />
              </div>
              <div>
                <div className="text-3xl font-bold text-white">{stats?.total_checks || 0}</div>
                <div className="text-gray-400">Проверок товаров</div>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-gray-800 rounded-2xl p-6 border border-gray-700"
          >
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-green-500/10">
                <TrendingUp className="w-6 h-6 text-green-400" />
              </div>
              <div>
                <div className="text-3xl font-bold text-white">{stats?.checks_today || 0}</div>
                <div className="text-gray-400">Проверок сегодня</div>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-gray-800 rounded-2xl p-6 border border-gray-700"
          >
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-purple-500/10">
                <Eye className="w-6 h-6 text-purple-400" />
              </div>
              <div>
                <div className="text-3xl font-bold text-white">{stats?.views_today || 0}</div>
                <div className="text-gray-400">Просмотров сегодня</div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Checks Chart */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-gray-800 rounded-2xl p-6 border border-gray-700"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">Проверки за неделю</h2>
              <BarChart3 className="w-5 h-5 text-gray-400" />
            </div>

            <div className="h-64 flex items-end gap-2">
              {stats?.checks_7days?.length > 0 ? (
                stats.checks_7days.map((day, index) => (
                  <div key={day.date} className="flex-1 flex flex-col items-center">
                    <div className="w-full relative" style={{ height: '200px' }}>
                      <motion.div
                        initial={{ height: 0 }}
                        animate={{ height: `${(day.count / maxChecks) * 100}%` }}
                        transition={{ delay: 0.5 + index * 0.1, duration: 0.5 }}
                        className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-yellow-500 to-yellow-600 rounded-t-lg"
                      />
                    </div>
                    <div className="text-gray-500 text-xs mt-2">
                      {new Date(day.date).toLocaleDateString('ru-RU', { weekday: 'short' })}
                    </div>
                    <div className="text-white font-medium text-sm">{day.count}</div>
                  </div>
                ))
              ) : (
                <div className="flex-1 flex items-center justify-center text-gray-500">
                  Нет данных
                </div>
              )}
            </div>
          </motion.div>

          {/* Registrations Chart */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="bg-gray-800 rounded-2xl p-6 border border-gray-700"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">Регистрации за неделю</h2>
              <Calendar className="w-5 h-5 text-gray-400" />
            </div>

            <div className="h-64 flex items-end gap-2">
              {stats?.registrations_7days?.length > 0 ? (
                stats.registrations_7days.map((day, index) => (
                  <div key={day.date} className="flex-1 flex flex-col items-center">
                    <div className="w-full relative" style={{ height: '200px' }}>
                      <motion.div
                        initial={{ height: 0 }}
                        animate={{ height: `${(day.count / maxRegistrations) * 100}%` }}
                        transition={{ delay: 0.6 + index * 0.1, duration: 0.5 }}
                        className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-blue-500 to-blue-600 rounded-t-lg"
                      />
                    </div>
                    <div className="text-gray-500 text-xs mt-2">
                      {new Date(day.date).toLocaleDateString('ru-RU', { weekday: 'short' })}
                    </div>
                    <div className="text-white font-medium text-sm">{day.count}</div>
                  </div>
                ))
              ) : (
                <div className="flex-1 flex items-center justify-center text-gray-500">
                  Нет данных
                </div>
              )}
            </div>
          </motion.div>
        </div>

        {/* Details */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top Categories */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="bg-gray-800 rounded-2xl p-6 border border-gray-700"
          >
            <h2 className="text-xl font-bold text-white mb-6">Популярные категории</h2>
            <div className="space-y-4">
              {stats?.top_categories?.length > 0 ? (
                stats.top_categories.map((cat, index) => {
                  const maxCount = stats.top_categories[0]?.count || 1;
                  return (
                    <div key={cat.category}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-gray-300">{cat.category}</span>
                        <span className="text-yellow-500 font-medium">{cat.count}</span>
                      </div>
                      <div className="w-full bg-gray-700 rounded-full h-2">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${(cat.count / maxCount) * 100}%` }}
                          transition={{ delay: 0.7 + index * 0.1, duration: 0.5 }}
                          className="bg-gradient-to-r from-yellow-500 to-yellow-600 h-2 rounded-full"
                        />
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-gray-500 text-center py-8">Нет данных</div>
              )}
            </div>
          </motion.div>

          {/* Contacts by Type */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            className="bg-gray-800 rounded-2xl p-6 border border-gray-700"
          >
            <h2 className="text-xl font-bold text-white mb-6">Заявки по типам</h2>
            <div className="space-y-3">
              {stats?.contacts_by_type?.length > 0 ? (
                stats.contacts_by_type.map((item, index) => {
                  const colors = [
                    'bg-green-500/10 text-green-400 border-green-500/20',
                    'bg-blue-500/10 text-blue-400 border-blue-500/20',
                    'bg-purple-500/10 text-purple-400 border-purple-500/20',
                    'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
                    'bg-red-500/10 text-red-400 border-red-500/20'
                  ];
                  return (
                    <motion.div
                      key={item.type}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.8 + index * 0.1 }}
                      className="flex items-center justify-between p-4 bg-gray-700/30 rounded-xl"
                    >
                      <span className="text-gray-300">{item.type}</span>
                      <span className={`px-3 py-1 rounded-lg text-sm font-medium border ${colors[index % colors.length]}`}>
                        {item.count}
                      </span>
                    </motion.div>
                  );
                })
              ) : (
                <div className="text-gray-500 text-center py-8">Нет заявок</div>
              )}
            </div>

            {/* Total */}
            {stats?.contacts_by_type?.length > 0 && (
              <div className="mt-6 pt-6 border-t border-gray-700 flex items-center justify-between">
                <span className="text-gray-400">Всего заявок</span>
                <span className="text-2xl font-bold text-white">{stats?.total_contacts || 0}</span>
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminStatsPage;
