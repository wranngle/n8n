# n8n Workflow Development

This repo keeps the live n8n development discipline in a public, reusable form. The goal is to make workflow changes predictable before they reach an n8n instance.

## Build Flow

1. Search for existing workflows and templates before creating a new one.
2. Design the graph around clear contracts: trigger input, normalized payload, side effects, and response shape.
3. Configure nodes with credentials or environment variables, not inline secrets.
4. Prefer native n8n nodes and LangChain nodes over raw API calls when a first-class node exists.
5. Validate the workflow JSON locally with `npm run verify`.
6. Validate against n8n before create/update in a live instance.
7. Smoke-test with sample input before activation.

## Node Practices

- Use `Switch` for conditional routing in new workflows.
- Use n8n Data Tables for small native tabular state unless an external stakeholder needs spreadsheet access.
- Keep Code nodes focused on transformation glue, not hidden service clients.
- Do not call LLM APIs from HTTP Request nodes or Code nodes; use n8n LangChain model, agent, or chain nodes.
- Keep webhook paths kebab-case and stable.
- Name nodes as `Category: Action Description` in Title Case, for example `Webhook: Receive Lead` or `Transform: Normalize Payload`.

## Credentials

Workflow JSON must not contain API keys, OAuth tokens, account IDs that function as secrets, or live credential payloads. Use:

- n8n credentials for integration auth
- `{{ $env.NAME }}` expressions for tenant-specific config
- `.env.example` for documenting required variables

## Validation

Local checks:

```bash
npm run verify
npm run check:scripts
```

Live-instance checks:

- confirm the target n8n instance is reachable
- validate node configuration before deploy
- validate the whole workflow before create/update
- create or update only after validation passes
- activate only after reading the current workflow version from n8n

## Review Focus

Review workflow changes for:

- broken connections or orphaned nodes
- credential leaks
- pinned data or runtime-only metadata
- hardcoded tenant URLs
- raw LLM API calls where a LangChain node should be used
- brittle expressions that assume fields always exist
- missing error paths for external calls
