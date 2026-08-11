import { state } from '../state.js';
import { fullRender, updateCursor } from '../render.js';
import { filterBookmarks } from '../utils.js';

/**
 * Search feature - handles search activation, execution, and result navigation
 */
export const SearchFeature = {
    /**
     * Activates search input
     * Behavior depends on clearSearchOnActivate preference:
     * - true: clear input for fresh search
     * - false: select all text for easy modification
     */
    activate() {
        const input = document.getElementById('top-search-input');
        if (!input) return;

        input.focus();

        const shouldClear = state.config.preferences.clearSearchOnActivate;
        if (shouldClear) {
            setTimeout(() => input.value = '', 0);
        } else {
            input.select();
        }
    },

    /**
     * Exits search mode and restores previous navigation state
     * Searches navStack to find the last non-search state
     */
    exit() {
        if (!state.searchMode) return;

        const preSearchState = this._findPreSearchState();

        if (preSearchState) {
            // Restore to state before search was activated
            Object.assign(state, preSearchState);
            const index = state.navStack.indexOf(preSearchState);
            if (index !== -1) {
                state.navStack = state.navStack.slice(0, index);
            }
        } else {
            // Fallback: reset to root if no pre-search state found
            this._resetToRoot();
        }

        this._clearInput();
        fullRender();
    },

    /** Finds the last non-search state in navStack */
    _findPreSearchState() {
        for (let i = state.navStack.length - 1; i >= 0; i--) {
            if (!state.navStack[i].searchMode) {
                return state.navStack[i];
            }
        }
        return null;
    },

    /** Resets navigation to root level */
    _resetToRoot() {
        state.searchMode = false;
        state.searchResults = [];
        state.searchQuery = '';
        state.parents = state.rootParents || [];
        state.parentIndex = 0;
        state.currentChildren = state.parents[0]?.children || [];
        state.focusColumn = 'left';
        state.navStack = [];
    },

    /** Clears and blurs search input */
    _clearInput() {
        const input = document.getElementById('top-search-input');
        if (input) {
            input.value = '';
            input.blur();
        }
    },

    /**
     * Executes search and updates view
     * - Empty query: shows empty search root
     * - With query: filters bookmarks and displays results
     * Focus remains on input until user explicitly moves to list
     */
    run(query) {
        if (!query) {
            this._showEmptySearchRoot();
            return;
        }

        this._prepareSearchState();
        this._executeSearch(query);
        fullRender();
    },

    /** Shows empty search state when query is cleared */
    _showEmptySearchRoot() {
        if (!state.searchMode) return;

        state.searchQuery = '';
        state.searchResults = [];
        state.parents = [{
            id: 'search-root',
            title: 'SEARCHING...',
            children: [],
            type: 'search-root',
        }];
        state.parentIndex = 0;
        state.currentChildren = [];
        state.childIndex = -1;
        state.focusColumn = 'search-input';
        fullRender();
    },

    /** Prepares navStack for new search or resets existing search stack */
    _prepareSearchState() {
        if (!state.searchMode) {
            // First search: save current state as baseline
            state.navStack.push({
                parents: state.parents,
                parentIndex: state.parentIndex,
                currentChildren: state.currentChildren,
                childIndex: state.childIndex,
                focusColumn: state.focusColumn,
                searchMode: false,
            });
            state.searchMode = true;
        } else {
            // Subsequent search: truncate stack to baseline
            const baseIndex = state.navStack.findIndex(s => !s.searchMode);
            if (baseIndex !== -1) {
                state.navStack = state.navStack.slice(0, baseIndex + 1);
            }
        }
    },

    /** Executes bookmark filtering and updates view state */
    _executeSearch(query) {
        state.searchQuery = query;
        const results = filterBookmarks(state.rootParents || [], query);
        state.searchResults = results;

        state.parents = [{
            id: 'search-root',
            title: 'SEARCH RESULTS',
            children: results,
            type: 'search-root',
        }];
        state.parentIndex = 0;
        state.currentChildren = results;

        // Keep focus on input, don't auto-select first result
        // User must explicitly press down/enter to move to list
        state.childIndex = -1;
        state.focusColumn = 'search-input';
    },

    /**
     * Transfers focus from search input to result list
     * Selects first item and blurs input for keyboard navigation
     */
    focusList() {
        if (!state.currentChildren?.length) return;

        state.focusColumn = 'right';
        state.childIndex = 0;

        const input = document.getElementById('top-search-input');
        if (input) input.blur();

        updateCursor();
    },
};