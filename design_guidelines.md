{
  "product": {
    "name": "Про.Маркируй",
    "tagline": "Сервис-помощник по маркировке товаров в Честный ЗНАК за 2 минуты",
    "brand_attributes": ["премиальный", "минималистичный", "надежный", "понятный", "технологичный"],
    "audience": ["ИП и малые/средние предприниматели", "операторы производства", "логисты"],
    "key_tasks": [
      "Быстро понять, что делать в Честном ЗНАКе",
      "Проверить товар (3 шага)",
      "Импорт товаров (3 шага)",
      "Оснащение производства (4 шага)",
      "Оставить заявку/контакт"
    ],
    "success_actions": [
      "Заполненная многошаговая форма",
      "Получен результат проверки с индикаторами",
      "Успешно отправлена заявка"
    ]
  },

  "theme": {
    "mode": "light-only",
    "radii": {"card": "16px", "button": "12px", "input": "12px", "pill": "9999px"},
    "shadows": {
      "ios-soft-1": "0 1px 2px rgba(16, 24, 40, 0.06)",
      "ios-soft-2": "0 4px 10px rgba(16, 24, 40, 0.06)",
      "ios-layer": "0 1px 2px rgba(16,24,40,0.04), 0 6px 16px rgba(16,24,40,0.06)",
      "elevated": "0 8px 24px rgba(2, 6, 23, 0.08)"
    },
    "colors": {
      "primary": "#1E3A8A",  
      "accent": "#059669",   
      "background": "#FFFFFF",
      "card": "#F8FAFC",
      "muted": "#EEF2F7",
      "text": "#0B1220",
      "subtle": "#4B5563",
      "border": "#E5E7EB",
      "ring": "#1E3A8A",
      "success": "#059669",
      "error": "#DC2626",
      "warning": "#D97706",
      "info": "#0EA5E9"
    },
    "gradients": {
      "rules": {
        "restriction": [
          "NEVER use dark/saturated gradient combos (purple/pink, green/blue, red/pink, etc)",
          "NEVER let gradients cover more than 20% of viewport",
          "NEVER on text-heavy content or small UI (<100px)",
          "Use only on hero background (decorative) and primary CTA buttons"
        ],
        "enforcement": "If gradient harms readability or exceeds 20% viewport, fallback to solid colors"
      },
      "hero_soft": "linear-gradient(145deg, #F2F6FF 0%, #FFFFFF 45%, #F0FFF7 100%)",
      "cta_soft_blue": "linear-gradient(90deg, #23419A 0%, #1E3A8A 60%, #1E3A8A 100%)",
      "cta_soft_emerald": "linear-gradient(90deg, #06A77D 0%, #059669 60%, #059669 100%)"
    },
    "texture": {
      "noise_css": "background-image: url('data:image/svg+xml;utf8,<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"100\" height=\"100\"><filter id=\"n\"><feTurbulence type=\"fractalNoise\" baseFrequency=\"0.65\" numOctaves=\"2\" stitchTiles=\"stitch\"/></filter><rect width=\"100%\" height=\"100%\" filter=\"url(%23n)\" opacity=\"0.015\"/></svg>');"
    }
  },

  "typography": {
    "font_family": "Inter, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif",
    "scale": {
      "h1": "text-4xl sm:text-5xl lg:text-6xl",
      "h2": "text-base md:text-lg",
      "body": "text-base md:text-base",
      "small": "text-sm",
      "xs": "text-xs"
    },
    "weights": {"regular": 400, "medium": 500, "semibold": 600, "bold": 700},
    "tracking": {"tight": "-0.01em", "normal": "0", "wide": "0.02em"}
  },

  "tailwind_tokens_overrides": {
    "instructions": "Update :root tokens in /app/frontend/src/index.css to brand mapping below",
    "root_vars": {
      "--background": "0 0% 100%",
      "--foreground": "220 33% 6%",
      "--card": "210 40% 98%",
      "--card-foreground": "220 33% 6%",
      "--popover": "0 0% 100%",
      "--popover-foreground": "220 33% 6%",
      "--primary": "221 56% 33%", 
      "--primary-foreground": "0 0% 100%",
      "--secondary": "210 40% 98%",
      "--secondary-foreground": "220 33% 6%",
      "--muted": "210 28% 95%",
      "--muted-foreground": "220 10% 40%",
      "--accent": "158 85% 34%", 
      "--accent-foreground": "0 0% 100%",
      "--destructive": "0 72% 46%",
      "--destructive-foreground": "0 0% 100%",
      "--border": "214 32% 91%",
      "--input": "214 32% 91%",
      "--ring": "221 56% 33%",
      "--radius": "1rem"
    }
  },

  "layout": {
    "container": "mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8",
    "grid": {
      "hero": "grid grid-cols-1 lg:grid-cols-2 gap-8 items-center",
      "benefits": "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6",
      "actions": "grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4",
      "two_column_menu": {
        "wrapper": "grid grid-cols-1 lg:grid-cols-[280px,1fr] gap-8",
        "left_menu": "sticky top-20 self-start",
        "right_tiles": "grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4"
      },
      "cards": {
        "base": "bg-card rounded-2xl shadow-[var(--shadow-layer)] p-5 sm:p-6",
        "hover": "hover:shadow-[var(--shadow-elevated)] hover:-translate-y-0.5 transition-shadow duration-300 ease-out"
      }
    }
  },

  "css_custom_properties": {
    "definition": ":root{--shadow-1: 0 1px 2px rgba(16,24,40,.06); --shadow-2: 0 4px 10px rgba(16,24,40,.06); --shadow-layer: 0 1px 2px rgba(16,24,40,.04),0 6px 16px rgba(16,24,40,.06); --shadow-elevated: 0 8px 24px rgba(2,6,23,.08);} .noise-bg{ background: var(--hero-gradient); position: relative;} .noise-bg:after{content:''; position:absolute; inset:0; pointer-events:none; mix-blend: multiply; opacity:.05; background-image: radial-gradient(#0b1220 1px, transparent 1px); background-size: 3px 3px;} .ring-brand:focus{ outline: none; box-shadow: 0 0 0 4px rgba(30,58,138,.15);} .btn-gradient{ background: linear-gradient(90deg,#23419A, #1E3A8A); color:#fff;} .btn-gradient-emerald{ background: linear-gradient(90deg,#06A77D,#059669); color:#fff;}",
    "notes": "Attach .noise-bg to hero section. Use ring-brand for focus outlines."
  },

  "components": {
    "paths_note": "Use shadcn/ui components from /app/frontend/src/components/ui/*.jsx inside .js React files (no .tsx). Import with relative path from ./components/ui/[component].",
    "component_path": {
      "button": "./components/ui/button",
      "card": "./components/ui/card",
      "badge": "./components/ui/badge",
      "progress": "./components/ui/progress",
      "input": "./components/ui/input",
      "textarea": "./components/ui/textarea",
      "select": "./components/ui/select",
      "checkbox": "./components/ui/checkbox",
      "radio_group": "./components/ui/radio-group",
      "form": "./components/ui/form",
      "tabs": "./components/ui/tabs",
      "dialog": "./components/ui/dialog",
      "popover": "./components/ui/popover",
      "calendar": "./components/ui/calendar",
      "hover_card": "./components/ui/hover-card",
      "scroll_area": "./components/ui/scroll-area",
      "sonner": "./components/ui/sonner",
      "tooltip": "./components/ui/tooltip",
      "skeleton": "./components/ui/skeleton"
    },

    "Button": {
      "variants": {
        "primary": "btn-gradient rounded-[12px] shadow-[var(--shadow-layer)] hover:shadow-[var(--shadow-elevated)] focus-visible:ring-2 focus-visible:ring-[color:var(--ring)]",
        "secondary": "rounded-[12px] bg-primary/5 text-primary border border-primary/10 hover:bg-primary/10",
        "ghost": "rounded-[12px] bg-transparent text-primary hover:bg-primary/5",
        "success": "btn-gradient-emerald rounded-[12px] shadow-[var(--shadow-layer)]"
      },
      "sizes": {"sm": "px-3 py-2 text-sm", "md": "px-4 py-2.5", "lg": "px-5 py-3 text-base"},
      "rules": ["Do not use universal transitions; use transition-colors or transition-shadow only"],
      "testid": "data-testid='button-primary' (adjust per role, e.g., 'submit-button', 'next-step-button')"
    },

    "Card": {
      "base": "bg-card rounded-[16px] shadow-[var(--shadow-layer)] border border-border",
      "hover": "transition-shadow duration-300 hover:shadow-[var(--shadow-elevated)]",
      "usage": ["Benefits (3 cards)", "Action tiles (4 cards)", "Result summary"],
      "testid": "data-testid='info-card'"
    },

    "Stepper": {
      "note": "Compose with progress + tabs. Top horizontal stepper for forms; left vertical for category menu pages.",
      "structure": {
        "container": "w-full",
        "track": "h-2 bg-muted rounded-full overflow-hidden",
        "bar": "h-2 bg-[color:theme(colors.emerald.600)] transition-[width] duration-500",
        "dots": "flex items-center gap-2 mt-3"
      },
      "states": {"active": "text-primary", "completed": "text-emerald-600", "disabled": "text-gray-400"},
      "testids": {
        "progress": "data-testid='step-progress-bar'",
        "step_dot": "data-testid='step-dot-[index]'",
        "label": "data-testid='step-label-[index]'"
      }
    },

    "FormControls": {
      "inputs": "<Input className=\"rounded-[12px]\" data-testid=\"generic-input\" />",
      "select": "<Select data-testid=\"generic-select\" />",
      "checkbox": "<Checkbox data-testid=\"generic-checkbox\" />",
      "radio": "<RadioGroup data-testid=\"generic-radio-group\" />",
      "calendar": "Use shadcn Calendar for any date input; never use native HTML date picker",
      "validation_states": {
        "error": "border-rose-300 focus-visible:ring-rose-200 text-rose-700",
        "success": "border-emerald-300 focus-visible:ring-emerald-200 text-emerald-700"
      }
    },

    "Badges": {
      "soon": "<Badge variant='secondary' className='rounded-full bg-gray-100 text-gray-500 border border-gray-200' data-testid='soon-badge'>Скоро</Badge>",
      "status_success": "<Badge className='bg-emerald-50 text-emerald-700 border-emerald-200' data-testid='status-success'><CheckCircle size={14}/> Готово</Badge>",
      "status_error": "<Badge className='bg-rose-50 text-rose-700 border-rose-200' data-testid='status-error'><XCircle size={14}/> Ошибка</Badge>"
    },

    "Toasts": {
      "lib": "sonner",
      "path": "./components/ui/sonner",
      "example": "import { Toaster, toast } from './components/ui/sonner'; // in App.js place <Toaster position=\"top-right\" richColors />; toast.success('Отправлено');",
      "testid": "data-testid='toast-root'"
    },

    "Icons": {
      "pack": "lucide-react",
      "usage": "import { CheckCircle, XCircle, ChevronRight, Loader2, Phone, FileCheck } from 'lucide-react'",
      "stroke_width": 1.75
    }
  },

  "pages": {
    "Home": {
      "hero": {
        "layout": "py-14 sm:py-20 noise-bg",
        "content": [
          "Left: headline, subtext, primary and secondary CTAs",
          "Right: illustration area — subtle abstract Data Matrix squares (CSS or decorative image) with parallax"
        ],
        "headline_class": "font-semibold tracking-tight text-4xl sm:text-5xl lg:text-6xl text-primary",
        "subtext_class": "text-base md:text-lg text-slate-600 mt-4",
        "ctas": {
          "primary": "className='btn-gradient rounded-[12px] px-5 py-3' data-testid='hero-primary-cta'",
          "secondary": "className='rounded-[12px] bg-slate-100 text-primary px-5 py-3' data-testid='hero-secondary-cta'"
        }
      },
      "benefits_3_cards": "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-10",
      "actions_4_cards": "grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-8"
    },

    "Проверка товара": {
      "type": "3-step form",
      "components": ["Stepper", "FormControls", "Toasts"],
      "pattern": "Top stepper + compact form card; Next/Back fixed row",
      "cta_row": "sticky bottom-0 bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/60 border-t",
      "testids": {
        "next": "data-testid='check-product-next-button'",
        "back": "data-testid='check-product-back-button'",
        "submit": "data-testid='check-product-submit-button'"
      }
    },

    "Импорт товаров": {
      "type": "3-step form",
      "pattern": "Same as above; supports file upload area",
      "upload_area": "rounded-2xl border-2 border-dashed border-slate-200 hover:border-primary/30 p-6 text-center",
      "testids": {"upload": "data-testid='import-upload-dropzone'"}
    },

    "Оснащение производства": {
      "type": "4-step form",
      "pattern": "Equipment categories in left column (sticky), details on right tiles",
      "menu_left": "Use ScrollArea + list of buttons (secondary variant)",
      "tiles_right": "Card tiles with icons; some may show 'Скоро' badge (disabled)"
    },

    "Форма заявки": {
      "fields": ["Имя", "Телефон (+7 mask)", "Email", "Комментарий"],
      "validation": "Inline errors below fields; disable submit until valid",
      "testids": {
        "form": "data-testid='contact-form'",
        "submit": "data-testid='contact-form-submit-button'"
      }
    }
  },

  "micro_interactions": {
    "libraries": ["framer-motion"],
    "install": "npm i framer-motion react-input-mask",
    "button_hover": "transition-colors transition-shadow duration-300",
    "card_hover": "hover:shadow-[var(--shadow-elevated)] hover:-translate-y-0.5 transition-[box-shadow,transform] duration-300",
    "parallax_hero": {
      "concept": "Two decorative layers of subtle squares moving at different speeds on scroll",
      "snippet_js": "// HeroParallax.js (use in .js files)\nimport { motion, useScroll, useTransform } from 'framer-motion';\nexport const HeroParallax = () => {\n  const { scrollY } = useScroll();\n  const y1 = useTransform(scrollY, [0, 300], [0, -20]);\n  const y2 = useTransform(scrollY, [0, 300], [0, -40]);\n  return (\n    <div aria-hidden='true' className='absolute inset-0 overflow-hidden pointer-events-none'>\n      <motion.div style={{ y: y1 }} className='absolute -top-10 -right-10 w-72 h-72 rounded-2xl bg-primary/5' />\n      <motion.div style={{ y: y2 }} className='absolute top-24 -left-10 w-96 h-96 rounded-2xl bg-emerald-50' />\n    </div>\n  );\n};"
    }
  },

  "form_patterns": {
    "base_card": "max-w-3xl mx-auto bg-card rounded-[16px] p-6 shadow-[var(--shadow-layer)]",
    "row": "grid grid-cols-1 sm:grid-cols-2 gap-4",
    "actions_row": "flex items-center justify-between gap-3 pt-4",
    "next_prev": {
      "next": "<Button className='btn-gradient rounded-[12px]' data-testid='next-step-button'>Далее</Button>",
      "prev": "<Button variant='secondary' className='rounded-[12px]' data-testid='prev-step-button'>Назад</Button>"
    },
    "disabled_soon_button": "<Button disabled className='rounded-[12px] bg-slate-100 text-slate-400' data-testid='soon-button'>Скоро</Button>",
    "phone_mask": {
      "install": "npm i react-input-mask",
      "usage": "import InputMask from 'react-input-mask';\n<InputMask mask='+7 (999) 999-99-99' onChange={...}>\n  {(inputProps) => (<Input {...inputProps} data-testid='phone-input' className='rounded-[12px]' />)}\n</InputMask>"
    }
  },

  "result_indicators": {
    "success": "<div className='flex items-center gap-2 text-emerald-700' data-testid='result-success'><CheckCircle size={18}/> Соответствует</div>",
    "error": "<div className='flex items-center gap-2 text-rose-600' data-testid='result-error'><XCircle size={18}/> Несоответствие</div>"
  },

  "accessibility_testing": {
    "focus": "Use visible focus ring: outline-none ring-2 ring-offset-2 ring-[color:var(--ring)]",
    "contrast": "All text on white or #F8FAFC must meet WCAG AA. Primary on white is OK; verify emerald on white >=4.5:1",
    "keyboard": "All interactive elements must be reachable via Tab order; no tabindex='-1' unless justified",
    "reduced_motion": "Respect prefers-reduced-motion; disable parallax and long transitions",
    "data_testid_policy": {
      "rule": "Every interactive and key informational element MUST include data-testid using kebab-case describing role",
      "examples": [
        "data-testid='login-form-submit-button'",
        "data-testid='category-menu-link'",
        "data-testid='step-progress-bar'",
        "data-testid='user-balance-text'"
      ]
    }
  },

  "image_urls": [
    {
      "url": "https://images.unsplash.com/photo-1756756736901-a2bf24f2d2de?auto=format&fit=crop&w=1200&q=80",
      "category": "hero-decoration",
      "description": "Abstract horizontal line pattern; use as faint masked overlay at 8–10% opacity on hero right side"
    },
    {
      "url": "https://images.unsplash.com/photo-1756756737087-338ffff92906?auto=format&fit=crop&w=1200&q=80",
      "category": "section-accent",
      "description": "Teal/red abstract lines; crop small slice as accent in benefits section (do not dominate)"
    },
    {
      "url": "https://images.unsplash.com/photo-1764265992109-524e453c0e67?auto=format&fit=crop&w=1200&q=80",
      "category": "background-pattern",
      "description": "Green textured background; use 5% opacity clipped to rounded blob behind cards on large screens"
    }
  ],

  "code_scaffolds": {
    "hero_section": "// HomeHero.js\nimport React from 'react';\nimport { Button } from './components/ui/button';\nimport { HeroParallax } from './components/HeroParallax'; // from micro_interactions snippet\nexport default function HomeHero(){\n  return (\n    <section className='relative py-16 sm:py-24 noise-bg' style={{ background: 'linear-gradient(145deg, #F2F6FF 0%, #FFFFFF 45%, #F0FFF7 100%)' }}>\n      <div className='mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-2 gap-10 items-center'>\n        <div>\n          <h1 className='text-4xl sm:text-5xl lg:text-6xl font-semibold tracking-tight text-primary'>Про.Маркируй</h1>\n          <p className='mt-4 text-slate-600 text-base md:text-lg'>Помощник по маркировке товаров в Честный ЗНАК — понятные шаги и результат за 2 минуты.</p>\n          <div className='mt-8 flex gap-3'>\n            <Button className='btn-gradient rounded-[12px]' data-testid='hero-primary-cta'>Начать проверку</Button>\n            <Button className='rounded-[12px] bg-slate-100 text-primary' data-testid='hero-secondary-cta'>Импорт товаров</Button>\n          </div>\n        </div>\n        <div className='relative min-h-[260px] lg:min-h-[420px]'>\n          <HeroParallax />\n        </div>\n      </div>\n    </section>\n  );\n}",

    "stepper_compact": "// Stepper.js\nimport React from 'react';\nimport { Progress } from './components/ui/progress';\nexport const Stepper = ({ current, total }) => {\n  const value = Math.round((current / total) * 100);\n  return (\n    <div className='w-full' data-testid='step-progress-bar'>\n      <Progress value={value} className='h-2' />\n      <div className='flex items-center gap-2 mt-3'>\n        {Array.from({ length: total }).map((_, i) => (\n          <span key={i} data-testid={\`step-dot-${i+1}\`} className={\`h-2.5 w-2.5 rounded-full ${i+1 <= current ? 'bg-emerald-600' : 'bg-slate-200'}\`}></span>\n        ))}\n      </div>\n    </div>\n  );\n};",

    "multistep_form_shell": "// CheckProductForm.js\nimport React, { useState } from 'react';\nimport { Button } from './components/ui/button';\nimport { Input } from './components/ui/input';\nimport { Form, FormField, FormItem, FormLabel, FormMessage } from './components/ui/form';\nimport { Stepper } from './components/Stepper';\nexport default function CheckProductForm(){\n  const [step, setStep] = useState(1);\n  const total = 3;\n  return (\n    <div className='max-w-3xl mx-auto'>\n      <Stepper current={step} total={total} />\n      <div className='mt-6 bg-card rounded-[16px] p-6 shadow-[var(--shadow-layer)]'>\n        {step === 1 && (<div data-testid='step-1'>\n          <Form>\n            <FormField name='gtin' render={() => (\n              <FormItem>\n                <FormLabel>Код товара (GTIN)</FormLabel>\n                <Input data-testid='gtin-input' className='rounded-[12px]' placeholder='00000000000000'/>\n                <FormMessage />\n              </FormItem>\n            )} />\n          </Form>\n        </div>)}\n        {step === 2 && (<div data-testid='step-2'>Шаг 2 — детали</div>)}\n        {step === 3 && (<div data-testid='step-3'>Шаг 3 — подтверждение</div>)}\n        <div className='flex justify-between mt-6'>\n          <Button variant='secondary' className='rounded-[12px]' onClick={() => setStep(Math.max(1, step-1))} data-testid='check-product-back-button'>Назад</Button>\n          {step < total ? (\n            <Button className='btn-gradient rounded-[12px]' onClick={() => setStep(step+1)} data-testid='check-product-next-button'>Далее</Button>\n          ) : (\n            <Button className='btn-gradient-emerald rounded-[12px]' data-testid='check-product-submit-button'>Проверить</Button>\n          )}\n        </div>\n      </div>\n    </div>\n  );\n}"
  },

  "navigation_category_pattern": {
    "left_menu": "<aside className='sticky top-20 space-y-2' data-testid='category-menu'>...</aside>",
    "menu_item": "<button className='w-full text-left rounded-[12px] px-3 py-2 bg-primary/5 hover:bg-primary/10 transition-colors' data-testid='category-menu-item'>Категория</button>",
    "right_tiles": "<div className='grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4' data-testid='subcategory-tiles'>...</div>"
  },

  "installation": {
    "fonts": "Use Inter via Google Fonts or system stack already present",
    "icons": "npm i lucide-react",
    "motion_and_masks": "npm i framer-motion react-input-mask",
    "charts_optional": "npm i recharts (only if needed later)",
    "notes": "Use only components in ./components/ui for dropdowns, calendars, toasts, etc."
  },

  "accessibility_rules": [
    "Never center-align the entire app container; keep natural left alignment",
    "No transition: all; only property-specific transitions",
    "Maintain WCAG AA contrast for text/buttons",
    "Provide aria-labels for icons-only buttons",
    "Use role and aria-current for stepper where applicable"
  ],

  "instructions_to_main_agent": [
    "Implement pages in mobile-first order, then enhance for lg screens",
    "Use shadcn/ui components from ./components/ui/*.jsx in .js files",
    "Honor gradient restrictions; keep gradients in hero and CTAs only",
    "Add data-testid to all interactive and key informational elements",
    "Respect 16px (cards) and 12px (buttons/inputs) radii consistently",
    "Use emerald for success states and progress; deep blue for primary text and accents"
  ],

  "references_inspiration": {
    "stripe_style": "Stripe: premium minimalism, soft gradients, clear steppers",
    "tinkoff_style": "Tinkoff: bright accents, precise spacing, polished card hovers"
  },

  "general_ui_ux_design_guidelines": "- You must **not** apply universal transition. Eg: `transition: all`. This results in breaking transforms. Always add transitions for specific interactive elements like button, input excluding transforms\n- You must **not** center align the app container, ie do not add `.App { text-align: center; }` in the css file. This disrupts the human natural reading flow of text\n- NEVER: use AI assistant Emoji characters like`🤖🧠💭💡🔮🎯📚🎭🎬🎪🎉🎊🎁🎀🎂🍰🎈🎨🎰💰💵💳🏦💎🪙💸🤑📊📈📉💹🔢🏆🥇 etc for icons. Always use **FontAwesome cdn** or **lucid-react** library already installed in the package.json\n\n **GRADIENT RESTRICTION RULE**\nNEVER use dark/saturated gradient combos (e.g., purple/pink) on any UI element.  Prohibited gradients: blue-500 to purple 600, purple 500 to pink-500, green-500 to blue-500, red to pink etc\nNEVER use dark gradients for logo, testimonial, footer etc\nNEVER let gradients cover more than 20% of the viewport.\nNEVER apply gradients to text-heavy content or reading areas.\nNEVER use gradients on small UI elements (<100px width).\nNEVER stack multiple gradient layers in the same viewport.\n\n**ENFORCEMENT RULE:**\n    • Id gradient area exceeds 20% of viewport OR affects readability, **THEN** use solid colors\n\n**How and where to use:**\n   • Section backgrounds (not content backgrounds)\n   • Hero section header content. Eg: dark to light to dark color\n   • Decorative overlays and accent elements only\n   • Hero section with 2-3 mild color\n   • Gradients creation can be done for any angle say horizontal, vertical or diagonal\n\n- For AI chat, voice application, **do not use purple color. Use color like light green, ocean blue, peach orange etc**\n\n</Font Guidelines>\n\n- Every interaction needs micro-animations - hover states, transitions, parallax effects, and entrance animations. Static = dead. \n   \n- Use 2-3x more spacing than feels comfortable. Cramped designs look cheap.\n\n- Subtle grain textures, noise overlays, custom cursors, selection states, and loading animations: separates good from extraordinary.\n   \n- Before generating UI, infer the visual style from the problem statement (palette, contrast, mood, motion) and immediately instantiate it by setting global design tokens (primary, secondary/accent, background, foreground, ring, state colors), rather than relying on any library defaults. Don't make the background dark as a default step, always understand problem first and define colors accordingly\n    Eg: - if it implies playful/energetic, choose a colorful scheme\n           - if it implies monochrome/minimal, choose a black–white/neutral scheme\n\n**Component Reuse:**\n\t- Prioritize using pre-existing components from src/components/ui when applicable\n\t- Create new components that match the style and conventions of existing components when needed\n\t- Examine existing components to understand the project's component patterns before creating new ones\n\n**IMPORTANT**: Do not use HTML based component like dropdown, calendar, toast etc. You **MUST** always use `/app/frontend/src/components/ui/ ` only as a primary components as these are modern and stylish component\n\n**Best Practices:**\n\t- Use Shadcn/UI as the primary component library for consistency and accessibility\n\t- Import path: ./components/[component-name]\n\n**Export Conventions:**\n\t- Components MUST use named exports (export const ComponentName = ...)\n\t- Pages MUST use default exports (export default function PageName() {...})\n\n**Toasts:**\n  - Use `sonner` for toasts\"\n  - Sonner component are located in `/app/src/components/ui/sonner.tsx`\n\nUse 2–4 color gradients, subtle textures/noise overlays, or CSS-based noise to avoid flat visuals."
}
