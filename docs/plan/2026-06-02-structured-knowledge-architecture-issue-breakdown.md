# 结构化知识体系重构 Issue / Task Breakdown

> Source PRD: [../prd/2026-06-02-structured-knowledge-architecture-prd.md](../prd/2026-06-02-structured-knowledge-architecture-prd.md)  
> Source plan: [./2026-06-02-structured-knowledge-architecture-development-plan.md](./2026-06-02-structured-knowledge-architecture-development-plan.md)  
> Status: Proposed  
> Tracker mode: local markdown breakdown only, not yet published to GitHub or other issue tracker

## 使用方式

这份文档把开发计划进一步压缩成可抓取的 issue / task 切片。每个条目都尽量满足：

- 有明确目标
- 有明确依赖
- 有明确交付物
- 有明确验收标准
- 有最小测试/验证方式

推荐把这些条目作为后续 AFK agent 或人工开发的最小工作单元来执行。

## 总览

| ID | Title | Type | Blocked by | User stories covered |
|---|---|---|---|---|
| SKA-01 | 校准测试夹具与新 scaffold 契约 | AFK | None | Story 1, Story 2, Story 4 |
| SKA-02 | 落地 v2 scaffold 目录骨架与系统页 | AFK | SKA-01 | Story 1 |
| SKA-03 | 落地 v2 页面模板与 frontmatter 契约 | AFK | SKA-02 | Story 1, Story 2 |
| SKA-04 | 为 CLI 增加新旧 schema 兼容层 | AFK | SKA-01 | Story 1, Story 2, Story 3, Story 4 |
| SKA-05 | 实现 local-first raw 仓库默认策略 | AFK | SKA-02 | Story 1 |
| SKA-06 | 实现 v2 ingest：source + atom + 晋升建议 | AFK | SKA-03, SKA-04 | Story 2 |
| SKA-07 | 实现 v2 lint：知识编译与治理巡检 | AFK | SKA-04, SKA-06 | Story 4 |
| SKA-08 | 实现 v2 query：稳定知识优先与来源追溯 | AFK | SKA-04, SKA-06 | Story 3 |
| SKA-09 | 实现 v2 graph：layer-aware 图谱输出 | AFK | SKA-04 | Story 1, Story 3 |
| SKA-10 | 文档、迁移与发布收口 | AFK | SKA-05, SKA-06, SKA-07, SKA-08 | Story 1, Story 2, Story 3, Story 4 |

## 执行顺序建议

推荐主线顺序：

1. `SKA-01`
2. `SKA-02`
3. `SKA-03`
4. `SKA-04`
5. `SKA-05`
6. `SKA-06`
7. `SKA-07`
8. `SKA-08`
9. `SKA-10`
10. `SKA-09`

可并行窗口：

- `SKA-05` 可在 `SKA-02` 完成后独立推进
- `SKA-09` 可在 `SKA-04` 完成后并行推进，但建议晚于 `SKA-08`

---

## SKA-01 校准测试夹具与新 scaffold 契约

**Type**: AFK  
**Blocked by**: None  
**User stories covered**: Story 1, Story 2, Story 4

### What to build

把现有 smoke 测试从“直接复制语言模板目录”纠正为“模拟真实 scaffold 叠加结果”的夹具方式，并消除 PRD / 开发计划中的残余歧义。

### Why this exists

如果测试夹具与真实 scaffold 结果不一致，后面所有模板和 CLI 改造都可能在一个错误的环境里通过测试，最后实际创建出来的 wiki 却和 smoke 完全不同。

### Deliverables

- `scripts/smoke-cli.sh` 支持：
  - `legacy schema fixture`
  - `new schema fixture`
- smoke 创建方式改为：
  - `template/base`
  - `template/{lang}`
  - 叠加生成测试 vault
- PRD 和开发计划文档之间的冲突项清零

### Key files

- `scripts/smoke-cli.sh`
- `docs/prd/2026-06-02-structured-knowledge-architecture-prd.md`
- `docs/plan/2026-06-02-structured-knowledge-architecture-development-plan.md`

### Acceptance criteria

