import React, { useState, useEffect, useRef } from 'react';
import { useEmployeeAuth } from '../../context/EmployeeAuthContext';
import {
  Bell,
  X,
  CheckCheck,
  Trash2,
  User,
  FileText,
  DollarSign,
  BookOpen,
  AlertCircle,
  Phone,
  Settings,
  ChevronRight
} from 'lucide-react';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const iconMap = {
  bell: Bell,
  user: User,
  file: FileText,
  money: DollarSign,
  book: BookOpen,
  alert: AlertCircle,
  phone: Phone,
  settings: Settings
};

const typeColors = {
  callback: 'from-blue-500 to-blue-600',
  client: 'from-emerald-500 to-emerald-600',
  contract: 'from-violet-500 to-violet-600',
  quote: 'from-amber-500 to-amber-600',
  invoice: 'from-green-500 to-green-600',
  payment: 'from-emerald-500 to-emerald-600',
  course: 'from-purple-500 to-purple-600',
  system: 'from-gray-500 to-gray-600'
};

const NotificationCenter = () => {
  const { authFetch } = useEmployeeAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const panelRef = useRef(null);

  const fetchNotifications = async () => {
    try {
      const response = await authFetch(API_URL + '/api/notifications?limit=30');
      if (response.ok) {
        const data = await response.json();
        setNotifications(data.notifications);
        setUnreadCount(data.unread_count);
      }
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (panelRef.current && !panelRef.current.contains(event.target)) {
        const bellButton = document.getElementById('notification-bell');
        if (bellButton && !bellButton.contains(event.target)) {
          setIsOpen(false);
        }
      }
    };
    
    const handleEscape = (event) => {
      if (event.key === 'Escape') setIsOpen(false);
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

  const markAsRead = async (id) => {
    try {
      await authFetch(API_URL + '/api/notifications/' + id + '/read', { method: 'PUT' });
      setNotifications(prev => 
        prev.map(n => n.id === id ? { ...n, is_read: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Failed to mark as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      await authFetch(API_URL + '/api/notifications/read-all', { method: 'PUT' });
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
      toast.success('Все уведомления прочитаны');
    } catch (error) {
      toast.error('Ошибка');
    }
  };

  const deleteNotification = async (id, e) => {
    e.stopPropagation();
    try {
      await authFetch(API_URL + '/api/notifications/' + id, { method: 'DELETE' });
      const wasUnread = notifications.find(n => n.id === id)?.is_read === false;
      setNotifications(prev => prev.filter(n => n.id !== id));
      if (wasUnread) setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      toast.error('Ошибка удаления');
    }
  };

  const clearRead = async () => {
    try {
      await authFetch(API_URL + '/api/notifications/clear-read', { method: 'DELETE' });
      setNotifications(prev => prev.filter(n => !n.is_read));
      toast.success('Прочитанные удалены');
    } catch (error) {
      toast.error('Ошибка');
    }
  };

  const handleNotificationClick = (notification) => {
    if (!notification.is_read) {
      markAsRead(notification.id);
    }
    if (notification.link) {
      window.location.href = notification.link;
    }
  };

  const formatTime = (dateStr) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now - date;
    
    if (diff < 60000) return 'Только что';
    if (diff < 3600000) return Math.floor(diff / 60000) + ' мин назад';
    if (diff < 86400000) return Math.floor(diff / 3600000) + ' ч назад';
    if (diff < 172800000) return 'Вчера';
    
    return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
  };

  return (
    <>
      {/* Bell Button */}
      <button
        id="notification-bell"
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-lg hover:bg-gray-100 transition-colors group"
      >
        <Bell className={'w-5 h-5 transition-colors ' + (unreadCount > 0 ? 'text-amber-500' : 'text-gray-500 group-hover:text-gray-700')} />
        
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center bg-red-500 text-white text-xs font-bold rounded-full px-1 animate-pulse">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/20 z-40 transition-opacity"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sliding Panel */}
      <div
        ref={panelRef}
        className={'fixed top-0 right-0 h-full w-80 bg-white shadow-2xl z-50 transform transition-transform duration-300 ease-out ' + (isOpen ? 'translate-x-0' : 'translate-x-full')}
      >
        {/* Header */}
        <div className="px-4 py-4 bg-gradient-to-r from-violet-600 to-purple-600 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bell className="w-5 h-5" />
              <h3 className="font-semibold">Уведомления</h3>
              {unreadCount > 0 && (
                <span className="bg-white/20 text-white text-xs font-medium px-2 py-0.5 rounded-full">
                  {unreadCount}
                </span>
              )}
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 hover:bg-white/20 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          
          {/* Actions */}
          {notifications.length > 0 && (
            <div className="flex items-center gap-2 mt-3">
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="flex items-center gap-1 text-xs bg-white/20 hover:bg-white/30 px-2 py-1 rounded transition-colors"
                >
                  <CheckCheck className="w-3 h-3" />
                  Прочитать все
                </button>
              )}
              {notifications.some(n => n.is_read) && (
                <button
                  onClick={clearRead}
                  className="flex items-center gap-1 text-xs bg-white/20 hover:bg-white/30 px-2 py-1 rounded transition-colors"
                >
                  <Trash2 className="w-3 h-3" />
                  Очистить
                </button>
              )}
            </div>
          )}
        </div>

        {/* Notifications List */}
        <div className="h-[calc(100%-88px)] overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400">
              <Bell className="w-16 h-16 mb-4 opacity-30" />
              <p className="text-lg font-medium">Нет уведомлений</p>
              <p className="text-sm">Здесь появятся новые события</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {notifications.map((notification) => {
                const Icon = iconMap[notification.icon] || Bell;
                const colorClass = typeColors[notification.type] || typeColors.system;
                
                return (
                  <div
                    key={notification.id}
                    onClick={() => handleNotificationClick(notification)}
                    className={'px-4 py-3 flex items-start gap-3 cursor-pointer transition-all hover:bg-gray-50 group ' + (!notification.is_read ? 'bg-violet-50/50 border-l-4 border-l-violet-500' : 'border-l-4 border-l-transparent')}
                  >
                    <div className={'w-9 h-9 rounded-lg bg-gradient-to-br flex items-center justify-center flex-shrink-0 shadow-sm ' + colorClass}>
                      <Icon className="w-4 h-4 text-white" />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className={'text-sm leading-tight ' + (!notification.is_read ? 'font-semibold text-gray-900' : 'text-gray-700')}>
                          {notification.title}
                        </p>
                        <button
                          onClick={(e) => deleteNotification(notification.id, e)}
                          className="p-1 hover:bg-gray-200 rounded opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                        >
                          <X className="w-3 h-3 text-gray-400" />
                        </button>
                      </div>
                      <p className="text-sm text-gray-500 truncate mt-0.5">{notification.message}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-gray-400">{formatTime(notification.created_at)}</span>
                        {!notification.is_read && (
                          <span className="w-1.5 h-1.5 bg-violet-500 rounded-full"></span>
                        )}
                      </div>
                    </div>
                    
                    {notification.link && (
                      <ChevronRight className="w-4 h-4 text-gray-300 flex-shrink-0 mt-1 group-hover:text-gray-500 transition-colors" />
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default NotificationCenter;
