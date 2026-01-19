#!/usr/bin/env node
/**
 * Hook Pipeline Test Script
 * Tests hooks with mock stdin data
 */

const { spawn } = require('child_process');
const path = require('path');

const HOOKS_DIR = path.join(__dirname, '..', '.claude', 'hooks');

// Test cases - Basic Level
const tests = [
  {
    name: 'if-node-warning: should BLOCK IF node',
    hook: 'if-node-warning.js',
    input: {
      tool_name: 'mcp__n8n-mcp__n8n_create_workflow',
      tool_input: {
        name: 'Test Workflow',
        nodes: [{ type: 'n8n-nodes-base.if', name: 'IF' }]
      }
    },
    expect: { shouldBlock: true }
  },
  {
    name: 'if-node-warning: should ALLOW Switch node',
    hook: 'if-node-warning.js',
    input: {
      tool_name: 'mcp__n8n-mcp__n8n_create_workflow',
      tool_input: {
        name: 'Test Workflow',
        nodes: [{ type: 'n8n-nodes-base.switch', name: 'Switch' }]
      }
    },
    expect: { shouldBlock: false }
  },
  {
    name: 'workflow-governance: pre-create check',
    hook: 'workflow-governance.js',
    input: {
      hook_event_name: 'PreToolUse',
      tool_name: 'mcp__n8n-mcp__n8n_create_workflow',
      tool_input: { name: 'New Test Workflow', nodes: [] }
    },
    expect: { shouldBlock: false }
  },
  {
    name: 'post-deploy-log: logs deployment',
    hook: 'post-deploy-log.js',
    input: {
      tool_name: 'mcp__n8n-mcp__n8n_create_workflow',
      tool_input: { name: 'Test' },
      tool_output: JSON.stringify({ id: 'test123', name: 'Test', active: false })
    },
    expect: { shouldBlock: false }
  },
  {
    name: 'auto-git-stage: workflow file',
    hook: 'auto-git-stage.js',
    input: {
      tool_input: { file_path: 'C:\\Users\\root\\Documents\\dev\\n8n\\workflows\\dev\\test.json' }
    },
    expect: { shouldBlock: false }
  },
  {
    name: 'naming-convention: check workflow name',
    hook: 'naming-convention.js',
    input: {
      tool_name: 'mcp__n8n-mcp__n8n_create_workflow',
      tool_input: { name: '[DEV] Test Workflow' }
    },
    expect: { shouldBlock: false }
  },
  // Intermediate tests
  {
    name: 'naming-convention: BLOCK invalid phase',
    hook: 'naming-convention.js',
    input: {
      tool_name: 'mcp__n8n-mcp__n8n_create_workflow',
      tool_input: { name: '[INVALID] Test Workflow' }
    },
    expect: { shouldBlock: true }
  },
  {
    name: 'naming-convention: BLOCK no phase tag',
    hook: 'naming-convention.js',
    input: {
      tool_name: 'mcp__n8n-mcp__n8n_create_workflow',
      tool_input: { name: 'Test Workflow Without Tag' }
    },
    expect: { shouldBlock: true }
  },
  {
    name: 'naming-convention: ALLOW full format',
    hook: 'naming-convention.js',
    input: {
      tool_name: 'mcp__n8n-mcp__n8n_create_workflow',
      tool_input: { name: '[DEV] Voice Agent - Lead Qualifier' }
    },
    expect: { shouldBlock: false }
  },
  {
    name: 'workflow-governance: BLOCK update on ARCHIVED',
    hook: 'workflow-governance.js',
    input: {
      hook_event_name: 'PreToolUse',
      tool_name: 'mcp__n8n-mcp__n8n_update_full_workflow',
      tool_input: { id: 'archived-workflow-id', name: '[ARCHIVED] Old Workflow' }
    },
    expect: { shouldBlock: false }  // Will fail open since workflow not in governance.yaml
  },
  {
    name: 'llm-node-enforcement: check LLM node config',
    hook: 'llm-node-enforcement.js',
    input: {
      tool_name: 'mcp__n8n-mcp__n8n_create_workflow',
      tool_input: {
        name: '[DEV] AI Test',
        nodes: [{ type: '@n8n/n8n-nodes-langchain.agent', name: 'AI Agent' }]
      }
    },
    expect: { shouldBlock: false }
  },
  {
    name: 'suggest-code-node: detect pattern',
    hook: 'suggest-code-node.js',
    input: {
      tool_name: 'mcp__n8n-mcp__n8n_create_workflow',
      tool_input: {
        name: '[DEV] Data Transform',
        nodes: [
          { type: 'n8n-nodes-base.set', name: 'Set 1' },
          { type: 'n8n-nodes-base.set', name: 'Set 2' },
          { type: 'n8n-nodes-base.set', name: 'Set 3' }
        ]
      }
    },
    expect: { shouldBlock: false }  // Should suggest but not block
  },
  {
    name: 'credential-automation: detect API key mention',
    hook: 'credential-automation.js',
    input: {
      user_prompt: 'Here is my ElevenLabs API key: xi-abc123'
    },
    expect: { shouldBlock: false }
  },
  {
    name: 'session-init: initialize session',
    hook: 'session-init.js',
    input: {},
    expect: { shouldBlock: false }
  },
  {
    name: 'detect-workflow-intent: pipeline keywords',
    hook: 'detect-workflow-intent.js',
    input: {
      user_prompt: 'Build a data pipeline that processes audit reports'
    },
    expect: { shouldBlock: false }
  },
  // Advanced tests - Edge cases
  {
    name: 'detect-voice-agent-intent: detect agent request',
    hook: 'detect-voice-agent-intent.js',
    input: {
      user_prompt: 'Make a voice agent for Acme Corp'
    },
    expect: { shouldBlock: false }  // Should provide suggestion, not block
  },
  {
    name: 'detect-voice-agent-intent: ignore non-agent request',
    hook: 'detect-voice-agent-intent.js',
    input: {
      user_prompt: 'Help me debug this workflow'
    },
    expect: { shouldBlock: false }
  },
  {
    name: 'workflow-governance: BLOCK delete operation',
    hook: 'workflow-governance.js',
    input: {
      hook_event_name: 'PreToolUse',
      tool_name: 'mcp__n8n-mcp__n8n_delete_workflow',
      tool_input: { id: 'any-workflow-id' }
    },
    expect: { shouldBlock: true }  // Deletion is ALWAYS blocked
  },
  {
    name: 'naming-convention: ALLOW ARCHIVED phase',
    hook: 'naming-convention.js',
    input: {
      tool_name: 'mcp__n8n-mcp__n8n_update_full_workflow',
      tool_input: { name: '[ARCHIVED] Legacy Workflow - Deprecated' }
    },
    expect: { shouldBlock: false }
  },
  {
    name: 'naming-convention: ALLOW GA phase',
    hook: 'naming-convention.js',
    input: {
      tool_name: 'mcp__n8n-mcp__n8n_create_workflow',
      tool_input: { name: '[GA] Production Ready - Feature X' }
    },
    expect: { shouldBlock: false }
  },
  {
    name: 'if-node-warning: BLOCK IF in partial update',
    hook: 'if-node-warning.js',
    input: {
      tool_name: 'mcp__n8n-mcp__n8n_update_partial_workflow',
      tool_input: {
        id: 'test-id',
        operations: [
          { type: 'addNode', node: { type: 'n8n-nodes-base.if', name: 'IF Check' } }
        ]
      }
    },
    expect: { shouldBlock: true }
  },
  {
    name: 'workflow-file-guard: protect production file',
    hook: 'workflow-file-guard.js',
    input: {
      tool_name: 'Write',
      tool_input: {
        file_path: 'C:\\Users\\root\\Documents\\dev\\n8n\\workflows\\production\\critical.json',
        content: '{}'
      }
    },
    expect: { shouldBlock: true }  // Production files are protected
  },
  {
    name: 'workflow-file-guard: allow dev file',
    hook: 'workflow-file-guard.js',
    input: {
      tool_name: 'Write',
      tool_input: {
        file_path: 'C:\\Users\\root\\Documents\\dev\\n8n\\workflows\\dev\\test.json',
        content: '{}'
      }
    },
    expect: { shouldBlock: false }
  },
  {
    name: 'pre-deploy-check: validate before deploy',
    hook: 'pre-deploy-check.js',
    input: {
      tool_name: 'mcp__n8n-mcp__n8n_create_workflow',
      tool_input: {
        name: '[DEV] Valid Workflow',
        nodes: [
          { type: 'n8n-nodes-base.webhook', name: 'Webhook' },
          { type: 'n8n-nodes-base.httpRequest', name: 'HTTP' }
        ],
        connections: {}
      }
    },
    expect: { shouldBlock: false }
  },
  {
    name: 'detect-workflow-intent: high confidence n8n',
    hook: 'detect-workflow-intent.js',
    input: {
      user_prompt: 'Create an n8n workflow that sends Slack notifications'
    },
    expect: { shouldBlock: false }
  },
  {
    name: 'credential-automation: detect Twilio key',
    hook: 'credential-automation.js',
    input: {
      user_prompt: 'Use this Twilio auth token: SK1234567890abcdef'
    },
    expect: { shouldBlock: false }  // Should detect but not block
  }
];

