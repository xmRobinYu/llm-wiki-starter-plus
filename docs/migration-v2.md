# Migration Guide: Legacy → v2 Structured Knowledge Architecture

> Target audience: existing `llm-wiki-starter-plus` users who want to align their wiki with the new layered schema.

## What Changed

The v2 schema replaces the flat, source-centric structure with a **layered knowledge architecture**:

| Aspect | Legacy | v2 |
|--------|--------|-----|
| Frontmatter | `type` | `kind` + `layer` |
| System pages | `wiki/Index.md`, `wiki/Overview.md` | `wiki/00 System/Index.md`, `wiki/00 System/Purpose.md` |
| Stable knowledge | `wiki/concepts/`, `wiki/synthesis/` | `wiki/10 Core/Concepts/`, `wiki/10 Core/Synthesis/` |
| Domain content | `wiki/<domain>/` | `wiki/20 Domains/<domain>/` |
| Source summaries | `wiki/summaries/` | `wiki/30 Evidence/Summaries/` |
| Queries | `wiki/queries/` | `wiki/40 Queries/` |
| Atom drafts | Not generated | `wiki/20 Domains/<domain>/Workspace/Atoms/` |

## Migration Steps

### 1. Create the new directory skeleton

In your wiki root, create the six layer directories:

```bash
mkdir -p "wiki/00 System"
mkdir -p "wiki/10 Core/Concepts"
mkdir -p "wiki/10 Core/Methods"
mkdir -p "wiki/10 Core/Entities"
mkdir -p "wiki/10 Core/Synthesis"
mkdir -p "wiki/10 Core/Maps"
mkdir -p "wiki/20 Domains"
mkdir -p "wiki/30 Evidence/Summaries"
mkdir -p "wiki/30 Evidence/Extracts"
mkdir -p "wiki/40 Queries"
mkdir -p "wiki/90 Archived"
```

### 2. Migrate system pages

Move existing system pages into `00 System/`:

| Legacy location | v2 location |
|-----------------|-------------|
| `wiki/Index.md` | `wiki/00 System/Index.md` |
| `wiki/Overview.md` | `wiki/00 System/Purpose.md` |
| `wiki/Glossary.md` | `wiki/00 System/Glossary.md` |
| `wiki/Changelog.md` | `wiki/00 System/Changelog.md` |
| `wiki/Review Rules.md` | `wiki/00 System/Review Rules.md` |

Update their frontmatter:

```yaml
---
title: "Index"
kind: moc
layer: navigation
# ... rest of fields
---
```

### 3. Migrate stable knowledge pages

Move concept, method, entity, and synthesis pages into `10 Core/`:

```bash
# Example: move all concept pages
mv wiki/concepts/* "wiki/10 Core/Concepts/" 2>/dev/null || true
mv wiki/synthesis/* "wiki/10 Core/Synthesis/" 2>/dev/null || true
```

Update frontmatter on each page:

```yaml
---
title: "Page Title"
kind: concept    # or method / entity / synthesis
layer: canonical
domains: [domain-id]
# ... rest of fields
---
```

### 4. Migrate domain-specific pages

Move domain directories into `20 Domains/`:

```bash
# Example: move an existing domain
mv "wiki/AI Agent" "wiki/20 Domains/" 2>/dev/null || true
```

Create a domain map for each migrated domain:

```markdown
---
title: "Domain Map"
kind: moc
layer: navigation
domains: [ai-agent]
---

# AI Agent Domain Map

## Topics

## Cases

## Workspace
```

Update topic pages:

```yaml
---
title: "Topic Title"
kind: topic
layer: domain
domains: [ai-agent]
---
```

### 5. Migrate source summaries

Move source pages into `30 Evidence/`:

```bash
mv wiki/summaries/* "wiki/30 Evidence/Summaries/" 2>/dev/null || true
```

Update source page frontmatter:

```yaml
---
title: "Summary：Article Title"
kind: source
layer: evidence
domains: [domain-id]
# ... rest of fields
---
```

### 6. Migrate queries

Move query pages into `40 Queries/`:

```bash
mv wiki/queries/* "wiki/40 Queries/" 2>/dev/null || true
```

Update query page frontmatter:

```yaml
---
title: "Query：Question"
kind: query
layer: reusable
domains: []
---
```

### 7. Update AGENTS.md

Replace your wiki's `AGENTS.md` with the v2 version from the starter template. The v2 schema defines:

- Layer structure and responsibilities
- Page types (`kind`) and their default locations
- Promotion path: `raw → source → atom → canonical → synthesis`
- Frontmatter spec with `kind`, `layer`, `domains`, `stability`, `bloom`, `review_cycle`

### 8. Run lint

After migration, run lint to identify remaining issues:

```bash
npx llm-wiki lint --root ./my-wiki
```

Common post-migration issues:

- Missing `kind` / `layer` on migrated pages
- Missing domain maps
- Orphan pages (no inbound links)
- Dead links (pointing to old paths)

### 9. Update .gitignore (optional)

If you want the v2 local-first raw strategy:

```gitignore
/raw/**/*.md
!/raw/sortspec.md
!/raw/**/sortspec.md
/graph/
```

## Backward Compatibility

The CLI maintains **read compatibility** with legacy wikis:

- `ingest` still writes to `wiki/summaries/` on legacy roots
- `query` still works on legacy roots
- `lint` still reports to `wiki/reports/` on legacy roots
- `graph` still exports from legacy roots

You do not need to migrate immediately. The CLI auto-detects schema version and adapts paths accordingly.

## No Automatic Migration Script

This guide is intentionally manual. Automatic migration is risky because:

- Page classification (`kind` assignment) requires domain judgment
- Directory names may vary across individual wikis
- Link references need careful verification

If you have many pages, consider migrating one domain at a time.
