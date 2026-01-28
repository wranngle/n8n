const fs = require('fs');
const path = require('path');

const dir = __dirname;
const files = fs.readdirSync(dir).filter(f => f.startsWith('baseline-results')).sort().reverse();
console.log('Latest results:', files[0]);

const data = JSON.parse(fs.readFileSync(path.join(dir, files[0])));

// Show first 2 tests (outbound and pricing)
['OUTBOUND_AWARENESS', 'PREMATURE_PRICING'].forEach(id => {
  const r = data.find(x => x.challenge_id === id);
  if (r) {
    console.log('\n' + '='.repeat(60));
    console.log(r.passed ? '✓ PASSED:' : '✗ FAILED:', r.challenge_name);
    console.log('='.repeat(60));
    console.log(r.transcript || 'No transcript');
  }
});
