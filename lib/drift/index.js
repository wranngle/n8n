// Compare deployed n8n workflows against repo-tracked JSON files and emit
// a three-section drift report: Only on instance / Only in repo / Modified.

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { listDeployedWorkflows } = require('./api-client');

const SKIP_KEYS = new Set(['id', 'createdAt', 'updatedAt', 'versionId', 'active']);

function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === 'object') {
    const out = {};
    for (const key of Object.keys(value).sort()) {
      if (SKIP_KEYS.has(key)) continue;
      out[key] = canonicalize(value[key]);
    }
    return out;
  }
  return value;
}

function fingerprint(workflow) {
  const canon = JSON.stringify(canonicalize(workflow));
  return crypto.createHash('sha256').update(canon).digest('hex');
}

function loadRepoWorkflows(dir) {
  if (!fs.existsSync(dir)) return [];
  const out = [];
  for (const entry of fs.readdirSync(dir)) {
    if (!entry.endsWith('.json')) continue;
    const fullPath = path.join(dir, entry);
    const stat = fs.statSync(fullPath);
    if (!stat.isFile()) continue;
    const raw = fs.readFileSync(fullPath, 'utf8');
    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch (err) {
      throw new Error(`Invalid JSON in ${fullPath}: ${err.message}`);
    }
    if (!parsed || typeof parsed.name !== 'string') {
      throw new Error(`Workflow ${fullPath} missing required "name" field`);
    }
    out.push({ name: parsed.name, file: entry, workflow: parsed });
  }
  return out;
}

function indexByName(items, accessor) {
  const map = new Map();
  for (const item of items) {
    const name = accessor(item);
    if (!name) continue;
    map.set(name, item);
  }
  return map;
}

function computeDrift({ deployed, repo }) {
  const deployedByName = indexByName(deployed, (w) => w.name);
  const repoByName = indexByName(repo, (r) => r.name);

  const onlyOnInstance = [];
  const onlyInRepo = [];
  const modified = [];

  for (const [name, deployedWf] of deployedByName) {
    if (!repoByName.has(name)) {
      onlyOnInstance.push({ name, id: deployedWf.id ?? null });
    }
  }

  for (const [name, repoEntry] of repoByName) {
    if (!deployedByName.has(name)) {
      onlyInRepo.push({ name, file: repoEntry.file });
    }
  }

  for (const [name, repoEntry] of repoByName) {
    const deployedWf = deployedByName.get(name);
    if (!deployedWf) continue;
    const deployedFp = fingerprint(deployedWf);
    const repoFp = fingerprint(repoEntry.workflow);
    if (deployedFp !== repoFp) {
      modified.push({
        name,
        file: repoEntry.file,
        id: deployedWf.id ?? null,
        deployedFingerprint: deployedFp,
        repoFingerprint: repoFp,
      });
    }
  }

  const sortByName = (a, b) => a.name.localeCompare(b.name);
  onlyOnInstance.sort(sortByName);
  onlyInRepo.sort(sortByName);
  modified.sort(sortByName);

  return { onlyOnInstance, onlyInRepo, modified };
}

function renderReport(drift, { n8nUrl, generatedAt }) {
  const lines = [];
  lines.push('# n8n drift report');
  lines.push('');
  lines.push(`- Instance: ${n8nUrl}`);
  lines.push(`- Generated: ${generatedAt}`);
  lines.push(`- Only on instance: ${drift.onlyOnInstance.length}`);
  lines.push(`- Only in repo: ${drift.onlyInRepo.length}`);
  lines.push(`- Modified: ${drift.modified.length}`);
  lines.push('');

  lines.push('## Only on instance');
  lines.push('');
  if (drift.onlyOnInstance.length === 0) {
    lines.push('_None._');
  } else {
    for (const item of drift.onlyOnInstance) {
      const id = item.id != null ? ` (id=${item.id})` : '';
      lines.push(`- ${item.name}${id}`);
    }
  }
  lines.push('');

  lines.push('## Only in repo');
  lines.push('');
  if (drift.onlyInRepo.length === 0) {
    lines.push('_None._');
  } else {
    for (const item of drift.onlyInRepo) {
      lines.push(`- ${item.name} (${item.file})`);
    }
  }
  lines.push('');

  lines.push('## Modified');
  lines.push('');
  if (drift.modified.length === 0) {
    lines.push('_None._');
  } else {
    for (const item of drift.modified) {
      const id = item.id != null ? ` (id=${item.id})` : '';
      lines.push(`- ${item.name} (${item.file})${id}`);
      lines.push(`  - deployed: ${item.deployedFingerprint.slice(0, 12)}`);
      lines.push(`  - repo:     ${item.repoFingerprint.slice(0, 12)}`);
    }
  }
  lines.push('');

  return lines.join('\n');
}

async function runDrift({ n8nUrl, apiKey, workflowsDir, now = new Date() }) {
  const deployed = await listDeployedWorkflows({ n8nUrl, apiKey });
  const repo = loadRepoWorkflows(workflowsDir);
  const drift = computeDrift({ deployed, repo });
  const report = renderReport(drift, {
    n8nUrl,
    generatedAt: now.toISOString(),
  });
  return { drift, report };
}

module.exports = {
  canonicalize,
  fingerprint,
  loadRepoWorkflows,
  computeDrift,
  renderReport,
  runDrift,
};
