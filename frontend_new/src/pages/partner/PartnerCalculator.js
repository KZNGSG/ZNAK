import React, { useState } from 'react';
import { usePartnerAuth } from '../../context/PartnerAuthContext';
import {
  Calculator,
  TrendingUp,
  DollarSign,
  Users,
  ArrowRight
} from 'lucide-react';

const PartnerCalculator = () => {
  const { partner } = usePartnerAuth();
  const commissionRate = partner?.commission_rate || 10;

  const [clientsPerMonth, setClientsPerMonth] = useState(5);
  const [averageCheck, setAverageCheck] = useState(50000);

  const monthlyRevenue = clientsPerMonth * averageCheck;
  const monthlyCommission = monthlyRevenue * (commissionRate / 100);
  const yearlyCommission = monthlyCommission * 12;

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'RUB',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const presets = [
    { label: 'Минимум', clients: 3, check: 30000 },
    { label: 'Средний', clients: 10, check: 50000 },
    { label: 'Активный', clients: 20, check: 70000 },
    { label: 'Максимум', clients: 50, check: 100000 }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Калькулятор дохода</h1>
        <p className="text-gray-500 mt-1">Рассчитайте потенциальный заработок от партнёрской программы</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Calculator inputs */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Calculator className="w-5 h-5 text-amber-500" />
            Параметры расчёта
          </h2>

          {/* Commission rate info */}
          <div className="mb-6 p-4 bg-amber-50 rounded-xl border border-amber-200">
            <div className="text-sm text-amber-700">
              Ваша ставка комиссии: <span className="font-bold text-lg">{commissionRate}%</span>
            </div>
          </div>

          {/* Clients per month */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Клиентов в месяц
            </label>
            <input
              type="range"
              min="1"
              max="100"
              value={clientsPerMonth}
              onChange={(e) => setClientsPerMonth(parseInt(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-amber-500"
            />
            <div className="flex justify-between mt-2">
              <span className="text-sm text-gray-500">1</span>
              <span className="text-lg font-bold text-amber-600">{clientsPerMonth}</span>
              <span className="text-sm text-gray-500">100</span>
            </div>
          </div>

          {/* Average check */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Средний чек (руб.)
            </label>
            <input
              type="range"
              min="10000"
              max="500000"
              step="5000"
              value={averageCheck}
              onChange={(e) => setAverageCheck(parseInt(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-amber-500"
            />
            <div className="flex justify-between mt-2">
              <span className="text-sm text-gray-500">10 000</span>
              <span className="text-lg font-bold text-amber-600">{formatCurrency(averageCheck)}</span>
              <span className="text-sm text-gray-500">500 000</span>
            </div>
          </div>

          {/* Quick presets */}
          <div>
            <div className="text-sm font-medium text-gray-700 mb-2">Быстрые сценарии:</div>
            <div className="grid grid-cols-2 gap-2">
              {presets.map((preset) => (
                <button
                  key={preset.label}
                  onClick={() => {
                    setClientsPerMonth(preset.clients);
                    setAverageCheck(preset.check);
                  }}
                  className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm text-gray-700 transition-colors text-left"
                >
                  <div className="font-medium">{preset.label}</div>
                  <div className="text-xs text-gray-500">
                    {preset.clients} клиентов × {formatCurrency(preset.check)}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Results */}
        <div className="space-y-4">
          {/* Monthly result */}
          <div className="bg-gradient-to-br from-amber-400 to-amber-500 rounded-2xl p-6 text-white">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="w-5 h-5" />
              <h3 className="font-semibold">Ваш доход в месяц</h3>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-amber-100">Выручка клиентов:</span>
                <span className="font-semibold">{formatCurrency(monthlyRevenue)}</span>
              </div>
              <div className="flex items-center justify-between text-xl">
                <span className="text-amber-100">Ваша комиссия ({commissionRate}%):</span>
                <span className="font-bold">{formatCurrency(monthlyCommission)}</span>
              </div>
            </div>
          </div>

          {/* Yearly projection */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <div className="flex items-center gap-2 mb-4">
              <DollarSign className="w-5 h-5 text-emerald-500" />
              <h3 className="font-semibold text-gray-900">Годовой прогноз</h3>
            </div>

            <div className="text-3xl font-bold text-emerald-600 mb-2">
              {formatCurrency(yearlyCommission)}
            </div>
            <p className="text-sm text-gray-500">
              При {clientsPerMonth} клиентах в месяц со средним чеком {formatCurrency(averageCheck)}
            </p>
          </div>

          {/* Breakdown */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Детализация</h3>

            <div className="space-y-3">
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <Users className="w-5 h-5 text-blue-500" />
                <div className="flex-1">
                  <div className="text-sm text-gray-600">Клиентов в год</div>
                  <div className="font-semibold">{clientsPerMonth * 12}</div>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <ArrowRight className="w-5 h-5 text-amber-500" />
                <div className="flex-1">
                  <div className="text-sm text-gray-600">Годовая выручка клиентов</div>
                  <div className="font-semibold">{formatCurrency(monthlyRevenue * 12)}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tips */}
      <div className="bg-blue-50 rounded-2xl border border-blue-200 p-6">
        <h3 className="font-semibold text-blue-900 mb-3">Как увеличить доход</h3>
        <div className="grid md:grid-cols-3 gap-4">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
              <span className="text-blue-600 font-bold">1</span>
            </div>
            <div>
              <div className="font-medium text-blue-900">Больше охват</div>
              <div className="text-sm text-blue-700">Размещайте ссылку в соцсетях, блогах и профильных сообществах</div>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
              <span className="text-blue-600 font-bold">2</span>
            </div>
            <div>
              <div className="font-medium text-blue-900">Целевая аудитория</div>
              <div className="text-sm text-blue-700">Рекомендуйте услуги компаниям, которым нужна маркировка товаров</div>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
              <span className="text-blue-600 font-bold">3</span>
            </div>
            <div>
              <div className="font-medium text-blue-900">Личные рекомендации</div>
              <div className="text-sm text-blue-700">Прямые рекомендации работают лучше - расскажите знакомым бизнесменам</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PartnerCalculator;
