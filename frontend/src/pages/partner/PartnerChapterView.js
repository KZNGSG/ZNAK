import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { usePartnerAuth } from '../../context/PartnerAuthContext';
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CheckCircle,
  PlayCircle,
  Clock,
  FileText,
  AlertCircle,
  RefreshCw,
  Award,
  X
} from 'lucide-react';
import { toast } from 'sonner';
import { Progress } from '../../components/ui/progress';
import { Button } from '../../components/ui/button';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const PartnerChapterView = () => {
  const { courseId, chapterId } = useParams();
  const navigate = useNavigate();
  const { authFetch } = usePartnerAuth();

  const [chapter, setChapter] = useState(null);
  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('content'); // content | test

  // Video state
  const [videoWatched, setVideoWatched] = useState(false);
  const [videoProgress, setVideoProgress] = useState(0);
  const videoRef = useRef(null);

  // Test state
  const [test, setTest] = useState(null);
  const [testLoading, setTestLoading] = useState(false);
  const [answers, setAnswers] = useState({});
  const [testResult, setTestResult] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchChapterData();
  }, [courseId, chapterId]);

  const fetchChapterData = async () => {
    try {
      // Загружаем курс и главу
      const courseResponse = await authFetch(`${API_URL}/api/partner/courses/${courseId}`);
      if (!courseResponse.ok) {
        toast.error('Курс не найден');
        navigate('/partner/education');
        return;
      }

      const courseData = await courseResponse.json();
      setCourse(courseData);

      const chapterData = courseData.chapters.find(ch => ch.id === parseInt(chapterId));
      if (!chapterData) {
        toast.error('Глава не найдена');
        navigate(`/partner/education/${courseId}`);
        return;
      }

      if (chapterData.progress_status === 'locked') {
        toast.error('Эта глава ещё не доступна');
        navigate(`/partner/education/${courseId}`);
        return;
      }

      setChapter(chapterData);
      setVideoWatched(chapterData.video_watched || false);
      setVideoProgress(chapterData.video_progress || 0);

      // Отмечаем начало главы
      if (chapterData.progress_status === 'available') {
        await authFetch(`${API_URL}/api/partner/chapters/${chapterId}/start`, {
          method: 'POST'
        });
      }

      // Загружаем тест если есть
      if (chapterData.has_test) {
        await fetchTest();
      }

    } catch (error) {
      console.error('Failed to fetch chapter:', error);
      toast.error('Ошибка загрузки главы');
    } finally {
      setLoading(false);
    }
  };

  const fetchTest = async () => {
    setTestLoading(true);
    try {
      const response = await authFetch(`${API_URL}/api/partner/chapters/${chapterId}/test`);
      if (response.ok) {
        const data = await response.json();
        setTest(data);

        // Если уже сдан успешно
        if (data.last_attempt && data.last_attempt.passed) {
          setTestResult({
            passed: true,
            score: data.last_attempt.score,
            passed_at: data.last_attempt.created_at
          });
        }
      }
    } catch (error) {
      console.error('Failed to fetch test:', error);
    } finally {
      setTestLoading(false);
    }
  };

  // Обновление прогресса видео
  const handleVideoProgress = async (e) => {
    const video = e.target;
    const progress = Math.floor(video.currentTime);
    const duration = Math.floor(video.duration);

    // Обновляем каждые 10 секунд
    if (progress > 0 && progress % 10 === 0 && progress !== videoProgress) {
      setVideoProgress(progress);

      // Считаем просмотренным если > 80%
      const watched = progress >= duration * 0.8;
      if (watched && !videoWatched) {
        setVideoWatched(true);
      }

      try {
        await authFetch(`${API_URL}/api/partner/chapters/${chapterId}/video-progress`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            progress_seconds: progress,
            watched: watched
          })
        });
      } catch (error) {
        console.error('Failed to update video progress:', error);
      }
    }
  };

  const handleVideoEnded = async () => {
    setVideoWatched(true);
    try {
      await authFetch(`${API_URL}/api/partner/chapters/${chapterId}/video-progress`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          progress_seconds: Math.floor(videoRef.current?.duration || 0),
          watched: true
        })
      });
      toast.success('Видео просмотрено!');
    } catch (error) {
      console.error('Failed to update video progress:', error);
    }
  };

  // Обработка ответов на тест
  const handleAnswerChange = (questionId, optionIndex, isMultiple) => {
    setAnswers(prev => {
      if (isMultiple) {
        const current = prev[questionId] || [];
        if (current.includes(optionIndex)) {
          return { ...prev, [questionId]: current.filter(i => i !== optionIndex) };
        } else {
          return { ...prev, [questionId]: [...current, optionIndex] };
        }
      } else {
        return { ...prev, [questionId]: [optionIndex] };
      }
    });
  };

  const submitTest = async () => {
    if (!test) return;

    // Проверяем что все вопросы отвечены
    const unanswered = test.questions.filter(q => !answers[q.id] || answers[q.id].length === 0);
    if (unanswered.length > 0) {
      toast.error(`Ответьте на все вопросы (осталось ${unanswered.length})`);
      return;
    }

    setSubmitting(true);
    try {
      const response = await authFetch(`${API_URL}/api/partner/tests/${test.test_id}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers })
      });

      if (response.ok) {
        const result = await response.json();
        setTestResult(result);

        if (result.passed) {
          toast.success(`Тест пройден! Результат: ${result.score}%`);
        } else {
          toast.error(`Тест не пройден. Результат: ${result.score}%. Нужно ${test.passing_score}%`);
        }

        // Обновляем данные теста
        await fetchTest();

      } else {
        const error = await response.json();
        toast.error(error.detail || 'Ошибка отправки теста');
      }
    } catch (error) {
      console.error('Failed to submit test:', error);
      toast.error('Ошибка отправки теста');
    } finally {
      setSubmitting(false);
    }
  };

  const resetTest = () => {
    setAnswers({});
    setTestResult(null);
  };

  // Навигация между главами
  const getNextChapter = () => {
    if (!course) return null;
    const currentIndex = course.chapters.findIndex(ch => ch.id === parseInt(chapterId));
    if (currentIndex < course.chapters.length - 1) {
      return course.chapters[currentIndex + 1];
    }
    return null;
  };

  const getPrevChapter = () => {
    if (!course) return null;
    const currentIndex = course.chapters.findIndex(ch => ch.id === parseInt(chapterId));
    if (currentIndex > 0) {
      return course.chapters[currentIndex - 1];
    }
    return null;
  };

  // Проверка можно ли перейти к тесту
  const canTakeTest = () => {
    if (!chapter?.video_url) return true; // Нет видео - можно сразу
    return videoWatched;
  };

  // Проверка завершена ли глава
  const isChapterCompleted = () => {
    if (!chapter) return false;
    if (chapter.has_test && !testResult?.passed) return false;
    if (chapter.video_url && !videoWatched) return false;
    return true;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-amber-200 border-t-amber-500"></div>
      </div>
    );
  }

  if (!chapter) {
    return null;
  }

  const nextChapter = getNextChapter();
  const prevChapter = getPrevChapter();
  const currentIndex = course.chapters.findIndex(ch => ch.id === parseInt(chapterId));

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Link to="/partner/education" className="hover:text-gray-900">Обучение</Link>
        <span>/</span>
        <Link to={`/partner/education/${courseId}`} className="hover:text-gray-900">{course.title}</Link>
        <span>/</span>
        <span className="text-gray-900">Глава {currentIndex + 1}</span>
      </div>

      {/* Header */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="bg-gradient-to-br from-purple-500 to-indigo-600 p-6 text-white">
          <div className="flex items-center gap-2 text-purple-200 text-sm mb-2">
            <BookOpen className="w-4 h-4" />
            <span>Глава {currentIndex + 1} из {course.chapters.length}</span>
          </div>
          <h1 className="text-2xl font-bold mb-2">{chapter.title}</h1>
          {chapter.description && (
            <p className="text-purple-100">{chapter.description}</p>
          )}
        </div>

        {/* Progress indicators */}
        <div className="p-4 border-b border-gray-100 flex items-center gap-6">
          {chapter.video_url && (
            <div className={`flex items-center gap-2 ${videoWatched ? 'text-emerald-600' : 'text-gray-400'}`}>
              {videoWatched ? (
                <CheckCircle className="w-5 h-5" />
              ) : (
                <PlayCircle className="w-5 h-5" />
              )}
              <span className="text-sm font-medium">Видео</span>
            </div>
          )}
          {chapter.has_test && (
            <div className={`flex items-center gap-2 ${testResult?.passed ? 'text-emerald-600' : 'text-gray-400'}`}>
              {testResult?.passed ? (
                <CheckCircle className="w-5 h-5" />
              ) : (
                <FileText className="w-5 h-5" />
              )}
              <span className="text-sm font-medium">Тест</span>
            </div>
          )}

          {isChapterCompleted() && (
            <div className="ml-auto flex items-center gap-2 text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-full">
              <Award className="w-4 h-4" />
              <span className="text-sm font-medium">Глава завершена</span>
            </div>
          )}
        </div>

        {/* Tabs */}
        {chapter.has_test && (
          <div className="flex border-b border-gray-100">
            <button
              onClick={() => setActiveTab('content')}
              className={`flex-1 py-3 text-sm font-medium transition-colors ${
                activeTab === 'content'
                  ? 'text-purple-600 border-b-2 border-purple-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Материалы
            </button>
            <button
              onClick={() => setActiveTab('test')}
              disabled={!canTakeTest()}
              className={`flex-1 py-3 text-sm font-medium transition-colors ${
                activeTab === 'test'
                  ? 'text-purple-600 border-b-2 border-purple-600'
                  : !canTakeTest()
                  ? 'text-gray-300 cursor-not-allowed'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Тест {!canTakeTest() && '🔒'}
            </button>
          </div>
        )}
      </div>

      {/* Content */}
      {activeTab === 'content' && (
        <div className="space-y-6">
          {/* Video */}
          {chapter.video_url && (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="aspect-video bg-black">
                {chapter.video_url.includes('youtube') || chapter.video_url.includes('youtu.be') ? (
                  <iframe
                    src={chapter.video_url.replace('watch?v=', 'embed/')}
                    className="w-full h-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                ) : chapter.video_url.includes('vk.com') ? (
                  <iframe
                    src={chapter.video_url}
                    className="w-full h-full"
                    allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
                    allowFullScreen
                  />
                ) : (
                  <video
                    ref={videoRef}
                    src={chapter.video_url}
                    controls
                    className="w-full h-full"
                    onTimeUpdate={handleVideoProgress}
                    onEnded={handleVideoEnded}
                  />
                )}
              </div>

              {!videoWatched && (
                <div className="p-4 bg-amber-50 border-t border-amber-100">
                  <div className="flex items-center gap-2 text-amber-700 text-sm">
                    <AlertCircle className="w-4 h-4" />
                    <span>Просмотрите видео до конца, чтобы открыть тест</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Text content */}
          {chapter.content_html && (
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Материалы главы</h3>
              <div
                className="prose prose-sm max-w-none"
                dangerouslySetInnerHTML={{ __html: chapter.content_html }}
              />
            </div>
          )}

          {/* Button to go to test */}
          {chapter.has_test && canTakeTest() && !testResult?.passed && (
            <div className="flex justify-center">
              <Button
                onClick={() => setActiveTab('test')}
                className="bg-purple-600 hover:bg-purple-700"
              >
                <FileText className="w-4 h-4 mr-2" />
                Перейти к тесту
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Test */}
      {activeTab === 'test' && test && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="p-6 border-b border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-gray-900">{test.title}</h3>
                <p className="text-sm text-gray-500 mt-1">
                  Проходной балл: {test.passing_score}% •
                  Попыток использовано: {test.attempts_used} из {test.max_attempts}
                </p>
              </div>
              {testResult?.passed && (
                <div className="flex items-center gap-2 text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-full">
                  <CheckCircle className="w-4 h-4" />
                  <span className="text-sm font-medium">Пройден: {testResult.score}%</span>
                </div>
              )}
            </div>
          </div>

          {/* Test result banner */}
          {testResult && !testResult.passed && (
            <div className="p-4 bg-red-50 border-b border-red-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-red-700">
                  <X className="w-5 h-5" />
                  <span>Тест не пройден. Результат: {testResult.score}%</span>
                </div>
                {test.attempts_used < test.max_attempts && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={resetTest}
                    className="text-red-600 border-red-300 hover:bg-red-50"
                  >
                    <RefreshCw className="w-4 h-4 mr-1" />
                    Попробовать снова
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* No more attempts */}
          {!testResult?.passed && test.attempts_used >= test.max_attempts && (
            <div className="p-6 text-center">
              <AlertCircle className="w-12 h-12 mx-auto text-gray-300 mb-3" />
              <p className="text-gray-500">Попытки закончились. Обратитесь к менеджеру.</p>
            </div>
          )}

          {/* Questions */}
          {(!testResult || (!testResult.passed && test.attempts_used < test.max_attempts)) && (
            <div className="p-6 space-y-6">
              {test.questions.map((question, qIndex) => (
                <div key={question.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="font-medium text-gray-900 mb-3">
                    {qIndex + 1}. {question.text}
                    {question.multiple && (
                      <span className="text-sm text-gray-400 ml-2">(несколько вариантов)</span>
                    )}
                  </div>

                  <div className="space-y-2">
                    {question.options.map((option, oIndex) => (
                      <label
                        key={oIndex}
                        className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                          answers[question.id]?.includes(oIndex)
                            ? 'border-purple-500 bg-purple-50'
                            : 'border-gray-200 hover:bg-gray-50'
                        }`}
                      >
                        <input
                          type={question.multiple ? 'checkbox' : 'radio'}
                          name={`question-${question.id}`}
                          checked={answers[question.id]?.includes(oIndex) || false}
                          onChange={() => handleAnswerChange(question.id, oIndex, question.multiple)}
                          className="text-purple-600 focus:ring-purple-500"
                        />
                        <span className="text-gray-700">{option}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}

              <div className="flex justify-center pt-4">
                <Button
                  onClick={submitTest}
                  disabled={submitting}
                  className="bg-purple-600 hover:bg-purple-700 px-8"
                >
                  {submitting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
                      Проверка...
                    </>
                  ) : (
                    'Отправить ответы'
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* Test passed */}
          {testResult?.passed && (
            <div className="p-8 text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-emerald-100 flex items-center justify-center">
                <CheckCircle className="w-8 h-8 text-emerald-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Отлично!</h3>
              <p className="text-gray-500 mb-4">
                Вы успешно прошли тест с результатом {testResult.score}%
              </p>
              {nextChapter && nextChapter.progress_status !== 'locked' && (
                <Button
                  onClick={() => navigate(`/partner/education/${courseId}/chapter/${nextChapter.id}`)}
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  Следующая глава
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between">
        {prevChapter ? (
          <Button
            variant="outline"
            onClick={() => navigate(`/partner/education/${courseId}/chapter/${prevChapter.id}`)}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Предыдущая глава
          </Button>
        ) : (
          <div />
        )}

        {nextChapter ? (
          nextChapter.progress_status === 'locked' ? (
            <Button variant="outline" disabled className="opacity-50">
              Следующая глава 🔒
            </Button>
          ) : (
            <Button
              variant="outline"
              onClick={() => navigate(`/partner/education/${courseId}/chapter/${nextChapter.id}`)}
            >
              Следующая глава
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          )
        ) : isChapterCompleted() ? (
          <Button
            onClick={() => navigate(`/partner/education/${courseId}`)}
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            <Award className="w-4 h-4 mr-2" />
            Курс завершён!
          </Button>
        ) : (
          <div />
        )}
      </div>
    </div>
  );
};

export default PartnerChapterView;
