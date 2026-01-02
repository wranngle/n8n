# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

# n8n Workflow Development Command Center

## HOOK-DRIVEN ARCHITECTURE (v2.0)

This repository uses a **hook-driven deterministic architecture** to ensure consistent, high-quality workflow development.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           UNIFIED PROTOCOL FLOW                              │
│                                                                              │
│  USER PROMPT                                                                 │
│       │                                                                      │
│       ▼                                                                      │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │ HOOK: detect-workflow-intent.js                                      │    │
│  │ Detects: workflow, n8n, automation, webhook, trigger...             │    │
│  │ OUTPUT: MANDATORY instruction to invoke Skill("n8n-workflow-dev")   │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│       │                                                                      │
│       ▼                                                                      │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │ SKILL: n8n-workflow-dev (MASTER ORCHESTRATOR)                        │    │
│  │ Contains the complete 21-step protocol in 6 phases:                  │    │
│  │                                                                      │    │
│  │ PHASE 1: CALIBRATE (Steps 0-7)   - Search all knowledge bases       │    │
│  │ PHASE 2: DESIGN (Steps 8-10)     - Pattern + template analysis      │    │
│  │ PHASE 3: BUILD (Steps 11-14)     - Node config + JSON assembly      │    │
│  │ PHASE 4: VALIDATE (Steps 15-16)  - Iterative validation loop        │    │
│  │ PHASE 5: TEST (Steps 17-18)      - Dev deployment + testing         │    │
│  │ PHASE 6: DEPLOY (Steps 19-21)    - Stage → Production → Git         │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│       │                                                                      │
│       ├──────────────────────────────────────────────────────────────┐      │
│       ▼                                                              ▼      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │
│  │ n8n-workflow │  │ n8n-node-    │  │ n8n-express- │  │ n8n-validat- │    │
│  │ -patterns    │  │ configuration│  │ ion-syntax   │  │ ion-expert   │    │
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘    │
│       │                                                                      │
│       ▼                                                                      │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │ HOOKS: Pre/Post Tool Use                                             │    │
│  │ - suggest-code-node.js → Detects patterns for Code node opportunity │    │
│  │ - pre-deploy-check.js  → Validates before n8n_create_workflow       │    │
│  │ - post-deploy-log.js   → Logs after deployment                      │    │
│  │ - workflow-file-guard.js → Protects workflow files                  │    │
│  │ - auto-git-stage.js    → Auto-stages changes                        │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Why Hooks Are Foundational

**Without hooks**: Claude may ignore complex instructions in CLAUDE.md and build workflows ad-hoc.
**With hooks**: Claude receives mandatory systemMessage EVERY time a workflow request is detected.

The `detect-workflow-intent` hook:
1. Detects workflow-related keywords (workflow, n8n, automation, webhook, trigger...)
2. Outputs a MANDATORY instruction to invoke `Skill("n8n-workflow-dev")`
3. Fires once per session to avoid repetition

### The Master Skill

**Location**: `.claude/skills/n8n-workflow-dev/SKILL.md`

This skill is the **SINGLE SOURCE OF TRUTH** for all n8n workflow development. It contains:
- The complete 21-step protocol
- Skill invocation map (when to call which sub-skill)
- Knowledge base references
- Output format templates

**ALWAYS invoke this skill for workflow requests. DO NOT bypass it.**

---

## WORKFLOW GOVERNANCE SYSTEM (v1.0)

**Anti-pollution hygiene system for n8n workflows.**

### Core Principles

| Rule | Description |
|------|-------------|
| **No Deletion** | Deletion is BLOCKED. Use archiving instead. |
| **Phase Tags** | All workflows must have a deployment phase tag |
| **DEV Only Edits** | Only DEV phase workflows can be modified |
| **Clone Protected** | ALPHA/BETA/GA/PROD can be cloned, not edited |
| **Search First** | Before creating, check for similar existing workflows |

### Deployment Phases

```
DEV → ALPHA → BETA → GA → PROD
  ↓
ARCHIVED (deprecated, read-only)
```

| Phase | Modifiable | Description |
|-------|------------|-------------|
| `DEV` | ✅ Yes | Active development |
| `ALPHA` | ❌ Clone only | Early internal testing |
| `BETA` | ❌ Clone only | User testing |
| `GA` | ❌ Clone only | General availability |
| `PROD` | ❌ Clone only | Production, customer-facing |
| `ARCHIVED` | ❌ Read only | Deprecated, kept for reference |

