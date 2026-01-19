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
            rationale: run.condition_result?.rationale?.summary || '',
            full_rationale: run.condition_result?.rationale?.full || '',
            agent_responses: run.agent_responses || []
          });
        }
      }
    }
  }

  // Categorize by pattern
  console.log('=== DETAILED FAILURE ANALYSIS ===\n');
  console.log('Total failures:', failures.length, '\n');

  // Analyze Personality+Objection failures specifically
  const persObj = failures.filter(f => f.name.startsWith('Personality+Objection'));
  console.log('=== PERSONALITY+OBJECTION FAILURES (', persObj.length, ') ===\n');

  // Group by personality type
  const byPersonality = {};
  persObj.forEach(f => {
    // Parse name like "Personality+Objection - Brief Already Have Service - HVAC"
    const parts = f.name.split(' - ');
    const scenario = parts[1] || '';
    const personality = scenario.split(' ')[0]; // First word is personality type
    byPersonality[personality] = byPersonality[personality] || [];
    byPersonality[personality].push(f);
  });

  Object.entries(byPersonality).sort((a,b) => b[1].length - a[1].length).forEach(([type, items]) => {
    console.log(`\n${type}: ${items.length} failures`);
    // Show sample failures for each type
    items.slice(0, 2).forEach(f => {
      console.log(`  "${f.name}"`);
      console.log(`  Reason: ${f.rationale.substring(0, 150)}...`);
      if (f.agent_responses && f.agent_responses.length > 0) {
        const lastResp = f.agent_responses[f.agent_responses.length - 1];
        const respText = typeof lastResp === 'string' ? lastResp : JSON.stringify(lastResp);
        console.log(`  Last response: "${respText?.substring(0, 100)}..."`);
      }
    });
  });

  // Analyze Objection+Demo failures
  const objDemo = failures.filter(f => f.name.startsWith('Objection+Demo'));
  console.log('\n\n=== OBJECTION+DEMO FAILURES (', objDemo.length, ') ===\n');

  objDemo.slice(0, 5).forEach(f => {
    console.log(`"${f.name}"`);
    console.log(`  Reason: ${f.rationale.substring(0, 200)}...`);
  });

  // Analyze Lead Qualification failures
  const leadQual = failures.filter(f => f.name.startsWith('Lead Qualification'));
  console.log('\n\n=== LEAD QUALIFICATION FAILURES (', leadQual.length, ') ===\n');

  leadQual.forEach(f => {
    console.log(`"${f.name}"`);
    console.log(`  Reason: ${f.rationale}`);
  });

  // Common themes in rationales
  console.log('\n\n=== COMMON THEMES IN FAILURE RATIONALES ===\n');
  const themes = {
    verbose: 0,
    brief: 0,
    discovery: 0,
    company: 0,
    price: 0,
    question: 0,
    objection: 0,
  };

  failures.forEach(f => {
    const r = f.rationale.toLowerCase();
    if (r.includes('verbose') || r.includes('too long') || r.includes('word count')) themes.verbose++;
    if (r.includes('brief') || r.includes('short')) themes.brief++;
    if (r.includes('discovery') || r.includes('volume')) themes.discovery++;
    if (r.includes('company') || r.includes('business name')) themes.company++;
    if (r.includes('price') || r.includes('pricing')) themes.price++;
    if (r.includes('question') || r.includes('ask')) themes.question++;
    if (r.includes('objection')) themes.objection++;
  });

  Object.entries(themes).sort((a,b) => b[1] - a[1]).forEach(([theme, count]) => {
    console.log(`  ${theme}: ${count}`);
  });
}

analyze().catch(console.error);
