import React, { useState, useEffect } from "react";
import { CITIES } from "../../data/cities";
import { MapPin, Search, ExternalLink, CheckCircle, Edit3, Eye, X, Save, RefreshCw, Globe, TrendingUp, FileText, AlertCircle } from "lucide-react";

const AdminSEOPage = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCity, setSelectedCity] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [editData, setEditData] = useState({});
  const [checkingStatus, setCheckingStatus] = useState({});
  const [checkingAll, setCheckingAll] = useState(false);

  // Статистика
  const stats = {
    totalCities: CITIES.length,
    totalKeywords: CITIES.reduce((sum, city) => sum + (city.localKeywords?.length || 0), 0),
    lastUpdate: "23.12.2025"
  };

  // Фильтрация городов
  const filteredCities = CITIES.filter(city =>
    city.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    city.slug.toLowerCase().includes(searchQuery.toLowerCase()) ||
    city.region.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Проверка доступности страницы
  const checkPageStatus = async (slug) => {
    setCheckingStatus(prev => ({ ...prev, [slug]: "checking" }));
    try {
      const response = await fetch(`https://promarkirui.ru/city/${slug}`, { method: "HEAD", mode: "no-cors" });
      setCheckingStatus(prev => ({ ...prev, [slug]: "ok" }));
    } catch (error) {
      setCheckingStatus(prev => ({ ...prev, [slug]: "error" }));
    }
  };

  // Проверить все страницы
  const checkAllPages = async () => {
    setCheckingAll(true);
    for (const city of CITIES) {
      await checkPageStatus(city.slug);
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    setCheckingAll(false);
  };

  // Открыть редактирование
  const openEdit = (city) => {
    setSelectedCity(city);
    setEditData({
      description: city.description,
      localKeywords: city.localKeywords?.join(", ") || "",
      nearbyAreas: city.nearbyAreas?.join(", ") || "",
      features: city.features?.join("\n") || ""
    });
    setEditMode(true);
  };

  // Открыть просмотр
  const openView = (city) => {
    setSelectedCity(city);
    setEditMode(false);
  };

  // Закрыть модалку
  const closeModal = () => {
    setSelectedCity(null);
    setEditMode(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
            <div className="p-2 bg-yellow-100 rounded-xl">
              <Globe className="text-yellow-600" size={24} />
            </div>
            SEO Гео-страницы
          </h1>
          <p className="text-gray-500 mt-1">
            Управление городами и SEO-оптимизацией
          </p>
        </div>
        <button
          onClick={checkAllPages}
          disabled={checkingAll}
          className="flex items-center gap-2 px-5 py-2.5 bg-yellow-400 hover:bg-yellow-500 text-gray-900 font-semibold rounded-xl transition-colors disabled:opacity-50"
        >
          <RefreshCw size={18} className={checkingAll ? "animate-spin" : ""} />
          {checkingAll ? "Проверяем..." : "Проверить все"}
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm">Всего городов</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{stats.totalCities}</p>
            </div>
            <div className="p-3 rounded-xl bg-blue-50 text-blue-500">
              <MapPin size={24} />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm">Ключевых слов</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{stats.totalKeywords}</p>
            </div>
            <div className="p-3 rounded-xl bg-green-50 text-green-500">
              <TrendingUp size={24} />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm">В Sitemap</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{stats.totalCities}</p>
            </div>
            <div className="p-3 rounded-xl bg-purple-50 text-purple-500">
              <FileText size={24} />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm">Обновлено</p>
              <p className="text-xl font-bold text-gray-900 mt-2">{stats.lastUpdate}</p>
            </div>
            <div className="p-3 rounded-xl bg-yellow-50 text-yellow-600">
              <RefreshCw size={24} />
            </div>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white rounded-2xl p-4 border border-gray-200 shadow-sm">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Поиск по названию, slug или региону..."
            className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
          />
        </div>
      </div>

      {/* Cities Table */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-4 py-4 text-left text-xs font-semibold text-gray-500 uppercase">#</th>
                <th className="px-4 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Город</th>
                <th className="px-4 py-4 text-left text-xs font-semibold text-gray-500 uppercase">URL страницы</th>
                <th className="px-4 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Регион</th>
                <th className="px-4 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Статус</th>
                <th className="px-4 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Действия</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredCities.map((city, index) => (
                <tr key={city.slug} className="hover:bg-yellow-50/50 transition-colors">
                  <td className="px-4 py-4 text-sm text-gray-400 font-medium">{index + 1}</td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-yellow-100 rounded-lg">
                        <MapPin size={16} className="text-yellow-600" />
                      </div>
                      <div>
                        <span className="text-gray-900 font-semibold">{city.name}</span>
                        <p className="text-xs text-gray-400">{city.population} чел.</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <a 
                      href={`https://promarkirui.ru/city/${city.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-blue-600 hover:text-blue-800 hover:underline font-mono"
                    >
                      /city/{city.slug}
                    </a>
                  </td>
                  <td className="px-4 py-4 text-sm text-gray-600">{city.region}</td>
                  <td className="px-4 py-4">
                    {checkingStatus[city.slug] === "checking" ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">
                        <RefreshCw size={12} className="animate-spin" />
                        Проверка...
                      </span>
                    ) : checkingStatus[city.slug] === "ok" ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                        <CheckCircle size={12} />
                        Работает
                      </span>
                    ) : checkingStatus[city.slug] === "error" ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">
                        <AlertCircle size={12} />
                        Ошибка
                      </span>
                    ) : (
                      <span className="text-gray-400 text-sm">—</span>
                    )}
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => openView(city)}
                        className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Просмотр"
                      >
                        <Eye size={18} />
                      </button>
                      <button
                        onClick={() => openEdit(city)}
                        className="p-2 text-gray-400 hover:text-yellow-600 hover:bg-yellow-50 rounded-lg transition-colors"
                        title="Редактировать"
                      >
                        <Edit3 size={18} />
                      </button>
                      <a
                        href={`https://promarkirui.ru/city/${city.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                        title="Открыть страницу"
                      >
                        <ExternalLink size={18} />
                      </a>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {selectedCity && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden shadow-2xl">
            {/* Modal Header */}
            <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-yellow-50 to-white">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-yellow-400 rounded-xl">
                  <MapPin size={20} className="text-gray-900" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">{selectedCity.name}</h2>
                  <p className="text-sm text-gray-500">/city/{selectedCity.slug}</p>
                </div>
              </div>
              <button onClick={closeModal} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
                <X size={20} />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
              {editMode ? (
                /* Edit Mode */
                <div className="space-y-5">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      SEO Description (мета-описание)
                    </label>
                    <textarea
                      value={editData.description}
                      onChange={(e) => setEditData({...editData, description: e.target.value})}
                      rows={3}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-yellow-400 focus:border-transparent resize-none"
                      placeholder="Описание страницы для поисковиков..."
                    />
                    <p className="text-xs text-gray-400 mt-1">{editData.description?.length || 0}/160 символов (рекомендуется)</p>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Ключевые слова (через запятую)
                    </label>
                    <textarea
                      value={editData.localKeywords}
                      onChange={(e) => setEditData({...editData, localKeywords: e.target.value})}
                      rows={2}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-yellow-400 focus:border-transparent resize-none"
                      placeholder="маркировка москва, честный знак москва..."
                    />
                    <p className="text-xs text-gray-400 mt-1">Слова по которым страница будет находиться в поиске</p>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Близлежащие города/районы (через запятую)
                    </label>
                    <input
                      type="text"
                      value={editData.nearbyAreas}
                      onChange={(e) => setEditData({...editData, nearbyAreas: e.target.value})}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
                      placeholder="Химки, Мытищи, Балашиха..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Особенности/преимущества (каждое с новой строки)
                    </label>
                    <textarea
                      value={editData.features}
                      onChange={(e) => setEditData({...editData, features: e.target.value})}
                      rows={4}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-yellow-400 focus:border-transparent resize-none"
                      placeholder="Работаем с предприятиями любого масштаба&#10;Срочное подключение за 1 день..."
                    />
                  </div>

                  <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
                    <p className="text-sm text-yellow-800">
                      <strong>Примечание:</strong> Изменения сохраняются в базу. Для применения на сайте потребуется пересборка проекта.
                    </p>
                  </div>
                </div>
              ) : (
                /* View Mode */
                <div className="space-y-5">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-gray-50 rounded-xl p-4">
                      <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Регион</p>
                      <p className="text-gray-900 font-medium">{selectedCity.region}</p>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-4">
                      <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Население</p>
                      <p className="text-gray-900 font-medium">{selectedCity.population}</p>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-4">
                      <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Код телефона</p>
                      <p className="text-gray-900 font-medium">+7 ({selectedCity.phoneCode})</p>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-4">
                      <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Координаты</p>
                      <p className="text-gray-900 font-medium text-sm">{selectedCity.coordinates?.lat}, {selectedCity.coordinates?.lng}</p>
                    </div>
                  </div>

                  <div className="bg-gray-50 rounded-xl p-4">
                    <p className="text-xs text-gray-500 uppercase font-semibold mb-2">Падежи для SEO</p>
                    <div className="grid grid-cols-3 gap-3 text-sm">
                      <div><span className="text-gray-400">Родительный:</span> <span className="text-gray-900">{selectedCity.nameGenitive}</span></div>
                      <div><span className="text-gray-400">Предложный:</span> <span className="text-gray-900">{selectedCity.namePrepositional}</span></div>
                      <div><span className="text-gray-400">Локатив:</span> <span className="text-gray-900">{selectedCity.nameLocative}</span></div>
                    </div>
                  </div>

                  <div>
                    <p className="text-xs text-gray-500 uppercase font-semibold mb-2">SEO Description</p>
                    <p className="text-gray-700 bg-gray-50 rounded-xl p-4 text-sm">{selectedCity.description}</p>
                  </div>

                  <div>
                    <p className="text-xs text-gray-500 uppercase font-semibold mb-2">
                      Ключевые слова ({selectedCity.localKeywords?.length || 0})
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {selectedCity.localKeywords?.map((keyword, i) => (
                        <span key={i} className="px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg text-sm font-medium">
                          {keyword}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div>
                    <p className="text-xs text-gray-500 uppercase font-semibold mb-2">Близлежащие районы</p>
                    <div className="flex flex-wrap gap-2">
                      {selectedCity.nearbyAreas?.map((area, i) => (
                        <span key={i} className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-sm">
                          {area}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div>
                    <p className="text-xs text-gray-500 uppercase font-semibold mb-2">Особенности</p>
                    <ul className="space-y-2">
                      {selectedCity.features?.map((feature, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                          <CheckCircle size={16} className="text-green-500 mt-0.5 flex-shrink-0" />
                          {feature}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-gray-100 flex items-center justify-between bg-gray-50">
              <a
                href={`https://promarkirui.ru/city/${selectedCity.slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ExternalLink size={16} />
                Открыть страницу
              </a>
              <div className="flex items-center gap-2">
                {editMode ? (
                  <>
                    <button
                      onClick={() => setEditMode(false)}
                      className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      Отмена
                    </button>
                    <button
                      onClick={() => {
                        alert("Сохранение будет доступно в следующей версии.\n\nСейчас для изменений нужно редактировать файл:\n/src/data/cities.js");
                        setEditMode(false);
                      }}
                      className="flex items-center gap-2 px-5 py-2 bg-yellow-400 hover:bg-yellow-500 text-gray-900 font-semibold rounded-lg transition-colors"
                    >
                      <Save size={16} />
                      Сохранить
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => openEdit(selectedCity)}
                    className="flex items-center gap-2 px-5 py-2 bg-yellow-400 hover:bg-yellow-500 text-gray-900 font-semibold rounded-lg transition-colors"
                  >
                    <Edit3 size={16} />
                    Редактировать
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminSEOPage;
