# Entity Naming Convention - Deployment Phase Encoding

## Problem

Some external services don't support tagging:
- **ElevenLabs agents** - No tag system
- **Twilio phone numbers** - Labels only (not queryable)
- **Cal.com event types** - No tags
- **External webhooks** - No metadata

## Solution: Name-Embedded Phase Tags

For entities without native tagging, **encode the deployment phase in the name**.

### Format

```
[PHASE] Entity Name - Qualifier
```

### Phases

| Tag | Meaning | Can Modify? | Auto-Assignable? |
|-----|---------|-------------|------------------|
| `[DEV]` | Development - active work | Yes | **YES** |
| `[ALPHA]` | Internal testing | Clone only | NO - User approval required |
| `[BETA]` | User testing | Clone only | NO - User approval required |
| `[GA]` | General availability | Clone only | NO - User approval required |
| `[PROD]` | Production | Clone only | NO - User approval required |
| `[ARCHIVED]` | Deprecated | Read only | NO - User approval required |

### CRITICAL GOVERNANCE RULE

**Only `[DEV]` can be auto-assigned.** All other phases require **EXPLICIT USER APPROVAL**.

Claude CANNOT:
- Create entities with non-DEV phases without user saying "create as ALPHA/BETA/GA/PROD"
- Promote entities without user saying "promote to X"
- Assume an entity should be production-ready

Claude MUST:
- Always default to `[DEV]` for new entities
- Ask user for explicit approval before promotion
- Block creation of non-DEV entities unless user explicitly approved

### Examples by Entity Type

**ElevenLabs Agents**:
```
[DEV] Acme Corp - Sarah
[PROD] Southeastern Wyoming Garage Doors - Sarah
[ARCHIVED] Old Demo Agent - Roger
```

**Twilio Phone Numbers** (Friendly Name):
```
[PROD] Wranngle Demo Line
[DEV] Test SMS Sender
```

**Cal.com Event Types**:
```
[PROD] sewy-garage-booking
[DEV] test-appointment
```

**Webhook Paths** (n8n):
```
[DEV] dev-sewy-garage-sms
[PROD] sewy-garage-sms
```

### Promotion Protocol

**REQUIRES EXPLICIT USER APPROVAL**

User must explicitly say: "promote X to ALPHA/BETA/GA/PROD"

When promoting an entity (AFTER user approval):

1. **Confirm user approval** - Never assume, always verify
2. **Update the name** to reflect new phase
3. **Update governance.yaml** with phase change
4. **Log the promotion** in history with user approval note

**ElevenLabs Agent Promotion**:
```bash
curl -X PATCH "https://api.elevenlabs.io/v1/convai/agents/{agent_id}" \
  -H "xi-api-key: $ELEVENLABS_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"name": "[ALPHA] Company Name - Sarah"}'
```

### Parsing Phase from Name

```javascript
function parsePhaseFromName(name) {
  const match = name.match(/^\[([A-Z]+)\]\s+/);
  return match ? match[1] : 'UNTAGGED';
}

// Examples:
parsePhaseFromName("[DEV] Acme Corp - Sarah")  // "DEV"
parsePhaseFromName("[PROD] Demo Agent")         // "PROD"
parsePhaseFromName("Old Agent Name")            // "UNTAGGED"
```

### Enforcement

The **workflow-governance.js** hook checks for:
1. n8n workflows - phase in governance.yaml
2. Entities with name-embedded tags - parsed from name

Untagged entities trigger a warning:
```
⚠️ GOVERNANCE: Entity "Agent Name" is UNTAGGED.
Rename with phase prefix: [DEV] Agent Name
```

---

*Version: 1.0 | Created: 2025-12-27*
