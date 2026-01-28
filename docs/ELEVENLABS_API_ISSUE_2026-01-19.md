# ELEVENLABS API ISSUE - URGENT
**Issue ID:** ELEVENLABS-500-2026-01-12
**Severity:** CRITICAL - BLOCKING
**Discovered:** 2026-01-12
**Status:** UNRESOLVED
**Impact:** All voice agent evaluation testing halted

---

## EXECUTIVE SUMMARY

The ElevenLabs `simulate-conversation` API endpoint has been returning 500 Internal Server errors since January 12, 2026. This blocks all automated voice agent evaluation workflows, preventing production validation and quality assurance.

**Business Impact:**
- Cannot validate voice agents before deployment
- 100+ evaluation runs incomplete
- Autocorrection workflows non-functional
- Agent improvements cannot be deployed safely

---

## TECHNICAL DETAILS

### API Endpoint
```
POST /v1/convai/agents/{agent_id}/simulate-conversation
```

### Error Response
```json
{
  "status": "internal_server_error",
  "message": "Internal Server error"
}
```

### HTTP Status Code
```
500 Internal Server Error
```

### Agent ID
```
agent_5701kdgf9s4vfe9rhe68ntjrms9g
```

---

## TESTED CONFIGURATIONS

All the following request payloads have been tested and result in 500 errors:

### Attempt 1: Using `first_message`
```json
{
  "first_message": "Hi, this is a test conversation."
}
```
**Result:** ❌ 500 Error

### Attempt 2: Using `prompt.prompt`
```json
{
  "prompt": {
    "prompt": "Hi, this is a test conversation."
  }
}
```
**Result:** ❌ 500 Error

### Attempt 3: Minimal Payload
```json
{}
```
**Result:** ❌ 500 Error

### Attempt 4: With Conversation Config
```json
{
  "conversation_config_override": {
    "agent": {
      "first_message": "Hi, this is a test conversation."
    }
  }
}
```
**Result:** ❌ 500 Error

---

## REPRODUCTION STEPS

### Via n8n Workflow

1. Navigate to workflow: `[DEV] SRIS - ElevenLabs Conversation Evaluator` (ID: `RjLiUAiuUs5XPvBj`)
2. Trigger manual execution
3. Observe HTTP Request node fails with 500 error
4. Check execution data for error response

### Via curl (for isolation testing)

```bash
export ELEVENLABS_API_KEY="sk_dd3cfeec8d712a9924c84790dd43b6bacc62686d89b2e41b"
export AGENT_ID="agent_5701kdgf9s4vfe9rhe68ntjrms9g"

curl -X POST "https://api.elevenlabs.io/v1/convai/agents/${AGENT_ID}/simulate-conversation" \
  -H "xi-api-key: ${ELEVENLABS_API_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "first_message": "Hi, this is a test conversation."
  }'
```

**Expected Output (when working):**
```json
{
  "conversation_id": "conv_xyz123",
  "analysis": {
    "transcript": [...],
    "sentiment": "positive",
    "key_points": [...]
  }
}
```

**Actual Output:**
```json
{
  "status": "internal_server_error",
  "message": "Internal Server error"
}
```

---

## AFFECTED WORKFLOWS

### Primary Impact

| Workflow Name | ID | Status | Impact |
|---------------|-----|--------|--------|
| SRIS - ElevenLabs Conversation Evaluator | RjLiUAiuUs5XPvBj | ❌ BLOCKED | Cannot run evaluations |
| Universal Evaluation Runner v2 | p60GgdEwiDcIrxgp | ❌ BLOCKED | Evaluation pipeline halted |
| Voice Agent Tester v2.0 | KrqpJuyN8pjTouAo | ❌ BLOCKED | Testing non-functional |
| Autorefinement Orchestrator | dKJYSCGIORtUsTSM | ❌ BLOCKED | Cannot auto-correct agents |

### Secondary Impact

