import { SimulationConfig, SimulationState } from '../shared/simulationTypes';
import { createInitialState, stepSimulation } from './step';
import { verifyAccounting } from './accounting';
import {
  normalTrafficPreset,
  trafficSurgePreset,
  midnightOutagePreset,
} from './presets';
import { simulationEngine } from './index';

interface AssertionResult {
  passed: boolean;
  message: string;
}

function assert(condition: boolean, message: string): AssertionResult {
  return { passed: condition, message };
}

// -----------------------------------------------------------------------------
// Part A: Preset Evaluations (20 ticks each)
// -----------------------------------------------------------------------------
function evaluatePreset(
  name: string,
  config: SimulationConfig,
  ticks: number
): {
  finalState: SimulationState;
  accountingPassed: boolean;
  historyLength: number;
} {
  let state = createInitialState(config);
  let accountingPassed = true;

  for (let i = 1; i <= ticks; i++) {
    const prevState = state;
    state = stepSimulation(config, prevState);

    const legitIn = config.legitRate;
    const attackIn = config.attackType === 'none' ? 0 : config.attackRate;
    const clampedFilter = Math.max(0, Math.min(1, config.filterStrength));
    const attackBlocked = Math.round(attackIn * clampedFilter);
    const legitBlocked = Math.round(legitIn * clampedFilter * 0.1);

    const m = state.metrics;
    const acct = verifyAccounting(
      legitIn,
      attackIn,
      legitBlocked,
      attackBlocked,
      m.legitServed,
      m.attackServed,
      m.legitDropped,
      m.attackDropped,
      prevState.queueLegit,
      state.queueLegit,
      prevState.queueAttack,
      state.queueAttack
    );

    if (!acct.allOk) {
      accountingPassed = false;
    }
  }

  return {
    finalState: state,
    accountingPassed,
    historyLength: state.history.length,
  };
}

