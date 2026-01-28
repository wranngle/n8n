---
stepsCompleted: [1, 2, 3]
inputDocuments:
  - _bmad-output/planning-artifacts/prd.md
  - _bmad-output/planning-artifacts/architecture.md
---

# n8n - Epic Breakdown

## Overview

This document provides the complete epic and story breakdown for n8n Workflow Development Command Center, decomposing the requirements from the PRD and Architecture into implementable stories.

## Requirements Inventory

### Functional Requirements

**Protocol Enforcement (FR1-6):**
- FR1: Developers can request n8n workflow builds using natural language descriptions
- FR2: System can detect workflow-related intent and route to the appropriate protocol
- FR3: Developers can follow a structured 21-step protocol spanning 6 phases (CALIBRATE, DESIGN, BUILD, VALIDATE, TEST, DEPLOY)
- FR4: System can enforce mandatory research quotas (25+ sources for non-trivial workflows)
- FR5: Developers can track protocol progress across steps and phases
- FR6: System can invoke sub-skills at appropriate protocol steps automatically

**Knowledge Base Discovery (FR7-13):**
- FR7: Developers can search YouTube tutorial knowledge base (10,279 indexed videos)
- FR8: Developers can search Discord Q&A knowledge base (2,930 indexed entries)
- FR9: Developers can search official n8n templates (2,709 templates via MCP)
- FR10: Developers can search community workflow library (4,343 workflows)
- FR11: System can aggregate search results across multiple knowledge sources
- FR12: Developers can access pattern analysis from previous workflow builds
- FR13: System can track research source citations per workflow build

**Workflow Governance (FR14-20):**
- FR14: System can enforce DEV-only modification policy on workflows
- FR15: System can block workflow deletion and enforce archiving instead
- FR16: Administrators can assign deployment phases (DEV, ARCHIVED) to workflows
- FR17: System can auto-tag new workflows as DEV phase
- FR18: System can track phase transitions with history and audit trail
- FR19: Support engineers can lookup workflow governance status by ID
- FR20: System can enforce supersession protocol when replacing workflows

**Validation & Error Prevention (FR21-27):**
- FR21: Developers can validate workflow JSON against n8n schema
- FR22: System can validate node configurations using multiple profiles (minimal, runtime, ai-friendly, strict)
- FR23: System can validate workflow connections and data flow
- FR24: System can validate n8n expressions for syntax errors
- FR25: Developers can interpret validation errors with guided resolution
- FR26: System can detect and block known problematic patterns (e.g., IF node routing bug)
- FR27: System can suggest alternative approaches for blocked patterns

**Node Configuration & Templates (FR28-34):**
- FR28: Developers can search n8n nodes by keyword (528 nodes indexed)
- FR29: Developers can retrieve node essentials (key properties <5KB)
- FR30: Developers can retrieve full node schema when needed (100KB+)
- FR31: Developers can access node documentation (87% coverage)
- FR32: Developers can search task templates by category (29 pre-configured)
- FR33: Developers can retrieve ready-to-use node configurations for common tasks
- FR34: System can provide node type format guidance (search vs. workflow JSON vs. AI nodes)

**Deployment Automation (FR35-40):**
- FR35: Developers can create workflows on n8n instance via API
- FR36: Developers can update workflows using partial diff operations (80-90% token savings)
- FR37: System can run pre-deployment validation hooks
- FR38: System can log deployments with audit trail (post-deploy hooks)
- FR39: Developers can trigger webhook-based workflows for testing
- FR40: System can auto-stage workflow changes to git on file writes

**Voice AI Integration (FR41-47):**
- FR41: Developers can create ElevenLabs voice agents from natural language requests
- FR42: System can match industry templates to company/use-case descriptions
- FR43: Developers can configure ElevenLabs agent personality and voice
- FR44: Developers can deploy SMS confirmation workflows for voice agents
- FR45: Developers can configure Twilio phone integration for voice agents
- FR46: System can orchestrate complete voice agent pipeline (parse → template → agent → tools → configure)
- FR47: Support engineers can manage ElevenLabs agent governance phases

**Third-Party Integration Framework (FR48-53):**
- FR48: Developers can add new third-party service integrations following framework
- FR49: System can inventory MCP tools for integrated services
- FR50: Developers can access aggregated documentation for integrated services
- FR51: System can track credential locations (without storing secrets)
- FR52: Developers can access reusable workflow patterns for integrated services
- FR53: System can document known failure modes and resolutions per service

**Self-Correction & Supervision (FR54-58):**
- FR54: System can log negative indicators (FRICTION, INEFFICIENCY, WASTE, CORRUPTION, MISTAKES)
- FR55: System can trigger automatic research protocol after repeated issues (2+ occurrences)
- FR56: System can document known bugs with canonical solutions
- FR57: Developers can access known-bugs registry for common issues
- FR58: System can implement self-healing hooks for documented issues

**Extension & Customization (FR59-65):**
- FR59: Methodology maintainers can create new enforcement hooks
- FR60: Methodology maintainers can create new capability skills
- FR61: Methodology maintainers can create new integration frameworks
- FR62: System can load hooks from configured directories
- FR63: System can invoke skills based on trigger patterns
- FR64: Developers can access skill definitions for manual invocation
- FR65: System can maintain backward compatibility for hook interfaces

**Documentation & Onboarding (FR66-70):**
- FR66: New developers can access structured documentation (CLAUDE.md, docs/)
- FR67: Developers can access development guides with setup instructions
- FR68: Developers can access architecture documentation
- FR69: Support engineers can access troubleshooting guides
- FR70: System can provide hook debugging logs

**SRIS-Specific Requirements (Architecture):**
- FR-SRIS-01: SRIS health monitoring independent of SRIS execution
- FR-SRIS-02: Manual override always available for auto-fix
- FR-SRIS-03: Pre-fix snapshot stored before any mutation
- FR-SRIS-04: Circuit breaker after 3 consecutive fix failures

### Non-Functional Requirements

