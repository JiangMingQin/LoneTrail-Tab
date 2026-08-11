import { state } from './state.js';
import { NavigationFeature } from './features/navigation.js';
import { SearchFeature } from './features/search.js';

/**
 * Action dispatcher for application events
 * Routes actions to appropriate features based on current mode (normal/search)
 */
export const Actions = {
    /**
     * Dispatches an action to the appropriate handler
     * @param {string} actionId - Action identifier (e.g., 'NAV_UP', 'SEARCH_ACTIVATE')
     * @param {*} payload - Optional action data
     */
    dispatch(actionId, payload = null) {
        if (state.searchMode) {
            return this._dispatchSearchMode(actionId, payload);
        }
        return this._dispatchNormalMode(actionId, payload);
    },

    /** Normal mode action handlers */
    _dispatchNormalMode(actionId, payload) {
        switch (actionId) {
            // Navigation
            case 'NAV_UP':      return NavigationFeature.moveFocus('up');
            case 'NAV_DOWN':    return NavigationFeature.moveFocus('down');
            case 'NAV_LEFT':
            case 'NAV_BACK':    return NavigationFeature.navigateBack();
            case 'NAV_RIGHT':   return NavigationFeature.enterFolderOnly();
            case 'NAV_CONFIRM': return NavigationFeature.executeItem();

            // Search
            case 'SEARCH_ACTIVATE': return SearchFeature.activate();
            case 'RUN_SEARCH':      return SearchFeature.run(payload);

            // Direct focus manipulation
            case 'SET_FOCUS':       return NavigationFeature.setFocus(payload?.col, payload?.index);
        }
    },

    /** Search mode action handlers */
    _dispatchSearchMode(actionId, payload) {
        switch (actionId) {
            // Navigation (works on search results)
            case 'NAV_UP':      return NavigationFeature.moveFocus('up');
            case 'NAV_DOWN':    return NavigationFeature.moveFocus('down');
            case 'NAV_RIGHT':   return NavigationFeature.enterFolderOnly();
            case 'NAV_CONFIRM': return NavigationFeature.executeItem();

            // Back navigation exits search or goes back in history
            case 'NAV_LEFT':
            case 'NAV_BACK':    return NavigationFeature.navigateBack();

            // Search controls
            case 'SEARCH_ACTIVATE':   return SearchFeature.activate(); // Re-focus search input
            case 'SEARCH_EXIT':
            case 'SEARCH_EXIT_FORCE': return SearchFeature.exit();
            case 'SEARCH_FOCUS_LIST': return SearchFeature.focusList();
            case 'RUN_SEARCH':        return SearchFeature.run(payload);

            // Direct focus manipulation
            case 'SET_FOCUS':         return NavigationFeature.setFocus(payload?.col, payload?.index);
        }
    }
};