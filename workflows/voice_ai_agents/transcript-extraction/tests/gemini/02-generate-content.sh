#!/bin/bash
# Test: Gemini - Generate Content (JSON mode)
# Method: POST
# Model: gemini-3-pro
# Endpoint: /v1beta/models/gemini-3-pro:generateContent
# Docs: https://ai.google.dev/gemini-api/docs/structured-output

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/../../env/.env.gemini"

echo "Testing generateContent with JSON output..."

# Test extraction prompt
REQUEST_BODY=$(cat <<'EOF'
{
  "contents": [{
    "parts": [{
      "text": "Extract from this text: 'Hello, my name is John Smith and I work at Acme Corp.' Return JSON with fields: first_name, last_name, company"
    }]
  }],
  "generationConfig": {
    "temperature": 0.1,
    "responseMimeType": "application/json"
  }
}
EOF
)

RESPONSE=$(curl -s -w "\n%{http_code}" \
  -X POST \
  -H "Content-Type: application/json" \
  -d "$REQUEST_BODY" \
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro:generateContent?key=$GEMINI_API_KEY")

HTTP_BODY=$(echo "$RESPONSE" | sed '$d')
HTTP_CODE=$(echo "$RESPONSE" | tail -n 1)

if [ "$HTTP_CODE" -ne 200 ]; then
  echo "❌ FAIL: Expected 200, got $HTTP_CODE"
  echo "$HTTP_BODY" | head -10
  exit 1
fi

# Check for valid response structure
if ! echo "$HTTP_BODY" | grep -q '"candidates"'; then
  echo "❌ FAIL: Missing candidates in response"
  exit 1
fi

# Extract and validate JSON output
EXTRACTED=$(echo "$HTTP_BODY" | grep -o '"text":"[^"]*"' | head -1 | sed 's/"text":"//;s/"$//')
echo "✅ PASS: generateContent with JSON mode"
echo "Extracted content: $EXTRACTED"
