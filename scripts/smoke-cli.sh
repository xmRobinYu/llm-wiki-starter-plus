#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
TMP_DIR="$(mktemp -d)"
cleanup() {
  rm -rf "$TMP_DIR"
}
trap cleanup EXIT

echo "[smoke] temp dir: $TMP_DIR"

# ===== v2 fixtures: base + lang overlay =====
mkdir -p "$TMP_DIR/v2-en"
cp -R "$ROOT_DIR/template/base/." "$TMP_DIR/v2-en/"
cp -R "$ROOT_DIR/template/en/." "$TMP_DIR/v2-en/"

mkdir -p "$TMP_DIR/v2-zh"
cp -R "$ROOT_DIR/template/base/." "$TMP_DIR/v2-zh/"
cp -R "$ROOT_DIR/template/zh/." "$TMP_DIR/v2-zh/"

# ===== legacy fixtures =====
# English legacy
mkdir -p "$TMP_DIR/legacy-en"/{wiki/summaries,wiki/queries,wiki/reports,raw}
cat > "$TMP_DIR/legacy-en/AGENTS.md" <<'EOF'
# Legacy Wiki
EOF
cat > "$TMP_DIR/legacy-en/wiki/Overview.md" <<'EOF'
---
title: Overview
type: landing
status: stable
summary: "Landing page for the wiki."
---
# Overview

Landing page content.
EOF
cat > "$TMP_DIR/legacy-en/wiki/Index.md" <<'EOF'
---
title: Index
type: index
status: stable
summary: "Content index."
---
# Index

- [[Overview]]
EOF
cat > "$TMP_DIR/legacy-en/wiki/Changelog.md" <<'EOF'
---
title: Changelog
---
# Changelog
EOF
cat > "$TMP_DIR/legacy-en/raw/sortspec.md" <<'EOF'
# sortspec
EOF

# Chinese legacy
mkdir -p "$TMP_DIR/legacy-zh"/{wiki/资料摘要,wiki/问答沉淀,wiki/巡检报告,raw}
cat > "$TMP_DIR/legacy-zh/AGENTS.md" <<'EOF'
# 旧版知识库
EOF
cat > "$TMP_DIR/legacy-zh/wiki/知识库概览.md" <<'EOF'
---
title: 知识库概览
type: landing
status: stable
summary: "知识库落地页。"
---
# 知识库概览

概览内容。
EOF
cat > "$TMP_DIR/legacy-zh/wiki/Wiki 目录.md" <<'EOF'
---
title: Wiki 目录
type: index
status: stable
summary: "内容目录。"
---
# Wiki 目录

- [[知识库概览]]
EOF
cat > "$TMP_DIR/legacy-zh/wiki/操作日志.md" <<'EOF'
---
title: 操作日志
---
# 操作日志
EOF
cat > "$TMP_DIR/legacy-zh/raw/sortspec.md" <<'EOF'
# sortspec
EOF

cat > "$TMP_DIR/article.md" <<'EOF'
---
title: Smoke Test Article
---

This is the first useful summary sentence for the smoke test.

Additional details for ingest validation.
EOF

# ============================================================
# v2 ingest tests
# ============================================================

echo "[smoke] v2 ingest local markdown"
node "$ROOT_DIR/bin/llm-wiki.js" ingest --root "$TMP_DIR/v2-en" --domain testing "$TMP_DIR/article.md" >/tmp/llm_wiki_smoke_v2_ingest_en.txt
test -f "$TMP_DIR/v2-en/raw/testing/Smoke Test Article.md"
test -f "$TMP_DIR/v2-en/wiki/30 Evidence/Summaries/Summary：Smoke Test Article.md"
grep -q 'domains: \["testing"\]' "$TMP_DIR/v2-en/wiki/30 Evidence/Summaries/Summary：Smoke Test Article.md"
grep -q 'summary: "This is the first useful summary sentence for the smoke test."' "$TMP_DIR/v2-en/wiki/30 Evidence/Summaries/Summary：Smoke Test Article.md"
# v2 ingest should also generate atom drafts
test -f "$TMP_DIR/v2-en/wiki/20 Domains/testing/Workspace/Atoms/Atom：Smoke Test Article 1.md"

