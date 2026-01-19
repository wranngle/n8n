---
stepsCompleted: [1, 2, 3, 4, 5, 6, 7]
inputDocuments:
  - _bmad-output/planning-artifacts/prd.md
  - docs/architecture.md
  - docs/self-referential-improvement-system.md
  - CLAUDE.md
  - .claude/directives/integrations/elevenlabs/manifest.yaml
workflowType: 'architecture'
project_name: 'n8n'
user_name: 'wranngle'
date: '2026-01-07'
---

# Architecture Decision Document

_This document builds collaboratively through step-by-step discovery. Sections are appended as we work through each architectural decision together._

## Project Context Analysis

### Requirements Overview

**Functional Requirements:**
The system requires 70 capabilities across 11 domains:
- **Protocol Enforcement** (FR1-6): Intent detection, 21-step protocol, research quotas
- **Knowledge Discovery** (FR7-13): Multi-source search (YouTube, Discord, templates)
- **Governance** (FR14-20): Phase lifecycle, no-deletion policy, audit trails
- **Validation** (FR21-27): Schema validation, expression checking, pattern blocking
- **Voice AI** (FR41-47): Agent creation, SMS workflows, Twilio integration
- **Self-Correction** (FR54-58): Supervision logging, automatic research protocols

**Non-Functional Requirements:**
26 NFRs drive architectural decisions:
- Hook latency <100ms (real-time enforcement)
- 99.5% MCP server availability (reliability)
- 100% backward compatibility for MCP tools (integration)
- API keys never in version control (security)
- 90%+ first-pass validation rate (usability)

**Scale & Complexity:**

- Primary domain: Workflow Automation + Voice AI Integration
- Complexity level: Medium-High
- Estimated architectural components: 8 layers (Trigger, Evaluation, Aggregation, Decision, Action, Execution, Verification, History)

### Technical Constraints & Dependencies

| Constraint | Impact |
|------------|--------|
| n8n instance required | All workflow deployment depends on https://n8n.wranngle.com |
| ElevenLabs API | Voice agent evaluation requires simulate-conversation endpoint |
| Claude Code CLI | Hook system only executes within Claude Code sessions |
| MCP server connectivity | 6+ servers must be available for full functionality |
| External state store | Rollback mechanism requires persistent pre-fix snapshots |

### Cross-Cutting Concerns Identified

1. **Credential Management** - Spans all external integrations
2. **Unified Logging** - Supervision logs, deployment logs, history store must be consistent
3. **Error Propagation** - Failures in one evaluator must not crash entire SRIS loop
4. **Configuration Management** - Thresholds, agent IDs, workflow IDs externalized
5. **State Preservation** - Metrics snapshots for before/after comparison in verification
6. **State Persistence** - External store required for rollback snapshots (Supabase/Redis)
7. **Fault Tolerance** - Circuit breakers, timeouts, saga compensation for parallel evaluators
8. **Self-Monitoring** - SRIS health checks independent of SRIS execution
9. **Data Retention** - History store lifecycle management, GDPR compliance for transcripts

### Architectural Concerns (Party Mode Analysis)

**State Management:**
- Pre-fix state must be persisted externally for rollback capability
- Options: n8n execution data with `includeData: true`, Supabase, or Redis

**Fault Tolerance:**
- Saga pattern needed for parallel evaluator orchestration
- Circuit breaker: Halt SRIS after 3 consecutive failed auto-fixes
- Timeout handling for evaluator fan-out/fan-in

**Testing Infrastructure:**
- SRIS self-monitoring separate from SRIS execution
- Canary deployment: Test fix on subset before full rollout
- Dry-run mode for auto-fix preview without mutation

**Data Governance:**
- History store retention policy required (30 days recommended)
- Conversation transcript handling for GDPR compliance
- Unified severity matrix for cross-stack consistency

### Unified Severity Matrix

| Severity | n8n Threshold | ElevenLabs Threshold | Action |
|----------|---------------|---------------------|--------|
| CRITICAL | <80% pass | <75% conv success | Auto-fix immediately |
| WARNING | <95% pass | <90% conv success | Queue for review |
| OK | ≥95% | ≥90% | Log only |

### Additional SRIS Requirements Identified

