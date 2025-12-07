import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { BookOpen, Search, ChevronRight, FileText, HelpCircle, Video, ExternalLink, Tag } from 'lucide-react';

const KnowledgePage = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');

  const categories = [
    { id: 'all', name: 'Все статьи', count: 12 },
    { id: 'basics', name: 'Основы маркировки', count: 4 },
    { id: 'registration', name: 'Регистрация', count: 3 },
    { id: 'equipment', name: 'Оборудование', count: 2 },
    { id: 'faq', name: 'Частые вопросы', count: 3 }
  ];

  const articles = [
    {
      id: 1,
      category: 'basics',
      title: 'Что такое Честный ЗНАК и зачем он нужен',
      description: 'Разбираемся в системе маркировки товаров: цели, участники, обязательства для бизнеса.',
      readTime: '5 мин',
      type: 'article',
      tags: ['маркировка', 'законодательство']
    },
    {
      id: 2,
      category: 'basics',
      title: 'Какие товары подлежат обязательной маркировке в 2024-2025',
      description: 'Полный список товарных групп с датами вступления требований в силу.',
      readTime: '7 мин',
      type: 'article',
      tags: ['список товаров', 'сроки']
    },
    {
      id: 3,
      category: 'basics',
      title: 'Data Matrix vs QR-код: в чём разница',
      description: 'Почему для маркировки используется именно Data Matrix и как его читать.',
      readTime: '4 мин',
      type: 'article',
      tags: ['data matrix', 'технология']
    },
    {
      id: 4,
      category: 'registration',
      title: 'Пошаговая регистрация в Честном ЗНАКе',
      description: 'Подробная инструкция по созданию учётной записи и настройке личного кабинета.',
      readTime: '10 мин',
      type: 'guide',
      tags: ['регистрация', 'инструкция']
    },
    {
      id: 5,
      category: 'registration',
      title: 'Как получить электронную подпись для маркировки',
      description: 'Выбор удостоверяющего центра, документы и процесс получения ЭЦП.',
      readTime: '6 мин',
      type: 'guide',
      tags: ['ЭЦП', 'документы']
    },
    {
      id: 6,
      category: 'registration',
      title: 'Регистрация в GS1: когда нужна и как сделать',
      description: 'Получение кодов GTIN для товаров без штрихкодов.',
      readTime: '5 мин',
      type: 'article',
      tags: ['GS1', 'GTIN', 'штрихкоды']
    },
    {
      id: 7,
      category: 'equipment',
      title: 'Выбор принтера для печати Data Matrix',
      description: 'Сравнение термотрансферных, каплеструйных и лазерных принтеров.',
      readTime: '8 мин',
      type: 'guide',
      tags: ['оборудование', 'принтеры']
    },
    {
      id: 8,
      category: 'equipment',
      title: 'Сканеры для считывания кодов маркировки',
      description: 'Какой сканер выбрать для работы с Data Matrix кодами.',
      readTime: '5 мин',
      type: 'article',
      tags: ['оборудование', 'сканеры']
    },
    {
      id: 9,
      category: 'faq',
      title: 'Что будет, если не маркировать товар?',
      description: 'Штрафы и последствия нарушения требований маркировки.',
      readTime: '4 мин',
      type: 'faq',
      tags: ['штрафы', 'ответственность']
    },
    {
      id: 10,
      category: 'faq',
      title: 'Можно ли продавать остатки без маркировки?',
      description: 'Правила реализации немаркированных остатков и переходный период.',
      readTime: '3 мин',
      type: 'faq',
      tags: ['остатки', 'переходный период']
    },
    {
      id: 11,
      category: 'faq',
      title: 'Как маркировать импортный товар?',
      description: 'Особенности маркировки при ввозе товаров из-за рубежа.',
      readTime: '6 мин',
      type: 'faq',
      tags: ['импорт', 'ВЭД']
    },
    {
      id: 12,
      category: 'basics',
      title: 'Роль оператора ЭДО в маркировке',
      description: 'Зачем нужен электронный документооборот и как его подключить.',
      readTime: '5 мин',
      type: 'article',
      tags: ['ЭДО', 'документы']
    }
  ];

  const filteredArticles = articles.filter(article => {
    const matchesCategory = activeCategory === 'all' || article.category === activeCategory;
    const matchesSearch = searchQuery === '' ||
      article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      article.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      article.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  const getTypeIcon = (type) => {
    switch (type) {
      case 'guide': return FileText;
      case 'faq': return HelpCircle;
      case 'video': return Video;
      default: return BookOpen;
    }
  };

  const getTypeLabel = (type) => {
    switch (type) {
      case 'guide': return 'Инструкция';
      case 'faq': return 'FAQ';
      case 'video': return 'Видео';
      default: return 'Статья';
    }
  };

  return (
    <div className="fade-in">
      {/* Hero Section */}
      <section className="relative py-16 sm:py-20 noise-bg overflow-hidden">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.3 }}
          className="absolute -top-20 right-0 w-[500px] h-[500px] rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(255,218,7,0.2) 0%, rgba(255,218,7,0) 70%)',
            filter: 'blur(80px)'
          }}
          aria-hidden="true"
        />

        <div className="relative mx-auto max-w-[1000px] px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center"
          >
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[rgb(var(--brand-yellow-100))] mb-6">
              <BookOpen size={32} className="text-[rgb(var(--grey-800))]" />
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold text-[rgb(var(--black))] mb-4">
              База знаний
            </h1>
            <p className="text-lg text-[rgb(var(--grey-600))] max-w-xl mx-auto mb-8">
              Статьи, инструкции и ответы на вопросы о маркировке товаров.
              Всё, что нужно знать для работы с Честным ЗНАКом.
            </p>

            {/* Search */}
            <div className="max-w-md mx-auto">
              <div className="relative">
                <Search size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-[rgb(var(--grey-400))]" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Поиск по статьям..."
                  className="w-full pl-12 pr-4 py-3 rounded-xl border-2 border-[rgb(var(--grey-200))] focus:outline-none focus:border-[rgb(var(--brand-yellow-500))] transition-colors bg-white"
                />
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Content Section */}
      <section className="py-12 bg-white">
        <div className="mx-auto max-w-[1000px] px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row gap-8">
            {/* Categories Sidebar */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="lg:w-64 flex-shrink-0"
            >
              <h3 className="text-sm font-bold text-[rgb(var(--grey-500))] uppercase tracking-wide mb-3">
                Категории
              </h3>
              <div className="space-y-1">
                {categories.map(category => (
                  <button
                    key={category.id}
                    onClick={() => setActiveCategory(category.id)}
                    className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl text-left transition-all ${
                      activeCategory === category.id
                        ? 'bg-[rgb(var(--brand-yellow-100))] text-[rgb(var(--grey-900))] font-semibold'
                        : 'text-[rgb(var(--grey-600))] hover:bg-[rgb(var(--grey-100))]'
                    }`}
                  >
                    <span>{category.name}</span>
                    <span className={`text-sm ${
                      activeCategory === category.id
                        ? 'text-[rgb(var(--brand-yellow-700))]'
                        : 'text-[rgb(var(--grey-400))]'
                    }`}>
                      {category.count}
                    </span>
                  </button>
                ))}
              </div>
            </motion.div>

            {/* Articles Grid */}
            <div className="flex-1">
              {filteredArticles.length > 0 ? (
                <div className="space-y-4">
                  {filteredArticles.map((article, index) => {
                    const TypeIcon = getTypeIcon(article.type);
                    return (
                      <motion.article
                        key={article.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="group p-5 bg-white rounded-2xl border-2 border-[rgb(var(--grey-200))] hover:border-[rgb(var(--brand-yellow-400))] hover:shadow-md transition-all cursor-pointer"
                      >
                        <div className="flex items-start gap-4">
                          <div className="p-2.5 rounded-xl bg-[rgb(var(--grey-100))] group-hover:bg-[rgb(var(--brand-yellow-100))] transition-colors">
                            <TypeIcon size={20} className="text-[rgb(var(--grey-600))]" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xs font-medium text-[rgb(var(--brand-yellow-700))] bg-[rgb(var(--brand-yellow-100))] px-2 py-0.5 rounded-full">
                                {getTypeLabel(article.type)}
                              </span>
                              <span className="text-xs text-[rgb(var(--grey-400))]">
                                {article.readTime}
                              </span>
                            </div>
                            <h3 className="text-lg font-bold text-[rgb(var(--grey-900))] mb-1 group-hover:text-[rgb(var(--black))]">
                              {article.title}
                            </h3>
                            <p className="text-sm text-[rgb(var(--grey-600))] mb-3">
                              {article.description}
                            </p>
                            <div className="flex items-center gap-2 flex-wrap">
                              {article.tags.map(tag => (
                                <span
                                  key={tag}
                                  className="inline-flex items-center gap-1 text-xs text-[rgb(var(--grey-500))] bg-[rgb(var(--grey-100))] px-2 py-1 rounded-md"
                                >
                                  <Tag size={10} />
                                  {tag}
                                </span>
                              ))}
                            </div>
                          </div>
                          <ChevronRight size={20} className="text-[rgb(var(--grey-300))] group-hover:text-[rgb(var(--brand-yellow-600))] transition-colors flex-shrink-0" />
                        </div>
                      </motion.article>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[rgb(var(--grey-100))] mb-4">
                    <Search size={24} className="text-[rgb(var(--grey-400))]" />
                  </div>
                  <h3 className="text-lg font-bold text-[rgb(var(--grey-700))] mb-2">Ничего не найдено</h3>
                  <p className="text-[rgb(var(--grey-500))]">
                    Попробуйте изменить запрос или выбрать другую категорию
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* External Links */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mt-12 p-6 bg-[rgb(var(--grey-100))] rounded-2xl"
          >
            <h3 className="font-bold text-[rgb(var(--grey-800))] mb-4">Официальные ресурсы</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <a
                href="https://честныйзнак.рф"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 p-3 bg-white rounded-xl hover:shadow-md transition-shadow"
              >
                <ExternalLink size={16} className="text-[rgb(var(--grey-400))]" />
                <span className="text-sm font-medium text-[rgb(var(--grey-700))]">Честный ЗНАК</span>
              </a>
              <a
                href="https://национальный-каталог.рф"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 p-3 bg-white rounded-xl hover:shadow-md transition-shadow"
              >
                <ExternalLink size={16} className="text-[rgb(var(--grey-400))]" />
                <span className="text-sm font-medium text-[rgb(var(--grey-700))]">Национальный каталог</span>
              </a>
              <a
                href="https://gs1ru.org"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 p-3 bg-white rounded-xl hover:shadow-md transition-shadow"
              >
                <ExternalLink size={16} className="text-[rgb(var(--grey-400))]" />
                <span className="text-sm font-medium text-[rgb(var(--grey-700))]">GS1 Russia</span>
              </a>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
};

export default KnowledgePage;
