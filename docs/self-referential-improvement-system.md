# Self-Referential Improvement System (SRIS)
## ElevenLabs + n8n Dual-Stack Evaluation Architecture

**Version**: 1.0
**Created**: 2026-01-07
**Status**: Design Phase

---

## Executive Summary

A **closed-loop autonomous improvement system** that evaluates both the ElevenLabs voice agent stack and n8n workflow stack, identifies degradation patterns, generates fixes using AI, applies them, and verifies improvement—all without human intervention.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    SELF-REFERENTIAL IMPROVEMENT SUPERSYSTEM                  │
│                                                                              │
│  TRIGGER LAYER                                                               │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │  Schedule   │  │  Webhook    │  │  Manual     │  │  Threshold  │        │
│  │  (Cron)     │  │  (Event)    │  │  (API)      │  │  (Alert)    │        │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘        │
│         └────────────────┴────────────────┴────────────────┘                │
│                                    │                                         │
│                                    ▼                                         │
│  EVALUATION LAYER ═══════════════════════════════════════════════════════   │
│  ┌─────────────────────────────┐  ┌─────────────────────────────┐           │
│  │     n8n WORKFLOW EVAL       │  │   ELEVENLABS AGENT EVAL     │           │
│  │  ┌────────────────────┐     │  │  ┌────────────────────┐     │           │
│  │  │ HTTP Response Test │     │  │  │ Conversation Sim   │     │           │
│  │  │ - Status codes     │     │  │  │ - Transcript qual  │     │           │
│  │  │ - Response time    │     │  │  │ - Tool call acc    │     │           │
│  │  │ - JSON validation  │     │  │  │ - Sentiment score  │     │           │
│  │  └────────────────────┘     │  │  └────────────────────┘     │           │
│  │  ┌────────────────────┐     │  │  ┌────────────────────┐     │           │
│  │  │ Logic Path Test    │     │  │  │ Historical Trend   │     │           │
│  │  │ - Branch coverage  │     │  │  │ - Success rate     │     │           │
│  │  │ - Edge cases       │     │  │  │ - Failure patterns │     │           │
│  │  │ - Error handling   │     │  │  │ - Call duration    │     │           │
│  │  └────────────────────┘     │  │  └────────────────────┘     │           │
│  └─────────────┬───────────────┘  └─────────────┬───────────────┘           │
│                │                                │                            │
│                └────────────┬───────────────────┘                            │
│                             ▼                                                │
│  AGGREGATION LAYER ══════════════════════════════════════════════════════   │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                    UNIFIED METRICS AGGREGATOR                         │   │
│  │  {                                                                    │   │
│  │    "timestamp": "2026-01-07T12:00:00Z",                               │   │
│  │    "n8n_stack": {                                                     │   │
│  │      "workflows_tested": 5,                                           │   │
│  │      "pass_rate": 94.2,                                               │   │
│  │      "avg_latency_ms": 234,                                           │   │
│  │      "failures": [{ "workflow_id": "...", "error": "..." }]           │   │
│  │    },                                                                 │   │
│  │    "elevenlabs_stack": {                                              │   │
│  │      "agents_tested": 2,                                              │   │
│  │      "conversation_success_rate": 87.5,                               │   │
│  │      "tool_call_accuracy": 92.0,                                      │   │
│  │      "failures": [{ "scenario": "...", "pattern": "..." }]            │   │
│  │    },                                                                 │   │
│  │    "cross_stack": {                                                   │   │
│  │      "integration_success_rate": 91.0,                                │   │
│  │      "e2e_latency_ms": 1200                                           │   │
│  │    }                                                                  │   │
│  │  }                                                                    │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                             │                                                │
│                             ▼                                                │
│  DECISION LAYER ═════════════════════════════════════════════════════════   │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                    THRESHOLD EVALUATOR                                │   │
│  │                                                                       │   │
│  │  CRITICAL (auto-fix immediately):                                     │   │
│  │    - pass_rate < 80%                                                  │   │
│  │    - tool_call_accuracy < 85%                                         │   │
│  │    - avg_latency_ms > 5000                                            │   │
│  │                                                                       │   │
│  │  WARNING (queue for review):                                          │   │
│  │    - pass_rate < 95%                                                  │   │
│  │    - conversation_success_rate < 90%                                  │   │
│  │    - error_spike (>3x baseline in 1 hour)                             │   │
│  │                                                                       │   │
│  │  OK (log only):                                                       │   │
│  │    - All metrics within thresholds                                    │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                             │                                                │
│                     ┌───────┴───────┐                                        │
│                     ▼               ▼                                        │
│               [CRITICAL]        [OK/WARNING]                                 │
│                     │               │                                        │
│                     ▼               ▼                                        │
│  ACTION LAYER ═══════════════════════════════════════════════════════════   │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                    AI-POWERED FIX GENERATOR                           │   │
│  │                                                                       │   │
│  │  Input: Aggregated metrics + failure patterns + historical fixes      │   │
│  │  Model: Gemini-3-Pro (reasoning) or Claude Opus (code generation)     │   │
│  │                                                                       │   │
│  │  Output:                                                              │   │
│  │  {                                                                    │   │
│  │    "analysis": "Root cause identified...",                            │   │
│  │    "fix_type": "elevenlabs_prompt" | "n8n_workflow" | "both",         │   │
│  │    "elevenlabs_fix": {                                                │   │
│  │      "agent_id": "agent_xxx",                                         │   │
│  │      "prompt_addition": "...",                                        │   │
│  │      "confidence": 0.85                                               │   │
│  │    },                                                                 │   │
│  │    "n8n_fix": {                                                       │   │
│  │      "workflow_id": "xxx",                                            │   │
│  │      "operations": [...],                                             │   │
│  │      "confidence": 0.90                                               │   │
│  │    }                                                                  │   │
│  │  }                                                                    │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                             │                                                │
│                             ▼                                                │
│  EXECUTION LAYER ════════════════════════════════════════════════════════   │
│  ┌───────────────────────┐  ┌───────────────────────┐                       │
│  │  n8n WORKFLOW PATCHER │  │  ELEVENLABS PATCHER   │                       │
│  │                       │  │                       │                       │
│  │  n8n_update_partial   │  │  PATCH /v1/convai/    │                       │
│  │  _workflow()          │  │  agents/{id}          │                       │
│  │                       │  │                       │                       │
│  │  - Add retry logic    │  │  - Append guardrails  │                       │
│  │  - Fix expressions    │  │  - Adjust temperature │                       │
│  │  - Update timeouts    │  │  - Add edge cases     │                       │
│  └───────────────────────┘  └───────────────────────┘                       │
│                             │                                                │
│                             ▼                                                │
│  VERIFICATION LAYER ═════════════════════════════════════════════════════   │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                    RE-EVALUATION LOOP                                 │   │
│  │                                                                       │   │
│  │  1. Apply fix                                                         │   │
│  │  2. Wait cooldown (30s)                                               │   │
│  │  3. Re-run evaluation (same test suite)                               │   │
│  │  4. Compare metrics:                                                  │   │
│  │     - Improved → Log success, notify                                  │   │
│  │     - Degraded → Rollback fix, escalate                               │   │
│  │     - Same → Log, queue for manual review                             │   │
│  │  5. Store in history for ML training                                  │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                             │                                                │
│                             ▼                                                │
│  HISTORY LAYER ══════════════════════════════════════════════════════════   │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                    IMPROVEMENT HISTORY STORE                          │   │
│  │                                                                       │   │
│  │  Storage: n8n internal variables OR external (Supabase/Airtable)      │   │
│  │                                                                       │   │
│  │  Schema:                                                              │   │
│  │  {                                                                    │   │
│  │    "run_id": "uuid",                                                  │   │
│  │    "timestamp": "ISO8601",                                            │   │
│  │    "trigger": "schedule|webhook|manual",                              │   │
│  │    "metrics_before": {...},                                           │   │
│  │    "metrics_after": {...},                                            │   │
│  │    "fix_applied": {...},                                              │   │
│  │    "outcome": "improved|degraded|unchanged",                          │   │
│  │    "rollback_performed": false                                        │   │
│  │  }                                                                    │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Existing Components (Audit Results)

