#!/usr/bin/env node
'use strict';

const { parseArgs, run } = require('../lib/uninstall');

function usage() {
  process.stderr.write([
    'Usage: bin/uninstall-workflow.js (--id <id> | --name <name>) [--n8n-url <url>] [--api-key <key>] [--dry-run]',
    '  Reverses scripts/install-workflow.js: looks up matching workflows on',
    '  the remote n8n instance and DELETEs each. --dry-run prints the exact',
    '  API calls without mutating anything.',
    '  --n8n-url and --api-key may also be supplied via N8N_URL / N8N_API_KEY.',
    '',
  ].join('\n'));
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.flags.help || args.flags.h) {
    usage();
    process.exit(0);
  }
  const n8nUrl = args.flags['n8n-url'] || process.env.N8N_URL;
  const apiKey = args.flags['api-key'] || process.env.N8N_API_KEY;
  const id = args.flags.id && args.flags.id !== true ? args.flags.id : undefined;
  const name = args.flags.name && args.flags.name !== true ? args.flags.name : undefined;
  const dryRun = Boolean(args.flags['dry-run']);

  if (!n8nUrl || !apiKey || (!id && !name)) {
    usage();
    process.exit(2);
  }

  const result = await run({ n8nUrl, apiKey, id, name, dryRun });
  process.exit(result.code);
}

if (require.main === module) {
  main().catch((err) => {
    process.stderr.write(`uninstall-workflow: ${err.message}\n`);
    process.exit(1);
  });
}

module.exports = { main };
