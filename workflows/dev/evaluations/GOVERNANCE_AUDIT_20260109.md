# n8n Workflow Governance Audit Report

**Audit Date**: 2026-01-09
**Auditor**: Claude (ULTRATHINK Mode)
**Status**: COMPLETE

---

## Executive Summary

Adversarial audit of the n8n workflow inventory revealed **6 critical/high findings** related to:
- Hook configuration drift from policy
- Duplicate active workflows
- Governance.yaml desynchronization
- Naming inconsistencies

**Fixes Applied**: 3 of 6
**Fixes Pending**: 3 of 6 (require user decisions)

---

## Finding #1: Hook Phase Configuration Mismatch [FIXED]

**Severity**: CRITICAL

**Issue**: `naming-convention.js` allowed 6 phases while governance policy only permits 2.

| File | Before | After |
|------|--------|-------|
| `naming-convention.js:23` | DEV, ALPHA, BETA, GA, PROD, ARCHIVED | DEV, ARCHIVED |
| `workflow-governance.js:36` | DEV, ARCHIVED | No change |
| `governance.yaml:32` | DEV, ARCHIVED | No change |

**Root Cause**: Hook file was not updated when DEV-ONLY policy was enacted.

**Fix Applied**: Updated `naming-convention.js` line 23 to match policy.

---

## Finding #2: Duplicate Active Workflows [PARTIAL FIX]

**Severity**: CRITICAL

### Autorefinement Orchestrator (3 copies)

| ID | Name | Active | Action |
|---|---|---|---|
| `c9dFlI51VhvANoEj` | Autorefinement Orchestrator v2 | false | **ARCHIVED** |
| `zeQNX4g5mQlE4EQ0` | Autorefinement Orchestrator v2 | true | KEEP |
| `dKJYSCGIORtUsTSM` | Autorefinement Orchestrator | true | USER DECISION |

**Fix Applied**: Archived `c9dFlI51VhvANoEj` as duplicate.

### Client Data Lookup (2 copies)

| ID | Name | Active | Action |
|---|---|---|---|
| `NBvO92RVDa8pCK0d` | Client Data Lookup (Test) | true | USER DECISION |
| `oik6SebewNAh1cV5` | Client Data Lookup (Eval-Ready) | true | USER DECISION |

**Pending**: User must decide which is canonical.

---

## Finding #3: Untagged Workflow [FIXED]

**Severity**: HIGH

| ID | Name | Before | After |
|---|---|---|---|
| `p60GgdEwiDcIrxgp` | Universal Evaluation Runner v2 | NO TAG | DEV |

**Fix Applied**: Added DEV tag via n8n-mcp.

---

## Finding #4: Governance.yaml Drift [NEEDS MANUAL UPDATE]

**Severity**: HIGH

### Stale Entries (exist in governance but NOT in n8n)

| ID | Name | Issue |
|---|---|---|
| `tfie4q0zRL80PpQC` | Sarah SMS Tool - Demo Mode | Marked deleted, still tracked |
| `saxtfujFimKnciaA` | Supersystem Evaluation Runner | Ghost entry, never existed |

### Missing Entries (exist in n8n but NOT in governance)

| ID | Name | Issue |
|---|---|---|
| `p60GgdEwiDcIrxgp` | Universal Evaluation Runner v2 | Untracked |

**Action Required**: Manual edit of `workflows/governance.yaml`

---

## Finding #5: Naming Inconsistency [NEEDS MANUAL UPDATE]

**Severity**: MEDIUM

| ID | Live Name | Governance Name |
|---|---|---|
| `wZryG5tdRBFZUNMF` | [DEV] Southeastern Wyoming Garage Doors SMS Tool | Southeastern Wyoming Garage Doors SMS Tool |

**Action Required**: Update governance.yaml to include `[DEV]` prefix.

---

## Finding #6: Active Status Drift [DEFERRED]

**Severity**: MEDIUM

Some workflows have stale `active` flags in governance.yaml that don't match n8n reality.

**Recommendation**: Implement automated sync hook on PostToolUse.

---

## Framework Improvements Embedded

### 1. Hook Phase Alignment (naming-convention.js)

```javascript
// OLD (line 23):
const VALID_PHASES = ['DEV', 'ALPHA', 'BETA', 'GA', 'PROD', 'ARCHIVED'];

// NEW (line 23):
// DEV-ONLY POLICY: Only DEV and ARCHIVED phases allowed
const VALID_PHASES = ['DEV', 'ARCHIVED'];
```

### 2. Recommended New Hook: sync-governance.js

```javascript
/**
 * sync-governance.js
 * 
 * PostToolUse hook to sync governance.yaml with n8n reality.
 * 
 * Triggers: n8n_create_workflow, n8n_update_*
 * 
 * Actions:
 * 1. Update active status
 * 2. Update name if changed
 * 3. Flag orphaned entries
 */
```

### 3. Recommended Enhancement: Lower Similarity Threshold

In `workflow-governance.js`, lower clone threshold from 70% to 50% to catch more duplicates.

---

## Remediation Checklist

| # | Task | Status |
|---|---|---|
| 1 | Fix naming-convention.js VALID_PHASES | ✅ DONE |
| 2 | Tag p60GgdEwiDcIrxgp with DEV | ✅ DONE |
| 3 | Archive c9dFlI51VhvANoEj duplicate | ✅ DONE |
| 4 | Remove stale entries from governance.yaml | ⏳ MANUAL |
| 5 | Add p60GgdEwiDcIrxgp to governance.yaml | ⏳ MANUAL |
| 6 | Fix wZryG5tdRBFZUNMF name in governance.yaml | ⏳ MANUAL |
| 7 | User decision: Client Data Lookup consolidation | ❓ PENDING |
| 8 | User decision: Autorefinement Orchestrator consolidation | ❓ PENDING |
| 9 | Create sync-governance.js hook | 📋 PLANNED |
| 10 | Create orphan-detection.js scheduled task | 📋 PLANNED |

---

## Lessons Learned (For CLAUDE.md)

1. **Hook files can drift from policy**: When changing governance policy, ALL hooks must be updated atomically.

2. **Governance.yaml needs periodic reconciliation**: The manual YAML file inevitably drifts from n8n reality.

3. **Duplicate detection threshold too high**: 70% allows functional duplicates through. Lower to 50%.

4. **No automated sync mechanism**: Without PostToolUse sync, active status will always drift.

5. **Naming convention enforcement is blocking-only**: It catches violations at create time but doesn't remediate existing violations.

---

*Generated by ULTRATHINK adversarial audit mode*
