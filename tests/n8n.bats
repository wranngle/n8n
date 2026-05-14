#!/usr/bin/env bats
# tests/n8n.bats — single test file per project.
#
# Covers the synthetic-fixture generator contract:
#   - every live-universalized registry slug has a fixture file
#   - each fixture parses as JSON
#   - re-running the generator is byte-identical (determinism)
#   - the generator exits 0 and prints a summary

REPO_ROOT="$(cd "$(dirname "$BATS_TEST_FILENAME")/.." && pwd)"

setup() {
  cd "$REPO_ROOT"
}

# === fixture generator ===

@test "fixtures: generator exits 0 and writes one file per live-universalized registry slug" {
  run node scripts/generate-fixtures.js
  [ "$status" -eq 0 ]
  [[ "$output" == *"generated"* ]]

  fixture_count=$(find fixtures -maxdepth 1 -name '*.json' 2>/dev/null | wc -l | tr -d ' ')
  registry_live=$(grep -E '^    path: "workflows/live-universalized/' workflows/registry.yaml | wc -l | tr -d ' ')

  [ "$fixture_count" = "$registry_live" ]
}

@test "fixtures: every registry slug under live-universalized has a fixture file" {
  node scripts/generate-fixtures.js >/dev/null
  while IFS= read -r slug; do
    [ -f "fixtures/${slug}.json" ] || {
      echo "missing fixture for slug: $slug" >&2
      return 1
    }
  done < <(
    awk '
      /^  [a-z][a-z0-9_-]+:[[:space:]]*$/ { slug=$1; sub(/:$/, "", slug) }
      /^    path: "workflows\/live-universalized\// {
        if (slug != "") print slug
        slug=""
      }
    ' workflows/registry.yaml
  )
}

@test "fixtures: every emitted fixture is valid JSON" {
  node scripts/generate-fixtures.js >/dev/null
  shopt -s nullglob
  for f in fixtures/*.json; do
    node -e "JSON.parse(require('fs').readFileSync('$f','utf8'))" || {
      echo "invalid JSON: $f" >&2
      return 1
    }
  done
}

@test "fixtures: re-running the generator is byte-identical (deterministic)" {
  node scripts/generate-fixtures.js >/dev/null
  before=$(find fixtures -type f -name '*.json' | sort | xargs sha256sum)
  node scripts/generate-fixtures.js >/dev/null
  after=$(find fixtures -type f -name '*.json' | sort | xargs sha256sum)
  [ "$before" = "$after" ]
}
