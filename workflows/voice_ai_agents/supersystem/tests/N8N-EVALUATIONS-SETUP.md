# n8n Native Evaluations Setup Guide

## Overview

This guide sets up **100 native n8n evaluations** for the Client Data Lookup workflow (`oik6SebewNAh1cV5`).

**Target URL**: https://n8n.wranngle.com/workflow/oik6SebewNAh1cV5/evaluation

---

## Step 1: Create the Data Table

1. Go to **n8n.wranngle.com**
2. Navigate to **Data Tables** (left sidebar)
3. Click **"Create new data table"**
4. Name it: `supersystem-evaluation-dataset`
5. Add these columns:

| Column Name | Type | Notes |
|-------------|------|-------|
| test_id | Number | Auto-increment |
| category | String | Test category |
| test_name | String | Descriptive name |
| input_phone | String | Phone to test |
| input_email | String | Email to test |
| expected_success | String | "true" or "false" |
| expected_client_found | String | "true" or "false" |
| expected_fields | String | Fields to verify |
| description | String | Test description |
| actual_output | String | Filled by evaluation |
| pass_fail | String | Filled by evaluation |
| execution_time_ms | Number | Filled by evaluation |
| run_timestamp | String | Filled by evaluation |

---

## Step 2: Import Test Cases

### Option A: Manual Import via n8n UI
1. Open the Data Table you created
2. Click **"Import"** button
3. Upload the CSV file: `n8n-evaluation-dataset.csv`
4. Map columns and confirm

### Option B: Bulk Insert via Data Table API
Each Data Table exposes an API endpoint. Once created, find the endpoint in the Data Table settings and use:

```bash
# Find your Data Table's webhook URL in the n8n UI
# Then POST the test data
curl -X POST "https://n8n.wranngle.com/webhook/data-table/{table-id}" \
  -H "Content-Type: application/json" \
  -d @n8n-evaluation-dataset.json
```

---

## Step 3: Update the Workflow

### Option A: Replace Workflow (Recommended)
Import the pre-built workflow with evaluation nodes:

1. Go to workflow `oik6SebewNAh1cV5`
2. Click **"..."** → **"Import from file"**
3. Select `workflow-with-evaluations.json`
4. Configure the Evaluation Trigger and Evaluation nodes:
   - Select your Data Table: `supersystem-evaluation-dataset`

### Option B: Add Nodes Manually
Add these nodes to the existing workflow:

1. **Evaluation Trigger** (parallel to Webhook)
   - Source: Data Table
   - Select: `supersystem-evaluation-dataset`
   - Position: [0, 200]

2. **Check If Evaluating** (after lookup logic)
   - Operation: Check If Evaluating
   - Routes to: Webhook response (if not evaluating) OR Evaluation outputs (if evaluating)

3. **Set Evaluation Outputs** (evaluation branch)
   - Operation: Set Outputs
   - Data Table: `supersystem-evaluation-dataset`
   - Outputs:
     - `actual_output` → `{{ JSON.stringify($json) }}`
     - `pass_fail` → `{{ $json.success ? 'PASS' : 'FAIL' }}`
     - `execution_time_ms` → `{{ $json.latency_ms }}`
     - `run_timestamp` → `{{ new Date().toISOString() }}`

4. **Set Evaluation Metrics** (after outputs)
   - Operation: Set Metrics
   - Metrics:
     - `success_rate` → `{{ $json.success ? 1 : 0 }}`
     - `client_found_accuracy` → `{{ ... }}`
     - `latency_ms` → `{{ $json.latency_ms }}`

---

## Step 4: Run Evaluations

1. Go to workflow: https://n8n.wranngle.com/workflow/oik6SebewNAh1cV5
2. Click the **"Evaluation"** tab
3. You should see **100 test cases** listed
4. Click **"Evaluate All"** to run all tests

