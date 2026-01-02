/**
 * Generate 100 Test Cases for n8n Native Evaluations
 *
 * This script generates test cases formatted for n8n's native evaluation system.
 * The output is a CSV that can be imported into Google Sheets, then connected
 * to an n8n Evaluation Trigger node.
 *
 * Usage: node generate-100-n8n-tests.js
 * Output: n8n-evaluation-dataset.csv (import to Google Sheets)
 */

const fs = require('fs');
const path = require('path');

// Test case categories with weights
const CATEGORIES = {
  client_lookup: 25,      // Known/unknown client scenarios
  phone_format: 15,       // E.164, international, vanity numbers
  email_lookup: 10,       // Email-based lookups
  error_handling: 15,     // Invalid inputs, edge cases
  integration: 10,        // Webhook patterns, tool calls
  stress_test: 10,        // Load, concurrent, timeout
  data_extraction: 10,    // Field validation
  edge_cases: 5           // Unusual scenarios
};

// Known clients in the mock database
const KNOWN_CLIENTS = [
  { phone: '+15551234567', name: 'John Smith', company: 'Acme Corp', tier: 'Gold' },
  { phone: '+15559876543', name: 'Jane Doe', company: 'Tech Startup Inc', tier: 'Silver' }
];

// Phone number templates for generation
const PHONE_TEMPLATES = [
  '+1555{area}{line}',
  '+1{area}555{line}',
  '+44{area}{line}',
  '+1800{vanity}'
];

function generatePhoneNumber(template) {
  return template
    .replace('{area}', Math.floor(Math.random() * 900 + 100).toString())
    .replace('{line}', Math.floor(Math.random() * 9000 + 1000).toString())
    .replace('{vanity}', Math.floor(Math.random() * 9000000 + 1000000).toString());
}

