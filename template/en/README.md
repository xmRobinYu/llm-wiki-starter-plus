# <Wiki Name>

A personal knowledge base powered by the [LLM Wiki pattern](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f).

## Quick Start

1. Open this folder in [Obsidian](https://obsidian.md)
2. Start your AI agent: `claude`
3. Begin with your first ingest

## Operations

### 1. Ingest — Add knowledge

Place source materials in `raw/` or provide a URL directly:

```
Ingest this article: https://example.com/some-article
Ingest all new materials
```

The LLM reads the source, saves it to `raw/`, creates a `source` summary page in `30 Evidence/`, generates `atom` drafts in `20 Domains/<domain>/Workspace/Atoms/`, and updates the changelog.

Core ideas from the source should be distilled into atoms, then integrated into stable knowledge pages (`10 Core/` or `20 Domains/`).

### 2. Query — Ask questions

```
What is the relationship between X and Y?
Compare A and B
Summarize everything we know about topic Z
```

The LLM consults wiki pages starting from stable knowledge layers (`10 Core/`, `20 Domains/`), then drills into evidence (`30 Evidence/`) when tracing provenance. Answers include `[[wikilink]]` citations.

### 3. Lint — Health check

```
Run a health check on the wiki
```

Checks for:
- Orphan pages and dead links
- Missing frontmatter, kind, or layer
- Raw coverage gaps (`raw -> source`)
- Compilation gaps (`source -> atom/stable`)
- Orphan atoms, missing domain maps, missing decision boundaries

Reports are written to `wiki/00 System/Reports/`.

## Structure

This wiki uses a **layered knowledge architecture** with six logical layers:

```
raw/                          # Immutable source materials (LLM read-only)
├── inbox/                    # Web Clipper unified entry point
├── <domain>/                 # Organized by knowledge domain
└── assets/                   # Images, attachments

wiki/                         # LLM-maintained knowledge base
├── 00 System/                # Navigation, rules, logs
│   ├── Index.md              # Home page
│   ├── Purpose.md            # Mission, audience, scope
│   ├── Glossary.md           # Terminology
│   ├── Changelog.md          # Operation timeline
│   └── Review Rules.md       # Promotion criteria
├── 10 Core/                  # Cross-domain stable knowledge
│   ├── Maps/
│   ├── Concepts/
│   ├── Methods/
│   ├── Entities/
│   └── Synthesis/
├── 20 Domains/               # Domain-specific content
│   └── <Domain>/
│       ├── Domain Map.md
│       ├── Topics/
│       ├── Cases/
│       └── Workspace/
│           └── Atoms/        # Atomic knowledge drafts
├── 30 Evidence/              # Source summaries and extracts
│   ├── Summaries/
│   └── Extracts/
├── 40 Queries/               # High-reuse Q&A pages
└── 90 Archived/              # Deprecated pages

canvas/                       # JSON Canvas visual maps
graph/                        # Portable graph exports
templates/                    # Page templates (one per kind)
AGENTS.md                     # Wiki schema v2 (single source of truth)
CLAUDE.md                     # Claude Code config (imports AGENTS.md)
```

### Promotion Path

```
raw -> source -> atom -> concept/method/entity/topic -> synthesis
```

- `source` pages are evidence-layer drafts, NOT final stable knowledge
- `atom` cards are intermediate working state, one card one thing
- Stable knowledge lives in `10 Core/` (cross-domain) or `20 Domains/` (domain-specific)
- Content reused by 2+ domains may be promoted to Core layer
- Conclusions supported by 3+ sources may be promoted to synthesis

### Repository Strategy

- Same vault, same Git repository
- `raw/` is local-first and not tracked by default
- `wiki/`, system pages, and templates can be pushed to remote
- External document systems (e.g. Feishu) serve as supplementary backup only