| ID | Requirement | Rationale |
|----|-------------|-----------|
| FR-SRIS-01 | SRIS health monitoring independent of SRIS execution | Prevent recursive failure blindness |
| FR-SRIS-02 | Manual override always available for auto-fix | Human-in-the-loop safety valve |
| FR-SRIS-03 | Pre-fix snapshot stored before any mutation | Enable safe rollback |
| FR-SRIS-04 | Circuit breaker after 3 consecutive fix failures | Prevent fix-storm cascades |

## Starter Template Evaluation

### Primary Technology Domain

**Workflow Automation Platform + Voice AI Integration** (Brownfield Extension)

This project extends an existing n8n methodology repository. Traditional application starters don't apply—instead, we build on existing workflow patterns and deployed infrastructure.

### Starter Options Considered

| Option | Assessment |
|--------|------------|
| Traditional app starters (Next.js, etc.) | ❌ Not applicable to n8n workflows |
| n8n-MCP template database (2,709) | ✅ Reference for patterns |
| Existing SRIS workflows (3 deployed) | ✅ Primary foundation |
| Autorefinement Orchestrator v2 | ✅ Needs loop closure integration |

### Selected Starter: Existing SRIS Workflow Suite

**Rationale:**
- Foundation already deployed: 3 SRIS workflows in DEV phase
- Autorefinement exists but disconnected—needs integration, not recreation
- n8n-MCP tools available for validation and deployment
- Governance system operational for phase management

**Existing Workflows to Extend:**

| Component | Workflow ID | Status |
|-----------|-------------|--------|
| Master Orchestrator | `4TqaQ6kORDzZVwVP` | DEV |
| ElevenLabs Evaluator | `RjLiUAiuUs5XPvBj` | DEV |
| Verification Loop | `KoQChBtjUa5F9bZg` | DEV |
| Autorefinement (to integrate) | `c9dFlI51VhvANoEj` | Inactive |

### Architectural Decisions Inherited

**Workflow Execution:**
- n8n engine (Node.js-based) at https://n8n.wranngle.com
- Webhook triggers for external invocation
- HTTP Request nodes for API integration

**Expression Syntax:**
- n8n native: `={{ $json.field }}`, `{{ $node["Name"].json }}`
- Webhook data access: `$json.body.field` (not `$json.field`)

**Validation Infrastructure:**
- `mcp__n8n-mcp__validate_workflow` with ai-friendly profile
- Switch node v3.2+ format for conditional logic
- Pre-deploy hooks for governance enforcement

**Code Organization:**
- `workflows/dev/` - Modifiable DEV phase workflows
- `workflows/staging/` - Pre-production testing
- `workflows/production/` - Immutable production exports

**Note:** No new project initialization required—this is brownfield extension of existing deployed infrastructure.

## Core Architectural Decisions

### Decision Priority Analysis

**Critical Decisions (Block Implementation):**
- State persistence strategy for rollback
- Inter-workflow communication pattern
- Circuit breaker implementation

**Important Decisions (Shape Architecture):**
- History store location and retention
- Trigger scheduling mechanism
- Monitoring and alerting

**Deferred Decisions (Post-MVP):**
- ML training on historical fix data
- Cross-organization federation
- Advanced canary deployment

### Data Architecture

| Decision | Choice | Rationale |
|----------|--------|-----------|
| **State Persistence** | n8n execution data + JSON export | Execution data for short-term verification; JSON export for rollback snapshots |
| **History Store** | n8n workflow with Airtable/Supabase | Queryable, supports retention policies, external to n8n for independence |
| **Retention Policy** | 30 days metrics, 90 days fix history | Balance storage vs. audit trail needs |

### API & Communication Patterns

| Decision | Choice | Rationale |
|----------|--------|-----------|
| **Inter-Workflow** | Webhook triggers with JSON payload | Standard n8n pattern, supports async execution |
| **Parallel Evaluators** | Fan-out via HTTP Request, fan-in via aggregator webhook | Saga pattern with timeout handling |
| **External APIs** | HTTP Request nodes with retry logic | ElevenLabs, n8n API, Twilio via native nodes |

### Error Handling & Fault Tolerance

| Decision | Choice | Rationale |
|----------|--------|-----------|
| **Circuit Breaker** | Code node counter + Switch node | Halt after 3 consecutive failed auto-fixes |
| **Timeout Handling** | 30s per evaluator, 120s total orchestration | Prevent hung workflows |
| **Failure Isolation** | Try/catch in Code nodes, continueOnFail: true | One evaluator failure doesn't crash SRIS |
| **Rollback Trigger** | metrics_after < metrics_before by >5% | Automatic reversion threshold |

### Monitoring & Observability

