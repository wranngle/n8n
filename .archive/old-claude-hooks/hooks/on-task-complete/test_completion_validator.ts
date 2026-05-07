#!/usr/bin/env bun
/**
 * HOOK: test_completion_validator.js
 * EVENT: TaskComplete
 * PURPOSE: Validate test tasks produce structured summary
 * ENFORCEMENT: ADVISORY
 *
 * All tests must result in a TASK COMPLETE summary.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import {wrapHook} from '../util_hook_wrapper';
import {
  type HookResponse, output, readStdin, allow, block,
} from '../types';

// Test execution patterns
const TEST_PATTERNS = [
  /npm\s+test/i,
  /npm\s+run\s+test/i,
  /npx\s+(jest|vitest|mocha)/i,
  /yarn\s+test/i,
  /pnpm\s+test/i,
  /pytest/i,
  /python\s+-m\s+pytest/i,
  /go\s+test/i,
  /cargo\s+test/i,
  /bun\s+test/i,
  /vitest/i,
  /jest/i,
  /mocha/i,
  /ava/i,
  /tap/i,
];

// Completion markers
const COMPLETION_PATTERNS = [
  /##\s*task\s*complete/i,
  /task\s*complete/i,
  /tests?\s*(passed|succeeded|complete)/i,
  /all\s+\d+\s+tests?\s+passed/i,
  /\d+\s+passing/i,
  /test\s+suites?:\s+\d+\s+passed/i,
  /tests:\s+\d+\s+passed/i,
  /✓.*passed/i,
  /pass\s+/i,
];

function wasTestExecution(taskDescription, taskOutput) {
  const combined = `${taskDescription || ''} ${taskOutput || ''}`;
  return TEST_PATTERNS.some(pattern => pattern.test(combined));
}

function hasCompletionMarker(taskOutput) {
  if (!taskOutput) {
    return false;
  }

  return COMPLETION_PATTERNS.some(pattern => pattern.test(taskOutput));
}

function extractTestStats(taskOutput) {
  if (!taskOutput) {
    return null;
  }

  // Try to extract test statistics
  const passMatch = taskOutput.match(/(\d+)\s+(passing|passed|succeeded)/i);
  const failMatch = taskOutput.match(/(\d+)\s+(failing|failed)/i);
  const skipMatch = taskOutput.match(/(\d+)\s+(skipped|pending)/i);
  const totalMatch = taskOutput.match(/(\d+)\s+tests?/i);

  if (passMatch || failMatch || totalMatch) {
    return {
      passed: passMatch ? Number.parseInt(passMatch[1]) : 0,
      failed: failMatch ? Number.parseInt(failMatch[1]) : 0,
      skipped: skipMatch ? Number.parseInt(skipMatch[1]) : 0,
      total: totalMatch ? Number.parseInt(totalMatch[1]) : (passMatch ? Number.parseInt(passMatch[1]) : 0),
    };
  }

  return null;
}

async function main() {
  try {
    const input = await readStdin() as any;
    const taskDescription = input.task_description || input.description || '';
    const taskOutput = input.task_output || input.output || input.result || '';
    const taskStatus = input.task_status || input.status || '';

    // Only check test-related tasks
    if (!wasTestExecution(taskDescription, taskOutput)) {
      output({continue: true});
      return;
    }

    // Check for completion marker
    const hasMarker = hasCompletionMarker(taskOutput);
    const stats = extractTestStats(taskOutput);

    if (!hasMarker && !stats) {
      const message = `
╔══════════════════════════════════════════════════════════════════════════════╗
║                    📋 TEST COMPLETION VALIDATOR                              ║
╠══════════════════════════════════════════════════════════════════════════════╣
║  STATUS: Test execution detected but no completion summary found             ║
║                                                                              ║
║  RECOMMENDED:                                                                 ║
║  • Add "## TASK COMPLETE" section with test summary                          ║
║  • Include pass/fail counts and any notable results                          ║
║  • Document any failures or issues encountered                               ║
║                                                                              ║
║  EXAMPLE FORMAT:                                                              ║
║  ## TASK COMPLETE                                                             ║
║  - Tests run: 610                                                             ║
║  - Passed: 608                                                                ║
║  - Failed: 2                                                                  ║
║  - Skipped: 0                                                                 ║
║  - Notable: [any failures or issues]                                         ║
╚══════════════════════════════════════════════════════════════════════════════╝`;

      process.stderr.write(message);

      output({
        continue: true,
        systemMessage: '[TEST COMPLETION] Test execution detected but no structured completion summary. Consider adding "## TASK COMPLETE" section.',
      });
      return;
    }

    // Log successful test completion if stats available
    if (stats) {
      const summary = `Tests: ${stats.passed} passed, ${stats.failed} failed, ${stats.total} total`;
      process.stderr.write(`[TEST COMPLETION] ✓ ${summary}\n`);
    }

    output({continue: true});
  } catch {
    output({continue: true});
  }
}

wrapHook('test_completion_validator', main);
