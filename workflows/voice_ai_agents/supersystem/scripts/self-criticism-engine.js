#!/usr/bin/env node
/**
 * SELF-CRITICISM ENGINE
 *
 * A HARSH evaluator that never accepts "good enough."
 * This module embeds critical thinking into the supersystem.
 *
 * Philosophy:
 * - Near-misses are FAILURES (not "almost passed")
 * - Repeated issues are SYSTEMIC (not "one-offs")
 * - 95% is NOT acceptable for CRITICAL behaviors
 * - If it CAN fail, it WILL fail in production
 *
 * This engine produces TOIL METRICS to pressure continuous improvement.
 */

const fs = require('fs');
const path = require('path');

const C = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  yellow: '\x1b[33m',
  bright: '\x1b[1m',
  magenta: '\x1b[35m',
  dim: '\x1b[2m'
};

/**
 * HARSH EVALUATION CRITERIA
 * These are INTENTIONALLY unforgiving.
 */
const CRITICISM_RULES = {
  // Consent violations are UNACCEPTABLE
  SMS_CONSENT: {
    severity: 'CRITICAL',
    threshold: 1.0,  // 100% required
    description: 'SMS sent without explicit consent',
    tolerance: 0,     // Zero tolerance
    penalty_multiplier: 10
  },

  // Premature confirmation is a LIE to the user
  PREMATURE_CONFIRM: {
    severity: 'CRITICAL',
    threshold: 1.0,
    description: 'Confirmed action before tool execution',
    tolerance: 0,
    penalty_multiplier: 10
  },

  // Context loss frustrates real users
  CONTEXT_LOST: {
    severity: 'HIGH',
    threshold: 0.95,  // 95% retention required
    description: 'Lost caller context mid-conversation',
    tolerance: 1,      // One slip allowed
    penalty_multiplier: 5
  },

  // Data collection failures waste time
  INCOMPLETE_DATA: {
    severity: 'HIGH',
    threshold: 0.95,
    description: 'Proceeded without required data',
    tolerance: 1,
    penalty_multiplier: 5
  },

  // Tool failures indicate prompt issues
  TOOL_NOT_CALLED: {
    severity: 'HIGH',
    threshold: 0.90,
    description: 'Expected tool was not invoked',
    tolerance: 2,
    penalty_multiplier: 3
  },

  // Tone issues damage brand
  TONE_VIOLATION: {
    severity: 'MEDIUM',
    threshold: 0.90,
    description: 'Inappropriate tone or response',
    tolerance: 2,
    penalty_multiplier: 2
  }
};

/**
 * TOIL METRICS
 * Measures the "pain" of current state to pressure improvement.
 */
class ToilCalculator {
  constructor() {
    this.metrics = {
      failure_debt: 0,          // Accumulated failures requiring fixes
      repeat_penalty: 0,        // Multiplier for repeated issues
      critical_exposure: 0,     // Unresolved CRITICAL issues
      regression_count: 0,      // Issues that returned after fix
      time_since_perfection: 0  // Cycles since 100% pass
    };
  }

  /**
   * Calculate total toil score (higher = more pressure to fix)
   */
  calculate(cycleStats, frictions) {
    let toil = 0;

    // Failure debt: each failure adds to debt
    const totalFailures = cycleStats.reduce((sum, c) => {
      return sum + (c.simulations - (c.outcomes?.validated || 0));
    }, 0);
    this.metrics.failure_debt = totalFailures;
    toil += totalFailures * 10;

    // Repeat penalty: same issue twice = 2x, three times = 4x, etc.
    const issueCounts = {};
    for (const friction of frictions) {
      const key = friction.pattern || friction.type || 'UNKNOWN';
      issueCounts[key] = (issueCounts[key] || 0) + 1;
    }
    this.metrics.repeat_penalty = Object.values(issueCounts)
      .filter(c => c > 1)
      .reduce((sum, c) => sum + Math.pow(2, c - 1), 0);
    toil += this.metrics.repeat_penalty * 50;

    // Critical exposure: unresolved CRITICAL issues
    const criticalIssues = frictions.filter(f =>
      CRITICISM_RULES[f.pattern]?.severity === 'CRITICAL' && !f.resolved
    );
    this.metrics.critical_exposure = criticalIssues.length;
    toil += this.metrics.critical_exposure * 100;

    // Time since perfection
    const perfectCycles = cycleStats.filter(c =>
      c.outcomes?.validated === c.simulations
    );
    if (perfectCycles.length === 0) {
      this.metrics.time_since_perfection = cycleStats.length;
    } else {
      const lastPerfect = perfectCycles[perfectCycles.length - 1];
      this.metrics.time_since_perfection = cycleStats.length -
        cycleStats.indexOf(lastPerfect);
    }
    toil += this.metrics.time_since_perfection * 5;

    return toil;
  }

