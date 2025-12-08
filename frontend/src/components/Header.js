import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { CheckCircle, ClipboardList, Wrench, Mail, FileText } from 'lucide-react';
import CitySelector from './CitySelector';

const Header = () => {
  const location = useLocation();

  const isActive = (path) => location.pathname === path;

  return (
    <header className="sticky top-0 z-50 bg-white/98 backdrop-blur-lg border-b-2 border-[rgb(var(--grey-300))]" data-testid="header" style={{ boxShadow: 'var(--shadow-2)' }}>
      <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20 py-3">
          {/* Left side: Logo + City */}
          <div className="flex items-center gap-6">
            {/* Enhanced Logo - Yellow Theme */}
            <Link to="/" className="flex items-center gap-3 group" data-testid="logo-link">
            <div className="flex items-center gap-1 p-2.5 rounded-xl bg-gradient-to-br from-[rgb(var(--brand-yellow-100))] to-[rgb(var(--brand-yellow-200))] group-hover:scale-105 transition-transform shadow-md">
              <div className="grid grid-cols-2 gap-1">
                <div className="w-2.5 h-2.5 bg-[rgb(var(--brand-yellow-600))] rounded shadow-sm"></div>
                <div className="w-2.5 h-2.5 bg-[rgb(var(--grey-900))] rounded shadow-sm"></div>
                <div className="w-2.5 h-2.5 bg-[rgb(var(--grey-900))] rounded shadow-sm"></div>
                <div className="w-2.5 h-2.5 bg-[rgb(var(--brand-yellow-600))] rounded shadow-sm"></div>
              </div>
            </div>
            <span className="text-xl font-bold text-[rgb(var(--black))]">
              Про<span className="logo-dot"></span>Маркируй
            </span>
          </Link>

            {/* City Selector */}
            <div className="hidden sm:block border-l border-gray-200 pl-6">
              <CitySelector />
            </div>
          </div>

          {/* Enhanced Navigation - Yellow Theme */}
          <nav className="hidden md:flex items-center gap-2" data-testid="main-nav">
            <Link
              to="/check"
              className={`flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-bold transition-all ${
                isActive('/check') 
                  ? 'bg-gradient-to-r from-[rgb(var(--brand-yellow-500))] to-[rgb(var(--brand-yellow-600))] text-[rgb(var(--black))] shadow-lg' 
                  : 'text-[rgb(var(--grey-700))] hover:bg-[rgb(var(--brand-yellow-50))] hover:text-[rgb(var(--black))]'
              }`}
              data-testid="nav-check"
            >
              <CheckCircle size={20} strokeWidth={2.5} />
              Проверить
            </Link>
            <Link
              to="/quote"
              className={`flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-bold transition-all ${
                isActive('/quote')
                  ? 'bg-gradient-to-r from-[rgb(var(--brand-yellow-500))] to-[rgb(var(--brand-yellow-600))] text-[rgb(var(--black))] shadow-lg'
                  : 'text-[rgb(var(--grey-700))] hover:bg-[rgb(var(--brand-yellow-50))] hover:text-[rgb(var(--black))]'
              }`}
              data-testid="nav-quote"
            >
              <FileText size={20} strokeWidth={2.5} />
              Получить КП
            </Link>
            <Link
              to="/equipment"
              className={`flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-bold transition-all ${
                isActive('/equipment') 
                  ? 'bg-gradient-to-r from-[rgb(var(--brand-yellow-500))] to-[rgb(var(--brand-yellow-600))] text-[rgb(var(--black))] shadow-lg' 
                  : 'text-[rgb(var(--grey-700))] hover:bg-[rgb(var(--brand-yellow-50))] hover:text-[rgb(var(--black))]'
              }`}
              data-testid="nav-equipment"
            >
              <Wrench size={20} strokeWidth={2.5} />
              Оснащение
            </Link>
            <Link
              to="/contact"
              className={`flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-bold transition-all ${
                isActive('/contact') 
                  ? 'bg-[rgb(var(--grey-900))] text-white shadow-lg' 
                  : 'text-[rgb(var(--grey-700))] hover:bg-[rgb(var(--grey-200))] hover:text-[rgb(var(--black))]'
              }`}
              data-testid="nav-contact"
            >
              <Mail size={20} strokeWidth={2.5} />
              Контакт
            </Link>
          </nav>
        </div>
      </div>
    </header>
  );
};

export default Header;
