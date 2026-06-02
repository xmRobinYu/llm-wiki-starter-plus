[English](./README.md) | 简体中文

# llm-wiki-starter-plus

一条命令自动搭建 [Andrej Karpathy 的 LLM Wiki](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f) AI 知识库，并额外提供一层本地 CLI 工作流，用于 `ingest`、`query`、`lint`、`graph`。

自动安装 Claude Code + Obsidian + 推荐的插件（Skills & Plugins & 主题 & 快捷键）等，让 AI 帮你持续积累和维护个人知识体系。

自动兼容 Claude Code、Codex、Copilot、Gemini CLI、OpenCode 等主流 AI Agent 使用。

这个仓库现在有两层能力：

1. **Starter 层**：安装工具、创建新的 Obsidian LLM Wiki、配置插件和主题
2. **Workflow 层**：通过本地 `llm-wiki` CLI 执行 `ingest`、`query`、`lint`、`graph` 和 smoke test

命名说明：

- 对外发布的安装脚本和 Skill 入口仍沿用历史名称 `llm-wiki-starter`。
- 当前仓库文档把增强后的工作状态统一描述为 `llm-wiki-starter-plus`。
- 可以把它理解成“原始 starter + 本地 workflow layer”，而不是一套完全分离的新安装路径。

相关文档：

- [docs/index.md](./docs/index.md)
- [ROADMAP.md](./ROADMAP.md)
- [docs/cli.md](./docs/cli.md)
- [docs/llm-wiki-starter-plus-vs-original.md](./docs/llm-wiki-starter-plus-vs-original.md)

![ai-wiki.zh-CN](./assets/ai-wiki.zh-CN.png)

## 亮点

- 一条命令创建本地 LLM Wiki
- Obsidian-first 的插件、主题、快捷键配置
- 面向 Claude Code、Codex、Copilot、Gemini CLI、OpenCode 等的共享 schema
- 本地 CLI 能力：
  - `ingest`
  - `query`
  - `lint`
  - `graph`
- 带类型筛选、type 着色、节点详情面板和轻量关系布局的静态图谱页
- `npm test` 提供 smoke test 回归验证

## 安装

### 方式 A — bash 脚本

```bash
curl -fsSL https://raw.githubusercontent.com/eleven-net-cn/llm-wiki-starter/main/install.sh | bash
```
![create-ai-wiki](./assets/create-ai-wiki.svg)

