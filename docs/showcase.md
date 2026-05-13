# Workflow Showcase

This is the public display shelf: the workflows worth reading first, grouped by what they teach.

The library contains 40 reusable workflow exports. Thirty-six were universalized from a live n8n instance; the rest are hand-curated demos and support workflows. Archived duplicates, health checks, tenant-specific experiments, direct-LLM-HTTP workflows, credentials, pinned data, webhook IDs, and runtime metadata are intentionally excluded.

## Best Starting Points

| Workflow | Pattern | Status |
|---|---|---|
| [`Lead Intake Form Receiver`](../workflows/live-universalized/lead-intake-form-receiver.json) | Form intake, validation, notification, downstream handoff | `published` |
| [`Universal Message Sender`](../workflows/live-universalized/universal-message-sender.json) | Reusable messaging endpoint with routing and wait states | `published` |
| [`SMS Conversation Assistant`](../workflows/live-universalized/sms-conversation-assistant.json) | SMS request parsing, routing, and follow-up messaging | `published` |
| [`Bulk Web Scraper`](../workflows/live-universalized/bulk-web-scraper.json) | Fan-out scraping, aggregation, response shaping | `published` |
| [`Workflow Test Data Table API`](../workflows/live-universalized/workflow-test-data-table-api.json) | n8n-as-code testing with Data Tables | `published` |
| [`Voice Agent Evaluation Harness`](../workflows/live-universalized/voice-agent-evaluation-harness.json) | Voice-agent simulation and evaluation | `published` |
| [`Lead Intake Main`](../workflows/lead-intake-main.json) | Webhook intake, subworkflow enrichment, persistence, notification | `published` |

## Domains

### Lead And CRM

These workflows show practical intake and follow-up patterns: receive structured webhooks, normalize payloads, validate required fields, trigger downstream work, and update CRM-style systems.

- [`Lead Intake Form Receiver`](../workflows/live-universalized/lead-intake-form-receiver.json)
- [`Presales Report Generator`](../workflows/live-universalized/presales-report-generator.json)
- [`CRM Post Call Updater`](../workflows/live-universalized/crm-post-call-updater.json)
- [`CRM Lead Auto Caller`](../workflows/live-universalized/crm-lead-auto-caller.json)
- [`Client Intake Data Lookup`](../workflows/live-universalized/client-intake-data-lookup.json)
- [`Lead Intake Main`](../workflows/lead-intake-main.json)
- [`Lead Enrichment Microservice`](../workflows/lead-enrichment-microservice.json)

### Messaging

Reusable communication endpoints for SMS, email, Slack-style notifications, and provider-backed message delivery.

- [`Universal Message Sender`](../workflows/live-universalized/universal-message-sender.json)
- [`SMS Conversation Assistant`](../workflows/live-universalized/sms-conversation-assistant.json)
- [`Service Business SMS Assistant`](../workflows/live-universalized/service-business-sms-assistant.json)
- [`Email Dispatch Endpoint`](../workflows/live-universalized/email-dispatch-endpoint.json)
- [`Slack Notification Endpoint`](../workflows/live-universalized/slack-notification-endpoint.json)

### Voice And Post-Call Automation

These workflows cover outbound call triggers, post-call event ingestion, CRM update routing, dead-letter recovery, and retry/self-healing endpoints.

- [`Outbound Voice Call With Context`](../workflows/live-universalized/outbound-voice-call-with-context.json)
- [`Reliable Outbound Voice Caller`](../workflows/live-universalized/reliable-outbound-voice-caller.json)
- [`Post Call Event Receiver`](../workflows/live-universalized/post-call-event-receiver.json)
- [`Post Call Orchestrator`](../workflows/live-universalized/post-call-orchestrator.json)
- [`Post Call Self Healing Endpoint`](../workflows/live-universalized/post-call-self-healing-endpoint.json)
- [`Dead Letter Reprocess Endpoint`](../workflows/live-universalized/dead-letter-reprocess-endpoint.json)

### Web Scraping

Webhook-backed scraping patterns ranging from simple single-page fetches to bulk fan-out and provider-specific scraping endpoints.

- [`Bulk Web Scraper`](../workflows/live-universalized/bulk-web-scraper.json)
- [`Web Scraper Endpoint`](../workflows/live-universalized/web-scraper-endpoint.json)
- [`Stealth Scraper Endpoint`](../workflows/live-universalized/stealth-scraper-endpoint.json)
- [`Browser Scraper Endpoint`](../workflows/live-universalized/browser-scraper-endpoint.json)
- [`Fetch Scraper Endpoint`](../workflows/live-universalized/fetch-scraper-endpoint.json)

### Workflow QA And Evaluation

This is the strongest n8n-as-code section: reusable evaluation runners, Data Table-backed test APIs, simulation loops, and voice-agent QA harnesses.

- [`Workflow Test Data Table API`](../workflows/live-universalized/workflow-test-data-table-api.json)
- [`Voice Agent Evaluation Harness`](../workflows/live-universalized/voice-agent-evaluation-harness.json)
- [`Simulation Review Master Orchestrator`](../workflows/live-universalized/simulation-review-master-orchestrator.json)
- [`Simulation Verification Loop`](../workflows/live-universalized/simulation-verification-loop.json)
- [`Conversation Evaluation Endpoint`](../workflows/live-universalized/conversation-evaluation-endpoint.json)
- [`Native Evaluation Runner`](../workflows/live-universalized/native-evaluation-runner.json)
- [`Parallel Evaluation Runner`](../workflows/live-universalized/parallel-evaluation-runner.json)
- [`Universal Evaluation Runner`](../workflows/live-universalized/universal-evaluation-runner.json)

### Knowledge And Infrastructure

Infrastructure and retrieval patterns for vector stores, ingestion, and operational support workflows.

- [`YouTube RAG Ingestion Pipeline`](../workflows/knowledge_management/youtube-rag-pipeline/workflow.json)
- [`Vector Store Setup Utility`](../workflows/live-universalized/vector-store-setup-utility.json)
- [`Execution Logger Endpoint`](../workflows/live-universalized/execution-logger-endpoint.json)
- [`Scheduled Wait Loop`](../workflows/live-universalized/scheduled-wait-loop.json)

## Quality Bar

Every showcased workflow is expected to pass:

- JSON parsing and connection integrity checks
- runtime-field checks for credentials, pinned data, webhook IDs, static data, active state, and active version metadata
- public naming checks for workflow and node names
- direct LLM HTTP checks
- secret and tenant-residue scans

Regenerate the live-derived showcase with:

```bash
npm run export:public
npm run verify
```
