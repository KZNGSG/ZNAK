import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { CheckCircle, Wrench, Mail, User, LogIn, Handshake } from 'lucide-react';
import CitySelector from './CitySelector';
import { useAuth } from '../context/AuthContext';

const Header = () => {
  const location = useLocation();
  const { user, isAuthenticated, loading } = useAuth();

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
              Проверить товар
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
            <Link
              to="/partners"
              className={`flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-bold transition-all ${
                isActive('/partners')
                  ? 'bg-gradient-to-r from-[rgb(var(--brand-yellow-500))] to-[rgb(var(--brand-yellow-600))] text-[rgb(var(--black))] shadow-lg'
                  : 'text-[rgb(var(--grey-700))] hover:bg-[rgb(var(--brand-yellow-50))] hover:text-[rgb(var(--black))]'
              }`}
              data-testid="nav-partners"
            >
              <Handshake size={20} strokeWidth={2.5} />
              Партнёрам
            </Link>

            {/* Auth Button */}
            {!loading && (
              isAuthenticated ? (
                <Link
                  to="/cabinet"
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all ml-2 ${
                    isActive('/cabinet')
                      ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-lg'
                      : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                  }`}
                  data-testid="nav-cabinet"
                >
                  <User size={18} strokeWidth={2.5} />
                  <span className="hidden lg:inline">{user?.email?.split('@')[0]}</span>
                </Link>
              ) : (
                <Link
                  to="/login"
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all ml-2 ${
                    isActive('/login')
                      ? 'bg-[rgb(var(--grey-900))] text-white shadow-lg'
                      : 'text-[rgb(var(--grey-700))] hover:bg-[rgb(var(--grey-100))]'
                  }`}
                  data-testid="nav-login"
                >
                  <LogIn size={18} strokeWidth={2.5} />
                  Войти
                </Link>
              )
            )}
          </nav>
        </div>
      </div>
    </header>
  );
};

export default Header;
