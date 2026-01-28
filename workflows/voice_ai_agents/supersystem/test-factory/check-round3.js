const { ElevenLabsTestingClient } = require('./lib/api-client');
const client = new ElevenLabsTestingClient();

const suiteIds = [
  'suite_6001kf1y37txec891vvfvegacd67',
  'suite_1701kf1y3amvetyvsj99h4n5pyrn',
  'suite_5801kf1y3dgcf7hsapqppkeza6sz',
  'suite_0201kf1y3gf4fkwtv8kp8945dzfc',
  'suite_9101kf1y3k9yfa28gn4acyg8t8ax',
  'suite_3601kf1y3p7fe2tvq7qar058amr9'
];

async function check() {
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
  console.log('=== ROUND 3 RESULTS ===');
  console.log('Total:', total, '| Completed:', completed, '| Pending:', pending);
  console.log('Passed:', passed, '| Failed:', failed);
  
  if (completed > 0) {
    const rate = ((passed / completed) * 100).toFixed(1);
    console.log('\n🎯 PASS RATE:', rate + '%');
    
    if (parseFloat(rate) >= 98) {
      console.log('\n🎉 TARGET ACHIEVED! 98%+ pass rate!');
    }
  }

  if (failed > 0 && pending < 50) {
    console.log('\n=== FAILURE CATEGORIES ===');
    const patterns = {};
    failures.forEach(f => {
      const cat = f.name.split(' - ')[0];
      patterns[cat] = (patterns[cat] || 0) + 1;
    });
    Object.entries(patterns).sort((a,b) => b[1] - a[1]).slice(0, 8).forEach(([cat, count]) => {
      console.log('  ' + cat + ':', count);
    });
  }
}

check().catch(console.error);
