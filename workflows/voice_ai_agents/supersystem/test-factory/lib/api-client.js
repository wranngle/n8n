/**
 * ElevenLabs Native Testing API Client
 *
 * Handles all interactions with ElevenLabs agent-testing API endpoints.
 * Implements rate limiting, exponential backoff, and credential governance.
 *
 * API Endpoints:
 * - POST /v1/convai/agent-testing/create - Create test
 * - GET  /v1/convai/agent-testing - List tests
 * - DELETE /v1/convai/agent-testing/{id} - Delete test
 * - POST /v1/convai/agents/{id}/run-tests - Execute tests
 * - GET  /v1/convai/test-invocations/{id} - Get results
 * - GET  /v1/convai/test-invocations - List invocations
 */

const fs = require('fs');
const path = require('path');

// Configuration
const CONFIG = {
  API_BASE: 'https://api.elevenlabs.io/v1',
  DEFAULT_AGENT_ID: 'agent_8001kdgp7qbyf4wvhs540be78vew',
  REQUEST_TIMEOUT_MS: 30000,
  MAX_RETRIES: 3,
  BASE_RETRY_DELAY_MS: 1000,
  RATE_LIMIT_DELAY_MS: 1500,
};

/**
 * Load API key from centralized credential store (~/.claude/.env)
 * Governance compliant - single source of truth
 */
function loadApiKey() {
  const envPath = path.join(
    process.env.USERPROFILE || process.env.HOME,
    '.claude',
    '.env'
  );

  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf8');
    const match = content.match(/ELEVENLABS_API_KEY=([^\r\n]+)/);
    if (match) return match[1].trim();
  }

  // Fallback to environment variable
  return process.env.ELEVENLABS_API_KEY;
}

/**
 * Sleep utility
 */
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Fetch with timeout and exponential backoff retry
 */
async function fetchWithRetry(url, options = {}, retryCount = 0) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), CONFIG.REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(timeout);

    // Handle rate limiting with retry
    if (response.status === 429 && retryCount < CONFIG.MAX_RETRIES) {
      const retryAfter = response.headers.get('retry-after');
      const delay = retryAfter
        ? parseInt(retryAfter, 10) * 1000
        : CONFIG.BASE_RETRY_DELAY_MS * Math.pow(2, retryCount) + Math.random() * 1000;

      console.log(`Rate limited, retrying in ${Math.round(delay)}ms...`);
      await sleep(delay);
      return fetchWithRetry(url, options, retryCount + 1);
    }

    // Handle server errors with retry
    if (response.status >= 500 && retryCount < CONFIG.MAX_RETRIES) {
      const delay = CONFIG.BASE_RETRY_DELAY_MS * Math.pow(2, retryCount);
      console.log(`Server error ${response.status}, retrying in ${delay}ms...`);
      await sleep(delay);
      return fetchWithRetry(url, options, retryCount + 1);
    }

    return response;
  } catch (error) {
    clearTimeout(timeout);

    if (error.name === 'AbortError') {
      throw new Error(`Request timeout after ${CONFIG.REQUEST_TIMEOUT_MS}ms`);
    }

    if (retryCount < CONFIG.MAX_RETRIES) {
      const delay = CONFIG.BASE_RETRY_DELAY_MS * Math.pow(2, retryCount);
      console.log(`Network error, retrying in ${delay}ms...`);
      await sleep(delay);
      return fetchWithRetry(url, options, retryCount + 1);
    }

    throw error;
  }
}

/**
 * ElevenLabs API Client Class
 */
class ElevenLabsTestingClient {
  constructor(apiKey = null, agentId = null) {
    this.apiKey = apiKey || loadApiKey();
    this.agentId = agentId || CONFIG.DEFAULT_AGENT_ID;

    if (!this.apiKey) {
      throw new Error('ELEVENLABS_API_KEY not found. Set in ~/.claude/.env or environment.');
    }
  }

  /**
   * Get default headers for API requests
   */
  getHeaders() {
    return {
      'xi-api-key': this.apiKey,
      'Content-Type': 'application/json',
    };
  }

  /**
   * Create a single test
   * POST /v1/convai/agent-testing/create
   *
   * @param {Object} test - Test definition
   * @returns {Object} Created test with ID
   */
  async createTest(test) {
    const url = `${CONFIG.API_BASE}/convai/agent-testing/create`;

    const response = await fetchWithRetry(url, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(test),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to create test: HTTP ${response.status} - ${error}`);
    }

    return response.json();
  }

  /**
   * List all tests (with pagination)
   * GET /v1/convai/agent-testing
   *
   * @param {Object} options - List options
   * @param {boolean} options.fetchAll - Fetch all pages (default: true)
   * @returns {Object} List of tests with { tests: [], has_more, next_cursor }
   */
  async listTests(options = {}) {
    const { fetchAll = true } = options;
    const allTests = [];
    let cursor = null;
    let hasMore = true;

    while (hasMore) {
      const url = cursor
        ? `${CONFIG.API_BASE}/convai/agent-testing?cursor=${cursor}`
        : `${CONFIG.API_BASE}/convai/agent-testing`;

      const response = await fetchWithRetry(url, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Failed to list tests: HTTP ${response.status} - ${error}`);
      }

