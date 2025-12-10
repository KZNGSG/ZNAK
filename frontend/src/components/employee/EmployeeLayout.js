import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useEmployeeAuth } from '../../context/EmployeeAuthContext';
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
  Settings,
  FolderOpen
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
    // Аналитика для superadmin вместо обычной главной
    ...(isSuperAdmin ? [{
      path: '/employee/analytics',
      icon: BarChart3,
      label: 'Аналитика',
      description: 'Статистика и воронка'
    }] : [{
      path: '/employee',
      icon: LayoutDashboard,
      label: 'Главная',
      description: 'Обзор и статистика'
    }]),
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
    // КП и Договоры только для superadmin
    ...(isSuperAdmin ? [
      {
        path: '/employee/quotes',
        icon: FileText,
        label: 'Все КП',
        description: 'Коммерческие предложения'
      },
      {
        path: '/employee/contracts',
        icon: FileCheck,
        label: 'Договоры',
        description: 'Все договоры'
      },
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
    ] : [])
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
          bg-white border-r border-gray-200
          transition-all duration-300 flex flex-col
        `}
      >
        {/* Header */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-gray-200">
          {!sidebarCollapsed && (
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-yellow-400 to-yellow-500 flex items-center justify-center">
                <span className="text-gray-900 font-bold text-sm">M</span>
              </div>
              <div>
                <div className="text-sm font-semibold text-gray-900">Менеджер</div>
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

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {menuItems.map((item) => (
            <NavItem key={item.path} item={item} collapsed={sidebarCollapsed} />
          ))}
        </nav>

        {/* User section */}
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

      {/* Main content area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 lg:px-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Search */}
            <div className="hidden sm:flex items-center gap-2 bg-gray-100 border border-gray-200 rounded-lg px-3 py-2 w-64 lg:w-80">
              <Search className="w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Поиск клиентов, заявок..."
                className="bg-transparent border-none outline-none text-sm text-gray-900 placeholder-gray-400 w-full"
              />
              <kbd className="hidden lg:inline-flex px-1.5 py-0.5 text-[10px] text-gray-400 bg-gray-200 rounded">
                /
              </kbd>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Notifications */}
            <button className="relative p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-yellow-500 rounded-full"></span>
            </button>
          </div>
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

export default EmployeeLayout;