- [ ] smoke 不再直接把 `template/en` 或 `template/zh` 当作完整 vault 根目录
- [ ] smoke 能构造至少一个 legacy fixture 和一个 new fixture
- [ ] PRD、开发计划、CONTEXT 中对目录、页面类型、仓库策略的定义一致
- [ ] `npm test` 仍然可以通过现有 legacy 路径的关键回归

### Verification

- 运行 `npm test`
- 人工对比 smoke 夹具目录与真实 base+lang scaffold 结果

### Out of scope

- 不改业务逻辑
- 不改模板内容本身

---

## SKA-02 落地 v2 scaffold 目录骨架与系统页

**Type**: AFK  
**Blocked by**: SKA-01  
**User stories covered**: Story 1

### What to build

把 starter 的默认目录骨架升级到 PRD 中定义的新结构，并把系统页迁移到新布局。

### Deliverables

- 中文 scaffold 新目录：
  - `wiki/00 系统/`
  - `wiki/10 核心/`
  - `wiki/20 领域/`
  - `wiki/30 证据/`
  - `wiki/40 问答/`
  - `wiki/90 归档/`
- 英文 scaffold 新目录：
  - `wiki/00 System/`
  - `wiki/10 Core/`
  - `wiki/20 Domains/`
  - `wiki/30 Evidence/`
  - `wiki/40 Queries/`
  - `wiki/90 Archived/`
- 系统页重组：
  - 中文以 `Wiki 目录.md` 为首页
  - 英文以 `Index.md` 为首页

### Key files

- `template/zh/wiki/*`
- `template/en/wiki/*`
- `template/zh/raw/sortspec.md`
- `template/en/raw/sortspec.md`
- `template/zh/wiki/sortspec.md`
- `template/en/wiki/sortspec.md`

### Acceptance criteria

- [ ] 新 scaffold 包含 PRD 约定的六级顶层区块
- [ ] `知识库概览.md` / `Overview.md` 不再承担新 scaffold 的首页职责
- [ ] `20 领域/` / `20 Domains/` 默认仅为空骨架
- [ ] 不出现 `决策/Decisions` 目录
- [ ] 中文与英文 scaffold 结构一一对应

### Verification

- 用 shell 断言检查新目录存在
- 人工打开模板树核对目录完整性

### Out of scope

- 不改 CLI 行为
- 不改 frontmatter 契约

---

## SKA-03 落地 v2 页面模板与 frontmatter 契约

**Type**: AFK  
**Blocked by**: SKA-02  
**User stories covered**: Story 1, Story 2

### What to build

创建新模板并改造旧模板，使新 scaffold 从创建之初就具备 `kind/layer` 驱动的页面契约。

### Deliverables

- 新模板：
  - `method`
  - `case`
  - `moc`
  - 可选 `atom`
- 改造模板：
  - `source`
  - `concept`
  - `entity`
  - `topic`
  - `synthesis`
  - `query`

### Key files

- `template/zh/templates/*`
- `template/en/templates/*`
- `template/zh/AGENTS.md`
- `template/en/AGENTS.md`

### Acceptance criteria

- [ ] 所有新模板使用 `kind` 和 `layer`，不再以 legacy `type` 作为新 scaffold 主契约
- [ ] `source` 模板明确属于 `layer: evidence`
- [ ] `atom` 模板明确属于 `layer: working`
- [ ] `method/topic/synthesis/query` 都包含“决策边界 / Decision Boundary”章节
- [ ] `source` 模板明确写出其不是最终稳定知识页
- [ ] AGENTS.md 明确 `source -> atom -> stable` 流程

### Verification

- grep frontmatter 字段
- grep 必备章节标题
- 人工抽查中英文模板

### Out of scope

- 不改 CLI 生成逻辑
- 不改 query 排序

---

## SKA-04 为 CLI 增加新旧 schema 兼容层

**Type**: AFK  
**Blocked by**: SKA-01  
**User stories covered**: Story 1, Story 2, Story 3, Story 4

### What to build

在 CLI 中增加一层 schema 识别、路径解析和页面分类 helper，让 `ingest/query/lint/graph` 能同时处理 legacy 和 v2 结构。

### Deliverables

- root/schema 检测 helper
- 新旧路径统一解析 helper
- 新旧页面分类 helper
- 新旧系统页识别逻辑
- `kind/layer` 与 legacy `type` 的兼容读取逻辑

