# Product Requirements Document: llm-wiki 结构化知识体系重构

**Version**: 0.1  
**Status**: Final  
**Date**: 2026-06-02  
**Author**: Codex  
**Quality Score**: 91/100

---

## Executive Summary

`llm-wiki-starter-plus` 当前已经具备 `ingest`、`query`、`lint`、`graph` 的基础能力，但知识库 schema 仍然偏“来源驱动”而非“知识驱动”。`source/资料摘要` 页面在目录、摄取、巡检、查询中的地位过高，导致生产知识库容易出现结构混乱、来源痕迹过重、稳定知识页不足的问题。

本需求拟对 starter 的知识体系进行一次结构化重构：保留单一 Obsidian vault 的使用方式，但引入“逻辑父子知识库”模型，将知识库拆为核心层、领域层、证据层和工作层；同时引入分面 metadata、证据到稳定知识的晋升规则，以及更符合 AI 协作特性的双轨工作流。这里的“父子”仅指同一 vault 内的逻辑分层，不包含多 vault 联邦能力。目标不是把系统做成复杂的本体工程，而是在不破坏 starter 易用性的前提下，让知识库更稳定、更可复用、更适合长期演化。

---

## Problem Statement

### Current Situation

当前 starter 存在以下结构性问题：

1. `source/资料摘要` 与 `concept/topic/synthesis` 处于近似同等导航地位，导致来源层过度显性化。
2. `ingest` 的自动化能力主要落在“创建来源摘要页”，没有把“抽象知识页”的产出作为默认目标。
3. `lint` 当前更关注 `raw -> source` 覆盖率，而不是 `source -> stable knowledge` 的编译完成度。
4. `query` 和 `graph` 面向知识页与来源页的差异化语义不够清晰，容易让使用者把摘要页误当成主知识层。
5. 当知识主题横跨多个领域时，缺少“父库/子库”的逻辑边界与晋升规则，导致结构不断依赖单次来源内容的措辞。

### User Pain

主要用户痛点：

- 知识库拥有者无法快速建立“稳定知识骨架”，只能不断维护越来越多的摘要页。
- AI agent 在 ingest 后缺少明确的下一步动作，容易停留在资料层总结，难以形成体系化知识。
- 查询时难以稳定命中“概念、方法、带有决策边界的主题/综合分析”等高价值页面。
- 知识横跨多个主题时，既不适合完全拆成多个独立库，也不适合放进一个扁平大杂烩。

### Proposed Solution

以“单一 vault，逻辑父子库”为基础，对 starter 的知识体系进行重构：

1. 引入新的信息架构：`系统层 + 核心层 + 领域层 + 证据层 + 归档层`
2. 将 `source` 明确降级为证据层，而非主知识导航层
3. 引入 `kind/layer/domains/stability/bloom/review_cycle` 等分面字段
4. 建立 `source -> atom -> canonical -> synthesis` 的晋升路径
5. 让 AI 工作流兼容两类场景：
   - 新领域：自上而下搭框架
   - 存量资料：自下而上拆碎片并聚类

默认执行策略补充：

- 同一 vault 不等于同一工作上下文
- 默认按领域限域，而不是按全库限域
- 只有在复用或综合成立时，内容才从领域层晋升到核心层
- `raw/` 是保留型证据层，而不是抽取后可直接丢弃的临时缓存
- 飞书文档等外部系统只作为补充备份，不作为原始资料主存储

### Expected Impact

- 让 starter 产出的知识库更接近“结构化知识系统”，而不是“来源摘要集合”
- 提升查询结果中高价值知识页的占比
- 提升多领域共存时的结构稳定性
- 为后续 CLI、lint、graph、query 的演化提供更清晰的 schema 基础

---

## Product Goals

### Primary Goals

1. 建立一个对混合领域知识同样适用的统一知识架构
2. 让 starter 默认鼓励“抽象知识沉淀”，而非停留在来源摘要
3. 保持单 vault 的低使用门槛，同时提供逻辑父子库能力
4. 让 AI agent 有清晰、可执行的知识编译流程

