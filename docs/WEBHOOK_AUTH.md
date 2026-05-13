# n8n Webhook Authentication

Webhook examples in this repo use a shared secret on every request:

- **Header:** `X-Webhook-Secret`
- **Source of truth (callers):** `N8N_WEBHOOK_SECRET` env var
- **Source of truth (n8n side):** a single Header Auth credential whose value matches the env var

Requests without the header, or with the wrong value, should be rejected with `401`.

## Applying The Pattern

The two scripts under `scripts/` are idempotent.

```bash
node scripts/secure-n8n-webhooks.js              # dry-run
node scripts/secure-n8n-webhooks.js --apply
node scripts/secure-internal-callers.js --apply  # patch HTTP Request nodes calling n8n webhooks
```

Pass `N8N_WEBHOOK_AUTH_CRED_ID=<your-credential-id>` to reuse an existing credential instead of creating a new one.

## Caller Contract

JavaScript / TypeScript callers send:

```ts
headers: {
  "Content-Type": "application/json",
  "X-Webhook-Secret": process.env.N8N_WEBHOOK_SECRET,
}
```

Callers should throw at startup if `N8N_WEBHOOK_SECRET` is missing.

## Rotating The Shared Secret

1. Generate a new secret: `openssl rand -hex 32`.
2. Update the `X-Webhook-Secret` credential value in the n8n UI.
3. Update `N8N_WEBHOOK_SECRET` in your secrets store (`.env`, deployment secret manager, etc.).
4. Repatch any external caller that hardcodes the value rather than reading from env.

## Source JSONs

Workflow JSONs in this repo should not include secret values. Recreate the credential in the target tenant, then select it after import if n8n does not resolve it automatically.
