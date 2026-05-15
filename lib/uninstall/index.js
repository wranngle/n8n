'use strict';

const http = require('http');
const https = require('https');
const { URL } = require('url');

function parseArgs(argv) {
  const out = { positional: [], flags: {} };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const key = a.slice(2);
      const next = argv[i + 1];
      if (next === undefined || next.startsWith('--')) {
        out.flags[key] = true;
      } else {
        out.flags[key] = next;
        i++;
      }
    } else {
      out.positional.push(a);
    }
  }
  return out;
}

function buildRequest({ method, n8nUrl, apiKey, path }) {
  const url = new URL(path, n8nUrl);
  return {
    method,
    hostname: url.hostname,
    port: url.port || (url.protocol === 'https:' ? 443 : 80),
    path: url.pathname + (url.search || ''),
    headers: {
      'Accept': 'application/json',
      'X-N8N-API-KEY': apiKey,
    },
    lib: url.protocol === 'https:' ? https : http,
  };
}

function doRequest(opts) {
  const { lib, ...reqOpts } = opts;
  return new Promise((resolve, reject) => {
    const req = lib.request(reqOpts, (res) => {
      let data = '';
      res.on('data', (c) => (data += c));
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    });
    req.on('error', reject);
    req.end();
  });
}

async function listWorkflows({ n8nUrl, apiKey }) {
  const opts = buildRequest({ method: 'GET', n8nUrl, apiKey, path: '/rest/workflows' });
  const { status, body } = await doRequest(opts);
  if (status < 200 || status >= 300) {
    throw new Error(`GET /rest/workflows failed: HTTP ${status} ${body}`);
  }
  let parsed;
  try {
    parsed = JSON.parse(body);
  } catch {
    throw new Error(`GET /rest/workflows returned non-JSON: ${body.slice(0, 120)}`);
  }
  const items = Array.isArray(parsed) ? parsed : (parsed.data || parsed.workflows || []);
  return items;
}

async function deleteWorkflow({ n8nUrl, apiKey, id }) {
  const opts = buildRequest({ method: 'DELETE', n8nUrl, apiKey, path: `/rest/workflows/${encodeURIComponent(id)}` });
  return doRequest(opts);
}

function matchWorkflows(workflows, { id, name }) {
  if (id !== undefined && id !== null && id !== '') {
    return workflows.filter((w) => String(w.id) === String(id));
  }
  if (name !== undefined && name !== null && name !== '') {
    return workflows.filter((w) => w.name === name);
  }
  return [];
}

function planCalls({ n8nUrl, matches }) {
  return matches.map((w) => ({
    method: 'DELETE',
    url: new URL(`/rest/workflows/${encodeURIComponent(w.id)}`, n8nUrl).toString(),
    id: w.id,
    name: w.name,
  }));
}

async function run({ n8nUrl, apiKey, id, name, dryRun, stdout = console.log, stderr = console.error }) {
  if (!n8nUrl || !apiKey || (!id && !name)) {
    return { ok: false, code: 2, reason: 'missing-args' };
  }
  const workflows = await listWorkflows({ n8nUrl, apiKey });
  const matches = matchWorkflows(workflows, { id, name });
  if (matches.length === 0) {
    stderr('uninstall-workflow: no workflows matched');
    return { ok: false, code: 1, reason: 'no-match', matches: [] };
  }

  const calls = planCalls({ n8nUrl, matches });

  if (dryRun) {
    stdout('# Dry-run: would issue:');
    for (const c of calls) {
      stdout(`${c.method} ${c.url}`);
    }
    return { ok: true, code: 0, dryRun: true, calls };
  }

  const results = [];
  for (const m of matches) {
    const { status, body } = await deleteWorkflow({ n8nUrl, apiKey, id: m.id });
    const okStatus = status >= 200 && status < 300;
    results.push({ id: m.id, name: m.name, status, ok: okStatus, body });
    if (okStatus) {
      stdout(`deleted ${m.id}`);
    } else {
      stderr(`DELETE /rest/workflows/${m.id} failed: HTTP ${status} ${body}`);
    }
  }
  const allOk = results.every((r) => r.ok);
  return { ok: allOk, code: allOk ? 0 : 1, results };
}

module.exports = {
  parseArgs,
  buildRequest,
  doRequest,
  listWorkflows,
  deleteWorkflow,
  matchWorkflows,
  planCalls,
  run,
};
