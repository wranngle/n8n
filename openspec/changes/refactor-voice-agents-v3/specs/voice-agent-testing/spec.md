# Capability: Voice Agent Testing Framework

## ADDED Requirements

### Requirement: Cold Call Test Scenarios

The voice agent testing framework SHALL include scenarios for outbound cold call validation.

#### Scenario: HVAC owner cold call
- **WHEN** test scenario "Cold Call - HVAC Owner" is executed
- **THEN** test SHALL verify agent doesn't say "How can I help you?"
- **AND** test SHALL verify value proposition delivered in first 10 seconds
- **AND** test SHALL verify industry-specific pain point mentioned
- **AND** test SHALL verify demo offered within 60 seconds

#### Scenario: Property manager cold call
- **WHEN** test scenario "Cold Call - Property Manager" is executed
- **THEN** test SHALL verify outbound-appropriate opening
- **AND** test SHALL verify tenant emergency/routine differentiation mentioned
- **AND** test SHALL verify pricing qualified before delivery

#### Scenario: Call direction variable handling
- **WHEN** test scenario validates call_direction handling
- **THEN** test SHALL verify outbound behavior when variable is "out" or "outbound"
- **AND** test SHALL verify inbound behavior when variable is "in" or "inbound"
- **AND** test SHALL verify fallback behavior when variable is missing

---

### Requirement: Inbound Call Test Scenarios

The voice agent testing framework SHALL include scenarios for inbound call validation.

#### Scenario: Price shopper inbound
- **WHEN** test scenario "Inbound - Price Shopper" is executed
- **THEN** test SHALL verify agent qualifies before giving price
- **AND** test SHALL verify positioning against answering services
- **AND** test SHALL verify push to demo not just pricing

#### Scenario: Warm lead inbound
- **WHEN** test scenario "Inbound - Warm Lead" is executed
- **THEN** test SHALL verify discovery questions are asked
- **AND** test SHALL verify data collection sequence followed
- **AND** test SHALL verify recap provided before closing

---

### Requirement: Objection Handling Test Scenarios

The voice agent testing framework SHALL validate objection response quality.

#### Scenario: Answering service objection test
- **WHEN** test scenario "Objection - Already Have Service" is executed
- **THEN** test SHALL verify acknowledgment of current solution
- **AND** test SHALL verify pain probe about current service
- **AND** test SHALL verify differentiation on triage capability

#### Scenario: Price objection test
- **WHEN** test scenario "Objection - Too Expensive" is executed
- **THEN** test SHALL verify comparison question asked
- **AND** test SHALL verify reframe against answering service costs
- **AND** test SHALL verify no discounting or negotiation

#### Scenario: Not interested objection test
- **WHEN** test scenario "Objection - Not Interested" is executed
- **THEN** test SHALL verify clarifying question asked
- **AND** test SHALL verify graceful qualify-out if confirmed
- **AND** test SHALL verify no pushy follow-up

---

### Requirement: Emergency Redirect Test Scenarios

The voice agent testing framework SHALL validate safety protocol compliance.

#### Scenario: Active emergency redirect
- **WHEN** test scenario "Emergency Redirect" is executed
- **THEN** test SHALL verify immediate 911 instruction
- **AND** test SHALL verify end_call tool invocation
- **AND** test SHALL verify no continued sales conversation

#### Scenario: Emergency keyword detection
- **WHEN** test validates emergency detection
- **THEN** test SHALL verify detection of: "fire", "flood", "gas leak", "medical emergency", "someone is hurt"
- **AND** test SHALL verify false positives avoided for metaphorical usage

---

### Requirement: Tool Failure Test Scenarios

The voice agent testing framework SHALL validate graceful degradation.

#### Scenario: SMS tool failure recovery
- **WHEN** test scenario "Tool Failure - SMS" is executed
- **THEN** test SHALL verify retry attempt on first failure
- **AND** test SHALL verify verbal URL fallback on second failure
- **AND** test SHALL verify no error codes or "None" verbalized

#### Scenario: Tool output sanitization
- **WHEN** test validates tool output handling
- **THEN** test SHALL verify "null", "undefined", "None" never spoken
- **AND** test SHALL verify graceful language substitution

