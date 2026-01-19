# Tasks: Update Sarah Voice Agent to v2.0

## 1. Agent Configuration Updates

- [ ] 1.1 Update `sarah-agent-config.json` prompt with v2.0 system prompt from tech spec
- [ ] 1.2 Update TTS settings (voice_id: pFZP5JQG7iQjIQuC4Bku, stability: 0.55, speed: 0.95)
- [ ] 1.3 Add ASR keywords for industry terms (HVAC, plumber, property management, etc.)
- [ ] 1.4 Configure dynamic_variables for call_direction handling
- [ ] 1.5 Verify send_sms webhook tool configuration matches n8n endpoint

## 2. Lead Qualification Integration

- [ ] 2.1 Create field mapping documentation: voice questions → intake schema paths
- [ ] 2.2 Update send_sms webhook payload to include industry, company_name fields
- [ ] 2.3 Document data flow from Sarah → n8n → unified_presales_report

## 3. Test Framework Implementation

- [ ] 3.1 Create test scenario definitions in `tests/evaluations/sarah-agent/`
- [ ] 3.2 Implement cold call test scenarios (HVAC owner, property manager)
- [ ] 3.3 Implement inbound call test scenarios (price shopper, warm lead)
- [ ] 3.4 Implement objection handling test scenarios
- [ ] 3.5 Implement emergency redirect test scenario
- [ ] 3.6 Implement tool failure recovery test scenarios
- [ ] 3.7 Create voice quality checklist document

## 4. Validation & Staging

- [ ] 4.1 Validate agent config JSON structure
- [ ] 4.2 Deploy to ElevenLabs staging environment
- [ ] 4.3 Execute full test suite against staging
- [ ] 4.4 Verify SMS webhook integration end-to-end
- [ ] 4.5 Review voice quality using checklist

## 5. Documentation Updates

- [ ] 5.1 Update `sarah-agent-tech-spec.md` with any implementation learnings
- [ ] 5.2 Create monitoring dashboard requirements document
- [ ] 5.3 Document A/B testing procedure for voice settings
- [ ] 5.4 Create post-launch monitoring runbook

## 6. Production Deployment

- [ ] 6.1 Deploy to production ElevenLabs agent
- [ ] 6.2 Activate production monitoring
- [ ] 6.3 Review first 50 calls for pattern issues
- [ ] 6.4 Track conversion metrics (demo send rate, hang-up rate)
- [ ] 6.5 Document lessons learned and iterate

## Dependencies

- **1.5 depends on**: n8n webhook `send-sms` endpoint availability
- **2.3 depends on**: unified_presales_report schema finalization
- **4.2 depends on**: 1.1-1.5 completion
- **6.1 depends on**: 4.1-4.5 successful validation

## Parallelizable Work

- **1.x** and **3.x** can proceed in parallel
- **2.x** can proceed once 1.1 establishes field mapping
- **5.x** can begin after 1.x completes

## Validation Criteria

Each task is complete when:
- [ ] Code/config changes committed to version control
- [ ] Relevant tests pass
- [ ] Documentation updated if applicable
- [ ] Peer review completed for critical changes (1.1, 6.1)
