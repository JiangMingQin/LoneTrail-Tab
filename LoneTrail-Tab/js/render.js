import { state } from './state.js';
import { escapeHtml } from './utils.js';
import { Actions } from './actions.js';
import { Frecency } from './features/algorithm.js';

/** DOM element references */
const els = {
    parentList: document.getElementById('parent-list'),
    childList: document.getElementById('child-list'),
    folderTitle: document.getElementById('current-folder-title'),
    keyHints: {
        nav: document.getElementById('key-hint-nav'),
        enter: document.getElementById('key-hint-enter'),
        back: document.getElementById('key-hint-back'),
    },
    hexes: document.querySelectorAll('.hex'),
};

/** Dial radius in pixels - controls circular layout spread */
const DIAL_RADIUS = 850;

/** Angle gap between dial items in degrees */
const ITEM_ANGLE_GAP = 7;

/** Renders the entire UI */
export function fullRender() {
    renderDialDOM();
    updateDialStyles();
    renderChildrenDOM();
    updateChildrenSelection();
    animateHexagons();
    updateKeyHints();
}

/** Updates UI after cursor movement */
export function updateCursor() {
    updateDialStyles();
    if (state.focusColumn === 'left') {
        renderChildrenDOM();
    } else {
        updateChildrenSelection();
    }
    animateHexagons();
    updateKeyHints();
}

/** Re-renders after search */
export function renderSearchResults() {
    fullRender();
}

/** Renders the circular dial (parent bookmarks) */
export function renderDialDOM() {
    if (!els.parentList) return;
    els.parentList.innerHTML = '';
    els.parentList.style.opacity = '1';

    state.parents.forEach((node, index) => {
        const div = document.createElement('div');
        div.className = 'dial-item';
        div.dataset.index = index;

        const indexStr = String(index).padStart(2, '0');
        let iconHtml = '<span class="dial-icon-folder">/</span>';

        if (node.id === 'search-root') {
            iconHtml = '<span class="dial-icon-folder">🔍</span>';
        } else if (node.url && typeof chrome !== 'undefined' && chrome.runtime?.id) {
            // Chrome extension favicon API
            const src = `chrome-extension://${chrome.runtime.id}/_favicon/?pageUrl=${encodeURIComponent(node.url)}&size=16`;
            iconHtml = `<img src="${src}" class="dial-icon">`;
        }

        div.innerHTML = `
            <span class="dial-idx">${indexStr}</span>
            <span class="dial-content">
                ${iconHtml}
                <span class="dial-text">${escapeHtml(node.title || 'Untitled')}</span>
            </span>
            <div class="dial-decor"></div>
        `;

        div.onclick = (e) => {
            e.stopPropagation();
            Actions.dispatch('SET_FOCUS', { col: 'left', index });
        };
        els.parentList.appendChild(div);
    });
}

/** Updates dial item positions and styles based on selection */
function updateDialStyles() {
    if (!els.parentList) return;

    const items = Array.from(els.parentList.children);
    const totalItems = items.length;

    items.forEach((div) => {
        const index = parseInt(div.dataset.index);
        let diff = index - state.parentIndex;

        // Handle wrap-around for circular navigation
        if (diff > totalItems / 2) diff -= totalItems;
        else if (diff < -totalItems / 2) diff += totalItems;

        div.classList.remove('active');
        let opacity = 1 - (Math.abs(diff) / 5);
        if (opacity < 0) opacity = 0;

        if (diff === 0) {
            // Active item - centered and scaled
            div.classList.add('active');
            div.style.transform = 'translate(-30px, -50%) scale(1)';
            div.style.opacity = '1';
            div.style.zIndex = '100';
            div.style.pointerEvents = 'auto';
        } else {
            // Inactive items - positioned on circular arc
            const angleDeg = diff * ITEM_ANGLE_GAP;
            const angleRad = angleDeg * (Math.PI / 180);
            const translateY = DIAL_RADIUS * Math.sin(angleRad);
            const translateX = (DIAL_RADIUS * Math.cos(angleRad)) - DIAL_RADIUS;
            const rotate = angleDeg * 0.6;

            div.style.transform = `translate(${translateX}px, calc(${translateY}px - 50%)) rotate(${rotate}deg)`;
            div.style.opacity = opacity;
            div.style.zIndex = 100 - Math.abs(diff);
            div.style.pointerEvents = opacity > 0.1 ? 'auto' : 'none';
        }
    });
}

/** Renders the child items list (right panel) */
export function renderChildrenDOM() {
    if (!els.childList) return;

    let itemsToRender = [];
    let titleText = '';

    const activeParent = state.parents[state.parentIndex];

    if (activeParent && activeParent.id === 'QUICK_START') {
        activeParent.children = Frecency.getShortcuts();
    }

    if (activeParent) {
        if (activeParent.id === 'search-root') {
            titleText = state.searchQuery ? `SEARCH: "${state.searchQuery}"` : 'SEARCHING...';
        } else {
            titleText = activeParent.title;
        }

        // URL nodes have no children
        itemsToRender = activeParent.url ? [] : (activeParent.children || []);
    } else {
        titleText = 'ROOT';
    }

    state.currentChildren = itemsToRender;

    if (els.folderTitle) els.folderTitle.textContent = (titleText || 'ROOT').toUpperCase();
    els.childList.innerHTML = '';

    // [修改] 如果列表为空，渲染莱茵生命风格的空状态
    if (itemsToRender.length === 0) {
        let type = 'empty';
        let mainText = 'NO DATA';
        let subText = 'DIRECTORY IS EMPTY';

        // 情况1：这是一个 URL 节点 (Endpoint)
        if (activeParent && activeParent.url) {
            type = 'endpoint';
            mainText = 'ENDPOINT: URL';
            subText = 'CONFIRM TO OPEN';
        } 
        // 情况2：这是搜索结果，且为空
        else if (activeParent && activeParent.id === 'search-root') {
            type = 'no-result';
            mainText = 'NO MATCHES';
            subText = `QUERY: "${state.searchQuery}"`;
        }

        els.childList.innerHTML = generateEmptyStateHTML(type, mainText, subText);
        return;
    }

    itemsToRender.forEach((node, index) => {
        const div = createChildItem(node, index);
        els.childList.appendChild(div);
    });

    updateChildrenSelection();
}

