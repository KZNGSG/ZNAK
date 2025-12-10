import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useEmployeeAuth } from '../../context/EmployeeAuthContext';
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Search,
  CheckCircle,
  Package,
  Plus,
  Minus,
  Trash2,
  FileText,
  Download,
  Loader2,
  X,
  ChevronDown,
  ShoppingCart,
  Settings,
  Tag,
  Send,
  Barcode,
  GraduationCap,
  ClipboardCheck,
  QrCode,
  ArrowRightCircle,
  Printer,
  User,
  Phone,
  Mail,
  CreditCard
} from 'lucide-react';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

// Иконки для категорий услуг
const categoryIcons = {
  setup: Settings,
  registration: ClipboardCheck,
  gtin: Tag,
  codes: QrCode,
  turnover: ArrowRightCircle,
  upd: FileText,
  edo: Send,
  equipment: Printer,
  kiz: Barcode,
  training: GraduationCap,
};

const EmployeeQuoteCreate = () => {
  const { id: clientId } = useParams();
  const navigate = useNavigate();
  const { authFetch } = useEmployeeAuth();

  // Client data
  const [client, setClient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Step management
  const [step, setStep] = useState(1); // 1: Товары, 2: Услуги, 3: Результат

  // Products (from ТНВ)
  const [categories, setCategories] = useState([]);
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [productSearchQuery, setProductSearchQuery] = useState('');
  const [tnvedSearchResults, setTnvedSearchResults] = useState([]);
  const [searchingTnved, setSearchingTnved] = useState(false);

  // Services
  const [services, setServices] = useState([]);
  const [serviceCategories, setServiceCategories] = useState({});
  const [selectedServices, setSelectedServices] = useState([]);
  const [tieredQuantities, setTieredQuantities] = useState({});
  const [activeTieredCategories, setActiveTieredCategories] = useState({});

  // Quote result
  const [quoteResult, setQuoteResult] = useState(null);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [downloadingContract, setDownloadingContract] = useState(false);

  // Load data on mount
  useEffect(() => {
    fetchClient();
    fetchCategories();
    fetchServices();
  }, [clientId]);

  // Debounced TNVED search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (productSearchQuery.length >= 2) {
        searchTnved(productSearchQuery);
      } else {
        setTnvedSearchResults([]);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [productSearchQuery]);

  const fetchClient = async () => {
    try {
      const response = await authFetch(`${API_URL}/api/employee/clients/${clientId}`);
      if (response.ok) {
        const data = await response.json();
        setClient(data);
        // Если у клиента уже есть товары, добавляем их
        if (data.products && data.products.length > 0) {
          const mappedProducts = data.products.map(p => ({
            id: p.id || `product_${Date.now()}_${Math.random()}`,
            name: p.name || p.subcategory_name || 'Товар',
            tnved: p.tnved || '',
            category: p.category || ''
          }));
          setSelectedProducts(mappedProducts);
        }
      } else {
        toast.error('Клиент не найден');
        navigate('/employee/clients');
      }
    } catch (error) {
      console.error('Failed to fetch client:', error);
      toast.error('Ошибка загрузки');
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await fetch(`${API_URL}/api/check/categories`);
      const data = await response.json();
      setCategories(data.groups || []);
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  };

  const fetchServices = async () => {
    try {
      const response = await fetch(`${API_URL}/api/services/list`);
      const data = await response.json();
      setServices(data.services || []);
      setServiceCategories(data.categories || {});
    } catch (error) {
      console.error('Error loading services:', error);
    }
  };

  const searchTnved = async (query) => {
    setSearchingTnved(true);
    try {
      // Сначала ищем в категориях
      const localResults = [];
      categories.forEach((group) => {
        group.subcategories?.forEach((sub) => {
          if (sub.name?.toLowerCase().includes(query.toLowerCase()) ||
              sub.tnved?.includes(query)) {
            localResults.push({
              ...sub,
              groupId: group.id,
              groupName: group.name,
              source: 'categories'
            });
          }
        });
      });

      // Также ищем в полной базе ТН ВЭД
      const response = await fetch(`${API_URL}/api/tnved/search?q=${encodeURIComponent(query)}&limit=10`);
      if (response.ok) {
        const data = await response.json();
        const tnvedResults = (data.results || []).map(item => ({
          id: `tnved_${item.code}`,
          name: item.name,
          tnved: item.code,
          marking_status: item.marking_status,
          source: 'tnved'
        }));

        // Объединяем результаты, убирая дубликаты
        const combined = [...localResults];
        tnvedResults.forEach(item => {
          if (!combined.find(c => c.tnved === item.tnved)) {
            combined.push(item);
          }
        });

        setTnvedSearchResults(combined.slice(0, 15));
      } else {
        setTnvedSearchResults(localResults.slice(0, 15));
      }
    } catch (error) {
      console.error('Search error:', error);
      setTnvedSearchResults([]);
    } finally {
      setSearchingTnved(false);
    }
  };

  // Product management
  const addProduct = (product) => {
    if (selectedProducts.find(p => p.tnved === product.tnved)) {
      toast.info('Товар уже добавлен');
      return;
    }
    setSelectedProducts(prev => [...prev, {
      id: product.id || `product_${Date.now()}`,
      name: product.name,
      tnved: product.tnved,
      category: product.groupName || product.category || '',
      marking_status: product.marking_status
    }]);
    setProductSearchQuery('');
    setTnvedSearchResults([]);
    toast.success(`Добавлен: ${product.name}`);
  };

  const removeProduct = (productId) => {
    setSelectedProducts(prev => prev.filter(p => p.id !== productId));
  };

  // Services grouped by category
  const servicesByCategory = useMemo(() => {
    const grouped = {};
    services.forEach(service => {
      if (!grouped[service.category]) {
        grouped[service.category] = [];
      }
      grouped[service.category].push(service);
    });
    Object.keys(grouped).forEach(cat => {
      grouped[cat].sort((a, b) => (a.order || 0) - (b.order || 0));
    });
    return grouped;
  }, [services]);

  // Sorted category entries
  const sortedCategoryEntries = useMemo(() => {
    return Object.entries(servicesByCategory).sort(([catA], [catB]) => {
      const orderA = serviceCategories[catA]?.order || 999;
      const orderB = serviceCategories[catB]?.order || 999;
      return orderA - orderB;
    });
  }, [servicesByCategory, serviceCategories]);

  // Tiered pricing functions
  const findTierForQuantity = (categoryId, quantity) => {
    const tiers = servicesByCategory[categoryId] || [];
    const qty = parseInt(quantity) || 0;

    for (const tier of tiers) {
      if (tier.min_qty && tier.max_qty) {
        if (qty >= tier.min_qty && qty <= tier.max_qty) {
          return tier;
        }
      }
    }
    return tiers.find(t => t.min_qty) || tiers[0];
  };

  const calculateTieredTotal = (categoryId) => {
    const qty = tieredQuantities[categoryId] || 0;
    if (qty <= 0) return { tier: null, total: 0, pricePerUnit: 0 };

    const tier = findTierForQuantity(categoryId, qty);
    if (!tier) return { tier: null, total: 0, pricePerUnit: 0 };

    return {
      tier,
      total: tier.price * qty,
      pricePerUnit: tier.price,
      quantity: qty
    };
  };

  const toggleTieredCategory = (categoryId) => {
    setActiveTieredCategories(prev => {
      const newState = { ...prev, [categoryId]: !prev[categoryId] };

      if (!newState[categoryId]) {
        setSelectedServices(ss => ss.filter(s => s.category !== categoryId));
        setTieredQuantities(tq => ({ ...tq, [categoryId]: 0 }));
      } else {
        setTieredQuantities(tq => ({ ...tq, [categoryId]: tq[categoryId] || 0 }));
      }

      return newState;
    });
  };

  const updateTieredQuantity = (categoryId, value) => {
    const qty = Math.max(0, parseInt(value) || 0);
    setTieredQuantities(prev => ({ ...prev, [categoryId]: qty }));

    if (qty > 0 && activeTieredCategories[categoryId]) {
      const tier = findTierForQuantity(categoryId, qty);
      if (tier) {
        setSelectedServices(prev => {
          const filtered = prev.filter(s => s.category !== categoryId);
          return [...filtered, { ...tier, quantity: qty }];
        });
      }
    } else {
      setSelectedServices(prev => prev.filter(s => s.category !== categoryId));
    }
  };

  // Regular service toggle
  const toggleService = (service) => {
    const existing = selectedServices.find(s => s.id === service.id);
    if (existing) {
      setSelectedServices(prev => prev.filter(s => s.id !== service.id));
    } else {
      setSelectedServices(prev => [...prev, { ...service, quantity: 1 }]);
    }
  };

  const updateServiceQuantity = (serviceId, delta) => {
    setSelectedServices(prev => prev.map(s => {
      if (s.id === serviceId) {
        const newQty = Math.max(1, s.quantity + delta);
        return { ...s, quantity: newQty };
      }
      return s;
    }));
  };

  const removeService = (serviceId) => {
    setSelectedServices(prev => prev.filter(s => s.id !== serviceId));
  };

  // Calculate total
  const totalAmount = useMemo(() => {
    return selectedServices.reduce((sum, s) => sum + (s.price * s.quantity), 0);
  }, [selectedServices]);

  // Format price
  const formatPrice = (price) => {
    if (price === 0) return 'Бесплатно';
    if (price < 10) return `${price.toFixed(2)} ₽`;
    return `${price.toLocaleString()} ₽`;
  };

  // Navigation
  const canProceed = () => {
    switch (step) {
      case 1: return true; // Products are optional
      case 2: return selectedServices.length > 0;
      default: return true;
    }
  };

  const handleNext = () => {
    if (!canProceed()) {
      if (step === 2) toast.error('Выберите хотя бы одну услугу');
      return;
    }

    if (step === 2) {
      submitQuote();
    } else {
      setStep(step + 1);
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    } else {
      navigate(`/employee/clients/${clientId}`);
    }
  };

  // Submit quote
  const submitQuote = async () => {
    setSubmitting(true);
    try {
      // Формируем данные компании из клиента
      const companyData = {
        inn: client.inn || '',
        kpp: client.kpp || '',
        ogrn: client.ogrn || '',
        name: client.company_name || client.contact_name,
        address: client.address || ''
      };

      const response = await authFetch(`${API_URL}/api/employee/clients/${clientId}/quote/full`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company: companyData,
          products: selectedProducts.map(p => ({
            id: p.id,
            name: p.name,
            tnved: p.tnved,
            category: p.category
          })),
          services: selectedServices.map(s => ({
            id: s.id,
            name: s.name,
            description: s.description || '',
            price: s.price,
            unit: s.unit,
            category: s.category,
            quantity: s.quantity || 1
          })),
          contact_name: client.contact_name,
          contact_phone: client.contact_phone,
          contact_email: client.contact_email
        })
      });

      if (response.ok) {
        const data = await response.json();
        setQuoteResult(data);
        setStep(3);
        toast.success('КП успешно создано!');
      } else {
        const error = await response.json();
        toast.error(error.detail || 'Ошибка создания КП');
      }
    } catch (error) {
      console.error('Quote error:', error);
      toast.error('Ошибка отправки запроса');
    } finally {
      setSubmitting(false);
    }
  };

  // Download PDF
  const downloadQuotePdf = async () => {
    if (!quoteResult) return;
    setDownloadingPdf(true);

    try {
      const companyData = {
        inn: client.inn || '',
        kpp: client.kpp || '',
        ogrn: client.ogrn || '',
        name: client.company_name || client.contact_name,
        address: client.address || ''
      };

      const response = await fetch(`${API_URL}/api/quote/pdf`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quote_id: quoteResult.quote_id,
          company: companyData,
          services: selectedServices.map(s => ({
            id: s.id,
            name: s.name,
            description: s.description,
            price: s.price,
            unit: s.unit,
            category: s.category,
            quantity: s.quantity
          })),
          contact_name: client.contact_name,
          contact_phone: client.contact_phone,
          contact_email: client.contact_email,
          valid_until: quoteResult.valid_until
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Ошибка генерации PDF');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `КП_${quoteResult.quote_id}_${client.inn || 'client'}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success('PDF скачан!');
    } catch (error) {
      console.error('PDF download error:', error);
      toast.error(error.message || 'Ошибка скачивания PDF');
    } finally {
      setDownloadingPdf(false);
    }
  };

  // Download Contract
  const downloadContract = async () => {
    if (!client) return;
    setDownloadingContract(true);

    try {
      const companyData = {
        inn: client.inn || '',
        kpp: client.kpp || '',
        ogrn: client.ogrn || '',
        name: client.company_name || client.contact_name,
        address: client.address || '',
        management_name: client.contact_name,
        management_post: client.contact_position || 'Директор'
      };

      const response = await fetch(`${API_URL}/api/contract/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company: companyData,
          services: selectedServices.map(s => ({
            id: s.id,
            name: s.name,
            description: s.description,
            price: s.price,
            unit: s.unit,
            category: s.category,
            quantity: s.quantity
          })),
          contact_name: client.contact_name,
          contact_phone: client.contact_phone,
          contact_email: client.contact_email
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Ошибка генерации договора');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Договор_${client.inn || 'client'}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success('Договор скачан!');
    } catch (error) {
      console.error('Contract download error:', error);
      toast.error(error.message || 'Ошибка скачивания договора');
    } finally {
      setDownloadingContract(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-gray-200 border-t-yellow-500"></div>
          <p className="text-gray-500 text-sm">Загрузка...</p>
        </div>
      </div>
    );
  }

  const stepLabels = ['Товары', 'Услуги', 'КП готово'];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(`/employee/clients/${clientId}`)}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Создание КП</h1>
            <p className="text-gray-500 mt-1">
              для {client?.contact_name}
              {client?.company_name && ` • ${client.company_name}`}
            </p>
          </div>
        </div>
      </div>

      {/* Stepper */}
      {step < 3 && (
        <div className="flex items-center justify-center gap-2">
          {stepLabels.map((label, idx) => (
            <React.Fragment key={idx}>
              <div className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                step === idx + 1
                  ? 'bg-yellow-500 text-gray-900'
                  : step > idx + 1
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-gray-100 text-gray-500'
              }`}>
                {step > idx + 1 ? <CheckCircle className="w-4 h-4" /> : <span>{idx + 1}</span>}
                <span>{label}</span>
              </div>
              {idx < stepLabels.length - 1 && (
                <div className={`w-12 h-0.5 ${step > idx + 1 ? 'bg-emerald-300' : 'bg-gray-200'}`} />
              )}
            </React.Fragment>
          ))}
        </div>
      )}

      {/* ==================== STEP 1: Products ==================== */}
      {step === 1 && (
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Product Selection */}
          <div className="lg:col-span-2">
            <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 rounded-xl bg-yellow-100">
                  <Package className="w-6 h-6 text-yellow-700" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Товары для маркировки</h2>
                  <p className="text-sm text-gray-500">Выберите товары из базы ТН ВЭД или каталога</p>
                </div>
              </div>

              {/* Search */}
              <div className="relative mb-6">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={productSearchQuery}
                  onChange={(e) => setProductSearchQuery(e.target.value)}
                  placeholder="Поиск по названию или коду ТН ВЭД..."
                  className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:border-yellow-500"
                />
                {searchingTnved && (
                  <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 animate-spin" />
                )}

                {/* Search Results Dropdown */}
                {tnvedSearchResults.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl border border-gray-200 shadow-xl z-50 max-h-[400px] overflow-y-auto">
                    <div className="p-2">
                      <div className="text-xs text-gray-500 px-3 py-2 border-b border-gray-100">
                        Найдено: {tnvedSearchResults.length}
                      </div>
                      {tnvedSearchResults.map((product, idx) => (
                        <button
                          key={idx}
                          onClick={() => addProduct(product)}
                          className="w-full text-left px-4 py-3 rounded-lg hover:bg-yellow-50 transition-colors"
                        >
                          <div className="font-medium text-gray-900">{product.name}</div>
                          <div className="flex items-center gap-2 mt-1 text-xs">
                            <span className="px-2 py-0.5 rounded bg-gray-100 text-gray-600 font-mono">
                              ТН ВЭД: {product.tnved}
                            </span>
                            {product.marking_status === 'mandatory' && (
                              <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-700">
                                Обязательная маркировка
                              </span>
                            )}
                            {product.groupName && (
                              <span className="text-gray-500">{product.groupName}</span>
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Selected Products */}
              {selectedProducts.length > 0 ? (
                <div className="space-y-2">
                  <div className="text-sm font-medium text-gray-600 mb-3">
                    Выбрано товаров: {selectedProducts.length}
                  </div>
                  {selectedProducts.map((product) => (
                    <div
                      key={product.id}
                      className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-100"
                    >
                      <div className="flex-1">
                        <div className="font-medium text-gray-900">{product.name}</div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs px-2 py-0.5 rounded bg-yellow-100 text-yellow-700 font-mono">
                            {product.tnved}
                          </span>
                          {product.category && (
                            <span className="text-xs text-gray-500">{product.category}</span>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => removeProduct(product.id)}
                        className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Package className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">Товары не выбраны</p>
                  <p className="text-sm text-gray-400 mt-1">Можно пропустить этот шаг</p>
                </div>
              )}
            </div>
          </div>

          {/* Client Info Sidebar */}
          <div className="space-y-4">
            <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <Building2 className="w-4 h-4 text-gray-400" />
                <h3 className="text-sm font-medium text-gray-600">Клиент</h3>
              </div>
              <div className="space-y-2">
                <div className="font-medium text-gray-900">{client?.contact_name}</div>
                {client?.company_name && (
                  <div className="text-sm text-gray-500">{client.company_name}</div>
                )}
                {client?.inn && (
                  <div className="text-xs text-gray-400">ИНН: {client.inn}</div>
                )}
                {client?.contact_phone && (
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Phone className="w-3 h-3" />
                    {client.contact_phone}
                  </div>
                )}
                {client?.contact_email && (
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Mail className="w-3 h-3" />
                    {client.contact_email}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================== STEP 2: Services ==================== */}
      {step === 2 && (
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Services List */}
          <div className="lg:col-span-2 space-y-4">
            {sortedCategoryEntries.map(([categoryId, categoryServices]) => {
              const category = serviceCategories[categoryId];
              const Icon = categoryIcons[categoryId] || Package;
              const isTiered = category?.tiered === true;

              // Tiered category (calculator)
              if (isTiered) {
                const isActive = activeTieredCategories[categoryId];
                const qty = tieredQuantities[categoryId] || 0;
                const calc = calculateTieredTotal(categoryId);
                const firstService = categoryServices[0];

                return (
                  <div key={categoryId} className={`bg-white rounded-xl border-2 overflow-hidden transition-all ${isActive ? 'border-emerald-400 shadow-lg' : 'border-gray-200'}`}>
                    {/* Header with toggle */}
                    <div
                      className={`px-6 py-4 border-b cursor-pointer transition-colors ${isActive ? 'bg-emerald-50 border-emerald-200' : 'bg-gray-50 border-gray-200'}`}
                      onClick={() => toggleTieredCategory(categoryId)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={isActive}
                            onChange={() => {}}
                            className="w-5 h-5 rounded border-gray-300 text-yellow-500 focus:ring-yellow-500"
                          />
                          <div className={`p-2 rounded-lg ${isActive ? 'bg-emerald-200' : 'bg-yellow-100'}`}>
                            <Icon className={`w-5 h-5 ${isActive ? 'text-emerald-700' : 'text-yellow-700'}`} />
                          </div>
                          <div>
                            <h3 className="font-semibold text-gray-900">{category?.name || categoryId}</h3>
                            <p className="text-sm text-gray-500">{firstService?.description}</p>
                          </div>
                        </div>
                        {isActive && calc.tier && (
                          <div className="text-right">
                            <div className="font-bold text-emerald-600">{formatPrice(calc.total)}</div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Calculator (expanded) */}
                    {isActive && (
                      <div className="p-6 space-y-4">
                        {/* Quantity input */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Введите количество:
                          </label>
                          <div className="flex items-center gap-3">
                            <input
                              type="number"
                              value={qty || ''}
                              onChange={(e) => updateTieredQuantity(categoryId, e.target.value)}
                              placeholder="0"
                              className={`w-32 px-4 py-2 text-lg font-semibold text-center border rounded-lg focus:outline-none focus:border-yellow-500 ${!qty ? 'border-red-300' : 'border-gray-200'}`}
                              min="0"
                            />
                            <span className="text-gray-500">шт</span>
                            {!qty && (
                              <span className="text-red-500 text-sm font-medium">← Введите количество</span>
                            )}
                          </div>
                        </div>

                        {/* Calculation result */}
                        {qty > 0 && calc.tier && (
                          <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-200">
                            <div className="flex items-center gap-2 mb-2">
                              <CheckCircle className="w-5 h-5 text-emerald-600" />
                              <span className="font-semibold text-emerald-800">Применён тариф: {calc.tier.tier}</span>
                            </div>
                            <div className="text-sm text-gray-600">
                              Цена за единицу: <span className="font-semibold">{formatPrice(calc.pricePerUnit)}</span>
                            </div>
                            <div className="text-lg font-bold text-emerald-700 mt-2">
                              Итого: {formatPrice(calc.total)}
                            </div>
                          </div>
                        )}

                        {/* All tiers table */}
                        <div>
                          <div className="text-sm font-medium text-gray-600 mb-2 flex items-center gap-2">
                            <ChevronDown className="w-4 h-4" />
                            Все тарифы:
                          </div>
                          <div className="bg-gray-50 rounded-lg overflow-hidden">
                            <table className="w-full text-sm">
                              <thead>
                                <tr className="bg-gray-100 text-gray-600">
                                  <th className="px-4 py-2 text-left">Количество</th>
                                  <th className="px-4 py-2 text-right">Цена за шт</th>
                                </tr>
                              </thead>
                              <tbody>
                                {categoryServices.map((tier) => {
                                  const isCurrentTier = calc.tier?.id === tier.id;
                                  return (
                                    <tr
                                      key={tier.id}
                                      className={`border-t border-gray-200 ${isCurrentTier ? 'bg-emerald-100 font-semibold' : ''}`}
                                    >
                                      <td className="px-4 py-2">
                                        {tier.tier}
                                        {isCurrentTier && <span className="ml-2 text-emerald-600">✓</span>}
                                      </td>
                                      <td className="px-4 py-2 text-right">{formatPrice(tier.price)}</td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              }

              // Regular category (checkboxes)
              return (
                <div key={categoryId} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-yellow-100">
                        <Icon className="w-5 h-5 text-yellow-700" />
                      </div>
                      <h3 className="font-semibold text-gray-900">{category?.name || categoryId}</h3>
                    </div>
                  </div>
                  <div className="divide-y divide-gray-100">
                    {categoryServices.map((service) => {
                      const isSelected = selectedServices.some(s => s.id === service.id);
                      const isFree = service.price === 0;

                      return (
                        <div
                          key={service.id}
                          className={`p-4 transition-colors ${isSelected ? 'bg-emerald-50' : 'hover:bg-gray-50'}`}
                        >
                          <div className="flex items-start gap-4">
                            <input
                              type="checkbox"
                              id={service.id}
                              checked={isSelected}
                              onChange={() => toggleService(service)}
                              className="mt-1 w-5 h-5 rounded border-gray-300 text-yellow-500 focus:ring-yellow-500"
                            />
                            <div className="flex-1">
                              <label htmlFor={service.id} className="cursor-pointer">
                                <div className="font-medium text-gray-900">{service.name}</div>
                                <div className="text-sm text-gray-500 mt-1">{service.description}</div>
                              </label>
                            </div>
                            <div className="text-right">
                              <div className={`font-bold ${isFree ? 'text-emerald-600' : 'text-yellow-700'}`}>
                                {formatPrice(service.price)}
                              </div>
                              {!isFree && <div className="text-xs text-gray-500">/ {service.unit}</div>}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Cart Sidebar */}
          <div className="space-y-4">
            <div className="bg-white rounded-xl border-2 border-yellow-300 shadow-lg sticky top-24">
              <div className="bg-gradient-to-r from-yellow-400 to-yellow-500 px-6 py-4 rounded-t-xl">
                <div className="flex items-center gap-3 text-gray-900">
                  <ShoppingCart className="w-6 h-6" />
                  <div>
                    <div className="font-bold">Корзина</div>
                    <div className="text-sm opacity-80">{selectedServices.length} услуг</div>
                  </div>
                </div>
              </div>

              <div className="p-4 max-h-[400px] overflow-y-auto">
                {selectedServices.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <ShoppingCart className="w-10 h-10 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">Выберите услуги из списка</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {selectedServices.map((service) => {
                      const isTieredService = serviceCategories[service.category]?.tiered;

                      return (
                        <div key={service.id} className="bg-gray-50 rounded-lg p-3">
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <div className="text-sm font-medium text-gray-900 line-clamp-2">
                              {service.name}
                              {service.tier && (
                                <span className="ml-1 text-xs text-gray-500">({service.tier})</span>
                              )}
                            </div>
                            <button
                              onClick={() => {
                                if (isTieredService) {
                                  toggleTieredCategory(service.category);
                                } else {
                                  removeService(service.id);
                                }
                              }}
                              className="p-1 rounded hover:bg-red-100 text-red-500"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                          <div className="flex items-center justify-between">
                            {isTieredService ? (
                              <div className="text-xs text-gray-500">
                                {service.quantity.toLocaleString()} × {formatPrice(service.price)}
                              </div>
                            ) : (
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => updateServiceQuantity(service.id, -1)}
                                  className="p-1 rounded bg-gray-200 hover:bg-gray-300"
                                >
                                  <Minus className="w-3 h-3" />
                                </button>
                                <span className="w-8 text-center text-sm font-semibold">{service.quantity}</span>
                                <button
                                  onClick={() => updateServiceQuantity(service.id, 1)}
                                  className="p-1 rounded bg-gray-200 hover:bg-gray-300"
                                >
                                  <Plus className="w-3 h-3" />
                                </button>
                              </div>
                            )}
                            <div className="text-sm font-bold">
                              {formatPrice(service.price * service.quantity)}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {selectedServices.length > 0 && (
                <div className="px-4 pb-4 pt-2 border-t border-gray-200">
                  <div className="flex items-center justify-between">
                    <span className="text-lg font-bold text-gray-900">Итого:</span>
                    <span className="text-2xl font-bold text-yellow-700">
                      {formatPrice(totalAmount)}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Selected Products Summary */}
            {selectedProducts.length > 0 && (
              <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
                <div className="flex items-center gap-2 mb-3">
                  <Package className="w-4 h-4 text-gray-400" />
                  <h3 className="text-sm font-medium text-gray-600">Товары ({selectedProducts.length})</h3>
                </div>
                <div className="space-y-1">
                  {selectedProducts.slice(0, 3).map((product) => (
                    <div key={product.id} className="text-xs text-gray-500 truncate">
                      {product.name}
                    </div>
                  ))}
                  {selectedProducts.length > 3 && (
                    <div className="text-xs text-gray-400">
                      и ещё {selectedProducts.length - 3}...
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ==================== STEP 3: Result ==================== */}
      {step === 3 && quoteResult && (
        <div className="max-w-3xl mx-auto">
          {/* Success Header */}
          <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-t-2xl p-8 text-white text-center">
            <div className="inline-flex p-4 rounded-full bg-white/20 mb-4">
              <CheckCircle className="w-12 h-12" />
            </div>
            <h1 className="text-3xl font-bold mb-2">КП успешно создано!</h1>
            <p className="text-emerald-100">Номер: {quoteResult.quote_id}</p>
          </div>

          {/* Quote Details */}
          <div className="bg-white rounded-b-2xl border-2 border-t-0 border-gray-200 shadow-xl">
            {/* Company Info */}
            <div className="p-6 border-b border-gray-200">
              <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                <Building2 className="w-5 h-5" />
                Заказчик
              </h3>
              <div className="bg-gray-50 rounded-xl p-4">
                <div className="font-semibold text-gray-900">{client?.company_name || client?.contact_name}</div>
                {client?.inn && (
                  <div className="text-sm text-gray-600 mt-1">
                    ИНН: {client.inn}
                    {client?.kpp && ` | КПП: ${client.kpp}`}
                  </div>
                )}
              </div>
            </div>

            {/* Services */}
            <div className="p-6 border-b border-gray-200">
              <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Состав услуг
              </h3>
              <div className="space-y-2">
                {quoteResult.services_breakdown?.map((service, idx) => (
                  <div key={idx} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                    <div>
                      <div className="font-medium text-gray-900">{service.name}</div>
                      <div className="text-sm text-gray-500">
                        {service.quantity?.toLocaleString()} {service.unit} × {formatPrice(service.price)}
                      </div>
                    </div>
                    <div className="font-bold text-gray-900">
                      {formatPrice(service.subtotal)}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Total */}
            <div className="p-6 bg-gradient-to-r from-yellow-50 to-yellow-100">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-gray-600">Итого к оплате:</div>
                  <div className="text-sm text-gray-500">Действительно до: {quoteResult.valid_until}</div>
                </div>
                <div className="text-3xl font-bold text-yellow-700">
                  {formatPrice(quoteResult.total_amount)}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="p-6">
              <div className="grid sm:grid-cols-2 gap-4 mb-4">
                <button
                  onClick={downloadQuotePdf}
                  disabled={downloadingPdf}
                  className="flex items-center justify-center gap-2 px-4 py-3 border-2 border-gray-200 rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  {downloadingPdf ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Download className="w-5 h-5" />
                  )}
                  Скачать КП
                </button>
                <button
                  onClick={downloadContract}
                  disabled={downloadingContract}
                  className="flex items-center justify-center gap-2 px-4 py-3 border-2 border-gray-200 rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  {downloadingContract ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <FileText className="w-5 h-5" />
                  )}
                  Скачать договор
                </button>
              </div>

              <div className="flex gap-4">
                <button
                  onClick={() => navigate(`/employee/clients/${clientId}`)}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gray-900 hover:bg-gray-800 text-white font-medium rounded-xl transition-colors"
                >
                  К карточке клиента
                </button>
                <button
                  onClick={() => {
                    setStep(1);
                    setSelectedProducts([]);
                    setSelectedServices([]);
                    setTieredQuantities({});
                    setActiveTieredCategories({});
                    setQuoteResult(null);
                  }}
                  className="flex items-center justify-center gap-2 px-4 py-3 bg-yellow-500 hover:bg-yellow-600 text-gray-900 font-medium rounded-xl transition-colors"
                >
                  <Plus className="w-5 h-5" />
                  Новое КП
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Navigation Buttons */}
      {step < 3 && (
        <div className="flex items-center justify-between max-w-4xl mx-auto">
          <button
            onClick={handleBack}
            className="flex items-center gap-2 px-6 py-3 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            {step === 1 ? 'К клиенту' : 'Назад'}
          </button>

          <button
            onClick={handleNext}
            disabled={submitting || !canProceed()}
            className="flex items-center gap-2 px-6 py-3 bg-yellow-500 hover:bg-yellow-600 disabled:bg-gray-200 disabled:text-gray-400 text-gray-900 font-medium rounded-xl transition-colors"
          >
            {submitting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Создание КП...
              </>
            ) : step === 2 ? (
              <>
                <FileText className="w-5 h-5" />
                Создать КП
              </>
            ) : (
              <>
                Далее
                <ArrowRight className="w-5 h-5" />
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
};

export default EmployeeQuoteCreate;
