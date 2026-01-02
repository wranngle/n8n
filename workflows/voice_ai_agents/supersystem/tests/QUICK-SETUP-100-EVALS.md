# Quick Setup: 100 n8n Evaluations (5 minutes)

## Status: Workflow Ready, Data Table Needed

**Workflow**: `oik6SebewNAh1cV5` - Updated to handle evaluation inputs
**URL**: https://n8n.wranngle.com/workflow/oik6SebewNAh1cV5

---

## Step 1: Create Data Table (2 min)

1. Go to https://n8n.wranngle.com
2. Left sidebar → **Data Tables**
3. Click **"+ Create Data Table"**
4. Name: `supersystem-evaluation-dataset`
5. Add columns:

| Column | Type |
|--------|------|
| test_id | Number |
| category | Text |
| test_name | Text |
| input_phone | Text |
| input_email | Text |
| expected_success | Text |
| expected_client_found | Text |
| expected_fields | Text |
| description | Text |
| actual_output | Text |
| pass_fail | Text |
| execution_time_ms | Number |
| run_timestamp | Text |

---

## Step 2: Import 100 Test Cases (1 min)

1. Open your Data Table
2. Click **Import** button
3. Upload: `n8n-evaluation-dataset.csv` (in this folder)
4. Map columns → Confirm

**File location**:
```
workflows/voice_ai_agents/supersystem/tests/n8n-evaluation-dataset.csv
```

---

## Step 3: Add Evaluation Nodes (2 min)

Open workflow: https://n8n.wranngle.com/workflow/oik6SebewNAh1cV5

### 3a. Add Evaluation Trigger
1. Add node: **Evaluation Trigger**
2. Source: **Data Table**
3. Select: `supersystem-evaluation-dataset`
4. Position: Below the Webhook node

### 3b. Add Merge Node
1. Add node: **Merge**
2. Connect: Webhook → Merge (input 1)
3. Connect: Evaluation Trigger → Merge (input 2)
4. Connect: Merge → Simulate Client Lookup

### 3c. Add Check If Evaluating
1. Add node: **Evaluation** (operation: Check If Evaluating)
2. Insert after "Simulate Client Lookup"
3. Route output 1 → Respond to Webhook (not evaluating)
4. Route output 2 → Set Evaluation Outputs (is evaluating)

### 3d. Add Set Evaluation Outputs
1. Add node: **Evaluation** (operation: Set Outputs)
2. Select Data Table: `supersystem-evaluation-dataset`
3. Map outputs:
   - `actual_output` → `{{ JSON.stringify($json) }}`
   - `pass_fail` → `{{ $json.success ? 'PASS' : 'FAIL' }}`
   - `execution_time_ms` → `{{ $json.latency_ms }}`
   - `run_timestamp` → `{{ new Date().toISOString() }}`

### 3e. Add Set Evaluation Metrics
1. Add node: **Evaluation** (operation: Set Metrics)
2. Add metrics:
   - `success_rate` → `{{ $json.success ? 1 : 0 }}`
   - `latency_ms` → `{{ $json.latency_ms || 0 }}`

---

## Step 4: Activate & Run (30 sec)

1. **Save** the workflow
2. **Activate** the workflow (toggle ON)
3. Go to **Evaluation** tab
4. You should see **100 test cases**
5. Click **"Run All"**

---

## Architecture After Setup

```
┌─────────────────┐     ┌─────────────────┐
│ Webhook Trigger │────▶│                 │
└─────────────────┘     │      Merge      │────▶ Simulate Lookup ────▶ Check If Eval?
                        │                 │                                   │
┌─────────────────┐     │                 │                          ┌───────┴───────┐
│ Eval Trigger    │────▶│                 │                          │               │
│ (100 tests)     │     └─────────────────┘                   Not Eval         Is Eval
└─────────────────┘                                                  │               │
                                                                     ▼               ▼
                                                              ┌──────────┐   ┌────────────┐
                                                              │ Respond  │   │ Set Outputs│
                                                              │ Webhook  │   │ + Metrics  │
                                                              └──────────┘   └────────────┘
```

---

## Verification

After running evaluations, check:
- [ ] 100 tests listed in Evaluation tab
- [ ] Pass/Fail results populated
- [ ] Metrics dashboard shows success_rate and latency_ms
- [ ] Data Table rows have actual_output filled

---

## Files in This Folder

| File | Purpose |
|------|---------|
| `n8n-evaluation-dataset.csv` | 100 test cases - import to Data Table |
| `n8n-evaluation-dataset.json` | JSON backup |
| `workflow-with-evaluations.json` | Pre-built workflow reference |
| `generate-100-n8n-tests.js` | Script that generated tests |
| `N8N-EVALUATIONS-SETUP.md` | Detailed documentation |
| `QUICK-SETUP-100-EVALS.md` | This file |

---

*Generated: 2025-12-30*
*Workflow ID: oik6SebewNAh1cV5*
*Total Tests: 100*
