/**
 * Layer 3: Data Layer Manager
 * 
 * Manages test personas, seed data, friction logs, and cycle statistics.
 * Provides 50+ randomized test scenarios.
 */

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const PATHS = {
  SCENARIOS: path.join(__dirname, 'tests', 'simulation-scenarios.yaml'),
  FRICTION_LOG: path.join(__dirname, 'tests', 'friction-log.jsonl'),
  CYCLE_STATS: path.join(__dirname, 'tests', 'cycle-stats.json'),
  IMPROVEMENTS: path.join(__dirname, 'tests', 'improvement-suggestions.md'),
  PERSONAS_DIR: path.join(__dirname, 'data', 'personas'),
  SEED_DATA_DIR: path.join(__dirname, 'data', 'seed-data')
};

/**
 * Industry personas for random scenario generation
 */
const INDUSTRIES = [
  { name: 'dental practice', keywords: ['teeth', 'dental', 'dentist', 'appointment'] },
  { name: 'law firm', keywords: ['legal', 'attorney', 'lawyer', 'case'] },
  { name: 'real estate agency', keywords: ['property', 'house', 'listing', 'realtor'] },
  { name: 'auto repair shop', keywords: ['car', 'vehicle', 'mechanic', 'repair'] },
  { name: 'accounting firm', keywords: ['taxes', 'bookkeeping', 'CPA', 'financial'] },
  { name: 'medical clinic', keywords: ['doctor', 'health', 'patient', 'medical'] },
  { name: 'veterinary clinic', keywords: ['pet', 'animal', 'vet', 'dog', 'cat'] },
  { name: 'insurance agency', keywords: ['policy', 'coverage', 'claim', 'insurance'] },
  { name: 'restaurant', keywords: ['food', 'dining', 'reservation', 'menu'] },
  { name: 'salon/spa', keywords: ['hair', 'beauty', 'appointment', 'spa'] },
  { name: 'plumbing company', keywords: ['plumber', 'leak', 'pipe', 'water'] },
  { name: 'HVAC service', keywords: ['heating', 'cooling', 'AC', 'furnace'] },
  { name: 'property management', keywords: ['tenant', 'rent', 'property', 'landlord'] },
  { name: 'fitness studio', keywords: ['gym', 'workout', 'fitness', 'training'] }
];

/**
 * Caller name pool
 */
const NAMES = [
  'John', 'Sarah', 'Michael', 'Jennifer', 'David', 'Lisa', 'Robert', 'Amanda',
  'Chris', 'Emily', 'Tom', 'Karen', 'Steve', 'Michelle', 'Paul', 'Angela',
  'Mark', 'Jessica', 'Brian', 'Nicole', 'Kevin', 'Rachel', 'Jason', 'Laura'
];

/**
 * Call volume ranges
 */
const CALL_VOLUMES = ['10-20', '30-50', '50-100', '100-200', '200+'];

/**
 * Interest levels
 */
const INTEREST_LEVELS = [
  'very interested',
  'somewhat interested', 
  'curious but skeptical',
  'just exploring options'
];

/**
 * Objection types
 */
const OBJECTIONS = [
  { type: 'pricing', prompt: 'concerned about pricing being too high' },
  { type: 'technology', prompt: 'worried the technology is too new and unproven' },
  { type: 'trust', prompt: 'not trusting AI with customer interactions' },
  { type: 'complexity', prompt: 'worried about setup complexity and time investment' },
  { type: 'privacy', prompt: 'concerned about data privacy and security' },
  { type: 'fit', prompt: 'unsure if it works for their specific industry' }
];

/**
 * Generate random element from array
 */
function randomPick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Generate a random phone number
 */
function randomPhone() {
  const area = Math.floor(Math.random() * 900) + 100;
  const exchange = Math.floor(Math.random() * 900) + 100;
  const subscriber = Math.floor(Math.random() * 9000) + 1000;
  return `555-${exchange}-${subscriber}`;
}

/**
 * Generate random industry scenario
 */
function generateIndustryScenario(index) {
  const industry = randomPick(INDUSTRIES);
  const name = randomPick(NAMES);
  const volume = randomPick(CALL_VOLUMES);
  const interest = randomPick(INTEREST_LEVELS);
  const phone = randomPhone();
  
  // BUG FIX: Use single random value to ensure prompt matches expectedTools
  const willAcceptSms = Math.random() > 0.3;  // 70% accept, 30% decline

  return {
    id: `random_industry_${index}`,
    name: `Random: ${name} from ${industry.name}`,
    category: 'random_industry',
    priority: 'medium',
    prompt: `You are ${name}, calling about AI voice agents for your ${industry.name}.
You handle about ${volume} calls per day and are ${interest} in learning more.
Your phone number is ${phone}. Be natural and conversational.
If offered the booking SMS, ${willAcceptSms ? 'agree to receive it' : 'politely decline'}.`,
    expectedTools: willAcceptSms ? ['send_sms'] : [],
    forbiddenTools: [],
    tags: ['random', 'industry', industry.name.split(' ')[0]]
  };
}

/**
 * Generate random objection scenario
 */
function generateObjectionScenario(index) {
  const objection = randomPick(OBJECTIONS);
  const name = randomPick(NAMES);
  const phone = randomPhone();

  return {
    id: `random_objection_${index}`,
    name: `Random: ${name} with ${objection.type} objection`,
    category: 'random_objection',
    priority: 'medium',
    prompt: `You are ${name}, interested in AI voice agents but ${objection.prompt}.
Ask tough questions about ${objection.type}. Your phone is ${phone}.
If the agent handles your concerns well, warm up and consider booking a demo.
If not satisfied, politely end the call.`,
    expectedTools: [],  // May or may not book
    forbiddenTools: [],
    tags: ['random', 'objection', objection.type]
  };
}

