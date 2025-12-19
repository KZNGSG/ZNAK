import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { QrCode, Camera, Search, CheckCircle, XCircle, AlertCircle, Package, Calendar, Building, Info } from 'lucide-react';
import { Button } from '../components/ui/button';
import SEO from '../components/SEO';

const ScannerPage = () => {
  const [code, setCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState(null);

  // Демо-функция проверки (в реальности будет API-запрос)
  const checkCode = async (e) => {
    e.preventDefault();
    if (!code.trim()) return;

    setIsLoading(true);
    setResult(null);

    // Симуляция запроса
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Демо-результаты
    if (code.startsWith('01') && code.length >= 31) {
      setResult({
        status: 'valid',
        product: 'Молоко пастеризованное 3.2%',
        manufacturer: 'ООО "Молочный край"',
        productionDate: '01.12.2024',
        expiryDate: '15.12.2024',
        gtin: code.substring(2, 16),
        serial: code.substring(18, 31)
      });
    } else if (code.length > 0) {
      setResult({
        status: 'invalid',
        message: 'Код не найден в системе Честный ЗНАК. Возможно, товар не маркирован или код повреждён.'
      });
    }

    setIsLoading(false);
  };

  const clearResult = () => {
    setCode('');
    setResult(null);
  };

  return (
    <div className="fade-in">
      <SEO title='Сканер DataMatrix' description='Проверка DataMatrix кода товара. Убедитесь, что маркировка нанесена правильно.' keywords='сканер datamatrix, проверка маркировки' canonical='/scanner' />
      {/* Hero Section */}
      <section className="relative py-16 sm:py-20 noise-bg overflow-hidden">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.3 }}
          className="absolute -top-20 -left-20 w-[500px] h-[500px] rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(255,218,7,0.2) 0%, rgba(255,218,7,0) 70%)',
            filter: 'blur(80px)'
          }}
          aria-hidden="true"
        />

        <div className="relative mx-auto max-w-[800px] px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center"
          >
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[rgb(var(--brand-yellow-100))] mb-6">
              <QrCode size={32} className="text-[rgb(var(--grey-800))]" />
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold text-[rgb(var(--black))] mb-4">
              Проверка кода маркировки
            </h1>
            <p className="text-lg text-[rgb(var(--grey-600))] max-w-xl mx-auto">
              Введите или отсканируйте код Data Matrix, чтобы проверить подлинность товара
              и получить информацию о производителе.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Scanner Section */}
      <section className="py-12 bg-white">
        <div className="mx-auto max-w-[800px] px-4 sm:px-6 lg:px-8">
          {/* Input Form */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-6 bg-white rounded-2xl border-2 border-[rgb(var(--grey-200))] shadow-sm"
          >
            <form onSubmit={checkCode}>
              <label className="block text-sm font-bold text-[rgb(var(--grey-700))] mb-2">
                Код маркировки (Data Matrix)
              </label>
              <div className="flex gap-3">
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="Введите код, например: 010460043993125621ABC123..."
                  className="flex-1 px-4 py-3 rounded-xl border-2 border-[rgb(var(--grey-200))] focus:outline-none focus:border-[rgb(var(--brand-yellow-500))] transition-colors text-sm font-mono"
                />
                <Button
                  type="submit"
                  disabled={isLoading || !code.trim()}
                  className="btn-gradient rounded-xl px-6"
                >
                  {isLoading ? (
                    <span className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Проверка...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <Search size={18} />
                      Проверить
                    </span>
                  )}
                </Button>
              </div>
            </form>

            {/* Camera Button (placeholder) */}
            <div className="mt-4 pt-4 border-t border-[rgb(var(--grey-200))]">
              <button
                className="flex items-center gap-2 text-sm text-[rgb(var(--grey-500))] hover:text-[rgb(var(--grey-700))] transition-colors"
                onClick={() => alert('Функция сканирования камерой будет доступна в следующем обновлении')}
              >
                <Camera size={18} />
                <span>Отсканировать камерой</span>
                <span className="px-2 py-0.5 rounded-full bg-[rgb(var(--grey-200))] text-xs font-medium">Скоро</span>
              </button>
            </div>
          </motion.div>

          {/* Result */}
          {result && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className={`mt-6 p-6 rounded-2xl border-2 ${
                result.status === 'valid'
                  ? 'bg-green-50 border-green-400'
                  : 'bg-red-50 border-red-400'
              }`}
            >
              {result.status === 'valid' ? (
                <>
                  <div className="flex items-start gap-4 mb-4">
                    <div className="p-3 rounded-xl bg-green-500 text-white">
                      <CheckCircle size={24} />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-green-700 mb-1">Код подтверждён</h3>
                      <p className="text-green-600">Товар зарегистрирован в системе Честный ЗНАК</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-white rounded-xl">
                    <div className="flex items-start gap-3">
                      <Package size={18} className="text-[rgb(var(--grey-400))] mt-0.5" />
                      <div>
                        <p className="text-xs text-[rgb(var(--grey-500))]">Товар</p>
                        <p className="font-semibold text-[rgb(var(--grey-800))]">{result.product}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <Building size={18} className="text-[rgb(var(--grey-400))] mt-0.5" />
                      <div>
                        <p className="text-xs text-[rgb(var(--grey-500))]">Производитель</p>
                        <p className="font-semibold text-[rgb(var(--grey-800))]">{result.manufacturer}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <Calendar size={18} className="text-[rgb(var(--grey-400))] mt-0.5" />
                      <div>
                        <p className="text-xs text-[rgb(var(--grey-500))]">Дата производства</p>
                        <p className="font-semibold text-[rgb(var(--grey-800))]">{result.productionDate}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <Calendar size={18} className="text-[rgb(var(--grey-400))] mt-0.5" />
                      <div>
                        <p className="text-xs text-[rgb(var(--grey-500))]">Годен до</p>
                        <p className="font-semibold text-[rgb(var(--grey-800))]">{result.expiryDate}</p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 p-3 bg-[rgb(var(--grey-100))] rounded-lg">
                    <p className="text-xs text-[rgb(var(--grey-500))] mb-1">Технические данные</p>
                    <p className="text-xs font-mono text-[rgb(var(--grey-600))]">
                      GTIN: {result.gtin} | Серийный номер: {result.serial}
                    </p>
                  </div>
                </>
              ) : (
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-xl bg-red-500 text-white">
                    <XCircle size={24} />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-red-700 mb-1">Код не найден</h3>
                    <p className="text-red-600">{result.message}</p>
                  </div>
                </div>
              )}

              <button
                onClick={clearResult}
                className="mt-4 text-sm font-medium text-[rgb(var(--grey-500))] hover:text-[rgb(var(--grey-700))] transition-colors"
              >
                ← Проверить другой код
              </button>
            </motion.div>
          )}

          {/* Info Block */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mt-8 p-6 bg-[rgb(var(--grey-100))] rounded-2xl"
          >
            <div className="flex items-start gap-3 mb-4">
              <Info size={20} className="text-[rgb(var(--grey-500))] flex-shrink-0 mt-0.5" />
              <h3 className="font-bold text-[rgb(var(--grey-800))]">Как найти код маркировки?</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm text-[rgb(var(--grey-600))]">
              <div className="flex items-start gap-2">
                <span className="font-bold text-[rgb(var(--brand-yellow-600))]">1.</span>
                <span>Найдите на упаковке квадратный код Data Matrix (похож на QR-код, но квадратный)</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-bold text-[rgb(var(--brand-yellow-600))]">2.</span>
                <span>Отсканируйте его приложением или введите цифры под кодом вручную</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-bold text-[rgb(var(--brand-yellow-600))]">3.</span>
                <span>Код начинается с «01» и содержит 31+ символ</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-bold text-[rgb(var(--brand-yellow-600))]">4.</span>
                <span>Если код повреждён, попробуйте ввести его вручную</span>
              </div>
            </div>
          </motion.div>

          {/* Demo Notice */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="mt-6 p-4 bg-[rgb(var(--brand-yellow-50))] border border-[rgb(var(--brand-yellow-200))] rounded-xl"
          >
            <div className="flex items-start gap-2">
              <AlertCircle size={18} className="text-[rgb(var(--brand-yellow-600))] flex-shrink-0 mt-0.5" />
              <p className="text-sm text-[rgb(var(--brand-yellow-700))]">
                <strong>Демо-режим:</strong> Сейчас сервис работает в демонстрационном режиме.
                Для тестирования введите код, начинающийся с «01» и длиной от 31 символа.
              </p>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
};

export default ScannerPage;
