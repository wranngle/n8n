# Development Guide

> n8n Workflow Development Command Center
> Last Updated: 2026-01-07

---

## Quick Start

### Prerequisites

| Requirement | Version | Purpose |
|-------------|---------|---------|
| Node.js | 18+ | Hook execution, scripts |
| n8n Instance | 1.0+ | Workflow deployment target |
| Claude Code | Latest | AI development assistant |

### Environment Setup

1. **Clone and Enter Repository**
   ```bash
   git clone <repo-url>
   cd n8n
   ```

2. **Configure Environment**
   - Copy `.env.example` to `.env` (if exists)
   - Set required API keys:
     - `N8N_API_KEY` - n8n instance access
     - `N8N_MCP_TOKEN` - MCP server authentication
     - `EXA_API_KEY` - Web search capabilities
     - `ELEVENLABS_API_KEY` - Voice agent integration

3. **Verify Hooks**
   ```bash
   node .claude/hooks/session-init.js
   ```

---

## Development Workflow

### Hook-Driven Architecture

All workflow development follows a deterministic hook-driven pattern:

```
User Request → detect-workflow-intent.js → n8n-workflow-dev skill → 21-step protocol
```

**Critical Hooks:**

| Hook | Trigger | Purpose |
|------|---------|---------|
| `detect-workflow-intent.js` | UserPromptSubmit | Routes to workflow skill |
| `detect-voice-agent-intent.js` | UserPromptSubmit | Routes to voice agent skill |
| `workflow-governance.js` | PreToolUse | Enforces DEV-only policy |
| `pre-deploy-check.js` | PreToolUse | Validates before deployment |
| `post-deploy-log.js` | PostToolUse | Logs deployments |
| `if-node-warning.js` | PreToolUse | Blocks IF node (known bug) |

### Workflow Governance (DEV-Only Policy)

All workflows must use the simplified two-phase model:

| Phase | Tag ID | Modifiable | Description |
|-------|--------|------------|-------------|
| **DEV** | `Nbnc0KJVYlJeasQJ` | ✅ Yes | All active development |
| **ARCHIVED** | `4k9QbQQTpxNkOoJQ` | ❌ No | Deprecated/superseded |

**Rules:**
- Deletion is BLOCKED (archive instead)
- New workflows auto-tagged as DEV
- Superseded workflows must be archived immediately
- Only DEV phase workflows are modifiable

### 21-Step Protocol (6 Phases)

| Phase | Steps | Description |
|-------|-------|-------------|
| **CALIBRATE** | 0-7 | Search all knowledge bases |
| **DESIGN** | 8-10 | Pattern + template analysis |
| **BUILD** | 11-14 | Node config + JSON assembly |
| **VALIDATE** | 15-16 | Iterative validation loop |
| **TEST** | 17-18 | Dev deployment + testing |
| **DEPLOY** | 19-21 | Stage → Production → Git |

---

## Scripts Reference

### Deployment Scripts

| Script | Purpose |
|--------|---------|
| `scripts/deploy-workflow.ps1` | Deploy workflow to n8n |
| `scripts/activate-workflow.ps1` | Activate deployed workflow |
| `scripts/activate-workflows.ps1` | Batch activate workflows |
| `scripts/governance-engine.js` | **Strict Governance Enforcement** |
| `scripts/enforce-governance.ps1` | Wrapper for governance engine |

### Testing Scripts

| Script | Purpose |
|--------|---------|
| `scripts/run-tests.ps1` | Run test suite |
| `scripts/run-tests-v2.ps1` | Enhanced test runner |
| `scripts/run-tests-v3.ps1` | Latest test runner |
| `scripts/verify-tests.ps1` | Verify test results |

### Evaluation Scripts (Supersystem)

| Script | Purpose |
|--------|---------|
| `scripts/run-evaluations.ps1` | Run evaluation suite |
| `scripts/get-failures.ps1` | Get failure details |
| `scripts/poll-results.ps1` | Poll evaluation results |
| `scripts/analyze-remaining-failures.ps1` | Analyze failure patterns |

### Debug Scripts

| Script | Purpose |
|--------|---------|
| `scripts/debug-invocation.ps1` | Debug workflow invocations |
| `scripts/debug-tests-api.ps1` | Debug test API |
| `scripts/check-raw-api.ps1` | Check raw API responses |
| `scripts/get-invocation-details.ps1` | Get execution details |

---

## MCP Server Integration

### Required MCP Servers

| Server | Purpose | Status |
|--------|---------|--------|
| `n8n-mcp` | Node schemas, templates, validation | Required |
| `exa` | AI web search | Required |
| `context7` | Library documentation | Recommended |
| `elevenlabs-mcp` | Voice agent integration | Optional |

### n8n-MCP Tools (Primary Workbench)

