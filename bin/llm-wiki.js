#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const argv = process.argv.slice(2);
const command = argv[0] || "help";
const args = argv.slice(1);

const COMMANDS = new Set(["help", "ingest", "query", "lint", "graph"]);

function printHelp() {
  console.log(`llm-wiki <command> [options]

Commands:
  ingest   Register new source material into raw/
  query    Answer from the compiled wiki and optionally save a query page
  lint     Check wiki structure, links, and coverage
  graph    Export graph artifacts from markdown pages

Options:
  --root <path>   Path to the wiki root (default: current directory)
  -h, --help      Show this help

Examples:
  llm-wiki ingest ./notes/article.md
  llm-wiki query "What is the relationship between X and Y?"
  llm-wiki lint --root ~/Documents/my-wiki
  llm-wiki graph --root ~/Documents/my-wiki
`);
}

function fail(message) {
  console.error(`Error: ${message}`);
  process.exit(1);
}

function parseRoot(rawArgs) {
  let root = process.cwd();
  const rest = [];

  for (let i = 0; i < rawArgs.length; i += 1) {
    const arg = rawArgs[i];
    if (arg === "--root") {
      const next = rawArgs[i + 1];
      if (!next) fail("missing value for --root");
      root = path.resolve(next);
      i += 1;
      continue;
    }
    if (arg === "-h" || arg === "--help") {
      printHelp();
      process.exit(0);
    }
    rest.push(arg);
  }

  return { root, rest };
}

function ensureWikiRoot(root) {
  const required = ["AGENTS.md", "wiki", "raw"];
  const missing = required.filter((name) => !fs.existsSync(path.join(root, name)));
  if (missing.length > 0) {
    fail(`wiki root not detected at ${root}. Missing: ${missing.join(", ")}`);
  }
}

function walkFiles(rootDir) {
  if (!fs.existsSync(rootDir)) return [];
  const results = [];
  const stack = [rootDir];

  while (stack.length > 0) {
    const current = stack.pop();
    const entries = fs.readdirSync(current, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(fullPath);
      } else {
        results.push(fullPath);
      }
    }
  }

  return results.sort();
}

function toPosix(value) {
  return value.split(path.sep).join("/");
}

function relativeTo(root, fullPath) {
  return toPosix(path.relative(root, fullPath));
}

function parseFrontmatter(content) {
  if (!content.startsWith("---\n")) return null;
  const end = content.indexOf("\n---\n", 4);
  if (end === -1) return null;
  const block = content.slice(4, end).trim();
  const fields = {};

  for (const line of block.split("\n")) {
    const index = line.indexOf(":");
    if (index === -1) continue;
    const key = line.slice(0, index).trim();
    const value = line.slice(index + 1).trim();
    fields[key] = value;
  }

  return fields;
}

function extractWikiLinks(content) {
  const matches = content.match(/\[\[([^\]]+)\]\]/g) || [];
  return matches.map((match) => match.slice(2, -2).split("|")[0].trim()).filter(Boolean);
}

function isSystemWikiPage(basename) {
  return /^(Index|Overview|Changelog|Purpose|Wiki 目录|知识库概览|操作日志|知识库目标|sortspec)$/.test(
    basename
  );
}

