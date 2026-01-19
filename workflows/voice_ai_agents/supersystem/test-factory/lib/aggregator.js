/**
 * Results Aggregator Module
 *
 * Aggregates test execution results with:
 * - Pass/fail statistics
 * - Category breakdowns
 * - Priority analysis
 * - Failure pattern detection
 * - Report generation
 */

const { ElevenLabsTestingClient } = require('./api-client');

/**
 * Aggregate test results
 *
 * @param {Object} invocation - Invocation results from API
 * @param {Object} testMetadata - Optional metadata mapping (testId -> metadata)
 * @returns {Object} Aggregated summary
 */
function aggregateResults(invocation, testMetadata = {}) {
  const results = invocation.test_results || invocation.results || [];

  const summary = {
    invocationId: invocation.invocation_id || invocation.id,
    status: invocation.status,
    timestamp: new Date().toISOString(),

    // Counts
    total: results.length,
    passed: 0,
    failed: 0,
    passRate: 0,

    // Breakdowns
    byCategory: {},
    byPriority: {},
    byType: {},

    // Failures
    failures: [],
    failurePatterns: {},

    // Timing
    duration: invocation.duration_ms || 0,
    averageTestDuration: 0,
  };

  // Process each result
  for (const result of results) {
    const passed = result.passed || result.status === 'passed';
    const testId = result.test_id || result.id;
    const meta = testMetadata[testId] || {};

    // Count pass/fail
    if (passed) {
      summary.passed++;
    } else {
      summary.failed++;

      // Track failures
      summary.failures.push({
        testId,
        testName: result.name || result.test_name || meta.name || 'Unknown',
        reason: result.failure_reason || result.reason || 'No reason provided',
        category: meta.category || 'uncategorized',
        priority: meta.priority || 'medium',
      });

      // Track failure patterns
      const pattern = extractFailurePattern(result.failure_reason || result.reason);
      summary.failurePatterns[pattern] = (summary.failurePatterns[pattern] || 0) + 1;
    }

    // Group by category
    const category = meta.category || result.category || 'uncategorized';
    summary.byCategory[category] = summary.byCategory[category] || { passed: 0, failed: 0 };
    summary.byCategory[category][passed ? 'passed' : 'failed']++;

    // Group by priority
    const priority = meta.priority || result.priority || 'medium';
    summary.byPriority[priority] = summary.byPriority[priority] || { passed: 0, failed: 0 };
    summary.byPriority[priority][passed ? 'passed' : 'failed']++;

    // Group by type
    const type = meta.type || result.type || 'llm';
    summary.byType[type] = summary.byType[type] || { passed: 0, failed: 0 };
    summary.byType[type][passed ? 'passed' : 'failed']++;
  }

  // Calculate pass rate
  summary.passRate = summary.total > 0
    ? ((summary.passed / summary.total) * 100).toFixed(1)
    : 0;

  // Sort failures by priority
  const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
  summary.failures.sort((a, b) =>
    (priorityOrder[a.priority] || 99) - (priorityOrder[b.priority] || 99)
  );

  return summary;
}

/**
 * Extract failure pattern from reason string
 */
function extractFailurePattern(reason) {
  if (!reason) return 'unknown';

  // Common patterns
  const patterns = [
    [/forbidden.*(language|term|word)/i, 'forbidden_language'],
    [/tool.*not.*call/i, 'tool_not_called'],
    [/wrong.*tool/i, 'wrong_tool'],
    [/timeout/i, 'timeout'],
    [/emergency/i, 'emergency_handling'],
    [/discovery.*question/i, 'discovery_flow'],
    [/price|pricing/i, 'pricing_flow'],
    [/sms.*not.*sent/i, 'sms_failure'],
    [/greeting/i, 'greeting_issue'],
    [/thanks.*calling/i, 'call_direction_awareness'],
  ];

  for (const [regex, pattern] of patterns) {
    if (regex.test(reason)) {
      return pattern;
    }
  }

  return 'other';
}

/**
 * Generate console report
 */
