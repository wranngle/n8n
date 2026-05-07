#!/usr/bin/env bun
/**
 * HOOK: google_sheets_gate.ts
 * EVENT: PreToolUse
 * PURPOSE: Warn when Google Sheets nodes are used, recommend n8n Data Tables
 * ENFORCEMENT: ADVISORY
 *
 * Google Sheets adds external dependency, auth complexity, rate limits.
 * n8n Data Tables are native, no auth, better for workflows.
 */

import {output, readStdin, type ToolInvokeInput} from '../types';

const SHEETS_PATTERNS = [
  /google.*sheets?/i,
  /spreadsheet/i,
  /n8n-nodes-base\.googleSheets/i,
];

const DATA_TABLE_GUIDANCE = `
⚠️  GOOGLE SHEETS DETECTED - CONSIDER n8n DATA TABLES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Google Sheets Issues:
- External dependency (OAuth complexity)
- Rate limiting and quotas
- Data lives outside n8n

n8n Data Tables Benefits:
- Native to n8n (no external auth)
- No rate limits
- Data co-located with workflows
- Simpler backup/restore

Recommendation: Use n8n Data Tables instead.
Exceptions: External stakeholders need Sheets access.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`;

function detectGoogleSheets(input: ToolInvokeInput): boolean {
  const inputStr = JSON.stringify(input).toLowerCase();

  for (const pattern of SHEETS_PATTERNS) {
    if (pattern.test(inputStr)) {
      return true;
    }
  }

  // Check for specific node type in workflow operations
  if (input.tool_name.includes('n8n')) {
    const toolInput = input.tool_input as Record<string, unknown>;
    const nodes = toolInput.nodes as Array<{type?: string}> | undefined;
    if (nodes) {
      for (const node of nodes) {
        if (node.type?.toLowerCase().includes('googlesheets')) {
          return true;
        }
      }
    }
  }

  return false;
}

async function main() {
  try {
    const input = await readStdin() as ToolInvokeInput;

    // Only check n8n workflow operations
    if (!input.tool_name.includes('n8n') || !input.tool_name.includes('workflow')) {
      output({continue: true});
      return;
    }

    if (detectGoogleSheets(input)) {
      process.stderr.write(DATA_TABLE_GUIDANCE);

      output({
        continue: true,
        systemMessage: '[GOOGLE SHEETS WARNING] Consider using n8n Data Tables instead. Sheets adds external dependency, auth complexity, and rate limits.',
      });
      return;
    }

    output({continue: true});
  } catch {
    output({continue: true});
  }
}

main().catch(() => output({continue: true}));
