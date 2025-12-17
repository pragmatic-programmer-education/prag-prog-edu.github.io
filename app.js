'use strict';

/*
  Настройки (включите опцию, если хотите сохранять состояние alert между перезагрузками)
*/
const PERSIST_ALERT_DISMISS = false;
const ALERT_STORAGE_KEY = 'stepik_alert_hidden';

/* Debounce helper */
function debounce(fn, wait = 200) {
    let t;
    return function (...args) {
        clearTimeout(t);
        t = setTimeout(() => fn.apply(this, args), wait);
    };
}

document.addEventListener('DOMContentLoaded', function () {
    // Apply UTM tag to all links and data-href before other initialization
    addUtmToAllLinks('utm_source=pp_tma');

    // mark free courses
    markFreeCourses();

    // 1. ИНИЦИАЛИЗАЦИЯ TELEGRAM
    initializeTelegramWebApp();

    // 1.1 Скрыть alert, если пользователь уже закрыл его в этой сессии (опционально)
    restoreStepikAlertState();

    // 2. НАСТРОЙКА ПЕРЕКЛЮЧЕНИЯ ВКЛАДОК
    setupTabSwitching();

    // 3. НАСТРОЙКА СПЕЦИАЛЬНЫХ КНОПОК
    setupSpecialButtons();

    // 4. Настройка сворачиваемых групп курсов
    setupGroupCollapsibles();

    // 5. Сделать карточки курсоv кликабельными (event delegation)
    setupCourseCardLinks();

    // 5.1 Анимации hover/leave для кнопок действий в карточках
    setupCourseLinkHoverAnimations();

    // 6. ОТЛАДКА (поставлен обработчик resize с debounce)
    logDebugInfo();
    window.addEventListener('resize', debounce(logDebugInfo, 250));
});

/**
 * Сохраняем/восстанавливаем состояние alert (опционально в storage)
 */
function restoreStepikAlertState() {
    const alertEl = document.getElementById('stepik-alert');
    const closeBtn = document.getElementById('stepik-alert-close');
    if (!alertEl || !closeBtn) return;

    // Restore persisted state if enabled
    if (PERSIST_ALERT_DISMISS) {
        const hidden = sessionStorage.getItem(ALERT_STORAGE_KEY) === '1';
        if (hidden) {
            alertEl.classList.add('hidden');
        } else {
            alertEl.classList.remove('hidden');
        }
    } else {
        alertEl.classList.remove('hidden');
    }

    closeBtn.addEventListener('click', function (e) {
        e.preventDefault();
        alertEl.classList.add('hidden');
        if (PERSIST_ALERT_DISMISS) {
            sessionStorage.setItem(ALERT_STORAGE_KEY, '1');
        }
    });
}

/**
 * Инициализация Telegram WebApp
 * - безопасные вызовы в try/catch
 * - регистрация обработчиков theme/viewport/mainButton (если доступны)
 * - установка CSS-переменных вместо инлайновых стилей
 */
function initializeTelegramWebApp() {
    if (window.Telegram && Telegram.WebApp) {
        try {
            Telegram.WebApp.ready();

            // Try to expand but ignore if not allowed
            try { Telegram.WebApp.expand(); } catch (_) {}

            console.log('✅ TMA инициализирована. Тема:', Telegram.WebApp.themeParams);

            applyTelegramTheme(); // применяем сразу, если есть тема
            setupMainButton();     // инициализация MainButton

            // Подпишемся на изменения темы/кнопки, если API поддерживает onEvent
            if (typeof Telegram.WebApp.onEvent === 'function') {
                try {
                    Telegram.WebApp.onEvent('themeChanged', applyTelegramTheme);
                    Telegram.WebApp.onEvent('mainButtonClicked', () => {
                        // Пример: отправляем событие в бота
                        sendToBot('main_button_clicked');
                    });
                } catch (e) {
                    // не критично — просто логируем
                    console.debug('Telegram: onEvent subscribe failed', e.message);
                }
            }
        } catch (e) {
            console.warn('Telegram WebApp initialization failed:', e.message);
        }
    } else {
        console.log('⚠️ Запущено вне Telegram. Используются стандартные цвета.');
    }
}

/**
 * Применение темы Telegram через CSS-переменные (меньше перерисовок)
 */
function applyTelegramTheme() {
    if (!(window.Telegram && Telegram.WebApp && Telegram.WebApp.themeParams)) return;

    const theme = Telegram.WebApp.themeParams;
    const root = document.documentElement;

    if (theme.bg_color) root.style.setProperty('--app-bg-color', theme.bg_color);
    if (theme.text_color) root.style.setProperty('--app-text-color', theme.text_color);

    // Дополнительно можно установить button/bg цветов, если есть в theme
    if (theme.button_color) root.style.setProperty('--button-bg', theme.button_color);
    if (theme.button_text_color) root.style.setProperty('--button-color', theme.button_text_color);
}

