#!/usr/bin/env python3
"""Rename n8n workflow via API - preserves all other data"""
import json
import urllib.request
import urllib.error
import sys

API_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJmMjUxMmRkMS0wOTk0LTRjN2YtYWNmMS0wZWY4NDFhZjNhNjYiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzY2NDYwOTgzLCJleHAiOjE3NzQxNTIwMDB9.SyA7JvtVkYwzGQM3GJJVumG_PVQK4w3SbEFuoTsg16g"
BASE_URL = "https://n8n.wranngle.com/api/v1/workflows"

def rename_workflow(workflow_id, new_name):
    """Get workflow, update name, PUT back"""
    # GET current workflow
    get_url = f"{BASE_URL}/{workflow_id}"
    req = urllib.request.Request(get_url, method='GET')
    req.add_header('X-N8N-API-KEY', API_KEY)

    try:
        with urllib.request.urlopen(req) as response:
            workflow = json.loads(response.read().decode('utf-8'))
    except urllib.error.HTTPError as e:
        print(f"GET failed: {e.code} - {e.read().decode('utf-8')}")
        return False

    # n8n API v1 PUT only accepts these fields
    allowed_fields = ['name', 'nodes', 'connections', 'settings', 'staticData', 'pinData']
    clean_workflow = {}
    for k in allowed_fields:
        if k in workflow and workflow[k] is not None:
            clean_workflow[k] = workflow[k]
    clean_workflow['name'] = new_name
    workflow = clean_workflow

    # Debug: print what we're sending
    print(f"Sending keys: {list(workflow.keys())}")

    # PUT updated workflow
    put_url = f"{BASE_URL}/{workflow_id}"
    data = json.dumps(workflow).encode('utf-8')
    req = urllib.request.Request(put_url, data=data, method='PUT')
    req.add_header('X-N8N-API-KEY', API_KEY)
    req.add_header('Content-Type', 'application/json')

    try:
        with urllib.request.urlopen(req) as response:
            result = json.loads(response.read().decode('utf-8'))
            print(f"SUCCESS: {workflow_id} -> {new_name}")
            return True
    except urllib.error.HTTPError as e:
        print(f"PUT failed: {e.code} - {e.read().decode('utf-8')}")
        return False

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python rename_workflow.py <workflow_id> <new_name>")
        sys.exit(1)

    workflow_id = sys.argv[1]
    new_name = sys.argv[2]
    success = rename_workflow(workflow_id, new_name)
    sys.exit(0 if success else 1)
