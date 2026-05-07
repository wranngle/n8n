#!/usr/bin/env bun
/**
 * API-First Enforcer Hook
 *
 * BLOCKS browser automation for services with API/MCP/webhook coverage.
 * Enforces: API → Webhook → Browser (browser is LAST RESORT).
 *
 * Runs on: on-tool-invoke
 * Enforcement: 🔴 BLOCKING for API-covered services, 🟡 ADVISORY for guidance
 */

import { readFileSync } from 'node:fs';

// Services with full API/MCP coverage (browser automation NOT allowed)
const API_COVERED_SERVICES: Record<string, { mcp?: string; reason: string; tools: string[] }> = {
  'n8n.wranngle.com': {
    mcp: 'n8n-mcp',
    reason: 'n8n MCP has 10+ tools for all workflow operations',
    tools: [
      'n8n_create_workflow',
      'n8n_update_partial_workflow',
      'n8n_get_workflow',
      'n8n_list_workflows',
      'n8n_delete_workflow',
      'n8n_validate_workflow',
      'n8n_autofix_workflow',
      'n8n_deploy_template'
    ]
  },
  'api.twilio.com': {
    mcp: 'twilio',
    reason: 'Twilio MCP for SMS/messaging',
    tools: ['send-message']
  },
  'api.elevenlabs.io': {
    mcp: 'elevenlabs-mcp',
    reason: 'ElevenLabs MCP for TTS/agents',
    tools: [
      'text_to_speech',
      'create_agent',
      'update_agent',
      'list_agents',
      'get_conversation'
    ]
  }
};

// Domains where browser IS appropriate (visual verification, platform limitations)
const BROWSER_ALLOWED_PATTERNS = [
  /console\.twilio\.com\/.*\/rcs/i, // RCS Sender onboarding (platform limitation)
  /httpbin\.org/i, // Test/demo sites
];

function extractDomain(url: string): string | null {
  try {
    const parsed = new URL(url);
    return parsed.hostname;
  } catch {
    return null;
  }
}

function isBrowserTool(toolName: string): boolean {
  const browserPrefixes = [
    'mcp__chrome-devtools__',
    'mcp__playwright__',
    'mcp__skyvern__',
    'mcp__claude-in-chrome__'
  ];
  return browserPrefixes.some(prefix => toolName.startsWith(prefix));
}

function isApiCoveredDomain(domain: string): { covered: boolean; service?: string; info?: typeof API_COVERED_SERVICES[string] } {
  for (const [serviceDomain, info] of Object.entries(API_COVERED_SERVICES)) {
    if (domain.includes(serviceDomain)) {
      return { covered: true, service: serviceDomain, info };
    }
  }
  return { covered: false };
}

function isBrowserAllowedException(url: string): boolean {
  return BROWSER_ALLOWED_PATTERNS.some(pattern => pattern.test(url));
}

function output(response: { continue: boolean; reason?: string; systemMessage?: string }) {
  process.stdout.write(JSON.stringify(response));
}

async function main() {
  let input: { tool_name?: string; tool_input?: Record<string, unknown> };

  try {
    input = JSON.parse(readFileSync(0, 'utf-8'));
  } catch {
    output({ continue: true });
    return;
  }

  const toolName = input.tool_name || '';
  const toolInput = input.tool_input || {};

  // Only check browser automation tools
  if (!isBrowserTool(toolName)) {
    output({ continue: true });
    return;
  }

  // Extract URL from tool input
  const url = (toolInput.url || toolInput.target || toolInput.page) as string | undefined;
  if (!url || typeof url !== 'string') {
    output({ continue: true }); // Can't validate without URL
    return;
  }

  // Check if browser is allowed (exceptions)
  if (isBrowserAllowedException(url)) {
    output({
      continue: true,
      systemMessage: `✅ Browser allowed: ${url} (exception: visual verification or platform limitation)`
    });
    return;
  }

  // Check if domain has API coverage
  const domain = extractDomain(url);
  if (!domain) {
    output({ continue: true });
    return;
  }

  const apiCheck = isApiCoveredDomain(domain);
  if (apiCheck.covered && apiCheck.service && apiCheck.info) {
    // BLOCKING: API exists for this service
    output({
      continue: false,
      reason: `❌ BLOCKED: Browser automation for ${apiCheck.service} when API exists\n\n` +
              `Reason: ${apiCheck.info.reason}\n\n` +
              `Available API tools:\n${apiCheck.info.tools.map(t => `  - mcp__${apiCheck.info!.mcp}__${t}`).join('\n')}\n\n` +
              `Rule: API-First principle (CLAUDE.md Layer 4)\n` +
              `Use: Direct API calls instead of browser automation\n\n` +
              `Example:\n` +
              `  ❌ chrome.navigate('${url}')\n` +
              `  ✅ mcp__${apiCheck.info.mcp}__${apiCheck.info.tools[0]}(...)\n\n` +
              `See: docs/api-vs-browser-decision-matrix.md`
    });
    return;
  }

  // ADVISORY: Unknown domain, browser allowed but provide guidance
  output({
    continue: true,
    systemMessage: `⚠️  Browser automation for external domain: ${domain}\n` +
                  `Verify: No API/MCP exists for this service\n` +
                  `If API available: Use mcp__* tools instead\n` +
                  `See: docs/api-vs-browser-decision-matrix.md`
  });
}

main().catch(() => output({ continue: true }));