| Decision | Choice | Rationale |
|----------|--------|-----------|
| **Supervision Logs** | Append to `.claude/logs/supervision-log.jsonl` | Consistent with existing Ultrathink pattern |
| **Deployment Logs** | `workflows/governance.yaml` + post-deploy hook | Audit trail for all changes |
| **Alerting** | Slack webhook on CRITICAL threshold | Immediate notification for auto-fix triggers |

### Infrastructure & Deployment

| Decision | Choice | Rationale |
|----------|--------|-----------|
| **Trigger Schedule** | Cron every 6 hours + manual webhook | Balanced monitoring without overload |
| **Activation** | Manual via n8n UI (DEV phase) | Governance compliance, no auto-activation |
| **Environment** | Single n8n instance (wranngle.com) | Existing infrastructure, no multi-tenant |

### Decision Impact Analysis

**Implementation Sequence:**
1. State persistence (execution data query pattern)
2. Circuit breaker logic (Code node)
3. Inter-workflow webhooks (Master → Evaluators → Aggregator)
4. History store integration
5. Alerting webhook

**Cross-Component Dependencies:**
- Verification Loop depends on state persistence decision
- Circuit breaker depends on history store for consecutive failure tracking
- Alerting depends on threshold evaluator output format

## Implementation Patterns & Consistency Rules

### Pattern Categories Defined

**Critical Conflict Points Identified:** 12 areas where AI agents could make different choices

### Naming Patterns

**Workflow Naming Convention:**
```
[PHASE] System - Component Name
```
- Phase tags: `[DEV]`, `[ALPHA]`, `[BETA]`, `[GA]`, `[PROD]`
- Examples:
  - ✅ `[DEV] SRIS - Master Orchestrator`
  - ✅ `[DEV] SRIS - ElevenLabs Conversation Evaluator`
  - ❌ `SRIS Master Orchestrator` (missing phase)
  - ❌ `dev_sris_orchestrator` (wrong format)

**Node Naming Convention:**
```
{Action} {Target} [{Qualifier}]
```
- Use descriptive action verbs
- Examples:
  - ✅ `Load Test Scenarios`
  - ✅ `Evaluate Pass Rate`
  - ✅ `Call Autorefinement [on CRITICAL]`
  - ❌ `HTTP Request` (too generic)
  - ❌ `Node1` (meaningless)

**Webhook Path Convention:**
```
/webhook/{system}-{component}
```
- Lowercase, hyphen-separated
- System prefix for namespacing
- Examples:
  - ✅ `/webhook/sris-orchestrator`
  - ✅ `/webhook/elevenlabs-conversation-eval`
  - ❌ `/webhook/SRIS_Orchestrator` (wrong casing)
  - ❌ `/sris/eval` (missing /webhook prefix)

**Variable Naming in Expressions:**
```javascript
// camelCase for local variables
const passRate = items.filter(i => i.passed).length / items.length;

// snake_case for JSON output fields
return { pass_rate: passRate, total_tests: items.length };
```

### Structure Patterns

**Workflow File Organization:**
```
workflows/
├── dev/                    # Modifiable workflows
│   ├── [DEV] SRIS - *.json
│   └── ...
├── staging/                # Pre-production (clone from dev)
├── production/             # Immutable production exports
└── governance.yaml         # Phase assignments
```

**Node Layout Pattern:**
```
Trigger → Input Processing → Core Logic → Output Formatting → Response/Next
   │
   └── Error Branch → Error Handler → Error Response
```
- Left to right flow for main path
- Error branches below main flow
- Group related nodes visually

### Format Patterns

**Inter-Workflow JSON Payload:**
```json
{
  "run_id": "uuid",
  "timestamp": "ISO8601",
  "source": "workflow_name",
  "data": {
    // Actual payload here
  },
  "metadata": {
    "trigger": "schedule|manual|webhook",
    "version": "1.0"
  }
}
```

**Metrics Output Format:**
```json
{
  "pass_rate": 94.5,
  "total_tests": 20,
  "passed": 19,
  "failed": 1,
  "failures": [
    {
      "test_id": "TC001",
      "error": "Description",
      "severity": "CRITICAL|WARNING"
    }
  ],
  "timestamp": "ISO8601"
}
```

**Error Response Format:**
```json
{
  "success": false,
  "error": {
    "code": "EVALUATION_FAILED",
    "message": "Human readable message",
    "details": {}
  },
  "timestamp": "ISO8601"
}
```

