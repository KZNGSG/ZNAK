import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  FileCheck,
  FileText,
  ShoppingCart,
  ArrowRight,
  Clock,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const ClientDashboard = () => {
  const { user, token } = useAuth();
  const [stats, setStats] = useState({
    contracts: 0,
    quotes: 0,
    pendingQuotes: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      if (!token) return;

      try {
        const [contractsRes, quotesRes] = await Promise.all([
          fetch(`${API_URL}/api/client/contracts`, {
            headers: { 'Authorization': `Bearer ${token}` }
          }),
          fetch(`${API_URL}/api/client/quotes`, {
            headers: { 'Authorization': `Bearer ${token}` }
          })
        ]);

        if (contractsRes.ok && quotesRes.ok) {
          const contracts = await contractsRes.json();
          const quotes = await quotesRes.json();

          setStats({
            contracts: contracts.length || 0,
            quotes: quotes.length || 0,
            pendingQuotes: quotes.filter(q => q.status === 'sent' || q.status === 'draft').length || 0
          });
        }
      } catch (error) {
        console.error('Failed to fetch stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [token]);

  const quickActions = [
    {
      title: 'Договоры',
      description: 'Просмотр всех договоров',
      icon: FileCheck,
      path: '/cabinet/contracts',
      color: 'from-green-400 to-green-500',
      count: stats.contracts
    },
    {
      title: 'Коммерческие предложения',
      description: 'Ваши КП от менеджеров',
      icon: FileText,
      path: '/cabinet/quotes',
      color: 'from-blue-400 to-blue-500',
      count: stats.quotes
    },
    {
      title: 'Заказать услуги',
      description: 'Оформить новый заказ',
      icon: ShoppingCart,
      path: '/cabinet/services',
      color: 'from-yellow-400 to-yellow-500',
      count: null
    }
  ];

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-yellow-400 to-yellow-500 rounded-2xl p-6 lg:p-8 text-white">
        <h1 className="text-2xl lg:text-3xl font-bold mb-2">
          Добро пожаловать{user?.email ? `, ${user.email.split('@')[0]}` : ''}!
        </h1>
        <p className="text-yellow-100 text-lg">
          Это ваш личный кабинет для управления договорами и заказами.
        </p>

        {/* Quick stats */}
        <div className="grid grid-cols-3 gap-4 mt-6">
          <div className="bg-white/20 backdrop-blur-sm rounded-xl p-4 text-center">
            <div className="text-3xl font-bold">{loading ? '-' : stats.contracts}</div>
            <div className="text-sm text-yellow-100">Договоров</div>
          </div>
          <div className="bg-white/20 backdrop-blur-sm rounded-xl p-4 text-center">
            <div className="text-3xl font-bold">{loading ? '-' : stats.quotes}</div>
            <div className="text-sm text-yellow-100">КП</div>
          </div>
          <div className="bg-white/20 backdrop-blur-sm rounded-xl p-4 text-center">
            <div className="text-3xl font-bold">{loading ? '-' : stats.pendingQuotes}</div>
            <div className="text-sm text-yellow-100">На рассмотрении</div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Быстрые действия</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <Link
                key={action.path}
                to={action.path}
                className="group bg-white rounded-xl border border-gray-200 p-5 hover:border-yellow-400 hover:shadow-lg transition-all duration-200"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${action.color} flex items-center justify-center`}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  {action.count !== null && (
                    <span className="text-2xl font-bold text-gray-900">{action.count}</span>
                  )}
                </div>
                <h3 className="font-semibold text-gray-900 mb-1 group-hover:text-yellow-600 transition-colors">
                  {action.title}
                </h3>
                <p className="text-sm text-gray-500">{action.description}</p>
                <div className="mt-3 flex items-center text-sm text-yellow-600 opacity-0 group-hover:opacity-100 transition-opacity">
                  Перейти <ArrowRight className="w-4 h-4 ml-1" />
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Status Legend */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Статусы документов</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
            <Clock className="w-5 h-5 text-yellow-500" />
            <div>
              <div className="font-medium text-gray-900">На рассмотрении</div>
              <div className="text-xs text-gray-500">Ожидает вашего ответа</div>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
            <CheckCircle2 className="w-5 h-5 text-green-500" />
            <div>
              <div className="font-medium text-gray-900">Подписан</div>
              <div className="text-xs text-gray-500">Документ активен</div>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
            <AlertCircle className="w-5 h-5 text-red-500" />
            <div>
              <div className="font-medium text-gray-900">Требует внимания</div>
              <div className="text-xs text-gray-500">Срочные документы</div>
            </div>
          </div>
        </div>
      </div>

      {/* Contact Manager */}
      <div className="bg-gradient-to-r from-gray-800 to-gray-900 rounded-2xl p-6 text-white">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold mb-1">Нужна помощь?</h3>
            <p className="text-gray-400">Свяжитесь с вашим персональным менеджером</p>
          </div>
          <Link
            to="/contact"
            className="px-6 py-3 bg-yellow-500 text-gray-900 font-medium rounded-xl hover:bg-yellow-400 transition-colors whitespace-nowrap"
          >
            Связаться с нами
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ClientDashboard;
