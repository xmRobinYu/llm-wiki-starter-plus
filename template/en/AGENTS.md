# <Wiki Name> — LLM Wiki Schema v2

> Built on [Andrej Karpathy's LLM Wiki pattern](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f).
> This file defines how the LLM maintains this knowledge base.
> Humans curate source materials and ask questions; the LLM handles all
> summarization, cross-referencing, archival, and maintenance.
>
> This is the shared schema (Single Source of Truth). Claude Code imports it
> via `@AGENTS.md`. Codex, Copilot, OpenCode, Gemini CLI, etc. read it directly.
> **Never duplicate this content into CLAUDE.md.**

## Architecture

Single vault, logical layers:

1. **`raw/`** — Immutable source documents. LLM reads but never writes. Local-first, not tracked by default.
2. **`wiki/`** — LLM-generated and maintained markdown pages. Organized by layer.
3. **This file (`AGENTS.md`)** — Schema specification. Defines structure, conventions, and workflows.

Layer structure:

| Layer | Directory | Purpose |
|-------|-----------|---------|
| System | `00 System/` | Rules, navigation, logs |
| Core | `10 Core/` | Cross-domain stable knowledge |
| Domain | `20 Domains/` | Domain-specific content |
| Evidence | `30 Evidence/` | Source summaries and extracts |
| Queries | `40 Queries/` | High-reuse Q&A |
| Archived | `90 Archived/` | Deprecated pages |

Prefer a small number of durable, well-linked pages over a large number of shallow, repetitive pages.

## Directory Structure

```
<wiki-name>/
├── raw/                        # Evidence layer: source materials (immutable, local-first)
│   ├── inbox/                  # Web Clipper unified entry point
│   ├── assets/                 # Images, attachments
│   └── <domain>/               # Organized by knowledge domain
├── wiki/                       # Knowledge layer: LLM-maintained
│   ├── 00 System/              # Navigation, rules, logs
│   │   ├── Purpose.md
│   │   ├── Index.md            # Home page
│   │   ├── Glossary.md
│   │   ├── Changelog.md
│   │   └── Review Rules.md
│   ├── 10 Core/                # Cross-domain stable knowledge
│   │   ├── Maps/
│   │   ├── Concepts/
│   │   ├── Methods/
│   │   ├── Entities/
│   │   └── Synthesis/
│   ├── 20 Domains/             # Domain-specific
│   │   └── <Domain>/
│   │       ├── Domain Map.md
│   │       ├── Topics/
│   │       ├── Cases/
│   │       └── Workspace/
│   │           └── Atoms/
│   ├── 30 Evidence/            # Source layer
│   │   ├── Summaries/
│   │   └── Extracts/
│   ├── 40 Queries/             # High-reuse Q&A
│   ├── 90 Archived/            # Deprecated pages
│   ├── canvas/                 # JSON Canvas visual maps
│   └── sortspec.md
├── graph/                      # Portable graph exports (derived artifacts)
├── templates/                  # Page templates
├── AGENTS.md                   # This schema file
├── CLAUDE.md                   # Claude Code schema
└── README.md                   # Repository documentation
```

Default strategy: **domain-first**. Without explicit instruction, do not use the full wiki as the default working context.

## Page Model

### Page Types (kind) and Layers (layer)

| kind | layer | Description | Default Location |
|---|---|---|---|
| `moc` | navigation | Content maps, navigation | `00 System/` or `20 Domains/*/Domain Map` |
| `concept` | canonical | Stable concept definitions | `10 Core/Concepts/` |
| `method` | canonical | Methods, frameworks, processes | `10 Core/Methods/` |
| `entity` | canonical | People, organizations, products | `10 Core/Entities/` |
| `synthesis` | canonical | Cross-source synthesis | `10 Core/Synthesis/` |
| `topic` | domain | Domain topic pages | `20 Domains/*/Topics/` |
| `case` | domain | Cases, events, post-mortems | `20 Domains/*/Cases/` |
| `atom` | working | Atomic cards, intermediate state | `20 Domains/*/Workspace/Atoms/` |
| `source` | evidence | Single-source summaries | `30 Evidence/Summaries/` |
| `query` | reusable | High-reuse Q&A | `40 Queries/` |

Note: `atom` is a workspace intermediate state. **Not emphasized as a primary navigation layer** for end users.

### Frontmatter Spec

```yaml
---
title: "Page Title"
kind: concept            # Page type
layer: canonical         # Belongs to layer
status: seed | draft | stable | archived
domains: [domain-id]     # Logical sub-library, multiple allowed
summary: "One-sentence summary"
sources: []
aliases: []
tags: []
stability: evergreen | volatile | time-bound
bloom: remember | understand | apply | analyze | evaluate | create
review_cycle: weekly | monthly | quarterly
confidence: low | medium | high
---
```

### Promotion Path

```
raw -> source -> atom -> concept/method/entity/topic -> synthesis
```

Default thresholds:
- Content reused by 2+ domains → suggest promoting to Core layer
- Conclusion supported by 3+ sources → suggest promoting to synthesis

## Page Creation Rules

- **Update before creating**: if an existing page can absorb new information cleanly, update it.
- **Read `wiki/00 System/Purpose.md` first** when deciding whether something belongs in this wiki.
- **`source`**: every formally ingested raw document maps to one source page. Source pages are evidence-layer drafts, NOT final stable knowledge.
- **`atom`**: atomic knowledge cards distilled from sources, one card one thing.
- **`concept`**: create only for stable, reusable concepts.
- **`method`**: standardized descriptions of methods, frameworks, and processes.
- **`topic`**: comprehensive descriptions of domain topics.
- **`synthesis`**: create only when multiple sources together justify a new thesis.
- **`query`**: create when a concrete Q&A will likely be useful again.

## Workflows

### 1. Ingest

Default output: `source + atom + candidate links + promotion hints`

1. Read the source document
2. Save to `raw/<domain>/`
3. Create source page in `30 Evidence/Summaries/`
4. Generate 1~5 atom drafts in `20 Domains/<domain>/Workspace/Atoms/`
5. Annotate atom candidates and promotion hints on the source page
6. **Do NOT create new stable knowledge pages by default**
7. Update changelog

### 2. Query

1. Default to consulting Core and Domain layer stable knowledge pages first
2. When tracing provenance, drill down into Evidence layer
3. Synthesize answers with `[[wikilink]]` citations
4. If the answer has substantial value, suggest saving as a query page
5. Update changelog

### 3. Lint

1. Check `raw -> source` coverage
2. Check `source -> atom/stable` compilation completion
3. Find orphan atoms, missing domain maps, missing decision boundaries
4. Check periodic review based on `review_cycle`
5. Write reports to `00 System/Reports/`

## Tag System

Use a **controlled vocabulary**. Keep tags concise (≤6 words per tag).

**Content-type tags:** `concept`, `tutorial`, `deep-dive`, `overview`, `opinion`, `news`, `tool`, `paradigm`, `anti-pattern`, `case-study`, `benchmark`, `best-practice`

**Meta tags:** `evergreen`, `fast-moving`, `foundational`, `advanced`

**Domain tags:** Define your own based on your knowledge domain. Keep them consistent.

## Constraints

- Never modify files in `raw/`.
- Never fabricate information. Mark `confidence: low` and note uncertainty when unsure.
- Always use the frontmatter format above when creating wiki pages.
- Always update the changelog after every operation.
- Keep pages focused. Split pages exceeding ~500 lines.
- Prefer updating existing pages over creating new ones when content overlaps.
- The `sources` field in frontmatter must use `[[wikilink]]` format.
- **Ingest / lint / query operations only modify wiki pages, never `CLAUDE.md` or `AGENTS.md`.**

## Repository Strategy

- Same vault, same Git repository
- `raw/` local-first, not tracked by default
- `wiki/`, system pages, templates can be pushed to remote
- Feishu/Lark documents can serve as supplementary backup for selected source materials
