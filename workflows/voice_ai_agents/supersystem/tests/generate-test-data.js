#!/usr/bin/env bun

/**
 * Test Data Generator for Client Initiation Webhook
 *
 * Generates realistic test data for Pipedrive and Google Sheets
 * to facilitate testing of the client initiation data webhook.
 *
 * Usage:
 *   bun run supersystem/tests/generate-test-data.js
 *   bun run supersystem/tests/generate-test-data.js --count=50
 *   bun run supersystem/tests/generate-test-data.js --format=csv
 *
 * Outputs:
 *   - pipedrive-test-contacts.json (for Pipedrive import)
 *   - sheets-test-data.json (for Google Sheets import)
 *   - test-phone-numbers.txt (quick reference list)
 */

const fs = require('fs');
const path = require('path');

// Parse args
const args = process.argv.slice(2);
const countArg = args.find(arg => arg.startsWith('--count='));
const formatArg = args.find(arg => arg.startsWith('--format='));
const count = countArg ? parseInt(countArg.split('=')[1]) : 20;
const format = formatArg ? formatArg.split('=')[1] : 'json';

// Sample data pools
const FIRST_NAMES = [
  'John', 'Sarah', 'Michael', 'Jennifer', 'David', 'Lisa', 'Robert', 'Mary',
  'James', 'Patricia', 'William', 'Linda', 'Richard', 'Barbara', 'Joseph',
  'Susan', 'Thomas', 'Jessica', 'Charles', 'Karen', 'Christopher', 'Nancy'
];

const LAST_NAMES = [
  'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis',
  'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Wilson', 'Anderson', 'Thomas',
  'Taylor', 'Moore', 'Jackson', 'Martin', 'Lee', 'Thompson', 'White'
];

const COMPANIES = [
  'Acme HVAC Services', 'Premier Plumbing Co', 'Elite Property Management',
  'Sunshine Air Conditioning', 'Metro Plumbing & Heating', 'Golden Gate Properties',
  'Reliable Heating & Cooling', 'Fast Response Plumbing', 'Citywide Property Mgmt',
  'Comfort Control HVAC', 'Expert Plumbers Inc', 'Residential Property Partners',
  'Cool Breeze AC Repair', 'Emergency Plumbing Solutions', 'Property Solutions LLC',
  'Arctic Air Systems', 'Precision Plumbing', 'Prestige Property Group',
  'Climate Masters', 'Drain Doctors', 'Apartment Management Co'
];

const INDUSTRIES = ['hvac', 'plumbing', 'property_management'];

const ACCOUNT_TIERS = ['New', 'Bronze', 'Silver', 'Gold'];

const CALL_TOPICS = [
  'pricing information', 'demo request', 'feature questions',
  'billing inquiry', 'technical support', 'integration help',
  'upgrade options', 'service coverage', 'trial extension'
];

const NOTES_TEMPLATES = [
  'Prefers morning calls',
  'Decision maker for after-hours solutions',
  'Currently evaluating multiple vendors',
  'Very interested in SMS features',
  'Asked about pricing multiple times',
  'Wants to discuss with partner first',
  'Seasonal business - peak in summer',
  'Large operation - 15+ technicians',
  'Small family business',
  'Expanding to new markets'
];

/**
 * Generate random phone number
 */
function generatePhoneNumber() {
  const areaCode = 100 + Math.floor(Math.random() * 900);
  const exchange = 100 + Math.floor(Math.random() * 900);
  const subscriber = 1000 + Math.floor(Math.random() * 9000);
  return `+1${areaCode}${exchange}${subscriber}`;
}

/**
 * Generate random email
 */
function generateEmail(firstName, lastName, company) {
  const domain = company.toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .substring(0, 15);
  return `${firstName.toLowerCase()}.${lastName.toLowerCase()}@${domain}.com`;
}

/**
 * Generate random date in past N days
 */
function generatePastDate(maxDaysAgo) {
  const now = new Date();
  const daysAgo = Math.floor(Math.random() * maxDaysAgo);
  const date = new Date(now.getTime() - (daysAgo * 24 * 60 * 60 * 1000));
  return date.toISOString().split('T')[0];
}

/**
 * Generate random interaction summary
 */
function generateCallHistory(callCount, topic) {
  if (callCount === 0) {
    return 'First-time caller';
  }

  const daysAgo = Math.floor(Math.random() * 30) + 1;
  return `Called ${daysAgo} day${daysAgo > 1 ? 's' : ''} ago about ${topic}`;
}

/**
 * Generate single test contact
 */
function generateContact(index) {
  const firstName = FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)];
  const lastName = LAST_NAMES[Math.floor(Math.random() * LAST_NAMES.length)];
  const company = COMPANIES[Math.floor(Math.random() * COMPANIES.length)];
  const industry = INDUSTRIES[Math.floor(Math.random() * INDUSTRIES.length)];
  const phoneNumber = generatePhoneNumber();
  const email = generateEmail(firstName, lastName, company);
  const callCount = Math.floor(Math.random() * 10);

  // Tier based on call count
  let accountTier;
  if (callCount === 0) accountTier = 'New';
  else if (callCount <= 3) accountTier = 'Bronze';
  else if (callCount <= 7) accountTier = 'Silver';
  else accountTier = 'Gold';

  const lastTopic = CALL_TOPICS[Math.floor(Math.random() * CALL_TOPICS.length)];
  const callHistory = generateCallHistory(callCount, lastTopic);
  const notes = callCount > 2 ? NOTES_TEMPLATES[Math.floor(Math.random() * NOTES_TEMPLATES.length)] : '';

  return {
    id: 1000 + index,
    first_name: firstName,
    last_name: lastName,
    name: `${firstName} ${lastName}`,
    company,
    industry,
    phone_number: phoneNumber,
    email,
    account_tier: accountTier,
    interaction_count: callCount,
    call_history: callHistory,
    last_topic: callCount > 0 ? lastTopic : '',
    last_interaction_date: callCount > 0 ? generatePastDate(60) : '',
    notes,
    created_date: generatePastDate(365)
  };
}

