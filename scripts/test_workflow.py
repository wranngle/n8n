#!/usr/bin/env python3
"""Test transcript field extractor workflow E2E"""
import json
import urllib.request
import urllib.error
import time

WEBHOOK_URL = "https://n8n.wranngle.com/webhook/extract-transcript-v2"
TEST_CONVERSATION = "conv_6201kdkh8nhaeah9sqteafydbjdc"

print(f"Testing workflow with conversation: {TEST_CONVERSATION}")
print(f"Webhook: {WEBHOOK_URL}")
print("-" * 60)

# Make POST request
payload = json.dumps({"conversation_id": TEST_CONVERSATION}).encode('utf-8')
req = urllib.request.Request(WEBHOOK_URL, data=payload, method='POST')
req.add_header('Content-Type', 'application/json')

start = time.time()
try:
    with urllib.request.urlopen(req, timeout=120) as response:
        result = json.loads(response.read().decode('utf-8'))
        elapsed = time.time() - start

        print(f"SUCCESS! ({elapsed:.2f}s)")
        print("-" * 60)

        if result.get('success'):
            print(f"Conversation ID: {result.get('conversation_id')}")
            print(f"Agent: {result.get('agent_name')}")
            print(f"Model: {result.get('model')}")
            print(f"Architecture: {result.get('architecture')}")
            print(f"Transcript chars: {result.get('transcript_chars')}")
            print(f"Schema fields: {result.get('schema_field_count')}")
            print(f"Components used: {result.get('components_used')}")
            print()
            print("EXTRACTED FIELDS:")
            print(json.dumps(result.get('extracted_fields', {}), indent=2))
        else:
            print("Response:")
            print(json.dumps(result, indent=2))

except urllib.error.HTTPError as e:
    elapsed = time.time() - start
    print(f"ERROR: HTTP {e.code} ({elapsed:.2f}s)")
    body = e.read().decode('utf-8')
    try:
        print(json.dumps(json.loads(body), indent=2))
    except:
        print(body)
except urllib.error.URLError as e:
    print(f"ERROR: {e.reason}")
except Exception as e:
    print(f"ERROR: {e}")