| Component | Workflow ID | Status | Gap |
|-----------|-------------|--------|-----|
| Parallel Evaluation Runner v6 | `M7ZmLGCxyVOn5QJ6` | ✅ Active | Tests n8n workflows only |
| Autorefinement Orchestrator v2 | `c9dFlI51VhvANoEj` | ❌ Inactive | Patches ElevenLabs prompts, not connected to eval |
| Post-Call Orchestrator | `8qlDREZy5qtEGkNK` | ✅ Active | Handles call completion events |
| Execution Logger | `Ar2lX0cprjeWB4Kd` | ✅ Active | Logs workflow executions |

### Critical Gaps

1. **No Loop Closure**: Evaluation Runner returns `needs_autocorrection: true` but doesn't trigger Autorefinement
2. **No ElevenLabs Conversation Eval**: No workflow evaluates actual voice agent conversations
3. **No Cross-Stack Eval**: n8n and ElevenLabs evaluated separately, not their integration
4. **No Historical Tracking**: Results not persisted for trend analysis
5. **No Verification Loop**: Fixes applied but not re-verified

---

## New Components to Build

### 1. SRIS Orchestrator (Master Controller)
**Purpose**: Single entry point that coordinates all evaluation and improvement activities

```
Webhook: POST /webhook/sris-orchestrator
Input: { 
  "mode": "full|n8n_only|elevenlabs_only|cross_stack",
  "trigger": "schedule|manual|alert",
  "target_agents": ["agent_xxx"],  // optional
  "target_workflows": ["workflow_xxx"]  // optional
}
```

### 2. ElevenLabs Conversation Evaluator
**Purpose**: Evaluate voice agent quality using conversation simulation API

```
Webhook: POST /webhook/elevenlabs-eval
Tests:
  - Conversation simulation via POST /v1/convai/agents/{id}/simulate-conversation
  - Tool call accuracy (did agent call the right tools?)
  - Transcript quality (coherence, staying on topic)
  - Failure pattern detection (SMS_AFTER_DECLINE, TOOL_NOT_CALLED, etc.)
```

