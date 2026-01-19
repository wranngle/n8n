# Cloud-First Development Workflow

This guide explains the development process for managing cloud-managed voice agents and workflows.

## Principle

**Cloud systems (ElevenLabs, n8n) are the source of truth**. This repository is a control plane for managing those systems, not a mirror.

---

## Directory Purpose

| Directory | Purpose | Committed? |
|-----------|---------|------------|
| `supersystem/` | Testing framework (runs against cloud) | ✅ Yes |
| `docs/` | Documentation and guides | ✅ Yes |
| `templates/` | Reusable starting templates | ✅ Yes |
| `temp/` | Working directory (drafts before deployment) | ❌ No (gitignored) |
| `old/` | Archived cloud snapshots (read-only) | ✅ Yes (historical reference) |

---

## Development Lifecycle

### 1. Draft Phase (Local)

**For New Agent**:
```bash
# Create draft in temp/
nano temp/agent-drafts/my-agent-prompt.md

# Iterate on prompt locally
# Test sections, refine language
```

**For New Workflow**:
```bash
# Export existing or start from template
cp templates/sms-booking-tool-template.json temp/workflow-exports/my-workflow.json

# Edit locally
nano temp/workflow-exports/my-workflow.json
```

**Key**: `temp/` is gitignored - experiment freely.

---

### 2. Deploy Phase (Cloud)

**Deploy Agent**:
```bash
# Via MCP tool in Claude Code
mcp__elevenlabs-mcp__create_agent \
  --name "[DEV] My Agent" \
  --voice_id "voice_xxxxx" \
  --system_prompt "$(cat temp/agent-drafts/my-agent-prompt.md)"
```

**Deploy Workflow**:
```bash
# Via direct API
curl -X POST \
  -H "X-N8N-API-KEY: $N8N_API_KEY" \
  -H "Content-Type: application/json" \
  -d @temp/workflow-exports/my-workflow.json \
  "https://n8n.wranngle.com/api/v1/workflows"
```

**Result**: Cloud now has your config. **Cloud is truth**.

---

### 3. Test Phase (Supersystem)

**Create Test Scenarios**:
```bash
# Create test scenarios for your agent
nano supersystem/scenarios/my-agent.yaml
```

**Run Tests**:
- Use Voice Agent Tester workflow
- Tests run against **live cloud agent**
- Results stored in supersystem/

**Iterate**:
- If tests fail, update cloud config (not local draft)
- Re-run tests
- Repeat until passing

---

### 4. Document Phase

**Update Agent Registry**:
```yaml
# agent-registry.yaml
agents:
  my-agent:
    id: "agent_xxxxx"
    scenario_file: "supersystem/scenarios/my-agent.yaml"
    # Cloud-managed: Query via mcp__elevenlabs-mcp__get_agent
```

**Commit to Git**:
```bash
git add supersystem/scenarios/my-agent.yaml
git add agent-registry.yaml
git commit -m "[agent] add: My Agent test scenarios and registry entry"
```

**Note**: We commit test scenarios and documentation, NOT agent configs (cloud manages those).

---

### 5. Archive Phase (Optional)

**If you want historical snapshot**:
```bash
# Move draft to old/ for reference
mkdir -p old/my-agent/
cp temp/agent-drafts/my-agent-prompt.md old/my-agent/prompt-2026-01-19.md
git add old/my-agent/
git commit -m "[docs] archive: My Agent prompt snapshot"
```

**Note**: `old/` files are **read-only snapshots**, not source of truth.

---

## Common Workflows

### Update Existing Agent

```bash
# 1. Export current config (optional)
mcp__elevenlabs-mcp__get_agent --agent_id agent_xxxxx > temp/agent-drafts/current-config.json

# 2. Draft changes in temp/
nano temp/agent-drafts/updated-prompt.md

# 3. Deploy update
mcp__elevenlabs-mcp__update_agent \
  --agent_id agent_xxxxx \
  --system_prompt "$(cat temp/agent-drafts/updated-prompt.md)"

# 4. Test
# Run supersystem tests

# 5. Verify cloud state
mcp__elevenlabs-mcp__get_agent --agent_id agent_xxxxx
```

### Update Existing Workflow

```bash
# 1. Export current workflow
curl -H "X-N8N-API-KEY: $N8N_API_KEY" \
  "https://n8n.wranngle.com/api/v1/workflows/workflow_xxxxx" \
  > temp/workflow-exports/my-workflow-current.json

# 2. Edit locally
nano temp/workflow-exports/my-workflow-current.json

# 3. Deploy update
curl -X PUT \
  -H "X-N8N-API-KEY: $N8N_API_KEY" \
  -d @temp/workflow-exports/my-workflow-current.json \
  "https://n8n.wranngle.com/api/v1/workflows/workflow_xxxxx"

# 4. Test webhook
curl -X POST "https://n8n.wranngle.com/webhook/my-test-path" \
  -d '{"test": true}'
```

---

## What to Commit vs Ignore

### ✅ Commit to Git

- Test scenarios (`supersystem/scenarios/`)
- Documentation (`docs/`)
- Templates (`templates/`)
- Agent registry (`agent-registry.yaml`)
- Archived snapshots (`old/`) - optional

### ❌ Do NOT Commit

- Working drafts (`temp/`)
- Reconciliation data (`reconciliation-data/`)
- Agent configs (cloud manages these)
- Workflow JSONs (cloud manages these)

---

## Anti-Patterns (What NOT to Do)

### ❌ Creating `agents/my-agent/` directories
**Why**: Cloud is source of truth, not local files.
**Instead**: Use `temp/agent-drafts/` for working copies.

### ❌ Creating `pipelines/my-workflow.json` files
**Why**: Cloud n8n server is source of truth.
**Instead**: Use `temp/workflow-exports/` for working copies.

### ❌ Updating `old/` files
**Why**: `old/` is read-only archive of snapshots.
**Instead**: Update cloud, then optionally snapshot to `old/` with timestamp.

### ❌ Committing secrets in configs
**Why**: Secrets should be in `~/.claude/.env` or n8n credential store.
**Instead**: Use credential references in workflows, environment variables in agents.

---

## Quick Reference

| Task | Command | Source of Truth |
|------|---------|-----------------|
| List agents | `mcp__elevenlabs-mcp__list_agents` | ☁️ ElevenLabs |
| Get agent | `mcp__elevenlabs-mcp__get_agent --agent_id xxx` | ☁️ ElevenLabs |
| Update agent | `mcp__elevenlabs-mcp__update_agent` | ☁️ ElevenLabs |
| List workflows | `curl -H "X-N8N-API-KEY: xxx" https://n8n.wranngle.com/api/v1/workflows` | ☁️ n8n Server |
| Get workflow | `curl https://n8n.wranngle.com/api/v1/workflows/{id}` | ☁️ n8n Server |
| Run tests | Voice Agent Tester workflow | ☁️ ElevenLabs (tests run against cloud) |

---

## See Also

- `create-elevenlabs-agent.md` - Agent management details
- `deploy-n8n-workflow.md` - Workflow management details
- `test-agents-supersystem.md` - Testing framework guide
