#!/bin/bash

# =============================================================================
# PRE-DEPLOY VALIDATION SCRIPT
# Запускай перед каждым деплоем: ./scripts/pre-deploy-check.sh
# =============================================================================

set -e
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

PROJECT_ROOT="/var/www/promarkirui"
FRONTEND="$PROJECT_ROOT/frontend"
ERRORS=0

echo ""
echo "========================================="
echo "  PRE-DEPLOY VALIDATION"
echo "========================================="
echo ""

# -----------------------------------------------------------------------------
# 1. ПРОВЕРКА ДУБЛИКАТОВ ПАПОК
# -----------------------------------------------------------------------------
echo -e "${YELLOW}[1/6] Проверка дубликатов папок...${NC}"

DUPLICATES=$(find $PROJECT_ROOT -maxdepth 2 -type d \( -name '*_new' -o -name '*_old' -o -name '*_backup' -o -name '*_copy' -o -name 'frontend[0-9]*' -o -name 'backend[0-9]*' \) 2>/dev/null | grep -v node_modules || true)

if [ -n "$DUPLICATES" ]; then
    echo -e "${RED}ОШИБКА: Найдены дубликаты папок:${NC}"
    echo "$DUPLICATES"
    ERRORS=$((ERRORS + 1))
else
    echo -e "${GREEN}✓ Дубликатов нет${NC}"
fi

# -----------------------------------------------------------------------------
# 2. ПРОВЕРКА ИМПОРТОВ В App.js
# -----------------------------------------------------------------------------
echo ""
echo -e "${YELLOW}[2/6] Проверка импортов в App.js...${NC}"

# Извлекаем все импорты из App.js
IMPORTS=$(grep -oP "from '\./\K[^']+" $FRONTEND/src/App.js | sed "s/';.*//")

MISSING_FILES=0
for IMPORT in $IMPORTS; do
    FILE_PATH="$FRONTEND/src/${IMPORT}"

    # Проверяем .js, .jsx и без расширения
    if [ ! -f "${FILE_PATH}.js" ] && [ ! -f "${FILE_PATH}.jsx" ] && [ ! -f "${FILE_PATH}/index.js" ] && [ ! -f "${FILE_PATH}/index.jsx" ] && [ ! -f "$FILE_PATH" ]; then
        echo -e "${RED}  ✗ Не найден: $IMPORT${NC}"
        MISSING_FILES=$((MISSING_FILES + 1))
    fi
done

if [ $MISSING_FILES -eq 0 ]; then
    echo -e "${GREEN}✓ Все импорты существуют${NC}"
else
    echo -e "${RED}Найдено отсутствующих файлов: $MISSING_FILES${NC}"
    ERRORS=$((ERRORS + 1))
fi

# -----------------------------------------------------------------------------
# 3. ПРОВЕРКА КРИТИЧЕСКИХ КОМПОНЕНТОВ
# -----------------------------------------------------------------------------
echo ""
echo -e "${YELLOW}[3/6] Проверка критических компонентов...${NC}"

CRITICAL_FILES=(
    "pages/employee/EmployeeEducation.js"
    "pages/employee/EmployeeTasks.js"
    "pages/partner/PartnerEducation.js"
    "pages/partner/PartnerCourseView.js"
    "pages/partner/PartnerChapterView.js"
    "pages/admin/AdminEducation.js"
    "components/notifications/NotificationCenter.js"
    "components/search/GlobalSearch.js"
    "components/employee/EmployeeLayout.js"
)

MISSING_CRITICAL=0
for FILE in "${CRITICAL_FILES[@]}"; do
    if [ ! -f "$FRONTEND/src/$FILE" ]; then
        echo -e "${RED}  ✗ КРИТИЧЕСКИЙ: $FILE${NC}"
        MISSING_CRITICAL=$((MISSING_CRITICAL + 1))
    else
        echo -e "${GREEN}  ✓ $FILE${NC}"
    fi
done

if [ $MISSING_CRITICAL -gt 0 ]; then
    ERRORS=$((ERRORS + 1))
fi

# -----------------------------------------------------------------------------
# 4. ПРОВЕРКА КОНТЕКСТОВ
# -----------------------------------------------------------------------------
echo ""
echo -e "${YELLOW}[4/6] Проверка контекстов...${NC}"

CONTEXT_FILES=(
    "context/AuthContext.js"
    "context/AdminAuthContext.js"
    "context/EmployeeAuthContext.js"
    "context/PartnerAuthContext.js"
)

for FILE in "${CONTEXT_FILES[@]}"; do
    if [ ! -f "$FRONTEND/src/$FILE" ]; then
        echo -e "${RED}  ✗ $FILE${NC}"
        ERRORS=$((ERRORS + 1))
    else
        echo -e "${GREEN}  ✓ $FILE${NC}"
    fi
done

# -----------------------------------------------------------------------------
# 5. ПРОВЕРКА РОУТОВ В App.js
# -----------------------------------------------------------------------------
echo ""
echo -e "${YELLOW}[5/6] Проверка роутов...${NC}"

REQUIRED_ROUTES=(
    "/employee/education"
    "/employee/tasks"
    "/partner/education"
    "/admin/education"
)

for ROUTE in "${REQUIRED_ROUTES[@]}"; do
    if ! grep -q "path=\"$ROUTE\"" $FRONTEND/src/App.js; then
        echo -e "${RED}  ✗ Роут отсутствует: $ROUTE${NC}"
        ERRORS=$((ERRORS + 1))
    else
        echo -e "${GREEN}  ✓ $ROUTE${NC}"
    fi
done

# -----------------------------------------------------------------------------
# 6. ТЕСТОВЫЙ BUILD
# -----------------------------------------------------------------------------
echo ""
echo -e "${YELLOW}[6/6] Тестовый build...${NC}"

cd $FRONTEND
if npm run build > /tmp/build.log 2>&1; then
    echo -e "${GREEN}✓ Build успешен${NC}"
else
    echo -e "${RED}✗ Build FAILED! Смотри /tmp/build.log${NC}"
    tail -20 /tmp/build.log
    ERRORS=$((ERRORS + 1))
fi

# -----------------------------------------------------------------------------
# ИТОГ
# -----------------------------------------------------------------------------
echo ""
echo "========================================="
if [ $ERRORS -eq 0 ]; then
    echo -e "${GREEN}  ВСЕ ПРОВЕРКИ ПРОЙДЕНЫ ✓${NC}"
    echo "  Можно деплоить!"
else
    echo -e "${RED}  НАЙДЕНО ОШИБОК: $ERRORS${NC}"
    echo "  НЕ ДЕПЛОЙ пока не исправишь!"
fi
echo "========================================="
echo ""

exit $ERRORS