function generateTestCases() {
  const tests = [];
  let testId = 1;

  // Category 1: Client Lookup (25 tests)
  // Known clients - should return client data
  for (let i = 0; i < 10; i++) {
    const client = KNOWN_CLIENTS[i % KNOWN_CLIENTS.length];
    tests.push({
      id: testId++,
      category: 'client_lookup',
      name: `Known Client Lookup - ${client.name}`,
      input_phone: client.phone,
      input_email: '',
      expected_success: 'true',
      expected_client_found: 'true',
      expected_fields: `first_name,last_name,company,loyalty_tier`,
      description: `Verify known client ${client.name} is found by phone`
    });
  }

  // Unknown clients - should return no client data
  for (let i = 0; i < 10; i++) {
    const phone = generatePhoneNumber('+1555{area}{line}');
    tests.push({
      id: testId++,
      category: 'client_lookup',
      name: `Unknown Client Lookup #${i + 1}`,
      input_phone: phone,
      input_email: '',
      expected_success: 'true',
      expected_client_found: 'false',
      expected_fields: '',
      description: `Verify unknown phone ${phone} returns no client`
    });
  }

  // Mixed lookups
  for (let i = 0; i < 5; i++) {
    tests.push({
      id: testId++,
      category: 'client_lookup',
      name: `No Input Lookup #${i + 1}`,
      input_phone: '',
      input_email: '',
      expected_success: 'true',
      expected_client_found: 'false',
      expected_fields: '',
      description: 'Verify empty input returns no client gracefully'
    });
  }

  // Category 2: Phone Format Validation (15 tests)
  const phoneFormats = [
    { phone: '+15551234567', valid: true, desc: 'Valid E.164 US' },
    { phone: '+442071234567', valid: true, desc: 'Valid E.164 UK' },
    { phone: '5551234567', valid: false, desc: 'Missing country code' },
    { phone: '+1555123456', valid: false, desc: 'Too short' },
    { phone: '+155512345678', valid: false, desc: 'Too long' },
    { phone: '(555) 123-4567', valid: false, desc: 'Formatted US number' },
    { phone: '+1-555-123-4567', valid: false, desc: 'Dashes in E.164' },
    { phone: '+18005551234', valid: true, desc: 'Toll-free number' },
    { phone: '+1800FLOWERS', valid: false, desc: 'Vanity number' },
    { phone: 'not-a-phone', valid: false, desc: 'Invalid string' },
    { phone: '12345', valid: false, desc: 'Too few digits' },
    { phone: '+19999999999', valid: true, desc: 'Edge case 9s' },
    { phone: '+10000000000', valid: true, desc: 'Edge case 0s' },
    { phone: '+15559999999', valid: true, desc: 'Max digits pattern' },
    { phone: '+15550000000', valid: true, desc: 'Min digits pattern' }
  ];

  phoneFormats.forEach((fmt, i) => {
    tests.push({
      id: testId++,
      category: 'phone_format',
      name: `Phone Format: ${fmt.desc}`,
      input_phone: fmt.phone,
      input_email: '',
      expected_success: 'true',
      expected_client_found: 'false',
      expected_fields: fmt.valid ? 'phone_processed' : 'error_phone_format',
      description: `Test phone format handling: ${fmt.desc}`
    });
  });

  // Category 3: Email Lookup (10 tests)
  const emails = [
    'john@acme.com', 'jane@techstartup.io', 'test@example.com',
    'user+tag@gmail.com', 'UPPERCASE@DOMAIN.COM', 'unicode@日本.jp',
    'very.long.email.address@subdomain.domain.tld', 'simple@test.co',
    '', 'invalid-email'
  ];

  emails.forEach((email, i) => {
    tests.push({
      id: testId++,
      category: 'email_lookup',
      name: `Email Lookup #${i + 1}`,
      input_phone: '',
      input_email: email,
      expected_success: 'true',
      expected_client_found: 'false',
      expected_fields: email && email.includes('@') ? 'email_processed' : '',
      description: `Test email lookup: ${email || '(empty)'}`
    });
  });

  // Category 4: Error Handling (15 tests)
  const errorCases = [
    { phone: null, email: null, desc: 'Null inputs' },
    { phone: undefined, email: undefined, desc: 'Undefined inputs' },
    { phone: 123, email: 456, desc: 'Numeric inputs' },
    { phone: [], email: {}, desc: 'Array and object inputs' },
    { phone: '<script>alert(1)</script>', email: '', desc: 'XSS attempt' },
    { phone: "'; DROP TABLE users;--", email: '', desc: 'SQL injection attempt' },
    { phone: '../../../etc/passwd', email: '', desc: 'Path traversal attempt' },
    { phone: 'A'.repeat(1000), email: '', desc: 'Very long phone' },
    { phone: '', email: 'A'.repeat(500) + '@test.com', desc: 'Very long email' },
    { phone: '+1555\x00123', email: '', desc: 'Null byte injection' },
    { phone: '+1555\n123', email: '', desc: 'Newline injection' },
    { phone: ' +15551234567 ', email: '', desc: 'Whitespace padding' },
    { phone: '+1 555 123 4567', email: '', desc: 'Spaces in phone' },
    { phone: '+15551234567', email: 'test@', desc: 'Partial email' },
    { phone: '++15551234567', email: '', desc: 'Double plus sign' }
  ];

  errorCases.forEach((ec, i) => {
    tests.push({
      id: testId++,
      category: 'error_handling',
      name: `Error Case: ${ec.desc}`,
      input_phone: String(ec.phone || ''),
      input_email: String(ec.email || ''),
      expected_success: 'true',
      expected_client_found: 'false',
      expected_fields: 'error_handled',
      description: `Verify graceful handling: ${ec.desc}`
    });
  });

  // Category 5: Integration Tests (10 tests)
  for (let i = 0; i < 10; i++) {
    const phone = i < 5 ? KNOWN_CLIENTS[i % 2].phone : generatePhoneNumber('+1555{area}{line}');
    tests.push({
      id: testId++,
      category: 'integration',
      name: `Integration Test #${i + 1}`,
      input_phone: phone,
      input_email: '',
      expected_success: 'true',
      expected_client_found: i < 5 ? 'true' : 'false',
      expected_fields: 'latency_ms,source',
      description: `Verify full integration flow with response time tracking`
    });
  }

  // Category 6: Stress Tests (10 tests)
  for (let i = 0; i < 10; i++) {
    tests.push({
      id: testId++,
      category: 'stress_test',
      name: `Stress Test #${i + 1}`,
      input_phone: generatePhoneNumber('+1555{area}{line}'),
      input_email: `stress${i}@test.com`,
      expected_success: 'true',
      expected_client_found: 'false',
      expected_fields: 'latency_ms',
      description: `Concurrent load test case ${i + 1}`
    });
  }

  // Category 7: Data Extraction (10 tests)
  const extractionTests = [
    { field: 'first_name', expected: 'John' },
    { field: 'last_name', expected: 'Smith' },
    { field: 'company', expected: 'Acme Corp' },
    { field: 'account_type', expected: 'Premium' },
    { field: 'loyalty_tier', expected: 'Gold' },
    { field: 'last_interaction', expected: 'Called 3 days ago' },
    { field: 'notes', expected: 'Prefers morning calls' },
    { field: 'cache_hit', expected: 'true' },
    { field: 'lookup_key', expected: '+15551234567' },
    { field: 'source', expected: 'mock_database' }
  ];

  extractionTests.forEach((et, i) => {
    tests.push({
      id: testId++,
      category: 'data_extraction',
      name: `Extract ${et.field}`,
      input_phone: KNOWN_CLIENTS[0].phone,
      input_email: '',
      expected_success: 'true',
      expected_client_found: 'true',
      expected_fields: et.field,
      description: `Verify ${et.field} is returned correctly`
    });
  });

  // Category 8: Edge Cases (5 tests)
  const edgeCases = [
    { phone: '+15551234567', email: 'john@acme.com', desc: 'Both phone and email' },
    { phone: KNOWN_CLIENTS[0].phone, email: 'wrong@email.com', desc: 'Phone match, email mismatch' },
    { phone: '+15559999999', email: 'test@test.com', desc: 'Neither matches' },
    { phone: '  ', email: '  ', desc: 'Whitespace only' },
    { phone: '', email: '', desc: 'Completely empty - final' }
  ];

  edgeCases.forEach((ec, i) => {
    tests.push({
      id: testId++,
      category: 'edge_case',
      name: `Edge Case: ${ec.desc}`,
      input_phone: ec.phone,
      input_email: ec.email,
      expected_success: 'true',
      expected_client_found: ec.phone === KNOWN_CLIENTS[0].phone ? 'true' : 'false',
      expected_fields: '',
      description: `Edge case test: ${ec.desc}`
    });
  });

  return tests;
}