### Communication Patterns

**Webhook Trigger Invocation:**
```javascript
// Standard pattern for calling another SRIS workflow
const response = await $http.request({
  method: 'POST',
  url: 'https://n8n.wranngle.com/webhook/sris-evaluator',
  headers: { 'Content-Type': 'application/json' },
  body: {
    run_id: $json.run_id,
    timestamp: new Date().toISOString(),
    source: 'SRIS Master Orchestrator',
    data: $json.payload
  }
});
```

**Event Naming Convention:**
```
{system}.{component}.{action}
```
- Examples: `sris.evaluator.completed`, `sris.orchestrator.triggered`, `sris.fix.applied`

### Process Patterns

**Error Handling in Code Nodes:**
```javascript
try {
  const result = processData($json);
  return { success: true, data: result };
} catch (error) {
  return {
    success: false,
    error: { code: 'PROCESSING_ERROR', message: error.message }
  };
}
```

**Circuit Breaker Pattern:**
```javascript
const failureCount = $('Get Failure Count').item.json.count || 0;
const CIRCUIT_BREAKER_THRESHOLD = 3;

if (failureCount >= CIRCUIT_BREAKER_THRESHOLD) {
  return { action: 'HALT', reason: `Circuit breaker: ${failureCount} failures`, escalate: true };
}
```

### Enforcement Guidelines

**All AI Agents MUST:**
1. Use `[PHASE]` prefix in all workflow names
2. Use `/webhook/{system}-{component}` format for webhook paths
3. Include `run_id` and `timestamp` in all inter-workflow payloads
4. Use `success: boolean` wrapper in all response payloads
5. Implement try/catch in all Code nodes
6. Follow snake_case for JSON output fields, camelCase for internal variables

**Pattern Enforcement:**
- Pre-deploy hook validates workflow naming
- Governance.yaml tracks phase assignments
- Code review via `validate_workflow` MCP tool

## Project Structure & Boundaries

### Local Repository Structure

```
n8n/
├── .claude/
│   ├── hooks/                      # Enforcement layer
│   │   ├── detect-workflow-intent.js
│   │   ├── workflow-governance.js
│   │   ├── pre-deploy-check.js
│   │   └── post-deploy-log.js
│   ├── skills/                     # Protocol knowledge
│   │   └── n8n-workflow-dev/
│   ├── logs/                       # Supervision logs
│   │   └── supervision-log.jsonl
│   └── settings.json
├── workflows/
│   ├── dev/                        # Modifiable DEV phase
│   │   ├── [DEV] SRIS - *.json
│   │   └── pipeline-test-*.json
│   ├── staging/                    # Pre-production testing
│   └── production/                 # Immutable production
├── context/
│   ├── elevenlabs-agents/
│   │   └── governance.yaml         # Agent phase tracking
│   └── workflow-patterns/
├── docs/
│   ├── architecture.md             # System design
│   └── self-referential-improvement-system.md
├── _bmad-output/
│   └── planning-artifacts/
│       ├── prd.md                  # Product requirements
│       └── architecture.md         # THIS DOCUMENT
├── CLAUDE.md                       # Protocol reference
└── governance.yaml                 # Workflow phase tracking
```

### n8n Instance Structure

```
https://n8n.wranngle.com/
├── Workflows/
│   ├── [DEV] SRIS - Master Orchestrator     (ID: 4TqaQ6kORDzZVwVP)
│   │   └── Webhook: /webhook/sris-orchestrator
│   ├── [DEV] SRIS - ElevenLabs Evaluator    (ID: RjLiUAiuUs5XPvBj)
│   │   └── Webhook: /webhook/elevenlabs-conversation-eval
│   ├── [DEV] SRIS - Verification Loop       (ID: KoQChBtjUa5F9bZg)
│   │   └── Webhook: /webhook/verification-loop
│   └── [INACTIVE] Autorefinement Orchestrator v2 (ID: c9dFlI51VhvANoEj)
│       └── Webhook: /webhook/autorefinement-trigger
├── Credentials/
│   └── ElevenLabs API (ID: eR7srDUHDyZLIZgh)
└── Executions/
    └── [State persistence for verification]
```

### Architectural Boundaries

