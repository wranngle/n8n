#!/usr/bin/env node
/**
 * Convert tests-100.json to CSV for n8n Data Table import
 */

const fs = require('fs');
const path = require('path');

const tests = JSON.parse(fs.readFileSync(path.join(__dirname, 'tests-100.json'), 'utf8'));

// CSV header
const header = 'test_name,chat_history,success_condition,test_type,category,agent_id';

// Convert each test to CSV row
const rows = tests.map(test => {
  // Escape and stringify chat_history as JSON
  const chatHistory = JSON.stringify(test.chat_history).replace(/"/g, '""');
  const successCondition = (test.success_condition || '').replace(/"/g, '""');
  const testName = (test.name || '').replace(/"/g, '""');
  const testType = test.type || 'llm';
  const category = test.category || '';
  const agentId = 'agent_8001kdgp7qbyf4wvhs540be78vew'; // Sarah - Wranngle Receptionist

  return `"${testName}","${chatHistory}","${successCondition}","${testType}","${category}","${agentId}"`;
});

const csv = [header, ...rows].join('\n');

const outputPath = path.join(__dirname, 'evaluation-dataset.csv');
fs.writeFileSync(outputPath, csv);

console.log(`Converted ${tests.length} tests to CSV`);
console.log(`Output: ${outputPath}`);
