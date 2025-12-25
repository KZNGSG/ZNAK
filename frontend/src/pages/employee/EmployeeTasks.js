import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useEmployeeAuth } from '../../context/EmployeeAuthContext';
import {
  CheckSquare,
  Plus,
  Clock,
  Calendar,
  User,
  Building2,
  AlertCircle,
  CheckCircle2,
  Circle,
  Trash2,
  X,
  Phone,
  ChevronDown,
  Edit3,
  Save,
  AlertTriangle
} from 'lucide-react';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const EmployeeTasks = () => {
  const { authFetch, isSuperAdmin, user } = useEmployeeAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [staff, setStaff] = useState([]);
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    assigned_to: '',
    priority: 'normal',
    due_date: ''
  });

  const fetchTasks = async () => {
    try {
      let url = API_URL + '/api/employee/tasks';
      // Для фильтра "без срока" загружаем все задачи и фильтруем на клиенте
      if (filter !== 'all' && filter !== 'no_deadline') {
        url += '?status=' + filter;
      }
      const response = await authFetch(url);
      if (response.ok) {
        const data = await response.json();
        let filteredTasks = data.tasks;
        
        // Фильтруем задачи без срока (только активные, не выполненные)
        if (filter === 'no_deadline') {
          filteredTasks = data.tasks.filter(t => !t.due_date && t.status !== 'completed');
        }
        
        setTasks(filteredTasks);
      }
    } catch (error) {
      toast.error('Ошибка загрузки задач');
    } finally {
      setLoading(false);
    }
  };

  const fetchStaff = async () => {
    try {
      const response = await authFetch(API_URL + '/api/employee/staff-list');
      if (response.ok) {
        const data = await response.json();
        setStaff(data.staff);
      }
    } catch (error) {
      console.error('Failed to fetch staff:', error);
    }
  };

  useEffect(() => {
    fetchTasks();
    if (true) {
      fetchStaff();
    }
  }, [filter]);


  // Автоматически открываем задачу если есть id в URL
  useEffect(() => {
    const idFromUrl = searchParams.get("id");
    if (idFromUrl && tasks.length > 0) {
      const targetId = parseInt(idFromUrl);
      const targetTask = tasks.find(t => t.id === targetId);
      if (targetTask) {
        setEditingTask(targetTask);
        setShowEditModal(true);
        // Убираем id из URL
        searchParams.delete("id");
        setSearchParams(searchParams, { replace: true });
      }
    }
  }, [tasks, searchParams]);

  // Подсчёт задач без срока (активных)
  const noDeadlineCount = tasks.filter(t => !t.due_date && t.status !== 'completed').length;
  
  // Для подсчёта задач без срока во всех задачах (нужно хранить все задачи отдельно)
  const [allTasks, setAllTasks] = useState([]);
  
  useEffect(() => {
    // Загружаем все задачи для подсчёта
    const loadAllTasks = async () => {
      try {
        const response = await authFetch(API_URL + '/api/employee/tasks');
        if (response.ok) {
          const data = await response.json();
          setAllTasks(data.tasks);
        }
      } catch (error) {
        console.error('Failed to load all tasks:', error);
      }
    };
    loadAllTasks();
  }, []);

  const noDeadlineCountAll = allTasks.filter(t => !t.due_date && t.status !== 'completed').length;

  const updateTaskStatus = async (taskId, newStatus) => {
    try {
      const response = await authFetch(API_URL + '/api/employee/tasks/' + taskId, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      if (response.ok) {
        toast.success(newStatus === 'completed' ? 'Задача выполнена!' : 'Статус обновлён');
        fetchTasks();
      }
    } catch (error) {
      toast.error('Ошибка обновления');
    }
  };

  const createTask = async () => {
    if (!newTask.title || !newTask.assigned_to) {
      toast.error('Заполните название и исполнителя');
      return;
    }
    try {
      const response = await authFetch(API_URL + '/api/employee/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newTask)
      });
      if (response.ok) {
        toast.success('Задача создана');
        setShowModal(false);
        setNewTask({ title: '', description: '', assigned_to: '', priority: 'normal', due_date: '' });
        fetchTasks();
      }
    } catch (error) {
      toast.error('Ошибка создания задачи');
    }
  };

  const updateTask = async () => {
    if (!editingTask) return;
    try {
      const response = await authFetch(API_URL + '/api/employee/tasks/' + editingTask.id, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: editingTask.title,
          description: editingTask.description,
          priority: editingTask.priority,
          due_date: editingTask.due_date || null,
          status: editingTask.status
        })
      });
      if (response.ok) {
        toast.success('Задача обновлена');
        setShowEditModal(false);
        setEditingTask(null);
        fetchTasks();
        // Обновляем общий список задач
        const resp = await authFetch(API_URL + '/api/employee/tasks');
        if (resp.ok) {
          const data = await resp.json();
          setAllTasks(data.tasks);
        }
      }
    } catch (error) {
      toast.error('Ошибка обновления задачи');
    }
  };

  const deleteTask = async (taskId) => {
    if (!window.confirm('Удалить задачу?')) return;
    try {
      const response = await authFetch(API_URL + '/api/employee/tasks/' + taskId, {
        method: 'DELETE'
      });
      if (response.ok) {
        toast.success('Задача удалена');
        fetchTasks();
      }
    } catch (error) {
      toast.error('Ошибка удаления');
    }
  };

  const openEditModal = (task) => {
    setEditingTask({
      ...task,
      due_date: task.due_date ? task.due_date.slice(0, 16) : ''
    });
    setShowEditModal(true);
  };

  // Быстрые кнопки для установки дедлайна
  const setQuickDeadline = (days) => {
    const date = new Date();
    date.setDate(date.getDate() + days);
    date.setHours(18, 0, 0, 0);
    const formatted = date.toISOString().slice(0, 16);
    setEditingTask({...editingTask, due_date: formatted});
  };

  const clearDeadline = () => {
    setEditingTask({...editingTask, due_date: ''});
  };

  const priorityColors = {
    low: 'bg-gray-100 text-gray-600',
    normal: 'bg-blue-100 text-blue-600',
    high: 'bg-orange-100 text-orange-600',
    urgent: 'bg-red-100 text-red-600'
  };

  const priorityLabels = {
    low: 'Низкий',
    normal: 'Обычный',
    high: 'Высокий',
    urgent: 'Срочный'
  };

  const statusIcons = {
    pending: <Circle className="w-5 h-5 text-gray-400" />,
    in_progress: <Clock className="w-5 h-5 text-blue-500" />,
    completed: <CheckCircle2 className="w-5 h-5 text-green-500" />
  };

  const statusLabels = {
    pending: 'Ожидает',
    in_progress: 'В работе',
    completed: 'Выполнена'
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return null;
    const date = new Date(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const taskDate = new Date(date);
    taskDate.setHours(0, 0, 0, 0);
    const diff = taskDate - today;
    const days = Math.round(diff / (1000 * 60 * 60 * 24));
    
    if (days < 0) {
      const absDays = Math.abs(days);
      return { 
        text: 'Просрочено на ' + absDays + ' ' + getDayWord(absDays), 
        color: 'text-red-600',
        bgColor: 'bg-red-50'
      };
    }
    if (days === 0) return { text: 'Сегодня', color: 'text-orange-600', bgColor: 'bg-orange-50' };
    if (days === 1) return { text: 'Завтра', color: 'text-yellow-600', bgColor: 'bg-yellow-50' };
    if (days <= 7) return { text: 'Через ' + days + ' ' + getDayWord(days), color: 'text-blue-600', bgColor: 'bg-blue-50' };
    return { 
      text: date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' }), 
      color: 'text-gray-600',
      bgColor: 'bg-gray-50'
    };
  };

  const getDayWord = (num) => {
    const lastTwo = num % 100;
    const lastOne = num % 10;
    if (lastTwo >= 11 && lastTwo <= 14) return 'дней';
    if (lastOne === 1) return 'день';
    if (lastOne >= 2 && lastOne <= 4) return 'дня';
    return 'дней';
  };

  const formatFullDate = (dateStr) => {
    if (!dateStr) return 'Не установлен';
    const date = new Date(dateStr);
    return date.toLocaleDateString('ru-RU', { 
      day: 'numeric', 
      month: 'long', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-violet-100 rounded-lg">
            <CheckSquare className="w-6 h-6 text-violet-600" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-gray-900">
              {isSuperAdmin ? 'Задачи сотрудников' : 'Мои задачи'}
            </h1>
            <p className="text-sm text-gray-500">
              {tasks.filter(t => t.status !== 'completed').length} активных задач
            </p>
          </div>
        </div>
        
        
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-white rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            Новая задача
          </button>
        
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        {[
          { key: 'all', label: 'Все' },
          { key: 'pending', label: 'Ожидают' },
          { key: 'in_progress', label: 'В работе' },
          { key: 'completed', label: 'Выполнены' }
        ].map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={"px-3 py-1.5 text-sm rounded-lg transition-colors " + (filter === f.key ? 'bg-violet-100 text-violet-700' : 'text-gray-600 hover:bg-gray-100')}
          >
            {f.label}
          </button>
        ))}
        
        {/* Красная кнопка "Без срока" */}
        <button
          onClick={() => setFilter('no_deadline')}
          className={"px-3 py-1.5 text-sm rounded-lg transition-colors flex items-center gap-1.5 " + 
            (filter === 'no_deadline' 
              ? 'bg-red-600 text-white' 
              : (noDeadlineCountAll > 0 
                  ? 'bg-red-100 text-red-700 hover:bg-red-200 animate-pulse' 
                  : 'bg-gray-100 text-gray-400')
            )
          }
        >
          <AlertTriangle className="w-4 h-4" />
          Без срока
          {noDeadlineCountAll > 0 && (
            <span className={"ml-1 px-1.5 py-0.5 text-xs font-bold rounded-full " + 
              (filter === 'no_deadline' ? 'bg-white text-red-600' : 'bg-red-600 text-white')
            }>
              {noDeadlineCountAll}
            </span>
          )}
        </button>
      </div>

      {/* Warning banner for no_deadline filter */}
      {filter === 'no_deadline' && tasks.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-red-800 font-medium">Внимание! Задачи без крайнего срока</p>
            <p className="text-red-600 text-sm mt-1">
              Эти задачи могут быть забыты. Установите срок выполнения для каждой задачи, кликнув на неё.
            </p>
          </div>
        </div>
      )}

      {/* Tasks List */}
      {tasks.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          {filter === 'no_deadline' ? (
            <>
              <CheckCircle2 className="w-12 h-12 text-green-400 mx-auto mb-4" />
              <p className="text-gray-600 font-medium">Отлично!</p>
              <p className="text-gray-500 text-sm mt-1">Все задачи имеют крайний срок</p>
            </>
          ) : (
            <>
              <CheckSquare className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">Нет задач</p>
            </>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {tasks.map(task => {
            const dueInfo = formatDate(task.due_date);
            return (
              <div
                key={task.id}
                onClick={() => openEditModal(task)}
                className={"bg-white rounded-xl border p-4 transition-all hover:shadow-md cursor-pointer " + 
                  (task.status === 'completed' 
                    ? 'opacity-60 border-gray-200' 
                    : (filter === 'no_deadline' 
                        ? 'border-red-200 hover:border-red-300 bg-red-50/30' 
                        : 'border-gray-200 hover:border-violet-200')
                  )
                }
              >
                <div className="flex items-start gap-4">
                  {/* Status Toggle */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      updateTaskStatus(task.id, task.status === 'completed' ? 'pending' : 'completed');
                    }}
                    className="mt-0.5 hover:scale-110 transition-transform"
                  >
                    {statusIcons[task.status]}
                  </button>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3 className={"font-medium " + (task.status === 'completed' ? 'text-gray-400 line-through' : 'text-gray-900')}>
                          {task.title}
                        </h3>
                        {task.description && (
                          <p className="text-sm text-gray-500 mt-1 line-clamp-2">{task.description}</p>
                        )}
                      </div>
                      
                      <span className={"px-2 py-0.5 text-xs font-medium rounded " + priorityColors[task.priority]}>
                        {priorityLabels[task.priority]}
                      </span>
                    </div>

                    <div className="flex items-center gap-4 mt-3 text-sm flex-wrap">
                      {task.assigned_email && (
                        <div className="flex items-center gap-1 text-gray-500">
                          <User className="w-4 h-4" />
                          <span>{task.assigned_email.split('@')[0]}</span>
                        </div>
                      )}
                      {task.client_name && (
                        <div className="flex items-center gap-2 text-gray-500">
                          <Building2 className="w-4 h-4" />
                          <Link 
                            to={"/employee/clients/" + task.client_id} 
                            className="hover:text-yellow-600 hover:underline"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {task.client_name}
                          </Link>
                          {task.client_phone && (
                            <a 
                              href={"tel:" + task.client_phone} 
                              className="flex items-center gap-1 text-emerald-600 hover:text-emerald-700"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Phone className="w-3.5 h-3.5" />
                              <span className="text-xs">{task.client_phone}</span>
                            </a>
                          )}
                        </div>
                      )}
                      <div className={"flex items-center gap-1 px-2 py-0.5 rounded " + 
                        (dueInfo 
                          ? dueInfo.color + ' ' + dueInfo.bgColor 
                          : 'text-red-600 bg-red-100 font-medium'
                        )
                      }>
                        {!dueInfo && <AlertTriangle className="w-4 h-4" />}
                        {dueInfo && <Calendar className="w-4 h-4" />}
                        <span className="font-medium">{dueInfo ? dueInfo.text : 'Без срока!'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  {isSuperAdmin && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteTask(task.id);
                      }}
                      className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Task Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold">Новая задача</h2>
              <button onClick={() => setShowModal(false)} className="p-1 hover:bg-gray-100 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Название *</label>
                <input
                  type="text"
                  value={newTask.title}
                  onChange={(e) => setNewTask({...newTask, title: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                  placeholder="Что нужно сделать?"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Описание</label>
                <textarea
                  value={newTask.description}
                  onChange={(e) => setNewTask({...newTask, description: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                  rows={3}
                  placeholder="Подробности..."
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Исполнитель *</label>
                <select
                  value={newTask.assigned_to}
                  onChange={(e) => setNewTask({...newTask, assigned_to: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                >
                  <option value="">Выберите сотрудника</option>
                  {(isSuperAdmin ? staff : staff.filter(s => s.id === user?.id)).map(s => (
                    <option key={s.id} value={s.id}>{s.email}</option>
                  ))}
                </select>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Приоритет</label>
                  <select
                    value={newTask.priority}
                    onChange={(e) => setNewTask({...newTask, priority: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
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
                    value={newTask.due_date}
                    onChange={(e) => setNewTask({...newTask, due_date: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>
            
            <div className="flex gap-3 p-4 border-t bg-gray-50 rounded-b-2xl">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Отмена
              </button>
              <button
                onClick={createTask}
                className="flex-1 px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-white rounded-lg transition-colors"
              >
                Создать
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Task Modal */}
      {showEditModal && editingTask && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b sticky top-0 bg-white">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-violet-600" />
                Редактирование задачи
              </h2>
              <button onClick={() => { setShowEditModal(false); setEditingTask(null); }} className="p-1 hover:bg-gray-100 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-4 space-y-5">
              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Название</label>
                <input
                  type="text"
                  value={editingTask.title}
                  onChange={(e) => setEditingTask({...editingTask, title: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent text-lg"
                />
              </div>
              
              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Описание</label>
                <textarea
                  value={editingTask.description || ''}
                  onChange={(e) => setEditingTask({...editingTask, description: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                  rows={3}
                  placeholder="Добавьте описание..."
                />
              </div>

              {/* Client Info (read-only) */}
              {editingTask.client_name && (
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <Building2 className="w-5 h-5 text-gray-400" />
                  <div>
                    <div className="text-sm text-gray-500">Клиент</div>
                    <Link 
                      to={"/employee/clients/" + editingTask.client_id}
                      className="font-medium text-gray-900 hover:text-yellow-600"
                      onClick={() => setShowEditModal(false)}
                    >
                      {editingTask.client_name}
                    </Link>
                  </div>
                  {editingTask.client_phone && (
                    <a 
                      href={"tel:" + editingTask.client_phone}
                      className="ml-auto flex items-center gap-1 text-emerald-600 hover:text-emerald-700"
                    >
                      <Phone className="w-4 h-4" />
                      {editingTask.client_phone}
                    </a>
                  )}
                </div>
              )}

              {/* Priority & Status */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Приоритет</label>
                  <select
                    value={editingTask.priority}
                    onChange={(e) => setEditingTask({...editingTask, priority: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                  >
                    <option value="low">Низкий</option>
                    <option value="normal">Обычный</option>
                    <option value="high">Высокий</option>
                    <option value="urgent">Срочный</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Статус</label>
                  <select
                    value={editingTask.status}
                    onChange={(e) => setEditingTask({...editingTask, status: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                  >
                    <option value="pending">Ожидает</option>
                    <option value="in_progress">В работе</option>
                    <option value="completed">Выполнена</option>
                  </select>
                </div>
              </div>

              {/* Deadline Section */}
              <div className={"border rounded-lg p-4 " + (!editingTask.due_date ? 'border-red-300 bg-red-50' : 'border-gray-200')}>
                <label className="block text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                  {!editingTask.due_date && <AlertTriangle className="w-4 h-4 text-red-500" />}
                  <Calendar className="w-4 h-4" />
                  Крайний срок
                  {!editingTask.due_date && <span className="text-red-500 text-xs">(не установлен!)</span>}
                </label>
                
                {/* Quick buttons */}
                <div className="flex flex-wrap gap-2 mb-3">
                  <button
                    type="button"
                    onClick={() => setQuickDeadline(0)}
                    className="px-3 py-1.5 text-sm bg-orange-100 text-orange-700 rounded-lg hover:bg-orange-200 transition-colors"
                  >
                    Сегодня
                  </button>
                  <button
                    type="button"
                    onClick={() => setQuickDeadline(1)}
                    className="px-3 py-1.5 text-sm bg-yellow-100 text-yellow-700 rounded-lg hover:bg-yellow-200 transition-colors"
                  >
                    Завтра
                  </button>
                  <button
                    type="button"
                    onClick={() => setQuickDeadline(7)}
                    className="px-3 py-1.5 text-sm bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
                  >
                    Через неделю
                  </button>
                  <button
                    type="button"
                    onClick={clearDeadline}
                    className="px-3 py-1.5 text-sm bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    Убрать срок
                  </button>
                </div>

                {/* Date picker */}
                <input
                  type="datetime-local"
                  value={editingTask.due_date}
                  onChange={(e) => setEditingTask({...editingTask, due_date: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                />
                
                {/* Current deadline display */}
                {editingTask.due_date && (
                  <div className={"mt-3 p-2 rounded-lg text-sm " + (formatDate(editingTask.due_date)?.bgColor || 'bg-gray-50')}>
                    <span className={"font-medium " + (formatDate(editingTask.due_date)?.color || 'text-gray-600')}>
                      {formatDate(editingTask.due_date)?.text}
                    </span>
                    <span className="text-gray-500 ml-2">
                      ({formatFullDate(editingTask.due_date)})
                    </span>
                  </div>
                )}
              </div>

              {/* Meta info */}
              <div className="text-xs text-gray-400 space-y-1">
                {editingTask.assigned_email && (
                  <div>Исполнитель: {editingTask.assigned_email}</div>
                )}
                {editingTask.creator_email && (
                  <div>Создал: {editingTask.creator_email}</div>
                )}
                {editingTask.created_at && (
                  <div>Создано: {new Date(editingTask.created_at).toLocaleDateString('ru-RU')}</div>
                )}
              </div>
            </div>
            
            <div className="flex gap-3 p-4 border-t bg-gray-50 rounded-b-2xl sticky bottom-0">
              <button
                onClick={() => { setShowEditModal(false); setEditingTask(null); }}
                className="flex-1 px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Отмена
              </button>
              <button
                onClick={updateTask}
                className="flex-1 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                <Save className="w-4 h-4" />
                Сохранить
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmployeeTasks;