/**
 * Настройка переключения вкладок (всё как было, но фокус на доступность)
 */
function setupTabSwitching() {
    const tabs = document.querySelectorAll('.tab');
    const tabContents = document.querySelectorAll('.tab-content');

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const tabId = tab.getAttribute('data-tab');

            tabs.forEach(t => t.classList.remove('active'));
            tabContents.forEach(content => content.classList.remove('active'));

            tab.classList.add('active');
            const contentEl = document.getElementById(tabId);
            if (contentEl) {
                contentEl.classList.add('active');
                // Move focus to first focusable element in content for screen-readers
                const focusable = contentEl.querySelector('a, button, [tabindex]:not([tabindex="-1"])');
                if (focusable) focusable.focus();
            }

            triggerHapticFeedback('light');
            console.log('🔘 Переключено на вкладку:', tabId);
        });
    });
}

/**
 * Настройка специальных кнопок
 */
function setupSpecialButtons() {
    const coursesBtn = document.getElementById('courses-btn');
    if (coursesBtn) {
        coursesBtn.addEventListener('click', function (e) {
            e.preventDefault();
            switchToTab('courses');
            triggerHapticFeedback('medium');
        });
    }

    const certificateBtn = document.getElementById('certificate-btn');
    if (certificateBtn && window.Telegram && Telegram.WebApp) {
        certificateBtn.addEventListener('click', function (e) {
            e.preventDefault();
            // Use sendToBot wrapper
            sendToBot('get_certificate');
            triggerHapticFeedback('medium');
        });
    }
}

/**
 * Collapsibles (как раньше — доступность + aria)
 */
function setupGroupCollapsibles() {
    const groups = document.querySelectorAll('.course-group');

    groups.forEach(group => {
        const toggle = group.querySelector('.group-toggle');
        if (!toggle) return;

        const isCollapsed = group.classList.contains('collapsed');
        toggle.setAttribute('aria-expanded', String(!isCollapsed));

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

        toggle.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                toggle.click();
            }
        });
    });
}

/**
 * Сделать карточки кликабельными — теперь через делегирование событий для лучшей производительности
 * Для фокусируемости мы всё ещё проставляем role/tabindex на карточках при загрузке.
 */
function setupCourseCardLinks() {
    const container = document.querySelector('.container') || document.body;
    const cards = document.querySelectorAll('.course-card');

    cards.forEach(card => {
        card.setAttribute('role', 'link');
        if (!card.hasAttribute('tabindex')) card.setAttribute('tabindex', '0');
        card.style.cursor = 'pointer';
    });

    // Делегируем клики
    container.addEventListener('click', (e) => {
        const card = e.target.closest('.course-card');
        if (!card) return;

        // If clicked an inner actionable element, do nothing
        if (e.target.closest('.course-links') || e.target.closest('a.course-link') || e.target.closest('button')) return;

        const innerLink = card.querySelector('.course-card-link');
        const href = card.dataset.href || (innerLink && innerLink.getAttribute('href')) || null;
        const target = card.dataset.target || (innerLink && innerLink.getAttribute('target')) || '_self';

        if (!href || href === '#') return;

        // respect target _blank safety
        try {
            window.open(href, target);
        } catch (err) {
            if (target === '_self') window.location.href = href;
        }
    });

    // Keyboard support via delegation: Enter / Space triggers click on card
    container.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
            const card = e.target.closest('.course-card');
            if (card) {
                e.preventDefault();
                card.click();
            }
        }
    });

    // Prevent bubbling for small action links
    document.querySelectorAll('.course-links .course-link').forEach(a => {
        a.addEventListener('click', (e) => {
            e.stopPropagation();
            // ensure external links opened safely
            if (a.target === '_blank' && !a.rel.includes('noopener')) {
                a.rel = (a.rel ? a.rel + ' ' : '') + 'noopener noreferrer';
            }
        }, { passive: true });
    });
}

/**
 * Тактильная отдача (вибрация)
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
            console.debug('⚠️ Тактильная отдача недоступна:', error.message);
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

    const container = document.querySelector('.container');
    if (container) {
        const containerWidth = container.offsetWidth;
        const cardWidth = 140;
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
            timestamp: Date.now(),
            ...data
        };

        try {
            Telegram.WebApp.sendData(JSON.stringify(message));
            console.log('📤 Отправлено боту:', message);
            return true;
        } catch (e) {
            console.warn('Telegram sendData failed', e.message);
            return false;
        }
    }
    return false;
}

/**
 * UTM helpers — теперь с URL API и безопасной обработкой относительных URL
 */
