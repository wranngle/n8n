# Technical Research Corpus

This directory contains source research used to design reusable n8n workflow demos. Treat it as raw material, not polished product documentation.

## Curation Rules

- Prefer service-specific records over vague category guesses.
- Delete records created from ambiguous prompts such as "the usual" or "something enterprise grade."
- Do not commit SQLite databases, private exports, or generated cache files.
- Keep customer names, people names, tenant URLs, phone numbers, and private notes out of research files.
- If a record recommends calling an LLM API through HTTP Request or Code nodes, revise it before using it in a workflow design.

## How To Use

Use this corpus to answer design questions:

- Does n8n have a native node for the integration?
- What credential type does the integration require?
- Are webhooks available?
- What rate limits, auth quirks, or implementation gotchas affect workflow design?

Curated workflow behavior belongs in `workflows/`, `WORKFLOWS.md`, and `docs/`. Research files should not be the primary reader experience.