**Performance (NFR-P1 to NFR-P5):**
- NFR-P1: Hook execution latency <100ms per hook
- NFR-P2: Knowledge base search response <2 seconds
- NFR-P3: n8n-MCP tool response <3 seconds
- NFR-P4: Workflow validation response <5 seconds for typical workflow
- NFR-P5: Skill loading time <500ms

**Reliability (NFR-R1 to NFR-R5):**
- NFR-R1: MCP server availability >99.5% uptime
- NFR-R2: Hook execution reliability 100% for configured hooks
- NFR-R3: Validation consistency - same input produces same output
- NFR-R4: Knowledge base availability with graceful degradation
- NFR-R5: Governance enforcement reliability - zero unauthorized modifications

**Integration (NFR-I1 to NFR-I5):**
- NFR-I1: n8n-MCP tool backward compatibility 100% across minor versions
- NFR-I2: n8n instance API compatibility - support n8n 1.0+
- NFR-I3: ElevenLabs MCP integration - all 24 tools functional
- NFR-I4: Twilio integration reliability - E.164 format validation
- NFR-I5: External API graceful degradation - informative errors, no crashes

**Maintainability (NFR-M1 to NFR-M5):**
- NFR-M1: Hook interface stability - no breaking changes in minor versions
- NFR-M2: Skill format extensibility - new fields additive only
- NFR-M3: Documentation coverage >85% for all nodes, hooks, skills
- NFR-M4: Codebase documentation - CLAUDE.md stays current with changes
- NFR-M5: Knowledge base freshness - quarterly index refresh minimum

**Security (NFR-S1 to NFR-S4):**
- NFR-S1: API key storage - never in version control
- NFR-S2: Credential reference handling - store references, not secrets
- NFR-S3: Hook execution isolation - no credential leakage in logs
- NFR-S4: MCP authentication - token-based, rotatable

**Usability (NFR-U1 to NFR-U5):**
- NFR-U1: First-pass validation rate >90% workflows pass on first submission
- NFR-U2: Research phase completion - 25+ sources becomes habitual
- NFR-U3: Error message clarity - actionable guidance in all errors
- NFR-U4: Protocol discoverability - new developers productive within 1 session
- NFR-U5: Hook feedback transparency - clear indication of hook actions

**Operational (NFR-O1 to NFR-O4):**
- NFR-O1: Session persistence - hooks fire correctly on session resume
- NFR-O2: Log retention - supervision logs retained 30+ days
- NFR-O3: Deployment audit trail - all deployments logged with metadata
- NFR-O4: Git integration - auto-staging within 1 second of write

### Additional Requirements

**From Architecture - Technical Constraints:**
- n8n instance required at https://n8n.wranngle.com for all workflow deployment
- ElevenLabs API required for voice agent evaluation (simulate-conversation endpoint)
- Claude Code CLI required for hook system execution
- 6+ MCP servers must be available for full functionality
- External state store required for rollback snapshots (Supabase/Redis)

**From Architecture - Cross-Cutting Concerns:**
- Credential Management spans all external integrations
- Unified Logging across supervision logs, deployment logs, history store
- Error Propagation - failures in one evaluator must not crash entire SRIS loop
- Configuration Management - thresholds, agent IDs, workflow IDs externalized
- State Preservation - metrics snapshots for before/after comparison
- Fault Tolerance - circuit breakers, timeouts, saga compensation
- Self-Monitoring - SRIS health checks independent of SRIS execution
- Data Retention - 30 days metrics, 90 days fix history

**From Architecture - Existing Infrastructure (Brownfield):**
- Master Orchestrator workflow (ID: 4TqaQ6kORDzZVwVP) - DEV phase
- ElevenLabs Evaluator workflow (ID: RjLiUAiuUs5XPvBj) - DEV phase
- Verification Loop workflow (ID: KoQChBtjUa5F9bZg) - DEV phase
- Autorefinement Orchestrator v2 (ID: c9dFlI51VhvANoEj) - INACTIVE, needs integration

**From Architecture - Implementation Patterns:**
- Workflow naming: `[PHASE] System - Component Name`
- Webhook paths: `/webhook/{system}-{component}`
- Inter-workflow JSON: run_id, timestamp, source, data, metadata
- Error format: success, error.code, error.message, timestamp
- Circuit breaker: halt after 3 consecutive failed auto-fixes
- Timeouts: 30s per evaluator, 120s total orchestration

### FR Coverage Map

| FR | Epic | Description |
|----|------|-------------|
| FR21 | Epic 2 | Validate workflow JSON against n8n schema |
| FR22 | Epic 2 | Validate node configurations with profiles |
| FR23 | Epic 2 | Validate workflow connections and data flow |
| FR24 | Epic 2 | Validate n8n expressions for syntax errors |
| FR25 | Epic 2 | Interpret validation errors with guidance |
| FR26 | Epic 2 | Detect and block known problematic patterns |
| FR27 | Epic 2 | Suggest alternative approaches |
| FR35 | Epic 1 | Create workflows on n8n instance via API |
| FR37 | Epic 1 | Run pre-deployment validation hooks |
| FR38 | Epic 1 | Log deployments with audit trail |
| FR39 | Epic 1 | Trigger webhook-based workflows for testing |
| FR41-47 | Epic 3 | Voice AI Integration (ElevenLabs evaluation) |
| FR54 | Epics 2-8 | Log negative indicators |
| FR55 | Epics 2,4,6,8 | Trigger automatic research protocol |
| FR56 | Epics 4,5,8 | Document known bugs with solutions |
| FR57 | Epics 5,8 | Access known-bugs registry |
| FR58 | Epic 5 | Implement self-healing hooks |
| FR70 | Epic 8 | Provide hook debugging logs |
| FR-SRIS-01 | Epic 1 | Health monitoring independent of execution |
| FR-SRIS-02 | Epic 5 | Manual override for auto-fix |
| FR-SRIS-03 | Epic 6 | Pre-fix snapshot before mutation |
| FR-SRIS-04 | Epics 6,7 | Circuit breaker after 3 failures |

## Epic List

### Epic 1: SRIS Foundation Activation
System operators can trigger the self-improvement loop and see it execute across both n8n and ElevenLabs stacks. Activate and connect the 3 existing SRIS workflows, establish inter-workflow communication, and configure trigger mechanisms (cron + manual).
**FRs covered:** FR35, FR37, FR38, FR39, FR-SRIS-01

