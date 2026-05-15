#!/usr/bin/env bats

# Central promise: bin/drift.js compares deployed workflows (GET /rest/workflows
# on the n8n REST API) against repo-tracked JSON files and writes a
# drift.md report with three sections: Only on instance / Only in repo / Modified.

setup() {
  REPO_ROOT="$(cd "$(dirname "$BATS_TEST_FILENAME")/.." && pwd)"
  TMP="$(mktemp -d)"
  MOCK_PORT="$((RANDOM % 10000 + 40000))"
  MOCK_LOG="$TMP/mock.log"
  MOCK_PID_FILE="$TMP/mock.pid"
  OUT="$TMP/drift.md"

  # Mock n8n: GET /rest/workflows returns a deterministic payload exercising
  # all three drift categories relative to the fixture repo workflows dir.
  cat >"$TMP/mock-n8n.js" <<'JS'
const http = require('http');
const fs = require('fs');
const port = parseInt(process.env.MOCK_PORT, 10);
const logPath = process.env.MOCK_LOG;
const deployed = [
  {
    id: 'wf-001',
    name: 'Lead Intake',
    nodes: [
      {
        id: 'webhook',
        name: 'Webhook',
        type: 'n8n-nodes-base.webhook',
        parameters: { path: 'intake' }
      }
    ],
    connections: {},
    settings: {},
    active: true,
    updatedAt: '2026-05-14T00:00:00.000Z'
  },
  {
    id: 'wf-002',
    name: 'Lead Enrichment',
    nodes: [
      {
        id: 'http',
        name: 'Enrich',
        type: 'n8n-nodes-base.httpRequest',
        parameters: { url: 'https://api.different.com/enrich' }
      }
    ],
    connections: {},
    settings: {},
    active: true,
    updatedAt: '2026-05-14T00:00:00.000Z'
  },
  {
    id: 'wf-099',
    name: 'Instance Only Flow',
    nodes: [
      {
        id: 'cron',
        name: 'Cron',
        type: 'n8n-nodes-base.cron',
        parameters: {}
      }
    ],
    connections: {},
    settings: {},
    active: false,
    updatedAt: '2026-05-14T00:00:00.000Z'
  }
];
const server = http.createServer((req, res) => {
  fs.appendFileSync(logPath, JSON.stringify({
    method: req.method,
    path: req.url,
    apiKey: req.headers['x-n8n-api-key'] || null
  }) + '\n');
  if (req.method === 'GET' && req.url === '/rest/workflows') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ data: deployed }));
    return;
  }
  res.writeHead(404);
  res.end('not found');
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
}

teardown() {
  if [ -f "$MOCK_PID_FILE" ]; then
    kill "$(cat "$MOCK_PID_FILE")" 2>/dev/null || true
  fi
  rm -rf "$TMP"
}

# --- drift: contract (central promise) ---

@test "drift: report classifies each workflow into one of three sections" {
  run node "$REPO_ROOT/bin/drift.js" \
    --n8n-url "http://127.0.0.1:$MOCK_PORT" \
    --api-key "test-key-abc" \
    --workflows-dir "$REPO_ROOT/fixtures/drift/workflows" \
    --out "$OUT"

  # exit 1 because drift was detected; report still written.
  [ "$status" -eq 1 ]
  [ -f "$OUT" ]

  # Sections present in the report.
  run grep -c '^## Only on instance$' "$OUT"
  [ "$output" = "1" ]
  run grep -c '^## Only in repo$' "$OUT"
  [ "$output" = "1" ]
  run grep -c '^## Modified$' "$OUT"
  [ "$output" = "1" ]

  # Per-section helpers: extract bytes between section headers.
  run awk '/^## Only on instance$/{f=1;next} /^## /{f=0} f' "$OUT"
  ONLY_INSTANCE="$output"
  run awk '/^## Only in repo$/{f=1;next} /^## /{f=0} f' "$OUT"
  ONLY_REPO="$output"
  run awk '/^## Modified$/{f=1;next} /^## /{f=0} f' "$OUT"
  MODIFIED_SEC="$output"

  # "Instance Only Flow" lives only on the deployed instance.
  [[ "$ONLY_INSTANCE" == *"Instance Only Flow"* ]]
  [[ "$ONLY_INSTANCE" != *"Notify Slack"* ]]
  [[ "$ONLY_INSTANCE" != *"Lead Enrichment"* ]]

  # "Notify Slack" lives only in repo.
  [[ "$ONLY_REPO" == *"Notify Slack"* ]]
  [[ "$ONLY_REPO" == *"notify-slack.json"* ]]
  [[ "$ONLY_REPO" != *"Instance Only Flow"* ]]

  # "Lead Enrichment" differs between deployed and repo.
  [[ "$MODIFIED_SEC" == *"Lead Enrichment"* ]]
  [[ "$MODIFIED_SEC" == *"lead-enrichment.json"* ]]

  # "Lead Intake" matches and must not appear in any drift section.
  run grep -c 'Lead Intake' "$OUT"
  [ "$output" = "0" ]
}

