import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { RadioGroup, RadioGroupItem } from '../components/ui/radio-group';
import { Checkbox } from '../components/ui/checkbox';
import { Label } from '../components/ui/label';
import {
  CheckCircle, XCircle, ArrowLeft, ArrowRight, Package, FlaskConical,
  Check, Search, X, ChevronDown, ChevronRight, Plus, Trash2, ShoppingCart,
  FileText, AlertTriangle, Sparkles, Send, ClipboardList, Phone, User, Loader2,
  Utensils, Pill, SprayCan, Box, Car, HardHat, Cpu, Rocket, Database, BarChart3,
  BadgeCheck, HelpCircle
} from 'lucide-react';
import { toast } from 'sonner';
import Stepper from '../components/Stepper';

const API_URL = process.env.REACT_APP_BACKEND_URL;

// Иконки для категорий
const CATEGORY_ICONS = {
  'food_drinks': Utensils,
  'pharma': Pill,
  'cosmetics': SprayCan,
  'non_food': Box,
  'auto': Car,
  'construction': HardHat,
  'electronics': Cpu,
  'pilot': Rocket
};

const CheckProductPage = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [categories, setCategories] = useState([]);

  // Новая структура: выбранная категория и подкатегория
  const [expandedCategory, setExpandedCategory] = useState(null);
  const [selectedSubcategory, setSelectedSubcategory] = useState(null);

  // Multi-select: array of selected products
  const [selectedProducts, setSelectedProducts] = useState([]);

  // Results for all products
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const searchRef = useRef(null);

  // Callback modal state
  const [showCallbackModal, setShowCallbackModal] = useState(false);
  const [callbackData, setCallbackData] = useState({ name: '', phone: '' });
  const [callbackLoading, setCallbackLoading] = useState(false);

  // Main TNVED search state (единый источник - большая база 16000+)
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const searchTimeoutRef = useRef(null);

  // TNVED statistics state
  const [tnvedStats, setTnvedStats] = useState({ total: 0, mandatory: 0, experimental: 0, not_required: 0 });

  // Timeline statistics state
  const [timelineStats, setTimelineStats] = useState({ active: 0, partial: 0, upcoming: 0 });

  // Initial data loading state
  const [initialLoading, setInitialLoading] = useState(true);

  useEffect(() => {
    fetchInitialData();
  }, []);

  // Single unified request for all initial data
  const fetchInitialData = async () => {
    try {
      const response = await fetch(`${API_URL}/api/check/init`);
      if (response.ok) {
        const data = await response.json();

        // Set categories
        setCategories(data.groups || []);

        // Set TNVED stats
        setTnvedStats(data.tnved_stats || { total: 0, mandatory: 0, experimental: 0, not_required: 0 });

        // Set timeline stats
        setTimelineStats(data.timeline_stats || { active: 0, partial: 0, upcoming: 0 });

        // Expand first category with subcategories
        if (data.groups && data.groups.length > 0) {
          const firstWithSubs = data.groups.find(g => g.subcategories && g.subcategories.length > 0);
          if (firstWithSubs) {
            setExpandedCategory(firstWithSubs.id);
            if (firstWithSubs.subcategories.length > 0) {
              setSelectedSubcategory(firstWithSubs.subcategories[0]);
            }
          }
        }
      }
    } catch (error) {
      console.error('Failed to fetch initial data:', error);
      toast.error('Ошибка загрузки данных');
    } finally {
      setInitialLoading(false);
    }
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setIsSearchFocused(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Effect to search TNVED API (единый источник - большая база 16000+)
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (searchQuery.length >= 2) {
      setSearchLoading(true);
      searchTimeoutRef.current = setTimeout(async () => {
        try {
          const response = await fetch(`${API_URL}/api/tnved/search?q=${encodeURIComponent(searchQuery)}&limit=20`);
          if (response.ok) {
            const data = await response.json();
            setSearchResults(data.results || []);
          }
        } catch (error) {
          console.error('TNVED search error:', error);
        } finally {
          setSearchLoading(false);
        }
      }, 300);
    } else {
      setSearchResults([]);
      setSearchLoading(false);
    }

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery]);

  // Добавление товара из поиска по ТН ВЭД
  const handleSearchSelect = (item) => {
    const productId = `tnved_${item.code}`;
    const exists = selectedProducts.find(p => p.id === productId);

    if (exists) {
      toast.info('Товар уже добавлен в список');
      return;
    }

    const newProduct = {
      id: productId,
      name: item.name,
      tnved: item.code,
      categoryId: 'tnved_search',
      categoryName: 'ТН ВЭД',
      subcategoryId: 'tnved_search',
      subcategoryName: 'Поиск по ТН ВЭД',
      markingStatus: item.marking_status,
      source: [],
      volume: ''
    };

    setSelectedProducts(prev => [...prev, newProduct]);
    toast.success(`Добавлено: ${item.name.substring(0, 50)}...`);
    setSearchQuery('');
    setIsSearchFocused(false);
  };

  const clearSearch = () => {
    setSearchQuery('');
    setIsSearchFocused(false);
    setSearchResults([]);
  };


  // Toggle category accordion
  const toggleCategory = (categoryId) => {
    if (expandedCategory === categoryId) {
      setExpandedCategory(null);
    } else {
      setExpandedCategory(categoryId);
      // Выбрать первую подкатегорию при раскрытии
      const category = categories.find(c => c.id === categoryId);
      if (category?.subcategories?.length > 0) {
        setSelectedSubcategory(category.subcategories[0]);
      }
    }
  };

  // Select subcategory
  const selectSubcategory = (subcategory, categoryId) => {
    setSelectedSubcategory({ ...subcategory, categoryId });
  };

  // Add product to selection
  const addProduct = (product, categoryId, subcategoryId) => {
    const exists = selectedProducts.find(p => p.id === product.id);
    if (exists) {
      toast.info('Товар уже добавлен в список');
      return;
    }

    const category = categories.find(c => c.id === categoryId);
    const subcategory = category?.subcategories?.find(s => s.id === subcategoryId);

    const newProduct = {
      id: product.id,
      name: product.name,
      tnved: product.tnved,
      categoryId: categoryId,
      categoryName: category?.name || '',
      subcategoryId: subcategoryId,
      subcategoryName: subcategory?.name || '',
      source: [],
      volume: ''
    };

    setSelectedProducts(prev => [...prev, newProduct]);
    toast.success(`Добавлено: ${product.name}`);
  };

  // Remove product from selection
  const removeProduct = (productId) => {
    setSelectedProducts(prev => prev.filter(p => p.id !== productId));
  };

  // Update product details (source/volume)
  const updateProductDetails = (productId, field, value) => {
    setSelectedProducts(prev => prev.map(p =>
      p.id === productId ? { ...p, [field]: value } : p
    ));
  };

  // Toggle source selection (multiple choice)
  const toggleSource = (productId, sourceValue) => {
    setSelectedProducts(prev => prev.map(p => {
      if (p.id !== productId) return p;
      const currentSources = p.source || [];
      const newSources = currentSources.includes(sourceValue)
        ? currentSources.filter(s => s !== sourceValue)
        : [...currentSources, sourceValue];
      return { ...p, source: newSources };
    }));
  };

  // Check if product is selected
  const isProductSelected = (productId) => {
    return selectedProducts.some(p => p.id === productId);
  };

  const handleNext = () => {
    if (step === 1) {
      if (selectedProducts.length === 0) {
        toast.error('Выберите хотя бы один товар');
        return;
      }
      setStep(2);
    } else if (step === 2) {
      const incomplete = selectedProducts.find(p => !p.source || p.source.length === 0);
      if (incomplete) {
        toast.error(`Укажите источник товара для всех товаров`);
        return;
      }
      handleSubmit();
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
      setResults([]);
    } else {
      navigate('/');
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const promises = selectedProducts.map(product =>
        fetch(`${API_URL}/api/check/assess`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            category: product.categoryId,
            subcategory: product.subcategoryId,
            product: product.id,
            source: product.source,
            volume: product.volume
          })
        }).then(res => res.json())
      );

      const allResults = await Promise.all(promises);

      const mergedResults = allResults.map((result, index) => ({
        ...result,
        productInfo: selectedProducts[index]
      }));

      setResults(mergedResults);
      setStep(3);
      toast.success('Проверка завершена!');
    } catch (error) {
      toast.error('Ошибка получения результатов');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleCallbackSubmit = async () => {
    if (!callbackData.name.trim() || !callbackData.phone.trim()) {
      toast.error('Заполните все поля');
      return;
    }

    const phoneClean = callbackData.phone.replace(/\D/g, '');
    if (phoneClean.length < 10) {
      toast.error('Введите корректный номер телефона');
      return;
    }

    setCallbackLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/callback/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: callbackData.name.trim(),
          phone: callbackData.phone.trim(),
          products: results.map(r => ({
            name: r.productInfo?.name,
            tnved: r.tnved,
            requires_marking: r.requires_marking,
            status: r.status
          })),
          source: 'check_page'
        })
      });

      if (response.ok) {
        toast.success('Заявка на звонок отправлена! Мы перезвоним в ближайшее время.');
        setShowCallbackModal(false);
        setCallbackData({ name: '', phone: '' });
      } else {
        const error = await response.json();
        toast.error(error.detail || 'Ошибка отправки заявки');
      }
    } catch (error) {
      console.error('Callback error:', error);
      toast.error('Ошибка отправки заявки');
    } finally {
      setCallbackLoading(false);
    }
  };

  const stepLabels = ['Товары', 'Детали', 'Результат'];

  // Get current subcategory products
  const currentProducts = selectedSubcategory?.products || [];
  const currentCategory = categories.find(c => c.id === (selectedSubcategory?.categoryId || expandedCategory));

  // Summary stats
  const requiresMarkingCount = results.filter(r => r.requires_marking).length;
  const experimentCount = results.filter(r => r.status === 'experiment').length;
  const freeCount = results.filter(r => !r.requires_marking && r.status !== 'experiment').length;

  // Get icon component for category
  const getCategoryIcon = (categoryId) => {
    const IconComponent = CATEGORY_ICONS[categoryId] || Package;
    return IconComponent;
  };

  // Get marking status badge
  const getMarkingStatusBadge = (status) => {
    switch (status) {
      case 'mandatory':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-100 text-emerald-700">
            <CheckCircle size={12} />
            Обязат.
          </span>
        );
      case 'experiment':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-100 text-amber-700">
            <FlaskConical size={12} />
            Экспер.
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-gray-100 text-gray-600">
            <XCircle size={12} />
            Нет
          </span>
        );
    }
  };

  return (
    <div className="py-12 bg-gradient-to-b from-slate-50 to-white min-h-screen">
      <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
          <div>
            <h1 className="text-3xl sm:text-4xl font-semibold text-primary mb-2">Проверка товаров</h1>
            <p className="text-gray-600">Узнайте, подлежат ли ваши товары обязательной маркировке</p>
          </div>

          {/* Statistics Panels */}
          <div className="flex flex-col sm:flex-row gap-3 flex-shrink-0">
            {/* TNVED Stats */}
            <div className="bg-white rounded-2xl border-2 border-gray-200 shadow-lg overflow-hidden">
              <div className="bg-gradient-to-r from-indigo-500 to-purple-600 px-4 py-2 flex items-center gap-2">
                <Database size={16} className="text-white" />
                <span className="text-white font-semibold text-sm">База ТН ВЭД</span>
              </div>
              <div className="p-3 flex gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-900">{tnvedStats.total.toLocaleString()}</div>
                  <div className="text-xs text-gray-500">Всего кодов</div>
                </div>
                <div className="w-px bg-gray-200"></div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-emerald-600">{tnvedStats.mandatory.toLocaleString()}</div>
                  <div className="text-xs text-gray-500">Обязательных</div>
                </div>
                <div className="w-px bg-gray-200"></div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-amber-500">{tnvedStats.experimental.toLocaleString()}</div>
                  <div className="text-xs text-gray-500">Эксперимент</div>
                </div>
              </div>
            </div>

            {/* Timeline Status Indicators */}
            <button
              onClick={() => navigate('/timeline')}
              className="bg-white rounded-2xl border-2 border-gray-200 shadow-lg overflow-hidden hover:border-yellow-400 hover:shadow-xl transition-all cursor-pointer group"
            >
              <div className="bg-gradient-to-r from-yellow-500 to-amber-500 px-4 py-2 flex items-center gap-2">
                <BarChart3 size={16} className="text-white" />
                <span className="text-white font-semibold text-sm">Сроки маркировки</span>
              </div>
              <div className="p-3 flex gap-3">
                <div className="text-center" title="Полностью действует">
                  <div className="text-xl font-bold text-emerald-600">🟢 {timelineStats.active}</div>
                  <div className="text-xs text-gray-500">Действует</div>
                </div>
                <div className="w-px bg-gray-200"></div>
                <div className="text-center" title="Частично действует">
                  <div className="text-xl font-bold text-amber-600">🟡 {timelineStats.partial}</div>
                  <div className="text-xs text-gray-500">Частично</div>
                </div>
                <div className="w-px bg-gray-200"></div>
                <div className="text-center" title="Скоро старт">
                  <div className="text-xl font-bold text-red-500">🔴 {timelineStats.upcoming}</div>
                  <div className="text-xs text-gray-500">Скоро</div>
                </div>
              </div>
              <div className="px-3 pb-2 text-xs text-yellow-600 group-hover:text-yellow-700 flex items-center justify-center gap-1">
                Посмотреть все сроки →
              </div>
            </button>
          </div>
        </div>

        <Stepper current={step} total={3} steps={stepLabels} />

        {/* ==================== STEP 1: Product Selection ==================== */}
        {step === 1 && (
          <div data-testid="step-1">
            {/* Skeleton while loading */}
            {initialLoading ? (
              <div className="animate-pulse space-y-6">
                {/* Search skeleton */}
                <div className="bg-gray-100 rounded-2xl p-6 border-2 border-gray-200">
                  <div className="h-6 bg-gray-200 rounded w-48 mb-4"></div>
                  <div className="h-14 bg-gray-200 rounded-xl"></div>
                </div>
                {/* Categories skeleton */}
                <div className="hidden lg:grid grid-cols-[320px,1fr] gap-8">
                  <div className="space-y-2">
                    {[1,2,3,4,5].map(i => (
                      <div key={i} className="h-16 bg-gray-200 rounded-xl"></div>
                    ))}
                  </div>
                  <div className="grid grid-cols-5 gap-3">
                    {[1,2,3,4,5,6,7,8,9,10].map(i => (
                      <div key={i} className="h-24 bg-gray-200 rounded-xl"></div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
            <>
            {/* Search Bar */}
            <div className="mb-6 bg-gradient-to-r from-[rgb(var(--brand-yellow-50))] to-[rgb(var(--brand-yellow-100))] rounded-2xl p-6 border-2 border-[rgb(var(--brand-yellow-200))]" ref={searchRef}>
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 rounded-xl bg-[rgb(var(--brand-yellow-200))]">
                  <Search size={20} className="text-[rgb(var(--grey-800))]" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-[rgb(var(--grey-900))]">Быстрый поиск по ТН ВЭД</h3>
                  <p className="text-xs text-[rgb(var(--grey-600))]">Поиск по всей базе ({tnvedStats.total.toLocaleString()} кодов). Покажем, нужна ли маркировка</p>
                </div>
                <div className="relative group">
                  <HelpCircle size={18} className="text-[rgb(var(--grey-500))] cursor-help" />
                  <div className="absolute right-0 top-full mt-2 w-72 p-3 bg-gray-900 text-white text-xs rounded-xl shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                    <p className="mb-2"><strong>Поиск</strong> — по всей базе ТН ВЭД ({tnvedStats.total.toLocaleString()} кодов)</p>
                    <p><strong>Категории слева</strong> — только товары с обязательной маркировкой ({tnvedStats.mandatory} кодов)</p>
                  </div>
                </div>
              </div>

              <div className="relative">
                <Search size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-[rgb(var(--brand-yellow-600))]" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => setIsSearchFocused(true)}
                  placeholder={`Поиск по ${tnvedStats.total.toLocaleString()} кодам: 6403, шубы, молоко...`}
                  className="w-full pl-12 pr-12 py-4 text-base rounded-xl border-2 border-[rgb(var(--brand-yellow-300))] bg-white shadow-md focus:outline-none focus:border-[rgb(var(--brand-yellow-500))] focus:ring-4 focus:ring-[rgb(var(--brand-yellow-200))] transition-all placeholder:text-gray-400 font-medium"
                />
                {searchQuery && (
                  <button onClick={clearSearch} className="absolute right-4 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-gray-100 hover:bg-gray-200">
                    <X size={16} />
                  </button>
                )}

                {/* Search Dropdown - единый поиск по базе ТН ВЭД */}
                {isSearchFocused && searchQuery.length >= 2 && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl border-2 border-[rgb(var(--brand-yellow-300))] shadow-2xl z-50 max-h-[400px] overflow-y-auto">
                    {searchLoading ? (
                      <div className="p-6 text-center">
                        <Loader2 size={24} className="mx-auto text-[rgb(var(--brand-yellow-500))] animate-spin mb-2" />
                        <p className="text-gray-500 text-sm">Поиск по ТН ВЭД...</p>
                      </div>
                    ) : searchResults.length > 0 ? (
                      <div className="p-2">
                        <div className="text-xs text-gray-500 px-3 py-2">
                          Найдено: {searchResults.length} результатов
                        </div>
                        {searchResults.map((item, index) => {
                          const alreadyAdded = selectedProducts.some(p => p.id === `tnved_${item.code}`);
                          return (
                            <button
                              key={`tnved-${item.code}-${index}`}
                              onClick={() => !alreadyAdded && handleSearchSelect(item)}
                              disabled={alreadyAdded}
                              className={`w-full text-left px-3 py-3 rounded-xl transition-colors flex items-center gap-3 ${
                                alreadyAdded
                                  ? 'bg-emerald-50 cursor-default'
                                  : 'hover:bg-[rgb(var(--brand-yellow-50))]'
                              }`}
                            >
                              <div className={`flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center ${
                                alreadyAdded ? 'bg-emerald-100' : 'bg-[rgb(var(--brand-yellow-100))]'
                              }`}>
                                {alreadyAdded ? (
                                  <Check size={18} className="text-emerald-600" />
                                ) : (
                                  <Plus size={18} className="text-[rgb(var(--brand-yellow-600))]" />
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="font-medium text-gray-900 text-sm line-clamp-1">{item.name}</div>
                                <div className="flex items-center gap-2 mt-1 flex-wrap">
                                  <span className="font-mono text-xs font-bold text-[rgb(var(--brand-yellow-700))] bg-[rgb(var(--brand-yellow-100))] px-2 py-0.5 rounded">
                                    {item.code}
                                  </span>
                                  {getMarkingStatusBadge(item.marking_status)}
                                </div>
                              </div>
                              {alreadyAdded && (
                                <span className="text-xs text-emerald-600 font-medium">Добавлен</span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="p-6 text-center">
                        <Search size={32} className="mx-auto text-gray-300 mb-2" />
                        <p className="text-gray-500 text-sm">Ничего не найдено</p>
                        <p className="text-gray-400 text-xs mt-1">Попробуйте изменить запрос</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Selected Products Panel */}
            {selectedProducts.length > 0 && (
              <div className="mb-6 bg-white rounded-2xl border-2 border-emerald-200 overflow-hidden shadow-lg">
                <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 px-6 py-4 flex items-center justify-between">
                  <div className="flex items-center gap-3 text-white">
                    <div className="p-2 bg-white/20 rounded-xl">
                      <ShoppingCart size={20} />
                    </div>
                    <div>
                      <h3 className="font-bold">Ваш список товаров</h3>
                      <p className="text-sm text-emerald-100">{selectedProducts.length} товар(ов) выбрано</p>
                    </div>
                  </div>
                  <Button
                    onClick={() => setSelectedProducts([])}
                    variant="ghost"
                    size="sm"
                    className="text-white hover:bg-white/20"
                  >
                    Очистить
                  </Button>
                </div>
                <div className="divide-y divide-gray-100 max-h-[300px] overflow-y-auto">
                  {selectedProducts.map((product) => (
                    <div key={product.id} className="px-6 py-4 flex items-center justify-between gap-4 hover:bg-gray-50">
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-gray-900 truncate">{product.name}</div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="font-mono text-xs font-bold text-[rgb(var(--brand-yellow-700))] bg-[rgb(var(--brand-yellow-100))] px-2 py-0.5 rounded">
                            {product.tnved}
                          </span>
                          <span className="text-xs text-gray-500">{product.subcategoryName}</span>
                        </div>
                      </div>
                      <button
                        onClick={() => removeProduct(product.id)}
                        className="p-2 rounded-lg text-red-500 hover:bg-red-50 transition-colors"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Category Grid - Desktop */}
            <div className="hidden lg:grid grid-cols-[320px,1fr] gap-8">
              {/* Left: Accordion Categories */}
              <aside className="space-y-2 max-h-[60vh] overflow-y-auto pr-2">
                {/* Header for categories */}
                <div className="flex items-center gap-2 px-3 py-2 mb-2 bg-emerald-50 rounded-xl border border-emerald-200">
                  <BadgeCheck size={18} className="text-emerald-600" />
                  <span className="text-sm font-semibold text-emerald-700">Товары с обязательной маркировкой</span>
                </div>
                {categories.map((category) => {
                  const IconComponent = getCategoryIcon(category.id);
                  const isExpanded = expandedCategory === category.id;
                  const hasSubcategories = category.subcategories && category.subcategories.length > 0;

                  return (
                    <div key={category.id} className="rounded-xl overflow-hidden border border-gray-200">
                      {/* Category Header */}
                      <button
                        onClick={() => hasSubcategories && toggleCategory(category.id)}
                        className={`w-full text-left px-4 py-3 transition-all flex items-center gap-3 ${
                          isExpanded
                            ? 'bg-gradient-to-r from-[rgb(var(--brand-yellow-500))] to-[rgb(var(--brand-yellow-600))] text-black'
                            : hasSubcategories
                              ? 'bg-white hover:bg-[rgb(var(--brand-yellow-50))] text-gray-700'
                              : 'bg-gray-50 text-gray-400 cursor-not-allowed'
                        }`}
                      >
                        <div className={`p-2 rounded-lg ${isExpanded ? 'bg-white/30' : 'bg-[rgb(var(--brand-yellow-100))]'}`}>
                          <IconComponent size={18} className={isExpanded ? 'text-black' : 'text-[rgb(var(--brand-yellow-600))]'} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-sm truncate">{category.name}</div>
                          <div className={`text-xs ${isExpanded ? 'text-black/70' : 'text-gray-500'}`}>
                            {hasSubcategories ? `${category.subcategories.length} подкатегорий` : 'Скоро'}
                          </div>
                        </div>
                        {hasSubcategories && (
                          isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />
                        )}
                      </button>

                      {/* Subcategories */}
                      {isExpanded && hasSubcategories && (
                        <div className="bg-gray-50 border-t border-gray-200">
                          {category.subcategories.map((sub) => {
                            const isSelected = selectedSubcategory?.id === sub.id;
                            const productsCount = sub.products?.length || 0;

                            return (
                              <button
                                key={sub.id}
                                onClick={() => selectSubcategory(sub, category.id)}
                                className={`w-full text-left px-4 py-2.5 pl-12 transition-all flex items-center justify-between ${
                                  isSelected
                                    ? 'bg-[rgb(var(--brand-yellow-100))] text-[rgb(var(--brand-yellow-800))] font-medium'
                                    : 'hover:bg-[rgb(var(--brand-yellow-50))] text-gray-600'
                                }`}
                              >
                                <span className="text-sm truncate">{sub.name}</span>
                                {productsCount > 0 && (
                                  <span className="text-xs bg-white px-2 py-0.5 rounded-full text-gray-500">
                                    {productsCount}
                                  </span>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </aside>

              {/* Right: Products */}
              <div>
                {selectedSubcategory ? (
                  <>
                    <div className="mb-6 flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-[rgb(var(--brand-yellow-100))]">
                        <Package size={24} className="text-[rgb(var(--brand-yellow-600))]" />
                      </div>
                      <div>
                        <h2 className="text-xl font-semibold text-gray-900">{selectedSubcategory.name}</h2>
                        <p className="text-sm text-gray-500">
                          {currentCategory?.name} • {currentProducts.length} товаров
                        </p>
                      </div>
                    </div>

                    {currentProducts.length > 0 ? (
                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                        {currentProducts.map((product) => {
                          const isSelected = isProductSelected(product.id);
                          return (
                            <button
                              key={product.id}
                              onClick={() => isSelected
                                ? removeProduct(product.id)
                                : addProduct(product, currentCategory?.id, selectedSubcategory.id)
                              }
                              className={`group relative bg-white rounded-xl p-3 border-2 transition-all duration-200 text-left ${
                                isSelected
                                  ? 'border-emerald-500 bg-emerald-50 shadow-md ring-2 ring-emerald-200'
                                  : 'border-gray-200 hover:border-[rgb(var(--brand-yellow-400))] hover:shadow-md'
                              }`}
                            >
                              {isSelected && (
                                <div className="absolute -top-2 -right-2 w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center shadow-md">
                                  <Check size={14} className="text-white" />
                                </div>
                              )}

                              <h3 className="font-medium text-xs leading-tight line-clamp-2 text-gray-800 mb-2">
                                {product.name}
                              </h3>

                              {/* Marking Status Badge */}
                              {product.marking_status && (
                                <div className="mb-2">
                                  {getMarkingStatusBadge(product.marking_status)}
                                </div>
                              )}

                              <div className="flex items-center justify-between">
                                <span className="font-mono text-[10px] font-bold text-[rgb(var(--brand-yellow-700))] bg-[rgb(var(--brand-yellow-50))] px-1.5 py-0.5 rounded">
                                  {product.tnved}
                                </span>
                                {!isSelected && (
                                  <Plus size={16} className="text-gray-400 group-hover:text-[rgb(var(--brand-yellow-600))] transition-colors" />
                                )}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    ) : (
                      /* Empty subcategory - направляем к верхнему поиску */
                      <div className="bg-white rounded-2xl border-2 border-gray-200 p-8 text-center">
                        <div className="p-3 rounded-xl bg-[rgb(var(--brand-yellow-100))] inline-block mb-4">
                          <Search size={32} className="text-[rgb(var(--brand-yellow-600))]" />
                        </div>
                        <h3 className="font-bold text-gray-900 mb-2">Товары ещё не добавлены</h3>
                        <p className="text-sm text-gray-600 mb-4">
                          Воспользуйтесь поиском по ТН ВЭД выше для поиска товаров
                        </p>
                        <button
                          onClick={() => {
                            const searchInput = document.querySelector('input[placeholder*="6403"]');
                            if (searchInput) searchInput.focus();
                          }}
                          className="inline-flex items-center gap-2 px-4 py-2 bg-[rgb(var(--brand-yellow-500))] text-black font-medium rounded-xl hover:bg-[rgb(var(--brand-yellow-600))] transition-colors"
                        >
                          <Search size={16} />
                          Перейти к поиску
                        </button>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-center py-16 bg-gray-50 rounded-2xl">
                    <ChevronRight size={48} className="mx-auto text-gray-300 mb-4" />
                    <h3 className="text-lg font-medium text-gray-600 mb-2">Выберите подкатегорию</h3>
                    <p className="text-gray-500 text-sm">Раскройте категорию слева и выберите нужную подкатегорию</p>
                  </div>
                )}
              </div>
            </div>

            {/* Mobile: Accordion */}
            <div className="lg:hidden space-y-3">
              {/* Header for categories - mobile */}
              <div className="flex items-center gap-2 px-3 py-2 bg-emerald-50 rounded-xl border border-emerald-200">
                <BadgeCheck size={18} className="text-emerald-600" />
                <span className="text-sm font-semibold text-emerald-700">Товары с обязательной маркировкой</span>
              </div>
              {categories.map((category) => {
                const IconComponent = getCategoryIcon(category.id);
                const isExpanded = expandedCategory === category.id;
                const hasSubcategories = category.subcategories && category.subcategories.length > 0;

                return (
                  <div key={category.id} className="rounded-2xl border-2 border-gray-200 overflow-hidden bg-white">
                    <button
                      onClick={() => hasSubcategories && toggleCategory(category.id)}
                      className={`w-full text-left px-4 py-4 transition-all flex items-center justify-between gap-3 ${
                        isExpanded
                          ? 'bg-gradient-to-r from-[rgb(var(--brand-yellow-500))] to-[rgb(var(--brand-yellow-600))] text-black'
                          : hasSubcategories
                            ? 'bg-white text-gray-700'
                            : 'bg-gray-50 text-gray-400'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${isExpanded ? 'bg-white/30' : 'bg-[rgb(var(--brand-yellow-100))]'}`}>
                          <IconComponent size={20} className={isExpanded ? 'text-black' : 'text-[rgb(var(--brand-yellow-600))]'} />
                        </div>
                        <div>
                          <div className="font-bold text-sm">{category.name}</div>
                          <div className={`text-xs ${isExpanded ? 'text-black/70' : 'text-gray-500'}`}>
                            {hasSubcategories ? `${category.subcategories.length} подкатегорий` : 'Скоро'}
                          </div>
                        </div>
                      </div>
                      {hasSubcategories && (
                        <ChevronDown size={20} className={`transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                      )}
                    </button>

                    {isExpanded && hasSubcategories && (
                      <div className="p-3 bg-gray-50 border-t-2 border-[rgb(var(--brand-yellow-200))]">
                        {/* Subcategory tabs */}
                        <div className="flex flex-wrap gap-2 mb-4">
                          {category.subcategories.map((sub) => (
                            <button
                              key={sub.id}
                              onClick={() => selectSubcategory(sub, category.id)}
                              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                                selectedSubcategory?.id === sub.id
                                  ? 'bg-[rgb(var(--brand-yellow-500))] text-black'
                                  : 'bg-white text-gray-600 border border-gray-200'
                              }`}
                            >
                              {sub.name}
                            </button>
                          ))}
                        </div>

                        {/* Products grid */}
                        {selectedSubcategory && selectedSubcategory.categoryId === category.id && (
                          <div className="grid grid-cols-2 gap-2">
                            {(selectedSubcategory.products || []).length > 0 ? (
                              selectedSubcategory.products.map((product) => {
                                const isSelected = isProductSelected(product.id);
                                return (
                                  <button
                                    key={product.id}
                                    onClick={() => isSelected
                                      ? removeProduct(product.id)
                                      : addProduct(product, category.id, selectedSubcategory.id)
                                    }
                                    className={`relative bg-white rounded-lg p-2.5 border-2 transition-all text-left ${
                                      isSelected
                                        ? 'border-emerald-500 bg-emerald-50'
                                        : 'border-gray-200'
                                    }`}
                                  >
                                    {isSelected && (
                                      <div className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center">
                                        <Check size={12} className="text-white" />
                                      </div>
                                    )}
                                    <div className="text-xs font-medium text-gray-900 line-clamp-2 mb-1.5">{product.name}</div>
                                    {/* Marking Status Badge - Mobile */}
                                    {product.marking_status && (
                                      <div className="mb-1.5">
                                        {getMarkingStatusBadge(product.marking_status)}
                                      </div>
                                    )}
                                    <div className="font-mono text-[10px] font-bold text-[rgb(var(--brand-yellow-700))] bg-[rgb(var(--brand-yellow-50))] px-1.5 py-0.5 rounded inline-block">
                                      {product.tnved}
                                    </div>
                                  </button>
                                );
                              })
                            ) : (
                              /* Empty mobile subcategory - направляем к поиску */
                              <div className="col-span-3 text-center py-4">
                                <Package size={24} className="mx-auto text-gray-300 mb-2" />
                                <p className="text-xs text-gray-500">Используйте поиск выше</p>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Sticky Bottom Panel - appears when products selected */}
            {selectedProducts.length > 0 && (
              <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-lg border-t-2 border-emerald-200 shadow-[0_-4px_20px_rgba(0,0,0,0.1)] animate-in slide-in-from-bottom duration-300">
                <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8 py-4">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className="p-2.5 bg-emerald-100 rounded-xl">
                        <ShoppingCart size={22} className="text-emerald-600" />
                      </div>
                      <div>
                        <div className="font-bold text-gray-900">
                          Выбрано: {selectedProducts.length} {selectedProducts.length === 1 ? 'товар' : selectedProducts.length < 5 ? 'товара' : 'товаров'}
                        </div>
                        <div className="text-sm text-gray-500">
                          Нажмите «Далее» чтобы получить КП
                        </div>
                      </div>
                    </div>
                    <Button
                      onClick={handleNext}
                      className="btn-gradient rounded-xl px-8 py-3 flex items-center gap-2 text-base font-bold shadow-lg hover:shadow-xl transition-all animate-pulse hover:animate-none"
                    >
                      Далее — Получить КП
                      <ArrowRight size={20} />
                    </Button>
                  </div>
                </div>
              </div>
            )}
            </>
            )}
          </div>
        )}

        {/* ==================== STEP 2: Details for Each Product ==================== */}
        {step === 2 && (
          <div data-testid="step-2">
            <div className="mb-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-6 border-2 border-blue-200">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-blue-100">
                  <ClipboardList size={20} className="text-blue-600" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900">Укажите детали по каждому товару</h3>
                  <p className="text-sm text-gray-600">Откуда товар</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {selectedProducts.map((product, index) => (
                <div
                  key={product.id}
                  className="bg-white rounded-2xl border-2 border-gray-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-6 py-4 border-b border-gray-200">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-[rgb(var(--brand-yellow-100))] flex items-center justify-center font-bold text-[rgb(var(--brand-yellow-700))]">
                          {index + 1}
                        </div>
                        <div>
                          <h4 className="font-bold text-gray-900">{product.name}</h4>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="font-mono text-xs font-bold text-[rgb(var(--brand-yellow-700))] bg-[rgb(var(--brand-yellow-100))] px-2 py-0.5 rounded">
                              {product.tnved}
                            </span>
                            <span className="text-xs text-gray-500">{product.subcategoryName}</span>
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => removeProduct(product.id)}
                        className="p-2 rounded-lg text-red-500 hover:bg-red-50"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>

                  <div className="p-6">
                    <div>
                      <Label className="text-sm font-semibold text-gray-700 mb-1 block">
                        Откуда у вас этот товар?
                      </Label>
                      <p className="text-xs text-gray-500 mb-3">Можно выбрать несколько вариантов</p>
                      <div className="space-y-2">
                        {[
                          { value: 'produce', label: 'Произвожу сам в России' },
                          { value: 'import', label: 'Импортирую из-за рубежа' },
                          { value: 'buy_rf', label: 'Покупаю у российского поставщика' },
                          { value: 'old_stock', label: 'Продаю остатки' }
                        ].map((opt) => (
                          <div key={opt.value} className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-50">
                            <Checkbox
                              id={`${product.id}-${opt.value}`}
                              checked={product.source?.includes(opt.value)}
                              onCheckedChange={() => toggleSource(product.id, opt.value)}
                            />
                            <Label htmlFor={`${product.id}-${opt.value}`} className="cursor-pointer text-sm flex-1">
                              {opt.label}
                            </Label>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className={`px-6 py-3 text-sm flex items-center gap-2 ${
                    product.source?.length > 0
                      ? 'bg-emerald-50 text-emerald-700'
                      : 'bg-amber-50 text-amber-700'
                  }`}>
                    {product.source?.length > 0 ? (
                      <>
                        <CheckCircle size={16} />
                        <span>Источник товара указан</span>
                      </>
                    ) : (
                      <>
                        <AlertTriangle size={16} />
                        <span>Выберите источник товара</span>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ==================== STEP 3: Results ==================== */}
        {step === 3 && results.length > 0 && (
          <div data-testid="step-3">
            <div className="mb-8 bg-gradient-to-r from-[rgb(var(--brand-yellow-400))] to-[rgb(var(--brand-yellow-500))] rounded-3xl p-8 text-black shadow-2xl">
              <div className="flex items-center gap-4 mb-6">
                <div className="p-3 bg-black/10 rounded-2xl">
                  <FileText size={28} />
                </div>
                <div>
                  <h2 className="text-2xl font-bold">Результаты проверки</h2>
                  <p className="text-black/70">Проверено товаров: {results.length}</p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="bg-white/40 rounded-2xl p-4 text-center backdrop-blur-sm">
                  <div className="text-4xl font-bold mb-1 text-emerald-700">{requiresMarkingCount}</div>
                  <div className="text-sm text-black/70">Обязательная маркировка</div>
                </div>
                <div className="bg-white/40 rounded-2xl p-4 text-center backdrop-blur-sm">
                  <div className="text-4xl font-bold mb-1 text-amber-600">{experimentCount}</div>
                  <div className="text-sm text-black/70">Эксперимент</div>
                </div>
                <div className="bg-white/40 rounded-2xl p-4 text-center backdrop-blur-sm">
                  <div className="text-4xl font-bold mb-1 text-gray-600">{freeCount}</div>
                  <div className="text-sm text-black/70">Без маркировки</div>
                </div>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6 mb-8">
              {results.map((result, index) => (
                <div
                  key={result.productInfo.id}
                  className={`bg-white rounded-2xl border-2 overflow-hidden shadow-lg ${
                    result.requires_marking
                      ? 'border-emerald-200'
                      : result.status === 'experiment'
                        ? 'border-amber-200'
                        : 'border-gray-200'
                  }`}
                >
                  <div className={`px-6 py-4 flex items-center gap-4 ${
                    result.requires_marking
                      ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-white'
                      : result.status === 'experiment'
                        ? 'bg-gradient-to-r from-amber-400 to-amber-500 text-black'
                        : 'bg-gradient-to-r from-gray-400 to-gray-500 text-white'
                  }`}>
                    <div className={`p-2 rounded-xl ${
                      result.requires_marking
                        ? 'bg-white/20'
                        : result.status === 'experiment'
                          ? 'bg-black/10'
                          : 'bg-white/20'
                    }`}>
                      {result.requires_marking ? (
                        <CheckCircle size={24} />
                      ) : result.status === 'experiment' ? (
                        <FlaskConical size={24} />
                      ) : (
                        <XCircle size={24} />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="font-bold text-lg leading-tight">{result.productInfo.name}</div>
                      <div className="text-sm opacity-80">{result.productInfo.subcategoryName}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs opacity-70">ТН ВЭД</div>
                      <div className="font-mono font-bold">{result.tnved || result.productInfo.tnved}</div>
                    </div>
                  </div>

                  <div className="p-6">
                    <div className={`rounded-xl p-4 mb-4 ${
                      result.requires_marking
                        ? 'bg-emerald-50'
                        : result.status === 'experiment'
                          ? 'bg-amber-50'
                          : 'bg-gray-50'
                    }`}>
                      <div className={`font-semibold mb-2 flex items-center gap-2 ${
                        result.requires_marking
                          ? 'text-emerald-700'
                          : result.status === 'experiment'
                            ? 'text-amber-700'
                            : 'text-gray-700'
                      }`}>
                        {result.requires_marking ? (
                          <CheckCircle size={18} />
                        ) : result.status === 'experiment' ? (
                          <FlaskConical size={18} />
                        ) : (
                          <XCircle size={18} />
                        )}
                        {result.requires_marking
                          ? 'Требуется маркировка'
                          : result.status === 'experiment'
                            ? 'Участвует в эксперименте'
                            : 'Маркировка не требуется'}
                      </div>
                      {result.deadline && (
                        <div className="text-sm font-medium text-gray-800 mb-1">
                          📅 Действует {result.deadline}
                        </div>
                      )}
                      <p className="text-sm text-gray-600">{result.message}</p>
                    </div>

                    {/* Timeline Info - Кого касается и что нужно делать */}
                    {result.timeline && (
                      <div className="mb-4 p-4 bg-blue-50 rounded-xl border border-blue-100">
                        <div className="text-sm font-semibold text-blue-800 mb-2">
                          {result.timeline.title}
                        </div>

                        {result.timeline.who && result.timeline.who.length > 0 && (
                          <div className="mb-3">
                            <div className="text-xs text-blue-600 mb-1">Кого касается:</div>
                            <div className="flex flex-wrap gap-1">
                              {result.timeline.who.map((who, i) => (
                                <span key={i} className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                                  {who}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {result.timeline.current_requirements && result.timeline.current_requirements.length > 0 && (
                          <div>
                            <div className="text-xs text-blue-600 mb-1">Что нужно сейчас:</div>
                            <div className="text-sm text-blue-800 space-y-1">
                              {result.timeline.current_requirements.map((req, i) => (
                                <div key={i} className="flex items-start gap-2">
                                  <CheckCircle size={14} className="text-blue-500 mt-0.5 flex-shrink-0" />
                                  <span>{req}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <div className="text-gray-500 mb-1">Источник</div>
                        <div className="font-medium">
                          {(result.productInfo.source || []).map(s => ({
                            'produce': 'Производство в РФ',
                            'import': 'Импорт',
                            'buy_rf': 'Закупка в РФ',
                            'old_stock': 'Остатки'
                          }[s])).filter(Boolean).join(', ') || '—'}
                        </div>
                      </div>
                      <div>
                        <div className="text-gray-500 mb-1">Объём в месяц</div>
                        <div className="font-medium">{result.productInfo.volume} ед.</div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-gradient-to-r from-[rgb(var(--brand-yellow-50))] to-[rgb(var(--brand-yellow-100))] rounded-3xl p-8 border-2 border-[rgb(var(--brand-yellow-300))]">
              <div className="flex flex-col md:flex-row items-center gap-6">
                <div className="p-4 bg-[rgb(var(--brand-yellow-200))] rounded-2xl">
                  <Sparkles size={32} className="text-[rgb(var(--brand-yellow-700))]" />
                </div>
                <div className="flex-1 text-center md:text-left">
                  <h3 className="text-xl font-bold text-gray-900 mb-2">
                    Нужна помощь с маркировкой?
                  </h3>
                  <p className="text-gray-600">
                    Мы поможем внедрить маркировку для ваших {results.length} товаров — от регистрации до первой отгрузки
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row gap-3">
                  <Button
                    onClick={() => navigate('/quote', { state: { products: results } })}
                    className="btn-gradient rounded-xl px-6 py-3 flex items-center gap-2"
                  >
                    <FileText size={18} />
                    Получить КП
                  </Button>
                  <Button
                    onClick={() => setShowCallbackModal(true)}
                    variant="outline"
                    className="rounded-xl px-6 py-3 border-2 border-[rgb(var(--brand-yellow-500))] text-[rgb(var(--brand-yellow-700))] hover:bg-[rgb(var(--brand-yellow-100))] flex items-center gap-2"
                  >
                    <Phone size={18} />
                    Заказать звонок
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="flex items-center justify-between mt-8 max-w-4xl mx-auto">
          <Button
            onClick={handleBack}
            variant="secondary"
            className="rounded-xl flex items-center gap-2"
          >
            <ArrowLeft size={18} />
            {step === 1 ? 'На главную' : 'Назад'}
          </Button>

          {step < 3 && (
            <div className="flex items-center gap-4">
              {step === 1 && selectedProducts.length > 0 && (
                <span className="text-sm text-gray-500 hidden sm:block">
                  Выбрано: {selectedProducts.length} товар(ов)
                </span>
              )}
              <Button
                onClick={handleNext}
                className="btn-gradient rounded-xl flex items-center gap-2"
                disabled={loading || (step === 1 && selectedProducts.length === 0)}
              >
                {loading ? 'Проверка...' : step === 2 ? 'Проверить все' : 'Далее'}
                <ArrowRight size={18} />
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Callback Modal */}
      {showCallbackModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => !callbackLoading && setShowCallbackModal(false)}
          />

          <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
            <div className="bg-gradient-to-r from-[rgb(var(--brand-yellow-400))] to-[rgb(var(--brand-yellow-500))] px-6 py-5">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-white/20 rounded-xl">
                  <Phone size={24} className="text-black" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-black">Заказать звонок</h3>
                  <p className="text-sm text-black/70">Мы перезвоним в течение 15 минут</p>
                </div>
              </div>
              <button
                onClick={() => !callbackLoading && setShowCallbackModal(false)}
                className="absolute top-4 right-4 p-2 rounded-full hover:bg-white/20 transition-colors"
                disabled={callbackLoading}
              >
                <X size={20} className="text-black" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {results.length > 0 && (
                <div className="bg-gray-50 rounded-xl p-4 mb-4">
                  <div className="text-sm text-gray-600 mb-2">Проверено товаров:</div>
                  <div className="flex items-center gap-3">
                    <span className="text-2xl font-bold text-gray-900">{results.length}</span>
                    <div className="text-sm text-gray-500">
                      {requiresMarkingCount > 0 && (
                        <span className="text-emerald-600">{requiresMarkingCount} требуют маркировки</span>
                      )}
                    </div>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Ваше имя
                </label>
                <div className="relative">
                  <User size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <Input
                    type="text"
                    value={callbackData.name}
                    onChange={(e) => setCallbackData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Как к вам обращаться?"
                    className="pl-10"
                    disabled={callbackLoading}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Телефон
                </label>
                <div className="relative">
                  <Phone size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <Input
                    type="tel"
                    value={callbackData.phone}
                    onChange={(e) => setCallbackData(prev => ({ ...prev, phone: e.target.value }))}
                    placeholder="+7 (___) ___-__-__"
                    className="pl-10"
                    disabled={callbackLoading}
                  />
                </div>
              </div>

              <Button
                onClick={handleCallbackSubmit}
                disabled={callbackLoading}
                className="w-full btn-gradient rounded-xl py-3 flex items-center justify-center gap-2"
              >
                {callbackLoading ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Отправка...
                  </>
                ) : (
                  <>
                    <Send size={18} />
                    Жду звонка
                  </>
                )}
              </Button>

              <p className="text-xs text-center text-gray-500">
                Нажимая кнопку, вы соглашаетесь на обработку персональных данных
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CheckProductPage;
