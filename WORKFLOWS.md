# Workflows

Per-workflow index for the sanitized n8n workflow library in this repo.

## Production workflows (`workflows/`)

| File | Purpose |
|---|---|
| [`lead-intake-main.json`](workflows/lead-intake-main.json) | Inbound lead form / API capture; normalizes payload, validates schema, hands off to enrichment. |
| [`lead-enrichment-microservice.json`](workflows/lead-enrichment-microservice.json) | Pulls account context from CRM-shaped adapters; outputs an enriched lead consumed by downstream voice routing. |
| [`registry.yaml`](workflows/registry.yaml) | Workflow registry (lookup table for downstream callers). |
| [`governance.yaml`](workflows/governance.yaml) | Workflow phase tracking (DEV / ARCHIVED). |

## Knowledge management (`workflows/knowledge_management/`)

| File | Purpose |
|---|---|
| [`youtube-rag-pipeline/workflow.json`](workflows/knowledge_management/youtube-rag-pipeline/workflow.json) | YouTube transcript → embeddings → retrieval pipeline for the local knowledge base. |

## Development workflows (`workflows/dev/`)

| File | Purpose |
|---|---|
| [`hook_test.json`](workflows/dev/hook_test.json) | Smoke-test webhook for hook-system development. |
| [`pipeline-test-webhook-processor.json`](workflows/dev/pipeline-test-webhook-processor.json) | Pipeline test harness for end-to-end webhook flows. |
| [`pipeline-test-evaluation.yaml`](workflows/dev/pipeline-test-evaluation.yaml) | Eval spec for the pipeline test. |
| [`evaluations/`](workflows/dev/evaluations/) | Generic eval YAMLs (lead routing, slack notifier, post-call orchestrator, etc.). ElevenLabs / voice-agent-specific evals migrated to [`wranngle/voice_ai_agent_evals`](https://github.com/wranngle/voice_ai_agent_evals). |

## Sanitization rules (apply before publicize)

Per `scripts/sanitize-workflow.js` (when added) plus manual review:

- Strip `credentials`, `pinData`, `webhookId`, `meta.instanceId`, `staticData`
- Replace real `parameters.url` with `${ENV_VAR}`
- Replace credential refs with `{{ $env.SERVICE_KEY }}`
- Strip `nodes[].notes` (frequently contain client-specific context)
- Scrub `nodes[].parameters.{prompt,text,systemMessage,message,body}` for hardcoded customer names, real phone numbers, addresses, employer references, PII
- Anonymize workflow `name` and top-level `id` if they reference real clients

See `docs/WEBHOOK_AUTH.md` for the shared-secret authentication pattern every n8n webhook must enforce.