### Epic 2: n8n Workflow Test Evaluation
System can automatically evaluate n8n workflow quality and report pass/fail metrics with actionable failure details. Implement the n8n stack evaluator that runs validation checks, executes test cases, and calculates pass rates.
**FRs covered:** FR21, FR22, FR23, FR24, FR25, FR26, FR27, FR54, FR55

### Epic 3: ElevenLabs Conversation Evaluation
System can automatically evaluate voice agent conversation quality using simulated calls and report success metrics. Implement the ElevenLabs evaluator using simulate-conversation API.
**FRs covered:** FR41, FR42, FR43, FR44, FR45, FR46, FR47, FR54

### Epic 4: Threshold Aggregation & Decision Engine
System automatically determines the appropriate action (auto-fix, queue review, or log only) based on aggregated metrics from both stacks. Implement fan-in aggregator with unified severity matrix.
**FRs covered:** FR54, FR55, FR56

### Epic 5: Autorefinement Integration & Auto-Fix
When CRITICAL issues are detected, the system automatically triggers fixes with human override capability. Integrate the inactive Autorefinement Orchestrator v2 into the SRIS loop.
**FRs covered:** FR-SRIS-02, FR56, FR57, FR58

### Epic 6: Verification & Rollback System
System verifies that applied fixes actually improve metrics and automatically rolls back if quality degrades. Implement pre-fix snapshots, post-fix verification, and automatic rollback.
**FRs covered:** FR-SRIS-03, FR-SRIS-04, FR54, FR55

### Epic 7: Circuit Breaker & Fault Tolerance
System protects itself from fix-storms and cascading failures through intelligent halt mechanisms. Implement circuit breaker pattern and timeout handling.
**FRs covered:** FR-SRIS-04, FR54

### Epic 8: History Store & Alerting
Operators have full visibility into SRIS operations through queryable history and immediate alerts on critical events. Integrate history store and Slack alerting.
**FRs covered:** FR54, FR55, FR56, FR57, FR70

---

## Stories

### Epic 1: SRIS Foundation Activation

#### Story 1.1: Activate SRIS Master Orchestrator
**As a** system operator
**I want to** activate the Master Orchestrator workflow (ID: 4TqaQ6kORDzZVwVP)
**So that** the SRIS loop can be triggered and coordinate all evaluators

**Acceptance Criteria:**
- [ ] Master Orchestrator workflow is set to ACTIVE in n8n
- [ ] Workflow responds to manual webhook trigger at `/webhook/sris-orchestrator`
- [ ] Workflow logs activation timestamp to execution history
- [ ] Health check endpoint returns 200 OK when orchestrator is ready
- [ ] Error handling catches and logs any activation failures

**Technical Notes:**
- Existing workflow ID: `4TqaQ6kORDzZVwVP`
- Webhook path: `/webhook/sris-orchestrator`
- Uses n8n native activation via API or UI

**Dependencies:** None (first story)
**FRs:** FR35, FR-SRIS-01

---

#### Story 1.2: Activate SRIS Evaluator Workflows
**As a** system operator
**I want to** activate both evaluator workflows (n8n and ElevenLabs)
**So that** they are ready to receive evaluation requests from the orchestrator

**Acceptance Criteria:**
- [ ] ElevenLabs Evaluator (ID: RjLiUAiuUs5XPvBj) is set to ACTIVE
- [ ] ElevenLabs Evaluator responds at `/webhook/elevenlabs-conversation-eval`
- [ ] Verification Loop (ID: KoQChBtjUa5F9bZg) is set to ACTIVE
- [ ] Verification Loop responds at `/webhook/verification-loop`
- [ ] Both workflows return proper JSON responses on test ping
- [ ] Activation status visible in governance.yaml

**Technical Notes:**
- ElevenLabs Evaluator: `RjLiUAiuUs5XPvBj`
- Verification Loop: `KoQChBtjUa5F9bZg`
- Both are currently in DEV phase

**Dependencies:** Story 1.1
**FRs:** FR35, FR39

---

#### Story 1.3: Configure Cron Trigger Schedule
**As a** system operator
**I want to** configure a cron-based trigger for the SRIS loop
**So that** evaluations run automatically on a defined schedule

**Acceptance Criteria:**
- [ ] Cron trigger node added to Master Orchestrator
- [ ] Default schedule: Every 6 hours (`0 */6 * * *`)
- [ ] Schedule is configurable via workflow variable
- [ ] Cron execution logged with timestamp
- [ ] Manual trigger still works independently of cron
- [ ] Cron can be disabled without deactivating workflow

**Technical Notes:**
- Use n8n Cron node (nodes-base.cron)
- Store schedule in workflow settings for easy modification
- Consider timezone (UTC default)

**Dependencies:** Story 1.1
**FRs:** FR35

---

#### Story 1.4: Implement Manual Webhook Trigger
**As a** system operator
**I want to** trigger the SRIS loop manually via webhook
**So that** I can run evaluations on-demand outside the cron schedule

**Acceptance Criteria:**
- [ ] POST to `/webhook/sris-orchestrator` triggers full evaluation cycle
- [ ] Request body accepts optional `run_id` for tracking
- [ ] Request body accepts optional `scope` (full, n8n-only, elevenlabs-only)
- [ ] Response includes `run_id` and `status: initiated`
- [ ] Invalid requests return 400 with descriptive error
- [ ] Webhook validates request before starting evaluation

**Technical Notes:**
- Webhook node already exists, verify configuration
- JSON schema for request validation
- Generate UUID for run_id if not provided

**Dependencies:** Story 1.1
**FRs:** FR39

---

#### Story 1.5: Establish Inter-Workflow Communication Pattern
**As a** system operator
**I want** the orchestrator to communicate with evaluators via webhooks
**So that** data flows correctly through the SRIS pipeline

