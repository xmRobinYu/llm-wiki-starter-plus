# 结构化知识体系重构开发计划

## 输入文档

- PRD: [../prd/2026-06-02-structured-knowledge-architecture-prd.md](../prd/2026-06-02-structured-knowledge-architecture-prd.md)
- 词汇表: [../../CONTEXT.md](../../CONTEXT.md)
- 当前实现参考:
  - [../../bin/llm-wiki.js](../../bin/llm-wiki.js)
  - [../../scripts/smoke-cli.sh](../../scripts/smoke-cli.sh)
  - [../../template/zh/AGENTS.md](../../template/zh/AGENTS.md)
  - [../../template/en/AGENTS.md](../../template/en/AGENTS.md)

## 目标

把已定稿 PRD 拆成一组可连续交付、可测试、可回滚的开发切片，使后续实现不再依赖口头理解，而是可以按阶段推进：

1. 先建立新 schema 与目录骨架
2. 再让 CLI 识别新旧两套结构
3. 再改 ingest / lint / query
4. 最后补 graph、迁移与文档

本计划默认每个阶段都应满足：

- 代码处于可运行状态
- `npm test` 可作为回归基线
- 中文与英文模板同阶段完成
- 新结构落地后不破坏旧 wiki 的只读与基础命令兼容

---

## 当前状态分析

### 1. 模板与目录仍然是旧结构

当前模板树：

- `template/zh/templates/` 只有 `concept/entity/topic/comparison/source/synthesis/query`
- `template/en/templates/` 同样只有上述类型
- `template/zh/wiki/` 仍是 `Wiki 目录 / 知识库概览 / 知识库目标 / 操作日志`
- `template/en/wiki/` 仍是 `Index / Overview / Purpose / Changelog`

缺口：

- 没有 `method`
- 没有 `case`
- 没有 `moc`
- 没有 `atom` 工作台模板
- 没有 `00 系统 / 10 核心 / 20 领域 / 30 证据 / 40 问答 / 90 归档` 的新骨架

### 2. CLI 仍以“source 摘要页”为中心

当前关键实现位于 [bin/llm-wiki.js](../../bin/llm-wiki.js)：

- `runIngest` 只负责原始资料落盘 + source 摘要页生成
- `buildSourcePage` 仍生成旧 frontmatter：`type: source`
- `updateIndexForSummary` 会把摘要页直接加入主目录
- `runLint` 主要检查 `raw -> source` 覆盖
- `query` 和 `graph` 仍建立在旧 `type` / 旧目录命名习惯上

这与 PRD 的目标冲突：

- `source` 没有被降级为证据层
- `atom` 不存在
- `kind/layer` 尚未进入 CLI
- `领域优先` 没有真正体现在默认行为里

### 3. smoke 测试与真实 scaffold 仍有偏差

当前 [scripts/smoke-cli.sh](../../scripts/smoke-cli.sh) 直接复制：

- `template/en`
- `template/zh`

而没有叠加 `template/base`。

这意味着：

- smoke 不能完整覆盖真实 scaffold 结果
- `.gitignore`、`.obsidian`、基础目录约定与 smoke 之间存在偏差

在结构重构前，必须先把测试夹具构造方式纠正到更接近真实安装结果。

### 4. Git 策略尚未体现“raw 本地优先”

[template/base/.gitignore](../../template/base/.gitignore) 当前未体现：

- `raw/` 默认本地保留
- 结构页可推远程
- 原始资料默认不进远程

如果不先补这个默认策略，后续 PRD 中的仓库模式只会停留在文档层。

---

## 已定实现约束

以下约束在本计划中视为已定，不再反复讨论：

1. `单一 vault`
2. `逻辑父子知识库`，不是多 vault 联邦
3. `领域优先`
4. `raw` 保留在本地，同 vault 内作为证据层
5. `飞书` 仅作补充备份
6. `atom` 是工作台中间态，不是主导航层
7. `decision` 不作为 MVP 独立页面类型
8. `20 领域/` 空骨架，不预置示例领域
9. `source` 不占一等导航
10. 默认晋升阈值：
    - `2+` 领域复用 -> 建议晋升核心层
    - `3+` 来源支持 -> 建议晋升 `synthesis`
11. `ingest` 默认落点：
    - `source`
    - `atom`
    - 候选链接
    - 晋升建议

---

## 关键实现约定

这些约定是为了把 PRD 转成可编码的契约。

### 1. 新旧 schema 兼容策略

MVP 必须采用“新建走新 schema，读取兼容旧 schema”的策略：

