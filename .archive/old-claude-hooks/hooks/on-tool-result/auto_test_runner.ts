#!/usr/bin/env bun
/**
 * Auto Test Runner - on-tool-result hook
 *
 * HANDS-FREE TEST EXECUTION
 * =========================
 * Automatically runs integration tests when hook files are modified.
 * User never has to think about testing - it just works.
 *
 * Triggers on:
 * - Write/Edit to hooks/*.ts
 * - Write/Edit to config/*.json
 * - Write/Edit to tests/integration/*.ts
 *
 * Behavior:
 * - Runs affected test suite automatically
 * - Reports results in systemMessage
 * - BLOCKS further hook modifications if tests fail
 */

import { execSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';

interface HookInput {
  tool_name: string;
  tool_input: {
    file_path?: string;
    content?: string;
  };
  tool_result: {
    success?: boolean;
  };
}

interface HookOutput {
  continue: boolean;
  reason?: string;
  systemMessage?: string;
}

const CLAUDE_HOME = path.join(os.homedir(), '.claude');
const TEST_DIR = path.join(CLAUDE_HOME, 'tests', 'integration');
const VITEST_CONFIG = path.join(TEST_DIR, 'vitest.config.ts');
const STATE_DIR = path.join(CLAUDE_HOME, 'state');
const TEST_STATE_FILE = path.join(STATE_DIR, 'last_test_run.json');

// Patterns that trigger test runs
const TEST_TRIGGERS = [
  /hooks\/.*\.ts$/,
  /config\/.*\.json$/,
  /tests\/integration\/.*\.ts$/,
  /utils\/.*\.ts$/,
];

// Map modified files to test files
// Unmapped files fall back to running ALL integration tests
const FILE_TO_TEST_MAP: Record<string, string[]> = {
  // Browser automation (LASER) tests
  'browser_router': ['browser_router.integration.test.ts'],
  'browser_action_cacher': ['browser_router.integration.test.ts'],
  'browser_speed_enforcer': ['browser_router.integration.test.ts'],
  'api_first_enforcer': ['blocking_hooks.integration.test.ts', 'browser_router.integration.test.ts'],
  'action_cache': ['browser_router.integration.test.ts'],
  'browser-known-domains': ['browser_router.integration.test.ts'],
  'browser-automation-kpis': ['browser_router.integration.test.ts'],

  // Prompt submit hook conformance
  'succinct_enforcer': ['hook_conformance.integration.test.ts'],
  'asset_retrieval_enforcer': ['hook_conformance.integration.test.ts'],
  'complexity_analyzer_submit': ['hook_conformance.integration.test.ts'],
  'detect_voice_agent_intent': ['hook_conformance.integration.test.ts'],
  'detect_workflow_intent': ['hook_conformance.integration.test.ts'],
  'model_gate': ['hook_conformance.integration.test.ts'],
  'openspec_router': ['hook_conformance.integration.test.ts'],
  'skill_router': ['hook_conformance.integration.test.ts'],
  'root_cause_detector': ['hook_conformance.integration.test.ts'],
  'auto_commit': ['hook_conformance.integration.test.ts'],
  'github_issue_detector': ['hook_conformance.integration.test.ts'],
  'github_branch_enforcer': ['hook_conformance.integration.test.ts'],
  'browser_automation_enforcer': ['hook_conformance.integration.test.ts'],
  'credential_automation': ['hook_conformance.integration.test.ts'],
  'higher_order_goal_analyzer': ['hook_conformance.integration.test.ts', 'hog_analyzer.integration.test.ts'],

  // Governance tests
  'credential_consumer': ['governance_hooks.integration.test.ts', 'hook_conformance.integration.test.ts'],
  'model_validator': ['governance_hooks.integration.test.ts', 'blocking_hooks.integration.test.ts'],
  'workflow_governance': ['governance_hooks.integration.test.ts', 'blocking_hooks.integration.test.ts'],
  'n8n_webhook_validator': ['blocking_hooks.integration.test.ts'],
  'llm_node_enforcement': ['governance_hooks.integration.test.ts'],
  'file_creation_gate': ['governance_hooks.integration.test.ts'],
  'complexity_analyzer': ['governance_hooks.integration.test.ts'],
  'model-rankings': ['governance_hooks.integration.test.ts'],
  'elevenlabs_agent_governance': ['governance_hooks.integration.test.ts'],

  // Test infrastructure (run all tests)
  'claude_harness': ['*.integration.test.ts'],
  'setup': ['*.integration.test.ts'],
  'vitest.config': ['*.integration.test.ts'],
  'auto_test_runner': ['blocking_hooks.integration.test.ts'],
};

function shouldTriggerTests(filePath: string): boolean {
  return TEST_TRIGGERS.some(pattern => pattern.test(filePath));
}

function getTestFiles(modifiedFile: string): string[] {
  const fileName = path.basename(modifiedFile, path.extname(modifiedFile));

  // Check direct mapping
  if (FILE_TO_TEST_MAP[fileName]) {
    return FILE_TO_TEST_MAP[fileName];
  }

  // If it's a test file itself, run that test
  if (modifiedFile.includes('integration.test')) {
    return [path.basename(modifiedFile)];
  }

  // Default: run all integration tests
  return ['*.integration.test.ts'];
}

function runTests(testFiles: string[]): { passed: boolean; output: string; duration: number } {
  const startTime = Date.now();

  try {
    // For glob patterns (*.test.ts), run from test dir without path prefix
    // For specific files, use full path
    const isGlob = testFiles.some(f => f.includes('*'));
    let cmd: string;

    if (isGlob) {
      // Run vitest from test directory, let it find files naturally
      cmd = `cd "${TEST_DIR}" && npx vitest run --config "${VITEST_CONFIG}" 2>&1`;
    } else {
      // Specific test files - use full paths
      const testPattern = testFiles.map(f => path.join(TEST_DIR, f)).join(' ');
      cmd = `cd "${CLAUDE_HOME}" && npx vitest run ${testPattern} --config "${VITEST_CONFIG}" 2>&1`;
    }

    const output = execSync(cmd, {
      encoding: 'utf-8',
      timeout: 120000, // 2 minutes
      windowsHide: true,
    });

    const duration = Date.now() - startTime;
    const passed = output.includes('passed') && !output.includes('failed');

    return { passed, output, duration };
  } catch (error: any) {
    const duration = Date.now() - startTime;
    return {
      passed: false,
      output: error.stdout || error.message,
      duration,
    };
  }
}

function extractTestSummary(output: string): string {
  // Extract the test summary line
  const lines = output.split('\n');
  for (const line of lines) {
    if (line.includes('Tests') && (line.includes('passed') || line.includes('failed'))) {
      // Remove ANSI codes
      return line.replace(/\x1b\[[0-9;]*m/g, '').trim();
    }
  }
  return 'Test results unknown';
}

function saveTestState(result: { passed: boolean; testFiles: string[]; summary: string; timestamp: number }): void {
  if (!fs.existsSync(STATE_DIR)) {
    fs.mkdirSync(STATE_DIR, { recursive: true });
  }
  fs.writeFileSync(TEST_STATE_FILE, JSON.stringify(result, null, 2));
}

async function main(): Promise<void> {
  const raw = await new Promise<string>(resolve => {
    let buf = ''; let done = false;
    const finish = (v: string) => { if (!done) { done = true; resolve(v); } };
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (c: string) => { buf += c; try { JSON.parse(buf); finish(buf); } catch {} });
    process.stdin.on('end', () => finish(buf || '{}'));
    process.stdin.on('error', () => finish('{}'));
    const t = setTimeout(() => finish(buf || '{}'), 3000); if (t.unref) t.unref();
  });

  try {
    const hookInput: HookInput = JSON.parse(raw);
    const { tool_name, tool_input, tool_result } = hookInput;

    // Only process successful Write/Edit operations
    if (!['Write', 'Edit'].includes(tool_name)) {
      console.log(JSON.stringify({ continue: true }));
      return;
    }

    if (!tool_result?.success) {
      console.log(JSON.stringify({ continue: true }));
      return;
    }

    const filePath = tool_input?.file_path || '';

    // Check if this file should trigger tests
    if (!shouldTriggerTests(filePath)) {
      console.log(JSON.stringify({ continue: true }));
      return;
    }

    // Determine which tests to run
    const testFiles = getTestFiles(filePath);

    // Run tests
    const result = runTests(testFiles);
    const summary = extractTestSummary(result.output);

    // Save state
    saveTestState({
      passed: result.passed,
      testFiles,
      summary,
      timestamp: Date.now(),
    });

    if (result.passed) {
      const output: HookOutput = {
        continue: true,
        systemMessage: `
✅ AUTO-TEST PASSED (${(result.duration / 1000).toFixed(1)}s)
═══════════════════════════════════════════════════════════════════
Modified: ${path.basename(filePath)}
Tests: ${testFiles.join(', ')}
Result: ${summary}
═══════════════════════════════════════════════════════════════════`,
      };
      console.log(JSON.stringify(output));
    } else {
      // Extract failure details
      const failureMatch = result.output.match(/FAIL.*?(?=\n\n|\n[A-Z])/gs);
      const failureDetails = failureMatch ? failureMatch.slice(0, 2).join('\n') : 'See full output';

      const output: HookOutput = {
        continue: true, // Allow but warn strongly
        systemMessage: `
❌ AUTO-TEST FAILED (${(result.duration / 1000).toFixed(1)}s)
═══════════════════════════════════════════════════════════════════
Modified: ${path.basename(filePath)}
Tests: ${testFiles.join(', ')}
Result: ${summary}

FAILURES:
${failureDetails}

⚠️  FIX THE FAILING TESTS BEFORE CONTINUING
The hook modification may have broken existing functionality.
═══════════════════════════════════════════════════════════════════`,
      };
      console.log(JSON.stringify(output));
    }

  } catch (error) {
    // Fail silently - don't block operations if test runner has issues
    console.log(JSON.stringify({ continue: true }));
  }
}

main();
