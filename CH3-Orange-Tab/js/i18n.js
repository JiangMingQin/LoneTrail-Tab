/**
 * Lightweight i18n layer for CH3-Orange.
 *
 * Scope: the language switcher only affects the settings modal. The main UI
 * (top bar, footer, dial, list, clock, toast, document title) stays in English:
 *   - t()         -> always English, for every main-UI render path
 *   - tSettings() -> follows the active language, for the #settings-modal subtree
 */

export const SUPPORTED_LANGUAGES = [
    { code: 'en', label: 'EN' },
    { code: 'zh', label: '中文' },
];

const DICTIONARIES = {
    en: {
        'document.title': 'CH3-ORANGE TERMINAL',

        'brand.system': 'CH3-ORANGE // OS',
        'top.settings': 'SETTING',
        'top.settingsTitle': 'CONFIG',
        'top.settingsAria': 'Open settings',
        'top.themeTitle': 'THEME',
        'top.themeAria': 'Toggle theme',

        'theme.light': 'LIGHT',
        'theme.dark': 'DARK',

        'common.back': 'BACK',
        'common.backAria': 'Back to parent',
        'common.root': 'ROOT',
        'common.untitled': 'Untitled',
        'common.empty': 'EMPTY',

        'search.placeholder': 'SEARCH',
        'search.aria': 'Search bookmarks',
        'search.title': 'SEARCH: "{query}"',
        'search.searching': 'SEARCHING...',

        'hint.navigate': 'NAVIGATE',
        'hint.enter': 'ENTER',
        'hint.back': 'BACK',
        'hint.search': 'SEARCH',
        'hint.browse': 'BROWSE',
        'hint.open': 'OPEN',
        'hint.select': 'SELECT',
        'hint.exit': 'EXIT',

        'modal.title': 'TERMINAL_CONFIG',
        'modal.subtitle': 'Ver. 1.0 // USER_PREFS',
        'modal.section.keys': 'KEY_MAPPING',
        'modal.section.display': 'DISPLAY & LAUNCH',
        'modal.section.system': 'SYSTEM',

        'key.navigateUp': 'NAVIGATE_UP',
        'key.navigateDown': 'NAVIGATE_DOWN',
        'key.navLeftBack': 'NAV_LEFT / BACK',
        'key.navRightOpen': 'NAV_RIGHT / OPEN',
        'key.confirm': 'CONFIRM',
        'key.search': 'SEARCH',
        'key.navBack': 'NAV_BACK',
        'key.searchExit': 'SEARCH_EXIT',
        'key.toggleTheme': 'TOGGLE_THEME',
        'key.openSettings': 'OPEN_SETTINGS',

        'settings.ready': 'SYSTEM READY... WAITING FOR INPUT',
        'settings.language': 'LANGUAGE',
        'settings.languageHint': 'Settings language',
        'settings.theme': 'THEME',
        'settings.themeHint': 'Light / Dark interface',
        'settings.font': 'UI_FONT_SIZE',
        'settings.fontHint': 'Adjust text scale',
        'settings.perspective': 'PERSPECTIVE',
        'settings.perspectiveHint': '3D tilt on the right panels (rasterization may cause blur)',
        'settings.quickLaunch': 'QUICK_LAUNCH_SIZE',
        'settings.quickLaunchHint': 'Number of quick launch shortcuts',
        'settings.clock': 'CLOCK_WIDGET',
        'settings.clockHint': 'Time display on left panel',
        'settings.date': 'DATE_INFO',
        'settings.dateHint': 'Show date & weekday',
        'settings.clearSearch': 'CLEAR_ON_ACTIVATE',
        'settings.clearSearchHint': "Clear input when pressing '/'",
        'settings.openNewTab': 'OPEN_NEW_TAB',
        'settings.openNewTabHint': 'Open links in _blank',
        'settings.halfLife': 'FRECENCY_HALF_LIFE',
        'settings.halfLifeHint': 'Score decay half-life (days)',
        'settings.reset': 'RESET_DEFAULTS',
        'settings.apply': 'APPLY',
        'settings.resetConfirm': 'Reset all settings to default?',
        'toast.applied': 'SETTINGS APPLIED',
        'toast.reset': 'SETTINGS RESET',
        'settings.keyRecording': 'PRESS KEY TO BIND...',
        'settings.keySet': 'KEY SET. REMEMBER TO APPLY.',
        'settings.keyReassigned': 'KEY REASSIGNED (STOLEN FROM {action})',

        'unit.days': 'd',

        'empty.noData': 'NO DATA',
        'empty.dirEmpty': 'DIRECTORY IS EMPTY',
        'empty.endpoint': 'ENDPOINT: URL',
        'empty.confirmOpen': 'CONFIRM TO OPEN',
        'empty.noMatches': 'NO MATCHES',
        'empty.query': 'QUERY: "{query}"',

        'clock.sysLocalTime': 'SYS_LOCAL_TIME //',
        'week.sun': 'SUN',
        'week.mon': 'MON',
        'week.tue': 'TUE',
        'week.wed': 'WED',
        'week.thu': 'THU',
        'week.fri': 'FRI',
        'week.sat': 'SAT',

        'folder.quickStart': 'QUICK_START',
        'folder.searchResults': 'SEARCH RESULTS',
    },

    zh: {
        'document.title': 'CH3-ORANGE 终端',

        'brand.system': 'CH3-ORANGE // OS',
        'top.settings': '设置',
        'top.settingsTitle': '配置',
        'top.settingsAria': '打开设置',
        'top.themeTitle': '主题',
        'top.themeAria': '切换主题',

        'theme.light': '亮色',
        'theme.dark': '暗色',

        'common.back': '返回',
        'common.backAria': '返回上级',
        'common.root': '根目录',
        'common.untitled': '未命名',
        'common.empty': '空',

        'search.placeholder': '搜索',
        'search.aria': '搜索书签',
        'search.title': '搜索：“{query}”',
        'search.searching': '搜索中...',

        'hint.navigate': '导航',
        'hint.enter': '进入',
        'hint.back': '返回',
        'hint.search': '搜索',
        'hint.browse': '浏览',
        'hint.open': '打开',
        'hint.select': '选择',
        'hint.exit': '退出',

        'modal.title': 'TERMINAL_CONFIG',
        'modal.subtitle': 'Ver. 1.0 // USER_PREFS',
        'modal.section.keys': '按键映射',
        'modal.section.display': '显示&启动',
        'modal.section.system': '系统',

        'key.navigateUp': '向上导航',
        'key.navigateDown': '向下导航',
        'key.navLeftBack': '向左 / 返回',
        'key.navRightOpen': '向右 / 打开',
        'key.confirm': '确认',
        'key.search': '搜索',
        'key.navBack': '后退',
        'key.searchExit': '退出搜索',
        'key.toggleTheme': '切换主题',
        'key.openSettings': '打开设置',

        'settings.ready': 'SYSTEM READY... WAITING FOR INPUT',
        'settings.language': '语言',
        'settings.languageHint': '设置界面语言',
        'settings.theme': '主题',
        'settings.themeHint': '亮色 / 暗色界面',
        'settings.font': '界面字号',
        'settings.fontHint': '调整文字大小',
        'settings.perspective': '透视效果',
        'settings.perspectiveHint': '右侧面板 3D 倾斜（栅格化可能导致文字变糊）',
        'settings.quickLaunch': '快捷启动数量',
        'settings.quickLaunchHint': '快捷启动项数量',
        'settings.clock': '时钟组件',
        'settings.clockHint': '左侧面板显示时间',
        'settings.date': '日期信息',
        'settings.dateHint': '显示日期和星期',
        'settings.clearSearch': '激活时清空',
        'settings.clearSearchHint': "按 '/' 时清空输入",
        'settings.openNewTab': '新标签页打开',
        'settings.openNewTabHint': '在新标签页打开链接',
        'settings.halfLife': '访问衰减半衰期',
        'settings.halfLifeHint': '评分衰减半衰期（天）',
        'settings.reset': '恢复默认',
        'settings.apply': '应用',
        'settings.resetConfirm': '确定恢复所有设置为默认值吗？',
        'toast.applied': '设置已应用',
        'toast.reset': '设置已重置',
        'settings.keyRecording': '按下按键以绑定...',
        'settings.keySet': '按键已设置，请记得应用。',
        'settings.keyReassigned': '按键已重新分配（原属于 {action}）',

        'unit.days': '天',

        'empty.noData': '无数据',
        'empty.dirEmpty': '目录为空',
        'empty.endpoint': '链接节点',
        'empty.confirmOpen': '确认后打开',
        'empty.noMatches': '无匹配结果',
        'empty.query': '查询：“{query}”',

        'week.sun': '周日',
        'week.mon': '周一',
        'week.tue': '周二',
        'week.wed': '周三',
        'week.thu': '周四',
        'week.fri': '周五',
        'week.sat': '周六',

        'folder.quickStart': 'QUICK_START',
        'folder.searchResults': '搜索结果',
    },
};

