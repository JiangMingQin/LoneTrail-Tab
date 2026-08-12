# LoneTrail-Tab

LoneTrail-Tab 是一个以《明日方舟》风格为初始灵感的浏览器新标签页扩展。可以完全通过键盘操作快速检索收藏夹内容，并进行网页跳转。

![License](https://img.shields.io/badge/license-MIT-blue.svg) ![Version](https://img.shields.io/badge/version-1.0.0--alpha-green.svg) ![Style](https://img.shields.io/badge/style-Brutalist_Sci--Fi_Terminal-white)


## ✨ 特性 (Features)

| 功能 | 说明 |
|:---|:---|
| **📂 层级浏览书签** | 使用的 WASD / 方向键导航逻辑，双手无需离开键盘（保留鼠标操作支持） |
| **⚡ 智能快捷栏** | 自动把最常用的书签排在最前，越常用的越顺手 |
| **🔍 实时搜索** | 按 `/` 直接搜，实时递归搜索所有书签，支持一键跳转 |
| **🌗 双主题** | 暗色星空 / 亮色等高线，按 `T` 一键切换 |
| **⚡ 轻量级** | 基于原生 JavaScript (ES Modules) 构建，无任何第三方重型框架依赖 |


## 🎬 界面演示 (Demo)

### 🌑 暗色主题（Dark Theme）

提供随机星空的生成，适配夜间使用场景：

![LoneTrail-Tab 暗色模式演示](assets/dark.png)

### 🌕 亮色主题（Light Theme）

提供随机等高线地形图生成，适配日间使用场景：

![LoneTrail-Tab 亮色模式演示](assets/light.png)

## 🚀 安装指南 (Installation)

Chrome / Edge 等 Chromium 浏览器，任选一种方式获取扩展：

**方式一：下载 Release 包（推荐）**

前往 [Releases 页面](https://github.com/JiangMingQin/LoneTrail-Tab/releases) 下载
[`LoneTrail-Tab-v1.0.0-alpha.zip`](https://github.com/JiangMingQin/LoneTrail-Tab/releases/download/v1.0.0-alpha/LoneTrail-Tab-v1.0.0-alpha.zip)，
解压出 `LoneTrail-Tab` 文件夹。

**方式二：克隆仓库（适合开发 / 贡献）**

```bash
git clone https://github.com/JiangMingQin/LoneTrail-Tab.git
```

获取到 `LoneTrail-Tab` 文件夹后：

1. 打开 `chrome://extensions/`（Edge 为 `edge://extensions/`），开启右上角「开发者模式」
2. 点击「加载已解压的扩展程序」，选中 `LoneTrail-Tab` 文件夹

打开新标签页（`Ctrl+T`）即可使用。没有书签权限时会自动加载演示数据。

## 🎮 操作手册 (Controls)

| 按键 | 功能 |
|:---|:---|
| `W` `S` / `↑` `↓` | 上下移动 |
| `A` / `←` | 返回上一级 / 退出搜索 |
| `D` / `→` | 进入文件夹 / 打开链接 |
| `Enter` | 打开选中项 |
| `Backspace` | 返回上一级 |
| `/` | 激活搜索 |
| `Esc` | 退出搜索 / 关闭设置 |
| `T` | 切换明暗主题 |
| `O` | 打开设置 |

按 `O` 或点击右上角 `SETTING` 按钮打开设置弹窗，可调整主题、时钟显示、快捷栏数量（3–12 条）、按键映射等；界面会自动尊重系统「减弱动态效果」偏好（`prefers-reduced-motion`）。

## 🛠️ 项目结构 (Structure)

扩展本体位于 `LoneTrail-Tab/`，保持极简扁平结构，便于学习与二次开发：

```text
LoneTrail-Tab/
├── manifest.json      # Chrome 扩展配置（Manifest V3）
├── newtab.html        # 新标签页入口
├── css/               # 样式层（主题变量、布局、拨盘、列表 + modules/ 组件样式）
└── js/                # 逻辑层（原生 ES Modules，无构建）
    ├── features/      # navigation（导航）、search（搜索）、algorithm（Frecency）
    ├── actions.js     # 动作分发（命令模式）
    ├── background.js  # 动态背景生成（等高线 / 星场）
    ├── clock.js       # 时钟 HUD
    ├── events.js      # 键盘、鼠标与设置事件
    ├── main.js        # 程序入口与书签数据加载
    ├── render.js      # 增量渲染引擎
    ├── state.js       # 集中状态管理与配置持久化
    └── utils.js       # 工具函数（XSS 转义、防抖、主题应用等）
```

详细架构说明见 [PROJECT_DOCS.md](PROJECT_DOCS.md)。

## 🤝 贡献 (Contributing)

欢迎提交 Issue 或 Pull Request！提交前请遵循项目现有的代码风格：ES Modules 模块化结构、集中状态管理、增量渲染与清晰的命名约定。

## 📄 协议 (License)

本项目基于 [MIT License](LICENSE) 开源。

---

*Design inspired by retro terminals and laboratory aesthetics.*
