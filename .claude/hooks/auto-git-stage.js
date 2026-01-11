#!/usr/bin/env node
/**
 * auto-git-stage.js
 * Hook: PostToolUse (Write)
 *
 * Automatically stages workflow-related file changes to git.
 * Enables seamless version control without manual git add commands.
 */

const { execSync } = require('child_process');
const path = require('path');
const { logHook, readStdinJson, outputResult, getProjectRoot } = require('./hook-utils');

const PROJECT_ROOT = getProjectRoot();

// Directories to auto-stage
const AUTO_STAGE_DIRS = [
  'workflows/',
  '.claude/skills/',
  '.claude/hooks/',
  '.claude/directives/',
  'context/'
];

// File patterns to auto-stage
const AUTO_STAGE_PATTERNS = [
  /\.json$/,
  /\.yaml$/,
  /\.yml$/,
  /\.md$/,
  /\.js$/
];

// Files to exclude from auto-staging
const EXCLUDE_PATTERNS = [
  /\.env/,
  /credentials/i,
  /secret/i,
  /\.log$/,
  /node_modules/,
  /\.claude\/logs\//
];

/**
 * Check if a file should be auto-staged
 */
function shouldAutoStage(filePath) {
  const relativePath = path.relative(PROJECT_ROOT, filePath).replace(/\\/g, '/');

  // Check exclusions first
  for (const pattern of EXCLUDE_PATTERNS) {
    if (pattern.test(relativePath)) {
      return false;
    }
  }

  // Check if in auto-stage directory
  for (const dir of AUTO_STAGE_DIRS) {
    if (relativePath.startsWith(dir)) {
      return true;
    }
  }

  // Check file pattern
  for (const pattern of AUTO_STAGE_PATTERNS) {
    if (pattern.test(relativePath)) {
      // Only auto-stage patterns if in project directories
      if (relativePath.startsWith('workflows/') ||
          relativePath.startsWith('.claude/') ||
          relativePath.startsWith('context/') ||
          relativePath.startsWith('docs/')) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Check if we're in a git repository
 */
function isGitRepo() {
  try {
    execSync('git rev-parse --is-inside-work-tree', {
      cwd: PROJECT_ROOT,
      stdio: 'pipe'
    });
    return true;
  } catch {
    return false;
  }
}

/**
 * Stage a file with git
 */
function gitStage(filePath) {
  try {
    const relativePath = path.relative(PROJECT_ROOT, filePath);
    execSync(`git add "${relativePath}"`, {
      cwd: PROJECT_ROOT,
      stdio: 'pipe'
    });
    return true;
  } catch (e) {
    logHook('auto-git-stage', 'Git add failed', { error: e.message, filePath });
    return false;
  }
}

async function main() {
  try {
    const data = await readStdinJson();

    const toolInput = data.tool_input || {};
    const filePath = toolInput.file_path || toolInput.path || '';

    logHook('auto-git-stage', 'Hook triggered', { filePath });

    // Skip if no file path
    if (!filePath) {
      outputResult({});
      process.exit(0);
    }

    // Check if we should auto-stage this file
    if (!shouldAutoStage(filePath)) {
      logHook('auto-git-stage', 'Skipped - not in auto-stage path', { filePath });
      outputResult({});
      process.exit(0);
    }

    // Check if in git repo
    if (!isGitRepo()) {
      logHook('auto-git-stage', 'Skipped - not a git repository');
      outputResult({});
      process.exit(0);
    }

    // Stage the file
    const staged = gitStage(filePath);

    if (staged) {
      const relativePath = path.relative(PROJECT_ROOT, filePath);
      logHook('auto-git-stage', 'File staged', { relativePath });

      outputResult({
        systemMessage: `📁 Auto-staged: ${relativePath}`
      });
    } else {
      outputResult({});
    }

    process.exit(0);

  } catch (e) {
    logHook('auto-git-stage', 'Error', { error: e.message, stack: e.stack });
    outputResult({});
    process.exit(0);
  }
}

main();
