# Capability: Voice Agent Infrastructure

## ADDED Requirements

### Requirement: Post-Call Webhook Pipeline

The voice agent infrastructure SHALL process ElevenLabs call completion events through n8n workflows.

#### Scenario: Call completion webhook trigger
- **WHEN** ElevenLabs sends call completion webhook
- **THEN** n8n workflow SHALL receive the payload within 5 seconds
- **AND** workflow SHALL extract conversation_id, agent_id, call_duration, and transcript

#### Scenario: Webhook authentication
- **WHEN** webhook request is received
- **THEN** system SHALL validate request origin from ElevenLabs
- **AND** system SHALL reject unauthenticated requests

#### Scenario: Retry on failure
- **WHEN** webhook processing fails
- **THEN** message SHALL be routed to dead-letter queue
- **AND** system SHALL attempt reprocessing up to 3 times

---

### Requirement: SMS Delivery Integration

The voice agent infrastructure SHALL send SMS messages via Twilio through n8n webhooks.

#### Scenario: SMS send request
- **WHEN** voice agent invokes `send_sms` tool
- **THEN** n8n webhook SHALL receive recipient phone and message body
- **AND** webhook SHALL invoke Twilio API to deliver SMS
- **AND** webhook SHALL return success/failure status to agent

#### Scenario: SMS delivery confirmation
- **WHEN** Twilio confirms delivery
- **THEN** system SHALL log delivery timestamp
- **AND** system SHALL update lead record with SMS sent status

#### Scenario: SMS failure handling
- **WHEN** Twilio returns error
- **THEN** system SHALL return meaningful error to agent
- **AND** system SHALL log failure reason for debugging

---

### Requirement: Transcript Extraction Pipeline

The voice agent infrastructure SHALL extract structured data from voice transcripts using LLM analysis.

#### Scenario: Transcript fetch
- **WHEN** post-call pipeline triggers
- **THEN** system SHALL fetch full transcript from ElevenLabs API
- **AND** system SHALL include both agent and caller utterances

#### Scenario: Field extraction
- **WHEN** transcript is fetched
- **THEN** system SHALL invoke Gemini LLM with extraction prompt
- **AND** system SHALL extract: contact_name, company_name, industry, volume, current_solution, objections_raised, demo_sent

#### Scenario: Extraction output format
- **WHEN** extraction completes
- **THEN** output SHALL be JSON-formatted
- **AND** output SHALL include confidence scores for extracted fields
- **AND** output SHALL flag uncertain extractions for human review

---

### Requirement: CRM Integration (Pipedrive)

The voice agent infrastructure SHALL synchronize lead data with Pipedrive CRM.

#### Scenario: Lead creation
- **WHEN** new lead is qualified by voice agent
- **THEN** system SHALL create Person in Pipedrive with contact info
- **AND** system SHALL create Deal with extracted qualification data
- **AND** system SHALL link Deal to Person

#### Scenario: Lead update
- **WHEN** existing lead has additional call
- **THEN** system SHALL update Deal with new information
- **AND** system SHALL append call notes to Deal activity log

#### Scenario: Deduplication
- **WHEN** lead already exists in Pipedrive
- **THEN** system SHALL match by phone number
- **AND** system SHALL update existing record rather than create duplicate

---

### Requirement: Supersystem Evaluation Framework

The voice agent infrastructure SHALL include autonomous evaluation and improvement capabilities.

#### Scenario: Test execution
- **WHEN** supersystem evaluation is triggered
- **THEN** system SHALL execute test scenarios against voice agent
- **AND** system SHALL collect pass/fail results for each test point

#### Scenario: Baseline comparison
- **WHEN** test results are collected
- **THEN** system SHALL compare against baseline metrics
- **AND** system SHALL flag regressions exceeding threshold

#### Scenario: Improvement suggestions
- **WHEN** patterns of failures are detected
- **THEN** system SHALL generate prompt modification suggestions
- **AND** system SHALL route suggestions through approval workflow

#### Scenario: Layer architecture
- **WHEN** supersystem is configured
- **THEN** system SHALL implement 6-layer autonomous architecture:
  - Layer 1: ElevenLabs Agent Auto-Modifier
  - Layer 2: n8n Workflow Auto-Corrector
  - Layer 3: Data Layer Management
  - Layer 4: Gemini LLM Brain
  - Layer 5: Claude Code Auto-Commit
  - Layer 6: Deep Research Engine