@test "drift: mock receives exactly one GET /rest/workflows with the api key" {
  run node "$REPO_ROOT/bin/drift.js" \
    --n8n-url "http://127.0.0.1:$MOCK_PORT" \
    --api-key "test-key-abc" \
    --workflows-dir "$REPO_ROOT/fixtures/drift/workflows" \
    --out "$OUT"

  run grep -c '"method":"GET"' "$MOCK_LOG"
  [ "$output" = "1" ]
  run grep -c '"path":"/rest/workflows"' "$MOCK_LOG"
  [ "$output" = "1" ]
  run grep -c '"apiKey":"test-key-abc"' "$MOCK_LOG"
  [ "$output" = "1" ]
}

# --- drift: clean state ---

@test "drift: zero drift exits 0 and reports empty sections" {
  CLEAN_DIR="$TMP/clean-repo"
  mkdir -p "$CLEAN_DIR"
  # Only the workflows the mock reports as deployed-and-matching.
  cp "$REPO_ROOT/fixtures/drift/workflows/lead-intake.json" "$CLEAN_DIR/"

  CLEAN_OUT="$TMP/clean.md"

  # Patch mock to return only the matching workflow so there is zero drift.
  kill "$(cat "$MOCK_PID_FILE")" 2>/dev/null || true
  cat >"$TMP/mock-clean.js" <<'JS'
const http = require('http');
const port = parseInt(process.env.MOCK_PORT, 10);
const server = http.createServer((req, res) => {
  if (req.method === 'GET' && req.url === '/rest/workflows') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ data: [
      {
        id: 'wf-001',
        name: 'Lead Intake',
        nodes: [
          {
            id: 'webhook',
            name: 'Webhook',
            type: 'n8n-nodes-base.webhook',
            parameters: { path: 'intake' }
          }
        ],
        connections: {},
        settings: {},
        active: true,
        updatedAt: '2026-05-14T00:00:00.000Z'
      }
    ]}));
    return;
  }
  res.writeHead(404);
  res.end('not found');
});
server.listen(port, '127.0.0.1');
JS
  MOCK_PORT="$MOCK_PORT" node "$TMP/mock-clean.js" &
  echo $! >"$MOCK_PID_FILE"
  for _ in 1 2 3 4 5 6 7 8 9 10; do
    if (echo >"/dev/tcp/127.0.0.1/$MOCK_PORT") >/dev/null 2>&1; then
      break
    fi
    sleep 0.2
  done

  run node "$REPO_ROOT/bin/drift.js" \
    --n8n-url "http://127.0.0.1:$MOCK_PORT" \
    --api-key "test-key-abc" \
    --workflows-dir "$CLEAN_DIR" \
    --out "$CLEAN_OUT"

  [ "$status" -eq 0 ]
  [ -f "$CLEAN_OUT" ]
  run grep -c '_None._' "$CLEAN_OUT"
  [ "$output" = "3" ]
}

# --- drift: argument validation ---

@test "drift: missing required flags exits non-zero with usage" {
  run node "$REPO_ROOT/bin/drift.js"
  [ "$status" -eq 2 ]
  [[ "$output" == *"Usage:"* ]]
}
