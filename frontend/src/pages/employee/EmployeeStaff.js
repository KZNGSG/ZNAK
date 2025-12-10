import React, { useState, useEffect } from 'react';
import { useEmployeeAuth } from '../../context/EmployeeAuthContext';
import {
  Users,
  UserPlus,
  Mail,
  Shield,
  ShieldCheck,
  User,
  ToggleLeft,
  ToggleRight,
  Trash2,
  X,
  Eye,
  EyeOff,
  AlertCircle,
  Send,
  CheckCircle,
  Clock
} from 'lucide-react';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const EmployeeStaff = () => {
  const { authFetch, isSuperAdmin } = useEmployeeAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [newUser, setNewUser] = useState({ email: '', password: '', role: 'employee' });
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Модальное окно для приглашения
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteUser, setInviteUser] = useState(null);
  const [invitePassword, setInvitePassword] = useState('');
  const [inviteSubmitting, setInviteSubmitting] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await authFetch(`${API_URL}/api/admin/users`);
      if (response.ok) {
        const data = await response.json();
        setUsers(data);
      }
    } catch (error) {
      console.error('Failed to fetch users:', error);
      toast.error('Ошибка загрузки пользователей');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    if (!newUser.email || !newUser.password) {
      toast.error('Заполните все поля');
      return;
    }

    setSubmitting(true);
    try {
      const response = await authFetch(`${API_URL}/api/admin/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newUser)
      });

      if (response.ok) {
        toast.success('Пользователь создан');
        setShowModal(false);
        setNewUser({ email: '', password: '', role: 'employee' });
        fetchUsers();
      } else {
        const error = await response.json();
        toast.error(error.detail || 'Ошибка создания');
      }
    } catch (error) {
      console.error('Failed to create user:', error);
      toast.error('Ошибка создания');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleActive = async (userId, currentStatus) => {
    try {
      const response = await authFetch(`${API_URL}/api/admin/users/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !currentStatus })
      });

      if (response.ok) {
        toast.success(currentStatus ? 'Пользователь деактивирован' : 'Пользователь активирован');
        fetchUsers();
      }
    } catch (error) {
      console.error('Failed to toggle user:', error);
      toast.error('Ошибка обновления');
    }
  };

  const handleChangeRole = async (userId, newRole) => {
    try {
      const response = await authFetch(`${API_URL}/api/admin/users/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole })
      });

      if (response.ok) {
        toast.success('Роль изменена');
        fetchUsers();
      }
    } catch (error) {
      console.error('Failed to change role:', error);
      toast.error('Ошибка изменения роли');
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!window.confirm('Удалить пользователя?')) return;

    try {
      const response = await authFetch(`${API_URL}/api/admin/users/${userId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        toast.success('Пользователь удалён');
        fetchUsers();
      } else {
        const error = await response.json();
        toast.error(error.detail || 'Ошибка удаления');
      }
    } catch (error) {
      console.error('Failed to delete user:', error);
      toast.error('Ошибка удаления');
    }
  };

  // Открыть модальное окно приглашения
  const openInviteModal = (user) => {
    setInviteUser(user);
    setInvitePassword('');
    setShowInviteModal(true);
  };

  // Отправить приглашение
  const handleSendInvitation = async (e) => {
    e.preventDefault();
    if (!invitePassword || invitePassword.length < 6) {
      toast.error('Пароль должен быть минимум 6 символов');
      return;
    }

    setInviteSubmitting(true);
    try {
      const response = await authFetch(`${API_URL}/api/admin/users/${inviteUser.id}/send-invitation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: invitePassword })
      });

      if (response.ok) {
        toast.success('Приглашение отправлено на ' + inviteUser.email);
        setShowInviteModal(false);
        setInviteUser(null);
        setInvitePassword('');
        fetchUsers();
      } else {
        const error = await response.json();
        toast.error(error.detail || 'Ошибка отправки');
      }
    } catch (error) {
      console.error('Failed to send invitation:', error);
      toast.error('Ошибка отправки приглашения');
    } finally {
      setInviteSubmitting(false);
    }
  };

  // Получить статус приглашения
  const getInvitationStatus = (user) => {
    if (user.last_login) {
      return { text: 'Активен', color: 'text-emerald-600', bg: 'bg-emerald-50', icon: CheckCircle };
    }
    if (user.invitation_sent_at) {
      return { text: 'Ожидает входа', color: 'text-amber-600', bg: 'bg-amber-50', icon: Clock };
    }
    return { text: 'Не приглашён', color: 'text-gray-500', bg: 'bg-gray-50', icon: Mail };
  };

  const getRoleBadge = (role) => {
    const styles = {
      superadmin: { bg: 'bg-purple-100', border: 'border-purple-200', text: 'text-purple-700', icon: ShieldCheck, label: 'Супер-админ' },
      employee: { bg: 'bg-emerald-100', border: 'border-emerald-200', text: 'text-emerald-700', icon: Shield, label: 'Сотрудник' },
      client: { bg: 'bg-gray-100', border: 'border-gray-200', text: 'text-gray-600', icon: User, label: 'Клиент' }
    };
    const style = styles[role] || styles.client;
    const Icon = style.icon;

    return (
      <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium ${style.bg} ${style.border} ${style.text} border`}>
        <Icon className="w-3 h-3" />
        {style.label}
      </span>
    );
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('ru-RU');
  };

  // Защищённый email главного администратора - нельзя деактивировать/удалить
  const PROTECTED_ADMIN_EMAIL = 'damirslk@mail.ru';

  // Фильтруем только сотрудников и superadmin (клиенты показываются в разделе "Клиенты")
  const staffUsers = users.filter(u => ['employee', 'superadmin'].includes(u.role));

  if (!isSuperAdmin) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <AlertCircle className="w-12 h-12 text-red-400 mb-4" />
        <h2 className="text-xl font-medium text-gray-900 mb-2">Доступ запрещён</h2>
        <p className="text-gray-500">Управление сотрудниками доступно только суперадминистратору</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-gray-200 border-t-yellow-500"></div>
          <p className="text-gray-500 text-sm">Загрузка...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Управление пользователями</h1>
          <p className="text-gray-500 mt-1">Сотрудники системы</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-yellow-500 hover:bg-yellow-600 text-gray-900 text-sm font-medium rounded-xl transition-colors"
        >
          <UserPlus className="w-4 h-4" />
          Добавить сотрудника
        </button>
      </div>

      {/* Staff Users */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
        <div className="px-5 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900 flex items-center gap-2">
            <Shield className="w-5 h-5 text-emerald-500" />
            Сотрудники ({staffUsers.length})
          </h2>
        </div>

        {staffUsers.length > 0 ? (
          <div className="divide-y divide-gray-100">
            {staffUsers.map((user) => (
              <div key={user.id} className="px-5 py-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                      user.is_active ? 'bg-emerald-100 text-emerald-600' : 'bg-gray-100 text-gray-400'
                    }`}>
                      <Mail className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900">{user.email}</span>
                        {!user.is_active && (
                          <span className="text-xs text-red-500 bg-red-50 px-2 py-0.5 rounded">Неактивен</span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-gray-500 mt-1">
                        {getRoleBadge(user.role)}
                        <span>Создан: {formatDate(user.created_at)}</span>
                        {/* Статус приглашения */}
                        {(() => {
                          const status = getInvitationStatus(user);
                          const StatusIcon = status.icon;
                          return (
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs ${status.bg} ${status.color}`}>
                              <StatusIcon className="w-3 h-3" />
                              {status.text}
                            </span>
                          );
                        })()}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Кнопка приглашения - не показываем для главного админа */}
                    {user.email.toLowerCase() !== PROTECTED_ADMIN_EMAIL && (
                      <button
                        onClick={() => openInviteModal(user)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
                        title="Отправить приглашение на email"
                      >
                        <Send className="w-4 h-4" />
                        Пригласить
                      </button>
                    )}

                    {/* Role selector - скрыт для защищённого админа */}
                    {user.email.toLowerCase() !== PROTECTED_ADMIN_EMAIL ? (
                      <select
                        value={user.role}
                        onChange={(e) => handleChangeRole(user.id, e.target.value)}
                        className="px-3 py-1.5 text-sm bg-gray-50 border border-gray-200 rounded-lg text-gray-700 focus:outline-none focus:border-yellow-500"
                      >
                        <option value="employee">Сотрудник</option>
                        <option value="superadmin">Супер-админ</option>
                      </select>
                    ) : (
                      <span className="px-3 py-1.5 text-sm bg-purple-50 border border-purple-200 rounded-lg text-purple-700 font-medium">
                        Главный админ
                      </span>
                    )}

                    {/* Toggle Active - скрыт для защищённого админа */}
                    {user.email.toLowerCase() !== PROTECTED_ADMIN_EMAIL && (
                      <button
                        onClick={() => handleToggleActive(user.id, user.is_active)}
                        className={`p-2 rounded-lg transition-colors ${
                          user.is_active
                            ? 'text-emerald-600 hover:bg-emerald-50'
                            : 'text-gray-400 hover:bg-gray-100'
                        }`}
                        title={user.is_active ? 'Деактивировать' : 'Активировать'}
                      >
                        {user.is_active ? <ToggleRight className="w-5 h-5" /> : <ToggleLeft className="w-5 h-5" />}
                      </button>
                    )}

                    {/* Delete - скрыт для защищённого админа */}
                    {user.email.toLowerCase() !== PROTECTED_ADMIN_EMAIL && (
                      <button
                        onClick={() => handleDeleteUser(user.id)}
                        className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        title="Удалить"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="px-5 py-12 text-center">
            <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">Нет сотрудников</p>
          </div>
        )}
      </div>

      {/* Create User Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Добавить сотрудника</h3>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
                <input
                  type="email"
                  value={newUser.email}
                  onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                  placeholder="employee@promarkirui.ru"
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:border-yellow-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Пароль</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={newUser.password}
                    onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                    placeholder="Минимум 6 символов"
                    className="w-full px-4 py-2.5 pr-12 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:border-yellow-500"
                    required
                    minLength={6}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Роль</label>
                <select
                  value={newUser.role}
                  onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:border-yellow-500"
                >
                  <option value="employee">Сотрудник</option>
                  <option value="superadmin">Супер-администратор</option>
                </select>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-2.5 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl font-medium transition-colors"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 px-4 py-2.5 bg-yellow-500 hover:bg-yellow-600 text-gray-900 rounded-xl font-medium transition-colors disabled:opacity-50"
                >
                  {submitting ? 'Создание...' : 'Создать'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Invite User Modal */}
      {showInviteModal && inviteUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Отправить приглашение</h3>
              <button
                onClick={() => { setShowInviteModal(false); setInviteUser(null); }}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSendInvitation} className="p-6 space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <p className="text-sm text-blue-800">
                  Приглашение будет отправлено на: <strong>{inviteUser.email}</strong>
                </p>
                <p className="text-xs text-blue-600 mt-1">
                  В письме будут указаны email и пароль для входа
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Пароль для сотрудника
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={invitePassword}
                    onChange={(e) => setInvitePassword(e.target.value)}
                    placeholder="Введите пароль для отправки"
                    className="w-full px-4 py-2.5 pr-12 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:border-blue-500"
                    required
                    minLength={6}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Этот пароль будет отправлен сотруднику в письме
                </p>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => { setShowInviteModal(false); setInviteUser(null); }}
                  className="flex-1 px-4 py-2.5 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl font-medium transition-colors"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  disabled={inviteSubmitting}
                  className="flex-1 px-4 py-2.5 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-medium transition-colors disabled:opacity-50 inline-flex items-center justify-center gap-2"
                >
                  <Send className="w-4 h-4" />
                  {inviteSubmitting ? 'Отправка...' : 'Отправить'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmployeeStaff;
