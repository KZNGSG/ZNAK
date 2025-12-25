import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Checkbox } from '../components/ui/checkbox';
import { Label } from '../components/ui/label';
import {
  Building2, Search, ArrowLeft, ArrowRight, CheckCircle, Package,
  Plus, Minus, Trash2, FileText, CreditCard, Receipt, Download,
  Mail, Phone, User, MapPin, Loader2, AlertCircle, Sparkles,
  ClipboardCheck, QrCode, ArrowRightCircle, Printer, Headphones, Ship,
  Check, X, ChevronDown, ShoppingCart, Settings, Tag, Send, Barcode, GraduationCap
} from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import Stepper from '../components/Stepper';
import SEO, { schemas } from '../components/SEO';

const API_URL = process.env.REACT_APP_BACKEND_URL;

// Иконки для категорий услуг (обновлённые под новый прайс-лист)
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

const QuotePage = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // Получаем товары из CheckProductPage если они переданы
  const productsFromCheck = location.state?.products || [];

  const [step, setStep] = useState(productsFromCheck.length > 0 ? 1 : 1);
  const [loading, setLoading] = useState(false);
  const [hasProductsFromCheck, setHasProductsFromCheck] = useState(productsFromCheck.length > 0);

  // Step 1: Company data
  const [innQuery, setInnQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const suggestionsRef = useRef(null);

  // Step 2: Products (from CheckProductPage logic)
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [productSearchQuery, setProductSearchQuery] = useState('');
  const [productSearchResults, setProductSearchResults] = useState([]);
  const [productSearchLoading, setProductSearchLoading] = useState(false);
  const searchTimeoutRef = useRef(null);

  // Step 3: Services
  const [services, setServices] = useState([]);
  const [serviceCategories, setServiceCategories] = useState({});
  const [selectedServices, setSelectedServices] = useState([]);
  // Количества для тарифных услуг (калькулятор)
  const [tieredQuantities, setTieredQuantities] = useState({});
  // Активные тарифные категории (включены/выключены)
  const [activeTieredCategories, setActiveTieredCategories] = useState({});

  // Step 4: Contact info
  const [contactData, setContactData] = useState({
    name: '',
    phone: '',
    email: '',
    consent: false
  });

  // Step 5: Quote result
  const [quoteResult, setQuoteResult] = useState(null);

  // Download states
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [downloadingContract, setDownloadingContract] = useState(false);

  // Load categories and services on mount
  useEffect(() => {
    fetchCategories();
    fetchServices();

    // Сохраняем реферальный код партнёра из URL в localStorage
    const params = new URLSearchParams(location.search);
    const refCode = params.get('ref');
    if (refCode) {
      localStorage.setItem('partner_ref_code', refCode);
      console.log('[Partner] Saved ref code:', refCode);
    }
  }, [location.search]);

  // Инициализация товаров из CheckProductPage
  useEffect(() => {
    if (productsFromCheck.length > 0) {
      // Преобразуем формат товаров из CheckProductPage в формат QuotePage
      const mappedProducts = productsFromCheck.map(result => ({
        id: result.productInfo?.id || result.subcategory,
        name: result.productInfo?.name || result.subcategory_name || 'Товар',
        tnved: result.tnved || result.productInfo?.tnved || '',
        categoryId: result.productInfo?.categoryId || result.category,
        categoryName: result.productInfo?.categoryName || result.category,
        status: result.status || result.productInfo?.status,
        source: result.productInfo?.source || [],
        volume: result.productInfo?.volume || '',
        requires_marking: result.requires_marking
      }));
      setSelectedProducts(mappedProducts);
      toast.success(`Добавлено ${mappedProducts.length} товар(ов) из проверки`);
    }
  }, []);

  // Click outside to close suggestions
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(event.target)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Debounced INN search - начинается с 3 символов
  useEffect(() => {
    const timer = setTimeout(() => {
      if (innQuery.length >= 3) {
        searchCompany(innQuery);
      } else {
        setSuggestions([]);
        setShowSuggestions(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [innQuery]);

  const fetchCategories = async () => {
    try {
      const response = await fetch(`${API_URL}/api/check/categories`);
      const data = await response.json();
      setCategories(data.groups || []);
      if (data.groups && data.groups.length > 0) {
        setSelectedGroup(data.groups[0]);
        setSelectedCategory(data.groups[0].id);
      }
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

  const searchCompany = async (query) => {
    if (!query || query.length < 10) return;

    setSearchLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/company/suggest`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inn: query })
      });

      if (response.ok) {
        const data = await response.json();
        setSuggestions(data.suggestions || []);
        setShowSuggestions(true);
      } else {
        const error = await response.json();
        toast.error(error.detail || 'Ошибка поиска');
      }
    } catch (error) {
      console.error('Search error:', error);
      toast.error('Ошибка подключения к серверу');
    } finally {
      setSearchLoading(false);
    }
  };

  const selectCompany = (company) => {
    setSelectedCompany(company);
    setInnQuery(company.inn);
    setShowSuggestions(false);
    toast.success(`Выбрана компания: ${company.name}`);
  };

  const clearCompany = () => {
    setSelectedCompany(null);
    setInnQuery('');
    setSuggestions([]);
  };

  // Product selection (simplified from CheckProductPage)
  // Поиск товаров через API
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (productSearchQuery.length >= 2) {
      setProductSearchLoading(true);
      searchTimeoutRef.current = setTimeout(async () => {
        try {
          const response = await fetch(`${API_URL}/api/tnved/search?q=${encodeURIComponent(productSearchQuery)}&limit=15`);
          if (response.ok) {
            const data = await response.json();
            // Преобразуем результаты в нужный формат
            const results = (data.results || []).map(item => ({
              id: item.id,
              name: item.name,
              tnved: item.tnved,
              marking_status: item.marking_status,
              groupName: item.category_name || 'Маркировка',
              groupId: item.category_id
            }));
            setProductSearchResults(results);
          }
        } catch (error) {
          console.error('TNVED search error:', error);
        } finally {
          setProductSearchLoading(false);
        }
      }, 300);
    } else {
      setProductSearchResults([]);
    }

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [productSearchQuery]);

  const addProduct = (product) => {
    if (selectedProducts.find(p => p.id === product.id)) {
      toast.info('Товар уже добавлен');
      return;
    }
    setSelectedProducts(prev => [...prev, {
      id: product.id,
      name: product.name,
      tnved: product.tnved,
      category: product.groupName || ''
    }]);
    setProductSearchQuery('');
    toast.success(`Добавлен: ${product.name}`);
  };

  const removeProduct = (productId) => {
    setSelectedProducts(prev => prev.filter(p => p.id !== productId));
  };

  // Service selection
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

  const setServiceQuantity = (serviceId, quantity) => {
    const qty = Math.max(1, parseInt(quantity) || 1);
    setSelectedServices(prev => prev.map(s =>
      s.id === serviceId ? { ...s, quantity: qty } : s
    ));
  };

  const removeService = (serviceId) => {
    setSelectedServices(prev => prev.filter(s => s.id !== serviceId));
  };

  // Calculate total
  const totalAmount = useMemo(() => {
    return selectedServices.reduce((sum, s) => sum + (s.price * s.quantity), 0);
  }, [selectedServices]);

  // Services grouped by category, sorted by order
  const servicesByCategory = useMemo(() => {
    const grouped = {};
    services.forEach(service => {
      if (!grouped[service.category]) {
        grouped[service.category] = [];
      }
      grouped[service.category].push(service);
    });
    // Sort services within each category by order
    Object.keys(grouped).forEach(cat => {
      grouped[cat].sort((a, b) => (a.order || 0) - (b.order || 0));
    });
    return grouped;
  }, [services]);

  // Get sorted category entries (by category order from serviceCategories)
  const sortedCategoryEntries = useMemo(() => {
    return Object.entries(servicesByCategory).sort(([catA], [catB]) => {
      const orderA = serviceCategories[catA]?.order || 999;
      const orderB = serviceCategories[catB]?.order || 999;
      return orderA - orderB;
    });
  }, [servicesByCategory, serviceCategories]);

  // Находим подходящий тариф по количеству для категории
  const findTierForQuantity = (categoryId, quantity) => {
    const tiers = servicesByCategory[categoryId] || [];
    const qty = parseInt(quantity) || 0;

    // Ищем тариф, в диапазон которого попадает количество
    for (const tier of tiers) {
      if (tier.min_qty !== undefined && tier.max_qty !== undefined) {
        if (qty >= tier.min_qty && qty <= tier.max_qty) {
          return tier;
        }
      }
    }
    // Если не нашли — возвращаем первый тариф (минимальный)
    return tiers.find(t => t.min_qty !== undefined) || tiers[0];
  };

  // Рассчитать итог для тарифной категории
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

  // Переключение тарифной категории (вкл/выкл)
  const toggleTieredCategory = (categoryId) => {
    setActiveTieredCategories(prev => {
      const newState = { ...prev, [categoryId]: !prev[categoryId] };

      // Если выключаем — удаляем из selectedServices
      if (!newState[categoryId]) {
        setSelectedServices(ss => ss.filter(s => s.category !== categoryId));
        setTieredQuantities(tq => ({ ...tq, [categoryId]: 0 }));
      } else {
        // Если включаем — ставим начальное количество 0 (пользователь сам вводит)
        setTieredQuantities(tq => ({ ...tq, [categoryId]: tq[categoryId] || 0 }));
      }

      return newState;
    });
  };

  // Обновить количество для тарифной категории
  const updateTieredQuantity = (categoryId, value) => {
    const qty = Math.max(0, parseInt(value) || 0);
    setTieredQuantities(prev => ({ ...prev, [categoryId]: qty }));

    // Обновляем selectedServices с правильным тарифом
    if (qty > 0 && activeTieredCategories[categoryId]) {
      const tier = findTierForQuantity(categoryId, qty);
      if (tier) {
        setSelectedServices(prev => {
          // Удаляем старые записи этой категории
          const filtered = prev.filter(s => s.category !== categoryId);
          // Добавляем новую с правильным тарифом
          return [...filtered, { ...tier, quantity: qty }];
        });
      }
    } else {
      // Удаляем из selectedServices если qty = 0
      setSelectedServices(prev => prev.filter(s => s.category !== categoryId));
    }
  };

  // Форматирование цены
  const formatPrice = (price) => {
    if (price === 0) return 'Бесплатно';
    if (price < 10) return `${price.toFixed(2)} ₽`;
    return `${price.toLocaleString()} ₽`;
  };

  // Navigation
  const canProceed = () => {
    if (hasProductsFromCheck) {
      // Сокращённый flow: 3 шага
      switch (step) {
        case 1:
          // Компания + Контакты на одном шаге
          return selectedCompany !== null &&
            contactData.name.trim() !== '' &&
            contactData.phone.trim() !== '' &&
            contactData.consent === true;
        case 2: // Услуги
          return selectedServices.length > 0;
        default: return true;
      }
    } else {
      // Полный flow: 5 шагов
      switch (step) {
        case 1: return selectedCompany !== null;
        case 2: return true; // Products are optional
        case 3: return selectedServices.length > 0;
        case 4: return contactData.name && contactData.phone && contactData.consent;
        default: return true;
      }
    }
  };

  const handleNext = () => {
    if (!canProceed()) {
      if (hasProductsFromCheck) {
        // Сокращённый flow
        if (step === 1) {
          if (!selectedCompany) {
            toast.error('Выберите компанию');
          } else if (!contactData.name.trim() || !contactData.phone.trim()) {
            toast.error('Заполните контактные данные');
          } else if (!contactData.consent) {
            toast.error('Необходимо согласие на обработку ПД');
          }
        }
        if (step === 2) toast.error('Выберите хотя бы одну услугу');
      } else {
        // Полный flow
        if (step === 1) toast.error('Выберите компанию');
        if (step === 3) toast.error('Выберите хотя бы одну услугу');
        if (step === 4) toast.error('Заполните контактные данные и дайте согласие');
      }
      return;
    }

    if (hasProductsFromCheck) {
      // Сокращённый flow: 1 (Компания+Контакты) → 2 (Услуги) → submitQuote
      if (step === 2) {
        submitQuote();
      } else {
        setStep(step + 1);
      }
    } else {
      // Полный flow
      if (step === 4) {
        submitQuote();
      } else {
        setStep(step + 1);
      }
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    } else {
      navigate('/');
    }
  };

  const submitQuote = async () => {
    setLoading(true);
    try {
      // Получаем реферальный код партнёра из localStorage
      const refCode = localStorage.getItem('partner_ref_code') || null;

      const response = await fetch(`${API_URL}/api/quote/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company: selectedCompany,
          products: selectedProducts.map(p => ({
            id: p.id || 'unknown',
            name: p.name || 'Товар',
            tnved: p.tnved || '',
            category: p.categoryId || p.category || 'other'
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
          contact_name: contactData.name,
          contact_phone: contactData.phone,
          contact_email: contactData.email || null,
          ref_code: refCode  // Передаём реферальный код партнёра
        })
      });

      if (response.ok) {
        const data = await response.json();
        setQuoteResult(data);
        setStep(totalSteps); // Переход на финальный шаг (3 или 5 в зависимости от flow)
        toast.success('КП успешно сформировано!');
      } else {
        const error = await response.json();
        toast.error(error.detail || 'Ошибка создания КП');
      }
    } catch (error) {
      console.error('Quote error:', error);
      toast.error('Ошибка отправки запроса');
    } finally {
      setLoading(false);
    }
  };

  const formatPhone = (value) => {
    let cleaned = value.replace(/\D/g, '');
    if (cleaned.length > 11) cleaned = cleaned.slice(0, 11);
    if (cleaned.length > 0 && cleaned[0] !== '7') cleaned = '7' + cleaned;

    let formatted = '+7';
    if (cleaned.length > 1) formatted += ' (' + cleaned.slice(1, 4);
    if (cleaned.length >= 5) formatted += ') ' + cleaned.slice(4, 7);
    if (cleaned.length >= 8) formatted += '-' + cleaned.slice(7, 9);
    if (cleaned.length >= 10) formatted += '-' + cleaned.slice(9, 11);

    return formatted;
  };

  // Динамические шаги в зависимости от источника товаров
  const stepLabels = hasProductsFromCheck
    ? ['Компания и контакты', 'Услуги', 'КП']
    : ['Компания', 'Товары', 'Услуги', 'Контакты', 'КП'];

  // Общее количество шагов
  const totalSteps = hasProductsFromCheck ? 3 : 5;

  // Скачать PDF коммерческого предложения
  const downloadQuotePdf = async () => {
    if (!quoteResult) return;
    setDownloadingPdf(true);

    try {
      const response = await fetch(`${API_URL}/api/quote/pdf`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quote_id: quoteResult.quote_id,
          company: selectedCompany,
          services: selectedServices.map(s => ({
            id: s.id,
            name: s.name,
            description: s.description,
            price: s.price,
            unit: s.unit,
            category: s.category,
            quantity: s.quantity
          })),
          contact_name: contactData.name,
          contact_phone: contactData.phone,
          contact_email: contactData.email || null,
          valid_until: quoteResult.valid_until
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Ошибка генерации PDF');
      }

      // Скачиваем файл
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `КП_${quoteResult.quote_id}_${selectedCompany.inn}.pdf`;
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

  // Скачать договор
  const downloadContract = async () => {
    if (!selectedCompany) return;
    setDownloadingContract(true);

    try {
      const response = await fetch(`${API_URL}/api/contract/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company: selectedCompany,
          services: selectedServices.map(s => ({
            id: s.id,
            name: s.name,
            description: s.description,
            price: s.price,
            unit: s.unit,
            category: s.category,
            quantity: s.quantity
          })),
          contact_name: contactData.name,
          contact_phone: contactData.phone,
          contact_email: contactData.email || null
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Ошибка генерации договора');
      }

      // Получаем номер договора из заголовка ответа
      const contractNumber = response.headers.get('X-Contract-Number') || 'договор';

      // Скачиваем файл
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Договор_${contractNumber}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success(`Договор ${contractNumber} скачан!`);
    } catch (error) {
      console.error('Contract download error:', error);
      toast.error(error.message || 'Ошибка скачивания договора');
    } finally {
      setDownloadingContract(false);
    }
  };

  return (
    <div className="py-12 bg-gradient-to-b from-slate-50 to-white min-h-screen">
      <SEO title='Коммерческое предложение' description='Получите коммерческое предложение на услуги маркировки товаров.' keywords='КП маркировка' canonical='/quote' schema={[schemas.organization, schemas.breadcrumb([{name: 'Главная', url: '/'}, {name: 'Получить КП', url: '/quote'}])]} noindex={true} />
      <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold text-[rgb(var(--black))] mb-2">
            Получить КП
          </h1>
          <p className="text-[rgb(var(--grey-600))]">
            Сформируйте коммерческое предложение за 5 минут
          </p>
        </div>

        {step < totalSteps && <Stepper current={step} total={totalSteps} steps={stepLabels} />}

        {/* ==================== STEP 1: Company (+ Contacts при hasProductsFromCheck) ==================== */}
        {step === 1 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className={hasProductsFromCheck ? "" : "max-w-2xl mx-auto"}
          >
            <div className={hasProductsFromCheck ? "grid lg:grid-cols-3 gap-6" : ""}>
              {/* Левая колонка: Товары из проверки (только при hasProductsFromCheck) */}
              {hasProductsFromCheck && (
                <div className="lg:col-span-1">
                  <div className="bg-white rounded-2xl border-2 border-emerald-200 shadow-lg sticky top-24">
                    <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 px-5 py-4 rounded-t-2xl">
                      <div className="flex items-center gap-3 text-white">
                        <Package size={20} />
                        <div>
                          <div className="font-bold">Выбранные товары</div>
                          <div className="text-sm text-emerald-100">{selectedProducts.length} товар(ов)</div>
                        </div>
                      </div>
                    </div>
                    <div className="p-4 max-h-[400px] overflow-y-auto">
                      {selectedProducts.length > 0 ? (
                        <div className="space-y-2">
                          {selectedProducts.map((product) => (
                            <div key={product.id} className="bg-gray-50 rounded-xl p-3">
                              <div className="font-medium text-sm text-gray-900 line-clamp-2">
                                {product.name}
                              </div>
                              <div className="flex items-center gap-2 mt-2">
                                <span className="font-mono text-xs font-bold text-[rgb(var(--brand-yellow-700))] bg-[rgb(var(--brand-yellow-100))] px-2 py-0.5 rounded">
                                  {product.tnved}
                                </span>
                                {product.requires_marking && (
                                  <span className="text-xs px-2 py-0.5 rounded bg-emerald-100 text-emerald-700">
                                    Маркировка
                                  </span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-6 text-gray-500">
                          <Package size={32} className="mx-auto mb-2 opacity-30" />
                          <p className="text-sm">Товары не выбраны</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Правая колонка (или единственная): Компания + Контакты */}
              <div className={hasProductsFromCheck ? "lg:col-span-2 space-y-6" : ""}>
                {/* Карточка компании */}
                <div className="bg-white rounded-2xl p-8 border-2 border-gray-200 shadow-lg">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-3 rounded-xl bg-[rgb(var(--brand-yellow-100))]">
                      <Building2 size={24} className="text-[rgb(var(--brand-yellow-700))]" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-gray-900">Данные компании</h2>
                      <p className="text-sm text-gray-500">Введите ИНН или ОГРН для автозаполнения</p>
                    </div>
                  </div>

                  {/* INN Input */}
                  <div className="relative mb-6" ref={suggestionsRef}>
                    <Label className="text-sm font-semibold text-gray-700 mb-2 block">
                      ИНН, ОГРН или название компании <span className="text-red-500">*</span>
                    </Label>
                    <div className="relative">
                      <Search size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                      <Input
                        type="text"
                        value={innQuery}
                        onChange={(e) => setInnQuery(e.target.value)}
                        onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                        placeholder="Введите ИНН, ОГРН или название..."
                        className="pl-12 pr-12 py-4 text-lg rounded-xl border-2"
                      />
                      {searchLoading && (
                        <Loader2 size={20} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 animate-spin" />
                      )}
                      {innQuery && !searchLoading && (
                        <button
                          onClick={() => { setInnQuery(''); setSuggestions([]); setSelectedCompany(null); }}
                          className="absolute right-4 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-gray-100"
                        >
                          <X size={16} className="text-gray-400" />
                        </button>
                      )}
                    </div>

                    {/* Suggestions Dropdown */}
                    <AnimatePresence>
                      {showSuggestions && suggestions.length > 0 && (
                        <motion.div
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl border-2 border-gray-200 shadow-xl z-50 max-h-[400px] overflow-y-auto"
                        >
                          <div className="p-2">
                            <div className="text-xs text-gray-500 px-3 py-2 border-b border-gray-100">
                              Найдено: {suggestions.length}
                            </div>
                            {suggestions.map((company, idx) => (
                              <button
                                key={idx}
                                onClick={() => selectCompany(company)}
                                className="w-full text-left px-4 py-3 rounded-lg hover:bg-[rgb(var(--brand-yellow-50))] transition-colors"
                              >
                                <div className="font-semibold text-gray-900">{company.name}</div>
                                <div className="flex flex-wrap gap-2 mt-1 text-xs">
                                  <span className="px-2 py-0.5 rounded bg-gray-100 text-gray-600">
                                    ИНН: {company.inn}
                                  </span>
                                  {company.kpp && (
                                    <span className="px-2 py-0.5 rounded bg-gray-100 text-gray-600">
                                      КПП: {company.kpp}
                                    </span>
                                  )}
                                  <span className={`px-2 py-0.5 rounded ${
                                    company.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                                  }`}>
                                    {company.status === 'ACTIVE' ? 'Действующая' : company.status}
                                  </span>
                                </div>
                                <div className="text-xs text-gray-500 mt-1 line-clamp-1">
                                  {company.address}
                                </div>
                              </button>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Selected Company Card */}
                  {selectedCompany && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="bg-gradient-to-r from-emerald-50 to-emerald-100 rounded-xl p-6 border-2 border-emerald-200"
                    >
                      <div className="flex items-start justify-between gap-4 mb-4">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-emerald-200">
                            <CheckCircle size={20} className="text-emerald-700" />
                          </div>
                          <div>
                            <div className="text-sm text-emerald-600 font-medium">Компания выбрана</div>
                            <div className="font-bold text-gray-900">{selectedCompany.name}</div>
                          </div>
                        </div>
                        <button
                          onClick={clearCompany}
                          className="p-2 rounded-lg hover:bg-emerald-200 text-emerald-700"
                        >
                          <X size={18} />
                        </button>
                      </div>

                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <div className="text-gray-500">ИНН</div>
                          <div className="font-semibold">{selectedCompany.inn}</div>
                        </div>
                        {selectedCompany.kpp && (
                          <div>
                            <div className="text-gray-500">КПП</div>
                            <div className="font-semibold">{selectedCompany.kpp}</div>
                          </div>
                        )}
                        {selectedCompany.ogrn && (
                          <div>
                            <div className="text-gray-500">ОГРН</div>
                            <div className="font-semibold">{selectedCompany.ogrn}</div>
                          </div>
                        )}
                        {selectedCompany.management_name && (
                          <div>
                            <div className="text-gray-500">{selectedCompany.management_post || 'Руководитель'}</div>
                            <div className="font-semibold">{selectedCompany.management_name}</div>
                          </div>
                        )}
                        <div className="col-span-2">
                          <div className="text-gray-500">Адрес</div>
                          <div className="font-semibold">{selectedCompany.address || '—'}</div>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {/* Helper text */}
                  {!selectedCompany && innQuery.length > 0 && innQuery.length < 3 && (
                    <div className="flex items-center gap-2 text-sm text-amber-600 mt-2">
                      <AlertCircle size={16} />
                      <span>Введите минимум 3 символа для поиска</span>
                    </div>
                  )}
                </div>

                {/* Контактные данные (только при hasProductsFromCheck, иначе отдельный шаг) */}
                {hasProductsFromCheck && (
                  <div className="bg-white rounded-2xl p-8 border-2 border-gray-200 shadow-lg">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="p-3 rounded-xl bg-[rgb(var(--brand-yellow-100))]">
                        <User size={24} className="text-[rgb(var(--brand-yellow-700))]" />
                      </div>
                      <div>
                        <h2 className="text-xl font-bold text-gray-900">Контактные данные</h2>
                        <p className="text-sm text-gray-500">Для связи и отправки КП</p>
                      </div>
                    </div>

                    <div className="space-y-5">
                      {/* Name */}
                      <div>
                        <Label className="text-sm font-semibold text-gray-700 mb-2 block">
                          <User size={16} className="inline mr-2" />
                          Контактное лицо <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          type="text"
                          value={contactData.name}
                          onChange={(e) => setContactData(prev => ({ ...prev, name: e.target.value }))}
                          placeholder="Иван Иванов"
                          className="rounded-xl"
                        />
                      </div>

                      {/* Phone */}
                      <div>
                        <Label className="text-sm font-semibold text-gray-700 mb-2 block">
                          <Phone size={16} className="inline mr-2" />
                          Телефон <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          type="tel"
                          value={contactData.phone}
                          onChange={(e) => setContactData(prev => ({ ...prev, phone: formatPhone(e.target.value) }))}
                          placeholder="+7 (___) ___-__-__"
                          className="rounded-xl"
                        />
                      </div>

                      {/* Email */}
                      <div>
                        <Label className="text-sm font-semibold text-gray-700 mb-2 block">
                          <Mail size={16} className="inline mr-2" />
                          Email (для отправки КП)
                        </Label>
                        <Input
                          type="email"
                          value={contactData.email}
                          onChange={(e) => setContactData(prev => ({ ...prev, email: e.target.value }))}
                          placeholder="example@mail.ru"
                          className="rounded-xl"
                        />
                      </div>

                      {/* Consent */}
                      <div className="flex items-start gap-3 p-4 rounded-xl bg-gray-50 border border-gray-200">
                        <Checkbox
                          id="consent-step1"
                          checked={contactData.consent}
                          onCheckedChange={(checked) => setContactData(prev => ({ ...prev, consent: checked }))}
                        />
                        <Label htmlFor="consent-step1" className="text-sm text-gray-700 cursor-pointer">
                          Я согласен на обработку персональных данных и получение коммерческого предложения
                          <span className="text-red-500"> *</span>
                        </Label>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {/* ==================== STEP 2: Products (только для полного flow) ==================== */}
        {step === 2 && !hasProductsFromCheck && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="bg-white rounded-2xl p-6 border-2 border-gray-200 shadow-lg mb-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 rounded-xl bg-[rgb(var(--brand-yellow-100))]">
                  <Package size={24} className="text-[rgb(var(--brand-yellow-700))]" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Какие товары маркируете?</h2>
                  <p className="text-sm text-gray-500">Необязательно, но поможет подобрать услуги</p>
                </div>
              </div>

              {/* Product Search */}
              <div className="relative mb-4">
                <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                <Input
                  type="text"
                  value={productSearchQuery}
                  onChange={(e) => setProductSearchQuery(e.target.value)}
                  placeholder="Поиск по названию или ТН ВЭД..."
                  className="pl-11 rounded-xl"
                />

                {productSearchLoading && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl border-2 border-gray-200 shadow-xl z-50 p-4 text-center">
                    <div className="animate-spin inline-block w-5 h-5 border-2 border-yellow-500 border-t-transparent rounded-full"></div>
                    <span className="ml-2 text-gray-500">Поиск...</span>
                  </div>
                )}
                {!productSearchLoading && productSearchResults.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl border-2 border-gray-200 shadow-xl z-50 max-h-[300px] overflow-y-auto">
                    {productSearchResults.map((product, idx) => (
                      <button
                        key={idx}
                        onClick={() => addProduct(product)}
                        className="w-full text-left px-4 py-3 hover:bg-[rgb(var(--brand-yellow-50))] flex items-center justify-between"
                      >
                        <div>
                          <div className="font-medium text-gray-900">{product.name}</div>
                          <div className="text-xs text-gray-500">
                            ТН ВЭД: {product.tnved} | {product.groupName}
                          </div>
                        </div>
                        <Plus size={18} className="text-[rgb(var(--brand-yellow-600))]" />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Selected Products */}
              {selectedProducts.length > 0 && (
                <div className="space-y-2">
                  <div className="text-sm font-medium text-gray-700 mb-2">
                    Выбрано товаров: {selectedProducts.length}
                  </div>
                  {selectedProducts.map((product) => (
                    <div
                      key={product.id}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-xl"
                    >
                      <div>
                        <div className="font-medium text-gray-900">{product.name}</div>
                        <div className="text-xs text-gray-500">ТН ВЭД: {product.tnved}</div>
                      </div>
                      <button
                        onClick={() => removeProduct(product.id)}
                        className="p-2 rounded-lg hover:bg-red-100 text-red-500"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {selectedProducts.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <Package size={48} className="mx-auto mb-2 opacity-30" />
                  <p>Товары не выбраны</p>
                  <p className="text-sm">Можно пропустить этот шаг</p>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* ==================== STEP: Services ==================== */}
        {((hasProductsFromCheck && step === 2) || (!hasProductsFromCheck && step === 3)) && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="grid lg:grid-cols-3 gap-6">
              {/* Services List */}
              <div className="lg:col-span-2 space-y-6">
                {sortedCategoryEntries.map(([categoryId, categoryServices]) => {
                  const category = serviceCategories[categoryId];
                  const Icon = categoryIcons[categoryId] || Package;
                  const isTiered = category?.tiered === true;

                  // Для тарифных категорий — калькулятор
                  if (isTiered) {
                    const isActive = activeTieredCategories[categoryId];
                    const qty = tieredQuantities[categoryId] || 0;
                    const calc = calculateTieredTotal(categoryId);
                    const firstService = categoryServices[0];

                    return (
                      <div key={categoryId} className={`bg-white rounded-2xl border-2 overflow-hidden transition-all ${isActive ? 'border-emerald-400 shadow-lg' : 'border-gray-200'}`}>
                        {/* Header с переключателем */}
                        <div
                          className={`px-6 py-4 border-b cursor-pointer transition-colors ${isActive ? 'bg-emerald-50 border-emerald-200' : 'bg-gradient-to-r from-gray-50 to-gray-100 border-gray-200'}`}
                          onClick={() => toggleTieredCategory(categoryId)}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <Checkbox
                                checked={isActive}
                                onCheckedChange={() => toggleTieredCategory(categoryId)}
                                className="pointer-events-none"
                              />
                              <div className={`p-2 rounded-lg ${isActive ? 'bg-emerald-200' : 'bg-[rgb(var(--brand-yellow-100))]'}`}>
                                <Icon size={20} className={isActive ? 'text-emerald-700' : 'text-[rgb(var(--brand-yellow-700))]'} />
                              </div>
                              <div>
                                <h3 className="font-bold text-gray-900">{category?.name || categoryId}</h3>
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

                        {/* Калькулятор (раскрывается при активации) */}
                        <AnimatePresence>
                          {isActive && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              className="overflow-hidden"
                            >
                              <div className="p-6 space-y-4">
                                {/* Поле ввода количества */}
                                <div>
                                  <Label className="text-sm font-semibold text-gray-700 mb-2 block">
                                    Введите количество:
                                  </Label>
                                  <div className="flex items-center gap-3">
                                    <Input
                                      type="number"
                                      value={qty || ''}
                                      onChange={(e) => updateTieredQuantity(categoryId, e.target.value)}
                                      placeholder="0"
                                      className={`w-32 text-lg font-semibold text-center ${!qty ? 'border-red-300 focus:border-red-500' : ''}`}
                                      min="0"
                                    />
                                    <span className="text-gray-500">шт</span>
                                    {!qty && (
                                      <span className="text-red-500 text-sm font-medium">← Введите количество</span>
                                    )}
                                  </div>
                                </div>

                                {/* Результат расчёта */}
                                {qty > 0 && calc.tier && (
                                  <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-200">
                                    <div className="flex items-center gap-2 mb-2">
                                      <CheckCircle size={18} className="text-emerald-600" />
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

                                {/* Таблица всех тарифов */}
                                <div>
                                  <div className="text-sm font-medium text-gray-600 mb-2 flex items-center gap-2">
                                    <ChevronDown size={14} />
                                    Все тарифы:
                                  </div>
                                  <div className="bg-gray-50 rounded-lg overflow-hidden">
                                    <table className="w-full text-sm">
                                      <thead>
                                        <tr className="bg-gray-100 text-gray-600">
                                          <th className="px-3 py-2 text-left">Количество</th>
                                          <th className="px-3 py-2 text-right">Цена за шт</th>
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
                                              <td className="px-3 py-2">
                                                {tier.tier}
                                                {isCurrentTier && (
                                                  <span className="ml-2 text-emerald-600">✓</span>
                                                )}
                                              </td>
                                              <td className="px-3 py-2 text-right">
                                                {formatPrice(tier.price)}
                                              </td>
                                            </tr>
                                          );
                                        })}
                                      </tbody>
                                    </table>
                                  </div>
                                </div>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  }

                  // Для обычных категорий — чекбоксы
                  return (
                    <div key={categoryId} className="bg-white rounded-2xl border-2 border-gray-200 overflow-hidden">
                      <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-6 py-4 border-b border-gray-200">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-[rgb(var(--brand-yellow-100))]">
                            <Icon size={20} className="text-[rgb(var(--brand-yellow-700))]" />
                          </div>
                          <h3 className="font-bold text-gray-900">{category?.name || categoryId}</h3>
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
                                <Checkbox
                                  id={service.id}
                                  checked={isSelected}
                                  onCheckedChange={() => toggleService(service)}
                                  className="mt-1"
                                />
                                <div className="flex-1">
                                  <Label htmlFor={service.id} className="cursor-pointer">
                                    <div className="font-semibold text-gray-900">{service.name}</div>
                                    <div className="text-sm text-gray-500 mt-1">{service.description}</div>
                                  </Label>
                                </div>
                                <div className="text-right">
                                  <div className={`font-bold ${isFree ? 'text-emerald-600' : 'text-[rgb(var(--brand-yellow-700))]'}`}>
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
              <div className="lg:col-span-1">
                <div className="bg-white rounded-2xl border-2 border-[rgb(var(--brand-yellow-300))] shadow-lg sticky top-24">
                  <div className="bg-gradient-to-r from-[rgb(var(--brand-yellow-400))] to-[rgb(var(--brand-yellow-500))] px-6 py-4 rounded-t-2xl">
                    <div className="flex items-center gap-3 text-black">
                      <ShoppingCart size={24} />
                      <div>
                        <div className="font-bold">Ваш заказ</div>
                        <div className="text-sm opacity-80">{selectedServices.length} услуг</div>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 max-h-[400px] overflow-y-auto">
                    {selectedServices.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        <ShoppingCart size={32} className="mx-auto mb-2 opacity-30" />
                        <p className="text-sm">Выберите услуги из списка</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {selectedServices.map((service) => {
                          const isTieredService = serviceCategories[service.category]?.tiered;

                          return (
                            <div key={service.id} className="bg-gray-50 rounded-xl p-3">
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
                                  <X size={14} />
                                </button>
                              </div>
                              <div className="flex items-center justify-between">
                                {isTieredService ? (
                                  // Для тарифных — показываем количество без кнопок (изменяется в калькуляторе)
                                  <div className="text-xs text-gray-500">
                                    {service.quantity.toLocaleString()} × {formatPrice(service.price)}
                                  </div>
                                ) : (
                                  // Для обычных — кнопки +/-
                                  <div className="flex items-center gap-2">
                                    <button
                                      onClick={() => updateServiceQuantity(service.id, -1)}
                                      className="p-1 rounded-lg bg-gray-200 hover:bg-gray-300"
                                    >
                                      <Minus size={14} />
                                    </button>
                                    <input
                                      type="number"
                                      value={service.quantity}
                                      onChange={(e) => setServiceQuantity(service.id, e.target.value)}
                                      className="w-12 text-center text-sm font-semibold border rounded-lg py-1"
                                      min="1"
                                    />
                                    <button
                                      onClick={() => updateServiceQuantity(service.id, 1)}
                                      className="p-1 rounded-lg bg-gray-200 hover:bg-gray-300"
                                    >
                                      <Plus size={14} />
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
                      <div className="flex items-center justify-between mb-4">
                        <span className="text-lg font-bold text-gray-900">Итого:</span>
                        <span className="text-2xl font-bold text-[rgb(var(--brand-yellow-700))]">
                          {totalAmount < 10
                            ? `${totalAmount.toFixed(2)} ₽`
                            : `${totalAmount.toLocaleString()} ₽`}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* ==================== STEP 4: Contact (только для полного flow) ==================== */}
        {step === 4 && !hasProductsFromCheck && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-2xl mx-auto"
          >
            <div className="bg-white rounded-2xl p-8 border-2 border-gray-200 shadow-lg">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 rounded-xl bg-[rgb(var(--brand-yellow-100))]">
                  <User size={24} className="text-[rgb(var(--brand-yellow-700))]" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Контактные данные</h2>
                  <p className="text-sm text-gray-500">Для связи и отправки КП</p>
                </div>
              </div>

              <div className="space-y-5">
                {/* Name */}
                <div>
                  <Label className="text-sm font-semibold text-gray-700 mb-2 block">
                    <User size={16} className="inline mr-2" />
                    Контактное лицо <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    type="text"
                    value={contactData.name}
                    onChange={(e) => setContactData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Иван Иванов"
                    className="rounded-xl"
                  />
                </div>

                {/* Phone */}
                <div>
                  <Label className="text-sm font-semibold text-gray-700 mb-2 block">
                    <Phone size={16} className="inline mr-2" />
                    Телефон <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    type="tel"
                    value={contactData.phone}
                    onChange={(e) => setContactData(prev => ({ ...prev, phone: formatPhone(e.target.value) }))}
                    placeholder="+7 (___) ___-__-__"
                    className="rounded-xl"
                  />
                </div>

                {/* Email */}
                <div>
                  <Label className="text-sm font-semibold text-gray-700 mb-2 block">
                    <Mail size={16} className="inline mr-2" />
                    Email (для отправки КП)
                  </Label>
                  <Input
                    type="email"
                    value={contactData.email}
                    onChange={(e) => setContactData(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="example@mail.ru"
                    className="rounded-xl"
                  />
                </div>

                {/* Consent */}
                <div className="flex items-start gap-3 p-4 rounded-xl bg-gray-50 border border-gray-200">
                  <Checkbox
                    id="consent"
                    checked={contactData.consent}
                    onCheckedChange={(checked) => setContactData(prev => ({ ...prev, consent: checked }))}
                  />
                  <Label htmlFor="consent" className="text-sm text-gray-700 cursor-pointer">
                    Я согласен на обработку персональных данных и получение коммерческого предложения
                    <span className="text-red-500"> *</span>
                  </Label>
                </div>
              </div>

              {/* Summary Preview */}
              <div className="mt-8 p-6 bg-gradient-to-r from-[rgb(var(--brand-yellow-50))] to-[rgb(var(--brand-yellow-100))] rounded-xl border border-[rgb(var(--brand-yellow-200))]">
                <h3 className="font-bold text-gray-900 mb-4">Сводка заказа</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Компания:</span>
                    <span className="font-medium">{selectedCompany?.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Товаров:</span>
                    <span className="font-medium">{selectedProducts.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Услуг:</span>
                    <span className="font-medium">{selectedServices.length}</span>
                  </div>
                  <div className="border-t border-[rgb(var(--brand-yellow-300))] pt-2 mt-2">
                    <div className="flex justify-between text-lg">
                      <span className="font-bold">Итого:</span>
                      <span className="font-bold text-[rgb(var(--brand-yellow-700))]">
                        {totalAmount < 10
                          ? `${totalAmount.toFixed(2)} ₽`
                          : `${totalAmount.toLocaleString()} ₽`}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* ==================== STEP: Quote Result ==================== */}
        {step === totalSteps && quoteResult && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="max-w-3xl mx-auto"
          >
            {/* Success Header */}
            <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-t-3xl p-8 text-white text-center">
              <div className="inline-flex p-4 rounded-full bg-white/20 mb-4">
                <CheckCircle size={48} />
              </div>
              <h1 className="text-3xl font-bold mb-2">КП успешно сформировано!</h1>
              <p className="text-emerald-100">Номер: {quoteResult.quote_id}</p>
            </div>

            {/* Quote Details */}
            <div className="bg-white rounded-b-3xl border-2 border-t-0 border-gray-200 shadow-xl">
              {/* Company Info */}
              <div className="p-6 border-b border-gray-200">
                <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                  <Building2 size={18} />
                  Заказчик
                </h3>
                <div className="bg-gray-50 rounded-xl p-4">
                  <div className="font-semibold text-gray-900">{selectedCompany?.name}</div>
                  <div className="text-sm text-gray-600 mt-1">
                    ИНН: {selectedCompany?.inn}
                    {selectedCompany?.kpp && ` | КПП: ${selectedCompany.kpp}`}
                  </div>
                </div>
              </div>

              {/* Services */}
              <div className="p-6 border-b border-gray-200">
                <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                  <FileText size={18} />
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
              <div className="p-6 bg-gradient-to-r from-[rgb(var(--brand-yellow-50))] to-[rgb(var(--brand-yellow-100))]">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-gray-600">Итого к оплате:</div>
                    <div className="text-sm text-gray-500">Действительно до: {quoteResult.valid_until}</div>
                  </div>
                  <div className="text-3xl font-bold text-[rgb(var(--brand-yellow-700))]">
                    {formatPrice(quoteResult.total_amount)}
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="p-6">
                <div className="grid sm:grid-cols-2 gap-4 mb-6">
                  <Button
                    onClick={downloadQuotePdf}
                    disabled={downloadingPdf}
                    variant="outline"
                    className="rounded-xl py-4 flex items-center justify-center gap-2 border-2"
                  >
                    {downloadingPdf ? (
                      <Loader2 size={20} className="animate-spin" />
                    ) : (
                      <Download size={20} />
                    )}
                    Скачать КП
                  </Button>
                  <Button
                    onClick={downloadContract}
                    disabled={downloadingContract}
                    variant="outline"
                    className="rounded-xl py-4 flex items-center justify-center gap-2 border-2"
                  >
                    {downloadingContract ? (
                      <Loader2 size={20} className="animate-spin" />
                    ) : (
                      <FileText size={20} />
                    )}
                    Скачать договор
                  </Button>
  {/* Кнопка "Получить счёт" убрана - счёт внутри договора */}
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <Button
                    onClick={() => toast.info('ЮKassa в разработке')}
                    className="btn-gradient rounded-xl py-4 flex items-center justify-center gap-2"
                  >
                    <CreditCard size={20} />
                    Оплатить картой
                  </Button>
                  <Button
                    onClick={() => navigate('/contact')}
                    className="bg-gray-900 hover:bg-gray-800 text-white rounded-xl py-4 flex items-center justify-center gap-2"
                  >
                    <Phone size={20} />
                    Связаться с нами
                  </Button>
                </div>

                {contactData.email && (
                  <div className="mt-6 p-4 bg-emerald-50 rounded-xl border border-emerald-200 text-center">
                    <CheckCircle size={20} className="inline mr-2 text-emerald-600" />
                    <span className="text-emerald-700">
                      КП отправлено на {contactData.email}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* New Quote Button */}
            <div className="text-center mt-8">
              <Button
                onClick={() => {
                  setStep(1);
                  setSelectedCompany(null);
                  setSelectedProducts([]);
                  setSelectedServices([]);
                  setQuoteResult(null);
                  setInnQuery('');
                }}
                variant="outline"
                className="rounded-xl"
              >
                <Sparkles size={18} className="mr-2" />
                Создать новое КП
              </Button>
            </div>
          </motion.div>
        )}

        {/* Navigation Buttons */}
        {step < totalSteps && (
          <div className="flex items-center justify-between mt-8 max-w-4xl mx-auto">
            <Button
              onClick={handleBack}
              variant="secondary"
              className="rounded-xl flex items-center gap-2"
            >
              <ArrowLeft size={18} />
              {step === 1 ? 'На главную' : 'Назад'}
            </Button>

            <Button
              onClick={handleNext}
              className="btn-gradient rounded-xl flex items-center gap-2"
              disabled={loading || !canProceed()}
            >
              {loading ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Создание КП...
                </>
              ) : (hasProductsFromCheck ? step === 2 : step === 4) ? (
                <>
                  <FileText size={18} />
                  Сформировать КП
                </>
              ) : (
                <>
                  Далее
                  <ArrowRight size={18} />
                </>
              )}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default QuotePage;
