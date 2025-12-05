{
  "meta": {
    "product": "Про.Маркируй",
    "goal": "Насыщенный, контрастный и легко читаемый премиальный SaaS-визуал уровня Stripe/Vercel/Linear с акцентами синего и изумрудного.",
    "audience": ["B2B", "операторы маркировки", "склад/ритейл", "менеджеры"],
    "app_type": "SaaS web app (React + FastAPI)",
    "mobile_first": true
  },
  "brand_attributes": [
    "точный и надёжный",
    "премиальный и технологичный",
    "контрастный и читаемый",
    "динамичный, но сдержанный"
  ],
  "palette": {
    "brand": {
      "blue": {
        "50": "#EEF2FF",
        "100": "#E0E7FF",
        "200": "#C7D2FE",
        "300": "#A5B4FC",
        "400": "#7B91F8",
        "500": "#3B5CCC",
        "600": "#23419A",
        "700": "#1E3A8A",
        "800": "#182E6C",
        "900": "#0F1F49"
      },
      "emerald": {
        "50": "#ECFDF5",
        "100": "#D1FAE5",
        "200": "#A7F3D0",
        "300": "#6EE7B7",
        "400": "#34D399",
        "500": "#10B981",
        "600": "#059669",
        "700": "#047857",
        "800": "#065F46",
        "900": "#064E3B"
      }
    },
    "support": {
      "amber": {
        "400": "#F59E0B",
        "500": "#D97706"
      },
      "red": {
        "500": "#EF4444",
        "600": "#DC2626"
      },
      "sky": {
        "300": "#7DD3FC",
        "400": "#38BDF8"
      }
    },
    "neutrals": {
      "bg": "#FFFFFF",
      "bg-soft": "#F8FAFC",
      "bg-tint-blue": "#F1F5FF",
      "bg-tint-emerald": "#F0FFF7",
      "surface": "#FFFFFF",
      "surface-2": "#F9FAFB",
      "border": "#E5EAF0",
      "text-strong": "#0B1220",
      "text": "#111827",
      "text-muted": "#5B6476"
    },
    "states": {
      "success": "#059669",
      "warning": "#D97706",
      "error": "#DC2626",
      "info": "#1E3A8A",
      "ring": "rgba(30,58,138,0.3)"
    },
    "usage": {
      "primary_actions": "blue.700 on white with emerald accents",
      "cta_alt": "emerald.600 on white",
      "sections": "alternate white, bg-tint-blue, bg-tint-emerald",
      "cards": "white with subtle border and layered shadow",
      "charts": "brand blues/emerald + neutral greys"
    }
  },
  "design_tokens": {
    "css_variables_add_to_index.css": """
    @layer base {
      :root {
        --brand-blue-50: 238 243 255; /* #EEF2FF */
        --brand-blue-100: 224 231 255;
        --brand-blue-200: 199 210 254;
        --brand-blue-300: 165 180 252;
        --brand-blue-400: 123 145 248;
        --brand-blue-500: 59 92 204;
        --brand-blue-600: 35 65 154;
        --brand-blue-700: 30 58 138; /* #1E3A8A */
        --brand-blue-800: 24 46 108;
        --brand-blue-900: 15 31 73;

        --brand-emerald-50: 236 253 245;
        --brand-emerald-100: 209 250 229;
        --brand-emerald-200: 167 243 208;
        --brand-emerald-300: 110 231 183;
        --brand-emerald-400: 52 211 153;
        --brand-emerald-500: 16 185 129;
        --brand-emerald-600: 5 150 105; /* #059669 */
        --brand-emerald-700: 4 120 87;
        --brand-emerald-800: 6 95 70;
        --brand-emerald-900: 6 78 59;

        --text-strong: 11 18 32;  /* #0B1220 */
        --text-default: 17 24 39; /* #111827 */
        --text-muted: 91 100 118; /* #5B6476 */

        --surface: 255 255 255; /* #FFFFFF */
        --surface-2: 249 250 251; /* #F9FAFB */
        --border-1: 229 234 240;  /* #E5EAF0 */

        --radius-sm: 6px;
        --radius-md: 10px;
        --radius-lg: 14px;
        --radius-xl: 20px;

        --shadow-1: 0 1px 2px rgba(16,24,40,0.08);
        --shadow-2: 0 4px 10px rgba(2,6,23,0.08);
        --shadow-layer: 0 1px 2px rgba(16,24,40,0.06), 0 6px 18px rgba(2,6,23,0.10);
        --shadow-elevated: 0 10px 30px rgba(15,31,73,0.14);

        --hero-gradient: linear-gradient(145deg, #F1F5FF 0%, #FFFFFF 45%, #F0FFF7 100%);
        --cta-blue-gradient: linear-gradient(90deg, #23419A 0%, #1E3A8A 60%, #1E3A8A 100%);
        --cta-emerald-gradient: linear-gradient(90deg, #06A77D 0%, #059669 60%, #059669 100%);
      }
    }
    "",
    "tailwind_suggestions": [
      "bg-[rgb(var(--surface))] text-[rgb(var(--text-default))]",
      "text-blue-800 [color:#1E3A8A]",
      "border-[rgb(var(--border-1))]",
      "rounded-[var(--radius-md)]",
      "shadow-[var(--shadow-1)]",
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[rgba(30,58,138,0.3)]"
    ]
  },
  "typography": {
    "fonts": {
      "heading": "Space Grotesk, Inter, system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
      "body": "Inter, system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
      "mono": "Source Code Pro, ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace"
    },
    "import": """
      <link href='https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=Inter:wght@400;500;600;700&display=swap' rel='stylesheet'>
    "",
    "scale": {
      "h1": "text-4xl sm:text-5xl lg:text-6xl tracking-tight font-semibold",
      "h2": "text-base md:text-lg font-semibold text-[rgb(var(--text-strong))]",
      "h3": "text-lg md:text-xl font-semibold",
      "body": "text-base md:text-base text-[rgb(var(--text-default))]",
      "muted": "text-sm text-[rgb(var(--text-muted))]"
    },
    "rules": [
      "Заголовки всегда в Space Grotesk с -1% letter-spacing, жирность 600/700",
      "Увеличить межстрочные интервалы: leading-tight для h1/h2, leading-relaxed для текста",
      "Макс. ширина абзацев: max-w-prose для лучшей читаемости"
    ]
  },
  "shadows_and_elevation": {
    "tokens": {
      "card": "var(--shadow-layer)",
      "popover": "0 12px 36px rgba(15,31,73,0.18)",
      "focus": "0 0 0 4px rgba(30,58,138,0.15)",
      "inset_soft": "inset 0 1px 0 rgba(255,255,255,0.6), inset 0 -1px 0 rgba(0,0,0,0.02)"
    },
    "hover_principle": "На hover усиливать тень и слегка поднимать (translateY(-2px)) — только для кликабельных карточек и крупных CTA."
  },
  "radiuses_and_borders": {
    "radius": {
      "sm": "var(--radius-sm)",
      "md": "var(--radius-md)",
      "lg": "var(--radius-lg)",
      "xl": "var(--radius-xl)"
    },
    "border_color": "rgb(var(--border-1))",
    "card_border": "1px solid rgb(var(--border-1))"
  },
  "gradients_and_textures": {
    "rules": [
      "Использовать градиенты только на крупных секциях (Hero, разделители) и крупных CTA",
      "Не применять зелёно-синие или пурпурно-розовые тёмные комбинации; вместо этого — одноцветные тона: blue→blue, emerald→emerald",
      "Градиенты не должны занимать более 20% вьюпорта, не на текстовых зонах"
    ],
    "hero_background": "var(--hero-gradient)",
    "noise_overlay_css": ".noise-bg{background:var(--hero-gradient);position:relative}.noise-bg:after{content:'';position:absolute;inset:0;pointer-events:none;mix-blend-mode:multiply;opacity:.05;background-image:radial-gradient(#0b1220 1px,transparent 1px);background-size:3px 3px}",
    "accent_stripes_css": ".bg-stripes{background-image:linear-gradient(135deg,rgba(30,58,138,0.06) 12.5%,transparent 12.5%),linear-gradient(225deg,rgba(30,58,138,0.06) 12.5%,transparent 12.5%),linear-gradient(45deg,rgba(5,150,105,0.06) 12.5%,transparent 12.5%),linear-gradient(315deg,rgba(5,150,105,0.06) 12.5%,transparent 12.5%);background-size:12px 12px;background-position:0 0,0 6px,6px -6px,-6px 0}",
    "card_glass_hint": "фон: rgba(255,255,255,0.8); backdrop-blur-sm; только для оверлеев/героя"
  },
  "components": {
    "button": {
      "use": "./components/ui/button.jsx",
      "variants": {
        "primary": "btn-gradient text-white rounded-[var(--radius-md)] px-5 py-3 shadow-[var(--shadow-2)] hover:shadow-[var(--shadow-elevated)] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[rgba(30,58,138,0.3)]",
        "secondary": "bg-white text-blue-800 border border-[rgb(var(--border-1))] rounded-[var(--radius-md)] px-5 py-3 shadow-[var(--shadow-1)] hover:shadow-[var(--shadow-2)] hover:border-blue-200",
        "ghost": "bg-transparent text-blue-800 rounded-[var(--radius-md)] px-4 py-2 hover:bg-[rgba(30,58,138,0.06)]"
      },
      "motion": {
        "hover": "scale:1.02; transition: transform .2s ease, box-shadow .25s ease",
        "press": "scale:0.98"
      },
      "example_jsx": """
        import { Button } from './components/ui/button'
        export const CTAButtons = () => (
          <div className='flex gap-3'>
            <Button data-testid='hero-primary-cta' className='btn-gradient'>Начать проверку</Button>
            <Button data-testid='hero-secondary-cta' variant='outline' className='bg-white border rounded-[var(--radius-md)]'>Демо</Button>
          </div>
        )
      """
    },
    "card": {
      "use": "./components/ui/card.jsx",
      "base": "bg-white border border-[rgb(var(--border-1))] rounded-[var(--radius-lg)] shadow-[var(--shadow-1)] hover:shadow-[var(--shadow-elevated)] transition-[box-shadow,transform] duration-300 ease-out will-change-transform",
      "hover": "hover:-translate-y-0.5",
      "header_typography": "text-lg md:text-xl font-semibold text-[rgb(var(--text-strong))]",
      "accent_border_styles": [
        "[--accent:#1E3A8A] border-l-4 border-l-[color:var(--accent)]",
        "[--accent:#059669] border-l-4 border-l-[color:var(--accent)]"
      ],
      "example_bento": "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4"
    },
    "icon": {
      "library": "Lucide",
      "bg_token": "tinted circles: bg-[rgba(30,58,138,0.08)] text-blue-700 or bg-[rgba(5,150,105,0.10)] text-emerald-700",
      "size": "w-6 h-6 md:w-7 md:h-7",
      "container": "inline-flex items-center justify-center rounded-[12px] p-2"
    },
    "input": {
      "use": "./components/ui/input.jsx",
      "class": "h-11 rounded-[var(--radius-md)] border border-[rgb(var(--border-1))] focus-visible:ring-2 focus-visible:ring-[rgba(30,58,138,0.30)] focus-visible:ring-offset-2",
      "error": "ring-2 ring-[rgba(220,38,38,0.25)]"
    },
    "select": { "use": "./components/ui/select.jsx" },
    "tabs": { "use": "./components/ui/tabs.jsx" },
    "table": { "use": "./components/ui/table.jsx", "notes": "Зебра-фон с bg-slate-50/white, чёткие заголовки, фикс. высота строк 52px" },
    "toast": { "use": "./components/ui/sonner.jsx", "note": "Использовать для уведомлений после импорта, проверки, отправки формы" },
    "calendar": { "use": "./components/ui/calendar.jsx", "note": "Если потребуется выбор дат — только shadcn calendar" },
    "navigation": {
      "header": {
        "class": "sticky top-0 z-40 bg-white/90 backdrop-blur supports-[backdrop-filter]:bg-white/70 border-b",
        "height": "h-16",
        "active_item": "text-blue-800 border-b-2 border-blue-700",
        "cta": "btn-gradient"
      },
      "footer": {
        "class": "bg-[rgb(var(--surface-2))] text-[rgb(var(--text-muted))] border-t",
        "links": "text-[rgb(var(--text-default))] hover:text-blue-800"
      }
    },
    "hero": {
      "wrapper": "noise-bg bg-stripes relative overflow-hidden",
      "content": "container py-12 sm:py-16 lg:py-20",
      "title": "text-[rgb(var(--text-strong))] font-semibold tracking-tight text-4xl sm:text-5xl lg:text-6xl",
      "subtitle": "mt-4 max-w-prose text-[rgb(var(--text-muted))] text-base md:text-lg",
      "cta_group": "mt-8 flex flex-col sm:flex-row gap-3"
    }
  },
  "layouts": {
    "grid_system": {
      "container": "max-w-7xl mx-auto px-4 sm:px-6 lg:px-8",
      "columns": "12-col grid, gap-4 md:gap-6",
      "bento_home": "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 md:gap-6",
      "card_padding": "p-5 md:p-6"
    },
    "patterns": [
      "Чередование фоновых секций: white → bg-tint-blue → white → bg-tint-emerald",
      "Визуальный вес через цветные лев. бордеры у карточек и крупные иконки на тоне",
      "Заголовки всегда темнее (text-strong), абзацы — text-muted"
    ]
  },
  "pages": {
    "Header": {
      "layout": "Левее — логотип (DataMatrix-точки), справа — навигация и CTA",
      "components": ["navigation.header", "button"],
      "improvements": [
        "Добавить тень при прокрутке (shadow-[var(--shadow-1)])",
        "Активный пункт — подчёркнут border-b-2",
        "Кнопка CTA — вариант primary"
      ]
    },
    "HomePage": {
      "hero": {
        "bg": "noise-bg + bg-stripes, не более 20% вьюпорта",
        "illustration": "геометрический паттерн/коллаж (см. image_urls[0..2]) справа, не перекрывать текст",
        "cta": ["Начать проверку", "Демо"]
      },
      "benefits_bento": {
        "grid": "bento_home",
        "card": "components.card.base + .hover",
        "icon": "крупные Lucide, фоновые плашки в brand tint"
      },
      "quick_actions": {
        "pattern": "3–4 карточки действий: Проверить код, Импорт, Оборудование, Связаться",
        "hover": "подъём + усиленная тень"
      }
    },
    "CheckProductPage": {
      "above_fold": "заголовок + поле ввода кода + кнопка 'Проверить'",
      "inputs": "увеличенные высоты (h-11), контрастные лейблы",
      "result_card": "цветные состояния: success emerald bg-emerald-50 border-emerald-200, error bg-red-50 border-red-200"
    },
    "ImportPage": {
      "steps": "Tabs для форматов + карточка импорта с drag&drop (Dropzone)",
      "feedback": "sonner тосты по этапам импорта",
      "progress": "Progress компонент с синими акцентами"
    },
    "EquipmentPage": {
      "catalog": "карточки оборудования с фото/пиктограммой, цена/ссылка",
      "filters": "shadcn select/checkbox, крупные hit-areas",
      "charts": "Recharts мини-график статусов (опционально)"
    },
    "ContactPage": {
      "form": "имя/телефон/email/сообщение, валидация, sonner on success",
      "side": "карта/иллюстрация с паттерном"
    },
    "Footer": {
      "layout": "3–4 колонки ссылок + логотип + мини-legal",
      "bg": "surface-2",
      "contrast": "заголовки колонок темнее, ссылки средней насыщенности"
    }
  },
  "micro_interactions": {
    "principles": [
      "Каждый hover даёт еле заметное увеличение/подъём",
      "Focus-ринги контрастные (ring brand) и видимые",
      "Входные анимации: fade+up 200–400ms стеггер",
      "Никаких universal transition: только конкретные свойства"
    ],
    "framer_variants_js": """
      export const fadeUp = {
        hidden: { opacity: 0, y: 12 },
        show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' } }
      }
      export const listStagger = {
        hidden: {},
        show: { transition: { staggerChildren: 0.06, delayChildren: 0.1 } }
      }
    """
  },
  "accessibility": {
    "contrast": "Все тексты ≥ WCAG AA. Заголовки на белом — #0B1220; на тёплых тинтах — #0B1220",
    "focus": "Видимые focus-обводки: ring 2px + ring-offset",
    "hit_areas": "Кнопки/интерактивы min-h:44px",
    "icons": "Иконки с достаточным цветовым контрастом к фону"
  },
  "testing_ids": {
    "rule": "Каждый интерактивный и ключевой инфо-элемент должен иметь data-testid с ролью. Кебаб-кейс.",
    "examples": [
      "data-testid='hero-primary-cta'",
      "data-testid='nav-equipment-link'",
      "data-testid='check-code-input'",
      "data-testid='import-upload-dropzone'",
      "data-testid='toast-success-message'",
      "data-testid='contact-form-submit-button'"
    ]
  },
  "libraries": {
    "framer_motion": {
      "status": "в проекте",
      "usage": "для entrance/hover анимаций"
    },
    "recharts": {
      "install": "npm i recharts",
      "usage": "мини-спарклайны/пироги на EquipmentPage"
    },
    "lottie": {
      "install": "npm i lottie-react",
      "usage": "аккуратные иллюстрации в герое/пустых состояниях (опционально)"
    }
  },
  "css_snippets": {
    "buttons": """
      .btn-gradient{background:var(--cta-blue-gradient);color:#fff;border:none;transition:box-shadow .3s ease}
      .btn-gradient-emerald{background:var(--cta-emerald-gradient);color:#fff;border:none;transition:box-shadow .3s ease}
      .btn-gradient:hover,.btn-gradient-emerald:hover{box-shadow:var(--shadow-elevated)}
    """,
    "card": """
      .card-hover{transition:box-shadow .3s ease, transform .3s ease}
      .card-hover:hover{box-shadow:var(--shadow-elevated);transform:translateY(-2px)}
    """,
    "focus": """
      .ring-brand:focus{outline:none;box-shadow:0 0 0 4px rgba(30,58,138,.15)}
    """
  },
  "component_path": {
    "button": "./components/ui/button.jsx",
    "card": "./components/ui/card.jsx",
    "badge": "./components/ui/badge.jsx",
    "tabs": "./components/ui/tabs.jsx",
    "table": "./components/ui/table.jsx",
    "select": "./components/ui/select.jsx",
    "input": "./components/ui/input.jsx",
    "checkbox": "./components/ui/checkbox.jsx",
    "toast": "./components/ui/sonner.jsx",
    "calendar": "./components/ui/calendar.jsx",
    "dialog": "./components/ui/dialog.jsx",
    "popover": "./components/ui/popover.jsx",
    "tooltip": "./components/ui/tooltip.jsx"
  },
  "example_sections_jsx": {
    "hero": """
      import { Button } from './components/ui/button'
      import { motion } from 'framer-motion'
      import { fadeUp, listStagger } from './motion'

      export const Hero = () => (
        <section className='noise-bg bg-stripes relative overflow-hidden'>
          <div className='container py-12 sm:py-16 lg:py-20'>
            <motion.div initial='hidden' animate='show' variants={listStagger}>
              <motion.h1 variants={fadeUp} className='text-[rgb(var(--text-strong))] font-semibold tracking-tight text-4xl sm:text-5xl lg:text-6xl' data-testid='hero-title'>
                Про.Маркируй — точная проверка кодов без ошибок
              </motion.h1>
              <motion.p variants={fadeUp} className='mt-4 max-w-prose text-[rgb(var(--text-muted))] text-base md:text-lg' data-testid='hero-subtitle'>
                Быстрая валидация, импорт, управление оборудованием. Премиальный UX для ежедневной работы.
              </motion.p>
              <motion.div variants={fadeUp} className='mt-8 flex flex-col sm:flex-row gap-3'>
                <Button className='btn-gradient' data-testid='hero-primary-cta'>Начать проверку</Button>
                <Button variant='outline' className='bg-white border rounded-[var(--radius-md)]' data-testid='hero-secondary-cta'>Демо</Button>
              </motion.div>
            </motion.div>
          </div>
        </section>
      )
    """,
    "benefits_bento": """
      import { Card, CardHeader, CardContent } from './components/ui/card'
      import { ShieldCheck, Upload, Scan, Headphones } from 'lucide-react'

      const Item = ({ icon:Icon, title, desc, testid }) => (
        <Card className='card-hover' data-testid={testid}>
          <CardHeader className='flex items-center gap-3'>
            <span className='inline-flex items-center justify-center rounded-[12px] p-2 bg-[rgba(30,58,138,0.08)] text-blue-700'>
              <Icon className='w-6 h-6' />
            </span>
            <h3 className='text-lg md:text-xl font-semibold text-[rgb(var(--text-strong))]'>{title}</h3>
          </CardHeader>
          <CardContent className='text-[rgb(var(--text-muted))]'>{desc}</CardContent>
        </Card>
      )

      export const Benefits = () => (
        <section className='py-10'>
          <div className='container grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 md:gap-6'>
            <Item icon={Scan} title='Проверка' desc='Мгновенная валидация кодов' testid='benefit-check' />
            <Item icon={Upload} title='Импорт' desc='Пакетная загрузка и контроль' testid='benefit-import' />
            <Item icon={ShieldCheck} title='Надёжность' desc='Точные результаты без шума' testid='benefit-reliable' />
            <Item icon={Headphones} title='Поддержка' desc='Быстрый отклик 24/7' testid='benefit-support' />
          </div>
        </section>
      )
    """
  },
  "image_urls": [
    {
      "url": "https://images.unsplash.com/photo-1752428464156-27ab5073dace?crop=entropy&cs=srgb&fm=jpg&q=85",
      "category": "hero-background",
      "description": "Геометрический сине-зелёный паттерн (мягкая подложка справа/снизу)"
    },
    {
      "url": "https://images.unsplash.com/photo-1752428464167-836e81f7e528?crop=entropy&cs=srgb&fm=jpg&q=85",
      "category": "section-accent",
      "description": "Абстрактный зелёный узор для баннеров между секциями"
    },
    {
      "url": "https://images.unsplash.com/photo-1752428464144-1e5915abdbc5?crop=entropy&cs=srgb&fm=jpg&q=85",
      "category": "card-illustration",
      "description": "Синий геометрический фон для сайд-иллюстраций"
    },
    {
      "url": "https://images.pexels.com/photos/34091520/pexels-photo-34091520.jpeg",
      "category": "equipment-placeholder",
      "description": "Техническая текстура для карточек оборудования"
    },
    {
      "url": "https://images.pexels.com/photos/30869894/pexels-photo-30869894.jpeg",
      "category": "divider",
      "description": "Мягкий тех-абстракт для разделителей"
    }
  ],
  "instructions_to_main_agent": [
    "Добавить Google Fonts линк для Space Grotesk и Inter в index.html",
    "Расширить index.css: вставить блок design_tokens.css_variables_add_to_index.css в @layer base :root",
    "Проверить, что App.css содержит .noise-bg, .btn-gradient и .card-hover (оставить/усилить)",
    "Перекрасить основные CTA в синий градиент, альтернативные — изумруд",
    "На всех страницах: заголовки в Space Grotesk, крупнее; текст — Inter",
    "HomePage: внедрить секции hero + benefits_bento + quick_actions с указанными сетками",
    "CheckProductPage: применить крупное поле ввода (h-11), контрастные состояния результата",
    "ImportPage: использовать Tabs, Progress, Sonner; добавить data-testid на все интерактивы",
    "EquipmentPage: карточки с крупными иконками/фото и цветными левыми бордерами",
    "ContactPage: форма с видимыми фокусами и подтверждением через Sonner",
    "Header/ Footer: липкая шапка с полупрозрачным фоном и чёткой обводкой; футер на surface-2",
    "Каждому интерактиву добавить data-testid по роли (кебаб-кейс)",
    "Соблюдать ограничение градиентов (≤20% вьюпорта, не на текстовых областях)"
  ],
  "general_ui_ux_design_guidelines": "- You must **not** apply universal transition. Eg: `transition: all`. This results in breaking transforms. Always add transitions for specific interactive elements like button, input excluding transforms\n    - You must **not** center align the app container, ie do not add `.App { text-align: center; }` in the css file. This disrupts the human natural reading flow of text\n   - NEVER: use AI assistant Emoji characters like`🤖🧠💭💡🔮🎯📚🎭🎬🎪🎉🎊🎁🎀🎂🍰🎈🎨🎰💰💵💳🏦💎🪙💸🤑📊📈📉💹🔢🏆🥇 etc for icons. Always use **FontAwesome cdn** or **lucid-react** library already installed in the package.json\n\n **GRADIENT RESTRICTION RULE**\nNEVER use dark/saturated gradient combos (e.g., purple/pink) on any UI element.  Prohibited gradients: blue-500 to purple 600, purple 500 to pink-500, green-500 to blue-500, red to pink etc\nNEVER use dark gradients for logo, testimonial, footer etc\nNEVER let gradients cover more than 20% of the viewport.\nNEVER apply gradients to text-heavy content or reading areas.\nNEVER use gradients on small UI elements (<100px width).\nNEVER stack multiple gradient layers in the same viewport.\n\n**ENFORCEMENT RULE:**\n    • Id gradient area exceeds 20% of viewport OR affects readability, **THEN** use solid colors\n\n**How and where to use:**\n   • Section backgrounds (not content backgrounds)\n   • Hero section header content. Eg: dark to light to dark color\n   • Decorative overlays and accent elements only\n   • Hero section with 2-3 mild color\n   • Gradients creation can be done for any angle say horizontal, vertical or diagonal\n\n- For AI chat, voice application, **do not use purple color. Use color like light green, ocean blue, peach orange etc**\n\n</Font Guidelines>\n\n- Every interaction needs micro-animations - hover states, transitions, parallax effects, and entrance animations. Static = dead. \n   \n- Use 2-3x more spacing than feels comfortable. Cramped designs look cheap.\n\n- Subtle grain textures, noise overlays, custom cursors, selection states, and loading animations: separates good from extraordinary.\n   \n- Before generating UI, infer the visual style from the problem statement (palette, contrast, mood, motion) and immediately instantiate it by setting global design tokens (primary, secondary/accent, background, foreground, ring, state colors), rather than relying on any library defaults. Don't make the background dark as a default step, always understand problem first and define colors accordingly\n    Eg: - if it implies playful/energetic, choose a colorful scheme\n           - if it implies monochrome/minimal, choose a black–white/neutral scheme\n\n**Component Reuse:**\n\t- Prioritize using pre-existing components from src/components/ui when applicable\n\t- Create new components that match the style and conventions of existing components when needed\n\t- Examine existing components to understand the project's component patterns before creating new ones\n\n**IMPORTANT**: Do not use HTML based component like dropdown, calendar, toast etc. You **MUST** always use `/app/frontend/src/components/ui/ ` only as a primary components as these are modern and stylish component\n\n**Best Practices:**\n\t- Use Shadcn/UI as the primary component library for consistency and accessibility\n\t- Import path: ./components/[component-name]\n\n**Export Conventions:**\n\t- Components MUST use named exports (export const ComponentName = ...)\n\t- Pages MUST use default exports (export default function PageName() {...})\n\n**Toasts:**\n  - Use `sonner` for toasts"\n  - Sonner component are located in `/app/src/components/ui/sonner.tsx`\n\nUse 2–4 color gradients, subtle textures/noise overlays, or CSS-based noise to avoid flat visuals."
}
