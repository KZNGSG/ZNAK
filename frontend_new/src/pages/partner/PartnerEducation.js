import React, { useState, useEffect } from 'react';
import { usePartnerAuth } from '../../context/PartnerAuthContext';
import { Link } from 'react-router-dom';
import {
  GraduationCap,
  BookOpen,
  CheckCircle,
  Lock,
  PlayCircle,
  Clock,
  Award,
  ChevronRight,
  AlertCircle
} from 'lucide-react';
import { toast } from 'sonner';
import { Progress } from '../../components/ui/progress';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const PartnerEducation = () => {
  const { authFetch } = usePartnerAuth();
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCourses();
  }, []);

  const fetchCourses = async () => {
    try {
      const response = await authFetch(`${API_URL}/api/partner/courses`);
      if (response.ok) {
        const data = await response.json();
        setCourses(data.courses);
      }
    } catch (error) {
      console.error('Failed to fetch courses:', error);
      toast.error('Ошибка загрузки курсов');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (course) => {
    if (course.progress_status === 'completed') {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 text-sm font-medium">
          <CheckCircle className="w-4 h-4" />
          Завершён
        </span>
      );
    }
    if (course.progress_status === 'in_progress') {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 text-amber-700 text-sm font-medium">
          <PlayCircle className="w-4 h-4" />
          В процессе
        </span>
      );
    }
    if (!course.has_access) {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gray-100 text-gray-600 text-sm font-medium">
          <Lock className="w-4 h-4" />
          Нет доступа
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-sm font-medium">
        <BookOpen className="w-4 h-4" />
        Не начат
      </span>
    );
  };

  const getProgress = (course) => {
    if (course.total_chapters === 0) return 0;
    return Math.round((course.completed_chapters / course.total_chapters) * 100);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-amber-200 border-t-amber-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-br from-purple-500 to-indigo-600 rounded-2xl p-6 text-white">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
            <GraduationCap className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Обучение</h1>
            <p className="text-purple-100">Станьте экспертом по маркировке</p>
          </div>
        </div>
        <p className="text-purple-100 text-sm">
          Пройдите обучение, чтобы получить все знания для успешной работы с клиентами.
          После завершения курса вы получите сертификат.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="text-2xl font-bold text-gray-900">
            {courses.filter(c => c.has_access).length}
          </div>
          <div className="text-sm text-gray-500">Доступно курсов</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="text-2xl font-bold text-amber-600">
            {courses.filter(c => c.progress_status === 'in_progress').length}
          </div>
          <div className="text-sm text-gray-500">В процессе</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="text-2xl font-bold text-emerald-600">
            {courses.filter(c => c.progress_status === 'completed').length}
          </div>
          <div className="text-sm text-gray-500">Завершено</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="text-2xl font-bold text-purple-600">
            {courses.filter(c => c.certificate_number).length}
          </div>
          <div className="text-sm text-gray-500">Сертификатов</div>
        </div>
      </div>

      {/* Courses list */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">Доступные курсы</h2>

        {courses.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <GraduationCap className="w-12 h-12 mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500">Курсы пока не добавлены</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {courses.map((course) => (
              <div
                key={course.id}
                className={`bg-white rounded-xl border overflow-hidden transition-all ${
                  course.has_access
                    ? 'border-gray-200 hover:border-amber-300 hover:shadow-md cursor-pointer'
                    : 'border-gray-100 opacity-75'
                }`}
              >
                <Link
                  to={course.has_access ? `/partner/education/${course.id}` : '#'}
                  className={!course.has_access ? 'pointer-events-none' : ''}
                >
                  <div className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold text-gray-900">
                            {course.title}
                          </h3>
                          {getStatusBadge(course)}
                        </div>
                        {course.description && (
                          <p className="text-gray-600 text-sm mb-3">
                            {course.description}
                          </p>
                        )}
                        <div className="flex items-center gap-4 text-sm text-gray-500">
                          <span className="flex items-center gap-1">
                            <BookOpen className="w-4 h-4" />
                            {course.total_chapters} {course.total_chapters === 1 ? 'глава' : 'глав'}
                          </span>
                          {course.price > 0 && (
                            <span className="flex items-center gap-1 font-medium text-amber-600">
                              {course.price.toLocaleString('ru-RU')} ₽
                            </span>
                          )}
                        </div>
                      </div>
                      {course.has_access && (
                        <ChevronRight className="w-5 h-5 text-gray-400" />
                      )}
                    </div>

                    {/* Progress bar */}
                    {course.has_access && course.total_chapters > 0 && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-500">Прогресс</span>
                          <span className="font-medium text-gray-900">
                            {course.completed_chapters} из {course.total_chapters}
                          </span>
                        </div>
                        <Progress value={getProgress(course)} className="h-2" />
                      </div>
                    )}

                    {/* Certificate */}
                    {course.certificate_number && (
                      <div className="mt-4 p-3 bg-emerald-50 rounded-lg flex items-center gap-3">
                        <Award className="w-5 h-5 text-emerald-600" />
                        <div>
                          <div className="text-sm font-medium text-emerald-800">
                            Сертификат получен
                          </div>
                          <div className="text-xs text-emerald-600">
                            №{course.certificate_number}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* No access message */}
                    {!course.has_access && (
                      <div className="mt-4 p-3 bg-gray-50 rounded-lg flex items-center gap-3">
                        <Lock className="w-5 h-5 text-gray-400" />
                        <div className="text-sm text-gray-600">
                          Свяжитесь с менеджером для получения доступа
                        </div>
                      </div>
                    )}
                  </div>
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Help section */}
      <div className="bg-amber-50 rounded-xl border border-amber-200 p-6">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0">
            <AlertCircle className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <h3 className="font-semibold text-amber-900 mb-1">Как проходит обучение?</h3>
            <ul className="text-sm text-amber-800 space-y-1">
              <li>• Каждый курс состоит из нескольких глав</li>
              <li>• В каждой главе есть видео и/или текстовые материалы</li>
              <li>• После просмотра нужно пройти тест</li>
              <li>• Главы открываются последовательно — сначала пройдите первую</li>
              <li>• После завершения курса вы получите сертификат</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PartnerEducation;
