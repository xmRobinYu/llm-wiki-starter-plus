# ROADMAP

Docs navigation:

- [README.md](./README.md)
- [docs/index.md](./docs/index.md)
- [docs/cli.md](./docs/cli.md)
- [docs/llm-wiki-starter-plus-vs-original.md](./docs/llm-wiki-starter-plus-vs-original.md)

## Status

`llm-wiki-starter-plus` now describes the current working state of this repository.

The historical published entrypoints still use `llm-wiki-starter`, but the repo itself now behaves like:

1. Original scaffold / installer flow
2. `plus` CLI and schema enhancements layered on top

The current state is a working minimum platform for local LLM Wiki workflows, not just an installer.

## Completed

### Schema and Templates (v2 Structured Knowledge Architecture)

- Replaced source-centric schema with layered knowledge architecture:
  - System layer (`00 System/` / `00 系统/`)
  - Core layer (`10 Core/` / `10 核心/`)
  - Domain layer (`20 Domains/` / `20 领域/`)
  - Evidence layer (`30 Evidence/` / `30 证据/`)
  - Queries layer (`40 Queries/` / `40 问答/`)
  - Archived layer (`90 Archived/` / `90 归档/`)
- Introduced `kind` + `layer` frontmatter model replacing legacy `type`
- New page types: `method`, `case`, `moc`, `atom`
- Updated templates: `source`, `concept`, `entity`, `topic`, `synthesis`, `query`
- Added decision boundary sections to `method`/`topic`/`synthesis`/`query`
- Rewrote `AGENTS.md` with promotion path (`raw → source → atom → stable → synthesis`)
- Added `stability`, `bloom`, `review_cycle`, `confidence` metadata
- Added `Purpose` / `知识库目标` template pages
- Extended `source` template metadata: `domain`, `summary`, `raw_path`, `source_kind`, `fetched_at`

### CLI

- Modularized CLI into `lib/core.js`, `lib/ingest.js`, `lib/lint.js`, `lib/query.js`, `lib/graph.js`
- Added schema auto-detection (v2 vs legacy)
- `ingest`: generates `source` + `atom` drafts + promotion hints (v2); legacy compatible
- `query`: layer-aware scoring (`canonical` 1.5x, `domain` 1.2x, `evidence` 0.3x); provenance boost to 2.0x
- `lint`: checks `raw → source` coverage, `source → stable` compilation, orphan atoms, missing domain maps, missing decision boundaries
- `graph`: exports `kind`/`layer`/`domains` metadata; layer-based filtering and coloring
- Full read compatibility with legacy wikis maintained

### Reports and Visualization

- `lint` now writes markdown reports into wiki directories
- `graph` now exports:
  - `graph/graph.json`
  - `graph/index.html`
- Graph viewer supports:
  - type filters
  - selected node state
  - incoming/outgoing detail panel

### Testing

- Added smoke test coverage for core CLI workflows
- `npm test` now validates both v2 and legacy fixtures:
  - v2: base + lang overlay, layer-aware paths
  - legacy: backward compatibility for ingest/query/lint/graph paths
  - local markdown ingest
  - URL ingest
  - query text mode and JSON mode
  - lint report generation
  - graph export generation

## Near Term

### 1. Query Quality

- Improve ranking explanation
- Add stronger summary extraction for system pages
- Consider `--save --json` richer output for agent workflows

### 2. Graph Quality

- Improve node summaries in `graph.json`
- Add lightweight relationship grouping
- Consider a compact relation map layout beyond list/detail mode

### 3. Ingest Quality

- Better URL cleanup
- Better source type detection
- Stronger metadata extraction:
  - author
  - published date
  - source title normalization

## Mid Term

### 1. More Complete Wiki Pipeline

- Turn `ingest` into a richer source compiler
- Generate better draft source summaries
- Create optional query/synthesis placeholders from CLI workflows

### 2. Better Tooling Interfaces

- Add more structured machine-readable outputs
- Consider a lightweight MCP/tool-calling interface

### 3. Project Packaging

- Decide whether to fully promote `llm-wiki-starter-plus` as the public repo identity
- Decide whether CLI should remain repo-local or become a distributable package

## Constraints

- Keep markdown as the source of truth
- Keep generated caches and graph artifacts rebuildable
- Avoid introducing a heavy app/database layer that weakens portability
- Prefer zero-dependency or low-dependency tooling where practical

## Suggested Next Steps

1. Add dedicated CLI documentation
2. Add a comparison doc versus the original scaffold
3. Continue improving `query` and `graph` quality before adding larger architectural pieces
