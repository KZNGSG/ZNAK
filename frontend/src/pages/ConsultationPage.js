import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { MessageSquare, Sparkles, Clock, ArrowLeft } from 'lucide-react';
import { motion } from 'framer-motion';

const ConsultationPage = () => {
  const navigate = useNavigate();

  return (
    <div className="py-12 bg-gradient-to-b from-[rgb(var(--brand-yellow-50))] to-white min-h-screen">
      <div className="mx-auto max-w-[900px] px-4 sm:px-6 lg:px-8">
        {/* Back button */}
        <Button
          onClick={() => navigate('/')}
          variant="secondary"
          className="mb-8 rounded-xl flex items-center gap-2"
          data-testid="back-button"
        >
          <ArrowLeft size={18} />
          На главную
        </Button>

        {/* Hero Section */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          className="text-center mb-16"
        >
          {/* Icon */}
          <div className="inline-flex p-6 rounded-3xl bg-gradient-to-br from-[rgb(var(--brand-yellow-100))] to-[rgb(var(--brand-yellow-200))] shadow-lg mb-6">
            <MessageSquare size={64} strokeWidth={2.5} className="text-[rgb(var(--grey-900))]" />
          </div>

          {/* Title */}
          <h1 className="text-4xl sm:text-5xl font-bold text-[rgb(var(--black))] mb-4 flex items-center justify-center gap-3">
            AI-консультант
            <span className="badge badge-yellow text-base">Beta</span>
          </h1>

          {/* Subtitle */}
          <p className="text-xl text-[rgb(var(--grey-700))] max-w-2xl mx-auto font-medium leading-relaxed">
            Умный помощник для вопросов о маркировке товаров
          </p>
        </motion.div>

        {/* Coming Soon Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.7, delay: 0.2 }}
          className="bg-white rounded-3xl p-10 border-2 border-[rgb(var(--grey-300))] shadow-[var(--shadow-elevated)] mb-12"
        >
          <div className="text-center space-y-6">
            {/* Status */}
            <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[rgb(var(--brand-yellow-100))] border-2 border-[rgb(var(--brand-yellow-300))]">
              <Sparkles size={20} className="text-[rgb(var(--brand-yellow-600))]" />
              <span className="text-sm font-bold text-[rgb(var(--grey-900))]">В разработке</span>
            </div>

            <h2 className="text-2xl font-bold text-[rgb(var(--black))]">
              AI-ассистент готовится к запуску
            </h2>

            <p className="text-base text-[rgb(var(--grey-600))] max-w-xl mx-auto leading-relaxed">
              Мы обучаем искусственный интеллект, чтобы он мог отвечать на ваши вопросы о маркировке товаров моментально и точно.
            </p>

            {/* Features preview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-6">
              <div className="p-4 rounded-xl bg-[rgb(var(--grey-100))]">
                <div className="w-12 h-12 rounded-xl bg-[rgb(var(--brand-yellow-100))] flex items-center justify-center mx-auto mb-3">
                  <Clock size={24} className="text-[rgb(var(--grey-900))]" />
                </div>
                <h3 className="font-bold text-sm text-[rgb(var(--black))] mb-1">24/7 доступность</h3>
                <p className="text-xs text-[rgb(var(--grey-600))]">Ответы в любое время</p>
              </div>

              <div className="p-4 rounded-xl bg-[rgb(var(--grey-100))]">
                <div className="w-12 h-12 rounded-xl bg-[rgb(var(--brand-yellow-100))] flex items-center justify-center mx-auto mb-3">
                  <MessageSquare size={24} className="text-[rgb(var(--grey-900))]" />
                </div>
                <h3 className="font-bold text-sm text-[rgb(var(--black))] mb-1">Понятные ответы</h3>
                <p className="text-xs text-[rgb(var(--grey-600))]">Простым языком</p>
              </div>

              <div className="p-4 rounded-xl bg-[rgb(var(--grey-100))]">
                <div className="w-12 h-12 rounded-xl bg-[rgb(var(--brand-yellow-100))] flex items-center justify-center mx-auto mb-3">
                  <Sparkles size={24} className="text-[rgb(var(--grey-900))]" />
                </div>
                <h3 className="font-bold text-sm text-[rgb(var(--black))] mb-1">Умный помощник</h3>
                <p className="text-xs text-[rgb(var(--grey-600))]">На базе AI</p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Alternative CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.4 }}
          className="bg-gradient-to-br from-[rgb(var(--brand-yellow-50))] to-[rgb(var(--grey-100))] rounded-2xl p-8 border-2 border-[rgb(var(--brand-yellow-200))]"
        >
          <h3 className="text-xl font-bold text-[rgb(var(--black))] mb-3 text-center">
            А пока используйте наши инструменты
          </h3>
          <div className="flex flex-wrap gap-3 justify-center">
            <Button
              onClick={() => navigate('/check')}
              className="btn-gradient rounded-xl px-6 py-3"
            >
              Проверить товар
            </Button>
            <Button
              onClick={() => navigate('/equipment')}
              className="rounded-xl bg-white text-[rgb(var(--black))] px-6 py-3 border-2 border-[rgb(var(--grey-300))] hover:bg-[rgb(var(--grey-100))]"
            >
              Подобрать оборудование
            </Button>
            <Button
              onClick={() => navigate('/contact')}
              className="rounded-xl bg-[rgb(var(--grey-900))] text-white px-6 py-3 hover:bg-[rgb(var(--grey-800))]"
            >
              Задать вопрос человеку
            </Button>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default ConsultationPage;
