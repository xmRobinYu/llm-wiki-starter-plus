# llm-wiki-starter-plus vs Original llm-wiki-starter

Docs navigation:

- [../README.md](../README.md)
- [../ROADMAP.md](../ROADMAP.md)
- [index.md](./index.md)
- [cli.md](./cli.md)

## Summary

The original `llm-wiki-starter` is primarily an installer and scaffold.

`llm-wiki-starter-plus` keeps that foundation, but adds a working local workflow layer on top:

- stronger schema
- richer templates
- local CLI
- graph export
- smoke tests

## Original Strengths

The original project already does these well:

- one-command setup
- tool detection and installation
- Obsidian integration
- plugin/theme configuration
- template-based LLM Wiki scaffold

That remains the base.

## What `plus` Adds

### 1. v2 Structured Knowledge Architecture

Replaced the flat source-centric structure with a layered architecture:

| Layer | Directory | Purpose |
|-------|-----------|---------|
| System | `00 System/` | Navigation, rules, logs |
| Core | `10 Core/` | Cross-domain stable knowledge |
| Domain | `20 Domains/` | Domain-specific content |
| Evidence | `30 Evidence/` | Source summaries and extracts |
| Queries | `40 Queries/` | High-reuse Q&A |
| Archived | `90 Archived/` | Deprecated pages |

Key schema changes:
- `kind` + `layer` frontmatter replacing legacy `type`
- Promotion path: `raw → source → atom → stable → synthesis`
- `stability`, `bloom`, `review_cycle`, `confidence` metadata
- Domain-first default workflow

### 2. Schema Hardening

- `query` page type
- `Purpose` / `知识库目标`
- stronger page creation rules
- stronger page relationship rules
- richer `source` metadata

### 3. Template Expansion

- added `method`, `case`, `moc`, `atom` templates
- added decision boundary sections to key page types
- aligned `source` template with v2 evidence-layer positioning
- aligned all templates with `kind`/`layer` frontmatter

### 4. Local CLI

The original project did not provide a working local command surface for wiki operations.

`plus` adds:

- `llm-wiki ingest`
- `llm-wiki query`
- `llm-wiki lint`
- `llm-wiki graph`

All commands auto-detect v2 vs legacy schema and adapt paths accordingly.

### 5. Query Workflow

- ranked local page search with layer-aware scoring
- `--top N`
- `--json` with `kind`/`layer`/`domains` fields
- `--save` draft query page generation
- provenance query detection (boosts evidence layer)

### 6. Lint Workflow

- terminal lint summary
- markdown report generation (schema-aware paths)
- changelog append
- v2-specific checks: orphan atoms, missing domain maps, missing decision boundaries

### 7. Graph Workflow

- `graph.json` export with `kind`/`layer`/`domains` metadata
- `index.html` static viewer
- kind and layer filtering
- layer-based coloring (evidence layer muted)
- node details
- incoming/outgoing relation inspection

### 8. Testing

The original repo did not have this CLI smoke coverage.

`plus` adds:

- `npm test`
- dual-fixture smoke validation (v2 + legacy)
- coverage for all core CLI workflows

## Architectural Difference

### Original

Primarily:

- scaffold creator
- environment installer
- template distributor

### llm-wiki-starter-plus

Now both:

- scaffold creator
- lightweight local workflow engine

That is the biggest difference.

## What `plus` Still Does Not Try To Be

It is still not:

- a full desktop application
- a database-backed knowledge platform
- a polished hosted knowledge service

The core design remains:

- markdown-first
- Obsidian-friendly
- rebuildable artifacts
- portable local files

## Recommended Positioning

Use the original if you only need:

- environment setup
- wiki scaffold generation

Use `llm-wiki-starter-plus` if you want:

- a scaffold plus an actual local workflow layer
- CLI support for ingestion/query/lint/graph
- a better path toward future agent/tool integration
