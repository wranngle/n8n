# Tasks: Refactor Voice AI Agents v3

## 1. OpenSpec Setup (Phase 1)

- [x] 1.1 Create `openspec/changes/refactor-voice-agents-v3/` directory structure
- [x] 1.2 Create `specs/` subdirectories for all 4 capabilities
- [x] 1.3 Write proposal.md (absorbs v2 + adds reorganization)
- [x] 1.4 Write design.md (voice agent architecture overview)

## 2. Spec Absorption from v2 (Phase 2)

- [x] 2.1 Copy voice-agent-sarah/spec.md from v2 (15 requirements)
- [x] 2.2 Copy voice-agent-testing/spec.md from v2 (12 requirements)
- [x] 2.3 Review and update any outdated requirements
- [x] 2.4 Validate absorbed specs match current production

## 3. New Specs - Infrastructure & Organization (Phase 3)

- [x] 3.1 Create voice-agent-infrastructure/spec.md (5 requirements)
- [x] 3.2 Create voice-agent-organization/spec.md (5 requirements)
- [x] 3.3 Add scenarios for each requirement
- [x] 3.4 Validate with `openspec validate refactor-voice-agents-v3 --strict`

## 4. Agent Configuration (Absorbed from v2)

- [x] 4.1 Update sarah-agent-config.json with v2.0 prompt
- [x] 4.2 Update TTS settings (voice_id: pFZP5JQG7iQjIQuC4Bku, stability: 0.55, speed: 0.95)
- [x] 4.3 Add ASR keywords for industry terms (HVAC, plumber, property management)
- [x] 4.4 Configure call_direction dynamic_variables handling
- [x] 4.5 Verify send_sms webhook configuration matches n8n endpoint

## 5. Lead Qualification Integration (Absorbed from v2)

- [x] 5.1 Create field mapping documentation: voice questions → intake schema paths
- [x] 5.2 Update send_sms webhook payload to include industry, company_name fields
- [x] 5.3 Document data flow: Sarah → n8n → unified_presales_report

## 6. Test Framework Implementation (Absorbed from v2)

- [x] 6.1 Create test scenario definitions in `agents/sarah/tests/`
- [x] 6.2 Implement cold call test scenarios (HVAC owner, property manager)
- [x] 6.3 Implement inbound call test scenarios (price shopper, warm lead)
- [x] 6.4 Implement objection handling test scenarios
- [x] 6.5 Implement emergency redirect test scenario
- [x] 6.6 Implement tool failure recovery test scenarios
- [ ] 6.7 Create voice quality checklist document

## 7. Validation & Staging (Absorbed from v2)

- [x] 7.1 Validate agent config JSON structure
- [x] 7.2 Deploy to ElevenLabs staging environment
- [x] 7.3 Execute full test suite against staging
- [x] 7.4 Verify SMS webhook integration end-to-end
- [ ] 7.5 Review voice quality using checklist

## 8. Documentation Updates (Absorbed from v2)

- [ ] 8.1 Update sarah-agent-tech-spec.md with implementation learnings
- [ ] 8.2 Create monitoring dashboard requirements document
- [ ] 8.3 Document A/B testing procedure for voice settings
- [ ] 8.4 Create post-launch monitoring runbook

## 9. Production Deployment (Absorbed from v2)

- [x] 9.1 Deploy to production ElevenLabs agent
- [x] 9.2 Activate production monitoring
- [ ] 9.3 Review first 50 calls for pattern issues
- [ ] 9.4 Track conversion metrics (demo send rate, hang-up rate)
- [ ] 9.5 Document lessons learned and iterate

## 10. File Reorganization (NEW)

- [x] 10.1 Create new directory structure: `agents/`, `pipelines/`, `docs/`, `old/`
- [x] 10.2 Move sarah files to `agents/sarah/`
  - sarah-agent-config.json → agents/sarah/config.json
  - sarah-agent-tech-spec.md → agents/sarah/tech-spec.md
  - SARAH-COMPLETE-SETUP.md → agents/sarah/SETUP.md
  - test-scenarios-sarah-v2.yaml → agents/sarah/tests/scenarios.yaml
- [x] 10.3 Extract system prompt from config to `agents/sarah/system-prompt.md`
- [x] 10.4 Move sewy-garage/ to `agents/sewy-garage/`
- [x] 10.5 Move workflow JSONs to `pipelines/`
  - elevenlabs-call-completed.json
  - elevenlabs-twilio-bulletproof.json
  - elevenlabs-twilio-client-data.json
  - pipedrive-lead-caller.json
- [x] 10.6 Move elevenlabs-twilio-voiceagent/ to `docs/`
- [x] 10.7 Archive legacy files to `old/`
  - sarah-merged-prompt.md
  - sarah-final-prompt-100pct.md
  - sarah-enhanced-prompt-v1.1.md
  - sarah-sms-tool.json
- [x] 10.8 Update agent-registry.yaml with new paths

## 11. Documentation (NEW)

- [x] 11.1 Create root README.md with directory index
- [ ] 11.2 Update governance.yaml if needed
- [ ] 11.3 Create post-launch monitoring runbook

## 12. Validation & Finalization

- [x] 12.1 Run `openspec validate refactor-voice-agents-v3 --strict`
- [x] 12.2 Verify supersystem tests still pass
- [x] 12.3 Confirm Sarah agent config loads correctly
- [x] 12.4 Archive original v2 proposal: `openspec archive update-sarah-agent-v2 --skip-specs --yes`
- [ ] 12.5 Git commit with comprehensive message
- [ ] 12.6 Document lessons learned

---

## Dependencies

- **4.x depends on**: 10.2 (files moved to new locations)
- **6.x depends on**: 10.2 (test scenarios in new location)
- **7.x depends on**: 4.x, 6.x completion
- **9.x depends on**: 7.x successful validation
- **12.4 depends on**: All other sections complete

## Parallelizable Work

- **Phases 1-3** (OpenSpec setup) can proceed independently
- **Phase 10** (file reorganization) can proceed after Phase 3 validation
- **Phases 4-9** can begin after Phase 10 completes
- **Phase 11** (documentation) can proceed in parallel with Phases 4-9
- **Phase 12** must be last

## Validation Criteria

Each task is complete when:
- [ ] Code/config changes committed to version control
- [ ] Relevant tests pass
- [ ] Documentation updated if applicable
- [ ] OpenSpec validation passes with `--strict` flag
