#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
TMP_DIR="$(mktemp -d)"
cleanup() {
  rm -rf "$TMP_DIR"
}
trap cleanup EXIT

echo "[smoke] temp dir: $TMP_DIR"

cp -R "$ROOT_DIR/template/en" "$TMP_DIR/en"
cp -R "$ROOT_DIR/template/zh" "$TMP_DIR/zh"

cat > "$TMP_DIR/article.md" <<'EOF'
---
title: Smoke Test Article
---

This is the first useful summary sentence for the smoke test.

Additional details for ingest validation.
EOF

echo "[smoke] ingest local markdown"
node "$ROOT_DIR/bin/llm-wiki.js" ingest --root "$TMP_DIR/en" --domain testing "$TMP_DIR/article.md" >/tmp/llm_wiki_smoke_ingest_en.txt
test -f "$TMP_DIR/en/raw/testing/Smoke Test Article.md"
test -f "$TMP_DIR/en/wiki/summaries/Summary：Smoke Test Article.md"
grep -q 'domain: "testing"' "$TMP_DIR/en/wiki/summaries/Summary：Smoke Test Article.md"
grep -q 'summary: "This is the first useful summary sentence for the smoke test."' "$TMP_DIR/en/wiki/summaries/Summary：Smoke Test Article.md"

echo "[smoke] ingest url"
node "$ROOT_DIR/bin/llm-wiki.js" ingest --root "$TMP_DIR/zh" --domain 测试领域 "https://example.com" >/tmp/llm_wiki_smoke_ingest_zh.txt
test -f "$TMP_DIR/zh/raw/测试领域/Example Domain.md"
test -f "$TMP_DIR/zh/wiki/资料摘要/资料摘要：Example Domain.md"
grep -q 'domain: "测试领域"' "$TMP_DIR/zh/wiki/资料摘要/资料摘要：Example Domain.md"
grep -q 'source_url: "https://example.com"' "$TMP_DIR/zh/wiki/资料摘要/资料摘要：Example Domain.md"

echo "[smoke] query text mode"
node "$ROOT_DIR/bin/llm-wiki.js" query --root "$TMP_DIR/en" --top 2 "smoke test article" >/tmp/llm_wiki_smoke_query.txt
grep -q 'matches:' /tmp/llm_wiki_smoke_query.txt
grep -q 'Smoke Test Article' /tmp/llm_wiki_smoke_query.txt || grep -q 'Summary：Smoke Test Article' /tmp/llm_wiki_smoke_query.txt

echo "[smoke] query json mode"
node "$ROOT_DIR/bin/llm-wiki.js" query --root "$TMP_DIR/zh" --json --top 1 "知识库 目标 概览" >/tmp/llm_wiki_smoke_query_json.txt
grep -q '"results"' /tmp/llm_wiki_smoke_query_json.txt
grep -q '"top": 1' /tmp/llm_wiki_smoke_query_json.txt

echo "[smoke] lint"
node "$ROOT_DIR/bin/llm-wiki.js" lint --root "$TMP_DIR/en" >/tmp/llm_wiki_smoke_lint.txt
grep -q 'report: wiki/reports/' /tmp/llm_wiki_smoke_lint.txt
find "$TMP_DIR/en/wiki/reports" -type f | grep -q .

echo "[smoke] graph"
node "$ROOT_DIR/bin/llm-wiki.js" graph --root "$TMP_DIR/zh" >/tmp/llm_wiki_smoke_graph.txt
test -f "$TMP_DIR/zh/graph/graph.json"
test -f "$TMP_DIR/zh/graph/index.html"
grep -q '"nodes"' "$TMP_DIR/zh/graph/graph.json"
grep -q 'Details' "$TMP_DIR/zh/graph/index.html"

rm -f /tmp/llm_wiki_smoke_ingest_en.txt \
  /tmp/llm_wiki_smoke_ingest_zh.txt \
  /tmp/llm_wiki_smoke_query.txt \
  /tmp/llm_wiki_smoke_query_json.txt \
  /tmp/llm_wiki_smoke_lint.txt \
  /tmp/llm_wiki_smoke_graph.txt

echo "[smoke] ok"