### Governance Files

| File | Purpose |
|------|---------|
| `workflows/governance.yaml` | Phase assignments and history |
| `workflows/registry.yaml` | Workflow metadata and relationships |
| `.claude/hooks/workflow-governance.js` | Enforcement hook |

### Hook Behavior

**PreToolUse: n8n_create_workflow**
- Searches for similar existing workflows
- If ≥70% match: Strongly suggests cloning
- If ≥40% match: Lists similar workflows
- New workflows auto-tagged as DEV

**PreToolUse: n8n_update_***
- Checks workflow phase
- BLOCKS if phase is ALPHA/BETA/GA/PROD
- Allows only DEV phase modifications

**PreToolUse: n8n_delete_workflow**
- ALWAYS BLOCKS deletion
- Suggests archiving instead

**PostToolUse: n8n_create_workflow**
- Registers new workflow in governance.yaml as DEV

### Phase Promotion

To promote a workflow (e.g., DEV → ALPHA):
1. Edit `workflows/governance.yaml`
2. Update the `phase` field
3. Add entry to `history` array

---

## ELEVENLABS AGENT GOVERNANCE (v1.0)

**Same governance principles applied to ElevenLabs voice agents.**

### Agent Phase Tags

| Phase | Modifiable | Description |
|-------|------------|-------------|
| `DEV` | ✅ Yes | Development agent |
| `ALPHA` | ❌ Clone only | Early testing |
| `BETA` | ❌ Clone only | User testing |
| `GA` | ❌ Clone only | General availability |
| `PROD` | ❌ Clone only | Production, customer-facing |
| `ARCHIVED` | ❌ Read only | Deprecated |

### Governance Files

| File | Purpose |
|------|---------|
| `context/elevenlabs-agents/governance.yaml` | Agent phase assignments |
| `.claude/hooks/elevenlabs-agent-governance.js` | Enforcement hook |

### Current Agent Assignments

| Agent | Phase | ID |
|-------|-------|-----|
| Wranngle Lead Qualifier | DEV | `agent_5701kdgf9s4vfe9rhe68ntjrms9g` |
| Sarah - Wranngle Receptionist | DEV | `agent_8001kdgp7qbyf4wvhs540be78vew` |
| Client Data Test Agent | DEV | `agent_3801kdf7fkhcev8tkhpm92d65jws` |
| SEWY Garage Doors - Sarah | DEV | `agent_8801kdhbm6ane7wbxrq0vfenmsj9` |

> **Note**: All agents currently in DEV. Phase promotion requires explicit user approval.

### Hook Behavior

**PreToolUse: mcp__elevenlabs-mcp__create_agent**
- Searches for similar existing agents
- Suggests cloning at ≥70% similarity
- Warns about similar agents at ≥40% similarity

**PostToolUse: mcp__elevenlabs-mcp__create_agent**
- Auto-registers new agent as DEV in governance.yaml

---

## Philosophy: The Mechanic's Garage

Think of this folder as a master mechanic's garage with decades of specialized tools. Every tool has its place, every workflow request has a protocol.

**Core Principle**: Never reinvent the wheel. Before writing a single node, search for existing solutions across:
1. Our own n8n instance (existing workflows)
2. YouTube tutorial knowledge base (10,279+ indexed videos)
3. Discord community discussions (2,930+ Q&A indexed)
4. Reddit community insights (r/n8n and related)
5. The Zie619 community library (4,343 workflows)
6. n8n-MCP template database (2,709 templates)

**Quality Philosophy**: *"If there's a feature, make it impeccable."*
- Don't settle for "can't be done" - research thoroughly
- Make comprehensive, production-ready implementations
- Test every branch and scenario
- Embed error handling and retry logic from the start

---

## MANDATORY RESEARCH QUOTA: 25 Sources

**For any above-trivial workflow design, API question, or diagnostic query:**

| Complexity | Minimum Sources | Diversity Requirement |
|------------|-----------------|----------------------|
| Trivial | 5 | ≥2 source types |
| Moderate+ | **25** | ≥4 source types |

### Source Types (each unique item counts as 1):
- n8n node documentation
- n8n templates (2,709 available)
- YouTube tutorials (10,279 indexed)
- Discord Q&A (2,930 indexed)
- Community workflows (4,343 available)
- API documentation (Context7, Ref-tools, Exa)
- Reddit threads
- WebSearch/WebFetch results

