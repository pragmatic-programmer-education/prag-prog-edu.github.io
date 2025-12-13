document.addEventListener('DOMContentLoaded', function () {
    // 1. ИНИЦИАЛИЗАЦИЯ TELEGRAM
    initializeTelegramWebApp();

    // 2. НАСТРОЙКА ПЕРЕКЛЮЧЕНИЯ ВКЛАДОК
    setupTabSwitching();

    // 3. НАСТРОЙКА СПЕЦИАЛЬНЫХ КНОПОК
    setupSpecialButtons();

    // 4. ОТЛАДКА
    logDebugInfo();
});

/**
 * Инициализация Telegram WebApp
 */
function initializeTelegramWebApp() {
    if (window.Telegram && Telegram.WebApp) {
        Telegram.WebApp.ready();
        Telegram.WebApp.expand();

        console.log('✅ TMA инициализирована. Тема:', Telegram.WebApp.themeParams);

        // Если хотите использовать тему Telegram (опционально)
        applyTelegramTheme();
    } else {
        console.log('⚠️ Запущено вне Telegram. Используются стандартные цвета.');
    }
}

/**
 * Применение темы Telegram (если доступна)
 */
function applyTelegramTheme() {
    const theme = Telegram.WebApp.themeParams;
    if (theme && theme.bg_color && theme.text_color) {
        document.body.style.backgroundColor = theme.bg_color;
        document.body.style.color = theme.text_color;

        // Обновляем цвета текста для всех элементов
        const textElements = document.querySelectorAll(
            'h1, h2, h3, h4, h5, h6, p, span, div, a, button, .tab, .logo-title, .logo-subtitle, .course-title, .contact-text'
        );

        textElements.forEach(el => {
            el.style.color = theme.text_color;
        });
    }
}

/**
 * Настройка переключения вкладок
 */
function setupTabSwitching() {
    const tabs = document.querySelectorAll('.tab');
    const tabContents = document.querySelectorAll('.tab-content');

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const tabId = tab.getAttribute('data-tab');

            // Снимаем активность со всех
            tabs.forEach(t => t.classList.remove('active'));
            tabContents.forEach(content => content.classList.remove('active'));

            // Добавляем активность выбранной
            tab.classList.add('active');
            document.getElementById(tabId).classList.add('active');

            // Тактильная отдача в Telegram
            triggerHapticFeedback('light');

            console.log('🔘 Переключено на вкладку:', tabId);
        });
    });
}

/**
 * Настройка специальных кнопок
 */
function setupSpecialButtons() {
    // Кнопка "Список курсов"
    const coursesBtn = document.getElementById('courses-btn');
    if (coursesBtn) {
        coursesBtn.addEventListener('click', function (e) {
            e.preventDefault(); // Отменяем переход по ссылке
            switchToTab('courses');
            triggerHapticFeedback('medium');
        });
    }

    // Кнопка "Получить сертификат" (дополнительная логика при необходимости)
    const certificateBtn = document.getElementById('certificate-btn');
    if (certificateBtn && window.Telegram && Telegram.WebApp) {
        certificateBtn.addEventListener('click', function () {
            // Можно отправить данные в бота
            Telegram.WebApp.sendData(JSON.stringify({
                action: 'get_certificate',
                timestamp: new Date().getTime()
            }));
            triggerHapticFeedback('medium');
        });
    }
}

/**
 * Переключение на конкретную вкладку
 * @param {string} tabId - ID вкладки ('home', 'courses', 'contacts')
 */
function switchToTab(tabId) {
    const tab = document.querySelector(`[data-tab="${tabId}"]`);
    const content = document.getElementById(tabId);

    if (tab && content) {
        // Снимаем активность со всех
        document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));

        // Активируем нужную вкладку
        tab.classList.add('active');
        content.classList.add('active');

        console.log(`✅ Переключено на вкладку "${tabId}" программно`);
        return true;
    }

    console.error(`❌ Вкладка "${tabId}" не найдена`);
    return false;
}

/**
 * Тактильная отдача (вибрация)
 * @param {string} type - Тип вибрации: 'light', 'medium', 'heavy', 'selection'
 */
function triggerHapticFeedback(type = 'light') {
    if (window.Telegram && Telegram.WebApp && Telegram.WebApp.HapticFeedback) {
        try {
            if (type === 'selection') {
                Telegram.WebApp.HapticFeedback.selectionChanged();
            } else {
                Telegram.WebApp.HapticFeedback.impactOccurred(type);
            }
        } catch (error) {
            console.log('⚠️ Тактильная отдача недоступна:', error.message);
        }
    }
}

/**
 * Логирование отладочной информации
 */
function logDebugInfo() {
    console.log('📱 Ширина экрана:', window.innerWidth, 'px');
    console.log('📊 Карточек курсов:', document.querySelectorAll('.course-card').length);
    console.log('🎨 Загружено стилей:', document.styleSheets.length);

    // Проверяем, помещаются ли 2 колонки
    const container = document.querySelector('.container');
    if (container) {
        const containerWidth = container.offsetWidth;
        const cardWidth = 140; // минимальная ширина карточки
        const gap = 10;

        if (containerWidth < (cardWidth * 2 + gap * 3)) {
            console.log('⚠️ Внимание: экран слишком узкий для 2 колонок');
        } else {
            console.log('✅ Экран достаточно широк для 2 колонок');
        }
    }
}

/**
 * Вспомогательная функция для отправки данных в бота
 */
function sendToBot(action, data = {}) {
    if (window.Telegram && Telegram.WebApp) {
        const message = {
            action: action,
            timestamp: new Date().getTime(),
            ...data
        };

        Telegram.WebApp.sendData(JSON.stringify(message));
        console.log('📤 Отправлено боту:', message);
        return true;
    }
    return false;
}