export function runPresetsEvaluation(): void {
  console.log('=== PART A: PRESET EVALUATIONS (20 TICKS EACH) ===\n');

  // 1. Normal Traffic
  const normalRes = evaluatePreset('Normal Traffic', normalTrafficPreset, 20);
  const nm = normalRes.finalState.metrics;
  console.log('1. normalTrafficPreset:');
  console.log(
    `   Served: ${nm.legitServed + nm.attackServed} (Legit: ${nm.legitServed}, Attack: ${nm.attackServed}) | Dropped: ${nm.legitDropped + nm.attackDropped} | Blocked: ${nm.blocked}`
  );
  console.log(
    `   Availability: ${nm.legitAvailabilityPercent}% | CPU: ${nm.cpuPercent}% | Bandwidth: ${nm.bandwidthPercent}% | Queue: ${nm.queuePercent}% | Status: ${nm.status}`
  );
  console.log(
    `   Accounting: ${normalRes.accountingPassed ? 'PASSED (20/20 ticks)' : 'FAILED'}\n`
  );

  // 2. Traffic Surge
  const surgeRes = evaluatePreset('Traffic Surge', trafficSurgePreset, 20);
  const sm = surgeRes.finalState.metrics;
  console.log('2. trafficSurgePreset:');
  console.log(
    `   Served: ${sm.legitServed + sm.attackServed} (Legit: ${sm.legitServed}, Attack: ${sm.attackServed}) | Dropped: ${sm.legitDropped + sm.attackDropped} | Blocked: ${sm.blocked}`
  );
  console.log(
    `   Availability: ${sm.legitAvailabilityPercent}% | CPU: ${sm.cpuPercent}% | Bandwidth: ${sm.bandwidthPercent}% | Queue: ${sm.queuePercent}% | Status: ${sm.status}`
  );
  console.log(
    `   Accounting: ${surgeRes.accountingPassed ? 'PASSED (20/20 ticks)' : 'FAILED'}\n`
  );

  // 3. Midnight Outage (No defenses)
  const midnightBaseRes = evaluatePreset(
    'Midnight Outage (No defenses)',
    midnightOutagePreset,
    20
  );
  const mmBase = midnightBaseRes.finalState.metrics;
  console.log('3. midnightOutagePreset (No defenses):');
  console.log(
    `   Served: ${mmBase.legitServed + mmBase.attackServed} | Dropped: ${mmBase.legitDropped + mmBase.attackDropped} | Blocked: ${mmBase.blocked}`
  );
  console.log(
    `   Availability: ${mmBase.legitAvailabilityPercent}% (Target: < 60%) | CPU: ${mmBase.cpuPercent}% | Status: ${mmBase.status}`
  );
  console.log(
    `   Target Met (< 60%): ${mmBase.legitAvailabilityPercent < 60 ? 'YES (Actual: ' + mmBase.legitAvailabilityPercent + '%)' : 'NO'}`
  );
  console.log(
    `   Accounting: ${midnightBaseRes.accountingPassed ? 'PASSED (20/20 ticks)' : 'FAILED'}\n`
  );

  // 4. Midnight Outage (With Defenses: filterStrength 0.9, loadBalancer true, serverCount 3)
  const midnightDefendedConfig: SimulationConfig = {
    ...midnightOutagePreset,
    filterStrength: 0.9,
    loadBalancer: true,
    serverCount: 3,
  };
  const midnightDefRes = evaluatePreset(
    'Midnight Outage (Defended)',
    midnightDefendedConfig,
    20
  );
  const mmDef = midnightDefRes.finalState.metrics;
  console.log(
    '4. midnightOutagePreset (Defended: filterStrength 0.9, loadBalancer true, serverCount 3):'
  );
  console.log(
    `   Served: ${mmDef.legitServed + mmDef.attackServed} | Dropped: ${mmDef.legitDropped + mmDef.attackDropped} | Blocked: ${mmDef.blocked}`
  );
  console.log(
    `   Availability: ${mmDef.legitAvailabilityPercent}% (Target: >= 85%) | CPU: ${mmDef.cpuPercent}% | Status: ${mmDef.status}`
  );
  console.log(
    `   Target Met (>= 85%): ${mmDef.legitAvailabilityPercent >= 85 ? 'YES (Actual: ' + mmDef.legitAvailabilityPercent + '%)' : 'NO'}`
  );
  console.log(
    `   Accounting: ${midnightDefRes.accountingPassed ? 'PASSED (20/20 ticks)' : 'FAILED'}\n`
  );
}

