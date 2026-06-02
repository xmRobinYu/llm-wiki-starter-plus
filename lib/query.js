function createQueryTools(deps) {
  const {
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
  } = deps;

  const MATCH_REASON_CONFIG = {
    title_match: { label: "title match", strength: "strong", order: 0 },
    page_type_match: { label: "page type match", strength: "supporting", order: 1 },
    semantic_summary_match: { label: "semantic summary match", strength: "strong", order: 2 },
    navigation_link_match: { label: "navigation link match", strength: "supporting", order: 3 },
    substantive_body_match: { label: "substantive body match", strength: "supporting", order: 4 },
    weak_body_match: { label: "weak body match", strength: "weak", order: 5 }
  };

  const LAYER_WEIGHTS = {
    canonical: 1.5,
    domain: 1.2,
    reusable: 1.1,
    navigation: 0.9,
    working: 0.6,
    evidence: 0.3,
    unknown: 1.0
  };

  function normalizeFrontmatterText(value) {
    return String(value || "")
      .trim()
      .replace(/^["']|["']$/g, "")
      .trim();
  }

  function normalizeSnippetText(value) {
    return String(value || "")
      .replace(/^>\s*/, "")
      .replace(/^#+\s*/, "")
      .replace(/^\*+|\*+$/g, "")
      .replace(/\s+/g, " ")
      .trim()
      .toLowerCase();
  }

  function isSystemFooterLine(line) {
    if (!line.startsWith("*") || !line.endsWith("*")) return false;
    const normalized = normalizeSnippetText(line);
    return (
      normalized.includes("maintained by the llm") ||
      normalized.includes("本页面由 llm") ||
      normalized.includes("本知识库由 llm")
    );
  }

  function getSystemPageSummaryOverride(title) {
    const summaryMap = {
      Index: "Content index for core knowledge, domain entries, evidence layer, and recent updates.",
      Overview: "Landing page for the wiki with domain navigation and quick start.",
      Purpose: "Defines the wiki mission, audience, scope, quality bar, and operating preferences.",
      Changelog: "Timeline of ingest, query, lint, and other wiki operations.",
      "Wiki 目录": "知识库内容目录，汇总核心知识、领域入口、证据层和最近更新。",
      "知识库概览": "知识库落地页，提供领域导航、快速入门和关键入口。",
      "知识库目标": "定义知识库的使命、读者、收录范围、质量标准和操作偏好。",
      "操作日志": "记录 ingest、query、lint 等知识库操作的时间线。",
      Glossary: "Unified terminology, abbreviations, and aliases used in this wiki.",
      "术语表": "知识库统一术语与缩写定义。",
      "Review Rules": "Promotion and reuse criteria for wiki pages.",
      "评审规则": "知识库页面晋升与复用的评审标准。"
    };
    return summaryMap[title] || "";
  }

  function isSystemBoilerplateLine(line) {
    if (isSystemFooterLine(line)) return true;
    const normalized = normalizeSnippetText(line);
    return (
      normalized === "wiki content index. maintained by the llm after each operation." ||
      normalized === "landing page for the wiki. provides navigation and quick start." ||
      normalized === "chronological log of all wiki operations. append-only." ||
      normalized === "本页面由 llm 在每次操作后自动维护。" ||
      normalized === "知识库的落地页，提供导航和快速入门。" ||
      normalized === "每次 ingest / query / lint 操作的时间线记录。"
    );
  }

  function isSystemNavigationPage(title) {
    return ["Index", "Overview", "Wiki 目录", "知识库概览"].includes(title);
  }

  function isSystemNavigationLinkLine(page, line) {
    return page.type === "system" && isSystemNavigationPage(page.title) && /^-\s+\[\[[^\]]+\]\]/.test(line);
  }

  function extractTextSummary(content, title = "") {
    const normalizedTitle = title.trim().toLowerCase();
    const body = stripHtmlComments(stripFrontmatter(content));
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

  function extractSystemPageSummary(content, title = "") {
    const override = getSystemPageSummaryOverride(title);
    if (override) return override;
    const normalizedTitle = normalizeSnippetText(title);
    const lines = stripHtmlComments(stripFrontmatter(content))
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);

    const blockquotes = lines
      .filter((line) => line.startsWith(">"))
      .map((line) => line.replace(/^>\s*/, "").trim())
      .filter((line) => normalizeSnippetText(line) !== normalizedTitle)
      .filter((line) => !isSystemBoilerplateLine(line))
      .filter((line) => line.length >= 12);

    if (blockquotes.length > 0) {
      return truncateText(blockquotes[0], 240);
    }

    const narrativeLines = lines
      .filter((line) => !line.startsWith("#"))
      .filter((line) => !line.startsWith(">"))
      .filter((line) => !line.startsWith("- "))
      .filter((line) => !line.startsWith("* "))
      .filter((line) => !/^\d+\.\s/.test(line))
      .filter((line) => !isSystemBoilerplateLine(line));

    for (const line of narrativeLines) {
      if (normalizeSnippetText(line) === normalizedTitle) continue;
      if (line.length < 20) continue;
      return truncateText(line, 240);
    }

    return extractTextSummary(content, title);
  }

  function resolvePageSummary(page) {
    const frontmatterSummary = normalizeFrontmatterText(page.frontmatter?.summary);
    if (frontmatterSummary) return frontmatterSummary;
    if (page.type === "system") return extractSystemPageSummary(page.content, page.title);
    return "";
  }

  function isExampleIntroLine(line) {
    return /^(examples?|示例)\s*[:：]?$/i.test(line.trim());
  }

  function isPlaceholderPromptLine(line) {
    return (
      /^(topics|types of sources|expected depth|preferred output style)\s*:/i.test(line.trim()) ||
      /^(主题范围|资料类型|期望深度|偏好的输出风格)\s*[:：]/.test(line.trim())
    );
  }

  function extractSearchableBodyEntries(page) {
    const normalizedTitle = normalizeSnippetText(page.title);
    const normalizedSummary = normalizeSnippetText(page.summary);
    const lines = stripHtmlComments(stripFrontmatter(page.content))
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .filter((line) => !(page.type === "system" && /^#+\s/.test(line)))
      .filter((line) => !isSystemNavigationLinkLine(page, line))
      .filter((line) => normalizeSnippetText(line) !== normalizedTitle)
      .filter((line) => !(page.type === "system" && isSystemBoilerplateLine(line)))
      .filter((line) => !(normalizedSummary && normalizeSnippetText(line) === normalizedSummary));

    const entries = [];
    let exampleMode = false;

    for (const line of lines) {
      if (isExampleIntroLine(line)) {
        exampleMode = true;
        continue;
      }

      const matchKind =
        /^\d+\.\s/.test(line) || isPlaceholderPromptLine(line) || (exampleMode && /^-\s/.test(line))
          ? "weak_body_match"
          : "substantive_body_match";

      entries.push({ text: line, matchKind });

      if (!/^-\s/.test(line)) {
        exampleMode = false;
      }
    }

    return entries;
  }

  function countTokenMatches(text, token) {
    if (!text || !token) return 0;
    const escaped = token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const matches = text.match(new RegExp(escaped, "g"));
    return matches ? matches.length : 0;
  }

  function addMatchReason(whyMap, kind, hits, score) {
    if (!kind || hits <= 0 || score <= 0) return;
    const config = MATCH_REASON_CONFIG[kind];
    if (!config) return;
    const current = whyMap.get(kind) || {
      kind,
      label: config.label,
      strength: config.strength,
      hits: 0,
      score: 0,
      order: config.order
    };
    current.hits += hits;
    current.score += score;
    whyMap.set(kind, current);
  }

  function finalizeMatchReasons(whyMap) {
    return [...whyMap.values()]
      .filter((reason) => reason.hits > 0 && reason.score > 0)
      .sort((a, b) => a.order - b.order || b.score - a.score)
      .map(({ order, ...reason }) => reason);
  }

  function formatMatchReason(reason) {
    if (!reason) return "";
    const hitLabel = reason.hits === 1 ? "1 hit" : `${reason.hits} hits`;
    return `${reason.label} (+${reason.score}, ${hitLabel})`;
  }

  function formatMatchReasons(why) {
    return why.map((reason) => formatMatchReason(reason)).filter(Boolean).join("; ");
  }

  function dedupeAndRankEvidence(items, limit = 4) {
    const normalized = new Set();
    const ranked = items
      .filter((item) => item && item.kind && item.text)
      .sort((a, b) => {
        const byKind = (a.rank ?? 99) - (b.rank ?? 99);
        if (byKind !== 0) return byKind;
        return b.text.length - a.text.length;
      });

    const result = [];
    for (const item of ranked) {
      const key = normalizeSnippetText(item.text);
      if (normalized.has(key)) continue;
      normalized.add(key);
      result.push(item);
      if (result.length >= limit) break;
    }
    return result;
  }

  function extractEvidenceSnippets(page, tokens) {
    const entries = extractSearchableBodyEntries(page);
    const snippets = [];

    if (page.summary && tokens.some((token) => page.summary.toLowerCase().includes(token))) {
      snippets.push({ kind: "summary", rank: 0, text: truncateText(page.summary, 180) });
    }

    for (const link of page.links || []) {
      const normalized = link.toLowerCase();
      if (tokens.some((token) => token && normalized.includes(token))) {
        snippets.push({ kind: "link", rank: 1, text: `[[${link}]]` });
      }
      if (snippets.length >= 8) break;
    }

    for (const entry of entries) {
      const normalized = entry.text.toLowerCase();
      if (tokens.some((token) => token && normalized.includes(token))) {
        snippets.push({
          kind: "body",
          rank: entry.matchKind === "weak_body_match" ? 3 : 2,
          text: truncateText(entry.text.replace(/^>\s*/, "").replace(/^#+\s*/, "").trim(), 180)
        });
      }
      if (snippets.length >= 12) break;
    }

    return dedupeAndRankEvidence(snippets, 4).map((item) => `${item.kind}: ${item.text}`);
  }

  function isProvenanceQuery(question) {
    const lower = question.toLowerCase();
    const zhKeywords = ["来源", "出处", "原文", "证据"];
    const enKeywords = ["source", "citation", "quote", "evidence", "provenance"];
    return [...zhKeywords, ...enKeywords].some((kw) => lower.includes(kw));
  }

  function scorePage(page, tokens, isProvenance) {
    let score = 0;
    const whyMap = new Map();
    const titleText = page.title.toLowerCase();
    const typeText = page.type.toLowerCase();
    const summaryText = (page.summary || "").toLowerCase();
    const linkText = (page.links || []).join(" ").toLowerCase();
    const bodyEntries = extractSearchableBodyEntries(page);

    for (const token of tokens) {
      if (!token) continue;
      const titleMatches = countTokenMatches(titleText, token);
      const typeMatches = countTokenMatches(typeText, token);
      const summaryMatches = countTokenMatches(summaryText, token);
      const linkMatches = countTokenMatches(linkText, token);

      if (titleMatches > 0) {
        const titleScore = titleMatches * 4;
        score += titleScore;
        addMatchReason(whyMap, "title_match", titleMatches, titleScore);
      }
      if (typeMatches > 0) {
        const typeScore = typeMatches * 3;
        score += typeScore;
        addMatchReason(whyMap, "page_type_match", typeMatches, typeScore);
      }
      if (summaryMatches > 0) {
        const summaryScore = summaryMatches * 2;
        score += summaryScore;
        addMatchReason(whyMap, "semantic_summary_match", summaryMatches, summaryScore);
      }
      if (linkMatches > 0) {
        const linkScore = linkMatches * 2;
        score += linkScore;
        addMatchReason(whyMap, "navigation_link_match", linkMatches, linkScore);
      }

      for (const entry of bodyEntries) {
        const bodyMatches = countTokenMatches(entry.text.toLowerCase(), token);
        if (bodyMatches <= 0) continue;
        const weakNavigationBody =
          entry.matchKind === "weak_body_match" && page.type === "system" && isSystemNavigationPage(page.title);
        const bodyScore = weakNavigationBody ? bodyMatches * 0.5 : bodyMatches;
        score += bodyScore;
        addMatchReason(whyMap, entry.matchKind, bodyMatches, bodyScore);
      }

      if (titleText.includes(token)) {
        score += 3;
        addMatchReason(whyMap, "title_match", 1, 3);
      }
      if (typeText.includes(token)) {
        score += 2;
        addMatchReason(whyMap, "page_type_match", 1, 2);
      }
    }

    // Apply layer weighting (v2 only)
    if (page.layer && page.layer !== "unknown") {
      let layerMultiplier = LAYER_WEIGHTS[page.layer] || 1.0;
      // For provenance queries, boost evidence layer
      if (isProvenance && page.layer === "evidence") {
        layerMultiplier = 2.0;
      }
      score *= layerMultiplier;
    }

    return {
      score,
      why: finalizeMatchReasons(whyMap),
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

  function saveQueryPage(root, question, rankedPages) {
    const wikiDir = path.join(root, "wiki");
    const queryDirCandidates = ["queries", "问答沉淀", "40 Queries", "40 问答"];
    const existingDir = queryDirCandidates.find((name) => fs.existsSync(path.join(wikiDir, name)));
    const isZhWiki = fs.existsSync(path.join(wikiDir, "Wiki 目录.md")) ||
      fs.existsSync(path.join(wikiDir, "00 系统", "Wiki 目录.md"));
    const queryDir = path.join(wikiDir, existingDir || (isZhWiki ? "40 问答" : "40 Queries"));
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
          rank: snippet.startsWith("summary:") ? 0 : snippet.startsWith("link:") ? 1 : 2,
          text: `[[${page.title}]]: ${snippet}`
        }))
      ),
      8
    )
      .map((item) => `- ${item.text}`)
      .join("\n");
    const rankingContext = topPages
      .map((page) => `- [[${page.title}]] (${formatMatchReasons(page.why) || "match"})`)
      .join("\n");
    const body = `---
title: ${quoteYaml(title)}
kind: query
layer: reusable
domains: []
status: draft
tags: []
aliases: []
created: ${now}
updated: ${now}
sources: []
stability: time-bound
bloom: evaluate
review_cycle: quarterly
confidence: low
summary: ""
question: ${quoteYaml(question)}
answer_status: partial
related_pages:
${relatedPages || '  - ""'}
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

- Applicable conditions: TBD
- Inapplicable conditions: TBD
- Confidence notes: TBD

## Follow-up Questions

- TBD

## Related

- [[${path.basename(findIndexPage(root), ".md")}]]
`;

    const output = path.join(queryDir, safeFile);
    fs.writeFileSync(output, body, "utf8");
    return output;
  }

  function buildQueryJsonPayload(root, question, totalMatches, top, savedPath, results) {
    return {
      root,
      question,
      totalMatches,
      top,
      savedPath: savedPath || null,
      results
    };
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

    const schema = detectSchemaVersion(root);
    const wikiDir = path.join(root, "wiki");
    const wikiFiles = walkFiles(wikiDir)
      .filter((file) => file.endsWith(".md"))
      .filter((file) => path.basename(file) !== "sortspec.md");
    const tokens = tokenizeQuestion(question);
    const isProvenance = isProvenanceQuery(question);

    const rankedPages = wikiFiles
      .map((file) => {
        const content = fs.readFileSync(file, "utf8");
        const basename = path.basename(file, ".md");
        const frontmatter = parseFrontmatter(content);
        const { kind, layer } = resolvePageKindLayer(frontmatter);
        const domains = resolveDomains(frontmatter);
        const type =
          normalizeFrontmatterText(frontmatter?.type) || (isSystemWikiPage(basename) ? "system" : "unknown");
        const page = {
          title: basename,
          type,
          kind,
          layer,
          domains,
          path: relativeTo(root, file),
          summary: resolvePageSummary({ title: basename, type, content, frontmatter }),
          content,
          links: extractWikiLinks(content)
        };
        const ranking = scorePage(page, tokens, isProvenance);
        return { ...page, score: ranking.score, why: ranking.why, evidence: ranking.evidence };
      })
      .filter((page) => page.score > 0)
      .sort((a, b) => b.score - a.score || a.title.localeCompare(b.title));

    if (rankedPages.length === 0) {
      if (json) {
        console.log(JSON.stringify(buildQueryJsonPayload(root, question, 0, top, null, []), null, 2));
      } else {
        console.log(`[query] root: ${root}`);
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
      kind: page.kind,
      layer: page.layer,
      domains: page.domains,
      score: page.score,
      why: page.why,
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
        JSON.stringify(buildQueryJsonPayload(root, question, rankedPages.length, top, savedPath, results), null, 2)
      );
      return;
    }

    console.log(`[query] root: ${root}`);
    console.log(`schema: ${schema}`);
    console.log(`question: ${question}`);
    console.log(`matches: ${rankedPages.length}`);
    console.log(`showing: ${results.length}`);

    console.log("\nTop matches:");
    for (const page of results) {
      console.log(`- ${page.title} [${page.kind}/${page.layer}] score=${page.score.toFixed(1)}`);
      console.log(`  path: ${page.path}`);
      if (page.why && page.why.length > 0) {
        console.log(`  why: ${formatMatchReasons(page.why)}`);
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

  return {
    extractTextSummary,
    normalizeFrontmatterText,
    resolvePageSummary,
    runQuery
  };
}

module.exports = { createQueryTools };
