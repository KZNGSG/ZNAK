import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { CheckCircle, Zap, Shield, Search, Plane, Wrench, MessageSquare } from 'lucide-react';
import { motion } from 'framer-motion';

const HomePage = () => {
  const navigate = useNavigate();

  const benefits = [
    {
      icon: CheckCircle,
      title: 'Понятно',
      description: 'Объясняем человеческим языком'
    },
    {
      icon: Zap,
      title: 'Быстро',
      description: 'Ответ за 2 минуты вместо часов'
    },
    {
      icon: Shield,
      title: 'Надёжно',
      description: 'Актуальные данные из официальных источников'
    }
  ];

  const actions = [
    {
      icon: Search,
      title: 'Проверить товар',
      description: 'Узнайте, подлежит ли ваш товар обязательной маркировке',
      path: '/check',
      disabled: false
    },
    {
      icon: Plane,
      title: 'Импорт товаров',
      description: 'Как правильно завезти и промаркировать импортный товар',
      path: '/import',
      disabled: false
    },
    {
      icon: Wrench,
      title: 'Оснащение производства',
      description: 'Подберём оборудование для маркировки под ваш объём',
      path: '/equipment',
      disabled: false
    },
    {
      icon: MessageSquare,
      title: 'Консультация',
      description: 'Задайте вопрос эксперту по маркировке',
      path: '/contact',
      disabled: false,
      badge: 'Скоро'
    }
  ];

  return (
    <div className="fade-in">
      {/* Hero Section - Enhanced */}
      <section className="relative py-20 sm:py-32 noise-bg overflow-hidden" data-testid="hero-section">
        {/* Enhanced decorative elements */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.6 }}
          transition={{ duration: 1 }}
          className="absolute -top-20 -right-20 w-[500px] h-[500px] rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(30,58,138,0.15) 0%, rgba(30,58,138,0) 70%)',
            filter: 'blur(60px)'
          }}
          aria-hidden="true"
        />
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.5 }}
          transition={{ duration: 1, delay: 0.2 }}
          className="absolute bottom-0 -left-20 w-[600px] h-[600px] rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(5,150,105,0.12) 0%, rgba(5,150,105,0) 70%)',
            filter: 'blur(80px)'
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
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/80 backdrop-blur-sm border border-blue-200 shadow-sm">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-sm font-semibold text-[rgb(var(--text-strong))]">Работает 24/7</span>
              </div>
              
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-[1.1] tracking-tight text-[rgb(var(--text-strong))]">
                Маркировка товаров — <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#1E3A8A] to-[#059669]">просто</span>
              </h1>
              
              <p className="text-lg md:text-xl text-[rgb(var(--text-muted))] leading-relaxed max-w-xl">
                Узнайте за <strong className="text-[rgb(var(--text-default))] font-semibold">2 минуты</strong>, нужен ли вам Честный ЗНАК и что делать
              </p>
              
              <div className="flex flex-wrap gap-4 pt-2">
                <Button
                  onClick={() => navigate('/check')}
                  className="btn-gradient rounded-xl px-7 py-4 text-base font-semibold h-auto shadow-lg hover:shadow-2xl"
                  data-testid="hero-primary-cta"
                >
                  Проверить товар →
                </Button>
                <Button
                  onClick={() => navigate('/contact')}
                  className="rounded-xl bg-white/80 backdrop-blur-sm text-[rgb(var(--brand-blue-700))] px-7 py-4 text-base font-semibold h-auto border-2 border-[rgb(var(--brand-blue-200))] hover:bg-white hover:border-[rgb(var(--brand-blue-300))] shadow-md hover:shadow-lg"
                  data-testid="hero-secondary-cta"
                >
                  Оставить заявку
                </Button>
              </div>
            </motion.div>

            {/* Right: Enhanced decorative pattern */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.7, delay: 0.3 }}
              className="hidden lg:flex relative min-h-[480px] items-center justify-center"
            >
              <div className="relative w-full h-full flex items-center justify-center">
                {/* Enhanced Data Matrix pattern */}
                <div className="grid grid-cols-8 gap-3 p-6">
                  {[...Array(64)].map((_, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, scale: 0, rotate: 0 }}
                      animate={{ 
                        opacity: Math.random() > 0.4 ? 0.8 : 0.2, 
                        scale: 1,
                        rotate: Math.random() * 10 - 5
                      }}
                      transition={{ duration: 0.6, delay: i * 0.015 }}
                      className={`w-10 h-10 rounded-lg shadow-sm ${
                        i % 3 === 0 
                          ? 'bg-gradient-to-br from-[#1E3A8A] to-[#23419A]' 
                          : i % 3 === 1 
                          ? 'bg-gradient-to-br from-[#059669] to-[#06A77D]' 
                          : 'bg-gradient-to-br from-gray-200 to-gray-300'
                      }`}
                    />
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-12 bg-white" data-testid="benefits-section">
        <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {benefits.map((benefit, index) => {
              const Icon = benefit.icon;
              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  className="bg-card rounded-[16px] p-6 border border-gray-200 card-hover"
                  data-testid="info-card"
                >
                  <div className="flex items-start gap-4">
                    <div className="p-3 rounded-xl bg-primary/10">
                      <Icon className="text-primary" size={24} strokeWidth={1.75} />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-primary mb-1">{benefit.title}</h3>
                      <p className="text-sm text-gray-600">{benefit.description}</p>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Actions Section */}
      <section className="py-12 bg-gradient-to-b from-white to-slate-50" data-testid="actions-section">
        <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl sm:text-3xl font-semibold text-primary text-center mb-8">
            Что вы хотите сделать?
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {actions.map((action, index) => {
              const Icon = action.icon;
              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.3 + index * 0.1 }}
                  onClick={() => !action.disabled && navigate(action.path)}
                  className={`bg-white rounded-[16px] p-6 border border-gray-200 card-hover ${
                    action.disabled ? 'opacity-60' : 'cursor-pointer'
                  }`}
                  data-testid="action-card"
                >
                  <div className="flex flex-col h-full">
                    <div className="p-3 rounded-xl bg-accent/10 w-fit">
                      <Icon className="text-accent" size={28} strokeWidth={1.75} />
                    </div>
                    <h3 className="text-lg font-semibold text-primary mt-4 mb-2 flex items-center gap-2">
                      {action.title}
                      {action.badge && (
                        <span className="text-xs font-medium px-2 py-1 rounded-full bg-gray-100 text-gray-500">
                          {action.badge}
                        </span>
                      )}
                    </h3>
                    <p className="text-sm text-gray-600 flex-1">{action.description}</p>
                    {!action.disabled && (
                      <div className="mt-4">
                        <span className="text-accent text-sm font-medium">Перейти →</span>
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
