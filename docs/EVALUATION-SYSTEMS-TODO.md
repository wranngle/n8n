# Evaluation Systems Integration: ElevenLabs + n8n

**Status**: BLOCKED - ElevenLabs API returning 500 errors
**Last Updated**: 2026-01-12
**Priority**: HIGH - Required for production-grade voice agent testing

---

## Executive Summary

This document captures the work done to integrate proper evaluation/testing systems for voice agents. The goal is to have evaluation results visible in:
1. **ElevenLabs Portal** → Tests tab in agent interface
2. **n8n Portal** → Execution history with evaluation metrics

Currently blocked by ElevenLabs API 500 errors on the `simulate-conversation` endpoint.

---

## Part 1: ElevenLabs Testing Framework

### 1.1 Two Testing Approaches

| Approach | Purpose | API Endpoint |
|----------|---------|--------------|
| **Scenario Testing (LLM Evaluation)** | Validates conversational abilities | `POST /v1/convai/agents/{agent_id}/simulate-conversation` |
| **Tool Call Testing** | Ensures proper tool usage | Same endpoint with tool expectations |

### 1.2 Key API Endpoints

```
# Create a test (appears in Tests tab)
POST /v1/convai/agent-testing/create

# Run tests on an agent
POST /v1/convai/agents/{agent_id}/run-tests

# List test invocations
GET /v1/convai/test-invocations?agent_id={agent_id}

# Simulate a conversation (for evaluation)
POST /v1/convai/agents/{agent_id}/simulate-conversation
```

### 1.3 Correct API Schema for simulate-conversation

```json
{
  "simulation_specification": {
    "simulated_user_config": {
      "first_message": "Hello, I'm interested in your services.",
      "language": "en",
      "disable_first_message_interruptions": false
    }
  },
  "extra_evaluation_criteria": [
    {
      "id": "unique_id",
      "name": "Criterion Name",
      "type": "prompt",
      "conversation_goal_prompt": "The agent should do X",
      "use_knowledge_base": false
    }
  ],
  "new_turns_limit": 15
}
```

**CRITICAL**: The `extra_evaluation_criteria` requires:
- `id` (string) - Required
- `name` (string) - Required
- `type` (string) - Required, must be "prompt"
- `conversation_goal_prompt` (string) - Required
- `use_knowledge_base` (boolean) - Optional

### 1.4 Alternative: Complex Prompt Config

```json
{
  "simulation_specification": {
    "simulated_user_config": {
      "prompt": {
        "prompt": "You are a difficult customer who...",
        "llm": "gpt-4o",
        "temperature": 0.5
      }
    }
  }
}
```

**Note**: This format was returning 500 errors - may require specific account permissions.

### 1.5 Response Structure

```json
{
  "simulated_conversation": [
    {
      "role": "user",
      "message": "Hello...",
      "tool_calls": [],
      "tool_results": []
    }
  ],
  "analysis": {
    "call_successful": "success",
    "transcript_summary": "...",
    "evaluation_criteria_results": {
      "criterion_id": {
        "result": "success",
        "score": 0.95,
        "rationale": "..."
      }
    }
  }
}
```

---

## Part 2: n8n Evaluation Framework

### 2.1 Native Evaluation Features (v1.95.1+)

| Feature | Description |
|---------|-------------|
| **Evaluation Trigger Node** | Starts evaluation workflows |
| **Set Outputs Action** | Writes evaluation outputs |
| **Set Metrics Operation** | Records evaluation metrics |
| **Light Evaluations** | Small dataset visual comparison |
| **Metric-Based Evaluations** | Correctness, Helpfulness, Custom |

### 2.2 Existing Evaluation Workflows

| Workflow | ID | Purpose |
|----------|-----|---------|
| [DEV] SRIS - ElevenLabs Conversation Evaluator | `RjLiUAiuUs5XPvBj` | Main evaluator (updated) |
| [DEV] Supersystem - Parallel Evaluation Runner v6 | `M7ZmLGCxyVOn5QJ6` | Parallel runner |
| [DEV] Supersystem - Native Evaluation Runner | `mwepwjfX27x4uTMu` | Native n8n evals |
| [DEV] Universal Evaluation Runner v2 | `p60GgdEwiDcIrxgp` | Universal runner |

