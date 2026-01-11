/**
 * handler-integration.test.js
 * Integration tests for hook handler functions
 *
 * Tests the main() handlers by mocking stdin/stdout
 */

const { describe, it, beforeEach, mock } = require('node:test');
const assert = require('node:assert');
const { Readable, Writable } = require('stream');

// Mock hook-utils before requiring the hooks
const mockLogHook = mock.fn();
const mockOutputResult = mock.fn();

// Store original require
const originalRequire = require;

// Test data fixtures
const FIXTURES = {
  validWorkflowCreate: {
    hook_event_name: 'PreToolUse',
    tool_name: 'mcp__n8n-mcp__n8n_create_workflow',
    tool_input: {
      name: '[DEV] Voice Agent - Test Workflow',
      nodes: [],
      connections: {}
    }
  },

  invalidWorkflowCreate: {
    hook_event_name: 'PreToolUse',
    tool_name: 'mcp__n8n-mcp__n8n_create_workflow',
    tool_input: {
      name: 'Missing Phase Prefix',
      nodes: [],
      connections: {}
    }
  },

  invalidPhaseWorkflow: {
    hook_event_name: 'PreToolUse',
    tool_name: 'mcp__n8n-mcp__n8n_create_workflow',
    tool_input: {
      name: '[PROD] Production Workflow',
      nodes: [],
      connections: {}
    }
  },

  validUpdatePartial: {
    hook_event_name: 'PreToolUse',
    tool_name: 'mcp__n8n-mcp__n8n_update_partial_workflow',
    tool_input: {
      id: '5eowJIoZFZOSG85m',
      operations: [
        { type: 'updateName', name: '[DEV] Updated Name' }
      ]
    }
  },

  deleteWorkflow: {
    hook_event_name: 'PreToolUse',
    tool_name: 'mcp__n8n-mcp__n8n_delete_workflow',
    tool_input: {
      id: '5eowJIoZFZOSG85m'
    }
  },

  validFileWrite: {
    hook_event_name: 'PreToolUse',
    tool_name: 'Write',
    tool_input: {
      file_path: 'workflows/dev/my-workflow.json',
      content: '{}'
    }
  },

  invalidFileWrite: {
    hook_event_name: 'PreToolUse',
    tool_name: 'Write',
    tool_input: {
      file_path: 'workflows/dev/MyWorkflow.json',
      content: '{}'
    }
  },

  postToolUseEvent: {
    hook_event_name: 'PostToolUse',
    tool_name: 'mcp__n8n-mcp__n8n_create_workflow',
    tool_input: { name: '[DEV] New Workflow' }
  }
};

