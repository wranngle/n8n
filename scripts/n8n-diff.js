#!/usr/bin/env node
// n8n-diff: render a human-readable markdown diff between two workflow JSON files.
// Usage: node scripts/n8n-diff.js <a.json> <b.json> [--out diff.md]

const fs = require('fs');
const path = require('path');
const { diffWorkflows } = require('./lib/diff/index.js');
const { renderMarkdown } = require('./lib/diff/render.js');

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
  console.error('Usage: node scripts/n8n-diff.js <a.json> <b.json> [--out diff.md]');
  console.error('  Renders a markdown diff between two n8n workflow JSON files.');
}

function loadWorkflow(p) {
  const raw = fs.readFileSync(p, 'utf8');
  return JSON.parse(raw);
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.positional.length < 2) {
    usage();
    process.exit(2);
  }
  const [aPath, bPath] = args.positional;
  const a = loadWorkflow(aPath);
  const b = loadWorkflow(bPath);
  const diff = diffWorkflows(a, b);
  const md = renderMarkdown(diff, {
    aLabel: path.basename(aPath),
    bLabel: path.basename(bPath),
  });
  if (typeof args.flags.out === 'string') {
    fs.writeFileSync(args.flags.out, md);
  } else {
    process.stdout.write(md);
  }
}

main();