### 2.3 Updated Workflow Structure

```
Webhook (Evaluate Agent)
    ↓
Load Test Scenarios (Code node - 3 default scenarios)
    ↓
Split Scenarios
    ↓
Simulate Conversation (HTTP Request to ElevenLabs) ← BLOCKING: 500 errors
    ↓
Evaluate Result (Code node - analyze responses)
    ↓
Aggregate Results (Code node - calculate pass rates)
    ↓
Switch (Needs Autocorrection?)
    ↓
Trigger Autorefinement OR Respond OK
```

---

## Part 3: Current Blocking Issue

### 3.1 Error Details

```
Status: 500
Response: {
  "status": "internal_server_error",
  "message": "Internal Server error. All such crashes are reported to us automatically."
}
```

### 3.2 Tested Configurations

| Configuration | Result |
|--------------|--------|
| `first_message` + `language` | 500 Error |
| `prompt.prompt` + `prompt.llm` | 500 Error |
| Minimal payload (no eval criteria) | 500 Error |

### 3.3 Possible Causes

1. **ElevenLabs service issue** - Temporary outage
2. **Agent configuration** - Missing required agent settings
3. **API key permissions** - May need specific tier/permissions
4. **Rate limiting** - Though usually returns 429, not 500

---

## Part 4: TODO - Next Steps

### Immediate (When Resuming)

- [ ] Test simulate-conversation API directly with curl to verify if issue persists
- [ ] Try with a different agent ID to rule out agent-specific issues
- [ ] Check ElevenLabs status page for service issues
- [ ] Review ElevenLabs account for any permission restrictions

### If API Works

- [ ] Trigger the evaluation workflow: `POST https://n8n.wranngle.com/webhook/elevenlabs-conversation-eval`
- [ ] Verify results appear in n8n execution history
- [ ] Check evaluation metrics in n8n data tables
- [ ] Run stress test with 100+ scenarios

### Alternative Approach: ElevenLabs Tests Tab

- [ ] Create tests directly in ElevenLabs UI (Tests tab)
- [ ] Use `POST /v1/convai/agent-testing/create` API
- [ ] Run tests with `POST /v1/convai/agents/{agent_id}/run-tests`
- [ ] Query results with `GET /v1/convai/test-invocations`

### Alternative Approach: n8n Native Evaluations

- [ ] Use Evaluation Trigger node instead of webhook
- [ ] Set up dataset in n8n data table
- [ ] Use Set Metrics node for tracking
- [ ] View results in n8n Evaluations tab

---

## Part 5: Reference Files

### Created/Updated Files

| File | Purpose |
|------|---------|
| `temp-update-eval-workflow.json` | Latest workflow JSON |
| `scripts/update-eval-workflow.js` | Node.js script to update workflow |
| `scripts/test-simulation.js` | Direct API test script |
| `baseline-results-*.json` | Previous test results (local only) |

### Key Credentials

| Service | Credential ID | Name |
|---------|--------------|------|
| ElevenLabs | `5BIOspwXrFAIQ2OI` | ElevenLabs API Key (Active) |

### Agent IDs

| Agent | ID | Status |
|-------|-----|--------|
| [DEV] Sarah - Wranngle Receptionist | `agent_8001kdgp7qbyf4wvhs540be78vew` | Primary test agent |
| [DEV] Wranngle Lead Qualifier | `agent_5701kdgf9s4vfe9rhe68ntjrms9g` | Backup |

---

## Part 6: Success Criteria

When this is complete, you should see:

1. **In ElevenLabs Portal**:
   - Tests tab shows test definitions
   - Test invocations with pass/fail results
   - Conversation transcripts for each test

2. **In n8n Portal**:
   - Execution history shows successful runs
   - Evaluation metrics recorded
   - Autocorrection triggered when needed

3. **Quantitative**:
   - 100+ evaluation runs completed
   - Results visible in both portals
   - Agent improvements triggered from failures

---

## Appendix: API Documentation Sources

- ElevenLabs Python SDK: `/elevenlabs/elevenlabs-python`
- ElevenLabs Website Docs: `/websites/elevenlabs_io`
- Context7 Library ID for queries: Use `mcp__context7__query-docs`

---

*Document created from session on 2026-01-12. Resume by reading this file and checking if ElevenLabs API is responsive.*
