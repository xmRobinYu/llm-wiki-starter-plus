# Query System 页优化计划

## 背景

`llm-wiki query` 的基础能力已经可用，但 `system` 页长期有两个问题：

1. `summary` 质量不稳定
2. 排名和 evidence 容易被模板、注释、导航结构、目录标题等噪音污染

这会带来几个直接后果：

- `Index` / `Wiki 目录` / `Overview` / `知识库概览` 经常靠样板文本拿分
- `Changelog` / `操作日志` 可能因为 HTML 注释中的格式示例被误命中
- `query --json` 的 `summary` 和 `evidence` 对 agent 不够稳定
- `graph/graph.json` 的节点摘要质量受同一问题影响

本计划聚焦 `query` 的 `system` 页处理，并把已完成与未完成部分拆成可持续推进的小步提交。

## 目标

### 主目标

让 `system` 页在 `query` 中主要依赖语义化 `summary` 和真实导航关系参与排序，而不是依赖模板化正文噪音。

### 次目标

- 让 `graph.json` 复用同一套 `system` 页摘要逻辑
- 让 `query --json` 更适合 agent 消费
- 为后续继续优化 ranking explanation 留出结构化接口

## 不改什么

- 不重写 `query` 的整体架构
- 不引入外部搜索引擎、embedding、索引库
- 不修改模板文件内容来“硬编码修复”排序问题
- 不在这一轮内引入多文件模块化拆分

## 当前状态概览

按 `query/system` 子任务估算，当前已完成约 `80%~90%`。

按 `ROADMAP.md` 中整个 `Query Quality` 范围看，当前主要完成了 “Add stronger summary extraction for system pages” 这一项，并顺带完成了一部分 ranking 去噪，但还没有完成更完整的输出契约与解释层改造。

## 完成更新（2026-06-02）

本计划现已完成，收口结果如下：

- `query --json` 已改为 stdout 只输出单个 JSON 对象
- JSON 顶层结构已统一为 `root` / `question` / `totalMatches` / `top` / `savedPath` / `results`
- ranking explanation 已从字符串计数升级为结构化 `why`
- `why` 已区分 `semantic_summary_match`、`navigation_link_match`、`substantive_body_match`、`weak_body_match` 等信号
- text mode 已改为输出可读的 `why:` 解释语句
- 导航型 `system` 页的 quick-start 弱正文命中已降权
- `README.md`、`README.zh-CN.md`、`docs/cli.md` 已同步新契约
- smoke 已补齐纯 JSON、结构化 `why`、导航页弱正文命中等回归

## 已完成项

### 1. 建立了 `system` 页专用摘要路径

当前实现已经不再简单依赖 `frontmatter?.summary || ""`。

现状：

- 优先读取 frontmatter `summary`
- 对固定 `system` 页使用语义化 `summary override`
- 对其它 `system` 页使用 blockquote / narrative fallback

影响：

- `Index` / `Wiki 目录` 不再显示“由 LLM 自动维护”之类弱摘要
- `Overview` / `知识库概览` / `Changelog` / `操作日志` 的摘要稳定性明显提升
- `graph.json` 节点摘要同步改善

涉及实现：

- `stripHtmlComments`
- `normalizeFrontmatterText`
- `getSystemPageSummaryOverride`
- `extractSystemPageSummary`
- `resolvePageSummary`

### 2. 建立了 `system` 页正文清洗路径

当前 `query` 对 `system` 页正文的匹配，已经会剔除以下噪音：

- HTML 注释块
- 页面标题行
- 样板 footer
- 样板 blockquote
- section heading
- 导航型 system 页中的 wikilink bullet
- 与最终 summary 完全重复的正文行

影响：

- `Changelog` / `操作日志` 不再因为注释模板误命中
- `Wiki 目录` 不再因为 `资料摘要 / 综合分析 / 最近更新` 这类标题刷 `body` 分
- `Index` 不再因为 `- [[summaries/]]` 同时出现在 `link` 和 `body` 里重复计分

涉及实现：

- `isSystemBoilerplateLine`
- `isSystemNavigationPage`
- `isSystemNavigationLinkLine`
- `extractSearchableBodyText`
- `extractSearchableBodyLines`