### Secondary Goals

1. 让 `query`、`graph`、`lint` 围绕新 schema 协同工作
2. 为知识库 owner 提供更可控的结构演化与定期复盘机制
3. 在不引入强依赖外部服务的情况下，提高 starter 的“长期可维护性”

### Non-Goals

本次不包含以下内容：

- 不引入强制的外部向量数据库或托管 RAG 服务
- 不实现真正的多 vault 同步、跨库权限管理或联邦搜索
- 不把 starter 改造成完整 ontology / semantic web 平台
- 不在本轮引入复杂 GUI 信息架构编辑器
- 不承诺自动把已有生产知识库一次性无损迁移完成

---

## Personas

### Primary Persona: 知识库拥有者 / 知识架构师

- **角色**: 创建并长期维护个人或团队知识库的人
- **目标**:
  - 让知识不再只依附来源存在
  - 建立清晰、稳定、可增长的知识结构
  - 让 AI 参与整理，但不失去结构主导权
- **痛点**:
  - 资料越来越多，但知识结构不稳定
  - 页面命名、分类和导航被单次来源内容带偏
  - 查询结果过于依赖摘要页和来源措辞
- **技术水平**: 中高级

### Secondary Persona: AI Agent（Claude/Codex/Copilot/Gemini/OpenCode）

- **角色**: 摄取、总结、建链、生成目录、维护页面的执行者
- **目标**:
  - 在有限规则下稳定地产出高质量知识页
  - 知道什么时候该创建摘要、原子卡、主题页、综合页
- **痛点**:
  - 缺少明确的晋升规则和页面分工
  - 容易把来源页误当作最终知识页
- **技术水平**: N/A（流程执行者）

### Tertiary Persona: 协作者 / 内容消费者

- **角色**: 浏览知识库、复用知识结构、阅读综合结论的人
- **目标**:
  - 快速定位稳定知识页和关键导航页
  - 减少在来源层翻找信息的时间
- **痛点**:
  - 目录存在，但结构不可预期
  - 找到的是摘要，不一定是结论

---

## Methodology Decisions

本 PRD 不采用单一方法论，而采用“分工组合模型”：

| 方法 | 在产品中的角色 | 用途 |
|---|---|---|
| 分面分类 | Schema 基础 | 支撑混合领域内容的组合检索与统一 metadata |
| MOC / 树形地图 | 导航结构 | 提供父层入口与主题总览 |
| 改良 Zettelkasten | 内容颗粒度模型 | 让原子知识卡成为来源与稳定页之间的缓冲层 |
| AI 双轨搭建法 | 工作流 | 兼容新领域建骨架与旧资料反向归纳 |
| 布鲁姆分层 | 深度标准 | 定义页面完成度，而不是目录结构 |
| 费曼学习法 | 质量门槛 | 判断页面是否能从 `draft` 晋升到 `stable` |
| 5W1H / 2W1H | 局部模板 | 适用于 `source` / `case` 页面，不作为总架构 |

结论：

- `层级` 用于导航和范围控制
- `网状链接` 用于真实知识关系
- `source` 作为证据层保留，但不再主导结构

---

## Information Architecture

### Core Structural Decision

采用：

- **物理形态**: 单一 Obsidian vault
- **逻辑形态**: 父子知识库（仅逻辑分层）

含义：

- 父库负责稳定的跨领域知识
- 子库负责具体领域内容与领域内工作台
- 两者共享统一术语、模板与 metadata 规则
- 不引入多个独立 vault 之间的同步、联邦和跨库治理

### Context Strategy

默认采用 `Single Vault, Scoped Context`：

1. 单一 vault 只代表统一存储边界
2. 每次 ingest / query / 整理都必须绑定到受限工作上下文
3. 受限工作上下文默认由以下维度共同限定：
   - 一个领域
   - 一个或少数几个页面层级
   - 明确的任务目标
4. 默认工作流为 `领域优先`

### Default Workflow Bias

