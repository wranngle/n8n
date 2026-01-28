const { ElevenLabsTestingClient } = require('./lib/api-client');
const client = new ElevenLabsTestingClient();

const suiteIds = [
  'suite_4201kf0v9yy6e0dvvh11qr0zszc6',
  'suite_2701kf0va1v2fe3r0ceb2k77jwbs',
  'suite_8901kf0va4m4f4m82rxswja3ar8p',
  'suite_1801kf0va7dzejvambqy0c05g8wj',
  'suite_3401kf0vaa90en9v96fyd1wpxydb',
  'suite_1901kf0vad4vf88rqmfps4pdbza8'
];

async function checkResults() {
  let total = 0, passed = 0, failed = 0, pending = 0;
  const failures = [];

  for (const suiteId of suiteIds) {
    const url = 'https://api.elevenlabs.io/v1/convai/test-invocations/' + suiteId;
    const response = await fetch(url, { headers: { 'xi-api-key': client.apiKey } });
    if (response.ok) {
      const data = await response.json();
      for (const run of data.test_runs || []) {
        total++;
        const result = run.condition_result?.result;
        if (result === 'success') passed++;
        else if (result === 'failure') {
          failed++;
          failures.push({ name: run.test_name, rationale: run.condition_result?.rationale?.summary });
        }
        else pending++;
      }
    }
  }

  const completed = passed + failed;
  console.log('=== TEST RESULTS (Round 2) ===');
  console.log('Total:', total);
  console.log('Completed:', completed);
  console.log('Passed:', passed);
  console.log('Failed:', failed);
  console.log('Pending:', pending);
  
  if (completed > 0) {
    console.log('\n🎯 PASS RATE:', ((passed / completed) * 100).toFixed(1) + '%');
  }

  if (failed > 0 && pending === 0) {
    console.log('\n=== TOP FAILURE PATTERNS ===');
    const patterns = {};
    failures.forEach(f => {
      const cat = f.name.split(' - ')[0];
      patterns[cat] = (patterns[cat] || 0) + 1;
    });
    Object.entries(patterns).sort((a,b) => b[1] - a[1]).slice(0, 10).forEach(([cat, count]) => {
      console.log('  ' + cat + ':', count);
    });
  }
}

checkResults().catch(console.error);
