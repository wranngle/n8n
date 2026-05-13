# Workflows

Index of reusable workflow demos in this repository. For a more promotional overview, start with [`docs/showcase.md`](docs/showcase.md).

## Catalog At A Glance

| Domain | Count | Highlights |
|---|---:|---|
| Lead and CRM | 7 | form intake, enrichment, presales reporting, CRM update routing |
| Messaging | 5 | universal sender, SMS assistant, email dispatch, notification endpoints |
| Voice and post-call automation | 6 | outbound calling, post-call receivers, retry and dead-letter handling |
| Web scraping | 5 | single-page scraping, bulk scraping, stealth/browser/fetch variants |
| Workflow QA and evaluation | 8 | Data Table test API, voice-agent harness, simulation runners |
| Knowledge and infrastructure | 4 | RAG ingestion, vector-store setup, execution logging, wait-loop orchestration |

## Library Index

| File | State | Purpose | Integrations |
|---|---|---|---|
| [`workflows/lead-intake-main.json`](workflows/lead-intake-main.json) | `published` | Inbound lead intake with enrichment, persistence, notification, and downstream handoff. | Webhook, Execute Workflow, Postgres, Email, HTTP |
| [`workflows/lead-enrichment-microservice.json`](workflows/lead-enrichment-microservice.json) | `published` | Reusable enrichment endpoint that normalizes a lead domain, calls an enrichment provider, and returns a compact response. | Webhook, Code, HTTP, Respond to Webhook |
| [`workflows/knowledge_management/youtube-rag-pipeline/workflow.json`](workflows/knowledge_management/youtube-rag-pipeline/workflow.json) | `draft` | Content ingestion pipeline for metadata, comments, transcripts, document formatting, embeddings, and vector storage. | YouTube, Code, Set, LangChain Splitter, Embeddings, Qdrant |

## Universalized Live Workflows

These workflows were exported from the live n8n instance and converted into generic public-library demos. Archived duplicates, health checks, and direct-LLM-HTTP workflows are intentionally excluded from this section.

