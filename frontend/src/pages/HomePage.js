import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { BadgeCheck, Rocket, ShieldCheck, Layers, ScanLine, Ship, Settings, FileText, ClipboardList, QrCode, BookOpen, UserCircle } from 'lucide-react';
import { motion } from 'framer-motion';

const HomePage = () => {
  const navigate = useNavigate();

  // Компактные бейджи преимуществ
  const benefits = [
    { icon: BadgeCheck, title: 'Понятно' },
    { icon: Rocket, title: 'Быстро' },
    { icon: ShieldCheck, title: 'Надёжно' },
    { icon: Layers, title: 'Всё включено' }
  ];

  // Новые карточки функций
  const features = [
    {
      icon: ClipboardList,
      title: 'Чек-лист подключения',
      description: 'Пошаговая инструкция для регистрации в Честном ЗНАКе',
      path: '/checklist'
    },
    {
      icon: QrCode,
      title: 'Проверка кода маркировки',
      description: 'Отсканируйте или введите код для проверки подлинности',
      path: '/scanner'
    },
    {
      icon: BookOpen,
      title: 'База знаний',
      description: 'Статьи, инструкции и ответы на частые вопросы',
      path: '/knowledge'
    },
    {
      icon: UserCircle,
      title: 'Личный кабинет',
      description: 'Сохранённые проверки и персональные рекомендации',
      path: '/account'
    }
  ];

  const actions = [
    {
      icon: ScanLine,
      title: 'Проверить товар',
      description: 'Узнайте, подлежит ли ваш товар обязательной маркировке',
      path: '/check',
      disabled: false
    },
    {
      icon: Ship,
      title: 'Импорт товаров',
      description: 'Как правильно завезти и промаркировать импортный товар',
      path: '/import',
      disabled: false
    },
    {
      icon: Settings,
      title: 'Оснащение производства',
      description: 'Подберём оборудование для маркировки под ваш объём',
      path: '/equipment',
      disabled: false
    },
    {
      icon: FileText,
      title: 'Получить КП',
      description: 'Запросите коммерческое предложение на подключение к маркировке',
      path: '/contact',
      disabled: false
    }
  ];

  return (
    <div className="fade-in">
      {/* Hero Section - Enhanced */}
      <section className="relative py-20 sm:py-32 noise-bg overflow-hidden" data-testid="hero-section">
        {/* Enhanced decorative elements - Yellow glow */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.4 }}
          transition={{ duration: 1 }}
          className="absolute -top-20 -right-20 w-[600px] h-[600px] rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(255,218,7,0.2) 0%, rgba(255,218,7,0) 70%)',
            filter: 'blur(80px)'
          }}
          aria-hidden="true"
        />
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.35 }}
          transition={{ duration: 1, delay: 0.2 }}
          className="absolute bottom-0 -left-20 w-[700px] h-[700px] rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(245,195,0,0.15) 0%, rgba(245,195,0,0) 70%)',
            filter: 'blur(90px)'
          }}
          aria-hidden="true"
        />

        <div className="relative mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Left: Content */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7 }}
              className="space-y-6"
            >
              <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white/90 backdrop-blur-sm border-2 border-[rgb(var(--brand-yellow-300))] shadow-md">
                <div className="w-2.5 h-2.5 rounded-full bg-[rgb(var(--brand-yellow-500))] animate-pulse shadow-sm" />
                <span className="text-sm font-bold text-[rgb(var(--black))]">Работает 24/7</span>
              </div>
              
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-[1.05] tracking-tight text-[rgb(var(--black))]">
                Маркировка товаров — <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#FFDA07] to-[#F5C300]" style={{WebkitTextStroke: '1px rgba(0,0,0,0.1)'}}>просто</span>
              </h1>
              
              <p className="text-lg md:text-xl text-[rgb(var(--grey-700))] leading-relaxed max-w-xl font-medium">
                Узнайте за <strong className="text-[rgb(var(--black))] font-bold bg-[rgb(var(--brand-yellow-100))] px-2 py-0.5 rounded">2 минуты</strong>, нужен ли вам Честный ЗНАК и что делать
              </p>
              
              <div className="flex flex-wrap gap-4 pt-4">
                <Button
                  onClick={() => navigate('/check')}
                  className="btn-gradient rounded-2xl px-8 py-4 text-base font-bold h-auto shadow-lg hover:shadow-2xl"
                  data-testid="hero-primary-cta"
                >
                  Проверить товар →
                </Button>
                <p className="text-sm text-[rgb(var(--grey-600))] font-medium mt-3">
                  Без регистрации • Занимает 2 минуты
                </p>
              </div>
            </motion.div>

            {/* Right: Enhanced decorative pattern - Yellow theme */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.7, delay: 0.3 }}
              className="hidden lg:flex relative min-h-[480px] items-center justify-center"
            >
              <div className="relative w-full h-full flex items-center justify-center">
                {/* Enhanced Data Matrix pattern - Yellow */}
                <div className="grid grid-cols-8 gap-3 p-6">
                  {[...Array(64)].map((_, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, scale: 0, rotate: 0 }}
                      animate={{ 
                        opacity: Math.random() > 0.3 ? 0.9 : 0.25, 
                        scale: 1,
                        rotate: Math.random() * 8 - 4
                      }}
                      transition={{ duration: 0.6, delay: i * 0.015 }}
                      className={`w-11 h-11 rounded-xl shadow-md ${
                        i % 3 === 0 
                          ? 'bg-gradient-to-br from-[#FFDA07] to-[#F5C300]' 
                          : i % 3 === 1 
                          ? 'bg-gradient-to-br from-[#1F2937] to-[#374151]' 
                          : 'bg-gradient-to-br from-gray-300 to-gray-400'
                      }`}
                      style={{
                        boxShadow: i % 3 === 0 ? '0 4px 12px rgba(255,218,7,0.4)' : '0 2px 6px rgba(0,0,0,0.1)'
                      }}
                    />
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Benefits Badges - Compact */}
      <section className="py-8 bg-white" data-testid="benefits-section">
        <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap justify-center gap-3 sm:gap-4">
            {benefits.map((benefit, index) => {
              const Icon = benefit.icon;
              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.4, delay: index * 0.1 }}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-[rgb(var(--brand-yellow-100))] border border-[rgb(var(--brand-yellow-300))]"
                >
                  <Icon size={18} className="text-[rgb(var(--brand-yellow-700))]" strokeWidth={2.5} />
                  <span className="text-sm font-bold text-[rgb(var(--grey-900))]">{benefit.title}</span>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Features Section - Premium Cards */}
      <section className="py-16 bg-gradient-to-b from-white to-[rgb(var(--grey-50))]" data-testid="features-section">
        <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-[rgb(var(--black))] mb-3">
              Полезные инструменты
            </h2>
            <p className="text-lg text-[rgb(var(--grey-600))] font-medium">
              Всё для работы с маркировкой в одном месте
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: index * 0.12 }}
                  onClick={() => navigate(feature.path)}
                  className="group relative bg-white rounded-3xl p-7 cursor-pointer transition-all duration-400 overflow-hidden"
                  style={{
                    boxShadow: '0 4px 20px rgba(0,0,0,0.06), 0 1px 3px rgba(0,0,0,0.08)',
                  }}
                  whileHover={{
                    y: -8,
                    boxShadow: '0 20px 40px rgba(255,218,7,0.2), 0 8px 16px rgba(0,0,0,0.1)'
                  }}
                >
                  {/* Gradient overlay on hover */}
                  <div className="absolute inset-0 bg-gradient-to-br from-[rgb(var(--brand-yellow-50))] via-transparent to-[rgb(var(--brand-yellow-100))] opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                  {/* Content */}
                  <div className="relative flex flex-col items-center text-center">
                    {/* Icon container */}
                    <div className="mb-5 p-5 rounded-2xl bg-gradient-to-br from-[rgb(var(--brand-yellow-100))] to-[rgb(var(--brand-yellow-200))] group-hover:from-[rgb(var(--brand-yellow-200))] group-hover:to-[rgb(var(--brand-yellow-300))] transition-all duration-400 shadow-sm group-hover:shadow-lg group-hover:scale-110">
                      <Icon size={32} className="text-[rgb(var(--grey-800))]" strokeWidth={1.8} />
                    </div>

                    {/* Text */}
                    <h3 className="text-lg font-bold text-[rgb(var(--black))] mb-2 group-hover:text-[rgb(var(--grey-900))] transition-colors">
                      {feature.title}
                    </h3>
                    <p className="text-sm text-[rgb(var(--grey-500))] leading-relaxed mb-4">
                      {feature.description}
                    </p>

                    {/* Button */}
                    <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[rgb(var(--grey-100))] group-hover:bg-gradient-to-r group-hover:from-[rgb(var(--brand-yellow-400))] group-hover:to-[rgb(var(--brand-yellow-500))] text-[rgb(var(--grey-600))] group-hover:text-[rgb(var(--black))] font-semibold text-sm transition-all duration-300 group-hover:shadow-md">
                      <span>Открыть</span>
                      <span className="transition-transform duration-300 group-hover:translate-x-1">→</span>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Actions Section - Yellow Theme */}
      <section className="py-20 section-yellow-tint" data-testid="actions-section">
        <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-[rgb(var(--black))] mb-4">
              Что вы хотите сделать?
            </h2>
            <p className="text-lg text-[rgb(var(--grey-700))] max-w-2xl mx-auto font-medium">
              Выберите нужную услугу и получите результат за несколько минут
            </p>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {actions.map((action, index) => {
              const Icon = action.icon;
              const isComingSoon = action.disabled;

              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.4 + index * 0.1 }}
                  onClick={() => !isComingSoon && navigate(action.path)}
                  className={`group relative bg-white rounded-2xl p-7 overflow-hidden ${
                    isComingSoon
                      ? 'opacity-60 cursor-not-allowed border-2 border-[rgb(var(--grey-300))]'
                      : 'cursor-pointer card-hover border-2 border-[rgb(var(--grey-300))]'
                  }`}
                  data-testid="action-card"
                  style={{ boxShadow: 'var(--shadow-layer)' }}
                >
                  {/* Yellow gradient overlay on hover */}
                  {!isComingSoon && (
                    <div className="absolute inset-0 bg-gradient-to-br from-[rgb(var(--brand-yellow-100))] via-[rgb(var(--brand-yellow-50))] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-400" />
                  )}

                  <div className="relative flex flex-col h-full">
                    <div className="icon-wrapper icon-wrapper-yellow p-5 rounded-2xl shadow-lg mb-5 transition-all duration-300 group-hover:scale-110 group-hover:shadow-xl">
                      <Icon size={36} strokeWidth={2.5} />
                    </div>

                    <h3 className="text-lg font-bold text-[rgb(var(--black))] mb-3 group-hover:text-[rgb(var(--grey-900))] transition-colors">
                      {action.title}
                    </h3>

                    <p className="text-sm text-[rgb(var(--grey-600))] flex-1 leading-relaxed mb-4 font-medium">
                      {action.description}
                    </p>

                    {!isComingSoon && (
                      <div className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-[rgb(var(--brand-yellow-400))] to-[rgb(var(--brand-yellow-500))] text-[rgb(var(--black))] font-bold text-sm shadow-md group-hover:shadow-lg group-hover:from-[rgb(var(--brand-yellow-500))] group-hover:to-[rgb(var(--brand-yellow-600))] transition-all duration-300">
                        <span>Перейти</span>
                        <span className="transition-transform duration-300 group-hover:translate-x-1">→</span>
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
};

export default HomePage;
