/**
 * Test Generator Module
 *
 * Generates 1000+ ElevenLabs native tests from templates using
 * combinatorial expansion (cartesian product, pairwise, sampling).
 *
 * Features:
 * - YAML template loading
 * - Variable interpolation with {placeholder} syntax
 * - Multiple expansion strategies
 * - Schema compliance validation
 * - Deduplication by content hash
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Try to load js-yaml, fall back to basic parsing
let yaml;
try {
  yaml = require('js-yaml');
} catch (e) {
  // Basic YAML-like parser for simple cases
  yaml = {
    load: (content) => {
      // For complex YAML, we need the real parser
      throw new Error('js-yaml not found. Run: npm install js-yaml');
    }
  };
}

const TEMPLATES_DIR = path.join(__dirname, '..', 'templates');

/**
 * Load YAML file
 */
function loadYaml(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  return yaml.load(content);
}

/**
 * Load all templates from templates directory
 */
function loadTemplates(templatesDir = TEMPLATES_DIR) {
  const scenariosPath = path.join(templatesDir, 'base-scenarios.yaml');
  if (!fs.existsSync(scenariosPath)) {
    throw new Error(`Templates not found: ${scenariosPath}`);
  }
  return loadYaml(scenariosPath);
}

/**
 * Load variables (industries, variants)
 */
function loadVariables(templatesDir = TEMPLATES_DIR) {
  const variables = {};

  const industriesPath = path.join(templatesDir, 'industries.yaml');
  if (fs.existsSync(industriesPath)) {
    const data = loadYaml(industriesPath);
    variables.industries = data.industries || [];
  }

  const variantsPath = path.join(templatesDir, 'variants.yaml');
  if (fs.existsSync(variantsPath)) {
    const data = loadYaml(variantsPath);
    variables.demo_close_variants = data.demo_close_variants || [];
    variables.objection_variants = data.objection_variants || [];
    variables.personality_variants = data.personality_variants || [];
    variables.edge_case_variants = data.edge_case_variants || [];
  }

  return variables;
}

/**
 * Interpolate template string with variables
 * {placeholder} -> value
 */
function interpolate(template, context) {
  if (typeof template !== 'string') return template;

  return template.replace(/\{(\w+)\}/g, (match, key) => {
    if (context.hasOwnProperty(key)) {
      return context[key];
    }
    return match; // Keep unmatched placeholders
  });
}

/**
 * Deep interpolate an object
 */
function deepInterpolate(obj, context) {
  if (typeof obj === 'string') {
    return interpolate(obj, context);
  }
  if (Array.isArray(obj)) {
    return obj.map(item => deepInterpolate(item, context));
  }
  if (typeof obj === 'object' && obj !== null) {
    const result = {};
    for (const [key, value] of Object.entries(obj)) {
      result[key] = deepInterpolate(value, context);
    }
    return result;
  }
  return obj;
}

/**
 * Generate content hash for deduplication
 */
function contentHash(test) {
  const content = JSON.stringify({
    chat_history: test.chat_history,
    success_condition: test.success_condition,
  });
  return crypto.createHash('md5').update(content).digest('hex').substring(0, 8);
}

/**
 * Generate unique ID with UUID suffix
 */
function generateUniqueId(baseId) {
  const uuid = crypto.randomBytes(4).toString('hex');
  return `${baseId}-${uuid}`;
}

/**
 * Ensure test complies with ElevenLabs schema
 */
function ensureSchemaCompliance(test) {
  // Ensure chat_history ends with user message
  if (test.chat_history && test.chat_history.length > 0) {
    const lastMessage = test.chat_history[test.chat_history.length - 1];
    if (lastMessage.role !== 'user') {
      // Add a placeholder user message
      test.chat_history.push({
        role: 'user',
        message: 'I see.',
        time_in_call_secs: (lastMessage.time_in_call_secs || 0) + 5,
      });
    }
  }

  // Ensure all chat_history entries have time_in_call_secs
  if (test.chat_history) {
    test.chat_history = test.chat_history.map((entry, index) => ({
      ...entry,
      time_in_call_secs: entry.time_in_call_secs ?? index * 5,
    }));
  }

  // Ensure type is valid
  if (!['llm', 'tool'].includes(test.type)) {
    test.type = 'llm';
  }

  // Ensure name is under 100 characters
  if (test.name && test.name.length > 100) {
    test.name = test.name.substring(0, 97) + '...';
  }

  // Ensure required fields exist
  if (!test.success_condition) {
    test.success_condition = 'Agent responds appropriately';
  }
  if (!test.success_examples || test.success_examples.length === 0) {
    test.success_examples = [{ response: 'Appropriate response', type: 'success' }];
  }
  if (!test.failure_examples || test.failure_examples.length === 0) {
    test.failure_examples = [{ response: 'Inappropriate response', type: 'failure' }];
  }

  return test;
}

