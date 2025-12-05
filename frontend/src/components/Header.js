import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { CheckCircle, FileCheck, Package, Wrench, Mail } from 'lucide-react';

const Header = () => {
  const location = useLocation();
  
  const isActive = (path) => location.pathname === path;

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b-2 border-[rgb(var(--border-1))]" data-testid="header" style={{ boxShadow: 'var(--shadow-1)' }}>
      <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-18 py-3">
          {/* Enhanced Logo */}
          <Link to="/" className="flex items-center gap-2.5 group" data-testid="logo-link">
            <div className="flex items-center gap-1 p-2 rounded-lg bg-gradient-to-br from-[rgb(var(--brand-blue-50))] to-[rgb(var(--brand-emerald-50))] group-hover:scale-105 transition-transform">
              <div className="grid grid-cols-2 gap-[3px]">
                <div className="w-2 h-2 bg-[rgb(var(--brand-blue-700))] rounded-sm shadow-sm"></div>
                <div className="w-2 h-2 bg-[rgb(var(--brand-emerald-600))] rounded-sm shadow-sm"></div>
                <div className="w-2 h-2 bg-[rgb(var(--brand-emerald-600))] rounded-sm shadow-sm"></div>
                <div className="w-2 h-2 bg-[rgb(var(--brand-blue-700))] rounded-sm shadow-sm"></div>
              </div>
            </div>
            <span className="text-xl font-bold text-[rgb(var(--text-strong))]">
              Про<span className="logo-dot"></span>Маркируй
            </span>
          </Link>

          {/* Enhanced Navigation */}
          <nav className="hidden md:flex items-center gap-2" data-testid="main-nav">
            <Link
              to="/check"
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                isActive('/check') 
                  ? 'bg-[rgb(var(--brand-blue-700))] text-white shadow-md' 
                  : 'text-[rgb(var(--text-default))] hover:bg-[rgb(var(--brand-blue-50))] hover:text-[rgb(var(--brand-blue-700))]'
              }`}
              data-testid="nav-check"
            >
              <CheckCircle size={19} strokeWidth={2} />
              Проверить
            </Link>
            <Link
              to="/import"
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                isActive('/import') 
                  ? 'bg-[rgb(var(--brand-blue-700))] text-white shadow-md' 
                  : 'text-[rgb(var(--text-default))] hover:bg-[rgb(var(--brand-blue-50))] hover:text-[rgb(var(--brand-blue-700))]'
              }`}
              data-testid="nav-import"
            >
              <Package size={19} strokeWidth={2} />
              Импорт
            </Link>
            <Link
              to="/equipment"
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                isActive('/equipment') 
                  ? 'bg-[rgb(var(--brand-blue-700))] text-white shadow-md' 
                  : 'text-[rgb(var(--text-default))] hover:bg-[rgb(var(--brand-blue-50))] hover:text-[rgb(var(--brand-blue-700))]'
              }`}
              data-testid="nav-equipment"
            >
              <Wrench size={19} strokeWidth={2} />
              Оснащение
            </Link>
            <Link
              to="/contact"
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                isActive('/contact') 
                  ? 'bg-[rgb(var(--brand-emerald-600))] text-white shadow-md' 
                  : 'text-[rgb(var(--text-default))] hover:bg-[rgb(var(--brand-emerald-50))] hover:text-[rgb(var(--brand-emerald-700))]'
              }`}
              data-testid="nav-contact"
            >
              <Mail size={19} strokeWidth={2} />
              Контакт
            </Link>
          </nav>
        </div>
      </div>
    </header>
  );
};

export default Header;
