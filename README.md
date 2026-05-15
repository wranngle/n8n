# n8n

Sanitized n8n workflow library: lead intake, enrichment, post-call processing, and webhook security middleware. Generic n8n surface only — voice-agent / ElevenLabs-specific code lives at [`wranngle/voice_ai_agent_evals`](https://github.com/wranngle/voice_ai_agent_evals).

## What's in here

- **`workflows/`** — production flows ([`lead-intake-main.json`](workflows/lead-intake-main.json), [`lead-enrichment-microservice.json`](workflows/lead-enrichment-microservice.json), `dev/`, `knowledge_management/youtube-rag-pipeline/`) plus governance + registry YAMLs
- **`scripts/`** — workflow API utilities ([`activate-workflow.js`](scripts/activate-workflow.js), [`list_workflows.js`](scripts/list_workflows.js), `update_workflow.py`, etc.), governance ([`governance-engine.js`](scripts/governance-engine.js)), and webhook security ([`secure-n8n-webhooks.js`](scripts/secure-n8n-webhooks.js), [`secure-internal-callers.js`](scripts/secure-internal-callers.js))
- **`templates/`** — generic n8n templates
- **`tests/`** — workflow integration smoke tests
- **`context/`** — local knowledge bases (YouTube + Discord research) feeding the workflow generator

## Demo

🎬 _Loom walkthrough coming soon — workflow library tour: lead intake, enrichment, post-call processing, webhook security._

<!-- Replace with: <a href="https://www.loom.com/share/<id>"><img src="https://cdn.loom.com/sessions/thumbnails/<id>-with-play.gif" alt="Workflow library demo"></a> -->

## Architecture

See [`ARCHITECTURE.md`](ARCHITECTURE.md) for the lead intake → CRM → call → post-call flow and how this repo connects to its satellites:

- [`wranngle/voice_ai_agent_evals`](https://github.com/wranngle/voice_ai_agent_evals) — eval harness for ElevenLabs voice agents (the production agent runtime, prompt versioning, scenario framework)
- [`wranngle/gtm_ops`](https://github.com/wranngle/gtm_ops) — unified GTM motion runtime (presales pipeline, ops-console, audit log surface)

## Webhook authentication

Every n8n webhook in this repo requires an `X-Webhook-Secret` header validated against `N8N_WEBHOOK_SECRET`. See [`docs/WEBHOOK_AUTH.md`](docs/WEBHOOK_AUTH.md) for the rotation playbook. ElevenLabs HMAC-signed webhooks (different protocol — HMAC-SHA256 over `<timestamp>.<body>`) are handled in `voice_ai_agent_evals`.

## Workflow governance

- **DEV**: all active development. Modifiable.
- **ARCHIVED**: deprecated, read-only. Deletion is blocked; archive instead.
- New workflows auto-tag as DEV.

`workflows/governance.yaml` is the authoritative phase tracker; `scripts/governance-engine.js` enforces it. See [`WORKFLOWS.md`](WORKFLOWS.md) for the per-workflow index.

## Running

```bash
# Workflow API utilities (require N8N_API_KEY)
node scripts/list_workflows.js
node scripts/activate-workflow.js --workflow <id>

# Governance audit
node scripts/governance-engine.js --check

# Webhook security middleware (idempotent, run after creating new workflows)
node scripts/secure-n8n-webhooks.js --apply
node scripts/secure-internal-callers.js --apply
```

See [`.env.example`](.env.example) for required environment variables.

## Diff two workflows

`scripts/n8n-diff.js` renders a deterministic markdown diff between two
workflow JSON files — nodes added/removed/modified, connection delta, and
env-var changes. Pair it with the one-click installer in
[`scripts/install-workflow.js`](scripts/install-workflow.js) for a "review
before you ship" pre-merge check.

```bash
node scripts/n8n-diff.js workflows/a.json workflows/b.json
node scripts/n8n-diff.js workflows/a.json workflows/b.json --out diff.md
```

Demo against the bundled fixture pair:

```bash
node scripts/n8n-diff.js fixtures/diff/a.json fixtures/diff/b.json
```

## License

See [`LICENSE`](LICENSE).
