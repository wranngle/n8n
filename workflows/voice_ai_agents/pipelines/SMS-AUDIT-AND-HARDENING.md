# SMS Tool Audit & Hardening Plan

## Current State: v2.0 "Bulletproof"

**What v2.0 does well:**
- Phone validation (E.164 format)
- Delivery verification via polling (3 attempts)
- Twilio error code mapping with troubleshooting hints
- Proper HTTP status codes (200/202/400/500)
- Multiple response paths (success/pending/failed)

---

## CRITICAL FAILURE POINTS IDENTIFIED

### 1. 🔴 ENVIRONMENT VARIABLES NOT AVAILABLE IN CODE NODE
**Location:** `Verify Delivery Status` Code node
**Problem:** Uses `process.env.TWILIO_ACCOUNT_SID` and `process.env.TWILIO_AUTH_TOKEN` - these are NOT reliably available in n8n Code nodes.
**Impact:** Delivery verification silently fails, returns success without actual verification.
**Fix:** Use n8n credentials API or pass credentials via workflow variables.

### 2. 🔴 TOLL-FREE NUMBER NOT VERIFIED FOR A2P
**Error Code:** 30032
**Problem:** Toll-free number +18882662193 may not be verified for A2P (Application-to-Person) messaging.
**Impact:** All SMS silently fail with carrier rejection.
**Fix:**
- Complete Twilio A2P 10DLC registration
- OR switch to verified local number
- Add preemptive check for this error

### 3. 🔴 NO WEBHOOK AUTHENTICATION
**Problem:** Anyone who discovers the webhook URL can spam it.
**Impact:**
- Cost attack (Twilio charges per SMS)
- Abuse of your sending reputation
- Potential for harassment via your number
**Fix:** Add header-based authentication (X-Webhook-Secret)

### 4. 🟡 NO RETRY LOGIC
**Problem:** If Twilio API call fails, there's no automatic retry.
**Impact:** Temporary network issues = lost SMS
**Fix:** Add retry node with exponential backoff (3 attempts)

### 5. 🟡 NO IDEMPOTENCY
**Problem:** Same webhook request could be sent twice (network retry, duplicate click).
**Impact:** Customer gets duplicate SMS
**Fix:** Implement idempotency key based on phone+timestamp window

### 6. 🟡 NO RATE LIMITING
**Problem:** No protection against burst requests.
**Impact:** Could hit Twilio rate limits, all messages fail
**Fix:** Add rate limiting (e.g., 1 SMS per phone per 60 seconds)

### 7. 🟡 NO AUDIT LOGGING
**Problem:** Failed messages leave no trace for debugging.
**Impact:** Can't investigate customer complaints
**Fix:** Log all attempts to database/sheet with timestamp, phone, result

### 8. 🟡 NO DEAD LETTER QUEUE
**Problem:** Permanently failed messages are lost.
**Impact:** No way to manually retry or investigate patterns
**Fix:** Store failed attempts for manual review/retry

### 9. 🟡 US-ONLY PHONE VALIDATION
**Problem:** Regex `/^\+1[0-9]{10}$/` only validates US numbers.
**Impact:** Canadian (+1), international numbers rejected
**Fix:** Accept +1 (US/CA) and optionally other country codes

### 10. 🟡 COLLECTED DATA NOT USED
**Problem:** `industry` and `company_name` are collected but ignored.
**Impact:** Missed personalization opportunity
**Fix:** Include in message or store for CRM

### 11. 🟢 NO MESSAGE TEMPLATING
**Problem:** Hardcoded demo link message.
**Impact:** Can't customize for different campaigns
**Fix:** Support template parameter with variable substitution

### 12. 🟢 NO DELIVERY CALLBACK
**Problem:** Relies on polling, no webhook callback option.
**Impact:** ElevenLabs tool may timeout before delivery confirmed
**Fix:** Consider async delivery confirmation via separate webhook

---

## HARDENING PRIORITY MATRIX

| Priority | Issue | Effort | Impact |
|----------|-------|--------|--------|
| P0 | Env vars not available | Medium | Verification broken |
| P0 | Webhook authentication | Low | Security hole |
| P0 | A2P verification | External | All SMS may fail |
| P1 | Retry logic | Medium | Reliability |
| P1 | Idempotency | Medium | UX |
| P1 | Rate limiting | Low | Cost protection |
| P2 | Audit logging | Medium | Debugging |
| P2 | DLQ | Medium | Recovery |
| P2 | International phones | Low | Coverage |
| P3 | Data usage | Low | Personalization |
| P3 | Message templates | Low | Flexibility |

---

## V3.0 BULLETPROOF ARCHITECTURE

```
┌─────────────────────────────────────────────────────────────────┐
│                    INBOUND WEBHOOK                               │
│  [Auth Check] → [Rate Limit] → [Idempotency] → [Validate]       │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    PHONE VALIDATION                              │
│  [Format Check] → [Country Code] → [DNC Check?]                 │
│  Routes: Valid → Send | Invalid → Error Response                │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    MESSAGE COMPOSITION                           │
│  [Template Selection] → [Variable Substitution] → [Length Check]│
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    TWILIO SEND (WITH RETRY)                      │
│  [Attempt 1] → [Fail?] → [Wait 2s] → [Attempt 2] → [Attempt 3]  │
│  On Success: Continue | On Final Fail: DLQ                      │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    DELIVERY VERIFICATION                         │
│  [HTTP Node to Twilio API] (not Code node)                      │
│  [Poll 1] → [Poll 2] → [Poll 3] → [Final Status]                │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    AUDIT & RESPONSE                              │
│  [Log to Sheet/DB] → [Respond to Webhook]                       │
│  200: Delivered | 202: Pending | 400: Invalid | 500: Failed     │
└─────────────────────────────────────────────────────────────────┘
```

---

## NEW FEATURES FOR V3.0

### 1. Webhook Authentication
```javascript
// Header: X-Webhook-Secret: <configured_secret>
// Reject if missing or invalid
```

### 2. Idempotency Window
```javascript
// Key: MD5(phone_number + caller_name + floor(timestamp/300))
// 5-minute window prevents duplicates
```

### 3. Retry with Backoff
```
Attempt 1 → Fail → Wait 2s
Attempt 2 → Fail → Wait 4s
Attempt 3 → Fail → DLQ
```

### 4. Message Templates
```javascript
templates: {
  "demo": "Hi {first_name}! Here's your Wranngle demo: https://cal.com/wranngle/demo",
  "recap": "Hi {first_name}! Here's a recap of our call about {company_name}...",
  "followup": "Hi {first_name}! Just following up on your interest in Wranngle..."
}
```

### 5. Extended Phone Validation
```javascript
// US/Canada: +1XXXXXXXXXX
// UK: +44XXXXXXXXXX
// Accept any E.164 if starts with +
```

### 6. Audit Logging Fields
```javascript
{
  timestamp: ISO8601,
  request_id: UUID,
  phone_number: "masked +1***1234",
  caller_name: string,
  industry: string,
  company_name: string,
  template: string,
  attempt_count: number,
  final_status: "delivered|failed|pending",
  twilio_sid: string,
  error_code: number|null,
  duration_ms: number
}
```

---

## IMMEDIATE ACTION ITEMS

1. **FIX ENV VARS**: Replace Code node with HTTP Request node for Twilio status check
2. **ADD AUTH**: Add IF node at start to check X-Webhook-Secret header
3. **VERIFY A2P**: Check Twilio console for toll-free verification status
4. **ADD RETRY**: Wrap Twilio node in retry loop
5. **ADD LOGGING**: Append to Google Sheet or n8n table for audit trail
