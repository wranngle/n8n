/**
 * test.config.js
 * Central test configuration for governance hook testing
 */

module.exports = {
  // Test environment
  environment: 'test',

  // Timeout settings (ms)
  timeouts: {
    unit: 5000,
    integration: 30000,
    e2e: 60000
  },

  // Coverage thresholds
  coverage: {
    statements: 80,
    branches: 70,
    functions: 80,
    lines: 80
  },

  // Test categories
  categories: {
    unit: {
      pattern: '**/*.test.js',
      exclude: ['**/integration/**', '**/e2e/**']
    },
    integration: {
      pattern: '**/integration/**/*.test.js'
    },
    e2e: {
      pattern: '**/e2e/**/*.test.js'
    }
  },

  // Mock data paths
  fixtures: {
    governance: './fixtures/governance.fixture.js',
    workflows: './fixtures/workflows.fixture.js',
    hooks: './fixtures/hooks.fixture.js'
  },

  // Reporter configuration
  reporters: {
    console: true,
    json: './reports/test-results.json',
    html: './reports/test-results.html'
  },

  // Hooks under test
  hooks: {
    naming: '../hooks/naming-convention.js',
    governance: '../hooks/workflow-governance.js',
    preDeploy: '../hooks/pre-deploy-check.js',
    detectIntent: '../hooks/detect-workflow-intent.js'
  },

  // Governance policy
  policy: {
    validPhases: ['DEV', 'ARCHIVED'],
    modifiablePhases: ['DEV'],
    protectedPhases: ['ARCHIVED'],
    similarityThreshold: 70
  }
};
