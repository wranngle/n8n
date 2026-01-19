# Change: Update Sarah Voice Agent to v2.0 B2B Sales SDR

## Why

The Sarah AI voice agent needs to evolve from a generic receptionist to a specialized B2B Sales Development Representative (SDR). Current issues identified:

1. **Opening Problem**: Agent says "Hi this is Sarah from Wranngle Systems" and waits silently - causing immediate hang-ups
2. **Value Proposition Gap**: Agent fails to communicate what Wranngle does within first 5 seconds
3. **Demo Weakness**: Demo doesn't adequately show emergency vs. routine triage
4. **Audience Mismatch**: Current language is too technical for target audience (trades business owners)
5. **Lead Qualification Gap**: No integration with structured intake schema for scoring

## What Changes

### Sarah Agent Configuration
- **MODIFIED** Opening flow to deliver value proposition in first 5 seconds
- **MODIFIED** Call direction awareness (outbound vs inbound handling)
- **ADDED** Industry-specific pain statements (HVAC, plumbing, property management, legal)
- **ADDED** Discovery questions mapped to intake schema (volume, current solution, authority)
- **ADDED** Demo-focused close as primary conversion mechanism
- **MODIFIED** Forbidden language enforcement (no "agentic", "LLM", tech jargon)
- **ADDED** Word economy guideline (target under 25 words per response)
- **MODIFIED** Pricing protocol with qualification gate
- **ADDED** Tool output verbalization guardrails (never speak "None", "null", errors)

### Voice Configuration
- **MODIFIED** TTS settings for authoritative-yet-warm delivery
- Voice ID: `pFZP5JQG7iQjIQuC4Bku` (Lily)
- Stability: 0.55, Speed: 0.95, Similarity Boost: 0.80

### Lead Qualification Integration
- **ADDED** Field mapping to unified_presales_report intake schema
- **ADDED** Real-time qualification scoring during conversation
- **ADDED** Company profile extraction (account, contact, industry, volume)

### Testing Framework
- **ADDED** Test scenarios for cold call flows
- **ADDED** Test scenarios for objection handling
- **ADDED** Emergency redirect validation
- **ADDED** Voice quality checklist
- **ADDED** Post-launch monitoring metrics

## Impact

- Affected specs: `voice-agent-sarah` (new), `voice-agent-testing` (new)
- Affected files:
  - `workflows/voice_ai_agents/sarah-agent-config.json`
  - `workflows/voice_ai_agents/sarah-agent-tech-spec.md`
- Dependent projects: `unified_presales_report` (intake schema consumer)
- Integrations: ElevenLabs API, n8n webhook `send-sms`

## Risk Assessment

- **Low Risk**: Voice configuration changes (easily reversible)
- **Medium Risk**: Prompt restructuring (requires A/B testing)
- **Low Risk**: Test framework additions (additive, non-breaking)

## Success Criteria

1. Opening hang-up rate decreases by >30%
2. Demo link send rate increases by >25%
3. All test scenarios pass validation
4. Lead qualification data captured matches intake schema structure
