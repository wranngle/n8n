#!/usr/bin/env python3
"""Update n8n workflow via API.

Usage: python update_workflow.py <workflow_id> <path-to-workflow.json>
"""
import json
import os
import sys
import urllib.error
import urllib.request

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from lib import env  # noqa: E402

if len(sys.argv) < 3:
    print("Usage: python update_workflow.py <workflow_id> <path-to-workflow.json>")
    sys.exit(1)

WORKFLOW_ID = sys.argv[1]
WORKFLOW_FILE = sys.argv[2]
API_URL = f"https://n8n.wranngle.com/api/v1/workflows/{WORKFLOW_ID}"
API_KEY = env.require("N8N_API_KEY")

with open(WORKFLOW_FILE) as f:
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