| System | Impact |
|--------|--------|
| **Evaluation Metrics** | Not recorded |
| **Autocorrection** | Not triggered |
| **Agent Improvements** | Cannot deploy |
| **Quality Assurance** | Manual testing only |

---

## DIAGNOSTIC INFORMATION

### Account Details
- **API Key:** `sk_dd3cfeec8d712a9924c84790dd43b6bacc62686d89b2e41b` (last 4 chars)
- **Account Email:** (check ElevenLabs dashboard)
- **Subscription Tier:** (verify current plan)
- **Credits Remaining:** (check balance)

### Agent Configuration
- **Agent ID:** `agent_5701kdgf9s4vfe9rhe68ntjrms9g`
- **Agent Name:** (check via `GET /v1/convai/agents/{agent_id}`)
- **Agent Status:** (verify agent is active)
- **Last Modified:** (check agent modification date)

### Credential Configuration
- **n8n Credential ID:** `5BIOspwXrFAIQ2OI` (primary)
- **n8n Credential ID (alt):** `eR7srDUHDyZLIZgh` (some workflows)
- **Credential Type:** `httpHeaderAuth`
- **Header Name:** `xi-api-key`
- **Verification:** ✅ Other ElevenLabs API calls working (text-to-speech, list agents)

### Environment
- **n8n Version:** (check instance version)
- **n8n Instance:** https://n8n.wranngle.com
- **HTTP Request Node:** Using `Request node`
- **Request Method:** POST
- **Timeout:** 60 seconds (default)

---

## ISOLATION TESTS

### Test 1: Verify API Key Validity ✅ PASS
```bash
curl "https://api.elevenlabs.io/v1/user" \
  -H "xi-api-key: ${ELEVENLABS_API_KEY}"
```
**Result:** Successfully returns user info → API key is valid

### Test 2: Verify Agent Exists ✅ PASS
```bash
curl "https://api.elevenlabs.io/v1/convai/agents/${AGENT_ID}" \
  -H "xi-api-key: ${ELEVENLABS_API_KEY}"
```
**Result:** Successfully returns agent configuration → Agent exists

### Test 3: List All Agents ✅ PASS
```bash
curl "https://api.elevenlabs.io/v1/convai/agents" \
  -H "xi-api-key: ${ELEVENLABS_API_KEY}"
```
**Result:** Successfully lists agents → API endpoint working

### Test 4: Text-to-Speech API ✅ PASS
```bash
curl -X POST "https://api.elevenlabs.io/v1/text-to-speech/21m00Tcm4TlvDq8ikWAM" \
  -H "xi-api-key: ${ELEVENLABS_API_KEY}" \
  -H "Content-Type: application/json" \
  -d '{"text": "test"}'
```
**Result:** Successfully generates audio → Other API endpoints working

### Test 5: Simulate Conversation ❌ FAIL
```bash
curl -X POST "https://api.elevenlabs.io/v1/convai/agents/${AGENT_ID}/simulate-conversation" \
  -H "xi-api-key: ${ELEVENLABS_API_KEY}" \
  -H "Content-Type: application/json" \
  -d '{"first_message": "test"}'
```
**Result:** 500 Internal Server Error → Problem isolated to this endpoint only

---

## ROOT CAUSE ANALYSIS

### Hypothesis 1: API Endpoint Issue (LIKELY)
- Only `simulate-conversation` endpoint affected
- Other ElevenLabs API calls working normally
- Multiple agents tested, same result
- Multiple payloads tested, same result
- **Conclusion:** Likely server-side issue at ElevenLabs

### Hypothesis 2: Agent Configuration (UNLIKELY)
- Agent exists and is accessible via GET
- Agent used to work previously (historical data exists)
- **Conclusion:** Agent configuration not the issue

### Hypothesis 3: API Key Permissions (RULED OUT)
- API key valid for other endpoints
- No 401/403 authorization errors
- **Conclusion:** API key permissions not the issue

