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
  X
} from 'lucide-react';

const EmployeeLayout = ({ children }) => {
  const { user, logout } = useEmployeeAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/employee/login');
  };

  const menuItems = [
    {
      path: '/employee',
      icon: LayoutDashboard,
      label: 'Главная',
      description: 'Обзор и статистика'
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
      path: '/employee/quotes',
      icon: FileText,
      label: 'КП',
      description: 'Коммерческие предложения'
    },
    {
      path: '/employee/contracts',
      icon: FileCheck,
      label: 'Договоры',
      description: 'Договоры и акты'
    }
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
            ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20'
            : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200 border border-transparent'
          }
        `}
      >
        <Icon
          className={`w-5 h-5 flex-shrink-0 ${isActive ? 'text-yellow-400' : 'text-slate-500 group-hover:text-slate-300'}`}
          strokeWidth={1.5}
        />
        {!collapsed && (
          <div className="flex-1 min-w-0">
            <div className={`text-sm font-medium ${isActive ? 'text-yellow-400' : ''}`}>
              {item.label}
            </div>
            <div className="text-xs text-slate-600 truncate">
              {item.description}
            </div>
          </div>
        )}
      </Link>
    );
  };

  return (
    <div className="min-h-screen bg-slate-950 flex">
      {/* Mobile menu overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed lg:static inset-y-0 left-0 z-50
          ${sidebarCollapsed ? 'w-[72px]' : 'w-64'}
          ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          bg-slate-900/95 backdrop-blur-sm border-r border-slate-800/50
          transition-all duration-300 flex flex-col
        `}
      >
        {/* Header */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-slate-800/50">
          {!sidebarCollapsed && (
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-yellow-400 to-yellow-500 flex items-center justify-center">
                <span className="text-gray-900 font-bold text-sm">M</span>
              </div>
              <div>
                <div className="text-sm font-semibold text-white">Менеджер</div>
                <div className="text-[10px] text-slate-500 uppercase tracking-wider">Pro.Markiruj</div>
              </div>
            </div>
          )}
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="hidden lg:flex p-2 text-slate-500 hover:text-slate-300 hover:bg-slate-800/50 rounded-lg transition-colors"
          >
            {sidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
          <button
            onClick={() => setMobileMenuOpen(false)}
            className="lg:hidden p-2 text-slate-500 hover:text-slate-300"
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
        <div className="border-t border-slate-800/50 p-3">
          {!sidebarCollapsed ? (
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-slate-700 to-slate-600 flex items-center justify-center">
                <span className="text-slate-300 text-sm font-medium">
                  {user?.email?.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm text-slate-200 truncate">{user?.email}</div>
                <div className="text-xs text-slate-500">
                  {user?.role === 'superadmin' ? 'Супер-админ' : 'Сотрудник'}
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                title="Выйти"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={handleLogout}
              className="w-full flex justify-center p-2 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
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
        <header className="h-16 bg-slate-900/50 backdrop-blur-sm border-b border-slate-800/50 flex items-center justify-between px-4 lg:px-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 rounded-lg"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Search */}
            <div className="hidden sm:flex items-center gap-2 bg-slate-800/50 border border-slate-700/50 rounded-lg px-3 py-2 w-64 lg:w-80">
              <Search className="w-4 h-4 text-slate-500" />
              <input
                type="text"
                placeholder="Поиск клиентов, заявок..."
                className="bg-transparent border-none outline-none text-sm text-slate-200 placeholder-slate-500 w-full"
              />
              <kbd className="hidden lg:inline-flex px-1.5 py-0.5 text-[10px] text-slate-500 bg-slate-700/50 rounded">
                /
              </kbd>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Notifications */}
            <button className="relative p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 rounded-lg transition-colors">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-yellow-400 rounded-full"></span>
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