### Tracking Requirement

Every research phase MUST include:
```markdown
## Research Sources ({N}/25 minimum)
| # | Type | Source | Relevance |
|---|------|--------|-----------|
| 1 | YouTube | "Webhook Tutorial" | Pattern |
| 2 | Template | #1234 | Structure |
| ... | ... | ... | ... |
```

**This quota ensures comprehensive research before building.**

---

## TOOL REGISTRY: The Garage Inventory

### Tier 1: n8n-MCP Server (Primary Workbench)
Your main toolbelt for n8n operations. **39 tools**, 528 nodes indexed, 87% documentation coverage.

#### Node Discovery & Configuration
| Tool | Purpose | When to Use |
|------|---------|-------------|
| `search_nodes` | Find nodes by keyword | Starting any workflow |
| `list_nodes` | List all nodes (filters available) | Exploring capabilities |
| `get_node_essentials` | Key properties (<5KB) | **ALWAYS use first** |
| `get_node_info` | Full schema (100KB+) | Only if essentials insufficient |
| `get_node_documentation` | Readable docs with examples | 87% coverage |

#### Task Templates (29 Pre-configured)
| Tool | Purpose |
|------|---------|
| `list_tasks` | List all 29 task templates by category |
| `get_node_for_task` | Get ready-to-use node configuration |

**Categories**: HTTP/API, Webhooks, Database, AI/LangChain, Data Processing, Communication, Error Handling

#### Validation (4 Profiles Available)
| Tool | Purpose |
|------|---------|
| `validate_node_operation` | Validate single node config |
| `validate_node_minimal` | Quick required-fields check |
| `validate_workflow` | Full workflow validation |
| `validate_workflow_connections` | Check node connections |
| `validate_workflow_expressions` | Validate n8n expressions |

**Profiles**: `minimal` (required only), `runtime` (critical errors), `ai-friendly` (default), `strict` (all checks)

#### Templates & Discovery
| Tool | Purpose |
|------|---------|
| `search_templates` | Search 2,709 templates |
| `list_node_templates` | Templates using specific nodes |
| `get_template` | Get full workflow JSON |

#### Workflow Management
| Tool | Purpose |
|------|---------|
| `n8n_list_workflows` | List existing workflows |
| `n8n_get_workflow` | Get workflow by ID |
| `n8n_create_workflow` | Deploy new workflow |
| `n8n_update_partial_workflow` | Incremental diff updates (80-90% token savings) |
| `n8n_validate_workflow` | Validate by ID |
| `n8n_trigger_webhook_workflow` | Trigger via webhook |

### Tier 2: Knowledge Bases

| Source | Location | Contents |
|--------|----------|----------|
| YouTube | `context/youtube-knowledge/` | 10,279 indexed tutorials |
| Discord | `context/discord-knowledge/` | 2,930 Q&A from community |
| Reddit | `mcp__reddit` tools | r/n8n, r/selfhosted |
| Community | GitHub Zie619/n8n-workflows | 4,343 community workflows |
| Patterns | `context/workflow-patterns/` | Reusable analysis files |

### Tier 3: Documentation Waterfall
For ANY new integration/API, follow this waterfall:
```
1. MCP Server for that service (if exists)
   ↓ not found
2. Context7: mcp__context7__resolve-library-id → get-library-docs
   ↓ not found
3. Ref: mcp__ref-tools__ref_search_documentation
   ↓ not found
4. Exa: mcp__exa__web_search_exa or deep_researcher_start
   ↓ not found
5. WebSearch or WebFetch on official docs
```

---

## REPOSITORY ARCHITECTURE

