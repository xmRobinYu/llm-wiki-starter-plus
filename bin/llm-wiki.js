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
  fs.writeFileSync(graphPath, `${JSON.stringify(graph, null, 2)}\n`, "utf8");

  console.log(`[graph] root: ${root}`);
  console.log(`nodes: ${graph.nodes.length}`);
  console.log(`edges: ${graph.edges.length}`);
  console.log(`output: ${relativeTo(root, graphPath)}`);
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
    const question = rest.join(" ").trim();
    if (!question) {
      fail("query requires a question string");
    }
    printPlannedAction(
      "query",
      root,
      `next step: resolve relevant wiki pages and optionally persist a query page\nquestion: ${question}`
    );
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
