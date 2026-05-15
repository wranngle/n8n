#!/usr/bin/env node
// drift detector: compares workflows deployed on an n8n instance against the
// JSON files tracked in this repo and writes a markdown report.
// Usage: node bin/drift.js --n8n-url <url> --api-key <key> [--workflows-dir <path>] [--out <file>]

const fs = require('fs');
const path = require('path');
const { runDrift } = require('../lib/drift');

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

function usage() {
  console.error('Usage: node bin/drift.js --n8n-url <url> --api-key <key> [--workflows-dir <path>] [--out <file>]');
  console.error('  Compares deployed workflows (GET /rest/workflows) against repo JSON files.');
  console.error('  Writes a markdown report with Only on instance / Only in repo / Modified sections.');
  console.error('  --n8n-url / --api-key may also be supplied via N8N_URL / N8N_API_KEY env vars.');
  console.error('  --workflows-dir defaults to ./workflows. --out defaults to ./drift.md.');
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const n8nUrl = args.flags['n8n-url'] || process.env.N8N_URL;
  const apiKey = args.flags['api-key'] || process.env.N8N_API_KEY;
  const workflowsDir = path.resolve(args.flags['workflows-dir'] || './workflows');
  const outPath = path.resolve(args.flags['out'] || './drift.md');

  if (!n8nUrl || !apiKey) {
    usage();
    process.exit(2);
  }

  const { drift, report } = await runDrift({ n8nUrl, apiKey, workflowsDir });
  fs.writeFileSync(outPath, report);

  const total = drift.onlyOnInstance.length + drift.onlyInRepo.length + drift.modified.length;
  console.log(`wrote ${outPath}`);
  console.log(`only-on-instance=${drift.onlyOnInstance.length} only-in-repo=${drift.onlyInRepo.length} modified=${drift.modified.length}`);
  process.exit(total === 0 ? 0 : 1);
}

if (require.main === module) {
  main().catch((err) => {
    console.error('drift:', err.message);
    process.exit(1);
  });
}

module.exports = { parseArgs };