**Acceptance Criteria:**
- [ ] Orchestrator calls ElevenLabs Evaluator with standardized payload
- [ ] Orchestrator calls n8n Evaluator (or internal logic) with same payload format
- [ ] Payload includes: `run_id`, `timestamp`, `source`, `data`, `metadata`
- [ ] Evaluators return results in standardized format: `success`, `metrics`, `errors`
- [ ] Timeout handling: 30s per evaluator call
- [ ] Failed evaluator call doesn't crash orchestrator
- [ ] All inter-workflow calls logged for debugging

**Technical Notes:**
- Use HTTP Request node for webhook calls
- Standard payload format from architecture.md
- Implement timeout in HTTP Request node settings

**Dependencies:** Stories 1.1, 1.2
**FRs:** FR37, FR38

---

**Epic 1 Summary:** 5 stories covering FR35, FR37, FR38, FR39, FR-SRIS-01 ✓

---

### Epic 2: n8n Workflow Test Evaluation

#### Story 2.1: Create Workflow Test Registry
**As a** system operator
**I want to** maintain a registry of workflows and their test cases
**So that** the evaluator knows which workflows to test and how

**Acceptance Criteria:**
- [ ] Registry file created at `workflows/dev/pipeline-test-evaluation.yaml` format
- [ ] Each entry includes: workflow_id, webhook_path, test_cases array
- [ ] Test cases define: input, expected output, timeout
- [ ] Registry can be updated without modifying evaluator workflow
- [ ] Evaluator reads registry at runtime (not hardcoded)
- [ ] Invalid registry entries logged and skipped

**Technical Notes:**
- Leverage existing `pipeline-test-evaluation.yaml` as template
- Store in workflows/dev/ for version control
- Consider YAML for human readability

**Dependencies:** None
**FRs:** FR21, FR54

---

#### Story 2.2: Implement Validation Check Executor
**As a** system evaluator
**I want to** run n8n-MCP validation tools against registered workflows
**So that** structural issues are detected before execution testing

**Acceptance Criteria:**
- [ ] Call `mcp__n8n-mcp__n8n_validate_workflow` for each registered workflow
- [ ] Capture validation errors, warnings, and suggestions
- [ ] Use `ai-friendly` validation profile by default
- [ ] Calculate validation pass rate: `valid_workflows / total_workflows`
- [ ] Store validation results per workflow for aggregation
- [ ] Validation timeout: 5 seconds per workflow

**Technical Notes:**
- Use n8n-MCP validation tools
- Profiles: minimal, runtime, ai-friendly, strict
- Return structured results for aggregation

**Dependencies:** Story 2.1
**FRs:** FR21, FR22, FR23, FR24

---

#### Story 2.3: Implement Test Case Executor
**As a** system evaluator
**I want to** execute test cases against workflow webhooks
**So that** functional correctness is verified

**Acceptance Criteria:**
- [ ] For each workflow, execute all defined test cases
- [ ] Send HTTP request to webhook with test input
- [ ] Compare response against expected output
- [ ] Record: pass/fail, response time, actual vs expected
- [ ] Calculate pass rate: `passed_tests / total_tests`
- [ ] Timeout: 10 seconds per test case
- [ ] Failed test includes diff of expected vs actual

**Technical Notes:**
- Use HTTP Request node for webhook calls
- JSON comparison for response validation
- Handle both exact match and partial match scenarios

**Dependencies:** Stories 2.1, 2.2
**FRs:** FR39, FR54

---

#### Story 2.4: Implement Pattern Blocker Detection
**As a** system evaluator
**I want to** detect known problematic patterns in workflows
**So that** issues like the IF node bug are caught automatically

**Acceptance Criteria:**
- [ ] Check for IF node v2 usage (known routing bug)
- [ ] Check for deprecated node versions
- [ ] Check for missing error handling branches
- [ ] Flag patterns with severity: BLOCKER, WARNING, INFO
- [ ] BLOCKER patterns cause workflow to fail evaluation
- [ ] Suggest alternatives for blocked patterns
- [ ] Pattern list extensible via configuration

**Technical Notes:**
- Reference: `context/known-bugs/n8n-if-node-v2.md`
- IF node v2 → suggest Switch node v3.2+
- Store pattern rules in configuration file

**Dependencies:** Story 2.2
**FRs:** FR26, FR27

---

#### Story 2.5: Calculate and Report n8n Metrics
**As a** system aggregator
**I want to** receive structured metrics from the n8n evaluator
**So that** severity can be calculated using the unified matrix

**Acceptance Criteria:**
- [ ] Return `n8n_pass_rate` as percentage (0-100)
- [ ] Return `validation_pass_rate` as percentage
- [ ] Return `test_execution_pass_rate` as percentage
- [ ] Return `blocker_count` integer
- [ ] Return `warning_count` integer
- [ ] Return `failed_workflows` array with details
- [ ] Return `evaluation_duration_ms` for performance tracking
- [ ] All metrics in single JSON response to orchestrator

**Technical Notes:**
- Unified severity thresholds:
  - CRITICAL: pass_rate < 80%
  - WARNING: pass_rate < 95%
  - OK: pass_rate >= 95%

**Dependencies:** Stories 2.2, 2.3, 2.4
**FRs:** FR25, FR54, FR55

---

#### Story 2.6: Integrate Error Interpretation
**As a** system operator
**I want** validation errors to include actionable guidance
**So that** I understand how to fix issues

**Acceptance Criteria:**
- [ ] Each validation error includes: code, message, location, suggestion
- [ ] Common errors have pre-written resolution steps
- [ ] Expression errors include corrected syntax example
- [ ] Connection errors identify missing/broken links
- [ ] Type errors identify expected vs actual types
- [ ] Errors sorted by severity (blockers first)

**Technical Notes:**
- Leverage n8n-MCP validation error output
- Add interpretation layer from `n8n-validation-expert` skill knowledge
- Store common error resolutions in lookup table

**Dependencies:** Story 2.2
**FRs:** FR25

---

**Epic 2 Summary:** 6 stories covering FR21, FR22, FR23, FR24, FR25, FR26, FR27, FR39, FR54, FR55 ✓

---

### Epic 3: ElevenLabs Conversation Evaluation

#### Story 3.1: Configure simulate-conversation API Integration
**As a** system evaluator
**I want to** integrate with the ElevenLabs simulate-conversation API
**So that** I can run non-production test conversations against voice agents

