#!/usr/bin/env node
/**
 * session-init.js
 * Hook: SessionStart
 * FIXES: Leaner message, no redundancy with intent hook
 */

const fs = require('fs');
const path = require('path');
const { logHook, getProjectRoot, outputResult } = require('./hook-utils');

const projectDir = getProjectRoot();
const stateFile = path.join(projectDir, '.claude', 'logs', 'session-state.json');

logHook('session-init', 'Hook triggered', { projectDir });

async function checkN8nHealth() {
  const baseUrl = process.env.N8N_API_URL || 'https://n8n.wranngle.com';
  const http = baseUrl.startsWith('https') ? require('https') : require('http');

  return new Promise((resolve) => {
    let resolved = false;
    const done = (value) => { if (!resolved) { resolved = true; resolve(value); } };

    const req = http.get(baseUrl, { timeout: 4000 }, (res) => {
      res.destroy(); // Close response stream
      req.destroy(); // Close request
      done(res.statusCode >= 200 && res.statusCode < 400);
    });
    req.on('error', () => done(false));
    req.on('timeout', () => { req.destroy(); done(false); });
  });
}

function countWorkflows(dir) {
  try {
    if (!fs.existsSync(dir)) return 0;
    return fs.readdirSync(dir).filter(f => f.endsWith('.json')).length;
  } catch { return 0; }
}

(async () => {
  try {
    const dirs = ['workflows/dev', 'workflows/staging', 'workflows/production'];
    const missingDirs = dirs.filter(d => !fs.existsSync(path.join(projectDir, d)));
    missingDirs.forEach(d => fs.mkdirSync(path.join(projectDir, d), { recursive: true }));

    const workflowCount = dirs.reduce((sum, d) => sum + countWorkflows(path.join(projectDir, d)), 0);
    const n8nUp = await checkN8nHealth();

    // Save state for other hooks
    const state = { n8nUp, workflowCount, timestamp: Date.now() };
    fs.writeFileSync(stateFile, JSON.stringify(state));

    // Compact message - intent hook handles the protocol details
    const msg = `🔧 n8n: ${workflowCount} local | instance ${n8nUp ? '✅' : '⚠️ down'}${missingDirs.length ? ' | created: ' + missingDirs.join(', ') : ''}`;

    outputResult({ continue: true, systemMessage: msg });
    logHook('session-init', 'Success', { workflowCount, n8nUp, msgLen: msg.length });
    process.exit(0);
  } catch (e) {
    logHook('session-init', 'ERROR', { error: e.message });
    outputResult({ continue: true, systemMessage: `⚠️ Init error: ${e.message}` });
    process.exit(1);
  }
})();
