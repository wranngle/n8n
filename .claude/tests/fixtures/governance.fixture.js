/**
 * governance.fixture.js
 * Test fixtures for governance-related tests
 */

// Valid workflow fixtures
const VALID_WORKFLOWS = {
  devSimple: {
    id: 'test-dev-simple',
    name: '[DEV] Simple Workflow',
    active: false,
    phase: 'DEV'
  },
  devWithCategory: {
    id: 'test-dev-category',
    name: '[DEV] Voice Agent - Lead Qualifier',
    active: false,
    phase: 'DEV'
  },
  archived: {
    id: 'test-archived',
    name: '[ARCHIVED] Old System - Deprecated',
    active: false,
    phase: 'ARCHIVED'
  }
};

// Invalid workflow fixtures
const INVALID_WORKFLOWS = {
  noPhase: {
    id: 'test-no-phase',
    name: 'Missing Phase Prefix',
    active: false
  },
  wrongPhase: {
    id: 'test-wrong-phase',
    name: '[PROD] Production Workflow',
    active: false
  },
  alphaPhase: {
    id: 'test-alpha',
    name: '[ALPHA] Alpha Workflow',
    active: false
  },
  betaPhase: {
    id: 'test-beta',
    name: '[BETA] Beta Workflow',
    active: false
  },
  gaPhase: {
    id: 'test-ga',
    name: '[GA] General Availability',
    active: false
  }
};

// Hook event fixtures
const HOOK_EVENTS = {
  preCreate: {
    hook_event_name: 'PreToolUse',
    tool_name: 'mcp__n8n-mcp__n8n_create_workflow',
    tool_input: {
      name: '[DEV] Test Workflow',
      nodes: [],
      connections: {}
    }
  },
  preUpdate: {
    hook_event_name: 'PreToolUse',
    tool_name: 'mcp__n8n-mcp__n8n_update_partial_workflow',
    tool_input: {
      id: 'test-workflow-id',
      operations: [{ type: 'updateName', name: '[DEV] Updated' }]
    }
  },
  preDelete: {
    hook_event_name: 'PreToolUse',
    tool_name: 'mcp__n8n-mcp__n8n_delete_workflow',
    tool_input: { id: 'test-workflow-id' }
  },
  postCreate: {
    hook_event_name: 'PostToolUse',
    tool_name: 'mcp__n8n-mcp__n8n_create_workflow',
    tool_result: { id: 'new-workflow-id', name: '[DEV] New Workflow' }
  }
};

// Similarity test fixtures
const SIMILARITY_PAIRS = {
  identical: {
    a: 'ElevenLabs Workflow',
    b: 'ElevenLabs Workflow',
    expectedScore: 100
  },
  similar: {
    a: 'ElevenLabs Twilio Outbound Call',
    b: 'ElevenLabs Twilio Outbound Calling',
    minScore: 50,
    maxScore: 80
  },
  different: {
    a: 'Voice Agent Tester',
    b: 'Pipedrive CRM Integration',
    maxScore: 30
  },
  empty: {
    a: '',
    b: 'test',
    expectedScore: 0
  }
};

// File name fixtures
const FILE_NAMES = {
  valid: {
    kebabCase: 'workflows/dev/my-workflow.json',
    singleWord: 'workflows/dev/simple.json',
    withNumbers: 'workflows/dev/voice-agent-v2.json'
  },
  invalid: {
    camelCase: 'workflows/dev/myWorkflow.json',
    pascalCase: 'workflows/dev/MyWorkflow.json',
    snakeCase: 'workflows/dev/my_workflow.json',
    withSpaces: 'workflows/dev/my workflow.json'
  }
};

// Expected results
const EXPECTED_RESULTS = {
  validCreate: { continue: true },
  invalidPhase: {
    continue: false,
    reasonContains: 'Invalid phase'
  },
  invalidFormat: {
    continue: false,
    reasonContains: 'does not match format'
  },
  deleteBlocked: {
    continue: false,
    reasonContains: 'DELETE'
  }
};

module.exports = {
  VALID_WORKFLOWS,
  INVALID_WORKFLOWS,
  HOOK_EVENTS,
  SIMILARITY_PAIRS,
  FILE_NAMES,
  EXPECTED_RESULTS
};
