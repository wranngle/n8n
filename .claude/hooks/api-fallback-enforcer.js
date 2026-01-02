#!/usr/bin/env node
/**
 * api-fallback-enforcer.js
 *
 * API FAILURE → SCRAPLING FALLBACK ENFORCEMENT
 * =============================================
 *
 * Hook: PostToolUse (any HTTP/API/MCP tool)
 *
 * DETECTS API failures and MANDATES Scrapling browser automation fallback.
 * 
 * Trigger patterns:
 * - "unauthorized" in response
 * - "fetch failed" in response
 * - "timeout" in response
 * - HTTP 401, 403, 500, 502, 503, 504
 * - "ECONNREFUSED", "ENOTFOUND"
 *
 * When triggered:
 * - Outputs MANDATORY instruction to use Scrapling
 * - Provides specific Scrapling commands for the failed operation
 */

const { logHook, readStdinJson, outputResult } = require('./hook-utils');

// Patterns that indicate API failure requiring fallback
const FAILURE_PATTERNS = [
  /unauthorized/i,
  /fetch failed/i,
  /timeout/i,
  /ECONNREFUSED/i,
  /ENOTFOUND/i,
  /rate.?limit/i,
  /too many requests/i,
  /service unavailable/i,
  /bad gateway/i,
  /gateway timeout/i,
  /"code":\s*40[13]/,
  /"code":\s*50[0234]/,
  /"status":\s*40[13]/,
  /"status":\s*50[0234]/,
  /HTTP\/\d\.\d\s+40[13]/,
  /HTTP\/\d\.\d\s+50[0234]/
];

// Tools that should trigger fallback check
const API_TOOLS = [
  'mcp__n8n-mcp__n8n_create_workflow',
  'mcp__n8n-mcp__n8n_update',
  'mcp__n8n-mcp__n8n_list_workflows',
  'mcp__n8n-mcp__n8n_get_workflow',
  'mcp__n8n-instance__',
  'mcp__elevenlabs-mcp__',
  'WebFetch',
  'Bash' // For curl commands
];

/**
 * Check if tool output indicates API failure
 * @param {string} output - Tool output/result
 * @returns {{failed: boolean, pattern: string|null}}
 */
function detectApiFailure(output) {
  if (!output || typeof output !== 'string') {
    return { failed: false };
  }

  for (const pattern of FAILURE_PATTERNS) {
    if (pattern.test(output)) {
      return {
        failed: true,
        pattern: pattern.toString()
      };
    }
  }

  return { failed: false };
}

/**
 * Generate Scrapling fallback instructions
 * @param {string} toolName - Failed tool name
 * @param {object} toolInput - Original tool input
 * @returns {string} - Scrapling commands to use
 */
function generateScraplingInstructions(toolName, toolInput) {
  let url = '';
  let action = 'navigate and extract data';

  // Extract URL from common tool patterns
  if (toolInput.url) {
    url = toolInput.url;
  } else if (toolInput.webhookUrl) {
    url = toolInput.webhookUrl;
  } else if (toolName.includes('n8n')) {
    url = 'https://n8n.wranngle.com';
    action = 'login and perform operation via UI';
  } else if (toolName.includes('elevenlabs')) {
    url = 'https://elevenlabs.io';
    action = 'login and perform operation via UI';
  }

  return `
═══════════════════════════════════════════════════════════════
⚠️  MANDATORY FALLBACK: API FAILED → USE SCRAPLING BROWSER
═══════════════════════════════════════════════════════════════

The API/MCP call failed. You MUST now use Scrapling browser automation.

STEP 1: Navigate to target
  mcp__scrapling-mcp__scrapling_navigate({
    url: "${url || '[TARGET_URL]'}",
    headless: true
  })

STEP 2: Get page snapshot
  mcp__scrapling-mcp__scrapling_snapshot({
    max_elements: 50
  })

STEP 3: Extract needed data or interact
  mcp__scrapling-mcp__scrapling_css({
    selector: "[relevant CSS selector]"
  })

STEP 4: If login required, check .env for credentials:
  - N8N_WEB_EMAIL / N8N_WEB_PASSWORD
  - Other service credentials

ACTION REQUIRED: ${action}

DO NOT retry the failed API. USE SCRAPLING NOW.
═══════════════════════════════════════════════════════════════
`;
}

/**
 * Main hook handler
 */
async function main() {
  logHook('api-fallback-enforcer', 'Hook triggered');

  try {
    const data = await readStdinJson();
    const toolName = data.tool_name || '';
    const toolInput = data.tool_input || {};
    const toolResult = data.tool_result || '';
    const hookType = data.hook_event_name || '';

    // Only check on PostToolUse
    if (hookType !== 'PostToolUse') {
      outputResult({ continue: true });
      process.exit(0);
      return;
    }

    // Only check relevant API tools
    const isApiTool = API_TOOLS.some(t => toolName.includes(t));
    if (!isApiTool) {
      outputResult({ continue: true });
      process.exit(0);
      return;
    }

    // Convert result to string for pattern matching
    const resultStr = typeof toolResult === 'string' 
      ? toolResult 
      : JSON.stringify(toolResult);

    // Check for failure
    const { failed, pattern } = detectApiFailure(resultStr);

    if (failed) {
      logHook('api-fallback-enforcer', 'API failure detected', {
        tool: toolName,
        pattern
      });

      const instructions = generateScraplingInstructions(toolName, toolInput);

      outputResult({
        continue: true, // Don't block, but inject mandatory instruction
        systemMessage: instructions
      });

      process.exit(0);
      return;
    }

    // No failure detected
    outputResult({ continue: true });
    process.exit(0);

  } catch (e) {
    logHook('api-fallback-enforcer', 'Error', { error: e.message });
    outputResult({ continue: true }); // Fail open
    process.exit(0);
  }
}

// Export for testing
module.exports = {
  detectApiFailure,
  generateScraplingInstructions,
  FAILURE_PATTERNS,
  API_TOOLS
};

// Run if called directly
if (require.main === module) {
  main();
}