```
n8n_workflow_development/
├── .claude/
│   ├── hooks/              # Hook scripts (deterministic enforcement)
│   │   ├── detect-workflow-intent.js  # CRITICAL: Forces skill invocation
│   │   ├── session-init.js            # Session initialization
│   │   ├── pre-deploy-check.js        # Pre-deployment validation
│   │   ├── post-deploy-log.js         # Deployment logging
│   │   ├── workflow-file-guard.js     # File protection
│   │   ├── auto-git-stage.js          # Auto git staging
│   │   └── hook-utils.js              # Shared utilities
│   ├── skills/             # 8 specialized skills (modular protocol)
│   │   ├── n8n-workflow-dev/          # MASTER ORCHESTRATOR (21 steps)
│   │   ├── n8n-workflow-patterns/     # 5 core patterns
│   │   ├── n8n-validation-expert/     # Validation guidance
│   │   ├── n8n-mcp-tools-expert/      # MCP tool usage
│   │   ├── n8n-expression-syntax/     # Expression writing
│   │   ├── n8n-node-configuration/    # Node config
│   │   ├── n8n-code-javascript/       # JS code patterns
│   │   └── n8n-code-python/           # Python code patterns
│   ├── commands/           # Slash commands (shortcuts)
│   │   ├── quick-node.md              # Fast node lookup
│   │   ├── lookup-api.md              # API documentation search
│   │   ├── screenshot-to-workflow.md  # Visual conversion
│   │   └── analyze-workflow.md        # Workflow analysis
│   ├── agents/             # Specialized agents
│   │   └── n8n-workflow-architect.md  # Invokes master skill
│   ├── logs/               # Hook execution logs
│   └── settings.json       # Hook configuration
├── context/
│   ├── youtube-knowledge/  # 10,279 indexed videos
│   ├── discord-knowledge/  # 2,930 Q&A indexed
│   ├── reddit-knowledge/   # Reddit protocol
│   ├── api-docs/           # Cached API documentation
│   └── workflow-patterns/  # Reusable patterns
├── workflows/
│   ├── dev/                # Development workflows
│   ├── staging/            # Pre-production
│   └── production/         # Production-ready exports
├── tools/
│   └── search/             # Search utilities
├── scripts/                # Utility scripts
├── config/                 # Configuration files
├── docs/                   # Project documentation
│   └── n8n-instance-mcp.md # Instance MCP setup guide
├── CLAUDE.md               # This file (architecture reference)
└── package.json            # Dependencies
```

---

## SKILL SYSTEM

### 11 Installed Skills (Auto-Activating)

| Skill | Triggers When | Purpose |
|-------|---------------|---------|
| **n8n-workflow-dev** | Building workflows | Master 21-step protocol |
| **n8n-workflow-patterns** | Designing workflows | 5 proven patterns + Code-first variants |
| **n8n-code-node-strategy** | Before Code nodes | Decision framework for Code vs built-in nodes |
| **n8n-validation-expert** | Debugging errors | Error interpretation, profiles |
| **n8n-mcp-tools-expert** | Using n8n-mcp tools | Tool selection, nodeType formatting |
| **n8n-expression-syntax** | Writing expressions | Fix errors, $json/$node access |
| **n8n-node-configuration** | Configuring nodes | Operation-aware config |
| **n8n-code-javascript** | Writing Code nodes | Data access, return formats |
| **n8n-code-python** | Python Code nodes | Standard library only |
| **twilio-integration** | SMS/Voice/WhatsApp | Twilio node config, E.164 format, error codes |
| **voice-agent-factory** | "make agent for X" | Diamond-producing voice agent factory |

### Skill Invocation Map

The master skill (`n8n-workflow-dev`) invokes sub-skills at specific steps:

| Step | Condition | Skill Invoked |
|------|-----------|---------------|
| 8 | Always | `n8n-workflow-patterns` |
| 10.5 | Always | `n8n-code-node-strategy` |
| 11 | Always | `n8n-node-configuration` |
| 11 | Using MCP tools | `n8n-mcp-tools-expert` |
| 11 | Twilio nodes detected | `twilio-integration` |
| 12 | Has expressions | `n8n-expression-syntax` |
| 13 | Has Code nodes | `n8n-code-javascript` |
| 15 | Always | `n8n-validation-expert` |

### Voice Agent Factory Pipeline

The `voice-agent-factory` skill is a **PARALLEL ORCHESTRATOR** that produces complete voice agents from a single request.

**Trigger**: "Make an [oncall/demo/voice] agent for {Company Name}"

| Phase | Action | Tools Used |
|-------|--------|------------|
| 1. PARSE | Extract company, industry, use_case | NLP parsing |
| 2. TEMPLATE | Match industry template, merge company data | `templates/voice-agents/{industry}/` |
| 3. CREATE AGENT | ElevenLabs API with provider config | `mcp__elevenlabs-mcp__create_agent` |
| 4. CREATE TOOLS | Deploy SMS webhook workflow | `mcp__n8n-mcp__n8n_create_workflow` |
| 5. CONFIGURE | Add phone, webhooks, knowledge bases | ElevenLabs MCP tools |
| 6. DOCUMENT | Generate test scenarios, governance entry | Template YAML files |

