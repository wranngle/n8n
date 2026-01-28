# ElevenLabs Client Initiation Data Setup Guide

**Last Updated:** 2026-01-19
**Agent:** Sarah - Wranngle Lead Specialist v2.0
**Agent ID:** `agent_8001kdgp7qbyf4wvhs540be78vew`

## Overview

This guide documents how to configure ElevenLabs agents to fetch conversation initiation data via webhook for Twilio inbound calls. This enables pre-call data enrichment with CRM context, call history, and personalized greetings.

## Prerequisites

- ✅ ElevenLabs agent created and configured
- ✅ n8n webhook deployed and accessible
- ✅ Twilio phone number connected to ElevenLabs
- ✅ Dynamic variables defined in agent configuration
- ✅ CRM data sources ready (Pipedrive, Google Sheets)

## Configuration Steps

### Step 1: Access Agent Security Settings

1. Log in to [ElevenLabs Dashboard](https://elevenlabs.io/app)
2. Navigate to **Conversational AI** → **Agents**
3. Select your agent (e.g., "Sarah - Wranngle Lead Specialist v2.0")
4. Click on the **Security** tab

### Step 2: Enable Conversation Initiation Data Fetching

In the Security tab, locate the **Twilio Personalization** section:

1. **Enable the toggle:** "Fetch conversation initiation data for inbound Twilio calls"
2. **Enter webhook URL:**
   ```
   https://n8n.wranngle.com/webhook/client-initiation-data
   ```
3. **Webhook timeout:** Recommended 500ms (prevents call delays)
4. Click **Save Changes**

**Screenshot Reference:** (Visual guide in production deployment)

```
┌─────────────────────────────────────────────┐
│ Security Settings                           │
├─────────────────────────────────────────────┤
│ ☑ Fetch conversation initiation data       │
│   for inbound Twilio calls                  │
│                                             │
│ Webhook URL:                                │
│ ┌─────────────────────────────────────────┐ │
│ │ https://n8n.wranngle.com/webhook/       │ │
│ │ client-initiation-data                  │ │
│ └─────────────────────────────────────────┘ │
│                                             │
│ Timeout: [500] ms                           │
│                                             │
│ [Save Changes]                              │
└─────────────────────────────────────────────┘
```

### Step 3: Configure Allowed Override Fields (Optional)

If you want to allow the webhook to override agent settings per call:

1. In the same Security section, locate **Allowed Override Fields**
2. Select which fields the webhook can customize:
   - ☑ **First Message** - Personalized greeting per caller
   - ☑ **System Prompt** - Context-aware behavior adjustments
   - ☐ **Voice ID** - (Usually not needed)
   - ☐ **Language** - (Enable if multi-language support needed)
3. Click **Save**

**Recommended:** Enable only **First Message** and **System Prompt** overrides for security.

### Step 4: Define Dynamic Variables

Navigate to the **Agent Configuration** section:

1. Scroll to **Dynamic Variables**
2. Add each variable from the list below:

**Regular Variables (visible to LLM):**

| Variable Name | Type | Description |
|---------------|------|-------------|
| `customer_name` | String | Full name of the caller |
| `customer_first_name` | String | First name only |
| `company` | String | Company/organization name |
| `industry` | String | Industry sector |
| `account_tier` | String | Customer tier (New/Bronze/Silver/Gold) |
| `call_history` | String | Summary of previous interactions |
| `interaction_count` | Number | Number of previous calls |
| `last_topic` | String | Topic of last interaction |
| `notes` | String | Important notes (sanitized) |
| `lookup_success` | Boolean | Whether enrichment succeeded |
| `data_source` | String | Data source (pipedrive/sheets/cache/none) |

**Secret Variables (hidden from LLM):**

| Variable Name | Type | Description |
|---------------|------|-------------|
| `secret__pipedrive_person_id` | Number | Pipedrive person ID |
| `secret__pipedrive_org_id` | Number | Pipedrive organization ID |
| `secret__google_sheet_row` | Number | Google Sheets row number |

3. For each variable:
   - Click **+ Add Variable**
   - Enter name exactly as shown (case-sensitive)
   - Select type (String/Number/Boolean)
   - Add description
   - Click **Save**

### Step 5: Update System Prompt with Variables

In the **Agent Configuration**, update the system prompt to use dynamic variables:

Add this section to the prompt:

```markdown
# CONTEXT AWARENESS

You have access to caller context through variables:
- Customer name: {{customer_name}} (use for personalization)
- Company: {{company}} (reference in value prop)
- Account tier: {{account_tier}} (affects priority)
- Call history: {{call_history}} (avoid re-asking known info)

**Guidelines:**
- If {{account_tier}} = "Gold", prioritize their needs
- If {{interaction_count}} > 0, acknowledge: "Good to hear from you again"
- If {{call_history}} mentions recent demo, ask about follow-up
- NEVER mention variable syntax ({{...}}) to caller
- If variable is empty, proceed with generic approach
- Never fabricate data - only use provided variables
```

### Step 6: Configure SMS Tool with Secret Variable

If your agent has an SMS tool, update it to use the secret Pipedrive ID:

1. Navigate to **Tools** section
2. Find the `send_sms` tool
3. Edit tool parameters
4. Add/update the `pipedrive_id` parameter:
   ```json
   {
     "name": "pipedrive_id",
     "type": "number",
     "description": "CRM person ID for tracking",
     "default": "{{secret__pipedrive_person_id}}"
   }
   ```
5. Save changes

This allows the SMS webhook to automatically receive the Pipedrive ID without the LLM needing to know it.

## Webhook Contract

### Request Format (from ElevenLabs)

When an inbound Twilio call arrives, ElevenLabs will POST to your webhook:

```json
{
  "caller_id": "+15551234567",
  "agent_id": "agent_8001kdgp7qbyf4wvhs540be78vew",
  "called_number": "+18882662193",
  "call_sid": "CA1234567890abcdef1234567890abcdef"
}
```

### Response Format (from n8n)

Your webhook must return:

```json
{
  "type": "conversation_initiation_client_data",
  "dynamic_variables": {
    "customer_name": "John Smith",
    "customer_first_name": "John",
    "company": "Acme Corp",
    "industry": "hvac",
    "account_tier": "Gold",
    "call_history": "Called 3 days ago about demo",
    "interaction_count": 5,
    "last_topic": "pricing",
    "notes": "Prefers morning calls",
    "lookup_success": true,
    "data_source": "pipedrive",
    "secret__pipedrive_person_id": 12345,
    "secret__pipedrive_org_id": 678,
    "secret__google_sheet_row": 42
  },
  "conversation_config_override": {
    "agent": {
      "first_message": "Hi John, this is Sarah from Wranngle. I see you're one of our premium clients - how can I help you today?"
    }
  }
}
```

**Fallback Response (when no data found):**

```json
{
  "type": "conversation_initiation_client_data",
  "dynamic_variables": {
    "customer_name": "there",
    "customer_first_name": "there",
    "company": "",
    "account_tier": "New",
    "call_history": "First-time caller",
    "interaction_count": 0,
    "lookup_success": false,
    "data_source": "none",
    "secret__pipedrive_person_id": 0,
    "secret__pipedrive_org_id": 0,
    "secret__google_sheet_row": 0
  }
}
```

## Validation & Testing

### Test 1: Webhook Connectivity

Use curl to test the webhook endpoint:

```bash
curl -X POST https://n8n.wranngle.com/webhook/client-initiation-data \
  -H "Content-Type: application/json" \
  -d '{
    "caller_id": "+15551234567",
    "agent_id": "agent_8001kdgp7qbyf4wvhs540be78vew",
    "called_number": "+18882662193",
    "call_sid": "TEST_CALL_SID"
  }'
```

**Expected:** HTTP 200 with valid `conversation_initiation_client_data` JSON

### Test 2: Known Caller Test

Make a test call from a phone number that exists in Pipedrive:

1. Call Sarah's number: **+1-888-266-2193**
2. Listen to the greeting
3. **Expected:** Personalized greeting with your name/company
4. Check n8n logs: Verify Pipedrive lookup succeeded

### Test 3: Unknown Caller Test

Make a test call from a new/unknown number:

1. Call from a number NOT in Pipedrive
2. Listen to the greeting
3. **Expected:** Generic greeting ("Hi there, this is Sarah...")
4. Check n8n logs: Verify fallback response used

### Test 4: VIP Caller Test

Make a test call from a Gold tier account:

1. Ensure test number has `account_tier = "Gold"` in Pipedrive
2. Call Sarah's number
3. **Expected:** VIP greeting ("I see you're one of our premium clients...")
4. Verify `first_message` override applied

### Test 5: Secret Variable Test

During a call, trigger the SMS booking tool:

1. Progress through conversation to SMS step
2. Agent sends SMS
3. Check SMS webhook logs in n8n
4. **Expected:** Request includes `pipedrive_id` automatically
5. Verify Pipedrive note created with "SMS sent"

## Monitoring & Troubleshooting

### Key Metrics

Monitor these metrics in n8n and ElevenLabs:

| Metric | Target | Alert Threshold |
|--------|--------|-----------------|
| Webhook response time (P95) | <500ms | >600ms |
| Enrichment success rate | >90% | <80% |
| Pipedrive API latency | <250ms | >400ms |
| Sheets API latency | <300ms | >500ms |
| Cache hit rate | >80% | <60% |

### Common Issues

#### Issue 1: Webhook Timeout

**Symptom:** Generic greetings for all callers, n8n shows timeout errors

**Solution:**
1. Check n8n workflow execution time
2. Optimize slow API calls (add caching)
3. Reduce timeout if needed: 500ms → 400ms
4. Ensure fallback response triggers

#### Issue 2: Variables Not Populated

**Symptom:** Agent says "Hi {{customer_name}}" literally

**Solution:**
1. Verify variable names match exactly (case-sensitive)
2. Check webhook response includes all variables
3. Confirm variables defined in ElevenLabs agent config
4. Test with `console.log(dynamicVariables)` in n8n

#### Issue 3: Secret Variables Visible to LLM

**Symptom:** Agent mentions Pipedrive IDs in conversation

**Solution:**
1. Verify `secret__` prefix on all secret variables
2. Never reference secret variables in system prompt
3. Only use in tool parameter defaults
4. Audit LLM request logs for leaks

#### Issue 4: CRM Lookup Failures

**Symptom:** Low enrichment success rate, empty data

**Solution:**
1. Check Pipedrive API credentials
2. Verify phone number format matching (+1XXXXXXXXXX)
3. Test Pipedrive search manually
4. Check rate limits (unlikely but possible)

### Debug Mode

Enable verbose logging in n8n workflow:

1. Add logging node after each API call
2. Log timing: `execution_time_ms`
3. Log data: `pipedrive_result`, `sheets_result`
4. Log final response: `conversation_initiation_client_data`

### Emergency Rollback

If issues arise in production:

1. **Immediate:** Disable webhook in ElevenLabs Security tab
2. Agent reverts to default behavior (generic greetings)
3. No data loss, no downtime
4. Debug in staging environment
5. Re-enable after fix validated

## Security Considerations

### PII Protection

- ✅ Secret variables never sent to LLM
- ✅ Sanitization removes SSN/CC patterns from notes
- ✅ Webhook requires authentication (n8n API key)
- ✅ HTTPS only (TLS 1.2+)
- ✅ Audit logs for all enriched calls

### Access Control

- Only authorized n8n workflows can access webhook
- ElevenLabs webhook signature validation (if available)
- Rate limiting on webhook endpoint (500 req/min)

### Data Retention

- Cached data TTL: 24 hours
- Execution logs: 30 days retention
- No permanent storage of caller data in webhook

## Performance Optimization

### Caching Strategy (Optional)

If webhook latency exceeds 400ms consistently:

1. Implement Redis cache in n8n
2. Cache key: `caller:{phone}:enriched`
3. TTL: 24 hours
4. Cache hit = <100ms response
5. Target: >80% cache hit rate after 1 week

### Parallel API Calls

n8n workflow executes Pipedrive and Sheets lookups in parallel:

```
Webhook → Extract Metadata → [Pipedrive] → Merge → Respond
                           → [Sheets]    ↗
```

**Total latency:** `max(pipedrive_time, sheets_time)` + merge + 50ms overhead

### Graceful Degradation

Priority order:
1. Cache (fastest, if implemented)
2. Pipedrive (authoritative)
3. Google Sheets (historical)
4. Generic fallback (always works)

## Maintenance

### Weekly Checks

- [ ] Review enrichment success rate
- [ ] Check P95 latency trends
- [ ] Verify cache hit rate (if caching enabled)
- [ ] Audit error logs for patterns

### Monthly Tasks

- [ ] Review dynamic variable usage in transcripts
- [ ] Update variable definitions if needed
- [ ] Validate Pipedrive field mappings
- [ ] Test VIP greeting variations

### Quarterly Reviews

- [ ] A/B test personalized vs. generic greetings
- [ ] Measure conversion rate impact
- [ ] Survey caller satisfaction
- [ ] Consider expanding variables

## References

- [ElevenLabs Dynamic Variables Docs](https://elevenlabs.io/docs/agents-platform/customization/personalization/dynamic-variables)
- [ElevenLabs Twilio Personalization](https://elevenlabs.io/docs/agents-platform/customization/personalization/twilio-personalization)
- [n8n Workflow: Client Initiation Data](../supersystem/client-initiation-data-prod.json)
- [OpenSpec Proposal](../openspec/changes/enhance-client-initiation-data/proposal.md)

## Support

**Issues or Questions?**
- Check n8n execution logs first
- Review ElevenLabs conversation logs
- Test webhook endpoint with curl
- Check this guide's troubleshooting section

**Contact:**
- Internal: @wranngle-dev Slack channel
- ElevenLabs Support: https://elevenlabs.io/support
- n8n Community: https://community.n8n.io/

---

**Last Validated:** 2026-01-19
**Next Review:** 2026-02-19
