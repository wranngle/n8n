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
            response: run.agent_responses?.[0]?.message?.substring(0, 100)
          });
        }
      }
    }
  }

  console.log('=== PERSONALITY+OBJECTION FAILURES ===\n');
  const persObj = failures.filter(f => f.name.startsWith('Personality+Objection'));
  persObj.slice(0, 10).forEach(f => {
    console.log('[' + f.name + ']');
    console.log('  Reason:', f.rationale);
    console.log('  Agent said:', f.response);
    console.log();
  });
}

analyze().catch(console.error);
