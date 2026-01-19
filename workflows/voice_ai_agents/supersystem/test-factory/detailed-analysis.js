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

async function analyze() {
  const failures = [];

  for (const suiteId of suiteIds) {
    const url = 'https://api.elevenlabs.io/v1/convai/test-invocations/' + suiteId;
    const response = await fetch(url, { headers: { 'xi-api-key': client.apiKey } });
    if (response.ok) {
      const data = await response.json();
      for (const run of data.test_runs || []) {
        if (run.condition_result?.result === 'failure') {
          failures.push({
            name: run.test_name,
            rationale: run.condition_result?.rationale?.summary,
            response: run.agent_responses?.[0]?.message?.substring(0, 150)
          });
        }
      }
    }
  }

  console.log('=== DETAILED FAILURE ANALYSIS ===');
  console.log('Total failures:', failures.length);
  
  // Group by category
  const patterns = {};
  failures.forEach(f => {
    const cat = f.name.split(' - ')[0];
    if (!patterns[cat]) patterns[cat] = [];
    patterns[cat].push(f);
  });
  
  console.log('\n=== BY CATEGORY ===');
  Object.entries(patterns).sort((a,b) => b[1].length - a[1].length).forEach(([cat, items]) => {
    console.log('\n[' + cat + '] - ' + items.length + ' failures');
    // Show sample rationales
    items.slice(0, 3).forEach(item => {
      console.log('  • ' + item.name.split(' - ').slice(1).join(' - '));
      console.log('    Reason: ' + (item.rationale || 'N/A'));
    });
  });
}

analyze().catch(console.error);
