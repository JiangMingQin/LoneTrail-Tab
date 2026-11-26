# CH3-Orange Tab 项目架构文档

## 项目概述

CH3-Orange Tab 是一个 Chrome 扩展新标签页应用，采用**双栏导航架构**：左侧圆形拨盘（Dial）展示书签层级，右侧列表展示子项。支持键盘导航、实时搜索、主题切换和自定义快捷键。

---

## 目录结构

```
CH3-Orange-Tab/
├── manifest.json         # Chrome 扩展核心配置 (V3)
├── newtab.html           # 新标签页入口文件
├── icons/                # 扩展图标 (16/32/48/128 PNG + SVG 源)
├── PROJECT_DOCS.md       # 项目架构文档
├── README.md             # 开源说明文档
├── css/                  # 样式层
│   ├── variables.css     # 全局变量 (字体、主题颜色)
│   ├── base.css          # Reset 与基础样式
│   ├── layout.css        # 核心布局 (TopBar, MainContainer)
│   ├── dial.css          # 左侧轮盘样式与动画
│   ├── list.css          # 右侧列表样式
│   └── modules/          # 独立组件样式
│       ├── clock.css     # 时钟组件
│       ├── modal.css     # 设置弹窗
│       └── search.css    # 搜索框样式
└── js/                   # 逻辑层 (ES Modules)
    ├── features/         # 特定功能模块
    │   ├── navigation.js # 导航功能逻辑
    │   └── search.js     # 搜索功能逻辑
    ├── actions.js        # 动作调度器
    ├── background.js     # 动态 SVG 背景生成
    ├── clock.js          # 时钟模块
    ├── events.js         # 全局事件监听器
    ├── main.js           # 程序入口
    ├── render.js         # UI 渲染引擎
    ├── state.js          # 状态管理器
    └── utils.js          # 工具函数库
```

---

## 核心架构

### 1. 状态管理 (State Management)

**文件**: `js/state.js`

采用**集中式状态管理**，所有组件共享单一状态对象。

#### 核心状态结构

| 属性 | 类型 | 说明 |
|------|------|------|
| `rootParents` | Array | 原始根书签数据（搜索数据源，永不修改） |
| `parents` | Array | 当前左侧拨盘显示的数据 |
| `currentChildren` | Array | 当前右侧列表显示的数据 |
| `parentIndex` | Number | 左侧选中项索引 |
| `childIndex` | Number | 右侧选中项索引 |
| `focusColumn` | String | 当前焦点列: `'left'` \| `'right'` \| `'search-input'` |
| `navStack` | Array | 导航历史栈（用于返回操作） |
| `searchMode` | Boolean | 是否处于搜索模式 |
| `searchQuery` | String | 当前搜索词 |
| `config` | Object | 用户配置（偏好设置 + 按键绑定） |

#### 关键设计原则

1. **rootParents 不变性**: `rootParents` 保存初始书签树，作为搜索的数据源。`parents` 可以被修改（如下钻文件夹），但 `rootParents` 永远保持原始数据。

2. **navStack 导航栈**: 使用栈结构记录导航历史，支持无限层级的返回操作。每个栈帧保存完整的状态快照。

3. **持久化配置**: 使用 `localStorage` 保存用户配置，加载时与默认值深度合并，确保兼容性。

---

### 2. 动作系统 (Action System)

**文件**: `js/actions.js`

采用**命令模式**解耦用户输入与业务逻辑。根据 `searchMode` 状态分发到不同处理器。

#### 动作分类

| 动作 | 模式 | 说明 |
|------|------|------|
| `NAV_UP` / `NAV_DOWN` | 通用 | 在当前列移动焦点 |
| `NAV_LEFT` / `NAV_BACK` | 通用 | 返回上级或左列 |
| `NAV_RIGHT` | 通用 | 进入文件夹或右列 |
| `NAV_CONFIRM` | 通用 | 打开链接或进入文件夹 |
| `SEARCH_ACTIVATE` | 通用 | 聚焦搜索框 |
| `SEARCH_EXIT` | 搜索 | 退出搜索模式 |
| `SEARCH_FOCUS_LIST` | 搜索 | 从输入框移到结果列表 |
| `RUN_SEARCH` | 搜索 | 执行搜索查询 |
| `SET_FOCUS` | 通用 | 直接设置焦点位置 |

---

### 3. 功能模块 (Features)

#### 3.1 导航功能 (navigation.js)

**核心职责**: 处理所有焦点移动和层级导航

| 方法 | 说明 |
|------|------|
| `moveFocus(direction)` | 在当前列上下移动焦点 |
| `setFocus(col, index)` | 设置焦点到指定列和索引 |
| `navigateBack()` | 统一返回（搜索根→退出搜索 / 栈内有数据→出栈 / 根层右列→切回左列） |
| `enterFolderOnly()` | 仅进入文件夹（不打开链接） |
| `executeItem()` | 执行选中项（链接打开/文件夹进入） |
| `_drillDown(folder)` | 下钻到文件夹（保存状态到栈） |

