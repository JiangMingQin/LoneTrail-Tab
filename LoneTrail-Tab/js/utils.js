/**
 * Utility Functions
 */

/** Escapes HTML to prevent XSS attacks */
export function escapeHtml(unsafe) {
    if (!unsafe) return '';
    return unsafe
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

/** Truncates text to max length with ellipsis */
export function truncateText(text, maxLength) {
    if (!text) return '';
    return text.length <= maxLength ? text : text.slice(0, maxLength) + '...';
}

/**
 * Debounces function execution
 * Use case: scroll, resize, input events
 * @param {Function} func - Function to debounce
 * @param {number} wait - Delay in milliseconds
 */
export function debounce(func, wait) {
    let timeout;
    return function (...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
}

/**
 * Applies theme by setting data-theme attribute
 * CSS variables respond to [data-theme="dark|light"]
 */
export function applyTheme(themeName) {
    document.documentElement.setAttribute('data-theme', themeName);
}

/**
 * Recursively searches bookmark tree for matching nodes
 * TODO: Exclude root containers (id: '0', 'root') from results
 * @param {Array} nodes - Bookmark nodes to search
 * @param {string} query - Search keyword
 * @returns {Array} Flat array of matching nodes
 */
export function filterBookmarks(nodes, query) {
    if (!nodes?.length) return [];

    const results = [];
    const lowerQuery = query.toLowerCase();

    const search = (nodeList) => {
        for (const node of nodeList) {
            const titleMatch = node.title?.toLowerCase().includes(lowerQuery);
            const urlMatch = node.url?.toLowerCase().includes(lowerQuery);

            if (titleMatch || urlMatch) {
                results.push(node);
            }

            if (node.children?.length) {
                search(node.children);
            }
        }
    };

    search(nodes);
    return results;
}