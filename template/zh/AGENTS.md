# <Wiki Name> — LLM Wiki Schema v2

> 基于 [Andrej Karpathy 的 LLM Wiki 模式](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f) 构建。
> 本文件定义 LLM 如何维护这个知识库。
> 人类负责策划资料来源和提出问题；LLM 负责所有的总结、交叉引用、归档和维护工作。
>
> 本文件是共享的 wiki 规范（Single Source of Truth）。Claude Code 通过 `@AGENTS.md` 导入，
> Codex、Copilot、OpenCode、Gemini CLI 等直接读取。**绝不将本文件内容复制到 CLAUDE.md。**

## 架构

单一 vault，逻辑分层：

1. **`raw/`** — 不可变的源文档。LLM 只读不写。本地优先保留，默认不进远程仓库。
2. **`wiki/`** — LLM 生成和维护的 markdown 页面。按层级组织。
3. **本文件（`AGENTS.md`）** — Schema 规范。定义结构、约定和工作流。

层级结构：

| 层级 | 目录 | 用途 |
|------|------|------|
| 系统层 | `00 系统/` | 规则、导航、日志 |
| 核心层 | `10 核心/` | 跨领域稳定知识 |
| 领域层 | `20 领域/` | 各领域专属内容 |
| 证据层 | `30 证据/` | 来源摘要与摘录 |
| 问答层 | `40 问答/` | 高复用问答 |
| 归档层 | `90 归档/` | 过时页面 |

优先维护少量稳定、互相链接良好的页面，而不是大量浅层、重复的页面。

## 目录结构

```
<wiki-name>/
├── raw/                        # 证据层：原始资料（不可变，本地优先）
│   ├── 收件箱/                  # Web Clipper 统一入口
│   ├── assets/                 # 图片、附件
│   └── <领域>/                  # 按知识领域组织
├── wiki/                       # 知识层：LLM 维护
│   ├── 00 系统/                 # 导航、规则、日志
│   │   ├── 知识库目标.md
│   │   ├── Wiki 目录.md         # 首页
│   │   ├── 术语表.md
│   │   ├── 操作日志.md
│   │   └── 评审规则.md
│   ├── 10 核心/                 # 跨领域稳定知识
│   │   ├── 地图/
│   │   ├── 概念/
│   │   ├── 方法/
│   │   ├── 实体/
│   │   └── 综合/
│   ├── 20 领域/                 # 各领域专属
│   │   └── <领域>/
│   │       ├── 领域地图.md
│   │       ├── 主题/
│   │       ├── 案例/
│   │       └── 工作台/
│   │           └── 原子卡/
│   ├── 30 证据/                 # 来源层
│   │   ├── 资料摘要/
│   │   └── 摘录/
│   ├── 40 问答/                 # 高复用问答
│   ├── 90 归档/                 # 过时页面
│   ├── canvas/                  # JSON Canvas 可视化
│   └── sortspec.md
├── graph/                      # 可移植图谱导出（可重建产物）
├── templates/                  # 页面模板
├── AGENTS.md                   # 本 Schema 文件
├── CLAUDE.md                   # Claude Code Schema
└── README.md                   # 仓库文档
```

默认策略：**领域优先**。无明确指令时，不要以全库作为默认工作上下文。

## 页面模型

### 页面类型 (kind) 与层级 (layer)

| kind | layer | 说明 | 默认位置 |
|---|---|---|---|
| `moc` | navigation | 内容地图、导航 | `00 系统/` 或 `20 领域/*/领域地图` |
| `concept` | canonical | 稳定概念定义 | `10 核心/概念/` |
| `method` | canonical | 方法、框架、流程 | `10 核心/方法/` |
| `entity` | canonical | 人、组织、产品 | `10 核心/实体/` |
| `synthesis` | canonical | 跨来源综合结论 | `10 核心/综合/` |
| `topic` | domain | 领域主题页 | `20 领域/*/主题/` |
| `case` | domain | 案例、事件、复盘 | `20 领域/*/案例/` |
| `atom` | working | 原子卡，中间态 | `20 领域/*/工作台/原子卡/` |
| `source` | evidence | 单一来源摘要 | `30 证据/资料摘要/` |
| `query` | reusable | 高复用问答 | `40 问答/` |

