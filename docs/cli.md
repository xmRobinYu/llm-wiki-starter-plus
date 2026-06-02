# CLI Guide

Docs navigation:

- [../README.md](../README.md)
- [../ROADMAP.md](../ROADMAP.md)
- [index.md](./index.md)
- [llm-wiki-starter-plus-vs-original.md](./llm-wiki-starter-plus-vs-original.md)

## Overview

`llm-wiki-starter-plus` includes a local CLI layer on top of the original starter flow:

```bash
llm-wiki <command>
```

Repo-local usage:

```bash
npm run cli -- <command> ...
```

Smoke test:

```bash
npm test
```

## Commands

### `ingest`

Register new source material into `raw/` and create draft `source` and `atom` pages.

Examples:

```bash
npm run cli -- ingest --root ./my-wiki ./notes/article.md
npm run cli -- ingest --root ./my-wiki "https://example.com"
npm run cli -- ingest --root ./my-wiki --domain research ./notes/article.md
```

Current behavior:

- Local `.md` files are copied into `raw/` if they are outside the wiki
- URLs are fetched and converted into a basic markdown source file
- A draft `source` page is created in:
  - `wiki/30 Evidence/Summaries/`
  - or `wiki/30 证据/资料摘要/`
- 1-3 `atom` drafts are generated in:
  - `wiki/20 Domains/<domain>/Workspace/Atoms/`
  - or `wiki/20 领域/<domain>/工作台/原子卡/`
- Candidate links and promotion hints are included on the source page
- `Changelog` / `操作日志` is updated

Current limits:

- Local files currently support markdown only
- URL extraction is intentionally lightweight
- Atom drafts are stubs; agent or user must verify and refine them

### `query`

Search wiki pages locally and return ranked matches.

Examples:

```bash
npm run cli -- query --root ./my-wiki "What belongs in this wiki?"
npm run cli -- query --root ./my-wiki --top 5 "purpose index overview"
npm run cli -- query --root ./my-wiki --json --top 5 "purpose index overview"
npm run cli -- query --root ./my-wiki --save "What belongs in this wiki?"
```

Flags:

- `--top N`: limit number of returned matches
- `--json`: emit structured JSON
- `--save`: write a draft query page into:
  - `wiki/40 Queries/`
  - or `wiki/40 问答/`

Current behavior:

- Scores pages by title, kind, summary, navigation links, and body text
- Layer-aware scoring bias:
  - `canonical`: 1.5x
  - `domain`: 1.2x
  - `reusable`: 1.1x
  - `navigation`: 0.9x
  - `working`: 0.6x
  - `evidence`: 0.3x (boosted to 2.0x for provenance queries)
- Provenance queries (containing "source", "citation", "evidence", "来源", "出处") boost evidence layer to 2.0x
- Supports basic Chinese token expansion for no-space query strings
- `--json` writes one JSON object to stdout with:
  - `root`
  - `question`
  - `totalMatches`
  - `top`
  - `savedPath`
  - `results`
- `savedPath` is `null` unless `--save` is used
- Each result includes:
  - `title`
  - `kind`
  - `layer`
  - `domains`
  - `score`
  - `why`
  - `path`
  - `summary`
  - `evidence`
- `why` is a structured explanation model. It distinguishes:
  - `title_match`
  - `page_type_match`
  - `semantic_summary_match`
  - `navigation_link_match`
  - `substantive_body_match`
  - `weak_body_match`

### `lint`

Check wiki structure and write a report.

Example:

```bash
npm run cli -- lint --root ./my-wiki
```

Checks:

- missing frontmatter
- missing `kind` / `layer`
- missing `summary`
- dead links
- orphan pages
- raw coverage gaps (`raw -> source`)
- source compilation gaps (`source -> atom/stable`)
- orphan atoms (no backlinks from non-atom pages)
- missing domain maps
- missing system pages
- missing decision boundary sections

Outputs:

- terminal summary
- report file:
  - `wiki/00 System/Reports/` (v2)
  - or `wiki/00 系统/巡检报告/` (v2)
  - or `wiki/reports/` (legacy)
  - or `wiki/巡检报告/` (legacy)
- changelog append

### `graph`

Export graph artifacts from wiki markdown.

Example:

```bash
npm run cli -- graph --root ./my-wiki
```

Outputs:

- `graph/graph.json`
- `graph/index.html`

Viewer features:

- search filter
- kind filter chips
- layer filter
- layer-based coloring (evidence layer muted)
- node detail panel with kind/layer/domains metadata
- incoming/outgoing relationship inspection

## Root Detection

Every command expects a wiki root containing:

- `AGENTS.md`
- `raw/`
- `wiki/`

The CLI auto-detects schema version:

- **v2**: wiki has `00 System/` or `00 系统/`
- **legacy**: everything else

All commands maintain read compatibility with legacy wikis while using v2 paths for new wikis.

Use:

```bash
--root <path>
```

If omitted, the current working directory is used.

## Schema Versioning

The CLI supports two schema versions:

### v2 (structured knowledge architecture)

- Uses `kind` + `layer` frontmatter fields
- Six logical layers: system, core, domain, evidence, queries, archived
- Promotion path: `raw -> source -> atom -> concept/method/entity/topic -> synthesis`
- Default directories:
  - `wiki/00 System/` or `wiki/00 系统/`
  - `wiki/10 Core/` or `wiki/10 核心/`
  - `wiki/20 Domains/` or `wiki/20 领域/`
  - `wiki/30 Evidence/` or `wiki/30 证据/`
  - `wiki/40 Queries/` or `wiki/40 问答/`
  - `wiki/90 Archived/` or `wiki/90 归档/`

### legacy (source-centric)

- Uses `type` frontmatter field
- Flat domain directories under `wiki/`
- Source pages in `wiki/summaries/` or `wiki/资料摘要/`

## Stability

The CLI is still intentionally lightweight.

It is best treated as:

- a working local automation layer
- a foundation for future agent/tool integration

not yet as a polished end-user package.
