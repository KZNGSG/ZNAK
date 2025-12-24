import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { RadioGroup, RadioGroupItem } from '../components/ui/radio-group';
import { Checkbox } from '../components/ui/checkbox';
import { Label } from '../components/ui/label';
import { ArrowLeft, ArrowRight, Printer, ScanLine, Smartphone, Monitor } from 'lucide-react';
import { toast } from 'sonner';
import Stepper from '../components/Stepper';
import SEO, { schemas } from '../components/SEO';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const EquipmentPage = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [facilityType, setFacilityType] = useState('');
  const [dailyVolume, setDailyVolume] = useState('');
  const [hasEquipment, setHasEquipment] = useState([]);
  const [recommendation, setRecommendation] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleEquipmentToggle = (equipmentId) => {
    setHasEquipment(prev =>
      prev.includes(equipmentId)
        ? prev.filter(id => id !== equipmentId)
        : [...prev, equipmentId]
    );
  };

  const handleNext = () => {
    if (step === 1 && !facilityType) {
      toast.error('Выберите тип объекта');
      return;
    }
    if (step === 2 && !dailyVolume) {
      toast.error('Выберите объём');
      return;
    }
    if (step < 4) {
      setStep(step + 1);
      if (step === 3) {
        handleSubmit();
      }
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
      setRecommendation(null);
    } else {
      navigate('/');
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/equipment/recommend`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          facility_type: facilityType,
          daily_volume: dailyVolume,
          has_equipment: hasEquipment
        })
      });
      const data = await response.json();
      setRecommendation(data);
      toast.success('Рекомендации получены');
    } catch (error) {
      toast.error('Ошибка получения рекомендаций');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const stepLabels = ['Тип объекта', 'Объём', 'Оборудование', 'Результат'];

  return (
    <div className="py-12 bg-gradient-to-b from-slate-50 to-white min-h-screen">
      <SEO title='Оборудование для маркировки товаров' description='Подбор оборудования для маркировки: принтеры этикеток, сканеры DataMatrix, ТСД. Помощь в выборе под ваши задачи и бюджет.' keywords='оборудование для маркировки, принтер datamatrix, сканер честный знак' canonical='/equipment' schema={[schemas.organization, schemas.breadcrumb([{name: 'Главная', url: '/'}, {name: 'Оборудование', url: '/equipment'}])]} />
      <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-semibold text-primary mb-2">Оснащение производства</h1>
          <p className="text-gray-600">Подберём оборудование для маркировки под ваш объём</p>
        </div>

        <Stepper current={step} total={4} steps={stepLabels} />

        {/* Step 1: Facility Type */}
        {step === 1 && (
          <div className="max-w-3xl mx-auto" data-testid="step-1">
            <div className="bg-white rounded-[16px] p-6 sm:p-8 border border-gray-200 shadow-[var(--shadow-layer)]">
              <h2 className="text-xl font-semibold text-primary mb-6">Что у вас?</h2>
              <RadioGroup value={facilityType} onValueChange={setFacilityType}>
                <div className="space-y-3">
                  <div className="flex items-center space-x-3 p-4 rounded-lg hover:bg-gray-50 transition-colors border border-gray-200">
                    <RadioGroupItem value="production" id="production" data-testid="facility-production" />
                    <Label htmlFor="production" className="cursor-pointer flex-1">
                      Производство (фабрика, цех)
                    </Label>
                  </div>
                  <div className="flex items-center space-x-3 p-4 rounded-lg hover:bg-gray-50 transition-colors border border-gray-200">
                    <RadioGroupItem value="warehouse" id="warehouse" data-testid="facility-warehouse" />
                    <Label htmlFor="warehouse" className="cursor-pointer flex-1">
                      Склад
                    </Label>
                  </div>
                  <div className="flex items-center space-x-3 p-4 rounded-lg hover:bg-gray-50 transition-colors border border-gray-200">
                    <RadioGroupItem value="retail" id="retail" data-testid="facility-retail" />
                    <Label htmlFor="retail" className="cursor-pointer flex-1">
                      Розничная точка
                    </Label>
                  </div>
                  <div className="flex items-center space-x-3 p-4 rounded-lg hover:bg-gray-50 transition-colors border border-gray-200">
                    <RadioGroupItem value="combined" id="combined" data-testid="facility-combined" />
                    <Label htmlFor="combined" className="cursor-pointer flex-1">
                      Комбинированный вариант
                    </Label>
                  </div>
                </div>
              </RadioGroup>
            </div>
          </div>
        )}

        {/* Step 2: Daily Volume */}
        {step === 2 && (
          <div className="max-w-3xl mx-auto" data-testid="step-2">
            <div className="bg-white rounded-[16px] p-6 sm:p-8 border border-gray-200 shadow-[var(--shadow-layer)]">
              <h2 className="text-xl font-semibold text-primary mb-6">Объём в день?</h2>
              <RadioGroup value={dailyVolume} onValueChange={setDailyVolume}>
                <div className="space-y-3">
                  <div className="flex items-center space-x-3 p-4 rounded-lg hover:bg-gray-50 transition-colors border border-gray-200">
                    <RadioGroupItem value="<100" id="vol1" data-testid="volume-small" />
                    <Label htmlFor="vol1" className="cursor-pointer flex-1">
                      До 100 единиц
                    </Label>
                  </div>
                  <div className="flex items-center space-x-3 p-4 rounded-lg hover:bg-gray-50 transition-colors border border-gray-200">
                    <RadioGroupItem value="100-1000" id="vol2" data-testid="volume-medium" />
                    <Label htmlFor="vol2" className="cursor-pointer flex-1">
                      100 — 1 000 единиц
                    </Label>
                  </div>
                  <div className="flex items-center space-x-3 p-4 rounded-lg hover:bg-gray-50 transition-colors border border-gray-200">
                    <RadioGroupItem value="1000-10000" id="vol3" data-testid="volume-large" />
                    <Label htmlFor="vol3" className="cursor-pointer flex-1">
                      1 000 — 10 000 единиц
                    </Label>
                  </div>
                  <div className="flex items-center space-x-3 p-4 rounded-lg hover:bg-gray-50 transition-colors border border-gray-200">
                    <RadioGroupItem value=">10000" id="vol4" data-testid="volume-xlarge" />
                    <Label htmlFor="vol4" className="cursor-pointer flex-1">
                      Более 10 000 единиц
                    </Label>
                  </div>
                </div>
              </RadioGroup>
            </div>
          </div>
        )}

        {/* Step 3: Current Equipment */}
        {step === 3 && (
          <div className="max-w-3xl mx-auto" data-testid="step-3">
            <div className="bg-white rounded-[16px] p-6 sm:p-8 border border-gray-200 shadow-[var(--shadow-layer)]">
              <h2 className="text-xl font-semibold text-primary mb-6">Что уже есть?</h2>
              <div className="space-y-4">
                <div className="flex items-center space-x-3 p-4 rounded-lg hover:bg-gray-50 transition-colors border border-gray-200">
                  <Checkbox
                    id="printer"
                    checked={hasEquipment.includes('printer')}
                    onCheckedChange={() => handleEquipmentToggle('printer')}
                    data-testid="equipment-printer"
                  />
                  <Label htmlFor="printer" className="cursor-pointer flex-1 flex items-center gap-3">
                    <Printer size={20} className="text-primary" />
                    <span>Принтер этикеток</span>
                  </Label>
                </div>
                <div className="flex items-center space-x-3 p-4 rounded-lg hover:bg-gray-50 transition-colors border border-gray-200">
                  <Checkbox
                    id="scanner"
                    checked={hasEquipment.includes('scanner')}
                    onCheckedChange={() => handleEquipmentToggle('scanner')}
                    data-testid="equipment-scanner"
                  />
                  <Label htmlFor="scanner" className="cursor-pointer flex-1 flex items-center gap-3">
                    <ScanLine size={20} className="text-primary" />
                    <span>Сканер штрих-кодов</span>
                  </Label>
                </div>
                <div className="flex items-center space-x-3 p-4 rounded-lg hover:bg-gray-50 transition-colors border border-gray-200">
                  <Checkbox
                    id="tsd"
                    checked={hasEquipment.includes('tsd')}
                    onCheckedChange={() => handleEquipmentToggle('tsd')}
                    data-testid="equipment-tsd"
                  />
                  <Label htmlFor="tsd" className="cursor-pointer flex-1 flex items-center gap-3">
                    <Smartphone size={20} className="text-primary" />
                    <span>Терминал сбора данных (ТСД)</span>
                  </Label>
                </div>
                <div className="flex items-center space-x-3 p-4 rounded-lg hover:bg-gray-50 transition-colors border border-gray-200">
                  <Checkbox
                    id="software"
                    checked={hasEquipment.includes('software')}
                    onCheckedChange={() => handleEquipmentToggle('software')}
                    data-testid="equipment-software"
                  />
                  <Label htmlFor="software" className="cursor-pointer flex-1 flex items-center gap-3">
                    <Monitor size={20} className="text-primary" />
                    <span>Программа учёта (1С, МойСклад, другая)</span>
                  </Label>
                </div>
              </div>
              <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-sm text-blue-800">
                  Отметьте всё, что у вас уже есть, или оставьте пустым, если ничего не имеете.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Step 4: Recommendation */}
        {step === 4 && recommendation && (
          <div className="max-w-4xl mx-auto" data-testid="step-4">
            <div className="bg-white rounded-[16px] p-6 sm:p-8 border border-gray-200 shadow-[var(--shadow-layer)]">
              <h2 className="text-2xl font-semibold text-primary mb-6">Рекомендуемое оборудование</h2>
              
              <div className="space-y-4 mb-6">
                {recommendation.items.map((item, index) => (
                  <div
                    key={index}
                    className={`p-4 rounded-lg border-2 ${
                      item.status === 'needed'
                        ? 'border-accent bg-accent/5'
                        : 'border-gray-200 bg-gray-50'
                    }`}
                    data-testid="equipment-item"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-primary">{item.name}</h3>
                          {item.status === 'has' && (
                            <span className="text-xs px-2 py-1 rounded-full bg-emerald-100 text-emerald-700 font-medium">
                              Уже есть
                            </span>
                          )}
                          {item.status === 'needed' && (
                            <span className="text-xs px-2 py-1 rounded-full bg-accent text-white font-medium">
                              Нужно
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 mb-2">{item.purpose}</p>
                        <p className="text-sm font-semibold text-primary">
                          {item.price_min.toLocaleString()} — {item.price_max.toLocaleString()} ₽
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="p-6 rounded-lg bg-gradient-to-r from-primary/10 to-accent/10 border border-primary/20">
                <div className="text-center">
                  <div className="text-sm font-medium text-gray-600 mb-1">Примерный бюджет:</div>
                  <div className="text-3xl font-bold text-primary">
                    {recommendation.budget_min.toLocaleString()} — {recommendation.budget_max.toLocaleString()} ₽
                  </div>
                </div>
              </div>

              <div className="mt-6 flex flex-wrap gap-3">
                <Button
                  onClick={() => navigate('/contact')}
                  className="btn-gradient rounded-[12px] flex-1"
                  data-testid="get-calculation"
                >
                  Получить точный расчёт
                </Button>
                <Button
                  onClick={() => navigate('/contact')}
                  className="rounded-[12px] bg-primary/5 text-primary border border-primary/10 hover:bg-primary/10 flex-1"
                  data-testid="order-turnkey-equipment"
                >
                  Заказать оснащение под ключ
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
            data-testid="equipment-back-button"
          >
            <ArrowLeft size={18} />
            {step === 1 ? 'На главную' : 'Назад'}
          </Button>
          
          {step < 4 && (
            <Button
              onClick={handleNext}
              className="btn-gradient rounded-[12px] flex items-center gap-2"
              disabled={loading}
              data-testid="equipment-next-button"
            >
              {loading ? 'Загрузка...' : step === 3 ? 'Получить рекомендации' : 'Далее'}
              <ArrowRight size={18} />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default EquipmentPage;
