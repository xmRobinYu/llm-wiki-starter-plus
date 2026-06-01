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

### 1. Schema Hardening

- `query` page type
- `Purpose` / `知识库目标`
- stronger page creation rules
- stronger page relationship rules
- richer `source` metadata

### 2. Template Expansion

- added `query` templates
- added purpose templates
- aligned `source` template with richer metadata fields

### 3. Local CLI

The original project did not provide a working local command surface for wiki operations.

`plus` adds:

- `llm-wiki ingest`
- `llm-wiki query`
- `llm-wiki lint`
- `llm-wiki graph`

### 4. Query Workflow

- ranked local page search
- `--top N`
- `--json`
- `--save` draft query page generation

### 5. Lint Workflow

- terminal lint summary
- markdown report generation
- changelog append

### 6. Graph Workflow

- `graph.json` export
- `index.html` static viewer
- type filtering
- node details
- incoming/outgoing relation inspection

### 7. Testing

The original repo did not have this CLI smoke coverage.

`plus` adds:

- `npm test`
- temporary-copy smoke validation for all core CLI workflows

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
