# ElevenLabs Workflow Supersystem

**Version**: 1.0 (Bootstrapper Edition)
**Created**: 2025-12-29
**Status**: ✅ TESTED AND WORKING

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│              ELEVENLABS SUPERSYSTEM (v1.0 Lite)                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  PRE-CALL: Client Data Lookup                                   │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ Webhook: /client-lookup                                    │ │
│  │ Input: phone OR email                                      │ │
│  │ Storage: Google Sheets (real-time lookup, no cache)        │ │
│  │ Response: { client_name, company, notes... }               │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  POST-CALL: Orchestrator                                        │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ Webhook: /post-call                                        │ │
│  │ Routes to subworkflows via HTTP Request (webhook chaining) │ │
│  └────────────────────────────────────────────────────────────┘ │
│       │                                                          │
│       ├──────────────┬──────────────┬──────────────┐            │
│       ▼              ▼              ▼              ▼            │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐        │
│  │Execution │  │  Slack   │  │Transcript│  │  Future  │        │
│  │ Logger   │  │ Notifier │  │Extractor │  │ Subflow  │        │
│  │(G.Sheets)│  │          │  │ (EXISTS) │  │          │        │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘        │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Workflows

| File | n8n ID | Webhook Path | Status |
|------|--------|--------------|--------|
| `execution-logger-test.json` | `Ar2lX0cprjeWB4Kd` | `/log-execution-test` | ✅ Active |
| `slack-notifier-test.json` | `ITUFwZq7ixgjTZMJ` | `/slack-notify-test` | ✅ Active |
| `client-data-lookup-test.json` | `oik6SebewNAh1cV5` | `/client-lookup-test` | ✅ Active |
| `post-call-orchestrator-test.json` | `8qlDREZy5qtEGkNK` | `/post-call-test` | ✅ Active |

### Production Versions (TODO)
| File | Purpose | Webhook Path | Status |
|------|---------|--------------|--------|
| `execution-logger.json` | Log calls to Google Sheets | `/log-execution` | Pending |
| `slack-notifier.json` | Send Slack alerts | `/slack-notify` | Pending |
| `client-data-lookup.json` | Real-time client lookup | `/client-lookup` | Pending |
| `post-call-orchestrator.json` | Route post-call events | `/post-call` | Pending |

## Google Sheets Setup

Create a Google Sheet with these tabs:

### Tab 1: "Execution Logs"
| Column | Type | Description |
|--------|------|-------------|
| A | timestamp | ISO 8601 datetime |
| B | conversation_id | ElevenLabs conv ID |
| C | agent_name | Voice agent name |
| D | caller_phone | E.164 format |
| E | duration_seconds | Call duration |
| F | outcome | success/failure/incomplete |
| G | extracted_fields | JSON string of extracted data |
| H | errors | Any error messages |

### Tab 2: "Clients"
| Column | Type | Description |
|--------|------|-------------|
| A | phone | E.164 format (lookup key) |
| B | email | Email (secondary lookup) |
| C | first_name | Client first name |
| D | last_name | Client last name |
| E | company | Company name |
| F | notes | Free-form notes |
| G | last_call | Last interaction date |

## Integration Test Results (2025-12-29)

| Step | Workflow | Result | Latency |
|------|----------|--------|---------|
| Pre-call | Client Data Lookup | ✅ PASS | 8ms |
| Post-call | Orchestrator → Execution Logger | ✅ PASS | ~120ms |
| Post-call | Orchestrator → Slack Notifier | ✅ PASS | ~120ms |

**Key Fix Applied**: Added Merge node to orchestrator for proper parallel branch aggregation.

## Testing

Each workflow can be tested independently:

```bash
# Test Execution Logger
curl -X POST https://n8n.wranngle.com/webhook/log-execution-test \
  -H "Content-Type: application/json" \
  -d '{"conversation_id":"test_123","agent_name":"Sarah","outcome":"success"}'

# Test Slack Notifier
curl -X POST https://n8n.wranngle.com/webhook/slack-notify-test \
  -H "Content-Type: application/json" \
  -d '{"agent_name":"Sarah","outcome":"success","duration_seconds":180}'

# Test Client Lookup (known client)
curl -X POST https://n8n.wranngle.com/webhook/client-lookup-test \
  -H "Content-Type: application/json" \
  -d '{"phone":"+15551234567"}'

# Test Full Orchestrator (triggers all subworkflows)
curl -X POST https://n8n.wranngle.com/webhook/post-call-test \
  -H "Content-Type: application/json" \
  -d '{"conversation_id":"test_123","agent_name":"Sarah","outcome":"success","caller_phone":"+15551234567","duration_seconds":180}'
```

## Upgrade Path

When you outgrow Google Sheets:
1. Export Sheets to Supabase (free tier: 500MB)
2. Update workflows to use Postgres node instead of Google Sheets
3. Add Redis if you need sub-100ms lookups

## Dependencies

- Google Sheets credential configured in n8n
- Slack incoming webhook (for notifier)
- ElevenLabs agent configured with post_call webhook pointing to orchestrator