echo "[smoke] v2 ingest url"
node "$ROOT_DIR/bin/llm-wiki.js" ingest --root "$TMP_DIR/v2-zh" --domain 测试领域 "https://example.com" >/tmp/llm_wiki_smoke_v2_ingest_zh.txt
test -f "$TMP_DIR/v2-zh/raw/测试领域/Example Domain.md"
test -f "$TMP_DIR/v2-zh/wiki/30 证据/资料摘要/资料摘要：Example Domain.md"
grep -q 'domains: \["测试领域"\]' "$TMP_DIR/v2-zh/wiki/30 证据/资料摘要/资料摘要：Example Domain.md"
grep -q 'source_url: "https://example.com"' "$TMP_DIR/v2-zh/wiki/30 证据/资料摘要/资料摘要：Example Domain.md"

# ============================================================
# v2 query tests
# ============================================================

echo "[smoke] v2 query text mode"
node "$ROOT_DIR/bin/llm-wiki.js" query --root "$TMP_DIR/v2-en" --top 2 "smoke test article" >/tmp/llm_wiki_smoke_v2_query.txt
grep -q 'matches:' /tmp/llm_wiki_smoke_v2_query.txt
grep -q 'Smoke Test Article' /tmp/llm_wiki_smoke_v2_query.txt || grep -q 'Summary：Smoke Test Article' /tmp/llm_wiki_smoke_v2_query.txt
grep -q 'why:' /tmp/llm_wiki_smoke_v2_query.txt
grep -q 'title match' /tmp/llm_wiki_smoke_v2_query.txt
# v2 query should show kind/layer
grep -qE '\[atom/working\]|\[source/evidence\]' /tmp/llm_wiki_smoke_v2_query.txt

echo "[smoke] v2 query summary normalization"
node "$ROOT_DIR/bin/llm-wiki.js" query --root "$TMP_DIR/v2-en" --json --top 4 "smoke test article" >/tmp/llm_wiki_smoke_v2_query_source_json.txt
grep -q '"summary": "This is the first useful summary sentence for the smoke test."' /tmp/llm_wiki_smoke_v2_query_source_json.txt
# v2 json should include kind and layer
grep -q '"kind":' /tmp/llm_wiki_smoke_v2_query_source_json.txt
grep -q '"layer":' /tmp/llm_wiki_smoke_v2_query_source_json.txt

echo "[smoke] v2 query system page summary"
node "$ROOT_DIR/bin/llm-wiki.js" query --root "$TMP_DIR/v2-en" --json --top 4 "what belongs in this wiki" >/tmp/llm_wiki_smoke_v2_query_system_json.txt
grep -q '"summary": "Defines the wiki mission, audience, scope, quality bar, and operating preferences."' /tmp/llm_wiki_smoke_v2_query_system_json.txt
node -e "const fs=require('fs'); const data=JSON.parse(fs.readFileSync('/tmp/llm_wiki_smoke_v2_query_system_json.txt','utf8')); if (data.top !== 4 || data.savedPath !== null || data.results.length === 0) process.exit(1)"

echo "[smoke] v2 query ignores system headings"
node "$ROOT_DIR/bin/llm-wiki.js" query --root "$TMP_DIR/v2-zh" --json --top 5 "领域 概念 资料摘要 综合分析 最近更新" >/tmp/llm_wiki_smoke_v2_query_system_headings_json.txt
grep -q '"summary": "知识库内容目录，汇总核心知识、领域入口、证据层和最近更新。"' /tmp/llm_wiki_smoke_v2_query_system_headings_json.txt
! grep -q '"body: 资料摘要"' /tmp/llm_wiki_smoke_v2_query_system_headings_json.txt

echo "[smoke] v2 query dedupes system navigation bullets"
node "$ROOT_DIR/bin/llm-wiki.js" query --root "$TMP_DIR/v2-en" --json --top 5 "domains concepts summaries synthesis recent updates" >/tmp/llm_wiki_smoke_v2_query_system_nav_json.txt
grep -q '"title": "Index"' /tmp/llm_wiki_smoke_v2_query_system_nav_json.txt
! grep -q '"body: - \\[\\[summaries/\\]\\]"' /tmp/llm_wiki_smoke_v2_query_system_nav_json.txt

