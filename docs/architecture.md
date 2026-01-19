# System Architecture

## Architecture Overview

**Pattern:** Hook-Driven Deterministic Architecture  
**Style:** Methodology Repository with AI-Assisted Enforcement  
**Version:** 2.4 (Governance Hygiene + Native n8n Tags)

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         n8n WORKFLOW DEVELOPMENT SYSTEM                      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    LAYER 1: USER INTERFACE                           │   │
│  │  • Claude Code CLI (primary interaction)                            │   │
│  │  • Terminal / IDE integration                                        │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                        │
│                                    ▼                                        │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    LAYER 2: HOOK SYSTEM                              │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐               │   │
│  │  │ SessionStart │  │ PromptSubmit │  │ ToolInvoke   │               │   │
│  │  │   Hooks      │  │    Hooks     │  │   Hooks      │               │   │
│  │  └──────────────┘  └──────────────┘  └──────────────┘               │   │
│  │  • detect-workflow-intent.js → skill routing                        │   │
│  │  • workflow-governance.js → phase enforcement                        │   │
│  │  • pre-deploy-check.js → validation gate                            │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                        │
│                                    ▼                                        │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    LAYER 3: SKILL SYSTEM                             │   │
│  │  ┌────────────────────────────────────────────────────────────┐     │   │
│  │  │              n8n-workflow-dev (MASTER)                      │     │   │
│  │  │  21-step protocol across 6 phases                          │     │   │
│  │  └────────────────────────────────────────────────────────────┘     │   │
│  │           │           │           │           │                      │   │
│  │  ┌────────┴───┐ ┌─────┴─────┐ ┌───┴───┐ ┌────┴────┐                │   │
│  │  │ patterns   │ │  node-    │ │syntax │ │validation│                │   │
│  │  │            │ │  config   │ │       │ │  expert  │                │   │
│  │  └────────────┘ └───────────┘ └───────┘ └──────────┘                │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                        │
│                                    ▼                                        │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    LAYER 4: MCP SERVERS                              │   │
│  │  ┌──────────┐  ┌───────────┐  ┌──────────┐  ┌──────────┐           │   │
│  │  │ n8n-mcp  │  │elevenlabs │  │  exa     │  │ context7 │           │   │
│  │  │39 tools  │  │  24 tools │  │ search   │  │  docs    │           │   │
│  │  └──────────┘  └───────────┘  └──────────┘  └──────────┘           │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                        │
│                                    ▼                                        │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    LAYER 5: EXTERNAL SERVICES                        │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐               │   │
│  │  │  n8n.wranngle│  │  ElevenLabs  │  │    Twilio    │               │   │
│  │  │   .com      │  │     API      │  │     API      │               │   │
│  │  └──────────────┘  └──────────────┘  └──────────────┘               │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Component Architecture

### 1. Hook System (Enforcement Layer)

Hooks intercept Claude Code operations and enforce methodology rules.

| Hook Category | Examples | Purpose |
|---------------|----------|---------|
| **Session Start** | session-init.js | Initialize session state |
| **Prompt Submit** | detect-workflow-intent.js | Route to skills |
| **Pre-Tool Use** | workflow-governance.js, pre-deploy-check.js | Validate operations |
| **Post-Tool Use** | (logging, registration) | Audit and register |

### 2. Skill System (Methodology Layer)

Skills contain domain-specific knowledge and procedures.

| Skill | Purpose | Invoked When |
|-------|---------|--------------|
| `n8n-workflow-dev` | Master 21-step protocol | Workflow requests |
| `n8n-workflow-patterns` | 5 core patterns | Design phase |
| `n8n-node-configuration` | Node config guidance | Build phase |
| `n8n-validation-expert` | Error interpretation | Validation phase |
| `n8n-expression-syntax` | Expression writing | Expression errors |
| `twilio-integration` | Twilio node config | Twilio nodes |
| `voice-agent-factory` | Agent creation | "Make agent for X" |

### 3. Governance System (Control Layer)

Manages workflow and agent lifecycle.

```
Deployment Phases:
DEV → ALPHA → BETA → GA → PROD
  ↓
ARCHIVED
```

