/**
 * test-utils.js
 * Shared test utilities and helpers
 */

const { Readable, Writable } = require('stream');
const assert = require('assert');

/**
 * Create a mock stdin stream with JSON data
 * @param {Object} data - Data to write to stdin
 * @returns {Readable} Mock stdin stream
 */
function createMockStdin(data) {
  const stream = new Readable({
    read() {
      this.push(JSON.stringify(data));
      this.push(null);
    }
  });
  return stream;
}

/**
 * Create a mock stdout stream that captures output
 * @returns {{stream: Writable, getOutput: Function}}
 */
function createMockStdout() {
  const chunks = [];
  const stream = new Writable({
    write(chunk, encoding, callback) {
      chunks.push(chunk.toString());
      callback();
    }
  });

  return {
    stream,
    getOutput: () => chunks.join(''),
    getJson: () => {
      try {
        return JSON.parse(chunks.join(''));
      } catch {
        return null;
      }
    }
  };
}

/**
 * Assert that a result matches expected continue status
 * @param {Object} result - Hook result
 * @param {boolean} shouldContinue - Expected continue value
 */
function assertContinue(result, shouldContinue) {
  assert.strictEqual(
    result.continue,
    shouldContinue,
    `Expected continue=${shouldContinue}, got ${result.continue}`
  );
}

/**
 * Assert that a result contains expected reason text
 * @param {Object} result - Hook result
 * @param {string} expectedText - Text that should be in reason
 */
function assertReasonContains(result, expectedText) {
  assert.ok(
    result.reason && result.reason.includes(expectedText),
    `Expected reason to contain "${expectedText}", got: ${result.reason}`
  );
}

/**
 * Create a PreToolUse event fixture
 * @param {string} toolName - Tool being called
 * @param {Object} input - Tool input
 * @returns {Object} Hook event data
 */
function createPreToolUseEvent(toolName, input) {
  return {
    hook_event_name: 'PreToolUse',
    tool_name: toolName,
    tool_input: input
  };
}

/**
 * Create a PostToolUse event fixture
 * @param {string} toolName - Tool that was called
 * @param {Object} result - Tool result
 * @returns {Object} Hook event data
 */
function createPostToolUseEvent(toolName, result) {
  return {
    hook_event_name: 'PostToolUse',
    tool_name: toolName,
    tool_result: result
  };
}

/**
 * Generate a random workflow ID
 * @returns {string} Random ID
 */
function randomWorkflowId() {
  return 'test-' + Math.random().toString(36).substring(2, 15);
}

/**
 * Create a workflow create event
 * @param {string} name - Workflow name
 * @returns {Object} Hook event data
 */
function createWorkflowEvent(name) {
  return createPreToolUseEvent('mcp__n8n-mcp__n8n_create_workflow', {
    name,
    nodes: [],
    connections: {}
  });
}

/**
 * Create a workflow update event
 * @param {string} id - Workflow ID
 * @param {string} newName - New workflow name
 * @returns {Object} Hook event data
 */
function updateWorkflowEvent(id, newName) {
  return createPreToolUseEvent('mcp__n8n-mcp__n8n_update_partial_workflow', {
    id,
    operations: [{ type: 'updateName', name: newName }]
  });
}

/**
 * Create a workflow delete event
 * @param {string} id - Workflow ID
 * @returns {Object} Hook event data
 */
function deleteWorkflowEvent(id) {
  return createPreToolUseEvent('mcp__n8n-mcp__n8n_delete_workflow', { id });
}

/**
 * Create a file write event
 * @param {string} filePath - File path
 * @param {string} content - File content
 * @returns {Object} Hook event data
 */
function writeFileEvent(filePath, content = '{}') {
  return createPreToolUseEvent('Write', {
    file_path: filePath,
    content
  });
}

/**
 * Wait for specified milliseconds
 * @param {number} ms - Milliseconds to wait
 * @returns {Promise<void>}
 */
function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Retry an async function until it succeeds or max attempts reached
 * @param {Function} fn - Async function to retry
 * @param {number} maxAttempts - Maximum attempts
 * @param {number} delayMs - Delay between attempts
 * @returns {Promise<any>}
 */
async function retry(fn, maxAttempts = 3, delayMs = 100) {
  let lastError;
  for (let i = 0; i < maxAttempts; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (i < maxAttempts - 1) {
        await wait(delayMs);
      }
    }
  }
  throw lastError;
}

module.exports = {
  createMockStdin,
  createMockStdout,
  assertContinue,
  assertReasonContains,
  createPreToolUseEvent,
  createPostToolUseEvent,
  randomWorkflowId,
  createWorkflowEvent,
  updateWorkflowEvent,
  deleteWorkflowEvent,
  writeFileEvent,
  wait,
  retry
};