除非用户明确要求全局综合，默认策略为：

1. 先进入某个领域
2. 先读领域地图和领域内高价值知识页
3. 需要追溯时再下钻到证据层
4. 只有跨领域复用成立时，才晋升到核心层

### Proposed Directory Layout

```text
<wiki-root>/
├── raw/
│   ├── 收件箱/
│   ├── <领域>/
│   └── assets/
├── wiki/
│   ├── 00 系统/
│   │   ├── 知识库目标.md
│   │   ├── Wiki 目录.md
│   │   ├── 术语表.md
│   │   ├── 操作日志.md
│   │   └── 评审规则.md
│   ├── 10 核心/
│   │   ├── 地图/
│   │   ├── 概念/
│   │   ├── 方法/
│   │   ├── 实体/
│   │   └── 综合/
│   ├── 20 领域/
│   │   └── <领域>/
│   │       ├── 领域地图.md
│   │       ├── 主题/
│   │       ├── 案例/
│   │       └── 工作台/
│   │           └── 原子卡/
│   ├── 30 证据/
│   │   ├── 资料摘要/
│   │   └── 摘录/
│   ├── 40 问答/
│   └── 90 归档/
├── canvas/
├── graph/
├── templates/
├── AGENTS.md
└── CLAUDE.md
```

### Structural Principles

1. `10 核心/` 是父层，承载跨领域稳定知识
2. `20 领域/` 是子层，承载各领域专属主题、案例和工作中间态
3. `30 证据/` 是来源层，不作为默认知识入口
4. `00 系统/` 是规则与导航层，避免与内容页混杂
5. 导航依赖地图页和主题页，不依赖来源页堆积
6. 默认的知识编译、查询和整理都应采用领域优先，而非全库优先
7. `raw/` 作为本地优先的证据层保留在同一 vault 内，供追溯与复查使用
8. starter 对 `20 领域/` 采用空骨架策略，不预置示例领域
9. `source/资料摘要` 保持可追溯可访问，但不再占据主目录和首页的一等导航位置

---

## Page Model

### Required Page Types

| kind | layer | 说明 | 默认位置 |
|---|---|---|---|
| `moc` | navigation | 内容地图、主题总览、领域入口 | `10 核心/地图` 或 `20 领域/*/领域地图` |
| `concept` | canonical | 稳定概念定义 | `10 核心/概念` |
| `method` | canonical | 方法、框架、流程 | `10 核心/方法` |
| `entity` | canonical | 人、组织、产品、项目、协议 | `10 核心/实体` |
| `synthesis` | canonical | 跨来源、跨领域综合结论 | `10 核心/综合` |
| `topic` | domain | 领域主题页 | `20 领域/*/主题` |
| `case` | domain | 案例、事件、项目复盘 | `20 领域/*/案例` |
| `atom` | working | 一卡一事的原子卡，中间工作态 | `20 领域/*/工作台/原子卡` |
| `source` | evidence | 单一来源摘要 | `30 证据/资料摘要` |
| `query` | reusable | 高复用问答 | `40 问答` |

补充约束：

- `atom` 在 MVP 中属于工作台层
- `atom` 默认不作为主导航层向普通用户强调
- `atom` 主要服务于 agent 编译流程和进阶维护
- `decision` 在 MVP 中不是独立页面类型，而是 `method/topic/synthesis/query` 的标准章节职责

### Frontmatter Schema

```yaml
---
title: ""
kind: concept
layer: canonical
status: seed | draft | stable | archived
domains: [ai-coding]
summary: ""
sources: []
aliases: []
tags: []
stability: evergreen | volatile | time-bound
bloom: remember | understand | apply | analyze | evaluate | create
review_cycle: weekly | monthly | quarterly
confidence: low | medium | high
---
```

### Metadata Intent

- `kind`: 页面类型
- `layer`: 所属层级，避免不同层级混淆
- `domains`: 逻辑子库归属，可多选
- `stability`: 内容变动频率
- `bloom`: 知识深度要求
- `review_cycle`: 巡检和复盘节奏

