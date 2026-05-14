#!/usr/bin/env node
/**
 * generate-readme-table.js — Render the security audit badge table into README.md.
 *
 * Reads workflows/registry.yaml, validates that every workflow entry has a
 * `security.audited` (ISO 8601 date) and `security.scanner` string, then
 * rewrites the section of README.md between the markers:
 *
 *   <!-- BEGIN SECURITY AUDIT TABLE -->
 *   <!-- END SECURITY AUDIT TABLE -->
 *
 * Badge colour rule (deterministic, no runtime clock surprises):
 *   audited within 90 days of FRESHNESS_REFERENCE_DATE → green
 *   older or missing                                   → red
 *
 * FRESHNESS_REFERENCE_DATE is the max audited date across the registry, so
 * the generator's output is a pure function of the registry file. Override
 * with --reference-date=YYYY-MM-DD for tests.
 *
 * Flags:
 *   --check          validate + assert README is up-to-date; exit non-zero on diff
 *   --reference-date=YYYY-MM-DD  pin freshness comparison point
 *
 * Exits 0 on success, 1 on validation failure, 2 on stale README under --check.
 */

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const ROOT = path.join(__dirname, '..');
const REGISTRY_PATH = path.join(ROOT, 'workflows', 'registry.yaml');
const README_PATH = path.join(ROOT, 'README.md');
const BEGIN_MARKER = '<!-- BEGIN SECURITY AUDIT TABLE -->';
const END_MARKER = '<!-- END SECURITY AUDIT TABLE -->';
const FRESH_DAYS = 90;
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function parseArgs(argv) {
  const opts = { check: false, referenceDate: null };
  for (const arg of argv.slice(2)) {
    if (arg === '--check') opts.check = true;
    else if (arg.startsWith('--reference-date=')) opts.referenceDate = arg.split('=')[1];
    else if (arg === '-h' || arg === '--help') {
      process.stdout.write('usage: generate-readme-table.js [--check] [--reference-date=YYYY-MM-DD]\n');
      process.exit(0);
    } else {
      process.stderr.write(`unknown flag: ${arg}\n`);
      process.exit(64);
    }
  }
  return opts;
}

function loadRegistry() {
  const raw = fs.readFileSync(REGISTRY_PATH, 'utf8');
  const data = yaml.load(raw);
  if (!data || typeof data !== 'object' || !data.workflows) {
    throw new Error('registry.yaml is missing the top-level `workflows:` map');
  }
  return data;
}

function validateSecurity(workflows) {
  const violations = [];
  for (const [slug, entry] of Object.entries(workflows)) {
    if (!entry || typeof entry !== 'object') {
      violations.push(`${slug}: not an object`);
      continue;
    }
    const sec = entry.security;
    if (!sec || typeof sec !== 'object') {
      violations.push(`${slug}: missing security block`);
      continue;
    }
    if (typeof sec.audited !== 'string' || !ISO_DATE_RE.test(sec.audited)) {
      violations.push(`${slug}: security.audited must be ISO YYYY-MM-DD, got ${JSON.stringify(sec.audited)}`);
    }
    if (typeof sec.scanner !== 'string' || sec.scanner.length === 0) {
      violations.push(`${slug}: security.scanner must be a non-empty string`);
    }
  }
  return violations;
}

function parseDateUTC(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return Date.UTC(y, m - 1, d);
}

function pickReferenceDate(workflows, overrideISO) {
  if (overrideISO) {
    if (!ISO_DATE_RE.test(overrideISO)) {
      throw new Error(`--reference-date must be YYYY-MM-DD, got ${overrideISO}`);
    }
    return overrideISO;
  }
  let maxMs = 0;
  let maxIso = null;
  for (const entry of Object.values(workflows)) {
    const iso = entry?.security?.audited;
    if (!iso || !ISO_DATE_RE.test(iso)) continue;
    const ms = parseDateUTC(iso);
    if (ms > maxMs) {
      maxMs = ms;
      maxIso = iso;
    }
  }
  if (!maxIso) throw new Error('no valid security.audited dates found in registry');
  return maxIso;
}

function badge(auditedIso, referenceIso) {
  const ageDays = (parseDateUTC(referenceIso) - parseDateUTC(auditedIso)) / 86400000;
  if (ageDays < 0) return 'unknown';
  return ageDays <= FRESH_DAYS ? 'green' : 'red';
}

function badgeMarkdown(color, auditedIso) {
  // shields.io reads `-` as field separator and `--` as a literal hyphen,
  // so we escape the date's hyphens before splicing it into the URL.
  const escaped = auditedIso.replace(/-/g, '--');
  if (color === 'green') return `![audited](https://img.shields.io/badge/audited-${escaped}-brightgreen)`;
  if (color === 'red') return `![stale](https://img.shields.io/badge/audited-${escaped}-red)`;
  return `![pending](https://img.shields.io/badge/audited-${escaped}-lightgrey)`;
}

function renderTable(workflows, referenceIso) {
  const rows = Object.keys(workflows).sort().map((slug) => {
    const entry = workflows[slug];
    const sec = entry.security;
    const color = badge(sec.audited, referenceIso);
    return `| \`${slug}\` | ${badgeMarkdown(color, sec.audited)} | ${sec.scanner} |`;
  });
  const lines = [
    '',
    `_Freshness reference: ${referenceIso}. Entries audited within the last ${FRESH_DAYS} days render green._`,
    '',
    '| Workflow | Audit status | Scanner |',
    '| --- | --- | --- |',
    ...rows,
    '',
  ];
  return lines.join('\n');
}

function spliceReadme(currentReadme, table) {
  const beginIdx = currentReadme.indexOf(BEGIN_MARKER);
  const endIdx = currentReadme.indexOf(END_MARKER);
  if (beginIdx === -1 || endIdx === -1 || endIdx < beginIdx) {
    throw new Error(`README.md is missing the ${BEGIN_MARKER} / ${END_MARKER} markers`);
  }
  const before = currentReadme.slice(0, beginIdx + BEGIN_MARKER.length);
  const after = currentReadme.slice(endIdx);
  return `${before}\n${table}${after}`;
}

function main() {
  const opts = parseArgs(process.argv);
  const registry = loadRegistry();
  const violations = validateSecurity(registry.workflows);
  if (violations.length > 0) {
    process.stderr.write('registry security validation failed:\n');
    for (const v of violations) process.stderr.write(`  - ${v}\n`);
    process.exit(1);
  }
  const referenceIso = pickReferenceDate(registry.workflows, opts.referenceDate);
  const table = renderTable(registry.workflows, referenceIso);
  const currentReadme = fs.readFileSync(README_PATH, 'utf8');
  const nextReadme = spliceReadme(currentReadme, table);

  if (opts.check) {
    if (currentReadme === nextReadme) {
      process.stdout.write(`README security audit table is up to date (${Object.keys(registry.workflows).length} workflows, reference=${referenceIso})\n`);
      process.exit(0);
    }
    process.stderr.write('README security audit table is stale — re-run scripts/generate-readme-table.js\n');
    process.exit(2);
  }

  if (currentReadme !== nextReadme) {
    fs.writeFileSync(README_PATH, nextReadme);
  }
  process.stdout.write(`wrote security audit table (${Object.keys(registry.workflows).length} workflows, reference=${referenceIso})\n`);
}

main();
