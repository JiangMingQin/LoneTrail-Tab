# 修改日志 (Changelog)

本项目以 GitHub 仓库版本（v0.9.x）为最早基线，当前版本为 **1.0.0-beta**（扩展清单版本号使用 `1.0.0`）。

## [1.0.0-beta] - 2026-08-12

### 新增 (Added)
- **Frecency 自适应快捷栏算法**（替代 SASA）：频率 × 时间衰减评分，活跃池上限 50，半衰期默认 7 天，QUICK_START 按分数降序展示。
- **亮色地形背景**：多频正弦高度场 + 3–4 个随机锚点（最小间距约束、允许轻微出屏）+ Marching Squares 精确提取 12 层等高线，Canvas 2D 渲染（中等灰度细线）。
- **暗色星空主题**：深蓝夜空 `#0A0F22` + JS 随机星场，夜蓝银白配色。
- **主题切换过渡**：从点击处圆形扩散（View Transitions API），支持 `prefers-reduced-motion` 降级与失败兜底。
- **设置弹窗新项**：主题分段控件（LIGHT/DARK）、Frecency 半衰期滑块（3–30 天）。
- **快捷键**：`TOGGLE_THEME`（T）、`OPEN_SETTINGS`（O）；`NAV_BACK`（Backspace）、`SEARCH_EXIT`（Esc）补入可自定义键位列表。
- **返回上一级按钮**（`<<`，等价 A 键回退），风格与顶栏扁平按钮一致。
- **焦点转移可视化**：左栏选中项随焦点列在"实色/描边"间切换，右栏选中为实色方块并带主分支式扫入动画。
- **MIT LICENSE** 与 git 版本管理（基线 tag、工作分支）。

### 变更 (Changed)
- 版本号统一为 1.0.0-beta（manifest 使用 `1.0.0`）。
- 界面视觉迭代：磨砂亚克力/液态玻璃 → 暖色玻璃面板 → iOS 扁平 → 磁带未来主义 → 尼尔单色（最终定位：亮色近白终端 + 暗色星空）。
- 设置弹窗重构：磨砂面板、方形直角、单栏布局（01 DISPLAY & LAUNCH / 02 KEY_MAPPING 双栏 / 03 SYSTEM）、分节数字主题色、滑动条主题配色。
- 顶部栏：背景透明、中段连线、扁平文字按钮（SETTING / 动态 LIGHT-DARK 标签）。
- 品牌命名：移除"莱茵生命/莱茵终端"，改用 LoneTrail / 复古终端（含 manifest、README、控制台信息与代码注释）。
- 无障碍：拨盘/列表项语义化（role/aria）、focus-visible、`prefers-reduced-motion`。

### 修复 (Fixed)
- 设置界面装饰字符（◆/✕）在字体缺失时显示为方框（乱码观感）。
- 亮色小字号绿色文字对比度不足（引入 `--accent-text`）。
- 背景层死代码（补 `#bg-layer`）、主题切换时背景即时重绘。
- 设置内切换主题后顶栏标签不更新（闭包作用域问题）。
- favicon 404 噪音、重复/冲突样式、未使用的导出与文件。

### 移除 (Removed)
- SASA 算法（数据自动迁移为 Frecency，旧 `rhine_config` 存储键迁移到 `lonetrail_config`）。
- 未实现的音效（`soundFx`）设置项。
- 冗余文件 `setting.json`、未使用导出（`truncateText`/`renderSearchResults`）、重复内联样式、失效的 nth-child 分栏规则。

---

## [0.9.x] - GitHub 原版（最早基线）

- 莱茵生命终端风格：双栏布局（左侧圆弧拨盘 + 右侧列表）、等高线 SVG 背景、明暗双主题。
- 全键盘操作（WASD/方向键）、层级书签导航、模糊搜索、时钟 HUD。
- SASA 快捷栏算法（后已替换为 Frecency）。