```javascript
// Node discovery
mcp__n8n-mcp__search_nodes({query: "keyword"})
mcp__n8n-mcp__get_node_essentials({nodeType: "nodes-base.httpRequest"})

// Validation
mcp__n8n-mcp__validate_workflow({workflow: {...}})
mcp__n8n-mcp__validate_node_operation({node: {...}})

// Deployment
mcp__n8n-mcp__n8n_create_workflow({name: "...", nodes: [...], connections: {...}})
mcp__n8n-mcp__n8n_update_partial_workflow({id: "...", operations: [...]})
```

---

## Knowledge Base Research

### Mandatory Research Quota

| Complexity | Minimum Sources | Diversity |
|------------|-----------------|-----------|
| Trivial | 5 | ≥2 types |
| Moderate+ | **25** | ≥4 types |

### Source Types

| Type | Location/Tool | Count |
|------|---------------|-------|
| YouTube tutorials | `context/youtube-knowledge/` | 10,279 |
| Discord Q&A | `context/discord-knowledge/` | 2,930 |
| Community workflows | GitHub Zie619/n8n-workflows | 4,343 |
| Official templates | `mcp__n8n-mcp__search_templates` | 2,709 |
| API documentation | Context7, Ref, Exa | - |

---

## Testing Strategy

### Shell Script Tests

Located in `workflows/*/tests/`:

```bash
# ElevenLabs auth test
workflows/voice_ai_agents/elevenlabs-twilio-voiceagent/tests/elevenlabs/01-auth-test.sh

# Twilio SMS test
workflows/voice_ai_agents/elevenlabs-twilio-voiceagent/tests/twilio/02-send-sms.sh

# Run all tests
workflows/voice_ai_agents/elevenlabs-twilio-voiceagent/tests/run-all-tests.sh
```

### n8n Evaluations (Supersystem)

| Workflow | ID | Purpose |
|----------|-----|---------|
| Native Evaluation Runner | `mwepwjfX27x4uTMu` | 100-test suite runner |
| Parallel Evaluation Runner v6 | `M7ZmLGCxyVOn5QJ6` | 1000 tests in <60s |
| Autorefinement Orchestrator | `c9dFlI51VhvANoEj` | Auto-patch agent prompts |

---

## Git Workflow

### Commit Format

```
[n8n] {action}: {workflow-name} - {description}
```

**Actions:** `create`, `update`, `fix`, `deploy`, `stage`, `archive`

### File Locations

| Environment | Path |
|-------------|------|
| Development | `workflows/dev/` |
| Staging | `workflows/staging/` |
| Production | `workflows/production/` |

### Auto-Staging Hook

The `auto-git-stage.js` hook automatically stages workflow changes on Write operations.

---

## Troubleshooting

### Hook Debugging

Check `.claude/logs/hooks.log` for execution traces.

**Common Issues:**

1. **SessionStart hook doesn't fire** - Only fires on fresh sessions
2. **Working directory errors** - Hooks use relative paths from project root
3. **Permission errors** - Check `.claude/settings.json` permissions block

### Known Issues

| Issue | Solution | Reference |
|-------|----------|-----------|
| IF node routing bug | Use Switch node | `context/known-bugs/n8n-if-node-v2.md` |
| Webhook data access | Use `$json.body.name` not `$json.name` | CLAUDE.md |
| AI connection pattern | Tool connects TO agent (reversed) | CLAUDE.md |

### Supervision Log

Location: `.claude/logs/supervision-log.jsonl`

Tracks: FRICTION, INEFFICIENCY, WASTE, CORRUPTION, MISTAKES

Automatic research protocol triggers after 2 occurrences of same issue.

---

## Integration Frameworks

### ElevenLabs Integration

Location: `.claude/directives/integrations/elevenlabs/`

| File | Purpose |
|------|---------|
| `manifest.yaml` | 24 MCP tools, models, voices |
| `mcp-tools.md` | Tool reference with examples |
| `knowledge-index.json` | 47+ research sources |

### Twilio Integration

Location: `.claude/skills/twilio-integration/`

**Critical:** Always use E.164 phone format: `+14155551234`

---

## Skills System

### Available Skills

| Skill | Purpose |
|-------|---------|
| `n8n-workflow-dev` | Master 21-step protocol |
| `n8n-workflow-patterns` | 5 core patterns |
| `n8n-validation-expert` | Error interpretation |
| `n8n-code-node-strategy` | Code vs built-in decision |
| `n8n-expression-syntax` | Expression writing |
| `n8n-node-configuration` | Node config |
| `twilio-integration` | SMS/Voice integration |
| `voice-agent-factory` | Voice agent creation |

### Invoking Skills

Skills are auto-invoked by hooks. Manual invocation:
```
Skill("n8n-workflow-dev")
```

---

## Contact & Support

- **Project Owner:** wranngle
- **n8n Instance:** https://n8n.wranngle.com
- **Documentation:** This repository's `docs/` folder
