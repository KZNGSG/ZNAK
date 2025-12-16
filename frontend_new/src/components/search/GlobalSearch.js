import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useEmployeeAuth } from '../../context/EmployeeAuthContext';
import {
  Search,
  X,
  User,
  Users,
  FileText,
  Phone,
  Building2,
  GraduationCap,
  Loader2,
  ArrowRight
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const typeConfig = {
  client: {
    icon: Users,
    label: 'Клиент',
    color: 'bg-blue-100 text-blue-600',
    path: '/employee/clients'
  },
  callback: {
    icon: Phone,
    label: 'Заявка',
    color: 'bg-amber-100 text-amber-600',
    path: '/employee/inbox'
  },
  partner: {
    icon: Building2,
    label: 'Партнёр',
    color: 'bg-emerald-100 text-emerald-600',
    path: '/employee/partners'
  },
  contract: {
    icon: FileText,
    label: 'Договор',
    color: 'bg-violet-100 text-violet-600',
    path: '/employee/documents'
  },
  quote: {
    icon: FileText,
    label: 'КП',
    color: 'bg-purple-100 text-purple-600',
    path: '/employee/documents'
  },
  user: {
    icon: User,
    label: 'Сотрудник',
    color: 'bg-gray-100 text-gray-600',
    path: '/employee/team'
  }
};

const GlobalSearch = () => {
  const { authFetch } = useEmployeeAuth();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef(null);
  const containerRef = useRef(null);
  const debounceRef = useRef(null);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === '/' && !['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) {
        e.preventDefault();
        setIsOpen(true);
      }
      if (e.key === 'Escape') {
        setIsOpen(false);
        setQuery('');
        setResults([]);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const search = useCallback(async (searchQuery) => {
    if (!searchQuery || searchQuery.length < 2) {
      setResults([]);
      return;
    }

    setIsLoading(true);
    try {
      const response = await authFetch(API_URL + '/api/search?q=' + encodeURIComponent(searchQuery));
      if (response.ok) {
        const data = await response.json();
        setResults(data.results || []);
        setSelectedIndex(0);
      }
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setIsLoading(false);
    }
  }, [authFetch]);

  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(() => {
      search(query);
    }, 300);
    return () => clearTimeout(debounceRef.current);
  }, [query, search]);

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => Math.min(prev + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter' && results[selectedIndex]) {
      handleSelect(results[selectedIndex]);
    }
  };

  const handleSelect = (item) => {
    const config = typeConfig[item.type];
    if (config) {
      if (item.id) {
        navigate(config.path + '/' + item.id);
      } else {
        navigate(config.path);
      }
    }
    setIsOpen(false);
    setQuery('');
    setResults([]);
  };

  return (
    <div ref={containerRef} className="relative">
      <div 
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 bg-gray-100 border border-gray-200 rounded-lg px-3 py-2 w-64 lg:w-80 cursor-text hover:border-gray-300 transition-colors"
      >
        <Search className="w-4 h-4 text-gray-400" />
        {isOpen ? (
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Поиск клиентов, заявок..."
            className="bg-transparent border-none outline-none text-sm text-gray-900 placeholder-gray-400 w-full"
          />
        ) : (
          <span className="text-sm text-gray-400">Поиск клиентов, заявок...</span>
        )}
        <kbd className="hidden lg:inline-flex px-1.5 py-0.5 text-[10px] text-gray-400 bg-gray-200 rounded">
          /
        </kbd>
      </div>

      {isOpen && (query.length >= 2 || results.length > 0) && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden z-50 max-h-96 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-8 text-gray-400">
              <Loader2 className="w-5 h-5 animate-spin mr-2" />
              <span>Поиск...</span>
            </div>
          ) : results.length === 0 ? (
            <div className="py-8 text-center text-gray-400">
              <Search className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>Ничего не найдено</p>
              <p className="text-xs mt-1">Попробуйте изменить запрос</p>
            </div>
          ) : (
            <div className="py-2">
              {results.map((item, index) => {
                const config = typeConfig[item.type] || typeConfig.client;
                const Icon = config.icon;
                
                return (
                  <div
                    key={item.type + '-' + item.id}
                    onClick={() => handleSelect(item)}
                    className={'flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors ' + (index === selectedIndex ? 'bg-violet-50' : 'hover:bg-gray-50')}
                  >
                    <div className={'w-9 h-9 rounded-lg flex items-center justify-center ' + config.color}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{item.title}</p>
                      <p className="text-xs text-gray-500 truncate">{item.subtitle}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded">
                        {config.label}
                      </span>
                      <ArrowRight className="w-4 h-4 text-gray-300" />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/10 z-40"
          style={{ top: '60px' }}
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
};

export default GlobalSearch;