| Phase | Modifiable | Description |
|-------|------------|-------------|
| DEV | ✅ Yes | Active development |
| ALPHA | ❌ Clone | Early testing |
| BETA | ❌ Clone | User testing |
| GA | ❌ Clone | General availability |
| PROD | ❌ Clone | Production |
| ARCHIVED | ❌ Read | Deprecated |

### 4. Knowledge Management (Context Layer)

Pre-indexed knowledge for AI-assisted research.

| Source | Count | Location |
|--------|-------|----------|
| YouTube Tutorials | 10,279 | `context/youtube-knowledge/` |
| Discord Q&A | 2,930 | `context/discord-knowledge/` |
| Community Workflows | 4,343 | Via n8n-mcp |
| Official Templates | 2,709 | Via n8n-mcp |

## Data Flow

### Workflow Creation Flow

```
1. User Request
   ↓
2. detect-workflow-intent.js hook fires
   ↓
3. Skill("n8n-workflow-dev") invoked
   ↓
4. Phase 1: CALIBRATE (Steps 0-7)
   - Search knowledge bases (25 source minimum)
   - Query n8n-mcp for nodes/templates
   ↓
5. Phase 2: DESIGN (Steps 8-10)
   - Pattern selection
   - Template analysis
   ↓
6. Phase 3: BUILD (Steps 11-14)
   - Node configuration
   - JSON assembly
   ↓
7. Phase 4: VALIDATE (Steps 15-16)
   - validate_workflow via n8n-mcp
   - Iterative correction loop
   ↓
8. Phase 5: TEST (Steps 17-18)
   - Deploy to DEV
   - Execute tests
   ↓
9. Phase 6: DEPLOY (Steps 19-21)
   - Stage → Production
   - Git commit
```

### Governance Enforcement Flow

```
1. Tool Call: n8n_update_workflow
   ↓
2. workflow-governance.js hook intercepts
   ↓
3. Check workflow phase in governance.yaml
   ↓
4a. If DEV → Allow modification
4b. If ALPHA/BETA/GA/PROD → BLOCK, suggest clone
4c. If ARCHIVED → BLOCK (read-only)
   ↓
5. If blocked, provide guidance
```

## Security Architecture

### Credential Management

| Service | Storage | n8n Credential ID |
|---------|---------|-------------------|
| ElevenLabs | `.env` + memory system | `REDACTED_GENERIC_KEY` |
| n8n API | `.env` | Configured |
| Twilio | `.env` | Via n8n node |

### Access Control

- **No deletion policy** - Workflows archived, never deleted
- **Phase-based editing** - Only DEV phase modifiable
- **Clone protection** - Non-DEV phases require clone
- **Credential isolation** - Secrets in `.env`, never committed

## Integration Architecture

### n8n Instance

```yaml
url: https://n8n.wranngle.com
mcp_endpoint: https://n8n.wranngle.com/mcp-server/http
tools: 39 via n8n-mcp
nodes: 528 indexed
templates: 2,709 available
```

### ElevenLabs

```yaml
mcp_server: elevenlabs-mcp
tools: 24
agents:
  - Wranngle Lead Qualifier (DEV)
  - Sarah - Wranngle Receptionist (DEV)
  - Client Data Test Agent (DEV)
  - SEWY Garage Doors - Sarah (DEV)
```

### Twilio

```yaml
integration: Via n8n Twilio node
skill: twilio-integration
phone_format: E.164 required (+14155551234)
```

## Testing Architecture

### Evaluation Framework

Located in `workflows/voice_ai_agents/supersystem/tests/`:

| Component | Purpose |
|-----------|---------|
| `run-tests.js` | Test runner |
| `generate-100-tests.js` | Test generation |
| `ultrathink-engine.js` | Self-correcting logic |
| `workflow-evaluation-runner.js` | n8n evaluation execution |

### CI/CD

Located in `.github/workflows/`:

| Workflow | Purpose |
|----------|---------|
| `claude-code-review.yml` | PR review automation |
| `claude.yml` | Claude integration |
| `voice-agent-tests.yml` | Voice agent CI tests |
