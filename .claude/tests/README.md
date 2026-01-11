# Governance Hook Test Framework

Production-ready test architecture for n8n workflow governance hooks.

## Quick Start

```bash
# Run all tests
node --test .claude/tests/*.test.js

# Run with coverage
node --experimental-test-coverage --test .claude/tests/*.test.js

# Run via PowerShell script
.\scripts\run-hook-tests.ps1 -Mode all -Coverage
```

## Test Structure

```
.claude/tests/
├── config/
│   └── test.config.js         # Central configuration
├── fixtures/
│   └── governance.fixture.js  # Test data fixtures
├── helpers/
│   └── test-utils.js          # Shared utilities
├── naming-convention.test.js  # Naming hook unit tests (38 tests)
├── workflow-governance.test.js # Governance hook unit tests (26 tests)
├── handler-integration.test.js # Integration tests (21 tests)
└── README.md                  # This file
```

## Test Categories

### Unit Tests (64 tests)
- `naming-convention.test.js` - Validates workflow naming patterns
- `workflow-governance.test.js` - Validates phase enforcement

### Integration Tests (21 tests)
- `handler-integration.test.js` - Tests hook handler logic without I/O

## Coverage Report

| Module | Lines | Branches | Functions |
|--------|-------|----------|-----------|
| naming-convention.js | 65% | 92% | 75% |
| workflow-governance.js | 38% | 77% | 40% |
| **Overall** | **70%** | **93%** | **88%** |

*Note: Main handler functions (stdin/stdout) excluded from coverage as they require process mocking.*

## Fixtures

### VALID_WORKFLOWS
Standard workflow configurations for positive testing.

### INVALID_WORKFLOWS
Configurations that should trigger validation errors.

### HOOK_EVENTS
Pre-formatted hook event payloads for PreToolUse/PostToolUse.

### SIMILARITY_PAIRS
String pairs for testing Jaccard similarity algorithm.

## Test Utilities

```javascript
const {
  createWorkflowEvent,    // Generate workflow create event
  updateWorkflowEvent,    // Generate workflow update event
  deleteWorkflowEvent,    // Generate workflow delete event
  assertContinue,         // Assert hook continue status
  assertReasonContains    // Assert error message content
} = require('./helpers/test-utils');
```

## Running Specific Tests

```bash
# Run only naming tests
node --test .claude/tests/naming-convention.test.js

# Run only governance tests
node --test .claude/tests/workflow-governance.test.js

# Run with verbose output
node --test --test-reporter=spec .claude/tests/*.test.js
```

## Adding New Tests

1. Create fixture in `fixtures/governance.fixture.js`
2. Add helper if needed in `helpers/test-utils.js`
3. Write test in appropriate `*.test.js` file
4. Run with coverage to verify

## Policy Enforcement

Tests validate the **DEV-ONLY** governance policy:

| Phase | Allowed | Editable |
|-------|---------|----------|
| DEV | ✅ | ✅ |
| ARCHIVED | ✅ | ❌ |
| ALPHA | ❌ | ❌ |
| BETA | ❌ | ❌ |
| GA | ❌ | ❌ |
| PROD | ❌ | ❌ |

## CI Integration

Add to your CI pipeline:

```yaml
test-governance:
  runs-on: windows-latest
  steps:
    - uses: actions/checkout@v4
    - uses: actions/setup-node@v4
      with:
        node-version: '20'
    - name: Run governance tests
      run: node --experimental-test-coverage --test .claude/tests/*.test.js
```

---

*Last Updated: 2026-01-09*
*Tests: 85 | Pass Rate: 100%*
