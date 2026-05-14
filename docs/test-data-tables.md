# Test data tables

Workflow QA in this repo follows a table-driven pattern: a sibling `<slug>.cases.csv`
file ships next to a workflow JSON and is loaded into an n8n **Data Table** node
(`n8n-nodes-base.dataTable`). Each row is one test case the workflow iterates over.

## Fixture format

Columns (all string, UTF-8, RFC 4180):

| column | purpose |
|---|---|
| `case_id` | Stable short ID (e.g. `TC-001`). Used in assertion failure messages. |
| `description` | One-line human summary of what the row exercises. |
| `http_method` | `POST`, `GET`, `PUT`, etc. — matches the webhook trigger's allowed method. |
| `path` | Webhook path under test (e.g. `/webhook/wranngle-intake-form`). |
| `headers` | JSON object of request headers. Secrets use the `<TEST_SECRET>` placeholder; the test harness substitutes the runtime value. |
| `body` | Request body as a string. Leave empty for `GET`. |
| `expected_status` | Expected HTTP response status code. |
| `expected_body_contains` | Substring the response body MUST contain. |
| `expected_branch` | Name of the workflow branch that should fire (e.g. `enrich`, `reject`, `dedup`). |

Headers and body are stored as raw strings to keep the CSV diffable; the workflow
under test parses them on load.

## Importing into n8n

1. Open the target n8n instance.
2. From the left nav, choose **Data Tables → New data table**. Name it
   `<workflow-slug>-cases` (e.g. `workflow-test-data-table-api-cases`).
3. Click **Import → CSV** and upload
   `workflows/live-universalized/<slug>.cases.csv`. n8n will infer the columns
   from the header row.
4. In your test workflow, add an `n8n-nodes-base.dataTable` node configured as:

   ```json
   {
     "resource": "row",
     "operation": "get",
     "dataTableId": { "mode": "name", "value": "workflow-test-data-table-api-cases" },
     "returnAll": true
   }
   ```

5. Loop the rows through a `Split In Batches` → `HTTP Request` → `If` chain that
   asserts `expected_status` and `expected_body_contains`. Emit one item per row
   to a results table for the run report.

## Updating fixtures

- Keep the file sorted by `case_id` ascending — review diffs stay legible.
- Treat `<TEST_SECRET>` as a literal placeholder; never commit real shared
  secrets. The pre-commit secret-scrub hook (`lefthook.yml`) blocks anything that
  looks like a credential.
- When you add a new case, append a row rather than rewriting existing IDs.
  Existing IDs are referenced from CI run reports.

## Related

- `workflows/live-universalized/workflow-test-data-table-api.cases.csv` —
  canonical fixture for the lead-intake webhook contract.
- `AGENTS.md` — Data Table node config notes (required `resource: "row"`,
  no `__rl` wrapping on `dataTableId`).
- `docs/WEBHOOK_AUTH.md` — shared-secret pattern the `TC-002` row enforces.
