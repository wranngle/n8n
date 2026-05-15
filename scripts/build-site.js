#!/usr/bin/env node
/**
 * build-site.js — emit one fork-landing HTML page per workflow.
 *
 * Walks `workflows/` for *.json files, filters to entries that look like
 * actual n8n workflows (have `name` + `nodes[]`), and renders
 * `dist/site/<slug>/index.html` from `templates/workflow-page.html`.
 *
 * Each page carries:
 *   - Download `.json` link (copies the source workflow next to the page)
 *   - Screenshot placeholder (`screenshot.svg`, generated inline)
 *   - Problem statement (from registry `description` if available, else first
 *     non-trigger node label, else generic fallback)
 *
 * Determinism: pages are sorted by slug, the template is rendered with a
 * fixed token map, and no timestamps leak into output. Re-runs against an
 * unchanged tree produce a byte-identical `dist/site/`.
 *
 * Companion to round-1 #24 (synthetic fixtures): if `fixtures/<slug>.json`
 * exists it is linked from the page as a "Sample payload" anchor so the
 * fork story is end-to-end (clone the workflow + a deterministic payload).
 */

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const WORKFLOWS_DIR = path.join(ROOT, 'workflows');
const FIXTURES_DIR = path.join(ROOT, 'fixtures');
const TEMPLATE_PATH = path.join(ROOT, 'templates', 'workflow-page.html');
const OUT_DIR = path.join(ROOT, 'dist', 'site');

function walkJson(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir).sort()) {
    const full = path.join(dir, entry);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      walkJson(full, out);
    } else if (entry.endsWith('.json')) {
      out.push(full);
    }
  }
  return out;
}

function loadWorkflow(file) {
  const parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
  if (!parsed || typeof parsed !== 'object') return null;
  if (typeof parsed.name !== 'string' || !Array.isArray(parsed.nodes)) {
    return null;
  }
  return parsed;
}

function slugify(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
}

function inferProblem(workflow) {
  const triggerHints = ['trigger', 'webhook', 'cron', 'schedule', 'manual'];
  const firstReal = (workflow.nodes || []).find((n) => {
    const t = String(n.type || '').toLowerCase();
    const name = String(n.name || '').toLowerCase();
    return !triggerHints.some((h) => t.includes(h) || name.includes(h));
  });
  if (firstReal && typeof firstReal.name === 'string') {
    return `Automates "${firstReal.name}" downstream of an inbound trigger.`;
  }
  return 'Reusable n8n automation. Clone, configure credentials, deploy.';
}

function renderScreenshotSvg(workflow) {
  const nodes = Array.isArray(workflow.nodes) ? workflow.nodes : [];
  const count = nodes.length;
  const labels = nodes
    .slice(0, 6)
    .map((n, i) => {
      const label = String(n.name || `node-${i}`).slice(0, 24);
      const safe = label.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      const x = 40 + i * 100;
      return `<g transform="translate(${x},120)"><rect width="80" height="40" rx="6" fill="#1f2937" stroke="#60a5fa"/><text x="40" y="24" font-family="monospace" font-size="10" fill="#e5e7eb" text-anchor="middle">${safe}</text></g>`;
    })
    .join('');
  const title = String(workflow.name || 'workflow')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 240" role="img" aria-label="${title} preview"><rect width="720" height="240" fill="#0f172a"/><text x="40" y="50" font-family="monospace" font-size="18" fill="#f1f5f9">${title}</text><text x="40" y="80" font-family="monospace" font-size="12" fill="#94a3b8">${count} node${count === 1 ? '' : 's'} — placeholder preview</text>${labels}</svg>`;
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function fillTemplate(tpl, vars) {
  return tpl.replace(/\{\{\s*([A-Z_]+)\s*\}\}/g, (_, key) => {
    if (!(key in vars)) {
      throw new Error(`build-site: template references unknown var {{${key}}}`);
    }
    return vars[key];
  });
}

function rmrf(dir) {
  if (!fs.existsSync(dir)) return;
  fs.rmSync(dir, { recursive: true, force: true });
}

function main() {
  const dryRun = process.argv.includes('--dry-run');
  if (!fs.existsSync(TEMPLATE_PATH)) {
    console.error(`build-site: missing template at ${path.relative(ROOT, TEMPLATE_PATH)}`);
    process.exit(2);
  }
  const template = fs.readFileSync(TEMPLATE_PATH, 'utf8');

  const candidates = walkJson(WORKFLOWS_DIR);
  const pages = [];
  for (const file of candidates) {
    const wf = loadWorkflow(file);
    if (!wf) continue;
    const slug = slugify(wf.name);
    if (!slug) continue;
    pages.push({ slug, wf, source: file });
  }
  pages.sort((a, b) => a.slug.localeCompare(b.slug));

  if (dryRun) {
    for (const p of pages) console.log(`would emit dist/site/${p.slug}/index.html`);
    console.log(`build-site: ${pages.length} page(s) (dry-run)`);
    return;
  }

  rmrf(OUT_DIR);
  fs.mkdirSync(OUT_DIR, { recursive: true });

  for (const { slug, wf, source } of pages) {
    const dir = path.join(OUT_DIR, slug);
    fs.mkdirSync(dir, { recursive: true });

    const jsonName = `${slug}.json`;
    fs.copyFileSync(source, path.join(dir, jsonName));

    fs.writeFileSync(path.join(dir, 'screenshot.svg'), renderScreenshotSvg(wf));

    const fixturePath = path.join(FIXTURES_DIR, `${slug}.json`);
    const hasFixture = fs.existsSync(fixturePath);
    if (hasFixture) {
      fs.copyFileSync(fixturePath, path.join(dir, 'sample-payload.json'));
    }

    const html = fillTemplate(template, {
      TITLE: escapeHtml(wf.name),
      SLUG: escapeHtml(slug),
      PROBLEM: escapeHtml(inferProblem(wf)),
      NODE_COUNT: String(wf.nodes.length),
      JSON_HREF: escapeHtml(jsonName),
      SCREENSHOT_HREF: 'screenshot.svg',
      FIXTURE_BLOCK: hasFixture
        ? `<p class="fixture"><a href="sample-payload.json">Sample payload (deterministic fixture)</a></p>`
        : '<!-- no fixture available -->',
    });
    fs.writeFileSync(path.join(dir, 'index.html'), html);
  }

  const index = pages
    .map((p) => `<li><a href="${escapeHtml(p.slug)}/">${escapeHtml(p.wf.name)}</a></li>`)
    .join('\n');
  fs.writeFileSync(
    path.join(OUT_DIR, 'index.html'),
    `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Fork a workflow</title></head><body><h1>Fork an n8n workflow</h1><ul>\n${index}\n</ul></body></html>\n`,
  );

  console.log(`build-site: emitted ${pages.length} page(s) to ${path.relative(ROOT, OUT_DIR)}`);
}

main();
