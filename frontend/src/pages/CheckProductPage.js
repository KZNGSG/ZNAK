import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { RadioGroup, RadioGroupItem } from '../components/ui/radio-group';
import { Label } from '../components/ui/label';
import { CheckCircle, XCircle, ArrowLeft, ArrowRight } from 'lucide-react';
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
      setStep(3);  // Переключаем на шаг 3 для отображения результата
      toast.success('Результат получен');
    } catch (error) {
      toast.error('Ошибка получения результата');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const stepLabels = ['Категория', 'Детали', 'Результат'];

  return (
    <div className="py-12 bg-gradient-to-b from-slate-50 to-white min-h-screen">
      <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-semibold text-primary mb-2">Проверка товара</h1>
          <p className="text-gray-600">Узнайте, подлежит ли ваш товар обязательной маркировке</p>
        </div>

        <Stepper current={step} total={3} steps={stepLabels} />

        {/* Step 1: Category Selection */}
        {step === 1 && !result && (
          <div className="grid grid-cols-1 lg:grid-cols-[280px,1fr] gap-8" data-testid="step-1">
            {/* Left: Category Menu */}
            <aside className="space-y-2" data-testid="category-menu">
              {categories.map((group) => (
                <button
                  key={group.id}
                  onClick={() => handleCategorySelect(group)}
                  className={`w-full text-left rounded-[12px] px-4 py-3 transition-colors text-sm font-medium ${
                    selectedCategory === group.id
                      ? 'bg-primary text-white'
                      : 'bg-white hover:bg-primary/5 text-gray-700 border border-gray-200'
                  }`}
                  data-testid="category-menu-item"
                >
                  {group.name}
                </button>
              ))}
            </aside>

            {/* Right: Subcategories */}
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4" data-testid="subcategory-tiles">
              {selectedGroup?.subcategories?.map((sub) => (
                <button
                  key={sub.id}
                  onClick={() => setSelectedSubcategory(sub.id)}
                  className={`bg-white rounded-[16px] p-4 border-2 transition-all card-hover text-left ${
                    selectedSubcategory === sub.id
                      ? 'border-accent bg-accent/5'
                      : 'border-gray-200 hover:border-accent/50'
                  }`}
                  data-testid="subcategory-card"
                >
                  <div className="font-medium text-sm text-primary">{sub.name}</div>
                </button>
              ))}
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
                    <p className="text-rose-800">{result.message}</p>
                    {result.tnved && (
                      <p className="text-sm text-rose-700 mt-2">Код ТН ВЭД: {result.tnved}</p>
                    )}
                  </div>

                  <div className="mb-6">
                    <h3 className="text-lg font-semibold text-primary mb-3">Что нужно сделать:</h3>
                    <ol className="space-y-3">
                      {result.steps?.map((step, index) => (
                        <li key={index} className="flex gap-3">
                          <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center text-sm font-medium">
                            {index + 1}
                          </span>
                          <span className="text-gray-700 flex-1">{step}</span>
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
                  {/* Does not require marking */}
                  <div className="flex items-center gap-3 mb-4" data-testid="result-success">
                    <div className="p-3 rounded-full bg-emerald-100">
                      <CheckCircle className="text-emerald-600" size={32} />
                    </div>
                    <div>
                      <h2 className="text-2xl font-semibold text-primary">
                        Ваш товар пока не подлежит маркировке
                      </h2>
                    </div>
                  </div>
                  
                  <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 mb-6">
                    <p className="text-emerald-800">{result.message}</p>
                  </div>

                  <div className="flex gap-3 pt-4 border-t">
                    <Button
                      onClick={() => navigate('/contact')}
                      className="btn-gradient-emerald rounded-[12px]"
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
