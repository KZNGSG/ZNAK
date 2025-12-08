import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import AdminLayout from '../../components/admin/AdminLayout';
import {
  Users,
  MessageSquare,
  CheckCircle,
  Eye,
  TrendingUp,
  Calendar,
  ArrowUpRight
} from 'lucide-react';
import { motion } from 'framer-motion';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8001';

const AdminDashboard = () => {
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

  const statCards = [
    {
      title: 'Пользователи',
      value: stats?.total_users || 0,
      subtitle: `${stats?.total_clients || 0} клиентов`,
      icon: Users,
      color: 'from-blue-500 to-blue-600',
      link: '/admin/users'
    },
    {
      title: 'Заявки',
      value: stats?.total_contacts || 0,
      subtitle: `${stats?.new_contacts || 0} новых`,
      icon: MessageSquare,
      color: 'from-green-500 to-green-600',
      link: '/admin/contacts'
    },
    {
      title: 'Проверок товаров',
      value: stats?.total_checks || 0,
      subtitle: `${stats?.checks_today || 0} сегодня`,
      icon: CheckCircle,
      color: 'from-yellow-500 to-yellow-600',
      link: '/admin/stats'
    },
    {
      title: 'Просмотров сегодня',
      value: stats?.views_today || 0,
      subtitle: 'страниц',
      icon: Eye,
      color: 'from-purple-500 to-purple-600',
      link: '/admin/stats'
    }
  ];

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-500"></div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-white">Дашборд</h1>
          <p className="text-gray-400 mt-1">Обзор основных показателей системы</p>
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {statCards.map((card, index) => {
            const Icon = card.icon;
            return (
              <motion.div
                key={card.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Link
                  to={card.link}
                  className="block bg-gray-800 rounded-2xl p-6 border border-gray-700 hover:border-gray-600 transition-all group"
                >
                  <div className="flex items-start justify-between">
                    <div className={`p-3 rounded-xl bg-gradient-to-br ${card.color}`}>
                      <Icon className="w-6 h-6 text-white" />
                    </div>
                    <ArrowUpRight className="w-5 h-5 text-gray-600 group-hover:text-gray-400 transition-colors" />
                  </div>
                  <div className="mt-4">
                    <div className="text-3xl font-bold text-white">{card.value.toLocaleString()}</div>
                    <div className="text-gray-400 mt-1">{card.title}</div>
                    <div className="text-sm text-gray-500 mt-1">{card.subtitle}</div>
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top Categories */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-gray-800 rounded-2xl p-6 border border-gray-700"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">Топ категорий</h2>
              <TrendingUp className="w-5 h-5 text-gray-400" />
            </div>
            <div className="space-y-4">
              {stats?.top_categories?.length > 0 ? (
                stats.top_categories.map((cat, index) => (
                  <div key={cat.category} className="flex items-center gap-4">
                    <div className="w-8 h-8 rounded-lg bg-yellow-500/10 flex items-center justify-center text-yellow-500 font-bold">
                      {index + 1}
                    </div>
                    <div className="flex-1">
                      <div className="text-white font-medium">{cat.category}</div>
                      <div className="w-full bg-gray-700 rounded-full h-2 mt-1">
                        <div
                          className="bg-gradient-to-r from-yellow-500 to-yellow-600 h-2 rounded-full"
                          style={{
                            width: `${(cat.count / (stats.top_categories[0]?.count || 1)) * 100}%`
                          }}
                        />
                      </div>
                    </div>
                    <div className="text-gray-400 font-medium">{cat.count}</div>
                  </div>
                ))
              ) : (
                <div className="text-gray-500 text-center py-8">Нет данных</div>
              )}
            </div>
          </motion.div>

          {/* Contacts by Type */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="bg-gray-800 rounded-2xl p-6 border border-gray-700"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">Заявки по типам</h2>
              <Calendar className="w-5 h-5 text-gray-400" />
            </div>
            <div className="space-y-4">
              {stats?.contacts_by_type?.length > 0 ? (
                stats.contacts_by_type.map((item) => (
                  <div key={item.type} className="flex items-center justify-between p-3 bg-gray-700/30 rounded-xl">
                    <span className="text-gray-300">{item.type}</span>
                    <span className="px-3 py-1 bg-green-500/10 text-green-400 rounded-lg font-medium">
                      {item.count}
                    </span>
                  </div>
                ))
              ) : (
                <div className="text-gray-500 text-center py-8">Нет заявок</div>
              )}
            </div>
          </motion.div>
        </div>

        {/* Recent Activity */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="bg-gray-800 rounded-2xl p-6 border border-gray-700"
        >
          <h2 className="text-xl font-bold text-white mb-6">Проверки за последние 7 дней</h2>
          <div className="grid grid-cols-7 gap-4">
            {stats?.checks_7days?.length > 0 ? (
              stats.checks_7days.map((day) => (
                <div key={day.date} className="text-center">
                  <div className="text-gray-500 text-sm mb-2">
                    {new Date(day.date).toLocaleDateString('ru-RU', { weekday: 'short' })}
                  </div>
                  <div className="h-24 bg-gray-700 rounded-lg relative overflow-hidden">
                    <div
                      className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-yellow-500 to-yellow-600 rounded-b-lg"
                      style={{
                        height: `${Math.min((day.count / 100) * 100, 100)}%`
                      }}
                    />
                  </div>
                  <div className="text-white font-medium mt-2">{day.count}</div>
                </div>
              ))
            ) : (
              <div className="col-span-7 text-gray-500 text-center py-8">Нет данных за последние 7 дней</div>
            )}
          </div>
        </motion.div>
      </div>
    </AdminLayout>
  );
};

export default AdminDashboard;
