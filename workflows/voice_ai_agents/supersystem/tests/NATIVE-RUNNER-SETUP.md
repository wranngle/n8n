# Native Evaluation Runner - Setup Completion Guide

**Workflow ID**: `mwepwjfX27x4uTMu`
**URL**: https://n8n.wranngle.com/workflow/mwepwjfX27x4uTMu
**Status**: Structure complete, credentials need UI linking

---

## Current State

The Native Evaluation Runner workflow has been updated with:
- 8 nodes (EvaluationTrigger → Code → HTTP × 3 → Wait → Code → Evaluation)
- ElevenLabs Testing API integration
- 100-test dataset (`supersystem-evaluation-dataset`)
- Pass/fail scoring logic

---

## REQUIRED: One-Time Credential Linking

**n8n requires credentials to be linked via the UI for security reasons.**

### Step-by-Step Instructions

1. **Open the workflow**: https://n8n.wranngle.com/workflow/mwepwjfX27x4uTMu

2. **For each HTTP Request node, link the ElevenLabs credential**:

   | Node Name | Click Node → Credential |
   |-----------|------------------------|
   | `Create Test in ElevenLabs` | Select: **ElevenLabs API Key** |
   | `Run Tests` | Select: **ElevenLabs API Key** |
   | `Get Test Results` | Select: **ElevenLabs API Key** |

3. **How to link credentials**:
   - Click the HTTP Request node
   - In the "Authentication" section, it shows "Header Auth"
   - Click the dropdown under "Credential for Header Auth"
   - Select **"ElevenLabs API Key"** (credential ID: `eR7srDUHDyZLIZgh`)
   - Repeat for all 3 HTTP nodes

4. **Save the workflow** (Ctrl+S)

---

## Workflow Architecture

```
┌────────────────────────┐
│ When fetching a        │  Evaluation Trigger
│ dataset row            │  (reads from Data Table)
└──────────┬─────────────┘
           │
           ▼
┌────────────────────────┐
│ Prepare Test Payload   │  Code node
│ Formats API request    │  (extracts test data)
└──────────┬─────────────┘
           │
           ▼
┌────────────────────────┐
│ Create Test in         │  HTTP POST
│ ElevenLabs             │  /v1/convai/agent-testing/create
└──────────┬─────────────┘
           │
           ▼
┌────────────────────────┐
│ Run Tests              │  HTTP POST
│                        │  /v1/convai/agents/{id}/run-tests
└──────────┬─────────────┘
           │
           ▼
┌────────────────────────┐
│ Wait 5s                │  Wait node
│                        │  (polling delay)
└──────────┬─────────────┘
           │
           ▼
┌────────────────────────┐
│ Get Test Results       │  HTTP GET
│                        │  /v1/convai/test-invocations/{id}
└──────────┬─────────────┘
           │
           ▼
┌────────────────────────┐
│ Evaluate Result        │  Code node
│ Determine pass/fail    │  (scoring logic)
└──────────┬─────────────┘
           │
           ▼
┌────────────────────────┐
│ Evaluation             │  Evaluation node
│ Output results         │  (writes to Data Table)
└────────────────────────┘
```

---

## Running Evaluations

After linking credentials:

1. Open: https://n8n.wranngle.com/workflow/mwepwjfX27x4uTMu
2. Click the **"Evaluation"** tab (top of workflow editor)
3. You should see **100 test cases** from `supersystem-evaluation-dataset`
4. Click **"Evaluate All"** to run the full suite
5. Results appear in the evaluation panel

---

## ElevenLabs Testing API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/v1/convai/agent-testing/create` | POST | Create a test case |
| `/v1/convai/agents/{agent_id}/run-tests` | POST | Execute test(s) |
| `/v1/convai/test-invocations/{id}` | GET | Get test results |

---

## Test Data Format

Each row in `supersystem-evaluation-dataset`:

| Field | Description |
|-------|-------------|
| `test_name` | Human-readable test name |
| `chat_history` | JSON array of conversation turns |
| `success_condition` | Criteria for pass/fail |
| `test_type` | `llm` or `simulation` |
| `category` | `consent_discipline`, `tool_execution`, etc. |
| `agent_id` | Sarah agent: `agent_8001kdgp7qbyf4wvhs540be78vew` |

---

## Troubleshooting

### "Credentials not found" error
- Verify each HTTP node has "ElevenLabs API Key" selected
- Check that the credential exists in n8n Settings → Credentials

### "401 Unauthorized" error
- The ElevenLabs API key may be invalid or expired
- Check: n8n Settings → Credentials → ElevenLabs API Key → Test

### Tests stuck in "running" state
- ElevenLabs tests can take 10-30 seconds
- Consider increasing the Wait node to 10-15 seconds
- Add retry logic for long-running tests

---

## Verification Checklist

- [ ] Workflow open in n8n UI
- [ ] "Create Test in ElevenLabs" node has credential linked
- [ ] "Run Tests" node has credential linked
- [ ] "Get Test Results" node has credential linked
- [ ] Workflow saved
- [ ] Evaluation tab shows 100 tests
- [ ] Run single test to verify

---

*Last Updated: 2026-01-01*
*Credential ID: eR7srDUHDyZLIZgh*
