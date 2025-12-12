import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  CheckCircle, Users, Target, Zap, Shield, BookOpen,
  Settings, FileText, Ship, ScanLine, Phone, Mail,
  Building, ArrowRight, Play
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { toast } from 'sonner';
import SEO from '../components/SEO';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const AboutPage = () => {
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    company: '',
    message: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name || !formData.phone) {
      toast.error('Заполните имя и телефон');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch(`${API_URL}/api/callback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          source: 'about_page'
        })
      });

      if (response.ok) {
        toast.success('Заявка отправлена! Мы свяжемся с вами в ближайшее время.');
        setFormData({ name: '', phone: '', email: '', company: '', message: '' });
      } else {
        toast.error('Ошибка отправки. Попробуйте позже.');
      }
    } catch (error) {
      toast.error('Ошибка соединения. Попробуйте позже.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const features = [
    {
      icon: ScanLine,
      title: 'Проверка товаров',
      description: 'Мгновенная проверка по коду ТН ВЭД — подлежит ли товар маркировке'
    },
    {
      icon: BookOpen,
      title: 'База знаний',
      description: '26+ экспертных статей по всем аспектам маркировки товаров'
    },
    {
      icon: Ship,
      title: 'Импорт товаров',
      description: 'Пошаговые инструкции по маркировке импортных товаров'
    },
    {
      icon: Settings,
      title: 'Подбор оборудования',
      description: 'Рекомендации по принтерам, сканерам и другому оборудованию'
    },
    {
      icon: FileText,
      title: 'Интерактивное КП',
      description: 'Автоматическое коммерческое предложение с заполнением по ИНН'
    },
    {
      icon: Shield,
      title: 'Личный кабинет',
      description: 'Управление заявками, договорами и документами в одном месте'
    }
  ];

  const stats = [
    { value: '26+', label: 'Статей в базе знаний' },
    { value: '24/7', label: 'Работа сервиса' },
    { value: '2 мин', label: 'Проверка товара' },
    { value: '100%', label: 'Бесплатно' }
  ];

  const values = [
    {
      icon: Target,
      title: 'Простота',
      description: 'Сложные вещи объясняем простым языком. Никакого канцелярита и юридического жаргона.'
    },
    {
      icon: Zap,
      title: 'Скорость',
      description: 'Проверка товара за 2 минуты. Коммерческое предложение — мгновенно по ИНН.'
    },
    {
      icon: Users,
      title: 'Экспертиза',
      description: 'Команда практиков с опытом внедрения маркировки на десятках предприятий.'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <SEO
        title="О нас | Про.Маркируй - сервис для участников рынка маркировки"
        description="Про.Маркируй — бесплатный сервис для участников рынка маркировки. Проверка товаров, база знаний, подбор оборудования, интерактивное КП."
        keywords="про маркируй, о компании, сервис маркировки, честный знак помощь"
      />

      {/* Hero Section */}
      <section className="relative py-20 noise-bg overflow-hidden">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.3 }}
          className="absolute -top-20 -right-20 w-[500px] h-[500px] rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(255,218,7,0.2) 0%, rgba(255,218,7,0) 70%)',
            filter: 'blur(60px)'
          }}
        />

        <div className="relative mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-12"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-yellow-50 border border-yellow-200 mb-6">
              <Building className="w-4 h-4 text-yellow-600" />
              <span className="text-sm font-medium text-yellow-700">О сервисе</span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 mb-6">
              Про.<span className="text-transparent bg-clip-text bg-gradient-to-r from-[#FFDA07] to-[#F5C300]">Маркируй</span>
            </h1>

            <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
              Бесплатный сервис для участников рынка маркировки.
              Мы создали его, чтобы <strong className="text-gray-900">упростить работу</strong> с системой
              Честный ЗНАК и сделать маркировку понятной для каждого.
            </p>
          </motion.div>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-12"
          >
            {stats.map((stat, index) => (
              <div
                key={index}
                className="bg-white rounded-2xl p-6 text-center border border-gray-200 shadow-sm"
              >
                <div className="text-3xl font-bold text-gray-900 mb-1">{stat.value}</div>
                <div className="text-sm text-gray-600">{stat.label}</div>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Mission Section */}
      <section className="py-20">
        <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <h2 className="text-3xl font-bold text-gray-900 mb-6">
                Зачем мы это сделали?
              </h2>
              <div className="space-y-4 text-gray-600 leading-relaxed">
                <p>
                  Маркировка товаров в России — это сложная система с множеством правил,
                  сроков и требований. Многие предприниматели теряются в этом потоке информации,
                  не знают с чего начать и боятся штрафов.
                </p>
                <p>
                  <strong className="text-gray-900">Мы решили это изменить.</strong> Наша команда
                  собрала весь опыт внедрения маркировки и создала инструменты, которые делают
                  этот процесс простым и понятным.
                </p>
                <p>
                  Проверить товар, понять требования, подобрать оборудование, получить
                  коммерческое предложение — всё это можно сделать за несколько минут,
                  без регистрации и абсолютно бесплатно.
                </p>
              </div>

              <div className="mt-8 flex flex-wrap gap-4">
                {values.map((value, index) => (
                  <div key={index} className="flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-full">
                    <value.icon className="w-4 h-4 text-yellow-600" />
                    <span className="text-sm font-medium text-gray-700">{value.title}</span>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Video */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="relative"
            >
              <div className="relative rounded-2xl overflow-hidden shadow-2xl border-4 border-white/50">
                <iframe
                  src="https://vkvideo.ru/video_ext.php?oid=-224327673&id=456239053&hash=963624f48161127c&hd=3"
                  width="100%"
                  height="360"
                  allow="autoplay; encrypted-media; fullscreen; picture-in-picture; screen-wake-lock;"
                  frameBorder="0"
                  allowFullScreen
                  title="Про маркировку товаров"
                  className="w-full aspect-video"
                  style={{ minHeight: '320px' }}
                />
              </div>
              <div className="absolute -bottom-4 -right-4 bg-yellow-400 text-gray-900 px-4 py-2 rounded-xl font-bold text-sm shadow-lg">
                <Play className="w-4 h-4 inline mr-1" />
                Кратко и понятно
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-gray-50">
        <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Что есть на сайте
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Все инструменты для работы с маркировкой в одном месте
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="bg-white rounded-2xl p-6 border border-gray-200 hover:border-yellow-300 hover:shadow-lg transition-all group"
              >
                <div className="w-12 h-12 rounded-xl bg-yellow-100 flex items-center justify-center mb-4 group-hover:bg-yellow-200 transition-colors">
                  <feature.icon className="w-6 h-6 text-yellow-700" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">{feature.title}</h3>
                <p className="text-gray-600 text-sm">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Values Section */}
      <section className="py-20">
        <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Наши принципы
            </h2>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            {values.map((value, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="text-center"
              >
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-yellow-400 to-yellow-500 flex items-center justify-center mx-auto mb-4 shadow-lg">
                  <value.icon className="w-8 h-8 text-gray-900" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">{value.title}</h3>
                <p className="text-gray-600">{value.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact Form Section */}
      <section className="py-20 bg-gradient-to-br from-gray-900 to-gray-800">
        <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="text-white"
            >
              <h2 className="text-3xl font-bold mb-6">
                Остались вопросы?
              </h2>
              <p className="text-gray-300 text-lg mb-8 leading-relaxed">
                Оставьте заявку, и наш специалист свяжется с вами для бесплатной консультации.
                Поможем разобраться с маркировкой, подберём оборудование, ответим на любые вопросы.
              </p>

              <div className="space-y-4">
                <div className="flex items-center gap-3 text-gray-300">
                  <div className="w-10 h-10 rounded-full bg-yellow-500/20 flex items-center justify-center">
                    <CheckCircle className="w-5 h-5 text-yellow-400" />
                  </div>
                  <span>Бесплатная консультация</span>
                </div>
                <div className="flex items-center gap-3 text-gray-300">
                  <div className="w-10 h-10 rounded-full bg-yellow-500/20 flex items-center justify-center">
                    <CheckCircle className="w-5 h-5 text-yellow-400" />
                  </div>
                  <span>Ответ в течение 1 рабочего дня</span>
                </div>
                <div className="flex items-center gap-3 text-gray-300">
                  <div className="w-10 h-10 rounded-full bg-yellow-500/20 flex items-center justify-center">
                    <CheckCircle className="w-5 h-5 text-yellow-400" />
                  </div>
                  <span>Помощь с документами и оборудованием</span>
                </div>
              </div>

              <div className="mt-8 pt-8 border-t border-gray-700">
                <div className="flex flex-wrap gap-6">
                  <a href="tel:+79000000000" className="flex items-center gap-2 text-gray-300 hover:text-white transition-colors">
                    <Phone className="w-5 h-5" />
                    <span>+7 (900) 000-00-00</span>
                  </a>
                  <a href="mailto:info@promarkirui.ru" className="flex items-center gap-2 text-gray-300 hover:text-white transition-colors">
                    <Mail className="w-5 h-5" />
                    <span>info@promarkirui.ru</span>
                  </a>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <form onSubmit={handleSubmit} className="bg-white rounded-2xl p-8 shadow-2xl">
                <h3 className="text-xl font-bold text-gray-900 mb-6">Оставить заявку</h3>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Имя *
                    </label>
                    <Input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      placeholder="Как к вам обращаться"
                      className="w-full"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Телефон *
                    </label>
                    <Input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({...formData, phone: e.target.value})}
                      placeholder="+7 (___) ___-__-__"
                      className="w-full"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email
                    </label>
                    <Input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({...formData, email: e.target.value})}
                      placeholder="email@company.ru"
                      className="w-full"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Компания
                    </label>
                    <Input
                      type="text"
                      value={formData.company}
                      onChange={(e) => setFormData({...formData, company: e.target.value})}
                      placeholder="Название компании или ИП"
                      className="w-full"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Сообщение
                    </label>
                    <textarea
                      value={formData.message}
                      onChange={(e) => setFormData({...formData, message: e.target.value})}
                      placeholder="Опишите ваш вопрос или задачу..."
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent resize-none"
                    />
                  </div>

                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full btn-gradient rounded-xl py-3 font-bold"
                  >
                    {isSubmitting ? 'Отправка...' : 'Отправить заявку'}
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>

                  <p className="text-xs text-gray-500 text-center">
                    Нажимая кнопку, вы соглашаетесь с обработкой персональных данных
                  </p>
                </div>
              </form>
            </motion.div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default AboutPage;
