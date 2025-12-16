import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { MessageSquare, Sparkles, Clock, ArrowLeft, Bot, Zap, Shield } from 'lucide-react';
import { motion } from 'framer-motion';
import AIChatWidget from '../components/AIChatWidget';

const ConsultationPage = () => {
  const navigate = useNavigate();
  const [isChatOpen, setIsChatOpen] = useState(false);

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
          className="text-center mb-12"
        >
          {/* Icon */}
          <div className="inline-flex p-6 rounded-3xl bg-gradient-to-br from-[rgb(var(--brand-yellow-100))] to-[rgb(var(--brand-yellow-200))] shadow-lg mb-6">
            <Bot size={64} strokeWidth={2} className="text-[rgb(var(--grey-900))]" />
          </div>

          {/* Title */}
          <h1 className="text-4xl sm:text-5xl font-bold text-[rgb(var(--black))] mb-4 flex items-center justify-center gap-3">
            AI-эксперт
            <span className="badge badge-yellow text-base">GPT</span>
          </h1>

          {/* Subtitle */}
          <p className="text-xl text-[rgb(var(--grey-700))] max-w-2xl mx-auto font-medium leading-relaxed">
            Умный помощник ответит на любые вопросы о маркировке товаров
          </p>
        </motion.div>

        {/* Main CTA Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.7, delay: 0.2 }}
          className="bg-white rounded-3xl p-10 border-2 border-[rgb(var(--brand-yellow-300))] shadow-[var(--shadow-elevated)] mb-10"
        >
          <div className="text-center space-y-6">
            {/* Big Chat Button */}
            <Button
              onClick={() => setIsChatOpen(true)}
              className="btn-gradient rounded-2xl px-10 py-6 text-xl font-bold shadow-lg hover:shadow-xl transition-all transform hover:scale-[1.02] flex items-center gap-3 mx-auto"
              data-testid="start-ai-chat"
            >
              <MessageSquare size={28} />
              Чат с экспертом AI
              <Sparkles size={24} className="text-[rgb(var(--brand-yellow-200))]" />
            </Button>

            <p className="text-sm text-[rgb(var(--grey-500))]">
              Бесплатно и без регистрации
            </p>
          </div>
        </motion.div>

        {/* Features */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.3 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10"
        >
          <div className="p-6 rounded-2xl bg-white border border-[rgb(var(--grey-200))] shadow-sm">
            <div className="w-12 h-12 rounded-xl bg-[rgb(var(--brand-yellow-100))] flex items-center justify-center mb-4">
              <Zap size={24} className="text-[rgb(var(--grey-900))]" />
            </div>
            <h3 className="font-bold text-base text-[rgb(var(--black))] mb-2">Мгновенные ответы</h3>
            <p className="text-sm text-[rgb(var(--grey-600))]">
              AI отвечает сразу, без ожидания в очереди
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-white border border-[rgb(var(--grey-200))] shadow-sm">
            <div className="w-12 h-12 rounded-xl bg-[rgb(var(--brand-yellow-100))] flex items-center justify-center mb-4">
              <Clock size={24} className="text-[rgb(var(--grey-900))]" />
            </div>
            <h3 className="font-bold text-base text-[rgb(var(--black))] mb-2">24/7 доступность</h3>
            <p className="text-sm text-[rgb(var(--grey-600))]">
              Консультация в любое время дня и ночи
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-white border border-[rgb(var(--grey-200))] shadow-sm">
            <div className="w-12 h-12 rounded-xl bg-[rgb(var(--brand-yellow-100))] flex items-center justify-center mb-4">
              <Shield size={24} className="text-[rgb(var(--grey-900))]" />
            </div>
            <h3 className="font-bold text-base text-[rgb(var(--black))] mb-2">Актуальные данные</h3>
            <p className="text-sm text-[rgb(var(--grey-600))]">
              Обучен на актуальных правилах маркировки
            </p>
          </div>
        </motion.div>

        {/* Example Questions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.4 }}
          className="bg-[rgb(var(--grey-100))] rounded-2xl p-6 mb-10"
        >
          <h3 className="font-bold text-lg text-[rgb(var(--black))] mb-4 flex items-center gap-2">
            <MessageSquare size={20} />
            Примеры вопросов
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              'Нужно ли маркировать одежду для продажи на Wildberries?',
              'Как получить коды маркировки для обуви?',
              'Какое оборудование нужно для маркировки?',
              'Какие штрафы за отсутствие маркировки?',
              'Как маркировать импортный товар?',
              'Нужна ли маркировка для ИП?'
            ].map((question, idx) => (
              <button
                key={idx}
                onClick={() => setIsChatOpen(true)}
                className="text-left p-3 rounded-xl bg-white border border-[rgb(var(--grey-200))] hover:border-[rgb(var(--brand-yellow-400))] hover:shadow-md transition-all text-sm text-[rgb(var(--grey-700))] hover:text-[rgb(var(--black))]"
              >
                "{question}"
              </button>
            ))}
          </div>
        </motion.div>

        {/* Alternative CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.5 }}
          className="bg-gradient-to-br from-[rgb(var(--brand-yellow-50))] to-[rgb(var(--grey-100))] rounded-2xl p-6 border border-[rgb(var(--brand-yellow-200))]"
        >
          <h3 className="text-lg font-bold text-[rgb(var(--black))] mb-3 text-center">
            Предпочитаете живое общение?
          </h3>
          <div className="flex flex-wrap gap-3 justify-center">
            <Button
              onClick={() => navigate('/contact')}
              className="rounded-xl bg-[rgb(var(--grey-900))] text-white px-6 py-3 hover:bg-[rgb(var(--grey-800))]"
            >
              Написать менеджеру
            </Button>
          </div>
        </motion.div>
      </div>

      {/* AI Chat Widget */}
      <AIChatWidget isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} />
    </div>
  );
};

export default ConsultationPage;
