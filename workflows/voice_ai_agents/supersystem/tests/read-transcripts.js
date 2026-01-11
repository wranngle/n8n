const fs = require('fs');
const path = require('path');

const dir = __dirname;
const files = fs.readdirSync(dir).filter(f => f.startsWith('baseline-results')).sort().reverse();
console.log('Latest results:', files[0]);

const data = JSON.parse(fs.readFileSync(path.join(dir, files[0])));

data.forEach(r => {
  if (!r.passed) {
    console.log('\n' + '='.repeat(60));
    console.log('FAILED: ' + r.challenge_name);
    console.log('Issues: ' + (r.issues || []).join(', '));
    console.log('='.repeat(60));
    console.log(r.transcript || 'No transcript');
  }
});
