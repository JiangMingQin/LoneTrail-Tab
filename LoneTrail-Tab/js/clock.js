import { state } from './state.js';
import { t } from './i18n.js';

/** Clock update interval in milliseconds */
const UPDATE_INTERVAL_MS = 1000;

/** Week day translation keys */
const WEEK_DAYS = ['week.sun', 'week.mon', 'week.tue', 'week.wed', 'week.thu', 'week.fri', 'week.sat'];

/**
 * Initializes the clock module
 * Starts periodic updates and performs initial render
 */
export function initClock() {
    updateClock();
    setInterval(updateClock, UPDATE_INTERVAL_MS);
}

/** Immediately re-renders clock text, e.g. after a language change. */
export function refreshClock() {
    updateClock();
}

/**
 * Updates clock display and visibility
 * Reads current time and config preferences
 */
function updateClock() {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');

    const timeEl = document.getElementById('clock-time');
    const dateEl = document.getElementById('clock-date');
    const weekEl = document.getElementById('clock-week');

    if (timeEl) timeEl.textContent = `${hours}:${minutes}`;

    if (dateEl) {
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        dateEl.textContent = `${year}-${month}-${day}`;
    }

    if (weekEl) {
        weekEl.textContent = t(WEEK_DAYS[now.getDay()]);
    }

    updateClockVisibility();
}

/**
 * Updates clock module visibility based on user preferences
 * Controls both CSS class and inline display style
 */
function updateClockVisibility() {
    const clockModule = document.getElementById('clock-module');
    if (!clockModule) return;

    const showClock = state.config.preferences.showClock !== false;

    clockModule.classList.toggle('hidden', !showClock);
    clockModule.style.display = showClock ? 'flex' : 'none';
}