### Key files

- `bin/llm-wiki.js`

### Acceptance criteria

- [ ] `ingest/query/lint/graph` 能识别 new root
- [ ] `ingest/query/lint/graph` 对 old root 保持读取兼容
- [ ] 新结构页面的 JSON 输出可包含 `kind` 与 `layer`
- [ ] 旧结构页面仍能被分类并参与 query/graph/lint

### Verification

- smoke 中同时跑 legacy fixture 和 new fixture
- `query --json` 检查字段

### Out of scope

- 不先做大规模模块拆分
- 不先实现新业务行为

---

## SKA-05 实现 local-first raw 仓库默认策略

**Type**: AFK  
**Blocked by**: SKA-02  
**User stories covered**: Story 1

### What to build

把 PRD 里的仓库策略落到 starter 默认行为上：同一 vault、同一 Git 仓库、`raw` 本地优先保留、结构层允许远程同步。

### Deliverables

- 更新 `template/base/.gitignore`
- 更新模板 README
- 更新仓库 README

### Key files

- `template/base/.gitignore`
- `template/zh/README.md`
- `template/en/README.md`
- `README.md`
- `README.zh-CN.md`

### Acceptance criteria

- [ ] 新建 wiki 后，新增 `raw/...` 文件默认不进入 `git status`
- [ ] 编辑 `wiki/...` 下 markdown 仍会进入 `git status`
- [ ] 文档清楚说明为什么默认不推 `raw`
- [ ] 文档说明如何显式改成追踪 `raw`
- [ ] 文档说明飞书只作补充备份

### Verification

- 临时目录 `git init`
- 新增 raw 文件检查状态
- 修改 wiki 文件检查状态

### Out of scope

- 不接入飞书 API
- 不做远程备份自动化

---

## SKA-06 实现 v2 ingest：source + atom + 晋升建议

**Type**: AFK  
**Blocked by**: SKA-03, SKA-04  
**User stories covered**: Story 2

### What to build

把 ingest 升级为 v2 MVP 的默认落点：`source + atom + 候选链接 + 晋升建议`，而不是仅生成 source 摘要。

### Deliverables

- 新 evidence 路径支持
- 新 `buildSourcePage` 内容结构
- atom draft 生成逻辑
- 候选链接与晋升建议区块
- 基础领域判定规则

### Key files

- `bin/llm-wiki.js`
- `template/zh/templates/source.md`
- `template/en/templates/source.md`
- 可选 `atom` 模板

### Acceptance criteria

- [ ] 新 schema root 下的 ingest 至少创建：
  - `raw` 文件
  - `source` 页
  - `1~5` 个 `atom` 草稿
  - 候选链接与晋升建议
- [ ] 默认不直接新建新的稳定知识页
- [ ] `atom` 页必须回链到对应 source
- [ ] `source` 页不再被直接写入首页主导航区块
- [ ] 旧 schema root 下 ingest 仍可运行

### Verification

- smoke 覆盖：
  - local markdown ingest
  - URL ingest
  - 指定 `--domain`
  - 未指定 `--domain`
- 检查输出文件数、frontmatter 和链接关系

### Out of scope

- 不要求一次 ingest 自动完成深度归纳
- 不要求自动创建稳定知识页

---

## SKA-07 实现 v2 lint：知识编译与治理巡检

**Type**: AFK  
**Blocked by**: SKA-04, SKA-06  
**User stories covered**: Story 4

### What to build

让 lint 看见“已摘要但未编译”的问题，并对新结构的治理完整性给出报告。

### Deliverables

- 新问题分类
- 新报告输出路径
- review cycle 检查
- 终端摘要增强

### Key files

- `bin/llm-wiki.js`

### Acceptance criteria

- [ ] lint 报告可区分：
  - `raw -> source`
  - `source -> atom`
  - `source -> stable`
- [ ] 能发现：
  - 孤立 atom
  - 缺失领域地图
  - 缺失系统页
  - 缺失决策边界章节
- [ ] 报告路径符合新系统页布局
- [ ] legacy wiki 运行 lint 时仍有可读降级输出

### Verification

- smoke 构造异常样本：
  - 缺失 atom
  - 缺失领域地图
  - 缺失 review_cycle
  - 缺失决策边界