/** [新增] 生成空状态的装饰性 HTML (Rhine Lab 风格) */
function generateEmptyStateHTML(type, title, sub) {
    return `
    <div class="empty-state-wrapper" data-type="${type}">
        <div class="es-backdrop"></div>

        <div class="es-graphic-layer">
            <div class="es-line-vert left"></div>
            <div class="es-line-diag"></div>
            <div class="es-line-vert right"></div>
        </div>
        
        <div class="es-center-box">
            <div class="es-title">${title}</div>
            <div class="es-sub">${sub}</div>
        </div>
    </div>
    `;
}

/** Creates a child list item element */
function createChildItem(node, index) {
    const div = document.createElement('div');
    div.className = 'list-item animate-enter';
    div.style.setProperty('--i', index);

    const titleSpan = document.createElement('span');
    titleSpan.className = 'title';
    titleSpan.innerHTML = getFaviconHtml(node) + escapeHtml(node.title);

    const metaSpan = document.createElement('span');
    metaSpan.className = 'url';
    metaSpan.textContent = getHostname(node.url);

    div.appendChild(titleSpan);
    div.appendChild(metaSpan);

    div.onclick = (e) => {
        e.stopPropagation();
        Actions.dispatch('SET_FOCUS', { col: 'right', index });
    };
    div.ondblclick = (e) => {
        e.stopPropagation();
        Actions.dispatch('NAV_CONFIRM');
    };

    return div;
}

/** Generates favicon HTML for a node */
function getFaviconHtml(node) {
    if (!node.url) {
        return '<span class="folder-indicator">DIR</span> ';
    }
    if (typeof chrome !== 'undefined' && chrome.runtime?.id) {
        const src = `chrome-extension://${chrome.runtime.id}/_favicon/?pageUrl=${encodeURIComponent(node.url)}&size=16`;
        return `<img src="${src}" class="list-favicon">`;
    }
    return '';
}

/** Extracts hostname from URL safely */
function getHostname(url) {
    if (!url) return '>>';
    try {
        return new URL(url).hostname;
    } catch {
        return '>>';
    }
}

/** Updates selection highlight in child list */
function updateChildrenSelection() {
    if (!els.childList) return;

    const items = Array.from(els.childList.children);
    items.forEach((div, index) => {
        const shouldHighlight = state.focusColumn === 'right';
        if (shouldHighlight && index === state.childIndex) {
            if (!div.classList.contains('selected')) {
                div.classList.add('selected');
                div.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
            }
        } else {
            div.classList.remove('selected');
        }
    });
}

/** Triggers hexagon background animation */
function animateHexagons() {
    if (!els.hexes) return;
    els.hexes.forEach(h => {
        h.classList.remove('pulse');
        void h.offsetWidth; // Force reflow to restart animation
        h.classList.add('pulse');
    });
}

/**
 * Updates key hint display based on current mode
 * Reads bindings from state.config.keys (NAV_UP, NAV_DOWN, etc.)
 */
export function updateKeyHints() {
    if (!els.keyHints.nav) return;

    const k = state.config.keys;

    const getChar = (actionId) => {
        const arr = k[actionId];
        if (!arr?.length) return '?';
        const key = arr[0];
        const arrows = { arrowup: '↑', arrowdown: '↓', arrowleft: '←', arrowright: '→' };
        if (arrows[key]) return arrows[key];
        if (key === ' ') return 'SPC';
        return key.toUpperCase();
    };

    if (state.searchMode) {
        updateSearchModeHints(getChar);
    } else {
        // Normal mode - uses NAV_UP, NAV_DOWN, NAV_CONFIRM, NAV_LEFT
        els.keyHints.nav.textContent = `[${getChar('NAV_UP')}/${getChar('NAV_DOWN')}]`;
        els.keyHints.enter.textContent = `[${getChar('NAV_CONFIRM')}]`;
        els.keyHints.back.textContent = `[${getChar('NAV_LEFT')}]`;
    }
}

/** Updates hints for search mode */
function updateSearchModeHints(getChar) {
    const hasDrilledDown = state.navStack.some(s => s.searchMode === true);

    if (hasDrilledDown) {
        // User has navigated into a folder from search results
        els.keyHints.nav.textContent = '[NAV] BROWSE';
        els.keyHints.enter.textContent = `[${getChar('NAV_CONFIRM')}] OPEN`;
        els.keyHints.back.textContent = '[ESC] BACK';
    } else {
        // At search root
        els.keyHints.nav.textContent = '[NAV] --';

        if (state.focusColumn === 'right') {
            els.keyHints.enter.textContent = `[${getChar('NAV_CONFIRM')}] OPEN`;
        } else {
            els.keyHints.enter.textContent = '[ENTER] SELECT';
        }

        els.keyHints.back.textContent = '[ESC] EXIT';
    }
}
