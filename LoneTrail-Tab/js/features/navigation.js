import { state } from '../state.js';
import { fullRender, updateCursor } from '../render.js';
import { Frecency } from './algorithm.js';

/**
 * Navigation feature - handles focus movement, drill-down, and back navigation
 * Works uniformly across normal and search modes
 */
export const NavigationFeature = {
    /**
     * Moves focus up or down in current column
     * Works on parents (left) or currentChildren (right) regardless of mode
     */
    moveFocus(direction) {
        const listLen = state.focusColumn === 'left' 
            ? state.parents.length 
            : state.currentChildren.length;

        if (listLen === 0) return;

        const indexKey = state.focusColumn === 'left' ? 'parentIndex' : 'childIndex';

        if (direction === 'up') {
            state[indexKey] = (state[indexKey] - 1 + listLen) % listLen;
        } else if (direction === 'down') {
            state[indexKey] = (state[indexKey] + 1) % listLen;
        }

        updateCursor();
    },

    /**
     * Sets focus to specific column and index
     * Resets childIndex when switching to left column
     */
    setFocus(col, index) {
        state.focusColumn = col;

        if (col === 'left') {
            state.parentIndex = index;
            state.childIndex = 0;
        } else {
            state.childIndex = index;
        }

        updateCursor();
    },

    /**
     * Handles back navigation
     * - Right column: move to left column
     * - Left column: pop from navStack (with search mode protection)
     */
    navigateBack() {
        // From right column: just move focus to left
        if (state.focusColumn === 'right') {
            this.setFocus('left', state.parentIndex);
            return;
        }

        // From left column: restore previous state from stack
        if (state.navStack.length === 0) return;

        const lastState = state.navStack[state.navStack.length - 1];

        // In search mode, prevent exiting search via back key at root
        // Must use SEARCH_EXIT action instead
        if (state.searchMode && !lastState.searchMode) {
            return;
        }

        const s = state.navStack.pop();
        Object.assign(state, {
            parents: s.parents,
            parentIndex: s.parentIndex,
            currentChildren: s.currentChildren,
            childIndex: s.childIndex,
            focusColumn: 'left',
            searchMode: s.searchMode,
        });

        fullRender();
    },

    /**
     * Enters a folder (NAV_RIGHT action)
     * If on left column, just moves to right column
     */
    async enterFolderOnly() {
        if (state.focusColumn === 'left') {
            this.setFocus('right', 0);
            return;
        }

        const item = state.currentChildren[state.childIndex];
        if (!item || item.url) return;

        await this._drillDown(item);
    },

    /**
     * Executes the selected item (NAV_CONFIRM action)
     * - URL: navigate or open in new tab
     * - Folder: drill down into it
     */
    async executeItem() {
        if (state.focusColumn === 'left') {
            this.setFocus('right', 0);
            return;
        }

        const item = state.currentChildren[state.childIndex];
        if (!item) return;

        if (item.url) {
            // [核心修改] 只有是有效的 URL 点击才触发算法更新
            // 排除虚拟节点 ID 或非书签项（视你的具体 ID 分配而定）
            if (item.id && !item.id.startsWith('search-')) {
                Frecency.update(item.id);
            }

            this._openUrl(item.url);
        } else {
            await this._drillDown(item);
        }
    },

    /** Opens URL in current or new tab based on preference */
    _openUrl(url) {
        const openNew = state.config.preferences.openNewTab;
        if (openNew) {
            window.open(url, '_blank');
        } else {
            // 某些情况下 window.location 在扩展中受限，建议优先使用 chrome.tabs
            if (typeof chrome !== 'undefined' && chrome.tabs) {
                chrome.tabs.update({ url: url });
            } else {
                window.location.href = url;
            }
        }
    },

    /**
     * Drills down into a folder
     * Pushes current state to navStack, then enters folder
     */
    async _drillDown(folderNode) {
        // [新增] 特殊逻辑：如果进入的是 QUICK_START 虚拟文件夹
        // 我们需要确保其 children 是实时的
        if (folderNode.id === 'QUICK_START') {
            folderNode.children = Frecency.getShortcuts();
        }

        state.navStack.push({
            parents: state.parents,
            parentIndex: state.parentIndex,
            currentChildren: state.currentChildren,
            childIndex: state.childIndex,
            focusColumn: state.focusColumn,
            searchMode: state.searchMode,
        });

        state.parents = state.currentChildren;
        state.parentIndex = state.childIndex;

        // 加载子项
        let newChildren = folderNode.children;
        
        // 如果是普通书签文件夹且没有缓存子项，则请求 API
        if (!newChildren && !folderNode.isVirtual && typeof chrome !== 'undefined' && chrome.bookmarks) {
            const sub = await chrome.bookmarks.getSubTree(folderNode.id);
            newChildren = sub[0]?.children;
        }

        state.currentChildren = newChildren || [];
        state.childIndex = 0;
        state.focusColumn = 'right';

        fullRender();
    },

    /**
     * Navigates back to the previous level
     */
    // navigation.js 
    navigateBack() {
        // 情况 A：如果在子文件夹内部（栈内有数据），执行正常的出栈回退
        if (state.navStack.length > 0) {
            const prevState = state.navStack.pop();
            Object.assign(state, prevState);
            fullRender();
            return;
        }

        // 情况 B：如果在根目录（拨盘层），且焦点在右侧
        if (state.focusColumn === 'right') {
            // [修复点]：仅仅切换焦点到左侧，不执行任何 pop 操作
            state.focusColumn = 'left';
            state.childIndex = 0; // 重置子项索引，确保下次进入从头开始
            updateCursor(); // 触发 render.js 刷新，移除右侧 selected 高亮
        }
    }
};