function appendUtmToUrl(url, utmParam) {
    if (!url) return url;
    if (/^(#|mailto:|javascript:)/i.test(url)) return url;
    if (/utm_source=/i.test(url)) return url;

    try {
        // Use URL with base to support relative URLs
        const full = new URL(url, location.href);
        // add each param if not present
        const [key, value] = utmParam.split('=');
        if (!full.searchParams.has(key)) {
            full.searchParams.append(key, value);
        }
        // Preserve relative form if original was relative
        if (/^[./]/.test(url)) {
            // return path + search + hash
            return full.pathname + full.search + full.hash;
        }
        return full.toString();
    } catch (e) {
        // Fallback to previous naive implementation
        const sep = url.indexOf('?') !== -1 ? '&' : '?';
        return url + sep + utmParam;
    }
}

function addUtmToAllLinks(utmParam) {
    try {
        const anchors = document.querySelectorAll('a[href]');
        anchors.forEach((a) => {
            const href = a.getAttribute('href');
            const newHref = appendUtmToUrl(href, utmParam);
            if (newHref !== href) {
                a.setAttribute('href', newHref);
            }
            // For external links opened in new tab, ensure noopener
            if (a.target === '_blank' && !/noopener/i.test(a.rel || '')) {
                a.rel = (a.rel ? a.rel + ' ' : '') + 'noopener noreferrer';
            }
        });

        const dataHrefEls = document.querySelectorAll('[data-href]');
        dataHrefEls.forEach((el) => {
            const dh = el.getAttribute('data-href');
            const newDh = appendUtmToUrl(dh, utmParam);
            if (newDh !== dh) el.setAttribute('data-href', newDh);
        });
    } catch (e) {
        console.warn('UTM: failed to append UTM to links', e);
    }
}

function setupCourseLinkHoverAnimations() {
    const links = document.querySelectorAll('.course-link');
    links.forEach(link => {
        link.addEventListener('mouseenter', () => {
            link.classList.add('is-hovered');
            link.classList.remove('is-leaving');
        });
        link.addEventListener('mouseleave', () => {
            link.classList.remove('is-hovered');
            link.classList.add('is-leaving');
            setTimeout(() => link.classList.remove('is-leaving'), 260);
        });

        link.addEventListener('focus', () => {
            link.classList.add('is-hovered');
            link.classList.remove('is-leaving');
        });
        link.addEventListener('blur', () => {
            link.classList.remove('is-hovered');
            link.classList.add('is-leaving');
            setTimeout(() => link.classList.remove('is-leaving'), 260);
        });

        link.addEventListener('touchstart', () => {
            link.classList.add('is-hovered');
        }, { passive: true });
        link.addEventListener('touchend', () => {
            link.classList.remove('is-hovered');
        }, { passive: true });
    });
}

/**
 * Инициализация и синхронизация Telegram MainButton (опционально)
 */
function setupMainButton() {
    return; // не показываем MainButton пока что

    if (!(window.Telegram && Telegram.WebApp && Telegram.WebApp.MainButton)) return;

    try {
        const mb = Telegram.WebApp.MainButton;
        mb.setText('Записаться');
        mb.show();
        // Example: hide/disable if not supported
        if (typeof mb.enable === 'function') mb.enable();

        // Можно отобразить/скрыть кнопку в зависимости от вкладки
        // Пример: при переходе на курсы — показываем, иначе скрываем
        document.querySelectorAll('.tab').forEach(tab => {
            tab.addEventListener('click', () => {
                const id = tab.getAttribute('data-tab');
                if (id === 'courses') {
                    mb.show();
                } else {
                    mb.hide();
                }
            });
        });

        // Обработчик main button клика зарегистрирован в initializeTelegramWebApp через onEvent
    } catch (e) {
        console.debug('MainButton init failed:', e.message);
    }
}

// Restore programmatic tab switch used by special buttons
function switchToTab(tabId) {
    const tab = document.querySelector(`[data-tab="${tabId}"]`);
    const content = document.getElementById(tabId);

    if (tab && content) {
        // remove active from all
        document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));

        // activate requested
        tab.classList.add('active');
        content.classList.add('active');

        // accessibility: move focus to first focusable element in content
        const focusable = content.querySelector('a, button, [tabindex]:not([tabindex="-1"])');
        if (focusable) focusable.focus();

        triggerHapticFeedback('light');
        console.log(`✅ Переключено на вкладку "${tabId}" программно`);
        return true;
    }

    console.error(`❌ Вкладка "${tabId}" не найдена`);
    return false;
}

/**
 * Пометить карточки как бесплатные если в области .course-links есть ссылка с текстом "Записаться"
 */
function markFreeCourses() {
    try {
        const cards = document.querySelectorAll('.course-card');
        cards.forEach(card => {
            const links = Array.from(card.querySelectorAll('.course-links a'));
            const hasEnroll = links.some(a => /записать|записаться|записан/i.test(a.textContent.trim()));
            if (hasEnroll) {
                card.classList.add('free');
            }
        });
    } catch (e) {
        console.warn('markFreeCourses failed', e);
    }
}