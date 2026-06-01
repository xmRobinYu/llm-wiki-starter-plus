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

function stripFrontmatter(content) {
  if (!content.startsWith("---\n")) return content;
  const end = content.indexOf("\n---\n", 4);
  if (end === -1) return content;
  return content.slice(end + 5);
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

function getReportsDir(root) {
  return path.join(root, "wiki", isZhWikiRoot(root) ? "巡检报告" : "reports");
}

function getChangelogPath(root) {
  return isZhWikiRoot(root)
    ? path.join(root, "wiki", "操作日志.md")
    : path.join(root, "wiki", "Changelog.md");
}

function timestampParts() {
  const now = new Date();
  const date = now.toISOString().slice(0, 10);
  const time = [
    String(now.getHours()).padStart(2, "0"),
    String(now.getMinutes()).padStart(2, "0"),
    String(now.getSeconds()).padStart(2, "0")
  ].join("");
  return { date, time };
}

function buildLintReport(root, pageRecords, rawFiles, problems) {
  const zh = isZhWikiRoot(root);
  const { date } = timestampParts();
  const totalProblems = Object.values(problems).reduce((count, entries) => count + entries.length, 0);
  const sections = Object.entries(problems)
    .map(([name, entries]) => {
      const headingMap = zh
        ? {
            missingFrontmatter: "缺失 Frontmatter",
            missingType: "缺失 Type",
            missingSummary: "缺失 Summary",
            deadLinks: "死链",
            orphanPages: "孤页",
            rawCoverage: "原始资料未覆盖"
          }
        : {
            missingFrontmatter: "Missing Frontmatter",
            missingType: "Missing Type",
            missingSummary: "Missing Summary",
            deadLinks: "Dead Links",
            orphanPages: "Orphan Pages",
            rawCoverage: "Raw Coverage Gaps"
          };
      const sectionTitle = headingMap[name] || name;
      const lines = entries.length === 0 ? [zh ? "- 无" : "- None"] : entries.map((entry) => `- ${entry}`);
      return `## ${sectionTitle}\n\n${lines.join("\n")}`;
    })
    .join("\n\n");

  const header = zh
    ? `# 巡检报告\n\n- 日期：${date}\n- 根目录：\`${root}\`\n- wiki 页面：${pageRecords.length}\n- raw markdown 文件：${rawFiles.length}\n- 问题总数：${totalProblems}\n`
    : `# Lint Report\n\n- Date: ${date}\n- Root: \`${root}\`\n- Wiki pages: ${pageRecords.length}\n- Raw markdown files: ${rawFiles.length}\n- Total issues: ${totalProblems}\n`;

  return `${header}\n${sections}\n`;
}

function writeLintReport(root, pageRecords, rawFiles, problems) {
  const zh = isZhWikiRoot(root);
  const reportsDir = getReportsDir(root);
  ensureDir(reportsDir);
  const { date, time } = timestampParts();
  const filename = zh ? `巡检-${date}-${time}.md` : `lint-${date}-${time}.md`;
  const output = path.join(reportsDir, filename);
  fs.writeFileSync(output, buildLintReport(root, pageRecords, rawFiles, problems), "utf8");
  return output;
}

function appendLintChangelogEntry(root, totalProblems, reportPath) {
  const zh = isZhWikiRoot(root);
  const changelogPath = getChangelogPath(root);
  if (!fs.existsSync(changelogPath)) return;
  const { date } = timestampParts();
  const entry = zh
    ? `\n## [${date}] lint | 巡检报告\n- 问题总数：${totalProblems}\n- 报告：${reportPath}\n`
    : `\n## [${date}] lint | Lint report\n- Total issues: ${totalProblems}\n- Report: ${reportPath}\n`;
  fs.appendFileSync(changelogPath, entry, "utf8");
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
  const reportPath = writeLintReport(root, pageRecords, rawFiles, problems);
  appendLintChangelogEntry(root, totalProblems, relativeTo(root, reportPath));

  console.log(`[lint] root: ${root}`);
  console.log(`wiki pages: ${pageRecords.length}`);
  console.log(`raw markdown files: ${rawFiles.length}`);
  console.log(`issues: ${totalProblems}`);
  console.log(`report: ${relativeTo(root, reportPath)}`);

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

function isZhWikiRoot(root) {
  return fs.existsSync(path.join(root, "wiki", "Wiki 目录.md"));
}

function uniquePath(filePath) {
  if (!fs.existsSync(filePath)) return filePath;
  const parsed = path.parse(filePath);
  let counter = 2;
  while (true) {
    const candidate = path.join(parsed.dir, `${parsed.name} ${counter}${parsed.ext}`);
    if (!fs.existsSync(candidate)) return candidate;
    counter += 1;
  }
}

function decodeHtmlEntities(value) {
  return value
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function extractMetaContent(content, name) {
  const patterns = [
    new RegExp(`<meta[^>]+property=["']${name}["'][^>]+content=["']([^"']+)["'][^>]*>`, "i"),
    new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+property=["']${name}["'][^>]*>`, "i"),
    new RegExp(`<meta[^>]+name=["']${name}["'][^>]+content=["']([^"']+)["'][^>]*>`, "i"),
    new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+name=["']${name}["'][^>]*>`, "i")
  ];
  for (const pattern of patterns) {
    const match = content.match(pattern);
    if (match?.[1]) {
      return decodeHtmlEntities(match[1].trim());
    }
  }
  return "";
}

function extractTitleFromMarkdown(content, fallback) {
  const frontmatter = parseFrontmatter(content);
  if (frontmatter?.title) {
    return String(frontmatter.title).replace(/^["']|["']$/g, "").trim();
  }
  const heading = content.match(/^#\s+(.+)$/m);
  if (heading) return heading[1].trim();
  return fallback;
}

function extractTitleFromHtml(content, fallback) {
  const match = content.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  if (!match) return fallback;
  return decodeHtmlEntities(match[1].replace(/<[^>]+>/g, "").trim()) || fallback;
}

function extractReadableHtmlText(content) {
  const container =
    content.match(/<article[^>]*>([\s\S]*?)<\/article>/i)?.[1] ||
    content.match(/<main[^>]*>([\s\S]*?)<\/main>/i)?.[1] ||
    content.match(/<body[^>]*>([\s\S]*?)<\/body>/i)?.[1] ||
    content;

  return decodeHtmlEntities(
    container
      .replace(/<script[\s\S]*?<\/script>/gi, "")
      .replace(/<style[\s\S]*?<\/style>/gi, "")
      .replace(/<noscript[\s\S]*?<\/noscript>/gi, "")
      .replace(/<svg[\s\S]*?<\/svg>/gi, "")
      .replace(/<(nav|header|footer|aside|form)[^>]*>[\s\S]*?<\/\1>/gi, "")
      .replace(/<\/li>/gi, "\n")
      .replace(/<li[^>]*>/gi, "- ")
      .replace(/<\/h1>/gi, "\n")
      .replace(/<h1[^>]*>/gi, "# ")
      .replace(/<\/h2>/gi, "\n")
      .replace(/<h2[^>]*>/gi, "## ")
      .replace(/<\/h3>/gi, "\n")
      .replace(/<h3[^>]*>/gi, "### ")
      .replace(/<\/(p|div|section|article|li|h[1-6]|br)>/gi, "\n")
      .replace(/<[^>]+>/g, " ")
      .replace(/[ \t]+\n/g, "\n")
      .replace(/\n[ \t]+/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim()
  );
}

function extractMarkdownSummary(content) {
  const body = stripFrontmatter(content);
  const lines = body
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => !line.startsWith("---") && !line.startsWith("#"));
  return lines[0] || "";
}

function extractTextSummary(content, title = "") {
  const normalizedTitle = title.trim().toLowerCase();
  const body = stripFrontmatter(content);
  const paragraphs = body
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => !line.startsWith("#"))
    .filter((line) => !line.startsWith(">"))
    .filter((line) => !line.startsWith("<!--"))
    .filter((line) => !/^[a-z_]+:\s/i.test(line))
    .filter((line) => !/^\w+\s*:\s*\[.*\]$/.test(line));

  for (const paragraph of paragraphs) {
    if (normalizedTitle && paragraph.toLowerCase() === normalizedTitle) continue;
    if (paragraph.length < 20) continue;
    return paragraph.slice(0, 240);
  }

  return "";
}

function detectMedia(target, isUrl) {
  if (!isUrl) return "article";
  const lower = target.toLowerCase();
  if (lower.includes("youtube.com") || lower.includes("youtu.be") || lower.includes("bilibili.com")) {
    return "video";
  }
  return "article";
}

function normalizeDomainName(domain) {
  return domain.trim().replace(/[\\/:*?"<>|]/g, "-");
}

function chooseRawSubdir(root, kind, domain) {
  if (domain) return normalizeDomainName(domain);
  if (kind === "url") {
    return isZhWikiRoot(root) ? "网页" : "web";
  }
  return isZhWikiRoot(root) ? "导入" : "imported";
}

function getSummaryDir(root) {
  return path.join(root, "wiki", isZhWikiRoot(root) ? "资料摘要" : "summaries");
}

function buildSourcePage(root, meta) {
  const zh = isZhWikiRoot(root);
  const now = new Date().toISOString().slice(0, 10);
  const indexName = path.basename(findIndexPage(root), ".md");
  const summaryPrefix = zh ? "资料摘要" : "Summary";
  const pageTitle = `${summaryPrefix}：${meta.title}`;
  const sourceLabel = zh ? "来源文件" : "Source file";
  const sourceUrlLine = meta.sourceUrl
    ? zh
      ? `来源链接：${meta.sourceUrl}`
      : `Source URL: ${meta.sourceUrl}`
    : zh
      ? "来源链接："
      : "Source URL: ";
  const blockquote = zh
    ? "> 由 CLI 自动生成的资料摘要草稿。请补全核心要点、详细笔记和引用。"
    : "> Draft source summary generated by CLI. Fill in key takeaways, notes, and citations.";
  const headings = zh
    ? ["## 核心要点", "## 详细笔记", "## 引用与数据", "## 相关"]
    : ["## Key Takeaways", "## Detailed Notes", "## Quotes & Data", "## Related"];
  const draftLine = meta.summary || (zh ? "摘要待补全。" : "Summary pending refinement.");
  const rawLine = zh ? `${sourceLabel}：\`${meta.rawRelativePath}\`` : `${sourceLabel}: \`${meta.rawRelativePath}\``;
  const domainLine = zh
    ? `领域：${meta.domain || ""}`
    : `Domain: ${meta.domain || ""}`;
  const kindLine = zh
    ? `来源类型：${meta.sourceKind}`
    : `Source kind: ${meta.sourceKind}`;
  const fetchedLine = zh
    ? `抓取时间：${meta.fetchedAt || ""}`
    : `Fetched at: ${meta.fetchedAt || ""}`;

  return {
    title: pageTitle,
    content: `---
title: ${quoteYaml(pageTitle)}
type: source
status: draft
tags: []
created: ${now}
updated: ${now}
sources: []
domain: ${quoteYaml(meta.domain || "")}
confidence: low
summary: ${quoteYaml(draftLine)}
source_url: ${quoteYaml(meta.sourceUrl || "")}
media: ${meta.media}
raw_path: ${quoteYaml(meta.rawRelativePath)}
source_kind: ${quoteYaml(meta.sourceKind)}
fetched_at: ${quoteYaml(meta.fetchedAt || "")}
---

${blockquote}

${headings[0]}

- TBD

${headings[1]}

${rawLine}
${zh ? "\n" : "\n\n"}${domainLine}

${sourceUrlLine}

${kindLine}

${fetchedLine}

${headings[2]}

- TBD

${headings[3]}

- [[${indexName}]]
`
  };
}

function insertLineIntoSection(filePath, sectionHeading, lineToInsert) {
  if (!fs.existsSync(filePath)) return false;
  const content = fs.readFileSync(filePath, "utf8");
  if (content.includes(lineToInsert)) return false;
  const lines = content.split("\n");
  const sectionIndex = lines.findIndex((line) => line.trim() === sectionHeading);
  if (sectionIndex === -1) return false;

  let insertAt = lines.length;
  for (let i = sectionIndex + 1; i < lines.length; i += 1) {
    if (/^##\s+/.test(lines[i])) {
      insertAt = i;
      break;
    }
  }

  lines.splice(insertAt, 0, lineToInsert, "");
  fs.writeFileSync(filePath, `${lines.join("\n").replace(/\n+$/g, "")}\n`, "utf8");
  return true;
}

function appendChangelogEntry(root, title, rawRelativePath, summaryRelativePath) {
  const zh = isZhWikiRoot(root);
  const changelogPath = zh
    ? path.join(root, "wiki", "操作日志.md")
    : path.join(root, "wiki", "Changelog.md");
  if (!fs.existsSync(changelogPath)) return;
  const date = new Date().toISOString().slice(0, 10);
  const entry = zh
    ? `\n## [${date}] ingest | ${title}\n- 来源：${rawRelativePath}\n- 新建页面：${summaryRelativePath}\n`
    : `\n## [${date}] ingest | ${title}\n- Source: ${rawRelativePath}\n- New pages: ${summaryRelativePath}\n`;
  fs.appendFileSync(changelogPath, entry, "utf8");
}

function updateIndexForSummary(root, summaryTitle) {
  const zh = isZhWikiRoot(root);
  const indexPath = findIndexPage(root);
  const section = zh ? "## 资料摘要" : "## Summaries";
  const bullet = zh ? `- [[${summaryTitle}]]` : `- [[${summaryTitle}]]`;
  insertLineIntoSection(indexPath, section, bullet);
}

async function runIngest(root, rawArgs) {
  let domain = "";
  const rest = [];

  for (let i = 0; i < rawArgs.length; i += 1) {
    const arg = rawArgs[i];
    if (arg === "--domain") {
      const next = rawArgs[i + 1];
      if (!next) fail("missing value for --domain");
      domain = next;
      i += 1;
      continue;
    }
    rest.push(arg);
  }

  const target = rest[0];
  if (!target) {
    fail("ingest requires a local markdown file path or a URL");
  }

  const isUrl = /^https?:\/\//i.test(target);
  const zh = isZhWikiRoot(root);
  const rawSubdir = chooseRawSubdir(root, isUrl ? "url" : "file", domain);
  const rawDir = path.join(root, "raw", rawSubdir);
  const summaryDir = getSummaryDir(root);
  ensureDir(rawDir);
  ensureDir(summaryDir);

  let title = "";
  let rawPath = "";
  let rawContent = "";
  let sourceUrl = "";
  let media = detectMedia(target, isUrl);
  let sourceKind = isUrl ? "url" : "file";
  let fetchedAt = "";
  let extractedSummary = "";

  if (isUrl) {
    const response = await fetch(target);
    if (!response.ok) {
      fail(`failed to fetch URL: ${response.status} ${response.statusText}`);
    }
    const responseText = await response.text();
    const url = new URL(target);
    title = sanitizeTitleFragment(
      extractTitleFromHtml(responseText, url.pathname.split("/").filter(Boolean).pop() || url.hostname)
    );
    extractedSummary =
      extractMetaContent(responseText, "og:description") ||
      extractMetaContent(responseText, "twitter:description") ||
      extractMetaContent(responseText, "description");
    const readableText = extractReadableHtmlText(responseText);
    if (!extractedSummary) {
      extractedSummary = extractTextSummary(readableText, title);
    }
    fetchedAt = new Date().toISOString();
    rawContent = `# ${title}

Source URL: ${target}

Fetched at: ${fetchedAt}

## Extracted Content

${readableText}
`;
    rawPath = uniquePath(path.join(rawDir, `${title}.md`));
    sourceUrl = target;
  } else {
    const inputPath = path.resolve(target);
    if (!fs.existsSync(inputPath)) {
      fail(`input file not found: ${inputPath}`);
    }
    if (path.extname(inputPath).toLowerCase() !== ".md") {
      fail("ingest currently supports local markdown files only");
    }
    rawContent = fs.readFileSync(inputPath, "utf8");
    title = sanitizeTitleFragment(extractTitleFromMarkdown(rawContent, path.basename(inputPath, ".md")));
    extractedSummary = extractMarkdownSummary(rawContent);
    const insideRoot = !path.relative(path.join(root, "raw"), inputPath).startsWith("..");
    rawPath = insideRoot ? inputPath : uniquePath(path.join(rawDir, `${title}.md`));
    sourceKind = "file";
    if (!insideRoot) {
      fs.writeFileSync(rawPath, rawContent, "utf8");
    }
  }

  if (isUrl) {
    fs.writeFileSync(rawPath, rawContent, "utf8");
  }

  const rawRelativePath = relativeTo(root, rawPath);
  const sourcePage = buildSourcePage(root, {
    title,
    rawRelativePath,
    sourceUrl,
    media,
    sourceKind,
    fetchedAt,
    domain: normalizeDomainName(domain || ""),
    summary: extractedSummary
  });
  const summaryPath = uniquePath(path.join(summaryDir, `${sourcePage.title}.md`));
  fs.writeFileSync(summaryPath, sourcePage.content, "utf8");

  updateIndexForSummary(root, sourcePage.title);
  appendChangelogEntry(root, title, rawRelativePath, relativeTo(root, summaryPath));

  console.log(`[ingest] root: ${root}`);
  console.log(`source kind: ${sourceKind}`);
  console.log(`raw file: ${rawRelativePath}`);
  console.log(`summary page: ${relativeTo(root, summaryPath)}`);
  if (sourceUrl) {
    console.log(`source url: ${sourceUrl}`);
  }
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
      grid-template-columns: 300px minmax(0, 1fr) 320px;
      gap: 16px;
      padding: 16px 24px 24px;
    }
    .stack {
      display: grid;
      gap: 16px;
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
      cursor: pointer;
      user-select: none;
      position: relative;
    }
    .chip::before {
      content: "";
      width: 8px;
      height: 8px;
      border-radius: 999px;
      background: var(--chip-color, var(--accent));
      box-shadow: 0 0 0 1px rgba(31, 27, 22, 0.08);
    }
    .chip.active {
      background: var(--accent);
      color: #fff;
    }
    .chip.active::before {
      background: #fff;
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
      border-left: 6px solid var(--node-color, var(--accent));
      border-radius: 14px;
      padding: 14px;
      background: #fff;
      cursor: pointer;
      transition: transform 120ms ease, border-color 120ms ease, box-shadow 120ms ease;
    }
    .node:hover {
      transform: translateY(-1px);
      border-color: #b8aa92;
      box-shadow: 0 8px 24px rgba(31, 27, 22, 0.08);
    }
    .node.active {
      border-color: var(--accent);
      box-shadow: 0 10px 28px rgba(13, 107, 95, 0.12);
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
    .detail-title {
      margin: 0 0 10px;
      font-size: 24px;
      line-height: 1.2;
    }
    .detail-meta {
      display: grid;
      gap: 8px;
      margin-bottom: 16px;
      color: var(--muted);
      font-size: 13px;
    }
    .detail-block {
      margin-top: 18px;
      padding-top: 14px;
      border-top: 1px dashed var(--line);
    }
    .detail-block h3 {
      margin: 0 0 10px;
      font-size: 13px;
      color: var(--muted);
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }
    .detail-link {
      display: block;
      padding: 6px 0;
      color: var(--ink);
      text-decoration: none;
      font-size: 14px;
    }
    .detail-link code {
      color: var(--muted);
      font-size: 12px;
    }
    .graph-frame {
      width: 100%;
      height: 440px;
      border-radius: 14px;
      border: 1px solid var(--line);
      background:
        radial-gradient(circle at 50% 50%, rgba(13, 107, 95, 0.04) 0%, rgba(13, 107, 95, 0) 62%),
        linear-gradient(180deg, #fffefb 0%, #f6f1e7 100%);
      overflow: hidden;
    }
    .graph-svg {
      width: 100%;
      height: 100%;
      display: block;
    }
    .graph-edge {
      stroke: rgba(31, 27, 22, 0.22);
      stroke-width: 1.4;
    }
    .graph-edge.active {
      stroke: rgba(13, 107, 95, 0.6);
      stroke-width: 2.2;
    }
    .graph-node {
      fill: var(--node-fill, #fff);
      stroke: var(--node-stroke, rgba(31, 27, 22, 0.18));
      stroke-width: 1.6;
      cursor: pointer;
      transition: stroke 120ms ease, stroke-width 120ms ease, fill 120ms ease;
    }
    .graph-node.active {
      fill: #d9eee9;
      stroke: var(--accent);
      stroke-width: 3;
    }
    .graph-label {
      font-size: 11px;
      fill: var(--ink);
      pointer-events: none;
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
    <div class="stack">
      <section class="panel">
        <h2>Graph View</h2>
        <div class="panel-body">
          <div class="graph-frame">
            <svg id="graphSvg" class="graph-svg" viewBox="0 0 720 440" preserveAspectRatio="xMidYMid meet"></svg>
          </div>
        </div>
      </section>
      <section class="panel">
        <h2>Nodes</h2>
        <div class="panel-body">
          <div id="nodes" class="list"></div>
        </div>
      </section>
    </div>
    <section class="panel">
      <h2>Details</h2>
      <div class="panel-body">
        <div id="details" class="empty">Select a node to inspect its summary and linked relationships.</div>
      </div>
    </section>
  </main>
  <script>
    const nodeCount = document.getElementById("nodeCount");
    const edgeCount = document.getElementById("edgeCount");
    const nodesEl = document.getElementById("nodes");
    const legendEl = document.getElementById("legend");
    const searchEl = document.getElementById("search");
    const detailsEl = document.getElementById("details");
    const graphSvg = document.getElementById("graphSvg");
    let activeType = "all";
    let activeNodeId = "";

    function colorForType(type) {
      const palette = {
        all: "#0d6b5f",
        system: "#8c7b68",
        source: "#0d6b5f",
        concept: "#d66a3d",
        entity: "#2a6fbb",
        topic: "#8f5bd1",
        comparison: "#b24c63",
        synthesis: "#2c8a57",
        query: "#c18b1f",
        unknown: "#6d6254"
      };
      return palette[type] || "#6d6254";
    }

    function fadedColor(hex, alpha = 0.16) {
      const value = hex.replace("#", "");
      if (value.length !== 6) return "rgba(13, 107, 95, " + alpha + ")";
      const r = Number.parseInt(value.slice(0, 2), 16);
      const g = Number.parseInt(value.slice(2, 4), 16);
      const b = Number.parseInt(value.slice(4, 6), 16);
      return "rgba(" + r + ", " + g + ", " + b + ", " + alpha + ")";
    }

    function escapeHtml(value) {
      return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;");
    }

    function renderDetails(data, node) {
      if (!node) {
        detailsEl.innerHTML = '<p class="empty">Select a node to inspect its summary and linked relationships.</p>';
        return;
      }

      const outgoing = data.edges.filter((edge) => edge.source === node.id);
      const incoming = data.edges.filter((edge) => edge.target === node.id);
      const nodeMap = new Map(data.nodes.map((entry) => [entry.id, entry]));
      const renderLinks = (edges, direction) => {
        if (edges.length === 0) {
          return '<p class="empty">None.</p>';
        }
        return edges.map((edge) => {
          const otherId = direction === "out" ? edge.target : edge.source;
          const other = nodeMap.get(otherId);
          if (!other) return "";
          return '<a class="detail-link" href="#" data-node-id="' + escapeHtml(other.id) + '">' +
            escapeHtml(other.title) +
            '<br /><code>' + escapeHtml(other.path) + '</code></a>';
        }).join("");
      };

      detailsEl.innerHTML = [
        '<h3 class="detail-title">' + escapeHtml(node.title) + '</h3>',
        '<div class="detail-meta">',
        '<div><strong>Type:</strong> ' + escapeHtml(node.type) + '</div>',
        '<div><strong>Path:</strong> <code>' + escapeHtml(node.path) + '</code></div>',
        '</div>',
        node.summary ? '<p>' + escapeHtml(node.summary) + '</p>' : '<p class="empty">No summary available.</p>',
        '<div class="detail-block"><h3>Outgoing Links</h3>' + renderLinks(outgoing, "out") + '</div>',
        '<div class="detail-block"><h3>Incoming Links</h3>' + renderLinks(incoming, "in") + '</div>'
      ].join("");

      detailsEl.querySelectorAll("[data-node-id]").forEach((link) => {
        link.addEventListener("click", (event) => {
          event.preventDefault();
          activeNodeId = link.getAttribute("data-node-id") || "";
          render(data, searchEl.value);
        });
      });
    }

    function renderGraph(data, nodes) {
      if (nodes.length === 0) {
        graphSvg.innerHTML = "";
        return;
      }

      const width = 720;
      const height = 440;
      const centerX = width / 2;
      const centerY = height / 2;
      const radius = Math.min(width, height) * 0.34;
      const nodeMap = new Map(nodes.map((node) => [node.id, node]));
      const positioned = nodes.map((node, index) => {
        const angle = (Math.PI * 2 * index) / nodes.length - Math.PI / 2;
        return {
          ...node,
          x: centerX + Math.cos(angle) * radius,
          y: centerY + Math.sin(angle) * radius
        };
      });
      const positionedMap = new Map(positioned.map((node) => [node.id, node]));
      const activeConnections = new Set();
      for (const edge of data.edges) {
        if (edge.source === activeNodeId || edge.target === activeNodeId) {
          activeConnections.add(edge.source + "=>" + edge.target);
        }
      }

      const edges = data.edges
        .filter((edge) => positionedMap.has(edge.source) && positionedMap.has(edge.target))
        .map((edge) => {
          const source = positionedMap.get(edge.source);
          const target = positionedMap.get(edge.target);
          const active = activeConnections.has(edge.source + "=>" + edge.target);
          return '<line class="graph-edge' + (active ? ' active' : '') + '" x1="' + source.x + '" y1="' + source.y + '" x2="' + target.x + '" y2="' + target.y + '"></line>';
        })
        .join("");

      const circles = positioned.map((node) => {
        const active = node.id === activeNodeId;
        const labelY = node.y + (node.y < centerY ? -18 : 22);
        const color = colorForType(node.type);
        return [
          '<g data-graph-node="' + escapeHtml(node.id) + '">',
          '<circle class="graph-node' + (active ? ' active' : '') + '" style="--node-fill:' + fadedColor(color, active ? 0.28 : 0.16) + ';--node-stroke:' + color + ';" cx="' + node.x + '" cy="' + node.y + '" r="' + (active ? 11 : 9) + '"></circle>',
          '<text class="graph-label" x="' + node.x + '" y="' + labelY + '" text-anchor="middle">' + escapeHtml(node.title.length > 18 ? node.title.slice(0, 18) + '…' : node.title) + '</text>',
          '</g>'
        ].join("");
      }).join("");

      graphSvg.innerHTML = edges + circles;
      graphSvg.querySelectorAll("[data-graph-node]").forEach((group) => {
        group.addEventListener("click", () => {
          activeNodeId = group.getAttribute("data-graph-node") || "";
          render(data, searchEl.value);
        });
      });
    }

    function render(data, query = "") {
      const normalized = query.trim().toLowerCase();
      const nodes = data.nodes.filter((node) => {
        if (!normalized) return true;
        return [node.title, node.type, node.path, node.summary].join(" ").toLowerCase().includes(normalized);
      }).filter((node) => activeType === "all" ? true : node.type === activeType);

      const edgesBySource = new Map();
      for (const edge of data.edges) {
        if (!edgesBySource.has(edge.source)) edgesBySource.set(edge.source, []);
        edgesBySource.get(edge.source).push(edge);
      }

      nodeCount.textContent = String(nodes.length);
      edgeCount.textContent = String(data.edges.length);

      const types = [...new Set(data.nodes.map((node) => node.type))].sort();
      const typeOptions = ["all", ...types];
      legendEl.innerHTML = typeOptions
        .map((type) => '<span class="chip' + (activeType === type ? ' active' : '') + '" data-type="' + escapeHtml(type) + '" style="--chip-color:' + colorForType(type) + ';">' + escapeHtml(type) + '</span>')
        .join("");
      legendEl.querySelectorAll("[data-type]").forEach((chip) => {
        chip.addEventListener("click", () => {
          activeType = chip.getAttribute("data-type") || "all";
          if (activeNodeId && !data.nodes.find((node) => node.id === activeNodeId && (activeType === "all" || node.type === activeType))) {
            activeNodeId = "";
          }
          render(data, searchEl.value);
        });
      });

      if (nodes.length === 0) {
        nodesEl.innerHTML = '<p class="empty">No nodes match this filter.</p>';
        renderGraph(data, []);
        renderDetails(data, null);
        return;
      }

      const activeNode = nodes.find((node) => node.id === activeNodeId) || nodes[0];
      activeNodeId = activeNode.id;

      nodesEl.innerHTML = nodes.map((node) => {
        const outgoing = edgesBySource.get(node.id) || [];
        const edgeHtml = outgoing.length === 0
          ? '<div class="empty">No outgoing wikilinks.</div>'
          : outgoing.map((edge) => '<div class="edge-item">' + escapeHtml(edge.source) + ' → ' + escapeHtml(edge.target) + '</div>').join("");

        return [
          '<article class="node' + (node.id === activeNodeId ? ' active' : '') + '" data-node-id="' + escapeHtml(node.id) + '" style="--node-color:' + colorForType(node.type) + ';">',
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

      nodesEl.querySelectorAll("[data-node-id]").forEach((item) => {
        item.addEventListener("click", () => {
          activeNodeId = item.getAttribute("data-node-id") || "";
          render(data, searchEl.value);
        });
      });

      renderGraph(data, nodes);
      renderDetails(data, activeNode);
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
  let score = 0;
  let titleHits = 0;
  let typeHits = 0;
  let summaryHits = 0;
  let bodyHits = 0;
  let linkHits = 0;
  const titleText = page.title.toLowerCase();
  const typeText = page.type.toLowerCase();
  const summaryText = (page.summary || "").toLowerCase();
  const linkText = (page.links || []).join(" ").toLowerCase();
  const bodyText = stripFrontmatter(page.content).toLowerCase();

  for (const token of tokens) {
    if (!token) continue;
    const escaped = token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const titleMatches = titleText.match(new RegExp(escaped, "g"));
    const typeMatches = typeText.match(new RegExp(escaped, "g"));
    const summaryMatches = summaryText.match(new RegExp(escaped, "g"));
    const linkMatches = linkText.match(new RegExp(escaped, "g"));
    const bodyMatches = bodyText.match(new RegExp(escaped, "g"));

    if (titleMatches) {
      titleHits += titleMatches.length;
      score += titleMatches.length * 4;
    }
    if (typeMatches) {
      typeHits += typeMatches.length;
      score += typeMatches.length * 3;
    }
    if (summaryMatches) {
      summaryHits += summaryMatches.length;
      score += summaryMatches.length * 2;
    }
    if (linkMatches) {
      linkHits += linkMatches.length;
      score += linkMatches.length * 2;
    }
    if (bodyMatches) {
      bodyHits += bodyMatches.length;
      score += bodyMatches.length;
    }

    if (titleText.includes(token)) {
      score += 3;
      titleHits += 1;
    }
    if (typeText.includes(token)) {
      score += 2;
      typeHits += 1;
    }
  }

  const reasons = [];
  if (titleHits > 0) reasons.push(`title:${titleHits}`);
  if (typeHits > 0) reasons.push(`type:${typeHits}`);
  if (summaryHits > 0) reasons.push(`summary:${summaryHits}`);
  if (linkHits > 0) reasons.push(`link:${linkHits}`);
  if (bodyHits > 0) reasons.push(`body:${bodyHits}`);

  return {
    score,
    reasons,
    evidence: extractEvidenceSnippets(page, tokens)
  };
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

function truncateText(value, max = 140) {
  if (!value) return "";
  return value.length <= max ? value : `${value.slice(0, max - 1)}…`;
}

function dedupeAndRankEvidence(items, limit = 4) {
  const priority = { summary: 0, link: 1, body: 2 };
  const normalized = new Set();
  const ranked = items
    .filter((item) => item && item.kind && item.text)
    .sort((a, b) => {
      const byKind = (priority[a.kind] ?? 99) - (priority[b.kind] ?? 99);
      if (byKind !== 0) return byKind;
      return b.text.length - a.text.length;
    });

  const result = [];
  for (const item of ranked) {
    const key = `${item.kind}:${item.text.toLowerCase().replace(/\s+/g, " ").trim()}`;
    if (normalized.has(key)) continue;
    normalized.add(key);
    result.push(item);
    if (result.length >= limit) break;
  }
  return result;
}

function extractEvidenceSnippets(page, tokens) {
  const normalizedTitle = page.title.trim().toLowerCase();
  const lines = stripFrontmatter(page.content)
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => !line.startsWith("#"))
    .filter((line) => !line.startsWith("<!--"))
    .filter((line) => line.toLowerCase() !== normalizedTitle);

  const snippets = [];
  if (page.summary && tokens.some((token) => page.summary.toLowerCase().includes(token))) {
    snippets.push({ kind: "summary", text: truncateText(page.summary, 180) });
  }
  for (const link of page.links || []) {
    const normalized = link.toLowerCase();
    if (tokens.some((token) => token && normalized.includes(token))) {
      snippets.push({ kind: "link", text: `[[${link}]]` });
    }
    if (snippets.length >= 8) break;
  }
  for (const line of lines) {
    const normalized = line.toLowerCase();
    if (tokens.some((token) => token && normalized.includes(token))) {
      snippets.push({ kind: "body", text: truncateText(line, 180) });
    }
    if (snippets.length >= 12) break;
  }
  return dedupeAndRankEvidence(snippets, 4).map((item) => `${item.kind}: ${item.text}`);
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
  const topEvidence = dedupeAndRankEvidence(
    topPages.flatMap((page) =>
      (page.evidence || []).slice(0, 3).map((snippet) => ({
        kind: snippet.split(":")[0] || "body",
        text: `[[${page.title}]]: ${snippet}`
      }))
    ),
    8
  )
    .map((item) => `- ${item.text}`)
    .join("\n");
  const rankingContext = topPages
    .map((page) => `- [[${page.title}]] (${page.reasons.join(", ") || "match"})`)
    .join("\n");
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

${rankingContext || "TBD"}

## Evidence

${topEvidence || topPages.map((page) => `- [[${page.title}]]`).join("\n") || "- TBD"}

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
  let json = false;
  let top = 10;
  const rest = [];

  for (let i = 0; i < rawArgs.length; i += 1) {
    const arg = rawArgs[i];
    if (arg === "--save") {
      save = true;
      continue;
    }
    if (arg === "--json") {
      json = true;
      continue;
    }
    if (arg === "--top") {
      const next = rawArgs[i + 1];
      if (!next) fail("missing value for --top");
      const parsed = Number.parseInt(next, 10);
      if (!Number.isInteger(parsed) || parsed <= 0) {
        fail("--top must be a positive integer");
      }
      top = parsed;
      i += 1;
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
        content,
        links: extractWikiLinks(content)
      };
      const ranking = scorePage(page, tokens);
      return { ...page, score: ranking.score, reasons: ranking.reasons, evidence: ranking.evidence };
    })
    .filter((page) => page.score > 0)
    .sort((a, b) => b.score - a.score || a.title.localeCompare(b.title));

  console.log(`[query] root: ${root}`);
  if (rankedPages.length === 0) {
    if (json) {
      console.log(
        JSON.stringify(
          {
            root,
            question,
            totalMatches: 0,
            results: []
          },
          null,
          2
        )
      );
    } else {
      console.log(`question: ${question}`);
      console.log("matches: 0");
      console.log("\nNo matching wiki pages found.");
    }
    process.exitCode = 1;
    return;
  }

  const results = rankedPages.slice(0, top).map((page) => ({
    title: page.title,
    type: page.type,
    score: page.score,
    reasons: page.reasons,
    path: page.path,
    summary: truncateText(page.summary || extractTextSummary(page.content, page.title), 160),
    evidence: page.evidence
  }));

  let savedPath = "";
  if (save) {
    const output = saveQueryPage(root, question, rankedPages);
    savedPath = relativeTo(root, output);
  }

  if (json) {
    console.log(
      JSON.stringify(
        {
          root,
          question,
          totalMatches: rankedPages.length,
          top,
          savedPath: savedPath || null,
          results
        },
        null,
        2
      )
    );
    return;
  }

  console.log(`question: ${question}`);
  console.log(`matches: ${rankedPages.length}`);
  console.log(`showing: ${results.length}`);

  console.log("\nTop matches:");
  for (const page of results) {
    console.log(`- ${page.title} [${page.type}] score=${page.score}`);
    console.log(`  path: ${page.path}`);
    if (page.reasons && page.reasons.length > 0) {
      console.log(`  why: ${page.reasons.join(", ")}`);
    }
    if (page.summary) {
      console.log(`  summary: ${page.summary}`);
    }
    if (page.evidence && page.evidence.length > 0) {
      for (const snippet of page.evidence) {
        console.log(`  evidence: ${snippet}`);
      }
    }
  }

  if (savedPath) {
    console.log(`\nsaved: ${savedPath}`);
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

async function main() {
  const { root, rest } = parseRoot(args);
  ensureWikiRoot(root);

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