**Workflow Communication Boundary:**
```
┌─────────────────────────────────────────────────────────────────┐
│                    SRIS INTERNAL BOUNDARY                        │
│                                                                  │
│  Master Orchestrator ←→ Evaluators ←→ Aggregator ←→ Verification│
│                                                                  │
│  Communication: Webhooks with JSON payloads                     │
│  State: n8n execution data + external history store              │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    EXTERNAL API BOUNDARY                         │
│                                                                  │
│  • ElevenLabs API (simulate-conversation, agent management)     │
│  • n8n API (workflow CRUD, execution retrieval)                  │
│  • Slack API (alerting webhooks)                                 │
│  • Supabase/Airtable (optional history store)                   │
└─────────────────────────────────────────────────────────────────┘
```

**Data Boundaries:**
| Data Type | Boundary | Retention |
|-----------|----------|-----------|
| Metrics snapshots | SRIS Internal | 30 days |
| Fix history | History Store | 90 days |
| Conversation transcripts | ElevenLabs API | Per ElevenLabs policy |
| Workflow JSON | Git repository | Permanent |

### Requirements to Structure Mapping

| Requirement ID | Component | Location |
|----------------|-----------|----------|
| FR1-6 (Protocol) | Hooks | `.claude/hooks/` |
| FR14-20 (Governance) | YAML + Hooks | `governance.yaml` |
| FR21-27 (Validation) | n8n-MCP | MCP server |
| FR54-58 (Self-Correction) | SRIS Workflows | n8n instance |
| NFR: <100ms hook latency | JavaScript hooks | Local execution |
| NFR: 99.5% MCP availability | n8n-MCP server | External dependency |

### Integration Points

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Claude Code   │────▶│   Hook System   │────▶│   SRIS Master   │
│   CLI Session   │     │   (Local JS)    │     │   Orchestrator  │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                                                        │
                        ┌───────────────────────────────┼───────────────────────────────┐
                        ▼                               ▼                               ▼
                ┌───────────────┐              ┌───────────────┐              ┌───────────────┐
                │   n8n Stack   │              │  ElevenLabs   │              │   History     │
                │   Evaluator   │              │   Evaluator   │              │    Store      │
                └───────────────┘              └───────────────┘              └───────────────┘
                        │                               │                               │
                        └───────────────────────────────┼───────────────────────────────┘
                                                        ▼
                                                ┌───────────────┐
                                                │   Threshold   │
                                                │   Evaluator   │
                                                └───────────────┘
                                                        │
                                        ┌───────────────┼───────────────┐
                                        ▼               ▼               ▼
                                    CRITICAL        WARNING           OK
                                        │               │               │
                                        ▼               ▼               ▼
                                ┌───────────────┐ ┌───────────┐ ┌───────────┐
                                │ Autorefinement│ │   Queue   │ │   Log     │
                                │    Trigger    │ │  Review   │ │   Only    │
                                └───────────────┘ └───────────┘ └───────────┘
```

## Architecture Validation

### Completeness Check

| Category | Status | Notes |
|----------|--------|-------|
| Requirements Coverage | ✅ | FR1-58 mapped to components |
| NFR Compliance | ✅ | Latency, availability, security addressed |
| Cross-Cutting Concerns | ✅ | 9 concerns identified with mitigations |
| Data Architecture | ✅ | State persistence, history store defined |
| Error Handling | ✅ | Circuit breaker, timeouts, isolation |
| Security | ✅ | Credential management, no secrets in VCS |

### Coherence Validation

| Check | Result |
|-------|--------|
| Naming conventions consistent | ✅ `[PHASE] System - Component` |
| Webhook paths follow pattern | ✅ `/webhook/{system}-{component}` |
| JSON payloads standardized | ✅ run_id, timestamp, data, metadata |
| Error formats unified | ✅ success, error.code, error.message |
| Thresholds aligned | ✅ Unified severity matrix |

### Risk Assessment

| Risk | Severity | Mitigation |
|------|----------|------------|
| ElevenLabs API unavailability | MEDIUM | Circuit breaker, graceful degradation |
| Recursive fix-storm | HIGH | Circuit breaker after 3 failures |
| State loss during rollback | MEDIUM | Pre-fix snapshots to external store |
| Timeout cascade | MEDIUM | 30s evaluator / 120s total limits |

### Open Items for Implementation

1. **History Store Selection**: Choose between Supabase and Airtable based on query patterns
2. **Alerting Channel**: Configure Slack webhook URL
3. **Retention Automation**: Implement 30/90 day cleanup jobs
4. **Canary Deployment**: Deferred to post-MVP

---

_Architecture document generated via BMAD create-architecture workflow_
_Ready for implementation readiness check_
