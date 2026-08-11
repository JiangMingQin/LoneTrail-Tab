/**
 * SASA - Self-Bootstrapping Adaptive Shortcut Algorithm
 * 自适应锚点快捷栏算法 - 莱茵生命科学实验室专用版
 */

import { state, saveConfig } from '../state.js';

export const Algorithm = {
    // 算法内部常量 (可根据设想微调)
    POOL_LIMIT: 20,         // 算力分配上限（活跃池大小）
    BOOTSTRAP_CV_THRES: 0.5, // 变异系数阈值 (std/mean)
    MIN_MAX_WEIGHT: 3,      // 最小的最大权重进入稳定期

    /**
     * 更新权重的主函数
     * @param {string} clickedId - 被点击的书签 ID
     */
    update(clickedId) {
        const alg = state.algorithm;
        const prefs = state.config.preferences;
        
        // 1. 确保活跃池：如果是不在池中的新 ID 且池已满，剔除权重最低的
        this._ensurePoolSpace(clickedId);

        // 2. 推进时间并应用衰减
        if (alg.phase === 'BOOTSTRAP') {
            this._updateBootstrap(clickedId, prefs);
        } else {
            this._updateStable(clickedId, prefs);
        }

        // 3. 习惯模式维护：更新 shortcuts 列表
        this._updateShortcuts(clickedId, prefs.quickLaunchMax);

        // 4. 阶段检查：是否从启动期进入稳定期
        if (alg.phase === 'BOOTSTRAP') {
            this._checkPhaseTransition(prefs);
        } else {
            this._checkAnchorRotation(prefs);
        }

        // 5. 资源回收：清理“死亡”URL
        this._garbageCollection(prefs.deathThreshold);

        // 持久化
        saveConfig();
    },

    /** 获取当前快捷方式对应的完整书签对象列表 */
    getShortcuts() {
        const alg = state.algorithm;
        // 递归从 rootParents 中找对应的节点
        return alg.shortcuts.map(id => this._findBookmarkById(state.rootParents, id)).filter(Boolean);
    },

    // --- 核心子模块 ---

    /** 启动期更新逻辑：每次点击推进时间 */
    _updateBootstrap(clickedId, prefs) {
        const alg = state.algorithm;
        alg.totalClicks += 1;
        alg.t += 1;

        const lambda = Math.log(2) / prefs.halfLife;
        const decay = Math.exp(-lambda);

        // 全量衰减
        for (let id in alg.weights) {
            alg.weights[id] *= decay;
        }
        // 被点击者加 1
        alg.weights[clickedId] = (alg.weights[clickedId] || 0) + 1;
    },

    /** 稳定期更新逻辑：锚点时间映射 */
    _updateStable(clickedId, prefs) {
        const alg = state.algorithm;
        const isAnchor = alg.anchors.includes(clickedId);

        // 计算当前锚点点击率估计 alpha
        // alpha = 锚点总点击 / 总点击
        const alpha = alg.alpha || 0.2;
        const lambdaA = (Math.log(2) / prefs.halfLife) / alpha;
        const decayA = Math.exp(-lambdaA);

        if (isAnchor) {
            alg.t += 1;
            alg.anchorClicks += 1;
            // 只有点击锚点时，全量衰减
            for (let id in alg.weights) {
                alg.weights[id] *= decayA;
            }
        }

        // 无论是否点击锚点，被点击者权值自增 1
        alg.weights[clickedId] = (alg.weights[clickedId] || 0) + 1;
    },

    /** 检查是否进入稳定期 */
    _checkPhaseTransition(prefs) {
        const alg = state.algorithm;
        const weights = Object.values(alg.weights);
        if (weights.length < 2) return;

        // 计算变异系数 (std / mean)
        const mean = weights.reduce((a, b) => a + b, 0) / weights.length;
        const squareDiffs = weights.map(w => Math.pow(w - mean, 2));
        const std = Math.sqrt(squareDiffs.reduce((a, b) => a + b, 0) / weights.length);
        const cv = std / mean;

        const maxW = Math.max(...weights);

        // 条件：变异系数 > 0.5 且 总点击 > 功能数*2 且 最大权重 > 3
        if (cv > this.BOOTSTRAP_CV_THRES && 
            alg.totalClicks > weights.length * 2 && 
            maxW > this.MIN_MAX_WEIGHT) {
            
            alg.phase = 'STABLE';
            alg.alpha = alg.anchorClicks / alg.totalClicks || 0.2;
            this._refreshAnchors(prefs.anchorCount);
            console.log("SASA: Entering STABLE phase.");
        }
    },

    /** 习惯模式：新进入者插队首，满则移除队尾 */
    _updateShortcuts(id, max) {
        const alg = state.algorithm;
        const idx = alg.shortcuts.indexOf(id);
        
        if (idx !== -1) {
            // 已存在，不调整位置（保护肌肉记忆），只更新权重
            return;
        }

        // 新进入
        alg.shortcuts.unshift(id);
        if (alg.shortcuts.length > max) {
            alg.shortcuts.pop();
        }
    },

    /** 清理死亡 URL，释放算力 */
    _garbageCollection(threshold) {
        const alg = state.algorithm;
        for (let id in alg.weights) {
            // 只有非锚点且权重低于阈值才会被物理抹除
            if (alg.weights[id] < threshold && !alg.anchors.includes(id)) {
                delete alg.weights[id];
                delete alg.lastClick[id];
            }
        }
    },

    /** 确保活跃池容量 */
    _ensurePoolSpace(newId) {
        const alg = state.algorithm;
        if (alg.weights[newId] !== undefined) return;

        const keys = Object.keys(alg.weights);
        if (keys.length >= this.POOL_LIMIT) {
            // 找到权重最小的踢出
            let minW = Infinity;
            let target = null;
            keys.forEach(k => {
                if (alg.weights[k] < minW && !alg.anchors.includes(k)) {
                    minW = alg.weights[k];
                    target = k;
                }
            });
            if (target) delete alg.weights[target];
        }
        alg.weights[newId] = 0;
    },

    _refreshAnchors(count) {
        const alg = state.algorithm;
        const sorted = Object.keys(alg.weights).sort((a, b) => alg.weights[b] - alg.weights[a]);
        alg.anchors = sorted.slice(0, count);
    },

    _checkAnchorRotation(prefs) {
        const alg = state.algorithm;
        // 每隔一定周期间歇性更新锚点，防止抖动
        if (alg.anchorClicks % (prefs.halfLife * 2) === 0) {
            this._refreshAnchors(prefs.anchorCount);
        }
    },

    _findBookmarkById(nodes, id) {
        for (const node of nodes) {
            if (node.id === id) return node;
            if (node.children) {
                const found = this._findBookmarkById(node.children, id);
                if (found) return found;
            }
        }
        return null;
    }
};