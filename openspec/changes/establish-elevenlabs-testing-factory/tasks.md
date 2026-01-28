# Tasks: Establish ElevenLabs Testing Factory

## Phase 1: Foundation (Parallel)

### 1.1 Create test-factory directory structure
- [ ] Create `workflows/voice_ai_agents/supersystem/test-factory/`
- [ ] Create subdirectories: `lib/`, `templates/`, `generated/`
- [ ] Add `.gitkeep` to `generated/`
- **Validation:** `ls` shows expected structure

### 1.2 Create API client wrapper
- [ ] Create `lib/api-client.js`
- [ ] Implement `createTest()` with rate limiting
- [ ] Implement `listTests()` for existing tests
- [ ] Implement `deleteTest()` for cleanup
- [ ] Implement `runTests()` for execution
- [ ] Implement `getInvocation()` for results
- [ ] Add exponential backoff retry logic
- [ ] Load API key from `~/.claude/.env` (governance compliant)
- **Validation:** Unit test each endpoint against live API

### 1.3 Extract templates from existing scenarios
- [ ] Parse `agents/sarah/tests/scenarios.yaml`
- [ ] Convert scenarios to template format
- [ ] Extract variable patterns (industries, variants)
- [ ] Create `templates/base-scenarios.yaml`
- **Validation:** Original scenarios reproducible from templates

---

## Phase 2: Generator Engine

### 2.1 Create generator module
- [ ] Create `lib/generator.js`
- [ ] Implement template loading from YAML
- [ ] Implement variable interpolation `{placeholder}` → value
- [ ] Implement cartesian expansion strategy
- [ ] Implement pairwise expansion strategy
- [ ] Implement sampling expansion strategy
- [ ] Add unique ID generation (UUID suffix)
- [ ] Add deduplication by content hash
- **Validation:** Generate 100 tests, verify uniqueness

### 2.2 Create variable definition files
- [ ] Create `templates/industries.yaml` (10+ industries)
  - HVAC, Plumbing, Electrical, Property Management, Roofing
  - Pest Control, Landscaping, Garage Door, Locksmith, Pool Service
- [ ] Create `templates/variants.yaml` (5+ response variants)
  - Eager, Hesitant, Skeptical, Rushed, Technical
- [ ] Create `templates/edge-cases.yaml`
  - Invalid phone numbers, profanity, silence, interruptions
- **Validation:** Variables load without errors

### 2.3 Implement test definition schema compliance
- [ ] Ensure `chat_history` ends with user message
- [ ] Validate `type` is "llm" or "tool"
- [ ] Enforce name length < 100 chars
- [ ] Add `time_in_call_secs` to all entries
- [ ] Include `success_condition`, `success_examples`, `failure_examples`
- **Validation:** Generated tests pass API validation

---

## Phase 3: Upload Pipeline

### 3.1 Create uploader module
- [ ] Create `lib/uploader.js`
- [ ] Implement batch upload with configurable batch size
- [ ] Add progress reporting (completed/total)
- [ ] Handle 429 rate limits with exponential backoff
- [ ] Implement partial failure tracking
- [ ] Save uploaded test IDs for execution
- **Validation:** Upload 50 tests, verify in portal

### 3.2 Implement cleanup functionality
- [ ] Add `deleteAllTests(agentId)` for fresh start
- [ ] Add `deleteOlderThan(agentId, days)` for maintenance
- [ ] Add confirmation prompts for destructive operations
- **Validation:** Delete tests, verify removal from portal

---

## Phase 4: Execution & Results

### 4.1 Create executor module
- [ ] Create `lib/executor.js`
- [ ] Implement `triggerExecution(agentId)`
- [ ] Implement `pollUntilComplete(invocationId, timeout)`
- [ ] Add timeout handling (default 10 minutes)
- [ ] Store invocation ID for later retrieval
- **Validation:** Execute 50 tests, retrieve results

### 4.2 Create aggregator module
- [ ] Create `lib/aggregator.js`
- [ ] Compute pass/fail counts
- [ ] Group results by category
- [ ] Group results by priority
- [ ] Extract failure reasons
- [ ] Generate portal URL
- **Validation:** Aggregated report matches portal view

### 4.3 Create report formatter
- [ ] Console summary output (ASCII table)
- [ ] JSON output for CI/CD integration
- [ ] HTML report (optional, stretch goal)
- [ ] Include timestamp and agent ID in reports
- **Validation:** Report readable and accurate

---

## Phase 5: CLI Integration

### 5.1 Create main CLI entrypoint
- [ ] Create `test-factory.js` with commander.js (or native args)
- [ ] Implement `generate` subcommand
- [ ] Implement `upload` subcommand
- [ ] Implement `execute` subcommand
- [ ] Implement `report` subcommand
- [ ] Implement `run` subcommand (full pipeline)
- [ ] Implement `cleanup` subcommand
- **Validation:** `node test-factory.js --help` shows all commands

### 5.2 Add command options
- [ ] `--count <n>` - Number of tests to generate
- [ ] `--strategy <cartesian|pairwise|sampling>` - Expansion strategy
- [ ] `--agent-id <id>` - Target agent
- [ ] `--input <file>` - Input file for upload
- [ ] `--output <dir>` - Output directory for generated tests
- [ ] `--clean-first` - Delete existing tests before upload
- [ ] `--async` - Don't wait for execution completion
- [ ] `--open-portal` - Open dashboard URL after report
- **Validation:** Each option works as documented

---

## Phase 6: Scale Testing

### 6.1 Generate and upload 1000+ tests
- [ ] Run `node test-factory.js generate --count 1000`
- [ ] Verify 1000 unique test definitions created
- [ ] Run `node test-factory.js upload --clean-first`
- [ ] Monitor upload progress and timing
- [ ] Verify all tests visible in portal
- **Validation:** Portal shows 1000+ tests

### 6.2 Execute 1000+ tests
- [ ] Run `node test-factory.js execute`
- [ ] Monitor execution progress
- [ ] Time the full execution
- [ ] Retrieve and aggregate results
- **Validation:** Results visible in portal with pass/fail

### 6.3 Generate final report
- [ ] Run `node test-factory.js report --invocation-id <id>`
- [ ] Verify summary statistics
- [ ] Review failure analysis
- [ ] Print portal URL
- **Validation:** User can view results in ElevenLabs dashboard

---

## Phase 7: Documentation & Integration

### 7.1 Create README
- [ ] Document installation requirements
- [ ] Document environment variables
- [ ] Document all CLI commands
- [ ] Include example workflows
- [ ] Document API rate limits and timing expectations
- **Validation:** New user can run factory from README alone

### 7.2 BMAD integration (optional)
- [ ] Create hook for testarch-atdd workflow detection
- [ ] Auto-invoke factory when voice agent detected
- [ ] Include results in ATDD report output
- **Validation:** BMAD workflow triggers factory

---

## Summary

| Phase | Tasks | Parallelizable |
|-------|-------|----------------|
| 1. Foundation | 3 | ✅ Yes (1.1, 1.2, 1.3) |
| 2. Generator | 3 | ✅ Yes (2.2 parallel with 2.1) |
| 3. Upload | 2 | Partially |
| 4. Execution | 3 | Sequential |
| 5. CLI | 2 | Partially |
| 6. Scale | 3 | Sequential |
| 7. Docs | 2 | ✅ Yes |
| **Total** | **18** | |

**Estimated effort:** 4-6 hours focused implementation

**Critical path:** 1.2 → 2.1 → 3.1 → 4.1 → 5.1 → 6.1
