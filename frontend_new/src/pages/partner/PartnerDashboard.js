import React, { useState, useEffect } from 'react';
import { usePartnerAuth } from '../../context/PartnerAuthContext';
import { Link } from 'react-router-dom';
import {
  Users,
  FileText,
  DollarSign,
  TrendingUp,
  Copy,
  Check,
  ExternalLink,
  Clock,
  CheckCircle
} from 'lucide-react';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const PartnerDashboard = () => {
  const { partner, authFetch } = usePartnerAuth();
  const [stats, setStats] = useState(null);
  const [recentLeads, setRecentLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [linkCopied, setLinkCopied] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [statsRes, leadsRes] = await Promise.all([
        authFetch(`${API_URL}/api/partner/stats`),
        authFetch(`${API_URL}/api/partner/leads`)
      ]);

      if (statsRes.ok) {
        const data = await statsRes.json();
        setStats(data.stats);
      }

      if (leadsRes.ok) {
        const data = await leadsRes.json();
        setRecentLeads(data.leads.slice(0, 5)); // Только последние 5
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
      toast.error('Ошибка загрузки данных');
    } finally {
      setLoading(false);
    }
  };

  const copyRefLink = () => {
    if (partner?.ref_code) {
      const link = `${window.location.origin}/quote?ref=${partner.ref_code}`;
      navigator.clipboard.writeText(link);
      setLinkCopied(true);
      toast.success('Ссылка скопирована!');
      setTimeout(() => setLinkCopied(false), 2000);
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-amber-200 border-t-amber-500"></div>
      </div>
    );
  }

  const refLink = partner?.ref_code ? `${window.location.origin}/quote?ref=${partner.ref_code}` : '';

  return (
    <div className="space-y-6">
      {/* Welcome header */}
      <div className="bg-gradient-to-br from-amber-400 to-amber-500 rounded-2xl p-6 text-white">
        <h1 className="text-2xl font-bold mb-2">
          Добро пожаловать, {partner?.contact_name || 'Партнёр'}!
        </h1>
        <p className="text-amber-100 mb-4">
          {partner?.company_name || 'Партнёрская программа Про.Маркируй'}
        </p>

        {/* Ref link */}
        <div className="bg-white/20 backdrop-blur rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-amber-100">Ваша партнёрская ссылка:</span>
            <span className="text-sm font-medium">Комиссия: {partner?.commission_rate || 10}%</span>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={refLink}
              readOnly
              className="flex-1 bg-white/30 border border-white/30 rounded-lg px-3 py-2 text-sm text-white placeholder-white/70 outline-none"
            />
            <button
              onClick={copyRefLink}
              className="px-4 py-2 bg-white text-amber-600 font-medium rounded-lg hover:bg-amber-50 transition-colors flex items-center gap-2"
            >
              {linkCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {linkCopied ? 'Скопировано!' : 'Копировать'}
            </button>
          </div>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
              <Users className="w-5 h-5 text-blue-600" />
            </div>
          </div>
          <div className="text-2xl font-bold text-gray-900">{stats?.total_leads || 0}</div>
          <div className="text-sm text-gray-500">Всего клиентов</div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
              <FileText className="w-5 h-5 text-amber-600" />
            </div>
          </div>
          <div className="text-2xl font-bold text-gray-900">{formatCurrency(stats?.total_amount)}</div>
          <div className="text-sm text-gray-500">Сумма КП</div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-emerald-600" />
            </div>
          </div>
          <div className="text-2xl font-bold text-emerald-600">{formatCurrency(stats?.paid_amount)}</div>
          <div className="text-sm text-gray-500">Оплачено</div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-purple-600" />
            </div>
          </div>
          <div className="text-2xl font-bold text-purple-600">{formatCurrency(stats?.total_commission)}</div>
          <div className="text-sm text-gray-500">Ваша комиссия</div>
        </div>
      </div>

      {/* Recent leads */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">Последние заявки</h2>
          <Link
            to="/partner/leads"
            className="text-sm text-amber-600 hover:text-amber-700 font-medium flex items-center gap-1"
          >
            Все заявки
            <ExternalLink className="w-4 h-4" />
          </Link>
        </div>

        {recentLeads.length > 0 ? (
          <div className="divide-y divide-gray-100">
            {recentLeads.map((lead) => (
              <div key={lead.id} className="px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    lead.is_paid ? 'bg-emerald-100' : 'bg-gray-100'
                  }`}>
                    {lead.is_paid ? (
                      <CheckCircle className="w-5 h-5 text-emerald-600" />
                    ) : (
                      <Clock className="w-5 h-5 text-gray-400" />
                    )}
                  </div>
                  <div>
                    <div className="font-medium text-gray-900">
                      Заявка #{lead.id}
                    </div>
                    <div className="text-sm text-gray-500">
                      {formatDate(lead.created_at)} • {lead.status_label}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-semibold text-gray-900">
                    {formatCurrency(lead.total_amount)}
                  </div>
                  <div className={`text-sm ${lead.is_paid ? 'text-emerald-600' : 'text-gray-400'}`}>
                    Комиссия: {formatCurrency(lead.commission)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="px-6 py-12 text-center">
            <Users className="w-12 h-12 mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500">Пока нет заявок</p>
            <p className="text-sm text-gray-400 mt-1">
              Поделитесь своей ссылкой, чтобы привлечь первых клиентов
            </p>
          </div>
        )}
      </div>

      {/* Quick tips */}
      <div className="bg-amber-50 rounded-xl border border-amber-200 p-6">
        <h3 className="font-semibold text-amber-900 mb-3">Как заработать больше</h3>
        <ul className="space-y-2 text-sm text-amber-800">
          <li className="flex items-start gap-2">
            <span className="text-amber-500">1.</span>
            Делитесь своей ссылкой в социальных сетях и на профильных площадках
          </li>
          <li className="flex items-start gap-2">
            <span className="text-amber-500">2.</span>
            Рекомендуйте услуги маркировки своим клиентам и партнёрам
          </li>
          <li className="flex items-start gap-2">
            <span className="text-amber-500">3.</span>
            Используйте раздел "Материалы" для изучения услуг и ответов на вопросы
          </li>
        </ul>
      </div>
    </div>
  );
};

export default PartnerDashboard;
