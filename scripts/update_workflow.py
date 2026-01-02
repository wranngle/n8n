#!/usr/bin/env python3
"""Update n8n workflow via API"""
import json
import urllib.request
import urllib.error
import sys

WORKFLOW_ID = "54sXqqJVSctlSF6V"
API_URL = f"https://n8n.wranngle.com/api/v1/workflows/{WORKFLOW_ID}"
API_KEY = "***SCRUBBED_N8N_API_KEY***"

# Read workflow file
with open(r"D:\Things\Work\Wranngle\n8n_workflow_development\workflows\voice_ai_agents\transcript-extraction\transcript-field-extractor-v2.json") as f:
    workflow = json.load(f)

# Make PUT request
data = json.dumps(workflow).encode('utf-8')
req = urllib.request.Request(API_URL, data=data, method='PUT')
req.add_header('X-N8N-API-KEY', API_KEY)
req.add_header('Content-Type', 'application/json')

try:
    with urllib.request.urlopen(req) as response:
        result = json.loads(response.read().decode('utf-8'))
        print(f"SUCCESS: Workflow updated")
        print(f"ID: {result.get('id')}")
        print(f"Name: {result.get('name')}")
        print(f"Active: {result.get('active')}")
except urllib.error.HTTPError as e:
    print(f"ERROR: HTTP {e.code}")
    print(e.read().decode('utf-8'))
    sys.exit(1)
except Exception as e:
    print(f"ERROR: {e}")
    sys.exit(1)
