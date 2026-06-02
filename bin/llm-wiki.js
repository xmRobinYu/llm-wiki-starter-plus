#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { createCoreTools } = require("../lib/core");
const { createIngestTools } = require("../lib/ingest");
const { createLintTools } = require("../lib/lint");
const { createQueryTools } = require("../lib/query");
const { createGraphTools } = require("../lib/graph");

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

const {
  ensureWikiRoot,
  walkFiles,
  relativeTo,
  parseFrontmatter,
  stripFrontmatter,
  stripHtmlComments,
  extractWikiLinks,
  isSystemWikiPage,
  ensureDir,
  isZhWikiRoot,
  sanitizeTitleFragment,
  quoteYaml,
  truncateText,
  findIndexPage,
  detectSchemaVersion,
  resolvePageKindLayer,
  resolveDomains,
  getEvidenceDir,
  getAtomDir,
  getReportsDir,
  getChangelogPath,
  normalizeField
} = createCoreTools({ fs, path });

const { extractTextSummary, normalizeFrontmatterText, resolvePageSummary, runQuery } = createQueryTools({
  fs,
  path,
  fail,
  walkFiles,
  relativeTo,
  parseFrontmatter,
  stripFrontmatter,
  stripHtmlComments,
  extractWikiLinks,
  isSystemWikiPage,
  isZhWikiRoot,
  ensureDir,
  quoteYaml,
  sanitizeTitleFragment,
  truncateText,
  findIndexPage,
  detectSchemaVersion,
  resolvePageKindLayer,
  resolveDomains
});

const { runIngest } = createIngestTools({
  fs,
  path,
  fail,
  relativeTo,
  parseFrontmatter,
  stripFrontmatter,
  isZhWikiRoot,
  ensureDir,
  quoteYaml,
  sanitizeTitleFragment,
  findIndexPage,
  extractTextSummary,
  detectSchemaVersion,
  resolvePageKindLayer,
  resolveDomains,
  getEvidenceDir,
  getAtomDir,
  getChangelogPath
});

const { runLint } = createLintTools({
  fs,
  path,
  walkFiles,
  relativeTo,
  parseFrontmatter,
  extractWikiLinks,
  isSystemWikiPage,
  isZhWikiRoot,
  ensureDir,
  detectSchemaVersion,
  resolvePageKindLayer,
  resolveDomains,
  getReportsDir,
  getChangelogPath
});

const { runGraph } = createGraphTools({
  fs,
  path,
  walkFiles,
  relativeTo,
  parseFrontmatter,
  extractWikiLinks,
  isSystemWikiPage,
  ensureDir,
  normalizeFrontmatterText,
  resolvePageSummary,
  detectSchemaVersion,
  resolvePageKindLayer,
  resolveDomains
});

if (!COMMANDS.has(command)) {
  fail(`unknown command "${command}". Run 'llm-wiki help'.`);
}

if (command === "help") {
  printHelp();
  process.exit(0);
}

async function main() {
  const { root, rest } = parseRoot(args);
  ensureWikiRoot(root, fail);

  switch (command) {
    case "ingest": {
      await runIngest(root, rest);
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
}

main().catch((error) => {
  fail(error instanceof Error ? error.message : String(error));
});