### 3. 排名与 evidence 已经切到清洗后的正文

当前 `scorePage` 与 `extractEvidenceSnippets` 已经统一使用清洗后的 `system` 页语料。

影响：

- 排名更接近“语义摘要 + 真实导航关系”
- evidence 不再大量出现模板化片段
- evidence 去重从简单字符串拼接，升级到归一化文本去重

### 4. 补齐了 smoke 回归

当前 smoke 已覆盖：

- frontmatter summary normalization
- system page summary 输出
- HTML 注释模板不应命中
- system heading 不应作为 body evidence
- system navigation bullet 不应重复作为 body evidence

这部分已经是后续继续改造时最重要的安全网。

## 当前剩余问题

本轮范围内的问题已完成，以下条目保留为本计划的历史记录。

### 1. `query --json` 还不是纯 JSON

当前在 JSON 输出前仍然会打印：

- `[query] root: ...`

这对 agent 工作流不理想，也与 `--json` 直觉不一致。

### 2. ranking explanation 还停留在 hit 计数层

当前 `reasons` 还是：

- `title:2`
- `summary:4`
- `link:1`
- `body:3`

这对于调试足够，但对用户和 agent 都不够解释性。

### 3. `Overview` / `知识库概览` 的 quick-start step 仍然会贡献较多 `body` 分

现状不一定错误，但从“导航页主要依赖 summary 和 link”这个目标看，仍然偏噪音。

### 4. 文档层还未同步

目前实现已经变化，但这些文档还没同步说明：

- `docs/cli.md`
- `README.md`
- `README.zh-CN.md`

尤其是如果继续改 `--json` 契约，这些文档需要一起更新。

## 分阶段改造计划

下面的计划按 “每一步都能保持代码可运行” 的原则拆分。

## Phase 1: 收口当前 system 页改造

### 目标

把已经完成的 `system` 页治理正式收口，确保不再继续漂移。

### 建议提交

1. `query: normalize summaries for system pages`
2. `query: filter system page boilerplate and headings`
3. `query: dedupe navigation bullets from body scoring`
4. `test: add query smoke coverage for system page ranking noise`

### 验收标准

- `what belongs in this wiki` 时，`Purpose` / `Overview` / `Index` 排名合理
- `new diagrams` 不出现 `Changelog`
- `领域 概念 资料摘要 综合分析 最近更新` 时，`Wiki 目录` 只依赖 summary，不出现 heading body evidence

### 当前状态

已完成。

## Phase 2: 纯净化 JSON 输出契约

### 目标

让 `--json` 成为真正可被程序直接消费的输出模式。

### 要改的内容

1. 把 `[query] root: ...` 这类日志只保留在 text mode
2. `--json` 模式下只输出一个 JSON 对象
3. 统一 “有结果 / 无结果 / `--save` 后” 的 JSON 结构
4. 明确 `savedPath` 在 `--save` 与非 `--save` 情况下的行为

### 建议提交

1. `query: suppress text banner in json mode`
2. `query: normalize json payload for empty and non-empty results`
3. `test: add smoke coverage for pure json query output`
4. `docs: document json output contract`

### 验收标准

- `node bin/llm-wiki.js query --json ...` 的 stdout 可以直接被 `jq` 解析
- 空结果时仍然输出合法 JSON
- `--save --json` 时结构完整且稳定

## Phase 3: ranking explanation 升级

### 目标

把当前内部计数型 `reasons` 升级为更适合人和 agent 的解释结构。

### 要改的内容

1. 保留当前权重逻辑，但将命中原因结构化
2. 区分：
   - semantic summary match
   - navigation link match
   - substantive body match
   - weak body match
3. 为 text mode 生成更友好的展示语句
4. 为 JSON mode 保留稳定字段

### 建议提交

1. `query: extract ranking explanation model`
2. `query: separate strong and weak match reasons`
3. `query: render readable why output in text mode`
4. `test: cover ranking explanations in json mode`

### 验收标准

- 用户能理解为什么某页被排前面
- agent 不必反推 `summary:4` 这类数字含义
- system 页与普通知识页的原因表达都一致

## Phase 4: 继续压低导航页正文噪音

