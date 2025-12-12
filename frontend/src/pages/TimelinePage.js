import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Calendar,
  CheckCircle2,
  Clock,
  AlertCircle,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
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

// Московское время
const MoscowTime = () => {
  const [time, setTime] = useState('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const moscowTime = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/Moscow' }));
      setTime(moscowTime.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex items-center gap-2 text-gray-600">
      <Clock className="w-4 h-4" />
      <span className="text-sm">Москва:</span>
      <span className="font-mono font-medium text-gray-900">{time}</span>
    </div>
  );
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

  // Carousel state
  const carouselRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

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

  // Carousel scroll handlers
  const checkScroll = () => {
    if (carouselRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = carouselRef.current;
      setCanScrollLeft(scrollLeft > 0);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
    }
  };

  const scrollCarousel = (direction) => {
    if (carouselRef.current) {
      const scrollAmount = 320;
      carouselRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
      setTimeout(checkScroll, 300);
    }
  };

  useEffect(() => {
    checkScroll();
    const carousel = carouselRef.current;
    if (carousel) {
      carousel.addEventListener('scroll', checkScroll);
      return () => carousel.removeEventListener('scroll', checkScroll);
    }
  }, [upcomingStats]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-gray-200 border-t-yellow-500"></div>
      </div>
    );
  }

  const selectedCategoryData = selectedCategory ? data?.categories?.[selectedCategory] : null;

  // Группируем дедлайны по категориям для компактности
  const groupedDeadlines = upcomingStats?.upcoming_events?.reduce((acc, event) => {
    const key = event.category;
    if (!acc[key]) {
      acc[key] = {
        category: event.category,
        events: [],
        nearestDate: event.date,
        nearestDateDisplay: event.date_display
      };
    }
    acc[key].events.push(event);
    return acc;
  }, {}) || {};

  const deadlineCards = Object.values(groupedDeadlines).slice(0, 8);

  return (
    <div className="max-w-[1400px] mx-auto px-4 py-6">
      {/* Header with Moscow Time */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Сроки маркировки
          </h1>
          <p className="text-gray-600 text-sm">
            Актуальные сроки вступления требований по категориям товаров
          </p>
        </div>
        <MoscowTime />
      </div>

      {/* Statistics - compact */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 p-3 text-center">
          <div className="text-2xl font-bold text-gray-900">{Object.keys(data?.categories || {}).length}</div>
          <div className="text-xs text-gray-500">Категорий</div>
        </div>
        <div className={`rounded-xl border p-3 text-center ${statusColors.active.bg} ${statusColors.active.border}`}>
          <div className={`text-2xl font-bold ${statusColors.active.text}`}>{upcomingStats?.active || 0}</div>
          <div className="text-xs text-gray-600">Действует</div>
        </div>
        <div className={`rounded-xl border p-3 text-center ${statusColors.partial.bg} ${statusColors.partial.border}`}>
          <div className={`text-2xl font-bold ${statusColors.partial.text}`}>{upcomingStats?.partial || 0}</div>
          <div className="text-xs text-gray-600">В процессе</div>
        </div>
        <div className={`rounded-xl border p-3 text-center bg-orange-50 border-orange-200`}>
          <div className={`text-2xl font-bold text-orange-600`}>{upcomingStats?.upcoming_count || 0}</div>
          <div className="text-xs text-gray-600">Дедлайны</div>
        </div>
      </div>

      {/* Upcoming Deadlines - Horizontal Carousel */}
      {deadlineCards.length > 0 && (
        <div className="mb-6 bg-gradient-to-r from-orange-50 to-amber-50 rounded-2xl border border-orange-200 overflow-hidden">
          <div className="px-4 py-3 bg-gradient-to-r from-orange-500 to-amber-500 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-white" />
              <h2 className="font-semibold text-white">Ближайшие дедлайны</h2>
              <span className="text-white/80 text-sm">({upcomingStats?.upcoming_count} событий за 6 мес)</span>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => scrollCarousel('left')}
                disabled={!canScrollLeft}
                className={`p-1.5 rounded-lg transition-colors ${canScrollLeft ? 'bg-white/20 hover:bg-white/30 text-white' : 'text-white/30 cursor-not-allowed'}`}
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={() => scrollCarousel('right')}
                disabled={!canScrollRight}
                className={`p-1.5 rounded-lg transition-colors ${canScrollRight ? 'bg-white/20 hover:bg-white/30 text-white' : 'text-white/30 cursor-not-allowed'}`}
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
          <div
            ref={carouselRef}
            className="flex gap-3 p-4 overflow-x-auto scrollbar-hide"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            {deadlineCards.map((item, index) => (
              <button
                key={index}
                onClick={() => setSelectedCategory(item.category)}
                className="flex-shrink-0 w-[280px] bg-white rounded-xl p-3 border border-orange-200 hover:border-orange-400 hover:shadow-md transition-all text-left group"
              >
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-12 text-center bg-orange-100 rounded-lg py-1.5">
                    <div className="text-lg font-bold text-orange-600">{item.nearestDateDisplay?.split('.')[0]}</div>
                    <div className="text-[10px] text-orange-500 font-medium">
                      {['', 'янв', 'фев', 'мар', 'апр', 'май', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'][parseInt(item.nearestDateDisplay?.split('.')[1])] || ''} {item.nearestDateDisplay?.split('.')[2]}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate group-hover:text-orange-700 transition-colors">
                      {item.category}
                    </p>
                    <p className="text-xs text-gray-500 line-clamp-2 mt-0.5">
                      {item.events[0]?.title}
                    </p>
                    {item.events.length > 1 && (
                      <p className="text-xs text-orange-600 mt-1">
                        +{item.events.length - 1} ещё
                      </p>
                    )}
                  </div>
                  <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-orange-500 flex-shrink-0 transition-colors" />
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Main Content - Categories + Details */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Categories list */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden sticky top-4">
            <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
              <h2 className="font-semibold text-gray-900">Категории товаров</h2>
            </div>
            <div className="max-h-[500px] overflow-y-auto">
              {Object.entries(data?.groups || {}).map(([groupName, groupData]) => (
                <div key={groupName} className="border-b border-gray-100 last:border-0">
                  <button
                    onClick={() => toggleGroup(groupName)}
                    className="w-full px-4 py-2.5 flex items-center justify-between hover:bg-gray-50 transition-colors"
                  >
                    <span className="font-medium text-gray-900 text-sm text-left">{groupName}</span>
                    {expandedGroups[groupName] ? (
                      <ChevronDown className="w-4 h-4 text-gray-400" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-gray-400" />
                    )}
                  </button>

                  {expandedGroups[groupName] && (
                    <div className="bg-gray-50 pb-1">
                      {groupData.categories?.map(catName => {
                        const cat = data?.categories?.[catName];
                        if (!cat) return null;

                        return (
                          <button
                            key={catName}
                            onClick={() => setSelectedCategory(catName)}
                            className={`w-full px-4 py-1.5 pl-6 text-left text-sm hover:bg-white transition-colors flex items-center justify-between ${
                              selectedCategory === catName ? 'bg-yellow-50 border-l-2 border-yellow-500' : ''
                            }`}
                          >
                            <span className="text-gray-700 text-xs">{catName}</span>
                            <span className={`w-2 h-2 rounded-full ${
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
              <div className={`px-5 py-4 border-b ${statusColors[selectedCategoryData.status]?.bg || 'bg-gray-50'}`}>
                <div className="flex items-center justify-between mb-2">
                  <h2 className="text-lg font-bold text-gray-900">{selectedCategoryData.name}</h2>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${statusColors[selectedCategoryData.status]?.bg} ${statusColors[selectedCategoryData.status]?.text} border ${statusColors[selectedCategoryData.status]?.border}`}>
                    {selectedCategoryData.status_label}
                  </span>
                </div>
                <div className="text-sm text-gray-600">
                  {selectedCategoryData.main_group}
                </div>

                {/* Progress bar */}
                <div className="mt-3">
                  <div className="flex justify-between text-xs text-gray-600 mb-1">
                    <span>Прогресс</span>
                    <span>{selectedCategoryData.completed_count}/{selectedCategoryData.total_events} этапов</span>
                  </div>
                  <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-yellow-400 to-yellow-500 rounded-full transition-all duration-500"
                      style={{ width: `${selectedCategoryData.progress_percent}%` }}
                    />
                  </div>
                </div>

                {/* Next deadline highlight */}
                {selectedCategoryData.next_deadline && (
                  <div className="mt-3 p-2.5 bg-white/80 rounded-lg border border-amber-200">
                    <div className="flex items-center gap-2 text-amber-700 font-medium text-sm mb-1">
                      <Clock className="w-3.5 h-3.5" />
                      Ближайший срок: {selectedCategoryData.next_deadline.date_display}
                    </div>
                    <div className="text-xs text-gray-700">
                      {selectedCategoryData.next_deadline.title}
                    </div>
                  </div>
                )}
              </div>

              {/* Filters */}
              <div className="px-5 py-2 border-b border-gray-200 bg-gray-50">
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <div className="flex items-center gap-1.5 text-gray-600">
                    <Filter className="w-3.5 h-3.5" />
                    Фильтры:
                  </div>
                  <label className="flex items-center gap-1 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showOnlyUpcoming}
                      onChange={(e) => setShowOnlyUpcoming(e.target.checked)}
                      className="rounded border-gray-300 text-yellow-500 focus:ring-yellow-500 w-3.5 h-3.5"
                    />
                    Только предстоящие
                  </label>
                  <div className="h-3 w-px bg-gray-300" />
                  {['Производитель', 'Импортёр', 'Оптовик', 'Розница'].map(aud => (
                    <label key={aud} className="flex items-center gap-1 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={audienceFilter.includes(aud)}
                        onChange={() => toggleAudienceFilter(aud)}
                        className="rounded border-gray-300 text-yellow-500 focus:ring-yellow-500 w-3.5 h-3.5"
                      />
                      {aud}
                    </label>
                  ))}
                </div>
              </div>

              {/* Events list */}
              <div className="divide-y divide-gray-100 max-h-[400px] overflow-y-auto">
                {filterEvents(selectedCategoryData.events || []).map((event, idx) => (
                  <div
                    key={idx}
                    className={`px-5 py-3 ${event.is_completed ? 'bg-white' : 'bg-amber-50/30'}`}
                  >
                    <div className="flex items-start gap-3">
                      {/* Status icon */}
                      <div className={`mt-0.5 flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center ${
                        event.is_completed
                          ? 'bg-emerald-100 text-emerald-600'
                          : 'bg-amber-100 text-amber-600'
                      }`}>
                        {event.is_completed ? (
                          <CheckCircle2 className="w-4 h-4" />
                        ) : (
                          <Clock className="w-4 h-4" />
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className={`text-sm font-medium ${event.is_completed ? 'text-gray-500' : 'text-gray-900'}`}>
                            {event.date_display}
                          </span>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                            event.is_completed
                              ? 'bg-gray-100 text-gray-500'
                              : 'bg-amber-100 text-amber-700'
                          }`}>
                            {event.type_label}
                          </span>
                        </div>

                        <h4 className={`text-sm mb-1 ${event.is_completed ? 'text-gray-600' : 'text-gray-900'}`}>
                          {event.title}
                        </h4>

                        {/* Audiences */}
                        <div className="flex flex-wrap gap-1">
                          {event.audiences_display?.map(aud => {
                            const Icon = audienceIcons[aud] || Users;
                            return (
                              <span key={aud} className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-gray-100 rounded text-[10px] text-gray-600">
                                <Icon className="w-2.5 h-2.5" />
                                {aud}
                              </span>
                            );
                          })}
                        </div>

                        {/* Description (collapsible) */}
                        {event.description && (
                          <details className="text-xs text-gray-600 mt-1">
                            <summary className="cursor-pointer text-yellow-600 hover:text-yellow-700">
                              Подробнее
                            </summary>
                            <p className="mt-1.5 p-2 bg-gray-50 rounded-lg whitespace-pre-line text-[11px]">
                              {event.description}
                            </p>
                          </details>
                        )}
                      </div>
                    </div>
                  </div>
                ))}

                {filterEvents(selectedCategoryData.events || []).length === 0 && (
                  <div className="px-5 py-8 text-center text-gray-500">
                    <AlertCircle className="w-10 h-10 mx-auto mb-2 text-gray-300" />
                    <p className="text-sm">Нет событий по выбранным фильтрам</p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
              <Calendar className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <h3 className="text-lg font-medium text-gray-900 mb-1">Выберите категорию</h3>
              <p className="text-sm text-gray-500">
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
