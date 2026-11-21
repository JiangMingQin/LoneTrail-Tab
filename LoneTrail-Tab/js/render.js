import { state } from './state.js';
import { escapeHtml } from './utils.js';
import { Actions } from './actions.js';
import { Frecency } from './features/algorithm.js';
import { t } from './i18n.js';

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

/** Renders the circular dial (parent bookmarks) */
export function renderDialDOM() {
    if (!els.parentList) return;
    els.parentList.innerHTML = '';
    els.parentList.style.opacity = '1';

    state.parents.forEach((node, index) => {
        const label = node.id === 'QUICK_START'
            ? t('folder.quickStart')
            : node.id === 'search-root'
                ? (state.searchQuery ? t('folder.searchResults') : t('search.searching'))
                : (node.title || t('common.untitled'));
        const div = document.createElement('div');
        div.className = 'dial-item';
        div.dataset.index = index;
        div.setAttribute('role', 'button');
        div.setAttribute('aria-label', label);

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
                <span class="dial-text">${escapeHtml(label)}</span>
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
            div.classList.toggle('focus-dimmed', state.focusColumn !== 'left');
            div.style.transform = 'translate(-30px, -50%) scale(1)';
            div.style.opacity = '1';
            div.style.zIndex = '100';
            div.style.pointerEvents = 'auto';
        } else {
            div.classList.remove('focus-dimmed');
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
            titleText = state.searchQuery
                ? t('search.title', { query: state.searchQuery })
                : t('search.searching');
        } else if (activeParent.id === 'QUICK_START') {
            titleText = t('folder.quickStart');
        } else {
            titleText = activeParent.title || t('common.untitled');
        }

        // URL nodes have no children
        itemsToRender = activeParent.url ? [] : (activeParent.children || []);
    } else {
        titleText = t('common.root');
    }

    state.currentChildren = itemsToRender;

    if (els.folderTitle) els.folderTitle.textContent = (titleText || t('common.root')).toUpperCase();
    els.childList.innerHTML = '';

    // [修改] 如果列表为空，渲染复古终端风格的空状态
    if (itemsToRender.length === 0) {
        let type = 'empty';
        let mainText = t('empty.noData');
        let subText = t('empty.dirEmpty');

        // 情况1：这是一个 URL 节点 (Endpoint)
        if (activeParent && activeParent.url) {
            type = 'endpoint';
            mainText = t('empty.endpoint');
            subText = t('empty.confirmOpen');
        } 
        // 情况2：这是搜索结果，且为空
        else if (activeParent && activeParent.id === 'search-root') {
            type = 'no-result';
            mainText = t('empty.noMatches');
            subText = t('empty.query', { query: state.searchQuery });
        }

        els.childList.innerHTML = generateEmptyStateHTML(type, mainText, subText);
        return;
    }

    itemsToRender.forEach((node, index) => {
        const div = createChildItem(node, index);
        els.childList.appendChild(div);
    });

    renderToken++;
    updateChildrenSelection();
}