### 目标

把导航型 `system` 页进一步约束为 “summary + link 主导，body 为补充”。

### 要改的内容

1. 识别导航型 `system` 页与规范型 `system` 页
2. 对导航型页的 numbered quick-start step 降权，或直接从 body scoring 中剔除
3. 对规范型页如 `Purpose` / `知识库目标` 保留正文权重
4. 重新评估中英文模板表现差异

### 建议提交

1. `query: classify navigation and policy system pages`
2. `query: downweight quick-start steps on navigation pages`
3. `test: add coverage for overview quick-start scoring`

### 验收标准

- `quick start domain navigation` 仍能命中 `Overview`
- `Index` 不会因为导航结构超过 `Overview`
- `Purpose` / `知识库目标` 在规则类查询中仍然保持足够可见性

## Phase 5: 文档与可维护性收尾

### 目标

把行为变化同步到文档，并降低后续继续迭代的心智负担。

### 要改的内容

1. 更新 CLI 文档中的 `query` JSON 行为
2. 更新 README 中的 `query` 描述
3. 视情况把 `query` 相关 helper 继续整理成更清晰的区块
4. 如果后续逻辑继续膨胀，再评估是否把 `query` 相关逻辑从 `bin/llm-wiki.js` 中拆出

### 建议提交

1. `docs: update query json and system page behavior`
2. `refactor: regroup query helpers for maintainability`

### 验收标准

- 文档与实现不冲突
- 新 contributor 能快速理解 `system` 页为什么有特殊路径

## 测试策略

### 已有测试基础

当前唯一稳定的自动化回归是 `scripts/smoke-cli.sh`。

它已经覆盖：

- ingest
- query text mode
- query json mode
- lint
- graph

以及本轮新增的若干 `system` 页回归。

### 后续测试原则

1. 优先测外部行为，不测内部 helper 细节
2. 优先用 CLI 级 smoke 保护真实用户路径
3. 如果 `query` 输出契约继续复杂化，再考虑引入更细粒度的 Node 级测试

### 建议新增测试点

- `--json` 纯 JSON 解析测试
- `--save --json` 契约测试
- 中英文 `system` 页结果顺序测试
- `Overview` / `知识库概览` quick-start 降权后的排序测试

## 风险与注意事项

### 风险 1: 过度清洗导致召回下降

如果把导航页正文清得太干净，某些真实可用信息可能也被拿掉。

缓解：

- 先只在导航型 system 页应用更强过滤
- 每次只改变一个过滤规则
- 每次都补 smoke

### 风险 2: JSON 契约变化影响现有脚本

一旦 `--json` 改成纯 JSON，任何依赖当前 banner 的临时脚本都可能受影响。

缓解：

- 在文档中明确契约变化
- 让 text mode 保持原行为

### 风险 3: 单文件实现继续膨胀

`bin/llm-wiki.js` 已经承担 CLI、query、graph、lint、ingest 全部逻辑。

缓解：

- 本轮先不拆
- 等 query 输出契约稳定后，再考虑做结构性拆分

## 建议的执行顺序

如果从现在继续开发，建议按下面顺序推进：

1. 先做 `--json` 纯输出
2. 再做 `--save --json` 契约补强
3. 再做 ranking explanation
4. 最后决定是否进一步降低 `Overview` / `知识库概览` 的 quick-start 正文权重
5. 收尾文档同步

## 当前完成度结论

### 对 `system` 页处理子任务

接近收口，剩余主要是输出契约与解释层问题，不再是摘要和噪音识别问题。

### 对整个 Query Quality

当前只完成了一部分：

- 已完成：`system` 页 summary 与 ranking 去噪
- 未完成：ranking explanation、agent 友好的 JSON 契约、相关文档同步

## 变更入口

后续继续开发时，优先关注这些位置：

- `bin/llm-wiki.js`
  - `resolvePageSummary`
  - `extractSearchableBodyText`
  - `extractSearchableBodyLines`
  - `scorePage`
  - `extractEvidenceSnippets`
  - `runQuery`
- `scripts/smoke-cli.sh`
- `docs/cli.md`
- `README.md`
- `README.zh-CN.md`
