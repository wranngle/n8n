#!/usr/bin/env bats

setup() {
  REPO_ROOT="$(cd "${BATS_TEST_DIRNAME}/.." && pwd)"
  LINT="${REPO_ROOT}/bin/n8n-lint.js"
  DIRTY="${REPO_ROOT}/fixtures/lint/dirty.json"
  CLEAN="${REPO_ROOT}/fixtures/lint/clean.json"
}

# --- registry surface ---

@test "lint registry: --list-rules names all four custom rules" {
  run node "$LINT" --list-rules
  [ "$status" -eq 0 ]
  [[ "$output" == *"pii-in-node-name"* ]]
  [[ "$output" == *"missing-error-handler"* ]]
  [[ "$output" == *"retry-without-idempotency"* ]]
  [[ "$output" == *"hardcoded-secrets"* ]]
}

@test "lint registry: --list-rules --json is parseable JSON" {
  run node "$LINT" --list-rules --json
  [ "$status" -eq 0 ]
  echo "$output" | node -e 'const c=require("fs").readFileSync(0,"utf8");const a=JSON.parse(c);if(a.length<4)process.exit(1)'
}

# --- dirty fixture: every rule must fire ---

@test "lint dirty: exits non-zero" {
  run node "$LINT" "$DIRTY"
  [ "$status" -eq 1 ]
}

@test "lint dirty: stderr names pii-in-node-name and missing-error-handler" {
  run node "$LINT" "$DIRTY"
  [ "$status" -eq 1 ]
  [[ "$output" == *"pii-in-node-name"* ]]
  [[ "$output" == *"missing-error-handler"* ]]
}

@test "lint dirty: stderr also names retry-without-idempotency and hardcoded-secrets" {
  run node "$LINT" "$DIRTY"
  [ "$status" -eq 1 ]
  [[ "$output" == *"retry-without-idempotency"* ]]
  [[ "$output" == *"hardcoded-secrets"* ]]
}

@test "lint dirty --json: findings array contains all four rule ids" {
  run node "$LINT" --json "$DIRTY"
  [ "$status" -eq 1 ]
  rules="$(echo "$output" | node -e 'const c=require("fs").readFileSync(0,"utf8");const o=JSON.parse(c);console.log([...new Set(o.findings.map(f=>f.rule))].sort().join(","))')"
  [ "$rules" = "hardcoded-secrets,missing-error-handler,pii-in-node-name,retry-without-idempotency" ]
}

# --- clean fixture: zero findings ---

@test "lint clean: exits zero with no findings" {
  run node "$LINT" "$CLEAN"
  [ "$status" -eq 0 ]
  [[ "$output" == *"OK"* ]]
}

@test "lint clean --json: empty findings array" {
  run node "$LINT" --json "$CLEAN"
  [ "$status" -eq 0 ]
  count="$(echo "$output" | node -e 'const c=require("fs").readFileSync(0,"utf8");console.log(JSON.parse(c).findings.length)')"
  [ "$count" = "0" ]
}

# --- determinism: same input -> byte-identical output ---

@test "lint dirty: two runs produce byte-identical JSON output" {
  out1="$(node "$LINT" --json "$DIRTY" 2>/dev/null || true)"
  out2="$(node "$LINT" --json "$DIRTY" 2>/dev/null || true)"
  [ -n "$out1" ]
  [ "$out1" = "$out2" ]
}

# --- argument handling ---

@test "lint: no args exits 2 with usage on stderr" {
  run node "$LINT"
  [ "$status" -eq 2 ]
  [[ "$output" == *"Usage"* ]]
}

@test "lint: unknown flag exits 2" {
  run node "$LINT" --bogus "$CLEAN"
  [ "$status" -eq 2 ]
}

@test "lint: --only filter narrows findings" {
  run node "$LINT" --only pii-in-node-name "$DIRTY"
  [ "$status" -eq 1 ]
  [[ "$output" == *"pii-in-node-name"* ]]
  [[ "$output" != *"missing-error-handler"* ]]
  [[ "$output" != *"hardcoded-secrets"* ]]
}

@test "lint: --skip excludes a rule" {
  run node "$LINT" --skip hardcoded-secrets --json "$DIRTY"
  [ "$status" -eq 1 ]
  has_secret="$(echo "$output" | node -e 'const c=require("fs").readFileSync(0,"utf8");const o=JSON.parse(c);console.log(o.findings.some(f=>f.rule==="hardcoded-secrets")?"yes":"no")')"
  [ "$has_secret" = "no" ]
}
