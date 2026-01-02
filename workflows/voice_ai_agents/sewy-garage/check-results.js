const fs = require('fs');

const data = JSON.parse(fs.readFileSync(__dirname + '/sewy-test-results.json', 'utf8'));

console.log('=== SEWY Test Results ===\n');
console.log('Invocation ID:', data.id);
console.log('Agent:', data.agent_id);
console.log('Created:', new Date(data.created_at * 1000).toISOString());

const tests = data.test_runs || [];
let passed = 0, failed = 0;

console.log(`\nTotal Tests: ${tests.length}\n`);

tests.forEach((t, i) => {
  const name = t.test_info?.success_condition?.slice(0, 60) || `Test ${i+1}`;
  const status = t.status;
  
  if (status === 'passed') {
    console.log(`✓ [PASS] ${name}...`);
    passed++;
  } else {
    console.log(`✗ [FAIL] ${name}...`);
    if (t.result_reason) console.log(`  Reason: ${t.result_reason.slice(0, 100)}`);
    failed++;
  }
});

const total = passed + failed;
console.log(`\n=== Summary ===`);
console.log(`Pass Rate: ${passed}/${total} (${total ? ((passed/total)*100).toFixed(1) : 0}%)`);
console.log(`Passed: ${passed}`);
console.log(`Failed: ${failed}`);