### 3. Cross-Stack Integration Evaluator
**Purpose**: Test end-to-end flows (e.g., voice agent → n8n webhook → CRM update)

```
Webhook: POST /webhook/cross-stack-eval
Tests:
  - Outbound call triggers correct n8n workflow
  - n8n webhook correctly injects client data
  - Post-call webhook processes transcript correctly
```

### 4. Unified Metrics Aggregator
**Purpose**: Combine metrics from all evaluators into single decision-ready format

### 5. Verification Loop Controller
**Purpose**: Re-run evaluation after fix, compare, rollback if degraded

---

## Workflow IDs and Webhooks

| Workflow | Webhook Path | Purpose |
|----------|--------------|---------|
| SRIS Orchestrator | `/webhook/sris-orchestrator` | Master controller |
| n8n Workflow Evaluator | `/webhook/parallel-eval-runner-v6` | Existing, test n8n |
| ElevenLabs Conversation Evaluator | `/webhook/elevenlabs-conversation-eval` | **NEW** |
| Cross-Stack Evaluator | `/webhook/cross-stack-eval` | **NEW** |
| Autorefinement Orchestrator | `/webhook/autorefinement-trigger` | Existing, apply fixes |
| Verification Loop | `/webhook/verification-loop` | **NEW** |
| History Logger | `/webhook/sris-history-log` | **NEW** |

---

## Data Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│  1. TRIGGER                                                          │
│     Schedule (every 6h) OR Manual OR Alert                           │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│  2. SRIS ORCHESTRATOR                                                │
│     Receives trigger, spawns parallel evaluators                     │
└─────────────────────────────────────────────────────────────────────┘
                              │
          ┌───────────────────┼───────────────────┐
          ▼                   ▼                   ▼
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│ n8n Evaluator   │  │ ElevenLabs Eval │  │ Cross-Stack Eval│
│ (existing)      │  │ (NEW)           │  │ (NEW)           │
└────────┬────────┘  └────────┬────────┘  └────────┬────────┘
         │                    │                    │
         └────────────────────┼────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│  3. METRICS AGGREGATOR                                               │
│     Combines all results into unified format                         │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│  4. THRESHOLD CHECK                                                  │
│     pass_rate < 80%? → CRITICAL                                      │
│     pass_rate < 95%? → WARNING                                       │
│     else           → OK                                              │
└─────────────────────────────────────────────────────────────────────┘
                              │
               ┌──────────────┴──────────────┐
               ▼                             ▼
         [CRITICAL]                    [OK/WARNING]
               │                             │
               ▼                             ▼
┌─────────────────────────────────┐  ┌─────────────────┐
│  5. AUTOREFINEMENT ORCHESTRATOR │  │ Log + Notify    │
│     AI analyzes, generates fix  │  │ (Slack/Email)   │
└─────────────────────────────────┘  └─────────────────┘
               │
               ▼
┌─────────────────────────────────────────────────────────────────────┐
│  6. APPLY FIX                                                        │
│     PATCH ElevenLabs agent OR n8n_update_partial_workflow            │
└─────────────────────────────────────────────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────────────────────────────┐
│  7. VERIFICATION LOOP                                                │
│     Wait 30s → Re-evaluate → Compare → Log outcome                   │
│     If degraded → Rollback → Escalate                                │
└─────────────────────────────────────────────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────────────────────────────┐
│  8. HISTORY STORE                                                    │
│     Persist run_id, metrics_before, metrics_after, fix, outcome      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Implementation Priority

| Phase | Component | Effort | Impact |
|-------|-----------|--------|--------|
| **1** | ElevenLabs Conversation Evaluator | Medium | High |
| **2** | Loop Closure (Eval → Autorefine) | Low | Critical |
| **3** | Verification Loop | Medium | High |
| **4** | SRIS Orchestrator | Medium | High |
| **5** | History Store | Low | Medium |
| **6** | Cross-Stack Evaluator | High | Medium |

---

## Thresholds Configuration

```yaml
thresholds:
  n8n:
    pass_rate:
      critical: 80
      warning: 95
    avg_latency_ms:
      critical: 5000
      warning: 2000
    error_rate:
      critical: 20
      warning: 5
      
  elevenlabs:
    conversation_success_rate:
      critical: 75
      warning: 90
    tool_call_accuracy:
      critical: 85
      warning: 95
    avg_call_duration_ms:
      critical: 180000  # 3 min
      warning: 120000   # 2 min
      
  cross_stack:
    e2e_success_rate:
      critical: 70
      warning: 85
    integration_latency_ms:
      critical: 10000
      warning: 5000
```

---

## Next Steps

1. Build ElevenLabs Conversation Evaluator workflow
2. Connect existing Evaluation Runner to Autorefinement Orchestrator
3. Build Verification Loop workflow
4. Build SRIS Orchestrator
5. Add history logging
6. Test end-to-end self-improvement cycle