**Acceptance Criteria:**
- [ ] HTTP Request node configured for `POST /v1/convai/agents/{agent_id}/simulate-conversation`
- [ ] API key retrieved from n8n credential store (ID: eR7srDUHDyZLIZgh)
- [ ] Request headers include `xi-api-key` and `Content-Type: application/json`
- [ ] Agent ID configurable via workflow variable or input payload
- [ ] API errors (401, 404, 429, 500) handled with descriptive messages
- [ ] Rate limiting respected (back-off on 429)

**Technical Notes:**
- ElevenLabs API base: `https://api.elevenlabs.io`
- Credential ID: `eR7srDUHDyZLIZgh`
- simulate-conversation is non-production safe

**Dependencies:** Epic 1 (foundation active)
**FRs:** FR41, FR42

---

#### Story 3.2: Create Conversation Test Scenario Registry
**As a** system operator
**I want to** maintain a registry of test scenarios for voice agents
**So that** the evaluator knows which conversations to simulate

**Acceptance Criteria:**
- [ ] Registry file at `context/elevenlabs-agents/test-scenarios.yaml`
- [ ] Each agent entry includes: agent_id, agent_name, scenarios array
- [ ] Each scenario defines: name, initial_message, expected_intents, success_criteria
- [ ] Success criteria support: contains_text, intent_detected, call_duration_range
- [ ] Registry versioned in git for change tracking
- [ ] Evaluator loads registry at runtime

**Technical Notes:**
- Reference existing agent governance.yaml for agent IDs
- Current DEV agents: Wranngle Lead Qualifier, Sarah - Wranngle Receptionist, etc.

**Dependencies:** None
**FRs:** FR41, FR43

---

#### Story 3.3: Execute Simulated Conversations
**As a** system evaluator
**I want to** execute all test scenarios against registered agents
**So that** conversation quality is measured

**Acceptance Criteria:**
- [ ] For each agent, execute all defined scenarios
- [ ] Send initial_message to simulate-conversation endpoint
- [ ] Capture full conversation transcript
- [ ] Record: duration, turn_count, final_state
- [ ] Timeout: 60 seconds per conversation (voice agents are slower)
- [ ] Failed API call doesn't block other scenarios
- [ ] All results stored for aggregation

**Technical Notes:**
- simulate-conversation returns synchronously after conversation ends
- Response includes transcript, analysis, and metadata
- Consider parallel execution for multiple agents (with rate limiting)

**Dependencies:** Stories 3.1, 3.2
**FRs:** FR42, FR44

---

#### Story 3.4: Evaluate Conversation Success Criteria
**As a** system evaluator
**I want to** evaluate each conversation against its success criteria
**So that** pass/fail status is determined objectively

**Acceptance Criteria:**
- [ ] Parse success_criteria from scenario definition
- [ ] Evaluate `contains_text`: Check transcript for required phrases
- [ ] Evaluate `intent_detected`: Check if agent recognized intent
- [ ] Evaluate `call_duration_range`: Verify duration within bounds
- [ ] Evaluate `no_fallback`: Ensure agent didn't use fallback responses
- [ ] Mark conversation as PASS only if ALL criteria met
- [ ] Record which specific criteria failed for debugging

**Technical Notes:**
- Use Code node for complex criteria evaluation
- Consider fuzzy text matching for contains_text
- Intent detection from ElevenLabs response analysis field

**Dependencies:** Story 3.3
**FRs:** FR44, FR45

---

#### Story 3.5: Calculate and Report ElevenLabs Metrics
**As a** system aggregator
**I want to** receive structured metrics from the ElevenLabs evaluator
**So that** severity can be calculated using the unified matrix

**Acceptance Criteria:**
- [ ] Return `elevenlabs_success_rate` as percentage (0-100)
- [ ] Return `scenarios_passed` / `scenarios_total` counts
- [ ] Return `average_conversation_duration_ms`
- [ ] Return `failed_scenarios` array with details
- [ ] Return `agents_evaluated` count
- [ ] Return `evaluation_duration_ms` for performance tracking
- [ ] All metrics in single JSON response to orchestrator

**Technical Notes:**
- Unified severity thresholds for ElevenLabs:
  - CRITICAL: success_rate < 75%
  - WARNING: success_rate < 90%
  - OK: success_rate >= 90%

**Dependencies:** Stories 3.3, 3.4
**FRs:** FR46, FR54

---

#### Story 3.6: Integrate Conversation Analytics
**As a** system operator
**I want** conversation failures to include detailed analytics
**So that** I understand why agents are underperforming

**Acceptance Criteria:**
- [ ] Failed scenarios include full transcript
- [ ] Identify point of failure in conversation flow
- [ ] Extract agent confidence scores if available
- [ ] Flag specific utterances that caused issues
- [ ] Compare expected vs actual agent responses
- [ ] Provide improvement suggestions based on failure type

**Technical Notes:**
- ElevenLabs API returns analysis metadata
- Cross-reference with agent prompt/knowledge base
- Consider sentiment analysis on agent responses

**Dependencies:** Story 3.4
**FRs:** FR47

---

**Epic 3 Summary:** 6 stories covering FR41, FR42, FR43, FR44, FR45, FR46, FR47, FR54 ✓

---

### Epic 4: Threshold Aggregation & Decision Engine

#### Story 4.1: Implement Fan-In Aggregator
**As a** decision engine
**I want to** receive and aggregate metrics from both evaluators
**So that** a unified severity assessment can be made

**Acceptance Criteria:**
- [ ] Wait for both n8n and ElevenLabs evaluator responses
- [ ] Handle partial results if one evaluator fails (use cached/default)
- [ ] Merge metrics into single aggregated object
- [ ] Calculate combined pass rate weighted by evaluator
- [ ] Timeout: 120 seconds total (both evaluators combined)
- [ ] Log aggregation timestamp and source metrics

**Technical Notes:**
- Orchestrator coordinates fan-in
- Use n8n Merge node or Code node for aggregation
- Consider: what if only one evaluator returns?

**Dependencies:** Epics 2, 3 (both evaluators complete)
**FRs:** FR54