**Output**: Production-ready voice agent with all dependencies configured.

---

## CRITICAL KNOWLEDGE

### Node Type Formats
- **Search/Validation tools**: `nodes-base.slack`
- **Workflow JSON**: `n8n-nodes-base.slack`
- **AI nodes**: `@n8n/n8n-nodes-langchain.agent`

### Webhook Data Access
```javascript
// WRONG - will be undefined
$json.name

// CORRECT - webhook data is nested in body
$json.body.name
```

### AI Connection Pattern (REVERSE!)
```
Standard nodes:  Source → Target  (data flows right)
AI tool nodes:   AI Agent ← Tool  (tool connects TO agent)
```

### Partial Updates (80-90% Token Savings)
**ALWAYS prefer `n8n_update_partial_workflow` over full updates**:
```javascript
n8n_update_partial_workflow({
  id: "workflow-id",
  operations: [
    { type: "addNode", node: {...} },
    { type: "addConnection", source: "A", target: "B", branch: "true" }
  ]
})
```

### Credential Management (MANDATORY)
**See full directive: `.claude/directives/credential-management.md`**

When ANY 3rd-party API key is provided:
1. **Store immediately** in memory system (`mcp__memory__create_entities`)
2. **Create .env file** in `workflows/{project}/env/.env.{service}`
3. **Create n8n credential** via `POST /api/v1/credentials`
4. **Update workflow** to reference credential ID

Known service headers:
| Service | Header | n8n Credential ID |
|---------|--------|-------------------|
| ElevenLabs | xi-api-key | `eR7srDUHDyZLIZgh` |

Before building workflows, **ALWAYS** check memory for existing credentials.

---

## THIRD-PARTY INTEGRATION FRAMEWORK

When a 3rd-party service is implicated in an n8n workflow, this framework bootstraps a comprehensive integration layer—mirroring the n8n development supergateway itself.

**Location**: `.claude/directives/integrations/FRAMEWORK.md`

### Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    THIRD-PARTY INTEGRATION FRAMEWORK                         │
│                                                                              │
│  PHASE 0: DETECTION    → Check if integration exists                        │
│  PHASE 1: DISCOVERY    → Inventory MCP tools (mcp__{service}__*)            │
│  PHASE 2: KNOWLEDGE    → Aggregate docs, tutorials, patterns                │
│  PHASE 3: CREDENTIALS  → Check memory, env files, create if needed         │
│  PHASE 4: PATTERNS     → Extract workflow patterns, failure modes           │
│  PHASE 5: BUILD        → Proceed with n8n workflow development              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Directory Structure

```
.claude/directives/integrations/{service}/
├── manifest.yaml           # Service metadata, capabilities, credentials
├── mcp-tools.md           # MCP tool inventory with examples
├── knowledge-index.json   # Aggregated research sources
├── credential-store.yaml  # Credential locations (no secrets)
├── patterns/              # Reusable workflow patterns
└── failure-modes.md       # Known issues and resolutions
```

### Integrated Services

| Service | Status | MCP Server | Docs Coverage | Patterns |
|---------|--------|------------|---------------|----------|
| **ElevenLabs** | ✅ Complete | ✅ 24 tools | Comprehensive | 5+ |
| **Twilio** | ✅ Complete | ❌ None | Comprehensive | 4+ |
| OpenAI | 📋 Planned | ❌ None | - | - |
| Pipedrive | 📋 Planned | ❌ None | - | - |

### ElevenLabs Integration (Flagship)

**Location**: `.claude/directives/integrations/elevenlabs/`

| Resource | Purpose |
|----------|---------|
| `manifest.yaml` | 24 MCP tools, models, voices, agents, webhooks |
| `mcp-tools.md` | Complete tool reference with examples |
| `knowledge-index.json` | 47+ sources (YouTube, Discord, docs, workflows) |
| `patterns/outbound-call.json` | Client data injection pattern |