**统一导航逻辑**: 无论当前是"普通书签层级"还是"搜索结果"，`moveFocus` 都统一操作 `parents` 或 `currentChildren` 数组。不区分数据源，只关注视图状态。

#### 3.2 搜索功能 (search.js)

**核心职责**: 管理搜索生命周期和结果展示

**关键设计**:

| 特性 | 说明 |
|------|------|
| **焦点管理** | 搜索后焦点保留在输入框，不自动跳到结果。用户需按 `Enter`/`↓` 显式转移焦点，避免打断输入 |
| **navStack 处理** | 首次搜索保存基线状态，后续搜索截断栈，退出时恢复到基线 |
| **空查询处理** | 清空搜索框时显示 "SEARCHING..." 占位，而非退出搜索模式 |

#### 3.3 快捷栏算法 (features/algorithm.js)

**核心职责**: 维护自适应快捷栏 `QUICK_START` 的条目与排序，采用 **Frecency**（频率 × 时间衰减）模型，兼顾"常用"与"近期"，替代了早期的 SASA 算法。

##### 虚拟节点协议

`QUICK_START` 不是真实书签，而是 `main.js` 在 `chrome.bookmarks.getTree()` 结果**之前**注入的虚拟节点：

| 字段 | 值 | 说明 |
|------|-----|------|
| `id` | `'QUICK_START'` | 虚拟节点专用标识，也是各模块识别它的唯一依据 |
| `title` | `'QUICK_START'` | 直接作为拨盘项文案 |
| `isVirtual` | `true` | 下钻时跳过 `chrome.bookmarks.getSubTree()` 请求 |
| `children` | `[]` | 启动时为空，**实际内容每次由 `Frecency.getShortcuts()` 实时计算** |

因此它固定占据拨盘首位，内容随点击行为自动更新，且不写入用户书签树。

##### 数据结构

运行状态存在 `state.frecency`，随 `saveConfig()` 一起写入 `ch3orange_config`：

| 字段 | 类型 | 说明 |
|------|------|------|
| `version` | Number | 结构版本号（当前 `1`），用于未来迁移 |
| `scores` | Object | 分数池 `{ bookmarkId: score }`，容量上限 `POOL_LIMIT = 50` |
| `lastVisit` | Object | 最近点击时间戳 `{ bookmarkId: timestamp }`，仅用于同分排序 |

##### 评分模型

`update(clickedId)` 中完成一次结算：

```
score = score × 2^(−Δt / halfLife) + 1
```

| 符号 | 含义 |
|------|------|
| `Δt` | 距上次点击的天数，即 `(now − lastVisit) / 86400000` |
| `halfLife` | 半衰期（天），取 `preferences.frecencyHalfLifeDays`，默认 7，设置面板可调 3–30 |

**四个关键约定**：

1. **惰性衰减 (lazy decay)**：没有定时器，衰减只在"下一次点击该条目"时一次性结算。长期未点击的条目分数停在旧值，但因为不会被加分，相对排序依然成立。
2. **半衰期语义**：闲置一个半衰期，旧分数减半。`halfLife` 越长越"念旧"，越短越"追新"。
3. **容量淘汰**：新 ID 入池且池已满（50）时，`_ensurePoolSpace()` 删除当前最低分条目，保证内存与持久化体积有界。
4. **仅统计真实书签**：`executeItem()` 中只有 `id` 存在且不以 `search-` 开头的节点才计分，避免搜索结果伪节点污染数据池。

##### 排序与取数

`getShortcuts()` 返回可直接渲染的完整书签对象数组：

| 步骤 | 说明 |
|------|------|
| 排序 | `score` 降序；同分时按 `lastVisit` 降序（更近者优先） |
| 截断 | 取前 `preferences.quickLaunchMax` 条，默认 7，设置面板可调 3–12 |
| 还原 | `_findBookmarkById()` 从 `rootParents` 递归找回完整节点；已删除书签返回 `null`，由 `filter(Boolean)` 剔除 |

复杂度 `O(n × k)`（`n` 为书签总数，`k` 为快捷栏条数 ≤ 12），每次渲染现算，不做额外缓存。

##### 同步约定

`QUICK_START.children` 是派生数据，目前在三处按需刷新。新增渲染路径时应沿用同一模式，不要把它当静态数据缓存：

| 位置 | 时机 |
|------|------|
| `render.js` → `renderChildrenDOM()` | 渲染前，若当前父项是 `QUICK_START` |
| `navigation.js` → `_drillDown()` | 下钻进入 `QUICK_START` 之前 |
| `search.js` → `_refreshQuickStart()` | 执行搜索前，保证快捷栏条目能被搜索命中 |

##### 历史与迁移

早期 SASA 算法的运行数据（`algorithm` 字段）与配置项（`deathThreshold` / `halfLife` / `anchorCount`）会在 `loadConfig()` 时被识别并丢弃，避免两套模型混算；`rhine_config` / `lonetrail_config` 两个旧存储键也会按序自动迁移到 `ch3orange_config`。

---

### 4. 渲染系统 (Render System)

**文件**: `js/render.js`