function generateCSV(tests) {
  const headers = [
    'test_id',
    'category',
    'test_name',
    'input_phone',
    'input_email',
    'expected_success',
    'expected_client_found',
    'expected_fields',
    'description',
    'actual_output',
    'pass_fail',
    'execution_time_ms',
    'run_timestamp'
  ];

  const rows = [headers.join(',')];

  tests.forEach(test => {
    const row = [
      test.id,
      test.category,
      `"${test.name.replace(/"/g, '""')}"`,
      `"${test.input_phone}"`,
      `"${test.input_email}"`,
      test.expected_success,
      test.expected_client_found,
      `"${test.expected_fields}"`,
      `"${test.description.replace(/"/g, '""')}"`,
      '',  // actual_output - filled by evaluation
      '',  // pass_fail - filled by evaluation
      '',  // execution_time_ms - filled by evaluation
      ''   // run_timestamp - filled by evaluation
    ];
    rows.push(row.join(','));
  });

  return rows.join('\n');
}

function main() {
  console.log('Generating 100 n8n evaluation test cases...');

  const tests = generateTestCases();
  console.log(`Generated ${tests.length} test cases`);

  // Count by category
  const counts = {};
  tests.forEach(t => {
    counts[t.category] = (counts[t.category] || 0) + 1;
  });
  console.log('\nTest distribution:');
  Object.entries(counts).forEach(([cat, count]) => {
    console.log(`  ${cat}: ${count}`);
  });

  const csv = generateCSV(tests);
  const outPath = path.join(__dirname, 'n8n-evaluation-dataset.csv');
  fs.writeFileSync(outPath, csv, 'utf8');
  console.log(`\nSaved to: ${outPath}`);

  // Also save as JSON for reference
  const jsonPath = path.join(__dirname, 'n8n-evaluation-dataset.json');
  fs.writeFileSync(jsonPath, JSON.stringify(tests, null, 2), 'utf8');
  console.log(`JSON backup: ${jsonPath}`);
}

main();
