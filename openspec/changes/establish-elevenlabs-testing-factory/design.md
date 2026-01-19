# Design: ElevenLabs Testing Factory

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                    ElevenLabs Testing Factory                       │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐ │
│  │  Test Templates │───▶│  Generator      │───▶│  Test Specs     │ │
│  │  (scenarios.yaml)    │  Engine         │    │  (1000+ JSON)   │ │
│  └─────────────────┘    └─────────────────┘    └─────────────────┘ │
│                                                         │           │
│                                                         ▼           │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐ │
│  │  ElevenLabs     │◀───│  Uploader       │◀───│  Rate Limiter   │ │
│  │  Dashboard      │    │  (batch POST)   │    │  Queue          │ │
│  └─────────────────┘    └─────────────────┘    └─────────────────┘ │
│          │                                                          │
│          ▼                                                          │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐ │
│  │  Test Results   │───▶│  Aggregator     │───▶│  Reports        │ │
│  │  (invocations)  │    │                 │    │  (JSON/HTML)    │ │
│  └─────────────────┘    └─────────────────┘    └─────────────────┘ │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

## Component Design

### 1. Template Schema (Source of Truth)

```yaml
# Base template structure
template:
  id: "demo-close-{industry}-{variant}"
  name: "Demo Close - {industry_name} - {variant_name}"
  type: "tool"  # or "llm"
  category: "demo_close"
  priority: "critical"

  # Chat history with placeholders
  chat_history:
    - role: "user"
      message: "{industry_greeting}"
    - role: "agent"
      message: "{agent_offer}"
    - role: "user"
      message: "{user_response}"

  # Success/failure criteria
  success_condition: "{success_template}"
  success_examples:
    - response: "{success_example}"
      type: "success"
  failure_examples:
    - response: "{failure_example}"
      type: "failure"

  # Expansion variables
  variables:
    industry:
      - { id: "hvac", name: "HVAC", greeting: "I run an HVAC company..." }
      - { id: "plumbing", name: "Plumbing", greeting: "I'm a plumber..." }
      - { id: "property", name: "Property Management", greeting: "I manage properties..." }
      # ... 10+ industries
    variant:
      - { id: "eager", name: "Eager Yes", response: "Yes! Send it right now!" }
      - { id: "hesitant", name: "Hesitant Maybe", response: "Hmm, I'm not sure..." }
      - { id: "skeptical", name: "Skeptical", response: "Why do you need my number?" }
```

### 2. Generator Engine

```javascript
// Expansion strategies
const EXPANSION_STRATEGIES = {
  // Full cartesian product: templates × industries × variants
  cartesian: (templates, variables) => {
    // 25 templates × 10 industries × 5 variants = 1,250 tests
  },

  // Latin hypercube sampling for larger spaces
  sampling: (templates, variables, sampleSize) => {
    // Statistically representative subset
  },

  // Pairwise combinatorial (covers all pairs)
  pairwise: (templates, variables) => {
    // Covers all 2-way interactions efficiently
  }
};

// Generation pipeline
async function generateTests(config) {
  const templates = loadTemplates(config.templatesDir);
  const variables = loadVariables(config.variablesDir);
  const strategy = EXPANSION_STRATEGIES[config.strategy];

  return strategy(templates, variables)
    .map(interpolateTemplate)
    .map(addUniqueId)
    .filter(deduplicateByHash);
}
```

### 3. Rate-Limited Upload Queue

```javascript
// ElevenLabs API rate limits (estimated)
const RATE_LIMITS = {
  requestsPerMinute: 60,
  requestsPerHour: 1000,
  batchSize: 10,  // Tests per batch
  delayBetweenBatches: 1500,  // ms
  retryBackoffBase: 2000,  // ms
};

// Upload queue with progress
class UploadQueue {
  constructor(apiKey, agentId) {
    this.queue = [];
    this.uploaded = [];
    this.failed = [];
    this.progress = { total: 0, completed: 0, failed: 0 };
  }

  async uploadAll(tests, { onProgress, onError }) {
    const batches = chunkArray(tests, RATE_LIMITS.batchSize);

    for (const batch of batches) {
      await this.uploadBatch(batch);
      await sleep(RATE_LIMITS.delayBetweenBatches);
      onProgress?.(this.progress);
    }

    return { uploaded: this.uploaded, failed: this.failed };
  }

  async uploadBatch(tests) {
    for (const test of tests) {
      try {
        const result = await this.createTest(test);
        this.uploaded.push({ test, result });
        this.progress.completed++;
      } catch (e) {
        this.failed.push({ test, error: e.message });
        this.progress.failed++;
      }
    }
  }
}
```

### 4. Execution Orchestrator

```javascript
// Run tests against agent
async function executeTests(agentId, testIds) {
  // Option 1: Run all tests at once
  const invocation = await api.runAllTests(agentId);

  // Option 2: Run specific test IDs (if supported)
  const invocation = await api.runTests(agentId, { test_ids: testIds });

  // Poll for completion
  return pollInvocationUntilComplete(invocation.invocation_id, {
    pollInterval: 5000,
    maxWait: 600000,  // 10 minutes for 1000+ tests
  });
}
```

### 5. Results Aggregator

