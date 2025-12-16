import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { usePartnerAuth } from '../../context/PartnerAuthContext';
import {
  ArrowLeft,
  BookOpen,
  CheckCircle,
  Lock,
  PlayCircle,
  Clock,
  Award,
  ChevronRight,
  FileText,
  Download
} from 'lucide-react';
import { toast } from 'sonner';
import { Progress } from '../../components/ui/progress';
import { Button } from '../../components/ui/button';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const PartnerCourseView = () => {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const { authFetch } = usePartnerAuth();
  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCourse();
  }, [courseId]);

  const fetchCourse = async () => {
    try {
      const response = await authFetch(`${API_URL}/api/partner/courses/${courseId}`);
      if (response.ok) {
        const data = await response.json();
        setCourse(data);
      } else {
        toast.error('Курс не найден');
        navigate('/partner/education');
      }
    } catch (error) {
      console.error('Failed to fetch course:', error);
      toast.error('Ошибка загрузки курса');
    } finally {
      setLoading(false);
    }
  };

  const getChapterIcon = (chapter) => {
    if (chapter.progress_status === 'completed') {
      return <CheckCircle className="w-5 h-5 text-emerald-500" />;
    }
    if (chapter.progress_status === 'in_progress') {
      return <PlayCircle className="w-5 h-5 text-amber-500" />;
    }
    if (chapter.progress_status === 'locked') {
      return <Lock className="w-5 h-5 text-gray-300" />;
    }
    return <BookOpen className="w-5 h-5 text-blue-500" />;
  };

  const getChapterStatus = (chapter) => {
    if (chapter.progress_status === 'completed') {
      return { text: 'Завершена', color: 'text-emerald-600 bg-emerald-50' };
    }
    if (chapter.progress_status === 'in_progress') {
      return { text: 'В процессе', color: 'text-amber-600 bg-amber-50' };
    }
    if (chapter.progress_status === 'locked') {
      return { text: 'Заблокирована', color: 'text-gray-400 bg-gray-50' };
    }
    return { text: 'Доступна', color: 'text-blue-600 bg-blue-50' };
  };

  const getProgress = () => {
    if (!course || course.chapters.length === 0) return 0;
    const completed = course.chapters.filter(ch => ch.progress_status === 'completed').length;
    return Math.round((completed / course.chapters.length) * 100);
  };

  const downloadCertificate = async () => {
    try {
      const response = await authFetch(`${API_URL}/api/partner/courses/${courseId}/certificate`);
      if (response.ok) {
        const data = await response.json();
        // TODO: Скачать PDF
        toast.success(`Сертификат ${data.certificate_number}`);
      }
    } catch (error) {
      toast.error('Ошибка получения сертификата');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-amber-200 border-t-amber-500"></div>
      </div>
    );
  }

  if (!course) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Back button */}
      <Link
        to="/partner/education"
        className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Все курсы</span>
      </Link>

      {/* Course header */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="bg-gradient-to-br from-purple-500 to-indigo-600 p-6 text-white">
          <h1 className="text-2xl font-bold mb-2">{course.title}</h1>
          {course.description && (
            <p className="text-purple-100 mb-4">{course.description}</p>
          )}
          <div className="flex items-center gap-4 text-sm text-purple-100">
            <span className="flex items-center gap-1">
              <BookOpen className="w-4 h-4" />
              {course.chapters.length} глав
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              ~{Math.ceil(course.chapters.length * 15)} мин
            </span>
          </div>
        </div>

        {/* Progress */}
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <span className="font-medium text-gray-900">Ваш прогресс</span>
            <span className="text-sm text-gray-500">
              {course.chapters.filter(ch => ch.progress_status === 'completed').length} из {course.chapters.length} глав
            </span>
          </div>
          <Progress value={getProgress()} className="h-3" />
        </div>

        {/* Certificate */}
        {course.progress_status === 'completed' && (
          <div className="p-6 bg-emerald-50 border-b border-emerald-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center">
                  <Award className="w-6 h-6 text-emerald-600" />
                </div>
                <div>
                  <div className="font-semibold text-emerald-900">Курс завершён!</div>
                  {course.certificate_number ? (
                    <div className="text-sm text-emerald-700">
                      Сертификат №{course.certificate_number}
                    </div>
                  ) : (
                    <div className="text-sm text-emerald-700">
                      Сертификат готов к скачиванию
                    </div>
                  )}
                </div>
              </div>
              <Button
                onClick={downloadCertificate}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                <Download className="w-4 h-4 mr-2" />
                Скачать
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Chapters list */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">Программа курса</h2>
        </div>

        <div className="divide-y divide-gray-100">
          {course.chapters.map((chapter, index) => {
            const status = getChapterStatus(chapter);
            const isClickable = chapter.progress_status !== 'locked';

            return (
              <div
                key={chapter.id}
                className={`${
                  isClickable
                    ? 'hover:bg-gray-50 cursor-pointer'
                    : 'opacity-60 cursor-not-allowed'
                } transition-colors`}
                onClick={() => isClickable && navigate(`/partner/education/${courseId}/chapter/${chapter.id}`)}
              >
                <div className="px-6 py-4 flex items-center gap-4">
                  {/* Number */}
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                    chapter.progress_status === 'completed'
                      ? 'bg-emerald-100'
                      : chapter.progress_status === 'in_progress'
                      ? 'bg-amber-100'
                      : chapter.progress_status === 'available'
                      ? 'bg-blue-100'
                      : 'bg-gray-100'
                  }`}>
                    {getChapterIcon(chapter)}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm text-gray-400">Глава {index + 1}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${status.color}`}>
                        {status.text}
                      </span>
                    </div>
                    <h3 className={`font-medium ${
                      chapter.progress_status === 'locked' ? 'text-gray-400' : 'text-gray-900'
                    }`}>
                      {chapter.title}
                    </h3>
                    {chapter.description && (
                      <p className="text-sm text-gray-500 mt-1 line-clamp-1">
                        {chapter.description}
                      </p>
                    )}

                    {/* Meta */}
                    <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                      {chapter.video_url && (
                        <span className="flex items-center gap-1">
                          <PlayCircle className="w-3 h-3" />
                          Видео
                        </span>
                      )}
                      {chapter.has_test > 0 && (
                        <span className="flex items-center gap-1">
                          <FileText className="w-3 h-3" />
                          Тест {chapter.test_passed ? '✓' : ''}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Arrow */}
                  {isClickable && (
                    <ChevronRight className="w-5 h-5 text-gray-300" />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default PartnerCourseView;
