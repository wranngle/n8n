# n8n Workflow Library

A public showcase of production-shaped n8n workflows, converted from real operating patterns into generic, reusable demos.

This repo is not a pile of exported JSON. It is a workflow-as-code library: every public workflow is importable, scrubbed of runtime metadata, cataloged, and checked for common n8n failure modes before it lands in Git.

## Showcase

- **40 reusable workflow exports** across lead intake, messaging, voice automation, web scraping, workflow QA, retrieval, and infrastructure.
- **36 universalized live workflows** converted from an actual n8n instance into public demos.
- **7 published live-derived examples** ready to import after configuring credentials and environment variables.
- **Workflow-as-code automation** for conversion, validation, governance, and repeatable live-instance export.

Start with the curated showcase: [`docs/showcase.md`](docs/showcase.md).

## Featured Workflows

| Workflow | Why It Matters |
|---|---|
| [`Lead Intake Form Receiver`](workflows/live-universalized/lead-intake-form-receiver.json) | Production-style lead capture with validation, notification, and downstream handoff. |
| [`Universal Message Sender`](workflows/live-universalized/universal-message-sender.json) | Reusable messaging endpoint with routing, provider calls, waits, and response handling. |
| [`SMS Conversation Assistant`](workflows/live-universalized/sms-conversation-assistant.json) | Multi-step SMS workflow pattern for request parsing, routing, and follow-up. |
| [`Bulk Web Scraper`](workflows/live-universalized/bulk-web-scraper.json) | Fan-out scraping workflow with aggregation and webhook response shaping. |
| [`Workflow Test Data Table API`](workflows/live-universalized/workflow-test-data-table-api.json) | n8n-as-code testing pattern using Data Tables for cases and results. |
| [`Voice Agent Evaluation Harness`](workflows/live-universalized/voice-agent-evaluation-harness.json) | Evaluation harness for voice-agent simulation and QA workflows. |
| [`YouTube RAG Ingestion Pipeline`](workflows/knowledge_management/youtube-rag-pipeline/workflow.json) | Retrieval pipeline with metadata, transcript formatting, embeddings, and Qdrant storage. |

See [`WORKFLOWS.md`](WORKFLOWS.md) for the complete catalog and import notes.

## Workflow-As-Code Practices

The repository treats n8n exports as code:

- Workflow JSON is reviewed in Git before import.
- Public examples are converted with [`scripts/convert-workflow.js`](scripts/convert-workflow.js), which removes tenant-specific runtime fields and rewrites environment-specific values as explicit placeholders.
- [`scripts/verify-workflows.js`](scripts/verify-workflows.js) parses every workflow and blocks fields that should not be committed to a reusable library.
- [`workflows/registry.yaml`](workflows/registry.yaml) documents each demo workflow by pattern, integrations, and verification state.
- [`workflows/governance.yaml`](workflows/governance.yaml) records the lightweight lifecycle rules used by the library.
- [`scripts/export-public-workflows.js`](scripts/export-public-workflows.js) regenerates the curated live-derived showcase from the configured n8n instance.

More detail lives in [`docs/showcase.md`](docs/showcase.md), [`docs/workflow-development.md`](docs/workflow-development.md), and [`docs/library-curation.md`](docs/library-curation.md).

## Running Checks

```bash
npm install
npm run verify
npm run check:scripts
```

Convert an exported workflow into a library-ready artifact:

```bash
node scripts/convert-workflow.js export.json workflows/dev/example-workflow.json \
  --name "Example Workflow" \
  --replace-url "https://tenant.example.com={{ $env.WEBHOOK_BASE_URL }}"
```

Export the curated live-instance set:

```bash
node scripts/export-public-workflows.js
```

## Importing

1. Create the required credentials in n8n, such as Postgres, Email, YouTube, OpenAI, Qdrant, Header Auth, or provider-specific HTTP credentials.
2. Import the workflow JSON.
3. Configure environment variables referenced by expressions such as `{{ $env.WEBHOOK_BASE_URL }}`, `{{ $env.CLAY_API_KEY }}`, and `{{ $env.QDRANT_URL }}` in the target n8n runtime, or change the expressions to match your environment.
4. Select the local credentials on imported nodes if n8n does not resolve them automatically.
5. Run the workflow manually with sample input before activating it.

Webhook examples use an `X-Webhook-Secret` shared-secret pattern. See [`docs/WEBHOOK_AUTH.md`](docs/WEBHOOK_AUTH.md).

## Repo Map

```text
workflows/                  reusable workflow exports and metadata
scripts/                    conversion, verification, deployment, and governance utilities
context/technical-research/ optional integration research notes used when designing new demos
docs/                       workflow development and security notes
```

## License

See [`LICENSE`](LICENSE).
