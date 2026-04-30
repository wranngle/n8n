#!/usr/bin/env node
/**
 * Verify intake schema integration in Sarah agent
 */

require('./lib/env');

const API_KEY = process.env.ELEVENLABS_API_KEY;
const AGENT_ID = 'agent_xxxx_demo';

async function main() {
  const response = await fetch(`https://api.elevenlabs.io/v1/convai/agents/${AGENT_ID}`, {
    headers: { 'xi-api-key': API_KEY }
  });

  const agent = await response.json();
  const prompt = agent.conversation_config?.agent?.prompt?.prompt || '';

  console.log('=== INTAKE SCHEMA VERIFICATION ===\n');

  // Check for the 3 discovery questions
  const discoveryChecks = [
    {
      name: 'Volume Question',
      schemaField: 'q06_runs_per_period',
      patterns: [
        'how many after-hours calls',
        'Volume',
        'wake you up or go to voicemail'
      ]
    },
    {
      name: 'Current Solution Question',
      schemaField: 'q13_common_failures',
      patterns: [
        'what happens when someone calls at 2 AM',
        'Current Solution',
        'ring to your cell, go to a service, or just voicemail'
      ]
    },
    {
      name: 'Authority Question',
      schemaField: 'decision_maker',
      patterns: [
        'who handles the operations side',
        'Authority',
        'loop someone else in'
      ]
    }
  ];

  console.log('Discovery Questions in Prompt:\n');

  let allFound = true;
  for (const check of discoveryChecks) {
    const found = check.patterns.some(p => prompt.toLowerCase().includes(p.toLowerCase()));
    console.log(found ? '✓' : '✗', check.name);
    if (found) {
      // Find and show the actual question
      for (const pattern of check.patterns) {
        if (prompt.toLowerCase().includes(pattern.toLowerCase())) {
          const idx = prompt.toLowerCase().indexOf(pattern.toLowerCase());
          const context = prompt.substring(Math.max(0, idx - 20), idx + pattern.length + 50);
          console.log('  Found:', `"...${context.trim()}..."`);
          break;
        }
      }
    } else {
      allFound = false;
    }
    console.log('  Maps to:', check.schemaField);
    console.log('');
  }

  // Check for Phase 2: Discovery section
  const hasDiscoverySection = prompt.includes('Phase 2: Discovery') || prompt.includes('## Phase 2');
  console.log('\nDiscovery Section Structure:', hasDiscoverySection ? '✓ Present' : '✗ Missing');

  // Check for natural flow indicators
  const naturalFlow = [
    ['One question per turn', 'ONE question at a time'],
    ['Silence tracking', 'silently track'],
    ['Data collection order', 'Collect in this order']
  ];

  console.log('\nNatural Questioning Flow:\n');
  for (const [name, pattern] of naturalFlow) {
    const found = prompt.toLowerCase().includes(pattern.toLowerCase());
    console.log(found ? '✓' : '✗', name);
  }

  // Final verdict
  console.log('\n' + '='.repeat(50));
  if (allFound && hasDiscoverySection) {
    console.log('✓ INTAKE SCHEMA INTEGRATION: COMPLETE');
    console.log('\nThe 3 discovery questions are present and map to:');
    console.log('  1. Volume → q06_runs_per_period');
    console.log('  2. Current Solution → q13_common_failures');
    console.log('  3. Authority → decision_maker');
  } else {
    console.log('✗ INTAKE SCHEMA INTEGRATION: INCOMPLETE');
    console.log('\nSHOW STOPPER: Discovery questions missing from prompt');
  }
}

main().catch(console.error);