**Quick Access**:
```javascript
// Voice agents
mcp__elevenlabs-mcp__list_agents()
mcp__elevenlabs-mcp__get_agent({ agent_id: "agent_xyz" })

// Conversations
mcp__elevenlabs-mcp__list_conversations({ agent_id: "agent_xyz" })
mcp__elevenlabs-mcp__get_conversation({ conversation_id: "conv_abc" })

// Telephony
mcp__elevenlabs-mcp__make_outbound_call({
  agent_id: "agent_5701kdgf9s4vfe9rhe68ntjrms9g",
  agent_phone_number_id: "phnum_1901kdgev877fep99ex5fc5abb3m",
  to_number: "+15551234567"
})
```

### Entity Naming Convention (Phase Tags)

**ElevenLabs agents don't support tags**, so deployment phase is encoded in names.

**Format**: `[PHASE] Entity Name - Qualifier`

| Phase | Example |
|-------|---------|
| `[DEV]` | `[DEV] Acme Corp - Sarah` |
| `[ALPHA]` | `[ALPHA] Acme Corp - Sarah` |
| `[PROD]` | `[PROD] Acme Corp - Sarah` |

**Applies to**: ElevenLabs agents, Twilio friendly names, Cal.com events, webhook paths

**Directive**: `.claude/directives/entity-naming-convention.md`

**Parsing**:
```javascript
function parsePhaseFromName(name) {
  const match = name.match(/^\[([A-Z]+)\]\s+/);
  return match ? match[1] : 'UNTAGGED';
}
```

### Twilio Integration (SMS/Voice)

**Location**: `.claude/skills/twilio-integration/`

| Resource | Purpose |
|----------|---------|
| `SKILL.md` | Complete Twilio skill with node config, error codes, patterns |
| `error-codes.md` | Quick-lookup table for all Twilio error codes |

**Context7 Knowledge Sources**:
| Library ID | Purpose | Benchmark |
|------------|---------|-----------|
| `/twilio/twilio-node` | Node.js SDK | 87.9 |
| `/websites/twilio_voice` | Voice/TwiML (8,071 snippets) | 83.4 |
| `/llmstxt/twilio_llms_txt` | General API | 42.6 |

**Quick Access**:
```javascript
// n8n Twilio node essentials
mcp__n8n-mcp__get_node_essentials({ nodeType: "nodes-base.twilio" })

// Context7 documentation
mcp__context7__get-library-docs({
  context7CompatibleLibraryID: "/twilio/twilio-node",
  topic: "sms sending"
})
```

**Phone Format (CRITICAL)**: Always E.164 format: `+14155551234`

### Incremental Update Protocol

**CRITICAL**: Never reinvent the wheel. When updating an existing integration:

1. **READ existing manifest.yaml first**
2. **MERGE new findings** with existing data
3. **PRESERVE** all working patterns and credentials
4. **ADD** new knowledge without replacing
5. **UPDATE** last_updated timestamp

---

## INSTANCE CONFIGURATION

```yaml
n8n_instance:
  url: https://n8n.wranngle.com
  api_key: [CONFIGURE IN ENV]
  mcp_endpoint: https://n8n.wranngle.com/mcp-server/http
  mcp_token: [CONFIGURED - see .env]

mcp_servers:
  # CONNECTED - WORKFLOW BUILDING
  n8n-mcp: ✅ (528 nodes, 2709 templates, validation)

  # CONNECTED - LIVE INSTANCE ACCESS
  n8n-instance: ✅ (configured in ~/.claude.json via supergateway)
  # Tools: list_workflows, get_workflow, execute_workflow, search_workflows
  # Endpoint: https://n8n.wranngle.com/mcp-server/http

  # CONNECTED - PORTABLE METHODOLOGY
  n8n-methodology: ✅ (exposes this project's methodology as MCP tools)
  # Tools: get_methodology, get_skill, list_skills, search_knowledge, get_workflow_pattern
  # Use from ANY project after restart

  # CONNECTED - RESEARCH & DOCS
  exa: ✅ (web search, deep research)
  context7: ✅ (real-time docs)
  ref-tools: ✅ (doc search)
  scrapling: ✅ (high-performance web scraping, anti-bot bypass)
  memory: ✅ (knowledge graph)
  elevenlabs-mcp: ✅ (voice AI, TTS, agents)

  # NOT CONNECTED (use fallbacks)
  youtube: ❌ - use local index + Exa crawl
  discord: ❌ - use local database only
  reddit: ❌ - use Exa site:reddit.com search

knowledge_bases:
  youtube: 10,279 videos indexed
  discord: 2,930 Q&A indexed
  community: 4,343 workflows
  templates: 2,709 official templates
```