- 检查报告文本

### Out of scope

- 不引入外部数据库
- 不做自动修复，只做报告

---

## SKA-08 实现 v2 query：稳定知识优先与来源追溯

**Type**: AFK  
**Blocked by**: SKA-04, SKA-06  
**User stories covered**: Story 3

### What to build

让 query 默认优先召回稳定知识层，同时保留“找证据/找原文”时的 evidence 召回能力。

### Deliverables

- 基于 `kind/layer` 的排序权重
- provenance intent 检测
- new schema JSON 输出字段
- 新首页/目录/地图页适配

### Key files

- `bin/llm-wiki.js`
- `docs/cli.md`

### Acceptance criteria

- [ ] 概念型查询时，前列结果以 `canonical/domain` 为主
- [ ] 非追溯型查询中，`source` 默认降权
- [ ] 追溯来源型查询中，`source` 可稳定召回
- [ ] `query --json` 输出包含：
  - `kind`
  - `layer`
  - `domains`
- [ ] legacy wiki 查询仍兼容

### Verification

- smoke 增加两类查询：
  - 概念型
  - 来源追溯型
- 检查结果层级分布

### Out of scope

- 不做 embedding / 向量检索
- 不做复杂意图分类器

---

## SKA-09 实现 v2 graph：layer-aware 图谱输出

**Type**: AFK  
**Blocked by**: SKA-04  
**User stories covered**: Story 1, Story 3

### What to build

让 graph 正确表达新结构中的 `kind/layer/domains`，并弱化 evidence 层在默认视图中的存在感。

### Deliverables

- graph 节点 metadata 扩充
- layer filter
- evidence 层弱化策略

### Key files

- `bin/llm-wiki.js`

### Acceptance criteria

- [ ] `graph.json` 节点包含 `kind` 和 `layer`
- [ ] graph HTML 支持按 layer 过滤
- [ ] evidence 层在默认视图中不再喧宾夺主
- [ ] legacy 与 new schema 的 graph 都可导出

### Verification

- smoke 检查 graph.json 字段
- grep HTML 中 layer filter 文本

### Out of scope

- 不做重型可视化产品化
- 不做复杂布局引擎

---

## SKA-10 文档、迁移与发布收口

**Type**: AFK  
**Blocked by**: SKA-05, SKA-06, SKA-07, SKA-08  
**User stories covered**: Story 1, Story 2, Story 3, Story 4

### What to build

让新结构可理解、可迁移、可发布，而不是只有代码变化。

### Deliverables

- README 更新
- CLI 文档更新
- 迁移指南
- 可选最小迁移脚本
- 发布说明

### Key files

- `README.md`
- `README.zh-CN.md`
- `docs/cli.md`
- 新增迁移文档
- 可选迁移脚本

### Acceptance criteria

- [ ] README 与 CLI 文档描述的是最终行为，不是旧行为
- [ ] 迁移文档能指导用户手工把旧结构对齐到新结构
- [ ] 若提供迁移脚本，脚本必须仅做最小安全改动
- [ ] 文档清楚说明：
  - 单一 vault
  - 领域优先
  - raw local-first
  - source 次级导航
  - atom 工作台定位

### Verification

- 按迁移文档用一个 legacy fixture 走一遍手工迁移
- 交叉检查 README / docs/cli / PRD 描述一致

### Out of scope

- 不要求自动无损迁移所有旧 wiki

---

## Definition of Done

以下条件全部满足，才算这轮结构化重构真正完成：

- [ ] 新 scaffold 已切换到 v2 架构
- [ ] ingest 默认生成 `source + atom + 晋升建议`
- [ ] lint 能报告“已摘要未编译”
- [ ] query 默认偏向稳定知识层，同时支持来源追溯
- [ ] raw 默认 local-first，Git 策略可用
- [ ] 文档与模板中英对齐
- [ ] legacy wiki 至少保持读取兼容
- [ ] smoke 覆盖新旧结构的关键路径

## 如果后续要转成 GitHub issues

建议直接按本文件的 `SKA-01` 到 `SKA-10` 顺序发布。  
如果后续要做真正的 issue tracker 发布，再补一轮仓库 issue tracker 配置即可。
