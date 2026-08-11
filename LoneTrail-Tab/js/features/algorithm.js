/**
 * Frecency - 频率 × 时间衰减的自适应快捷栏算法
 *
 * 受 Firefox 书签 Frecency 启发：分数随使用次数累积，随闲置时间指数衰减。
 * QUICK_START 快捷栏按分数降序展示，兼顾"常用"与"近期"，
 * 避免纯 MRU 滑动窗口那样仅由最近点击顺序决定。
 */

import { state, saveConfig } from '../state.js';

/** 毫秒/天，用于计算闲置天数 */
const MS_PER_DAY = 86400000;

export const Frecency = {
    /** 活跃池上限：超过后淘汰分数最低的条目 */
    POOL_LIMIT: 50,

    /**
     * 记录一次点击并更新分数
     * @param {string} clickedId - 被点击的书签 ID
     */
    update(clickedId) {
        if (!clickedId) return;

        const frecency = state.frecency;
        const halfLifeDays = state.config.preferences.frecencyHalfLifeDays || 7;
        const now = Date.now();

        // 1. 确保活跃池容量：新 ID 且池已满时，淘汰分数最低者
        this._ensurePoolSpace(clickedId);

        // 2. 应用时间衰减并累加 1 分
        //    score = score * 2^(-dt/halfLifeDays) + 1
        const lastVisit = frecency.lastVisit[clickedId];
        const dt = lastVisit ? (now - lastVisit) / MS_PER_DAY : 0;
        const decay = Math.pow(2, -dt / halfLifeDays);
        frecency.scores[clickedId] = (frecency.scores[clickedId] || 0) * decay + 1;
        frecency.lastVisit[clickedId] = now;

        // 3. 持久化
        saveConfig();
    },

    /**
     * 获取当前快捷方式对应的完整书签对象列表
     * 按分数降序排列，分数相同按最近点击优先
     */
    getShortcuts() {
        const frecency = state.frecency;
        const max = state.config.preferences.quickLaunchMax || 7;

        const ranked = Object.keys(frecency.scores)
            .map(id => ({
                id,
                score: frecency.scores[id],
                lastVisit: frecency.lastVisit[id] || 0,
            }))
            .sort((a, b) => b.score - a.score || b.lastVisit - a.lastVisit)
            .slice(0, max);

        return ranked
            .map(item => this._findBookmarkById(state.rootParents, item.id))
            .filter(Boolean);
    },

    /** 确保活跃池容量：新 ID 且池已满时，淘汰分数最低者 */
    _ensurePoolSpace(newId) {
        const frecency = state.frecency;
        if (frecency.scores[newId] !== undefined) return;

        const keys = Object.keys(frecency.scores);
        if (keys.length >= this.POOL_LIMIT) {
            let minScore = Infinity;
            let target = null;
            keys.forEach((key) => {
                if (frecency.scores[key] < minScore) {
                    minScore = frecency.scores[key];
                    target = key;
                }
            });
            if (target) {
                delete frecency.scores[target];
                delete frecency.lastVisit[target];
            }
        }
        frecency.scores[newId] = 0;
    },

    /** 递归从书签树中查找完整节点 */
    _findBookmarkById(nodes, id) {
        for (const node of nodes) {
            if (node.id === id) return node;
            if (node.children) {
                const found = this._findBookmarkById(node.children, id);
                if (found) return found;
            }
        }
        return null;
    },
};
