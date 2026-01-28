# Design: Sarah Voice Agent v2.0 Architecture

## Context

The Sarah AI voice agent is deployed on ElevenLabs Conversational AI platform with Twilio integration for phone calls. It currently operates as a generic receptionist but needs transformation into a specialized B2B sales SDR targeting small service businesses.

**Stakeholders:**
- Wranngle Systems sales team (primary users)
- HVAC/Plumbing/Property Management business owners (call recipients)
- n8n workflow automation (post-call processing)

**Constraints:**
- ElevenLabs Conversational AI API limitations
- Twilio phone system integration requirements
- Target audience technical sophistication (low-medium)
- Real-time conversation latency requirements (<500ms TTS)

## Goals / Non-Goals

**Goals:**
- Transform Sarah from receptionist to B2B sales SDR
- Implement scientifically-backed voice characteristics for sales
- Integrate lead qualification with intake schema
- Create comprehensive test framework
- Reduce opening hang-up rate

**Non-Goals:**
- Multi-language support (English only for v2.0)
- Custom voice cloning (use existing ElevenLabs voices)
- CRM auto-population (handled by downstream n8n workflows)
- Automated follow-up scheduling (manual for v2.0)

## Decisions

### Decision 1: Voice Selection

**Choice:** Lily voice (pFZP5JQG7iQjIQuC4Bku) with modified TTS settings

**Rationale:**
- Research shows lower pitch conveys authority and confidence
- Stability 0.55 provides natural variation without instability
- Speed 0.95 (slightly slower) correlates with higher win rates
- Professional American female matches "competent office manager" persona

**Alternatives Considered:**
- Rachel (21m00Tcm4TlvDq8ikWAM): Default voice, less distinctive
- Jessica Anne Bogart (g6xIsTj2HwM6VR4iXFCw): More empathetic, less authoritative
- Angela (PT4nqlKZfc06VW1BuClj): Raw/relatable but less professional

### Decision 2: Conversation Flow Architecture

**Choice:** 5-phase structured flow with call direction awareness

```
HOOK (0-10s) → DISCOVERY (3 questions) → PAIN AGITATION → SOLUTION → DEMO CLOSE
```

**Rationale:**
- First 10 seconds determine call outcome (research-backed)
- 3 discovery questions map to critical intake schema fields
- Industry-specific pain statements increase relevance
- Demo close is primary conversion mechanism (stakeholder requirement)

### Decision 3: Lead Qualification Mapping

**Choice:** Real-time field collection mapped to unified_presales_report schema

**Mapping:**
| Voice Question | Schema Path |
|----------------|-------------|
| Industry detection | `prepared_for.industry` |
| After-hours volume | `q06_runs_per_period` |
| Current solution | `q13_common_failures` |
| Decision maker? | `decision_maker` |
| Contact name | `prepared_for.contact_name` |
| Company name | `prepared_for.account_name` |

**Rationale:**
- Enables seamless handoff to presales report generation
- Supports lead scoring calculation
- Maintains data consistency across systems

### Decision 4: Test Framework Structure

**Choice:** Scenario-based testing with voice quality checklist

**Test Categories:**
1. Cold Call Flows (outbound)
2. Inbound Handling
3. Objection Response
4. Emergency Redirect
5. Tool Failure Recovery

**Rationale:**
- Covers primary use cases identified in tech spec
- Voice quality separate from conversation logic
- Enables regression testing during prompt iterations

## Risks / Trade-offs

| Risk | Impact | Mitigation |
|------|--------|------------|
| Prompt length exceeds context | Agent forgets instructions | Use structured sections, test token count |
| Voice sounds too robotic | Caller hang-up | A/B test stability/speed settings |
| Industry detection fails | Wrong pain statement | Default to generic B2B pain points |
| SMS tool fails | Lost conversion | Verbal fallback with spelled URL |
| Call direction variable missing | Wrong opening | Default to inbound-style greeting |

## Migration Plan

### Phase 1: Configuration Update
1. Update `sarah-agent-config.json` with new prompt
2. Update TTS settings (voice_id, stability, speed)
3. Deploy to ElevenLabs staging environment

### Phase 2: Testing
1. Execute test scenarios against staging
2. Validate voice quality checklist
3. Test SMS webhook integration

### Phase 3: Rollout
1. Deploy to production ElevenLabs agent
2. Monitor first 50 calls for pattern issues
3. Track conversion metrics (demo send rate, hang-up rate)

### Rollback
- Revert to previous `sarah-agent-config.json` version
- ElevenLabs agent update is atomic (full replacement)
- No database migrations required

## Open Questions

1. **A/B Testing Infrastructure**: How to run parallel versions for voice settings comparison?
2. **Analytics Integration**: Where should call metrics be stored for analysis?
3. **Dynamic Variables**: Should `call_direction` be populated by Twilio or ElevenLabs?
4. **Multi-Industry Support**: Should industry be pre-populated from lead list or always detected?
