# Documentation

This documentation covers the reusable n8n workflow library and the workflow-as-code practices around it.

| Document | Description |
|---|---|
| [Workflow Showcase](showcase.md) | Curated display of the best reusable workflows by domain |
| [Architecture](../ARCHITECTURE.md) | Repo structure, workflow patterns, lifecycle, and verification boundary |
| [Workflow Development](workflow-development.md) | n8n authoring standards, validation flow, naming, credentials, and deployment discipline |
| [Library Curation](library-curation.md) | How live workflow exports become generic library demos |
| [Webhook Auth](WEBHOOK_AUTH.md) | Shared-secret pattern for webhook examples |

Related assets:

- [`workflows/registry.yaml`](../workflows/registry.yaml) records the public workflow catalog.
- [`scripts/convert-workflow.js`](../scripts/convert-workflow.js) converts live exports into reusable artifacts.
- [`scripts/verify-workflows.js`](../scripts/verify-workflows.js) performs CI-safe workflow checks.
