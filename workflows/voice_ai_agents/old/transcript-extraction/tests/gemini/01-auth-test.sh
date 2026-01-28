#!/bin/bash
# Auth Test: Google Gemini API
# Generated: 2025-12-28
# Docs: https://ai.google.dev/gemini-api/docs

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/../../env/.env.gemini"

echo "Testing Gemini API authentication..."

if [ -z "$GEMINI_API_KEY" ]; then
  echo "❌ FAIL: GEMINI_API_KEY not set in .env.gemini"
  exit 1
fi

# Test with a minimal request to list models
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" \
  "https://generativelanguage.googleapis.com/v1beta/models?key=$GEMINI_API_KEY" 2>/dev/null || echo "000")

if [ "$HTTP_CODE" -eq 200 ]; then
  echo "✅ PASS: Gemini API key valid (HTTP $HTTP_CODE)"
  exit 0
elif [ "$HTTP_CODE" -eq 400 ] || [ "$HTTP_CODE" -eq 403 ]; then
  echo "❌ FAIL: API key invalid or restricted (HTTP $HTTP_CODE)"
  exit 1
else
  echo "⚠️ WARNING: Unexpected response (HTTP $HTTP_CODE)"
  exit 1
fi