- 新 scaffold 一律生成新结构
- CLI 对旧结构保持读取兼容
- 迁移工具和批量重组脚本放在后续阶段

这意味着：

- 不要求老用户先迁移才能继续 `query/lint/graph`
- 但新 starter 产出的目录、模板、frontmatter 直接使用新约定

### 2. 英文目录命名约定

为避免后续开发时重复发明英文路径，本计划固定英文路径如下：

```text
wiki/
├── 00 System/
│   ├── Purpose.md
│   ├── Index.md
│   ├── Glossary.md
│   ├── Changelog.md
│   └── Review Rules.md
├── 10 Core/
│   ├── Maps/
│   ├── Concepts/
│   ├── Methods/
│   ├── Entities/
│   └── Synthesis/
├── 20 Domains/
│   └── <Domain>/
│       ├── Domain Map.md
│       ├── Topics/
│       ├── Cases/
│       └── Workspace/
│           └── Atoms/
├── 30 Evidence/
│   ├── Summaries/
│   └── Excerpts/
├── 40 Queries/
└── 90 Archived/
```

中文路径按 PRD 约定执行。

### 3. 首页契约

为减少系统页重复，MVP 采用：

- 中文首页：`wiki/00 系统/Wiki 目录.md`
- 英文首页：`wiki/00 System/Index.md`

旧的 `知识库概览.md` / `Overview.md` 内容并入首页，不再作为新 scaffold 的独立主入口页面。

### 4. 决策边界契约

MVP 不创建 `decision` 页面类型，但以下模板必须包含 `决策边界 / Decision Boundary` 章节：

- `method`
- `topic`
- `synthesis`
- `query`

### 5. ingest 的职责边界

考虑到当前 CLI 是本地、轻量、非模型内置流程，MVP 中 `ingest` 的职责定义为：

1. 生成 `source` 草稿
2. 基于标题、摘要、标题层级与正文结构生成 `atom` 草稿候选
3. 生成候选链接与晋升建议
4. 不默认直接创建新的稳定知识页

深语义归纳仍由 agent 基于这些中间产物继续完成。

---

## 实施原则

1. **先收紧契约，再改行为**
   先让目录、frontmatter、模板定型，再改 CLI 生成逻辑。

2. **保持阶段可运行**
   每个阶段结束时都必须能跑 `npm test`。

3. **中英模板同步**
   不允许先改中文、英文滞后一个大阶段。

4. **优先兼容读取，再考虑兼容写入**
   旧 wiki 的读取兼容优先于继续向旧结构写新内容。

5. **避免过早拆模块**
   在行为还不稳定时，不要先把 [bin/llm-wiki.js](../../bin/llm-wiki.js) 大拆分；可先引入局部 helper。

---

## 分阶段开发计划

## Phase 0: 基线与测试夹具校准

### 目标

让测试夹具反映真实 scaffold 结果，并把文档契约与实现契约对齐。

### 主要文件

- [docs/prd/2026-06-02-structured-knowledge-architecture-prd.md](../prd/2026-06-02-structured-knowledge-architecture-prd.md)
- [docs/plan/2026-06-02-structured-knowledge-architecture-development-plan.md](./2026-06-02-structured-knowledge-architecture-development-plan.md)
- [scripts/smoke-cli.sh](../../scripts/smoke-cli.sh)

### 任务

1. 将 PRD 状态标记为 `Final`
2. 修正文档内剩余不一致项
3. 调整 smoke 夹具构造方式：
   - 由“直接复制 `template/en` 或 `template/zh`”
   - 改为“模拟 `template/base + template/{lang}` 叠加”
4. 在 smoke 中显式区分：
   - legacy schema fixture
   - new schema fixture

### 验收标准

- [ ] PRD 与开发计划之间不存在目录、页面类型、仓库策略上的冲突
- [ ] smoke 夹具生成方式与真实 scaffold 一致
- [ ] `npm test` 仍可通过现有旧结构 smoke

### 验证方式

- 运行 `npm test`
- 人工对比新 smoke 夹具目录与真实模板叠加结果

---

## Phase 1: Scaffold 与模板骨架重构

### 目标

把 starter 产物从旧结构切换到新结构，但先只改模板与目录，不碰 CLI 业务逻辑。

### 主要文件

- [template/zh/AGENTS.md](../../template/zh/AGENTS.md)
- [template/en/AGENTS.md](../../template/en/AGENTS.md)
- `template/zh/wiki/*`
- `template/en/wiki/*`
- `template/zh/templates/*`
- `template/en/templates/*`
- [template/base/.gitignore](../../template/base/.gitignore)

### 任务