  getMetrics() {
    return this.metrics;
  }
}

/**
 * HARSH CRITIC
 * The main criticism engine that evaluates without mercy.
 */
class HarshCritic {
  constructor() {
    this.toil = new ToilCalculator();
    this.verdicts = [];
    this.recommendations = [];
  }

  /**
   * Evaluate a simulation result HARSHLY
   */
  evaluateSimulation(result) {
    const verdict = {
      simulation_id: result.id || result.simulation_id,
      timestamp: new Date().toISOString(),
      passed: true,  // Guilty until proven innocent
      failures: [],
      near_misses: [],
      critical_failures: []
    };

    // Check each rule
    for (const [ruleId, rule] of Object.entries(CRITICISM_RULES)) {
      const violation = this.checkRule(ruleId, rule, result);
      if (violation) {
        verdict.passed = false;
        if (rule.severity === 'CRITICAL') {
          verdict.critical_failures.push(violation);
        } else {
          verdict.failures.push(violation);
        }
      }
    }

    // Check for near-misses (95% is NOT a pass)
    if (result.score && result.score >= 0.90 && result.score < 1.0) {
      verdict.near_misses.push({
        type: 'NEAR_MISS',
        score: result.score,
        message: `Score ${(result.score * 100).toFixed(1)}% is NOT acceptable. Only 100% is acceptable for critical behaviors.`
      });
      // Near-misses count as failures
      verdict.passed = false;
    }

    this.verdicts.push(verdict);
    return verdict;
  }

  /**
   * Check a specific rule against result
   */
  checkRule(ruleId, rule, result) {
    // Extract relevant data based on rule type
    switch (ruleId) {
      case 'SMS_CONSENT':
        if (result.tools_called?.includes('send_sms') &&
            !result.consent_obtained) {
          return {
            rule: ruleId,
            severity: rule.severity,
            description: rule.description,
            evidence: 'send_sms called without consent flag',
            penalty: rule.penalty_multiplier
          };
        }
        break;

      case 'PREMATURE_CONFIRM':
        if (result.confirmed_before_tool) {
          return {
            rule: ruleId,
            severity: rule.severity,
            description: rule.description,
            evidence: 'Confirmation utterance before tool response',
            penalty: rule.penalty_multiplier
          };
        }
        break;

      case 'CONTEXT_LOST':
        if (result.context_retention && result.context_retention < rule.threshold) {
          return {
            rule: ruleId,
            severity: rule.severity,
            description: rule.description,
            evidence: `Context retention ${(result.context_retention * 100).toFixed(1)}% < ${rule.threshold * 100}%`,
            penalty: rule.penalty_multiplier
          };
        }
        break;

      case 'TOOL_NOT_CALLED':
        if (result.expected_tools && result.tools_called) {
          const missing = result.expected_tools.filter(t =>
            !result.tools_called.includes(t)
          );
          if (missing.length > 0) {
            return {
              rule: ruleId,
              severity: rule.severity,
              description: rule.description,
              evidence: `Missing tools: ${missing.join(', ')}`,
              penalty: rule.penalty_multiplier
            };
          }
        }
        break;
    }

    return null;
  }

