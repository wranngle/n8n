#!/bin/bash
# Test: ElevenLabs - Get Conversation with Transcript
# Method: GET
# Endpoint: /v1/convai/conversations/{conversation_id}
# Docs: https://elevenlabs.io/docs/conversational-ai/api-reference

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/../../env/.env.elevenlabs"

echo "Testing get_conversation endpoint..."

CONVERSATION_ID="${TEST_CONVERSATION_ID:-conv_6201kdkh8nhaeah9sqteafydbjdc}"

RESPONSE=$(curl -s -w "\n%{http_code}" \
  -H "xi-api-key: $XI_API_KEY" \
  "https://api.elevenlabs.io/v1/convai/conversations/$CONVERSATION_ID")

HTTP_BODY=$(echo "$RESPONSE" | sed '$d')
HTTP_CODE=$(echo "$RESPONSE" | tail -n 1)

if [ "$HTTP_CODE" -ne 200 ]; then
  echo "❌ FAIL: Expected 200, got $HTTP_CODE"
  echo "$HTTP_BODY" | head -5
  exit 1
fi

# Validate required fields
REQUIRED_FIELDS=("conversation_id" "agent_id" "transcript")
for field in "${REQUIRED_FIELDS[@]}"; do
  if ! echo "$HTTP_BODY" | grep -q "\"$field\""; then
    echo "❌ FAIL: Missing required field: $field"
    exit 1
  fi
done

echo "✅ PASS: get_conversation"
echo "Response preview:"
echo "$HTTP_BODY" | head -20
