#!/usr/bin/env node
/**
 * verify-workflows.js — CI smoke check for the n8n workflow library.
 *
 * Validates that every workflow under `workflows/` parses cleanly as JSON
 * and contains none of the runtime-only fields that do not belong in reusable
 * library exports
 * (credentials, pinData, webhookId, meta.instanceId, staticData).
 *
 * Exits 0 on clean; non-zero with a summary on failure.
 */

const fs = require('fs');
const path = require('path');

const FORBIDDEN_KEYS = ['credentials', 'pinData', 'webhookId', 'staticData'];
const FORBIDDEN_TOP_LEVEL_KEYS = ['active', 'activeVersion', 'activeVersionId', 'tags'];
const WORKFLOWS_DIR = path.join(__dirname, '..', 'workflows');
const REGISTRY_FILE = path.join(WORKFLOWS_DIR, 'registry.yaml');
const ALLOWED_STATES = new Set(['draft', 'published', 'retired']);

function findWorkflows(dir, results = []) {
  if (!fs.existsSync(dir)) return results;
  for (const entry of fs.readdirSync(dir)) {
    const full = path.join(dir, entry);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      findWorkflows(full, results);
    } else if (entry.endsWith('.json')) {
      results.push(full);
    }
  }
  return results;
}

function findForbidden(node, found = new Set()) {
  if (Array.isArray(node)) {
    for (const item of node) findForbidden(item, found);
  } else if (node && typeof node === 'object') {
    for (const key of FORBIDDEN_KEYS) {
      if (key in node) found.add(key);
    }
    if (node.meta && typeof node.meta === 'object' && 'instanceId' in node.meta) {
      found.add('meta.instanceId');
    }
    for (const k of Object.keys(node)) findForbidden(node[k], found);
  }
  return found;
}

const files = findWorkflows(WORKFLOWS_DIR);
const failures = [];

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function validateWorkflowShape(file, workflow) {
  if (typeof workflow.name !== 'string' || workflow.name.trim() === '') {
    failures.push({file, kind: 'workflow-shape', detail: 'missing string name'});
  }
  if (!Array.isArray(workflow.nodes)) {
    failures.push({file, kind: 'workflow-shape', detail: 'missing nodes array'});
  }
  if (!isPlainObject(workflow.connections)) {
    failures.push({file, kind: 'workflow-shape', detail: 'missing connections object'});
  }
  if (!isPlainObject(workflow.settings)) {
    failures.push({file, kind: 'workflow-shape', detail: 'missing settings object'});
  }
  for (const key of FORBIDDEN_TOP_LEVEL_KEYS) {
    if (key in workflow) {
      failures.push({file, kind: 'runtime-field', detail: key});
    }
  }
  validateConnections(file, workflow);
}

function validateConnections(file, workflow) {
  if (!Array.isArray(workflow.nodes) || !isPlainObject(workflow.connections)) return;

  const names = new Set(workflow.nodes.map(node => node && node.name).filter(Boolean));
  for (const source of Object.keys(workflow.connections)) {
    if (!names.has(source)) {
      failures.push({file, kind: 'connection', detail: `source node does not exist: ${source}`});
    }
    const outputs = workflow.connections[source];
    if (!isPlainObject(outputs)) continue;
    for (const outputGroup of Object.values(outputs)) {
      if (!Array.isArray(outputGroup)) continue;
      for (const branch of outputGroup) {
        if (!Array.isArray(branch)) continue;
        for (const edge of branch) {
          if (!edge || typeof edge.node !== 'string') continue;
          if (!names.has(edge.node)) {
            failures.push({file, kind: 'connection', detail: `target node does not exist: ${edge.node}`});
          }
        }
      }
    }
  }
}

function unquote(value) {
  const trimmed = value.trim();
  if ((trimmed.startsWith('"') && trimmed.endsWith('"')) ||
      (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

function parseRegistryWorkflows(text) {
  const workflows = {};
  let inWorkflows = false;
  let currentId = null;

  for (const raw of text.split('\n')) {
    const line = raw.replace(/\s+#.*$/, '');
    if (/^workflows:\s*$/.test(line)) {
      inWorkflows = true;
      continue;
    }
    if (!inWorkflows) continue;
    if (/^[^\s].+:\s*$/.test(line)) break;

    const entry = line.match(/^  ([A-Za-z0-9_-]+):\s*$/);
    if (entry) {
      currentId = entry[1];
      workflows[currentId] = {};
      continue;
    }

    const field = line.match(/^    (path|state):\s*(.+?)\s*$/);
    if (currentId && field) {
      workflows[currentId][field[1]] = unquote(field[2]);
    }
  }

  return workflows;
}

for (const file of files) {
  let parsed;
  try {
    parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (e) {
    failures.push({file, kind: 'parse', detail: e.message});
    continue;
  }
  validateWorkflowShape(file, parsed);
  const found = findForbidden(parsed);
  if (found.size > 0) {
    failures.push({file, kind: 'runtime-field', detail: [...found].join(',')});
  }
}

try {
  const registry = parseRegistryWorkflows(fs.readFileSync(REGISTRY_FILE, 'utf8'));
  for (const [id, entry] of Object.entries(registry)) {
    const entryPath = entry && entry.path ? path.join(__dirname, '..', entry.path) : null;
    if (!entryPath) {
      failures.push({file: REGISTRY_FILE, kind: 'registry', detail: `${id} missing path`});
      continue;
    }
    if (!fs.existsSync(entryPath)) {
      failures.push({file: REGISTRY_FILE, kind: 'registry', detail: `${id} path does not exist: ${entry.path}`});
    }
    if (!ALLOWED_STATES.has(entry.state)) {
      failures.push({file: REGISTRY_FILE, kind: 'registry', detail: `${id} has invalid state: ${entry.state}`});
    }
  }
} catch (e) {
  failures.push({file: REGISTRY_FILE, kind: 'registry-parse', detail: e.message});
}

if (failures.length === 0) {
  console.log(`OK: ${files.length} workflow${files.length === 1 ? '' : 's'} parsed cleanly; registry paths valid; no forbidden keys.`);
  process.exit(0);
}

console.error(`FAIL: ${failures.length} workflow issue${failures.length === 1 ? '' : 's'} across ${files.length} file${files.length === 1 ? '' : 's'}:`);
for (const f of failures) {
  console.error(`  [${f.kind}] ${path.relative(process.cwd(), f.file)} :: ${f.detail}`);
}
process.exit(1);
