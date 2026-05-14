#!/usr/bin/env bats

# Per-project: single bats file. Group by concern below.
# Central promise: scripts/install-workflow.js POSTs a workflow JSON to a
# local n8n instance via /rest/workflows and returns the new workflow id.

setup() {
  REPO_ROOT="$(cd "$(dirname "$BATS_TEST_FILENAME")/.." && pwd)"
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

# --- install-workflow: contract ---

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

# --- install-workflow: argument validation ---

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
