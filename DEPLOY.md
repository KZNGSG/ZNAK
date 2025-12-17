# Инструкция по деплою promarkirui.ru

## Перед деплоем ОБЯЗАТЕЛЬНО

### 1. Запусти проверку
```bash
cd /var/www/promarkirui
./scripts/pre-deploy-check.sh
```

Скрипт проверяет:
- Нет дубликатов папок (frontend_new, *_old, *_backup)
- Все импорты в App.js существуют
- Критические компоненты на месте
- Все контексты существуют
- Все роуты прописаны
- Build проходит успешно

**НЕ ДЕПЛОЙ если скрипт показывает ошибки!**

### 2. Git status
```bash
git status
```
Убедись что:
- Нет случайных файлов
- Нет папок *_new, *_old, *_backup

### 3. Проверь изменения
```bash
git diff
```
Посмотри что именно меняется.

---

## Процесс деплоя

### Стандартный деплой (frontend)
```bash
cd /var/www/promarkirui/frontend
npm run build
sudo systemctl restart nginx
```

### С обновлением зависимостей
```bash
cd /var/www/promarkirui/frontend
npm install
npm run build
sudo systemctl restart nginx
```

### Backend
```bash
cd /var/www/promarkirui/backend
pip install -r requirements.txt
sudo systemctl restart promarkirui-backend
```

---

## После деплоя ОБЯЗАТЕЛЬНО

### Чеклист проверки:

#### Публичный сайт
- [ ] Главная страница открывается
- [ ] База знаний работает (есть статьи)
- [ ] Форма заявки работает

#### Панель сотрудника (/employee)
- [ ] Логин работает
- [ ] Дашборд открывается
- [ ] Пункт "Обучение" в меню есть
- [ ] Пункт "Задачи" в меню есть
- [ ] Уведомления работают (колокольчик)
- [ ] Поиск работает

#### Панель партнёра (/partner)
- [ ] Логин работает
- [ ] Дашборд открывается
- [ ] Пункт "Обучение" в меню есть

#### Админка (/admin)
- [ ] Логин работает
- [ ] Пункт "Обучение" в меню есть

---

## Если что-то сломалось

### Откат к предыдущей версии
```bash
cd /var/www/promarkirui
git log --oneline -10  # найди нужный коммит
git checkout <commit_hash> -- frontend/  # откати frontend
cd frontend && npm run build
sudo systemctl restart nginx
```

### Проверка логов
```bash
# Nginx
sudo tail -f /var/log/nginx/error.log

# Backend
sudo journalctl -u promarkirui-backend -f
```

---

## Важные правила

1. **НИКОГДА** не создавай папки frontend_new, backend_new и т.п.
2. **ВСЕГДА** работай в основной папке frontend/
3. **ВСЕГДА** запускай pre-deploy-check.sh перед деплоем
4. **ВСЕГДА** проверяй чеклист после деплоя
5. **НИКОГДА** не деплой в пятницу вечером

---

## Структура проекта

```
/var/www/promarkirui/
├── frontend/           # React приложение
│   ├── src/
│   │   ├── App.js      # Главный файл с роутами
│   │   ├── components/ # Компоненты
│   │   ├── pages/      # Страницы
│   │   └── context/    # Контексты авторизации
│   ├── build/          # Собранное приложение
│   └── package.json
├── backend/            # Python FastAPI
├── scripts/
│   └── pre-deploy-check.sh  # Скрипт проверки
└── .git/
    └── hooks/
        └── pre-commit  # Автопроверка при коммите
```

---

## Критические файлы (не удалять!)

### Frontend
- `src/App.js` - все роуты
- `src/pages/employee/EmployeeEducation.js`
- `src/pages/employee/EmployeeTasks.js`
- `src/components/employee/EmployeeLayout.js`
- `src/components/notifications/NotificationCenter.js`
- `src/components/search/GlobalSearch.js`
- `src/pages/partner/PartnerEducation.js`
- `src/pages/admin/AdminEducation.js`

### Контексты
- `src/context/AuthContext.js`
- `src/context/AdminAuthContext.js`
- `src/context/EmployeeAuthContext.js`
- `src/context/PartnerAuthContext.js`