echo "[smoke] v2 query json mode"
node "$ROOT_DIR/bin/llm-wiki.js" query --root "$TMP_DIR/v2-zh" --json --top 1 "知识库 目标 概览" >/tmp/llm_wiki_smoke_v2_query_json.txt
node -e "const fs=require('fs'); const data=JSON.parse(fs.readFileSync('/tmp/llm_wiki_smoke_v2_query_json.txt','utf8')); const why=data.results?.[0]?.why; if (data.top !== 1 || !Array.isArray(data.results) || data.results.length === 0 || data.savedPath !== null || !Array.isArray(why) || why.length === 0 || !why.every((item)=>item.kind && item.label && item.strength && typeof item.hits === 'number' && typeof item.score === 'number')) process.exit(1)"

echo "[smoke] v2 query explanation model"
node "$ROOT_DIR/bin/llm-wiki.js" query --root "$TMP_DIR/v2-en" --json --top 3 "quick start domain navigation" >/tmp/llm_wiki_smoke_v2_query_why_json.txt
node -e "const fs=require('fs'); const data=JSON.parse(fs.readFileSync('/tmp/llm_wiki_smoke_v2_query_why_json.txt','utf8')); const first=data.results?.[0]; const whyKinds=(first?.why||[]).map((item)=>item.kind); if (!first || !whyKinds.includes('semantic_summary_match')) process.exit(1)"

echo "[smoke] v2 query json mode empty results"
node "$ROOT_DIR/bin/llm-wiki.js" query --root "$TMP_DIR/v2-zh" --json --top 3 "qzjxkvynotfound" >/tmp/llm_wiki_smoke_v2_query_empty_json.txt || true
node -e "const fs=require('fs'); const data=JSON.parse(fs.readFileSync('/tmp/llm_wiki_smoke_v2_query_empty_json.txt','utf8')); if (data.top !== 3 || data.totalMatches !== 0 || data.savedPath !== null || !Array.isArray(data.results) || data.results.length !== 0) process.exit(1)"

# ============================================================
# v2 lint test
# ============================================================

echo "[smoke] v2 lint"
node "$ROOT_DIR/bin/llm-wiki.js" lint --root "$TMP_DIR/v2-en" >/tmp/llm_wiki_smoke_v2_lint.txt || true
grep -q 'report: wiki/00 System/Reports/' /tmp/llm_wiki_smoke_v2_lint.txt
grep -q 'schema: v2' /tmp/llm_wiki_smoke_v2_lint.txt
find "$TMP_DIR/v2-en/wiki/00 System/Reports" -type f | grep -q .

# ============================================================
# v2 graph test
# ============================================================

echo "[smoke] v2 graph"
node "$ROOT_DIR/bin/llm-wiki.js" graph --root "$TMP_DIR/v2-zh" >/tmp/llm_wiki_smoke_v2_graph.txt
test -f "$TMP_DIR/v2-zh/graph/graph.json"
test -f "$TMP_DIR/v2-zh/graph/index.html"
grep -q '"nodes"' "$TMP_DIR/v2-zh/graph/graph.json"
grep -q 'Details' "$TMP_DIR/v2-zh/graph/index.html"
# v2 graph should include kind and layer in nodes
grep -q '"kind"' "$TMP_DIR/v2-zh/graph/graph.json"
grep -q '"layer"' "$TMP_DIR/v2-zh/graph/graph.json"

# ============================================================
# v2 query save test
# ============================================================

echo "[smoke] v2 query json mode save"
node "$ROOT_DIR/bin/llm-wiki.js" query --root "$TMP_DIR/v2-en" --json --save --top 1 "what belongs in this wiki" >/tmp/llm_wiki_smoke_v2_query_saved_json.txt
node -e "const fs=require('fs'); const data=JSON.parse(fs.readFileSync('/tmp/llm_wiki_smoke_v2_query_saved_json.txt','utf8')); if (data.top !== 1 || typeof data.savedPath !== 'string' || !data.savedPath.includes('wiki/40 Queries/')) process.exit(1)"

# ============================================================
# legacy compatibility tests
# ============================================================

echo "[smoke] legacy ingest local markdown"
node "$ROOT_DIR/bin/llm-wiki.js" ingest --root "$TMP_DIR/legacy-en" --domain testing "$TMP_DIR/article.md" >/tmp/llm_wiki_smoke_legacy_ingest_en.txt
test -f "$TMP_DIR/legacy-en/raw/testing/Smoke Test Article.md"
test -f "$TMP_DIR/legacy-en/wiki/summaries/Summary：Smoke Test Article.md"
grep -q 'domain: "testing"' "$TMP_DIR/legacy-en/wiki/summaries/Summary：Smoke Test Article.md"

