import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';
import {
  User, FileText, Building2, LogOut, Download, Eye,
  Clock, CheckCircle, XCircle, AlertCircle, Plus
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const CabinetPage = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated, loading: authLoading, logout, authFetch } = useAuth();

  const [activeTab, setActiveTab] = useState('contracts');
  const [contracts, setContracts] = useState([]);
  const [quotes, setQuotes] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);

  // Редирект если не авторизован
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate('/login', { state: { from: '/cabinet' } });
    }
  }, [isAuthenticated, authLoading, navigate]);

  // Загрузка данных
  useEffect(() => {
    if (isAuthenticated) {
      loadData();
    }
  }, [isAuthenticated]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [contractsRes, quotesRes, companiesRes] = await Promise.all([
        authFetch(`${API_URL}/api/cabinet/contracts`),
        authFetch(`${API_URL}/api/cabinet/quotes`),
        authFetch(`${API_URL}/api/cabinet/companies`)
      ]);

      if (contractsRes.ok) {
        const data = await contractsRes.json();
        setContracts(data.contracts || []);
      }

      if (quotesRes.ok) {
        const data = await quotesRes.json();
        setQuotes(data.quotes || []);
      }

      if (companiesRes.ok) {
        const data = await companiesRes.json();
        setCompanies(data.companies || []);
      }
    } catch (error) {
      console.error('Failed to load data:', error);
      toast.error('Ошибка загрузки данных');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    toast.success('Вы вышли из системы');
    navigate('/');
  };

  const getStatusBadge = (status) => {
    const statusMap = {
      'draft': { label: 'Черновик', color: 'bg-gray-100 text-gray-700', icon: Clock },
      'created': { label: 'Создан', color: 'bg-blue-100 text-blue-700', icon: Clock },
      'sent': { label: 'Отправлен', color: 'bg-amber-100 text-amber-700', icon: AlertCircle },
      'signed': { label: 'Подписан', color: 'bg-emerald-100 text-emerald-700', icon: CheckCircle },
      'active': { label: 'Активен', color: 'bg-emerald-100 text-emerald-700', icon: CheckCircle },
      'completed': { label: 'Завершён', color: 'bg-gray-100 text-gray-700', icon: CheckCircle },
      'cancelled': { label: 'Отменён', color: 'bg-red-100 text-red-700', icon: XCircle },
      'accepted': { label: 'Принят', color: 'bg-emerald-100 text-emerald-700', icon: CheckCircle },
      'rejected': { label: 'Отклонён', color: 'bg-red-100 text-red-700', icon: XCircle },
      'expired': { label: 'Истёк', color: 'bg-gray-100 text-gray-700', icon: Clock }
    };

    const s = statusMap[status] || { label: status, color: 'bg-gray-100 text-gray-700', icon: Clock };
    const Icon = s.icon;

    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${s.color}`}>
        <Icon size={12} />
        {s.label}
      </span>
    );
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const formatMoney = (amount) => {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'RUB',
      minimumFractionDigits: 0
    }).format(amount || 0);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[rgb(var(--brand-yellow-500))]"></div>
      </div>
    );
  }

  return (
    <div className="py-8 bg-gradient-to-b from-slate-50 to-white min-h-screen">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Личный кабинет</h1>
            <p className="text-gray-600 mt-1">{user?.email}</p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              onClick={() => navigate('/check')}
              className="btn-gradient rounded-xl flex items-center gap-2"
            >
              <Plus size={18} />
              Новая проверка
            </Button>
            <Button
              onClick={handleLogout}
              variant="outline"
              className="rounded-xl flex items-center gap-2 text-gray-600"
            >
              <LogOut size={18} />
              Выйти
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-xl border-2 border-gray-200 p-4">
            <div className="text-3xl font-bold text-gray-900">{contracts.length}</div>
            <div className="text-sm text-gray-600">Договоров</div>
          </div>
          <div className="bg-white rounded-xl border-2 border-gray-200 p-4">
            <div className="text-3xl font-bold text-gray-900">{quotes.length}</div>
            <div className="text-sm text-gray-600">КП</div>
          </div>
          <div className="bg-white rounded-xl border-2 border-gray-200 p-4">
            <div className="text-3xl font-bold text-gray-900">{companies.length}</div>
            <div className="text-sm text-gray-600">Компаний</div>
          </div>
          <div className="bg-white rounded-xl border-2 border-gray-200 p-4">
            <div className="text-3xl font-bold text-[rgb(var(--brand-yellow-600))]">
              {formatMoney(contracts.reduce((sum, c) => sum + (c.total_amount || 0), 0))}
            </div>
            <div className="text-sm text-gray-600">Сумма договоров</div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-2xl border-2 border-gray-200 overflow-hidden">
          <div className="flex border-b border-gray-200">
            {[
              { id: 'contracts', label: 'Договоры', icon: FileText, count: contracts.length },
              { id: 'quotes', label: 'КП', icon: FileText, count: quotes.length },
              { id: 'companies', label: 'Компании', icon: Building2, count: companies.length }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 px-4 py-4 text-sm font-medium flex items-center justify-center gap-2 transition-colors ${
                  activeTab === tab.id
                    ? 'text-[rgb(var(--brand-yellow-700))] border-b-2 border-[rgb(var(--brand-yellow-500))] bg-[rgb(var(--brand-yellow-50))]'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                <tab.icon size={18} />
                {tab.label}
                <span className={`ml-1 px-2 py-0.5 rounded-full text-xs ${
                  activeTab === tab.id
                    ? 'bg-[rgb(var(--brand-yellow-200))] text-[rgb(var(--brand-yellow-800))]'
                    : 'bg-gray-100 text-gray-600'
                }`}>
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          {/* Content */}
          <div className="p-6">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[rgb(var(--brand-yellow-500))]"></div>
              </div>
            ) : (
              <>
                {/* Contracts Tab */}
                {activeTab === 'contracts' && (
                  <div>
                    {contracts.length === 0 ? (
                      <div className="text-center py-12">
                        <FileText size={48} className="mx-auto text-gray-300 mb-4" />
                        <p className="text-gray-500 mb-4">У вас пока нет договоров</p>
                        <Button
                          onClick={() => navigate('/quote')}
                          className="btn-gradient rounded-xl"
                        >
                          Оформить договор
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {contracts.map((contract) => (
                          <div
                            key={contract.id}
                            className="border-2 border-gray-200 rounded-xl p-4 hover:border-[rgb(var(--brand-yellow-300))] transition-colors"
                          >
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                              <div>
                                <div className="flex items-center gap-3 mb-2">
                                  <span className="font-bold text-gray-900">{contract.contract_number}</span>
                                  {getStatusBadge(contract.status)}
                                </div>
                                <div className="text-sm text-gray-600">
                                  {contract.company_name} (ИНН: {contract.company_inn})
                                </div>
                                <div className="text-sm text-gray-500 mt-1">
                                  Создан: {formatDate(contract.created_at)}
                                </div>
                              </div>
                              <div className="flex items-center gap-4">
                                <div className="text-right">
                                  <div className="text-lg font-bold text-gray-900">
                                    {formatMoney(contract.total_amount)}
                                  </div>
                                  <div className="text-xs text-gray-500">
                                    {contract.services?.length || 0} услуг
                                  </div>
                                </div>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="rounded-lg"
                                >
                                  <Download size={16} />
                                </Button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Quotes Tab */}
                {activeTab === 'quotes' && (
                  <div>
                    {quotes.length === 0 ? (
                      <div className="text-center py-12">
                        <FileText size={48} className="mx-auto text-gray-300 mb-4" />
                        <p className="text-gray-500 mb-4">У вас пока нет коммерческих предложений</p>
                        <Button
                          onClick={() => navigate('/quote')}
                          className="btn-gradient rounded-xl"
                        >
                          Получить КП
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {quotes.map((quote) => (
                          <div
                            key={quote.id}
                            className="border-2 border-gray-200 rounded-xl p-4 hover:border-[rgb(var(--brand-yellow-300))] transition-colors"
                          >
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                              <div>
                                <div className="flex items-center gap-3 mb-2">
                                  <span className="font-bold text-gray-900">{quote.quote_number}</span>
                                  {getStatusBadge(quote.status)}
                                </div>
                                <div className="text-sm text-gray-600">
                                  {quote.company_name} (ИНН: {quote.company_inn})
                                </div>
                                <div className="text-sm text-gray-500 mt-1">
                                  Создан: {formatDate(quote.created_at)}
                                  {quote.valid_until && ` • Действует до: ${formatDate(quote.valid_until)}`}
                                </div>
                              </div>
                              <div className="flex items-center gap-4">
                                <div className="text-right">
                                  <div className="text-lg font-bold text-gray-900">
                                    {formatMoney(quote.total_amount)}
                                  </div>
                                  <div className="text-xs text-gray-500">
                                    {quote.services?.length || 0} услуг
                                  </div>
                                </div>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="rounded-lg"
                                >
                                  <Eye size={16} />
                                </Button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Companies Tab */}
                {activeTab === 'companies' && (
                  <div>
                    {companies.length === 0 ? (
                      <div className="text-center py-12">
                        <Building2 size={48} className="mx-auto text-gray-300 mb-4" />
                        <p className="text-gray-500">У вас пока нет сохранённых компаний</p>
                      </div>
                    ) : (
                      <div className="grid sm:grid-cols-2 gap-4">
                        {companies.map((company) => (
                          <div
                            key={company.id}
                            className="border-2 border-gray-200 rounded-xl p-4"
                          >
                            <div className="flex items-start gap-3">
                              <div className="p-2 bg-[rgb(var(--brand-yellow-100))] rounded-lg">
                                <Building2 size={20} className="text-[rgb(var(--brand-yellow-700))]" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="font-bold text-gray-900 truncate">{company.name}</div>
                                <div className="text-sm text-gray-600 mt-1">ИНН: {company.inn}</div>
                                {company.kpp && (
                                  <div className="text-sm text-gray-500">КПП: {company.kpp}</div>
                                )}
                                {company.address && (
                                  <div className="text-xs text-gray-400 mt-2 truncate">{company.address}</div>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CabinetPage;
