const { ElevenLabsTestingClient } = require('./lib/api-client');
const client = new ElevenLabsTestingClient();

const suiteIds = [
  'suite_2301kf1ycz1nfk4bthqxxcvd2vcy',
  'suite_1801kf1yd1xdemxrrdbfybd4gjbe',
  'suite_4301kf1yd4raf8fvhase0zawv9zb',
  'suite_4401kf1yd7jdesh8b352a8kmbf78',
  'suite_5101kf1ydaebe70v4r4sw95mvmb4',
  'suite_4301kf1ydd8wezhrrv2k1s3zq0s3'
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
  console.log('=== ROUND 4 RESULTS ===');
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
    Object.entries(patterns).sort((a,b) => b[1] - a[1]).slice(0, 10).forEach(([cat, count]) => {
      console.log('  ' + cat + ':', count);
    });

    // Show sample failures
    if (failures.length > 0) {
      console.log('\n=== SAMPLE FAILURES ===');
      failures.slice(0, 5).forEach(f => {
        console.log('  -', f.name);
        if (f.rationale) console.log('    Reason:', f.rationale.substring(0, 100));
      });
    }
  }
}

check().catch(console.error);