1. 重写中英 `AGENTS.md`
   - 引入 `kind/layer/domains/stability/bloom/review_cycle`
   - 明确 `source -> atom -> stable` 流程
   - 明确领域优先、source 次级导航、raw 保留
2. 重组中英 `wiki/` 初始目录和系统页
3. 新增模板：
   - `method`
   - `case`
   - `moc`
   - 可选 `atom`
4. 改造旧模板：
   - `source`
   - `topic`
   - `synthesis`
   - `query`
   - `concept`
   - `entity`
5. 移除新 scaffold 中对 `Overview/知识库概览` 的首页职责依赖
6. 更新 `sortspec`，保证目录排序符合新架构

### 验收标准

- [ ] 新 scaffold 包含 `00 系统 / 10 核心 / 20 领域 / 30 证据 / 40 问答 / 90 归档`
- [ ] 不再存在独立 `decision` 模板或 `决策` 目录
- [ ] `source` 模板明确标识为 `kind: source`、`layer: evidence`
- [ ] `atom` 模板标识为 `layer: working`
- [ ] `method/topic/synthesis/query` 模板都包含决策边界章节
- [ ] 首页和主目录不再把 `资料摘要/Summaries` 作为主导航区块
- [ ] 中文与英文模板目录对齐

### 验证方式

- 通过 shell 断言检查文件是否存在
- grep frontmatter 与章节标题
- 人工打开模板目录核对结构

---

## Phase 2: CLI schema 兼容层

### 目标

在不大拆 CLI 的前提下，增加一层新旧 schema 兼容与路径解析能力。

### 主要文件

- [bin/llm-wiki.js](../../bin/llm-wiki.js)

### 任务

1. 引入 schema 检测 helper
   - 识别 legacy root
   - 识别 new root
2. 引入统一路径解析 helper
   - 系统页路径
   - 核心层路径
   - 领域层路径
   - 证据层路径
   - 工作台路径
   - 查询页路径
3. 引入 page classification helper
   - 兼容 legacy `type`
   - 支持 new `kind/layer`
4. 统一系统页识别逻辑
   - 兼容旧 `Overview/知识库概览`
   - 兼容新 `Index/Wiki 目录`
5. 统一领域抽取逻辑
   - 从 `domains`
   - 或 legacy `domain`
   - 或目录层级推断

### 验收标准

- [ ] `ingest/query/lint/graph` 能识别新旧两种 wiki 根结构
- [ ] CLI 不要求用户先迁移旧 wiki 才能继续读取使用
- [ ] JSON 输出中，新结构页面包含 `kind` 与 `layer`
- [ ] legacy 页面仍能被分类并正常查询

### 验证方式

- 为 smoke 增加 legacy fixture 和 new fixture 两套验证
- `query --json` 检查新结构返回字段

---

## Phase 3: 仓库策略与 `.gitignore` 默认值

### 目标

把“raw 本地优先、结构层可远程同步”的策略从 PRD 变成默认仓库行为。

### 主要文件

- [template/base/.gitignore](../../template/base/.gitignore)
- `template/zh/README.md`
- `template/en/README.md`
- [README.md](../../README.md)
- [README.zh-CN.md](../../README.zh-CN.md)

### 任务

1. 设计 `raw/` 默认忽略策略
   - 忽略用户新加的 raw 内容
   - 保留必要的占位或排序控制文件
2. 评估是否同时忽略 `graph/graph.json` 与 `graph/index.html`
   - 推荐视为可重建产物
3. 文档明确说明：
   - 默认为什么不推 `raw`
   - 如何显式改成追踪 `raw`
   - 飞书补充备份的定位
4. 保持 Obsidian 配置追踪策略与新结构兼容

### 验收标准

- [ ] 新建 wiki 后，新增 `raw/` 文档默认不出现在 `git status`
- [ ] 编辑 `wiki/` 下知识页时，变更仍出现在 `git status`
- [ ] README/模板 README 明确说明仓库策略
- [ ] 不需要用户手工改 `.gitignore` 才能得到推荐默认模式

### 验证方式

- 在临时目录 `git init`
- 新增 `raw/.../test.md`，确认默认不出现在状态里
- 修改 `wiki/.../*.md`，确认出现在状态里

---

## Phase 4: ingest MVP 重构

### 目标

把 `ingest` 从“source 摘要生成器”升级成“证据层 + 工作台层入口”。

### 主要文件

- [bin/llm-wiki.js](../../bin/llm-wiki.js)
- `template/zh/templates/source.md`
- `template/en/templates/source.md`
- 可选 `atom` 模板

### 任务

