import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useEmployeeAuth } from '../../context/EmployeeAuthContext';
import {
  ArrowLeft,
  Phone,
  Mail,
  Building2,
  MapPin,
  Edit3,
  Save,
  X,
  Plus,
  FileText,
  FileCheck,
  Clock,
  PhoneCall,
  MessageSquare,
  Calendar,
  Send,
  TrendingUp,
  UserCheck,
  Star,
  UserX,
  Package,
  History,
  ChevronDown,
  Trash2,
  AlertTriangle,
  Download,
  User,
  CheckSquare
} from 'lucide-react';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const EmployeeClientCard = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { authFetch } = useEmployeeAuth();

  const [client, setClient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editData, setEditData] = useState({});
  const [newInteraction, setNewInteraction] = useState({ type: '', subject: '', description: '' });
  const [showInteractionForm, setShowInteractionForm] = useState(false);
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [loadingDadata, setLoadingDadata] = useState(false);
  const [showContractModal, setShowContractModal] = useState(false);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [taskData, setTaskData] = useState({ title: "", description: "", priority: "normal", due_date: "" });
  const [creatingTask, setCreatingTask] = useState(false);

  const [clientTasks, setClientTasks] = useState([]);
  useEffect(() => {
    fetchClient();
    fetchClientTasks();
  }, [id]);


  const createTask = async () => {
    if (!taskData.title) {
      toast.error("Укажите название задачи");
      return;
    }
    setCreatingTask(true);
    try {
      const response = await authFetch(API_URL + "/api/employee/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...taskData,
          client_id: parseInt(id),
          assigned_to: null // будет назначено текущему пользователю на бэкенде
        })
      });
      if (response.ok) {
        toast.success("Задача создана");
        setShowTaskModal(false);
        setTaskData({ title: "", description: "", priority: "normal", due_date: "" });
      } else {
        const err = await response.json();
        toast.error(err.detail || "Ошибка создания");
      }
    } catch (error) {
      toast.error("Ошибка создания задачи");
    } finally {
      setCreatingTask(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const response = await authFetch(`${API_URL}/api/employee/clients/${id}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        toast.success('Клиент удалён');
        navigate('/employee/clients');
      } else {
        const error = await response.json();
        toast.error(error.detail || 'Ошибка удаления');
      }
    } catch (error) {
      console.error('Failed to delete client:', error);
      toast.error('Ошибка удаления');
    } finally {
      setDeleting(false);
      setShowDeleteModal(false);
    }
  };


  const fetchClientTasks = async () => {
    try {
      const response = await authFetch(API_URL + "/api/employee/tasks?client_id=" + id);
      if (response.ok) {
        const data = await response.json();
        setClientTasks(data.tasks.filter(t => t.client_id === parseInt(id)));
      }
    } catch (error) {
      console.error("Error fetching tasks:", error);
    }
  };

  const fetchClient = async () => {
    try {
      const response = await authFetch(`${API_URL}/api/employee/clients/${id}`);
      if (response.ok) {
        const data = await response.json();
        setClient(data);
        setEditData(data);
      } else {
        toast.error('Клиент не найден');
        navigate('/employee/clients');
      }
    } catch (error) {
      console.error('Failed to fetch client:', error);
      toast.error('Ошибка загрузки');
    } finally {
      setLoading(false);
    }
  };

  const handleLoadFromDadata = async () => {
    const inn = editData.inn?.trim();
    if (!inn || inn.length < 5) {
      toast.error('Введите ИНН (минимум 5 цифр)');
      return;
    }

    setLoadingDadata(true);
    try {
      const response = await authFetch(`${API_URL}/api/company/suggest`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inn: inn })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.suggestions && data.suggestions.length > 0) {
          const company = data.suggestions[0];
          setEditData(prev => ({
            ...prev,
            company_name: company.name || prev.company_name,
            inn: company.inn || prev.inn,
            kpp: company.kpp || prev.kpp,
            ogrn: company.ogrn || prev.ogrn,
            address: company.address || prev.address,
            director_name: company.management_name || prev.director_name,
            company_type: company.type || prev.company_type
          }));
          toast.success('Данные компании загружены');
        } else {
          toast.error('Компания не найдена по ИНН');
        }
      } else {
        toast.error('Ошибка загрузки данных');
      }
    } catch (error) {
      console.error('Failed to load from DaData:', error);
      toast.error('Ошибка подключения к сервису');
    } finally {
      setLoadingDadata(false);
    }
  };

  const handleSave = async () => {
    try {
      const response = await authFetch(`${API_URL}/api/employee/clients/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editData)
      });

      if (response.ok) {
        toast.success('Данные сохранены');
        setEditing(false);
        fetchClient();
    fetchClientTasks();
      } else {
        toast.error('Ошибка сохранения');
      }
    } catch (error) {
      console.error('Failed to save:', error);
      toast.error('Ошибка сохранения');
    }
  };

  const handleStatusChange = async (newStatus) => {
    try {
      const response = await authFetch(`${API_URL}/api/employee/clients/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });

      if (response.ok) {
        toast.success('Статус изменён');
        fetchClient();
    fetchClientTasks();
      }
    } catch (error) {
      console.error('Failed to update status:', error);
    }
    setStatusDropdownOpen(false);
  };

  const handleAddInteraction = async () => {
    if (!newInteraction.type) {
      toast.error('Выберите тип взаимодействия');
      return;
    }

    try {
      const response = await authFetch(`${API_URL}/api/employee/clients/${id}/history`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newInteraction)
      });

      if (response.ok) {
        toast.success('Запись добавлена');
        setNewInteraction({ type: '', subject: '', description: '' });
        setShowInteractionForm(false);
        fetchClient();
    fetchClientTasks();
      }
    } catch (error) {
      console.error('Failed to add interaction:', error);
      toast.error('Ошибка добавления');
    }
  };

  const handleCreateContract = async (quoteId) => {
    try {
      const response = await authFetch(`${API_URL}/api/employee/clients/${id}/contract?quote_id=${quoteId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      if (response.ok) {
        const data = await response.json();
        toast.success(`Договор ${data.contract_number} создан`);
        fetchClient();
    fetchClientTasks();
      } else {
        try {
          const error = await response.json();
          toast.error(error.detail || 'Ошибка создания договора');
        } catch {
          toast.error('Ошибка создания договора');
        }
      }
    } catch (error) {
      console.error('Failed to create contract:', error);
      toast.error('Ошибка создания договора');
    }
  };

  const handleCreateContractDirect = async () => {
    if (!client.inn) {
      toast.error('Заполните ИНН клиента перед созданием договора');
      return;
    }

    try {
      const response = await authFetch(`${API_URL}/api/employee/clients/${id}/contract/direct`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      if (response.ok) {
        const data = await response.json();
        toast.success(`Договор ${data.contract_number} создан`);
        fetchClient();
    fetchClientTasks();
      } else {
        try {
          const error = await response.json();
          toast.error(error.detail || 'Ошибка создания договора');
        } catch {
          toast.error('Ошибка создания договора');
        }
      }
    } catch (error) {
      console.error('Failed to create contract:', error);
      toast.error('Ошибка создания договора');
    }
  };

  const handleDownloadContract = async (contractId) => {
    try {
      const response = await authFetch(`${API_URL}/api/employee/contracts/${contractId}/pdf`);

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Договор_${contractId}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        toast.success('Договор скачан');
      } else {
        toast.error('Ошибка скачивания договора');
      }
    } catch (error) {
      console.error('Failed to download contract:', error);
      toast.error('Ошибка скачивания договора');
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      lead: { bg: 'bg-yellow-100', border: 'border-yellow-200', text: 'text-yellow-700', icon: TrendingUp, label: 'Лид' },
      active: { bg: 'bg-emerald-100', border: 'border-emerald-200', text: 'text-emerald-700', icon: UserCheck, label: 'Активный' },
      regular: { bg: 'bg-amber-100', border: 'border-amber-200', text: 'text-amber-700', icon: Star, label: 'Постоянный' },
      inactive: { bg: 'bg-gray-100', border: 'border-gray-200', text: 'text-gray-600', icon: UserX, label: 'Неактивный' }
    };
    const style = styles[status] || styles.lead;
    const Icon = style.icon;

    return (
      <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium ${style.bg} ${style.border} ${style.text} border`}>
        <Icon className="w-4 h-4" />
        {style.label}
      </span>
    );
  };

  const getInteractionIcon = (type) => {
    const icons = {
      call: PhoneCall,
      email: Mail,
      meeting: Calendar,
      document_sent: Send,
      quote_created: FileText,
      contract_created: FileCheck,
      note: MessageSquare,
      callback: Phone
    };
    return icons[type] || MessageSquare;
  };

  const getInteractionLabel = (type) => {
    const labels = {
      call: 'Звонок',
      email: 'Email',
      meeting: 'Встреча',
      document_sent: 'Документ отправлен',
      quote_created: 'КП создано',
      contract_created: 'Договор создан',
      note: 'Заметка',
      callback: 'Заявка'
    };
    return labels[type] || type;
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleString('ru-RU', {
      day: 'numeric',
      month: 'long',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

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

  if (!client) return null;

  const statusOptions = [
    { value: 'lead', label: 'Лид', icon: TrendingUp },
    { value: 'active', label: 'Активный', icon: UserCheck },
    { value: 'regular', label: 'Постоянный', icon: Star },
    { value: 'inactive', label: 'Неактивный', icon: UserX }
  ];

  const interactionTypes = [
    { value: 'call', label: 'Звонок', icon: PhoneCall },
    { value: 'email', label: 'Email', icon: Mail },
    { value: 'meeting', label: 'Встреча', icon: Calendar },
    { value: 'note', label: 'Заметка', icon: MessageSquare }
  ];

  return (
    <div className="space-y-6">
      {/* Warning if no INN */}
      {!client.inn && !editing && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-red-700 font-medium">Для создания договора заполните ИНН компании</p>
            <p className="text-red-600 text-sm mt-1">Нажмите «Редактировать» → введите ИНН → «Сохранить»</p>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/employee/clients')}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">{client.contact_name}</h1>
            {client.company_name && (
              <p className="text-gray-500 flex items-center gap-2 mt-1">
                <Building2 className="w-4 h-4" />
                {client.company_name}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Status Dropdown */}
          <div className="relative">
            <button
              onClick={() => setStatusDropdownOpen(!statusDropdownOpen)}
              className="flex items-center gap-2"
            >
              {getStatusBadge(client.status)}
              <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${statusDropdownOpen ? 'rotate-180' : ''}`} />
            </button>
            {statusDropdownOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setStatusDropdownOpen(false)} />
                <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-xl shadow-lg z-20 overflow-hidden">
                  {statusOptions.map((option) => {
                    const Icon = option.icon;
                    return (
                      <button
                        key={option.value}
                        onClick={() => handleStatusChange(option.value)}
                        className={`w-full flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-gray-50 transition-colors ${
                          client.status === option.value ? 'bg-gray-50 text-gray-900' : 'text-gray-600'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                        {option.label}
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>

          {!editing ? (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setEditing(true)}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
              >
                <Edit3 className="w-4 h-4" />
                Редактировать
              </button>
              <button
                onClick={() => setShowDeleteModal(true)}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-xl transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                Удалить
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={() => { setEditing(false); setEditData(client); }}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-500 hover:text-gray-700 transition-colors"
              >
                <X className="w-4 h-4" />
                Отмена
              </button>
              <button
                onClick={handleSave}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-900 bg-yellow-500 hover:bg-yellow-600 rounded-xl transition-colors"
              >
                <Save className="w-4 h-4" />
                Сохранить
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Main Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Contact & Company Info */}
          <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Информация о клиенте</h2>

            {editing ? (
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-600 mb-1.5">Контактное лицо</label>
                  <input
                    type="text"
                    value={editData.contact_name || ''}
                    onChange={(e) => setEditData({ ...editData, contact_name: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 focus:outline-none focus:border-yellow-500"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1.5">Должность</label>
                  <input
                    type="text"
                    value={editData.contact_position || ''}
                    onChange={(e) => setEditData({ ...editData, contact_position: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 focus:outline-none focus:border-yellow-500"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1.5">Телефон</label>
                  <input
                    type="tel"
                    value={editData.contact_phone || ''}
                    onChange={(e) => setEditData({ ...editData, contact_phone: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 focus:outline-none focus:border-yellow-500"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1.5">Email</label>
                  <input
                    type="email"
                    value={editData.contact_email || ''}
                    onChange={(e) => setEditData({ ...editData, contact_email: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 focus:outline-none focus:border-yellow-500"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1.5">Компания</label>
                  <input
                    type="text"
                    value={editData.company_name || ''}
                    onChange={(e) => setEditData({ ...editData, company_name: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 focus:outline-none focus:border-yellow-500"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1.5">ИНН</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={editData.inn || ''}
                      onChange={(e) => setEditData({ ...editData, inn: e.target.value })}
                      placeholder="Введите ИНН для загрузки данных"
                      className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 focus:outline-none focus:border-yellow-500"
                    />
                    <button
                      type="button"
                      onClick={handleLoadFromDadata}
                      disabled={loadingDadata}
                      className="px-3 py-2 bg-yellow-500 hover:bg-yellow-600 disabled:bg-gray-300 text-gray-900 rounded-lg transition-colors flex items-center gap-1.5"
                      title="Загрузить данные по ИНН"
                    >
                      {loadingDadata ? (
                        <div className="w-4 h-4 border-2 border-gray-900 border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Download className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1.5">КПП</label>
                  <input
                    type="text"
                    value={editData.kpp || ''}
                    onChange={(e) => setEditData({ ...editData, kpp: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 focus:outline-none focus:border-yellow-500"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1.5">ОГРН</label>
                  <input
                    type="text"
                    value={editData.ogrn || ''}
                    onChange={(e) => setEditData({ ...editData, ogrn: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 focus:outline-none focus:border-yellow-500"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1.5">ФИО Ген. директора</label>
                  <input
                    type="text"
                    value={editData.director_name || ''}
                    onChange={(e) => setEditData({ ...editData, director_name: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 focus:outline-none focus:border-yellow-500"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm text-gray-600 mb-1.5">Адрес</label>
                  <input
                    type="text"
                    value={editData.address || ''}
                    onChange={(e) => setEditData({ ...editData, address: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 focus:outline-none focus:border-yellow-500"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm text-gray-600 mb-1.5">Комментарий</label>
                  <textarea
                    value={editData.comment || ''}
                    onChange={(e) => setEditData({ ...editData, comment: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 focus:outline-none focus:border-yellow-500 resize-none"
                  />
                </div>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <div className="text-xs text-gray-400 uppercase tracking-wider mb-1">Контакт</div>
                    <div className="text-gray-900">{client.contact_name}</div>
                    {client.contact_position && (
                      <div className="text-sm text-gray-500">{client.contact_position}</div>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-gray-700">
                    <Phone className="w-4 h-4 text-gray-400" />
                    <a href={`tel:${client.contact_phone}`} className="hover:text-yellow-600 transition-colors">
                      {client.contact_phone}
                    </a>
                  </div>
                  {client.contact_email && (
                    <div className="flex items-center gap-3 text-gray-700">
                      <Mail className="w-4 h-4 text-gray-400" />
                      <a href={`mailto:${client.contact_email}`} className="hover:text-yellow-600 transition-colors">
                        {client.contact_email}
                      </a>
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  {client.company_name && (
                    <div>
                      <div className="text-xs text-gray-400 uppercase tracking-wider mb-1">Компания</div>
                      <div className="flex items-center gap-2 text-gray-900">
                        <Building2 className="w-4 h-4 text-gray-400" />
                        {client.company_name}
                      </div>
                    </div>
                  )}
                  {client.inn && (
                    <div className="text-sm text-gray-500">
                      ИНН: {client.inn}
                      {client.kpp && <span className="ml-3">КПП: {client.kpp}</span>}
                    </div>
                  )}
                  {client.ogrn && (
                    <div className="text-sm text-gray-500">ОГРН: {client.ogrn}</div>
                  )}
                  {client.director_name && (
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <User className="w-4 h-4 text-gray-400" />
                      Директор: {client.director_name}
                    </div>
                  )}
                  {client.address && (
                    <div className="flex items-start gap-2 text-sm text-gray-500">
                      <MapPin className="w-4 h-4 text-gray-400 mt-0.5" />
                      {client.address}
                    </div>
                  )}
                </div>
              </div>
            )}

            {client.comment && !editing && (
              <div className="mt-4 pt-4 border-t border-gray-100">
                <div className="text-xs text-gray-400 uppercase tracking-wider mb-2">Комментарий</div>
                <p className="text-gray-600 text-sm">{client.comment}</p>
              </div>
            )}
          </div>

          {/* Products */}
          {client.products && client.products.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <Package className="w-5 h-5 text-gray-400" />
                <h2 className="text-lg font-medium text-gray-900">Товары клиента</h2>
              </div>
              <div className="flex flex-wrap gap-2">
                {client.products.map((product, idx) => (
                  <span
                    key={idx}
                    className="px-3 py-1.5 bg-gray-100 border border-gray-200 rounded-lg text-sm text-gray-700"
                  >
                    {product.name || product.subcategory_name || `Товар ${idx + 1}`}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Interaction History */}
          <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <History className="w-5 h-5 text-gray-400" />
                <h2 className="text-lg font-medium text-gray-900">История взаимодействий</h2>
              </div>
              <button
                onClick={() => setShowInteractionForm(!showInteractionForm)}
                className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-yellow-700 hover:text-yellow-800 bg-yellow-100 hover:bg-yellow-200 border border-yellow-200 rounded-lg transition-colors"
              >
                <Plus className="w-4 h-4" />
                Добавить
              </button>
            </div>

            {/* New Interaction Form */}
            {showInteractionForm && (
              <div className="mb-6 p-4 bg-gray-50 rounded-xl border border-gray-200">
                <div className="grid sm:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm text-gray-600 mb-1.5">Тип</label>
                    <div className="flex flex-wrap gap-2">
                      {interactionTypes.map((type) => {
                        const Icon = type.icon;
                        return (
                          <button
                            key={type.value}
                            onClick={() => setNewInteraction({ ...newInteraction, type: type.value })}
                            className={`flex items-center gap-2 px-3 py-2 text-sm rounded-lg border transition-colors ${
                              newInteraction.type === type.value
                                ? 'bg-yellow-100 border-yellow-300 text-yellow-700'
                                : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-100'
                            }`}
                          >
                            <Icon className="w-4 h-4" />
                            {type.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1.5">Тема</label>
                    <input
                      type="text"
                      value={newInteraction.subject}
                      onChange={(e) => setNewInteraction({ ...newInteraction, subject: e.target.value })}
                      placeholder="Краткая тема"
                      className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:border-yellow-500"
                    />
                  </div>
                </div>
                <div className="mb-4">
                  <label className="block text-sm text-gray-600 mb-1.5">Описание</label>
                  <textarea
                    value={newInteraction.description}
                    onChange={(e) => setNewInteraction({ ...newInteraction, description: e.target.value })}
                    placeholder="Подробное описание..."
                    rows={3}
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:border-yellow-500 resize-none"
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => setShowInteractionForm(false)}
                    className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700 transition-colors"
                  >
                    Отмена
                  </button>
                  <button
                    onClick={handleAddInteraction}
                    className="px-4 py-2 text-sm font-medium text-gray-900 bg-yellow-500 hover:bg-yellow-600 rounded-lg transition-colors"
                  >
                    Сохранить
                  </button>
                </div>
              </div>
            )}

            {/* History List */}
            {client.history && client.history.length > 0 ? (
              <div className="space-y-4">
                {client.history.map((item) => {
                  const Icon = getInteractionIcon(item.type);
                  return (
                    <div key={item.id} className="flex gap-4">
                      <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center">
                        <Icon className="w-4 h-4 text-gray-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-medium text-gray-900">
                            {getInteractionLabel(item.type)}
                          </span>
                          {item.subject && (
                            <span className="text-sm text-gray-500">— {item.subject}</span>
                          )}
                        </div>
                        {item.description && (
                          <p className="text-sm text-gray-500 mb-1">{item.description}</p>
                        )}
                        <div className="flex items-center gap-2 text-xs text-gray-400">
                          <Clock className="w-3 h-3" />
                          {formatDate(item.created_at)}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8">
                <History className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                <p className="text-gray-500 text-sm">История пуста</p>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar - Documents */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
            <h3 className="text-sm font-medium text-gray-600 mb-3">Быстрые действия</h3>
            <div className="space-y-2">
              <Link
                to={`/employee/clients/${id}/quote`}
                className="flex items-center gap-3 w-full px-4 py-3 bg-yellow-100 hover:bg-yellow-200 border border-yellow-200 text-yellow-700 rounded-xl transition-colors text-sm font-medium"
              >
                <FileText className="w-5 h-5" />
                Создать КП
              </Link>
              <button
                onClick={() => setShowContractModal(true)}
                disabled={!client.inn}
                className="flex items-center gap-3 w-full px-4 py-3 bg-emerald-100 hover:bg-emerald-200 border border-emerald-200 text-emerald-700 rounded-xl transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                title={!client.inn ? 'Заполните ИНН клиента' : 'Создать договор'}
              >
                <FileCheck className="w-5 h-5" />
                Создать договор
              </button>
              {client.contact_phone && (
                <a
                  href={`tel:${client.contact_phone}`}
                  className="flex items-center gap-3 w-full px-4 py-3 bg-gray-100 hover:bg-gray-200 border border-gray-200 text-gray-700 rounded-xl transition-colors text-sm"
                >
                  <Phone className="w-5 h-5" />
                  Позвонить
                </a>
              )}
              {client.contact_email && (
                <a
                  href={`mailto:${client.contact_email}`}
                  className="flex items-center gap-3 w-full px-4 py-3 bg-gray-100 hover:bg-gray-200 border border-gray-200 text-gray-700 rounded-xl transition-colors text-sm"
                >
                  <Mail className="w-5 h-5" />
                  Написать
                </a>
              )}
              <button
                onClick={() => setShowTaskModal(true)}
                className="flex items-center gap-3 w-full px-4 py-3 bg-violet-100 hover:bg-violet-200 border border-violet-200 text-violet-700 rounded-xl transition-colors text-sm font-medium"
              >
                <CheckSquare className="w-5 h-5" />
                Создать задачу
              </button>
            </div>
          </div>

          {/* Client Tasks */}
          <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <CheckSquare className="w-4 h-4 text-violet-500" />
                <h3 className="text-sm font-medium text-gray-600">Задачи по клиенту</h3>
              </div>
              <span className="text-xs text-gray-400">{clientTasks.filter(t => t.status !== "completed").length} активных</span>
            </div>
            {clientTasks.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-2">Нет задач</p>
            ) : (
              <div className="space-y-2">
                {clientTasks.slice(0, 5).map(task => (
                  <div key={task.id} className={"p-2 rounded-lg border " + (task.status === "completed" ? "bg-gray-50 border-gray-100" : "bg-violet-50 border-violet-100")}>
                    <div className="flex items-start gap-2">
                      <div className={"w-2 h-2 rounded-full mt-1.5 " + (task.status === "completed" ? "bg-green-400" : task.priority === "urgent" ? "bg-red-400" : task.priority === "high" ? "bg-orange-400" : "bg-violet-400")} />
                      <div className="flex-1 min-w-0">
                        <p className={"text-sm " + (task.status === "completed" ? "text-gray-400 line-through" : "text-gray-700")}>{task.title}</p>
                        {task.due_date && <p className="text-xs text-gray-400">{new Date(task.due_date).toLocaleString("ru-RU", {day: "numeric", month: "short", hour: "2-digit", minute: "2-digit"})}</p>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>


          {/* Quotes */}
          <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <FileText className="w-4 h-4 text-gray-400" />
              <h3 className="text-sm font-medium text-gray-600">Коммерческие предложения</h3>
            </div>
            {client.quotes && client.quotes.length > 0 ? (
              <div className="space-y-2">
                {client.quotes.map((quote) => (
                  <div
                    key={quote.id}
                    className="p-3 bg-gray-50 rounded-lg border border-gray-100"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-gray-900">{quote.quote_number}</span>
                      <span className="text-sm text-emerald-600">{quote.total_amount?.toLocaleString()} ₽</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="text-xs text-gray-400">
                        {new Date(quote.created_at).toLocaleDateString('ru-RU')}
                      </div>
                      {quote.status !== 'accepted' && (
                        <button
                          onClick={() => handleCreateContract(quote.id)}
                          className="text-xs text-yellow-600 hover:text-yellow-700 font-medium"
                        >
                          Создать договор
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400 text-center py-4">Нет КП</p>
            )}
          </div>

          {/* Contracts */}
          <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <FileCheck className="w-4 h-4 text-gray-400" />
              <h3 className="text-sm font-medium text-gray-600">Договоры</h3>
            </div>
            {client.contracts && client.contracts.length > 0 ? (
              <div className="space-y-2">
                {client.contracts.map((contract) => (
                  <div
                    key={contract.id}
                    className="p-3 bg-gray-50 rounded-lg border border-gray-100"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-gray-900">{contract.contract_number}</span>
                      <span className="text-sm text-emerald-600">{contract.total_amount?.toLocaleString()} ₽</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="text-xs text-gray-400">
                        {new Date(contract.created_at).toLocaleDateString('ru-RU')}
                      </div>
                      <button
                        onClick={() => handleDownloadContract(contract.id)}
                        className="text-xs text-emerald-600 hover:text-emerald-700 font-medium"
                      >
                        Скачать
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400 text-center py-4">Нет договоров</p>
            )}
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {/* Contract Creation Modal */}

      {/* Task Modal */}
      {showTaskModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold">Новая задача</h2>
              <button onClick={() => setShowTaskModal(false)} className="p-1 hover:bg-gray-100 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Название *</label>
                <input
                  type="text"
                  value={taskData.title}
                  onChange={(e) => setTaskData({...taskData, title: e.target.value})}
                  placeholder={"Позвонить " + (client?.contact_name || "клиенту")}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Описание</label>
                <textarea
                  value={taskData.description}
                  onChange={(e) => setTaskData({...taskData, description: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                  rows={2}
                  placeholder="Подробности..."
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Приоритет</label>
                  <select
                    value={taskData.priority}
                    onChange={(e) => setTaskData({...taskData, priority: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  >
                    <option value="low">Низкий</option>
                    <option value="normal">Обычный</option>
                    <option value="high">Высокий</option>
                    <option value="urgent">Срочный</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Срок</label>
                  <input
                    type="datetime-local"
                    value={taskData.due_date}
                    onChange={(e) => setTaskData({...taskData, due_date: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
              </div>
            </div>
            <div className="flex gap-3 p-4 border-t bg-gray-50 rounded-b-2xl">
              <button
                onClick={() => setShowTaskModal(false)}
                className="flex-1 px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
              >
                Отмена
              </button>
              <button
                onClick={createTask}
                disabled={creatingTask}
                className="flex-1 px-4 py-2 bg-violet-500 hover:bg-violet-600 text-white rounded-lg disabled:opacity-50"
              >
                {creatingTask ? "Создание..." : "Создать"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showContractModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowContractModal(false)} />
          <div className="relative bg-white rounded-2xl p-6 max-w-lg w-full mx-4 shadow-xl">
            <div className="flex items-center gap-4 mb-6">
              <div className="p-3 rounded-full bg-emerald-100">
                <FileCheck className="w-6 h-6 text-emerald-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Создание договора</h3>
                <p className="text-sm text-gray-500">Выберите способ создания</p>
              </div>
            </div>

            <div className="space-y-3 mb-6">
              {/* На основании КП */}
              {client?.quotes && client.quotes.length > 0 && (
                <div className="border border-gray-200 rounded-xl p-4">
                  <div className="text-sm font-medium text-gray-700 mb-3">На основании КП:</div>
                  <div className="space-y-2 max-h-[200px] overflow-y-auto">
                    {client.quotes.map((quote) => (
                      <button
                        key={quote.id}
                        onClick={() => {
                          handleCreateContract(quote.id);
                          setShowContractModal(false);
                        }}
                        className="w-full flex items-center justify-between p-3 bg-gray-50 hover:bg-emerald-50 border border-gray-200 hover:border-emerald-300 rounded-lg transition-colors text-left"
                      >
                        <div>
                          <div className="font-medium text-gray-900 text-sm">{quote.quote_id}</div>
                          <div className="text-xs text-gray-500">
                            {new Date(quote.created_at).toLocaleDateString('ru-RU')}
                          </div>
                        </div>
                        <div className="text-sm font-bold text-emerald-600">
                          {quote.total_amount?.toLocaleString()} ₽
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Новый договор */}
              <button
                onClick={() => {
                  setShowContractModal(false);
                  navigate(`/employee/clients/${id}/contract/new`);
                }}
                className="w-full flex items-center gap-4 p-4 bg-emerald-50 hover:bg-emerald-100 border-2 border-emerald-200 hover:border-emerald-400 rounded-xl transition-colors"
              >
                <div className="p-2 rounded-lg bg-emerald-200">
                  <Plus className="w-5 h-5 text-emerald-700" />
                </div>
                <div className="flex-1 text-left">
                  <div className="font-medium text-emerald-800">Новый договор</div>
                  <div className="text-sm text-emerald-600">Выбрать товары и услуги</div>
                </div>
              </button>
            </div>

            <button
              onClick={() => setShowContractModal(false)}
              className="w-full px-4 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
            >
              Отмена
            </button>
          </div>
        </div>
      )}

      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowDeleteModal(false)} />
          <div className="relative bg-white rounded-2xl p-6 max-w-md w-full mx-4 shadow-xl">
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 rounded-full bg-red-100">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Удалить клиента?</h3>
                <p className="text-sm text-gray-500">Это действие нельзя отменить</p>
              </div>
            </div>

            <div className="bg-gray-50 rounded-xl p-4 mb-6">
              <div className="font-medium text-gray-900">{client?.contact_name}</div>
              {client?.company_name && (
                <div className="text-sm text-gray-500">{client.company_name}</div>
              )}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
              >
                Отмена
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-red-600 hover:bg-red-700 disabled:bg-red-400 rounded-xl transition-colors"
              >
                {deleting ? 'Удаление...' : 'Удалить'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmployeeClientCard;
