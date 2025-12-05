import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { CheckCircle, FileCheck, Package, Wrench, Mail } from 'lucide-react';

const Header = () => {
  const location = useLocation();
  
  const isActive = (path) => location.pathname === path;

  return (
    <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-sm border-b border-gray-200" data-testid="header">
      <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2" data-testid="logo-link">
            <div className="flex items-center gap-1">
              <div className="grid grid-cols-2 gap-[2px]">
                <div className="w-1.5 h-1.5 bg-primary rounded-sm"></div>
                <div className="w-1.5 h-1.5 bg-accent rounded-sm"></div>
                <div className="w-1.5 h-1.5 bg-accent rounded-sm"></div>
                <div className="w-1.5 h-1.5 bg-primary rounded-sm"></div>
              </div>
            </div>
            <span className="text-xl font-semibold text-primary">
              Про<span className="logo-dot"></span>Маркируй
            </span>
          </Link>

          {/* Navigation */}
          <nav className="hidden md:flex items-center gap-1" data-testid="main-nav">
            <Link
              to="/check"
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive('/check') ? 'bg-primary/10 text-primary' : 'text-gray-600 hover:bg-gray-100'
              }`}
              data-testid="nav-check"
            >
              <CheckCircle size={18} strokeWidth={1.75} />
              Проверить
            </Link>
            <Link
              to="/import"
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive('/import') ? 'bg-primary/10 text-primary' : 'text-gray-600 hover:bg-gray-100'
              }`}
              data-testid="nav-import"
            >
              <Package size={18} strokeWidth={1.75} />
              Импорт
            </Link>
            <Link
              to="/equipment"
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive('/equipment') ? 'bg-primary/10 text-primary' : 'text-gray-600 hover:bg-gray-100'
              }`}
              data-testid="nav-equipment"
            >
              <Wrench size={18} strokeWidth={1.75} />
              Оснащение
            </Link>
            <Link
              to="/contact"
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive('/contact') ? 'bg-primary/10 text-primary' : 'text-gray-600 hover:bg-gray-100'
              }`}
              data-testid="nav-contact"
            >
              <Mail size={18} strokeWidth={1.75} />
              Контакт
            </Link>
          </nav>
        </div>
      </div>
    </header>
  );
};

export default Header;
