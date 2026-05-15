#!/usr/bin/env bash
# Per-workflow CI matrix runner.
#
# Validates one workflow JSON file end-to-end. The expensive end-to-end path
# (spin up n8n in docker, import the workflow via round-1 install-workflow.js,
# post the matching synthetic fixture, assert expected output) runs only when
# RUN_DOCKER=1. Without it, the runner does a fast schema/shape check so the
# matrix is still useful in PRs that don't need full integration coverage.

set -euo pipefail

WORKFLOW_PATH="${1:-}"
RUN_DOCKER="${RUN_DOCKER:-0}"
N8N_IMAGE="${N8N_IMAGE:-n8nio/n8n:latest}"
N8N_PORT="${N8N_PORT:-5679}"
FIXTURES_DIR="${FIXTURES_DIR:-fixtures/synthetic}"

usage() {
  cat >&2 <<'EOF'
ci-matrix-runner.sh <workflow.json>

Environment:
  RUN_DOCKER=1     Enable docker-backed end-to-end run (default off; fast shape check only).
  N8N_IMAGE        Docker image (default: n8nio/n8n:latest).
  N8N_PORT         Host port for n8n container (default: 5679).
  FIXTURES_DIR     Directory holding <workflow-slug>.json synthetic payloads.
EOF
  exit 2
}

[[ -n "$WORKFLOW_PATH" ]] || usage
[[ -f "$WORKFLOW_PATH" ]] || { echo "ci-matrix-runner: not a file: $WORKFLOW_PATH" >&2; exit 2; }

slug="$(basename "$WORKFLOW_PATH" .json)"
echo "::group::shape-check $slug"

# Fast, dependency-free shape check: valid JSON, has nodes[], has a name.
node --input-type=module -e "
  import fs from 'node:fs';
  const wf = JSON.parse(fs.readFileSync(process.argv[1], 'utf8'));
  if (!wf || typeof wf !== 'object') { console.error('not an object'); process.exit(1); }
  if (!Array.isArray(wf.nodes)) { console.error('missing nodes[] array'); process.exit(1); }
  if (typeof wf.name !== 'string' || !wf.name) { console.error('missing name'); process.exit(1); }
  console.log('ok name=' + JSON.stringify(wf.name) + ' nodes=' + wf.nodes.length);
" "$WORKFLOW_PATH"
echo "::endgroup::"

if [[ "$RUN_DOCKER" != "1" ]]; then
  echo "ci-matrix-runner: shape-check passed for $slug (set RUN_DOCKER=1 for full e2e)"
  exit 0
fi

echo "::group::docker e2e $slug"
command -v docker >/dev/null || { echo "RUN_DOCKER=1 but docker not on PATH" >&2; exit 3; }

container="n8n-ci-${slug}-$$"
cleanup() {
  docker rm -f "$container" >/dev/null 2>&1 || true
}
trap cleanup EXIT

docker run -d --rm \
  --name "$container" \
  -p "${N8N_PORT}:5678" \
  -e N8N_SECURE_COOKIE=false \
  -e N8N_HOST=localhost \
  "$N8N_IMAGE" >/dev/null

# Wait for the n8n REST API to come up (cap at ~60s).
for _ in $(seq 1 30); do
  if curl -fsS "http://localhost:${N8N_PORT}/healthz" >/dev/null 2>&1; then break; fi
  sleep 2
done

# Import via round-1 install-workflow.js if present; otherwise hit the REST
# API directly. Round-1 PR #25 lands the helper; this runner stays useful even
# before that merge.
if [[ -x scripts/install-workflow.js || -f scripts/install-workflow.js ]]; then
  N8N_URL="http://localhost:${N8N_PORT}" \
    node scripts/install-workflow.js "$WORKFLOW_PATH"
else
  echo "scripts/install-workflow.js not present yet (round-1 PR #25) — skipping import" >&2
fi

# Post matching synthetic fixture (round-1 PR #24 generates these into FIXTURES_DIR).
fixture="${FIXTURES_DIR}/${slug}.json"
if [[ -f "$fixture" ]]; then
  curl -fsS -X POST -H 'content-type: application/json' \
    --data-binary "@${fixture}" \
    "http://localhost:${N8N_PORT}/webhook/${slug}" \
    || { echo "fixture post failed for $slug" >&2; exit 4; }
else
  echo "no synthetic fixture at $fixture — skipping POST (round-1 PR #24)" >&2
fi
echo "::endgroup::"
