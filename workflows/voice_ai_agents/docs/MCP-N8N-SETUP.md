# n8n MCP Server Setup (Windows)

## Problem

The n8n-mcp server on Windows doesn't receive environment variables from `.mcp.json` configuration. This causes authentication failures:

```
"Failed to authenticate with n8n. Please check your API key."
```

Even when the API key is correctly configured in `.mcp.json`, the MCP server starts with:
```
n8n API: not configured
```

## Root Cause

Windows MCP runner using `cmd /c` doesn't properly pass environment variables to child processes.

## Solution: Wrapper Batch File

Create a wrapper that sets environment variables before running the MCP server.

### Step 1: Create wrapper file

Create `~/.claude/mcp-servers/n8n-mcp-wrapper.bat`:

```batch
@echo off
set N8N_API_URL=https://n8n.wranngle.com
set N8N_API_KEY=your_api_key_here
set MCP_MODE=stdio
set LOG_LEVEL=error
set DISABLE_CONSOLE_OUTPUT=true
npx -y n8n-mcp
```

### Step 2: Update MCP configuration

In `~/.claude/.mcp.json`, update the n8n-mcp entry:

```json
{
  "mcpServers": {
    "n8n-mcp": {
      "command": "C:\\Users\\YOUR_USERNAME\\.claude\\mcp-servers\\n8n-mcp-wrapper.bat",
      "args": []
    }
  }
}
```

### Step 3: Restart Claude Code

Exit and restart Claude Code for changes to take effect.

## Verification

After restart, the MCP tool should work:

```typescript
// This should return workflow data, not auth error
mcp__n8n-mcp__n8n_list_workflows({ limit: 1 })
```

## Alternative: Direct API Calls

If MCP still doesn't work, use direct curl:

```bash
# List workflows
curl -s "https://n8n.wranngle.com/api/v1/workflows?limit=5" \
  -H "X-N8N-API-KEY: $N8N_API_KEY"

# Update workflow
curl -s -X PUT "https://n8n.wranngle.com/api/v1/workflows/WORKFLOW_ID" \
  -H "X-N8N-API-KEY: $N8N_API_KEY" \
  -H "Content-Type: application/json" \
  -d @workflow.json

# Activate workflow
curl -s -X POST "https://n8n.wranngle.com/api/v1/workflows/WORKFLOW_ID/activate" \
  -H "X-N8N-API-KEY: $N8N_API_KEY"
```

## API Key Location

The n8n API key is stored in:
- `~/.claude/.env` (N8N_API_KEY)
- `~/.claude/mcp-servers/n8n-mcp-wrapper.bat`

Ensure both locations have the same key.

## Getting a New API Key

1. Log into n8n (https://n8n.wranngle.com)
2. Go to Settings → API Keys
3. Create new key with appropriate permissions
4. Update both locations above