/**
 * Transform for Pipedrive format
 */
function toPipedriveFormat(contact) {
  return {
    name: contact.name,
    first_name: contact.first_name,
    last_name: contact.last_name,
    phone: [{ value: contact.phone_number, primary: true, label: 'work' }],
    email: [{ value: contact.email, primary: true, label: 'work' }],
    org_name: contact.company,
    'custom_fields': {
      'account_tier': contact.account_tier,
      'industry': contact.industry
    }
  };
}

/**
 * Transform for Google Sheets format
 */
function toSheetsFormat(contact) {
  return {
    'Name': contact.name,
    'Phone': contact.phone_number,
    'Email': contact.email,
    'Company': contact.company,
    'Industry': contact.industry,
    'Call Count': contact.interaction_count,
    'Last Interaction': contact.last_interaction_date,
    'Last Topic': contact.last_topic,
    'Notes': contact.notes,
    'Created': contact.created_date
  };
}

/**
 * Generate CSV from data
 */
function toCSV(data, headers) {
  const rows = [headers.join(',')];

  for (const item of data) {
    const row = headers.map(header => {
      const value = item[header] || '';
      // Escape commas and quotes
      return `"${String(value).replace(/"/g, '""')}"`;
    });
    rows.push(row.join(','));
  }

  return rows.join('\n');
}

/**
 * Main generation
 */
function main() {
  console.log(`Generating ${count} test contacts...`);

  const contacts = [];
  for (let i = 0; i < count; i++) {
    contacts.push(generateContact(i));
  }

  // Stats
  const tierCounts = contacts.reduce((acc, c) => {
    acc[c.account_tier] = (acc[c.account_tier] || 0) + 1;
    return acc;
  }, {});

  const industryCounts = contacts.reduce((acc, c) => {
    acc[c.industry] = (acc[c.industry] || 0) + 1;
    return acc;
  }, {});

  console.log('\nGeneration Summary:');
  console.log('─'.repeat(50));
  console.log(`Total Contacts: ${contacts.length}`);
  console.log('\nTier Distribution:');
  Object.entries(tierCounts).forEach(([tier, count]) => {
    console.log(`  ${tier}: ${count} (${(count/contacts.length*100).toFixed(1)}%)`);
  });
  console.log('\nIndustry Distribution:');
  Object.entries(industryCounts).forEach(([industry, count]) => {
    console.log(`  ${industry}: ${count} (${(count/contacts.length*100).toFixed(1)}%)`);
  });

  // Output directory
  const outputDir = path.join(__dirname, 'test-data');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Pipedrive format
  const pipedriveData = contacts.map(toPipedriveFormat);
  if (format === 'json' || format === 'both') {
    const pipedriveFile = path.join(outputDir, 'pipedrive-test-contacts.json');
    fs.writeFileSync(pipedriveFile, JSON.stringify(pipedriveData, null, 2));
    console.log(`\n✅ Pipedrive JSON: ${pipedriveFile}`);
  }

  // Google Sheets format
  const sheetsData = contacts.map(toSheetsFormat);
  if (format === 'json' || format === 'both') {
    const sheetsFile = path.join(outputDir, 'sheets-test-data.json');
    fs.writeFileSync(sheetsFile, JSON.stringify(sheetsData, null, 2));
    console.log(`✅ Google Sheets JSON: ${sheetsFile}`);
  }

  // CSV format
  if (format === 'csv' || format === 'both') {
    const sheetsCsv = toCSV(sheetsData, Object.keys(sheetsData[0]));
    const csvFile = path.join(outputDir, 'sheets-test-data.csv');
    fs.writeFileSync(csvFile, sheetsCsv);
    console.log(`✅ Google Sheets CSV: ${csvFile}`);
  }

  // Phone numbers reference
  const phoneNumbers = contacts.map(c =>
    `${c.phone_number}\t${c.name}\t${c.account_tier}\t${c.company}`
  );
  phoneNumbers.unshift('Phone\tName\tTier\tCompany');
  const phoneFile = path.join(outputDir, 'test-phone-numbers.txt');
  fs.writeFileSync(phoneFile, phoneNumbers.join('\n'));
  console.log(`✅ Phone Reference: ${phoneFile}`);

  // Sample webhook payloads
  const samplePayloads = contacts.slice(0, 5).map(c => ({
    caller_id: c.phone_number,
    agent_id: 'agent_8001kdgp7qbyf4wvhs540be78vew',
    called_number: '+18882662193',
    call_sid: `TEST_${c.id}`,
    expected_name: c.name,
    expected_company: c.company,
    expected_tier: c.account_tier
  }));
  const payloadsFile = path.join(outputDir, 'sample-webhook-payloads.json');
  fs.writeFileSync(payloadsFile, JSON.stringify(samplePayloads, null, 2));
  console.log(`✅ Sample Payloads: ${payloadsFile}`);

  console.log('\n✨ Test data generation complete!');
  console.log('\nNext Steps:');
  console.log('1. Import Pipedrive data: Use Pipedrive bulk import feature');
  console.log('2. Import Sheets data: Copy CSV to Google Sheet');
  console.log('3. Test webhook: Use sample payloads for curl tests');
  console.log('');
}

// Run
main();
