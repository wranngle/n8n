#!/usr/bin/env bats
# tests/n8n.bats — single test file per project.
#
# Covers:
#   - scripts/generate-fixtures.js: synthetic-fixture generator contract
#   - scripts/install-workflow.js: posts a workflow JSON to /rest/workflows

REPO_ROOT="$(cd "$(dirname "$BATS_TEST_FILENAME")/.." && pwd)"

setup() {
  cd "$REPO_ROOT"
  TMP="$(mktemp -d)"
  MOCK_PORT="$((RANDOM % 10000 + 40000))"
  MOCK_LOG="$TMP/mock.log"
  MOCK_PID_FILE="$TMP/mock.pid"

  cat >"$TMP/mock-n8n.js" <<'JS'
const http = require('http');
const fs = require('fs');
const port = parseInt(process.env.MOCK_PORT, 10);
const logPath = process.env.MOCK_LOG;
const server = http.createServer((req, res) => {
  let body = '';
  req.on('data', (c) => (body += c));
  req.on('end', () => {
    fs.appendFileSync(logPath, JSON.stringify({
      method: req.method,
      path: req.url,
      apiKey: req.headers['x-n8n-api-key'] || null,
      contentType: req.headers['content-type'] || null,
      body,
    }) + '\n');
    if (req.method === 'POST' && req.url === '/rest/workflows') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ id: 'wf-mock-42', name: JSON.parse(body).name }));
      return;
    }
    res.writeHead(404);
    res.end('not found');
  });
});
server.listen(port, '127.0.0.1');
JS

  MOCK_PORT="$MOCK_PORT" MOCK_LOG="$MOCK_LOG" node "$TMP/mock-n8n.js" &
  echo $! >"$MOCK_PID_FILE"

  # Wait for the mock to accept connections (up to ~2s).
  for _ in 1 2 3 4 5 6 7 8 9 10; do
    if (echo >"/dev/tcp/127.0.0.1/$MOCK_PORT") >/dev/null 2>&1; then
      break
    fi
    sleep 0.2
  done

  cat >"$TMP/sample-workflow.json" <<'JSON'
{
  "name": "sample-install-test",
  "nodes": [],
  "connections": {},
  "settings": {}
}
JSON
}

teardown() {
  if [ -f "$MOCK_PID_FILE" ]; then
    kill "$(cat "$MOCK_PID_FILE")" 2>/dev/null || true
  fi
  rm -rf "$TMP"
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

# === install-workflow: contract ===

@test "install-workflow: posts to /rest/workflows with api key header and prints new id" {
  run node "$REPO_ROOT/scripts/install-workflow.js" \
    "$TMP/sample-workflow.json" \
    --n8n-url "http://127.0.0.1:$MOCK_PORT" \
    --api-key "test-key-abc"

  [ "$status" -eq 0 ]
  [ "$output" = "wf-mock-42" ]

  # Verify the mock saw exactly one POST with the right shape.
  run grep -c '"method":"POST"' "$MOCK_LOG"
  [ "$status" -eq 0 ]
  [ "$output" = "1" ]

  run grep -c '"path":"/rest/workflows"' "$MOCK_LOG"
  [ "$output" = "1" ]

  run grep -c '"apiKey":"test-key-abc"' "$MOCK_LOG"
  [ "$output" = "1" ]

  run grep -c '"contentType":"application/json"' "$MOCK_LOG"
  [ "$output" = "1" ]

  # Body should be the exact workflow JSON we sent.
  run grep -c '\\"name\\":\\"sample-install-test\\"' "$MOCK_LOG"
  [ "$output" = "1" ]
}

# === install-workflow: argument validation ===

@test "install-workflow: missing required flags exits non-zero with usage" {
  run node "$REPO_ROOT/scripts/install-workflow.js" "$TMP/sample-workflow.json"
  [ "$status" -eq 2 ]
  [[ "$output" == *"Usage:"* ]]
}

@test "install-workflow: missing workflow path exits non-zero with usage" {
  run node "$REPO_ROOT/scripts/install-workflow.js" \
    --n8n-url "http://127.0.0.1:$MOCK_PORT" \
    --api-key "test-key-abc"
  [ "$status" -eq 2 ]
  [[ "$output" == *"Usage:"* ]]
}
