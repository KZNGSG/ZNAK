import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  BookOpen, Search, Clock, ArrowRight, Tag,
  Shield, Printer, Ship, AlertTriangle, FileText,
  ChevronRight, ChevronLeft, TrendingUp, Package
} from 'lucide-react';
import { Input } from '../components/ui/input';
import SEO from '../components/SEO';

// Категории статей
const CATEGORIES = [
  { id: 'all', name: 'Все статьи', icon: BookOpen, color: 'gray' },
  { id: 'chestny-znak', name: 'Честный ЗНАК', icon: Shield, color: 'blue' },
  { id: 'oborudovanie', name: 'Оборудование', icon: Printer, color: 'purple' },
  { id: 'import', name: 'Импорт', icon: Ship, color: 'cyan' },
  { id: 'shtrafy', name: 'Штрафы', icon: AlertTriangle, color: 'red' },
  { id: 'tovary', name: 'Товары', icon: Package, color: 'green' },
];

// Статьи
const ARTICLES = [
  {
    id: 'sroki-markirovki-2025',
    title: 'Сроки маркировки товаров в 2025 году: полный календарь',
    excerpt: 'Актуальные сроки обязательной маркировки всех категорий товаров в 2025 году. Когда регистрироваться, когда начинать маркировать.',
    category: 'chestny-znak',
    readTime: 10,
    date: '2025-12-17',
    popular: true,
    tags: ['сроки', 'дедлайны', '2025', 'календарь']
  },
  {
    id: 'isklyucheniya-iz-markirovki',
    title: 'Что не нужно маркировать: полный список исключений',
    excerpt: 'Какие товары освобождены от обязательной маркировки. Исключения по категориям, условия освобождения.',
    category: 'chestny-znak',
    readTime: 8,
    date: '2025-12-17',
    popular: true,
    tags: ['исключения', 'освобождение', 'маркировка']
  },
  {
    id: 'chek-list-podklyucheniya-k-markirovke',
    title: 'Чек-лист: как подключиться к маркировке за 8 шагов',
    excerpt: 'Пошаговая инструкция подключения к системе Честный ЗНАК. Что нужно сделать, в каком порядке.',
    category: 'chestny-znak',
    readTime: 7,
    date: '2025-12-17',
    popular: true,
    tags: ['чек-лист', 'инструкция', 'подключение']
  },
  {
    id: 'novye-kategorii-markirovki-2025-2026',
    title: 'Новые категории маркировки в 2025-2026 годах',
    excerpt: 'Какие товары начнут маркировать в ближайшие годы. Пилотные проекты, эксперименты, планируемые сроки.',
    category: 'tovary',
    readTime: 9,
    date: '2025-12-17',
    popular: true,
    tags: ['новые категории', '2025', '2026', 'эксперименты']
  },
  {
    id: 'kak-zaregistrirovatsya-v-chestnom-znake',
    title: 'Как зарегистрироваться в Честном ЗНАКе: пошаговая инструкция 2025',
    excerpt: 'Подробная инструкция по регистрации в системе маркировки Честный ЗНАК. Какие документы нужны, сколько времени занимает, частые ошибки.',
    category: 'chestny-znak',
    readTime: 5,
    date: '2025-12-12',
    popular: true,
    tags: ['регистрация', 'честный знак', 'инструкция']
  },
  {
    id: 'shtrafy-za-otsutstvie-markirovki-2025',
    title: 'Штрафы за отсутствие маркировки в 2025 году',
    excerpt: 'Какие штрафы грозят за продажу товаров без маркировки. Размеры штрафов для ИП и юрлиц, как избежать наказания.',
    category: 'shtrafy',
    readTime: 4,
    date: '2025-12-10',
    popular: true,
    tags: ['штрафы', 'ответственность', '2025']
  },
  {
    id: 'markirovka-odezhdy-polnyj-gajd',
    title: 'Маркировка одежды: полный гайд для продавцов',
    excerpt: 'Всё о маркировке одежды: какие товары подлежат, как получить коды, как наносить, сроки и требования.',
    category: 'chestny-znak',
    readTime: 8,
    date: '2025-12-08',
    popular: true,
    tags: ['одежда', 'маркировка', 'гайд']
  },
  {
    id: 'top-5-printerov-dlya-markirovki',
    title: 'ТОП-5 принтеров для маркировки в 2025 году',
    excerpt: 'Обзор лучших принтеров для печати этикеток с DataMatrix кодами. Сравнение цен, характеристик, плюсы и минусы.',
    category: 'oborudovanie',
    readTime: 7,
    date: '2025-12-05',
    popular: false,
    tags: ['принтеры', 'оборудование', 'обзор']
  },
  {
    id: 'kak-poluchit-kody-markirovki',
    title: 'Как получить коды маркировки: 3 способа',
    excerpt: 'Три способа получения кодов маркировки: через личный кабинет, через API, через оператора. Пошаговые инструкции.',
    category: 'chestny-znak',
    readTime: 6,
    date: '2025-12-03',
    popular: true,
    tags: ['коды', 'получение', 'инструкция']
  },
  {
    id: 'markirovka-importnyh-tovarov',
    title: 'Маркировка импортных товаров: где и когда наносить',
    excerpt: 'Как правильно маркировать импортные товары. Можно ли наносить маркировку за рубежом, требования таможни.',
    category: 'import',
    readTime: 5,
    date: '2025-12-01',
    popular: false,
    tags: ['импорт', 'таможня', 'маркировка']
  },
  {
    id: 'chto-takoe-kiz',
    title: 'Что такое КИЗ и как его использовать',
    excerpt: 'Контрольный идентификационный знак (КИЗ): что это, как выглядит, как наносить на товар, требования к печати.',
    category: 'chestny-znak',
    readTime: 4,
    date: '2025-11-28',
    popular: false,
    tags: ['КИЗ', 'этикетки', 'печать']
  },
  {
    id: 'skaner-dlya-chestnogo-znaka',
    title: 'Какой сканер выбрать для Честного ЗНАКа',
    excerpt: 'Обзор сканеров для считывания DataMatrix кодов. Проводные и беспроводные, 1D и 2D, рекомендации по выбору.',
    category: 'oborudovanie',
    readTime: 6,
    date: '2025-11-25',
    popular: false,
    tags: ['сканеры', 'оборудование', 'DataMatrix']
  },
  // Новые статьи
  {
    id: 'chto-takoe-chestnyj-znak',
    title: 'Что такое Честный ЗНАК и зачем он нужен',
    excerpt: 'Простое объяснение системы маркировки Честный ЗНАК: что это, зачем нужно, как работает. Обязательная маркировка в России.',
    category: 'chestny-znak',
    readTime: 4,
    date: '2025-12-12',
    popular: true,
    tags: ['честный знак', 'маркировка', 'основы']
  },
  {
    id: 'markirovka-dlya-marketplejsov',
    title: 'Маркировка для маркетплейсов (Wildberries, Ozon)',
    excerpt: 'Как продавать маркированные товары на Wildberries, Ozon, Яндекс.Маркет. Требования маркетплейсов к маркировке.',
    category: 'chestny-znak',
    readTime: 7,
    date: '2025-12-12',
    popular: true,
    tags: ['маркетплейсы', 'wildberries', 'ozon', 'маркировка']
  },
  {
    id: 'ostatki-bez-markirovki',
    title: 'Остатки без маркировки: что делать?',
    excerpt: 'Как легализовать остатки товаров без маркировки. Пошаговая инструкция по самомаркировке остатков.',
    category: 'chestny-znak',
    readTime: 5,
    date: '2025-12-12',
    popular: false,
    tags: ['остатки', 'самомаркировка', 'легализация']
  },
  {
    id: 'skaner-dlya-markirovki',
    title: 'Сканер для маркировки: как выбрать и не переплатить',
    excerpt: 'Обзор сканеров для Честного ЗНАКа: 2D сканеры, ТСД, приложения на смартфоне. Что подойдёт именно вам.',
    category: 'oborudovanie',
    readTime: 6,
    date: '2025-12-12',
    popular: false,
    tags: ['сканеры', 'оборудование', '2D', 'ТСД']
  },
  {
    id: 'oborudovanie-dlya-markirovki',
    title: 'Оборудование для маркировки: полный комплект',
    excerpt: 'Какое оборудование нужно для маркировки товаров: принтеры, сканеры, расходники. Готовые комплекты для разных объёмов.',
    category: 'oborudovanie',
    readTime: 8,
    date: '2025-12-12',
    popular: true,
    tags: ['оборудование', 'принтеры', 'комплект']
  },
  {
    id: 'printer-etiketok-dlya-ip',
    title: 'Принтер этикеток для ИП и малого бизнеса',
    excerpt: 'Как выбрать принтер этикеток для небольших объёмов. Обзор бюджетных моделей для ИП и малого бизнеса.',
    category: 'oborudovanie',
    readTime: 5,
    date: '2025-12-12',
    popular: false,
    tags: ['принтеры', 'ИП', 'малый бизнес', 'этикетки']
  },
  {
    id: 'markirovka-importa',
    title: 'Маркировка импортных товаров: полный гайд',
    excerpt: 'Как маркировать импортные товары: где наносить коды, какие документы нужны, особенности для разных категорий.',
    category: 'import',
    readTime: 10,
    date: '2025-12-12',
    popular: true,
    tags: ['импорт', 'маркировка', 'таможня']
  },
  {
    id: 'markirovka-na-tamozhne-ili-sklade',
    title: 'Маркировка на таможне или на складе: что выбрать?',
    excerpt: 'Сравнение маркировки на таможенном складе и собственном складе. Плюсы и минусы каждого варианта.',
    category: 'import',
    readTime: 6,
    date: '2025-12-12',
    popular: false,
    tags: ['таможня', 'склад', 'импорт', 'сравнение']
  },
  {
    id: 'dokumenty-dlya-markirovki-importa',
    title: 'Документы для маркировки импорта',
    excerpt: 'Какие документы нужны для маркировки импортных товаров: декларация, инвойс, сертификаты. Контрольный список.',
    category: 'import',
    readTime: 5,
    date: '2025-12-12',
    popular: false,
    tags: ['документы', 'импорт', 'декларация']
  },
  {
    id: 'proverka-markirovki',
    title: 'Проверка маркировки: как проверяют и что грозит',
    excerpt: 'Как проходят проверки маркировки: кто проверяет, что смотрят, какие штрафы. Как подготовиться к проверке.',
    category: 'shtrafy',
    readTime: 6,
    date: '2025-12-12',
    popular: false,
    tags: ['проверки', 'штрафы', 'контроль']
  },
  {
    id: 'poddelnaya-markirovka',
    title: 'Поддельная маркировка: ответственность и последствия',
    excerpt: 'Что грозит за использование поддельных кодов маркировки. Уголовная ответственность, штрафы, конфискация.',
    category: 'shtrafy',
    readTime: 5,
    date: '2025-12-12',
    popular: false,
    tags: ['подделка', 'ответственность', 'уголовная']
  },
  {
    id: 'markirovka-obuvi-2025',
    title: 'Маркировка обуви в 2025 году: актуальные требования',
    excerpt: 'Всё о маркировке обуви: какая обувь подлежит, как получить коды, как наносить, штрафы за нарушения.',
    category: 'tovary',
    readTime: 8,
    date: '2025-12-12',
    popular: true,
    tags: ['обувь', 'маркировка', '2025', 'требования']
  },
  {
    id: 'markirovka-parfyumerii',
    title: 'Маркировка парфюмерии: что нужно знать',
    excerpt: 'Маркировка духов и туалетной воды: какие товары подлежат, исключения, особенности нанесения кодов.',
    category: 'tovary',
    readTime: 6,
    date: '2025-12-12',
    popular: false,
    tags: ['парфюмерия', 'духи', 'косметика']
  },
  {
    id: 'markirovka-bad',
    title: 'Маркировка БАД и лекарств',
    excerpt: 'Маркировка биологически активных добавок и лекарственных препаратов: отличия, требования, сроки.',
    category: 'tovary',
    readTime: 7,
    date: '2025-12-12',
    popular: false,
    tags: ['БАД', 'лекарства', 'фармацевтика']
  },
  {
    id: 'markirovka-moloka',
    title: 'Маркировка молочной продукции в 2025 году',
    excerpt: 'Как маркировать молочную продукцию. Какие молочные товары подлежат маркировке, сроки, требования — полная инструкция для бизнеса.',
    category: 'tovary',
    readTime: 6,
    date: '2025-12-12',
    popular: true,
    tags: ['маркировка молока', 'молочка', 'сыры', 'мороженое']
  },
  // Новые статьи (декабрь 2025)
  {
    id: 'lichnyj-kabinet-chestnogo-znaka',
    title: 'Личный кабинет Честного ЗНАКа: полный гайд по разделам',
    excerpt: 'Разбираем все разделы личного кабинета Честный ЗНАК — от входа до работы с кодами. Пошаговая навигация для новичков.',
    category: 'chestny-znak',
    readTime: 12,
    date: '2025-12-12',
    popular: true,
    tags: ['личный кабинет', 'честный знак', 'crpt', 'навигация']
  },
  {
    id: 'vhod-v-chestnyj-znak',
    title: 'Вход в Честный ЗНАК: пошаговая инструкция',
    excerpt: 'Как войти в личный кабинет Честного ЗНАКа через Госуслуги и по сертификату. Решение частых проблем со входом.',
    category: 'chestny-znak',
    readTime: 6,
    date: '2025-12-12',
    popular: true,
    tags: ['вход', 'авторизация', 'госуслуги', 'ЭЦП']
  },
  {
    id: 'edo-dlya-markirovki',
    title: 'ЭДО для маркировки: какой оператор нужен и как подключить',
    excerpt: 'Зачем нужен ЭДО для маркировки, как выбрать оператора и настроить обмен УПД. Список операторов с роуминг-доступом.',
    category: 'chestny-znak',
    readTime: 8,
    date: '2025-12-12',
    popular: true,
    tags: ['ЭДО', 'УПД', 'оператор', 'роуминг']
  },
  {
    id: 'chestnyj-znak-v-1s',
    title: 'Честный ЗНАК в 1С: как настроить интеграцию',
    excerpt: 'Настройка интеграции 1С с Честным ЗНАКом: подключение, обмен данными, печать кодов. Поддерживаемые конфигурации.',
    category: 'chestny-znak',
    readTime: 10,
    date: '2025-12-12',
    popular: true,
    tags: ['1С', 'интеграция', 'настройка', 'автоматизация']
  },
  {
    id: 'vyvod-tovara-iz-oborota',
    title: 'Вывод товара из оборота в Честном ЗНАКе',
    excerpt: 'Когда и как выводить товар из оборота: розничная продажа, списание, возврат. Пошаговая инструкция с примерами.',
    category: 'chestny-znak',
    readTime: 7,
    date: '2025-12-12',
    popular: false,
    tags: ['вывод из оборота', 'продажа', 'списание', 'возврат']
  },
  {
    id: 'vvod-tovara-v-oborot',
    title: 'Ввод товара в оборот: полное руководство',
    excerpt: 'Как правильно ввести товар в оборот в системе Честный ЗНАК. Производство, импорт, остатки — все сценарии.',
    category: 'chestny-znak',
    readTime: 9,
    date: '2025-12-12',
    popular: false,
    tags: ['ввод в оборот', 'производство', 'импорт', 'остатки']
  },
  {
    id: 'kartochka-tovara-v-chestnom-znake',
    title: 'Карточка товара в Честном ЗНАКе: как создать и заполнить',
    excerpt: 'Создание и редактирование карточки товара в ЛК Честный ЗНАК. Обязательные поля, ТНВЭД, атрибуты товарной группы.',
    category: 'chestny-znak',
    readTime: 8,
    date: '2025-12-12',
    popular: false,
    tags: ['карточка товара', 'ТНВЭД', 'атрибуты', 'создание']
  },
  {
    id: 'markirovka-motornyh-masel-2025',
    title: 'Маркировка моторных масел с 2025 года',
    excerpt: 'Новые правила маркировки моторных масел и автохимии. Сроки, требования, какие товары подлежат маркировке.',
    category: 'tovary',
    readTime: 7,
    date: '2025-12-12',
    popular: true,
    tags: ['моторные масла', 'автохимия', '2025', 'новая категория']
  },
  {
    id: 'markirovka-piva-2025',
    title: 'Маркировка пива и слабоалкогольных напитков в 2025',
    excerpt: 'Обязательная маркировка пива: сроки введения, какие напитки подлежат, требования к оборудованию.',
    category: 'tovary',
    readTime: 8,
    date: '2025-12-12',
    popular: true,
    tags: ['пиво', 'слабоалкогольные', '2025', 'алкоголь']
  },
  {
    id: 'markirovka-vody-2025',
    title: 'Маркировка воды в 2025 году: полный гайд',
    excerpt: 'Всё о маркировке питьевой воды: минеральная, газированная, детская. Сроки, исключения, как подготовиться.',
    category: 'tovary',
    readTime: 7,
    date: '2025-12-12',
    popular: true,
    tags: ['вода', 'питьевая вода', 'минеральная', '2025']
  },
  // Новые статьи от 17.12.2025
  {
    id: 'kupil-etiketki-pochemu-ne-rabotaet',
    title: 'Купил этикетки Честного знака — почему это не работает',
    excerpt: 'Разбираем схему покупки готовых этикеток маркировки. Почему это незаконно, чем грозит и реальный кейс с уголовкой.',
    category: 'shtrafy',
    readTime: 6,
    date: '2025-12-17',
    popular: true,
    tags: ['этикетки честный знак', 'купить коды маркировки', 'штраф за маркировку', 'уголовная ответственность']
  },
  {
    id: 'import-iz-kitaya-kak-markirovat',
    title: 'Импорт из Китая: как маркировать, если поставщик отказался',
    excerpt: 'Китайский поставщик не хочет маркировать товар для России? 3 легальных способа решить проблему: склад в РФ, СНГ, поиск нового поставщика.',
    category: 'import',
    readTime: 7,
    date: '2025-12-17',
    popular: true,
    tags: ['импорт из китая маркировка', 'маркировка китайских товаров', 'честный знак импорт', 'склад маркировки']
  },
  {
    id: 'shtraf-ili-ugolovka-granitsa',
    title: 'Штраф или уголовка за маркировку: где проходит граница',
    excerpt: 'Когда за нарушение маркировки дают штраф, а когда — реальный срок. Разбираем статьи КоАП и УК РФ простым языком.',
    category: 'shtrafy',
    readTime: 5,
    date: '2025-12-17',
    popular: true,
    tags: ['штраф за маркировку', 'уголовная ответственность маркировка', 'статья 171.1', 'наказание за честный знак']
  },
  {
    id: 'serye-shemy-markirovki',
    title: 'Серые схемы маркировки: почему все они ведут в тупик',
    excerpt: 'Разбираем популярные схемы обхода Честного знака: остатки, б/у, другой код ТН ВЭД, прокладки. Почему они не работают.',
    category: 'chestny-znak',
    readTime: 6,
    date: '2025-12-17',
    popular: false,
    tags: ['обойти честный знак', 'серая маркировка', 'схемы маркировки', 'как избежать маркировки']
  },
  {
    id: 'konsultatsiya-po-markirovke',
    title: 'Консультация по маркировке: разберём вашу ситуацию за 1 час',
    excerpt: 'Не понимаете, как работает Честный знак? Запутались в схемах? Разберём вашу конкретную ситуацию и дадим план действий.',
    category: 'chestny-znak',
    readTime: 4,
    date: '2025-12-17',
    popular: false,
    tags: ['консультация честный знак', 'помощь с маркировкой', 'эксперт по маркировке', 'разбор маркировки']
  },
  // Новые статьи (batch 2)
  {
    id: 'piot-chto-eto-2026',
    title: 'ПИОТ: что это и почему магазин могут закрыть на 90 дней',
    excerpt: 'С 7 января 2026 ПИОТ обязателен для всех касс. Разбираем что это, зачем нужно и как подготовиться.',
    category: 'chestny-znak',
    readTime: 6,
    date: '2025-12-17',
    popular: true,
    tags: ['ПИОТ', 'пиот маркировка', 'техническое средство маркировка', 'касса честный знак 2026']
  },
  {
    id: 'markirovka-konditerskih-izdeliy',
    title: 'Маркировка кондитерских изделий 2025: что нужно знать',
    excerpt: 'Кондитерские изделия попадают под маркировку. Разбираем сроки, требования и как подготовиться заранее.',
    category: 'tovary',
    readTime: 5,
    date: '2025-12-17',
    popular: false,
    tags: ['маркировка кондитерских изделий', 'честный знак кондитерка', 'маркировка сладостей', 'кондитер маркировка']
  },
  {
    id: 'kod-ne-chitaetsya-na-kasse',
    title: 'Код маркировки не читается на кассе: что делать',
    excerpt: 'DataMatrix не сканируется, касса блокирует продажу. Разбираем причины, последствия и как решить проблему.',
    category: 'chestny-znak',
    readTime: 5,
    date: '2025-12-17',
    popular: false,
    tags: ['код не читается', 'datamatrix не сканируется', 'маркировка не пикается', 'проблемы с кодом маркировки']
  },
  {
    id: 'edo-i-markirovka-nastrojka',
    title: 'ЭДО и маркировка: зачем нужен и как настроить',
    excerpt: 'Без ЭДО маркировка не работает. Разбираем что такое электронный документооборот, как выбрать оператора и настроить обмен.',
    category: 'chestny-znak',
    readTime: 6,
    date: '2025-12-17',
    popular: false,
    tags: ['ЭДО маркировка', 'электронный документооборот честный знак', 'УПД маркировка', 'оператор ЭДО']
  },
  {
    id: 'markirovka-dlya-proizvoditelei',
    title: 'Маркировка для производителей: как внедрить без остановки',
    excerpt: 'Пошаговый план внедрения маркировки на производстве. Оборудование, интеграция, обучение персонала.',
    category: 'chestny-znak',
    readTime: 7,
    date: '2025-12-17',
    popular: false,
    tags: ['маркировка производство', 'честный знак производитель', 'оборудование для маркировки', 'внедрение маркировки']
  },
];

