#!/usr/bin/env node
/**
 * Convert a live n8n workflow export into a reusable library artifact.
 *
 * The converter removes runtime-only fields, credential references, pinned data,
 * webhook IDs, instance IDs, and static data. Optional URL replacements let a
 * caller map tenant-specific endpoints to env-backed expressions.
 */

const fs = require('fs');
const path = require('path');

const RUNTIME_KEYS = new Set(['credentials', 'pinData', 'webhookId', 'staticData']);

function usage() {
  console.error(`Usage: node scripts/convert-workflow.js <input.json> <output.json> [options]

Options:
  --name <workflow name>                 Override top-level workflow name
  --replace-url <from=to>                Replace exact URL/string values; can be repeated
  --strip-notes                          Remove node notes
  --pretty <spaces>                      JSON indentation, default 2
`);
}

function parseArgs(argv) {
  const args = {replacements: [], pretty: 2, stripNotes: false};
  const positional = [];

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--name') {
      args.name = argv[++i];
    } else if (arg === '--replace-url') {
      const value = argv[++i];
      const eq = value ? value.indexOf('=') : -1;
      if (eq <= 0) {
        throw new Error('--replace-url requires from=to');
      }
      args.replacements.push([value.slice(0, eq), value.slice(eq + 1)]);
    } else if (arg === '--strip-notes') {
      args.stripNotes = true;
    } else if (arg === '--pretty') {
      const value = Number(argv[++i]);
      if (!Number.isInteger(value) || value < 0 || value > 8) {
        throw new Error('--pretty must be an integer from 0 to 8');
      }
      args.pretty = value;
    } else if (arg.startsWith('--')) {
      throw new Error(`Unknown option: ${arg}`);
    } else {
      positional.push(arg);
    }
  }

  if (positional.length !== 2) {
    throw new Error('Expected input and output paths');
  }

  args.input = positional[0];
  args.output = positional[1];
  return args;
}

function scrub(value, options) {
  if (Array.isArray(value)) {
    return value.map(item => scrub(item, options));
  }

  if (!value || typeof value !== 'object') {
    return scrubScalar(value, options);
  }

  const result = {};
  for (const [key, child] of Object.entries(value)) {
    if (RUNTIME_KEYS.has(key)) {
      continue;
    }
    if (key === 'id' && !options.keepIds && options.inNode !== true) {
      continue;
    }
    if (key === 'instanceId') {
      continue;
    }
    if (key === 'meta' && child && typeof child === 'object') {
      const meta = scrub(child, options);
      delete meta.instanceId;
      if (Object.keys(meta).length > 0) {
        result[key] = meta;
      }
      continue;
    }
    if (options.stripNotes && key === 'notes') {
      continue;
    }

    const childOptions = {...options, inNode: key === 'nodes' ? false : options.inNode};
    if (Array.isArray(value.nodes) && key === 'nodes') {
      result[key] = child.map(node => scrub(node, {...options, inNode: true, keepIds: true}));
    } else {
      result[key] = scrub(child, childOptions);
    }
  }
  return result;
}

function scrubScalar(value, options) {
  if (typeof value !== 'string') {
    return value;
  }

  let next = value;
  for (const [from, to] of options.replacements) {
    next = next.split(from).join(to);
  }
  return next;
}

function main() {
  let args;
  try {
    args = parseArgs(process.argv.slice(2));
  } catch (error) {
    usage();
    console.error(error.message);
    process.exit(2);
  }

  const inputPath = path.resolve(args.input);
  const outputPath = path.resolve(args.output);
  const workflow = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
  const converted = scrub(workflow, args);
  delete converted.active;
  delete converted.tags;

  if (args.name) {
    converted.name = args.name;
  }

  fs.mkdirSync(path.dirname(outputPath), {recursive: true});
  fs.writeFileSync(outputPath, `${JSON.stringify(converted, null, args.pretty)}\n`);
  console.log(`Converted ${path.relative(process.cwd(), inputPath)} -> ${path.relative(process.cwd(), outputPath)}`);
}

main();
