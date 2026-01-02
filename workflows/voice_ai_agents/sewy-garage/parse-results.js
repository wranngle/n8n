const fs = require('fs');
const path = 'C:\\Users\\user\\.claude\\projects\\D--Things-Work-Wranngle-n8n-workflow-development\\059ce185-567f-4c27-b20c-5fdcec7a0a48\\tool-results\\mcp-desktop-commander-start_process-1767158012498.txt';

try {
  const raw = fs.readFileSync(path, 'utf8');
  const parsed = JSON.parse(raw);
  const text = parsed.find(p => p.type === 'text')?.text || '';
  const data = JSON.parse(text);
  
  console.log('=== SEWY Test Results Summary ===\n');
  console.log('Invocation ID:', data.id || data.invocation_id || 'N/A');
  console.log('Status:', data.status || 'N/A');
  console.log('Created:', data.created_at || 'N/A');
  
  const tests = data.test_results || data.tests || data.results || [];
  let passed = 0, failed = 0;
  
  console.log(`\nTotal tests: ${tests.length}\n`);
  
  for (const t of tests) {
    const name = t.test_name || t.name || t.title || 'Unknown';
    const result = t.passed ? 'PASS' : 'FAIL';
    const icon = t.passed ? '✓' : '✗';
    
    if (t.passed) passed++; else failed++;
    console.log(`  ${icon} ${name}: ${result}`);
    if (!t.passed && t.failure_reason) {
      console.log(`      Reason: ${t.failure_reason.substring(0, 100)}...`);
    }
  }
  
  console.log(`\n=== Summary ===`);
  console.log(`Passed: ${passed}/${tests.length} (${((passed/tests.length)*100).toFixed(1)}%)`);
  console.log(`Failed: ${failed}/${tests.length}`);
} catch (e) {
  console.error('Error:', e.message);
}
