#!/usr/bin/env node
/**
 * Rotate the two ElevenLabs HMAC workspace webhooks (so we capture their
 * secrets at creation), repoint the agent's post_call_webhook_id at the new
 * id, persist the secrets to ~/.agents/.env, and inject HMAC verification
 * gates into the corresponding n8n workflows.
 *
 * The secret is inlined into the n8n Code node so the n8n container does
 * NOT need additional env vars. The workflow JSON is stored in the n8n
 * database, which is already privileged.
 *
 * Usage:
 *   node scripts/secure-elevenlabs-hmac.js              # dry-run
 *   node scripts/secure-elevenlabs-hmac.js --apply
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const https = require('https');
const env = require('./lib/env');

const APPLY = process.argv.includes('--apply');
const ELABS = 'https://api.elevenlabs.io';
const elHeaders = { 'xi-api-key': env.require('ELEVENLABS_API_KEY'), 'Content-Type': 'application/json' };
const N8N_KEY = env.require('N8N_API_KEY');
const AGENT_ID = 'agent_xxxx_demo';

const WEBHOOKS = [
  { oldId: '2c4f042463864b7580f38a2fd5d14114', name: 'Post-Call Bulletproof Webhook',  url: 'https://n8n.wranngle.com/webhook/post-call-bulletproof', n8nWorkflowId: 'FGjUvywqh09XKlYJ', envVar: 'ELEVENLABS_POST_CALL_BULLETPROOF_SECRET' },
  { oldId: 'REDACTED_ELEVENLABS_WEBHOOK_ID_3', name: 'n8n Call Completed Webhook',      url: 'https://n8n.wranngle.com/webhook/call-completed',         n8nWorkflowId: 'cEORduJCqCVDOKce', envVar: 'ELEVENLABS_CALL_COMPLETED_SECRET' },
];

function n8nReq(method, p, body) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const req = https.request({
      hostname: 'n8n.wranngle.com', path: p, method,
      headers: { 'X-N8N-API-KEY': N8N_KEY, 'Content-Type': 'application/json', 'Accept': 'application/json', ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {}) },
    }, res => { let d=''; res.on('data',c=>d+=c); res.on('end',()=>{ try{resolve({status:res.statusCode,body:JSON.parse(d||'{}')})}catch{resolve({status:res.statusCode,body:d})} }); });
    req.on('error', reject); if (data) req.write(data); req.end();
  });
}

function pickPutBody(w) {
  const out = {};
  for (const k of ['name','nodes','connections','settings','staticData','pinData']) {
    const v = w[k];
    if (v === undefined || v === null) continue;
    if ((k === 'pinData' || k === 'staticData') && typeof v === 'object' && Object.keys(v).length === 0) continue;
    out[k] = v;
  }
  return out;
}

// Order:
//   1. Create the new HMAC webhook with a temp URL we'll never use, capture secret.
//   2. Caller swaps agent references / workspace-level wiring to the new id.
//   3. Caller deletes the old webhook (now unreferenced).
//   4. Patch the new webhook's URL to the canonical url (n8n endpoint).
// We do this rather than DELETE-then-CREATE because ElevenLabs blocks
// deletion of in-use webhooks and ALSO won't let two webhooks share a URL.
async function createReplacementWebhook(spec) {
  const tempUrl = `https://n8n.wranngle.com/_rotate_placeholder/${Date.now()}`;
  const cre = await fetch(`${ELABS}/v1/workspace/webhooks`, {
    method: 'POST', headers: elHeaders,
    body: JSON.stringify({ settings: { auth_type: 'hmac', name: spec.name + ' (rotated)', webhook_url: tempUrl } }),
  });
  const j = await cre.json();
  if (cre.status !== 200) throw new Error(`create ${spec.name} failed: ${cre.status} ${JSON.stringify(j)}`);
  return { newId: j.webhook_id, secret: j.webhook_secret };
}

async function deleteWebhook(id) {
  const r = await fetch(`${ELABS}/v1/workspace/webhooks/${id}`, { method: 'DELETE', headers: elHeaders });
  return r.status;
}

async function patchWebhookUrlAndName(id, name, url) {
  const r = await fetch(`${ELABS}/v1/workspace/webhooks/${id}`, {
    method: 'PATCH', headers: elHeaders,
    body: JSON.stringify({ name, webhook_url: url, is_disabled: false, webhook_auth: { type: 'hmac' } }),
  });
  if (r.status !== 200) throw new Error(`PATCH ${id} failed: ${r.status} ${await r.text()}`);
}

async function patchAgentWebhookRef(oldToNew) {
  const a = await (await fetch(`${ELABS}/v1/convai/agents/${AGENT_ID}`, { headers: elHeaders })).json();
  const wo = a?.platform_settings?.workspace_overrides || {};
  const cur = wo?.webhooks?.post_call_webhook_id;
  if (!cur || !oldToNew[cur]) {
    console.log('agent post_call_webhook_id:', cur, '(no remap needed)');
    return;
  }
  const next = { ...wo, webhooks: { ...wo.webhooks, post_call_webhook_id: oldToNew[cur] } };
  const r = await fetch(`${ELABS}/v1/convai/agents/${AGENT_ID}`, {
    method: 'PATCH', headers: elHeaders,
    body: JSON.stringify({ platform_settings: { workspace_overrides: next } }),
  });
  console.log('agent PATCH post_call_webhook_id:', cur, '->', oldToNew[cur], '|', r.status);
  if (r.status !== 200) console.log(await r.text());
}

function buildHmacGate(secret) {
  // Secret is inlined as a string literal. n8n DB already has full access to
  // workflow JSON; this avoids a second secret distribution channel.
  const literal = JSON.stringify(secret);
  return {
    id: 'hmac-verify',
    name: 'Verify ElevenLabs HMAC',
    type: 'n8n-nodes-base.code',
    typeVersion: 2,
    position: [0, 0], // overwritten below
    parameters: {
      jsCode: `// Verify ElevenLabs HMAC signature.
// Header: ElevenLabs-Signature: t=<unix>,v0=<sha256_hex>
// v0 = HMAC_SHA256(secret, t + '.' + raw_body_json)
const crypto = require('crypto');
const SECRET = ${literal};
const item = $input.first().json;
const headers = item.headers || {};
const sigHeader = headers['elevenlabs-signature'] || headers['ElevenLabs-Signature'] || '';
const parts = Object.fromEntries(sigHeader.split(',').map(p => { const i = p.indexOf('='); return [p.slice(0,i).trim(), p.slice(i+1).trim()]; }));
const t = parts.t;
const v0 = parts.v0;
if (!t || !v0) {
  return [{ json: { ...item, _hmac_ok: false, _hmac_error: 'malformed_signature_header' } }];
}
const ageSec = Math.abs(Math.floor(Date.now() / 1000) - Number(t));
if (!Number.isFinite(ageSec) || ageSec > 60 * 30) {
  return [{ json: { ...item, _hmac_ok: false, _hmac_error: 'stale_or_future_timestamp', _age_seconds: ageSec } }];
}
const body = JSON.stringify(item.body ?? {});
const expected = crypto.createHmac('sha256', SECRET).update(t + '.' + body).digest('hex');
let ok = false;
try {
  ok = v0.length === expected.length && crypto.timingSafeEqual(Buffer.from(v0), Buffer.from(expected));
} catch (_) { ok = false; }
return [{ json: { ...item, _hmac_ok: ok, _hmac_error: ok ? null : 'signature_mismatch' } }];
`,
    },
  };
}

const HMAC_BRANCH_NODE = {
  id: 'hmac-branch', name: 'HMAC: ok?', type: 'n8n-nodes-base.if', typeVersion: 2.2,
  position: [0, 0],
  parameters: {
    conditions: {
      options: { caseSensitive: true, leftValue: '', typeValidation: 'strict' },
      combinator: 'and',
      conditions: [{ id: 'h1', leftValue: '={{ $json._hmac_ok }}', rightValue: true, operator: { type: 'boolean', operation: 'equal' } }],
    },
    options: {},
  },
};

const HMAC_REJECT_NODE = {
  id: 'hmac-reject', name: 'HMAC: reject', type: 'n8n-nodes-base.respondToWebhook', typeVersion: 1.1,
  position: [0, 0],
  parameters: { respondWith: 'json', responseBody: '={{ { error: "UNAUTHORIZED", message: $json._hmac_error || "invalid_signature" } }}', options: { responseCode: 401 } },
};

function findWebhookNode(nodes) { return nodes.find(n => n.type === 'n8n-nodes-base.webhook'); }
function safeNodeName(name, taken) { let n = name, i = 2; while (taken.has(n)) { n = `${name} ${i++}`; } return n; }

async function patchN8nWorkflow(spec, secret) {
  const { body: w } = await n8nReq('GET', `/api/v1/workflows/${spec.n8nWorkflowId}`);
  if (!w?.nodes) throw new Error(`get ${spec.n8nWorkflowId} failed`);
  if (w.nodes.some(n => n.name === 'Verify ElevenLabs HMAC')) {
    console.log(`${spec.n8nWorkflowId}: HMAC gate already present, skipping`);
    return false;
  }
  const wh = findWebhookNode(w.nodes);
  if (!wh) throw new Error(`no webhook node in ${spec.n8nWorkflowId}`);

  const taken = new Set(w.nodes.map(n => n.name));
  const verify = buildHmacGate(secret);
  verify.name = safeNodeName(verify.name, taken); taken.add(verify.name);
  const branch = JSON.parse(JSON.stringify(HMAC_BRANCH_NODE));
  branch.name = safeNodeName(branch.name, taken); taken.add(branch.name);
  const reject = JSON.parse(JSON.stringify(HMAC_REJECT_NODE));
  reject.name = safeNodeName(reject.name, taken); taken.add(reject.name);

  const [x, y] = wh.position || [0, 0];
  verify.position = [x + 220, y];
  branch.position = [x + 440, y];
  reject.position = [x + 660, y + 120];

  // Capture webhook's existing outgoing connections, route them via branch.true
  const existingOut = (w.connections?.[wh.name]?.main || []).map(arr => arr.slice());
  w.connections = w.connections || {};
  w.connections[wh.name] = { main: [[{ node: verify.name, type: 'main', index: 0 }]] };
  w.connections[verify.name] = { main: [[{ node: branch.name, type: 'main', index: 0 }]] };
  w.connections[branch.name] = {
    main: [
      existingOut[0] || [],
      [{ node: reject.name, type: 'main', index: 0 }],
    ],
  };

  w.nodes.push(verify, branch, reject);

  if (!APPLY) { console.log(`${spec.n8nWorkflowId}: would insert HMAC gate`); return false; }

  const wasActive = w.active !== false;
  if (wasActive) await n8nReq('POST', `/api/v1/workflows/${spec.n8nWorkflowId}/deactivate`);
  const pr = await n8nReq('PUT', `/api/v1/workflows/${spec.n8nWorkflowId}`, pickPutBody(w));
  if (pr.status !== 200) {
    console.log(`${spec.n8nWorkflowId}: PUT failed`, pr.status, JSON.stringify(pr.body).slice(0,300));
    if (wasActive) await n8nReq('POST', `/api/v1/workflows/${spec.n8nWorkflowId}/activate`);
    return false;
  }
  if (wasActive) await n8nReq('POST', `/api/v1/workflows/${spec.n8nWorkflowId}/activate`);
  console.log(`${spec.n8nWorkflowId}: HMAC gate inserted`);
  return true;
}

function appendEnv(kv) {
  const file = path.join(os.homedir(), '.agents', '.env');
  let body = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
  const lines = body.split('\n');
  let dirty = false;
  for (const [k, v] of Object.entries(kv)) {
    const idx = lines.findIndex(l => l.startsWith(`${k}=`));
    if (idx >= 0) { if (lines[idx] !== `${k}=${v}`) { lines[idx] = `${k}=${v}`; dirty = true; } }
    else { lines.push(`${k}=${v}`); dirty = true; }
  }
  if (dirty) {
    if (lines[lines.length - 1] !== '') lines.push('');
    fs.writeFileSync(file, lines.join('\n'));
  }
}

(async () => {
  console.log(APPLY ? '== APPLYING ==' : '== DRY RUN ==');

  const oldToNew = {};
  const envWrites = {};
  const secretByWorkflow = {};

  // Step A: create replacement webhooks at temp URLs, capture secrets
  for (const spec of WEBHOOKS) {
    if (!APPLY) { console.log(`would create replacement for ${spec.name} (${spec.oldId})`); secretByWorkflow[spec.n8nWorkflowId] = '<DRY_RUN>'; continue; }
    const { newId, secret } = await createReplacementWebhook(spec);
    oldToNew[spec.oldId] = newId;
    envWrites[spec.envVar] = secret;
    secretByWorkflow[spec.n8nWorkflowId] = secret;
    console.log(`created replacement for ${spec.name}: ${spec.oldId} -> ${newId}`);
  }

  if (APPLY) appendEnv(envWrites);

  // Step B: repoint agent references at new ids
  if (APPLY) await patchAgentWebhookRef(oldToNew);

  // Step C: delete the old webhooks (now unreferenced) so the canonical URLs free up
  if (APPLY) {
    for (const spec of WEBHOOKS) {
      const s = await deleteWebhook(spec.oldId);
      console.log(`delete ${spec.oldId} (${spec.name}): ${s}`);
      if (s !== 200) console.log('  (still in use? unbind manually if so — we proceed with canonical URL handoff anyway)');
    }
  }

  // Step D: PATCH the new webhooks to take over the canonical URLs
  if (APPLY) {
    for (const spec of WEBHOOKS) {
      const newId = oldToNew[spec.oldId];
      await patchWebhookUrlAndName(newId, spec.name, spec.url);
      console.log(`patched ${newId} to canonical url ${spec.url}`);
    }
  }

  // Step E: inject the HMAC verification gate into the n8n workflow
  for (const spec of WEBHOOKS) {
    await patchN8nWorkflow(spec, secretByWorkflow[spec.n8nWorkflowId]);
  }
})().catch(e => { console.error('FATAL:', e); process.exit(1); });
