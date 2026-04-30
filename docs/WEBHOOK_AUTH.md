# n8n Webhook Authentication

All n8n webhooks in this repo require a shared secret on every request:

- **Header:** `X-Webhook-Secret`
- **Source of truth (callers):** `N8N_WEBHOOK_SECRET` env var
- **Source of truth (n8n side):** a single Header Auth credential named `X-Webhook-Secret` whose value matches the env var

Requests without the header (or with the wrong value) are rejected with `401`.

## State (already applied 2026-04-29)

- **Credential id:** `REDACTED_N8N_CRED_ID` (`X-Webhook-Secret (shared)`, type `httpHeaderAuth`).
- **Secret:** stored in `~/.agents/.env` as `N8N_WEBHOOK_SECRET`.
- **Bound to:** 40 webhook nodes across 40 active workflows + the 2 SMS template variants in this repo (rendered per company). 2 ElevenLabs-targeted workflows are intentionally unbound (see "HMAC exceptions").
- **5 internal n8n→n8n HTTP Request callers** were also updated to send the header via the same credential.

## Re-running the rollout

The two scripts under `scripts/` are idempotent. To reapply (e.g. after creating a new workflow):

```bash
node scripts/secure-n8n-webhooks.js              # dry-run
node scripts/secure-n8n-webhooks.js --apply
node scripts/secure-internal-callers.js --apply  # patch HTTP Request nodes calling n8n webhooks
```

Pass `N8N_WEBHOOK_AUTH_CRED_ID=REDACTED_N8N_CRED_ID` to reuse the existing credential instead of creating a new one.

## HMAC-protected webhooks (ElevenLabs)

Two workflows receive HMAC-signed traffic from ElevenLabs and verify the signature *inside the workflow* (the n8n header credential isn't bound — ElevenLabs can't send arbitrary headers):

| Workflow | n8n id | URL | ElevenLabs webhook id | Secret env var |
|---|---|---|---|---|
| Post-Call Bulletproof v2 | `FGjUvywqh09XKlYJ` | `/webhook/post-call-bulletproof` | `REDACTED_ELEVENLABS_WEBHOOK_ID` | `ELEVENLABS_POST_CALL_BULLETPROOF_SECRET` |
| ElevenLabs Call Completed | `cEORduJCqCVDOKce` | `/webhook/call-completed` | `REDACTED_ELEVENLABS_WEBHOOK_ID_2` | `ELEVENLABS_CALL_COMPLETED_SECRET` |

Each workflow now starts with a 4-node gate:
1. **Verify HMAC: parse** (Code) — extracts `t` and `v0` from `ElevenLabs-Signature`, builds `t.body`, flags stale (>30 min skew).
2. **Verify HMAC: compute** (Crypto, HMAC-SHA256, hex) — secret is inlined into the workflow JSON.
3. **HMAC: ok?** (IF) — checks `!stale AND v0 == expected`.
4. **HMAC: reject** (respondToWebhook 401) — returns `{ error: "UNAUTHORIZED", message: "stale_or_missing_signature" | "signature_mismatch" }` on the false branch.

Verification was tested:
- unsigned → 401 stale_or_missing_signature
- valid signature → passes through to workflow
- wrong secret → 401 signature_mismatch
- 1h-old timestamp → 401 stale_or_missing_signature

### Rotating ElevenLabs secrets

ElevenLabs only returns a webhook's HMAC secret at creation time. The `webhook_url` is **immutable**, so rotation = create new + repoint references + delete old. `scripts/secure-elevenlabs-hmac.js` handles this. After rotation, re-run the post-rotation patch (see `scripts/secure-elevenlabs-hmac.js` source) to inline the new secrets into the n8n workflows.

### Orphan webhook

There's one disabled orphan in the ElevenLabs workspace: `REDACTED_ELEVENLABS_WEBHOOK_ID_3` (`n8n Call Completed Webhook (DISABLED-orphan)`). ElevenLabs refused to delete it because something still references it (the API doesn't say what). It's disabled so it won't fire. Investigate via the dashboard if you want to clean it up — likely a stale agent reference or workspace setting we don't expose via API.

## Source JSONs

The workflow JSONs in this repo now reference credential id `REDACTED_N8N_CRED_ID` directly. If you re-import any of them, the credential will resolve automatically against the live tenant. SMS template renderers no longer need the `{{N8N_WEBHOOK_AUTH_CRED_ID}}` placeholder.

## Caller contract

JavaScript / TypeScript callers send:

```ts
headers: {
  "Content-Type": "application/json",
  "X-Webhook-Secret": process.env.N8N_WEBHOOK_SECRET,
}
```

Callers throw at startup if `N8N_WEBHOOK_SECRET` is missing — fail fast rather than silently produce 401s.

The webhook test runner (`workflows/voice_ai_agents/lib/testing/runners/webhook-runner.ts`) auto-injects the header for any URL whose host is `n8n.wranngle.com` or `*.app.n8n.cloud`. Test cases that target n8n do not need to specify the header explicitly.

## External callers

`lib/enrichment.js` lives in a separate workspace (not this repo). Update it to:

```js
const result = await fetchWithTimeout(n8nUrl, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-Webhook-Secret': process.env.N8N_WEBHOOK_SECRET,
  },
  body: JSON.stringify({ domain }),
});
```

ElevenLabs agent tools (`send_sms`, `send_email`, `send_message`) were patched to send `X-Webhook-Secret: $N8N_WEBHOOK_SECRET` directly. The `send_sms` tool URL was also corrected from the legacy `/sarah-send-sms` to the canonical `/sarah-send-sms-v3`. Re-run that PATCH (or `scripts/add-sarah-sms-tool.js`) after rotating the secret.

## Rotating the shared X-Webhook-Secret

1. Generate a new secret: `openssl rand -hex 32`.
2. Update the `X-Webhook-Secret (shared)` credential value in the n8n UI (Credentials → edit cred id `REDACTED_N8N_CRED_ID`).
3. Update `N8N_WEBHOOK_SECRET` in `~/.agents/.env` and any deployment secret stores.
4. Re-run `scripts/add-sarah-sms-tool.js` (or repatch the agent tools manually) to push the new value into ElevenLabs.
