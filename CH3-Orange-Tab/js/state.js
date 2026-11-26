/**
 * State Management Module
 * Manages application state, configuration, and localStorage persistence.
 */

const STORAGE_KEY = 'ch3orange_config';
/** 旧存储键（迁移用，按从新到旧排列） */
const LEGACY_STORAGE_KEYS = ['lonetrail_config', 'rhine_config'];

/** Default key bindings: Action ID -> Key Codes Array */
const DEFAULT_KEYS = {
    NAV_UP: ['w', 'arrowup'],
    NAV_DOWN: ['s', 'arrowdown'],
    NAV_LEFT: ['a', 'arrowleft'],
    NAV_RIGHT: ['d', 'arrowright'],
    NAV_CONFIRM: ['enter', ' '],
    NAV_BACK: ['backspace'],
    SEARCH_ACTIVATE: ['/'],
    SEARCH_EXIT: ['escape'],
    SEARCH_FOCUS_LIST: [],
    TOGGLE_THEME: ['t'],
    OPEN_SETTINGS: ['o'],
};

/** Default application configuration */
const DEFAULT_CONFIG = {
    preferences: {
        uiFontSize: 14,
        showClock: true,
        showDate: true,
        openNewTab: false,
        theme: 'light',
        clearSearchOnActivate: false,
        language: 'en',          // 界面语言：en / zh
        perspectiveEnabled: false, // 右侧面板透视倾斜；默认关闭，开启后启用 3D 效果
        // --- Frecency 算法相关配置 ---
        quickLaunchMax: 7,       // 快捷栏默认显示数量 (3-12)
        frecencyHalfLifeDays: 7, // 分数半衰期 (天)
    },
    keys: { ...DEFAULT_KEYS },
};

/** Application state object */
export const state = {
    // Data
    rootParents: [],      // Original root data for search source
    parents: [],
    currentChildren: [],

    // UI State
    parentIndex: 0,
    childIndex: 0,
    focusColumn: 'left',
    navStack: [],

    // Search State
    searchMode: false,
    searchResults: [],
    searchQuery: '',

    // --- Frecency 算法运行状态 (持久化) ---
    frecency: {
        version: 1,        // 数据结构版本，便于未来迁移
        scores: {},        // 分数池 { urlId: score_float }，上限 50
        lastVisit: {},     // 上次点击时间戳 { urlId: timestamp }
    },

    // Config
    config: { ...DEFAULT_CONFIG },
};

/**
 * Loads configuration from localStorage and merges with defaults.
 * 同时也负责恢复算法的运行状态。
 */
export async function loadConfig() {
    let json = localStorage.getItem(STORAGE_KEY);

    // 迁移：旧键存在时复制到新键并删除旧键（不丢用户设置）
    if (!json) {
        for (const legacyKey of LEGACY_STORAGE_KEYS) {
            const legacy = localStorage.getItem(legacyKey);
            if (!legacy) continue;
            localStorage.setItem(STORAGE_KEY, legacy);
            localStorage.removeItem(legacyKey);
            json = legacy;
            break;
        }
    }

    if (!json) return;

    try {
        const parsed = JSON.parse(json);

        // 0. 迁移：检测到旧 SASA 数据（algorithm 字段）则清零重来
        if (parsed.algorithm) {
            console.info('Frecency: legacy SASA data detected, resetting algorithm state.');
            delete parsed.algorithm;
        }

        // 1. 恢复配置项（剥离旧 SASA 配置字段）
        const legacyPrefs = parsed.preferences || {};
        delete legacyPrefs.deathThreshold;
        delete legacyPrefs.halfLife;
        delete legacyPrefs.anchorCount;

        state.config = {
            ...state.config,
            preferences: { ...state.config.preferences, ...legacyPrefs },
            keys: { ...state.config.keys, ...(parsed.keys || {}) },
        };

        // 迁移：早期默认配置里 CONFIRM 只有 enter，补上空格作为第二绑定。
        // 只对"仍是原始单 enter"的配置生效，用户自定义过 confirm 的不覆盖。
        const confirmKeys = state.config.keys.NAV_CONFIRM;
        if (Array.isArray(confirmKeys) && confirmKeys.length === 1 && confirmKeys[0] === 'enter') {
            state.config.keys.NAV_CONFIRM = ['enter', ' '];
        }

        // 2. 恢复 Frecency 状态 (如果有)
        if (parsed.frecency) {
            state.frecency = {
                ...state.frecency,
                ...parsed.frecency,
            };
        }
    } catch (e) {
        console.error('Failed to parse configuration:', e);
        state.config = { ...DEFAULT_CONFIG };
    }
}

/**
 * Saves current configuration and algorithm state to localStorage.
 */
export function saveConfig() {
    const dataToSave = {
        preferences: state.config.preferences,
        keys: state.config.keys,
        frecency: state.frecency // 将分数与时间戳持久化
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave));
}
