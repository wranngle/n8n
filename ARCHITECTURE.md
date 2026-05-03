# Architecture

This repo is a sanitized library of generic n8n workflows: lead intake, CRM enrichment, post-call processing, and webhook security middleware. ElevenLabs / voice-agent-specific code lives at [`wranngle/voice_ai_agent_evals`](https://github.com/wranngle/voice_ai_agent_evals).

## Product flow (the workflows in this repo)

```
   ┌──────────────┐
   │ Lead intake  │   workflows/lead-intake-main.json
   │ (form / API) │
   └──────┬───────┘
          │
          ▼
   ┌──────────────────┐
   │ Enrichment       │   workflows/lead-enrichment-microservice.json
   │ (CRM context)    │
   └──────┬───────────┘
          │
          ▼
   ┌──────────────────┐
   │ Voice routing    │   (handed off to ElevenLabs runtime;
   │                  │    eval harness lives in voice_ai_agent_evals)
   └──────┬───────────┘
          │
          ▼
   ┌──────────────────┐
   │ Post-call        │   workflows/dev/pipeline-test-webhook-processor.json
   │ (webhook fanout) │
   └──────────────────┘
```

## Repo surface

```
n8n/
├── workflows/
│   ├── lead-intake-main.json
│   ├── lead-enrichment-microservice.json
│   ├── dev/                          # development-mode flows
│   ├── knowledge_management/         # generic knowledge pipelines
│   ├── governance.yaml               # phase tracking (DEV / ARCHIVED)
│   └── registry.yaml
├── scripts/                          # workflow API utilities, governance, security
│   ├── activate-workflow.js
│   ├── secure-n8n-webhooks.js        # apply X-Webhook-Secret middleware
│   ├── secure-internal-callers.js    # patch HTTP Request nodes
│   ├── governance-engine.js
│   ├── enforce-governance.ps1
│   ├── list_workflows.js / .py
│   ├── update_workflow.py
│   └── lib/
├── templates/                        # generic n8n templates
├── tests/
├── context/                          # local knowledge bases (YouTube, Discord)
├── docs/
│   ├── index.md
│   └── WEBHOOK_AUTH.md
└── openspec/
    ├── AGENTS.md
    ├── project.md
    └── specs/
```

## Workflow governance

- **DEV**: all active development. Modifiable.
- **ARCHIVED**: deprecated, read-only. Deletion is blocked; archive instead.
- New workflows auto-tag as DEV.

`workflows/governance.yaml` is the authoritative phase tracker; `scripts/governance-engine.js` enforces it.

## Webhook authentication

Every n8n webhook in this repo requires an `X-Webhook-Secret` header validated against `N8N_WEBHOOK_SECRET`. See [`docs/WEBHOOK_AUTH.md`](docs/WEBHOOK_AUTH.md) for the rotation playbook. ElevenLabs HMAC-signed webhooks (different protocol — HMAC-SHA256 over `<timestamp>.<body>`) are handled in `voice_ai_agent_evals`.

## What this repo does NOT do

- It does not run the live ElevenLabs voice agent (that's the ElevenLabs platform itself).
- It does not host the eval harness (that's `wranngle/voice_ai_agent_evals`).
- It does not host the brand design system (that's mirrored from `~/.dotfiles/DESIGN.md` into `wranngle/gtm_ops/DESIGN.md`).
- It does not generate proposals or PDFs (that's `wranngle/gtm_ops`).

This repo is the integration layer — the workflows that wire those things together.
