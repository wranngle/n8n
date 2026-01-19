# Capability: ElevenLabs Testing Factory

## Purpose

Enable generation, upload, and execution of 1000+ voice agent tests that are **visible in the ElevenLabs portal dashboard**, providing comprehensive regression coverage and continuous quality monitoring.

---

## ADDED Requirements

### Requirement: Test Template System

The system SHALL support variable interpolation in templates for combinatorial test generation. Templates MUST use `{placeholder}` syntax for variable substitution.

#### Scenario: Industry variable expansion

```yaml
Given: A template with {industry} placeholder
And: 10 industry definitions in industries.yaml
When: The generator expands the template
Then: 10 test variants are created (one per industry)
And: Each test has industry-specific messaging
```

#### Scenario: Multi-variable cartesian product

```yaml
Given: A template with {industry} and {variant} placeholders
And: 10 industries and 5 variants defined
When: Using cartesian expansion strategy
Then: 50 test combinations are generated
And: Each combination has unique id suffix
```

#### Scenario: Template validation

```yaml
Given: A template with undefined variable {foo}
When: The generator attempts expansion
Then: Validation error is raised
And: Error message identifies the undefined variable
```

---

### Requirement: Batch Upload with Rate Limiting

The uploader SHALL handle ElevenLabs API rate limits gracefully. The system MUST implement exponential backoff on 429 responses.

#### Scenario: Successful batch upload

```yaml
Given: 100 generated test definitions
And: Valid ElevenLabs API key
When: Running upload command
Then: All 100 tests are uploaded
And: Progress is reported every 10 tests
And: Upload takes at least 15 seconds (rate limited)
```

#### Scenario: Rate limit 429 handling

```yaml
Given: API returns 429 Too Many Requests
When: Upload encounters rate limit
Then: Exponential backoff is applied
And: Retry occurs after delay
And: Max 3 retry attempts per test
```

#### Scenario: Partial failure recovery

```yaml
Given: 100 tests to upload
And: Tests 45-50 fail due to validation errors
When: Upload completes
Then: 94 tests are successfully uploaded
And: 6 failures are logged with error details
And: Failed tests can be retried separately
```

---

### Requirement: Execution Orchestration

The executor SHALL trigger test runs via the ElevenLabs API and MUST poll for completion. Results MUST be retrievable by invocation ID.

#### Scenario: Trigger test execution

```yaml
Given: 500 tests uploaded to agent
And: Agent ID agent_xxx
When: Running execute command
Then: POST /v1/convai/agents/{id}/run-tests is called
And: Invocation ID is returned
And: Invocation ID is stored for results retrieval
```

#### Scenario: Poll for completion

```yaml
Given: Test invocation in progress
When: Polling for results
Then: Status is checked every 5 seconds
And: Timeout after 10 minutes if not complete
And: Final results include all test outcomes
```

#### Scenario: Large-scale execution (1000+ tests)

```yaml
Given: 1000 tests uploaded
When: Executing all tests
Then: Tests are batched if needed
And: Progress is reported
And: Total execution completes within 60 minutes
```

---

### Requirement: Results Aggregation

The aggregator SHALL compute pass/fail statistics and MUST group results by category and priority. Failure reports MUST include test name and failure reason.

#### Scenario: Summary statistics

```yaml
Given: Invocation with 1000 test results
When: Aggregating results
Then: Total pass/fail counts are computed
And: Pass rate percentage is calculated
And: Results are grouped by category
And: Results are grouped by priority
```

#### Scenario: Failure analysis

```yaml
Given: 50 failed tests
When: Generating failure report
Then: Each failure includes test name
And: Each failure includes failure reason
And: Failures are sorted by priority (critical first)
And: Common failure patterns are identified
```

#### Scenario: Portal link generation

```yaml
Given: Aggregated results for agent_xxx
When: Generating report
Then: Dashboard URL is included in output
And: URL format is https://elevenlabs.io/app/agents/agents/{agent_id}?tab=tests
And: URL is printed to console for copy/paste
```

---

### Requirement: Test Definition Compliance

Generated tests MUST comply with the ElevenLabs API schema. The `chat_history` array MUST end with a user message. Test names SHALL be unique and MUST be under 100 characters.

#### Scenario: Chat history structure

