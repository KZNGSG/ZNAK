import React, { useState, useEffect, useRef } from 'react';
import { useEmployeeAuth } from '../../context/EmployeeAuthContext';
import { Mail, Inbox, Send, RefreshCw, Search, User, Reply, X, ChevronRight, Trash2, Calendar, BarChart3, ArrowUpRight, ArrowDownLeft, Paperclip, FileText, Settings, Check, Users } from 'lucide-react';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const EmployeeEmail = () => {
  const { authFetch, user } = useEmployeeAuth();
  const [accounts, setAccounts] = useState([]);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [selectedFolder, setSelectedFolder] = useState('INBOX');
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCompose, setShowCompose] = useState(false);
  const [unreadCounts, setUnreadCounts] = useState({});
  const [deleting, setDeleting] = useState(false);
  const [stats, setStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(true);

  // Настройки доступа (только для админа)
  const [showAccessSettings, setShowAccessSettings] = useState(false);
  const [accessData, setAccessData] = useState({ employees: [], available_accounts: [] });
  const [accessLoading, setAccessLoading] = useState(false);
  const [savingAccess, setSavingAccess] = useState(null);

  const [composeData, setComposeData] = useState({ to: '', subject: '', body: '', from_account: '' });
  const [attachments, setAttachments] = useState([]);
  const [sending, setSending] = useState(false);
  const fileInputRef = useRef(null);

  const MAX_FILE_SIZE = 10 * 1024 * 1024;
  const MAX_TOTAL_SIZE = 25 * 1024 * 1024;
  const ALLOWED_EXTENSIONS = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'jpg', 'jpeg', 'png', 'gif', 'zip', 'rar', 'txt', 'csv'];

  const isSuperadmin = user?.role === 'superadmin';

  useEffect(() => {
    fetchAccounts();
    fetchUnreadCounts();
    fetchStats();
  }, []);

  useEffect(() => {
    if (selectedAccount) {
      fetchMessages();
    } else {
      setMessages([]);
    }
  }, [selectedAccount, selectedFolder]);

  const fetchAccounts = async () => {
    try {
      const response = await authFetch(`${API_URL}/api/email/accounts`);
      const data = await response.json();
      setAccounts(data.accounts || []);
    } catch (error) { console.error('Error fetching accounts:', error); }
  };

  const fetchUnreadCounts = async () => {
    try {
      const response = await authFetch(`${API_URL}/api/email/unread-count`);
      const data = await response.json();
      const counts = {};
      data.accounts?.forEach(acc => { counts[acc.email] = acc.unread; });
      setUnreadCounts(counts);
    } catch (error) { console.error('Error fetching unread counts:', error); }
  };

  const fetchStats = async () => {
    setStatsLoading(true);
    try {
      const response = await authFetch(`${API_URL}/api/email/stats`);
      const data = await response.json();
      setStats(data);
    } catch (error) {
      console.error('Error fetching stats:', error);
      setStats(null);
    }
    finally { setStatsLoading(false); }
  };

  const fetchAccessSettings = async () => {
    setAccessLoading(true);
    try {
      const response = await authFetch(`${API_URL}/api/email/access`);
      const data = await response.json();
      setAccessData(data);
    } catch (error) {
      console.error('Error fetching access settings:', error);
      toast.error('Ошибка загрузки настроек');
    }
    finally { setAccessLoading(false); }
  };

  const handleOpenAccessSettings = () => {
    setShowAccessSettings(true);
    fetchAccessSettings();
  };

  const toggleEmailAccess = async (employeeId, email, currentAccess) => {
    const hasAccess = currentAccess.includes(email);
    const newAccess = hasAccess
      ? currentAccess.filter(e => e !== email)
      : [...currentAccess, email];

    setSavingAccess(employeeId);
    try {
      const response = await authFetch(`${API_URL}/api/email/access`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: employeeId, email_access: newAccess })
      });

      if (response.ok) {
        setAccessData(prev => ({
          ...prev,
          employees: prev.employees.map(emp =>
            emp.id === employeeId ? { ...emp, email_access: newAccess } : emp
          )
        }));
        toast.success('Доступ обновлён');
      } else {
        toast.error('Ошибка сохранения');
      }
    } catch (error) {
      toast.error('Ошибка сохранения');
    }
    finally { setSavingAccess(null); }
  };

  const fetchMessages = async () => {
    if (!selectedAccount) return;
    setLoading(true);
    try {
      const url = `${API_URL}/api/email/messages?account=${selectedAccount.email}&folder=${selectedFolder}&limit=100`;
      const response = await authFetch(url);
      const data = await response.json();
      setMessages(data.messages || []);
    } catch (error) { console.error('Error fetching messages:', error); toast.error('Ошибка загрузки писем'); }
    finally { setLoading(false); }
  };

  const handleRefresh = () => {
    if (selectedAccount) fetchMessages();
    fetchUnreadCounts();
    fetchStats();
    toast.success('Обновлено');
  };

  const handleSelectAccount = (acc) => {
    setSelectedAccount(acc);
    setSelectedFolder('INBOX');
    setSelectedMessage(null);
    setComposeData(prev => ({ ...prev, from_account: acc.email }));
  };

  const handleSelectMessage = async (msg) => {
    setSelectedMessage(msg);
    if (!msg.is_read && selectedFolder === 'INBOX') {
      try {
        await authFetch(`${API_URL}/api/email/mark-read`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ account: msg.account, email_id: msg.id }) });
        setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, is_read: true } : m));
        fetchUnreadCounts();
      } catch (error) { console.error('Error marking as read:', error); }
    }
  };

  const handleDeleteMessage = async (msg) => {
    if (!confirm('Удалить это письмо?')) return;
    setDeleting(true);
    try {
      const response = await authFetch(`${API_URL}/api/email/delete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ account: msg.account || selectedAccount.email, email_id: msg.id, folder: selectedFolder })
      });
      if (response.ok) {
        toast.success('Письмо удалено');
        setMessages(prev => prev.filter(m => m.id !== msg.id));
        if (selectedMessage?.id === msg.id) setSelectedMessage(null);
        fetchUnreadCounts();
      } else {
        const err = await response.json();
        toast.error(err.detail || 'Ошибка удаления');
      }
    } catch (error) { toast.error('Ошибка удаления'); }
    finally { setDeleting(false); }
  };

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    const currentTotalSize = attachments.reduce((sum, f) => sum + f.size, 0);

    for (const file of files) {
      const ext = file.name.split('.').pop().toLowerCase();
      if (!ALLOWED_EXTENSIONS.includes(ext)) {
        toast.error(`Недопустимый тип файла: ${ext}`);
        continue;
      }
      if (file.size > MAX_FILE_SIZE) {
        toast.error(`Файл ${file.name} слишком большой (макс 10MB)`);
        continue;
      }
      if (currentTotalSize + file.size > MAX_TOTAL_SIZE) {
        toast.error('Общий размер файлов превышает 25MB');
        break;
      }
      if (!attachments.find(f => f.name === file.name)) {
        setAttachments(prev => [...prev, file]);
      }
    }
    e.target.value = '';
  };

  const removeAttachment = (fileName) => {
    setAttachments(prev => prev.filter(f => f.name !== fileName));
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const handleSendEmail = async () => {
    if (!composeData.to || !composeData.subject || !composeData.body) { toast.error('Заполните все поля'); return; }
    setSending(true);
    try {
      const formData = new FormData();
      formData.append('to', composeData.to);
      formData.append('subject', composeData.subject);
      formData.append('body', composeData.body);
      formData.append('from_account', composeData.from_account || selectedAccount?.email || accounts[0]?.email);

      attachments.forEach(file => {
        formData.append('files', file);
      });

      const response = await authFetch(`${API_URL}/api/email/send`, {
        method: 'POST',
        body: formData
      });

      if (response.ok) {
        toast.success('Письмо отправлено!');
        setShowCompose(false);
        setComposeData({ to: '', subject: '', body: '', from_account: selectedAccount?.email || accounts[0]?.email || '' });
        setAttachments([]);
        if (selectedFolder === 'INBOX.Sent') fetchMessages();
        fetchStats();
      }
      else { const err = await response.json(); toast.error(err.detail || 'Ошибка отправки'); }
    } catch (error) { toast.error('Ошибка отправки'); }
    finally { setSending(false); }
  };

  const handleReply = (msg) => {
    const fromMatch = msg.from?.match(/<(.+)>/);
    setComposeData({
      to: fromMatch ? fromMatch[1] : msg.from,
      subject: `Re: ${msg.subject}`,
      body: `\n\n--- Исходное сообщение ---\nОт: ${msg.from}\nДата: ${new Date(msg.date).toLocaleString('ru')}\n\n${msg.body}`,
      from_account: selectedAccount?.email
    });
    setAttachments([]);
    setShowCompose(true);
  };

  const filteredMessages = messages.filter(msg => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return msg.subject?.toLowerCase().includes(search) || msg.from?.toLowerCase().includes(search) || msg.body?.toLowerCase().includes(search);
  });

  const totalUnread = Object.values(unreadCounts).reduce((a, b) => a + b, 0);

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now = new Date();
    if (date.toDateString() === now.toDateString()) return date.toLocaleTimeString('ru', { hour: '2-digit', minute: '2-digit' });
    return date.toLocaleDateString('ru', { day: 'numeric', month: 'short' });
  };

  const extractName = (from) => {
    if (!from) return 'Неизвестно';
    const match = from.match(/^([^<]+)</);
    if (match) return match[1].trim().replace(/"/g, '');
    const atIdx = from.indexOf('@');
    return atIdx > 0 ? from.substring(0, atIdx) : from;
  };

  // Если ящик не выбран - показываем дашборд со статистикой
  if (!selectedAccount) {
    return (
      <div className="h-[calc(100vh-120px)] flex flex-col overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold text-gray-900">Почта</h1>
            {totalUnread > 0 && <span className="px-3 py-1 bg-red-500 text-white text-sm font-bold rounded-full animate-pulse">{totalUnread} новых</span>}
          </div>
          <div className="flex items-center gap-2">
            {isSuperadmin && (
              <button
                onClick={handleOpenAccessSettings}
                className="flex items-center gap-2 px-3 py-2 bg-red-500 hover:bg-red-600 text-white font-medium rounded-lg"
                title="Настройки доступа"
              >
                <Settings className="w-5 h-5" />
                <span className="hidden sm:inline">Доступы</span>
              </button>
            )}
            <button onClick={handleRefresh} className="p-2 hover:bg-gray-100 rounded-lg" title="Обновить">
              <RefreshCw className={`w-5 h-5 text-gray-600 ${statsLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Предупреждение если нет доступных ящиков */}
        {accounts.length === 0 && !statsLoading && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6 mb-6">
            <div className="flex items-center gap-3">
              <Mail className="w-8 h-8 text-yellow-600" />
              <div>
                <h3 className="font-semibold text-yellow-800">Нет доступных почтовых ящиков</h3>
                <p className="text-yellow-700 text-sm mt-1">
                  Обратитесь к администратору для получения доступа к почтовым ящикам.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Общая статистика */}
        {accounts.length > 0 && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-blue-400 text-sm">Входящих сегодня</p>
                    <p className="text-3xl font-bold mt-1 text-blue-600">{stats?.today?.received || 0}</p>
                  </div>
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                    <ArrowDownLeft className="w-6 h-6 text-blue-500" />
                  </div>
                </div>
              </div>

              <div className="bg-green-50 border border-green-100 rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-green-400 text-sm">Отправлено сегодня</p>
                    <p className="text-3xl font-bold mt-1 text-green-600">{stats?.today?.sent || 0}</p>
                  </div>
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                    <ArrowUpRight className="w-6 h-6 text-green-500" />
                  </div>
                </div>
              </div>

              <div className="bg-purple-50 border border-purple-100 rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-purple-400 text-sm">За неделю</p>
                    <p className="text-3xl font-bold mt-1 text-purple-600">{stats?.week?.total || 0}</p>
                  </div>
                  <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                    <Calendar className="w-6 h-6 text-purple-500" />
                  </div>
                </div>
              </div>

              <div className="bg-orange-50 border border-orange-100 rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-orange-400 text-sm">Непрочитано</p>
                    <p className="text-3xl font-bold mt-1 text-orange-600">{totalUnread}</p>
                  </div>
                  <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                    <Mail className="w-6 h-6 text-orange-500" />
                  </div>
                </div>
              </div>
            </div>

            {/* Статистика по ящикам */}
            <div className="bg-white rounded-xl border p-5 mb-6">
              <div className="flex items-center gap-2 mb-4">
                <BarChart3 className="w-5 h-5 text-gray-600" />
                <h2 className="font-semibold text-gray-900">Статистика по ящикам</h2>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Ящик</th>
                      <th className="text-center py-3 px-4 text-sm font-medium text-gray-500">Входящих сегодня</th>
                      <th className="text-center py-3 px-4 text-sm font-medium text-gray-500">Отправлено сегодня</th>
                      <th className="text-center py-3 px-4 text-sm font-medium text-gray-500">За неделю</th>
                      <th className="text-center py-3 px-4 text-sm font-medium text-gray-500">Непрочитано</th>
                      <th className="text-center py-3 px-4 text-sm font-medium text-gray-500">Статус</th>
                    </tr>
                  </thead>
                  <tbody>
                    {accounts.map(acc => {
                      const accStats = stats?.accounts?.[acc.email] || {};
                      return (
                        <tr key={acc.email} className="border-b last:border-0 hover:bg-gray-50">
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-3">
                              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${unreadCounts[acc.email] > 0 ? 'bg-red-100' : 'bg-green-100'}`}>
                                <Mail className={`w-5 h-5 ${unreadCounts[acc.email] > 0 ? 'text-red-500' : 'text-green-500'}`} />
                              </div>
                              <div>
                                <p className="font-medium text-gray-900">{acc.name}</p>
                                <p className="text-xs text-gray-500">{acc.email}</p>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span className="inline-flex items-center gap-1 text-blue-600 font-medium">
                              <ArrowDownLeft className="w-4 h-4" />
                              {accStats.today_received || 0}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span className="inline-flex items-center gap-1 text-green-600 font-medium">
                              <ArrowUpRight className="w-4 h-4" />
                              {accStats.today_sent || 0}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span className="font-medium text-gray-700">{accStats.week_total || 0}</span>
                          </td>
                          <td className="py-3 px-4 text-center">
                            {unreadCounts[acc.email] > 0 ? (
                              <span className="px-2 py-1 bg-red-100 text-red-600 text-sm font-medium rounded-full">
                                {unreadCounts[acc.email]}
                              </span>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-center">
                            {unreadCounts[acc.email] > 0 ? (
                              <span className="px-2 py-1 bg-yellow-100 text-yellow-700 text-xs font-medium rounded-full">
                                Требует внимания
                              </span>
                            ) : (
                              <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                                Все прочитано
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Карточки ящиков */}
            <h3 className="font-semibold text-gray-900 mb-3">Перейти к ящику</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {accounts.map(acc => (
                <button
                  key={acc.email}
                  onClick={() => handleSelectAccount(acc)}
                  className={`bg-white rounded-xl border p-4 text-left hover:border-yellow-400 hover:shadow-md transition-all group ${unreadCounts[acc.email] > 0 ? 'border-red-200 bg-red-50/30' : ''}`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center ${unreadCounts[acc.email] > 0 ? 'bg-red-100' : 'bg-yellow-100'}`}>
                      <Mail className={`w-6 h-6 ${unreadCounts[acc.email] > 0 ? 'text-red-500' : 'text-yellow-600'}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900">{acc.name}</p>
                      <p className="text-sm text-gray-500 truncate">{acc.email}</p>
                    </div>
                    {unreadCounts[acc.email] > 0 ? (
                      <span className="px-2.5 py-1 bg-red-500 text-white text-sm font-bold rounded-full animate-pulse">
                        {unreadCounts[acc.email]}
                      </span>
                    ) : (
                      <span className="text-green-500 text-lg">✓</span>
                    )}
                    <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-yellow-500" />
                  </div>
                </button>
              ))}
            </div>
          </>
        )}

        {/* Модалка настроек доступа */}
        {showAccessSettings && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
              <div className="flex items-center justify-between p-4 border-b">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center">
                    <Users className="w-5 h-5 text-yellow-600" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold">Настройки доступа к почте</h2>
                    <p className="text-sm text-gray-500">Укажите какие ящики видит каждый сотрудник</p>
                  </div>
                </div>
                <button onClick={() => setShowAccessSettings(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4">
                {accessLoading ? (
                  <div className="flex items-center justify-center h-32">
                    <RefreshCw className="w-6 h-6 text-gray-400 animate-spin" />
                  </div>
                ) : (
                  <div className="space-y-4">
                    {accessData.employees?.filter(emp => emp.role !== 'superadmin').map(emp => (
                      <div key={emp.id} className="bg-gray-50 rounded-xl p-4">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center border">
                            <User className="w-5 h-5 text-gray-500" />
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{emp.name}</p>
                            <p className="text-sm text-gray-500">{emp.email}</p>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                          {accessData.available_accounts?.map(acc => {
                            const hasAccess = emp.email_access?.includes(acc.email);
                            const isSaving = savingAccess === emp.id;
                            return (
                              <button
                                key={acc.email}
                                onClick={() => toggleEmailAccess(emp.id, acc.email, emp.email_access || [])}
                                disabled={isSaving}
                                className={`flex items-center gap-2 p-2 rounded-lg border text-sm transition-all ${
                                  hasAccess
                                    ? 'bg-green-50 border-green-300 text-green-700'
                                    : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300'
                                } ${isSaving ? 'opacity-50' : ''}`}
                              >
                                <div className={`w-5 h-5 rounded flex items-center justify-center ${
                                  hasAccess ? 'bg-green-500' : 'bg-gray-200'
                                }`}>
                                  {hasAccess && <Check className="w-3 h-3 text-white" />}
                                </div>
                                <span className="truncate">{acc.name}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))}

                    {/* Superadmin info */}
                    <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
                      <div className="flex items-center gap-2 text-yellow-800">
                        <Settings className="w-5 h-5" />
                        <span className="font-medium">Администраторы видят все ящики автоматически</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="p-4 border-t bg-gray-50">
                <button
                  onClick={() => setShowAccessSettings(false)}
                  className="w-full px-4 py-2 bg-yellow-400 hover:bg-yellow-500 text-black font-medium rounded-lg"
                >
                  Готово
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Ящик выбран - показываем письма
  return (
    <div className="h-[calc(100vh-120px)] flex flex-col">
      {/* Шапка */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <button onClick={() => setSelectedAccount(null)} className="p-2 hover:bg-gray-100 rounded-lg" title="Назад к ящикам">
            <ChevronRight className="w-5 h-5 text-gray-600 rotate-180" />
          </button>
          <div>
            <h1 className="text-xl font-semibold text-gray-900">{selectedAccount.name}</h1>
            <p className="text-sm text-gray-500">{selectedAccount.email}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowCompose(true)} className="flex items-center gap-2 px-4 py-2 bg-yellow-400 hover:bg-yellow-500 text-black font-medium rounded-lg">
            <Send className="w-4 h-4" />Написать
          </button>
          <button onClick={handleRefresh} className="p-2 hover:bg-gray-100 rounded-lg" title="Обновить">
            <RefreshCw className={"w-5 h-5 text-gray-600 " + (loading ? "animate-spin" : "")} />
          </button>
        </div>
      </div>

      {/* Табы: Входящие / Отправленные */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => { setSelectedFolder('INBOX'); setSelectedMessage(null); }}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${selectedFolder === 'INBOX' ? 'bg-yellow-400 text-black' : 'bg-white border hover:bg-gray-50'}`}
        >
          <Inbox className="w-4 h-4" />
          Входящие
          {unreadCounts[selectedAccount.email] > 0 && (
            <span className={`px-1.5 py-0.5 text-xs rounded-full ${selectedFolder === 'INBOX' ? 'bg-black/20 text-black' : 'bg-red-500 text-white'}`}>
              {unreadCounts[selectedAccount.email]}
            </span>
          )}
        </button>
        <button
          onClick={() => { setSelectedFolder('INBOX.Sent'); setSelectedMessage(null); }}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${selectedFolder === 'INBOX.Sent' ? 'bg-yellow-400 text-black' : 'bg-white border hover:bg-gray-50'}`}
        >
          <Send className="w-4 h-4" />
          Отправленные
        </button>
      </div>

      {/* Контент */}
      <div className="flex gap-4 flex-1 min-h-0">
        {/* Список писем */}
        <div className="w-96 flex-shrink-0 bg-white rounded-xl border flex flex-col">
          <div className="p-3 border-b">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input type="text" placeholder="Поиск..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm" />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center h-32"><RefreshCw className="w-6 h-6 text-gray-400 animate-spin" /></div>
            ) : filteredMessages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-32 text-gray-500">
                <Mail className="w-8 h-8 mb-2" />
                <p>{selectedFolder === 'INBOX' ? 'Нет входящих' : 'Нет отправленных'}</p>
              </div>
            ) : (
              filteredMessages.map(msg => (
                <div
                  key={msg.id}
                  onClick={() => handleSelectMessage(msg)}
                  className={`p-3 border-b cursor-pointer hover:bg-gray-50 group ${selectedMessage?.id === msg.id ? 'bg-yellow-50 border-l-2 border-l-yellow-400' : ''} ${!msg.is_read && selectedFolder === 'INBOX' ? 'bg-blue-50/50' : ''}`}
                >
                  <div className="flex items-start gap-2">
                    <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                      <User className="w-4 h-4 text-gray-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className={`text-sm truncate ${!msg.is_read && selectedFolder === 'INBOX' ? 'font-semibold' : ''}`}>
                          {selectedFolder === 'INBOX.Sent' ? (msg.to || 'Получатель') : extractName(msg.from)}
                        </span>
                        <span className="text-xs text-gray-500 flex-shrink-0">{formatDate(msg.date)}</span>
                      </div>
                      <p className={`text-sm truncate ${!msg.is_read && selectedFolder === 'INBOX' ? 'font-medium text-gray-900' : 'text-gray-600'}`}>
                        {msg.subject || '(Без темы)'}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      {!msg.is_read && selectedFolder === 'INBOX' && <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0"></div>}
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDeleteMessage(msg); }}
                        className="p-1 opacity-0 group-hover:opacity-100 hover:bg-red-100 rounded transition-opacity"
                        title="Удалить"
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Просмотр письма */}
        <div className="flex-1 bg-white rounded-xl border flex flex-col min-w-0">
          {selectedMessage ? (
            <>
              <div className="p-4 border-b">
                <div className="flex items-start justify-between gap-4">
                  <h2 className="text-lg font-semibold text-gray-900 flex-1">{selectedMessage.subject || '(Без темы)'}</h2>
                  <button
                    onClick={() => handleDeleteMessage(selectedMessage)}
                    disabled={deleting}
                    className="p-2 hover:bg-red-100 rounded-lg text-red-500 flex-shrink-0"
                    title="Удалить письмо"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
                <div className="flex items-center gap-2 mt-2 text-sm text-gray-600">
                  <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                    <User className="w-4 h-4 text-gray-500" />
                  </div>
                  <div>
                    {selectedFolder === 'INBOX' ? (
                      <>
                        <p className="font-medium">От: {extractName(selectedMessage.from)}</p>
                        <p className="text-xs text-gray-400">{selectedMessage.from}</p>
                      </>
                    ) : (
                      <>
                        <p className="font-medium">Кому: {selectedMessage.to}</p>
                        <p className="text-xs text-gray-400">От: {selectedAccount.email}</p>
                      </>
                    )}
                  </div>
                </div>
                <p className="text-xs text-gray-400 mt-2">{new Date(selectedMessage.date).toLocaleString('ru')}</p>
              </div>
              <div className="flex-1 overflow-y-auto p-4">
                <pre className="whitespace-pre-wrap font-sans text-sm">{selectedMessage.body?.replace(/<[^>]*>/g, '')}</pre>
              </div>
              {selectedFolder === 'INBOX' && (
                <div className="p-3 border-t bg-gray-50 flex gap-2">
                  <button onClick={() => handleReply(selectedMessage)} className="flex items-center gap-2 px-4 py-2 bg-white border rounded-lg hover:bg-gray-50 text-sm">
                    <Reply className="w-4 h-4" />Ответить
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-500">
              <div className="text-center">
                <Mail className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p>Выберите письмо</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Модалка написания письма */}
      {showCompose && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold">Новое письмо</h2>
              <button onClick={() => { setShowCompose(false); setAttachments([]); }} className="p-1 hover:bg-gray-100 rounded"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">От кого</label>
                <div className="px-3 py-2 bg-gray-100 rounded-lg text-sm">
                  {selectedAccount?.name} ({selectedAccount?.email})
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Кому *</label>
                <input type="email" value={composeData.to} onChange={(e) => setComposeData({ ...composeData, to: e.target.value })} placeholder="email@example.com" className="w-full px-3 py-2 border rounded-lg" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Тема *</label>
                <input type="text" value={composeData.subject} onChange={(e) => setComposeData({ ...composeData, subject: e.target.value })} placeholder="Тема письма" className="w-full px-3 py-2 border rounded-lg" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Сообщение *</label>
                <textarea value={composeData.body} onChange={(e) => setComposeData({ ...composeData, body: e.target.value })} placeholder="Текст письма..." rows={8} className="w-full px-3 py-2 border rounded-lg resize-none" />
              </div>

              {/* Вложения */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Вложения</label>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileSelect}
                  multiple
                  className="hidden"
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.gif,.zip,.rar,.txt,.csv"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-2 px-4 py-2 border border-dashed border-gray-300 rounded-lg hover:border-yellow-400 hover:bg-yellow-50 transition-colors text-sm text-gray-600"
                >
                  <Paperclip className="w-4 h-4" />
                  Прикрепить файлы
                </button>
                <p className="text-xs text-gray-400 mt-1">Макс. 10MB на файл, 25MB всего. PDF, DOC, XLS, JPG, PNG, ZIP</p>

                {/* Список вложений */}
                {attachments.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {attachments.map(file => (
                      <div key={file.name} className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg">
                        <FileText className="w-5 h-5 text-gray-400" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-700 truncate">{file.name}</p>
                          <p className="text-xs text-gray-400">{formatFileSize(file.size)}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeAttachment(file.name)}
                          className="p-1 hover:bg-red-100 rounded text-red-500"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                    <p className="text-xs text-gray-500">
                      Всего: {formatFileSize(attachments.reduce((sum, f) => sum + f.size, 0))}
                    </p>
                  </div>
                )}
              </div>
            </div>
            <div className="flex justify-end gap-3 p-4 border-t bg-gray-50 rounded-b-2xl">
              <button onClick={() => { setShowCompose(false); setAttachments([]); }} className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg">Отмена</button>
              <button onClick={handleSendEmail} disabled={sending} className="flex items-center gap-2 px-4 py-2 bg-yellow-400 hover:bg-yellow-500 text-black font-medium rounded-lg disabled:opacity-50">
                {sending ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                {sending ? 'Отправка...' : (attachments.length > 0 ? `Отправить (${attachments.length} файл)` : 'Отправить')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmployeeEmail;
