#!/usr/bin/env bats

# Central promise: scripts/n8n-diff.js renders a deterministic human-readable
# markdown diff between two n8n workflow JSON files.

setup() {
  REPO_ROOT="$(cd "$(dirname "$BATS_TEST_FILENAME")/.." && pwd)"
  TMP="$(mktemp -d)"
}

teardown() {
  rm -rf "$TMP"
}

# --- happy path -------------------------------------------------------------

@test "diff: emits expected section headings on the fixture pair" {
  run node "$REPO_ROOT/scripts/n8n-diff.js" \
    "$REPO_ROOT/fixtures/diff/a.json" \
    "$REPO_ROOT/fixtures/diff/b.json"
  [ "$status" -eq 0 ]
  echo "$output" | grep -q '^### Nodes added'
  echo "$output" | grep -q '^### Nodes removed'
  echo "$output" | grep -q '^### Nodes modified'
  echo "$output" | grep -q '^### Connections delta'
  echo "$output" | grep -q '^### Env vars changed'
}

@test "diff: marks new node with a leading + and the new node id" {
  run node "$REPO_ROOT/scripts/n8n-diff.js" \
    "$REPO_ROOT/fixtures/diff/a.json" \
    "$REPO_ROOT/fixtures/diff/b.json"
  [ "$status" -eq 0 ]
  echo "$output" | grep -q '^+ `audit`'
}

@test "diff: marks removed node with a leading - and the removed node id" {
  run node "$REPO_ROOT/scripts/n8n-diff.js" \
    "$REPO_ROOT/fixtures/diff/a.json" \
    "$REPO_ROOT/fixtures/diff/b.json"
  [ "$status" -eq 0 ]
  echo "$output" | grep -q '^- `legacy-log`'
}

@test "diff: reports the changed env var under Env vars changed" {
  run node "$REPO_ROOT/scripts/n8n-diff.js" \
    "$REPO_ROOT/fixtures/diff/a.json" \
    "$REPO_ROOT/fixtures/diff/b.json"
  [ "$status" -eq 0 ]
  echo "$output" | grep -q '^+ `GREETING_V2`'
  echo "$output" | grep -q '^- `GREETING`'
}

@test "diff: reports the changed connection target under Connections delta" {
  run node "$REPO_ROOT/scripts/n8n-diff.js" \
    "$REPO_ROOT/fixtures/diff/a.json" \
    "$REPO_ROOT/fixtures/diff/b.json"
  [ "$status" -eq 0 ]
  echo "$output" | grep -q 'Respond -> Audit Log'
  echo "$output" | grep -q 'Respond -> Legacy Log'
}

# --- determinism -----------------------------------------------------------

@test "diff: two runs produce byte-identical stdout" {
  node "$REPO_ROOT/scripts/n8n-diff.js" \
    "$REPO_ROOT/fixtures/diff/a.json" \
    "$REPO_ROOT/fixtures/diff/b.json" >"$TMP/run1.md"
  node "$REPO_ROOT/scripts/n8n-diff.js" \
    "$REPO_ROOT/fixtures/diff/a.json" \
    "$REPO_ROOT/fixtures/diff/b.json" >"$TMP/run2.md"
  cmp -s "$TMP/run1.md" "$TMP/run2.md"
}

# --- --out flag ------------------------------------------------------------

@test "diff: --out writes markdown to the given path" {
  run node "$REPO_ROOT/scripts/n8n-diff.js" \
    "$REPO_ROOT/fixtures/diff/a.json" \
    "$REPO_ROOT/fixtures/diff/b.json" \
    --out "$TMP/diff.md"
  [ "$status" -eq 0 ]
  [ -s "$TMP/diff.md" ]
  grep -q '^### Nodes added' "$TMP/diff.md"
}

# --- failure modes ---------------------------------------------------------

@test "diff: missing args exits 2 with usage line on stderr" {
  run node "$REPO_ROOT/scripts/n8n-diff.js"
  [ "$status" -eq 2 ]
  echo "$stderr" | grep -q 'Usage:' || echo "$output" | grep -q 'Usage:'
}

@test "diff: identical inputs produce all-empty section markers" {
  run node "$REPO_ROOT/scripts/n8n-diff.js" \
    "$REPO_ROOT/fixtures/diff/a.json" \
    "$REPO_ROOT/fixtures/diff/a.json"
  [ "$status" -eq 0 ]
  # Five sections, each saying _none_
  none_count=$(echo "$output" | grep -c '^_none_')
  [ "$none_count" -eq 5 ]
}
