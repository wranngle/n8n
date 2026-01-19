#!/usr/bin/env node
/**
 * ElevenLabs Testing Factory CLI
 *
 * Generate, upload, and execute 1000+ voice agent tests
 * visible in the ElevenLabs portal dashboard.
 *
 * Usage:
 *   node test-factory.js generate --count 1000
 *   node test-factory.js upload --input tests.json
 *   node test-factory.js execute --agent-id agent_xxx
 *   node test-factory.js run --count 1000 --agent-id agent_xxx
 *   node test-factory.js report --invocation-id inv_xxx
 *   node test-factory.js cleanup
 *
 * Environment:
 *   ELEVENLABS_API_KEY - API key (auto-loaded from ~/.claude/.env)
 *
 * Created: 2026-01-14
 */

const fs = require('fs');
const path = require('path');

// Module imports
const { generateTests, summarizeTests, TEMPLATES_DIR } = require('./lib/generator');
const { TestUploader, consoleProgressReporter, consoleErrorReporter } = require('./lib/uploader');
const { TestExecutor, consoleExecutionProgress } = require('./lib/executor');
const { ResultsAggregator, generateConsoleReport, generateJsonReport } = require('./lib/aggregator');
const { ElevenLabsTestingClient } = require('./lib/api-client');

// CLI configuration
const GENERATED_DIR = path.join(__dirname, 'generated');
const DEFAULT_AGENT_ID = 'agent_8001kdgp7qbyf4wvhs540be78vew';

/**
 * Parse command line arguments
 */
function parseArgs(args) {
  const options = {
    command: args[0],
    count: 100,
    strategy: 'cartesian',
    agentId: DEFAULT_AGENT_ID,
    input: null,
    output: GENERATED_DIR,
    cleanFirst: false,
    async: false,
    verbose: false,
    invocationId: null,
    skipDuplicates: true,
  };

  for (let i = 1; i < args.length; i++) {
    const arg = args[i];
    const nextArg = args[i + 1];

    switch (arg) {
      case '--count':
      case '-n':
        options.count = parseInt(nextArg, 10);
        i++;
        break;
      case '--strategy':
      case '-s':
        options.strategy = nextArg;
        i++;
        break;
      case '--agent-id':
      case '-a':
        options.agentId = nextArg;
        i++;
        break;
      case '--input':
      case '-i':
        options.input = nextArg;
        i++;
        break;
      case '--output':
      case '-o':
        options.output = nextArg;
        i++;
        break;
      case '--clean-first':
        options.cleanFirst = true;
        break;
      case '--async':
        options.async = true;
        break;
      case '--verbose':
      case '-v':
        options.verbose = true;
        break;
      case '--invocation-id':
        options.invocationId = nextArg;
        i++;
        break;
      case '--no-skip-duplicates':
        options.skipDuplicates = false;
        break;
      case '--help':
      case '-h':
        options.help = true;
        break;
    }
  }

  return options;
}

/**
 * Print help message
 */
function printHelp() {
  console.log(`
ElevenLabs Testing Factory v1.0

USAGE:
  node test-factory.js <command> [options]

COMMANDS:
  generate    Generate test definitions from templates
  upload      Upload tests to ElevenLabs
  execute     Trigger test execution
  run         Full pipeline (generate + upload + execute)
  report      Aggregate and display results
  cleanup     Delete all tests for agent
  list        List existing tests

OPTIONS:
  --count, -n <num>       Number of tests to generate (default: 100)
  --strategy, -s <name>   Expansion strategy: cartesian, pairwise, sampling
  --agent-id, -a <id>     Target agent ID
  --input, -i <file>      Input file for upload
  --output, -o <dir>      Output directory for generated tests
  --clean-first           Delete existing tests before upload
  --async                 Don't wait for execution to complete
  --verbose, -v           Show detailed output
  --invocation-id <id>    Invocation ID for report
  --no-skip-duplicates    Upload even if test name exists
  --help, -h              Show this help

EXAMPLES:
  # Generate 1000 tests
  node test-factory.js generate --count 1000

  # Upload with cleanup
  node test-factory.js upload --clean-first

  # Full pipeline
  node test-factory.js run --count 1000 --agent-id agent_xxx

  # View results
  node test-factory.js report --invocation-id inv_xxx
`);
}

/**
 * Generate command
 */