---

## User Stories & Acceptance Criteria

### Story 1: 以结构为中心建设知识库

**As a** 知识库拥有者  
**I want to** 在单一 vault 中建立核心层与领域层  
**So that** 我的知识库既能跨领域复用，又不会变成一个扁平大杂烩

**Acceptance Criteria:**

- [ ] starter 模板明确区分系统层、核心层、领域层、证据层、归档层
- [ ] 父层与子层的职责在 `AGENTS.md` 中有明确规则
- [ ] 新建 wiki 后，目录结构中不再把 `资料摘要` 暴露为主导航中心
- [ ] 首页与主目录默认优先展示地图页、稳定知识页和领域入口，而不是来源摘要页

### Story 2: 摄取后自动进入“编译知识”流程

**As a** AI agent  
**I want to** 在 ingest 后先产出证据页，再产出原子卡和晋升建议  
**So that** 我不会停留在来源总结层

**Acceptance Criteria:**

- [ ] ingest 至少创建 `source` 证据页
- [ ] ingest 至少生成原子化知识候选或晋升建议
- [ ] ingest 的默认落点是 `source + atom + 晋升建议`
- [ ] 对已有 `concept/method/entity/topic` 页面只在明确指令或高置信度条件下增量更新

### Story 3: 查询优先命中稳定知识页

**As a** 内容消费者  
**I want to** 在提问时优先看到概念、方法、主题和综合页  
**So that** 我能快速获得结构化结论和决策边界，而不是先掉进来源摘要

**Acceptance Criteria:**

- [ ] 对概念型查询，`query` 的前列结果默认以 `canonical/domain` 层为主
- [ ] `source` 页面在概念型查询中默认降权，但保留证据可追溯性
- [ ] `query --json` 输出中可以区分结果的 `kind` 与 `layer`

### Story 4: 巡检能够发现“知识没有被编译”的问题

**As a** 知识库拥有者  
**I want to** 看到来源是否已经进入稳定知识层  
**So that** 我知道哪些资料只是被摘要了，哪些已经真正被吸收

**Acceptance Criteria:**

- [ ] lint 报告可区分 `raw -> source` 覆盖与 `source -> canonical/domain` 编译完成度
- [ ] lint 可提示孤立原子卡、未晋升主题、缺少领域地图等结构问题
- [ ] 报告输出位置和格式与现有 starter 风格一致

---

## Functional Requirements

### 1. Schema and Template Layer

1. `AGENTS.md` 必须重写为以“证据层 / 工作层 / 稳定层 / 导航层”分工为核心的 schema
2. 模板层必须支持至少以下新增类型：
   - `method`
   - `case`
   - `moc`
   - 可选 `atom`（工作台导向，不作为主导航入口）
3. `source` 模板必须明确自身只是证据页，而非最终知识页
4. 页面 frontmatter 必须使用统一分面字段
5. `method/topic/synthesis/query` 模板必须内置明确的决策边界章节
6. `20 领域/` 默认只创建空骨架和规则说明，不预置具体领域目录

### 2. Knowledge Workflow Layer

1. 必须支持两种搭建方式：
   - 自上而下：先生成领域主干与地图页
   - 自下而上：先 ingest，再拆原子卡与聚类
2. 默认操作入口必须是“领域优先”
3. agent 在无明确指示时，不应以全库作为默认工作上下文
4. 必须定义清晰晋升规则：
   - `source -> atom`
   - `atom -> concept/method/entity/topic`
   - `multi-source / multi-domain -> synthesis`
5. 必须定义复用晋升规则：
   - 某内容被多个子领域复用时，允许从领域层晋升到核心层
6. 原始资料在被抽取后默认保留，不因知识页已产出而自动删除
7. 允许对选定来源使用飞书文档等外部系统做补充备份，但外部备份不替代 vault 内的 `raw/`
8. MVP 必须提供默认晋升阈值，供 agent 与 lint 作为建议规则使用：
   - 跨 `2` 个及以上领域复用，建议晋升到核心层
   - 由 `3` 个及以上来源共同支持的新结论，建议晋升为 `synthesis`