> **Windows 用户**：安装脚本是 bash 脚本，请在 **Git Bash**（推荐）或 **WSL2** 中执行 —— `cmd.exe` 与 PowerShell 无法运行 bash。先安装 [Git for Windows](https://git-scm.com/download/win)（自带 Git Bash + curl），再执行 `git config --global core.autocrlf input` 避免 `bad interpreter` 错误。脚本会自动检测 winget / Chocolatey / Scoop 来安装 Obsidian、Node.js、Git。

参数示例：

```bash
# 仅检测、安装全局工具套件（Claude Code、Obsidian、NodeJS、Agent Skills 等）
curl -fsSL https://raw.githubusercontent.com/eleven-net-cn/llm-wiki-starter/main/install.sh | bash -s -- --only-tools

# 跳过全局工具套件的检测、安装，仅创建 wiki 知识库
curl -fsSL https://raw.githubusercontent.com/eleven-net-cn/llm-wiki-starter/main/install.sh | bash -s -- --only-wiki

# 跳过全局工具套件的检测、安装和 wiki 知识库创建，仅在当前所在仓库初始化配置推荐的 Obsidian 插件、主题、快捷键等配置
curl -fsSL https://raw.githubusercontent.com/eleven-net-cn/llm-wiki-starter/main/install.sh | bash -s -- --only-obsidian
```

### 方式 B — Skill 安装（面向 AI Agent 用户，或有系统、环境兼容问题时）

> 实际上这与 install.sh bash 脚本创建效果完全相同，Agent 创建会消耗 Token，推荐仅在无法正常运行 bash 脚本安装时使用。

1. 安装 Skill

    ```bash
    npx skills add eleven-net-cn/llm-wiki-starter -g
    ```

2. 在 Agent 中对话：

    ```bash
    “创建 llm-wiki 知识库”

    # 或

    “创建 wiki 知识库”

    # 或其它...
    ```

    Agent 会自动检测已装工具，并引导完成搭建。

3. 或者，Agent 中使用命令创建

    ```bash
    /llm-wiki-starter
    ```

    Agent Command 命令也支持所有参数，示例：

    ```bash
    # 仅创建 wiki 和 Obsidian 配置，不安装工具
    /llm-wiki-starter --only-wiki

    # /llm-wiki-starter --bash    # 走 bash 脚本创建，更节省 Token
    ```

### 参数

支持的参数，按需选用：

| 参数 | 说明 | 默认值 |
|------|------|--------|
| `--name <name>` | Wiki 名称 | `my-wiki` |
| `--dir <directory>` | 目标目录 | `./<name>` |
| `--lang <en\|zh>` | Wiki 语言 | `en` |
| `--yes, -y` | 跳过所有提示，使用默认值 | - |
| `--only-tools` | 仅安装工具套件，不创建 wiki 知识库 | - |
| `--only-wiki` | 仅创建 wiki 和 Obsidian 配置，不安装工具 | - |
| `--only-obsidian` | 仅在已有 vault 中配置 Obsidian | - |
| `--bash` | 通过 `/llm-wiki-starter --bash` 命令使用（提供更灵活的 Agent 使用方式） | - |

### 检测安装

自动检测系统已有工具，只安装缺少的部分。

**工具 & Skills**

- ✅ **Claude Code** — 默认推荐的 AI Agent
- ✅ **Node.js** — Claude Code 和 Skills CLI 运行时
- ✅ **Obsidian** — Wiki 编辑器和可视化图谱查看器
- ✅ **[kepano/obsidian-skills](https://github.com/kepano/obsidian-skills)** — Obsidian Markdown、CLI 交互、Bases 数据库视图、网页清洗（defuddle）
- ✅ **[axtonliu/visual-skills](https://github.com/axtonliu/axton-obsidian-visual-skills)** — Excalidraw 图表、Mermaid 可视化、Obsidian Canvas、JSON Canvas
- ✅ **Git** — 版本控制（可选）

> Skills 通过 [Skills CLI](https://github.com/vercel-labs/skills) 全局安装，跨 Agent 共享。

**Obsidian**

- **插件**（17 个插件：9 Core + 8 UX，随 wiki 自动配置）

    Core 插件（llm-wiki 核心功能必需）：

    - ✅ **[Claudian](https://github.com/YishenTu/claudian)** — Vault 内嵌 Claude Code / Codex / OpenCode agent，侧边栏对话直接读写文件
    - ✅ **Dataview** — 基于 frontmatter 的 SQL 风格查询
    - ✅ **Templater** — 页面模板系统
    - ✅ **Linter** — 自动 Markdown 格式化
    - ✅ **Custom Sort** — 通过 sortspec 控制文件浏览器排序
    - ✅ **Obsidian Git** — 自动 git 提交/推送（需 Git）
    - ✅ **Tag Wrangler** — 重命名、合并和管理标签
    - ✅ **Strange New Worlds** — 显示 wikilink 引用计数
    - ✅ **Homepage** — 打开 vault 时设置首页

    UX 插件（增强 Obsidian 编辑体验）：

    - ✅ **Omnisearch** — 全库模糊搜索
    - ✅ **Switcher++** — 快速切换器，支持标题导航
    - ✅ **Minimal Theme Settings** — Minimal 主题配置
    - ✅ **Hider** — 隐藏 UI 元素，界面更简洁
    - ✅ **Editing Toolbar** — Word 风格编辑工具栏 + F11 全屏快捷键
    - ✅ **Excalidraw** — 手绘风格图表
    - ✅ **Quiet Outline** — 增强大纲视图
    - ✅ **Open in Terminal** — 打开 vault 到终端

- **主题**

    ✅ **Minimal** — 简洁、无干扰主题（自动下载）

- **快捷键**

    - `Cmd+Shift+F` → Omnisearch（模糊搜索）
    - `Cmd+R` → 快速切换器（标题导航）
    - `Cmd+F11` → 工作区全屏
    - `Cmd+Shift+F11` → 编辑器全屏专注

**浏览器扩展（推荐使用，不会自动安装）**

- **[Obsidian Web Clipper](https://chromewebstore.google.com/detail/obsidian-web-clipper/cnjifjpddelmedmihgijeibhnjfabmlf)** — 将网页文章直接剪藏到 `raw/收件箱/` 供 LLM 摄取

## 开始使用

```bash
# 用 Obsidian 打开
cd my-wiki && open -a Obsidian .

# 启动 AI Agent（也可使用 codex / copilot / gemini 等）
claude
```

然后与 AI 对话：

- **摄取** → `摄取这篇文章：https://example.com/some-article`
- **查询** → `X 和 Y 之间有什么关系？`
- **巡检** → `运行一次 wiki 巡检`

## 本地 CLI

仓库内 CLI 用法：

```bash
npm run cli -- help
npm run cli -- ingest --root ./my-wiki ./notes/article.md
npm run cli -- ingest --root ./my-wiki "https://example.com"
npm run cli -- ingest --root ./my-wiki --domain 研究 ./notes/article.md
npm run cli -- lint --root ./my-wiki
npm run cli -- graph --root ./my-wiki
npm run cli -- query --root ./my-wiki --save "这个知识库适合收录什么？"
npm run cli -- query --root ./my-wiki --top 5 --json "知识库 目标 概览"
```

运行 smoke test：

```bash
npm test
```

CLI 提供一层本地命令面，便于后续自动化：

- `llm-wiki ingest`
- `llm-wiki query`
- `llm-wiki lint`
- `llm-wiki graph`

`ingest` 会把本地 markdown 文件复制到 `raw/`，或抓取 URL 内容落到 `raw/`，然后自动创建：
- 一个 `source` 资料摘要草稿页，位于 `wiki/30 证据/资料摘要/`
- 1-3 个 atom 草稿，位于 `wiki/20 领域/<领域>/工作台/原子卡/`
- source 页上的候选链接与晋升建议

可用 `--domain <名称>` 指定原始资料子目录，并把该领域写入 source metadata。

`lint` 除了终端输出外，还会把 markdown 巡检报告写入 `wiki/00 系统/巡检报告/`。它会检查：
- `raw -> source` 覆盖
- `source -> atom/stable` 编译完成度
- 孤立 atom、缺失领域地图、缺失系统页、缺失决策边界

`query --save` 会把草稿问答页写入 `wiki/40 问答/`，方便回到 vault 里继续完善。

可用 `--top N` 控制结果数量，用 `--json` 输出结构化结果。

`query --json` 向 stdout 只输出一个 JSON 对象，顶层字段稳定为 `root`、`question`、`totalMatches`、`top`、`savedPath`、`results`。

只有在使用 `--save` 时，`savedPath` 才会是实际路径；否则固定为 `null`。

每条查询结果包含：
- `title`、`kind`、`layer`、`domains`、`score`、`path`、`summary`、`evidence`
- 结构化的 `why` 数组，用于解释排名原因

查询评分是层级感知的：`canonical` (1.5x)、`domain` (1.2x)、`reusable` (1.1x)、`navigation` (0.9x)、`working` (0.6x)、`evidence` (0.3x)。对于来源追溯型查询（含"来源"、"出处"、"证据"等词），证据层会被提升到 2.0x。

`graph` 会把可移植图谱导出到 `graph/graph.json`，并生成静态查看页 `graph/index.html`，支持 kind/layer 筛选、层级着色、节点详情面板和轻量关系布局。

## 知识库结构

新脚手架采用**分层知识架构**，包含六个逻辑层级：

```
my-wiki/
├── raw/                     # 不可变源文档（LLM 只读，本地优先）
│   ├── 收件箱/               # Web Clipper 收件箱（摄取时自动分类）
│   ├── <领域>/               # 按知识领域组织
│   └── assets/              # 图片、附件
├── wiki/                    # LLM 维护的知识库
│   ├── 00 系统/              # 导航、规则、日志
│   │   ├── Wiki 目录.md      # 首页
│   │   ├── 知识库目标.md     # 使命、读者、范围
│   │   ├── 术语表.md         # 术语定义
│   │   ├── 操作日志.md       # 操作时间线
│   │   └── 评审规则.md       # 晋升标准
│   ├── 10 核心/              # 跨领域稳定知识
│   │   ├── 地图/
│   │   ├── 概念/
│   │   ├── 方法/
│   │   ├── 实体/
│   │   └── 综合/
│   ├── 20 领域/              # 各领域专属内容
│   │   └── <领域>/
│   │       ├── 领域地图.md
│   │       ├── 主题/
│   │       ├── 案例/
│   │       └── 工作台/
│   │           └── 原子卡/   # 原子知识草稿
│   ├── 30 证据/              # 来源摘要与摘录
│   │   ├── 资料摘要/
│   │   └── 摘录/
│   ├── 40 问答/              # 高复用问答页
│   └── 90 归档/              # 已过时页面
├── canvas/                  # JSON Canvas 可视化地图
├── graph/                   # 可移植图谱导出
├── templates/               # 页面模板（每种 kind 一个，LLM 引用）
├── AGENTS.md                # Wiki 规范 v2（唯一真相源）
└── CLAUDE.md                # Claude Code 配置（导入 AGENTS.md）
```

> **提示**：`20 领域/` 下的领域目录在首次摄取时自动创建。使用 `--domain <名称>` 指定内容领域。证据层（`30 证据/`）保留用于来源追溯，但不再主导导航。

## 什么是 LLM Wiki？

[LLM Wiki](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f) 是 Andrej Karpathy 提出的知识管理模式：不同于传统 RAG 每次查询从零检索，LLM **增量式地构建和维护一个持久化的 wiki** —— 交叉引用自动建立，矛盾被标记，综合分析持续更新。每次添加新资料都会让 wiki 更丰富。

**适用场景**：个人知识管理、技术调研、领域学习笔记、团队知识库 —— 任何需要 AI 帮你长期积累和整理知识的场景。

**工作方式**：[Claude Code](https://claude.ai/claude-code) 作为 AI Agent 负责读写和维护 wiki；[Obsidian](https://obsidian.md) 作为可视化编辑器和阅读器。你通过与 AI 对话来摄取资料、查询知识、运行巡检 —— 同时在 Obsidian 中浏览和导航知识图谱。

**三层架构**：`raw/`（不可变源文档）→ `wiki/`（LLM 维护的页面）→ Schema（`AGENTS.md`）

**三大操作**：**Ingest**（摄取）→ **Query**（查询）→ **Lint**（巡检）

## 适合谁

如果你想要的是 `llm-wiki-starter-plus`：

- 一条命令起一个本地 Obsidian LLM Wiki
- 一套能被多个 agent CLI 共享的 schema
- 一层轻量、本地、markdown-first 的工作流能力

那这个仓库现在已经同时覆盖 starter 和 workflow 两层需求。

如果你只需要原始安装器和脚手架能力，这部分仍然继续沿用 `llm-wiki-starter` 的入口保留不变。

## 致谢

- [Andrej Karpathy — LLM Wiki](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f)

## License

[MIT](LICENSE)
