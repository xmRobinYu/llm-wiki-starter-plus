function createCoreTools(deps) {
  const { fs, path } = deps;

  function ensureWikiRoot(root, fail) {
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

  function stripHtmlComments(content) {
    return content.replace(/<!--[\s\S]*?-->/g, "");
  }

  function extractWikiLinks(content) {
    const matches = content.match(/\[\[([^\]]+)\]\]/g) || [];
    return matches.map((match) => match.slice(2, -2).split("|")[0].trim()).filter(Boolean);
  }

  function isSystemWikiPage(basename) {
    return /^(Index|Wiki 目录|Changelog|操作日志|Purpose|知识库目标|Glossary|术语表|Review Rules|评审规则|sortspec|Domain Map|领域地图)$/.test(
      basename
    );
  }

  // ===== Schema Detection =====

  function detectSchemaVersion(root) {
    const zhSystem = fs.existsSync(path.join(root, "wiki", "00 系统"));
    const enSystem = fs.existsSync(path.join(root, "wiki", "00 System"));
    if (zhSystem || enSystem) return "v2";
    return "legacy";
  }

  function isV2Root(root) {
    return detectSchemaVersion(root) === "v2";
  }

  // ===== Page Classification =====

  function normalizeField(value) {
    if (!value) return "";
    return String(value).trim().replace(/^["']|["']$/g, "").trim();
  }

  function resolvePageKindLayer(frontmatter) {
    if (!frontmatter) return { kind: "unknown", layer: "unknown" };

    const kind = normalizeField(frontmatter.kind) || normalizeField(frontmatter.type) || "unknown";

    let layer = normalizeField(frontmatter.layer);
    if (!layer) {
      const layerMap = {
        moc: "navigation",
        concept: "canonical",
        method: "canonical",
        entity: "canonical",
        synthesis: "canonical",
        topic: "domain",
        case: "domain",
        atom: "working",
        source: "evidence",
        query: "reusable",
        comparison: "domain"
      };
      layer = layerMap[kind] || "unknown";
    }

    return { kind, layer };
  }

  function resolveDomains(frontmatter) {
    if (!frontmatter) return [];
    if (frontmatter.domains) {
      const val = frontmatter.domains;
      if (Array.isArray(val)) return val.filter(Boolean).map(String);
      const str = String(val).trim();
      if (str.startsWith("[")) {
        try {
          return JSON.parse(str.replace(/'/g, '"')).filter(Boolean);
        } catch {
          return str
            .slice(1, -1)
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean);
        }
      }
      return str ? [str] : [];
    }
    if (frontmatter.domain) {
      const str = normalizeField(frontmatter.domain);
      return str ? [str] : [];
    }
    return [];
  }

  // ===== Path Resolution =====

  function getEvidenceDir(root, schema) {
    const version = schema || detectSchemaVersion(root);
    if (version === "v2") {
      return fs.existsSync(path.join(root, "wiki", "30 证据"))
        ? path.join(root, "wiki", "30 证据", "资料摘要")
        : path.join(root, "wiki", "30 Evidence", "Summaries");
    }
    return path.join(root, "wiki", isZhWikiRoot(root) ? "资料摘要" : "summaries");
  }

  function getAtomDir(root, domain, schema) {
    const version = schema || detectSchemaVersion(root);
    if (version === "v2") {
      const safeDomain = domain || "general";
      if (fs.existsSync(path.join(root, "wiki", "20 领域"))) {
        return path.join(root, "wiki", "20 领域", safeDomain, "工作台", "原子卡");
      }
      return path.join(root, "wiki", "20 Domains", safeDomain, "Workspace", "Atoms");
    }
    return null;
  }

  function getReportsDir(root, schema) {
    const version = schema || detectSchemaVersion(root);
    if (version === "v2") {
      return fs.existsSync(path.join(root, "wiki", "00 系统"))
        ? path.join(root, "wiki", "00 系统", "巡检报告")
        : path.join(root, "wiki", "00 System", "Reports");
    }
    return path.join(root, "wiki", isZhWikiRoot(root) ? "巡检报告" : "reports");
  }

  function getChangelogPath(root, schema) {
    const version = schema || detectSchemaVersion(root);
    if (version === "v2") {
      return fs.existsSync(path.join(root, "wiki", "00 系统"))
        ? path.join(root, "wiki", "00 系统", "操作日志.md")
        : path.join(root, "wiki", "00 System", "Changelog.md");
    }
    return isZhWikiRoot(root)
      ? path.join(root, "wiki", "操作日志.md")
      : path.join(root, "wiki", "Changelog.md");
  }

  function ensureDir(dirPath) {
    fs.mkdirSync(dirPath, { recursive: true });
  }

  function isZhWikiRoot(root) {
    return (
      fs.existsSync(path.join(root, "wiki", "Wiki 目录.md")) ||
      fs.existsSync(path.join(root, "wiki", "00 系统", "Wiki 目录.md"))
    );
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

  function findIndexPage(root) {
    const candidates = [
      path.join(root, "wiki", "Index.md"),
      path.join(root, "wiki", "Wiki 目录.md"),
      path.join(root, "wiki", "00 System", "Index.md"),
      path.join(root, "wiki", "00 系统", "Wiki 目录.md")
    ];
    return candidates.find((candidate) => fs.existsSync(candidate)) || candidates[0];
  }

  return {
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
    isV2Root,
    resolvePageKindLayer,
    resolveDomains,
    getEvidenceDir,
    getAtomDir,
    getReportsDir,
    getChangelogPath,
    normalizeField
  };
}

module.exports = { createCoreTools };
