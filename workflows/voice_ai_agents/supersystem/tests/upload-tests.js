#!/usr/bin/env node
/**
 * Upload Tests to ElevenLabs Native Testing
 *
 * Reads generated tests from JSON file and uploads to ElevenLabs API.
 *
 * Usage:
 *   node upload-tests.js --file tests-100.json --agent agent_xxx
 *
 * Created: 2025-12-30
 */

const fs = require('fs');
const path = require('path');
const { createTest, listTests, ENDPOINTS, CONFIG } = require('./layer7-elevenlabs-tests');

// ANSI colors
const C = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
};

async function uploadTests(testsFile, agentId, options = {}) {
  console.log(`\n${C.cyan}${C.bright}═══════════════════════════════════════════════════════════${C.reset}`);
  console.log(`${C.cyan}${C.bright}       ELEVENLABS NATIVE TEST UPLOADER                      ${C.reset}`);
  console.log(`${C.cyan}${C.bright}═══════════════════════════════════════════════════════════${C.reset}\n`);

  // Validate API key
  if (!CONFIG.ELEVENLABS_API_KEY) {
    console.error(`${C.red}ERROR: ELEVENLABS_API_KEY environment variable required${C.reset}`);
    process.exit(1);
  }

  // Load tests from file
  const filePath = path.isAbsolute(testsFile) ? testsFile : path.join(__dirname, testsFile);
  if (!fs.existsSync(filePath)) {
    console.error(`${C.red}ERROR: Tests file not found: ${filePath}${C.reset}`);
    process.exit(1);
  }

  const tests = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  console.log(`${C.blue}Loaded ${tests.length} tests from: ${filePath}${C.reset}`);
  console.log(`${C.blue}Target Agent: ${agentId}${C.reset}`);
  console.log(`${C.blue}API Endpoint: ${ENDPOINTS.createTest}${C.reset}\n`);

  // Check existing tests to avoid duplicates
  let existingTests = [];
  try {
    console.log(`${C.cyan}Checking for existing tests...${C.reset}`);
    const existingResponse = await listTests();
    existingTests = existingResponse.tests || existingResponse || [];
    console.log(`${C.blue}Found ${existingTests.length} existing tests${C.reset}\n`);
  } catch (e) {
    console.log(`${C.yellow}Could not fetch existing tests: ${e.message}${C.reset}`);
    console.log(`${C.yellow}Proceeding with upload (may create duplicates)${C.reset}\n`);
  }

  const existingNames = new Set(existingTests.map(t => t.name));

  // Upload results tracking
  const results = {
    created: [],
    skipped: [],
    failed: [],
    startTime: Date.now(),
  };

  // Rate limit settings
  const BATCH_SIZE = options.batchSize || 5;
  const DELAY_MS = options.delayMs || 1000;

  console.log(`${C.cyan}Starting upload (batch=${BATCH_SIZE}, delay=${DELAY_MS}ms)${C.reset}\n`);

  // Process in batches
  for (let i = 0; i < tests.length; i++) {
    const test = tests[i];
    const testNum = String(i + 1).padStart(3, '0');

    // Skip if exists
    if (existingNames.has(test.name) && !options.force) {
      console.log(`${C.yellow}⊘ SKIP${C.reset} [${testNum}] ${test.name.slice(0, 50)} (exists)`);
      results.skipped.push({ id: test.id, name: test.name, reason: 'exists' });
      continue;
    }

    // Create test
    try {
      const created = await createTest(agentId, test);
      const testId = created.id || created.test_id || 'unknown';
      console.log(`${C.green}✓ CREATED${C.reset} [${testNum}] ${test.name.slice(0, 40)} → ${testId}`);
      results.created.push({
        id: test.id,
        name: test.name,
        elevenlabs_id: testId,
        category: test.category,
      });

      // Rate limiting
      if ((i + 1) % BATCH_SIZE === 0 && i < tests.length - 1) {
        console.log(`${C.blue}  [Rate limit pause ${DELAY_MS}ms]${C.reset}`);
        await new Promise(r => setTimeout(r, DELAY_MS));
      } else {
        await new Promise(r => setTimeout(r, 200)); // Small delay between each
      }

    } catch (e) {
      console.log(`${C.red}✗ FAILED${C.reset} [${testNum}] ${test.name.slice(0, 40)}: ${e.message.slice(0, 60)}`);
      results.failed.push({
        id: test.id,
        name: test.name,
        error: e.message,
      });

      // Continue on error unless fatal
      if (e.message.includes('401') || e.message.includes('403')) {
        console.error(`${C.red}FATAL: Authentication error. Stopping.${C.reset}`);
        break;
      }
    }
  }

  // Calculate duration
  results.endTime = Date.now();
  results.durationSecs = ((results.endTime - results.startTime) / 1000).toFixed(1);

  // Summary
  console.log(`\n${C.bright}═══════════════════════════════════════════════════════════${C.reset}`);
  console.log(`${C.bright}                    UPLOAD SUMMARY                          ${C.reset}`);
  console.log(`${C.bright}═══════════════════════════════════════════════════════════${C.reset}`);
  console.log(`${C.green}Created:  ${results.created.length}${C.reset}`);
  console.log(`${C.yellow}Skipped:  ${results.skipped.length}${C.reset}`);
  console.log(`${C.red}Failed:   ${results.failed.length}${C.reset}`);
  console.log(`${C.blue}Duration: ${results.durationSecs}s${C.reset}`);
  console.log(`${C.bright}═══════════════════════════════════════════════════════════${C.reset}\n`);

  // Category breakdown for created tests
  if (results.created.length > 0) {
    console.log(`${C.cyan}Created by category:${C.reset}`);
    const categories = {};
    results.created.forEach(t => {
      categories[t.category] = (categories[t.category] || 0) + 1;
    });
    Object.entries(categories).forEach(([cat, count]) => {
      console.log(`  ${cat}: ${count}`);
    });
    console.log();
  }

  // Save results
  const resultsDir = path.join(__dirname, 'elevenlabs-test-results');
  if (!fs.existsSync(resultsDir)) {
    fs.mkdirSync(resultsDir, { recursive: true });
  }

  const resultFile = path.join(resultsDir, `upload-${Date.now()}.json`);
  fs.writeFileSync(resultFile, JSON.stringify(results, null, 2));
  console.log(`${C.blue}Results saved to: ${resultFile}${C.reset}`);

  // Verification URL
  console.log(`\n${C.cyan}${C.bright}VERIFY TESTS IN UI:${C.reset}`);
  console.log(`${C.bright}https://elevenlabs.io/app/agents/agents/${agentId}?tab=tests${C.reset}\n`);

  return results;
}

