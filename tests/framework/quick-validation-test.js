#!/usr/bin/env node
/**
 * Quick Validation Test - Tests with valid data only
 * Avoids circuit breaker by using realistic Pipedrive IDs
 */

const https = require('https');

const CONFIG = {
  N8N_BASE_URL: 'https://n8n.wranngle.com',
  WEBHOOK_PATH: '/webhook/call-completed'
};

async function callWebhook(payload) {
  return new Promise((resolve) => {
    const url = new URL(CONFIG.WEBHOOK_PATH, CONFIG.N8N_BASE_URL);
    const data = JSON.stringify(payload);
    const corrId = `quick-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;

    const startTime = Date.now();

    const req = https.request({
      hostname: url.hostname,
      port: 443,
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
        'X-Correlation-ID': corrId
      },
      timeout: 30000
    }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          body: JSON.parse(body || '{}'),
          duration: Date.now() - startTime,
          correlationId: corrId
        });
      });
    });

    req.on('error', (err) => resolve({ status: 0, error: err.message }));
    req.write(data);
    req.end();
  });
}

function createValidPayload(index) {
  return {
    type: 'post_call_transcription',
    event_timestamp: Date.now(),
    data: {
      conversation_id: `conv_quick_${Date.now()}_${index}`,
      agent_id: 'agent_xxxx_demo',
      conversation_initiation_client_data: {
        dynamic_variables: {
          customer_name: `Quick Test Customer ${index}`,
          pipedrive_person_id: 12345, // Use a valid test ID
          phone: '+15551234567'
        }
      },
      analysis: {
        call_successful: 'success',
        transcript_summary: `Quick validation test ${index}`
      },
      metadata: {
        call_duration_secs: 60 + index,
        start_time_unix_secs: Math.floor(Date.now() / 1000)
      },
      transcript: []
    }
  };
}

async function main() {
  console.log('\n⚡ QUICK VALIDATION TEST');
  console.log('========================\n');

  const testCount = 20;
  const results = { passed: 0, failed: 0, circuitBreaker: 0 };

  console.log(`Running ${testCount} tests with valid data...\n`);

  for (let i = 0; i < testCount; i++) {
    const payload = createValidPayload(i);
    const result = await callWebhook(payload);

    if (result.status === 200 && result.body?.success) {
      results.passed++;
      process.stdout.write('✅');
    } else if (result.status === 503 && result.body?.circuit_breaker_open) {
      results.circuitBreaker++;
      process.stdout.write('⚡');

      // Wait for reset
      const resetTime = new Date(result.body.circuit_breaker_resets_at);
      const waitMs = Math.max(0, resetTime - Date.now()) + 2000;
      if (waitMs > 0 && waitMs < 35000) {
        console.log(`\n  Waiting ${(waitMs/1000).toFixed(0)}s for circuit breaker reset...`);
        await new Promise(r => setTimeout(r, waitMs));
      }
    } else {
      results.failed++;
      process.stdout.write('❌');
      console.log(`\n  Unexpected: ${result.status} - ${JSON.stringify(result.body).slice(0, 100)}`);
    }

    // Small delay
    await new Promise(r => setTimeout(r, 300));
  }

  console.log('\n\n========================');
  console.log(`Results: ${results.passed}/${testCount} passed (${(results.passed/testCount*100).toFixed(0)}%)`);
  console.log(`Circuit breaker trips: ${results.circuitBreaker}`);
  console.log(`Failed: ${results.failed}`);
  console.log('');

  return results;
}

main().catch(console.error);
