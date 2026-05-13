// Loads .env and ~/.agents/.env into process.env. Existing process.env values win.
// Require this module once at the top of any script that needs API keys.

const fs = require('fs');
const path = require('path');
const os = require('os');

const ENV_PATHS = [
  path.join(process.cwd(), '.env'),
  path.join(os.homedir(), '.agents', '.env'),
];

function parseEnvFile(text) {
  const out = {};
  for (const raw of text.split('\n')) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq <= 0) continue;
    const key = line.slice(0, eq).trim();
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) continue;
    let value = line.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    out[key] = value;
  }
  return out;
}

for (const envPath of ENV_PATHS) {
  if (fs.existsSync(envPath)) {
    const parsed = parseEnvFile(fs.readFileSync(envPath, 'utf8'));
    for (const [k, v] of Object.entries(parsed)) {
      if (process.env[k] === undefined) process.env[k] = v;
    }
  }
}

function require_(key) {
  const v = process.env[key];
  if (!v) {
    throw new Error(`${key} is not set. Add it to .env, ~/.agents/.env, or export it before running.`);
  }
  return v;
}

function n8nApiUrl() {
  const raw = require_('N8N_API_URL');
  return raw.replace(/\/+$/, '');
}

function n8nHost() {
  return new URL(n8nApiUrl()).hostname;
}

module.exports = { ENV_PATHS, require: require_, n8nApiUrl, n8nHost };
