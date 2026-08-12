import { loadConfig, state } from './state.js';
import { fullRender } from './render.js';
import { initEventListeners } from './events.js';
import { initClock } from './clock.js';
import { applyTheme } from './utils.js';
import { initBackground } from './background.js';

/** Default theme if not configured */
const DEFAULT_THEME = 'light';

/** Default UI font size in pixels */
const DEFAULT_FONT_SIZE = 14;

/** Debounce delay for window resize events (ms) */
const RESIZE_DEBOUNCE_DELAY = 200;

/** Demo data for non-Chrome environments */
const DEMO_BOOKMARKS = [
    {
        id: 'root-1',
        title: 'Bookmarks Bar',
        children: [
            { title: 'Google', url: 'https://google.com' },
            { title: 'GitHub', url: 'https://github.com' },
        ],
    },
    {
        id: 'root-2',
        title: 'Other Bookmarks',
        children: [],
    },
];

document.addEventListener('DOMContentLoaded', async () => {
    // Load configuration and apply theme
    await loadConfig();
    const prefs = state.config.preferences || {};
    applyTheme(prefs.theme || DEFAULT_THEME);
    document.documentElement.style.setProperty('--ui-font-size', `${prefs.uiFontSize || DEFAULT_FONT_SIZE}px`);

    // Initialize modules
    initClock();
    initEventListeners();
    initBackground();

    // Re-render background on resize (debounced)
    let resizeTimer;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(initBackground, RESIZE_DEBOUNCE_DELAY);
    });

    // Load bookmark data
    await loadBookmarks();

    // Initialize navigation state
    initializeNavigationState();

    // Initial render
    fullRender();
});

/**
 * 修改后的 loadBookmarks
 * 在加载原始书签后，立即注入伪装的 QUICK_START 节点
 */
async function loadBookmarks() {
    // 1. 定义虚拟节点对象
    const quickFolder = {
        id: 'QUICK_START',
        title: 'QUICK_START',
        children: [], // 初始为空，由 render.js 实时同步算法数据
        type: 'folder',
        isVirtual: true
    };

    try {
        if (typeof chrome !== 'undefined' && chrome.bookmarks) {
            const tree = await chrome.bookmarks.getTree();
            if (tree?.[0]?.children) {
                // [统一协议] 将虚拟节点置于数组首位，随后拼接真实书签
                state.rootParents = [quickFolder, ...tree[0].children]; 
                state.parents = [...state.rootParents];
                return;
            }
        }
        throw new Error('Chrome bookmarks API unavailable');
    } catch (err) {
        console.warn('LoneTrail: Running in Demo Mode');
        // [统一协议] Demo 模式下也保持一致
        state.rootParents = [quickFolder, ...DEMO_BOOKMARKS];
        state.parents = [...state.rootParents];
    }
}

/**
 * Initializes navigation state with safety checks
 * Ensures valid indices and fallback data
 */
function initializeNavigationState() {
    // Ensure non-empty parent array
    if (!state.parents?.length) {
        state.parents = [{ title: 'EMPTY', children: [] }];
        state.rootParents = state.parents;
    }

    state.parentIndex = 0;
    state.childIndex = 0;
    state.focusColumn = 'left';
    state.currentChildren = state.parents[0].children || [];
}