/** [新增] 生成空状态的装饰性 HTML (复古终端风格) */
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
            <div class="es-title">${escapeHtml(title)}</div>
            <div class="es-sub">${escapeHtml(sub)}</div>
        </div>
    </div>
    `;
}

/** Creates a child list item element */
function createChildItem(node, index) {
    const div = document.createElement('div');
    div.className = 'list-item animate-enter';
    div.style.setProperty('--i', index);
    div.setAttribute('role', 'button');
    div.setAttribute('aria-label', node.title || t('common.untitled'));

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
        return `<span class="folder-indicator">${escapeHtml(t('common.dir'))}</span> `;
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
                div.scrollIntoView({ block: 'nearest' });
            }
            div.setAttribute('aria-current', 'true');
        } else {
            div.classList.remove('selected');
            div.removeAttribute('aria-current');
        }
    });

    syncSelectionLift();
}

/** 每次重建列表自增，用于判断浮层卡片的内容是否过期 */
let renderToken = 0;

/** 抬升量（px） */
const LIFT_OFFSET = 14;

/** 浮层容器里的平面：3D 由父级 .tilt-plane 提供，这里只做平面内 2D 位移 */
let liftPlane = null;

/** 当前选中项的卡片与对应行 */
let activeCard = null;
let activeRow = null;

/** 是否已绑定列表滚动监听 */
let liftScrollBound = false;

/** 当前已交接的选中项标识 */
let liftKey = '';

/** 统一从 CSS 变量读时长/曲线，避免 JS 与 CSS 各走一套 */
function selectTiming() {
    const cs = getComputedStyle(document.documentElement);
    const rawDur = cs.getPropertyValue('--select-duration').trim() || '380ms';
    const dur = rawDur.endsWith('ms') ? parseFloat(rawDur) : parseFloat(rawDur) * 1000;
    const ease = cs.getPropertyValue('--select-easing').trim() || 'cubic-bezier(0.4, 0, 0.2, 1)';
    return { dur: Number.isFinite(dur) ? dur : 380, ease };
}

/**
 * 统一倾斜平面的尺寸同步。
 * 头部用空槽给搜索栏占位，搜索栏本身绝对定位在平面里；这里把头部实际高度和
 * 搜索栏当前宽度写成 CSS 变量，供 .top-search-wrapper 定位与 .search-slot 占位。
 */
export function initTiltPlane() {
    const wrapper = document.querySelector('.content-wrapper');
    const header = document.querySelector('.content-header');
    const search = document.querySelector('.top-search-wrapper');
    if (!wrapper || !header || !search) return;

    const sync = () => {
        const mb = parseFloat(getComputedStyle(header).marginBottom) || 0;
        // 搜索栏原本在头部内底部对齐：相对平面顶部的偏移 = -(头部 margin) - 自身高度。
        wrapper.style.setProperty('--search-top', `${-mb - search.offsetHeight}px`);
        wrapper.style.setProperty('--search-slot-width', `${search.offsetWidth}px`);
    };
    sync();

    if (typeof ResizeObserver !== 'undefined') {
        new ResizeObserver(sync).observe(header);
        new ResizeObserver(sync).observe(search);
    } else {
        window.addEventListener('resize', sync);
    }
}

/** 让浮层平面贴合列表几何；倾斜由父级 .tilt-plane 统一提供，不要在这里重复变换 */
function syncLiftPlane(list, layer) {
    if (!liftPlane) {
        liftPlane = document.createElement('div');
        liftPlane.className = 'lift-plane';
        layer.appendChild(liftPlane);
    }
    liftPlane.style.left = `${list.offsetLeft}px`;
    liftPlane.style.top = `${list.offsetTop}px`;
    liftPlane.style.width = `${list.offsetWidth}px`;
    liftPlane.style.height = `${list.offsetHeight}px`;
    return liftPlane;
}

/** 行在平面内的几何：静止位与抬升位 */
function cardGeometry(row, list) {
    const relTop = row.offsetTop - list.scrollTop;
    return {
        height: row.offsetHeight,
        rest: `translate3d(0px, ${relTop}px, 0)`,
        lifted: `translate3d(${-LIFT_OFFSET}px, ${relTop - LIFT_OFFSET}px, 0)`,
    };
}

/** 位移驱动：先落到目标，再从 from 动画过来（每个卡片各自持有动画） */
function animateCard(card, from, to) {
    const timing = selectTiming();
    if (card.__liftAnim) {
        card.__liftAnim.cancel();
        card.__liftAnim = null;
    }
    card.style.transform = to;
    if (!from || from === to) return;
    card.__liftAnim = card.animate(
        [{ transform: from }, { transform: to }],
        { duration: timing.dur, easing: timing.ease }
    );
}

/** 选中一张卡：落位 → 从左到右填充 + 抬起（同一时刻开始） */
function startSelect(row, list, plane) {
    // 同一行被快速重新选中（WS 同帧 up+down、长按 S 绕回）时，该行此前的
    // 离场卡若仍在播收色动画（满宽黑底），会与新入场的卡错位叠加、从卡片
    // 边框右侧溢出（"底层全黑"）。这里只把这类"同行旧卡"立即清零；其它行
    // 的离场卡不受影响，照常播完整的收色（反向）动画。
    Array.from(plane.children).forEach((old) => {
        if (old.__row === row) old.classList.add('is-exiting');
    });

    const geo = cardGeometry(row, list);
    const card = document.createElement('div');
    card.className = 'list-item lift-card';
    card.innerHTML = row.innerHTML;
    card.style.height = `${geo.height}px`;
    card.__rest = geo.rest;
    card.__row = row;
    card.style.transform = geo.rest;
    card.style.opacity = '0';
    plane.appendChild(card);

    void card.offsetWidth;              // 提交"未填充 + 槽位"这一帧
    card.style.opacity = '1';
    card.classList.add('selected', 'is-up');
    animateCard(card, geo.rest, geo.lifted);
    return card;
}

/** 取消一张卡：落回槽位 + 收色 + 收投影，随后淡出并移除；结束后恢复该行内容 */
function startDeselect(card, row) {
    const timing = selectTiming();
    const from = getComputedStyle(card).transform;
    const rest = card.__rest || from;

    // 移除 .selected 触发 ::before 的 width:100%→0 收色（反向）动画，
    // 移除 .is-up 收起投影，同时播回位位移 —— W/S 单步切换时能完整看到
    // "变成未选中"的过程。
    // 注意：不再对所有离场卡一刀切加 .is-exiting（那会连收色动画一起禁掉）。
    // 同行快速往返（WS 同帧 up+down、长按绕回同一行）导致两张同位置卡片
    // 满宽黑底错位叠加的问题，改由 startSelect 在重新选中该行时，
    // 单独给那张旧卡补 .is-exiting 立即清零（见 startSelect）。
    card.classList.remove('selected', 'is-up');
    animateCard(card, from, rest);

    // 定时器到期只删卡片节点；is-lifted 的回收交给下一次 syncSelectionLift 的批量清除，
    // 避免旧定时器误删"期间被重新选中"行的遮罩 → 底层 ::before width:100% 暴露成全黑。
    // (生成机制:每行被选中时 __liftGen 递增,定时器只认启动时的代次)
    const gen = row ? row.__liftGen : 0;
    setTimeout(() => {
        card.remove();
        if (row && row.__liftGen === gen) {
            row.classList.remove('is-lifted');
        }
    }, timing.dur);
}

/** 收起当前选中项的动画（离场），并清空活动卡片 */
function deselectActive() {
    liftKey = '';
    if (!activeCard) return;
    startDeselect(activeCard, activeRow);
    activeCard = null;
    activeRow = null;
}

/**
 * 同步"选中项浮起"层。WSAD 走同一条路径：
 * - 选中：把行复制成卡片放进倾斜平面，落位后同帧开始"填充 + 抬起"；
 * - 取消选中：卡片落回、收色、收投影，然后淡出移除，行内容随之恢复。
 * 切换行时两者同时发生：上一行播反向、下一行播正向，形成完整的取消/选中动画。
 * 行列有 overflow 裁剪，行自己位移会被切掉，所以必须复制到平面外的浮层里移动。
 * @param {boolean} instant - 滚动中直接跟位，不重放动画
 */
function syncSelectionLift(instant = false) {
    const layer = document.getElementById('selection-lift');
    const list = els.childList;
    if (!layer || !list) return;

    if (!liftScrollBound) {
        liftScrollBound = true;
        list.addEventListener('scroll', () => syncSelectionLift(true), { passive: true });
    }

    const row = state.focusColumn === 'right' ? list.children[state.childIndex] : null;
    const isRow = !!row && row.classList.contains('list-item');

    if (!isRow) {
        deselectActive();
        return;
    }

    const relTop = row.offsetTop - list.scrollTop;
    if (relTop <= -row.offsetHeight || relTop >= list.clientHeight) {
        deselectActive();
        return;
    }

    const plane = syncLiftPlane(list, layer);

    // 滚动中：活动卡片直接跟位，不重放动画
    if (instant) {
        if (!activeCard) return;
        const geo = cardGeometry(row, list);
        activeCard.__rest = geo.rest;
        if (activeCard.style.transform === geo.lifted && !activeCard.__liftAnim) return;
        if (activeCard.__liftAnim) {
            activeCard.__liftAnim.cancel();
            activeCard.__liftAnim = null;
        }
        activeCard.style.transform = geo.lifted;
        return;
    }

    const key = `${renderToken}:${state.childIndex}`;
    if (key === liftKey) return;
    liftKey = key;

    const leavingRow = activeRow;

    // 上一行：交给离场动画，结束前不要动它的 is-lifted
    if (activeCard) {
        startDeselect(activeCard, activeRow);
        activeCard = null;
        activeRow = null;
    }
    Array.from(list.children).forEach((el) => {
        if (el !== row && el !== leavingRow) el.classList.remove('is-lifted');
    });

    // 选中代次递增：使此前针对该行启动的离场定时器作废（见 startDeselect）
    row.__liftGen = (row.__liftGen || 0) + 1;
    row.classList.add('is-lifted');
    activeCard = startSelect(row, list, plane);
    activeRow = row;
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
        els.keyHints.nav.textContent = `[NAV] ${t('hint.browse')}`;
        els.keyHints.enter.textContent = `[${getChar('NAV_CONFIRM')}] ${t('hint.open')}`;
        els.keyHints.back.textContent = `[ESC] ${t('hint.back')}`;
    } else {
        // At search root
        els.keyHints.nav.textContent = '[NAV] --';

        if (state.focusColumn === 'right') {
            els.keyHints.enter.textContent = `[${getChar('NAV_CONFIRM')}] ${t('hint.open')}`;
        } else {
            els.keyHints.enter.textContent = `[ENTER] ${t('hint.select')}`;
        }

        els.keyHints.back.textContent = `[ESC] ${t('hint.exit')}`;
    }
}