const getCategoryColor = (categoryId) => {
  const colors = {
    'chestny-znak': 'bg-blue-100 text-blue-700 border-blue-200',
    'oborudovanie': 'bg-purple-100 text-purple-700 border-purple-200',
    'import': 'bg-cyan-100 text-cyan-700 border-cyan-200',
    'shtrafy': 'bg-red-100 text-red-700 border-red-200',
    'tovary': 'bg-green-100 text-green-700 border-green-200',
  };
  return colors[categoryId] || 'bg-gray-100 text-gray-700 border-gray-200';
};

const getCategoryName = (categoryId) => {
  const cat = CATEGORIES.find(c => c.id === categoryId);
  return cat ? cat.name : categoryId;
};

const ARTICLES_PER_PAGE = 10;

const KnowledgeBasePage = () => {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  // Фильтрация статей
  const filteredArticles = ARTICLES.filter(article => {
    const matchesCategory = selectedCategory === 'all' || article.category === selectedCategory;
    const matchesSearch = !searchQuery ||
      article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      article.excerpt.toLowerCase().includes(searchQuery.toLowerCase()) ||
      article.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  // Пагинация
  const totalPages = Math.ceil(filteredArticles.length / ARTICLES_PER_PAGE);
  const startIndex = (currentPage - 1) * ARTICLES_PER_PAGE;
  const paginatedArticles = filteredArticles.slice(startIndex, startIndex + ARTICLES_PER_PAGE);

  // Сброс страницы при изменении фильтров
  const handleCategoryChange = (category) => {
    setSelectedCategory(category);
    setCurrentPage(1);
  };

  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
    setCurrentPage(1);
  };

  const popularArticles = ARTICLES.filter(a => a.popular).slice(0, 3);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <SEO
        title="База знаний по маркировке товаров | Про.Маркируй"
        description="Полезные статьи о маркировке товаров: регистрация в Честном ЗНАКе, оборудование, штрафы, импорт. Пошаговые инструкции и гайды."
        keywords="база знаний маркировка, статьи о маркировке, честный знак инструкции, гайды по маркировке"
      />

      {/* Hero Section */}
      <section className="relative py-16 noise-bg overflow-hidden">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.3 }}
          className="absolute -top-20 -right-20 w-[500px] h-[500px] rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(59,130,246,0.2) 0%, rgba(59,130,246,0) 70%)',
            filter: 'blur(60px)'
          }}
        />

        <div className="relative mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-10"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-50 border border-blue-200 mb-4">
              <BookOpen className="w-4 h-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-700">База знаний</span>
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 mb-4">
              Всё о маркировке товаров
            </h1>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Пошаговые инструкции, гайды и ответы на частые вопросы.
              Разбираемся в маркировке простым языком.
            </p>
          </motion.div>

          {/* Search */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="max-w-xl mx-auto mb-8"
          >
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                type="text"
                placeholder="Поиск по статьям..."
                value={searchQuery}
                onChange={handleSearchChange}
                className="pl-12 pr-4 py-6 text-lg rounded-2xl border-2 border-gray-200 focus:border-blue-400 shadow-lg"
              />
            </div>
          </motion.div>

          {/* Categories */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="flex flex-wrap justify-center gap-2"
          >
            {CATEGORIES.map((category) => {
              const Icon = category.icon;
              const isActive = selectedCategory === category.id;
              return (
                <button
                  key={category.id}
                  onClick={() => handleCategoryChange(category.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all ${
                    isActive
                      ? 'bg-gray-900 text-white shadow-lg'
                      : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {category.name}
                </button>
              );
            })}
          </motion.div>
        </div>
      </section>

      <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">
                {selectedCategory === 'all' ? 'Все статьи' : getCategoryName(selectedCategory)}
              </h2>
              <span className="text-sm text-gray-500">
                {filteredArticles.length} {filteredArticles.length === 1 ? 'статья' : 'статей'}
              </span>
            </div>

            {filteredArticles.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-2xl border border-gray-200">
                <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">Статьи не найдены</p>
                <button
                  onClick={() => { handleCategoryChange('all'); setSearchQuery(''); }}
                  className="mt-4 text-blue-600 hover:underline"
                >
                  Сбросить фильтры
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {paginatedArticles.map((article, index) => (
                  <motion.div
                    key={article.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <Link
                      to={`/knowledge/${article.id}`}
                      className="block bg-white rounded-2xl border border-gray-200 p-6 hover:border-blue-300 hover:shadow-lg transition-all group"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-3">
                            <span className={`px-2 py-1 rounded-lg text-xs font-medium border ${getCategoryColor(article.category)}`}>
                              {getCategoryName(article.category)}
                            </span>
                            {article.popular && (
                              <span className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium bg-yellow-100 text-yellow-700 border border-yellow-200">
                                <TrendingUp className="w-3 h-3" />
                                Популярное
                              </span>
                            )}
                          </div>

                          <h3 className="text-lg font-bold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">
                            {article.title}
                          </h3>

                          <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                            {article.excerpt}
                          </p>

                          <div className="flex items-center gap-4 text-xs text-gray-500">
                            <span className="flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5" />
                              {article.readTime} мин чтения
                            </span>
                            <span>{new Date(article.date).toLocaleDateString('ru-RU')}</span>
                          </div>
                        </div>

                        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center group-hover:bg-blue-100 transition-colors">
                          <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-blue-600 transition-colors" />
                        </div>
                      </div>
                    </Link>
                  </motion.div>
                ))}
              </div>
            )}

            {/* Пагинация */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-8">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="flex items-center gap-1 px-3 py-2 rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Назад
                </button>

                <div className="flex items-center gap-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`w-10 h-10 rounded-lg font-medium transition-colors ${
                        currentPage === page
                          ? 'bg-gray-900 text-white'
                          : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      {page}
                    </button>
                  ))}
                </div>

                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="flex items-center gap-1 px-3 py-2 rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Вперёд
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            {/* Popular Articles */}
            <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-6">
              <h3 className="flex items-center gap-2 font-bold text-gray-900 mb-4">
                <TrendingUp className="w-5 h-5 text-yellow-500" />
                Популярные статьи
              </h3>
              <div className="space-y-3">
                {popularArticles.map((article) => (
                  <Link
                    key={article.id}
                    to={`/knowledge/${article.id}`}
                    className="block p-3 rounded-xl hover:bg-gray-50 transition-colors group"
                  >
                    <h4 className="text-sm font-medium text-gray-900 group-hover:text-blue-600 transition-colors line-clamp-2">
                      {article.title}
                    </h4>
                    <span className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {article.readTime} мин
                    </span>
                  </Link>
                ))}
              </div>
            </div>

            {/* CTA */}
            <div className="bg-gradient-to-br from-yellow-400 to-yellow-500 rounded-2xl p-6 text-center">
              <h3 className="font-bold text-gray-900 mb-2">
                Нужна помощь?
              </h3>
              <p className="text-sm text-gray-800 mb-4">
                Не нашли ответ? Наши эксперты помогут разобраться с маркировкой
              </p>
              <Link
                to="/contact"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-gray-900 text-white rounded-xl font-medium hover:bg-gray-800 transition-colors"
              >
                Получить консультацию
                <ChevronRight className="w-4 h-4" />
              </Link>
            </div>

            {/* Tags Cloud */}
            <div className="bg-white rounded-2xl border border-gray-200 p-6 mt-6">
              <h3 className="flex items-center gap-2 font-bold text-gray-900 mb-4">
                <Tag className="w-5 h-5 text-gray-400" />
                Темы
              </h3>
              <div className="flex flex-wrap gap-2">
                {['регистрация', 'штрафы', 'маркетплейсы', 'оборудование', 'принтеры', 'импорт', 'обувь', 'парфюмерия'].map((tag) => (
                  <button
                    key={tag}
                    onClick={() => setSearchQuery(tag)}
                    className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200 transition-colors"
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default KnowledgeBasePage;
