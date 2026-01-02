# Supersystem Workflows Inventory

**Generated**: 2025-12-31
**Last Updated**: 2026-01-01 (Native Evaluation Runner fully implemented)
**Source**: n8n Instance Visual Audit + API

---

## DEV-ONLY Policy (v2.0)

**CRITICAL**: This organization uses a simplified two-phase governance model:

| Phase | Description | Modifiable |
|-------|-------------|------------|
| **DEV** | All active development work | ✅ Yes |
| **ARCHIVED** | Deprecated/superseded workflows | ❌ Read-only |

~~ALPHA/BETA/GA/PROD~~ - **NOT USED** - All these phases have been demoted to DEV.

---

## Governance System Status

| Component | Status |
|-----------|--------|
| Deletion Blocking Hook | ✅ **WORKING** (tested 2026-01-01) |
| governance.yaml | ✅ Valid YAML |
| DEV-ONLY Policy | ✅ Enforced |

---

## Native Evaluation Runner Status

**Workflow**: `mwepwjfX27x4uTMu` - [DEV] Supersystem - Native Evaluation Runner

| Component | Status | Notes |
|-----------|--------|-------|
| Workflow Structure | ✅ Complete | 8 nodes, full flow |
| ElevenLabs API Integration | ✅ Implemented | 3 HTTP nodes configured |
| Data Table Connection | ✅ Connected | `supersystem-evaluation-dataset` (100 tests) |
| Scoring Logic | ✅ Implemented | Pass/fail based on API response |
| **Credential Linking** | ⚠️ **MANUAL STEP** | See `tests/NATIVE-RUNNER-SETUP.md` |

### One-Time Manual Step Required

n8n API does not allow programmatic credential linking. **User must:**

1. Open https://n8n.wranngle.com/workflow/mwepwjfX27x4uTMu
2. Click each HTTP Request node
3. Select "ElevenLabs API Key" credential
4. Save workflow

**Guide**: `tests/NATIVE-RUNNER-SETUP.md`

---

## Summary

| Category | Count |
|----------|-------|
| Total n8n Workflows | ~23 |
| Supersystem Workflows | 7 |
| DEV Phase Workflows | All active |
| ARCHIVED Workflows | 6 |

---

## Supersystem Workflows (7)

✅ **All 7 workflows now have DEV native tags and are registered in governance.yaml**

| Workflow Name | n8n ID | Native Tag | In Governance | Status |
|---------------|--------|------------|---------------|--------|
| [DEV] Supersystem - Native Evaluation Runner | `mwepwjfX27x4uTMu` | ✅ DEV | ✅ Added | **ACTIVE** |
| [DEV] Supersystem - Client Data Lookup (Eval-Ready) | `oik6SebewNAh1cV5` | ✅ DEV | ✅ Added | Active |
| [DEV] Supersystem - Autorefinement Orchestrator | `dKJYSCGIORtUsTSM` | ✅ DEV | ✅ Added | Active |
| [DEV] Supersystem Evaluation Runner | `saxtfujFimKnciaA` | ✅ DEV | ✅ Added | Superseded |
| [DEV] Supersystem - Post-Call Orchestrator (Test) | `8qlDREZy5qtEGkNK` | ✅ DEV | ✅ Added | Test |
| [DEV] Supersystem - Slack Notifier (Test) | `ITUFwZq7ixgjTZMJ` | ✅ DEV | ✅ Added | Test |
| [DEV] Supersystem - Execution Logger (Test) | `Ar2lX0cprjeWB4Kd` | ✅ DEV | ✅ Added | Test |

### Completed Actions ✅
1. ~~Apply DEV native tag to all 7 workflows~~ **DONE**
2. ~~Add all 7 to governance.yaml~~ **DONE**

### Remaining Actions
3. Consider archiving "[DEV] Supersystem Evaluation Runner" (superseded by Native version)

---

## Other DEV Workflows (10)