9. MVP ingest 的默认落点必须是：
   - `source`
   - `atom`
   - 候选链接
   - 晋升建议
10. MVP 不要求每次 ingest 默认直接生成新的稳定知识页

### 3. Query and Retrieval Layer

1. `query` 必须感知 `kind` 与 `layer`
2. 对概念型查询，`source` 和系统页默认降权
3. 对“追溯来源”类查询，`source` 必须可被召回
4. `query --json` 必须暴露足够字段供 agent 判断结果层级
5. 首页、目录和导航型页面的默认排序与分区必须体现“证据层次级入口”的原则

### 4. Lint and Governance Layer

1. `lint` 需要检查新的结构完整性：
   - 缺失地图页
   - 缺失术语表或系统页
   - 原子卡孤立
   - 来源未进入稳定层
   - 主题页长期停留在浅层总结
2. 需要支持基于 `review_cycle` 的周期性巡检
3. 需要输出结构化报告，便于知识库 owner 进行周/月复盘

### 5. Documentation Layer

1. README 和 CLI 文档需要说明新架构的核心概念
2. 必须给出“如何从旧 starter 结构过渡”的迁移说明
3. 需要给出页面类型说明与示例

---

## Quality and Depth Rules

### Bloom-Based Depth Rules

`bloom` 用于定义页面完成度，而不是目录位置：

- `concept` 至少达到 `understand`
- `method` 至少达到 `apply`
- `topic` 至少达到 `analyze`
- 承担决策边界职责的页面至少达到 `evaluate`
- `synthesis` 至少达到 `create`

### Feynman-Based Stable Gate

页面从 `draft` 晋升为 `stable` 前，至少满足：

1. 能在约 150 字内用自己的话解释清楚
2. 能举出至少 1 个正例或应用场景
3. 能说明适用边界或何时不适用

### Promotion Rules

MVP 采用“默认阈值 + 人工/agent复核”的晋升策略：

1. 某概念、方法、实体或主题被 `2` 个及以上领域复用时，建议从领域层晋升到核心层
2. 某结论由 `3` 个及以上来源共同支持，且形成了超越单一来源的新组织方式时，建议晋升为 `synthesis`
3. 上述阈值是默认建议规则，不是不可覆写的硬编码限制

---

## Scope

### MVP Scope

本轮 MVP 应覆盖：

1. 新的知识架构与目录布局
2. 新的 `AGENTS.md` schema
3. 新增/改造页面模板
4. ingest 规则重写为“证据 -> 原子 -> 晋升建议”导向
5. lint 规则升级为关注“知识编译完成度”
6. 明确 `ingest` 默认不以稳定知识页作为所有新来源的直接落点

MVP 默认不要求：

- 将 `atom` 做成普通用户的主操作入口
- 在首页、总目录或主导航中突出展示 `atom`
- 将 `decision` 作为独立页面类型实现
- 预置 AI、产品、研究等示例领域目录

### Phase 2 Scope

1. `query` 按 `kind/layer` 优化排序与 JSON 输出
2. `graph` 更清晰表达不同层级节点
3. 提供迁移助手或批量重组脚本

### Future Scope

1. 更细粒度的 graph 可视化
2. 更强的 agent ranking explanation
3. 可选的本地 RAG / embedding 辅助，但不改变 schema 主导权

---

## Technical Constraints

### Compatibility

- 必须继续兼容单一 Obsidian vault 形态
- 必须继续适配 Claude Code、Codex、Copilot、Gemini CLI、OpenCode
- 必须同时考虑中文和英文模板
- 必须允许“同一 vault，本地保留 raw，远程只同步结构化知识层”的仓库策略

### Implementation Constraints

- 尽量沿用现有 starter 的轻量 CLI 架构
- 不依赖外部 SaaS 才能完成基本流程
- 不把 schema 设计成必须理解复杂本体论才能使用
- 不要求外部文档系统参与主流程；飞书等系统仅作为可选补充备份

