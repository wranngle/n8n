const { ElevenLabsTestingClient } = require('./lib/api-client');
const client = new ElevenLabsTestingClient();

async function checkAll() {
  const suiteIds = [
    'suite_6801kf0tx8c1ez6t5tsbfjhvpj2q',
    'suite_2001kf0txbcvefmswzpfangkrmgs',
    'suite_7401kf0txehdfyza8j99pk07x2g8',
    'suite_0901kf0txv8zfw589j49a4hcgqg4',
    'suite_2301kf0txy95ef384tfsq12xdvbt',
    'suite_7501kf0ty173ftmvq11t4xnxa38j'
  ];

  let totalTests = 0;
  let passed = 0;
  let failed = 0;
  let pending = 0;
  const failedTests = [];

  for (const suiteId of suiteIds) {
    const url = 'https://api.elevenlabs.io/v1/convai/test-invocations/' + suiteId;
    const response = await fetch(url, { headers: { 'xi-api-key': client.apiKey } });
    
    if (response.ok) {
      const data = await response.json();
      for (const run of data.test_runs || []) {
        totalTests++;
        const result = run.condition_result?.result;
        if (result === 'success') {
          passed++;
        } else if (result === 'failure') {
          failed++;
          failedTests.push({
            name: run.test_name,
            rationale: run.condition_result?.rationale?.summary || '',
            response: run.agent_responses?.[0]?.message?.substring(0, 80) || ''
          });
        } else {
          pending++;
        }
      }
    }
  }

  const completed = passed + failed;
  console.log('=== TEST RESULTS ===');
  console.log('Total:', totalTests);
  console.log('Completed:', completed);
  console.log('Passed:', passed);
  console.log('Failed:', failed);
  console.log('Pending:', pending);
  
  if (completed > 0) {
    console.log('\nPASS RATE:', ((passed / completed) * 100).toFixed(1) + '%');
  }

  if (failed > 0) {
    console.log('\n=== FAILURE ANALYSIS ===');
    const patterns = {};
    failedTests.forEach(t => {
      const category = t.name.split(' - ')[0];
      patterns[category] = (patterns[category] || 0) + 1;
    });
    console.log('\nBy category (top 15):');
    Object.entries(patterns).sort((a,b) => b[1] - a[1]).slice(0, 15).forEach(([cat, count]) => {
      console.log('  ' + cat + ':', count);
    });

    console.log('\nSample failure rationales:');
    failedTests.slice(0, 8).forEach(t => {
      console.log('  [' + t.name + ']');
      console.log('    ' + t.rationale);
    });
  }
}

checkAll().catch(console.error);