function generateConsoleReport(summary, options = {}) {
  const { verbose = false } = options;

  console.log('\n' + '═'.repeat(60));
  console.log('  TEST EXECUTION RESULTS');
  console.log('═'.repeat(60));

  // Overview
  console.log(`\nInvocation: ${summary.invocationId}`);
  console.log(`Status: ${summary.status}`);
  console.log(`Timestamp: ${summary.timestamp}`);

  // Summary stats
  console.log('\n┌─────────────────────────────────┐');
  console.log('│         SUMMARY                 │');
  console.log('├─────────────────────────────────┤');
  console.log(`│  Total Tests:    ${String(summary.total).padStart(10)}  │`);
  console.log(`│  Passed:         ${String(summary.passed).padStart(10)}  │`);
  console.log(`│  Failed:         ${String(summary.failed).padStart(10)}  │`);
  console.log(`│  Pass Rate:      ${(summary.passRate + '%').padStart(10)}  │`);
  console.log('└─────────────────────────────────┘');

  // By Category
  if (Object.keys(summary.byCategory).length > 0) {
    console.log('\n┌─────────────────────────────────────────────┐');
    console.log('│              BY CATEGORY                     │');
    console.log('├──────────────────────┬───────┬───────┬───────┤');
    console.log('│ Category             │ Pass  │ Fail  │ Rate  │');
    console.log('├──────────────────────┼───────┼───────┼───────┤');

    for (const [category, counts] of Object.entries(summary.byCategory)) {
      const total = counts.passed + counts.failed;
      const rate = total > 0 ? ((counts.passed / total) * 100).toFixed(0) + '%' : 'N/A';
      console.log(
        `│ ${category.padEnd(20).substring(0, 20)} │ ${String(counts.passed).padStart(5)} │ ` +
        `${String(counts.failed).padStart(5)} │ ${rate.padStart(5)} │`
      );
    }
    console.log('└──────────────────────┴───────┴───────┴───────┘');
  }

  // By Priority
  if (Object.keys(summary.byPriority).length > 0) {
    console.log('\n┌─────────────────────────────────────────────┐');
    console.log('│              BY PRIORITY                     │');
    console.log('├──────────────────────┬───────┬───────┬───────┤');
    console.log('│ Priority             │ Pass  │ Fail  │ Rate  │');
    console.log('├──────────────────────┼───────┼───────┼───────┤');

    const priorityOrder = ['critical', 'high', 'medium', 'low'];
    for (const priority of priorityOrder) {
      const counts = summary.byPriority[priority];
      if (counts) {
        const total = counts.passed + counts.failed;
        const rate = total > 0 ? ((counts.passed / total) * 100).toFixed(0) + '%' : 'N/A';
        const symbol = priority === 'critical' ? '🔴' : priority === 'high' ? '🟠' : priority === 'medium' ? '🟡' : '🟢';
        console.log(
          `│ ${symbol} ${priority.padEnd(17)} │ ${String(counts.passed).padStart(5)} │ ` +
          `${String(counts.failed).padStart(5)} │ ${rate.padStart(5)} │`
        );
      }
    }
    console.log('└──────────────────────┴───────┴───────┴───────┘');
  }

  // Failure Patterns
  if (Object.keys(summary.failurePatterns).length > 0) {
    console.log('\n┌─────────────────────────────────────────────┐');
    console.log('│           FAILURE PATTERNS                   │');
    console.log('├──────────────────────────────────────┬───────┤');

    const sortedPatterns = Object.entries(summary.failurePatterns)
      .sort((a, b) => b[1] - a[1]);

    for (const [pattern, count] of sortedPatterns) {
      console.log(`│ ${pattern.padEnd(36)} │ ${String(count).padStart(5)} │`);
    }
    console.log('└──────────────────────────────────────┴───────┘');
  }

  // Individual Failures (verbose)
  if (verbose && summary.failures.length > 0) {
    console.log('\n' + '─'.repeat(60));
    console.log('FAILED TESTS:');
    console.log('─'.repeat(60));

    for (const failure of summary.failures.slice(0, 20)) {
      const priority = failure.priority === 'critical' ? '🔴' : failure.priority === 'high' ? '🟠' : '🟡';
      console.log(`\n${priority} ${failure.testName}`);
      console.log(`   Reason: ${failure.reason}`);
      console.log(`   Category: ${failure.category}`);
    }

    if (summary.failures.length > 20) {
      console.log(`\n... and ${summary.failures.length - 20} more failures`);
    }
  }

  console.log('\n' + '═'.repeat(60));

  return summary;
}

/**
 * Generate JSON report
 */
function generateJsonReport(summary) {
  return JSON.stringify(summary, null, 2);
}

/**
 * Results Aggregator class (for stateful usage)
 */
class ResultsAggregator {
  constructor(options = {}) {
    this.client = new ElevenLabsTestingClient(options.apiKey, options.agentId);
    this.testMetadata = options.testMetadata || {};
  }

  /**
   * Fetch and aggregate results for an invocation
   */
  async aggregateInvocation(invocationId) {
    const invocation = await this.client.getInvocation(invocationId);
    return aggregateResults(invocation, this.testMetadata);
  }

  /**
   * Fetch latest invocation and aggregate
   */
  async aggregateLatest() {
    const invocations = await this.client.listInvocations();
    const latest = (invocations.invocations || invocations || [])[0];

    if (!latest) {
      throw new Error('No invocations found');
    }

    const invocationId = latest.invocation_id || latest.id;
    return this.aggregateInvocation(invocationId);
  }

  /**
   * Set test metadata for category/priority mapping
   */
  setTestMetadata(metadata) {
    this.testMetadata = metadata;
  }

  /**
   * Get portal URL
   */
  getPortalUrl(agentId = null) {
    return this.client.getPortalUrl(agentId);
  }
}

// Export
module.exports = {
  aggregateResults,
  generateConsoleReport,
  generateJsonReport,
  ResultsAggregator,
  extractFailurePattern,
};
