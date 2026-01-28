# Client Initiation Data - Deployment Guide

**Status:** ✅ READY FOR DEPLOYMENT
**Created:** 2026-01-19
**Agent:** Sarah - Wranngle Lead Specialist v2.0
**Estimated Time:** 2-3 hours

---

## Overview

This guide provides step-by-step instructions for deploying the client initiation data enhancement to the Sarah agent. All code, workflows, and configurations are ready. This guide walks through the deployment process safely.

## Pre-Deployment Checklist

Before proceeding, ensure:

- [ ] n8n instance is accessible: https://n8n.wranngle.com
- [ ] Pipedrive API key is valid and has access to persons/search endpoint
- [ ] Google Sheets API credentials are configured in n8n
- [ ] ElevenLabs API key has admin access to agent
- [ ] Agent registry has been updated (`agent-registry.yaml`)
- [ ] Backup of current agent configuration exists
- [ ] Review period completed (all stakeholders approved proposal)

**⚠️ IMPORTANT:** This deployment affects a PRODUCTION agent. Follow steps carefully and test thoroughly in staging before enabling for all calls.

---

## Phase 1: Deploy n8n Workflow (30 minutes)

### Step 1.1: Import Workflow to n8n

1. Navigate to n8n: https://n8n.wranngle.com
2. Click **Workflows** → **Import from File**
3. Select file: `supersystem/client-initiation-data-prod.json`
4. Click **Import**

**Expected:** Workflow appears in n8n with name "[PROD] Client Initiation Data - Sarah"

### Step 1.2: Configure Credentials

The workflow requires these credentials:

**A. Pipedrive API**
1. In n8n, go to **Credentials** → **Add Credential**
2. Select **Pipedrive API**
3. Name: `Pipedrive - Wranngle`
4. API Token: (from `~/.claude/.env` → `PIPEDRIVE_API_KEY`)
5. Save

**B. Google Sheets API**
1. In n8n, go to **Credentials** → **Add Credential**
2. Select **Google Sheets OAuth2 API**
3. Name: `Google Sheets - Call History`
4. Follow OAuth flow to authorize
5. Save

### Step 1.3: Update Google Sheets Node

The workflow has a placeholder for the Sheet ID. Update it:

1. Open the workflow in n8n
2. Click on node: **"Google Sheets: Lookup Call History"**
3. In **Document ID**, replace `YOUR_GOOGLE_SHEET_ID` with actual Sheet ID
4. In **Sheet Name**, select the sheet containing call history (usually "Call History" or "Leads")
5. Save node

**To find Sheet ID:**
- Open Google Sheet in browser
- URL format: `https://docs.google.com/spreadsheets/d/{SHEET_ID}/edit`
- Copy the `{SHEET_ID}` portion

### Step 1.4: Test Workflow with Mock Data

Before activating, test with mock payload:

1. Click **Execute Workflow** (manually)
2. In webhook trigger, use this test payload:

```json
{
  "caller_id": "+15551234567",
  "agent_id": "agent_8001kdgp7qbyf4wvhs540be78vew",
  "called_number": "+18882662193",
  "call_sid": "TEST_CALL_SID_12345"
}
```

3. Click **Execute**

**Expected Output:**
- All nodes execute successfully (green checkmarks)
- "Merge & Transform Data" node outputs valid `conversation_initiation_client_data`
- Response time < 500ms
- No errors in any node

**If Pipedrive/Sheets lookups fail:** That's OK for test data. Verify the fallback response is returned correctly.

### Step 1.5: Activate Workflow

1. In n8n workflow view, click **Active** toggle (top right)
2. Status should change to **Active**

**Webhook URL is now live at:**
```
https://n8n.wranngle.com/webhook/client-initiation-data
```

### Step 1.6: Test Webhook Endpoint

Use curl to test the live endpoint:

```bash
curl -X POST https://n8n.wranngle.com/webhook/client-initiation-data \
  -H "Content-Type: application/json" \
  -d '{
    "caller_id": "+15551234567",
    "agent_id": "agent_8001kdgp7qbyf4wvhs540be78vew",
    "called_number": "+18882662193",
    "call_sid": "TEST_CURL_CALL"
  }'
```

