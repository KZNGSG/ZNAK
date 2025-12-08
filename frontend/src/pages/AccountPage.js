import React from 'react';
import { motion } from 'framer-motion';
import { UserCircle, History, Star, Settings, Bell, Shield, ChevronRight, Lock } from 'lucide-react';
import { Button } from '../components/ui/button';

const AccountPage = () => {
  const menuItems = [
    {
      icon: History,
      title: 'История проверок',
      description: 'Все ваши проверки товаров в одном месте',
      badge: null
    },
    {
      icon: Star,
      title: 'Избранное',
      description: 'Сохранённые товары и результаты',
      badge: null
    },
    {
      icon: Bell,
      title: 'Уведомления',
      description: 'Напоминания о новых требованиях',
      badge: '3'
    },
    {
      icon: Settings,
      title: 'Настройки',
      description: 'Персонализация и предпочтения',
      badge: null
    },
    {
      icon: Shield,
      title: 'Безопасность',
      description: 'Пароль и двухфакторная аутентификация',
      badge: null
    }
  ];

  return (
    <div className="fade-in">
      {/* Hero Section */}
      <section className="relative py-16 sm:py-20 noise-bg overflow-hidden">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.3 }}
          className="absolute -top-20 -left-20 w-[500px] h-[500px] rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(255,218,7,0.2) 0%, rgba(255,218,7,0) 70%)',
            filter: 'blur(80px)'
          }}
          aria-hidden="true"
        />

        <div className="relative mx-auto max-w-[600px] px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center"
          >
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-[rgb(var(--brand-yellow-100))] mb-6">
              <UserCircle size={40} className="text-[rgb(var(--grey-700))]" />
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold text-[rgb(var(--black))] mb-4">
              Личный кабинет
            </h1>
            <p className="text-lg text-[rgb(var(--grey-600))]">
              Управляйте своими проверками и настройками
            </p>
          </motion.div>
        </div>
      </section>

      {/* Coming Soon Section */}
      <section className="py-12 bg-white">
        <div className="mx-auto max-w-[600px] px-4 sm:px-6 lg:px-8">
          {/* Login Prompt */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-8 bg-gradient-to-br from-[rgb(var(--brand-yellow-50))] to-white rounded-2xl border-2 border-[rgb(var(--brand-yellow-200))] text-center mb-8"
          >
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[rgb(var(--brand-yellow-100))] mb-4">
              <Lock size={28} className="text-[rgb(var(--brand-yellow-700))]" />
            </div>
            <h2 className="text-xl font-bold text-[rgb(var(--black))] mb-2">
              Функция в разработке
            </h2>
            <p className="text-[rgb(var(--grey-600))] mb-6">
              Личный кабинет скоро будет доступен. Вы сможете сохранять историю проверок,
              получать уведомления и настраивать персональные рекомендации.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button
                className="btn-gradient rounded-xl"
                disabled
              >
                Войти
              </Button>
              <Button
                variant="outline"
                className="rounded-xl border-2 border-[rgb(var(--grey-300))]"
                disabled
              >
                Зарегистрироваться
              </Button>
            </div>
          </motion.div>

          {/* Preview Menu */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <h3 className="text-sm font-bold text-[rgb(var(--grey-500))] uppercase tracking-wide mb-4">
              Что будет доступно
            </h3>
            <div className="space-y-2">
              {menuItems.map((item, index) => {
                const Icon = item.icon;
                return (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.15 + index * 0.05 }}
                    className="flex items-center gap-4 p-4 bg-[rgb(var(--grey-100))] rounded-xl opacity-60"
                  >
                    <div className="p-2.5 rounded-xl bg-white">
                      <Icon size={20} className="text-[rgb(var(--grey-500))]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold text-[rgb(var(--grey-700))]">{item.title}</h4>
                        {item.badge && (
                          <span className="px-2 py-0.5 rounded-full bg-[rgb(var(--brand-yellow-200))] text-xs font-medium text-[rgb(var(--brand-yellow-800))]">
                            {item.badge}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-[rgb(var(--grey-500))]">{item.description}</p>
                    </div>
                    <ChevronRight size={18} className="text-[rgb(var(--grey-400))]" />
                  </motion.div>
                );
              })}
            </div>
          </motion.div>

          {/* Newsletter */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="mt-8 p-6 bg-[rgb(var(--grey-900))] rounded-2xl text-center"
          >
            <h3 className="text-lg font-bold text-white mb-2">
              Хотите узнать о запуске первыми?
            </h3>
            <p className="text-[rgb(var(--grey-400))] text-sm mb-4">
              Оставьте email и мы сообщим, когда личный кабинет будет готов
            </p>
            <div className="flex gap-2 max-w-sm mx-auto">
              <input
                type="email"
                placeholder="your@email.com"
                className="flex-1 px-4 py-2.5 rounded-xl bg-white/10 border border-white/20 text-white placeholder:text-[rgb(var(--grey-500))] focus:outline-none focus:border-[rgb(var(--brand-yellow-500))]"
              />
              <Button className="btn-gradient rounded-xl px-6">
                →
              </Button>
            </div>
          </motion.div>

          {/* Alternative Actions */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="mt-8 text-center"
          >
            <p className="text-sm text-[rgb(var(--grey-500))] mb-4">
              Пока личный кабинет в разработке, вы можете:
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <a
                href="/check"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[rgb(var(--grey-100))] text-sm font-medium text-[rgb(var(--grey-700))] hover:bg-[rgb(var(--grey-200))] transition-colors"
              >
                Проверить товар
              </a>
              <a
                href="/consultation"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[rgb(var(--grey-100))] text-sm font-medium text-[rgb(var(--grey-700))] hover:bg-[rgb(var(--grey-200))] transition-colors"
              >
                Задать вопрос AI
              </a>
              <a
                href="/knowledge"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[rgb(var(--grey-100))] text-sm font-medium text-[rgb(var(--grey-700))] hover:bg-[rgb(var(--grey-200))] transition-colors"
              >
                База знаний
              </a>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
};

export default AccountPage;
