import React, { useState, useEffect, useRef } from 'react';
import { MapPin, ChevronDown, Navigation, X, Search } from 'lucide-react';

// Популярные города России
const POPULAR_CITIES = [
  'Москва', 'Санкт-Петербург', 'Новосибирск', 'Екатеринбург', 'Казань',
  'Нижний Новгород', 'Челябинск', 'Самара', 'Омск', 'Ростов-на-Дону',
  'Уфа', 'Красноярск', 'Воронеж', 'Пермь', 'Волгоград', 'Краснодар',
  'Саратов', 'Тюмень', 'Тольятти', 'Ижевск', 'Барнаул', 'Иркутск',
  'Ульяновск', 'Хабаровск', 'Ярославль', 'Владивосток', 'Махачкала',
  'Томск', 'Оренбург', 'Кемерово', 'Новокузнецк', 'Рязань', 'Астрахань'
];

const CitySelector = () => {
  const [city, setCity] = useState(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isGeoLoading, setIsGeoLoading] = useState(false);
  const dropdownRef = useRef(null);

  // Загрузка сохранённого города или определение по IP
  useEffect(() => {
    const savedCity = localStorage.getItem('userCity');
    if (savedCity) {
      setCity(savedCity);
      setIsLoading(false);
    } else {
      detectCityByIP();
    }
  }, []);

  // Закрытие dropdown при клике вне
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
        setSearchQuery('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Определение города по IP (без запроса разрешения)
  const detectCityByIP = async () => {
    setIsLoading(true);
    try {
      // Используем бесплатный API для определения по IP
      const response = await fetch('https://ipapi.co/json/', {
        timeout: 5000
      });
      if (response.ok) {
        const data = await response.json();
        if (data.city) {
          const detectedCity = data.city;
          setCity(detectedCity);
          localStorage.setItem('userCity', detectedCity);
        } else {
          setCity('Москва'); // Fallback
        }
      } else {
        setCity('Москва');
      }
    } catch (error) {
      console.log('IP geolocation failed, using default');
      setCity('Москва');
    } finally {
      setIsLoading(false);
    }
  };

  // Точное определение по GPS (требует разрешения)
  const detectCityByGPS = async () => {
    if (!navigator.geolocation) {
      alert('Геолокация не поддерживается вашим браузером');
      return;
    }

    setIsGeoLoading(true);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          // Используем Nominatim для обратного геокодирования
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&accept-language=ru`,
            { headers: { 'User-Agent': 'ProMarkirui/1.0' } }
          );

          if (response.ok) {
            const data = await response.json();
            const cityName = data.address?.city ||
                            data.address?.town ||
                            data.address?.village ||
                            data.address?.state;
            if (cityName) {
              setCity(cityName);
              localStorage.setItem('userCity', cityName);
            }
          }
        } catch (error) {
          console.error('Reverse geocoding failed:', error);
        } finally {
          setIsGeoLoading(false);
          setIsOpen(false);
        }
      },
      (error) => {
        setIsGeoLoading(false);
        if (error.code === error.PERMISSION_DENIED) {
          alert('Доступ к геолокации запрещён. Выберите город вручную.');
        } else {
          alert('Не удалось определить местоположение');
        }
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // Выбор города вручную
  const selectCity = (selectedCity) => {
    setCity(selectedCity);
    localStorage.setItem('userCity', selectedCity);
    setIsOpen(false);
    setSearchQuery('');
  };

  // Фильтрация городов по поиску
  const filteredCities = searchQuery.trim()
    ? POPULAR_CITIES.filter(c =>
        c.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : POPULAR_CITIES;

  if (isLoading) {
    return (
      <div className="flex items-center gap-1.5 text-sm text-gray-500">
        <MapPin size={14} className="animate-pulse" />
        <span className="animate-pulse">Определяем...</span>
      </div>
    );
  }

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Кнопка выбора города */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 text-sm text-gray-700 hover:text-gray-900 transition-colors group"
      >
        <MapPin size={14} className="text-[rgb(var(--brand-yellow-600))]" />
        <span className="font-medium">{city}</span>
        <ChevronDown
          size={14}
          className={`text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-72 bg-white rounded-xl border border-gray-200 shadow-xl z-50 overflow-hidden">
          {/* Поиск */}
          <div className="p-3 border-b border-gray-100">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Поиск города..."
                className="w-full pl-9 pr-8 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-[rgb(var(--brand-yellow-400))] focus:ring-2 focus:ring-[rgb(var(--brand-yellow-100))]"
                autoFocus
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>

          {/* Кнопка определения по GPS */}
          <button
            onClick={detectCityByGPS}
            disabled={isGeoLoading}
            className="w-full flex items-center gap-3 px-4 py-3 text-sm text-left hover:bg-[rgb(var(--brand-yellow-50))] border-b border-gray-100 transition-colors"
          >
            <div className="p-1.5 rounded-lg bg-[rgb(var(--brand-yellow-100))]">
              <Navigation size={14} className={`text-[rgb(var(--brand-yellow-700))] ${isGeoLoading ? 'animate-spin' : ''}`} />
            </div>
            <div>
              <div className="font-medium text-gray-900">
                {isGeoLoading ? 'Определяем...' : 'Определить автоматически'}
              </div>
              <div className="text-xs text-gray-500">По GPS (точнее)</div>
            </div>
          </button>

          {/* Список городов */}
          <div className="max-h-64 overflow-y-auto">
            {filteredCities.length > 0 ? (
              filteredCities.map((cityName) => (
                <button
                  key={cityName}
                  onClick={() => selectCity(cityName)}
                  className={`w-full px-4 py-2.5 text-sm text-left hover:bg-gray-50 transition-colors flex items-center justify-between ${
                    city === cityName ? 'bg-[rgb(var(--brand-yellow-50))] text-[rgb(var(--brand-yellow-800))]' : 'text-gray-700'
                  }`}
                >
                  <span>{cityName}</span>
                  {city === cityName && (
                    <span className="text-[rgb(var(--brand-yellow-600))]">✓</span>
                  )}
                </button>
              ))
            ) : (
              <div className="px-4 py-6 text-sm text-gray-500 text-center">
                Город не найден
              </div>
            )}
          </div>

          {/* Ввод своего города */}
          {searchQuery && !filteredCities.includes(searchQuery) && searchQuery.length > 1 && (
            <button
              onClick={() => selectCity(searchQuery)}
              className="w-full px-4 py-3 text-sm text-left bg-gray-50 hover:bg-gray-100 border-t border-gray-100 transition-colors"
            >
              <span className="text-gray-600">Выбрать: </span>
              <span className="font-medium text-gray-900">{searchQuery}</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default CitySelector;