```yaml
Given: A generated test definition
Then: chat_history is an array of role/message objects
And: Each entry has role (user|agent)
And: Each entry has message string
And: Each entry has time_in_call_secs integer
And: Final entry has role "user" (not agent)
```

#### Scenario: Test type assignment

```yaml
Given: A test that expects tool invocation
When: Generating test definition
Then: type is set to "tool"
And: Expected tool call is documented

Given: A test that checks LLM response quality
When: Generating test definition
Then: type is set to "llm"
```

#### Scenario: Name uniqueness

```yaml
Given: 1000 generated tests
Then: All test names are unique
And: Names include category and variant identifiers
And: Names are under 100 characters
```

---

### Requirement: CLI Interface

The factory SHALL provide a CLI with `generate`, `upload`, `execute`, and `run` subcommands. Each command MUST provide progress feedback and exit codes.

#### Scenario: Generate command

```yaml
Given: Command "node test-factory.js generate --count 1000"
Then: 1000 test definitions are created
And: Output is written to generated/tests-{timestamp}.json
And: Generation summary is printed to console
```

#### Scenario: Upload command

```yaml
Given: Command "node test-factory.js upload --input tests.json"
And: ELEVENLABS_API_KEY environment variable set
Then: Tests are uploaded to ElevenLabs
And: Upload progress is displayed
And: Upload summary shows success/failure counts
```

#### Scenario: Execute command

```yaml
Given: Command "node test-factory.js execute --agent-id agent_xxx"
Then: Test execution is triggered
And: Invocation ID is displayed
And: Command blocks until completion (or --async flag)
```

#### Scenario: Full pipeline command

```yaml
Given: Command "node test-factory.js run --count 1000 --agent-id agent_xxx"
Then: Generate, upload, execute run sequentially
And: Final results are aggregated and displayed
And: Portal URL is printed at completion
```

---

### Requirement: Existing Scenario Integration

The factory SHALL load existing `scenarios.yaml` files as template sources. The system MUST preserve original scenario IDs as prefixes in generated tests.

#### Scenario: Load Sarah scenarios

```yaml
Given: agents/sarah/tests/scenarios.yaml exists
And: Contains 25+ scenario definitions
When: Running generate with --source sarah
Then: Scenarios are loaded as base templates
And: Variables are extracted for expansion
And: Original scenario IDs are preserved as prefixes
```

#### Scenario: Merge multiple scenario files

```yaml
Given: Multiple scenario files (sarah, sewy, templates)
When: Running generate with --source all
Then: All scenarios are merged
And: Duplicates are deduplicated by ID
And: Source file is tracked per test
```

---

### Requirement: BMAD ATDD Integration

The factory SHALL integrate with BMAD testarch-atdd workflow when available. The factory MUST also operate standalone without BMAD dependency.

#### Scenario: BMAD workflow invocation

```yaml
Given: User runs "/bmad:bmm:workflows:testarch-atdd"
And: Project has voice agent configuration
When: ATDD workflow detects ElevenLabs agent
Then: Test factory is invoked for test generation
And: Native tests are uploaded automatically
And: Results are included in ATDD report
```

#### Scenario: Standalone operation

```yaml
Given: User runs test-factory.js directly
Then: Factory operates without BMAD dependency
And: All features work in standalone mode
And: No BMAD installation required
```

---

### Requirement: Cleanup and Maintenance

The factory SHALL provide cleanup commands for test lifecycle management. Destructive operations MUST prompt for user confirmation.

#### Scenario: Delete stale tests

```yaml
Given: Command "node test-factory.js cleanup --older-than 7d"
Then: Tests created more than 7 days ago are listed
And: User is prompted for confirmation
And: Confirmed tests are deleted via API
```

#### Scenario: Pre-upload cleanup

```yaml
Given: Command "node test-factory.js upload --clean-first"
Then: All existing tests for agent are deleted
And: New tests are uploaded fresh
And: Prevents test name collisions
```

---

## Dependencies

- `openspec/specs/voice-agent-sarah`: Sarah agent configuration
- `openspec/specs/voice-agent-testing`: Base test scenarios

## Related Capabilities

- `voice-agent-infrastructure`: Supersystem webhook integration
- `voice-agent-organization`: File structure conventions
