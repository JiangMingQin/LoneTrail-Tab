import { state, saveConfig } from './state.js';
import { Actions } from './actions.js';
import { applyTheme } from './utils.js';
import { fullRender, updateKeyHints } from './render.js';
import { initBackground } from './background.js';

/** Currently recording key binding button */
let recordingBtn = null;

/** Debounce timeout for dial wheel events */
let wheelTimeout = null;

/** Wheel debounce delay in ms */
const WHEEL_DEBOUNCE_MS = 40;

/** Initializes all event listeners */
export function initEventListeners() {
    initKeyboardEvents();
    initSearchEvents();
    initDialEvents();
    initContentEvents();
    initSettingsModal();
    initThemeSwitcher();
}

/** Sets up global keyboard event handling */
function initKeyboardEvents() {
    document.addEventListener('keydown', (e) => {
        // Key binding mode takes precedence
        if (recordingBtn) {
            e.preventDefault();
            e.stopPropagation();
            handleKeyBinding(e);
            return;
        }

        const key = e.key.toLowerCase();
        const isInput = e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA';

        if (isInput) {
            handleInputKey(key, e);
            return;
        }

        handleGlobalKey(key, e);
    });
}

/** Handles key events when input is focused */
function handleInputKey(key, e) {
    if (key === 'escape') {
        e.target.blur();
        Actions.dispatch('SEARCH_EXIT');
        const modal = document.getElementById('settings-modal');
        if (modal) modal.classList.add('hidden');
        return;
    }

    if (e.target.id !== 'top-search-input') return;

    if (key === 'enter' || key === 'arrowdown') {
        e.preventDefault();
        Actions.dispatch('SEARCH_FOCUS_LIST');
    } else if (key === 'arrowup') {
        e.preventDefault();
    }
}

/** Handles global navigation keys */
function handleGlobalKey(key, e) {
    // 设置弹窗打开时，Esc 直接关闭
    const settingsModal = document.getElementById('settings-modal');
    if (key === 'escape' && settingsModal && !settingsModal.classList.contains('hidden')) {
        settingsModal.classList.add('hidden');
        e.preventDefault();
        return;
    }

    const keyMap = state.config.keys;
    const matchedActions = Object.keys(keyMap).filter(actionId => 
        keyMap[actionId]?.includes(key)
    );

    if (matchedActions.length === 0) return;

    e.preventDefault();
    matchedActions.forEach(actionId => Actions.dispatch(actionId));
}

/** Initializes search input events */
function initSearchEvents() {
    const searchInput = document.getElementById('top-search-input');
    if (!searchInput) return;

    searchInput.addEventListener('input', (e) => 
        Actions.dispatch('RUN_SEARCH', e.target.value)
    );

    searchInput.addEventListener('focus', () => {
        if (searchInput.value.trim()) {
            Actions.dispatch('RUN_SEARCH', searchInput.value);
        }
    });
}

/** Initializes dial (left panel) interaction events */
function initDialEvents() {
    const dialWrapper = document.getElementById('dial-wrapper-el');
    if (!dialWrapper) return;

    // Click to focus dial
    dialWrapper.addEventListener('click', () => {
        if (state.searchMode) Actions.dispatch('SEARCH_EXIT_FORCE');
        Actions.dispatch('SET_FOCUS', { col: 'left', index: state.parentIndex });
    });

    // Wheel to navigate (with debounce)
    dialWrapper.addEventListener('wheel', (e) => {
        e.preventDefault();
        if (wheelTimeout) return;

        wheelTimeout = setTimeout(() => { wheelTimeout = null; }, WHEEL_DEBOUNCE_MS);

        const dir = e.deltaY > 0 ? 'NAV_DOWN' : 'NAV_UP';
        if (state.focusColumn !== 'left') {
            Actions.dispatch('SET_FOCUS', { col: 'left', index: state.parentIndex });
        }
        Actions.dispatch(dir);
    }, { passive: false });
}

/** Initializes content area (right panel) events */
function initContentEvents() {
    const contentWrapper = document.querySelector('.content-wrapper');
    if (!contentWrapper) return;

    contentWrapper.addEventListener('click', () => {
        if (state.focusColumn !== 'right' && !state.searchMode) {
            Actions.dispatch('SET_FOCUS', { col: 'right', index: state.childIndex });
        }
    });
}

