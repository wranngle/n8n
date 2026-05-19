#!/usr/bin/env bats
#
# Smoke tests for the per-workflow CI matrix.
#
# Behavior under test (not implementation):
#   - scripts/ci-matrix-runner.sh is invokable, exits 2 with usage on no args,
#     and exits 0 on a real workflow JSON in the default (RUN_DOCKER=0) shape-check leg.
#   - .github/workflows/workflow-matrix.yml declares a matrix that fans out over
#     workflows/*.json (the contract the matrix wires to round-1's install-workflow.js).
#   - The docker leg is gated behind RUN_DOCKER=1, so default CI stays cheap.

setup() {
  ROOT="$(cd "$(dirname "$BATS_TEST_FILENAME")/.." && pwd)"
  RUNNER="$ROOT/scripts/ci-matrix-runner.sh"
  WORKFLOW_YAML="$ROOT/.github/workflows/workflow-matrix.yml"
}

@test "ci-matrix: runner exists and is executable" {
  [ -x "$RUNNER" ]
}

@test "ci-matrix: runner exits 2 with usage on no args" {
  run "$RUNNER"
  [ "$status" -eq 2 ]
  [[ "$output" == *"ci-matrix-runner.sh"* ]]
}

@test "ci-matrix: runner rejects non-existent file with exit 2" {
  run "$RUNNER" /tmp/does-not-exist-$$.json
  [ "$status" -eq 2 ]
  [[ "$output" == *"not a file"* ]]
}

@test "ci-matrix: shape-check passes on real workflow JSON (RUN_DOCKER=0)" {
  shopt -s nullglob
  cd "$ROOT"
  files=( workflows/*.json )
  [ "${#files[@]}" -gt 0 ]
  RUN_DOCKER=0 run "$RUNNER" "${files[0]}"
  [ "$status" -eq 0 ]
  [[ "$output" == *"shape-check passed"* ]]
}

@test "ci-matrix: shape-check rejects malformed workflow JSON" {
  tmp="$(mktemp --suffix=.json)"
  printf '{"not": "a workflow"}' >"$tmp"
  RUN_DOCKER=0 run "$RUNNER" "$tmp"
  rm -f "$tmp"
  [ "$status" -ne 0 ]
}

@test "ci-matrix: workflow yaml exists and declares matrix over workflows/*.json" {
  [ -f "$WORKFLOW_YAML" ]
  grep -q 'strategy:' "$WORKFLOW_YAML"
  grep -q 'matrix:' "$WORKFLOW_YAML"
  grep -q 'workflows/\*\.json' "$WORKFLOW_YAML"
  grep -q 'ci-matrix-runner.sh' "$WORKFLOW_YAML"
}

@test "ci-matrix: docker leg is gated behind RUN_DOCKER=1" {
  grep -q 'RUN_DOCKER' "$RUNNER"
  grep -q 'RUN_DOCKER' "$WORKFLOW_YAML"
}
