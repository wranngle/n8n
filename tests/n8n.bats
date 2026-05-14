#!/usr/bin/env bats

# Per-project: single bats file. Group by concern below.
#
# Central promise under test:
#   `lefthook run pre-commit` blocks any commit whose staged workflow JSON
#   either (a) contains a forbidden sanitization key (per verify-workflows)
#   or (b) contains a leaked secret (per gitleaks dir + .gitleaks.toml).

setup() {
  REPO_ROOT="$(cd "$(dirname "$BATS_TEST_FILENAME")/.." && pwd)"
  TMP="$(mktemp -d)"

  # Build a self-contained scratch repo that mirrors the real one for the
  # pieces lefthook touches: the hook config, the gitleaks config, and the
  # one script the hook invokes.
  cd "$TMP"
  git init -q
  git config user.email "test@example.com"
  git config user.name "test"
  git config commit.gpgsign false

  cp "$REPO_ROOT/lefthook.yml" .
  cp "$REPO_ROOT/.gitleaks.toml" .
  mkdir -p scripts workflows
  cp "$REPO_ROOT/scripts/verify-workflows.js" scripts/

  # Seed an unrelated initial commit so `git diff --cached` has a HEAD.
  echo "scratch" > README.md
  git add README.md
  git commit -qm "init"
}

teardown() {
  rm -rf "$TMP"
}

# --- pre-commit hook: blocks on leaked secret ---

@test "pre-commit hook blocks staged workflow that contains a leaked stripe-shape secret" {
  cd "$TMP"
  # Build the leaked-secret literal at runtime so this test file itself
  # does not trip GitHub's push-protection scanner. The runtime value
  # matches gitleaks' default stripe rule.
  local prefix="sk_live_"
  local body="4eC39HqLyjWDarjtT1zdp7dc"
  cat > workflows/poisoned.json <<JSON
{
  "name": "poisoned",
  "nodes": [
    {
      "name": "HTTP",
      "parameters": {
        "stripeKey": "${prefix}${body}"
      }
    }
  ],
  "connections": {},
  "settings": {}
}
JSON
  git add workflows/poisoned.json

  run lefthook run pre-commit
  [ "$status" -ne 0 ]
  echo "$output" | grep -qi "gitleaks"
}

# --- pre-commit hook: blocks on forbidden sanitization key ---

@test "pre-commit hook blocks staged workflow with a credentials key" {
  cd "$TMP"
  cat > workflows/unsanitized.json <<'JSON'
{
  "name": "unsanitized",
  "nodes": [
    {
      "name": "HTTP",
      "credentials": {
        "httpHeaderAuth": {
          "id": "abc",
          "name": "auth"
        }
      }
    }
  ],
  "connections": {},
  "settings": {}
}
JSON
  git add workflows/unsanitized.json

  run lefthook run pre-commit
  [ "$status" -ne 0 ]
  echo "$output" | grep -qi "credentials"
}

# --- pre-commit hook: clean workflow passes ---

@test "pre-commit hook passes a clean staged workflow" {
  cd "$TMP"
  cat > workflows/clean.json <<'JSON'
{
  "name": "clean",
  "nodes": [],
  "connections": {},
  "settings": {}
}
JSON
  git add workflows/clean.json

  run lefthook run pre-commit
  [ "$status" -eq 0 ]
}

# --- pre-commit hook: skips non-workflow staged files ---

@test "pre-commit hook is a no-op when no workflow JSON is staged" {
  cd "$TMP"
  echo "# notes" > docs/note.md 2>/dev/null || { mkdir -p docs; echo "# notes" > docs/note.md; }
  git add docs/note.md

  run lefthook run pre-commit
  [ "$status" -eq 0 ]
}