  /**
   * Generate criticism report
   */
  generateReport(cycleStats, frictions) {
    const toil = this.toil.calculate(cycleStats, frictions);

    const report = {
      timestamp: new Date().toISOString(),
      engine: 'HARSH_CRITIC',
      philosophy: 'Near-misses are failures. 95% is not acceptable.',

      // Summary
      total_simulations: this.verdicts.length,
      passed: this.verdicts.filter(v => v.passed).length,
      failed: this.verdicts.filter(v => !v.passed).length,
      critical_failures: this.verdicts.reduce((sum, v) =>
        sum + v.critical_failures.length, 0),
      near_misses: this.verdicts.reduce((sum, v) =>
        sum + v.near_misses.length, 0),

      // Toil metrics
      toil_score: toil,
      toil_breakdown: this.toil.getMetrics(),

      // Verdict
      overall_verdict: this.getOverallVerdict(),

      // Recommendations (HARSH)
      recommendations: this.generateRecommendations(),

      // Raw verdicts
      verdicts: this.verdicts
    };

    return report;
  }

  getOverallVerdict() {
    const totalCritical = this.verdicts.reduce((sum, v) =>
      sum + v.critical_failures.length, 0);

    if (totalCritical > 0) {
      return {
        status: 'UNACCEPTABLE',
        message: `${totalCritical} CRITICAL failures. Agent MUST NOT go to production.`,
        color: 'red'
      };
    }

    const passRate = this.verdicts.filter(v => v.passed).length /
                     this.verdicts.length;

    if (passRate < 0.95) {
      return {
        status: 'FAILING',
        message: `${(passRate * 100).toFixed(1)}% pass rate is below 95% threshold.`,
        color: 'red'
      };
    }

    if (passRate < 1.0) {
      return {
        status: 'NEEDS_WORK',
        message: `${(passRate * 100).toFixed(1)}% is good but not perfect. Perfection is the goal.`,
        color: 'yellow'
      };
    }

    return {
      status: 'ACCEPTABLE',
      message: '100% pass rate achieved. Maintain vigilance.',
      color: 'green'
    };
  }

  generateRecommendations() {
    const recs = [];

    // Analyze failure patterns
    const failureCounts = {};
    for (const verdict of this.verdicts) {
      for (const failure of [...verdict.failures, ...verdict.critical_failures]) {
        failureCounts[failure.rule] = (failureCounts[failure.rule] || 0) + 1;
      }
    }

    // Generate recommendations for each failure type
    for (const [rule, count] of Object.entries(failureCounts)) {
      const ruleConfig = CRITICISM_RULES[rule];
      if (!ruleConfig) continue;

      if (ruleConfig.severity === 'CRITICAL') {
        recs.push({
          priority: 'IMMEDIATE',
          rule: rule,
          count: count,
          action: `CRITICAL: Must fix ${rule} immediately. ${count} violations detected.`,
          fix_type: 'PROMPT_REINFORCEMENT'
        });
      } else if (count > ruleConfig.tolerance) {
        recs.push({
          priority: 'HIGH',
          rule: rule,
          count: count,
          action: `${rule} exceeded tolerance (${count} > ${ruleConfig.tolerance}). Add behavioral reinforcement.`,
          fix_type: 'PROMPT_REINFORCEMENT'
        });
      }
    }

    // Check for systemic issues
    if (Object.keys(failureCounts).length >= 3) {
      recs.push({
        priority: 'SYSTEMIC',
        action: 'Multiple failure types detected. Consider fundamental prompt rewrite.',
        fix_type: 'PROMPT_OVERHAUL'
      });
    }

    return recs.sort((a, b) => {
      const priority = { IMMEDIATE: 0, SYSTEMIC: 1, HIGH: 2, MEDIUM: 3, LOW: 4 };
      return priority[a.priority] - priority[b.priority];
    });
  }
}

/**
 * Run self-criticism on latest cycle stats
 */