/**
 * Convert generated test to ElevenLabs API format
 */
function toApiFormat(test) {
  return {
    name: test.name,
    type: test.type,
    chat_history: test.chat_history,
    success_condition: test.success_condition,
    success_examples: test.success_examples,
    failure_examples: test.failure_examples,
    // Metadata (not sent to API, used for tracking)
    _meta: {
      id: test.id,
      category: test.category,
      priority: test.priority,
    },
  };
}

/**
 * Cartesian product expansion strategy
 * Generates all combinations of variables
 */
function cartesianExpand(template, variables) {
  const expandWith = template.expand_with || [];
  if (expandWith.length === 0) {
    return [template];
  }

  // Get variable arrays to expand
  const variableArrays = expandWith.map(name => {
    const varArray = variables[name];
    if (!varArray || varArray.length === 0) {
      console.warn(`Variable ${name} not found or empty`);
      return [{}];
    }
    return varArray;
  });

  // Generate cartesian product
  function cartesian(...arrays) {
    return arrays.reduce((acc, arr) =>
      acc.flatMap(x => arr.map(y => [...x, y])),
      [[]]
    );
  }

  const combinations = cartesian(...variableArrays);
  const results = [];

  for (const combo of combinations) {
    // Build context from combination
    const context = {};
    for (let i = 0; i < expandWith.length; i++) {
      const varName = expandWith[i];
      const varValue = combo[i];

      // Map variable properties to context
      // e.g., industries -> industry, industry_name, industry_greeting, etc.
      if (varName === 'industries') {
        context.industry = varValue.id || '';
        context.industry_name = varValue.name || '';
        context.industry_greeting = varValue.greeting || '';
        context.industry_pain = varValue.pain_point || '';
        context.industry_emergency = varValue.emergency_example || '';
        context.industry_routine = varValue.routine_example || '';
      } else if (varName.endsWith('_variants')) {
        const prefix = varName.replace('_variants', '');
        // Generic variant mapping (for first variant in template)
        if (!context.variant) {
          context.variant = varValue.id || '';
          context.variant_name = varValue.name || '';
          context.variant_response = varValue.response || '';
        }
        // Specific variant mapping (e.g., objection_variant, personality_variant)
        context[`${prefix}_variant`] = varValue.id || '';
        context[`${prefix}_variant_name`] = varValue.name || '';
        context[`${prefix}_variant_response`] = varValue.response || '';
        // For backwards compatibility with older template syntax
        context[`${prefix}`] = varValue.id || '';
      } else {
        // Generic mapping
        for (const [key, value] of Object.entries(varValue)) {
          context[`${varName}_${key}`] = value;
        }
      }
    }

    // Interpolate template with context
    const expanded = deepInterpolate(template, context);

    // Generate unique ID
    expanded.id = generateUniqueId(interpolate(template.id, context));

    results.push(expanded);
  }

  return results;
}

/**
 * Pairwise expansion strategy
 * Covers all 2-way variable combinations (smaller than cartesian)
 */
function pairwiseExpand(template, variables) {
  // For simplicity, we'll use a basic pairwise approach
  // A proper implementation would use a covering array algorithm
  const expandWith = template.expand_with || [];
  if (expandWith.length <= 1) {
    return cartesianExpand(template, variables);
  }

  // For 2 variables, pairwise = cartesian
  // For 3+ variables, we sample to reduce combinations
  const variableArrays = expandWith.map(name => variables[name] || [{}]);

  // Simple pairwise: for each pair of variables, cover all combinations
  // Then deduplicate
  const results = new Map();

  for (let i = 0; i < variableArrays.length; i++) {
    for (let j = i + 1; j < variableArrays.length; j++) {
      // Cover all pairs between variable i and j
      for (const vi of variableArrays[i]) {
        for (const vj of variableArrays[j]) {
          // Pick first element for other variables
          const combo = variableArrays.map((arr, k) => {
            if (k === i) return vi;
            if (k === j) return vj;
            return arr[0];
          });

          // Build context and expand (same as cartesian)
          const context = {};
          for (let k = 0; k < expandWith.length; k++) {
            const varName = expandWith[k];
            const varValue = combo[k];

            if (varName === 'industries') {
              context.industry = varValue.id || '';
              context.industry_name = varValue.name || '';
              context.industry_greeting = varValue.greeting || '';
              context.industry_pain = varValue.pain_point || '';
            } else if (varName.endsWith('_variants')) {
              context.variant = varValue.id || '';
              context.variant_name = varValue.name || '';
              context.variant_response = varValue.response || '';
            }
          }

          const expanded = deepInterpolate(template, context);
          const id = interpolate(template.id, context);
          expanded.id = id;

          // Deduplicate by base ID
          if (!results.has(id)) {
            expanded.id = generateUniqueId(id);
            results.set(id, expanded);
          }
        }
      }
    }
  }

  return Array.from(results.values());
}

