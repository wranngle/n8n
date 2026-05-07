#!/usr/bin/env bun
/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * HOOK: detect_hardcoded_keys.js
 * EVENT: PreToolUse
 * PURPOSE: Detect hardcoded API keys in code files
 * ENFORCEMENT: BLOCKING
 *
 * PATTERNS DETECTED:
 * - ElevenLabs: sk_[a-f0-9]{40,}
 * - OpenAI: sk-[a-zA-Z0-9]{40,}
 * - Twilio SID: AC[a-f0-9]{32}
 * - Generic long hex: [a-f0-9]{32,}
 */

const {logHook, readStdinJson, outputResult} = require('../hook_utils');

// Type definitions
type DetectedKey = {
  name: string;
  matches: number;
  envVar: string;
  loadCode: string;
};

// API key patterns (only detect in code files, not .env files)
const KEY_PATTERNS = [
  {
    name: 'ElevenLabs',
    pattern: /sk_[a-f\d]{40,}/g,
    envVar: 'ELEVENLABS_API_KEY',
    loadCode: 'process.env.ELEVENLABS_API_KEY || require(\'./load-env\')().ELEVENLABS_API_KEY',
  },
  {
    name: 'OpenAI',
    pattern: /sk-[a-zA-Z\d]{40,}/g,
    envVar: 'OPENAI_API_KEY',
    loadCode: 'process.env.OPENAI_API_KEY',
  },
  {
    name: 'Twilio SID',
    pattern: /AC[a-f\d]{32}/g,
    envVar: 'TWILIO_ACCOUNT_SID',
    loadCode: 'process.env.TWILIO_ACCOUNT_SID',
  },
  {
    name: 'Generic API Key',
    pattern: /['"][a-f\d]{32,}['"]/g,
    envVar: 'API_KEY',
    loadCode: 'process.env.API_KEY',
  },
];

// File extensions that are code files
const CODE_EXTENSIONS = ['.js', '.ts', '.mjs', '.cjs', '.jsx', '.tsx', '.py', '.ps1'];

async function main() {
  logHook('detect-hardcoded-keys', 'Hook triggered');

  try {
    const data = await readStdinJson();
    const toolInput = data.tool_input || {};
    const filePath = toolInput.file_path || toolInput.path || '';
    const content = toolInput.content || '';

    // Skip non-code files and .env files
    const ext = filePath.slice(Math.max(0, filePath.lastIndexOf('.')));
    if (!CODE_EXTENSIONS.includes(ext) || filePath.includes('.env')) {
      outputResult({continue: true});
      process.exit(0);
      return;
    }

    // Check for hardcoded keys
    const detectedKeys: DetectedKey[] = [];
    for (const {name, pattern, envVar, loadCode} of KEY_PATTERNS) {
      const matches = content.match(pattern);
      if (matches) {
        detectedKeys.push({
          name, matches: matches.length, envVar, loadCode,
        });
      }
    }

    if (detectedKeys.length > 0) {
      const report = detectedKeys.map(k =>
        `- ${k.name}: ${k.matches} occurrence(s) → Use ${k.envVar} or ${k.loadCode}`).join('\n');

      outputResult({
        continue: false,
        message: `🚨 HARDCODED API KEY DETECTED

${report}

BLOCKED: Do not hardcode API keys in source files.

FIX: Load from environment or ~/.claude/.env:
\`\`\`javascript
import * as fs from 'node:fs';
import * as path from 'node:path';

function loadEnvFile(envPath) {
  try {
    const content = fs.readFileSync(envPath, 'utf-8');
    const env = {};
    for (const line of content.split('\\n')) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const [key, ...valueParts] = trimmed.split('=');
        if (key) env[key.trim()] = valueParts.join('=').trim();
      }
    }
    return env;
  } catch { return {}; }
}

const envFile = loadEnvFile(path.join(process.env.USERPROFILE || process.env.HOME, '.claude', '.env'));
const API_KEY = process.env.YOUR_KEY || envFile.YOUR_KEY;
\`\`\`

Credentials are stored in: ~/.claude/.env`,
      });
      process.exit(0);
      return;
    }

    outputResult({continue: true});
    process.exit(0);
  } catch (error: unknown) {
    logHook('detect-hardcoded-keys', 'Error', {error: (error as Error).message});
    outputResult({continue: true}); // Fail open
    process.exit(0);
  }
}

if (require.main === module) {
  main();
}

export {KEY_PATTERNS, CODE_EXTENSIONS};
