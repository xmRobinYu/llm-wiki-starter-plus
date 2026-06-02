function createGraphTools(deps) {
  const {
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
  } = deps;

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
        <input id="search" type="search" placeholder="Filter nodes by title, kind, layer, or path" />
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
        source: "#6d6254",
        concept: "#d66a3d",
        entity: "#2a6fbb",
        topic: "#8f5bd1",
        comparison: "#b24c63",
        synthesis: "#2c8a57",
        query: "#c18b1f",
        method: "#1a7a6e",
        case: "#b85cb8",
        atom: "#6b8e9f",
        moc: "#7a6b5a",
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
        '<div><strong>Kind:</strong> ' + escapeHtml(node.kind || "unknown") + '</div>',
        '<div><strong>Layer:</strong> ' + escapeHtml(node.layer || "unknown") + '</div>',
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
        const color = colorForType(node.kind || node.type);
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
        return [node.title, node.kind, node.layer, node.path, node.summary].join(" ").toLowerCase().includes(normalized);
      }).filter((node) => activeType === "all" ? true : (node.kind === activeType || node.type === activeType));

      const edgesBySource = new Map();
      for (const edge of data.edges) {
        if (!edgesBySource.has(edge.source)) edgesBySource.set(edge.source, []);
        edgesBySource.get(edge.source).push(edge);
      }

      nodeCount.textContent = String(nodes.length);
      edgeCount.textContent = String(data.edges.length);

      const types = [...new Set(data.nodes.map((node) => node.kind || node.type))].sort();
      const typeOptions = ["all", ...types];
      legendEl.innerHTML = typeOptions
        .map((type) => '<span class="chip' + (activeType === type ? ' active' : '') + '" data-type="' + escapeHtml(type) + '" style="--chip-color:' + colorForType(type) + ';">' + escapeHtml(type) + '</span>')
        .join("");
      legendEl.querySelectorAll("[data-type]").forEach((chip) => {
        chip.addEventListener("click", () => {
          activeType = chip.getAttribute("data-type") || "all";
          if (activeNodeId && !data.nodes.find((node) => node.id === activeNodeId && (activeType === "all" || node.kind === activeType || node.type === activeType))) {
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
          '<article class="node' + (node.id === activeNodeId ? ' active' : '') + '" data-node-id="' + escapeHtml(node.id) + '" style="--node-color:' + colorForType(node.kind || node.type) + ';">',
          '<h3 class="node-title">' + escapeHtml(node.title) + '</h3>',
          '<div class="node-meta">',
          '<span>' + escapeHtml(node.kind || node.type) + '</span>',
          '<span>' + escapeHtml(node.layer || "") + '</span>',
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
    const schema = detectSchemaVersion(root);
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
      const { kind, layer } = resolvePageKindLayer(frontmatter);
      const domains = resolveDomains(frontmatter);
      const type =
        normalizeFrontmatterText(frontmatter?.type) || (isSystemWikiPage(basename) ? "system" : "unknown");
      return {
        id: basename,
        title: basename,
        kind,
        layer,
        domains,
        type,
        path: relPath,
        summary: resolvePageSummary({ title: basename, type, content, frontmatter }),
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
      schema,
      nodes: pages.map((page) => ({
        id: page.id,
        title: page.title,
        kind: page.kind,
        layer: page.layer,
        domains: page.domains,
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
    console.log(`schema: ${schema}`);
    console.log(`nodes: ${graph.nodes.length}`);
    console.log(`edges: ${graph.edges.length}`);
    console.log(`output: ${relativeTo(root, graphPath)}`);
    console.log(`viewer: ${relativeTo(root, htmlPath)}`);
  }

  return { runGraph };
}

module.exports = { createGraphTools };
