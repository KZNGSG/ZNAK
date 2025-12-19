import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ClipboardList, Check, Circle, ChevronRight, ExternalLink, FileText, Building, Key, Printer, Package } from 'lucide-react';
import { Button } from '../components/ui/button';
import SEO from '../components/SEO';

const ChecklistPage = () => {
  const [completedSteps, setCompletedSteps] = useState([]);

  const steps = [
    {
      id: 1,
      icon: FileText,
      title: 'Получите электронную подпись (ЭЦП)',
      description: 'Квалифицированная электронная подпись нужна для регистрации в системе и подписания документов.',
      details: [
        'Закажите ЭЦП в аккредитованном удостоверяющем центре',
        'Для ИП — подпись на физлицо, для ООО — на руководителя',
        'Срок получения: 1-3 рабочих дня'
      ],
      link: 'https://www.nalog.gov.ru/rn77/related_activities/ucfns/',
      linkText: 'Список удостоверяющих центров'
    },
    {
      id: 2,
      icon: Building,
      title: 'Зарегистрируйтесь в системе Честный ЗНАК',
      description: 'Создайте учётную запись и заполните данные о компании на официальном сайте.',
      details: [
        'Перейдите на сайт честныйзнак.рф',
        'Выберите «Регистрация» и укажите тип участника',
        'Загрузите ЭЦП и заполните реквизиты',
        'Дождитесь подтверждения (до 24 часов)'
      ],
      link: 'https://честныйзнак.рф',
      linkText: 'Перейти к регистрации'
    },
    {
      id: 3,
      icon: Key,
      title: 'Получите доступ к GS1 (для GTIN)',
      description: 'Если у вас нет штрихкодов EAN/GTIN, нужно зарегистрироваться в GS1 Russia.',
      details: [
        'GS1 нужен для получения уникальных кодов товара',
        'Стоимость зависит от количества кодов',
        'Альтернатива: использовать коды от поставщика'
      ],
      link: 'https://gs1ru.org',
      linkText: 'Сайт GS1 Russia'
    },
    {
      id: 4,
      icon: Package,
      title: 'Опишите товары в Национальном каталоге',
      description: 'Внесите данные о каждом товаре, который будете маркировать.',
      details: [
        'Укажите наименование, категорию, состав',
        'Загрузите фото товара',
        'Привяжите GTIN к карточке товара',
        'Получите одобрение карточки'
      ],
      link: 'https://национальный-каталог.рф',
      linkText: 'Национальный каталог'
    },
    {
      id: 5,
      icon: Printer,
      title: 'Подготовьте оборудование для печати',
      description: 'Выберите способ нанесения маркировки на товар.',
      details: [
        'Термотрансферный принтер — для этикеток',
        'Каплеструйный принтер — прямая печать на упаковке',
        'Лазерный маркиратор — для долговечной маркировки',
        'Типография — для больших тиражей'
      ],
      link: '/equipment',
      linkText: 'Подобрать оборудование',
      internal: true
    },
    {
      id: 6,
      icon: ClipboardList,
      title: 'Закажите коды маркировки',
      description: 'Оформите заявку на получение кодов Data Matrix в личном кабинете.',
      details: [
        'Укажите количество кодов (по числу единиц товара)',
        'Стоимость: 50 копеек за код без НДС',
        'Коды генерируются мгновенно',
        'Скачайте файл с кодами для печати'
      ],
      link: 'https://честныйзнак.рф/business/',
      linkText: 'Личный кабинет ЧЗ'
    }
  ];

  const toggleStep = (stepId) => {
    setCompletedSteps(prev =>
      prev.includes(stepId)
        ? prev.filter(id => id !== stepId)
        : [...prev, stepId]
    );
  };

  const progress = Math.round((completedSteps.length / steps.length) * 100);

  return (
    <div className="fade-in">
      <SEO title='Чек-лист по маркировке' description='Пошаговый чек-лист для внедрения маркировки товаров на вашем предприятии.' keywords='чек-лист маркировка' canonical='/checklist' />
      {/* Hero Section */}
      <section className="relative py-16 sm:py-20 noise-bg overflow-hidden">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.3 }}
          className="absolute -top-20 -right-20 w-[500px] h-[500px] rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(255,218,7,0.2) 0%, rgba(255,218,7,0) 70%)',
            filter: 'blur(80px)'
          }}
          aria-hidden="true"
        />

        <div className="relative mx-auto max-w-[900px] px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center"
          >
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[rgb(var(--brand-yellow-100))] mb-6">
              <ClipboardList size={32} className="text-[rgb(var(--grey-800))]" />
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold text-[rgb(var(--black))] mb-4">
              Чек-лист подключения к Честному ЗНАКу
            </h1>
            <p className="text-lg text-[rgb(var(--grey-600))] max-w-2xl mx-auto">
              Пошаговая инструкция для регистрации вашей компании в системе маркировки.
              Отмечайте выполненные шаги, чтобы отслеживать прогресс.
            </p>
          </motion.div>

          {/* Progress Bar */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mt-8 p-4 bg-white rounded-2xl border-2 border-[rgb(var(--grey-200))] shadow-sm"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-bold text-[rgb(var(--grey-700))]">Ваш прогресс</span>
              <span className="text-sm font-bold text-[rgb(var(--brand-yellow-700))]">{completedSteps.length} из {steps.length}</span>
            </div>
            <div className="h-3 bg-[rgb(var(--grey-200))] rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.5 }}
                className="h-full bg-gradient-to-r from-[rgb(var(--brand-yellow-400))] to-[rgb(var(--brand-yellow-500))] rounded-full"
              />
            </div>
          </motion.div>
        </div>
      </section>

      {/* Steps Section */}
      <section className="py-12 bg-white">
        <div className="mx-auto max-w-[900px] px-4 sm:px-6 lg:px-8">
          <div className="space-y-4">
            {steps.map((step, index) => {
              const Icon = step.icon;
              const isCompleted = completedSteps.includes(step.id);

              return (
                <motion.div
                  key={step.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className={`relative p-6 rounded-2xl border-2 transition-all duration-300 ${
                    isCompleted
                      ? 'border-green-400 bg-green-50'
                      : 'border-[rgb(var(--grey-200))] bg-white hover:border-[rgb(var(--brand-yellow-400))]'
                  }`}
                >
                  <div className="flex gap-4">
                    {/* Step Number & Check */}
                    <button
                      onClick={() => toggleStep(step.id)}
                      className={`flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-300 ${
                        isCompleted
                          ? 'bg-green-500 text-white'
                          : 'bg-[rgb(var(--brand-yellow-100))] text-[rgb(var(--grey-800))] hover:bg-[rgb(var(--brand-yellow-200))]'
                      }`}
                    >
                      {isCompleted ? <Check size={24} /> : <span className="font-bold">{step.id}</span>}
                    </button>

                    {/* Content */}
                    <div className="flex-1">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <h3 className={`text-lg font-bold mb-2 ${isCompleted ? 'text-green-700' : 'text-[rgb(var(--black))]'}`}>
                            {step.title}
                          </h3>
                          <p className="text-[rgb(var(--grey-600))] mb-3">
                            {step.description}
                          </p>
                        </div>
                        <Icon size={24} className={`flex-shrink-0 ${isCompleted ? 'text-green-500' : 'text-[rgb(var(--grey-400))]'}`} />
                      </div>

                      {/* Details */}
                      <ul className="space-y-1.5 mb-4">
                        {step.details.map((detail, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-[rgb(var(--grey-600))]">
                            <Circle size={6} className="flex-shrink-0 mt-1.5 fill-current text-[rgb(var(--brand-yellow-500))]" />
                            {detail}
                          </li>
                        ))}
                      </ul>

                      {/* Link */}
                      {step.link && (
                        <a
                          href={step.link}
                          target={step.internal ? '_self' : '_blank'}
                          rel={step.internal ? '' : 'noopener noreferrer'}
                          className="inline-flex items-center gap-1.5 text-sm font-semibold text-[rgb(var(--brand-yellow-700))] hover:text-[rgb(var(--brand-yellow-800))] transition-colors"
                        >
                          {step.linkText}
                          {step.internal ? <ChevronRight size={16} /> : <ExternalLink size={14} />}
                        </a>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* Completion Message */}
          {completedSteps.length === steps.length && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="mt-8 p-6 bg-green-50 border-2 border-green-400 rounded-2xl text-center"
            >
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-500 text-white mb-4">
                <Check size={32} />
              </div>
              <h3 className="text-xl font-bold text-green-700 mb-2">Поздравляем!</h3>
              <p className="text-green-600">
                Вы готовы к работе с системой маркировки Честный ЗНАК.
                Теперь можно заказывать коды и наносить маркировку на товары.
              </p>
            </motion.div>
          )}

          {/* Help Block */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="mt-12 p-6 bg-[rgb(var(--brand-yellow-50))] border-2 border-[rgb(var(--brand-yellow-200))] rounded-2xl"
          >
            <h3 className="text-lg font-bold text-[rgb(var(--black))] mb-2">Нужна помощь?</h3>
            <p className="text-[rgb(var(--grey-600))] mb-4">
              Если у вас возникли вопросы по подключению, наш AI-консультант поможет разобраться.
            </p>
            <Button
              onClick={() => window.location.href = '/consultation'}
              className="btn-gradient rounded-xl"
            >
              Задать вопрос AI-эксперту →
            </Button>
          </motion.div>
        </div>
      </section>
    </div>
  );
};

export default ChecklistPage;