async function runHook(hookFile, inputData) {
  return new Promise((resolve) => {
    const hookPath = path.join(HOOKS_DIR, hookFile);
    const proc = spawn('node', [hookPath], {
      cwd: path.join(__dirname, '..'),
      stdio: ['pipe', 'pipe', 'pipe']
    });

    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (data) => { stdout += data; });
    proc.stderr.on('data', (data) => { stderr += data; });

    proc.on('close', (code) => {
      let result = null;
      try {
        if (stdout.trim()) {
          result = JSON.parse(stdout.trim());
        }
      } catch (e) {
        // Not JSON output
      }
      resolve({ code, stdout: stdout.trim(), stderr: stderr.trim(), result });
    });

    proc.on('error', (err) => {
      resolve({ code: -1, error: err.message });
    });

    // Send input via stdin
    proc.stdin.write(JSON.stringify(inputData));
    proc.stdin.end();

    // Timeout after 5 seconds
    setTimeout(() => {
      proc.kill();
      resolve({ code: -1, error: 'timeout' });
    }, 5000);
  });
}

async function runTests() {
  console.log('=== Hook Pipeline Tests ===\n');

  let passed = 0;
  let failed = 0;

  for (const test of tests) {
    process.stdout.write(`Testing: ${test.name}... `);

    try {
      const result = await runHook(test.hook, test.input);

      // Check expectations
      const blocked = result.code !== 0 || (result.result && result.result.continue === false);

      if (test.expect.shouldBlock === blocked) {
        console.log('✓ PASS');
        if (result.result && result.result.systemMessage) {
          console.log(`   Message: ${result.result.systemMessage.split('\n')[0].substring(0, 60)}...`);
        }
        passed++;
      } else {
        console.log(`✗ FAIL (expected ${test.expect.shouldBlock ? 'block' : 'allow'}, got ${blocked ? 'block' : 'allow'})`);
        if (result.stderr) console.log(`   Stderr: ${result.stderr.substring(0, 100)}`);
        if (result.stdout) console.log(`   Stdout: ${result.stdout.substring(0, 100)}`);
        failed++;
      }
    } catch (e) {
      console.log(`✗ ERROR: ${e.message}`);
      failed++;
    }
  }

  console.log(`\n=== Results: ${passed}/${passed + failed} passed ===`);

  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