function runLint(root) {
  const wikiDir = path.join(root, "wiki");
  const rawDir = path.join(root, "raw");
  const wikiFiles = walkFiles(wikiDir).filter((file) => file.endsWith(".md"));
  const rawFiles = walkFiles(rawDir).filter((file) => file.endsWith(".md"));

  const pageRecords = wikiFiles
    .filter((file) => path.basename(file) !== "sortspec.md")
    .map((file) => {
    const content = fs.readFileSync(file, "utf8");
    const relPath = relativeTo(root, file);
    const basename = path.basename(file, ".md");
    return {
      file,
      relPath,
      basename,
      content,
      frontmatter: parseFrontmatter(content),
      links: extractWikiLinks(content)
    };
    });

  const wikiNames = new Set(pageRecords.map((record) => record.basename));
  const inboundCounts = new Map(pageRecords.map((record) => [record.basename, 0]));

  const problems = {
    missingFrontmatter: [],
    missingType: [],
    missingSummary: [],
    deadLinks: [],
    orphanPages: [],
    rawCoverage: []
  };

  for (const record of pageRecords) {
    if (!record.frontmatter && !isSystemWikiPage(record.basename)) {
      problems.missingFrontmatter.push(record.relPath);
    } else if (record.frontmatter) {
      if (!record.frontmatter.type && !isSystemWikiPage(record.basename)) {
        problems.missingType.push(record.relPath);
      }
      if (!record.frontmatter.summary && !isSystemWikiPage(record.basename)) {
        problems.missingSummary.push(record.relPath);
      }
    }

    for (const link of record.links) {
      if (wikiNames.has(link)) {
        inboundCounts.set(link, (inboundCounts.get(link) || 0) + 1);
      } else if (!link.startsWith("http") && !link.endsWith("/")) {
        problems.deadLinks.push(`${record.relPath} -> [[${link}]]`);
      }
    }
  }

  for (const record of pageRecords) {
    const inbound = inboundCounts.get(record.basename) || 0;
    if (inbound === 0 && !isSystemWikiPage(record.basename)) {
      problems.orphanPages.push(record.relPath);
    }
  }

  const summaryFiles = pageRecords
    .filter((record) => record.frontmatter && record.frontmatter.type === "source")
    .map((record) => record.basename.replace(/^Summary：/, "").replace(/^资料摘要：/, ""));

  for (const rawFile of rawFiles) {
    const rawName = path.basename(rawFile, ".md");
    if (rawName === "sortspec") continue;
    const matched = summaryFiles.some((name) => rawName.includes(name) || name.includes(rawName));
    if (!matched) {
      problems.rawCoverage.push(relativeTo(root, rawFile));
    }
  }

  const totalProblems = Object.values(problems).reduce((count, entries) => count + entries.length, 0);

  console.log(`[lint] root: ${root}`);
  console.log(`wiki pages: ${pageRecords.length}`);
  console.log(`raw markdown files: ${rawFiles.length}`);
  console.log(`issues: ${totalProblems}`);

  for (const [name, entries] of Object.entries(problems)) {
    console.log(`\n${name}: ${entries.length}`);
    for (const entry of entries.slice(0, 20)) {
      console.log(`- ${entry}`);
    }
    if (entries.length > 20) {
      console.log(`- ... ${entries.length - 20} more`);
    }
  }

  if (totalProblems > 0) {
    process.exitCode = 1;
  }
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function buildGraphHtml() {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>LLM Wiki Graph</title>
  <style>
    :root {
      color-scheme: light;
      --bg: #f4f1ea;
      --panel: #fffdf8;
      --line: #d8cfbf;
      --ink: #1f1b16;
      --muted: #6d6254;
      --accent: #0d6b5f;
      --accent-soft: #d9eee9;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: "Iowan Old Style", "Palatino Linotype", "Book Antiqua", serif;
      background: linear-gradient(180deg, #efe7da 0%, var(--bg) 100%);
      color: var(--ink);
    }
    header {
      padding: 32px 24px 16px;
      border-bottom: 1px solid var(--line);
    }
    h1 {
      margin: 0 0 8px;
      font-size: 32px;
      line-height: 1.1;
    }
    .subtitle {
      color: var(--muted);
      max-width: 70ch;
    }
    .layout {
      display: grid;
      grid-template-columns: 320px 1fr;
      gap: 16px;
      padding: 16px 24px 24px;
    }
    .panel {
      background: var(--panel);
      border: 1px solid var(--line);
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 10px 30px rgba(31, 27, 22, 0.06);
    }
    .panel h2 {
      margin: 0;
      padding: 16px 18px;
      font-size: 14px;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      border-bottom: 1px solid var(--line);
      color: var(--muted);
    }
    .panel-body {
      padding: 14px 16px 16px;
    }
    .stats {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 10px;
      margin-bottom: 16px;
    }
    .stat {
      padding: 12px;
      border-radius: 12px;
      background: #f7f3eb;
      border: 1px solid var(--line);
    }
    .stat-label {
      display: block;
      font-size: 12px;
      color: var(--muted);
      margin-bottom: 4px;
      text-transform: uppercase;
      letter-spacing: 0.06em;
    }
    .stat-value {
      font-size: 22px;
      font-weight: 700;
    }
    input[type="search"] {
      width: 100%;
      border: 1px solid var(--line);
      border-radius: 999px;
      padding: 10px 14px;
      font: inherit;
      background: #fff;
      color: var(--ink);
      margin-bottom: 12px;
    }
    .legend {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }
    .chip {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 6px 10px;
      border-radius: 999px;
      background: var(--accent-soft);
      color: var(--accent);
      font-size: 12px;
      border: 1px solid rgba(13, 107, 95, 0.15);
    }
    .list {
      display: grid;
      gap: 10px;
      max-height: 70vh;
      overflow: auto;
      padding-right: 4px;
    }
    .node {
      border: 1px solid var(--line);
      border-radius: 14px;
      padding: 14px;
      background: #fff;
    }
    .node-title {
      font-size: 18px;
      margin: 0 0 6px;
    }
    .node-meta {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-bottom: 8px;
      color: var(--muted);
      font-size: 12px;
    }
    .node-summary {
      margin: 0;
      color: var(--muted);
      font-size: 14px;
      line-height: 1.5;
    }
    .edge-list {
      margin-top: 24px;
      border-top: 1px dashed var(--line);
      padding-top: 16px;
    }
    .edge-item {
      font-size: 13px;
      color: var(--muted);
      padding: 4px 0;
    }
    .empty {
      color: var(--muted);
      font-style: italic;
    }
    @media (max-width: 900px) {
      .layout {
        grid-template-columns: 1fr;
      }
    }
  </style>
</head>
<body>
  <header>
    <h1>LLM Wiki Graph</h1>
    <div class="subtitle">Portable graph view generated from wiki markdown. This page reads <code>graph.json</code> from the same folder and renders nodes plus wikilink relationships.</div>
  </header>
  <main class="layout">
    <section class="panel">
      <h2>Controls</h2>
      <div class="panel-body">
        <div class="stats">
          <div class="stat">
            <span class="stat-label">Nodes</span>
            <span class="stat-value" id="nodeCount">0</span>
          </div>
          <div class="stat">
            <span class="stat-label">Edges</span>
            <span class="stat-value" id="edgeCount">0</span>
          </div>
        </div>
        <input id="search" type="search" placeholder="Filter nodes by title, type, or path" />
        <div class="legend" id="legend"></div>
      </div>
    </section>
    <section class="panel">
      <h2>Nodes</h2>
      <div class="panel-body">
        <div id="nodes" class="list"></div>
      </div>
    </section>
  </main>
  <script>
    const nodeCount = document.getElementById("nodeCount");
    const edgeCount = document.getElementById("edgeCount");
    const nodesEl = document.getElementById("nodes");
    const legendEl = document.getElementById("legend");
    const searchEl = document.getElementById("search");

    function escapeHtml(value) {
      return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;");
    }

    function render(data, query = "") {
      const normalized = query.trim().toLowerCase();
      const nodes = data.nodes.filter((node) => {
        if (!normalized) return true;
        return [node.title, node.type, node.path, node.summary].join(" ").toLowerCase().includes(normalized);
      });

      const edgesBySource = new Map();
      for (const edge of data.edges) {
        if (!edgesBySource.has(edge.source)) edgesBySource.set(edge.source, []);
        edgesBySource.get(edge.source).push(edge);
      }

      nodeCount.textContent = String(nodes.length);
      edgeCount.textContent = String(data.edges.length);

      const types = [...new Set(data.nodes.map((node) => node.type))].sort();
      legendEl.innerHTML = types
        .map((type) => '<span class="chip">' + escapeHtml(type) + '</span>')
        .join("");

      if (nodes.length === 0) {
        nodesEl.innerHTML = '<p class="empty">No nodes match this filter.</p>';
        return;
      }

      nodesEl.innerHTML = nodes.map((node) => {
        const outgoing = edgesBySource.get(node.id) || [];
        const edgeHtml = outgoing.length === 0
          ? '<div class="empty">No outgoing wikilinks.</div>'
          : outgoing.map((edge) => '<div class="edge-item">' + escapeHtml(edge.source) + ' → ' + escapeHtml(edge.target) + '</div>').join("");

        return [
          '<article class="node">',
          '<h3 class="node-title">' + escapeHtml(node.title) + '</h3>',
          '<div class="node-meta">',
          '<span>' + escapeHtml(node.type) + '</span>',
          '<span>' + escapeHtml(node.path) + '</span>',
          '</div>',
          node.summary ? '<p class="node-summary">' + escapeHtml(node.summary) + '</p>' : '<p class="node-summary empty">No summary available.</p>',
          '<div class="edge-list">',
          edgeHtml,
          '</div>',
          '</article>'
        ].join("");
      }).join("");
    }

    async function main() {
      try {
        const response = await fetch("./graph.json");
        if (!response.ok) throw new Error("Failed to load graph.json");
        const data = await response.json();
        render(data);
        searchEl.addEventListener("input", () => render(data, searchEl.value));
      } catch (error) {
        nodesEl.innerHTML = '<p class="empty">Unable to load graph.json. Open this page via a local server or regenerate graph output.</p>';
        console.error(error);
      }
    }

    main();
  </script>
</body>
</html>
`;
}

function runGraph(root) {
  const wikiDir = path.join(root, "wiki");
  const graphDir = path.join(root, "graph");
  const wikiFiles = walkFiles(wikiDir)
    .filter((file) => file.endsWith(".md"))
    .filter((file) => path.basename(file) !== "sortspec.md");

  const pages = wikiFiles.map((file) => {
    const content = fs.readFileSync(file, "utf8");
    const relPath = relativeTo(root, file);
    const basename = path.basename(file, ".md");
    const frontmatter = parseFrontmatter(content);
    return {
      id: basename,
      title: basename,
      type: frontmatter?.type || (isSystemWikiPage(basename) ? "system" : "unknown"),
      path: relPath,
      summary: frontmatter?.summary || "",
      links: extractWikiLinks(content)
    };
  });

  const pageMap = new Map(pages.map((page) => [page.id, page]));
  const edges = [];
  const seenEdges = new Set();

  for (const page of pages) {
    for (const target of page.links) {
      if (!pageMap.has(target)) continue;
      const key = `${page.id}=>${target}`;
      if (seenEdges.has(key)) continue;
      seenEdges.add(key);
      edges.push({
        source: page.id,
        target,
        kind: "wikilink"
      });
    }
  }

  const graph = {
    generatedAt: new Date().toISOString(),
    root,
    nodes: pages.map((page) => ({
      id: page.id,
      title: page.title,
      type: page.type,
      path: page.path,
      summary: page.summary
    })),
    edges
  };

  ensureDir(graphDir);
  const graphPath = path.join(graphDir, "graph.json");
  const htmlPath = path.join(graphDir, "index.html");
  fs.writeFileSync(graphPath, `${JSON.stringify(graph, null, 2)}\n`, "utf8");
  fs.writeFileSync(htmlPath, buildGraphHtml(), "utf8");

  console.log(`[graph] root: ${root}`);
  console.log(`nodes: ${graph.nodes.length}`);
  console.log(`edges: ${graph.edges.length}`);
  console.log(`output: ${relativeTo(root, graphPath)}`);
  console.log(`viewer: ${relativeTo(root, htmlPath)}`);
}

function scorePage(page, tokens) {
  const haystack = [page.title, page.type, page.path, page.summary, page.content].join(" ").toLowerCase();
  let score = 0;

  for (const token of tokens) {
    if (!token) continue;
    const escaped = token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const matches = haystack.match(new RegExp(escaped, "g"));
    if (matches) {
      score += matches.length;
    }
    if (page.title.toLowerCase().includes(token)) {
      score += 3;
    }
    if (page.type.toLowerCase().includes(token)) {
      score += 2;
    }
  }

  return score;
}

function tokenizeQuestion(question) {
  const baseTokens = (question.toLowerCase().match(/[\p{L}\p{N}]+/gu) || []).filter(Boolean);
  const tokens = new Set(baseTokens);
  const hasHan = /[\p{Script=Han}]/u;

  for (const token of baseTokens) {
    if (!hasHan.test(token)) continue;
    if (token.length < 2) continue;
    for (let size = 2; size <= 3; size += 1) {
      if (token.length < size) continue;
      for (let i = 0; i <= token.length - size; i += 1) {
        tokens.add(token.slice(i, i + size));
      }
    }
  }

  return [...tokens];
}

function sanitizeTitleFragment(value) {
  return value
    .replace(/[\p{P}\p{S}]+/gu, "-")
    .replace(/\s+/g, " ")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
    .trim()
    .slice(0, 80) || "query";
}

function quoteYaml(value) {
  return `"${String(value).replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

function saveQueryPage(root, question, rankedPages) {
  const wikiDir = path.join(root, "wiki");
  const queryDirCandidates = ["queries", "问答沉淀"];
  const existingDir = queryDirCandidates.find((name) => fs.existsSync(path.join(wikiDir, name)));
  const isZhWiki = fs.existsSync(path.join(wikiDir, "Wiki 目录.md"));
  const queryDir = path.join(wikiDir, existingDir || (isZhWiki ? "问答沉淀" : "queries"));
  ensureDir(queryDir);

  const now = new Date().toISOString().slice(0, 10);
  const titlePrefix = isZhWiki ? "问答" : "Query";
  const title = `${titlePrefix}：${sanitizeTitleFragment(question)}`;
  const safeFile = `${title}.md`;
  const topPages = rankedPages.slice(0, 5);
  const relatedPages = topPages.map((page) => `  - "[[${page.title}]]"`).join("\n");
  const body = `---
title: ${quoteYaml(title)}
type: query
status: draft
tags: []
aliases: []
created: ${now}
updated: ${now}
sources: []
domain: ""
confidence: low
summary: ""
question: ${quoteYaml(question)}
answer_status: partial
related_pages:
${relatedPages || "  - \"\""}
---

> Draft query page created from CLI search results.

## Question

${question}

## Short Answer

TBD

## Reasoning

TBD

## Evidence

${topPages.map((page) => `- [[${page.title}]]`).join("\n") || "- TBD"}

## Decision Boundary

TBD

## Follow-up Questions

- TBD

## Related

- [[${path.basename(findIndexPage(root), ".md")}]]
`;

  const output = path.join(queryDir, safeFile);
  fs.writeFileSync(output, body, "utf8");
  return output;
}

function findIndexPage(root) {
  const candidates = [
    path.join(root, "wiki", "Index.md"),
    path.join(root, "wiki", "Wiki 目录.md")
  ];
  return candidates.find((candidate) => fs.existsSync(candidate)) || candidates[0];
}

function runQuery(root, rawArgs) {
  let save = false;
  const rest = [];

  for (let i = 0; i < rawArgs.length; i += 1) {
    const arg = rawArgs[i];
    if (arg === "--save") {
      save = true;
      continue;
    }
    rest.push(arg);
  }

  const question = rest.join(" ").trim();
  if (!question) {
    fail("query requires a question string");
  }

  const wikiDir = path.join(root, "wiki");
  const wikiFiles = walkFiles(wikiDir)
    .filter((file) => file.endsWith(".md"))
    .filter((file) => path.basename(file) !== "sortspec.md");
  const tokens = tokenizeQuestion(question);

  const rankedPages = wikiFiles
    .map((file) => {
      const content = fs.readFileSync(file, "utf8");
      const basename = path.basename(file, ".md");
      const frontmatter = parseFrontmatter(content);
      const page = {
        title: basename,
        type: frontmatter?.type || (isSystemWikiPage(basename) ? "system" : "unknown"),
        path: relativeTo(root, file),
        summary: frontmatter?.summary || "",
        content
      };
      return { ...page, score: scorePage(page, tokens) };
    })
    .filter((page) => page.score > 0)
    .sort((a, b) => b.score - a.score || a.title.localeCompare(b.title));

  console.log(`[query] root: ${root}`);
  console.log(`question: ${question}`);
  console.log(`matches: ${rankedPages.length}`);

  if (rankedPages.length === 0) {
    console.log("\nNo matching wiki pages found.");
    process.exitCode = 1;
    return;
  }

  console.log("\nTop matches:");
  for (const page of rankedPages.slice(0, 10)) {
    console.log(`- ${page.title} [${page.type}] score=${page.score} path=${page.path}`);
    if (page.summary) {
      console.log(`  summary: ${page.summary}`);
    }
  }

  if (save) {
    const output = saveQueryPage(root, question, rankedPages);
    console.log(`\nsaved: ${relativeTo(root, output)}`);
  }
}

function printPlannedAction(name, root, detail) {
  console.log(`[planned] ${name}`);
  console.log(`root: ${root}`);
  if (detail) {
    console.log(detail);
  }
}

if (!COMMANDS.has(command)) {
  fail(`unknown command "${command}". Run 'llm-wiki help'.`);
}

if (command === "help") {
  printHelp();
  process.exit(0);
}

const { root, rest } = parseRoot(args);
ensureWikiRoot(root);

switch (command) {
  case "ingest": {
    const target = rest[0] || "raw/inbox/";
    printPlannedAction(
      "ingest",
      root,
      `next step: normalize source input and place it under raw/\ntarget: ${target}`
    );
    break;
  }
  case "query": {
    runQuery(root, rest);
    break;
  }
  case "lint": {
    runLint(root);
    break;
  }
  case "graph": {
    runGraph(root);
    break;
  }
  default:
    fail(`unhandled command "${command}"`);
}
