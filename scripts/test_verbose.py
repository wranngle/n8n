#!/usr/bin/env python3
"""Verbose test with raw response"""
import json
import urllib.request
import urllib.error

WEBHOOK_URL = "https://n8n.wranngle.com/webhook/extract-transcript-v2"
TEST_CONVERSATION = "conv_6201kdkh8nhaeah9sqteafydbjdc"

payload = json.dumps({"conversation_id": TEST_CONVERSATION}).encode('utf-8')
req = urllib.request.Request(WEBHOOK_URL, data=payload, method='POST')
req.add_header('Content-Type', 'application/json')

try:
    with urllib.request.urlopen(req, timeout=120) as response:
        raw = response.read()
        print(f"Status: {response.status}")
        print(f"Headers: {dict(response.headers)}")
        print(f"Raw response ({len(raw)} bytes):")
        print(raw.decode('utf-8')[:2000])
except urllib.error.HTTPError as e:
    print(f"HTTP Error: {e.code}")
    print(f"Headers: {dict(e.headers)}")
    body = e.read()
    print(f"Body ({len(body)} bytes):")
    print(body.decode('utf-8')[:2000])
except Exception as e:
    print(f"Exception: {type(e).__name__}: {e}")
