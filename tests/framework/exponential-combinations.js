#!/usr/bin/env node
/**
 * ATDD: Exponential Field Combination Generator
 * Generates massive test matrices with N-way field combinations
 *
 * Mathematical basis:
 * - 2-way combinations: C(n,2) * v1 * v2
 * - 3-way combinations: C(n,3) * v1 * v2 * v3
 * - Pairwise covering arrays for efficient coverage
 *
 * @author BMAD TEA Agent
 * @date 2026-01-13
 */

const crypto = require('crypto');

// ============================================
// FIELD VALUE DOMAINS
// ============================================

const FIELD_DOMAINS = {
  // Event metadata
  event_type: {
    values: [
      'post_call_transcription', 'call_initiation_failure', 'call_ended',
      'call_started', 'agent_response', 'user_transcript', 'tool_call',
      'call_ringing', 'voicemail_detected', 'unknown_event'
    ],
    cardinality: 10
  },

  // Entity identifiers
  conversation_id: {
    generator: (seed) => `conv_${seed}_${Date.now()}`,
    cardinality: 1000,
    constraints: ['unique', 'format:conv_*']
  },

  agent_id: {
    values: [
      'agent_xxxx_demo',
      'agent_8801kdhbm6ane7wbxrq0vfenmsj9',
      'agent_test_001', 'agent_test_002'
    ],
    cardinality: 4
  },

  // CRM identifiers
  pipedrive_person_id: {
    values: [1, 100, 12345, 99999, 100000000, null, -1, 0],
    generator: (seed) => Math.abs(seed % 100000000) + 1,
    cardinality: 1000
  },

  // Contact information
  customer_name: {
    values: [
      'John Doe', 'Jane Smith', 'María García', '山田太郎',
      "O'Brien", 'X Æ A-12', '', null, 'A'.repeat(500)
    ],
    generator: (seed) => `Customer_${seed}`,
    cardinality: 100
  },

  phone: {
    values: [
      '+15551234567', '+447700900123', '+33612345678',
      '+1', '', 'invalid', null, '+' + '9'.repeat(20)
    ],
    generator: (seed) => `+1${(5550000000 + (seed % 9999999)).toString()}`,
    cardinality: 100
  },

  // Call metrics
  call_duration_secs: {
    values: [0, 1, 30, 60, 120, 300, 600, 900, 3600, -1, null],
    generator: (seed) => Math.abs(seed % 3600),
    cardinality: 100
  },

  // Call outcomes
  call_successful: {
    values: ['success', 'failure', 'unknown', 'partial', '', null],
    cardinality: 6
  },

  // Content fields
  transcript_summary: {
    values: [
      'Brief call about HVAC service',
      'Customer requested quote',
      'Emergency plumbing issue',
      'Scheduled appointment for Monday',
      '', null, 'A'.repeat(10000)
    ],
    generator: (seed) => `Summary for call ${seed}`,
    cardinality: 50
  },

  // Timing
  event_timestamp: {
    values: [
      Date.now(),
      Date.now() - 86400000, // Yesterday
      Date.now() + 86400000, // Tomorrow
      1, 0, -1, null
    ],
    generator: () => Date.now() - Math.floor(Math.random() * 604800000),
    cardinality: 100
  },

  // Tracing
  correlation_id: {
    generator: () => `trace_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
    cardinality: 1000
  },

  // Retry metadata
  retry_count: {
    values: [0, 1, 2, 3, 4, 5, -1, null],
    cardinality: 8
  }
};

// ============================================
// COMBINATION GENERATORS
// ============================================

class ExponentialCombinationGenerator {
  constructor(options = {}) {
    this.maxCombinations = options.maxCombinations || 1000000;
    this.pairwiseStrength = options.pairwiseStrength || 2; // 2-way, 3-way, etc.
    this.includeEdgeCases = options.includeEdgeCases !== false;
    this.seed = options.seed || Date.now();
  }

  /**
   * Generate value for a field
   */
  getFieldValue(fieldName, index) {
    const domain = FIELD_DOMAINS[fieldName];
    if (!domain) return null;

    if (domain.values && index < domain.values.length) {
      return domain.values[index];
    }

    if (domain.generator) {
      return domain.generator(this.seed + index);
    }

    return null;
  }

  /**
   * Get all values for a field
   */
  getFieldValues(fieldName, maxValues = 100) {
    const domain = FIELD_DOMAINS[fieldName];
    if (!domain) return [];

    const values = [];

    // Add explicit values
    if (domain.values) {
      values.push(...domain.values);
    }

    // Generate additional values
    if (domain.generator) {
      const genCount = Math.max(0, Math.min(maxValues, domain.cardinality) - values.length);
      for (let i = 0; i < genCount; i++) {
        values.push(domain.generator(this.seed + i));
      }
    }

    return [...new Set(values)].slice(0, maxValues);
  }

  /**
   * Generate all 2-way combinations (pairwise)
   */
  generatePairwiseCombinations() {
    const fieldNames = Object.keys(FIELD_DOMAINS);
    const combinations = [];

    for (let i = 0; i < fieldNames.length; i++) {
      for (let j = i + 1; j < fieldNames.length; j++) {
        const field1 = fieldNames[i];
        const field2 = fieldNames[j];

        const values1 = this.getFieldValues(field1, 20);
        const values2 = this.getFieldValues(field2, 20);

        for (const v1 of values1) {
          for (const v2 of values2) {
            combinations.push({
              id: `pair_${field1}_${field2}_${combinations.length}`,
              type: 'pairwise',
              fields: { [field1]: v1, [field2]: v2 },
              strength: 2
            });

            if (combinations.length >= this.maxCombinations) {
              return combinations;
            }
          }
        }
      }
    }

    return combinations;
  }

  /**
   * Generate 3-way combinations (more comprehensive)
   */
  generateTripleCombinations(maxPerTriple = 10) {
    const fieldNames = Object.keys(FIELD_DOMAINS);
    const combinations = [];

    for (let i = 0; i < fieldNames.length; i++) {
      for (let j = i + 1; j < fieldNames.length; j++) {
        for (let k = j + 1; k < fieldNames.length; k++) {
          const f1 = fieldNames[i], f2 = fieldNames[j], f3 = fieldNames[k];
          const v1s = this.getFieldValues(f1, 5);
          const v2s = this.getFieldValues(f2, 5);
          const v3s = this.getFieldValues(f3, 5);

          let count = 0;
          for (const v1 of v1s) {
            for (const v2 of v2s) {
              for (const v3 of v3s) {
                combinations.push({
                  id: `triple_${f1}_${f2}_${f3}_${count}`,
                  type: 'triple',
                  fields: { [f1]: v1, [f2]: v2, [f3]: v3 },
                  strength: 3
                });

                count++;
                if (count >= maxPerTriple) break;
                if (combinations.length >= this.maxCombinations) return combinations;
              }
              if (count >= maxPerTriple) break;
            }
            if (count >= maxPerTriple) break;
          }
        }
      }
    }

    return combinations;
  }

  /**
   * Generate edge case combinations
   */
  generateEdgeCaseCombinations() {
    const combinations = [];
    const fieldNames = Object.keys(FIELD_DOMAINS);

    // Null across all fields
    const allNulls = {};
    for (const field of fieldNames) {
      allNulls[field] = null;
    }
    combinations.push({
      id: 'edge_all_nulls',
      type: 'edge_case',
      fields: allNulls,
      description: 'All fields null'
    });

    // Empty strings across all fields
    const allEmpty = {};
    for (const field of fieldNames) {
      allEmpty[field] = '';
    }
    combinations.push({
      id: 'edge_all_empty',
      type: 'edge_case',
      fields: allEmpty,
      description: 'All fields empty string'
    });

    // Maximum valid values
    const allMax = {
      event_type: 'post_call_transcription',
      conversation_id: 'conv_' + 'a'.repeat(200),
      agent_id: 'agent_' + 'x'.repeat(100),
      pipedrive_person_id: Number.MAX_SAFE_INTEGER - 1,
      customer_name: 'X'.repeat(1000),
      phone: '+' + '9'.repeat(15),
      call_duration_secs: 86400,
      call_successful: 'success',
      transcript_summary: 'S'.repeat(50000),
      event_timestamp: Date.now() + 31536000000
    };
    combinations.push({
      id: 'edge_all_max',
      type: 'edge_case',
      fields: allMax,
      description: 'All fields at maximum'
    });

    // Minimum valid values
    const allMin = {
      event_type: 'post_call_transcription',
      conversation_id: 'conv_a',
      agent_id: 'agent_x',
      pipedrive_person_id: 1,
      customer_name: 'J',
      phone: '+11',
      call_duration_secs: 0,
      call_successful: 'success',
      transcript_summary: '',
      event_timestamp: 1
    };
    combinations.push({
      id: 'edge_all_min',
      type: 'edge_case',
      fields: allMin,
      description: 'All fields at minimum'
    });

    // Security payload combinations
    const securityPayloads = [
      { type: 'xss', value: '<script>alert(1)</script>' },
      { type: 'sql', value: "'; DROP TABLE events; --" },
      { type: 'command', value: '$(cat /etc/passwd)' },
      { type: 'path', value: '../../../etc/passwd' },
      { type: 'template', value: '{{7*7}}' }
    ];

    for (const payload of securityPayloads) {
      for (const field of ['customer_name', 'transcript_summary', 'conversation_id']) {
        combinations.push({
          id: `edge_security_${payload.type}_${field}`,
          type: 'security',
          fields: { [field]: payload.value },
          description: `${payload.type} injection in ${field}`
        });
      }
    }

    // Unicode edge cases
    const unicodeTests = [
      { name: 'emoji', value: '🔥💀🎉👻🚀' },
      { name: 'chinese', value: '漢字日本語' },
      { name: 'arabic', value: 'العربية' },
      { name: 'hebrew', value: 'עברית' },
      { name: 'rtl_mixed', value: 'Hello العربية World' },
      { name: 'null_bytes', value: 'test\x00hidden' },
      { name: 'bom', value: '\uFEFFtest' },
      { name: 'zalgo', value: 'Ḧ̷̢̧̛̝̱̩͇̫̘̲̖̰̪͍͎̙̣̙̗̻̜̲̮̦̰̝̮̹̩̮̱̝͉̰̙̣̪̟̣̭̞̗̪͕̝̻̗̞̻̼̼̩̝̠̳̜̝̻̳̙̗̖̖́͒̓̈́͑̎̀̀͛̽̿̄̈́̌̓̿̎̌̈̉̐̇̈́̅̿̄̈́͆̓̍̏͂̒̄͌̐̅̈́̓̃̈́̅͂̇̈́͌̈́̈́̀̌̀̊̉̈́̈́͘͘̚̕̕͜͝ͅ' }
    ];

    for (const unicode of unicodeTests) {
      combinations.push({
        id: `edge_unicode_${unicode.name}`,
        type: 'unicode',
        fields: { customer_name: unicode.value, transcript_summary: unicode.value },
        description: `Unicode test: ${unicode.name}`
      });
    }

    return combinations;
  }

  /**
   * Generate valid baseline combinations (should all pass)
   */
  generateValidBaselines() {
    const combinations = [];

    // Valid HVAC call
    combinations.push({
      id: 'valid_hvac_call',
      type: 'valid_baseline',
      fields: {
        event_type: 'post_call_transcription',
        conversation_id: `conv_hvac_${Date.now()}`,
        agent_id: 'agent_xxxx_demo',
        pipedrive_person_id: 12345,
        customer_name: 'John HVAC Customer',
        phone: '+15551234567',
        call_duration_secs: 180,
        call_successful: 'success',
        transcript_summary: 'Customer called about broken AC unit',
        event_timestamp: Date.now()
      },
      expectPass: true
    });

    // Valid plumbing call
    combinations.push({
      id: 'valid_plumbing_call',
      type: 'valid_baseline',
      fields: {
        event_type: 'post_call_transcription',
        conversation_id: `conv_plumb_${Date.now()}`,
        agent_id: 'agent_xxxx_demo',
        pipedrive_person_id: 67890,
        customer_name: 'Jane Plumber Customer',
        phone: '+15559876543',
        call_duration_secs: 240,
        call_successful: 'success',
        transcript_summary: 'Emergency call about burst pipe',
        event_timestamp: Date.now()
      },
      expectPass: true
    });

    // Valid failure event
    combinations.push({
      id: 'valid_failure_event',
      type: 'valid_baseline',
      fields: {
        event_type: 'call_initiation_failure',
        conversation_id: `conv_fail_${Date.now()}`,
        agent_id: 'agent_xxxx_demo',
        call_successful: 'failure',
        transcript_summary: 'Call failed to connect',
        event_timestamp: Date.now()
      },
      expectPass: true
    });

    return combinations;
  }

  /**
   * Generate full exponential suite
   */
  generateFullSuite() {
    console.log('╔════════════════════════════════════════════════════════════════╗');
    console.log('║  Exponential Combination Generator                             ║');
    console.log('║  Generating massive test matrices                              ║');
    console.log('╚════════════════════════════════════════════════════════════════╝\n');

    const allCombinations = [];

    // Generate pairwise (2-way) combinations
    console.log('Generating 2-way pairwise combinations...');
    const pairwise = this.generatePairwiseCombinations();
    allCombinations.push(...pairwise);
    console.log(`  Generated ${pairwise.length.toLocaleString()} pairwise combinations`);

    // Generate 3-way combinations
    console.log('Generating 3-way combinations...');
    const triples = this.generateTripleCombinations(5);
    allCombinations.push(...triples);
    console.log(`  Generated ${triples.length.toLocaleString()} triple combinations`);

    // Generate edge cases
    if (this.includeEdgeCases) {
      console.log('Generating edge case combinations...');
      const edges = this.generateEdgeCaseCombinations();
      allCombinations.push(...edges);
      console.log(`  Generated ${edges.length} edge case combinations`);
    }

    // Generate valid baselines
    console.log('Generating valid baseline combinations...');
    const baselines = this.generateValidBaselines();
    allCombinations.push(...baselines);
    console.log(`  Generated ${baselines.length} valid baseline combinations`);

    // Calculate statistics
    const stats = {
      total: allCombinations.length,
      byType: {},
      byStrength: {},
      uniqueFields: new Set()
    };

    for (const combo of allCombinations) {
      stats.byType[combo.type] = (stats.byType[combo.type] || 0) + 1;
      if (combo.strength) {
        stats.byStrength[combo.strength] = (stats.byStrength[combo.strength] || 0) + 1;
      }
      for (const field of Object.keys(combo.fields || {})) {
        stats.uniqueFields.add(field);
      }
    }

    console.log('\n════════════════════════════════════════════════════════════════');
    console.log('GENERATION SUMMARY');
    console.log('════════════════════════════════════════════════════════════════');
    console.log(`Total Combinations: ${stats.total.toLocaleString()}`);
    console.log(`Unique Fields: ${stats.uniqueFields.size}`);
    console.log('\nBy Type:');
    for (const [type, count] of Object.entries(stats.byType).sort((a, b) => b[1] - a[1])) {
      console.log(`  ${type}: ${count.toLocaleString()}`);
    }

    // Exponential potential calculation
    const fieldCount = Object.keys(FIELD_DOMAINS).length;
    const avgCardinality = Object.values(FIELD_DOMAINS)
      .reduce((sum, d) => sum + (d.cardinality || d.values?.length || 10), 0) / fieldCount;
    const fullCartesian = Math.pow(avgCardinality, fieldCount);

    console.log('\n════════════════════════════════════════════════════════════════');
    console.log('EXPONENTIAL COVERAGE ANALYSIS');
    console.log('════════════════════════════════════════════════════════════════');
    console.log(`Fields: ${fieldCount}`);
    console.log(`Avg Values/Field: ${avgCardinality.toFixed(1)}`);
    console.log(`Full Cartesian Product: ${fullCartesian.toExponential(2)}`);
    console.log(`Coverage Ratio: ${(stats.total / fullCartesian * 100).toFixed(6)}%`);
    console.log(`Tests Generated: ${stats.total.toLocaleString()}`);

    return {
      combinations: allCombinations,
      stats,
      coverage: {
        fieldCount,
        avgCardinality,
        fullCartesian,
        actualTests: stats.total,
        coverageRatio: stats.total / fullCartesian
      }
    };
  }
}

// Export
module.exports = { ExponentialCombinationGenerator, FIELD_DOMAINS };

// Run if called directly
if (require.main === module) {
  const generator = new ExponentialCombinationGenerator({
    maxCombinations: 100000,
    includeEdgeCases: true
  });

  const result = generator.generateFullSuite();
  console.log(`\n✓ Generated ${result.combinations.length.toLocaleString()} test combinations`);
}
