import React, { useState, useEffect, useCallback } from 'react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const TestTnvedPage = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState(null);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await fetch(`${API_URL}/api/tnved/stats`);
      const data = await response.json();
      setStats(data);
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    }
  };

  const searchTnved = useCallback(async (searchQuery) => {
    if (!searchQuery || searchQuery.length < 2) {
      setResults([]);
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/tnved/search?q=${encodeURIComponent(searchQuery)}&limit=100`);
      const data = await response.json();
      setResults(data.results || []);
    } catch (err) {
      console.error('Search error:', err);
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      searchTnved(query);
    }, 300);
    return () => clearTimeout(timer);
  }, [query, searchTnved]);

  const getStatusBadge = (item) => {
    if (item.requires_marking) {
      return (
        <span className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium bg-green-100 text-green-800 border border-green-300">
          ✅ Подлежит обязательной маркировке
        </span>
      );
    } else if (item.is_experimental) {
      return (
        <span className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800 border border-yellow-300">
          ⚠️ Экспериментальная группа
        </span>
      );
    } else {
      return (
        <span className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium bg-red-100 text-red-700 border border-red-300">
          ❌ Не подлежит маркировке
        </span>
      );
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 py-8">
      <div className="max-w-5xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            🔍 Тестовый поиск по ТН ВЭД
          </h1>
          <p className="text-gray-600">
            Полная база ТН ВЭД ЕАЭС — {stats?.total?.toLocaleString() || '...'} кодов
          </p>
        </div>

        {/* Stats */}
        {stats?.loaded && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-white rounded-xl shadow-sm p-4 text-center border border-gray-200">
              <div className="text-2xl font-bold text-gray-900">{stats.total?.toLocaleString()}</div>
              <div className="text-sm text-gray-500">Всего кодов</div>
            </div>
            <div className="bg-green-50 rounded-xl shadow-sm p-4 text-center border border-green-200">
              <div className="text-2xl font-bold text-green-600">{stats.mandatory?.toLocaleString()}</div>
              <div className="text-sm text-green-700">Обязательная маркировка</div>
            </div>
            <div className="bg-yellow-50 rounded-xl shadow-sm p-4 text-center border border-yellow-200">
              <div className="text-2xl font-bold text-yellow-600">{stats.experimental?.toLocaleString()}</div>
              <div className="text-sm text-yellow-700">Эксперимент</div>
            </div>
            <div className="bg-gray-50 rounded-xl shadow-sm p-4 text-center border border-gray-200">
              <div className="text-2xl font-bold text-gray-600">{stats.not_required?.toLocaleString()}</div>
              <div className="text-sm text-gray-500">Без маркировки</div>
            </div>
          </div>
        )}

        {/* Search */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-8 border border-gray-200">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Введите код ТН ВЭД или название товара
          </label>
          <div className="relative">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Например: 6403 или обувь кожаная"
              className="w-full px-5 py-4 text-lg border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
            />
            {loading && (
              <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
              </div>
            )}
          </div>
          <p className="mt-2 text-sm text-gray-500">
            Минимум 2 символа • Найдено: {results.length}
          </p>
        </div>

        {/* Results */}
        {results.length > 0 && (
          <div className="space-y-3">
            {results.map((item, index) => (
              <div
                key={index}
                className={`bg-white rounded-xl shadow-sm p-5 border-l-4 transition-all hover:shadow-md ${
                  item.requires_marking ? 'border-l-green-500' :
                  item.is_experimental ? 'border-l-yellow-500' : 'border-l-red-400'
                }`}
              >
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <span className="text-lg font-mono font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                        {item.code_formatted || item.code}
                      </span>
                    </div>
                    <p className="text-gray-700">{item.name}</p>
                  </div>
                  <div className="flex-shrink-0">
                    {getStatusBadge(item)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* No results */}
        {query.length >= 2 && !loading && results.length === 0 && (
          <div className="text-center py-16 bg-white rounded-2xl shadow-sm">
            <div className="text-gray-300 text-6xl mb-4">🔍</div>
            <p className="text-gray-500 text-lg">Ничего не найдено по запросу "{query}"</p>
          </div>
        )}

        {/* Info */}
        <div className="mt-12 grid md:grid-cols-2 gap-6">
          <div className="bg-green-50 rounded-xl p-6 border border-green-200">
            <h3 className="text-lg font-semibold text-green-800 mb-3">
              ✅ Обязательная маркировка:
            </h3>
            <ul className="text-sm text-green-700 space-y-1">
              <li>• Молочная продукция (0401-0406)</li>
              <li>• Вода (2201), Пиво (2203)</li>
              <li>• Табак (2402-2403)</li>
              <li>• Парфюмерия (3303)</li>
              <li>• Шины (4011)</li>
              <li>• Меха (4303)</li>
              <li>• Обувь (6401-6405)</li>
              <li>• Одежда и текстиль (6101-6217, 6302-6304)</li>
              <li>• Фототовары (9006)</li>
            </ul>
          </div>

          <div className="bg-yellow-50 rounded-xl p-6 border border-yellow-200">
            <h3 className="text-lg font-semibold text-yellow-800 mb-3">
              ⚠️ Экспериментальные группы:
            </h3>
            <ul className="text-sm text-yellow-700 space-y-1">
              <li>• Косметика (3304)</li>
              <li>• Мыло и моющие (3401-3402)</li>
              <li>• Вино (2204-2206)</li>
              <li>• Кондиционеры (8415)</li>
              <li>• Компьютеры (8471)</li>
              <li>• Телевизоры (8528)</li>
              <li>• Мебель (9401, 9403)</li>
            </ul>
          </div>
        </div>

        {/* Back link */}
        <div className="mt-8 text-center">
          <a href="/check" className="text-blue-600 hover:text-blue-800 font-medium">
            ← Вернуться к проверке товаров
          </a>
        </div>
      </div>
    </div>
  );
};

export default TestTnvedPage;