### Repository Strategy

推荐默认模式：

- 同一 vault
- 同一 Git 仓库
- `raw/` 本地优先保留
- `wiki/`、系统页、模板页、schema 页允许推送远程
- 飞书文档可作为选定原始资料的补充备份位置

该策略的目标是同时满足：

1. 保留可追溯原始证据
2. 控制远程仓库体积与版权风险
3. 让 Git 主要管理“知识结构演化”而非“原文堆积”

### Performance

- 新增结构规则不能显著增加 starter 初始创建复杂度
- ingest 默认流程应保持“单次操作可完成”的体验
- lint 和 query 的复杂度应控制在现有 CLI 可接受范围内

---

## Success Metrics

### Primary KPIs

1. **结构命中率**
   - 在概念型和方法型示例查询中，前 5 个结果中 `canonical/domain` 页面占比 >= 80%

2. **知识编译率**
   - 对测试样例库中的新增资料，`source -> atom/canonical/domain` 有明确承接结果的比例 >= 80%

3. **结构完整率**
   - 新建 wiki 默认具备系统层、核心层、领域层、证据层的完整模板框架

4. **治理可见性**
   - lint 报告能直接区分“已摘要但未编译”的内容

### Validation

- 通过 smoke test fixture 验证目录、模板和 CLI 行为
- 通过样例查询比较重构前后 `query` 结果结构
- 通过手动审查示例 wiki 验证主导航是否仍被来源层挤占

---

## Risks

1. **过度设计**
   - 页面类型过多，反而提高上手难度
2. **AI 执行复杂度上升**
   - 如果晋升规则太复杂，agent 反而会退回保守摘要
3. **迁移成本**
   - 现有使用者的旧 wiki 可能很难一次性对齐新结构
4. **查询规则偏差**
   - 如果对 `source` 降权过度，会损伤可追溯性

---

## Rollout Plan

### Phase 1: Schema 定型

- 完成 PRD
- 确认页面类型、目录结构、frontmatter 字段
- 确认父层/子层/证据层的职责边界

### Phase 2: 模板与规则改造

- 改写 `template/*/AGENTS.md`
- 新增/更新模板
- 调整目录骨架

### Phase 3: CLI 改造

- 改 `ingest`
- 改 `lint`
- 改 `query`
- 视情况改 `graph`

### Phase 4: 迁移与文档

- 补 README / CLI 文档
- 编写迁移说明
- 为旧结构提供最小迁移路径

---

## Open Questions

以下问题不阻塞 PRD 成立，但会影响实现优先级：

1. 旧 starter 结构的迁移策略是先提供文档指导，还是同轮提供自动脚本？
2. 对于没有显式 `--domain` 的 ingest，运行时兜底领域命名是否沿用 `imported/web` 与 `导入/网页`？
3. graph 默认应“弱化 evidence 层”还是“默认关闭 evidence 层 filter”？

---

## Appendix: Likely File Impact

本需求落地后，优先会影响以下文件与模块：

- `template/zh/AGENTS.md`
- `template/en/AGENTS.md`
- `template/zh/templates/*`
- `template/en/templates/*`
- `template/zh/wiki/*`
- `template/en/wiki/*`
- `bin/llm-wiki.js`
- `README.md`
- `README.zh-CN.md`
- `docs/cli.md`

---

## Appendix: Current Requirement Completeness Assessment

### Score Breakdown

- Business Value & Goals: 28/30
- Functional Requirements: 23/25
- User Experience: 17/20
- Technical Constraints: 14/15
- Scope & Priorities: 9/10

### Interpretation

当前需求已经足够支撑一版结构性重构 PRD。剩余待实现确认项主要集中在：

- 迁移策略的自动化深度
- 无 `--domain` 时的运行时兜底领域命名
- graph 对 evidence 层的默认可视化策略

这些问题更适合在后续设计或实现前确认，而不必阻塞本 PRD 的成立。