let currentLang = 'en';

/** Normalizes any stored value to a supported language code. */
export function normalizeLang(lang) {
    return lang === 'zh' || lang === 'zh-CN' ? 'zh' : 'en';
}

/** Returns the active language code. */
export function getLanguage() {
    return currentLang;
}

/** Shared lookup + {name} interpolation. */
function lookup(table, key, vars) {
    let value = table[key] ?? DICTIONARIES.en[key] ?? key;

    for (const [name, replacement] of Object.entries(vars)) {
        value = value.replaceAll(`{${name}}`, String(replacement));
    }
    return value;
}

/** Main-UI copy: always English, independent of the language preference. */
export function t(key, vars = {}) {
    return lookup(DICTIONARIES.en, key, vars);
}

/** Settings-modal copy: follows the language selected in preferences. */
export function tSettings(key, vars = {}) {
    const table = DICTIONARIES[currentLang] || DICTIONARIES.en;
    return lookup(table, key, vars);
}

/** Applies the language to the settings modal only; main UI stays English. */
export function applyI18n(lang) {
    currentLang = normalizeLang(lang);

    const root = document.documentElement;
    root.lang = currentLang === 'zh' ? 'zh-CN' : 'en';
    root.dataset.lang = currentLang;
    document.title = t('document.title');

    const scope = document.getElementById('settings-modal') || document;
    scope.querySelectorAll('[data-i18n]').forEach((el) => {
        el.textContent = tSettings(el.dataset.i18n);
    });
    scope.querySelectorAll('[data-i18n-title]').forEach((el) => {
        el.setAttribute('title', tSettings(el.dataset.i18nTitle));
    });
    scope.querySelectorAll('[data-i18n-aria]').forEach((el) => {
        el.setAttribute('aria-label', tSettings(el.dataset.i18nAria));
    });
    scope.querySelectorAll('[data-i18n-placeholder]').forEach((el) => {
        el.setAttribute('placeholder', tSettings(el.dataset.i18nPlaceholder));
    });

    // Main-UI clock label is CSS-generated: keep it English like the rest.
    root.style.setProperty('--i18n-sys-local-time', `"${t('clock.sysLocalTime')}"`);

    return currentLang;
}
