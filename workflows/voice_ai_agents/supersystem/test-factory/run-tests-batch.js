const { ElevenLabsTestingClient, sleep } = require('./lib/api-client');
const client = new ElevenLabsTestingClient();

async function runBatchedTests() {
  console.log('🚀 RE-RUNNING TESTS WITH UPDATED PROMPT');
  console.log('========================================');
  console.log('Agent ID:', client.agentId);
  console.log('');
  
  // Get all tests
  console.log('Fetching tests...');
  const tests = await client.listTests();
  const allTestIds = tests.tests.map(t => t.id);
  console.log('Total tests available:', allTestIds.length);
  
  // Run 1200 tests (6 batches of 200)
  const BATCH_SIZE = 200;
  const TOTAL_TO_RUN = 1200;
  const testIdsToRun = allTestIds.slice(0, TOTAL_TO_RUN);
  const batches = [];
  
  for (let i = 0; i < testIdsToRun.length; i += BATCH_SIZE) {
    batches.push(testIdsToRun.slice(i, i + BATCH_SIZE));
  }
  
  console.log('Tests to run:', testIdsToRun.length);
  console.log('Batches:', batches.length);
  console.log('');
  
  const suiteIds = [];
  
  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];
    console.log('Batch', i + 1, '/', batches.length, '(' + batch.length + ' tests)...');
    
    const url = 'https://api.elevenlabs.io/v1/convai/agents/' + client.agentId + '/run-tests';
    const testsPayload = batch.map(id => ({ test_id: id }));
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'xi-api-key': client.apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ tests: testsPayload })
    });
    
    if (response.ok) {
      const result = await response.json();
      suiteIds.push(result.id);
      console.log('  Suite:', result.id);
    } else {
      console.log('  ERROR:', response.status);
    }
    
    if (i < batches.length - 1) await sleep(2000);
  }
  
  console.log('\n✅ ALL BATCHES TRIGGERED');
  console.log('Suite IDs:');
  suiteIds.forEach(id => console.log('  ' + id));
  console.log('\nPortal:', client.getPortalUrl());
}

runBatchedTests().catch(console.error);
