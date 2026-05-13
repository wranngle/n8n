# Library Curation

The library is built from real n8n operating patterns, but every committed workflow should stand on its own as a generic demo.

## What To Preserve

- workflow graph shape
- data contracts between nodes
- retry, validation, and response patterns
- integration choices that teach a reusable approach
- sample-safe expressions and placeholder env variables

## What To Remove

- live credential IDs and credential payloads
- webhook IDs and instance IDs
- pinned execution data
- static runtime data
- customer names, people names, phone numbers, addresses, and private notes
- deployment logs from a private tenant
- generated scratch files, patch manifests, and other non-workflow operational artifacts

## Conversion Flow

```bash
node scripts/convert-workflow.js export.json workflows/dev/example-workflow.json \
  --name "Example Workflow" \
  --replace-url "https://tenant.example.com={{ $env.WEBHOOK_BASE_URL }}"
npm run verify
```

Then update:

- [`WORKFLOWS.md`](../WORKFLOWS.md) for the human index
- [`workflows/registry.yaml`](../workflows/registry.yaml) for machine-readable catalog metadata
- `.env.example` if the workflow introduces new environment variables

## Quality Bar

A workflow is ready for the public library when a reader can understand:

- what problem it solves
- what credentials it needs
- what input it expects
- what output it produces
- what must be changed before import
- how to test it with sample data
