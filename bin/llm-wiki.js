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
    printPlannedAction(
      "lint",
      root,
      "next step: check frontmatter, dead links, orphan pages, and raw coverage"
    );
    break;
  }
  case "graph": {
    printPlannedAction(
      "graph",
      root,
      "next step: scan wiki markdown and export graph/graph.json plus graph/index.html"
    );
    break;
  }
  default:
    fail(`unhandled command "${command}"`);
}
