#!/usr/bin/env python3
"""Rename n8n workflow via API - preserves all other data"""
import json
import os
import sys
import urllib.error
import urllib.request

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from lib import env  # noqa: E402

ALLOWED_PUT_FIELDS = ("name", "nodes", "connections", "settings", "staticData", "pinData")


def workflow_put_body(workflow):
    body = {}
    for key in ALLOWED_PUT_FIELDS:
        value = workflow.get(key)
        if value is None:
            continue
        if key in ("staticData", "pinData") and isinstance(value, dict) and not value:
            continue
        body[key] = value
    return body


def rename_workflow(base_url, api_key, workflow_id, new_name):
    """Get workflow, update name, PUT back"""
    # GET current workflow
    get_url = f"{base_url}/{workflow_id}"
    req = urllib.request.Request(get_url, method='GET')
    req.add_header('X-N8N-API-KEY', api_key)

    try:
        with urllib.request.urlopen(req) as response:
            workflow = json.loads(response.read().decode('utf-8'))
    except urllib.error.HTTPError as e:
        print(f"GET failed: {e.code} - {e.read().decode('utf-8')}")
        return False

    workflow = workflow_put_body(workflow)
    workflow['name'] = new_name

    # PUT updated workflow
    put_url = f"{base_url}/{workflow_id}"
    data = json.dumps(workflow).encode('utf-8')
    req = urllib.request.Request(put_url, data=data, method='PUT')
    req.add_header('X-N8N-API-KEY', api_key)
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
    api_key = env.require("N8N_API_KEY")
    base_url = f"{env.n8n_api_v1_url()}/workflows"
    success = rename_workflow(base_url, api_key, workflow_id, new_name)
    sys.exit(0 if success else 1)