| Workflow Name | Native Tag | Tag Matches Name? | Notes |
|---------------|------------|-------------------|-------|
| [DEV] Southeastern Wyoming Garage Doors SMS Tool | DEV | ✅ Yes | SEWY agent SMS |
| [DEV] Pipedrive Lead Auto-Caller | ALPHA | ⚠️ No | Should rename to [ALPHA] |
| [DEV] ElevenLabs Call Completed - Update Pipedrive | GA | ⚠️ No | Should rename to [GA] |
| [DEV] ElevenLabs Twilio Outbound - Bulletproof Edition | GA | ⚠️ No | Should rename to [GA] |
| [DEV] ElevenLabs Twilio Outbound Call with Client Data | PROD | ⚠️ No | Should rename to [PROD] |
| [DEV] Transcript Field Extractor v2 - 5-Component Architecture | ❌ None | - | Needs DEV tag |
| [DEV] Transcript Field Extractor - AI Agent | ❌ None | - | Needs DEV tag |
| [DEV] Voice Agent Tester v2.0 | ❌ None | - | Needs DEV tag |
| [DEV] Sarah SMS Tool - ElevenLabs Webhook | ❌ None | - | Should be ARCHIVED |
| [DEV] Get ElevenLabs Agent | DEV | ✅ Yes | Utility workflow |

### Name/Tag Status (DEV-ONLY Policy Applied)

**Per DEV-ONLY policy, all active workflows are now DEV phase.**

| Workflow | Native Tag | Status |
|----------|------------|--------|
| [DEV] Pipedrive Lead Auto-Caller | DEV | ✅ Compliant |
| [DEV] ElevenLabs Call Completed | DEV | ✅ Compliant |
| [DEV] ElevenLabs Twilio Outbound - Bulletproof | DEV | ✅ Compliant |
| [DEV] ElevenLabs Twilio Outbound Call with Client Data | DEV | ✅ Compliant |

---

## Archived Workflows (6)

| Workflow Name | Native Tag | Tag Matches Name? | Notes |
|---------------|------------|-------------------|-------|
| [ARCHIVED] Voice Agent Tester v2.0 - Automated Simulation | ❌ None | - | Needs ARCHIVED tag |
| [ARCHIVED] Voice Agent Tester - Automated Simulation | DEV | ⚠️ No | Should be ARCHIVED |
| [ARCHIVED] Single Simulation Test | ❌ None | - | Needs ARCHIVED tag |
| [ARCHIVED] Sarah SMS Tool - BULLETPROOF v2.2 (dup 3) | ARCHIVED | ✅ Yes | Correctly tagged |
| [ARCHIVED] Sarah SMS Tool - BULLETPROOF v2.2 (dup 2) | ARCHIVED | ✅ Yes | Correctly tagged |
| [ARCHIVED] Sarah SMS Tool - BULLETPROOF v2.2 (dup 1) | ARCHIVED | ✅ Yes | Correctly tagged |

---

## Governance Gap Analysis

### Missing from governance.yaml
1. ~~All 7 Supersystem workflows~~ ✅ **ADDED**
2. [DEV] Transcript Field Extractor v2 - 5-Component Architecture
3. [DEV] Sarah SMS Tool - ElevenLabs Webhook

### Workflows Needing Native Tags
| Workflow | Required Tag |
|----------|--------------|
| ~~All 7 Supersystem workflows~~ | ~~DEV~~ ✅ **DONE** |
| [DEV] Transcript Field Extractor v2 | DEV |
| [DEV] Transcript Field Extractor - AI Agent | DEV |
| [DEV] Voice Agent Tester v2.0 | DEV |
| [ARCHIVED] Voice Agent Tester v2.0 - Automated Simulation | ARCHIVED |
| [ARCHIVED] Voice Agent Tester - Automated Simulation | ARCHIVED |
| [ARCHIVED] Single Simulation Test | ARCHIVED |

### Workflows Needing Rename (to match tag)
4 workflows need name prefix changed to match their actual phase.

---

## Evaluations Status

| Workflow | Has Evaluations? | Data Table |
|----------|------------------|------------|
| [DEV] Supersystem - Native Evaluation Runner | ✅ Yes | supersystem-evaluation-dataset (100 rows) |
| Others | ❌ No | - |

---

## Completed Actions ✅

1. ✅ **DEV-ONLY Policy Implemented** - All ALPHA/BETA/GA/PROD demoted to DEV
2. ✅ **Governance Hook Fixed** - Now correctly reads tool_name from stdin
3. ✅ **Deletion Blocking Verified** - Hook blocks n8n_delete_workflow calls
4. ✅ **governance.yaml Valid** - YAML structure fixed and validated
5. ✅ **Supersystem Workflows Tagged** - All 7 have DEV native tags

## Remaining Items

| Priority | Item | Status |
|----------|------|--------|
| Low | Apply DEV tag to remaining untagged workflows | Optional |
| Low | Archive superseded workflows | When convenient |

---

*Last updated: 2026-01-01*
*Governance system: FULLY OPERATIONAL*