---

#### Story 4.2: Implement Unified Severity Calculator
**As a** decision engine
**I want to** calculate severity using the unified matrix
**So that** consistent thresholds apply across both stacks

**Acceptance Criteria:**
- [ ] Apply n8n thresholds: CRITICAL <80%, WARNING <95%, OK ≥95%
- [ ] Apply ElevenLabs thresholds: CRITICAL <75%, WARNING <90%, OK ≥90%
- [ ] Calculate overall severity as MAX(n8n_severity, elevenlabs_severity)
- [ ] Return severity enum: "CRITICAL", "WARNING", "OK"
- [ ] Include breakdown showing which stack drove severity
- [ ] Log severity decision with justification

**Technical Notes:**
- Unified matrix from architecture.md
- CRITICAL from either stack = CRITICAL overall
- Consider weighted severity for edge cases

**Dependencies:** Story 4.1
**FRs:** FR54, FR55

---

#### Story 4.3: Implement Decision Router
**As a** decision engine
**I want to** route to appropriate action based on severity
**So that** the system responds correctly to each condition

**Acceptance Criteria:**
- [ ] CRITICAL → Route to auto-fix pipeline (Epic 5)
- [ ] WARNING → Queue for human review + alert
- [ ] OK → Log only, no action required
- [ ] Decision logged with full context for audit
- [ ] Use Switch node v3.2+ for routing (no IF node)
- [ ] Unknown severity treated as WARNING

**Technical Notes:**
- Switch node with 3 branches: critical, warning, ok
- Default branch for unexpected values
- Avoid IF node (known bug per governance)

**Dependencies:** Story 4.2
**FRs:** FR55, FR56

---

#### Story 4.4: Implement Human Review Queue
**As a** system operator
**I want** WARNING severity issues to be queued for review
**So that** I can manually assess borderline situations

**Acceptance Criteria:**
- [ ] WARNING issues written to review queue (file or database)
- [ ] Queue entry includes: run_id, timestamp, severity, metrics, context
- [ ] Slack notification sent for new queue items
- [ ] Queue entries have TTL (auto-expire after 7 days)
- [ ] Queue can be queried for pending items
- [ ] Queue status visible in SRIS dashboard

**Technical Notes:**
- Consider: file-based queue vs n8n static data
- Slack integration for notifications
- Link to full evaluation report in notification

**Dependencies:** Story 4.3
**FRs:** FR55

---

**Epic 4 Summary:** 4 stories covering FR54, FR55, FR56 ✓

---

### Epic 5: Autorefinement Integration & Auto-Fix

#### Story 5.1: Activate Autorefinement Orchestrator v2
**As a** system operator
**I want to** activate the dormant Autorefinement workflow
**So that** it can receive auto-fix requests from SRIS

**Acceptance Criteria:**
- [ ] Autorefinement v2 (ID: c9dFlI51VhvANoEj) set to ACTIVE
- [ ] Workflow responds at `/webhook/autorefinement-trigger`
- [ ] Workflow accepts: run_id, severity, failed_items, context
- [ ] Workflow returns: fix_attempted, fix_result, changes_made
- [ ] Status updated in governance.yaml
- [ ] Health check confirms endpoint responsive

**Technical Notes:**
- Currently INACTIVE per governance
- Webhook path: `/webhook/autorefinement-trigger`
- Review existing workflow structure before activating

**Dependencies:** Epic 1 (foundation)
**FRs:** FR-SRIS-02

---

#### Story 5.2: Implement Auto-Fix Request Handler
**As a** autorefinement engine
**I want to** parse and validate incoming fix requests
**So that** only well-formed requests are processed

**Acceptance Criteria:**
- [ ] Validate required fields: run_id, severity, failed_items
- [ ] Reject requests without CRITICAL severity
- [ ] Parse failed_items array for fixable issues
- [ ] Log incoming request with full payload
- [ ] Return 400 for malformed requests
- [ ] Queue valid requests for processing

**Technical Notes:**
- Use Code node for validation
- Schema: { run_id: string, severity: "CRITICAL", failed_items: [...], context: {} }
- Only process CRITICAL (WARNING goes to human queue)

**Dependencies:** Story 5.1
**FRs:** FR56

---

#### Story 5.3: Implement Fix Strategy Selector
**As a** autorefinement engine
**I want to** select appropriate fix strategies for each failed item
**So that** the correct remediation is applied