### Two Complementary n8n MCP Servers

| Server | Purpose | Data Source |
|--------|---------|-------------|
| **n8n-mcp** (npm) | Node schemas, templates, validation | Static database |
| **n8n-instance** (HTTP) | Live workflows, execution, runtime | Your n8n instance |

**Use both together**: n8n-mcp for building workflows, n8n-instance for deploying/executing.

---

## KNOWN LIMITATIONS

### External Service Access
| Service | Limitation | Workaround |
|---------|-----------|------------|
| n8n.io Template Pages | WebFetch returns CSS, no JSON | Use MCP `get_template` |
| Medium Articles | HTTP 403 (bot blocking) | Use community forum |
| YouTube Transcripts | MCP not connected | Use Exa crawling |

### API Requirements
| Feature | Requirement |
|---------|-------------|
| n8n Instance Access | N8N_API_KEY required |
| n8n Instance MCP | N8N_MCP_TOKEN required (separate from API key) |
| Discord Live Search | DISCORD_TOKEN required |
| YouTube Transcripts | Pre-cached available offline |

---

## HOOK DEBUGGING

If hooks don't fire, check `.claude/logs/hooks.log` for execution traces.

**Common Issues**:
1. **Session Continuation**: SessionStart hook only fires on fresh sessions
2. **Working Directory**: Hooks use relative paths, run from project root
3. **Permissions**: Check `.claude/settings.json` permissions block

---

## SELF-CORRECTING WORKFLOW ENGINE (ULTRATHINK)

This repository implements an autonomous meta-cognitive supervision layer for deterministic perfection.

### Ultrathink Execution Loop
```
1. EXECUTE   → Perform the assigned task
2. OBSERVE   → Read execution logs, output code, screenshots (one page at a time)
3. ANALYZE   → Collect comprehensive list of flaws as checklist
4. REMEDIATE → Self-fix the identified flaws
5. VERIFY    → Confirm fixes resolved the issues
6. REPEAT    → Continue until state is PERFECTION
7. AUTOMATE  → Implement self-healing mechanisms for future prevention
```

### Supervision Layer Indicators
Monitor execution for these negative indicators and log immediately:
| Type | Description |
|------|-------------|
| FRICTION | Unnecessary complexity or resistance |
| INEFFICIENCY | Wasted steps or resources |
| WASTE | Redundant operations |
| CORRUPTION | Data integrity issues |
| MISTAKES | Errors in logic or execution |

### Automatic Research Protocol
**Triggers after 2 occurrences of the same issue:**
1. Block all locally directed troubleshooting attempts
2. Perform mandatory internet research (GitHub, docs, forums)
3. Find "the wheel that has already been invented"
4. Implement solution programmatically into the pipeline
5. Document in `context/known-bugs/` for future prevention

### Supervision Log Location
`.claude/logs/supervision-log.jsonl` - JSONL format with entries:
```json
{"timestamp":"...","type":"MISTAKE","description":"...","count":N,"action":"RESEARCH_PROTOCOL","resolved":true}
```

### Self-Healing Hooks
| Hook | Purpose |
|------|---------|
| `if-node-warning.js` | Blocks IF node usage, suggests Switch node (known bug) |
| `pre-deploy-check.js` | Validates before deployment |
| `post-deploy-log.js` | Logs deployments for audit trail |

### Known Bug Registry
`context/known-bugs/` contains documented issues with canonical solutions:
- `n8n-if-node-v2.md` - IF node routing bug → Use Switch node

---

## QUICK REFERENCE

### Most Used MCP Tools
```javascript
mcp__n8n-mcp__search_nodes({query: "keyword"})
mcp__n8n-mcp__get_node_essentials({nodeType: "nodes-base.httpRequest"})
mcp__n8n-mcp__validate_workflow({workflow: {...}})
mcp__n8n-mcp__n8n_create_workflow({name: "...", nodes: [...], connections: {...}})
```

### Git Commit Format
```
[n8n] {action}: {workflow-name} - {description}
```
Actions: `create`, `update`, `fix`, `deploy`, `stage`, `archive`

### File Locations
- Development: `workflows/dev/`
- Staging: `workflows/staging/`
- Production: `workflows/production/`

---

*Last Updated: 2025-12-28*
*Architecture Version: 2.4 - Governance Hygiene + Native n8n Tags*
