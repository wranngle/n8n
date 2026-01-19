#!/bin/bash
# Run all tests for: Transcript Field Extractor
# Generated: 2025-12-28

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "=========================================="
echo " Running Integration Tests"
echo " Workflow: Transcript Field Extractor"
echo "=========================================="
echo ""

PASS_COUNT=0
FAIL_COUNT=0

# Test ElevenLabs
echo "--- Testing: ElevenLabs ---"
for test_script in elevenlabs/*.sh; do
  if [ -f "$test_script" ]; then
    echo "Running: $test_script"
    if bash "$test_script"; then
      ((PASS_COUNT++))
    else
      ((FAIL_COUNT++))
    fi
    echo ""
  fi
done

# Test Gemini
echo "--- Testing: Gemini ---"
for test_script in gemini/*.sh; do
  if [ -f "$test_script" ]; then
    echo "Running: $test_script"
    if bash "$test_script"; then
      ((PASS_COUNT++))
    else
      ((FAIL_COUNT++))
    fi
    echo ""
  fi
done

echo "=========================================="
echo " Results: $PASS_COUNT passed, $FAIL_COUNT failed"
echo "=========================================="

if [ $FAIL_COUNT -gt 0 ]; then
  echo "❌ Some tests failed. Fix issues before proceeding."
  exit 1
else
  echo "✅ All tests passed. Ready for workflow validation."
  exit 0
fi