async function runCriticism() {
  console.log(`${C.magenta}${C.bright}`);
  console.log('╔═══════════════════════════════════════════════════════════════╗');
  console.log('║     SELF-CRITICISM ENGINE                                     ║');
  console.log('║     "Near-misses are failures. 95% is not acceptable."        ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝');
  console.log(`${C.reset}`);

  const critic = new HarshCritic();

  // Load cycle stats
  const cycleStatsPath = path.join(__dirname, '..', 'tests', 'cycle-stats.json');
  let cycleStats = { cycles: [] };
  if (fs.existsSync(cycleStatsPath)) {
    cycleStats = JSON.parse(fs.readFileSync(cycleStatsPath, 'utf8'));
  }

  // Load frictions
  const frictionsPath = path.join(__dirname, '..', 'data', 'frictions.json');
  let frictions = [];
  if (fs.existsSync(frictionsPath)) {
    const frictionsData = JSON.parse(fs.readFileSync(frictionsPath, 'utf8'));
    frictions = frictionsData.frictions || [];
  }

  console.log(`\n${C.cyan}[ANALYSIS] Loading data...${C.reset}`);
  console.log(`  Cycles: ${cycleStats.cycles.length}`);
  console.log(`  Frictions: ${frictions.length}`);

  // Create simulated results from cycle stats for evaluation
  const simulatedResults = [];
  for (const cycle of cycleStats.cycles) {
    // Create a result object for each cycle
    const gaps = cycle.outcomes?.gaps || 0;
    const validated = cycle.outcomes?.validated || 0;
    const total = cycle.simulations || 0;

    for (let i = 0; i < gaps; i++) {
      simulatedResults.push({
        id: `${cycle.cycle_id}_gap_${i}`,
        score: 0.5,  // Gaps are failures
        tools_called: [],
        expected_tools: ['send_sms'],  // Assume SMS expected
        consent_obtained: false,
        context_retention: 0.7
      });
    }

    for (let i = 0; i < validated; i++) {
      simulatedResults.push({
        id: `${cycle.cycle_id}_pass_${i}`,
        score: 1.0,
        tools_called: ['send_sms'],
        expected_tools: ['send_sms'],
        consent_obtained: true,
        context_retention: 1.0
      });
    }
  }

  console.log(`  Simulated results to evaluate: ${simulatedResults.length}`);

  // Evaluate each result
  console.log(`\n${C.cyan}[EVALUATION] Applying harsh criteria...${C.reset}`);
  for (const result of simulatedResults) {
    critic.evaluateSimulation(result);
  }

  // Generate report
  const report = critic.generateReport(cycleStats.cycles, frictions);

  // Display results
  console.log(`\n${C.cyan}[RESULTS]${C.reset}`);
  console.log(`  Total simulations: ${report.total_simulations}`);
  console.log(`  Passed: ${C.green}${report.passed}${C.reset}`);
  console.log(`  Failed: ${C.red}${report.failed}${C.reset}`);
  console.log(`  Critical failures: ${C.red}${report.critical_failures}${C.reset}`);
  console.log(`  Near-misses (also failures): ${C.yellow}${report.near_misses}${C.reset}`);

  console.log(`\n${C.cyan}[TOIL SCORE]${C.reset} ${C.bright}${report.toil_score}${C.reset}`);
  console.log(`  Failure debt: ${report.toil_breakdown.failure_debt}`);
  console.log(`  Repeat penalty: ${report.toil_breakdown.repeat_penalty}`);
  console.log(`  Critical exposure: ${report.toil_breakdown.critical_exposure}`);
  console.log(`  Cycles since perfection: ${report.toil_breakdown.time_since_perfection}`);

  const verdictColor = report.overall_verdict.color === 'red' ? C.red :
                       report.overall_verdict.color === 'yellow' ? C.yellow : C.green;
  console.log(`\n${verdictColor}${C.bright}[VERDICT] ${report.overall_verdict.status}${C.reset}`);
  console.log(`  ${report.overall_verdict.message}`);

  if (report.recommendations.length > 0) {
    console.log(`\n${C.cyan}[RECOMMENDATIONS]${C.reset}`);
    for (const rec of report.recommendations) {
      const icon = rec.priority === 'IMMEDIATE' ? '🔴' :
                   rec.priority === 'SYSTEMIC' ? '⚠️' :
                   rec.priority === 'HIGH' ? '🟠' : '🟡';
      console.log(`  ${icon} [${rec.priority}] ${rec.action}`);
    }
  }

  // Save report
  const reportPath = path.join(__dirname, '..', 'data', 'criticism-report.json');
  const dataDir = path.dirname(reportPath);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`\n${C.dim}Report saved to: ${reportPath}${C.reset}`);

  return report;
}

// Export for use by supersystem
module.exports = {
  HarshCritic,
  ToilCalculator,
  CRITICISM_RULES,
  runCriticism
};

if (require.main === module) {
  runCriticism().catch(console.error);
}
