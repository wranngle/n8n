const http = require('http');
const https = require('https');
const env = require('./env');

function apiUrl(path) {
  const rawBase = env.n8nApiUrl();
  const base = new URL(`${rawBase}/`);
  let cleanPath = path.startsWith('/') ? path.slice(1) : path;

  if (base.pathname.replace(/\/+$/, '').endsWith('/api/v1') && cleanPath.startsWith('api/v1/')) {
    cleanPath = cleanPath.slice('api/v1/'.length);
  }

  return new URL(cleanPath, base);
}

function request(method, path, body, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = apiUrl(path);
    const data = body === undefined ? null : JSON.stringify(body);
    const client = url.protocol === 'http:' ? http : https;

    const req = client.request(url, {
      method,
      headers: {
        'X-N8N-API-KEY': env.require('N8N_API_KEY'),
        'Accept': 'application/json',
        ...(data ? {'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data)} : {}),
        ...headers,
      },
    }, res => {
      let raw = '';
      res.on('data', chunk => raw += chunk);
      res.on('end', () => {
        let bodyOut = raw;
        try {
          bodyOut = JSON.parse(raw || '{}');
        } catch {
          // Keep non-JSON response bodies as strings.
        }
        resolve({status: res.statusCode, body: bodyOut, raw});
      });
    });

    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

module.exports = {apiUrl, request};
