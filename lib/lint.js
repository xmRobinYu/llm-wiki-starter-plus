function createLintTools(deps) {
  const {
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
  } = deps;

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

  function buildLintReport(root, pageRecords, rawFiles, problems, schema) {
    const zh = isZhWikiRoot(root);
    const { date } = timestampParts();
    const totalProblems = Object.values(problems).reduce((count, entries) => count + entries.length, 0);

    const sectionOrder = zh
      ? [
          "missingFrontmatter",
          "missingKind",
          "missingSummary",
          "deadLinks",
          "orphanPages",
          "rawWithoutSource",
          "sourceWithoutAtom",
          "orphanAtoms",
          "missingDomainMap",
          "missingSystemPages",
          "missingDecisionBoundary"
        ]
      : [
          "missingFrontmatter",
          "missingKind",
          "missingSummary",
          "deadLinks",
          "orphanPages",
          "rawWithoutSource",
          "sourceWithoutAtom",
          "orphanAtoms",
          "missingDomainMap",
          "missingSystemPages",
          "missingDecisionBoundary"
        ];

    const headingMap = zh
      ? {
          missingFrontmatter: "缺失 Frontmatter",
          missingKind: "缺失 Kind/Layer",
          missingSummary: "缺失 Summary",
          deadLinks: "死链",
          orphanPages: "孤页",
          rawWithoutSource: "原始资料未覆盖",
          sourceWithoutAtom: "Source 未生成 Atom",
          orphanAtoms: "孤立 Atom",
          missingDomainMap: "缺失领域地图",
          missingSystemPages: "缺失系统页",
          missingDecisionBoundary: "缺失决策边界章节"
        }
      : {
          missingFrontmatter: "Missing Frontmatter",
          missingKind: "Missing Kind/Layer",
          missingSummary: "Missing Summary",
          deadLinks: "Dead Links",
          orphanPages: "Orphan Pages",
          rawWithoutSource: "Raw Without Source",
          sourceWithoutAtom: "Source Without Atom",
          orphanAtoms: "Orphan Atoms",
          missingDomainMap: "Missing Domain Map",
          missingSystemPages: "Missing System Pages",
          missingDecisionBoundary: "Missing Decision Boundary"
        };

    const sections = sectionOrder
      .filter((name) => problems[name] && problems[name].length > 0)
      .map((name) => {
        const sectionTitle = headingMap[name] || name;
        const lines = problems[name].map((entry) => `- ${entry}`);
        return `## ${sectionTitle}\n\n${lines.join("\n")}`;
      })
      .join("\n\n");

    const emptySections = sectionOrder
      .filter((name) => !problems[name] || problems[name].length === 0)
      .map((name) => {
        const sectionTitle = headingMap[name] || name;
        return `## ${sectionTitle}\n\n- ${zh ? "无" : "None"}`;
      })
      .join("\n\n");

    const header = zh
      ? `# 巡检报告\n\n- 日期：${date}\n- 根目录：\`${root}\`\n- Schema：${schema}\n- wiki 页面：${pageRecords.length}\n- raw markdown 文件：${rawFiles.length}\n- 问题总数：${totalProblems}\n`
      : `# Lint Report\n\n- Date: ${date}\n- Root: \`${root}\`\n- Schema: ${schema}\n- Wiki pages: ${pageRecords.length}\n- Raw markdown files: ${rawFiles.length}\n- Total issues: ${totalProblems}\n`;

    return `${header}\n${sections}\n\n${emptySections}\n`;
  }

  function writeLintReport(root, pageRecords, rawFiles, problems, schema) {
    const zh = isZhWikiRoot(root);
    const reportsDir = getReportsDir(root, schema);
    ensureDir(reportsDir);
    const { date, time } = timestampParts();
    const filename = zh ? `巡检-${date}-${time}.md` : `lint-${date}-${time}.md`;
    const output = path.join(reportsDir, filename);
    fs.writeFileSync(output, buildLintReport(root, pageRecords, rawFiles, problems, schema), "utf8");
    return output;
  }

  function appendLintChangelogEntry(root, totalProblems, reportPath, schema) {
    const zh = isZhWikiRoot(root);
    const changelogPath = getChangelogPath(root, schema);
    if (!fs.existsSync(changelogPath)) return;
    const { date } = timestampParts();
    const entry = zh
      ? `\n## [${date}] lint | 巡检报告\n- 问题总数：${totalProblems}\n- 报告：${reportPath}\n`
      : `\n## [${date}] lint | Lint report\n- Total issues: ${totalProblems}\n- Report: ${reportPath}\n`;
    fs.appendFileSync(changelogPath, entry, "utf8");
  }

  function hasDecisionBoundary(content) {
    const lower = content.toLowerCase();
    return (
      lower.includes("决策边界") ||
      lower.includes("decision boundary") ||
      lower.includes("适用场景") ||
      lower.includes("applicable scenarios") ||
      lower.includes("何时用") ||
      lower.includes("when to use")
    );
  }

  function runLint(root) {
    const schema = detectSchemaVersion(root);
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
        const frontmatter = parseFrontmatter(content);
        const { kind, layer } = resolvePageKindLayer(frontmatter);
        const domains = resolveDomains(frontmatter);
        return {
          file,
          relPath,
          basename,
          content,
          frontmatter,
          kind,
          layer,
          domains,
          links: extractWikiLinks(content)
        };
      });

    const wikiNames = new Set(pageRecords.map((record) => record.basename));
    const inboundCounts = new Map(pageRecords.map((record) => [record.basename, 0]));

    const problems = {
      missingFrontmatter: [],
      missingKind: [],
      missingSummary: [],
      deadLinks: [],
      orphanPages: [],
      rawWithoutSource: [],
      sourceWithoutAtom: [],
      orphanAtoms: [],
      missingDomainMap: [],
      missingSystemPages: [],
      missingDecisionBoundary: []
    };

    for (const record of pageRecords) {
      if (!record.frontmatter && !isSystemWikiPage(record.basename)) {
        problems.missingFrontmatter.push(record.relPath);
      } else if (record.frontmatter) {
        const hasKind = record.frontmatter.kind || record.frontmatter.type;
        if (!hasKind && !isSystemWikiPage(record.basename)) {
          problems.missingKind.push(record.relPath);
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

    // v2-specific checks
    if (schema === "v2") {
      // Source pages without atom references
      const sourcePages = pageRecords.filter((r) => r.kind === "source");
      const atomPages = pageRecords.filter((r) => r.kind === "atom");
      const atomSources = new Set();
      for (const atom of atomPages) {
        for (const link of atom.links) {
          atomSources.add(link);
        }
      }

      for (const source of sourcePages) {
        if (!atomSources.has(source.basename)) {
          problems.sourceWithoutAtom.push(source.relPath);
        }
      }

      // Orphan atoms (no backlinks from non-atom pages)
      for (const atom of atomPages) {
        const nonAtomBacklinks = pageRecords.filter(
          (r) => r.kind !== "atom" && r.links.includes(atom.basename)
        );
        if (nonAtomBacklinks.length === 0) {
          problems.orphanAtoms.push(atom.relPath);
        }
      }

      // Missing domain maps
      const domainDirs = fs.existsSync(path.join(root, "wiki", "20 领域"))
        ? fs.readdirSync(path.join(root, "wiki", "20 领域"), { withFileTypes: true })
            .filter((e) => e.isDirectory())
            .map((e) => e.name)
        : fs.existsSync(path.join(root, "wiki", "20 Domains"))
          ? fs.readdirSync(path.join(root, "wiki", "20 Domains"), { withFileTypes: true })
              .filter((e) => e.isDirectory())
              .map((e) => e.name)
          : [];

      for (const domain of domainDirs) {
        const hasMap = pageRecords.some(
          (r) =>
            r.basename === "领域地图" ||
            r.basename === "Domain Map" ||
            (r.kind === "moc" && r.domains.includes(domain))
        );
        if (!hasMap) {
          problems.missingDomainMap.push(domain);
        }
      }

      // Missing system pages
      const requiredSystem = isZhWikiRoot(root)
        ? ["Wiki 目录", "知识库目标", "术语表", "操作日志", "评审规则"]
        : ["Index", "Purpose", "Glossary", "Changelog", "Review Rules"];
      const existingSystem = new Set(pageRecords.filter((r) => r.layer === "navigation").map((r) => r.basename));
      for (const sys of requiredSystem) {
        if (!existingSystem.has(sys)) {
          problems.missingSystemPages.push(sys);
        }
      }

      // Missing decision boundary
      const decisionKinds = ["method", "topic", "synthesis", "query"];
      for (const record of pageRecords) {
        if (decisionKinds.includes(record.kind) && !hasDecisionBoundary(record.content)) {
          problems.missingDecisionBoundary.push(record.relPath);
        }
      }
    }

    // Raw coverage (legacy compatible)
    const summaryFiles = pageRecords
      .filter((record) => record.kind === "source")
      .map((record) => record.basename.replace(/^Summary：/, "").replace(/^资料摘要：/, ""));

    for (const rawFile of rawFiles) {
      const rawName = path.basename(rawFile, ".md");
      if (rawName === "sortspec") continue;
      const matched = summaryFiles.some((name) => rawName.includes(name) || name.includes(rawName));
      if (!matched) {
        problems.rawWithoutSource.push(relativeTo(root, rawFile));
      }
    }

    const totalProblems = Object.values(problems).reduce((count, entries) => count + entries.length, 0);
    const reportPath = writeLintReport(root, pageRecords, rawFiles, problems, schema);
    appendLintChangelogEntry(root, totalProblems, relativeTo(root, reportPath), schema);

    console.log(`[lint] root: ${root}`);
    console.log(`schema: ${schema}`);
    console.log(`wiki pages: ${pageRecords.length}`);
    console.log(`raw markdown files: ${rawFiles.length}`);
    console.log(`issues: ${totalProblems}`);
    console.log(`report: ${relativeTo(root, reportPath)}`);

    for (const [name, entries] of Object.entries(problems)) {
      if (entries.length === 0) continue;
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

  return { runLint };
}

module.exports = { createLintTools };
