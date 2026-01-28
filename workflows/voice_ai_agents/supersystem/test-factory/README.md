# ElevenLabs Testing Factory

**Generate, upload, and execute 1000+ voice agent tests visible in the ElevenLabs portal dashboard.**

## Overview

The Testing Factory is a CLI tool that:
1. **Generates** test scenarios from YAML templates using combinatorial expansion
2. **Uploads** tests to ElevenLabs Native Testing API in batches
3. **Executes** tests and polls for completion
4. **Aggregates** results with category/priority breakdowns

All tests appear in the [ElevenLabs portal](https://elevenlabs.io/app/agents) under the Tests tab.

## Quick Start

```bash
# Generate 1000 tests
node test-factory.js generate --count 1000

# Upload with cleanup (deletes existing tests first)
node test-factory.js upload --clean-first

# Execute tests
node test-factory.js execute

# Full pipeline (generate + upload + execute + report)
node test-factory.js run --count 1000 --agent-id agent_xxx
```

## Commands

| Command | Description |
|---------|-------------|
| `generate` | Generate test definitions from templates |
| `upload` | Upload tests to ElevenLabs |
| `execute` | Trigger test execution |
| `run` | Full pipeline (generate + upload + execute + report) |
| `report` | Aggregate and display results |
| `cleanup` | Delete all tests for agent |
| `list` | List existing tests |

## Options

| Option | Alias | Description | Default |
|--------|-------|-------------|---------|
| `--count` | `-n` | Number of tests to generate | 100 |
| `--strategy` | `-s` | Expansion strategy: `cartesian`, `pairwise`, `sampling` | cartesian |
| `--agent-id` | `-a` | Target ElevenLabs agent ID | auto |
| `--input` | `-i` | Input file for upload | tests-latest.json |
| `--output` | `-o` | Output directory | ./generated |
| `--clean-first` | | Delete existing tests before upload | false |
| `--async` | | Don't wait for execution to complete | false |
| `--verbose` | `-v` | Show detailed output | false |
| `--invocation-id` | | Invocation ID for report | latest |
| `--no-skip-duplicates` | | Upload even if test name exists | false |

## Template System

### Directory Structure

```
templates/
├── base-scenarios.yaml    # Test scenario templates
├── industries.yaml        # Industry definitions (12 industries)
└── variants.yaml          # Response variants (demo, objection, personality, edge cases)
```

### Template Syntax

Templates use `{placeholder}` syntax for variable interpolation:

```yaml
- id: outbound-greeting-{industry}
  name: "Outbound Greeting - {industry_name}"
  type: llm
  category: call_direction
  priority: critical
  expand_with:
    - industries
  chat_history:
    - role: user
      message: "Hello?"
  success_condition: "Agent identifies as Sarah from Wranngle"
```

### Expansion Strategies

| Strategy | Description | Use Case |
|----------|-------------|----------|
| `cartesian` | All variable combinations | Maximum coverage |
| `pairwise` | All 2-way combinations | Reduced test count |
| `sampling` | Random subset of cartesian | Quick validation |

### Variables

**Industries** (12):
- HVAC, Plumbing, Electrical, Property Management
- Roofing, Pest Control, Landscaping, Garage Door
- Locksmith, Pool Service, Appliance Repair, General Contractor

**Variants**:
- `demo_close_variants`: eager, hesitant, skeptical, busy, declined
- `objection_variants`: answering_service, too_expensive, too_small, tech_skeptic, competitor
- `personality_variants`: brief, talkative, technical, rushed, friendly
- `edge_case_variants`: wrong_number, competitor_employee, prank_call, non_english, angry

## API Client

The factory uses the ElevenLabs Native Testing API:

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/v1/convai/agent-testing/create` | POST | Create test |
| `/v1/convai/agent-testing` | GET | List tests |
| `/v1/convai/agent-testing/{id}` | DELETE | Delete test |
| `/v1/convai/agents/{id}/run-tests` | POST | Execute tests |
| `/v1/convai/test-invocations/{id}` | GET | Get results |

### Rate Limiting

The client implements:
- Exponential backoff on 429 (rate limit) responses
- Configurable delays between tests (500ms) and batches (2s)
- Max 3 retries per request

## Configuration

### Environment

API key is loaded from `~/.claude/.env` (governance compliant):

```
ELEVENLABS_API_KEY=your_key_here
```

### Default Agent

The default agent ID is configured in `lib/api-client.js`:

```javascript
const CONFIG = {
  DEFAULT_AGENT_ID: 'agent_8001kdgp7qbyf4wvhs540be78vew',
  // ...
};
```

## Generated Files

| File | Description |
|------|-------------|
| `generated/tests-{timestamp}.json` | Timestamped test definitions |
| `generated/tests-latest.json` | Latest generated tests |
| `generated/test-ids-latest.json` | Test IDs after upload |
| `generated/invocation-latest.json` | Latest execution results |
| `generated/report-{timestamp}.json` | JSON report |

## Test Categories

| Category | Description |
|----------|-------------|
| `call_direction` | Inbound vs outbound awareness |
| `discovery` | Lead qualification questions |
| `pain_agitation` | Industry-specific pain points |
| `demo_close` | Demo offer responses |
| `objection_handling` | Objection responses |
| `forbidden_language` | Technical jargon avoidance |
| `pricing` | Price qualification gate |
| `emergency` | 911 redirect scenarios |
| `sms_consent` | SMS tool usage |
| `closing` | Call closure handling |
| `conversation_style` | Personality adaptation |
| `edge_cases` | Unusual scenarios |
| `combined_flow` | Multi-stage conversations |
| `value_proposition` | Concise value delivery |
| `tool_use` | Tool invocation tests |
| `word_economy` | Response brevity |
| `lead_qualification` | Data collection |

## Example Output

### Generation Summary

```
Generation Summary:
  Total: 1289
  By Category: {"call_direction":13,"discovery":74,...}
  By Priority: {"critical":1250,"high":38,"medium":1}
  By Type: {"llm":857,"tool":432}
```

### Upload Progress

```
[████████░░░░░░░░░░░░] 40.0% | 515/1289 | ETA: 778s | Rate: 0.99/s
```

### Report

```
═══════════════════════════════════════════════════════
  TEST EXECUTION RESULTS
═══════════════════════════════════════════════════════

┌─────────────────────────────────┐
│         SUMMARY                 │
├─────────────────────────────────┤
│  Total Tests:           1289    │
│  Passed:                1245    │
│  Failed:                  44    │
│  Pass Rate:            96.6%    │
└─────────────────────────────────┘
```

## Troubleshooting

### "ELEVENLABS_API_KEY not found"

Ensure your API key is in `~/.claude/.env`:
```
ELEVENLABS_API_KEY=sk_...
```

### "Rate limited, retrying..."

Normal behavior. The client automatically backs off and retries.

### Tests not appearing in portal

1. Check upload completed successfully
2. Verify agent ID is correct
3. Refresh the portal page

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    test-factory.js                       │
│                    (CLI entrypoint)                      │
├─────────────────────────────────────────────────────────┤
│  generator.js  │  uploader.js  │  executor.js  │ aggregator.js │
│  (templates)   │  (batch)      │  (polling)    │  (reports)    │
├─────────────────────────────────────────────────────────┤
│                    api-client.js                         │
│           (ElevenLabs Native Testing API)                │
└─────────────────────────────────────────────────────────┘
```

## License

Internal use only.