```javascript
// Aggregate and report results
function aggregateResults(invocationResults) {
  const summary = {
    total: invocationResults.length,
    passed: 0,
    failed: 0,
    byCategory: {},
    byPriority: {},
    failures: [],
  };

  for (const result of invocationResults) {
    if (result.passed) {
      summary.passed++;
    } else {
      summary.failed++;
      summary.failures.push({
        testId: result.test_id,
        testName: result.name,
        reason: result.failure_reason,
      });
    }

    // Group by category
    const cat = result.category || 'uncategorized';
    summary.byCategory[cat] = summary.byCategory[cat] || { passed: 0, failed: 0 };
    summary.byCategory[cat][result.passed ? 'passed' : 'failed']++;
  }

  return summary;
}
```

## ElevenLabs Native Test API

### Endpoint Reference

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/v1/convai/agent-testing/create` | POST | Create a single test |
| `/v1/convai/agent-testing` | GET | List all tests |
| `/v1/convai/agent-testing/{id}` | DELETE | Delete a test |
| `/v1/convai/agents/{id}/run-tests` | POST | Execute tests for agent |
| `/v1/convai/test-invocations/{id}` | GET | Get invocation results |
| `/v1/convai/test-invocations` | GET | List all invocations |

### Test Types

| Type | Purpose | chat_history Ends With |
|------|---------|------------------------|
| `llm` | Test LLM response quality | `user` message |
| `tool` | Test tool invocation | `user` message |

### Test Definition Schema

```json
{
  "name": "Test Name (max 100 chars)",
  "type": "llm|tool",
  "chat_history": [
    { "role": "user", "message": "...", "time_in_call_secs": 0 },
    { "role": "agent", "message": "...", "time_in_call_secs": 5 },
    { "role": "user", "message": "...", "time_in_call_secs": 10 }
  ],
  "success_condition": "Description of what success looks like",
  "success_examples": [
    { "response": "Example success response", "type": "success" }
  ],
  "failure_examples": [
    { "response": "Example failure response", "type": "failure" }
  ]
}
```

**Constraint:** `chat_history` MUST end with a `user` message, not `agent`.

## BMAD Integration Pattern

```yaml
# Integration hook for /bmad:bmm:workflows:testarch-atdd
workflow: testarch-atdd
hooks:
  on_generate:
    - handler: elevenlabs_factory_generate
      config:
        strategy: "cartesian"
        max_tests: 1000
  on_execute:
    - handler: elevenlabs_factory_upload
    - handler: elevenlabs_factory_run
  on_report:
    - handler: elevenlabs_factory_aggregate
    - handler: portal_link_generator
```

## File Structure

```
workflows/voice_ai_agents/supersystem/test-factory/
├── test-factory.js           # Main CLI entrypoint
├── lib/
│   ├── generator.js          # Template expansion engine
│   ├── uploader.js           # Rate-limited batch upload
│   ├── executor.js           # Test execution orchestrator
│   ├── aggregator.js         # Results aggregation
│   └── api-client.js         # ElevenLabs API wrapper
├── templates/
│   ├── base-scenarios.yaml   # Core test templates
│   ├── industries.yaml       # Industry variable definitions
│   ├── variants.yaml         # Variant definitions
│   └── edge-cases.yaml       # Edge case templates
├── generated/                # Output directory
│   ├── tests-{timestamp}.json
│   └── results-{timestamp}.json
└── README.md
```

## CLI Interface

```bash
# Generate 1000 tests from templates
node test-factory.js generate --count 1000 --strategy cartesian

# Upload generated tests to ElevenLabs
node test-factory.js upload --input generated/tests-latest.json --agent-id agent_xxx

# Execute all uploaded tests
node test-factory.js execute --agent-id agent_xxx

# Full pipeline (generate + upload + execute)
node test-factory.js run --count 1000 --agent-id agent_xxx

# View results in portal
node test-factory.js report --invocation-id inv_xxx --open-portal
```

## Performance Estimates

| Operation | Tests | Time Estimate | API Calls |
|-----------|-------|---------------|-----------|
| Generate | 1000 | 5-10 seconds | 0 |
| Upload | 1000 | 15-25 minutes | 1000 |
| Execute | 1000 | 30-60 minutes | 1-10 |
| Aggregate | 1000 | 1-2 minutes | 10-50 |

**Total for 1000 tests:** ~45-90 minutes end-to-end

## Trade-offs

### Why Native Tests vs Simulate API?

| Factor | Native Tests | Simulate API |
|--------|-------------|--------------|
| Portal Visibility | ✅ Full dashboard | ❌ None |
| Execution Control | ❌ All-or-nothing | ✅ Per-scenario |
| Results Storage | ✅ Persistent | ❌ Ephemeral |
| API Cost | Higher (per-test) | Lower (per-simulation) |
| Scale | 100s | 1000s |

**Decision:** Use native tests for regression suite (visible in portal), simulate API for exploratory/chaos testing.

### Cartesian vs Sampling?

- **Cartesian:** Covers all combinations, but O(n³) growth
- **Sampling:** Statistically representative, but may miss edge cases
- **Pairwise:** Good coverage with O(n²) tests

**Default:** Cartesian for < 2000 tests, pairwise for larger spaces.
