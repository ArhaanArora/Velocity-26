import type { SimulationConfig, SimulationMetrics } from '../shared/simulationTypes';

export interface ChangeBaseline {
  metrics: SimulationMetrics;
  config: SimulationConfig;
  tick: number;
}

export interface MeasuredOutcome {
  kind: 'improved' | 'worse' | 'steady' | 'initial';
  title: string;
  explanation: string;
  action: string;
  before: SimulationMetrics;
  after: SimulationMetrics;
  beforeTick: number;
  afterTick: number;
  availabilityDelta: number | null;
}

export function sameConfig(a: SimulationConfig, b: SimulationConfig) {
  return (Object.keys(a) as (keyof SimulationConfig)[]).every(key => a[key] === b[key]);
}

export function describeChange(before: SimulationConfig, after: SimulationConfig): string {
  const changes = (Object.keys(before) as (keyof SimulationConfig)[]).filter(key => before[key] !== after[key]);
  if (changes.length > 0 && changes.every(key => key === 'legitRate' || key === 'attackRate' || key === 'attackType')) return 'Traffic adjusted';
  if (changes.length !== 1) return 'Network settings updated';
  switch (changes[0]) {
    case 'filterStrength': return after.filterStrength === 0 ? 'Rate limiter removed' : before.filterStrength === 0 ? 'Rate limiter added' : 'Filtering adjusted';
    case 'loadBalancer': return after.loadBalancer ? 'Load balancing enabled' : 'Load balancing disabled';
    case 'serverCount': return after.serverCount > before.serverCount ? 'Server added' : 'Server removed';
    case 'attackRate': case 'attackType': case 'legitRate': return 'Traffic adjusted';
    default: return 'Server capacity adjusted';
  }
}

export function measureChange(baseline: ChangeBaseline, after: SimulationMetrics, config: SimulationConfig, tick: number): MeasuredOutcome {
  if (tick <= baseline.tick) throw new Error('Measure a configuration change only after simulation time advances.');
  const before = baseline.metrics;
  const delta = Math.round((after.legitAvailabilityPercent - before.legitAvailabilityPercent) * 10) / 10;
  const kind = baseline.tick === 0 ? 'initial' : delta > 0 ? 'improved' : delta < 0 ? 'worse' : 'steady';
  let explanation = 'This is one measured second. Keep observing to see whether the effect lasts.';
  if (kind === 'initial') explanation = 'This is the first measured tick. Make another change to compare it with an observed baseline.';
  else if (config.serverCount > 1 && !config.loadBalancer && config.serverCount > baseline.config.serverCount) explanation = 'Extra servers are waiting. Add a load balancer to let them share the work.';
  else if (kind === 'improved' && config.filterStrength > baseline.config.filterStrength && after.blocked > before.blocked) explanation = 'Filtering reduced competing traffic. More legitimate requests were served relative to incoming demand.';
  else if (kind === 'improved' && config.loadBalancer && (!baseline.config.loadBalancer || config.serverCount > baseline.config.serverCount)) explanation = 'The active servers share the workload. More customers reached the store in this measured tick.';
  else if (kind === 'worse' && config.filterStrength > baseline.config.filterStrength) explanation = 'Stronger filtering also rejects some legitimate requests. The queue and traffic mix can affect the result; observe another tick.';
  else if (kind === 'worse') explanation = 'Fewer customers reached the store after this change. Inspect resource pressure and test one adjustment at a time.';
  else if (kind === 'steady' && after.latencyMs !== before.latencyMs) explanation = `Availability stayed steady. Modeled response time changed from ${before.latencyMs} to ${after.latencyMs} ms.`;
  return {
    kind,
    title: kind === 'improved' ? 'Your network is recovering.' : kind === 'worse' ? 'The store is under more pressure.' : kind === 'initial' ? 'Your first result is in.' : 'No change in availability yet.',
    explanation, action: describeChange(baseline.config, config),
    before: { ...before }, after: { ...after }, beforeTick: baseline.tick, afterTick: tick,
    availabilityDelta: kind === 'initial' ? null : delta,
  };
}

export function storeCondition(metrics: SimulationMetrics): 'healthy' | 'degraded' | 'unavailable' {
  if (metrics.status === 'down' || metrics.legitAvailabilityPercent < 50) return 'unavailable';
  if (metrics.status === 'degraded' || metrics.legitAvailabilityPercent < 90 || metrics.latencyMs >= 300) return 'degraded';
  return 'healthy';
}

export function customerInsight(metrics: SimulationMetrics): string {
  if (metrics.status === 'down') return 'Most customers cannot reach the store. Investigate the network and try a defense.';
  if (metrics.connectionPercent >= 95) return 'Connection slots are nearly full. Waiting requests have less room.';
  if (metrics.cpuPercent >= 95) return 'The server is working at its processing limit. New requests are competing for its attention.';
  if (metrics.queuePercent >= 90 || metrics.latencyMs >= 300) return 'Requests are waiting. Customers may notice slow page loads.';
  if (metrics.status === 'degraded') return 'Some legitimate customers are missing out. Compare availability after your next change.';
  return 'Customers can browse comfortably. Try increasing traffic to discover where the limits are.';
}