注意：`atom` 是工作台中间态，**不作为主导航层**向普通用户强调。

### Frontmatter 规范

```yaml
---
title: "页面标题"
kind: concept          # 页面类型
layer: canonical       # 所属层级
status: seed | draft | stable | archived
domains: [领域标识]    # 逻辑子库归属，可多选
summary: "一句话摘要"
sources: []
aliases: []
tags: []
stability: evergreen | volatile | time-bound
bloom: remember | understand | apply | analyze | evaluate | create
review_cycle: weekly | monthly | quarterly
confidence: low | medium | high
---
```

### 晋升路径

```
raw -> source -> atom -> concept/method/entity/topic -> synthesis
```

默认阈值：
- 某内容被 2+ 领域复用 → 建议从领域层晋升到核心层
- 某结论由 3+ 来源共同支持 → 建议晋升为 synthesis

## 页面创建规则

- **优先更新后新建**：如果已有页面能自然吸收新信息，优先更新。
- **先读 `wiki/00 系统/知识库目标.md`**，再判断内容是否属于本知识库。
- **`source`**：每个正式摄取的 raw 文档对应一个 source 页。source 页是证据层草稿，不是最终稳定知识。
- **`atom`**：从 source 提炼的原子知识卡，一卡一事。
- **`concept`**：只为稳定、可复用的概念建页。
- **`method`**：方法、框架、流程的标准化描述。
- **`topic`**：领域内主题的综合描述。
- **`synthesis`**：仅当多个来源共同支持新论点时才创建。
- **`query`**：具体问答后续大概率复用时创建。

## 工作流

### 1. Ingest（摄取）

默认产出：`source + atom + 候选链接 + 晋升建议`

1. 阅读源文档
2. 保存到 `raw/<领域>/`
3. 创建 source 页到 `30 证据/资料摘要/`
4. 生成 1~5 个 atom 草稿到 `20 领域/<领域>/工作台/原子卡/`
5. 在 source 页标注 atom 候选与晋升建议
6. **不默认直接新建稳定知识页**
7. 更新操作日志

### 2. Query（查询）

1. 默认优先查阅核心层和领域层的稳定知识页
2. 需要追溯来源时，再下钻到证据层
3. 综合回答并附 `[[wikilink]]` 引用
4. 若回答有实质价值，建议保存为 query 页
5. 更新操作日志

### 3. Lint（巡检）

1. 检查 `raw -> source` 覆盖
2. 检查 `source -> atom/stable` 编译完成度
3. 发现孤立 atom、缺失领域地图、缺失决策边界
4. 基于 `review_cycle` 检查周期性复盘
5. 报告写入 `00 系统/巡检报告/`

## 标签体系

使用**受控词汇表**。标签简洁（每个标签 ≤6 字）。

**内容类型标签：** `概念`, `教程`, `深度`, `综述`, `观点`, `资讯`, `工具`, `范式`, `反模式`, `案例`, `基准`, `最佳实践`

**元标签：** `长青`, `易过时`, `基础`, `进阶`

**领域标签：** 根据知识库领域自定义，保持一致性。

## 约束

- 绝不修改 `raw/` 中的文件。
- 绝不编造信息。不确定时将 confidence 标记为 `low`。
- 始终使用上述 frontmatter 格式创建 wiki 页面。
- 每次操作后始终更新操作日志。
- 页面不超过约 500 行。超出则拆分。
- 内容匹配时优先更新已有页面，而非新建。
- frontmatter 中的 `sources` 字段必须使用 `[[wikilink]]` 格式。
- **ingest / lint / query 操作只修改 wiki 页面，绝不修改 `CLAUDE.md` 或 `AGENTS.md`。**

## 仓库策略

- 同一 vault，同一 Git 仓库
- `raw/` 本地优先保留，默认不进远程
- `wiki/`、系统页、模板页允许推送远程
- 飞书文档可作为选定原始资料的补充备份