### Viewing Results
- The **Evaluation** tab shows pass/fail status
- Each test row is updated with:
  - `actual_output` - What the workflow returned
  - `pass_fail` - PASS or FAIL
  - `execution_time_ms` - Latency
  - `run_timestamp` - When it ran

### Metrics Dashboard
After running, view aggregated metrics:
- **success_rate** - Percentage of tests that succeeded
- **client_found_accuracy** - Accuracy of client lookup
- **latency_ms** - Average response time

---

## Test Categories (100 tests)

| Category | Count | Description |
|----------|-------|-------------|
| client_lookup | 25 | Known/unknown client scenarios |
| phone_format | 15 | E.164, international, vanity numbers |
| email_lookup | 10 | Email-based lookups |
| error_handling | 15 | Invalid inputs, edge cases, security |
| integration | 10 | Webhook patterns, tool calls |
| stress_test | 10 | Load testing |
| data_extraction | 10 | Field validation |
| edge_case | 5 | Unusual scenarios |

---

## Troubleshooting

### "No row found" error
If you see this when running evaluations:
- Ensure all rows in the Data Table have values
- Don't filter on empty output fields until after first run
- See [GitHub Issue #22364](https://github.com/n8n-io/n8n/issues/22364)

### Evaluation tab not showing tests
- Verify the Evaluation Trigger node is connected
- Check that the Data Table is selected in the node
- Ensure the workflow is saved

### Tests not updating
- The Evaluation node must have correct column mappings
- Verify the Data Table ID matches in all nodes

---

## Files Reference

| File | Purpose |
|------|---------|
| `n8n-evaluation-dataset.csv` | 100 test cases (import to Data Table) |
| `n8n-evaluation-dataset.json` | Same data in JSON format |
| `workflow-with-evaluations.json` | Pre-built workflow with eval nodes |
| `generate-100-n8n-tests.js` | Script that generated the tests |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    EVALUATION WORKFLOW ARCHITECTURE                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌────────────────────┐                    ┌────────────────────┐           │
│  │  Webhook Trigger   │───┐            ┌──▶│ Respond to Webhook │           │
│  │  (Production)      │   │            │   │ (HTTP Response)    │           │
│  └────────────────────┘   │            │   └────────────────────┘           │
│                           ▼            │                                     │
│                    ┌────────────┐      │                                     │
│                    │   Merge    │──────┴─▶┌───────────────────┐              │
│                    │  Triggers  │         │ Simulate Client   │              │
│                    └────────────┘         │ Lookup (Code)     │              │
│                           ▲               └─────────┬─────────┘              │
│  ┌────────────────────┐   │                         │                        │
│  │ Evaluation Trigger │───┘                         ▼                        │
│  │ (Data Table)       │                   ┌───────────────────┐              │
│  │ 100 test cases     │                   │ Check If          │              │
│  └────────────────────┘                   │ Evaluating?       │              │
│                                           └────────┬──────────┘              │
│                                                    │                         │
│                                           ┌────────┴────────┐                │
│                                           ▼                 ▼                │
│                                  [Not Evaluating]   [Is Evaluating]          │
│                                           │                 │                │
│                                           ▼                 ▼                │
│                              ┌──────────────────┐  ┌──────────────────┐      │
│                              │ Respond Webhook  │  │ Set Eval Outputs │      │
│                              └──────────────────┘  └────────┬─────────┘      │
│                                                             │                │
│                                                             ▼                │
│                                                   ┌──────────────────┐       │
│                                                   │ Set Eval Metrics │       │
│                                                   └──────────────────┘       │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Next Steps After Setup

1. ✅ Create Data Table with 100 tests
2. ✅ Update workflow with Evaluation nodes
3. ✅ Run initial evaluation batch
4. 📊 Review results in Evaluation tab
5. 🔄 Set up scheduled evaluations (optional)

---

*Generated: 2025-12-30*
*Workflow: oik6SebewNAh1cV5*
*Tests: 100*