/** Handles key binding recording in settings */
function handleKeyBinding(e) {
    if (!recordingBtn) return;

    const rawKey = e.key;
    if (['Shift', 'Control', 'Alt', 'Meta'].includes(rawKey)) return;

    const storageKey = rawKey.toLowerCase();
    const displayKey = formatKeyDisplay(rawKey);
    const conflictAction = resolveKeyConflict(storageKey, recordingBtn);

    recordingBtn.textContent = displayKey;
    recordingBtn.dataset.key = storageKey;
    recordingBtn.classList.remove('recording');

    const msg = document.getElementById('setting-msg');
    if (msg) {
        if (conflictAction) {
            msg.textContent = `KEY REASSIGNED (STOLEN FROM ${conflictAction})`;
            msg.style.color = 'var(--accent-color)';
        } else {
            msg.textContent = 'KEY SET. REMEMBER TO APPLY.';
            msg.style.color = 'inherit';
        }
    }

    recordingBtn = null;
}

/** Clears conflicting key binding from other actions */
function resolveKeyConflict(newKey, currentBtn) {
    let conflictFound = null;
    const allBtns = document.querySelectorAll('.key-bind-btn');

    for (const btn of allBtns) {
        if (btn === currentBtn) continue;
        if (btn.dataset.key !== newKey) continue;

        btn.dataset.key = '';
        btn.textContent = '---';
        const label = btn.closest('.key-row')?.querySelector('.key-label')?.textContent;
        conflictFound = label || btn.dataset.action;
        break; // Only one conflict possible per key
    }

    return conflictFound;
}

/** Formats key for display in UI */
function formatKeyDisplay(key) {
    const k = key.toLowerCase();
    const arrows = { arrowup: '↑', arrowdown: '↓', arrowleft: '←', arrowright: '→' };

    if (arrows[k]) return arrows[k];
    if (k === ' ') return 'SPACE';
    if (k === 'escape') return 'ESC';
    return key.toUpperCase();
}

/** Initializes settings modal and its controls */
function initSettingsModal() {
    const modal = document.getElementById('settings-modal');
    const settingsBtn = document.getElementById('settings-btn');
    const closeBtn = document.querySelector('.close-modal-btn');
    const saveBtn = document.getElementById('save-settings');
    const resetBtn = document.getElementById('reset-settings');
    const msgEl = document.getElementById('setting-msg');

    if (settingsBtn) {
        settingsBtn.onclick = () => openSettingsModal(modal, msgEl);
    }

    const fontRange = document.getElementById('setting-font-size');
    if (fontRange) {
        fontRange.oninput = (e) => {
            const valSpan = document.getElementById('font-size-val');
            if (valSpan) valSpan.textContent = e.target.value + 'px';
        };
    }

    const quickLaunchRange = document.getElementById('setting-quick-launch');
    if (quickLaunchRange) {
        quickLaunchRange.oninput = (e) => {
            const valSpan = document.getElementById('quick-launch-val');
            if (valSpan) valSpan.textContent = e.target.value;
        };
    }

    if (saveBtn) saveBtn.onclick = () => saveSettings(modal);
    if (resetBtn) {
        resetBtn.onclick = () => {
            if (confirm('Reset all settings to default?')) {
                localStorage.removeItem('rhine_config');
                location.reload();
            }
        };
    }
    if (closeBtn) closeBtn.onclick = () => modal.classList.add('hidden');
    window.onclick = (e) => { if (e.target === modal) modal.classList.add('hidden'); };
}

/** Opens settings modal and loads current values */
function openSettingsModal(modal, msgEl) {
    if (!modal) return;

    const prefs = state.config.preferences || {};
    const keys = state.config.keys || {};

    // Load preference controls
    const controls = {
        fontRange: document.getElementById('setting-font-size'),
        fontVal: document.getElementById('font-size-val'),
        clockCheck: document.getElementById('setting-clock-enabled'),
        dateCheck: document.getElementById('setting-clock-details'),
        newTabCheck: document.getElementById('setting-open-newtab'),
        soundCheck: document.getElementById('setting-sound-fx'),
        clearSearchCheck: document.getElementById('setting-clear-search'),
        quickLaunchRange: document.getElementById('setting-quick-launch'),
        quickLaunchVal: document.getElementById('quick-launch-val'),
    };

    if (controls.fontRange) {
        controls.fontRange.value = prefs.uiFontSize || 14;
        if (controls.fontVal) controls.fontVal.textContent = controls.fontRange.value + 'px';
    }
    if (controls.quickLaunchRange) {
        controls.quickLaunchRange.value = prefs.quickLaunchMax || 7;
        if (controls.quickLaunchVal) controls.quickLaunchVal.textContent = controls.quickLaunchRange.value;
    }
    if (controls.clockCheck) controls.clockCheck.checked = prefs.showClock !== false;
    if (controls.dateCheck) controls.dateCheck.checked = prefs.showDate !== false;
    if (controls.newTabCheck) controls.newTabCheck.checked = prefs.openNewTab === true;
    if (controls.soundCheck) controls.soundCheck.checked = prefs.soundFx === true;
    if (controls.clearSearchCheck) controls.clearSearchCheck.checked = prefs.clearSearchOnActivate === true;

    // Load key binding buttons
    document.querySelectorAll('.key-bind-btn').forEach(btn => {
        const action = btn.dataset.action;
        const slot = parseInt(btn.dataset.slot);

        if (keys[action]?.[slot]) {
            btn.textContent = formatKeyDisplay(keys[action][slot]);
            btn.dataset.key = keys[action][slot];
        } else {
            btn.textContent = '---';
            btn.dataset.key = '';
        }

        btn.onclick = () => startKeyRecording(btn, msgEl);
    });

    modal.classList.remove('hidden');
}