1. 更新新 schema 下的 evidence 路径
2. 更新 `buildSourcePage`：
   - 使用 `kind/layer`
   - 增加候选链接和晋升建议区块
3. 引入 atom draft 生成逻辑
   - 来源：摘要、首句、标题层级、正文结构
   - 每次 ingest 生成 `1~5` 个 draft atom
   - 标题去重、空标题回退
4. 设计 atom 内容最小结构
   - `kind: atom`
   - `layer: working`
   - 反向链接到 source
   - 空摘要允许，但必须有后续编辑提示
5. 领域确定规则
   - 优先 `--domain`
   - 其次从已在 `raw/<domain>/` 的路径推断
   - 最后保留与现有 CLI 一致的导入/网页类兜底
6. 默认不新建稳定知识页
7. 对旧 schema root 保持 legacy 写入兼容，至少在 MVP 内不直接报错

### 验收标准

- [ ] `ingest` 在新 schema root 下至少创建：
  - `raw` 文件
  - `source` 证据页
  - `1~5` 个 `atom` 草稿
  - 候选链接与晋升建议
- [ ] `source` 页面不再写入主导航的一等入口
- [ ] `atom` 页面回链到对应 source
- [ ] 未显式要求时，`ingest` 不会直接新建稳定知识页
- [ ] 旧 schema root 下 `ingest` 仍可运行

### 验证方式

- 扩展 smoke：
  - 本地 markdown ingest
  - URL ingest
  - 有 `--domain`
  - 无 `--domain`
- 检查生成文件数与 frontmatter

---

## Phase 5: lint 与治理能力重构

### 目标

让 `lint` 从“原始资料是否有摘要”升级为“知识是否被编译、治理是否完整”。

### 主要文件

- [bin/llm-wiki.js](../../bin/llm-wiki.js)

### 任务

1. 定义新 report 输出位置
   - 中文推荐：`wiki/00 系统/巡检报告/`
   - 英文推荐：`wiki/00 System/Reports/`
2. 新增检查项：
   - `raw_without_source`
   - `source_without_atom`
   - `source_without_stable_references`
   - `orphan_atoms`
   - `missing_domain_map`
   - `missing_glossary_or_review_rules`
   - `missing_decision_boundary`
3. review cycle 检查
   - `weekly` > 7 天
   - `monthly` > 31 天
   - `quarterly` > 92 天
4. 兼容 legacy report 输出逻辑
5. 在终端摘要里突出“已摘要未编译”的问题数量

### 验收标准

- [ ] lint 报告能区分 `raw -> source` 与 `source -> stable` 两个层次
- [ ] lint 能发现孤立 atom 和缺失领域地图
- [ ] lint 能检查缺失决策边界章节
- [ ] lint 报告位置符合新系统页布局
- [ ] 旧 wiki 仍可运行 lint，至少提供降级报告

### 验证方式

- 为 smoke 构造：
  - 缺失 atom
  - 缺失领域地图
  - 缺失 review_cycle
  - 缺失决策边界
- 检查报告文本和问题计数

---

## Phase 6: query 对齐新 schema

### 目标

让查询默认偏向稳定知识层，同时保留证据追溯能力。

### 主要文件

- [bin/llm-wiki.js](../../bin/llm-wiki.js)
- [docs/cli.md](../cli.md)

### 任务

1. query 识别 `kind/layer/domains`
2. 调整默认排序权重：
   - `canonical` > `domain` > `working` > `evidence`
3. 引入“追溯来源”意图检测
   - 中文关键词：`来源`、`出处`、`原文`、`证据`
   - 英文关键词：`source`、`citation`、`quote`、`evidence`
4. 让 provenance 查询对 evidence 层重新增权
5. 输出结构中暴露：
   - `kind`
   - `layer`
   - `domains`
6. 让系统页、地图页、领域页适配新的目录与命名

### 验收标准

- [ ] 概念型查询时，前列结果默认以 `canonical/domain` 为主
- [ ] `source` 页面在非追溯型查询中默认降权
- [ ] 追溯来源型查询可稳定召回 evidence 层
- [ ] `query --json` 返回 `kind/layer/domains`
- [ ] 旧 wiki 查询兼容不回退

### 验证方式

- smoke 增加两类查询：
  - 概念型
  - 追溯来源型
- 检查 `results[0..n]` 的 `layer` 分布

---

## Phase 7: graph 对齐新 schema

### 目标

让 graph 对新层级和页面类型有正确表达，但不把 graph 变成额外重型产品。

### 主要文件

- [bin/llm-wiki.js](../../bin/llm-wiki.js)

### 任务

