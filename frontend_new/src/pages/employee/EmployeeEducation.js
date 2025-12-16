import React, { useState, useEffect } from 'react';
import { useEmployeeAuth } from '../../context/EmployeeAuthContext';
import {
  GraduationCap,
  BookOpen,
  Users,
  Award,
  Plus,
  Edit2,
  Trash2,
  Eye,
  EyeOff,
  ChevronRight,
  FileText,
  PlayCircle,
  Save,
  X,
  Search,
  BarChart2,
  UserPlus,
  UserCheck,
  UserX,
  CheckCircle2
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '../../components/ui/button';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const EmployeeEducation = () => {
  const { authFetch } = useEmployeeAuth();
  const [activeTab, setActiveTab] = useState('courses'); // courses | progress
  const [courses, setCourses] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  // Course editing
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [editingCourse, setEditingCourse] = useState(null);
  const [chapters, setChapters] = useState([]);
  const [editingChapter, setEditingChapter] = useState(null);
  const [editingTest, setEditingTest] = useState(null);

  // Partner progress
  const [progress, setProgress] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');

  // Access management modal
  const [accessModalCourse, setAccessModalCourse] = useState(null);

  // Delete confirmation
  const [deleteConfirmCourse, setDeleteConfirmCourse] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [coursesRes, statsRes] = await Promise.all([
        authFetch(`${API_URL}/api/admin/education/courses`),
        authFetch(`${API_URL}/api/admin/education/stats`)
      ]);

      if (coursesRes.ok) {
        const data = await coursesRes.json();
        setCourses(data.courses);
      }

      if (statsRes.ok) {
        const data = await statsRes.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Failed to fetch education data:', error);
      toast.error('Ошибка загрузки данных');
    } finally {
      setLoading(false);
    }
  };

  const fetchChapters = async (courseId) => {
    try {
      const response = await authFetch(`${API_URL}/api/admin/education/courses/${courseId}/chapters`);
      if (response.ok) {
        const data = await response.json();
        setChapters(data.chapters);
      }
    } catch (error) {
      console.error('Failed to fetch chapters:', error);
    }
  };

  const fetchProgress = async (courseId = null) => {
    try {
      const url = courseId
        ? `${API_URL}/api/admin/education/progress?course_id=${courseId}`
        : `${API_URL}/api/admin/education/progress`;
      const response = await authFetch(url);
      if (response.ok) {
        const data = await response.json();
        setProgress(data.partners);
      }
    } catch (error) {
      console.error('Failed to fetch progress:', error);
    }
  };

  // Course CRUD
  const createCourse = async () => {
    try {
      const response = await authFetch(`${API_URL}/api/admin/education/courses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'Новый курс',
          description: '',
          price: 0
        })
      });

      if (response.ok) {
        const data = await response.json();
        toast.success('Курс создан');
        fetchData();
        setSelectedCourse(data.course_id);
      }
    } catch (error) {
      toast.error('Ошибка создания курса');
    }
  };

  const updateCourse = async (courseId, updates) => {
    try {
      const response = await authFetch(`${API_URL}/api/admin/education/courses/${courseId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });

      if (response.ok) {
        toast.success('Курс обновлён');
        fetchData();
        setEditingCourse(null);
      }
    } catch (error) {
      toast.error('Ошибка обновления курса');
    }
  };

  const deleteCourse = async (courseId) => {
    try {
      const response = await authFetch(`${API_URL}/api/admin/education/courses/${courseId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        toast.success('Курс удалён');
        setDeleteConfirmCourse(null);
        setSelectedCourse(null);
        setChapters([]);
        fetchData();
      }
    } catch (error) {
      toast.error('Ошибка удаления курса');
    }
  };

  // Chapter CRUD
  const createChapter = async (courseId) => {
    try {
      const response = await authFetch(`${API_URL}/api/admin/education/courses/${courseId}/chapters`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'Новая глава',
          description: ''
        })
      });

      if (response.ok) {
        toast.success('Глава создана');
        fetchChapters(courseId);
      }
    } catch (error) {
      toast.error('Ошибка создания главы');
    }
  };

  const updateChapter = async (chapterId, updates) => {
    try {
      const response = await authFetch(`${API_URL}/api/admin/education/chapters/${chapterId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });

      if (response.ok) {
        toast.success('Глава обновлена');
        if (selectedCourse) {
          fetchChapters(selectedCourse);
        }
        setEditingChapter(null);
      }
    } catch (error) {
      toast.error('Ошибка обновления главы');
    }
  };

  const deleteChapter = async (chapterId) => {
    if (!confirm('Удалить главу?')) return;

    try {
      const response = await authFetch(`${API_URL}/api/admin/education/chapters/${chapterId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        toast.success('Глава удалена');
        if (selectedCourse) {
          fetchChapters(selectedCourse);
        }
      }
    } catch (error) {
      toast.error('Ошибка удаления главы');
    }
  };

  // Test CRUD
  const fetchTest = async (chapterId) => {
    try {
      const response = await authFetch(`${API_URL}/api/admin/education/chapters/${chapterId}/test`);
      if (response.ok) {
        const data = await response.json();
        setEditingTest({
          chapterId,
          ...(data.test || {
            title: 'Тест по главе',
            passing_score: 80,
            max_attempts: 3,
            questions: []
          })
        });
      }
    } catch (error) {
      toast.error('Ошибка загрузки теста');
    }
  };

  const saveTest = async () => {
    if (!editingTest) return;

    try {
      const response = await authFetch(`${API_URL}/api/admin/education/chapters/${editingTest.chapterId}/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: editingTest.title,
          passing_score: editingTest.passing_score,
          max_attempts: editingTest.max_attempts,
          questions: editingTest.questions
        })
      });

      if (response.ok) {
        toast.success('Тест сохранён');
        setEditingTest(null);
        if (selectedCourse) {
          fetchChapters(selectedCourse);
        }
      }
    } catch (error) {
      toast.error('Ошибка сохранения теста');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-amber-200 border-t-amber-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Обучение</h1>
          <p className="text-gray-500">Управление курсами и прогрессом партнёров</p>
        </div>
        <Button onClick={createCourse} className="bg-violet-600 hover:bg-violet-700 shadow-md hover:shadow-lg transition-all">
          <Plus className="w-4 h-4 mr-2" />
          Новый курс
        </Button>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-100 to-purple-50 flex items-center justify-center">
                <BookOpen className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">{stats.total_courses}</div>
                <div className="text-sm text-gray-500">Курсов</div>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-100 to-blue-50 flex items-center justify-center">
                <Users className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">{stats.partners_in_progress}</div>
                <div className="text-sm text-gray-500">Обучаются</div>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-100 to-emerald-50 flex items-center justify-center">
                <Award className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">{stats.certificates_issued}</div>
                <div className="text-sm text-gray-500">Сертификатов</div>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-amber-100 to-amber-50 flex items-center justify-center">
                <BarChart2 className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">{stats.avg_completion_rate}%</div>
                <div className="text-sm text-gray-500">Средний прогресс</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('courses')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'courses'
              ? 'border-violet-600 text-violet-700 font-semibold'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Курсы
        </button>
        <button
          onClick={() => {
            setActiveTab('progress');
            fetchProgress();
          }}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'progress'
              ? 'border-violet-600 text-violet-700 font-semibold'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Прогресс партнёров
        </button>
      </div>

      {/* Courses Tab */}
      {activeTab === 'courses' && (
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Courses list */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-gray-100">
              <h3 className="font-semibold text-gray-900">Курсы</h3>
            </div>
            <div className="divide-y divide-gray-100 max-h-[600px] overflow-y-auto">
              {courses.map((course) => (
                <div
                  key={course.id}
                  className={`p-4 cursor-pointer transition-colors ${
                    selectedCourse === course.id ? 'bg-violet-50 border-l-4 border-l-violet-500' : 'hover:bg-gray-50'
                  }`}
                  onClick={() => {
                    setSelectedCourse(course.id);
                    fetchChapters(course.id);
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium text-gray-900 truncate">{course.title}</h4>
                        {!course.is_active && (
                          <EyeOff className="w-4 h-4 text-gray-400" />
                        )}
                      </div>
                      <div className="text-sm text-gray-500">
                        {course.chapters_count} глав • {course.students_count || 0} студентов
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-300" />
                  </div>
                </div>
              ))}

              {courses.length === 0 && (
                <div className="p-8 text-center text-gray-500">
                  Нет курсов
                </div>
              )}
            </div>
          </div>

          {/* Course details / Chapters */}
          <div className="lg:col-span-2">
            {selectedCourse ? (
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                {/* Course header */}
                {(() => {
                  const course = courses.find(c => c.id === selectedCourse);
                  if (!course) return null;

                  return editingCourse === course.id ? (
                    <CourseEditForm
                      course={course}
                      onSave={(updates) => updateCourse(course.id, updates)}
                      onCancel={() => setEditingCourse(null)}
                    />
                  ) : (
                    <div className="p-4 border-b border-gray-100">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-semibold text-gray-900 text-lg">{course.title}</h3>
                          {course.description && (
                            <p className="text-gray-500 text-sm mt-1">{course.description}</p>
                          )}
                          <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                            <span>Цена: {course.price > 0 ? `${course.price} ₽` : 'Бесплатно'}</span>
                            <span className={course.is_active ? 'text-emerald-600' : 'text-red-500'}>
                              {course.is_active ? 'Активен' : 'Скрыт'}
                            </span>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setAccessModalCourse(course)}
                            title="Управление доступом"
                          >
                            <UserPlus className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setEditingCourse(course.id)}
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => updateCourse(course.id, { is_active: !course.is_active })}
                          >
                            {course.is_active ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-red-500 hover:text-red-700 hover:border-red-300"
                            onClick={() => setDeleteConfirmCourse(course)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* Chapters */}
                <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                  <h4 className="font-medium text-gray-900">Главы курса</h4>
                  <Button
                    size="sm"
                    onClick={() => createChapter(selectedCourse)}
                    className="bg-violet-600 hover:bg-violet-700 shadow-md hover:shadow-lg transition-all"
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Глава
                  </Button>
                </div>

                <div className="divide-y divide-gray-100 max-h-[400px] overflow-y-auto">
                  {chapters.map((chapter, index) => (
                    <div key={chapter.id} className="p-4">
                      {editingChapter === chapter.id ? (
                        <ChapterEditForm
                          chapter={chapter}
                          onSave={(updates) => updateChapter(chapter.id, updates)}
                          onCancel={() => setEditingChapter(null)}
                        />
                      ) : (
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-3">
                            <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0 text-sm font-medium text-gray-600">
                              {index + 1}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <h5 className="font-medium text-gray-900">{chapter.title}</h5>
                                {!chapter.is_active && (
                                  <EyeOff className="w-4 h-4 text-gray-400" />
                                )}
                              </div>
                              <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
                                {chapter.video_url && (
                                  <span className="flex items-center gap-1">
                                    <PlayCircle className="w-3 h-3" />
                                    Видео
                                  </span>
                                )}
                                {chapter.has_test && (
                                  <span className="flex items-center gap-1">
                                    <FileText className="w-3 h-3" />
                                    Тест
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setEditingChapter(chapter.id)}
                            >
                              <Edit2 className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => fetchTest(chapter.id)}
                            >
                              <FileText className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-red-500 hover:text-red-700"
                              onClick={() => deleteChapter(chapter.id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}

                  {chapters.length === 0 && (
                    <div className="p-8 text-center text-gray-500">
                      Нет глав
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
                <GraduationCap className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                <p className="text-gray-500">Выберите курс для редактирования</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Progress Tab */}
      {activeTab === 'progress' && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          {/* Search and filter */}
          <div className="p-4 border-b border-gray-100 flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Поиск партнёра..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <select
              className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              onChange={(e) => fetchProgress(e.target.value || null)}
            >
              <option value="">Все курсы</option>
              {courses.map((course) => (
                <option key={course.id} value={course.id}>{course.title}</option>
              ))}
            </select>
          </div>

          {/* Progress table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Партнёр</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Курс</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Прогресс</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Статус</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Сертификат</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {progress
                  .filter(p =>
                    !searchQuery ||
                    p.partner_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    p.company_name?.toLowerCase().includes(searchQuery.toLowerCase())
                  )
                  .map((item) => (
                    <tr key={`${item.partner_id}-${item.course_id}`} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900">{item.partner_name}</div>
                        <div className="text-sm text-gray-500">{item.company_name}</div>
                      </td>
                      <td className="px-4 py-3 text-gray-900">{item.course_title}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-purple-500 rounded-full"
                              style={{ width: `${item.progress}%` }}
                            />
                          </div>
                          <span className="text-sm text-gray-600">{item.progress}%</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          item.status === 'completed'
                            ? 'bg-gradient-to-br from-emerald-100 to-emerald-50 text-emerald-700'
                            : item.status === 'in_progress'
                            ? 'bg-gradient-to-br from-amber-100 to-amber-50 text-amber-700'
                            : 'bg-gray-100 text-gray-600'
                        }`}>
                          {item.status === 'completed' ? 'Завершён' :
                           item.status === 'in_progress' ? 'В процессе' : 'Не начат'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {item.certificate_number ? (
                          <span className="text-sm text-emerald-600 font-medium">
                            №{item.certificate_number}
                          </span>
                        ) : (
                          <span className="text-sm text-gray-400">—</span>
                        )}
                      </td>
                    </tr>
                  ))}

                {progress.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                      Нет данных о прогрессе
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Test Edit Modal */}
      {editingTest && (
        <TestEditModal
          test={editingTest}
          onSave={saveTest}
          onClose={() => setEditingTest(null)}
          onChange={setEditingTest}
        />
      )}

      {/* Access Management Modal */}
      {accessModalCourse && (
        <AccessManagementModal
          course={accessModalCourse}
          authFetch={authFetch}
          onClose={() => setAccessModalCourse(null)}
        />
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmCourse && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                <Trash2 className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Удалить курс?</h3>
                <p className="text-sm text-gray-500">Это действие нельзя отменить</p>
              </div>
            </div>
            <p className="text-gray-600 mb-6">
              Вы уверены, что хотите удалить курс <strong>"{deleteConfirmCourse.title}"</strong>? 
              Все главы, тесты и прогресс партнёров будут удалены.
            </p>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setDeleteConfirmCourse(null)}>
                Отмена
              </Button>
              <Button 
                className="bg-red-600 hover:bg-red-700 text-white"
                onClick={() => deleteCourse(deleteConfirmCourse.id)}
              >
                Удалить
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Course Edit Form Component
const CourseEditForm = ({ course, onSave, onCancel }) => {
  const [form, setForm] = useState({
    title: course.title || '',
    description: course.description || '',
    price: course.price || 0
  });

  return (
    <div className="p-4 border-b border-gray-100 bg-gray-50">
      <div className="space-y-3">
        <input
          type="text"
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
          placeholder="Название курса"
        />
        <textarea
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
          placeholder="Описание"
          rows={2}
        />
        <input
          type="number"
          value={form.price}
          onChange={(e) => setForm({ ...form, price: parseFloat(e.target.value) || 0 })}
          className="w-32 px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
          placeholder="Цена"
        />
        <div className="flex gap-2">
          <Button size="sm" onClick={() => onSave(form)} className="bg-violet-600 hover:bg-violet-700 shadow-md hover:shadow-lg transition-all">
            <Save className="w-4 h-4 mr-1" />
            Сохранить
          </Button>
          <Button size="sm" variant="outline" onClick={onCancel}>
            Отмена
          </Button>
        </div>
      </div>
    </div>
  );
};

// Chapter Edit Form Component
const ChapterEditForm = ({ chapter, onSave, onCancel }) => {
  const [form, setForm] = useState({
    title: chapter.title || '',
    description: chapter.description || '',
    video_url: chapter.video_url || '',
    content_html: chapter.content_html || ''
  });

  return (
    <div className="bg-gray-50 p-4 rounded-lg space-y-3">
      <input
        type="text"
        value={form.title}
        onChange={(e) => setForm({ ...form, title: e.target.value })}
        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
        placeholder="Название главы"
      />
      <textarea
        value={form.description}
        onChange={(e) => setForm({ ...form, description: e.target.value })}
        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
        placeholder="Краткое описание"
        rows={2}
      />
      <input
        type="text"
        value={form.video_url}
        onChange={(e) => setForm({ ...form, video_url: e.target.value })}
        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
        placeholder="URL видео (YouTube, VK, или прямая ссылка)"
      />
      <textarea
        value={form.content_html}
        onChange={(e) => setForm({ ...form, content_html: e.target.value })}
        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 font-mono text-sm"
        placeholder="HTML контент главы"
        rows={4}
      />
      <div className="flex gap-2">
        <Button size="sm" onClick={() => onSave(form)} className="bg-violet-600 hover:bg-violet-700 shadow-md hover:shadow-lg transition-all">
          <Save className="w-4 h-4 mr-1" />
          Сохранить
        </Button>
        <Button size="sm" variant="outline" onClick={onCancel}>
          Отмена
        </Button>
      </div>
    </div>
  );
};

// Access Management Modal Component
const AccessManagementModal = ({ course, authFetch, onClose }) => {
  const [partners, setPartners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [grantingAll, setGrantingAll] = useState(false);

  useEffect(() => {
    fetchAccessList();
  }, []);

  const fetchAccessList = async () => {
    setLoading(true);
    try {
      const response = await authFetch(`${API_URL}/api/admin/education/courses/${course.id}/access`);
      if (response.ok) {
        const data = await response.json();
        setPartners(data.partners);
      }
    } catch (error) {
      toast.error('Ошибка загрузки списка');
    } finally {
      setLoading(false);
    }
  };

  const grantAccess = async (partnerId) => {
    try {
      const response = await authFetch(`${API_URL}/api/admin/education/grant-access`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          partner_id: partnerId,
          course_id: course.id
        })
      });

      if (response.ok) {
        toast.success('Доступ выдан');
        fetchAccessList();
      }
    } catch (error) {
      toast.error('Ошибка выдачи доступа');
    }
  };

  const revokeAccess = async (partnerId) => {
    try {
      const response = await authFetch(`${API_URL}/api/admin/education/access/${partnerId}/${course.id}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        toast.success('Доступ отозван');
        fetchAccessList();
      }
    } catch (error) {
      toast.error('Ошибка отзыва доступа');
    }
  };

  const grantAllAccess = async () => {
    setGrantingAll(true);
    try {
      const response = await authFetch(`${API_URL}/api/admin/education/courses/${course.id}/grant-all`, {
        method: 'POST'
      });

      if (response.ok) {
        const data = await response.json();
        toast.success(`Доступ выдан ${data.granted_count} партнёрам`);
        fetchAccessList();
      }
    } catch (error) {
      toast.error('Ошибка выдачи доступа');
    } finally {
      setGrantingAll(false);
    }
  };

  const filteredPartners = partners.filter(p =>
    !searchQuery ||
    p.company_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.contact_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.inn?.includes(searchQuery) ||
    p.contact_email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const partnersWithAccess = partners.filter(p => p.has_access).length;
  const partnersWithoutAccess = partners.filter(p => !p.has_access).length;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-gray-900">Управление доступом</h3>
              <p className="text-sm text-gray-500">{course.title}</p>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Stats */}
          <div className="flex items-center gap-4 mt-3">
            <div className="flex items-center gap-2 text-sm">
              <UserCheck className="w-4 h-4 text-emerald-500" />
              <span className="text-gray-600">{partnersWithAccess} с доступом</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <UserX className="w-4 h-4 text-gray-400" />
              <span className="text-gray-600">{partnersWithoutAccess} без доступа</span>
            </div>
          </div>
        </div>

        {/* Search and Grant All */}
        <div className="p-4 border-b border-gray-100 flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Поиск по названию, имени или ИНН..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
          <Button
            onClick={grantAllAccess}
            disabled={grantingAll || partnersWithoutAccess === 0}
            className="bg-emerald-600 hover:bg-emerald-700 shadow-md whitespace-nowrap"
          >
            {grantingAll ? (
              <span className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                Выдача...
              </span>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Выдать всем
              </>
            )}
          </Button>
        </div>

        {/* Partners list */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center p-8">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-violet-200 border-t-violet-500"></div>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {filteredPartners.map((partner) => (
                <div key={partner.id} className="p-4 flex items-center justify-between hover:bg-gray-50">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      partner.has_access 
                        ? 'bg-emerald-100 text-emerald-600' 
                        : 'bg-gray-100 text-gray-400'
                    }`}>
                      {partner.has_access ? <UserCheck className="w-5 h-5" /> : <UserX className="w-5 h-5" />}
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">{partner.company_name || 'Без компании'}</div>
                      <div className="text-sm text-gray-500">
                        {partner.contact_name} {partner.contact_email && `• ${partner.contact_email}`} {partner.inn && `• ИНН: ${partner.inn}`}
                      </div>
                      {partner.has_access && partner.progress_status && (
                        <div className="text-xs text-violet-600 mt-0.5">
                          Прогресс: {partner.progress_percent || 0}% • 
                          {partner.progress_status === 'completed' ? ' Завершён' : 
                           partner.progress_status === 'in_progress' ? ' В процессе' : ' Не начат'}
                        </div>
                      )}
                    </div>
                  </div>
                  <div>
                    {partner.has_access ? (
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-red-500 hover:text-red-700 hover:border-red-300"
                        onClick={() => revokeAccess(partner.id)}
                      >
                        <UserX className="w-4 h-4 mr-1" />
                        Отозвать
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-emerald-600 hover:text-emerald-700 hover:border-emerald-300"
                        onClick={() => grantAccess(partner.id)}
                      >
                        <UserPlus className="w-4 h-4 mr-1" />
                        Выдать
                      </Button>
                    )}
                  </div>
                </div>
              ))}

              {filteredPartners.length === 0 && (
                <div className="p-8 text-center text-gray-500">
                  {searchQuery ? 'Партнёры не найдены' : 'Нет партнёров'}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-100 flex justify-end">
          <Button variant="outline" onClick={onClose}>
            Закрыть
          </Button>
        </div>
      </div>
    </div>
  );
};

// Test Edit Modal Component
const TestEditModal = ({ test, onSave, onClose, onChange }) => {
  const addQuestion = () => {
    onChange({
      ...test,
      questions: [
        ...test.questions,
        {
          id: Date.now(),
          text: '',
          multiple: false,
          options: ['', ''],
          correct: [0]
        }
      ]
    });
  };

  const updateQuestion = (qIndex, updates) => {
    const newQuestions = [...test.questions];
    newQuestions[qIndex] = { ...newQuestions[qIndex], ...updates };
    onChange({ ...test, questions: newQuestions });
  };

  const deleteQuestion = (qIndex) => {
    onChange({
      ...test,
      questions: test.questions.filter((_, i) => i !== qIndex)
    });
  };

  const addOption = (qIndex) => {
    const newQuestions = [...test.questions];
    newQuestions[qIndex].options.push('');
    onChange({ ...test, questions: newQuestions });
  };

  const updateOption = (qIndex, oIndex, value) => {
    const newQuestions = [...test.questions];
    newQuestions[qIndex].options[oIndex] = value;
    onChange({ ...test, questions: newQuestions });
  };

  const toggleCorrect = (qIndex, oIndex) => {
    const newQuestions = [...test.questions];
    const q = newQuestions[qIndex];

    if (q.multiple) {
      if (q.correct.includes(oIndex)) {
        q.correct = q.correct.filter(i => i !== oIndex);
      } else {
        q.correct = [...q.correct, oIndex];
      }
    } else {
      q.correct = [oIndex];
    }

    onChange({ ...test, questions: newQuestions });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-semibold text-gray-900">Редактирование теста</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto flex-1">
          {/* Test settings */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Название</label>
              <input
                type="text"
                value={test.title}
                onChange={(e) => onChange({ ...test, title: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Проходной балл (%)</label>
              <input
                type="number"
                value={test.passing_score}
                onChange={(e) => onChange({ ...test, passing_score: parseInt(e.target.value) || 80 })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Макс. попыток</label>
              <input
                type="number"
                value={test.max_attempts}
                onChange={(e) => onChange({ ...test, max_attempts: parseInt(e.target.value) || 3 })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
          </div>

          {/* Questions */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-gray-900">Вопросы</h4>
              <Button size="sm" onClick={addQuestion}>
                <Plus className="w-4 h-4 mr-1" />
                Добавить вопрос
              </Button>
            </div>

            {test.questions.map((question, qIndex) => (
              <div key={question.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-start gap-3 mb-3">
                  <span className="text-sm font-medium text-gray-500 mt-2">{qIndex + 1}.</span>
                  <div className="flex-1">
                    <input
                      type="text"
                      value={question.text}
                      onChange={(e) => updateQuestion(qIndex, { text: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                      placeholder="Текст вопроса"
                    />
                    <label className="flex items-center gap-2 mt-2 text-sm text-gray-600">
                      <input
                        type="checkbox"
                        checked={question.multiple}
                        onChange={(e) => updateQuestion(qIndex, { multiple: e.target.checked })}
                      />
                      Несколько правильных ответов
                    </label>
                  </div>
                  <button
                    onClick={() => deleteQuestion(qIndex)}
                    className="text-red-400 hover:text-red-600"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {/* Options */}
                <div className="space-y-2 ml-6">
                  {question.options.map((option, oIndex) => (
                    <div key={oIndex} className="flex items-center gap-2">
                      <input
                        type={question.multiple ? 'checkbox' : 'radio'}
                        checked={question.correct.includes(oIndex)}
                        onChange={() => toggleCorrect(qIndex, oIndex)}
                        className="text-purple-600"
                      />
                      <input
                        type="text"
                        value={option}
                        onChange={(e) => updateOption(qIndex, oIndex, e.target.value)}
                        className="flex-1 px-3 py-1.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                        placeholder={`Вариант ${oIndex + 1}`}
                      />
                    </div>
                  ))}
                  <button
                    onClick={() => addOption(qIndex)}
                    className="text-sm text-purple-600 hover:text-purple-700"
                  >
                    + Добавить вариант
                  </button>
                </div>
              </div>
            ))}

            {test.questions.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                Нет вопросов. Добавьте первый вопрос.
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-100 flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Отмена
          </Button>
          <Button onClick={onSave} className="bg-violet-600 hover:bg-violet-700 shadow-md hover:shadow-lg transition-all">
            <Save className="w-4 h-4 mr-2" />
            Сохранить тест
          </Button>
        </div>
      </div>
    </div>
  );
};

export default EmployeeEducation;
