import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { RadioGroup, RadioGroupItem } from '../components/ui/radio-group';
import { Label } from '../components/ui/label';
import { CheckCircle, XCircle, ArrowLeft, ArrowRight, Package, FlaskConical, Check } from 'lucide-react';
import { toast } from 'sonner';
import Stepper from '../components/Stepper';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const CheckProductPage = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [categories, setCategories] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedSubcategory, setSelectedSubcategory] = useState('');
  const [source, setSource] = useState('');
  const [volume, setVolume] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchCategories();
  }, []);

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
    setSelectedGroup(group);
    setSelectedCategory(group.id);
    setSelectedSubcategory('');
  };

  const handleNext = () => {
    if (step === 1 && !selectedSubcategory) {
      toast.error('Выберите подкатегорию товара');
      return;
    }
    if (step === 2 && (!source || !volume)) {
      toast.error('Заполните все поля');
      return;
    }
    if (step === 1) {
      setStep(2);
    } else if (step === 2) {
      handleSubmit();
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
      setResult(null);
    } else {
      navigate('/');
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/check/assess`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category: selectedCategory,
          subcategory: selectedSubcategory,
          source,
          volume
        })
      });
      const data = await response.json();
      setResult(data);
      setStep(3);
      toast.success('Результат получен');
    } catch (error) {
      toast.error('Ошибка получения результата');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const stepLabels = ['Категория', 'Детали', 'Результат'];

  // Определяем статус категории для бейджа
  const getCategoryStatus = (group) => {
    if (group?.status === 'experiment') {
      return { label: 'Эксперимент', color: 'bg-amber-100 text-amber-700 border-amber-200' };
    }
    return { label: 'Обязательная', color: 'bg-emerald-100 text-emerald-700 border-emerald-200' };
  };

  return (
    <div className="py-12 bg-gradient-to-b from-slate-50 to-white min-h-screen">
      <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-semibold text-primary mb-2">Проверка товара</h1>
          <p className="text-gray-600">Узнайте, подлежит ли ваш товар обязательной маркировке</p>
        </div>

        <Stepper current={step} total={3} steps={stepLabels} />

        {/* Step 1: Category Selection */}
        {step === 1 && !result && (
          <div className="grid grid-cols-1 lg:grid-cols-[300px,1fr] gap-8" data-testid="step-1">
            {/* Left: Category Menu */}
            <aside className="space-y-2 max-h-[70vh] overflow-y-auto pr-2" data-testid="category-menu">
              {categories.map((group) => {
                const status = getCategoryStatus(group);
                return (
                  <button
                    key={group.id}
                    onClick={() => handleCategorySelect(group)}
                    className={`w-full text-left rounded-xl px-4 py-3 transition-all text-sm font-medium flex items-center justify-between gap-2 ${
                      selectedCategory === group.id
                        ? 'bg-gradient-to-r from-[rgb(var(--brand-yellow-500))] to-[rgb(var(--brand-yellow-600))] text-[rgb(var(--black))] shadow-lg'
                        : 'bg-white hover:bg-[rgb(var(--brand-yellow-50))] text-[rgb(var(--grey-700))] border border-[rgb(var(--grey-200))] hover:border-[rgb(var(--brand-yellow-400))] shadow-sm hover:shadow-md'
                    }`}
                    data-testid="category-menu-item"
                  >
                    <span className="flex items-center gap-2">
                      {selectedCategory === group.id && <Check size={16} className="flex-shrink-0" />}
                      <span className="truncate">{group.name}</span>
                    </span>
                    {group.status === 'experiment' && (
                      <span className="flex-shrink-0 text-[10px] px-1.5 py-0.5 rounded bg-amber-200 text-amber-800">
                        Эксп.
                      </span>
                    )}
                  </button>
                );
              })}
            </aside>

            {/* Right: Subcategories - Beautiful Cards */}
            <div>
              {/* Category Header */}
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

              {/* Product Cards Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4" data-testid="subcategory-tiles">
                {selectedGroup?.subcategories?.map((sub) => (
                  <button
                    key={sub.id}
                    onClick={() => setSelectedSubcategory(sub.id)}
                    className={`group relative bg-white rounded-2xl p-4 border-2 transition-all duration-200 text-left h-[140px] flex flex-col justify-between ${
                      selectedSubcategory === sub.id
                        ? 'border-[rgb(var(--brand-yellow-500))] bg-[rgb(var(--brand-yellow-50))] shadow-lg ring-2 ring-[rgb(var(--brand-yellow-200))]'
                        : 'border-gray-200 hover:border-[rgb(var(--brand-yellow-400))] hover:shadow-lg hover:bg-gray-50'
                    }`}
                    data-testid="subcategory-card"
                  >
                    {/* Selection indicator */}
                    {selectedSubcategory === sub.id && (
                      <div className="absolute -top-2 -right-2 w-6 h-6 bg-[rgb(var(--brand-yellow-500))] rounded-full flex items-center justify-center shadow-md">
                        <Check size={14} className="text-black" />
                      </div>
                    )}

                    {/* Product Name */}
                    <div className="flex-1">
                      <h3 className={`font-semibold text-sm leading-tight line-clamp-2 ${
                        selectedSubcategory === sub.id ? 'text-gray-900' : 'text-gray-800 group-hover:text-gray-900'
                      }`}>
                        {sub.name}
                      </h3>
                    </div>

                    {/* TN VED Code */}
                    <div className="mt-3 pt-3 border-t border-gray-100">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] uppercase tracking-wide text-gray-400 font-medium">ТН ВЭД</span>
                        <span className={`font-mono text-xs font-bold ${
                          selectedSubcategory === sub.id
                            ? 'text-[rgb(var(--brand-yellow-700))]'
                            : 'text-gray-600 group-hover:text-gray-800'
                        }`}>
                          {sub.tnved}
                        </span>
                      </div>
                    </div>

                    {/* Status Badge */}
                    <div className="mt-2">
                      <span className={`inline-flex items-center gap-1 text-[10px] px-2 py-1 rounded-full font-medium ${
                        selectedGroup?.status === 'experiment'
                          ? 'bg-amber-50 text-amber-700 border border-amber-200'
                          : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      }`}>
                        {selectedGroup?.status === 'experiment' ? (
                          <>
                            <FlaskConical size={10} />
                            Эксперимент
                          </>
                        ) : (
                          <>
                            <CheckCircle size={10} />
                            Обязательная
                          </>
                        )}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Details */}
        {step === 2 && !result && (
          <div className="max-w-3xl mx-auto" data-testid="step-2">
            <div className="bg-white rounded-[16px] p-6 sm:p-8 border border-gray-200 shadow-[var(--shadow-layer)]">
              <div className="space-y-6">
                {/* Source */}
                <div>
                  <Label className="text-base font-semibold text-primary mb-3 block">
                    Откуда у вас этот товар?
                  </Label>
                  <RadioGroup value={source} onValueChange={setSource}>
                    <div className="space-y-3">
                      <div className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-50 transition-colors">
                        <RadioGroupItem value="produce" id="produce" data-testid="source-produce" />
                        <Label htmlFor="produce" className="cursor-pointer flex-1">
                          Произвожу сам в России
                        </Label>
                      </div>
                      <div className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-50 transition-colors">
                        <RadioGroupItem value="import" id="import" data-testid="source-import" />
                        <Label htmlFor="import" className="cursor-pointer flex-1">
                          Импортирую из-за рубежа
                        </Label>
                      </div>
                      <div className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-50 transition-colors">
                        <RadioGroupItem value="buy_rf" id="buy_rf" data-testid="source-buy-rf" />
                        <Label htmlFor="buy_rf" className="cursor-pointer flex-1">
                          Покупаю у российского поставщика
                        </Label>
                      </div>
                      <div className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-50 transition-colors">
                        <RadioGroupItem value="old_stock" id="old_stock" data-testid="source-old-stock" />
                        <Label htmlFor="old_stock" className="cursor-pointer flex-1">
                          Продаю остатки (закупил до введения маркировки)
                        </Label>
                      </div>
                    </div>
                  </RadioGroup>
                </div>

                {/* Volume */}
                <div>
                  <Label className="text-base font-semibold text-primary mb-3 block">
                    Какой примерный объём в месяц?
                  </Label>
                  <RadioGroup value={volume} onValueChange={setVolume}>
                    <div className="space-y-3">
                      <div className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-50 transition-colors">
                        <RadioGroupItem value="<100" id="vol1" data-testid="volume-small" />
                        <Label htmlFor="vol1" className="cursor-pointer flex-1">
                          До 100 единиц
                        </Label>
                      </div>
                      <div className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-50 transition-colors">
                        <RadioGroupItem value="100-1000" id="vol2" data-testid="volume-medium" />
                        <Label htmlFor="vol2" className="cursor-pointer flex-1">
                          100 — 1 000 единиц
                        </Label>
                      </div>
                      <div className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-50 transition-colors">
                        <RadioGroupItem value="1000-10000" id="vol3" data-testid="volume-large" />
                        <Label htmlFor="vol3" className="cursor-pointer flex-1">
                          1 000 — 10 000 единиц
                        </Label>
                      </div>
                      <div className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-50 transition-colors">
                        <RadioGroupItem value=">10000" id="vol4" data-testid="volume-xlarge" />
                        <Label htmlFor="vol4" className="cursor-pointer flex-1">
                          Более 10 000 единиц
                        </Label>
                      </div>
                    </div>
                  </RadioGroup>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Result */}
        {step === 3 && result && (
          <div className="max-w-3xl mx-auto" data-testid="step-3">
            <div className="bg-white rounded-[16px] p-6 sm:p-8 border border-gray-200 shadow-[var(--shadow-layer)]">
              {result.requires_marking ? (
                <div>
                  {/* Requires marking */}
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-3 rounded-full bg-rose-100">
                      <XCircle className="text-rose-600" size={32} />
                    </div>
                    <div>
                      <h2 className="text-2xl font-semibold text-primary">
                        Ваш товар подлежит обязательной маркировке
                      </h2>
                    </div>
                  </div>

                  <div className="bg-rose-50 border border-rose-200 rounded-lg p-4 mb-6">
                    <p className="text-rose-800 font-medium">{result.message}</p>
                    {result.tnved && (
                      <div className="mt-3 flex items-center gap-2">
                        <span className="text-sm text-rose-600">Код ТН ВЭД:</span>
                        <span className="font-mono font-bold text-rose-800 bg-rose-100 px-2 py-1 rounded">{result.tnved}</span>
                      </div>
                    )}
                  </div>

                  <div className="mb-6">
                    <h3 className="text-lg font-semibold text-primary mb-3">Что нужно сделать:</h3>
                    <ol className="space-y-3">
                      {result.steps?.map((stepItem, index) => (
                        <li key={index} className="flex gap-3">
                          <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center text-sm font-medium">
                            {index + 1}
                          </span>
                          <span className="text-gray-700 flex-1">{stepItem}</span>
                        </li>
                      ))}
                    </ol>
                  </div>

                  <div className="flex gap-3 pt-4 border-t">
                    <Button
                      onClick={() => navigate('/contact')}
                      className="btn-gradient rounded-[12px] flex-1"
                      data-testid="get-detailed-plan"
                    >
                      Получить подробный план
                    </Button>
                    <Button
                      onClick={() => navigate('/contact')}
                      className="rounded-[12px] bg-primary/5 text-primary border border-primary/10 hover:bg-primary/10 flex-1"
                      data-testid="order-turnkey"
                    >
                      Заказать подключение под ключ
                    </Button>
                  </div>
                </div>
              ) : (
                <div>
                  {/* Does not require marking or experiment */}
                  <div className="flex items-center gap-3 mb-4" data-testid="result-success">
                    <div className={`p-3 rounded-full ${result.status === 'experiment' ? 'bg-amber-100' : 'bg-emerald-100'}`}>
                      {result.status === 'experiment' ? (
                        <FlaskConical className="text-amber-600" size={32} />
                      ) : (
                        <CheckCircle className="text-emerald-600" size={32} />
                      )}
                    </div>
                    <div>
                      <h2 className="text-2xl font-semibold text-primary">
                        {result.status === 'experiment'
                          ? 'Товар участвует в эксперименте'
                          : 'Ваш товар пока не подлежит маркировке'
                        }
                      </h2>
                    </div>
                  </div>

                  <div className={`border rounded-lg p-4 mb-6 ${
                    result.status === 'experiment'
                      ? 'bg-amber-50 border-amber-200'
                      : 'bg-emerald-50 border-emerald-200'
                  }`}>
                    <p className={result.status === 'experiment' ? 'text-amber-800' : 'text-emerald-800'}>
                      {result.message}
                    </p>
                    {result.tnved && (
                      <div className="mt-3 flex items-center gap-2">
                        <span className={`text-sm ${result.status === 'experiment' ? 'text-amber-600' : 'text-emerald-600'}`}>
                          Код ТН ВЭД:
                        </span>
                        <span className={`font-mono font-bold px-2 py-1 rounded ${
                          result.status === 'experiment'
                            ? 'text-amber-800 bg-amber-100'
                            : 'text-emerald-800 bg-emerald-100'
                        }`}>
                          {result.tnved}
                        </span>
                      </div>
                    )}
                  </div>

                  {result.steps && result.steps.length > 0 && (
                    <div className="mb-6">
                      <h3 className="text-lg font-semibold text-primary mb-3">Рекомендации:</h3>
                      <ul className="space-y-2">
                        {result.steps.map((stepItem, index) => (
                          <li key={index} className="flex gap-2 text-gray-700">
                            <span className="text-amber-500">•</span>
                            <span>{stepItem}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="flex gap-3 pt-4 border-t">
                    <Button
                      onClick={() => navigate('/contact')}
                      className={`rounded-[12px] ${result.status === 'experiment' ? 'btn-gradient' : 'btn-gradient-emerald'}`}
                      data-testid="subscribe-updates"
                    >
                      Подписаться на обновления
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Navigation buttons */}
        <div className="flex items-center justify-between mt-8 max-w-3xl mx-auto">
          <Button
            onClick={handleBack}
            variant="secondary"
            className="rounded-[12px] flex items-center gap-2"
            data-testid="check-product-back-button"
          >
            <ArrowLeft size={18} />
            {step === 1 ? 'На главную' : 'Назад'}
          </Button>

          {!result && (
            <Button
              onClick={handleNext}
              className="btn-gradient rounded-[12px] flex items-center gap-2"
              disabled={loading}
              data-testid={step === 3 ? 'check-product-submit-button' : 'check-product-next-button'}
            >
              {loading ? 'Загрузка...' : step === 2 ? 'Проверить' : 'Далее'}
              <ArrowRight size={18} />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default CheckProductPage;