/**
 * Generate N random scenarios
 */
function generateRandomScenarios(count = 50) {
  const scenarios = [];
  
  // 70% industry scenarios, 30% objection scenarios
  const industryCount = Math.floor(count * 0.7);
  const objectionCount = count - industryCount;

  for (let i = 0; i < industryCount; i++) {
    scenarios.push(generateIndustryScenario(i + 1));
  }

  for (let i = 0; i < objectionCount; i++) {
    scenarios.push(generateObjectionScenario(i + 1));
  }

  return scenarios;
}

/**
 * Load scenarios from YAML
 */
function loadScenarios() {
  if (!fs.existsSync(PATHS.SCENARIOS)) {
    return { scenarios: [], randomTemplates: [] };
  }

  const content = fs.readFileSync(PATHS.SCENARIOS, 'utf8');
  const data = yaml.load(content);

  // Normalize scenarios
  const scenarios = (data.scenarios || []).map(s => ({
    id: s.id,
    name: s.name,
    category: s.category || 'uncategorized',
    priority: s.priority || 'medium',
    prompt: s.simulated_user_prompt || s.prompt,
    criteria: s.evaluation_criteria || [],
    expectedTools: s.expected_tool_calls || [],
    forbiddenTools: s.forbidden_tool_calls || [],
    tags: s.tags || []
  }));

  return { scenarios, randomTemplates: data.random_scenario_templates || [] };
}

/**
 * Get all scenarios (static + random)
 */
function getAllScenarios(randomCount = 50) {
  const { scenarios } = loadScenarios();
  const randomScenarios = generateRandomScenarios(randomCount);
  return [...scenarios, ...randomScenarios];
}

/**
 * Log friction to JSONL file
 */
function logFriction(friction) {
  const entry = {
    timestamp: new Date().toISOString(),
    ...friction,
    resolved: false
  };

  fs.appendFileSync(PATHS.FRICTION_LOG, JSON.stringify(entry) + '\n');
  return entry;
}

/**
 * Get unresolved frictions
 */
function getUnresolvedFrictions() {
  if (!fs.existsSync(PATHS.FRICTION_LOG)) {
    return [];
  }

  const lines = fs.readFileSync(PATHS.FRICTION_LOG, 'utf8').trim().split('\n');
  return lines
    .filter(l => l.trim())
    .map(l => JSON.parse(l))
    .filter(f => !f.resolved);
}

/**
 * Mark friction as resolved
 */
function resolveFriction(frictionId) {
  if (!fs.existsSync(PATHS.FRICTION_LOG)) {
    return false;
  }

  const lines = fs.readFileSync(PATHS.FRICTION_LOG, 'utf8').trim().split('\n');
  const updated = lines.map(l => {
    const f = JSON.parse(l);
    if (f.id === frictionId || f.timestamp === frictionId) {
      f.resolved = true;
      f.resolvedAt = new Date().toISOString();
    }
    return JSON.stringify(f);
  });

  fs.writeFileSync(PATHS.FRICTION_LOG, updated.join('\n') + '\n');
  return true;
}

/**
 * Get cycle statistics
 */
function getCycleStats() {
  if (!fs.existsSync(PATHS.CYCLE_STATS)) {
    return { cycles: [] };
  }
  return JSON.parse(fs.readFileSync(PATHS.CYCLE_STATS, 'utf8'));
}

/**
 * Add cycle statistics
 */
function addCycleStats(cycleData) {
  const stats = getCycleStats();
  stats.cycles.push({
    ...cycleData,
    timestamp: new Date().toISOString()
  });
  fs.writeFileSync(PATHS.CYCLE_STATS, JSON.stringify(stats, null, 2));
  return stats;
}

/**
 * Count occurrences of a failure pattern
 */
function countPatternOccurrences(pattern) {
  const frictions = getUnresolvedFrictions();
  return frictions.filter(f => 
    f.type === pattern.type || 
    f.description?.includes(pattern.description)
  ).length;
}

/**
 * Update data (for Layer 4 Gemini calls)
 */
function updateData(dataType, action, data) {
  switch (dataType) {
    case 'scenario':
      // Would add/modify scenario in YAML
      console.log(`[Layer3] ${action} scenario:`, data);
      return { success: true, action, dataType };

    case 'persona':
      // Would add to personas
      console.log(`[Layer3] ${action} persona:`, data);
      return { success: true, action, dataType };

    case 'seed_data':
      // Would update seed data
      console.log(`[Layer3] ${action} seed_data:`, data);
      return { success: true, action, dataType };

    default:
      return { success: false, error: `Unknown data type: ${dataType}` };
  }
}

/**
 * Get known clients for seed data
 */
function getKnownClients() {
  const seedPath = path.join(PATHS.SEED_DATA_DIR, 'known-clients.json');
  if (!fs.existsSync(seedPath)) {
    // Return default seed data
    return [
      { phone: '+15551234567', name: 'Dr. Smith', company: 'Acme Dental', type: 'returning' },
      { phone: '+15559876543', name: 'Jake Wilson', company: 'Wilson Law', type: 'returning' },
      { phone: '+15555555555', name: 'Test User', company: 'Test Corp', type: 'test' }
    ];
  }
  return JSON.parse(fs.readFileSync(seedPath, 'utf8'));
}

module.exports = {
  loadScenarios,
  getAllScenarios,
  generateRandomScenarios,
  logFriction,
  getUnresolvedFrictions,
  resolveFriction,
  getCycleStats,
  addCycleStats,
  countPatternOccurrences,
  updateData,
  getKnownClients,
  INDUSTRIES,
  NAMES,
  OBJECTIONS,
  PATHS
};
