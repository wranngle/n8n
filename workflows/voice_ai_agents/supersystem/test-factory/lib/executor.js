/**
 * Test Executor Module
 *
 * Triggers test execution on ElevenLabs and polls for results.
 * Handles large-scale test runs with proper timeout handling.
 */

const { ElevenLabsTestingClient, sleep } = require('./api-client');

// Execution configuration
const EXECUTION_CONFIG = {
  POLL_INTERVAL_MS: 5000,
  MAX_WAIT_MS: 600000, // 10 minutes
  LARGE_TEST_THRESHOLD: 100,
  LARGE_TEST_MAX_WAIT_MS: 1800000, // 30 minutes for 1000+ tests
};

/**
 * Execution status tracker
 */
class ExecutionTracker {
  constructor(invocationId) {
    this.invocationId = invocationId;
    this.startTime = Date.now();
    this.status = 'pending';
    this.testsTotal = 0;
    this.testsCompleted = 0;
    this.testsPassed = 0;
    this.testsFailed = 0;
  }

  update(invocation) {
    this.status = invocation.status || this.status;
    this.testsTotal = invocation.tests_total || invocation.total_tests || this.testsTotal;
    this.testsCompleted = invocation.tests_completed || invocation.completed_tests || this.testsCompleted;
    this.testsPassed = invocation.tests_passed || invocation.passed_tests || this.testsPassed;
    this.testsFailed = invocation.tests_failed || invocation.failed_tests || this.testsFailed;
  }

  getProgress() {
    const elapsed = Date.now() - this.startTime;
    const percentage = this.testsTotal > 0
      ? ((this.testsCompleted / this.testsTotal) * 100).toFixed(1)
      : 0;

    return {
      invocationId: this.invocationId,
      status: this.status,
      testsTotal: this.testsTotal,
      testsCompleted: this.testsCompleted,
      testsPassed: this.testsPassed,
      testsFailed: this.testsFailed,
      percentage,
      elapsed,
      elapsedFormatted: this.formatDuration(elapsed),
    };
  }

  formatDuration(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  }

  isComplete() {
    return this.status === 'completed' || this.status === 'failed';
  }
}

/**
 * Test Executor class
 */
class TestExecutor {
  constructor(options = {}) {
    this.client = new ElevenLabsTestingClient(options.apiKey, options.agentId);
    this.pollInterval = options.pollInterval || EXECUTION_CONFIG.POLL_INTERVAL_MS;
    this.maxWait = options.maxWait || EXECUTION_CONFIG.MAX_WAIT_MS;
  }

  /**
   * Trigger test execution
   *
   * @param {string} agentId - Agent ID (optional, uses default)
   * @param {Object} options - Execution options
   * @returns {Object} Invocation details
   */
  async trigger(agentId = null, options = {}) {
    console.log('Triggering test execution...');
    const invocation = await this.client.runTests(agentId, options);

    console.log(`Invocation ID: ${invocation.invocation_id || invocation.id}`);
    return invocation;
  }

  /**
   * Poll for execution completion
   *
   * @param {string} invocationId - Invocation ID
   * @param {Object} options - Poll options
   * @returns {Object} Final results
   */
  async pollUntilComplete(invocationId, options = {}) {
    const { onProgress, testCount = 0 } = options;

    // Adjust timeout for large test runs
    const maxWait = testCount > EXECUTION_CONFIG.LARGE_TEST_THRESHOLD
      ? EXECUTION_CONFIG.LARGE_TEST_MAX_WAIT_MS
      : this.maxWait;

    const tracker = new ExecutionTracker(invocationId);
    const startTime = Date.now();

    console.log(`Polling for completion (timeout: ${maxWait / 1000}s)...`);

    while (Date.now() - startTime < maxWait) {
      try {
        const invocation = await this.client.getInvocation(invocationId);
        tracker.update(invocation);

        if (onProgress) {
          onProgress(tracker.getProgress());
        }

        if (tracker.isComplete()) {
          console.log(`\nExecution completed: ${tracker.status}`);
          return invocation;
        }

        // Progress update
        const progress = tracker.getProgress();
        process.stdout.write(
          `\rStatus: ${progress.status} | ` +
          `${progress.testsCompleted}/${progress.testsTotal} tests | ` +
          `${progress.percentage}% | ` +
          `Elapsed: ${progress.elapsedFormatted}    `
        );

        await sleep(this.pollInterval);
      } catch (error) {
        console.warn(`\nPoll error: ${error.message}`);
        await sleep(this.pollInterval * 2);
      }
    }

    throw new Error(`Execution timeout after ${maxWait / 1000}s`);
  }

  /**
   * Execute and wait for results (convenience method)
   *
   * @param {string} agentId - Agent ID
   * @param {Object} options - Options
   * @returns {Object} Final results
   */
  async executeAndWait(agentId = null, options = {}) {
    const invocation = await this.trigger(agentId, options.triggerOptions);
    const invocationId = invocation.invocation_id || invocation.id;

    return this.pollUntilComplete(invocationId, {
      onProgress: options.onProgress,
      testCount: options.testCount,
    });
  }

  /**
   * Get portal URL for viewing results
   */
  getPortalUrl(agentId = null) {
    return this.client.getPortalUrl(agentId);
  }
}

/**
 * Default progress reporter
 */
function consoleExecutionProgress(progress) {
  process.stdout.write(
    `\rExecution: ${progress.status} | ` +
    `${progress.testsCompleted}/${progress.testsTotal} | ` +
    `Pass: ${progress.testsPassed} | ` +
    `Fail: ${progress.testsFailed} | ` +
    `${progress.elapsedFormatted}    `
  );
}

// Export
module.exports = {
  TestExecutor,
  ExecutionTracker,
  consoleExecutionProgress,
  EXECUTION_CONFIG,
};
