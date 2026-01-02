# Credential Management Directive

## CRITICAL: ZERO MANUAL CREDENTIAL STEPS

**THIS IS A BLOCKING REQUIREMENT.** Every workflow that uses external APIs MUST:
1. Reference stored credentials by ID - NEVER leave as "configure manually"
2. Use credentials from memory/manifest BEFORE building workflows
3. Pass credential ID as string (not object) in workflow JSON

**FAILURE MODE:** If you create a workflow without proper credentials, the user
cannot run it without manual intervention. This defeats the purpose of automation.

---

## MANDATORY: API Key Storage Protocol

When integrating ANY 3rd-party service that requires authentication:

### Step 1: Detect New Integration
Trigger when:
- User provides API key/token for a service
- Building workflow that uses HTTP Request with external API
- Configuring credential-based authentication

### Step 2: Store Credentials (IMMEDIATELY)

**Memory System (Primary)**
```
mcp__memory__create_entities({
  entities: [{
    name: "{ServiceName} API Credentials",
    entityType: "api_credential",
    observations: [
      "API Key: {key}",
      "Base URL: {url}",
      "Created: {date}",
      "Usage: {workflow_name}"
    ]
  }]
})
```

**Environment File (Secondary)**
```
Create or update: workflows/{project}/env/.env.{service}
```

### Step 3: Create n8n Credential

For HTTP Header Auth:
```bash
curl -X POST "https://n8n.wranngle.com/api/v1/credentials" \
  -H "Content-Type: application/json" \
  -H "X-N8N-API-KEY: {n8n_api_key}" \
  -d '{
    "name": "{ServiceName} API Key",
    "type": "httpHeaderAuth",
    "data": {
      "name": "{header_name}",  # e.g., xi-api-key, Authorization
      "value": "{api_key}"
    }
  }'
```

For OAuth2 or other types - consult n8n credential type documentation.

### Step 4: Update Workflow
Reference the created credential in HTTP Request nodes:
```json
"credentials": {
  "httpHeaderAuth": {
    "id": "{credential_id}",
    "name": "{credential_name}"
  }
}
```

## Known Service Headers

| Service | Header Name | Format |
|---------|-------------|--------|
| ElevenLabs | xi-api-key | `sk_...` |
| OpenAI | Authorization | `Bearer sk-...` |
| Anthropic | x-api-key | `sk-ant-...` |
| Pinecone | Api-Key | (varies) |
| Twilio | Authorization | `Basic {base64}` |
| Stripe | Authorization | `Bearer sk_...` |

## Retrieval Protocol (MANDATORY PRE-BUILD CHECK)

**BEFORE creating ANY workflow with HTTP Request nodes:**

```
1. CHECK MANIFEST FIRST
   .claude/directives/integrations/{service}/manifest.yaml
   → Look for: credentials.n8n_credential_id
   
2. CHECK MEMORY
   mcp__memory__search_nodes({ query: "{service} credentials" })
   
3. CHECK CREDENTIAL DIRECTIVE
   This file → "Current Stored Credentials" section
   
4. GREP ENV FILES
   workflows/**/env/.env.*

5. IF NOT FOUND → Ask user for API key, then store it properly
```

**CREDENTIAL FORMAT IN WORKFLOW JSON:**
```json
"credentials": {
  "httpHeaderAuth": "eR7srDUHDyZLIZgh"  // STRING, not object!
}
```

**WRONG (will fail validation):**
```json
"credentials": {
  "httpHeaderAuth": {"id": "eR7srDUHDyZLIZgh", "name": "..."}  // OBJECT = ERROR
}
```

## Current Stored Credentials

### ElevenLabs
- API Key: `sk_733d2a2707d99f6bcdb9cc330570deea72390b20b6b2915e`
- Test Agent ID: `agent_3801kdf7fkhcev8tkhpm92d65jws`
- Commercial Agent ID: `agent_5701kdgf9s4vfe9rhe68ntjrms9g` (Wranngle Lead Qualifier)
- Phone Number: `+18882662193`
- Phone Number ID: `phnum_1901kdgev877fep99ex5fc5abb3m`
- n8n Credential ID: `eR7srDUHDyZLIZgh`
- Webhook ID: `351df617fc4c4e61ab33e91020b890c7`
- Webhook Secret: `wsec_65d83b3e7da414d625a1553462a6465647476c291101430a0552050143487cc1`
- Webhook URL: `https://n8n.wranngle.com/webhook/call-completed`
- Webhook Events: `transcript`, `call_initiation_failure`
- Env File: `workflows/voice_ai_agents/elevenlabs-twilio-voiceagent/env/.env.elevenlabs`

### n8n Instance
- API Key: (stored in memory as "n8n API Credentials")
- Instance URL: `https://n8n.wranngle.com`

## Failure Recovery

If credential creation fails:
1. Check API key validity
2. Verify n8n instance connectivity
3. Fall back to asking user for web UI assistance

---
*Philosophy: "If there's a feature then make it impeccable."*