/**
 * Sampling expansion strategy
 * Randomly samples from full cartesian space
 */
function samplingExpand(template, variables, sampleSize = 100) {
  const fullExpansion = cartesianExpand(template, variables);

  if (fullExpansion.length <= sampleSize) {
    return fullExpansion;
  }

  // Random sampling
  const shuffled = fullExpansion.sort(() => Math.random() - 0.5);
  return shuffled.slice(0, sampleSize);
}

/**
 * Expansion strategies
 */
const STRATEGIES = {
  cartesian: cartesianExpand,
  pairwise: pairwiseExpand,
  sampling: (template, variables, options = {}) =>
    samplingExpand(template, variables, options.sampleSize || 100),
};

/**
 * Main generator function
 *
 * @param {Object} options - Generation options
 * @returns {Array} Generated test definitions
 */
function generateTests(options = {}) {
  const {
    templatesDir = TEMPLATES_DIR,
    strategy = 'cartesian',
    maxTests = null,
    categories = null,
    priorities = null,
  } = options;

  // Load templates and variables
  const templateData = loadTemplates(templatesDir);
  const variables = loadVariables(templatesDir);
  const templates = templateData.templates || [];

  console.log(`Loaded ${templates.length} templates`);
  console.log(`Variables: ${Object.keys(variables).join(', ')}`);

  // Filter templates by category/priority if specified
  let filteredTemplates = templates;
  if (categories) {
    filteredTemplates = filteredTemplates.filter(t =>
      categories.includes(t.category)
    );
  }
  if (priorities) {
    filteredTemplates = filteredTemplates.filter(t =>
      priorities.includes(t.priority)
    );
  }

  console.log(`Using ${filteredTemplates.length} templates after filtering`);

  // Expand all templates
  const expansionFn = STRATEGIES[strategy] || STRATEGIES.cartesian;
  let allTests = [];

  for (const template of filteredTemplates) {
    const expanded = expansionFn(template, variables, options);
    allTests.push(...expanded);
  }

  console.log(`Expanded to ${allTests.length} raw tests`);

  // Ensure schema compliance
  allTests = allTests.map(ensureSchemaCompliance);

  // Deduplicate by content hash
  const seen = new Set();
  allTests = allTests.filter(test => {
    const hash = contentHash(test);
    if (seen.has(hash)) {
      return false;
    }
    seen.add(hash);
    return true;
  });

  console.log(`${allTests.length} unique tests after deduplication`);

  // Apply max limit if specified
  if (maxTests && allTests.length > maxTests) {
    allTests = allTests.slice(0, maxTests);
    console.log(`Limited to ${maxTests} tests`);
  }

  // Convert to API format
  return allTests.map(toApiFormat);
}

/**
 * Generate test summary statistics
 */
function summarizeTests(tests) {
  const summary = {
    total: tests.length,
    byCategory: {},
    byPriority: {},
    byType: {},
  };

  for (const test of tests) {
    const category = test._meta?.category || 'uncategorized';
    const priority = test._meta?.priority || 'medium';
    const type = test.type || 'llm';

    summary.byCategory[category] = (summary.byCategory[category] || 0) + 1;
    summary.byPriority[priority] = (summary.byPriority[priority] || 0) + 1;
    summary.byType[type] = (summary.byType[type] || 0) + 1;
  }

  return summary;
}

// Export
module.exports = {
  generateTests,
  loadTemplates,
  loadVariables,
  summarizeTests,
  ensureSchemaCompliance,
  toApiFormat,
  STRATEGIES,
  TEMPLATES_DIR,
};
