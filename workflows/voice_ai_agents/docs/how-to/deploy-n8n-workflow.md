# How to Deploy n8n Workflows

This guide explains how to create and manage n8n workflows using MCP tools.

## Prerequisites

- n8n API key configured in `~/.claude/.env`
- `mcp__n8n-mcp__*` tools available
- n8n server running at `https://n8n.wranngle.com`

## Cloud-First Principle

**The n8n server is the source of truth**. Local files in `old/pipelines/` are archived snapshots only. Always use MCP tools or direct API calls to interact with live workflows.

---

## List All Workflows

```bash
# Via Direct API (MCP auth currently has issues)
curl -H "X-N8N-API-KEY: $N8N_API_KEY" \
  "https://n8n.wranngle.com/api/v1/workflows?limit=100"
```

**Output**: JSON array with workflow metadata (id, name, active, tags, updatedAt).

---

## Get Workflow Details

```bash
# Via Direct API
curl -H "X-N8N-API-KEY: $N8N_API_KEY" \
  "https://n8n.wranngle.com/api/v1/workflows/{workflow_id}"
```

**Output**: Complete workflow definition including nodes, connections, settings.

---

## Create New Workflow

```bash
# Via Direct API
curl -X POST \
  -H "X-N8N-API-KEY: $N8N_API_KEY" \
  -H "Content-Type: application/json" \
  -d @workflow.json \
  "https://n8n.wranngle.com/api/v1/workflows"
```

**Workflow JSON Structure**:
```json
{
  "name": "[DEV] My Workflow",
  "nodes": [ ... ],
  "connections": { ... },
  "settings": {
    "executionOrder": "v1"
  }
}
```

**Best Practices**:
1. **Phase Prefix**: Use `[DEV]`, `[ALPHA]`, `[BETA]`, `[PROD]`, or `[UTIL]`
2. **Webhook IDs**: Always set stable `webhookId` on webhook nodes
3. **Error Handling**: Use `onError: continueErrorOutput` for resilience
4. **Credentials**: Reference n8n credential IDs, never inline secrets

---

## Update Workflow

```bash
# Via Direct API (Full Update)
curl -X PUT \
  -H "X-N8N-API-KEY: $N8N_API_KEY" \
  -H "Content-Type: application/json" \
  -d @workflow-updated.json \
  "https://n8n.wranngle.com/api/v1/workflows/{workflow_id}"
```

**Governance**: Only `[DEV]` workflows can be modified by Claude Code. Production workflows require approval.

---

## Activate/Deactivate Workflow

```bash
# Activate
curl -X PATCH \
  -H "X-N8N-API-KEY: $N8N_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"active": true}' \
  "https://n8n.wranngle.com/api/v1/workflows/{workflow_id}"

# Deactivate
curl -X PATCH \
  -H "X-N8N-API-KEY: $N8N_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"active": false}' \
  "https://n8n.wranngle.com/api/v1/workflows/{workflow_id}"
```

---

## Working Directory Pattern

When developing a new workflow:

1. **Export from n8n UI** or start from template
2. **Save to** `temp/workflow-exports/my-workflow.json`
3. **Edit Locally** - modify nodes, connections, credentials
4. **Deploy to Cloud** via POST/PUT API calls
5. **Test** - Trigger webhook or manual execution
6. **Iterate** - Update and redeploy as needed
7. **Archive** (optional) - Move final version to `old/pipelines/` if you want the snapshot

**Never** create `pipelines/my-workflow.json` - cloud is the source of truth.

---

## Webhook Best Practices

### Always Set webhookId

```json
{
  "id": "webhook-trigger",
  "name": "My Webhook",
  "type": "n8n-nodes-base.webhook",
  "webhookId": "my-stable-webhook-id",  // ← CRITICAL
  "parameters": {
    "path": "my-webhook-path"
  }
}
```

Without `webhookId`, webhook URL changes on every deployment.

### Webhook URLs

```
https://n8n.wranngle.com/webhook/{path}
https://n8n.wranngle.com/webhook-test/{path}  # Test mode
```

---

## Troubleshooting

### "Workflow not found"
- Verify workflow ID via `list workflows` API call
- Check n8n API key is valid

### "Credential not found"
- List credentials: `GET /api/v1/credentials`
- Update credential ID references in nodes

### "Webhook path conflict"
- Check existing webhooks don't use same path
- Use unique, descriptive paths (e.g., `sarah-send-sms-v3`)

### "Execution failed"
- Check workflow execution logs in n8n UI
- Verify node configurations and credentials
- Test individual nodes in n8n editor

---

## Common Workflow Patterns

### SMS Tool (ElevenLabs → n8n → Twilio)

```json
{
  "nodes": [
    {
      "type": "n8n-nodes-base.webhook",
      "webhookId": "agent-sms-tool"
    },
    {
      "type": "n8n-nodes-base.httpRequest",
      "name": "Send Twilio SMS"
    },
    {
      "type": "n8n-nodes-base.respondToWebhook"
    }
  ]
}
```

### Post-Call Orchestrator

```json
{
  "nodes": [
    {
      "type": "n8n-nodes-base.webhook",
      "webhookId": "elevenlabs-post-call"
    },
    {
      "type": "n8n-nodes-base.code",
      "name": "Immediate ACK"
    },
    {
      "type": "n8n-nodes-base.n8nDataTable"
    },
    {
      "type": "n8n-nodes-base.httpRequest",
      "name": "Qdrant Upsert"
    }
  ]
}
```

---

## See Also

- `create-elevenlabs-agent.md` - Agent management
- `cloud-first-workflow.md` - Development process
- n8n API docs: https://docs.n8n.io/api/