echo "[smoke] legacy ingest url"
node "$ROOT_DIR/bin/llm-wiki.js" ingest --root "$TMP_DIR/legacy-zh" --domain 测试领域 "https://example.com" >/tmp/llm_wiki_smoke_legacy_ingest_zh.txt
test -f "$TMP_DIR/legacy-zh/raw/测试领域/Example Domain.md"
test -f "$TMP_DIR/legacy-zh/wiki/资料摘要/资料摘要：Example Domain.md"
grep -q 'domain: "测试领域"' "$TMP_DIR/legacy-zh/wiki/资料摘要/资料摘要：Example Domain.md"

echo "[smoke] legacy query"
node "$ROOT_DIR/bin/llm-wiki.js" query --root "$TMP_DIR/legacy-en" --top 2 "landing page" >/tmp/llm_wiki_smoke_legacy_query.txt
grep -q 'matches:' /tmp/llm_wiki_smoke_legacy_query.txt
grep -q 'Overview' /tmp/llm_wiki_smoke_legacy_query.txt

echo "[smoke] legacy lint"
node "$ROOT_DIR/bin/llm-wiki.js" lint --root "$TMP_DIR/legacy-en" >/tmp/llm_wiki_smoke_legacy_lint.txt || true
grep -q 'report: wiki/reports/' /tmp/llm_wiki_smoke_legacy_lint.txt
grep -q 'schema: legacy' /tmp/llm_wiki_smoke_legacy_lint.txt
find "$TMP_DIR/legacy-en/wiki/reports" -type f | grep -q .

echo "[smoke] legacy graph"
node "$ROOT_DIR/bin/llm-wiki.js" graph --root "$TMP_DIR/legacy-zh" >/tmp/llm_wiki_smoke_legacy_graph.txt
test -f "$TMP_DIR/legacy-zh/graph/graph.json"
test -f "$TMP_DIR/legacy-zh/graph/index.html"
grep -q '"nodes"' "$TMP_DIR/legacy-zh/graph/graph.json"

echo "[smoke] legacy query save"
node "$ROOT_DIR/bin/llm-wiki.js" query --root "$TMP_DIR/legacy-en" --json --save --top 1 "landing page" >/tmp/llm_wiki_smoke_legacy_query_saved_json.txt
node -e "const fs=require('fs'); const data=JSON.parse(fs.readFileSync('/tmp/llm_wiki_smoke_legacy_query_saved_json.txt','utf8')); if (data.top !== 1 || typeof data.savedPath !== 'string' || !data.savedPath.includes('wiki/queries/')) process.exit(1)"

# ============================================================
# cleanup temp files
# ============================================================

rm -f /tmp/llm_wiki_smoke_v2_ingest_en.txt \
  /tmp/llm_wiki_smoke_v2_ingest_zh.txt \
  /tmp/llm_wiki_smoke_v2_query.txt \
  /tmp/llm_wiki_smoke_v2_query_source_json.txt \
  /tmp/llm_wiki_smoke_v2_query_system_json.txt \
  /tmp/llm_wiki_smoke_v2_query_system_headings_json.txt \
  /tmp/llm_wiki_smoke_v2_query_system_nav_json.txt \
  /tmp/llm_wiki_smoke_v2_query_json.txt \
  /tmp/llm_wiki_smoke_v2_query_why_json.txt \
  /tmp/llm_wiki_smoke_v2_query_empty_json.txt \
  /tmp/llm_wiki_smoke_v2_query_saved_json.txt \
  /tmp/llm_wiki_smoke_v2_lint.txt \
  /tmp/llm_wiki_smoke_v2_graph.txt \
  /tmp/llm_wiki_smoke_legacy_ingest_en.txt \
  /tmp/llm_wiki_smoke_legacy_ingest_zh.txt \
  /tmp/llm_wiki_smoke_legacy_query.txt \
  /tmp/llm_wiki_smoke_legacy_lint.txt \
  /tmp/llm_wiki_smoke_legacy_graph.txt \
  /tmp/llm_wiki_smoke_legacy_query_saved_json.txt

echo "[smoke] ok"