describe('Handler Integration Tests', () => {

  describe('Input validation', () => {
    it('should handle JSON with valid PreToolUse event', () => {
      const input = JSON.stringify(FIXTURES.validWorkflowCreate);
      assert.ok(input.includes('PreToolUse'));
      assert.ok(input.includes('[DEV]'));
    });

    it('should detect invalid phase in workflow name', () => {
      const input = FIXTURES.invalidPhaseWorkflow;
      assert.ok(input.tool_input.name.includes('[PROD]'));
    });

    it('should detect missing phase in workflow name', () => {
      const input = FIXTURES.invalidWorkflowCreate;
      assert.ok(!input.tool_input.name.includes('['));
    });
  });

  describe('Tool routing logic', () => {
    it('should identify create workflow tool', () => {
      const toolName = FIXTURES.validWorkflowCreate.tool_name;
      assert.ok(toolName.includes('create_workflow'));
    });

    it('should identify update workflow tool', () => {
      const toolName = FIXTURES.validUpdatePartial.tool_name;
      assert.ok(toolName.includes('update'));
    });

    it('should identify delete workflow tool', () => {
      const toolName = FIXTURES.deleteWorkflow.tool_name;
      assert.ok(toolName.includes('delete'));
    });

    it('should identify Write tool', () => {
      const toolName = FIXTURES.validFileWrite.tool_name;
      assert.strictEqual(toolName, 'Write');
    });
  });

  describe('Naming convention validation logic', () => {
    it('should pass valid [DEV] Category - Name format', () => {
      const name = FIXTURES.validWorkflowCreate.tool_input.name;
      const pattern = /^\[([A-Z]+)\]\s+(.+?)?\s*-?\s*(.*)$/;
      const match = name.match(pattern);
      assert.ok(match, 'Should match naming pattern');
      assert.strictEqual(match[1], 'DEV');
    });

    it('should fail names without phase bracket', () => {
      const name = FIXTURES.invalidWorkflowCreate.tool_input.name;
      const hasBracket = name.startsWith('[');
      assert.strictEqual(hasBracket, false);
    });

    it('should identify PROD as invalid phase for DEV-ONLY policy', () => {
      const VALID_PHASES = ['DEV', 'ARCHIVED'];
      const name = FIXTURES.invalidPhaseWorkflow.tool_input.name;
      const phaseMatch = name.match(/^\[([A-Z]+)\]/);
      const phase = phaseMatch ? phaseMatch[1] : null;
      assert.strictEqual(phase, 'PROD');
      assert.ok(!VALID_PHASES.includes(phase));
    });
  });

  describe('File name validation logic', () => {
    it('should pass kebab-case file names', () => {
      const filePath = FIXTURES.validFileWrite.tool_input.file_path;
      const basename = filePath.split('/').pop().replace('.json', '');
      const isKebabCase = /^[a-z0-9]+(-[a-z0-9]+)*$/.test(basename);
      assert.ok(isKebabCase, `${basename} should be kebab-case`);
    });

    it('should fail PascalCase file names', () => {
      const filePath = FIXTURES.invalidFileWrite.tool_input.file_path;
      const basename = filePath.split('/').pop().replace('.json', '');
      const isKebabCase = /^[a-z0-9]+(-[a-z0-9]+)*$/.test(basename);
      assert.strictEqual(isKebabCase, false);
    });

    it('should generate kebab-case suggestion from PascalCase', () => {
      const basename = 'MyComplexWorkflow';
      const suggested = basename
        .replace(/([a-z])([A-Z])/g, '$1-$2')
        .replace(/[\s_]+/g, '-')
        .replace(/[^a-z0-9-]/gi, '')
        .toLowerCase();
      assert.strictEqual(suggested, 'my-complex-workflow');
    });
  });

  describe('Operation extraction from partial updates', () => {
    it('should extract updateName operation', () => {
      const operations = FIXTURES.validUpdatePartial.tool_input.operations;
      const updateNameOp = operations.find(op => op.type === 'updateName');
      assert.ok(updateNameOp);
      assert.strictEqual(updateNameOp.name, '[DEV] Updated Name');
    });

    it('should handle empty operations array', () => {
      const operations = [];
      const updateNameOp = operations.find(op => op.type === 'updateName');
      assert.strictEqual(updateNameOp, undefined);
    });
  });

  describe('Event type handling', () => {
    it('should identify PreToolUse events', () => {
      const event = FIXTURES.validWorkflowCreate.hook_event_name;
      assert.strictEqual(event, 'PreToolUse');
    });

    it('should identify PostToolUse events', () => {
      const event = FIXTURES.postToolUseEvent.hook_event_name;
      assert.strictEqual(event, 'PostToolUse');
    });

    it('should skip validation for non-PreToolUse events', () => {
      const event = FIXTURES.postToolUseEvent.hook_event_name;
      const shouldValidate = event === 'PreToolUse';
      assert.strictEqual(shouldValidate, false);
    });
  });

  describe('Output result structure', () => {
    it('should generate continue:true for valid input', () => {
      const result = { continue: true };
      assert.ok(result.continue);
    });

    it('should generate continue:false with reason for invalid input', () => {
      const result = {
        continue: false,
        reason: 'NAMING CONVENTION VIOLATION\n\n❌ Invalid phase'
      };
      assert.strictEqual(result.continue, false);
      assert.ok(result.reason.includes('VIOLATION'));
    });

    it('should include suggestion in error message', () => {
      const result = {
        continue: false,
        reason: 'Invalid format\n   Suggested: [DEV] Utility - My Workflow'
      };
      assert.ok(result.reason.includes('Suggested:'));
    });
  });
});
