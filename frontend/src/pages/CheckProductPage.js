import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { RadioGroup, RadioGroupItem } from '../components/ui/radio-group';
import { Checkbox } from '../components/ui/checkbox';
import { Label } from '../components/ui/label';
import {
  CheckCircle, XCircle, ArrowLeft, ArrowRight, Package, FlaskConical,
  Check, Search, X, ChevronDown, Plus, Trash2, ShoppingCart,
  FileText, AlertTriangle, Sparkles, Send, ClipboardList, Phone, User, Loader2
} from 'lucide-react';
import { toast } from 'sonner';
import Stepper from '../components/Stepper';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const CheckProductPage = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [categories, setCategories] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('');

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

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setIsSearchFocused(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Search results
  const searchResults = useMemo(() => {
    if (!searchQuery.trim() || searchQuery.length < 2) return [];

    const query = searchQuery.toLowerCase().trim();
    const results = [];

    categories.forEach((group) => {
      group.subcategories?.forEach((sub) => {
        const matchesTnved = sub.tnved?.toLowerCase().includes(query);
        const matchesName = sub.name?.toLowerCase().includes(query);

        if (matchesTnved || matchesName) {
          results.push({
            ...sub,
            groupId: group.id,
            groupName: group.name,
            groupStatus: group.status,
            matchType: matchesTnved ? 'tnved' : 'name'
          });
        }
      });
    });

    results.sort((a, b) => {
      if (a.matchType === 'tnved' && b.matchType !== 'tnved') return -1;
      if (a.matchType !== 'tnved' && b.matchType === 'tnved') return 1;
      return a.name.localeCompare(b.name);
    });

    return results.slice(0, 10);
  }, [searchQuery, categories]);

  const handleSearchSelect = (result) => {
    addProduct(result, result.groupId, result.groupStatus);
    setSearchQuery('');
    setIsSearchFocused(false);
  };

  const clearSearch = () => {
    setSearchQuery('');
    setIsSearchFocused(false);
  };

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
      toast.error('Ошибка загрузки категорий');
      console.error(error);
    }
  };

  const handleCategorySelect = (group) => {
    if (selectedCategory === group.id) {
      setSelectedGroup(null);
      setSelectedCategory('');
    } else {
      setSelectedGroup(group);
      setSelectedCategory(group.id);
    }
  };

  // Add product to selection
  const addProduct = (subcategory, categoryId, categoryStatus) => {
    const exists = selectedProducts.find(p => p.id === subcategory.id);
    if (exists) {
      toast.info('Товар уже добавлен в список');
      return;
    }

    const newProduct = {
      id: subcategory.id,
      name: subcategory.name,
      tnved: subcategory.tnved,
      categoryId: categoryId,
      categoryName: categories.find(c => c.id === categoryId)?.name || '',
      status: categoryStatus,
      source: [],  // массив для множественного выбора
      volume: ''
    };

    setSelectedProducts(prev => [...prev, newProduct]);
    toast.success(`Добавлено: ${subcategory.name}`);
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
  const isProductSelected = (subcategoryId) => {
    return selectedProducts.some(p => p.id === subcategoryId);
  };

  const handleNext = () => {
    if (step === 1) {
      if (selectedProducts.length === 0) {
        toast.error('Выберите хотя бы один товар');
        return;
      }
      setStep(2);
    } else if (step === 2) {
      const incomplete = selectedProducts.find(p => !p.source || p.source.length === 0 || !p.volume);
      if (incomplete) {
        toast.error(`Заполните данные для всех товаров`);
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
      // Check all products in parallel
      const promises = selectedProducts.map(product =>
        fetch(`${API_URL}/api/check/assess`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            category: product.categoryId,
            subcategory: product.id,
            source: product.source,
            volume: product.volume
          })
        }).then(res => res.json())
      );

      const allResults = await Promise.all(promises);

      // Merge results with product info
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

  // Handle callback request submission
  const handleCallbackSubmit = async () => {
    if (!callbackData.name.trim() || !callbackData.phone.trim()) {
      toast.error('Заполните все поля');
      return;
    }

    // Simple phone validation
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

  // Summary stats
  const requiresMarkingCount = results.filter(r => r.requires_marking).length;
  const experimentCount = results.filter(r => r.status === 'experiment').length;
  const freeCount = results.filter(r => !r.requires_marking && r.status !== 'experiment').length;

  return (
    <div className="py-12 bg-gradient-to-b from-slate-50 to-white min-h-screen">
      <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-semibold text-primary mb-2">Проверка товаров</h1>
          <p className="text-gray-600">Узнайте, подлежат ли ваши товары обязательной маркировке</p>
        </div>

        <Stepper current={step} total={3} steps={stepLabels} />

        {/* ==================== STEP 1: Product Selection ==================== */}
        {step === 1 && (
          <div data-testid="step-1">
            {/* Search Bar */}
            <div className="mb-6 bg-gradient-to-r from-[rgb(var(--brand-yellow-50))] to-[rgb(var(--brand-yellow-100))] rounded-2xl p-6 border-2 border-[rgb(var(--brand-yellow-200))]" ref={searchRef}>
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 rounded-xl bg-[rgb(var(--brand-yellow-200))]">
                  <Search size={20} className="text-[rgb(var(--grey-800))]" />
                </div>
                <div>
                  <h3 className="font-bold text-[rgb(var(--grey-900))]">Быстрый поиск по ТН ВЭД</h3>
                  <p className="text-xs text-[rgb(var(--grey-600))]">Введите код или название товара</p>
                </div>
              </div>

              <div className="relative">
                <Search size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-[rgb(var(--brand-yellow-600))]" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => setIsSearchFocused(true)}
                  placeholder="Например: 6403 или шубы..."
                  className="w-full pl-12 pr-12 py-4 text-base rounded-xl border-2 border-[rgb(var(--brand-yellow-300))] bg-white shadow-md focus:outline-none focus:border-[rgb(var(--brand-yellow-500))] focus:ring-4 focus:ring-[rgb(var(--brand-yellow-200))] transition-all placeholder:text-gray-400 font-medium"
                />
                {searchQuery && (
                  <button onClick={clearSearch} className="absolute right-4 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-gray-100 hover:bg-gray-200">
                    <X size={16} />
                  </button>
                )}

                {/* Search Dropdown */}
                {isSearchFocused && searchQuery.length >= 2 && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl border-2 border-[rgb(var(--brand-yellow-300))] shadow-2xl z-50 max-h-[400px] overflow-y-auto">
                    {searchResults.length > 0 ? (
                      <div className="p-2">
                        <div className="text-xs text-gray-500 px-3 py-2">Найдено: {searchResults.length}</div>
                        {searchResults.map((item, index) => {
                          const alreadyAdded = isProductSelected(item.id);
                          return (
                            <button
                              key={`${item.groupId}-${item.id}-${index}`}
                              onClick={() => !alreadyAdded && handleSearchSelect(item)}
                              disabled={alreadyAdded}
                              className={`w-full text-left px-3 py-3 rounded-xl transition-colors flex items-center gap-3 ${
                                alreadyAdded
                                  ? 'bg-emerald-50 cursor-default'
                                  : 'hover:bg-[rgb(var(--brand-yellow-50))]'
                              }`}
                            >
                              <div className={`flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center ${
                                alreadyAdded ? 'bg-emerald-100' : 'bg-gray-100'
                              }`}>
                                {alreadyAdded ? (
                                  <Check size={18} className="text-emerald-600" />
                                ) : (
                                  <Plus size={18} className="text-[rgb(var(--brand-yellow-600))]" />
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="font-medium text-gray-900 text-sm">{item.name}</div>
                                <div className="flex items-center gap-2 mt-1">
                                  <span className="font-mono text-xs font-bold text-[rgb(var(--brand-yellow-700))] bg-[rgb(var(--brand-yellow-100))] px-2 py-0.5 rounded">
                                    {item.tnved}
                                  </span>
                                  <span className="text-xs text-gray-500">{item.groupName}</span>
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
                          <span className="text-xs text-gray-500">{product.categoryName}</span>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                            product.status === 'experiment'
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-emerald-100 text-emerald-700'
                          }`}>
                            {product.status === 'experiment' ? 'Эксп.' : 'Обяз.'}
                          </span>
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
            <div className="hidden lg:grid grid-cols-[280px,1fr] gap-8">
              {/* Left: Category Menu */}
              <aside className="space-y-2 max-h-[60vh] overflow-y-auto pr-2">
                {categories.map((group) => (
                  <button
                    key={group.id}
                    onClick={() => handleCategorySelect(group)}
                    className={`w-full text-left rounded-xl px-4 py-3 transition-all text-sm font-medium flex items-center justify-between gap-2 ${
                      selectedCategory === group.id
                        ? 'bg-gradient-to-r from-[rgb(var(--brand-yellow-500))] to-[rgb(var(--brand-yellow-600))] text-black shadow-lg'
                        : 'bg-white hover:bg-[rgb(var(--brand-yellow-50))] text-gray-700 border border-gray-200'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      {selectedCategory === group.id && <Check size={16} />}
                      <span className="truncate">{group.name}</span>
                    </span>
                    {group.status === 'experiment' && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-200 text-amber-800">Эксп.</span>
                    )}
                  </button>
                ))}
              </aside>

              {/* Right: Subcategories */}
              <div>
                <div className="mb-6 flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-[rgb(var(--brand-yellow-100))]">
                    {selectedGroup?.status === 'experiment' ? (
                      <FlaskConical size={24} className="text-amber-600" />
                    ) : (
                      <Package size={24} className="text-[rgb(var(--brand-yellow-600))]" />
                    )}
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900">{selectedGroup?.name}</h2>
                    <p className="text-sm text-gray-500">
                      {selectedGroup?.subcategories?.length} товаров •
                      <span className={`ml-1 ${selectedGroup?.status === 'experiment' ? 'text-amber-600' : 'text-emerald-600'}`}>
                        {selectedGroup?.status === 'experiment' ? 'Эксперимент' : 'Обязательная маркировка'}
                      </span>
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                  {selectedGroup?.subcategories?.map((sub) => {
                    const isSelected = isProductSelected(sub.id);
                    return (
                      <button
                        key={sub.id}
                        onClick={() => isSelected ? removeProduct(sub.id) : addProduct(sub, selectedGroup.id, selectedGroup.status)}
                        className={`group relative bg-white rounded-xl p-3 border-2 transition-all duration-200 text-left ${
                          isSelected
                            ? 'border-emerald-500 bg-emerald-50 shadow-md ring-1 ring-emerald-200'
                            : 'border-gray-200 hover:border-[rgb(var(--brand-yellow-400))] hover:shadow-md'
                        }`}
                      >
                        {isSelected && (
                          <div className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center shadow-sm">
                            <Check size={12} className="text-white" />
                          </div>
                        )}

                        <h3 className="font-medium text-xs leading-tight line-clamp-2 text-gray-800 mb-2">
                          {sub.name}
                        </h3>

                        <div className="flex items-center justify-between">
                          <span className="font-mono text-[10px] font-bold text-[rgb(var(--brand-yellow-700))] bg-[rgb(var(--brand-yellow-50))] px-1.5 py-0.5 rounded">
                            {sub.tnved}
                          </span>
                          {!isSelected && (
                            <Plus size={14} className="text-gray-400 group-hover:text-[rgb(var(--brand-yellow-600))] transition-colors" />
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Mobile: Accordion */}
            <div className="lg:hidden space-y-3">
              {categories.map((group) => (
                <div key={group.id} className="rounded-2xl border-2 border-gray-200 overflow-hidden bg-white">
                  <button
                    onClick={() => handleCategorySelect(group)}
                    className={`w-full text-left px-4 py-4 transition-all flex items-center justify-between gap-3 ${
                      selectedCategory === group.id
                        ? 'bg-gradient-to-r from-[rgb(var(--brand-yellow-500))] to-[rgb(var(--brand-yellow-600))] text-black'
                        : 'bg-white text-gray-700'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${selectedCategory === group.id ? 'bg-white/30' : 'bg-[rgb(var(--brand-yellow-100))]'}`}>
                        {group.status === 'experiment' ? (
                          <FlaskConical size={20} className={selectedCategory === group.id ? 'text-black' : 'text-amber-600'} />
                        ) : (
                          <Package size={20} className={selectedCategory === group.id ? 'text-black' : 'text-[rgb(var(--brand-yellow-600))]'} />
                        )}
                      </div>
                      <div>
                        <div className="font-bold text-sm">{group.name}</div>
                        <div className={`text-xs ${selectedCategory === group.id ? 'text-black/70' : 'text-gray-500'}`}>
                          {group.subcategories?.length} товаров
                        </div>
                      </div>
                    </div>
                    <ChevronDown size={20} className={`transition-transform ${selectedCategory === group.id ? 'rotate-180' : ''}`} />
                  </button>

                  {selectedCategory === group.id && (
                    <div className="p-3 bg-gray-50 border-t-2 border-[rgb(var(--brand-yellow-200))]">
                      <div className="grid grid-cols-2 gap-2">
                        {group.subcategories?.map((sub) => {
                          const isSelected = isProductSelected(sub.id);
                          return (
                            <button
                              key={sub.id}
                              onClick={() => isSelected ? removeProduct(sub.id) : addProduct(sub, group.id, group.status)}
                              className={`relative bg-white rounded-lg p-2.5 border-2 transition-all text-left ${
                                isSelected
                                  ? 'border-emerald-500 bg-emerald-50'
                                  : 'border-gray-200'
                              }`}
                            >
                              {isSelected && (
                                <div className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full flex items-center justify-center">
                                  <Check size={10} className="text-white" />
                                </div>
                              )}
                              <div className="text-xs font-medium text-gray-900 line-clamp-2 mb-1.5">{sub.name}</div>
                              <div className="font-mono text-[10px] font-bold text-[rgb(var(--brand-yellow-700))] bg-[rgb(var(--brand-yellow-50))] px-1.5 py-0.5 rounded inline-block">
                                {sub.tnved}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
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
                  <p className="text-sm text-gray-600">Откуда товар и какой объём в месяц</p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              {selectedProducts.map((product, index) => (
                <div
                  key={product.id}
                  className="bg-white rounded-2xl border-2 border-gray-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow"
                >
                  {/* Product Header */}
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
                            <span className="text-xs text-gray-500">{product.categoryName}</span>
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

                  {/* Product Details Form */}
                  <div className="p-6 grid md:grid-cols-2 gap-6">
                    {/* Source - Multiple selection */}
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

                    {/* Volume */}
                    <div>
                      <Label className="text-sm font-semibold text-gray-700 mb-3 block">
                        Какой объём в месяц?
                      </Label>
                      <RadioGroup
                        value={product.volume}
                        onValueChange={(value) => updateProductDetails(product.id, 'volume', value)}
                      >
                        <div className="space-y-2">
                          {[
                            { value: '<100', label: 'До 100 единиц' },
                            { value: '100-1000', label: '100 — 1 000 единиц' },
                            { value: '1000-10000', label: '1 000 — 10 000 единиц' },
                            { value: '>10000', label: 'Более 10 000 единиц' }
                          ].map((opt) => (
                            <div key={opt.value} className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-50">
                              <RadioGroupItem value={opt.value} id={`${product.id}-vol-${opt.value}`} />
                              <Label htmlFor={`${product.id}-vol-${opt.value}`} className="cursor-pointer text-sm flex-1">
                                {opt.label}
                              </Label>
                            </div>
                          ))}
                        </div>
                      </RadioGroup>
                    </div>
                  </div>

                  {/* Completion indicator */}
                  <div className={`px-6 py-3 text-sm flex items-center gap-2 ${
                    product.source?.length > 0 && product.volume
                      ? 'bg-emerald-50 text-emerald-700'
                      : 'bg-amber-50 text-amber-700'
                  }`}>
                    {product.source?.length > 0 && product.volume ? (
                      <>
                        <CheckCircle size={16} />
                        <span>Данные заполнены</span>
                      </>
                    ) : (
                      <>
                        <AlertTriangle size={16} />
                        <span>Заполните все поля</span>
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
            {/* Summary Panel */}
            <div className="mb-8 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-3xl p-8 text-white shadow-2xl">
              <div className="flex items-center gap-4 mb-6">
                <div className="p-3 bg-white/20 rounded-2xl">
                  <FileText size={28} />
                </div>
                <div>
                  <h2 className="text-2xl font-bold">Результаты проверки</h2>
                  <p className="text-white/80">Проверено товаров: {results.length}</p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="bg-white/10 rounded-2xl p-4 text-center backdrop-blur-sm">
                  <div className="text-4xl font-bold mb-1">{requiresMarkingCount}</div>
                  <div className="text-sm text-white/80">Обязательная маркировка</div>
                </div>
                <div className="bg-white/10 rounded-2xl p-4 text-center backdrop-blur-sm">
                  <div className="text-4xl font-bold mb-1">{experimentCount}</div>
                  <div className="text-sm text-white/80">Эксперимент</div>
                </div>
                <div className="bg-white/10 rounded-2xl p-4 text-center backdrop-blur-sm">
                  <div className="text-4xl font-bold mb-1">{freeCount}</div>
                  <div className="text-sm text-white/80">Без маркировки</div>
                </div>
              </div>
            </div>

            {/* Result Cards */}
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
                  {/* Card Header */}
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
                      <div className="text-sm opacity-80">{result.productInfo.categoryName}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs opacity-70">ТН ВЭД</div>
                      <div className="font-mono font-bold">{result.tnved}</div>
                    </div>
                  </div>

                  {/* Card Body */}
                  <div className="p-6">
                    <div className={`rounded-xl p-4 mb-4 ${
                      result.requires_marking
                        ? 'bg-emerald-50'
                        : result.status === 'experiment'
                          ? 'bg-amber-50'
                          : 'bg-gray-50'
                    }`}>
                      <div className={`font-semibold mb-2 ${
                        result.requires_marking
                          ? 'text-emerald-700'
                          : result.status === 'experiment'
                            ? 'text-amber-700'
                            : 'text-gray-700'
                      }`}>
                        {result.requires_marking
                          ? 'Требуется маркировка'
                          : result.status === 'experiment'
                            ? 'Участвует в эксперименте'
                            : 'Маркировка не требуется'}
                      </div>
                      <p className="text-sm text-gray-600">{result.message}</p>
                    </div>

                    {/* Details */}
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

                    {/* Steps Preview */}
                    {result.steps && result.steps.length > 0 && (
                      <div className="mt-4 pt-4 border-t border-gray-100">
                        <div className="text-xs text-gray-500 mb-2">Необходимые шаги:</div>
                        <div className="text-sm text-gray-700">
                          {result.steps.slice(0, 2).map((s, i) => (
                            <div key={i} className="flex items-start gap-2 mb-1">
                              <span className="text-[rgb(var(--brand-yellow-600))]">•</span>
                              <span className="line-clamp-1">{s}</span>
                            </div>
                          ))}
                          {result.steps.length > 2 && (
                            <div className="text-xs text-gray-400">+{result.steps.length - 2} ещё...</div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Call to Action */}
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
                    Оформить договор
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
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => !callbackLoading && setShowCallbackModal(false)}
          />

          {/* Modal Content */}
          <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
            {/* Modal Header */}
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
              {/* Close button */}
              <button
                onClick={() => !callbackLoading && setShowCallbackModal(false)}
                className="absolute top-4 right-4 p-2 rounded-full hover:bg-white/20 transition-colors"
                disabled={callbackLoading}
              >
                <X size={20} className="text-black" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4">
              {/* Products summary */}
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

              {/* Name field */}
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

              {/* Phone field */}
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

              {/* Submit button */}
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

              {/* Privacy note */}
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
