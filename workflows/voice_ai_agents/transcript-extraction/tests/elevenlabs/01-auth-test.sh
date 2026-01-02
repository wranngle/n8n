#!/bin/bash
# Auth Test: ElevenLabs Conversational AI API
# Generated: 2025-12-28
# Docs: .claude/directives/integrations/elevenlabs/manifest.yaml

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/../../env/.env.elevenlabs"

echo "Testing ElevenLabs API authentication..."

if [ -z "$XI_API_KEY" ]; then
  echo "❌ FAIL: XI_API_KEY not set in .env.elevenlabs"
  exit 1
fi

# Test authentication via subscription endpoint
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" \
  -H "xi-api-key: $XI_API_KEY" \
  "https://api.elevenlabs.io/v1/user/subscription" 2>/dev/null || echo "000")

if [ "$HTTP_CODE" -eq 200 ]; then
  echo "✅ PASS: ElevenLabs API key valid (HTTP $HTTP_CODE)"
  exit 0
elif [ "$HTTP_CODE" -eq 401 ]; then
  echo "❌ FAIL: API key invalid or expired (HTTP 401)"
  exit 1
else
  echo "⚠️ WARNING: Unexpected response (HTTP $HTTP_CODE)"
  exit 1
fi
