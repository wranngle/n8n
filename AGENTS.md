# AGENTS.md - n8n Workflow Library

Project-specific rules for AI agents working in this repository.

## Purpose

This repo is a public n8n workflow library. Treat workflow JSON as reusable source code, not as a dump of a live tenant. Keep examples generic, importable, and free of private runtime history.

## n8n Tooling

- Prefer n8n MCP/API tools over browser automation for live n8n work.
- Before creating or updating a live workflow, validate the node or workflow payload first.
- Do not guess MCP parameter names. Check the tool schema when using a tool for the first time in a session.
- Never delete live workflows when retiring them. Deactivate them and mark them archived or retired in the relevant registry.

## Workflow Authoring

- Use `Switch` nodes for new conditional routing.
- Prefer n8n Data Tables for small native tabular state unless spreadsheet access is genuinely required.
- Use first-class n8n and LangChain nodes when available.
- Do not call LLM APIs from HTTP Request nodes or Code nodes.
- Keep Code nodes focused on transformation glue.
- Keep webhook paths kebab-case and stable.
- Name workflows and nodes for the reusable pattern, not the original client, tenant, or implementation accident.
- Node names use `Category: Action Description` in Title Case. Do not commit snake_case or raw export names.

## Conversion Boundary

Workflow exports from a live instance must be converted before commit:

```bash
node scripts/convert-workflow.js export.json workflows/dev/example-workflow.json
npm run verify
```

Committed workflow JSON must not contain:

- `credentials`
- `pinData`
- `webhookId`
- `staticData`
- `meta.instanceId`
- live tenant URLs
- customer names, people names, phone numbers, addresses, or private notes
- hardcoded API keys or auth tokens

## Credentials

Secrets live in n8n credentials or environment variables. Document required values in `.env.example`; do not commit real values. Watch especially for OpenAI, Twilio, Anthropic, Google, ElevenLabs, and provider API keys.

## Governance

Public library workflow states are:

- `draft`: useful pattern, not fully import-ready
- `published`: ready to import after configuring credentials and env placeholders
- `retired`: retained for reference, not recommended for new imports

Update both `WORKFLOWS.md` and `workflows/registry.yaml` when adding or removing reusable demos.

## Verification

Run the relevant checks before declaring work done:

```bash
npm run verify
npm run check:scripts
python3 -m compileall -q scripts
```

If you modify live-instance deployment utilities, test them in dry-run mode first when the script supports it.
