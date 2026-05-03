# Project Context

## Purpose
**n8n Workflow Development Command Center** - A hook-driven deterministic methodology repository for n8n workflow automation development. Serves as a unified command center integrating:

- **Claude Code CLI** for AI-assisted workflow creation
- **n8n** self-hosted workflow automation platform
- **ElevenLabs** voice AI agents and conversational AI
- **Twilio** communication (SMS, Voice, WhatsApp)

Implements a sophisticated 15-layer governance system with a 21-step development protocol across 6 phases (CALIBRATE → DESIGN → BUILD → VALIDATE → TEST → DEPLOY).

**Repository Type:** Methodology/DevOps Tooling
**Version:** 2.0.0
**Author:** wranngle

## Tech Stack

### Core Platform
- **n8n** (self-hosted at `n8n.wranngle.com`) - Primary workflow automation engine
- **Node.js 18+** - Runtime for scripts, hooks, and tests

### AI & Voice
- **Claude Code CLI** - AI-assisted development with MCP integration
- **ElevenLabs** - Voice agents, TTS, STT (24 MCP tools)
- **Google Gemini** - Content generation

### Communication
- **Twilio** - SMS, Voice, WhatsApp integration

### Scripting & Automation
- **JavaScript/Node.js** - Hooks, API interactions, tests
- **PowerShell** - Deployment and automation scripts
- **Python** - Data processing utilities

### Configuration & Data
- **YAML** - Human-readable configs (`governance.yaml`, `registry.yaml`)
- **JSON** - Workflow definitions, data schemas
- **Markdown** - Documentation

### MCP Servers (39+ tools)
- `n8n-mcp` - Workflow CRUD, validation, execution
- `elevenlabs-mcp` - Voice agents, TTS, conversations
- `exa` - Web search and code context
- `context7` - Library documentation lookup
- `morph-mcp` - Fast file editing

### Testing
- Custom Node.js test runner (no Jest/Mocha dependency)
- ATDD (Acceptance Test-Driven Development)
- 200+ E2E integration tests

## Project Conventions

### Code Style

**JavaScript:**
- ES6 module syntax (`import`/`export`)
- `async`/`await` for promises
- JSDoc headers for major files
- Inline comments for complex logic only

**File Naming:**
- Workflows: `kebab-case-descriptive-name.json`
- Scripts: `kebab-case.ps1` / `kebab-case.js`
- Hooks: `<trigger>-<action>.js`
- Documentation: `kebab-case.md`

**Variable Naming:**
- `camelCase` for JavaScript variables and functions
- `SCREAMING_SNAKE_CASE` for environment variables
- `kebab-case` for file and directory names

### Architecture Patterns

**Hook-Driven Governance:**
```
hooks/
├── on-session-start/   # Session initialization, credential sync
├── on-prompt-submit/   # User request routing, intent detection
├── on-tool-invoke/     # Pre-tool validation, blocking rules
└── on-tool-result/     # Post-tool logging, metrics
```

**Hook Response Format:**
```javascript
// Allow operation
{ continue: true }

// Allow with system message
{ continue: true, systemMessage: "Info for context" }

// Block operation (BLOCKING hooks only)
{ continue: false, reason: "Why operation was rejected" }
```

**Workflow Organization:**
```
workflows/
├── dev/         # Development/testing (modifiable)
├── staging/     # Pre-production
├── production/  # Production-ready (read-only promotion)
└── voice_ai_agent_evals/  # ElevenLabs agent workflows
```

**n8n Workflow JSON Structure:**
```javascript
{
  "name": "Descriptive Workflow Name",
  "nodes": [{
    "id": "unique-node-id",
    "name": "Human Readable Name",
    "type": "n8n-nodes-base.<nodeType>",
    "typeVersion": 2,  // REQUIRED
    "position": [x, y],
    "webhookId": "...",  // REQUIRED for webhook nodes
    "parameters": { /* node config */ }
  }],
  "connections": { /* node wiring */ }
}
```

### Testing Strategy

**Multi-Layer Testing Architecture:**

1. **ATDD (Acceptance Test-Driven Development)**
   - Tests in `tests/api/` - API contract validation
   - RED → GREEN → REFACTOR cycle enforced
   - Uses native Node.js `https` + `assert` modules

2. **E2E Integration Tests**
   - Tests in `tests/e2e/` - 200 comprehensive scenarios
   - Categories: CORE (001-050), ERROR (051-100), EDGE (101-150), LOAD (151-200)
   - Real HTTP requests to production endpoints

3. **Atomic Evaluation System**
   - Tests in `tests/evaluations/` - Granular accuracy checks
   - Decomposed assertions for pinpoint failure detection
   - Registry-based with weighted assertions

