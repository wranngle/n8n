/**
 * Test Uploader Module
 *
 * Batch uploads generated tests to ElevenLabs with:
 * - Configurable batch size
 * - Rate limiting with delays
 * - Progress reporting
 * - Partial failure tracking
 * - Retry on transient errors
 */

const { ElevenLabsTestingClient, sleep } = require('./api-client');

// Upload configuration
const UPLOAD_CONFIG = {
  BATCH_SIZE: 10,
  DELAY_BETWEEN_TESTS_MS: 500,
  DELAY_BETWEEN_BATCHES_MS: 2000,
  MAX_CONCURRENT: 1, // Sequential for rate limiting
};

/**
 * Progress tracker
 */
class ProgressTracker {
  constructor(total) {
    this.total = total;
    this.completed = 0;
    this.failed = 0;
    this.startTime = Date.now();
  }

  increment(success = true) {
    if (success) {
      this.completed++;
    } else {
      this.failed++;
    }
  }

  getProgress() {
    const elapsed = Date.now() - this.startTime;
    const processed = this.completed + this.failed;
    const remaining = this.total - processed;
    const rate = processed / (elapsed / 1000); // per second
    const eta = remaining / rate; // seconds

    return {
      total: this.total,
      completed: this.completed,
      failed: this.failed,
      processed,
      remaining,
      elapsed,
      rate: rate.toFixed(2),
      eta: Math.round(eta),
      percentage: ((processed / this.total) * 100).toFixed(1),
    };
  }
}

/**
 * Upload result
 */
class UploadResult {
  constructor() {
    this.uploaded = [];
    this.failed = [];
    this.skipped = [];
  }

  addSuccess(test, result) {
    this.uploaded.push({
      name: test.name,
      testId: result.test_id || result.id,
      category: test._meta?.category,
    });
  }

  addFailure(test, error) {
    this.failed.push({
      name: test.name,
      error: error.message || error,
      category: test._meta?.category,
    });
  }

  addSkipped(test, reason) {
    this.skipped.push({
      name: test.name,
      reason,
    });
  }

  getSummary() {
    return {
      total: this.uploaded.length + this.failed.length + this.skipped.length,
      uploaded: this.uploaded.length,
      failed: this.failed.length,
      skipped: this.skipped.length,
      testIds: this.uploaded.map(u => u.testId),
    };
  }
}

/**
 * Test Uploader class
 */
class TestUploader {
  constructor(options = {}) {
    this.client = new ElevenLabsTestingClient(options.apiKey, options.agentId);
    this.batchSize = options.batchSize || UPLOAD_CONFIG.BATCH_SIZE;
    this.delayBetweenTests = options.delayBetweenTests || UPLOAD_CONFIG.DELAY_BETWEEN_TESTS_MS;
    this.delayBetweenBatches = options.delayBetweenBatches || UPLOAD_CONFIG.DELAY_BETWEEN_BATCHES_MS;
  }

  /**
   * Upload a single test
   */
  async uploadTest(test) {
    // Remove metadata before sending to API
    const apiTest = {
      name: test.name,
      type: test.type,
      chat_history: test.chat_history,
      success_condition: test.success_condition,
      success_examples: test.success_examples,
      failure_examples: test.failure_examples,
    };

    return this.client.createTest(apiTest);
  }

  /**
   * Upload all tests with progress tracking
   *
   * @param {Array} tests - Tests to upload
   * @param {Object} options - Upload options
   * @returns {UploadResult} Upload results
   */
  async uploadAll(tests, options = {}) {
    const { onProgress, onError, skipDuplicates = true } = options;

    const tracker = new ProgressTracker(tests.length);
    const result = new UploadResult();

    // Get existing tests if checking for duplicates
    let existingNames = new Set();
    if (skipDuplicates) {
      try {
        const existing = await this.client.listTests();
        existingNames = new Set(
          (existing.tests || existing || []).map(t => t.name)
        );
        console.log(`Found ${existingNames.size} existing tests`);
      } catch (e) {
        console.warn('Could not fetch existing tests:', e.message);
      }
    }

    // Process in batches
    const batches = this.chunkArray(tests, this.batchSize);
    let batchNum = 0;

    for (const batch of batches) {
      batchNum++;
      console.log(`\nBatch ${batchNum}/${batches.length} (${batch.length} tests)`);

      for (const test of batch) {
        // Skip duplicates
        if (skipDuplicates && existingNames.has(test.name)) {
          result.addSkipped(test, 'Already exists');
          tracker.increment(true);
          continue;
        }

        try {
          const apiResult = await this.uploadTest(test);
          result.addSuccess(test, apiResult);
          tracker.increment(true);

          // Report progress
          if (onProgress) {
            onProgress(tracker.getProgress(), test, apiResult);
          }
        } catch (error) {
          result.addFailure(test, error);
          tracker.increment(false);

          if (onError) {
            onError(test, error);
          }
        }

        // Delay between tests
        await sleep(this.delayBetweenTests);
      }

      // Delay between batches
      if (batchNum < batches.length) {
        await sleep(this.delayBetweenBatches);
      }
    }

    return result;
  }

  /**
   * Delete all tests before upload (clean start)
   */
  async cleanBeforeUpload() {
    console.log('Cleaning existing tests...');
    const result = await this.client.deleteAllTests();
    console.log(`Deleted ${result.deleted} tests, ${result.failed} failures`);
    return result;
  }

  /**
   * Chunk array into batches
   */
  chunkArray(array, size) {
    const chunks = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }
}

/**
 * Default progress reporter (console)
 */
function consoleProgressReporter(progress, test, result) {
  const bar = '█'.repeat(Math.floor(progress.percentage / 5));
  const empty = '░'.repeat(20 - Math.floor(progress.percentage / 5));
  process.stdout.write(
    `\r[${bar}${empty}] ${progress.percentage}% | ` +
    `${progress.completed}/${progress.total} | ` +
    `ETA: ${progress.eta}s | ` +
    `Rate: ${progress.rate}/s    `
  );
}

/**
 * Default error reporter (console)
 */
function consoleErrorReporter(test, error) {
  console.error(`\n✗ Failed: ${test.name}`);
  console.error(`  Error: ${error.message || error}`);
}

// Export
module.exports = {
  TestUploader,
  UploadResult,
  ProgressTracker,
  consoleProgressReporter,
  consoleErrorReporter,
  UPLOAD_CONFIG,
};