**Expected Response (example):**
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

---

## Phase 2: Configure Dynamic Variables in ElevenLabs (20 minutes)

### Step 2.1: Navigate to Agent Configuration

1. Log in to [ElevenLabs Dashboard](https://elevenlabs.io/app)
2. Go to **Conversational AI** → **Agents**
3. Select **"[DEV] Sarah - Wranngle Lead Specialist"**
4. Click **Edit Agent**

### Step 2.2: Add Dynamic Variables

In the **Agent Configuration** section, scroll to **Dynamic Variables** and add each variable below:

**Regular Variables (11 total):**

| Name | Type | Description |
|------|------|-------------|
| `customer_name` | String | Full name of the caller from CRM |
| `customer_first_name` | String | First name only for personalized greeting |
| `company` | String | Company/organization name |
| `industry` | String | Industry sector (hvac, plumbing, legal, etc.) |
| `account_tier` | String | Customer tier: New, Bronze, Silver, Gold |
| `call_history` | String | Summary of previous interactions |
| `interaction_count` | Number | Number of previous calls/interactions |
| `last_topic` | String | Topic of last interaction |
| `notes` | String | Important notes about the caller (sanitized) |
| `lookup_success` | Boolean | Whether data enrichment succeeded |
| `data_source` | String | Data source used: pipedrive, sheets, cache, none |

**Secret Variables (3 total):**

| Name | Type | Description |
|------|------|-------------|
| `secret__pipedrive_person_id` | Number | Pipedrive person ID (not sent to LLM) |
| `secret__pipedrive_org_id` | Number | Pipedrive organization ID (not sent to LLM) |
| `secret__google_sheet_row` | Number | Google Sheets row number (not sent to LLM) |

**For each variable:**
1. Click **+ Add Variable**
2. Enter **Name** (exact, case-sensitive)
3. Select **Type** (String/Number/Boolean)
4. Add **Description**
5. Click **Save**

**⚠️ CRITICAL:** Variable names must match exactly (including `secret__` prefix). Case-sensitive!

### Step 2.3: Update System Prompt

Replace the current system prompt with the updated version that includes context awareness:

**File to use:** `temp/sarah_updated_prompt.md`

**Key changes:**
- Added **CONTEXT AWARENESS** section after **VARIABLES**
- Updated **DATA COLLECTION** to skip asking for data that's already populated
- Added natural language examples for using context variables
- Added guardrails against exposing variable syntax to callers

**Steps:**
1. In ElevenLabs agent config, scroll to **System Prompt**
2. Select all current prompt text
3. Replace with contents of `temp/sarah_updated_prompt.md`
4. Click **Save Changes**

### Step 2.4: Update SMS Tool with Secret Variable

Update the `send_sms` tool to automatically include Pipedrive person ID:

1. In agent config, scroll to **Tools**
2. Find tool: **"send_sms"**
3. Click **Edit Tool**
4. In **Parameters** section, find or add parameter:
   - **Name:** `pipedrive_id`
   - **Type:** `number`
   - **Description:** "CRM person ID for tracking"
   - **Default Value:** `{{secret__pipedrive_person_id}}`
   - **Required:** `false`
5. Click **Save Tool**

**Result:** When the agent calls send_sms, it will automatically include the pipedrive_id without the LLM knowing about it.

---

## Phase 3: Enable Client Initiation Data Webhook (10 minutes)

### Step 3.1: Configure Webhook in Agent Security Settings

1. Still in agent config, navigate to **Security** tab
2. Locate section: **Twilio Personalization**
3. Enable toggle: **"Fetch conversation initiation data for inbound Twilio calls"**
4. In **Webhook URL** field, enter:
   ```
   https://n8n.wranngle.com/webhook/client-initiation-data
   ```
5. Set **Timeout:** `500` ms
6. Click **Save Changes**

### Step 3.2: Configure Allowed Override Fields

In the same Security section:

1. Locate **Allowed Override Fields**
2. Enable these overrides:
   - ☑ **First Message** (for VIP/returning customer greetings)
   - ☑ **System Prompt** (optional, for extreme personalization)
3. Leave disabled:
   - ☐ Voice ID
   - ☐ Language (unless multi-language support needed)
4. Click **Save**

**Security Note:** Enabling overrides allows the webhook to customize agent behavior per call. Only enable what's needed.

---

## Phase 4: Testing & Validation (60 minutes)

### Test 1: Known Caller (Pipedrive Match)

**Setup:**
1. Identify a test contact in Pipedrive with phone number
2. Note their: name, company, phone

**Procedure:**
1. Call Sarah's number from test phone: **+1-888-266-2193**
2. Listen to agent's greeting

**Expected:**
- Agent greets with name: "Hi [FirstName], great to hear from you again!" (if interaction_count > 0)
- OR "Hi [FirstName], this is Sarah from Wranngle." (if interaction_count = 0 but name known)
- Agent references company naturally if appropriate

**Validation:**
1. Check n8n execution log:
   - Webhook received call
   - Pipedrive lookup succeeded
   - Response time < 500ms
2. Check ElevenLabs conversation log:
   - Dynamic variables populated in conversation metadata
   - Name and company appear in transcript naturally

**If fails:** Check Pipedrive API credentials, phone number format matching

---

### Test 2: Unknown Caller (Fallback)

**Setup:**
1. Use a phone number NOT in Pipedrive or Sheets

**Procedure:**
1. Call Sarah's number from unknown phone
2. Listen to agent's greeting

**Expected:**
- Generic greeting: "Thanks for calling Wranngle Systems. I'm Sarah..."
- Agent proceeds with standard discovery questions
- No personalization (no name/company mentioned)

**Validation:**
1. Check n8n execution log:
   - Both Pipedrive and Sheets lookups returned no results
   - Fallback response generated
   - Response time < 200ms (fast path)
2. Check ElevenLabs conversation:
   - Variables show generic values (customer_name = "there")
   - No errors, call proceeds normally

**If fails:** Verify fallback logic in "Merge & Transform Data" node

---

### Test 3: VIP Caller (Gold Tier)

**Setup:**
1. In Pipedrive, create/update test contact:
   - Set custom field `account_tier` = "Gold"
   - Or ensure call_count in Sheets > 15 (inferred Gold)

**Procedure:**
1. Call from VIP test number
2. Listen to greeting

**Expected:**
- VIP greeting: "Hi [FirstName], this is Sarah from Wranngle. I see you're one of our premium clients - how can I help you today?"
- Agent provides priority treatment during conversation

**Validation:**
1. Check n8n execution log:
   - `conversation_config_override.agent.first_message` is populated
2. Check ElevenLabs conversation:
   - First message override was used (visible in metadata)

**If fails:** Check VIP logic in "Merge & Transform Data" node (line ~110)

---

### Test 4: SMS Tool with Secret Variable

**Setup:**
1. Use known caller test (from Test 1)

**Procedure:**
1. Call and progress through conversation to SMS booking step
2. Accept demo SMS
3. Agent invokes send_sms tool

**Validation:**
1. Check SMS webhook logs in n8n (workflow: "[DEV] Sarah SMS Tool - BULLETPROOF")
2. Verify request body includes: `pipedrive_id: [number]` (not 0)
3. Check Pipedrive:
   - Note should be created on person record: "SMS sent with demo link"
   - Activity logged

**Expected:**
- SMS delivered successfully
- Pipedrive automatically updated
- Agent never mentioned the Pipedrive ID

**If fails:**
- Verify send_sms tool has `pipedrive_id` parameter with default `{{secret__pipedrive_person_id}}`
- Check SMS webhook can handle pipedrive_id parameter

---

### Test 5: Performance & Load

**Procedure:**
Use Apache Bench or similar tool to test webhook performance:

```bash
# Install ab (Apache Bench) if needed
# On Ubuntu: sudo apt-get install apache2-utils
# On Mac: already installed

# Test payload file
cat > test_payload.json << 'EOF'
{
  "caller_id": "+15551234567",
  "agent_id": "agent_8001kdgp7qbyf4wvhs540be78vew",
  "called_number": "+18882662193",
  "call_sid": "LOAD_TEST_CALL"
}
EOF

# Run 50 concurrent requests
ab -n 50 -c 10 -p test_payload.json -T application/json \
  https://n8n.wranngle.com/webhook/client-initiation-data
```

**Expected Metrics:**
- Mean response time: <200ms
- P95 response time: <500ms
- P99 response time: <800ms
- 100% success rate (no 500 errors)

**If fails (P95 > 500ms):**
- Implement Redis caching (see Phase 5: Optional Enhancements)
- Optimize Pipedrive/Sheets queries
- Increase n8n worker threads

---

### Test 6: Error Handling (API Failures)

**Setup:**
Temporarily break Pipedrive API access (wrong key or rate limit)

**Procedure:**
1. In n8n, edit workflow
2. In "Pipedrive: Lookup Person" node, temporarily change API key to invalid value
3. Save and make test call

**Expected:**
- Call proceeds normally
- Generic greeting used
- No errors exposed to caller
- Fallback response returned within 500ms

**Validation:**
1. Check n8n logs:
   - Pipedrive node shows error
   - Workflow continues to "Merge & Transform Data"
   - Fallback values used
2. Agent conversation proceeds without issues

**After test:** Restore correct Pipedrive credentials!

---

## Phase 5: Monitoring & Rollout (Ongoing)

### Gradual Rollout Strategy

**Week 1: 10% of calls**
- Monitor for issues
- Collect user feedback
- Track enrichment success rate

**Week 2: 50% of calls**
- If Week 1 metrics are good (>90% enrichment, <500ms P95)
- Expand gradually

**Week 3: 100% of calls**
- Full rollout if no issues

**Rollout implementation options:**
1. **Manual toggle:** Enable/disable webhook in ElevenLabs Security tab
2. **A/B test:** Use n8n IF node to randomly enable enrichment for X% of calls
3. **Phased phone numbers:** Start with specific caller segments (VIPs first)

### Key Metrics to Monitor

**Performance Metrics:**
| Metric | Target | Alert Threshold |
|--------|--------|-----------------|
| Webhook P95 latency | <500ms | >600ms |
| Enrichment success rate | >90% | <80% |
| Pipedrive API latency | <250ms | >400ms |
| Sheets API latency | <300ms | >500ms |

**Business Metrics:**
| Metric | Baseline | Target (Month 1) |
|--------|----------|------------------|
| Booking conversion rate | TBD | +15% |
| Qualification time | TBD | -30% |
| Call abandonment rate | TBD | -20% |
| Caller satisfaction (survey) | TBD | +25% |

### Monitoring Tools

**n8n Execution History:**
- View: https://n8n.wranngle.com/workflow/[workflow_id]/executions
- Monitor: execution times, success rate, error patterns
- Alert: Set up email/Slack notifications for failures

**ElevenLabs Analytics:**
- View: ElevenLabs Dashboard → Analytics
- Monitor: conversation duration, tool usage, transcript quality
- Alert: Built-in ElevenLabs monitoring

**Custom Monitoring (Optional):**
Create n8n workflow to aggregate metrics:
1. Query n8n API for execution logs (last 24 hours)
2. Calculate: P50/P95 latency, success rate, data source distribution
3. Send daily summary to Slack

---

## Rollback Procedure

If issues arise after deployment:

### Immediate Rollback (1 minute)

**Option A: Disable Webhook (Recommended)**
1. Go to ElevenLabs agent → Security tab
2. Disable toggle: "Fetch conversation initiation data..."
3. Click Save

**Result:** Agent reverts to generic behavior immediately. No downtime, no data loss.

**Option B: Deactivate n8n Workflow**
1. Go to n8n workflow
2. Toggle **Active** to OFF
3. Webhook returns 404, ElevenLabs uses fallback behavior

### Partial Rollback (Keep enrichment but disable overrides)

If overrides are causing issues but enrichment works:

1. ElevenLabs → Security → Allowed Override Fields
2. Uncheck: "First Message" and "System Prompt"
3. Save

**Result:** Variables still populated, but no greeting/prompt customization.

### Investigation After Rollback

1. Check n8n execution logs for patterns
2. Review ElevenLabs conversation logs
3. Test webhook endpoint manually (curl)
4. Identify root cause
5. Fix in staging
6. Re-deploy when validated

---

## Troubleshooting

### Issue: Agent says "{{customer_name}}" literally

**Cause:** Variable not defined in ElevenLabs or name mismatch

**Fix:**
1. Verify variable exists: ElevenLabs → Agent → Dynamic Variables
2. Check exact spelling and case (case-sensitive!)
3. Test webhook response includes the variable

---

### Issue: Generic greeting for all callers

**Cause:** Webhook not triggered or enrichment failing

**Fix:**
1. Check webhook is enabled: ElevenLabs → Security tab
2. Verify webhook URL is correct
3. Test webhook with curl
4. Check n8n execution logs for errors
5. Verify Pipedrive/Sheets credentials

---

### Issue: High latency (P95 > 500ms)

**Cause:** Slow API responses or sequential execution

**Fix:**
1. Check Pipedrive and Sheets response times in n8n logs
2. Verify lookups are parallel (not sequential)
3. Consider implementing caching (see below)

**Caching Implementation:**
Add Redis cache node before API lookups:
1. Cache key: `caller:{phone}:enriched`
2. TTL: 24 hours
3. Cache hit: skip API calls, return cached data
4. Cache miss: fetch from APIs, write to cache

---

### Issue: Secret variables visible to LLM

**Cause:** Missing `secret__` prefix or used in system prompt

**Fix:**
1. Verify variable names start with `secret__`
2. Check system prompt doesn't reference secret variables
3. Secret variables should ONLY be in tool parameter defaults

---

### Issue: SMS tool doesn't receive pipedrive_id

**Cause:** Tool parameter not configured with default value

**Fix:**
1. ElevenLabs → Agent → Tools → send_sms
2. Edit parameter `pipedrive_id`
3. Set **Default Value:** `{{secret__pipedrive_person_id}}`
4. Save

---

## Post-Deployment

### Week 1 Tasks

- [ ] Monitor enrichment success rate daily
- [ ] Review 10 sample conversation transcripts
- [ ] Check for any caller complaints about AI "knowing too much"
- [ ] Validate Pipedrive integration (notes created correctly)
- [ ] Review P95 latency trends

### Week 2-4 Tasks

- [ ] A/B test personalized vs. generic greetings
- [ ] Survey callers: "Was the greeting helpful?"
- [ ] Measure booking conversion rate change
- [ ] Document lessons learned
- [ ] Expand variable usage if successful

### Monthly Review

- [ ] Review all metrics vs. targets
- [ ] Identify opportunities for new variables
- [ ] Consider expanding to other agents
- [ ] Update documentation with learnings

---

## Success Criteria

Deployment is considered successful when:

✅ Webhook P95 latency < 500ms (consistently)
✅ Enrichment success rate > 90% (for known callers)
✅ Zero PII leaks to LLM (audit logs clear)
✅ Zero agent errors related to variables
✅ Booking conversion rate up 10%+ (measured over 2 weeks)
✅ Caller satisfaction positive (survey responses)
✅ No rollbacks required in first 2 weeks

---

## Support & Contact

**Issues or Questions?**
- Technical: Review n8n logs, ElevenLabs conversation logs
- Business: Contact product owner
- Emergency: Rollback immediately, investigate later

**Documentation:**
- Setup Guide: `docs/elevenlabs-client-initiation-setup.md`
- OpenSpec Proposal: `openspec/changes/enhance-client-initiation-data/proposal.md`
- n8n Workflow: `supersystem/client-initiation-data-prod.json`

---

**Deployment Checklist:**

Before going live:
- [ ] All Phase 1 steps completed (n8n workflow deployed)
- [ ] All Phase 2 steps completed (variables defined)
- [ ] Phase 3 complete (webhook enabled)
- [ ] All 6 tests passed (Phase 4)
- [ ] Monitoring set up
- [ ] Rollback procedure documented and tested
- [ ] Stakeholders notified of deployment

**Ready to deploy!** 🚀
