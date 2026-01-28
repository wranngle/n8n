const { ElevenLabsTestingClient } = require('./lib/api-client');
const client = new ElevenLabsTestingClient();

async function inspect() {
  const url = 'https://api.elevenlabs.io/v1/convai/test-invocations/suite_6801kf0tx8c1ez6t5tsbfjhvpj2q';
  const response = await fetch(url, { headers: { 'xi-api-key': client.apiKey } });
  const data = await response.json();
  
  console.log('Total runs:', data.test_runs.length);
  
  // Show first 3 runs raw
  console.log('\nSample runs:');
  data.test_runs.slice(0, 3).forEach((run, i) => {
    console.log('\n--- Run', i + 1, '---');
    console.log('test_name:', run.test_name);
    console.log('status:', run.status);
    console.log('condition_result:', run.condition_result);
    console.log('condition_result type:', typeof run.condition_result);
    console.log('agent_responses:', run.agent_responses ? run.agent_responses.length + ' items' : 'null');
  });
}

inspect().catch(console.error);