---

### Requirement: Voice Quality Checklist

The voice agent testing framework SHALL include voice quality validation criteria.

#### Scenario: Voice quality baseline
- **WHEN** voice quality checklist is applied
- **THEN** checklist SHALL verify voice sounds professional, not robotic
- **AND** checklist SHALL verify pace feels natural, not rushed
- **AND** checklist SHALL verify no awkward pauses at conversation start

#### Scenario: Voice quality technical
- **WHEN** voice quality checklist validates TTS
- **THEN** checklist SHALL verify tool failures handled gracefully
- **AND** checklist SHALL verify industry terms pronounced correctly
- **AND** checklist SHALL verify numbers (pricing) spoken clearly
- **AND** checklist SHALL verify SMS confirmation sounds natural

---

### Requirement: Lead Qualification Test Scenarios

The voice agent testing framework SHALL validate data collection accuracy.

#### Scenario: Data collection completeness
- **WHEN** test scenario validates lead qualification
- **THEN** test SHALL verify industry captured or inferred
- **AND** test SHALL verify volume collected with time period
- **AND** test SHALL verify current solution documented
- **AND** test SHALL verify contact name collected before SMS

#### Scenario: Schema field mapping
- **WHEN** test validates intake schema integration
- **THEN** test SHALL verify volume maps to `q06_runs_per_period`
- **AND** test SHALL verify current solution maps to `q13_common_failures`
- **AND** test SHALL verify decision maker maps to `decision_maker` field

---

### Requirement: Conversation Flow Test Scenarios

The voice agent testing framework SHALL validate conversation structure.

#### Scenario: Phase progression validation
- **WHEN** test validates conversation flow
- **THEN** test SHALL verify HOOK phase completes in <15 seconds
- **AND** test SHALL verify DISCOVERY phase uses exactly 3 questions
- **AND** test SHALL verify PAIN AGITATION matches industry
- **AND** test SHALL verify DEMO CLOSE is reached

#### Scenario: Word economy validation
- **WHEN** test validates response length
- **THEN** test SHALL flag responses exceeding 50 words
- **AND** test SHALL verify one question per turn rule

---

### Requirement: Post-Launch Monitoring Metrics

The voice agent testing framework SHALL define production monitoring criteria.

#### Scenario: Call success metrics
- **WHEN** production monitoring is active
- **THEN** metrics SHALL track hang-up rate in first 10 seconds
- **AND** metrics SHALL track demo link send success rate
- **AND** metrics SHALL track average call duration
- **AND** metrics SHALL track conversion to demo completion

#### Scenario: Quality monitoring
- **WHEN** production monitoring reviews calls
- **THEN** review SHALL assess first 50 calls for pattern issues
- **AND** review SHALL collect caller feedback
- **AND** review SHALL identify objection response effectiveness
- **AND** review SHALL flag emergency redirect activations

---

### Requirement: Test Scenario Structure

The voice agent testing framework SHALL use consistent scenario definition format.

#### Scenario: Test scenario metadata
- **WHEN** test scenario is defined
- **THEN** scenario SHALL include: name, direction (inbound/outbound), persona description
- **AND** scenario SHALL include: test_points array with specific assertions
- **AND** scenario SHALL include: expected_outcome classification

#### Scenario: Test result format
- **WHEN** test scenario completes
- **THEN** result SHALL include: pass/fail status per test_point
- **AND** result SHALL include: actual agent response excerpts
- **AND** result SHALL include: timing measurements where applicable

---

### Requirement: Regression Test Suite

The voice agent testing framework SHALL support regression testing during prompt iterations.

#### Scenario: Regression baseline establishment
- **WHEN** new agent version is deployed
- **THEN** full test suite SHALL execute against staging
- **AND** results SHALL compare against previous version baseline
- **AND** regressions SHALL be flagged with specific test_point failures

#### Scenario: A/B test support
- **WHEN** voice settings A/B testing is conducted
- **THEN** test framework SHALL support parallel execution
- **AND** results SHALL be tagged with variant identifier
- **AND** statistical comparison SHALL be possible between variants