### Hypothesis 4: Request Payload Format (RULED OUT)
- Multiple payload formats tested
- All documented formats tried
- **Conclusion:** Request format not the issue

### Hypothesis 5: Rate Limiting (RULED OUT)
- No 429 rate limit errors
- Account in good standing
- **Conclusion:** Not a rate limiting issue

---

## WORKAROUNDS

### Option 1: Use ElevenLabs Tests Tab (UI-Based)
**Method:** Manual testing via ElevenLabs web dashboard
- Navigate to: https://elevenlabs.io/app/conversational-ai
- Select agent
- Go to "Tests" tab
- Run conversations manually
- Export results

**Pros:**
- ✅ Works immediately
- ✅ No API dependency

**Cons:**
- ❌ Manual process (not scalable)
- ❌ No automation
- ❌ Cannot integrate with n8n
- ❌ Limited to small batches

**Effort:** 5 minutes per test scenario

---

### Option 2: n8n Native Evaluations (RECOMMENDED)
**Method:** Use n8n's built-in evaluation framework

**Implementation:**
1. Use "Evaluation Trigger" node (manual/scheduled)
2. Use "HTTP Request" node to call agent directly (not simulate API)
3. Record responses in database/spreadsheet
4. Use "Set Metrics" node for scoring
5. Build custom evaluation workflow

**Pros:**
- ✅ Fully automated
- ✅ Integrated with n8n
- ✅ Scalable to 1000+ tests
- ✅ Custom metrics possible

**Cons:**
- ⚠️ Requires workflow redesign (8-12 hours)
- ⚠️ May need different approach than simulations

**Effort:** 8-12 hours initial setup

**Example Workflow:**
```
Evaluation Trigger → HTTP Request (direct agent call)
→ Code Node (parse response) → Set Metrics
→ Conditional (pass/fail) → Slack Notification
```

---

### Option 3: Custom Evaluation Runner (ADVANCED)
**Method:** Build webhook-based evaluation system

**Implementation:**
1. Create webhook trigger workflow
2. Accept evaluation requests via HTTP POST
3. Call agent via phone/SMS/chat (not simulate API)
4. Parse transcripts from agent logs
5. Score using custom logic
6. Return results to caller

**Pros:**
- ✅ Most flexible
- ✅ Can run evaluations in parallel
- ✅ Real-world testing (actual phone calls)

**Cons:**
- ❌ Complex (24+ hours effort)
- ❌ Requires Twilio integration
- ❌ May incur call costs

**Effort:** 24+ hours

---

## IMMEDIATE ACTIONS REQUIRED

### Priority 1: Contact ElevenLabs Support (URGENT - TODAY)

**Support Ticket Template:**
```
Subject: 500 Error on /v1/convai/agents/{agent_id}/simulate-conversation API

Description:
We are experiencing 500 Internal Server errors when calling the simulate-conversation API endpoint since January 12, 2026.

Details:
- Endpoint: POST /v1/convai/agents/{agent_id}/simulate-conversation
- Agent ID: agent_5701kdgf9s4vfe9rhe68ntjrms9g
- Account Email: [your-email@wranngle.com]
- API Key (last 4 chars): e41b
- Error: {"status": "internal_server_error", "message": "Internal Server error"}
- Impact: All automated voice agent evaluations blocked

Isolation Testing:
- Other API endpoints working normally (user info, list agents, text-to-speech)
- Multiple request payloads tested (first_message, prompt.prompt, minimal payload)
- Multiple agents tested - same result
- Error persists for 7+ days

Request:
1. Confirm if this is a known issue
2. Estimated time to resolution
3. Any workarounds available

Thank you.
```

**Support Channels:**
1. Email: support@elevenlabs.io
2. Dashboard: https://elevenlabs.io/app/settings/support
3. Discord: https://discord.gg/elevenlabs (community)
4. Docs: https://elevenlabs.io/docs (check status page)

---

