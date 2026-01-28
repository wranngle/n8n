# Change: Establish ElevenLabs Testing Factory

## Why

**The Problem:** Current testing approach is fragmented across 3+ systems with no unified pipeline to generate and execute 1000+ tests visible in the ElevenLabs portal dashboard.

**Current State Analysis:**
| System | Purpose | Status | Portal Visible |
|--------|---------|--------|----------------|
| `upload-native-tests.js` | Manual 10 test upload | Working | ✅ Yes |
| `run-simulations.js` | Supersystem integration tests | Working | ❌ No (API only) |
| `layer7-elevenlabs-tests.js` | Scenario → Native converter | Exists | ✅ Yes (partial) |
| `scenarios.yaml` (Sarah) | 25+ scenarios | Complete | ❌ Source only |
| BMAD `testarch-atdd` | ATDD workflow | Not integrated | ❌ N/A |

**Pain Points:**
1. **No Scale:** Manual test creation caps at ~10-30 tests
2. **No Portal Visibility:** 95% of tests run via simulate-conversation API (invisible)
3. **No Factory Pattern:** Each test manually crafted, no generative expansion
4. **BMAD ATDD Disconnected:** Existing ATDD workflow doesn't connect to ElevenLabs native testing
5. **No Variant Generation:** Industry variants, objection variants, edge cases not automated

**Desired Outcome:** Run `node test-factory.js --generate 1000 --upload --execute` and see 1000+ test results in `https://elevenlabs.io/app/agents/{agent_id}?tab=tests`

## What Changes

### Core Factory Engine
- **ADDED** Test scenario generator with combinatorial expansion
- **ADDED** YAML schema → ElevenLabs native test converter
- **ADDED** Batch upload with rate limiting and progress tracking
- **ADDED** Execution orchestrator for 1000+ tests
- **ADDED** Results aggregator with pass/fail metrics

### Integration Points
- **INTEGRATED** BMAD ATDD workflow hooks for test generation
- **INTEGRATED** Existing scenarios.yaml as base templates
- **INTEGRATED** supersystem evaluation criteria schemas

### New Capabilities

| Capability | Description |
|------------|-------------|
| **Template Expansion** | 25 base scenarios × 10 industries × 5 variants = 1,250 tests |
| **Combinatorial Generation** | Auto-generate objection + discovery + close combinations |
| **Native API Upload** | Batch POST to `/v1/convai/agent-testing/create` |
| **Execution Orchestration** | POST to `/v1/convai/agents/{id}/run-tests` with batching |
| **Portal Sync** | GET invocation results, aggregate, report |

## Impact

- **Affected systems:** ElevenLabs native testing, supersystem, BMAD workflows
- **Affected files:** `workflows/voice_ai_agents/supersystem/tests/`
- **New files:** `test-factory.js`, `test-generators/`, `test-templates/`
- **API usage:** ~1000-2000 API calls per full test run (rate limited)

## Risk Assessment

| Risk | Level | Mitigation |
|------|-------|------------|
| Rate limiting at scale | High | Exponential backoff, batch delays, queue |
| Test name collisions | Medium | UUID suffixes, cleanup before upload |
| API cost at 1000+ tests | Medium | Estimate quota before run, user confirmation |
| Combinatorial explosion | Low | Configurable limits, sampling modes |

## Success Criteria

1. Run `test-factory.js --generate 1000` → 1000+ test definitions created
2. Run `test-factory.js --upload` → Tests visible in ElevenLabs dashboard
3. Run `test-factory.js --execute` → Test invocation triggered
4. View `https://elevenlabs.io/app/agents/{agent_id}?tab=tests` → See results with pass/fail
5. BMAD ATDD integration → `/bmad:bmm:workflows:testarch-atdd` generates ElevenLabs tests

## Relationship to BMAD ATDD

The BMAD `testarch-atdd` workflow is designed for code-level acceptance tests. This factory **extends** that pattern to voice agent testing:

| BMAD ATDD Concept | ElevenLabs Factory Equivalent |
|-------------------|-------------------------------|
| Feature files (Gherkin) | `scenarios.yaml` templates |
| Step definitions | ElevenLabs `evaluation_criteria` |
| Test runner | `run-tests` API invocation |
| RED phase | Upload tests, expect failures |
| GREEN phase | Update prompt, tests pass |
| Artifacts | Dashboard visible results |

The factory can be invoked via BMAD workflow or standalone CLI.