// CLI
if (require.main === module) {
  const args = process.argv.slice(2);

  // Parse arguments
  const testsFile = args.find(a => a.startsWith('--file='))?.split('=')[1] || 'tests-100.json';
  const agentId = args.find(a => a.startsWith('--agent='))?.split('=')[1] || CONFIG.DEFAULT_AGENT_ID;
  const batchSize = parseInt(args.find(a => a.startsWith('--batch='))?.split('=')[1] || '5');
  const delayMs = parseInt(args.find(a => a.startsWith('--delay='))?.split('=')[1] || '1000');
  const force = args.includes('--force');

  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
ElevenLabs Native Test Uploader

Usage:
  node upload-tests.js [options]

Options:
  --file=<path>     Tests JSON file (default: tests-100.json)
  --agent=<id>      Target agent ID (default: ${CONFIG.DEFAULT_AGENT_ID})
  --batch=<n>       Batch size for rate limiting (default: 5)
  --delay=<ms>      Delay between batches in ms (default: 1000)
  --force           Upload even if test name exists
  --help, -h        Show this help

Environment:
  ELEVENLABS_API_KEY   Required - Your ElevenLabs API key

Examples:
  node upload-tests.js --file=tests-100.json
  node upload-tests.js --agent=agent_xxx --batch=10
  node upload-tests.js --force
`);
    process.exit(0);
  }

  uploadTests(testsFile, agentId, { batchSize, delayMs, force }).catch(e => {
    console.error(`${C.red}FATAL ERROR: ${e.message}${C.reset}`);
    process.exit(1);
  });
}

module.exports = { uploadTests };
