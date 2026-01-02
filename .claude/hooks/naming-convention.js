#!/usr/bin/env node
/**
 * naming-convention.js
 *
 * WORKFLOW NAMING CONVENTION ENFORCEMENT
 * ======================================
 *
 * Hook: PreToolUse (n8n_create_workflow, n8n_update_*)
 *
 * Enforces consistent naming format:
 * - Workflows: "[PHASE] Category - Name" (e.g., "[DEV] Voice Agent - Lead Qualifier")
 * - Files: kebab-case (e.g., "lead-qualifier.json")
 *
 * Valid phases: DEV, ALPHA, BETA, GA, PROD, ARCHIVED
 *
 * BLOCK if naming violation detected, provide suggested fix.
 */

const fs = require('fs');
const path = require('path');
const { logHook, readStdinJson, outputResult, getProjectRoot } = require('./hook-utils');

const VALID_PHASES = ['DEV', 'ALPHA', 'BETA', 'GA', 'PROD', 'ARCHIVED'];
const PHASE_PATTERN = /^\[([A-Z]+)\]\s+(.+?)\s*-\s*(.+)$/;
const KEBAB_CASE_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/**
 * Check if workflow name follows convention
 * @param {string} name - Workflow name
 * @returns {{valid: boolean, phase: string|null, category: string|null, title: string|null, error: string|null}}
 */
function validateWorkflowName(name) {
  if (!name || typeof name !== 'string') {
    return { valid: false, error: 'No name provided' };
  }

  const trimmed = name.trim();
  const match = trimmed.match(PHASE_PATTERN);

  if (!match) {
    return {
      valid: false,
      error: `Name "${trimmed}" does not match format: [PHASE] Category - Name`,
      suggestion: suggestWorkflowName(trimmed)
    };
  }

  const [, phase, category, title] = match;

  if (!VALID_PHASES.includes(phase)) {
    return {
      valid: false,
      phase,
      category,
      title,
      error: `Invalid phase "${phase}". Valid phases: ${VALID_PHASES.join(', ')}`,
      suggestion: `[DEV] ${category} - ${title}`
    };
  }

  return {
    valid: true,
    phase,
    category: category.trim(),
    title: title.trim()
  };
}

/**
 * Suggest a properly formatted workflow name
 * @param {string} name - Original name
 * @returns {string} - Suggested name
 */
function suggestWorkflowName(name) {
  // Try to extract meaningful parts
  const cleaned = name.replace(/^\[.*?\]\s*/, '').trim();

  // Common category keywords
  const categoryMap = {
    'webhook': 'Webhook',
    'voice': 'Voice Agent',
    'ai': 'AI Agent',
    'crm': 'CRM',
    'pipedrive': 'CRM',
    'slack': 'Communication',
    'email': 'Email',
    'schedule': 'Scheduled',
    'cron': 'Scheduled',
    'test': 'Testing',
    'eval': 'Testing',
    'auto': 'Automation'
  };

  let category = 'Utility';
  const lowerName = cleaned.toLowerCase();

  for (const [key, cat] of Object.entries(categoryMap)) {
    if (lowerName.includes(key)) {
      category = cat;
      break;
    }
  }

  // Extract title (remove common prefixes)
  let title = cleaned
    .replace(/^(DEV|ALPHA|BETA|GA|PROD)\s*[-:]\s*/i, '')
    .replace(/^(Supersystem|Voice Agent|AI Agent)\s*[-:]\s*/i, '')
    .trim();

  if (!title) title = cleaned;

  return `[DEV] ${category} - ${title}`;
}

/**
 * Check if file name follows kebab-case
 * @param {string} filePath - File path
 * @returns {{valid: boolean, error: string|null, suggestion: string|null}}
 */
function validateFileName(filePath) {
  if (!filePath) return { valid: true };

  const basename = path.basename(filePath, path.extname(filePath));

  // Skip validation for non-workflow files
  if (!filePath.includes('workflow') && !filePath.endsWith('.json')) {
    return { valid: true };
  }

  if (!KEBAB_CASE_PATTERN.test(basename)) {
    const suggested = basename
      .replace(/([a-z])([A-Z])/g, '$1-$2')
      .replace(/[\s_]+/g, '-')
      .replace(/[^a-z0-9-]/gi, '')
      .toLowerCase();

    return {
      valid: false,
      error: `File name "${basename}" is not kebab-case`,
      suggestion: suggested + path.extname(filePath)
    };
  }

  return { valid: true };
}

/**
 * Main hook handler
 */
async function main() {
  logHook('naming-convention', 'Hook triggered');

  try {
    const data = await readStdinJson();
    const toolName = data.tool_name || '';
    const toolInput = data.tool_input || {};
    const hookType = data.hook_event_name || 'PreToolUse';

    // Only validate on PreToolUse
    if (hookType !== 'PreToolUse') {
      outputResult({ continue: true });
      process.exit(0);
      return;
    }

    const issues = [];

    // Check workflow name for create/update
    if (toolName.includes('n8n_create_workflow') || toolName.includes('n8n_update')) {
      let name = toolInput.name;

      // Also check operations array for partial updates (updateName operation)
      if (!name && toolInput.operations && Array.isArray(toolInput.operations)) {
        const updateNameOp = toolInput.operations.find(op => op.type === 'updateName');
        if (updateNameOp) {
          name = updateNameOp.name;
        }
      }

      if (name) {
        const result = validateWorkflowName(name);

        if (!result.valid) {
          issues.push({
            type: 'workflow_name',
            error: result.error,
            suggestion: result.suggestion
          });
        }
      }
    }

    // Check file path for Write operations
    if (toolName === 'Write') {
      const filePath = toolInput.file_path;

      if (filePath && filePath.includes('workflow')) {
        const result = validateFileName(filePath);

        if (!result.valid) {
          issues.push({
            type: 'file_name',
            error: result.error,
            suggestion: result.suggestion
          });
        }
      }
    }

    // Output results
    if (issues.length > 0) {
      const errorMessages = issues.map(i =>
        `❌ ${i.type}: ${i.error}${i.suggestion ? `\n   Suggested: ${i.suggestion}` : ''}`
      ).join('\n');

      logHook('naming-convention', 'Violations found', { issues });

      outputResult({
        continue: false,
        reason: `NAMING CONVENTION VIOLATION\n\n${errorMessages}\n\nFormat required:\n- Workflows: [PHASE] Category - Name\n- Files: kebab-case.json\n\nValid phases: ${VALID_PHASES.join(', ')}`
      });
      process.exit(2);
      return;
    }

    logHook('naming-convention', 'Validation passed');
    outputResult({ continue: true });
    process.exit(0);

  } catch (e) {
    logHook('naming-convention', 'Error', { error: e.message });
    outputResult({ continue: true }); // Fail open
    process.exit(0);
  }
}

// Export for testing
module.exports = {
  validateWorkflowName,
  validateFileName,
  suggestWorkflowName,
  VALID_PHASES,
  PHASE_PATTERN
};

// Run if called directly
if (require.main === module) {
  main();
}
