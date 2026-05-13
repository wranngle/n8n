# Architecture

This repository is organized as a reusable n8n workflow library plus a small workflow-as-code toolchain. The workflows are generic demos derived from real automation patterns, with tenant-specific IDs, credentials, and live operational history kept out of the library.

## Library Shape

```text
n8n/
|-- workflows/
|   |-- lead-intake-main.json
|   |-- lead-enrichment-microservice.json
|   |-- dev/
|   |-- knowledge_management/
|   |-- registry.yaml
|   `-- governance.yaml
|-- scripts/
|   |-- convert-workflow.js
|   |-- verify-workflows.js
|   |-- governance-engine.js
|   |-- secure-n8n-webhooks.js
|   `-- lib/
|-- context/technical-research/
`-- docs/
```

## Workflow Patterns

### Lead Intake

```text
Webhook intake
  -> enrichment subworkflow
  -> database persistence
  -> email notification
  -> downstream HTTP handoff
```

This pattern demonstrates how to keep the public webhook thin while moving business-specific enrichment into a reusable subworkflow.

### Enrichment Microservice

```text
Webhook request
  -> normalize domain
  -> call enrichment provider
  -> shape response
  -> respond to caller
```

This pattern is useful when multiple workflows need the same enrichment contract.

### Knowledge Ingestion

```text
Manual trigger
  -> fetch source metadata
  -> collect adjacent context
  -> format a document
  -> split and embed
  -> upsert to vector storage
```

This pattern demonstrates n8n as an ingestion layer for retrieval-backed applications.

## Workflow Lifecycle

The public library has three states:

| State | Meaning |
|---|---|
| `draft` | Useful pattern, still being refined or missing import notes |
| `published` | Ready for readers to import after configuring credentials |
| `retired` | Kept for reference, not recommended for new imports |

The live n8n tenant can use stricter internal tags and activation rules, but this repo keeps public metadata focused on library readiness.

## Conversion Boundary

Workflow exports should not enter the library directly. Use [`scripts/convert-workflow.js`](scripts/convert-workflow.js) or an equivalent review step to remove runtime fields, credential IDs, webhook IDs, pinned data, static data, and tenant URLs.

The conversion boundary is intentionally conservative: it preserves the workflow graph and expressions, then forces humans or agents to make environment-specific decisions explicit.

## Verification

[`scripts/verify-workflows.js`](scripts/verify-workflows.js) is the CI smoke check. It validates that workflow JSON parses and that reusable library exports do not contain runtime-only fields.

For live-instance deployment, validate with the n8n MCP/API before create or update, then run a manual execution with sample input before activation.
