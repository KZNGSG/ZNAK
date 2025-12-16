import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
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
  ChevronDown
} from 'lucide-react';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const EmployeeTasks = () => {
  const { authFetch, isSuperAdmin, user } = useEmployeeAuth();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [showModal, setShowModal] = useState(false);
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
      if (filter !== 'all') {
        url += '?status=' + filter;
      }
      const response = await authFetch(url);
      if (response.ok) {
        const data = await response.json();
        setTasks(data.tasks);
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

  const formatDate = (dateStr) => {
    if (!dateStr) return null;
    const date = new Date(dateStr);
    const today = new Date();
    const diff = date - today;
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    
    if (days < 0) return { text: 'Просрочено', color: 'text-red-600' };
    if (days === 0) return { text: 'Сегодня', color: 'text-orange-600' };
    if (days === 1) return { text: 'Завтра', color: 'text-yellow-600' };
    return { text: date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' }), color: 'text-gray-500' };
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
      <div className="flex gap-2">
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
      </div>

      {/* Tasks List */}
      {tasks.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <CheckSquare className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">Нет задач</p>
        </div>
      ) : (
        <div className="space-y-3">
          {tasks.map(task => {
            const dueInfo = formatDate(task.due_date);
            return (
              <div
                key={task.id}
                className={"bg-white rounded-xl border border-gray-200 p-4 transition-all hover:shadow-sm " + (task.status === 'completed' ? 'opacity-60' : '')}
              >
                <div className="flex items-start gap-4">
                  {/* Status Toggle */}
                  <button
                    onClick={() => updateTaskStatus(task.id, task.status === 'completed' ? 'pending' : 'completed')}
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
                          <p className="text-sm text-gray-500 mt-1">{task.description}</p>
                        )}
                      </div>
                      
                      <span className={"px-2 py-0.5 text-xs font-medium rounded " + priorityColors[task.priority]}>
                        {priorityLabels[task.priority]}
                      </span>
                    </div>

                    <div className="flex items-center gap-4 mt-3 text-sm">
                      {task.assigned_email && (
                        <div className="flex items-center gap-1 text-gray-500">
                          <User className="w-4 h-4" />
                          <span>{task.assigned_email.split('@')[0]}</span>
                        </div>
                      )}
                      {task.client_name && (
                        <div className="flex items-center gap-1 text-gray-500">
                          <Building2 className="w-4 h-4" />
                          <Link to={"/employee/clients/" + task.client_id} className="hover:text-yellow-600 hover:underline">{task.client_name}</Link>
                        </div>
                      )}
                      {dueInfo && (
                        <div className={"flex items-center gap-1 " + dueInfo.color}>
                          <Calendar className="w-4 h-4" />
                          <span>{dueInfo.text}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  {isSuperAdmin && (
                    <button
                      onClick={() => deleteTask(task.id)}
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
    </div>
  );
};

export default EmployeeTasks;
