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
    const seen = new Set();
    const lowerQuery = query.toLowerCase();

    const search = (nodeList) => {
        for (const node of nodeList) {
            // 虚拟文件夹（如 QUICK_START）只是真实书签的派生视图，其子项在书签树中
            // 已有对应节点。继续遍历会让同一书签命中两次，故整棵子树跳过
            if (node.isVirtual) continue;

            const titleMatch = node.title?.toLowerCase().includes(lowerQuery);
            const urlMatch = node.url?.toLowerCase().includes(lowerQuery);

            if (titleMatch || urlMatch) {
                // 同一站点可能被重复收藏（同标题同 URL），结果里合并为一条；
                // 标题不同则保留，用户仍可区分
                const dedupeKey = node.url ? `${node.title || ''}|${node.url}` : null;

                if (!dedupeKey) {
                    results.push(node);
                } else if (!seen.has(dedupeKey)) {
                    seen.add(dedupeKey);
                    results.push(node);
                }
            }

            if (node.children?.length) {
                search(node.children);
            }
        }
    };

    search(nodes);
    return results;
}
