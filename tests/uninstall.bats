#!/usr/bin/env bats

# Central promise: bin/uninstall-workflow.js reverses scripts/install-workflow.js.
# It looks up matching workflows on a remote n8n instance and DELETEs each.
# --dry-run prints the exact API calls without mutating anything.

setup() {
  REPO_ROOT="$(cd "$(dirname "$BATS_TEST_FILENAME")/.." && pwd)"
  TMP="$(mktemp -d)"
  MOCK_PORT="$((RANDOM % 10000 + 40000))"
  MOCK_LOG="$TMP/mock.log"
  MOCK_PID_FILE="$TMP/mock.pid"
  : >"$MOCK_LOG"

  cat >"$TMP/mock-n8n.js" <<'JS'
const http = require('http');
const fs = require('fs');
const port = parseInt(process.env.MOCK_PORT, 10);
const logPath = process.env.MOCK_LOG;

const workflows = [
  { id: 'wf-1', name: 'lead-intake-main' },
  { id: 'wf-2', name: 'lead-intake-main' },
  { id: 'wf-3', name: 'other-flow' },
];

const server = http.createServer((req, res) => {
  let body = '';
  req.on('data', (c) => (body += c));
  req.on('end', () => {
    fs.appendFileSync(logPath, JSON.stringify({
      method: req.method,
      path: req.url,
      apiKey: req.headers['x-n8n-api-key'] || null,
      accept: req.headers['accept'] || null,
      body,
    }) + '\n');

    if (req.method === 'GET' && req.url === '/rest/workflows') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ data: workflows }));
      return;
    }
    const delMatch = req.method === 'DELETE' && req.url.match(/^\/rest\/workflows\/(.+)$/);
    if (delMatch) {
      const id = decodeURIComponent(delMatch[1]);
      const idx = workflows.findIndex((w) => w.id === id);
      if (idx === -1) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'not_found' }));
        return;
      }
      workflows.splice(idx, 1);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true, id }));
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

  for _ in 1 2 3 4 5 6 7 8 9 10; do
    if (echo >"/dev/tcp/127.0.0.1/$MOCK_PORT") >/dev/null 2>&1; then
      break
    fi
    sleep 0.2
  done
}

teardown() {
  if [[ -f "$MOCK_PID_FILE" ]]; then
    kill "$(cat "$MOCK_PID_FILE")" 2>/dev/null || true
  fi
  rm -rf "$TMP"
}

# --- args + usage -----------------------------------------------------------

@test "usage: missing args exits 2" {
  run node "$REPO_ROOT/bin/uninstall-workflow.js"
  [ "$status" -eq 2 ]
}

@test "usage: id without url/key exits 2" {
  run node "$REPO_ROOT/bin/uninstall-workflow.js" --id wf-1
  [ "$status" -eq 2 ]
}

# --- dry-run ---------------------------------------------------------------

@test "dry-run by id: prints DELETE url, makes no DELETE call" {
  run node "$REPO_ROOT/bin/uninstall-workflow.js" \
    --id wf-1 \
    --n8n-url "http://127.0.0.1:$MOCK_PORT" \
    --api-key test-key \
    --dry-run
  [ "$status" -eq 0 ]
  [[ "$output" == *"DELETE http://127.0.0.1:$MOCK_PORT/rest/workflows/wf-1"* ]]
  # The mock only saw the GET listing; no DELETE during dry-run.
  run grep -c '"method":"DELETE"' "$MOCK_LOG"
  [ "$output" -eq 0 ]
}

@test "dry-run by name: lists every matching id, no mutation" {
  run node "$REPO_ROOT/bin/uninstall-workflow.js" \
    --name lead-intake-main \
    --n8n-url "http://127.0.0.1:$MOCK_PORT" \
    --api-key test-key \
    --dry-run
  [ "$status" -eq 0 ]
  [[ "$output" == *"/rest/workflows/wf-1"* ]]
  [[ "$output" == *"/rest/workflows/wf-2"* ]]
  [[ "$output" != *"/rest/workflows/wf-3"* ]]
  run grep -c '"method":"DELETE"' "$MOCK_LOG"
  [ "$output" -eq 0 ]
}

# --- live DELETE ------------------------------------------------------------

@test "live: DELETE issued for matched id with API key header" {
  run node "$REPO_ROOT/bin/uninstall-workflow.js" \
    --id wf-1 \
    --n8n-url "http://127.0.0.1:$MOCK_PORT" \
    --api-key test-key
  [ "$status" -eq 0 ]
  run grep -c '"method":"DELETE","path":"/rest/workflows/wf-1"' "$MOCK_LOG"
  [ "$output" -eq 1 ]
  run grep -c '"apiKey":"test-key"' "$MOCK_LOG"
  [ "$output" -ge 2 ]
}

@test "live: DELETE issued for every workflow matching --name" {
  run node "$REPO_ROOT/bin/uninstall-workflow.js" \
    --name lead-intake-main \
    --n8n-url "http://127.0.0.1:$MOCK_PORT" \
    --api-key test-key
  [ "$status" -eq 0 ]
  # Two workflows share the name; expect DELETE for wf-1 and wf-2, not wf-3.
  run grep -c '"method":"DELETE","path":"/rest/workflows/wf-1"' "$MOCK_LOG"
  [ "$output" -eq 1 ]
  run grep -c '"method":"DELETE","path":"/rest/workflows/wf-2"' "$MOCK_LOG"
  [ "$output" -eq 1 ]
  run grep -c '"method":"DELETE","path":"/rest/workflows/wf-3"' "$MOCK_LOG"
  [ "$output" -eq 0 ]
}

@test "live: no match exits non-zero, no DELETE issued" {
  run node "$REPO_ROOT/bin/uninstall-workflow.js" \
    --name does-not-exist \
    --n8n-url "http://127.0.0.1:$MOCK_PORT" \
    --api-key test-key
  [ "$status" -ne 0 ]
  run grep -c '"method":"DELETE"' "$MOCK_LOG"
  [ "$output" -eq 0 ]
}

# --- env-var fallback -------------------------------------------------------

@test "env vars: N8N_URL and N8N_API_KEY satisfy the CLI" {
  N8N_URL="http://127.0.0.1:$MOCK_PORT" N8N_API_KEY=test-key \
    run node "$REPO_ROOT/bin/uninstall-workflow.js" --id wf-3 --dry-run
  [ "$status" -eq 0 ]
  [[ "$output" == *"DELETE http://127.0.0.1:$MOCK_PORT/rest/workflows/wf-3"* ]]
}