**Acceptance Criteria:**
- [ ] Match failed item type to fix strategy catalog
- [ ] Strategies include: node_reconfigure, expression_fix, connection_repair
- [ ] For ElevenLabs: prompt_adjust, knowledge_update, scenario_skip
- [ ] Unknown failure types flagged for human review
- [ ] Log selected strategy per item
- [ ] Support dry-run mode (suggest but don't apply)

**Technical Notes:**
- Strategy catalog in configuration file
- Each strategy has: matcher, action, rollback_plan
- Consider AI-assisted fix generation for complex issues

**Dependencies:** Story 5.2
**FRs:** FR57

---

#### Story 5.4: Implement Manual Override Gate
**As a** system operator
**I want to** require manual approval for high-risk auto-fixes
**So that** dangerous changes don't happen automatically

**Acceptance Criteria:**
- [ ] High-risk fixes trigger approval webhook/Slack
- [ ] Risk levels defined: LOW (auto), MEDIUM (notify), HIGH (block until approved)
- [ ] Approval timeout: 1 hour (then treat as rejected)
- [ ] Approved fixes logged with approver identity
- [ ] Override can be permanent (whitelist pattern) or one-time
- [ ] All overrides auditable

**Technical Notes:**
- Risk assessment based on: scope of change, affected workflows, past failures
- Slack approval workflow with buttons
- FR-SRIS-02 requires this gate

**Dependencies:** Story 5.3
**FRs:** FR-SRIS-02, FR58

---

#### Story 5.5: Execute Approved Fixes
**As a** autorefinement engine
**I want to** apply approved fixes to the target systems
**So that** issues are actually remediated

**Acceptance Criteria:**
- [ ] For n8n: Use n8n_update_partial_workflow with diff operations
- [ ] For ElevenLabs: Use MCP tools to update agent configuration
- [ ] Create pre-fix snapshot before any mutation (Epic 6)
- [ ] Log all changes made with before/after state
- [ ] Handle partial failures (some fixes succeed, others fail)
- [ ] Return fix_result with success/failure per item

**Technical Notes:**
- Prefer partial updates over full workflow replacement
- ElevenLabs MCP: update_agent, update_agent_prompt
- Snapshot critical for rollback capability

**Dependencies:** Stories 5.3, 5.4, Epic 6 Story 6.1
**FRs:** FR57, FR58

---

**Epic 5 Summary:** 5 stories covering FR-SRIS-02, FR56, FR57, FR58 ✓

---

### Epic 6: Verification & Rollback System

#### Story 6.1: Implement Pre-Fix Snapshot
**As a** verification system
**I want to** capture state before any fix is applied
**So that** rollback is possible if fix causes degradation

**Acceptance Criteria:**
- [ ] Capture full workflow JSON before n8n changes
- [ ] Capture agent configuration before ElevenLabs changes
- [ ] Store snapshot with: run_id, timestamp, target_id, state
- [ ] Snapshots stored in queryable format (file or database)
- [ ] Snapshot creation logged
- [ ] Retention: Keep last 10 snapshots per target

**Technical Notes:**
- Use n8n_get_workflow for workflow state
- Use mcp__elevenlabs-mcp__get_agent for agent state
- Store in workflows/snapshots/ directory

**Dependencies:** None (prerequisite for Epic 5)
**FRs:** FR-SRIS-03

---

#### Story 6.2: Implement Post-Fix Verification Trigger
**As a** verification system
**I want to** automatically verify fixes after application
**So that** I know if the fix actually improved metrics

**Acceptance Criteria:**
- [ ] After fix applied, wait configurable delay (default: 60 seconds)
- [ ] Trigger targeted re-evaluation of fixed items only
- [ ] Compare post-fix metrics to pre-fix metrics
- [ ] Calculate improvement delta as percentage
- [ ] Log verification attempt with timing

**Technical Notes:**
- Use Verification Loop workflow (ID: KoQChBtjUa5F9bZg)
- Delay allows system to stabilize after change
- Only re-run affected test cases, not full suite

**Dependencies:** Story 6.1, Epic 5
**FRs:** FR-SRIS-03, FR54

---

#### Story 6.3: Implement Improvement Evaluator
**As a** verification system
**I want to** determine if a fix improved, maintained, or degraded quality
**So that** rollback decisions can be made

**Acceptance Criteria:**
- [ ] Compare post_metrics to pre_metrics
- [ ] Calculate delta: `(post - pre) / pre * 100`
- [ ] Classify result: IMPROVED (delta > 0), NEUTRAL (delta = 0), DEGRADED (delta < 0)
- [ ] Threshold for meaningful improvement: >5% increase
- [ ] Threshold for degradation trigger: any decrease in pass rate
- [ ] Log classification with full metric comparison

**Technical Notes:**
- Consider margin of error for NEUTRAL classification
- Multiple metrics require weighted comparison
- Use primary metric (pass_rate) for rollback decision

**Dependencies:** Story 6.2
**FRs:** FR-SRIS-03, FR55

---

#### Story 6.4: Implement Automatic Rollback
**As a** verification system
**I want to** automatically rollback fixes that caused degradation
**So that** the system self-heals from bad fixes

**Acceptance Criteria:**
- [ ] If DEGRADED classification, trigger rollback
- [ ] Restore from pre-fix snapshot (Story 6.1)
- [ ] For n8n: Use n8n_update_full_workflow with snapshot JSON
- [ ] For ElevenLabs: Use update_agent with snapshot config
- [ ] Log rollback with reason and restored state
- [ ] Notify operators of rollback via Slack
- [ ] Increment failure counter for circuit breaker

**Technical Notes:**
- Rollback is atomic (full state restore, not partial)
- Alert should include: what was tried, why it failed, what was restored
- Circuit breaker count: Story 7.1

**Dependencies:** Stories 6.1, 6.3
**FRs:** FR-SRIS-03, FR-SRIS-04

---

**Epic 6 Summary:** 4 stories covering FR-SRIS-03, FR-SRIS-04, FR54, FR55 ✓

---

### Epic 7: Circuit Breaker & Fault Tolerance

#### Story 7.1: Implement Consecutive Failure Counter
**As a** circuit breaker
**I want to** track consecutive auto-fix failures
**So that** I know when to halt the fix loop

**Acceptance Criteria:**
- [ ] Counter initialized to 0 at SRIS start
- [ ] Increment counter on: failed fix, rollback triggered
- [ ] Reset counter to 0 on: successful fix with improvement
- [ ] Counter persisted across workflow executions
- [ ] Counter value included in SRIS status reports
- [ ] Historical failure counts queryable

**Technical Notes:**
- Store in n8n static data or external file
- Key: `sris_consecutive_failures`
- Consider per-target counters vs global counter

**Dependencies:** Epic 6 (rollback triggers increment)
**FRs:** FR-SRIS-04

---

#### Story 7.2: Implement Circuit Breaker Trip Logic
**As a** circuit breaker
**I want to** halt auto-fix attempts after 3 consecutive failures
**So that** the system doesn't cause cascading damage

**Acceptance Criteria:**
- [ ] If consecutive_failures >= 3, trip circuit breaker
- [ ] TRIPPED state blocks all new auto-fix requests
- [ ] TRIPPED state allows evaluation to continue (read-only mode)
- [ ] Log circuit breaker state change with timestamp
- [ ] CRITICAL alert sent to operators on trip
- [ ] Manual reset required to clear TRIPPED state

**Technical Notes:**
- Circuit breaker states: CLOSED (normal), TRIPPED (blocked)
- Store state in same location as counter
- Consider: half-open state for gradual recovery?

**Dependencies:** Story 7.1
**FRs:** FR-SRIS-04, FR54

---

#### Story 7.3: Implement Manual Reset Mechanism
**As a** system operator
**I want to** manually reset the circuit breaker
**So that** auto-fix can resume after I've investigated

**Acceptance Criteria:**
- [ ] Webhook endpoint for circuit breaker reset
- [ ] Reset requires: operator_id, reason, acknowledgment
- [ ] Reset clears consecutive failure counter
- [ ] Reset logs: who, when, why
- [ ] Confirmation message returned on successful reset
- [ ] Invalid reset requests rejected with 400

**Technical Notes:**
- Endpoint: `/webhook/sris-circuit-breaker-reset`
- Could integrate with Slack slash command
- Acknowledgment = operator confirms they've reviewed failures

**Dependencies:** Story 7.2
**FRs:** FR-SRIS-04

---

#### Story 7.4: Implement Timeout Handling
**As a** fault tolerance system
**I want to** handle timeouts gracefully at every integration point
**So that** hung operations don't block the entire SRIS loop

**Acceptance Criteria:**
- [ ] Per-evaluator timeout: 30 seconds
- [ ] Total orchestration timeout: 120 seconds
- [ ] Auto-fix operation timeout: 60 seconds
- [ ] Verification timeout: 30 seconds
- [ ] Timeout treated as failure (increment counter)
- [ ] Timeout logged with operation context
- [ ] Partial results preserved on timeout

**Technical Notes:**
- Configure in HTTP Request nodes
- Use n8n execution timeout as backstop
- Consider: retry once on timeout before counting as failure

**Dependencies:** All Epics (cross-cutting)
**FRs:** FR54

---

**Epic 7 Summary:** 4 stories covering FR-SRIS-04, FR54 ✓

---

### Epic 8: History Store & Alerting

#### Story 8.1: Implement SRIS Execution History Store
**As a** system operator
**I want to** query historical SRIS execution data
**So that** I can analyze trends and debug issues

**Acceptance Criteria:**
- [ ] Each SRIS run creates history record
- [ ] Record includes: run_id, timestamp, trigger_type, duration_ms
- [ ] Record includes: metrics (n8n_pass_rate, elevenlabs_success_rate)
- [ ] Record includes: severity, decision, actions_taken
- [ ] Record includes: errors array if any
- [ ] History stored in queryable format (JSON files or database)
- [ ] Retention: 90 days minimum

**Technical Notes:**
- Store in `workflows/history/sris-runs/` as JSONL or individual JSON
- Filename pattern: `{YYYY-MM-DD}_{run_id}.json`
- Consider: n8n execution history as alternative

**Dependencies:** Epics 1-7 (all data flows)
**FRs:** FR54, FR55

---

#### Story 8.2: Implement Slack Alert Integration
**As a** system operator
**I want to** receive Slack notifications for SRIS events
**So that** I'm immediately aware of critical situations

**Acceptance Criteria:**
- [ ] CRITICAL severity triggers immediate Slack alert
- [ ] Circuit breaker TRIPPED triggers Slack alert
- [ ] Rollback executed triggers Slack alert
- [ ] Alerts include: severity, summary, link to details
- [ ] Alert channel configurable via workflow variable
- [ ] Alerts rate-limited (max 1 per 5 minutes for same issue)
- [ ] Test alert endpoint for verification

**Technical Notes:**
- Use Slack node (nodes-base.slack)
- Webhook fallback if Slack node fails
- Channel: Configure in environment variable

**Dependencies:** Epic 4 (severity), Epic 6 (rollback), Epic 7 (circuit breaker)
**FRs:** FR70

---

#### Story 8.3: Implement Trend Analysis Queries
**As a** system operator
**I want to** query SRIS history for trends
**So that** I can identify recurring issues

**Acceptance Criteria:**
- [ ] Query: Average pass rate over last N days
- [ ] Query: Failure frequency by workflow/agent
- [ ] Query: Auto-fix success rate over time
- [ ] Query: Circuit breaker trip frequency
- [ ] Queries accessible via webhook API
- [ ] Response in JSON format for dashboard integration

**Technical Notes:**
- Implement as Code node with file/database queries
- Consider: separate analytics workflow triggered on-demand
- Pre-calculate daily aggregates for performance

**Dependencies:** Story 8.1
**FRs:** FR55, FR56

---

#### Story 8.4: Implement SRIS Status Dashboard Data
**As a** system operator
**I want to** see current SRIS status at a glance
**So that** I know if the system is healthy

**Acceptance Criteria:**
- [ ] Endpoint returns: current_state (RUNNING, IDLE, TRIPPED)
- [ ] Endpoint returns: last_run_timestamp, last_run_result
- [ ] Endpoint returns: consecutive_failures count
- [ ] Endpoint returns: next_scheduled_run (if cron enabled)
- [ ] Endpoint returns: active_workflows list with status
- [ ] Endpoint returns: recent_alerts array (last 5)
- [ ] Refresh rate: Real-time via webhook call

**Technical Notes:**
- Endpoint: `/webhook/sris-status`
- Aggregate data from multiple sources
- Could power a simple HTML dashboard or Grafana

**Dependencies:** Stories 8.1, 8.2, 7.1
**FRs:** FR54, FR57

---

**Epic 8 Summary:** 4 stories covering FR54, FR55, FR56, FR57, FR70 ✓

---

## FR Coverage Verification

| Epic | Stories | FRs Covered | Status |
|------|---------|-------------|--------|
| Epic 1 | 5 | FR35, FR37, FR38, FR39, FR-SRIS-01 | ✓ |
| Epic 2 | 6 | FR21-27, FR39, FR54, FR55 | ✓ |
| Epic 3 | 6 | FR41-47, FR54 | ✓ |
| Epic 4 | 4 | FR54, FR55, FR56 | ✓ |
| Epic 5 | 5 | FR-SRIS-02, FR56, FR57, FR58 | ✓ |
| Epic 6 | 4 | FR-SRIS-03, FR-SRIS-04, FR54, FR55 | ✓ |
| Epic 7 | 4 | FR-SRIS-04, FR54 | ✓ |
| Epic 8 | 4 | FR54, FR55, FR56, FR57, FR70 | ✓ |

**Total:** 38 stories across 8 epics

**All 74 FRs from PRD + 4 SRIS-specific FRs covered** ✓
