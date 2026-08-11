/**
 * State Management Module
 * Manages application state, configuration, and localStorage persistence.
 */

const STORAGE_KEY = 'rhine_config';

/** Default key bindings: Action ID -> Key Codes Array */
const DEFAULT_KEYS = {
    NAV_UP: ['w', 'arrowup'],
    NAV_DOWN: ['s', 'arrowdown'],
    NAV_LEFT: ['a', 'arrowleft'],
    NAV_RIGHT: ['d', 'arrowright'],
    NAV_CONFIRM: ['enter'],
    NAV_BACK: ['backspace'],
    SEARCH_ACTIVATE: ['/'],
    SEARCH_EXIT: ['escape'],
    SEARCH_FOCUS_LIST: [],
};

/** Default application configuration */
const DEFAULT_CONFIG = {
    preferences: {
        uiFontSize: 14,
        showClock: true,
        showDate: true,
        openNewTab: false,
        soundFx: false,
        theme: 'dark',
        clearSearchOnActivate: false,
        // --- SASA 算法相关配置 ---
        quickLaunchMax: 7,      // 快捷栏默认显示数量 (7-20)
        deathThreshold: 0.05,   // 权重死亡阈值
        halfLife: 15,           // 启动期半衰期 (h)
        anchorCount: 3,         // 锚点数量 (m)
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

    // --- SASA 算法运行状态 (持久化) ---
    algorithm: {
        phase: 'BOOTSTRAP',    // 当前阶段: BOOTSTRAP / STABLE
        weights: {},           // 权重池 { urlId: weight_float }，上限 20
        lastClick: {},         // 上次点击时间戳 { urlId: t }
        totalClicks: 0,        // 总点击数 (τ)
        t: 0,                  // 逻辑时间 (启动期为τ，稳定期为锚点点击数)
        anchors: [],           // 当前锚点 ID 列表
        shortcuts: [],         // 快捷栏队列 (存储 ID，按进入顺序倒序)
        alpha: 0.2,            // 锚点点击频率估计值
    },

    // Config
    config: { ...DEFAULT_CONFIG },
};

/**
 * Loads configuration from localStorage and merges with defaults.
 * 同时也负责恢复算法的运行状态。
 */
export async function loadConfig() {
    const json = localStorage.getItem(STORAGE_KEY);
    if (!json) return;

    try {
        const parsed = JSON.parse(json);
        
        // 1. 恢复配置项
        state.config = {
            ...state.config,
            ...parsed,
            preferences: { ...state.config.preferences, ...(parsed.preferences || {}) },
            keys: { ...state.config.keys, ...(parsed.keys || {}) },
        };

        // 2. 恢复算法状态 (如果有)
        if (parsed.algorithm) {
            state.algorithm = {
                ...state.algorithm,
                ...parsed.algorithm
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
        algorithm: state.algorithm // 将权重和阶段持久化
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave));
}