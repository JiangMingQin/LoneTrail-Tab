# 修改日志 (Changelog)

本项目以 GitHub 仓库版本（v0.9.x）为最早基线，当前版本为 **1.2.0**（扩展清单版本号同为 `1.2.0`）。

## [1.2.0] - 2026-11-26

整合原 `1.1.0-alpha` 预发布内容，并完成品牌更名与界面收尾。

### 新增 (Added)

- **扩展图标**：`icons/icon.svg`（橙 `#FF7300` 主圆，三个 `#3A3A3A` 灰圆按黄金比例 φ 递减半径、圆心 0°/120°/240° 均布，中央白色内圆），派生 16/32/48/128 PNG 并注册到 `manifest.json`；顶栏品牌位直接引用该图标。
- **内联图标体系**：新增 `js/icons.js`，内联 Phosphor regular 的 `search` / `folder` / `x` 原始 SVG（`fill="currentColor"`，随选中态反色），替代 🔍 与 `/` 字符；不引入图标字体或整套图标库。右栏目录改用 20px 文件夹图标，设置弹窗关闭按钮改用 `x` 图标。
- **操作反馈 toast**：`css/modules/toast.css` + `js/features/toast.js`，`clip-path` 展开、底部弹出、100ms 方波闪烁后消失；Apply 即时提示，Reset 因 reload 经 `sessionStorage` 带到新页面提示。
- **中英双语 i18n**：设置面板新增 `LANGUAGE` 分段控件（EN / 中文）。
- **PERSPECTIVE 透视开关**：设置中可开启右侧面板 3D 倾斜，默认关闭；附「栅格化可能导致文字变糊」提示。
- **统一倾斜平面 `.tilt-plane`**：搜索栏、虚线、磨砂列表、浮层卡片共用同一变换容器，倾斜参数不再分散。
- **A 键两阶段返回**：首次按 A 焦点从右列回到左列，再次按 A 才出栈返回上级。
- **演示数据**：`DEMO_BOOKMARKS` 改为模拟真实收藏夹——第一个收藏夹下 3 个网站 + 4 个文件夹（后两个留空以验证空状态），文案统一 Lorem 占位，便于录制演示视频。

### 变更 (Changed)

- **项目更名**：`LoneTrail-Tab` → `CH3-Orange Tab`（目录 / 仓库 `CH3-Orange-Tab`）。
- **界面品牌串**：`LONETRAIL // OS` → `CH3-ORANGE // OS`；页面标题改为 `CH3-ORANGE TERMINAL`。
- **存储键**：`lonetrail_config` → `ch3orange_config`，按 `lonetrail_config` → `rhine_config` 顺序自动迁移；设置面板「恢复默认」清除三个键。
- **扩展清单**：`name` 改为 `CH3-Orange Tab`，`description` 明确新标签页属性。
- **搜索栏改为取景框式**：左右一对 L 形取景角，默认 180×30、聚焦横向到 240px，字号统一 `--ui-font-size`；选中底色复用 `--row-active-bg` 由右向左铺开；3D 透视下关闭填充层的 `backdrop-filter`（grouping 属性会强制 flat 并导致发虚）。
- **语言切换作用域收敛**：主界面固定英文，`LANGUAGE` 只影响设置弹窗。
- **默认键位**：`NAV_CONFIRM` 增加空格，并对仍是 `['enter']` 的旧配置做一次性迁移。
- **中文字体**：字体栈补 `Microsoft YaHei` / `PingFang SC` / `Noto Sans CJK SC`，中文不再回退宋体；设置面板副标题与时钟星期去掉灰底、与上方文字左对齐。
- **默认关闭 3D 透视**：右侧面板默认平面渲染，文字更清晰；需显式开启才启用倾斜。
- **浮层选中动画统一**：WSAD 共用同一浮层逻辑，200ms 插值，原位保留颜色线框，卡片向左上抬起 14px。
- **磨砂带收敛**：去底色仅留模糊，去左右描边只留上下边，保留空状态竖线。
- **搜索栏与虚线对齐**：共用同款倾斜与左移补偿，位置校准并与头部占位同步。
- **轮盘换色**：填充方向改为从右向左。
- **README**：顶部加入扩展图标；界面截图改为 3D 透视下的 2560×1440 超采样图（1920×1080 按 2 倍渲染后降采样）。

### 修复 (Fixed)

- 取消选中时文字与目录图标闪烁：`.list-item` 的 color 过渡时长与子元素不一致、`.folder-indicator` 的 `transition: 0.2s` 简写把 `opacity` 也纳入过渡；统一为 `--select-duration`，并删除选中态 `font-weight: 800`（非可变字体无法插值）。
- 浮层卡回收早一帧导致收色/投影未完成：改用 WAAPI `anim.finished` 为锚点。
- 长按 `S` / `WS` 同按时底层全黑、同行快速重选卡片错位溢出。
- `W` / `S` 切换时未选中项反向动画丢失、文字交接「闪一下」。
- 选中浮层黑边与淡入淡出残留、顶栏亮色主题黑边。
- 刷新后语言按钮高亮与实际语言不同步。
- 搜索无结果（NO MATCHES）配色回退到与其他空状态一致。

### 移除 (Removed)

- 左侧轮盘灰色 LED 小点及配套样式；正视浮层实验代码与失效 transform。
- 右栏 DIR 文案与 `.folder-indicator` 相关样式，改由文件夹图标表达。
- 未使用的 CSS 变量与 i18n key；新增 `.gitignore` 排除 `demo/`、`.workbuddy/`。

## [1.0.0-alpha] - 2026-08-12

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
- 版本号统一为 1.0.0-alpha（manifest 使用 `1.0.0`）。
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
