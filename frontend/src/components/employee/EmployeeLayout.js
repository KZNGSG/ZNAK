import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useEmployeeAuth } from '../../context/EmployeeAuthContext';
import NotificationCenter from '../notifications/NotificationCenter';
import GlobalSearch from '../search/GlobalSearch';
import {
  LayoutDashboard,
  Inbox,
  Users,
  FileText,
  FileCheck,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Bell,
  Search,
  Menu,
  X,
  UserCog,
  BarChart3,
  MessageSquare,
  Mail,
  Settings,
  FolderOpen,
  Handshake,
  GraduationCap,
  CheckSquare,
  Globe,
  Send
} from 'lucide-react';

const EmployeeLayout = ({ children }) => {
  const { user, logout, isSuperAdmin } = useEmployeeAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/employee/login');
  };

  const menuItems = [
    ...(isSuperAdmin ? [{
      path: '/employee/analytics',
      icon: BarChart3,
      label: 'Аналитика',
      description: 'Статистика и воронка'
    }] : []),
    {
      path: '/employee',
      icon: LayoutDashboard,
      label: 'Панель менеджера',
      description: 'Обзор заявок и клиентов'
    },
    {
      path: '/employee/inbox',
      icon: Inbox,
      label: 'Входящие',
      description: 'Заявки с сайта'
    },
    {
      path: '/employee/clients',
      icon: Users,
      label: 'Клиенты',
      description: 'База клиентов'
    },
    {
      path: '/employee/documents',
      icon: FolderOpen,
      label: 'Документы',
      description: 'КП, договоры, счета'
    },
    {
      path: '/employee/partners',
      icon: Handshake,
      label: 'Партнёры',
      description: 'Партнёрская программа'
    },
    {
      path: '/employee/education',
      icon: GraduationCap,
      label: 'Обучение',
      description: 'Курсы для партнёров'
    },
    {
      path: '/employee/tasks',
      icon: CheckSquare,
      label: 'Задачи',
      description: 'Мои задачи'
    },
    {
      path: '/employee/email',
      icon: Mail,
      label: 'Почта',
      description: 'Корпоративная почта'
    },
    ...(isSuperAdmin ? [
      {
        path: '/employee/staff',
        icon: UserCog,
        label: 'Сотрудники',
        description: 'Управление пользователями'
      },
      {
        path: '/employee/settings',
        icon: Settings,
        label: 'Настройки',
        description: 'Уведомления и SLA'
      }
    ] : []),
    ...(isSuperAdmin ? [{
      path: '/employee/ai-consultant',
      icon: MessageSquare,
      label: 'AI Консультант',
      description: 'Управление ботом'
    }, {
      path: '/employee/seo',
      icon: Globe,
      label: 'SEO Города',
      description: 'Управление гео-страницами'
    }, {
      path: '/employee/telegram',
      icon: Send,
      label: 'Бот ТГ',
      description: 'Telegram лиды'
    }] : [])
  ];

  const NavItem = ({ item, collapsed }) => {
    const isActive = location.pathname === item.path ||
      (item.path !== '/employee' && location.pathname.startsWith(item.path));
    const Icon = item.icon;

    return (
      <Link
        to={item.path}
        onClick={() => setMobileMenuOpen(false)}
        className={`
          group flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200
          ${isActive
            ? 'bg-yellow-500/10 text-yellow-600 border border-yellow-500/30'
            : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900 border border-transparent'
          }
        `}
      >
        <Icon
          className={`w-5 h-5 flex-shrink-0 ${isActive ? 'text-yellow-600' : 'text-gray-400 group-hover:text-gray-600'}`}
          strokeWidth={1.5}
        />
        {!collapsed && (
          <div className="flex-1 min-w-0">
            <div className={`text-sm font-medium ${isActive ? 'text-yellow-600' : ''}`}>
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
    <div className="min-h-screen bg-gray-50 flex">
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      <aside
        className={`
          fixed lg:static inset-y-0 left-0 z-50
          ${sidebarCollapsed ? 'w-[72px]' : 'w-64'}
          ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          bg-white border-r border-gray-200
          transition-all duration-300 flex flex-col
        `}
      >
        <div className="h-16 flex items-center justify-between px-4 border-b border-gray-200">
          {!sidebarCollapsed ? (
            <Link to="/" className="flex items-center gap-2 group">
              <div className="flex items-center gap-0.5 p-2 rounded-lg bg-gradient-to-br from-yellow-100 to-yellow-200 group-hover:scale-105 transition-transform shadow-sm">
                <div className="grid grid-cols-2 gap-0.5">
                  <div className="w-2 h-2 bg-yellow-500 rounded-sm"></div>
                  <div className="w-2 h-2 bg-gray-800 rounded-sm"></div>
                  <div className="w-2 h-2 bg-gray-800 rounded-sm"></div>
                  <div className="w-2 h-2 bg-yellow-500 rounded-sm"></div>
                </div>
              </div>
              <span className="text-base font-bold text-gray-900">
                Про<span className="text-yellow-500">.</span>Маркируй
              </span>
            </Link>
          ) : (
            <Link to="/" className="flex items-center justify-center group mx-auto">
              <div className="flex items-center gap-0.5 p-2 rounded-lg bg-gradient-to-br from-yellow-100 to-yellow-200 group-hover:scale-105 transition-transform shadow-sm">
                <div className="grid grid-cols-2 gap-0.5">
                  <div className="w-2 h-2 bg-yellow-500 rounded-sm"></div>
                  <div className="w-2 h-2 bg-gray-800 rounded-sm"></div>
                  <div className="w-2 h-2 bg-gray-800 rounded-sm"></div>
                  <div className="w-2 h-2 bg-yellow-500 rounded-sm"></div>
                </div>
              </div>
            </Link>
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

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {menuItems.map((item) => (
            <NavItem key={item.path} item={item} collapsed={sidebarCollapsed} />
          ))}
        </nav>

        <div className="border-t border-gray-200 p-3">
          {!sidebarCollapsed ? (
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center">
                <span className="text-gray-600 text-sm font-medium">
                  {user?.email?.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm text-gray-900 truncate">{user?.email}</div>
                <div className="text-xs text-gray-400">
                  {user?.role === 'superadmin' ? 'Супер-админ' : 'Сотрудник'}
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

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 lg:px-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div className="hidden sm:block">
              <GlobalSearch />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <NotificationCenter />
          </div>
        </header>

        <main className="flex-1 overflow-auto bg-slate-50">
          <div className="p-4 lg:p-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default EmployeeLayout;
