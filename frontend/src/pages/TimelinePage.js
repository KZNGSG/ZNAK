import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Calendar,
  CheckCircle2,
  Clock,
  AlertCircle,
  ChevronDown,
  ChevronRight,
  Filter,
  Building2,
  Truck,
  Store,
  Users,
  Package,
  ArrowRight,
  AlertTriangle
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

// Иконки для аудиторий
const audienceIcons = {
  'Производитель': Building2,
  'Импортёр': Truck,
  'Оптовик': Package,
  'Розница': Store,
  'Все участники': Users,
  'Аптека': Store,
  'Маркетплейс': Store
};

// Цвета статусов
const statusColors = {
  active: { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700', icon: 'text-emerald-500' },
  partial: { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', icon: 'text-amber-500' },
  upcoming: { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700', icon: 'text-red-500' },
  unknown: { bg: 'bg-gray-50', border: 'border-gray-200', text: 'text-gray-600', icon: 'text-gray-400' }
};

const TimelinePage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [data, setData] = useState(null);
  const [upcomingStats, setUpcomingStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState(searchParams.get('category') || null);
  const [expandedGroups, setExpandedGroups] = useState({});
  const [audienceFilter, setAudienceFilter] = useState([]);
  const [showOnlyUpcoming, setShowOnlyUpcoming] = useState(false);

  useEffect(() => {
    fetchData();
    fetchUpcomingStats();
  }, []);

  useEffect(() => {
    if (selectedCategory) {
      setSearchParams({ category: selectedCategory });
    } else {
      setSearchParams({});
    }
  }, [selectedCategory, setSearchParams]);

  const fetchData = async () => {
    try {
      const response = await fetch(`${API_URL}/api/marking/timeline`);
      if (response.ok) {
        const result = await response.json();
        setData(result);
        // Развернуть все группы по умолчанию
        const expanded = {};
        Object.keys(result.groups || {}).forEach(g => expanded[g] = true);
        setExpandedGroups(expanded);
      }
    } catch (error) {
      console.error('Failed to fetch timeline:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUpcomingStats = async () => {
    try {
      const response = await fetch(`${API_URL}/api/marking/timeline/stats`);
      if (response.ok) {
        const result = await response.json();
        setUpcomingStats(result.statistics);
      }
    } catch (error) {
      console.error('Failed to fetch upcoming stats:', error);
    }
  };

  const toggleGroup = (groupName) => {
    setExpandedGroups(prev => ({
      ...prev,
      [groupName]: !prev[groupName]
    }));
  };

  const toggleAudienceFilter = (audience) => {
    setAudienceFilter(prev =>
      prev.includes(audience)
        ? prev.filter(a => a !== audience)
        : [...prev, audience]
    );
  };

  const filterEvents = (events) => {
    let filtered = events;

    if (showOnlyUpcoming) {
      filtered = filtered.filter(e => !e.is_completed);
    }

    if (audienceFilter.length > 0) {
      filtered = filtered.filter(e =>
        e.audiences_display?.some(a => audienceFilter.includes(a))
      );
    }

    return filtered;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-gray-200 border-t-yellow-500"></div>
      </div>
    );
  }

  const selectedCategoryData = selectedCategory ? data?.categories?.[selectedCategory] : null;

  return (
    <div className="max-w-[1200px] mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Сроки маркировки
        </h1>
        <p className="text-gray-600">
          Актуальные сроки вступления требований по категориям товаров
        </p>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="text-3xl font-bold text-gray-900">{Object.keys(data?.categories || {}).length}</div>
          <div className="text-sm text-gray-500">Всего категорий</div>
        </div>
        <div className={`rounded-xl border p-4 ${statusColors.active.bg} ${statusColors.active.border}`}>
          <div className={`text-3xl font-bold ${statusColors.active.text}`}>{upcomingStats?.active || 0}</div>
          <div className="text-sm text-gray-600">Полностью действует</div>
        </div>
        <div className={`rounded-xl border p-4 ${statusColors.partial.bg} ${statusColors.partial.border}`}>
          <div className={`text-3xl font-bold ${statusColors.partial.text}`}>{upcomingStats?.partial || 0}</div>
          <div className="text-sm text-gray-600">В процессе внедрения</div>
        </div>
        <div className={`rounded-xl border p-4 bg-orange-50 border-orange-200`}>
          <div className={`text-3xl font-bold text-orange-600`}>{upcomingStats?.upcoming_count || 0}</div>
          <div className="text-sm text-gray-600">Дедлайны (6 мес)</div>
        </div>
      </div>

      {/* Upcoming Deadlines Block */}
      {upcomingStats?.upcoming_events && upcomingStats.upcoming_events.length > 0 && (
        <div className="mb-8 bg-gradient-to-r from-orange-50 to-amber-50 rounded-2xl border-2 border-orange-200 overflow-hidden">
          <div className="px-6 py-4 bg-gradient-to-r from-orange-500 to-amber-500">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-6 h-6 text-white" />
              <div>
                <h2 className="text-lg font-bold text-white">Ближайшие дедлайны</h2>
                <p className="text-sm text-white/80">Требования вступающие в силу в ближайшие 6 месяцев</p>
              </div>
            </div>
          </div>
          <div className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {upcomingStats.upcoming_events.map((event, index) => (
                <button
                  key={index}
                  onClick={() => setSelectedCategory(event.category)}
                  className="bg-white rounded-xl p-4 border border-orange-200 hover:border-orange-400 hover:shadow-md transition-all text-left group"
                >
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 w-14 text-center bg-orange-100 rounded-lg py-2">
                      <div className="text-xl font-bold text-orange-600">{event.date_display?.split('.')[0]}</div>
                      <div className="text-xs text-orange-500 font-medium">
                        {['', 'янв', 'фев', 'мар', 'апр', 'май', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'][parseInt(event.date_display?.split('.')[1])] || ''}
                      </div>
                      <div className="text-xs text-orange-400">{event.date_display?.split('.')[2]}</div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="px-2 py-0.5 bg-yellow-100 text-yellow-800 text-xs font-medium rounded-full truncate max-w-[150px]">
                          {event.category}
                        </span>
                        <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full">
                          {event.type_label}
                        </span>
                      </div>
                      <p className="text-sm font-medium text-gray-900 line-clamp-2 group-hover:text-orange-700 transition-colors">
                        {event.title}
                      </p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-orange-500 flex-shrink-0 mt-1 transition-colors" />
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Categories list */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden sticky top-4">
            <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
              <h2 className="font-semibold text-gray-900">Категории товаров</h2>
            </div>
            <div className="max-h-[600px] overflow-y-auto">
              {Object.entries(data?.groups || {}).map(([groupName, groupData]) => (
                <div key={groupName} className="border-b border-gray-100 last:border-0">
                  <button
                    onClick={() => toggleGroup(groupName)}
                    className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
                  >
                    <span className="font-medium text-gray-900 text-left">{groupName}</span>
                    {expandedGroups[groupName] ? (
                      <ChevronDown className="w-4 h-4 text-gray-400" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-gray-400" />
                    )}
                  </button>

                  {expandedGroups[groupName] && (
                    <div className="bg-gray-50 pb-2">
                      {groupData.categories?.map(catName => {
                        const cat = data?.categories?.[catName];
                        if (!cat) return null;
                        const colors = statusColors[cat.status] || statusColors.unknown;

                        return (
                          <button
                            key={catName}
                            onClick={() => setSelectedCategory(catName)}
                            className={`w-full px-4 py-2 pl-6 text-left text-sm hover:bg-white transition-colors flex items-center justify-between ${
                              selectedCategory === catName ? 'bg-yellow-50 border-l-2 border-yellow-500' : ''
                            }`}
                          >
                            <span className="text-gray-700">{catName}</span>
                            <span className={`w-2.5 h-2.5 rounded-full ${
                              cat.status === 'active' ? 'bg-emerald-500' :
                              cat.status === 'partial' ? 'bg-amber-500' :
                              cat.status === 'upcoming' ? 'bg-red-500' : 'bg-gray-300'
                            }`} />
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Timeline details */}
        <div className="lg:col-span-2">
          {selectedCategoryData ? (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              {/* Category header */}
              <div className={`px-6 py-4 border-b ${statusColors[selectedCategoryData.status]?.bg || 'bg-gray-50'}`}>
                <div className="flex items-center justify-between mb-2">
                  <h2 className="text-xl font-bold text-gray-900">{selectedCategoryData.name}</h2>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusColors[selectedCategoryData.status]?.bg} ${statusColors[selectedCategoryData.status]?.text} border ${statusColors[selectedCategoryData.status]?.border}`}>
                    {selectedCategoryData.status_label}
                  </span>
                </div>
                <div className="text-sm text-gray-600">
                  {selectedCategoryData.main_group}
                </div>

                {/* Progress bar */}
                <div className="mt-4">
                  <div className="flex justify-between text-sm text-gray-600 mb-1">
                    <span>Прогресс</span>
                    <span>{selectedCategoryData.completed_count}/{selectedCategoryData.total_events} этапов</span>
                  </div>
                  <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-yellow-400 to-yellow-500 rounded-full transition-all duration-500"
                      style={{ width: `${selectedCategoryData.progress_percent}%` }}
                    />
                  </div>
                </div>

                {/* Next deadline highlight */}
                {selectedCategoryData.next_deadline && (
                  <div className="mt-4 p-3 bg-white/80 rounded-lg border border-amber-200">
                    <div className="flex items-center gap-2 text-amber-700 font-medium mb-1">
                      <Clock className="w-4 h-4" />
                      Ближайший срок: {selectedCategoryData.next_deadline.date_display}
                    </div>
                    <div className="text-sm text-gray-700">
                      {selectedCategoryData.next_deadline.title}
                    </div>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {selectedCategoryData.next_deadline.audiences_display?.map(aud => {
                        const Icon = audienceIcons[aud] || Users;
                        return (
                          <span key={aud} className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 rounded text-xs text-gray-600">
                            <Icon className="w-3 h-3" />
                            {aud}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Filters */}
              <div className="px-6 py-3 border-b border-gray-200 bg-gray-50">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Filter className="w-4 h-4" />
                    Фильтры:
                  </div>
                  <label className="flex items-center gap-1.5 text-sm cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showOnlyUpcoming}
                      onChange={(e) => setShowOnlyUpcoming(e.target.checked)}
                      className="rounded border-gray-300 text-yellow-500 focus:ring-yellow-500"
                    />
                    Только предстоящие
                  </label>
                  <div className="h-4 w-px bg-gray-300" />
                  {['Производитель', 'Импортёр', 'Оптовик', 'Розница'].map(aud => (
                    <label key={aud} className="flex items-center gap-1.5 text-sm cursor-pointer">
                      <input
                        type="checkbox"
                        checked={audienceFilter.includes(aud)}
                        onChange={() => toggleAudienceFilter(aud)}
                        className="rounded border-gray-300 text-yellow-500 focus:ring-yellow-500"
                      />
                      {aud}
                    </label>
                  ))}
                </div>
              </div>

              {/* Events list */}
              <div className="divide-y divide-gray-100">
                {filterEvents(selectedCategoryData.events || []).map((event, idx) => (
                  <div
                    key={idx}
                    className={`px-6 py-4 ${event.is_completed ? 'bg-white' : 'bg-amber-50/30'}`}
                  >
                    <div className="flex items-start gap-4">
                      {/* Status icon */}
                      <div className={`mt-1 flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                        event.is_completed
                          ? 'bg-emerald-100 text-emerald-600'
                          : 'bg-amber-100 text-amber-600'
                      }`}>
                        {event.is_completed ? (
                          <CheckCircle2 className="w-5 h-5" />
                        ) : (
                          <Clock className="w-5 h-5" />
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`font-medium ${event.is_completed ? 'text-gray-500' : 'text-gray-900'}`}>
                            {event.date_display}
                          </span>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${
                            event.is_completed
                              ? 'bg-gray-100 text-gray-500'
                              : 'bg-amber-100 text-amber-700'
                          }`}>
                            {event.type_label}
                          </span>
                        </div>

                        <h4 className={`font-medium mb-2 ${event.is_completed ? 'text-gray-600' : 'text-gray-900'}`}>
                          {event.title}
                        </h4>

                        {/* Audiences */}
                        <div className="flex flex-wrap gap-1 mb-2">
                          {event.audiences_display?.map(aud => {
                            const Icon = audienceIcons[aud] || Users;
                            return (
                              <span key={aud} className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 rounded text-xs text-gray-600">
                                <Icon className="w-3 h-3" />
                                {aud}
                              </span>
                            );
                          })}
                        </div>

                        {/* Description (collapsible) */}
                        {event.description && (
                          <details className="text-sm text-gray-600">
                            <summary className="cursor-pointer text-yellow-600 hover:text-yellow-700">
                              Подробнее
                            </summary>
                            <p className="mt-2 p-3 bg-gray-50 rounded-lg whitespace-pre-line">
                              {event.description}
                            </p>
                          </details>
                        )}
                      </div>
                    </div>
                  </div>
                ))}

                {filterEvents(selectedCategoryData.events || []).length === 0 && (
                  <div className="px-6 py-12 text-center text-gray-500">
                    <AlertCircle className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                    <p>Нет событий по выбранным фильтрам</p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
              <Calendar className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <h3 className="text-xl font-medium text-gray-900 mb-2">Выберите категорию</h3>
              <p className="text-gray-500">
                Выберите категорию товаров слева, чтобы увидеть сроки маркировки
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TimelinePage;