// -----------------------------------------------------------------------------
// Part B: 10 Automated Test Suites
// -----------------------------------------------------------------------------
export function runAutomatedTests(): boolean {
  console.log('=== PART B: AUTOMATED TEST SUITES (10 AREAS) ===\n');
  const results: { testId: number; name: string; passed: boolean; details: string[] }[] = [];

  // Test 1: Normal operation
  {
    const state = stepSimulation(normalTrafficPreset, createInitialState(normalTrafficPreset));
    const m = state.metrics;
    const c1 = m.legitServed === 50 && m.legitDropped === 0;
    const c2 = m.legitAvailabilityPercent === 100 && m.status === 'normal';
    const c3 = m.queueDepth === 0;
    const passed = c1 && c2 && c3;
    results.push({
      testId: 1,
      name: 'Normal operation',
      passed,
      details: [
        `Served all 50 legit requests without drops: ${c1}`,
        `100% availability and normal status: ${c2}`,
        `Zero queue depth: ${c3}`,
      ],
    });
  }

  // Test 2: Overload
  {
    let state = createInitialState(trafficSurgePreset);
    for (let i = 0; i < 5; i++) {
      state = stepSimulation(trafficSurgePreset, state);
    }
    const m = state.metrics;
    const c1 = (m.legitDropped + m.attackDropped) > 0;

    const c2 = m.queueDepth > 0;
    const c3 = m.legitAvailabilityPercent < 100 && m.status !== 'normal';
    const passed = c1 && c2 && c3;
    results.push({
      testId: 2,
      name: 'Overload behavior',
      passed,
      details: [
        `Dropped requests under surge: ${c1}`,
        `Queue accumulates waiting requests: ${c2}`,
        `Degraded availability (<100%): ${c3}`,
      ],
    });
  }

  // Test 3: Filtering improvements and trade-offs
  {
    // Filter on overload improves availability
    const undefended = stepSimulation(midnightOutagePreset, createInitialState(midnightOutagePreset));
    const filteredConfig = { ...midnightOutagePreset, filterStrength: 0.9 };
    const filtered = stepSimulation(filteredConfig, createInitialState(filteredConfig));
    const c1 = filtered.metrics.blocked > 4000;
    const c2 = filtered.metrics.legitAvailabilityPercent > undefended.metrics.legitAvailabilityPercent;

    // Collateral damage check on normal traffic
    const collateralConfig = { ...normalTrafficPreset, filterStrength: 0.9 };
    const collateral = stepSimulation(collateralConfig, createInitialState(collateralConfig));
    const c3 = collateral.metrics.blocked === 5 && collateral.metrics.legitServed === 45;

    const passed = c1 && c2 && c3;
    results.push({
      testId: 3,
      name: 'Filtering improvements and trade-offs',
      passed,
      details: [
        `Blocks attack traffic (>4000 blocked): ${c1}`,
        `Availability improves under attack: ${c2}`,
        `Collateral damage drops 10% legitimate traffic when filter is high: ${c3}`,
      ],
    });
  }

  // Test 4: Load balancing behavior
  {
    const noLbConfig = { ...midnightOutagePreset, serverCount: 3, loadBalancer: false };
    const withLbConfig = { ...midnightOutagePreset, serverCount: 3, loadBalancer: true };
    const noLb = stepSimulation(noLbConfig, createInitialState(noLbConfig));
    const withLb = stepSimulation(withLbConfig, createInitialState(withLbConfig));

    const c1 = (noLb.metrics.legitServed + noLb.metrics.attackServed) === 300;
    const c2 = (withLb.metrics.legitServed + withLb.metrics.attackServed) === 900;
    const passed = c1 && c2;
    results.push({
      testId: 4,
      name: 'Load balancing behavior',
      passed,
      details: [
        `Without loadBalancer, 3 servers process only 1 server capacity (300): ${c1}`,
        `With loadBalancer, 3 servers scale throughput to 900: ${c2}`,
      ],
    });
  }

  // Test 5: Capacity adjustments
  {
    const cap300 = stepSimulation(midnightOutagePreset, createInitialState(midnightOutagePreset));
    const config600 = { ...midnightOutagePreset, perServerCapacity: 600 };
    const cap600 = stepSimulation(config600, createInitialState(config600));

    const c1 = (cap300.metrics.legitServed + cap300.metrics.attackServed) === 300;
    const c2 = (cap600.metrics.legitServed + cap600.metrics.attackServed) === 600;
    const passed = c1 && c2;
    results.push({
      testId: 5,
      name: 'Capacity adjustments',
      passed,
      details: [
        `Capacity 300 serves 300 under overload: ${c1}`,
        `Capacity 600 serves 600 under overload: ${c2}`,
      ],
    });
  }

  // Test 6: Queue capacity limits
  {
    let state = createInitialState(midnightOutagePreset);
    for (let i = 0; i < 5; i++) {
      state = stepSimulation(midnightOutagePreset, state);
    }
    const c1 = state.metrics.queueDepth <= 200; // connectionSlots limit is 200

    const zeroQueueConfig = { ...midnightOutagePreset, perServerQueue: 0 };
    const zeroQueueState = stepSimulation(zeroQueueConfig, createInitialState(zeroQueueConfig));
    const c2 = zeroQueueState.metrics.queueDepth === 0 && zeroQueueState.metrics.queuePercent === 0;

    const passed = c1 && c2;
    results.push({
      testId: 6,
      name: 'Queue capacity limits',
      passed,
      details: [
        `Queue never exceeds available connection slots (<=200): ${c1}`,
        `Zero queue capacity correctly results in 0 depth and 0%: ${c2}`,
      ],
    });
  }

  // Test 7: Valid percentage ranges
  {
    const extremeConfigs: SimulationConfig[] = [
      { ...normalTrafficPreset, legitRate: 0, attackRate: 0 },
      { ...midnightOutagePreset, attackRate: 50000 },
      { ...normalTrafficPreset, filterStrength: 1.5, serverCount: -2 },
    ];

    let allInRange = true;
    for (const cfg of extremeConfigs) {
      const st = stepSimulation(cfg, createInitialState(cfg));
      const m = st.metrics;
      const pcts = [
        m.cpuPercent,
        m.bandwidthPercent,
        m.connectionPercent,
        m.queuePercent,
        m.legitAvailabilityPercent,
      ];
      for (const p of pcts) {
        if (p < 0 || p > 100 || isNaN(p)) {
          allInRange = false;
        }
      }
    }
    results.push({
      testId: 7,
      name: 'Valid percentage ranges',
      passed: allInRange,
      details: ['All percentages strictly bounded within [0, 100] across extreme inputs'],
    });
  }

  // Test 8: Deterministic simulation
  {
    let stateA = createInitialState(midnightOutagePreset);
    let stateB = createInitialState(midnightOutagePreset);
    let identical = true;

    for (let i = 0; i < 10; i++) {
      stateA = stepSimulation(midnightOutagePreset, stateA);
      stateB = stepSimulation(midnightOutagePreset, stateB);
      if (JSON.stringify(stateA) !== JSON.stringify(stateB)) {
        identical = false;
        break;
      }
    }
    results.push({
      testId: 8,
      name: 'Deterministic simulation',
      passed: identical,
      details: ['Identical configurations produce byte-for-byte identical states across 10 ticks'],
    });
  }

  // Test 9: Valid state history (at most 60, newest last)
  {
    let state = createInitialState(normalTrafficPreset);
    for (let i = 1; i <= 75; i++) {
      state = stepSimulation(normalTrafficPreset, state);
    }
    const c1 = state.history.length === 60;
    const c2 = state.history[0].tick === 16;
    const c3 = state.history[59].tick === 75;
    const passed = c1 && c2 && c3;
    results.push({
      testId: 9,
      name: 'Valid state history',
      passed,
      details: [
        `History capped at exactly 60 entries after 75 ticks: ${c1}`,
        `Oldest entry is tick 16: ${c2}`,
        `Newest entry is tick 75: ${c3}`,
      ],
    });
  }

  // Test 10: Correct public exports
  {
    const c1 = typeof simulationEngine.createInitialState === 'function';
    const c2 = typeof simulationEngine.stepSimulation === 'function';
    const c3 =
      normalTrafficPreset &&
      trafficSurgePreset &&
      midnightOutagePreset &&
      typeof normalTrafficPreset.legitRate === 'number';
    const passed = Boolean(c1 && c2 && c3);
    results.push({
      testId: 10,
      name: 'Correct public exports',
      passed,
      details: [
        `simulationEngine.createInitialState exported: ${c1}`,
        `simulationEngine.stepSimulation exported: ${c2}`,
        `All three standard presets exported and valid: ${c3}`,
      ],
    });
  }

  let allPassed = true;
  for (const r of results) {
    console.log(`Test ${r.testId}: ${r.name} -> ${r.passed ? 'PASS' : 'FAIL'}`);
    for (const d of r.details) {
      console.log(`   - ${d}`);
    }
    if (!r.passed) allPassed = false;
  }

  console.log(
    `\nOverall Test Suite Result: ${
      allPassed ? 'ALL 10 TESTS PASSED' : 'SOME TESTS FAILED'
    }\n`
  );
  return allPassed;
}

runPresetsEvaluation();
runAutomatedTests();
