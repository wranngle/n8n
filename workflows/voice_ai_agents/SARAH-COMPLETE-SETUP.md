# Sarah - Wranngle Receptionist: Complete Setup

## Current Status: PRODUCTION MODE ACTIVE ✅

**Call to Test:** +1-888-266-2193

### What Works Now
- Phone number rings through to Sarah agent ✅
- Sarah answers with universal template prompt ✅
- Sarah can have natural conversations ✅
- Sarah "sends SMS" successfully (mock endpoint returns 200) ✅

### Production Mode Active
The send_sms tool is now connected to the live n8n webhook which sends real SMS via Twilio.

**Webhook URL:** `https://n8n.wranngle.com/webhook/send-sms`
**Twilio Number:** +1-888-266-2193

**For Upwork demos:** Fully production-ready - callers receive real SMS messages with booking links.

---

## Configuration Summary

| Component | Value | Status |
|-----------|-------|--------|
| Agent ID | `agent_8001kdgp7qbyf4wvhs540be78vew` | ✅ Active |
| Phone | +1-888-266-2193 | ✅ Assigned |
| Voice | Sarah (EXAVITQu4vr4xnSDxMaL) | ✅ Active |
| LLM | gemini-3-flash-preview | ✅ Active |
| Temperature | 0.1 | ✅ Deterministic |
| SMS Tool | n8n.wranngle.com/webhook/send-sms | ✅ Live Twilio |
| Prompt | Universal Template (8,498 chars) | ✅ Applied |

---

## System Prompt (Universal Template Applied)

**Prompt file:** `sarah-merged-prompt-v2.md` (12,629 chars with all 7 fixes)

### Template Sections Included

| Section | Purpose |
|---------|---------|
| **VARIABLES** | Agent name, company, system vars |
| **ENVIRONMENT** | Optimization constraints for TTS |
| **PERSONALITY** | Word economy (<15 words), warmth |
| **TONE** | Conversational, efficient, authentic |
| **GUARDRAILS** | Speech handling, intake scope, phone validation, recap, safety |
| **TEXT NORMALIZATION** | Phone, email, address format conversion |
| **Tools** | send_sms, end_call, skip_turn |
| **Knowledge Base** | Wranngle services, pricing, hours |
| **Goal** | 3-phase flow: greeting → data collection → demo booking |
| **Routing** | No subagents, direct handling |

### Key Guardrails

- **Word Economy:** Target under 15 words per response
- **Phone Handling:** Never fabricate digits; validate silently
- **Tool Execution:** Never claim SMS sent before tool confirms
- **Recap:** Single final recap; no mid-conversation confirmations
- **Safety:** Recommend 911 for emergencies

---

## Tool Configuration

**Tool Name:** send_sms
**Type:** Webhook (POST)
**URL:** https://n8n.wranngle.com/webhook/send-sms (LIVE - sends real SMS)
**Required Fields:**
- `caller_name` (string): The caller's first name
- `phone_number` (string): Phone number in E.164 format

---

## Test Script

1. Call +1-888-266-2193
2. Say: "Hi, I'm interested in learning about your voice AI services"
3. Sarah explains services and offers to text booking link
4. Say: "Yes, please text me the link"
5. Sarah asks for your first name
6. Give a name
7. Sarah calls send_sms tool (n8n webhook → Twilio SMS)
8. SMS arrives on caller's phone within seconds
9. Sarah confirms: "Just sent it. You should see it in a few seconds."
10. Sarah closes the call gracefully

**Expected Result:** Full production flow - real SMS arrives with booking link.

---

## SMS Pipeline (ACTIVE)

**Status:** Live and working

**Pipeline:**
1. Caller provides phone number to Sarah
2. Sarah calls `send_sms` tool with phone_number and caller_name
3. n8n webhook receives POST at `/webhook/send-sms`
4. Twilio node sends SMS from +1-888-266-2193
5. Caller receives: "Hi {name}! Here is your link to book a demo with Wranngle: https://cal.com/wranngle/demo"

**Twilio Credentials:** Stored in `workflows/voice_ai_agents/env/.env.twilio`
**n8n Workflow ID:** `5eowJIoZFZOSG85m` (ElevenLabs Twilio Outbound Call with Client Data)

---

## Governance

| Field | Value |
|-------|-------|
| Phase | PROD |
| Agent ID | agent_8001kdgp7qbyf4wvhs540be78vew |
| SMS Tool | n8n.wranngle.com/webhook/send-sms |
| Workflow ID | 5eowJIoZFZOSG85m |
| Prompt Template | elevenlabs_prompt_template.md |

---

## Files

| File | Purpose |
|------|---------|
| `sarah-merged-prompt.md` | Full merged prompt (8,498 chars) |
| `templates/elevenlabs-agents/elevenlabs_prompt_template.md` | Universal template source |
| `SARAH-COMPLETE-SETUP.md` | This documentation |

---

*Last Updated: 2025-12-28T23:20:00Z*
*Status: PRODUCTION MODE - V2 prompt applied with 7 critical fixes*

---

## V2 Prompt Improvements (Applied 2025-12-28)

| Issue | Fix Applied |
|-------|-------------|
| Wrong greeting on outbound | Call direction detection at start |
| Premature pricing | Lead qualification BEFORE pricing |
| No qualification | 3 qualifying questions required |
| Abrupt closing | Soft closing protocol ("anything else?") |
| SMS tool showed "None" | Tool URL fixed: n8n webhook instead of httpbin |
| No phone confirmation | Collect phone BEFORE attempting SMS |
| "Thanks for calling" on outbound | Context-aware closing language |
