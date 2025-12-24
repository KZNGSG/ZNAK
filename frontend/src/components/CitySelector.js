import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { MapPin, ChevronDown, Navigation, X, Search } from 'lucide-react';
import { CITIES, getCityBySlug, getCityByName } from '../data/cities';

// Проверка на пререндеринг (react-snap)
const isPrerendering = typeof navigator !== 'undefined' && navigator.userAgent === 'ReactSnap';

const CitySelector = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [city, setCity] = useState(isPrerendering ? 'Москва' : null);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(!isPrerendering);
  const [searchQuery, setSearchQuery] = useState('');
  const [isGeoLoading, setIsGeoLoading] = useState(false);
  const dropdownRef = useRef(null);

  // Список городов для отображения (из базы SEO)
  const cityNames = CITIES.map(c => c.name);

  // Определить текущий город из URL если мы на гео-странице
  useEffect(() => {
    // Пропускаем логику при пререндеринге
    if (isPrerendering) return;

    const match = location.pathname.match(/^\/city\/([^/]+)/);
    if (match) {
      const slug = match[1];
      const cityData = getCityBySlug(slug);
      if (cityData) {
        setCity(cityData.name);
        localStorage.setItem('userCity', cityData.name);
        setIsLoading(false);
        return;
      }
    }

    // Если не на гео-странице - загружаем сохранённый город
    const savedCity = localStorage.getItem('userCity');
    if (savedCity) {
      setCity(savedCity);
      setIsLoading(false);
    } else {
      detectCityByIP();
    }
  }, [location.pathname]);

  // Закрытие dropdown при клике вне
  useEffect(() => {
    if (isPrerendering) return;

    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
        setSearchQuery('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Определение города по IP
  const detectCityByIP = async () => {
    if (isPrerendering) {
      setCity('Москва');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('https://ipapi.co/json/', { timeout: 5000 });
      if (response.ok) {
        const data = await response.json();
        if (data.city) {
          const detectedCity = data.city;
          setCity(detectedCity);
          localStorage.setItem('userCity', detectedCity);

          // Если есть гео-страница для этого города - переходим
          const cityData = getCityByName(detectedCity);
          if (cityData && location.pathname === '/') {
            navigate(`/city/${cityData.slug}`);
          }
        } else {
          setCity('Москва');
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

  // Точное определение по GPS
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
              selectCity(cityName);
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

    // Если у города есть гео-страница - переходим на неё
    const cityData = getCityByName(selectedCity);
    if (cityData) {
      navigate(`/city/${cityData.slug}`);
    }
  };

  // Фильтрация городов по поиску
  const filteredCities = searchQuery.trim()
    ? cityNames.filter(c =>
        c.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : cityNames;

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
        </div>
      )}
    </div>
  );
};

export default CitySelector;