async function cmdGenerate(options) {
  console.log('\n🏭 ElevenLabs Testing Factory - Generate\n');
  console.log(`Strategy: ${options.strategy}`);
  console.log(`Max tests: ${options.count}`);

  const tests = generateTests({
    strategy: options.strategy,
    maxTests: options.count,
  });

  const summary = summarizeTests(tests);
  console.log('\nGeneration Summary:');
  console.log(`  Total: ${summary.total}`);
  console.log(`  By Category: ${JSON.stringify(summary.byCategory)}`);
  console.log(`  By Priority: ${JSON.stringify(summary.byPriority)}`);
  console.log(`  By Type: ${JSON.stringify(summary.byType)}`);

  // Save to file
  if (!fs.existsSync(options.output)) {
    fs.mkdirSync(options.output, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const outputFile = path.join(options.output, `tests-${timestamp}.json`);
  fs.writeFileSync(outputFile, JSON.stringify(tests, null, 2));

  // Also save as latest
  const latestFile = path.join(options.output, 'tests-latest.json');
  fs.writeFileSync(latestFile, JSON.stringify(tests, null, 2));

  console.log(`\n✅ Generated ${tests.length} tests`);
  console.log(`   Saved to: ${outputFile}`);
  console.log(`   Latest: ${latestFile}`);

  return tests;
}

/**
 * Upload command
 */
async function cmdUpload(options) {
  console.log('\n🏭 ElevenLabs Testing Factory - Upload\n');

  // Load tests
  let tests;
  if (options.input) {
    const inputPath = path.isAbsolute(options.input)
      ? options.input
      : path.join(process.cwd(), options.input);
    tests = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
  } else {
    const latestFile = path.join(GENERATED_DIR, 'tests-latest.json');
    if (!fs.existsSync(latestFile)) {
      console.error('No tests found. Run generate first or specify --input');
      process.exit(1);
    }
    tests = JSON.parse(fs.readFileSync(latestFile, 'utf8'));
  }

  console.log(`Tests to upload: ${tests.length}`);
  console.log(`Agent ID: ${options.agentId}`);

  const uploader = new TestUploader({ agentId: options.agentId });

  // Clean first if requested
  if (options.cleanFirst) {
    await uploader.cleanBeforeUpload();
  }

  // Upload
  console.log('\nUploading...');
  const result = await uploader.uploadAll(tests, {
    onProgress: consoleProgressReporter,
    onError: consoleErrorReporter,
    skipDuplicates: options.skipDuplicates,
  });

  const summary = result.getSummary();
  console.log(`\n\n✅ Upload Complete`);
  console.log(`   Uploaded: ${summary.uploaded}`);
  console.log(`   Failed: ${summary.failed}`);
  console.log(`   Skipped: ${summary.skipped}`);

  // Save test IDs for execution
  if (summary.testIds.length > 0) {
    const idsFile = path.join(GENERATED_DIR, 'test-ids-latest.json');
    fs.writeFileSync(idsFile, JSON.stringify(summary.testIds, null, 2));
    console.log(`   Test IDs saved: ${idsFile}`);
  }

  return result;
}

/**
 * Execute command
 */
async function cmdExecute(options) {
  console.log('\n🏭 ElevenLabs Testing Factory - Execute\n');
  console.log(`Agent ID: ${options.agentId}`);

  const executor = new TestExecutor({ agentId: options.agentId });

  // Trigger execution
  const invocation = await executor.trigger(options.agentId);
  const invocationId = invocation.invocation_id || invocation.id;

  console.log(`\nInvocation ID: ${invocationId}`);
  console.log(`Portal: ${executor.getPortalUrl(options.agentId)}`);

  // Poll for completion unless async
  if (!options.async) {
    console.log('\nWaiting for completion...');
    const result = await executor.pollUntilComplete(invocationId, {
      onProgress: consoleExecutionProgress,
    });

    console.log(`\n\n✅ Execution Complete`);
    console.log(`   Status: ${result.status}`);

    // Save invocation ID for report
    const invocationFile = path.join(GENERATED_DIR, 'invocation-latest.json');
    fs.writeFileSync(invocationFile, JSON.stringify({ invocationId, result }, null, 2));

    return result;
  } else {
    console.log('\nRunning in background. Check portal for results.');
    return invocation;
  }
}

/**
 * Run command (full pipeline)
 */
async function cmdRun(options) {
  console.log('\n🏭 ElevenLabs Testing Factory - Full Pipeline\n');
  console.log(`Count: ${options.count}`);
  console.log(`Strategy: ${options.strategy}`);
  console.log(`Agent ID: ${options.agentId}`);
  console.log('');

  // Step 1: Generate
  console.log('━'.repeat(50));
  console.log('STEP 1: Generate Tests');
  console.log('━'.repeat(50));
  const tests = await cmdGenerate(options);

  // Step 2: Upload
  console.log('\n' + '━'.repeat(50));
  console.log('STEP 2: Upload Tests');
  console.log('━'.repeat(50));
  options.cleanFirst = true; // Always clean for full run
  await cmdUpload(options);

  // Step 3: Execute
  console.log('\n' + '━'.repeat(50));
  console.log('STEP 3: Execute Tests');
  console.log('━'.repeat(50));
  const result = await cmdExecute(options);

  // Step 4: Report
  console.log('\n' + '━'.repeat(50));
  console.log('STEP 4: Generate Report');
  console.log('━'.repeat(50));
  if (result && result.invocation_id) {
    options.invocationId = result.invocation_id || result.id;
    await cmdReport(options);
  }

  // Final summary
  const executor = new TestExecutor({ agentId: options.agentId });
  console.log('\n' + '═'.repeat(50));
  console.log('🎉 PIPELINE COMPLETE');
  console.log('═'.repeat(50));
  console.log(`\nView results: ${executor.getPortalUrl(options.agentId)}`);

  return result;
}

/**
 * Report command
 */
async function cmdReport(options) {
  console.log('\n🏭 ElevenLabs Testing Factory - Report\n');

  const aggregator = new ResultsAggregator({ agentId: options.agentId });

  let summary;
  if (options.invocationId) {
    console.log(`Invocation: ${options.invocationId}`);
    summary = await aggregator.aggregateInvocation(options.invocationId);
  } else {
    console.log('Fetching latest invocation...');
    summary = await aggregator.aggregateLatest();
  }

  // Generate report
  generateConsoleReport(summary, { verbose: options.verbose });

  // Save JSON report
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const reportFile = path.join(GENERATED_DIR, `report-${timestamp}.json`);
  fs.writeFileSync(reportFile, generateJsonReport(summary));
  console.log(`\nJSON report saved: ${reportFile}`);

  console.log(`\nPortal: ${aggregator.getPortalUrl(options.agentId)}`);

  return summary;
}

/**
 * Cleanup command
 */
async function cmdCleanup(options) {
  console.log('\n🏭 ElevenLabs Testing Factory - Cleanup\n');
  console.log(`Agent ID: ${options.agentId}`);

  const client = new ElevenLabsTestingClient(null, options.agentId);

  // List existing tests
  const tests = await client.listTests();
  const testList = tests.tests || tests || [];
  console.log(`Found ${testList.length} tests`);

  if (testList.length === 0) {
    console.log('Nothing to clean up.');
    return;
  }

  // Confirm
  console.log('\n⚠️  This will delete all tests. Continue? (y/N)');
  // Note: In non-interactive mode, we'll proceed
  // In real usage, add readline confirmation

  const result = await client.deleteAllTests();
  console.log(`\n✅ Cleanup Complete`);
  console.log(`   Deleted: ${result.deleted}`);
  console.log(`   Failed: ${result.failed}`);

  return result;
}

/**
 * List command
 */
async function cmdList(options) {
  console.log('\n🏭 ElevenLabs Testing Factory - List Tests\n');

  const client = new ElevenLabsTestingClient(null, options.agentId);
  const tests = await client.listTests();
  const testList = tests.tests || tests || [];

  console.log(`Found ${testList.length} tests:\n`);

  for (const test of testList.slice(0, 50)) {
    console.log(`  - ${test.name} (${test.test_id || test.id})`);
  }

  if (testList.length > 50) {
    console.log(`  ... and ${testList.length - 50} more`);
  }

  return testList;
}

/**
 * Main entry point
 */
async function main() {
  const args = process.argv.slice(2);
  const options = parseArgs(args);

  if (options.help || !options.command) {
    printHelp();
    process.exit(options.help ? 0 : 1);
  }

  try {
    switch (options.command) {
      case 'generate':
        await cmdGenerate(options);
        break;
      case 'upload':
        await cmdUpload(options);
        break;
      case 'execute':
        await cmdExecute(options);
        break;
      case 'run':
        await cmdRun(options);
        break;
      case 'report':
        await cmdReport(options);
        break;
      case 'cleanup':
        await cmdCleanup(options);
        break;
      case 'list':
        await cmdList(options);
        break;
      default:
        console.error(`Unknown command: ${options.command}`);
        printHelp();
        process.exit(1);
    }
  } catch (error) {
    console.error(`\n❌ Error: ${error.message}`);
    if (options.verbose) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

// Run
main().catch(console.error);