| File | State | Purpose | Integrations |
|---|---|---|---|
| [`workflows/live-universalized/client-intake-data-lookup.json`](workflows/live-universalized/client-intake-data-lookup.json) | `draft` | Reusable intake endpoint that assembles client configuration and lookup data. | data-table, http, webhook |
| [`workflows/live-universalized/lead-intake-form-receiver.json`](workflows/live-universalized/lead-intake-form-receiver.json) | `published` | Production-style form receiver with validation, notification, and downstream handoff. | email, http, webhook |
| [`workflows/live-universalized/presales-report-generator.json`](workflows/live-universalized/presales-report-generator.json) | `draft` | Webhook-driven presales research and report generation workflow. | email, http, webhook |
| [`workflows/live-universalized/universal-message-sender.json`](workflows/live-universalized/universal-message-sender.json) | `published` | Reusable messaging endpoint with routing, provider calls, waits, and response handling. | http, webhook |
| [`workflows/live-universalized/sms-conversation-assistant.json`](workflows/live-universalized/sms-conversation-assistant.json) | `published` | SMS assistant workflow for request parsing, routing, and follow-up messaging. | http, webhook |
| [`workflows/live-universalized/service-business-sms-assistant.json`](workflows/live-universalized/service-business-sms-assistant.json) | `draft` | Service-business SMS assistant demo with Twilio delivery and structured response handling. | twilio, webhook |
| [`workflows/live-universalized/email-dispatch-endpoint.json`](workflows/live-universalized/email-dispatch-endpoint.json) | `draft` | Authenticated email sending endpoint with validation and response shaping. | email, webhook |
| [`workflows/live-universalized/vector-store-setup-utility.json`](workflows/live-universalized/vector-store-setup-utility.json) | `draft` | Utility workflow for creating and validating vector-store infrastructure. | http, webhook |
| [`workflows/live-universalized/execution-logger-endpoint.json`](workflows/live-universalized/execution-logger-endpoint.json) | `draft` | Small endpoint for capturing workflow execution telemetry. | webhook |
| [`workflows/live-universalized/slack-notification-endpoint.json`](workflows/live-universalized/slack-notification-endpoint.json) | `draft` | Webhook endpoint for formatting and sending operational Slack notifications. | webhook |
| [`workflows/live-universalized/client-data-lookup-endpoint.json`](workflows/live-universalized/client-data-lookup-endpoint.json) | `draft` | Reusable lookup endpoint for workflow composition. | webhook |
| [`workflows/live-universalized/scheduled-wait-loop.json`](workflows/live-universalized/scheduled-wait-loop.json) | `draft` | Schedule and webhook controlled wait-loop orchestration pattern. | http, webhook |
| [`workflows/live-universalized/outbound-voice-call-with-context.json`](workflows/live-universalized/outbound-voice-call-with-context.json) | `draft` | Outbound voice-call trigger that enriches requests with client context. | http, webhook |
| [`workflows/live-universalized/reliable-outbound-voice-caller.json`](workflows/live-universalized/reliable-outbound-voice-caller.json) | `draft` | Outbound voice-call endpoint with validation, routing, wait, and response handling. | http, webhook |
| [`workflows/live-universalized/crm-post-call-updater.json`](workflows/live-universalized/crm-post-call-updater.json) | `draft` | Post-call workflow that routes call outcomes into CRM updates. | pipedrive, webhook |
| [`workflows/live-universalized/post-call-event-receiver.json`](workflows/live-universalized/post-call-event-receiver.json) | `draft` | Webhook receiver for post-call events with routing and downstream handoff. | http, webhook |
| [`workflows/live-universalized/post-call-orchestrator.json`](workflows/live-universalized/post-call-orchestrator.json) | `draft` | Orchestrates post-call processing across several internal workflow endpoints. | http, webhook |
| [`workflows/live-universalized/crm-lead-auto-caller.json`](workflows/live-universalized/crm-lead-auto-caller.json) | `draft` | CRM-triggered workflow that starts an outbound call flow for qualified leads. | http, pipedrive, webhook |
| [`workflows/live-universalized/post-call-self-healing-endpoint.json`](workflows/live-universalized/post-call-self-healing-endpoint.json) | `draft` | Endpoint pattern for retrying or repairing failed post-call processing. | webhook |
| [`workflows/live-universalized/dead-letter-reprocess-endpoint.json`](workflows/live-universalized/dead-letter-reprocess-endpoint.json) | `draft` | Dead-letter reprocessing endpoint for failed workflow events. | webhook |
| [`workflows/live-universalized/bulk-web-scraper.json`](workflows/live-universalized/bulk-web-scraper.json) | `published` | Bulk URL scraping workflow with fan-out, aggregation, and response shaping. | http, webhook |
| [`workflows/live-universalized/web-scraper-endpoint.json`](workflows/live-universalized/web-scraper-endpoint.json) | `published` | Simple webhook scraping endpoint for single-page extraction. | http, webhook |
| [`workflows/live-universalized/stealth-scraper-endpoint.json`](workflows/live-universalized/stealth-scraper-endpoint.json) | `draft` | HTTP-backed stealth scraping endpoint pattern. | http, webhook |
| [`workflows/live-universalized/browser-scraper-endpoint.json`](workflows/live-universalized/browser-scraper-endpoint.json) | `draft` | Browser-backed scraping endpoint pattern. | http, webhook |
| [`workflows/live-universalized/fetch-scraper-endpoint.json`](workflows/live-universalized/fetch-scraper-endpoint.json) | `draft` | Fetch-backed scraping endpoint pattern. | http, webhook |
| [`workflows/live-universalized/workflow-test-data-table-api.json`](workflows/live-universalized/workflow-test-data-table-api.json) | `published` | Workflow-as-code test API using n8n Data Tables for cases and results. | data-table, webhook |
| [`workflows/live-universalized/voice-agent-evaluation-harness.json`](workflows/live-universalized/voice-agent-evaluation-harness.json) | `published` | Voice-agent simulation and evaluation harness. | http, webhook |
| [`workflows/live-universalized/simulation-review-master-orchestrator.json`](workflows/live-universalized/simulation-review-master-orchestrator.json) | `draft` | Master orchestration workflow for simulation review runs. | http, webhook |
| [`workflows/live-universalized/simulation-verification-loop.json`](workflows/live-universalized/simulation-verification-loop.json) | `draft` | Looping verification workflow with waits, checks, and terminal responses. | http, webhook |
| [`workflows/live-universalized/conversation-evaluation-endpoint.json`](workflows/live-universalized/conversation-evaluation-endpoint.json) | `draft` | Conversation evaluation endpoint for voice-agent QA. | http, webhook |
| [`workflows/live-universalized/native-evaluation-runner.json`](workflows/live-universalized/native-evaluation-runner.json) | `draft` | n8n-native evaluation runner pattern using evaluation trigger nodes. | http, n8n-evaluation, webhook |
| [`workflows/live-universalized/parallel-evaluation-runner.json`](workflows/live-universalized/parallel-evaluation-runner.json) | `draft` | Parallel fan-out evaluation runner with aggregation-ready responses. | webhook |
| [`workflows/live-universalized/voice-agent-config-lookup.json`](workflows/live-universalized/voice-agent-config-lookup.json) | `draft` | Lookup helper for voice-agent configuration. | http, webhook |
| [`workflows/live-universalized/extraction-engine-test-harness.json`](workflows/live-universalized/extraction-engine-test-harness.json) | `draft` | Test harness that invokes an extraction subworkflow. | webhook |
| [`workflows/live-universalized/pipeline-test-webhook-processor-live.json`](workflows/live-universalized/pipeline-test-webhook-processor-live.json) | `draft` | Live-instance version of the pipeline smoke-test processor. | webhook |
| [`workflows/live-universalized/universal-evaluation-runner.json`](workflows/live-universalized/universal-evaluation-runner.json) | `draft` | Manual evaluation runner that dispatches test payloads into target workflows. | n8n |

## Development Utilities

| File | State | Purpose |
|---|---|---|
| [`workflows/dev/pipeline-test-webhook-processor.json`](workflows/dev/pipeline-test-webhook-processor.json) | `draft` | Minimal webhook processor used for smoke-testing import, auth, request parsing, and response handling. |
| [`workflows/dev/pipeline-test-evaluation.yaml`](workflows/dev/pipeline-test-evaluation.yaml) | support file | Test cases for the pipeline smoke workflow. |

## Import Notes

- Create credentials in the destination n8n instance before importing, then select the local credentials on imported nodes if needed.
- Keep secrets in n8n credentials or environment variables, never in workflow JSON.
- Configure placeholder env references in the target n8n runtime, or change the expressions to names that match your environment.
- Run `npm run verify` after modifying workflow JSON.
- Validate with n8n before create/update in a live tenant.

## Conversion Checklist

Before adding a workflow exported from a live n8n instance:

- Run `node scripts/convert-workflow.js <export.json> <target.json>`.
- Confirm no `credentials`, `pinData`, `webhookId`, `staticData`, or `meta.instanceId` fields remain.
- Replace tenant URLs with `{{ $env.* }}` expressions.
- Replace real people, customers, phone numbers, addresses, and private notes with generic examples.
- Rename the workflow and nodes for the reusable pattern, not the original client or tenant.
- Add or update the entry in [`workflows/registry.yaml`](workflows/registry.yaml).
