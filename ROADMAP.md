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

### Schema and Templates

- Added `query` page type
- Added `Purpose` / `知识库目标` template pages
- Strengthened `AGENTS.md` rules for page creation, page relationships, and maintenance
- Extended `source` template metadata:
  - `domain`
  - `summary`
  - `raw_path`
  - `source_kind`
  - `fetched_at`

### CLI

- Added thin `llm-wiki` CLI
- Implemented `ingest`
- Implemented `query`
- Implemented `lint`
- Implemented `graph`

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
- `npm test` now validates:
  - local markdown ingest
  - URL ingest
  - query text mode
  - query JSON mode
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
