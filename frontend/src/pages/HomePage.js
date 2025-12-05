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
      {/* Hero Section */}
      <section className="relative py-16 sm:py-24 noise-bg overflow-hidden" data-testid="hero-section">
        {/* Parallax decorative elements */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.4 }}
          transition={{ duration: 1 }}
          className="absolute -top-10 -right-10 w-72 h-72 rounded-2xl bg-primary/5 blur-3xl"
          aria-hidden="true"
        />
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.3 }}
          transition={{ duration: 1, delay: 0.2 }}
          className="absolute top-24 -left-10 w-96 h-96 rounded-2xl bg-emerald-50 blur-3xl"
          aria-hidden="true"
        />

        <div className="relative mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
            {/* Left: Content */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-semibold tracking-tight text-primary">
                Маркировка товаров — просто
              </h1>
              <p className="mt-4 text-base md:text-lg text-slate-600">
                Узнайте за 2 минуты, нужен ли вам Честный ЗНАК и что делать
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Button
                  onClick={() => navigate('/check')}
                  className="btn-gradient rounded-[12px] px-5 py-3"
                  data-testid="hero-primary-cta"
                >
                  Проверить товар
                </Button>
                <Button
                  onClick={() => navigate('/contact')}
                  className="rounded-[12px] bg-slate-100 text-primary px-5 py-3 hover:bg-slate-200"
                  data-testid="hero-secondary-cta"
                >
                  Оставить заявку
                </Button>
              </div>
            </motion.div>

            {/* Right: Decorative area */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="hidden lg:flex relative min-h-[420px] items-center justify-center"
            >
              <div className="relative w-full h-full flex items-center justify-center">
                {/* Data Matrix inspired decorative pattern */}
                <div className="grid grid-cols-8 gap-2 opacity-20">
                  {[...Array(64)].map((_, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, scale: 0 }}
                      animate={{ opacity: Math.random() > 0.5 ? 1 : 0.3, scale: 1 }}
                      transition={{ duration: 0.5, delay: i * 0.01 }}
                      className={`w-8 h-8 rounded-sm ${
                        i % 3 === 0 ? 'bg-primary' : i % 3 === 1 ? 'bg-accent' : 'bg-gray-300'
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