      const data = await response.json();
      allTests.push(...(data.tests || []));

      if (!fetchAll || !data.has_more) {
        hasMore = false;
      } else {
        cursor = data.next_cursor;
        await sleep(200); // Rate limiting between pages
      }
    }

    return { tests: allTests, has_more: false };
  }

  /**
   * Delete a test
   * DELETE /v1/convai/agent-testing/{id}
   *
   * @param {string} testId - Test ID to delete
   * @returns {boolean} Success
   */
  async deleteTest(testId) {
    const url = `${CONFIG.API_BASE}/convai/agent-testing/${testId}`;

    const response = await fetchWithRetry(url, {
      method: 'DELETE',
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to delete test: HTTP ${response.status} - ${error}`);
    }

    return true;
  }

  /**
   * Delete all tests for agent
   *
   * @returns {Object} Deletion summary
   */
  async deleteAllTests() {
    const tests = await this.listTests();
    const results = { deleted: 0, failed: 0, errors: [] };

    for (const test of tests.tests || tests || []) {
      try {
        await this.deleteTest(test.test_id || test.id);
        results.deleted++;
        await sleep(500); // Rate limiting
      } catch (e) {
        results.failed++;
        results.errors.push({ testId: test.test_id || test.id, error: e.message });
      }
    }

    return results;
  }

  /**
   * Run tests for agent
   * POST /v1/convai/agents/{id}/run-tests
   *
   * @param {string} agentId - Agent ID (optional, uses default)
   * @param {Object} options - Execution options
   * @param {Array<string>} options.testIds - Array of test IDs to run (optional, runs all if not specified)
   * @returns {Object} Invocation details
   */
  async runTests(agentId = null, options = {}) {
    const targetAgentId = agentId || this.agentId;
    const url = `${CONFIG.API_BASE}/convai/agents/${targetAgentId}/run-tests`;

    // If no testIds provided, fetch all test IDs
    let testIds = options.testIds;
    if (!testIds) {
      const allTests = await this.listTests();
      testIds = (allTests.tests || []).map(t => t.id);
    }

    // Format tests as required by API: [{test_id: "..."}]
    const tests = testIds.map(id => ({ test_id: id }));

    const response = await fetchWithRetry(url, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ tests }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to run tests: HTTP ${response.status} - ${error}`);
    }

    return response.json();
  }

  /**
   * Get invocation results
   * GET /v1/convai/test-invocations/{id}
   *
   * @param {string} invocationId - Invocation ID
   * @returns {Object} Invocation results
   */
  async getInvocation(invocationId) {
    const url = `${CONFIG.API_BASE}/convai/test-invocations/${invocationId}`;

    const response = await fetchWithRetry(url, {
      method: 'GET',
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to get invocation: HTTP ${response.status} - ${error}`);
    }

    return response.json();
  }

  /**
   * List all invocations
   * GET /v1/convai/test-invocations
   *
   * @returns {Array} List of invocations
   */
  async listInvocations() {
    const url = `${CONFIG.API_BASE}/convai/test-invocations`;

    const response = await fetchWithRetry(url, {
      method: 'GET',
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to list invocations: HTTP ${response.status} - ${error}`);
    }

    return response.json();
  }

  /**
   * Poll invocation until complete
   *
   * @param {string} invocationId - Invocation ID
   * @param {Object} options - Poll options
   * @returns {Object} Final invocation results
   */
  async pollUntilComplete(invocationId, options = {}) {
    const pollInterval = options.pollInterval || 5000;
    const maxWait = options.maxWait || 600000; // 10 minutes default
    const startTime = Date.now();

    while (Date.now() - startTime < maxWait) {
      const invocation = await this.getInvocation(invocationId);

      if (invocation.status === 'completed' || invocation.status === 'failed') {
        return invocation;
      }

      if (options.onProgress) {
        options.onProgress(invocation);
      }

      await sleep(pollInterval);
    }

    throw new Error(`Invocation ${invocationId} did not complete within ${maxWait}ms`);
  }

  /**
   * Get portal URL for agent tests
   *
   * @param {string} agentId - Agent ID (optional)
   * @returns {string} Dashboard URL
   */
  getPortalUrl(agentId = null) {
    const targetAgentId = agentId || this.agentId;
    return `https://elevenlabs.io/app/agents/${targetAgentId}?tab=tests`;
  }
}

// Export
module.exports = {
  ElevenLabsTestingClient,
  loadApiKey,
  CONFIG,
  sleep,
};