4. **Stress Testing**
   - Concurrency limits, retry logic, DLQ reprocessing

**Running Tests:**
```bash
node tests/api/postcall-selfhealing.api.spec.js
node tests/e2e/postcall-webhook-e2e.spec.js --category=CORE
node tests/evaluations/atomic-evaluation.spec.js
```

### Git Workflow

**Branching:**
- `main` - Primary branch for all development
- Feature work done directly on main (methodology repo, not application)

**Commit Convention:**
```
[<scope>] <type>: <description>

Examples:
[n8n] create: ATDD test suite for post-call webhook self-healing
[ultrathink] Data journey validation: 100% success rate achieved
[voice-agent] breakthrough: 100% pass rate, fleet rollout complete
```

**Scopes:** `n8n`, `ultrathink`, `voice-agent`, `hooks`, `docs`, `tests`
**Types:** `create`, `fix`, `refactor`, `docs`, `test`, `chore`

## Domain Context

### 21-Step Development Protocol

| Phase | Steps | Key Activities |
|-------|-------|----------------|
| **CALIBRATE** | 0-7 | Search 25+ sources, analyze patterns, query n8n-mcp |
| **DESIGN** | 8-10 | Select reusable pattern, analyze templates |
| **BUILD** | 11-14 | Configure nodes, assemble JSON, validate expressions |
| **VALIDATE** | 15-16 | Run validation checks, iterative error correction |
| **TEST** | 17-18 | Deploy to DEV, execute test suite |
| **DEPLOY** | 19-21 | Stage → Production, commit to Git, document |

### Workflow Governance

- **DEV phase** - Workflows are modifiable
- **ARCHIVED phase** - Read-only, no modifications
- **Deletion is BLOCKED** - Must archive instead
- **New workflows auto-tagged DEV**
- Tag IDs: `DEV=Nbnc0KJVYlJeasQJ`, `ARCHIVED=4k9QbQQTpxNkOoJQ`

### Voice Agent Architecture

- ElevenLabs agents with webhook-based post-call processing
- Transcript extraction and analysis pipeline
- CRM (Pipedrive) integration for lead qualification
- Consent/GDPR compliance handling
- Self-healing with DLQ for failed messages

### Knowledge Base

- 10,279 indexed YouTube tutorials
- 2,930 Discord Q&A entries
- 4,343 community workflows
- 2,709 official n8n templates
- 50+ industry-specific technical research documents

## Important Constraints

### Governance Rules (BLOCKING)
1. **Webhook nodes MUST have `webhookId`** - Enforced on create/update
2. **Workflow deletions are BLOCKED** - Archive instead
3. **ARCHIVED workflows are read-only** - Cannot modify

### Credential Management
1. **Single source of truth:** `~/.claude/.env`
2. **Child project configs absorbed** - Automatically migrated to global
3. **API keys auto-detected from chat** - Tested and stored automatically
4. **Required credentials prompted on session start**

### Tool Preferences
1. Prefer `Read` over `cat`, `Glob` over `ls`, `Grep` over `grep`
2. Prefer `mcp__morph-mcp__edit_file` for code edits (10,500+ tok/s)
3. Prefer `mcp__n8n-mcp__*` for all workflow operations
4. API-first: Only use browser automation if no API exists

### Testing Requirements
1. All tests must result in `## TASK COMPLETE` summary
2. ATDD tests must fail first (RED phase)
3. Real HTTP requests - no mocking for E2E tests

## External Dependencies

### APIs & Services

| Service | Purpose | Credential |
|---------|---------|------------|
| **n8n** | Workflow execution | `N8N_API_KEY` |
| **ElevenLabs** | Voice agents, TTS, STT | `ELEVENLABS_API_KEY` |
| **Twilio** | SMS, Voice, WhatsApp | `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN` |
| **Pipedrive** | CRM integration | `PIPEDRIVE_API_TOKEN` |
| **Google Gemini** | Content generation | `GOOGLE_API_KEY` |
| **Exa** | Web search | `EXA_API_KEY` |

### Endpoints
- **n8n Instance:** `https://n8n.wranngle.com`
- **n8n API:** `https://n8n.wranngle.com/api/v1/`

### Key Files

| File | Purpose |
|------|---------|
| `CLAUDE.md` | Master protocol registry (15+ governance layers) |
| `workflows/governance.yaml` | Workflow phase assignments |
| `workflows/registry.yaml` | Workflow metadata & relationships |
| `docs/index.md` | Documentation master index |
| `docs/architecture.md` | System design & data flows |
| `openspec/AGENTS.md` | Spec-driven development guide |
