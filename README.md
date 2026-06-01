English | [简体中文](./README.zh-CN.md)

# llm-wiki-starter-plus

One command to scaffold an [Andrej Karpathy's LLM Wiki](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f) AI knowledge base, plus a lightweight local CLI workflow for ingest, query, lint, and graph export.

Auto-installs Claude Code + Obsidian + recommended plugins (Skills & Plugins & Theme & Shortcuts), so AI can continuously build and maintain your personal knowledge system.

Compatible with Claude Code, Codex, Copilot, Gemini CLI, OpenCode, and other mainstream AI agents out of the box.

This repository now has two layers:

1. **Starter**: install tools, scaffold a fresh Obsidian-based LLM Wiki, configure plugins and theme
2. **Workflow layer**: run local `llm-wiki` CLI commands for `ingest`, `query`, `lint`, `graph`, and smoke tests

Branding note:

- The published installer and skill entrypoints still use the historical `llm-wiki-starter` name.
- This repository-level documentation now describes the enhanced working state as `llm-wiki-starter-plus`.
- In practice, think of it as the original starter plus a local workflow layer, not a separate fork with a different installation path.

Related docs:

- [docs/index.md](./docs/index.md)
- [ROADMAP.md](./ROADMAP.md)
- [docs/cli.md](./docs/cli.md)
- [docs/llm-wiki-starter-plus-vs-original.md](./docs/llm-wiki-starter-plus-vs-original.md)

![ai-wiki](./assets/ai-wiki.png)

## Highlights

- One-command local LLM Wiki scaffold
- Obsidian-first setup with plugins, theme, and shortcuts
- Shared schema for Claude Code, Codex, Copilot, Gemini CLI, OpenCode, and others
- Local CLI for:
  - `ingest`
  - `query`
  - `lint`
  - `graph`
- Static graph viewer with type filters and node detail panel
- Smoke test coverage via `npm test`

## Installation

### Option A — bash script

```bash
curl -fsSL https://raw.githubusercontent.com/eleven-net-cn/llm-wiki-starter/main/install.sh | bash
```
![create-ai-wiki](./assets/create-ai-wiki.svg)

> **Windows users**: Run the installer from **Git Bash** (recommended) or **WSL2** — `cmd.exe` and PowerShell cannot execute bash scripts. Install [Git for Windows](https://git-scm.com/download/win) (provides Git Bash + curl), then run `git config --global core.autocrlf input` to avoid `bad interpreter` errors. The installer auto-detects winget / Chocolatey / Scoop to fetch Obsidian, Node.js and Git.

With options:

```bash
# Only detect and install global tools (Claude Code, Obsidian, NodeJS, Agent Skills, etc.)
curl -fsSL https://raw.githubusercontent.com/eleven-net-cn/llm-wiki-starter/main/install.sh | bash -s -- --only-tools

# Skip global tools detection/installation, only create wiki knowledge base
curl -fsSL https://raw.githubusercontent.com/eleven-net-cn/llm-wiki-starter/main/install.sh | bash -s -- --only-wiki

# Skip tools and wiki creation, only configure Obsidian (plugins, theme, shortcuts) in current vault
curl -fsSL https://raw.githubusercontent.com/eleven-net-cn/llm-wiki-starter/main/install.sh | bash -s -- --only-obsidian
```

### Option B — Skill install (for AI Agent users, or when bash has environment issues)

> This produces the same result as `install.sh`. Agent-guided creation consumes tokens — recommended only when the bash script can't run in your environment.

1. Install the Skill

    ```bash
    npx skills add eleven-net-cn/llm-wiki-starter -g
    ```

2. Trigger by chatting in your AI Agent:

    ```bash
    "create llm wiki"

    # or

    "scaffold an llm wiki"

    # or similar...
    ```

    The Agent will auto-detect installed tools and guide you through the setup.

3. Or, use the slash command in your Agent:

    ```bash
    /llm-wiki-starter
    ```

    The slash command supports all parameters, e.g.:

    ```bash
    # Only create wiki + Obsidian config, skip tool install
    /llm-wiki-starter --only-wiki

    # /llm-wiki-starter --bash    # Pipe through bash script — saves tokens
    ```

### Options

Supported options (use as needed):

| Option | Description | Default |
|--------|-------------|---------|
| `--name <name>` | Wiki name | `my-wiki` |
| `--dir <directory>` | Target directory | `./<name>` |
| `--lang <en\|zh>` | Wiki language | `en` |
| `--yes, -y` | Skip all prompts, use defaults | - |
| `--only-tools` | Install tools only, without creating wiki | - |
| `--only-wiki` | Create wiki and Obsidian config only, without installing tools | - |
| `--only-obsidian` | Configure Obsidian in existing vault only | - |
| `--bash` | Used via `/llm-wiki-starter --bash` (gives Agent users a more flexible, token-saving path) | - |

### What Gets Installed

Detects what's already on your system and only installs what's missing.

**Tools & Skills**

- ✅ **Claude Code** — Recommended AI agent
- ✅ **Node.js** — Runtime for Claude Code and Skills CLI
- ✅ **Obsidian** — Wiki editor and visual graph viewer
- ✅ **[kepano/obsidian-skills](https://github.com/kepano/obsidian-skills)** — Obsidian Markdown, CLI interaction, Bases database views, web scraping (defuddle)
- ✅ **[axtonliu/visual-skills](https://github.com/axtonliu/axton-obsidian-visual-skills)** — Excalidraw diagrams, Mermaid charts, Obsidian Canvas, JSON Canvas
- ✅ **Git** — Version control (optional)

> Skills are installed globally via [Skills CLI](https://github.com/vercel-labs/skills), shared across agents.

**Obsidian**

- **Plugins** (17 plugins: 9 Core + 8 UX, auto-configured with wiki)

    Core plugins (required for llm-wiki functionality):

    - ✅ **[Claudian](https://github.com/YishenTu/claudian)** — Embed Claude Code / Codex / OpenCode agents in vault, sidebar chat with full agentic capabilities
    - ✅ **Dataview** — SQL-like queries on page frontmatter
    - ✅ **Templater** — Template system for new pages
    - ✅ **Linter** — Automatic Markdown formatting
    - ✅ **Custom Sort** — File explorer ordering via sortspec
    - ✅ **Obsidian Git** — Auto git commit/push (requires Git)
    - ✅ **Tag Wrangler** — Rename, merge, and manage tags
    - ✅ **Strange New Worlds** — Show wikilink reference counts
    - ✅ **Homepage** — Set a landing page on vault open

    UX plugins (enhance Obsidian editing experience):

    - ✅ **Omnisearch** — Fuzzy search across vault
    - ✅ **Switcher++** — Quick switcher with headings navigation
    - ✅ **Minimal Theme Settings** — Minimal theme configuration
    - ✅ **Hider** — Hide UI elements for cleaner interface
    - ✅ **Editing Toolbar** — MS Word-like toolbar + F11 fullscreen shortcuts
    - ✅ **Excalidraw** — Hand-drawn style diagrams
    - ✅ **Quiet Outline** — Enhanced outline view
    - ✅ **Open in Terminal** — Open vault in terminal

- **Theme**

    ✅ **Minimal** — Clean, distraction-free theme (auto-downloaded)

- **Key Shortcuts**

    - `Cmd+Shift+F` → Omnisearch (fuzzy search)
    - `Cmd+R` → Quick switcher (headings)
    - `Cmd+F11` → Workplace fullscreen
    - `Cmd+Shift+F11` → Editor fullscreen focus

**Browser Extension (recommended)**

- **[Obsidian Web Clipper](https://chromewebstore.google.com/detail/obsidian-web-clipper/cnjifjpddelmedmihgijeibhnjfabmlf)** — Clip web articles directly to `raw/inbox/` for LLM ingestion

## Getting Started

```bash
# Open in Obsidian
cd my-wiki && open -a Obsidian .

# Start AI agent (also works with codex / copilot / gemini, etc.)
claude
```

Then chat with the AI:

- **Ingest** → `Ingest this article: https://example.com/some-article`
- **Query** → `What is the relationship between X and Y?`
- **Lint** → `Run a health check on the wiki`

## Local CLI

Repo-local CLI usage:

```bash
npm run cli -- help
npm run cli -- ingest --root ./my-wiki ./notes/article.md
npm run cli -- ingest --root ./my-wiki "https://example.com"
npm run cli -- ingest --root ./my-wiki --domain research ./notes/article.md
npm run cli -- lint --root ./my-wiki
npm run cli -- graph --root ./my-wiki
npm run cli -- query --root ./my-wiki --save "What belongs in this wiki?"
npm run cli -- query --root ./my-wiki --top 5 --json "purpose index overview"
```

Smoke test:

```bash
npm test
```

The CLI provides a local command surface for future automation:

- `llm-wiki ingest`
- `llm-wiki query`
- `llm-wiki lint`
- `llm-wiki graph`

`ingest` copies a local markdown file into `raw/` or fetches a URL into `raw/`, then creates a draft `source` summary page. Use `--domain <name>` to choose the raw subdirectory and persist that domain in source metadata.

`lint` prints issues to the terminal and also writes a markdown report to `wiki/reports/`.

`query --save` writes a draft page to `wiki/queries/` so the answer can be refined inside the vault.

Use `--top N` to limit results and `--json` for structured output.

`graph` writes a portable graph export to `graph/graph.json` and a static viewer to `graph/index.html`, with type filters and a node detail panel.

## Wiki Structure

```
my-wiki/
├── raw/                     # Immutable source materials (LLM read-only)
│   ├── inbox/               # Web Clipper inbox (auto-sorted on ingest)
│   ├── <domain>/            # Organized by knowledge domain
│   └── assets/              # Images, attachments
├── wiki/                    # LLM-maintained knowledge base
│   ├── <domain>/            # Domain-specific compiled pages
│   ├── concepts/            # Concept definition pages
│   ├── summaries/           # Source material summaries
│   ├── synthesis/           # Cross-cutting analysis
│   ├── archived/            # Deprecated pages
│   └── assets/excalidraw/   # Diagrams
├── canvas/                  # JSON Canvas visual maps
├── templates/               # Page templates (one per type, used by LLM)
├── AGENTS.md                # Wiki schema (single source of truth)
└── CLAUDE.md                # Claude Code config (imports AGENTS.md)
```

> **Tip**: Domain directories (e.g. `AI Agent/`, `Machine Learning/`) are created automatically during your first ingest. Just tell the AI what domain your knowledge belongs to — or let it decide based on the content.

## What is LLM Wiki?

[LLM Wiki](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f) is a knowledge management pattern proposed by Andrej Karpathy: instead of traditional RAG that retrieves from scratch every query, the LLM **incrementally builds and maintains a persistent wiki** — cross-references are established automatically, contradictions are flagged, and synthesis is continuously updated. Each new source makes the wiki richer.

**Suitable for**: personal knowledge management, technical research, domain learning notes, team knowledge bases — any scenario where you want AI to help you accumulate and organize knowledge over time.

**How it works**: [Claude Code](https://claude.ai/claude-code) serves as the AI agent that reads, writes and maintains the wiki; [Obsidian](https://obsidian.md) serves as the visual editor and reader. You chat with the AI to ingest sources, query knowledge, and run health checks — while browsing and navigating the wiki graph in Obsidian.

**Three-layer architecture**: `raw/` (immutable sources) → `wiki/` (LLM-maintained pages) → Schema (`AGENTS.md`)

**Three operations**: **Ingest** (add knowledge) → **Query** (ask questions) → **Lint** (health check)

## Positioning

Use `llm-wiki-starter-plus` if you want:

- a one-command starter for a local Obsidian LLM Wiki
- a shared schema for multiple agent CLIs
- a lightweight local workflow layer without introducing a database or desktop app

If you only need the scaffold and installer flow, that remains intact under the original `llm-wiki-starter` entrypoints.

If you also want working local wiki operations, this repository now includes that workflow layer as part of `llm-wiki-starter-plus`.

## Credits

- [Andrej Karpathy — LLM Wiki](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f)

## License

[MIT](LICENSE)
