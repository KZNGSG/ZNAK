import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { ArrowLeft, ArrowRight, CheckCircle, XCircle, Check } from 'lucide-react';
import { toast } from 'sonner';
import Stepper from '../components/Stepper';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const ImportPage = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [countries, setCountries] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCountry, setSelectedCountry] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [schemes, setSchemes] = useState([]);

  useEffect(() => {
    fetchCountries();
    fetchCategories();
  }, []);

  const fetchCountries = async () => {
    try {
      const response = await fetch(`${API_URL}/api/import/countries`);
      const data = await response.json();
      setCountries(data.countries || []);
    } catch (error) {
      toast.error('Ошибка загрузки стран');
      console.error(error);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await fetch(`${API_URL}/api/import/categories`);
      const data = await response.json();
      setCategories(data.groups || []);
    } catch (error) {
      toast.error('Ошибка загрузки категорий');
      console.error(error);
    }
  };

  const fetchSchemes = async () => {
    try {
      const response = await fetch(
        `${API_URL}/api/import/schemes?country=${selectedCountry}&category=${selectedCategory}`
      );
      const data = await response.json();
      setSchemes(data.schemes || []);
    } catch (error) {
      toast.error('Ошибка загрузки схем');
      console.error(error);
    }
  };

  const handleNext = () => {
    if (step === 1 && !selectedCountry) {
      toast.error('Выберите страну');
      return;
    }
    if (step === 2 && !selectedCategory) {
      toast.error('Выберите категорию');
      return;
    }
    if (step < 3) {
      setStep(step + 1);
      if (step === 2) {
        fetchSchemes();
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

  const stepLabels = ['Страна', 'Категория', 'Схемы'];

  return (
    <div className="py-12 bg-gradient-to-b from-slate-50 to-white min-h-screen">
      <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-semibold text-primary mb-2">Импорт товаров</h1>
          <p className="text-gray-600">Как правильно завезти и промаркировать импортный товар</p>
        </div>

        <Stepper current={step} total={3} steps={stepLabels} />

        {/* Step 1: Select Country */}
        {step === 1 && (
          <div className="max-w-4xl mx-auto" data-testid="step-1">
            <h2 className="text-xl font-semibold text-primary mb-6 text-center">Откуда везёте товар?</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {countries.map((country) => (
                <button
                  key={country.code}
                  onClick={() => setSelectedCountry(country.code)}
                  className={`relative bg-white rounded-2xl p-6 border-2 transition-all text-center ${
                    selectedCountry === country.code
                      ? 'border-[rgb(var(--brand-yellow-500))] bg-[rgb(var(--brand-yellow-50))] shadow-lg ring-2 ring-[rgb(var(--brand-yellow-200))]'
                      : 'border-gray-200 hover:border-[rgb(var(--brand-yellow-400))] hover:shadow-md hover:bg-gray-50'
                  }`}
                  data-testid="country-card"
                >
                  {/* Selection indicator */}
                  {selectedCountry === country.code && (
                    <div className="absolute -top-2 -right-2 w-6 h-6 bg-[rgb(var(--brand-yellow-500))] rounded-full flex items-center justify-center shadow-md">
                      <Check size={14} className="text-black" />
                    </div>
                  )}
                  <div className="text-4xl mb-2">{country.flag}</div>
                  <div className={`font-medium text-sm ${
                    selectedCountry === country.code
                      ? 'text-[rgb(var(--grey-900))]'
                      : 'text-[rgb(var(--grey-700))]'
                  }`}>{country.name}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 2: Select Category */}
        {step === 2 && (
          <div className="max-w-3xl mx-auto" data-testid="step-2">
            <div className="bg-white rounded-[16px] p-6 sm:p-8 border border-gray-200 shadow-[var(--shadow-layer)]">
              <h2 className="text-xl font-semibold text-primary mb-6">Какой товар везёте?</h2>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-full rounded-[12px]" data-testid="category-select">
                  <SelectValue placeholder="Выберите категорию" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((group) => (
                    <SelectItem key={group.id} value={group.id}>
                      {group.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        {/* Step 3: Import Schemes */}
        {step === 3 && (
          <div className="max-w-5xl mx-auto" data-testid="step-3">
            <h2 className="text-xl font-semibold text-primary mb-6 text-center">Схемы импорта</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              {schemes.map((scheme, index) => (
                <div
                  key={scheme.id}
                  className="bg-white rounded-[16px] p-6 border border-gray-200 shadow-[var(--shadow-layer)] card-hover"
                  data-testid="scheme-card"
                >
                  <div className="flex items-start gap-3 mb-4">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <span className="text-primary font-bold text-lg">{String.fromCharCode(65 + index)}</span>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-primary">{scheme.title}</h3>
                    </div>
                  </div>
                  
                  <p className="text-sm text-gray-600 mb-4">{scheme.description}</p>

                  <div className="mb-3">
                    <div className="text-xs font-semibold text-emerald-600 mb-2 flex items-center gap-1">
                      <CheckCircle size={14} /> Плюсы:
                    </div>
                    <ul className="space-y-1">
                      {scheme.pros.map((pro, i) => (
                        <li key={i} className="text-xs text-gray-600 flex items-start gap-1">
                          <span className="text-emerald-600">•</span>
                          <span>{pro}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="mb-3">
                    <div className="text-xs font-semibold text-rose-600 mb-2 flex items-center gap-1">
                      <XCircle size={14} /> Минусы:
                    </div>
                    <ul className="space-y-1">
                      {scheme.cons.map((con, i) => (
                        <li key={i} className="text-xs text-gray-600 flex items-start gap-1">
                          <span className="text-rose-600">•</span>
                          <span>{con}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="pt-3 border-t border-gray-200">
                    <div className="text-xs font-semibold text-gray-500 mb-1">Подходит для:</div>
                    <div className="text-xs text-primary">{scheme.fit_for}</div>
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-white rounded-[16px] p-6 border border-gray-200 shadow-[var(--shadow-layer)]">
              <h3 className="text-lg font-semibold text-primary mb-4">Нужна помощь с импортом?</h3>
              <p className="text-gray-600 mb-4">
                Мы поможем подобрать оптимальную схему импорта и организуем полное сопровождение
              </p>
              <div className="flex flex-wrap gap-3">
                <Button
                  onClick={() => navigate('/contact')}
                  className="btn-gradient rounded-[12px]"
                  data-testid="warehouse-button"
                >
                  Подобрать таможенный склад
                </Button>
                <Button
                  onClick={() => navigate('/contact')}
                  className="rounded-[12px] bg-primary/5 text-primary border border-primary/10 hover:bg-primary/10"
                  data-testid="support-button"
                >
                  Заказать сопровождение импорта
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Navigation buttons */}
        <div className="flex items-center justify-between mt-8 max-w-3xl mx-auto">
          <Button
            onClick={handleBack}
            variant="secondary"
            className="rounded-[12px] flex items-center gap-2"
            data-testid="import-back-button"
          >
            <ArrowLeft size={18} />
            {step === 1 ? 'На главную' : 'Назад'}
          </Button>
          
          {step < 3 && (
            <Button
              onClick={handleNext}
              className="btn-gradient rounded-[12px] flex items-center gap-2"
              data-testid="import-next-button"
            >
              Далее
              <ArrowRight size={18} />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ImportPage;
