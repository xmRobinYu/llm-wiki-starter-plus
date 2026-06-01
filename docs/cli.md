# CLI Guide

## Overview

This repository now includes a thin local CLI:

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

Register new source material into `raw/` and create a draft `source` summary page.

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
  - `wiki/summaries/`
  - or `wiki/资料摘要/`
- `Index` / `Wiki 目录` is updated
- `Changelog` / `操作日志` is updated

Current limits:

- Local files currently support markdown only
- URL extraction is intentionally lightweight

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
  - `wiki/queries/`
  - or `wiki/问答沉淀/`

Current behavior:

- Scores pages by title, type, path, summary, and body text
- Supports basic Chinese token expansion for no-space query strings

### `lint`

Check wiki structure and write a report.

Example:

```bash
npm run cli -- lint --root ./my-wiki
```

Checks:

- missing frontmatter
- missing `type`
- missing `summary`
- dead links
- orphan pages
- raw coverage gaps

Outputs:

- terminal summary
- report file:
  - `wiki/reports/`
  - or `wiki/巡检报告/`
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
- type filter chips
- node detail panel
- incoming/outgoing relationship inspection

## Root Detection

Every command expects a wiki root containing:

- `AGENTS.md`
- `raw/`
- `wiki/`

Use:

```bash
--root <path>
```

If omitted, the current working directory is used.

## Stability

The CLI is still intentionally lightweight.

It is best treated as:

- a working local automation layer
- a foundation for future agent/tool integration

not yet as a polished end-user package.
