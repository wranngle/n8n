#!/usr/bin/env node
// Deterministic generator for docs/install-demo.mp4 — a slide-based walkthrough of
// `scripts/install-workflow.js` + per-workflow fixture invocation. Renders text slides
// with ffmpeg drawtext, concatenates them, and emits a single MP4 ≤90s / ≤10MB.

import {spawnSync} from 'node:child_process';
import {mkdirSync, writeFileSync, statSync, existsSync, rmSync} from 'node:fs';
import {dirname, join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, '..');
const outDir = join(repoRoot, 'docs');
const outFile = join(outDir, 'install-demo.mp4');
const workDir = join(repoRoot, '.work', 'install-demo');

const fontCandidates = [
  '/usr/share/fonts/truetype/dejavu/DejaVuSansMono-Bold.ttf',
  '/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf',
  '/usr/share/fonts/truetype/liberation/LiberationMono-Bold.ttf',
  '/usr/share/fonts/truetype/ubuntu/UbuntuMono[wght].ttf',
];

function pickFont() {
  for (const candidate of fontCandidates) {
    if (existsSync(candidate)) return candidate;
  }
  throw new Error('No monospace font found; install ttf-dejavu or liberation-mono-fonts.');
}

const slides = [
  {
    title: 'n8n Workflow Library',
    body: [
      'sanitized, ready-to-import flows',
      '40 reusable workflows · governance YAML',
      'one-click install path',
    ],
    seconds: 5,
    accent: '0x00b894',
  },
  {
    title: '1. Browse the registry',
    body: [
      '$ cat workflows/registry.yaml | grep slug',
      '  slug: lead-intake-main',
      '  slug: lead-enrichment-microservice',
      '  slug: workflow-test-data-table-api',
    ],
    seconds: 6,
    accent: '0x4a90e2',
  },
  {
    title: '2. Generate synthetic fixture',
    body: [
      '$ node scripts/generate-fixtures.js',
      '  -> fixtures/lead-intake-main.json',
      '  -> fixtures/lead-enrichment-microservice.json',
      '  deterministic · idempotent · valid JSON',
    ],
    seconds: 8,
    accent: '0xf39c12',
  },
  {
    title: '3. Install into local n8n',
    body: [
      '$ node scripts/install-workflow.js lead-intake-main \\',
      '    --n8n-url http://localhost:5678 \\',
      '    --api-key $N8N_API_KEY',
      '  POST /rest/workflows -> 201 Created',
      '  workflow id: 8f3c2e (DEV phase)',
    ],
    seconds: 10,
    accent: '0x9b59b6',
  },
  {
    title: '4. Invoke with the fixture',
    body: [
      '$ curl -X POST http://localhost:5678/webhook/lead-intake \\',
      '    -H "X-Webhook-Secret: $N8N_WEBHOOK_SECRET" \\',
      '    -d @fixtures/lead-intake-main.json',
      '  HTTP/1.1 200 OK',
      '  {"status":"queued","lead_id":"L-0001"}',
    ],
    seconds: 12,
    accent: '0xe67e22',
  },
  {
    title: '5. Verify governance',
    body: [
      '$ node scripts/governance-engine.js --check',
      '  [PASS] phase tag present (DEV)',
      '  [PASS] webhook auth required',
      '  [PASS] secrets scrubbed',
      '  workflow ready for review',
    ],
    seconds: 8,
    accent: '0x27ae60',
  },
  {
    title: 'Done.',
    body: [
      'workflow imported · fixture validated',
      'governance passing · ready to ship',
      'github.com/wranngle/n8n',
    ],
    seconds: 5,
    accent: '0x2c3e50',
  },
];

const totalSeconds = slides.reduce((sum, s) => sum + s.seconds, 0);
const width = 1280;
const height = 720;
const fps = 24;
const font = pickFont();

function escapeForDrawtext(text) {
  return text
    .replace(/\\/g, '\\\\\\\\')
    .replace(/:/g, '\\\\:')
    .replace(/'/g, "\\\\\\'")
    .replace(/%/g, '\\\\%')
    .replace(/,/g, '\\,')
    .replace(/\[/g, '\\\\[')
    .replace(/\]/g, '\\\\]');
}

function buildSlideFilter(slide) {
  const titleY = 120;
  const bodyStartY = 240;
  const lineSpacing = 56;
  const filters = [];
  filters.push(
    [
      `drawbox=x=0:y=0:w=${width}:h=8:color=${slide.accent}:t=fill`,
      `drawbox=x=0:y=${height - 8}:w=${width}:h=8:color=${slide.accent}:t=fill`,
    ].join(','),
  );
  filters.push(
    `drawtext=fontfile='${font}':text='${escapeForDrawtext(slide.title)}':fontcolor=white:fontsize=44:x=80:y=${titleY}`,
  );
  slide.body.forEach((line, index) => {
    filters.push(
      `drawtext=fontfile='${font}':text='${escapeForDrawtext(line)}':fontcolor=0xd0d6dc:fontsize=26:x=80:y=${bodyStartY + index * lineSpacing}`,
    );
  });
  filters.push(
    `drawtext=fontfile='${font}':text='wranngle/n8n':fontcolor=0x7f8c8d:fontsize=18:x=${width - 200}:y=${height - 50}`,
  );
  return filters.join(',');
}

function renderSlide(slide, index) {
  const segmentFile = join(workDir, `slide-${String(index).padStart(2, '0')}.mp4`);
  const filterChain = buildSlideFilter(slide);
  const args = [
    '-y',
    '-hide_banner',
    '-loglevel', 'error',
    '-f', 'lavfi',
    '-i', `color=c=0x1a1f24:s=${width}x${height}:d=${slide.seconds}:r=${fps}`,
    '-vf', filterChain,
    '-c:v', 'libx264',
    '-preset', 'medium',
    '-crf', '28',
    '-pix_fmt', 'yuv420p',
    '-r', String(fps),
    '-movflags', '+faststart',
    segmentFile,
  ];
  const result = spawnSync('ffmpeg', args, {stdio: 'inherit'});
  if (result.status !== 0) throw new Error(`ffmpeg failed on slide ${index}`);
  return segmentFile;
}

function concatSegments(segmentFiles) {
  const listPath = join(workDir, 'concat-list.txt');
  writeFileSync(listPath, segmentFiles.map((file) => `file '${file}'`).join('\n') + '\n');
  const args = [
    '-y',
    '-hide_banner',
    '-loglevel', 'error',
    '-f', 'concat',
    '-safe', '0',
    '-i', listPath,
    '-c', 'copy',
    '-movflags', '+faststart',
    outFile,
  ];
  const result = spawnSync('ffmpeg', args, {stdio: 'inherit'});
  if (result.status !== 0) throw new Error('ffmpeg concat failed');
}

function main() {
  if (totalSeconds > 90) {
    throw new Error(`Slide budget exceeds 90s (${totalSeconds}s). Adjust slides[].seconds.`);
  }
  rmSync(workDir, {recursive: true, force: true});
  mkdirSync(workDir, {recursive: true});
  mkdirSync(outDir, {recursive: true});
  const segmentFiles = slides.map((slide, index) => renderSlide(slide, index));
  concatSegments(segmentFiles);
  const sizeBytes = statSync(outFile).size;
  const sizeMb = sizeBytes / (1024 * 1024);
  if (sizeMb > 10) {
    throw new Error(`Output exceeds 10MB budget: ${sizeMb.toFixed(2)}MB. Tune CRF/resolution.`);
  }
  console.log(`wrote ${outFile} (${sizeMb.toFixed(2)}MB, ${totalSeconds}s, ${slides.length} slides)`);
}

main();
