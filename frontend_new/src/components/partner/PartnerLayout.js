import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { usePartnerAuth } from '../../context/PartnerAuthContext';
import {
  LayoutDashboard,
  Users,
  Calculator,
  BookOpen,
  GraduationCap,
  Settings,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Menu,
  X,
  Link as LinkIcon,
  Copy,
  Check
} from 'lucide-react';
import { toast } from 'sonner';

const PartnerLayout = ({ children }) => {
  const { user, partner, logout } = usePartnerAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/partner/login');
  };

  const copyRefLink = () => {
    if (partner?.ref_code) {
      const link = `${window.location.origin}/quote?ref=${partner.ref_code}`;
      navigator.clipboard.writeText(link);
      setLinkCopied(true);
      toast.success('Ссылка скопирована!');
      setTimeout(() => setLinkCopied(false), 2000);
    }
  };

  const menuItems = [
    {
      path: '/partner',
      icon: LayoutDashboard,
      label: 'Дашборд',
      description: 'Обзор и статистика'
    },
    {
      path: '/partner/leads',
      icon: Users,
      label: 'Мои клиенты',
      description: 'Привлечённые заявки'
    },
    {
      path: '/partner/calculator',
      icon: Calculator,
      label: 'Калькулятор',
      description: 'Расчёт дохода'
    },
    {
      path: '/partner/materials',
      icon: BookOpen,
  GraduationCap,
      label: 'Материалы',
      description: 'Об услугах и FAQ'
    },
    {
      path: '/partner/education',
      icon: GraduationCap,
      label: 'Обучение',
      description: 'Курсы и сертификаты'
    },
    {
      path: '/partner/settings',
      icon: Settings,
      label: 'Настройки',
      description: 'Профиль партнёра'
    }
  ];

  const NavItem = ({ item, collapsed }) => {
    const isActive = location.pathname === item.path ||
      (item.path !== '/partner' && location.pathname.startsWith(item.path));
    const Icon = item.icon;

    return (
      <Link
        to={item.path}
        onClick={() => setMobileMenuOpen(false)}
        className={`
          group flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200
          ${isActive
            ? 'bg-amber-500/10 text-amber-700 border border-amber-500/30'
            : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900 border border-transparent'
          }
        `}
      >
        <Icon
          className={`w-5 h-5 flex-shrink-0 ${isActive ? 'text-amber-600' : 'text-gray-400 group-hover:text-gray-600'}`}
          strokeWidth={1.5}
        />
        {!collapsed && (
          <div className="flex-1 min-w-0">
            <div className={`text-sm font-medium ${isActive ? 'text-amber-700' : ''}`}>
              {item.label}
            </div>
            <div className="text-xs text-gray-400 truncate">
              {item.description}
            </div>
          </div>
        )}
      </Link>
    );
  };

  return (
    <div className="min-h-screen bg-amber-50/30 flex">
      {/* Mobile menu overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed lg:static inset-y-0 left-0 z-50
          ${sidebarCollapsed ? 'w-[72px]' : 'w-64'}
          ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          bg-white border-r border-amber-200/50
          transition-all duration-300 flex flex-col
        `}
      >
        {/* Header */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-amber-200/50">
          {!sidebarCollapsed && (
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-400 to-amber-500 flex items-center justify-center">
                <span className="text-white font-bold text-sm">P</span>
              </div>
              <div>
                <div className="text-sm font-semibold text-gray-900">Партнёр</div>
                <div className="text-[10px] text-gray-400 uppercase tracking-wider">Pro.Markiruj</div>
              </div>
            </div>
          )}
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="hidden lg:flex p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            {sidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
          <button
            onClick={() => setMobileMenuOpen(false)}
            className="lg:hidden p-2 text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Ref link card */}
        {!sidebarCollapsed && partner?.ref_code && (
          <div className="mx-3 mt-4 p-3 bg-gradient-to-br from-amber-50 to-amber-100 border border-amber-200 rounded-xl">
            <div className="flex items-center gap-2 mb-2">
              <LinkIcon className="w-4 h-4 text-amber-600" />
              <span className="text-xs font-medium text-amber-700">Ваша ссылка</span>
            </div>
            <div className="flex items-center gap-2">
              <code className="flex-1 text-xs bg-white/80 px-2 py-1.5 rounded border border-amber-200 text-amber-800 truncate">
                ref={partner.ref_code}
              </code>
              <button
                onClick={copyRefLink}
                className="p-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg transition-colors"
                title="Копировать ссылку"
              >
                {linkCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {menuItems.map((item) => (
            <NavItem key={item.path} item={item} collapsed={sidebarCollapsed} />
          ))}
        </nav>

        {/* User section */}
        <div className="border-t border-amber-200/50 p-3">
          {!sidebarCollapsed ? (
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-amber-200 to-amber-300 flex items-center justify-center">
                <span className="text-amber-700 text-sm font-medium">
                  {partner?.contact_name?.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm text-gray-900 truncate">
                  {partner?.contact_name || user?.email}
                </div>
                <div className="text-xs text-gray-400">
                  {partner?.company_name || 'Партнёр'}
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                title="Выйти"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={handleLogout}
              className="w-full flex justify-center p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
              title="Выйти"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>
      </aside>

      {/* Main content area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="h-16 bg-white border-b border-amber-200/50 flex items-center justify-between px-4 lg:px-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
            >
              <Menu className="w-5 h-5" />
            </button>
            <h1 className="text-lg font-semibold text-gray-900">
              Партнёрский кабинет
            </h1>
          </div>

          {/* Copy link button for mobile */}
          {partner?.ref_code && (
            <button
              onClick={copyRefLink}
              className="lg:hidden flex items-center gap-2 px-3 py-1.5 bg-amber-100 hover:bg-amber-200 text-amber-700 rounded-lg text-sm transition-colors"
            >
              {linkCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              <span>Ссылка</span>
            </button>
          )}
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto">
          <div className="p-4 lg:p-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default PartnerLayout;