采用**增量更新策略**，区分完整渲染和局部更新。

| 函数 | 用途 |
|------|------|
| `fullRender()` | 完整重绘（初始化、模式切换） |
| `updateCursor()` | 轻量更新（仅更新光标位置） |
| `renderDialDOM()` | 重建左侧拨盘 DOM |
| `updateDialStyles()` | 更新拨盘项位置和样式 |
| `renderChildrenDOM()` | 重建右侧列表 DOM |
| `updateKeyHints()` | 更新底部按键提示 |

#### 拨盘布局算法

左侧拨盘采用**圆形布局**，选中项位于左侧中央，其他项按角度分布。

| 常量 | 值 | 说明 |
|------|-----|------|
| `DIAL_RADIUS` | 850 | 圆弧半径（像素） |
| `ITEM_ANGLE_GAP` | 7 | 项间角度（度） |

**特性**: 支持循环导航、透明度衰减、z-index 层级、pointer-events 控制。

---

### 5. 事件系统 (Event System)

**文件**: `js/events.js`

| 初始化函数 | 职责 |
|-----------|------|
| `initKeyboardEvents()` | 全局键盘事件（含优先级处理） |
| `initSearchEvents()` | 搜索框输入和聚焦事件 |
| `initDialEvents()` | 拨盘点击和滚轮事件 |
| `initContentEvents()` | 内容区点击事件 |
| `initSettingsModal()` | 设置弹窗控制 |
| `initThemeSwitcher()` | 主题切换按钮 |

**键盘事件优先级**: 按键录制模式 > 输入框聚焦 > 全局导航

**滚轮防抖**: 使用 `WHEEL_DEBOUNCE_MS = 40` 避免触发过快。

---

### 6. 背景系统 (Background System)

**文件**: `js/background.js`

动态生成 SVG 等高线背景，营造地形图效果。

| 步骤 | 说明 |
|------|------|
| **形状种子** | 每组生成 16 个随机偏移量，确保同心环形状一致 |
| **非均匀间距** | 间距随机（0.4x-1.5x 基础间距），创造自然松紧感 |
| **贝塞尔平滑** | 使用 Catmull-Rom 样条算法生成平滑曲线 |
| **透明度渐变** | 内环逐渐透明（opacity 1 → 0.4） |

**防交叉保证**: 所有环共享相同的形状种子，仅半径不同，确保同心环永不相交。

---

### 7. 工具函数 (Utils)

**文件**: `js/utils.js`

| 函数 | 用途 |
|------|------|
| `escapeHtml()` | XSS 防护，转义 HTML 特殊字符 |
| `truncateText()` | 截断长文本并添加省略号 |
| `debounce()` | 防抖函数，用于高频事件 |
| `applyTheme()` | 应用主题（设置 data-theme 属性） |
| `filterBookmarks()` | 递归搜索书签树，支持标题和 URL 匹配 |

**搜索匹配规则**: 标题包含 或 URL 包含（不区分大小写），返回扁平化结果数组。

**遍历与去重**: 遇到 `isVirtual` 节点（如 `QUICK_START`）整棵子树跳过——它只是真实书签的派生视图，遍历它会让同一书签命中两次；命中项再按「标题 + URL」去重，同一站点被重复收藏时只保留首条，标题不同则各自保留。

---

## 扩展开发指南

### 添加新动作

1. 在 `state.js` 的 `DEFAULT_KEYS` 中添加默认按键绑定
2. 在 `actions.js` 的两个分发器中添加 case 处理
3. 在对应 Feature 中实现业务逻辑
4. 在 `render.js` 的 `updateKeyHints` 中添加提示文本

### 修改搜索行为

- 修改过滤算法：调整 `utils.js` 的 `filterBookmarks`
- 修改结果展示：调整 `search.js` 的 `_executeSearch`
- 修改焦点行为：调整 `focusList` 和 `_executeSearch` 中的 `focusColumn` 设置

### 添加新设置项

1. 在 `state.js` 的 `DEFAULT_CONFIG.preferences` 中添加默认值
2. 在 `events.js` 的 `openSettingsModal` 中添加 UI 控件加载
3. 在 `events.js` 的 `saveSettings` 中添加保存逻辑
4. 在 `events.js` 的 `applyVisualChanges` 中添加实时应用逻辑

---

## 性能优化点

| 优化点 | 说明 |
|--------|------|
| **防抖处理** | 滚轮事件、窗口 resize 使用防抖 |
| **增量渲染** | `updateCursor` 仅更新必要部分，而非全量重绘 |
| **背景缓存** | 窗口 resize 结束后才重绘背景（非连续重绘） |
| **可选链优化** | 使用 `?.` 减少冗余的空值检查代码 |

---

## 兼容性说明

| 特性 | 说明 |
|------|------|
| **Chrome 扩展 API** | 使用 `chrome.bookmarks` API 读取书签，失败时回退到演示数据 |
| **ES Modules** | 使用原生 ES Module，无需打包工具 |
| **CSS 变量** | 使用 CSS 自定义属性实现主题切换，不支持 IE |