### Priority 2: Check ElevenLabs Status Page (5 minutes)

**URLs to Check:**
- https://status.elevenlabs.io (if exists)
- https://elevenlabs.io/changelog
- https://twitter.com/elevenlabsio
- https://discord.gg/elevenlabs

**Look for:**
- Recent incidents
- API deprecation notices
- Endpoint changes
- Maintenance windows

---

### Priority 3: Verify Account Status (10 minutes)

**Check Dashboard:**
1. Log in: https://elevenlabs.io/app
2. Check credits balance
3. Verify subscription is active
4. Check for any account warnings
5. Review recent API usage (any anomalies?)
6. Check billing status

---

### Priority 4: Implement Workaround (Option 2 - n8n Native) (8-12 hours)

**If no response from support within 48 hours, proceed with:**
- Design n8n native evaluation workflow
- Test with 5-10 scenarios
- Compare results with historical simulate-conversation data
- Document equivalence mapping
- Deploy to DEV environment

---

## ESCALATION PATH

### Hour 0-24: Normal Support
- Submit support ticket
- Check status page
- Test workarounds

### Hour 24-48: Follow-up
- Reply to support ticket
- Tag as "urgent" or "production blocking"
- Request escalation to engineering team

### Hour 48-72: Escalation
- Request manager/supervisor review
- Mention business impact (blocking production)
- Ask for status update every 24 hours

### Hour 72+: Contingency
- Implement Option 2 (n8n native evaluations)
- Document all API issues for future reference
- Consider alternative AI platforms (if pattern continues)

---

## EXPECTED RESOLUTION

### Best Case (24-48 hours)
- ElevenLabs identifies server-side bug
- Deploys hotfix
- API endpoint restored
- Resume normal evaluation workflows

### Likely Case (3-5 days)
- ElevenLabs confirms issue
- Schedules fix in next release
- Provides workaround or beta endpoint
- Implement temporary solution

### Worst Case (1-2 weeks)
- API permanently deprecated (unlikely)
- Must redesign evaluation approach
- Implement Option 2 or 3 permanently

---

## MONITORING & TRACKING

### Daily Checks (until resolved)
- [ ] Check support ticket for updates
- [ ] Test simulate-conversation endpoint (curl test)
- [ ] Review ElevenLabs status page
- [ ] Check community forums for similar reports

### Weekly Review
- [ ] Assess workaround effectiveness
- [ ] Measure evaluation coverage vs. baseline
- [ ] Update remediation plan
- [ ] Report status to stakeholders

---

## LESSONS LEARNED (Post-Resolution)

### Prevention
- [ ] Add health checks for critical API dependencies
- [ ] Implement circuit breaker pattern
- [ ] Build fallback evaluation methods
- [ ] Monitor API endpoint status proactively

### Documentation
- [ ] Document API deprecation process
- [ ] Create API migration playbook
- [ ] Build vendor risk assessment matrix

### Testing
- [ ] Add integration tests for all external APIs
- [ ] Mock external services in test environment
- [ ] Implement synthetic monitoring

---

## APPENDIX

### Related Documentation
- **EVALUATION-SYSTEMS-TODO.md** - Original evaluation architecture
- **REMEDIATION_PLAN.md** - Workflow fixes (blocked by this issue)
- **GOVERNANCE_AUDIT_20260109.md** - Governance findings
- **supersystem/README.md** - Voice agent architecture

### Historical Data
- **Last Successful Evaluation:** 2026-01-11 (approx.)
- **Total Evaluations Blocked:** 100+ (estimated)
- **Workflows Affected:** 4 primary, 8 secondary

### Contact Information
- **ElevenLabs Support:** support@elevenlabs.io
- **n8n Instance:** https://n8n.wranngle.com
- **Project Owner:** Wranngle Systems LLC

---

**Report Generated:** 2026-01-19
**Next Review:** 2026-01-20 (after support response)
**Status:** OPEN - Awaiting ElevenLabs Support Response