/** Starts recording a key binding */
function startKeyRecording(btn, msgEl) {
    if (recordingBtn && recordingBtn !== btn) {
        recordingBtn.classList.remove('recording');
    }
    recordingBtn = btn;
    btn.classList.add('recording');
    btn.textContent = '...';

    if (msgEl) {
        msgEl.textContent = 'PRESS KEY TO BIND...';
        msgEl.style.color = 'inherit';
    }
}

/** Saves settings and applies changes */
function saveSettings(modal) {
    const prefs = state.config.preferences;

    // Collect preference values
    const controls = {
        fontRange: document.getElementById('setting-font-size'),
        clockCheck: document.getElementById('setting-clock-enabled'),
        dateCheck: document.getElementById('setting-clock-details'),
        newTabCheck: document.getElementById('setting-open-newtab'),
        soundCheck: document.getElementById('setting-sound-fx'),
        clearSearchCheck: document.getElementById('setting-clear-search'),
        quickLaunchRange: document.getElementById('setting-quick-launch'),
    };

    if (controls.fontRange) prefs.uiFontSize = parseInt(controls.fontRange.value);
    if (controls.quickLaunchRange) prefs.quickLaunchMax = parseInt(controls.quickLaunchRange.value);
    if (controls.clockCheck) prefs.showClock = controls.clockCheck.checked;
    if (controls.dateCheck) prefs.showDate = controls.dateCheck.checked;
    if (controls.newTabCheck) prefs.openNewTab = controls.newTabCheck.checked;
    if (controls.soundCheck) prefs.soundFx = controls.soundCheck.checked;
    if (controls.clearSearchCheck) prefs.clearSearchOnActivate = controls.clearSearchCheck.checked;

    // Collect key bindings
    const newKeys = {};
    const actionSet = new Set();
    document.querySelectorAll('.key-bind-btn').forEach(btn => actionSet.add(btn.dataset.action));
    actionSet.forEach(act => newKeys[act] = []);

    document.querySelectorAll('.key-bind-btn').forEach(btn => {
        const action = btn.dataset.action;
        const slot = parseInt(btn.dataset.slot);
        const keyVal = btn.dataset.key;
        if (keyVal) newKeys[action][slot] = keyVal;
    });

    // Filter empty slots
    Object.keys(newKeys).forEach(action => {
        newKeys[action] = newKeys[action].filter(k => k);
    });

    state.config.keys = newKeys;
    saveConfig();

    // Apply visual changes immediately
    applyVisualChanges(prefs);

    // Refresh key hints to reflect new bindings
    updateKeyHints();

    if (modal) modal.classList.add('hidden');
}

/** Applies visual settings changes */
function applyVisualChanges(prefs) {
    // Font size
    document.documentElement.style.setProperty('--ui-font-size', `${prefs.uiFontSize}px`);

    // Clock visibility
    const clockModule = document.getElementById('clock-module');
    const dateEl = document.getElementById('clock-date');
    const weekEl = document.getElementById('clock-week');

    if (clockModule) {
        clockModule.style.display = prefs.showClock ? 'flex' : 'none';
        clockModule.classList.toggle('hidden', !prefs.showClock);
    }

    if (dateEl && weekEl) {
        const dateDisplay = prefs.showDate ? 'block' : 'none';
        dateEl.style.display = dateDisplay;
        weekEl.style.display = dateDisplay;
    }

    // 刷新 QUICK_START 快捷栏（数量变化即时生效）
    fullRender();
}

/** Initializes theme toggle button */
function initThemeSwitcher() {
    const themeBtn = document.getElementById('theme-btn');
    if (!themeBtn) return;

    const updateThemeLabel = () => {
        const currentTheme = state.config.preferences.theme || 'light';
        themeBtn.textContent = currentTheme === 'dark' ? 'DARK' : 'LIGHT';
    };

    themeBtn.onclick = () => {
        const currentTheme = state.config.preferences.theme || 'light';
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        state.config.preferences.theme = newTheme;
        applyTheme(newTheme);
        saveConfig();
        updateThemeLabel();
        initBackground();
    };

    updateThemeLabel();
}
