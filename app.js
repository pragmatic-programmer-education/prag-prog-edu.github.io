document.addEventListener('DOMContentLoaded', function () {
    // Apply UTM tag to all links and data-href before other initialization
    addUtmToAllLinks('utm_source=pp_tma');

    // 1. ИНИЦИАЛИЗАЦИЯ TELEGRAM
    initializeTelegramWebApp();

    // 2. НАСТРОЙКА ПЕРЕКЛЮЧЕНИЯ ВКЛАДОК
    setupTabSwitching();

    // 3. НАСТРОЙКА СПЕЦИАЛЬНЫХ КНОПОК
    setupSpecialButtons();

    // 4. Настройка сворачиваемых групп курсов
    setupGroupCollapsibles();

    // 5. Сделать карточки курсоv кликабельными
    setupCourseCardLinks();

    // 5.1 Добавить анимацию hover/leave для кнопок действий в карточках
    setupCourseLinkHoverAnimations();

    // 6. ОТЛАДКА
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
 * Настройка сворачиваемых секций групп курсов
 * - первая группа остаётся развернутой
 * - остальные по умолчанию свернуты (в HTML уже отмечены классом collapsed)
 */
function setupGroupCollapsibles() {
    const groups = document.querySelectorAll('.course-group');

    groups.forEach(group => {
        const toggle = group.querySelector('.group-toggle');
        if (!toggle) return;

        // Ensure correct aria-expanded initial state from class
        const isCollapsed = group.classList.contains('collapsed');
        toggle.setAttribute('aria-expanded', String(!isCollapsed));

        // Click handler
        toggle.addEventListener('click', (e) => {
            e.preventDefault();
            const currentlyCollapsed = group.classList.contains('collapsed');

            if (currentlyCollapsed) {
                group.classList.remove('collapsed');
                toggle.setAttribute('aria-expanded', 'true');
            } else {
                group.classList.add('collapsed');
                toggle.setAttribute('aria-expanded', 'false');
            }

            triggerHapticFeedback('light');
        });

        // Allow keyboard accessibility (Enter / Space)
        toggle.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                toggle.click();
            }
        });
    });
}

/**
 * Сделать всю карточку курсa кликабельной: при клике на карточку происходит переход
 * на URL из пустой вложенной ссылки с классом `course-card-link`.
 * Внутренние ссылки в `.course-links` не будут инициировать переход карточки.
 */
function setupCourseCardLinks() {
    const cards = document.querySelectorAll('.course-card');

    cards.forEach(card => {
        // Support both legacy empty anchor inside card OR data attributes on the card
        const innerLink = card.querySelector('.course-card-link');
        const href = card.dataset.href || (innerLink && innerLink.getAttribute('href')) || null;
        const target = card.dataset.target || (innerLink && innerLink.getAttribute('target')) || '_self';

        if (!href) return; // nothing to do if no url available

        // Accessibility: make card focusable and announce as link
        card.setAttribute('role', 'link');
        card.setAttribute('tabindex', '0');
        card.style.cursor = 'pointer';

        // Click on card -> navigate, unless user clicked a nested actionable element
        card.addEventListener('click', (e) => {
            // If clicked an inner link (info/discount) or button, don't navigate the card
            if (e.target.closest('.course-links') || e.target.closest('a.course-link') || e.target.closest('button')) return;

            if (href === '#') {
                // No meaningful URL configured — do nothing
                return;
            }

            // Use window.open to respect target (_blank etc.)
            try {
                window.open(href, target);
            } catch (err) {
                // Fallback to location change
                if (target === '_self') window.location.href = href;
            }
        });

        // Keyboard support: Enter / Space
        card.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                card.click();
            }
        });
    });

    // Ensure clicks on the small action links don't bubble to the card
    document.querySelectorAll('.course-links .course-link').forEach(a => {
        a.addEventListener('click', (e) => {
            e.stopPropagation();
            // allow normal anchor behavior to continue
        });
    });
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

// Add UTM helper functions and apply them early
function appendUtmToUrl(url, utmParam) {
    if (!url) return url;
    // skip anchors, mailto, javascript
    if (/^(#|mailto:|javascript:)/i.test(url)) return url;
    // skip if already has utm_source
    if (/utm_source=/i.test(url)) return url;

    var sep = url.indexOf('?') !== -1 ? '&' : '?';
    return url + sep + utmParam;
}

function addUtmToAllLinks(utmParam) {
    try {
        var anchors = document.querySelectorAll('a[href]');
        anchors.forEach(function (a) {
            var href = a.getAttribute('href');
            var newHref = appendUtmToUrl(href, utmParam);
            if (newHref !== href) a.setAttribute('href', newHref);
        });

        var dataHrefEls = document.querySelectorAll('[data-href]');
        dataHrefEls.forEach(function (el) {
            var dh = el.getAttribute('data-href');
            var newDh = appendUtmToUrl(dh, utmParam);
            if (newDh !== dh) el.setAttribute('data-href', newDh);
        });
    } catch (e) {
        console.warn('UTM: failed to append UTM to links', e);
    }
}

function setupCourseLinkHoverAnimations() {
    const links = document.querySelectorAll('.course-link');
    links.forEach(link => {
        // Mouse enter / leave
        link.addEventListener('mouseenter', () => {
            link.classList.add('is-hovered');
            link.classList.remove('is-leaving');
        });
        link.addEventListener('mouseleave', () => {
            link.classList.remove('is-hovered');
            link.classList.add('is-leaving');
            // remove leaving state after transition completes
            setTimeout(() => link.classList.remove('is-leaving'), 260);
        });

        // Keyboard accessibility: focus / blur
        link.addEventListener('focus', () => {
            link.classList.add('is-hovered');
            link.classList.remove('is-leaving');
        });
        link.addEventListener('blur', () => {
            link.classList.remove('is-hovered');
            link.classList.add('is-leaving');
            setTimeout(() => link.classList.remove('is-leaving'), 260);
        });

        // Touch devices: simulate quick hover on touchstart
        link.addEventListener('touchstart', () => {
            link.classList.add('is-hovered');
        }, { passive: true });
        link.addEventListener('touchend', () => {
            link.classList.remove('is-hovered');
        }, { passive: true });
    });
}