1. graph 节点写入 `kind/layer/domains/stability`
2. 过滤器增加 layer 维度
3. evidence 层节点默认弱化展示
   - 视觉弱化或默认 filter 关闭二选一
4. 系统页和地图页在图中保持清晰角色
5. 不改变 graph 为“可重建派生产物”的定位

### 验收标准

- [ ] `graph.json` 包含 `kind` 和 `layer`
- [ ] HTML 查看页可按 layer 过滤
- [ ] evidence 层在默认视图中不再喧宾夺主
- [ ] 新旧 schema graph 都可生成

### 验证方式

- smoke 检查 `graph.json` 字段
- grep HTML 中新增 layer filter 文本

---

## Phase 8: 文档、迁移与发布收口

### 目标

让新架构不是“代码已改完”，而是真正可被使用和迁移。

### 主要文件

- [README.md](../../README.md)
- [README.zh-CN.md](../../README.zh-CN.md)
- [docs/cli.md](../cli.md)
- 新增迁移文档
- 可选迁移脚本

### 任务

1. 更新 README 的结构图与工作流说明
2. 更新 CLI 文档：
   - ingest 新落点
   - lint 新报告
   - query 新字段与排序
3. 编写迁移文档
   - 旧目录如何映射到新目录
   - 旧 `type` 如何映射到新 `kind/layer`
   - 旧 `Overview/知识库概览` 如何处理
4. 视情况提供最小迁移脚本
5. 输出发布说明

### 验收标准

- [ ] README 和 CLI 文档与最终行为一致
- [ ] 用户能按迁移文档手工完成旧库调整
- [ ] 若不提供迁移脚本，文档也必须足够可执行
- [ ] 新架构的 Git/raw/飞书策略在文档中清楚可理解

### 验证方式

- 文档 walkthrough
- 用临时 legacy fixture 按文档手工迁移一遍

---

## 推荐提交拆分

建议按以下提交顺序推进，避免一次性大改：

1. `docs: finalize structured knowledge architecture prd and add development plan`
2. `test: align smoke scaffold assembly with base overlay`
3. `feat(template): add v2 knowledge architecture scaffold and templates`
4. `feat(cli): add schema compatibility and path resolution helpers`
5. `chore(scaffold): implement local-first raw git defaults`
6. `feat(ingest): land source plus atom plus promotion hints workflow`
7. `feat(lint): report knowledge compilation and governance gaps`
8. `feat(query): rank by kind and layer with provenance recall`
9. `feat(graph): add layer-aware graph metadata and filtering`
10. `docs: update cli guide readmes and migration guide`

---

## 测试矩阵

| 维度 | legacy schema | new schema |
|---|---|---|
| scaffold smoke | 可选只读验证 | 必测 |
| local ingest | 必测 | 必测 |
| URL ingest | 必测 | 必测 |
| query text | 必测 | 必测 |
| query json | 必测 | 必测 |
| provenance query | 可选 | 必测 |
| lint report | 必测 | 必测 |
| graph export | 必测 | 必测 |
| git/raw policy | 不要求 | 必测 |

补充要求：

- 所有新结构回归必须进入 [scripts/smoke-cli.sh](../../scripts/smoke-cli.sh) 或等效测试入口
- 若后续把 CLI 拆模块，应补最小 Node 级测试，而不是只依赖 shell smoke

---

## 全量验收门槛

本项目可视为“本轮结构化重构完成”的门槛：

1. 新 scaffold 已切换到新架构
2. `ingest` 默认实现 `source + atom + 晋升建议`
3. `lint` 能报告“已摘要未编译”问题
4. `query` 默认偏向稳定知识层，但支持来源追溯
5. `raw` 默认本地优先，Git 策略可用
6. 中英文模板、文档、CLI 行为一致
7. 旧 wiki 至少保持读取兼容
8. smoke 覆盖新旧结构的关键路径

---

## 不建议在本轮加入的工作

为控制范围，本轮明确不建议加入：

- 多 vault 管理
- 联邦搜索
- 外部向量数据库
- GUI 架构编辑器
- 自动批量无损迁移所有旧库
- 在 `ingest` 中引入强依赖外部模型调用

---

## 建议执行顺序

如果只按最小风险顺序做，实现次序建议为：

1. `Phase 0`
2. `Phase 1`
3. `Phase 2`
4. `Phase 3`
5. `Phase 4`
6. `Phase 5`
7. `Phase 6`
8. `Phase 8`
9. `Phase 7`

说明：

- `graph` 不阻塞 MVP 结构落地
- 先把 scaffold、ingest、lint、query 跑通，graph 再跟进
- 文档与迁移应在 query 稳定后立即补齐，不应拖到最后太远
