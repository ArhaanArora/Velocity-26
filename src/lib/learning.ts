import type { SimulationConfig, SimulationMetrics } from '../shared/simulationTypes';

export const STABLE_TARGET = 15;
export const AVAILABILITY_TARGET = 85;

export function advanceStability(previous: number, availability: number): number {
  return availability >= AVAILABILITY_TARGET ? Math.min(STABLE_TARGET, previous + 1) : 0;
}

export function systemStatus(metrics: SimulationMetrics) {
  if (metrics.status === 'normal') return { label: 'Operational', tone: 'healthy' as const };
  if (metrics.status === 'degraded') return { label: 'Degraded', tone: 'warning' as const };
  return { label: 'Service disrupted', tone: 'danger' as const };
}

export function resourcePressure(metrics: SimulationMetrics) {
  return Math.max(metrics.cpuPercent, metrics.bandwidthPercent, metrics.connectionPercent, metrics.queuePercent) >= 95;
}

export const suggestedQuestions = [
  'Why is my server struggling?',
  'What does rate limiting do?',
  'Why are legitimate users being blocked?',
  'What are connection slots?',
  'Why is the queue full?',
  "Why isn't my defense working?",
];

export function explain(question: string, config: SimulationConfig, metrics: SimulationMetrics, challenge = false, hintLevel = 0): string {
  const q = question.trim().toLowerCase();
  const effectiveServers = config.loadBalancer ? config.serverCount : 1;
  const capacity = config.perServerCapacity * effectiveServers;
  const legitimateBlocked = Math.round(config.legitRate * config.filterStrength * 0.1);
  if (challenge && /hint|help|solution|solve/.test(q)) {
    const hints = [
      `Start with the evidence: availability is ${metrics.legitAvailabilityPercent.toFixed(0)}% and CPU is ${metrics.cpuPercent.toFixed(0)}%. Compare incoming traffic with processing capacity. Which resource is under the most pressure?`,
      'Inspect the two traffic sources. A filter can reduce unwanted traffic before it reaches your servers, but some legitimate requests may also be blocked. Try one change and observe several ticks.',
      'Additional servers only share work when the load balancer is enabled. Compare filtering with adding capacity, and watch legitimate availability rather than just the total requests served.',
    ];
    return hints[Math.min(hintLevel, hints.length - 1)];
  }
  if (/legitimate|false positive|being blocked|normal users/.test(q)) {
    return (config.filterStrength > 0)
      ? `At ${Math.round(config.filterStrength * 100)}% filter strength, the engine filters ${legitimateBlocked} of ${config.legitRate} legitimate arrivals per second as false positives. This includes integer rounding. Stronger filtering removes more excess traffic but can reduce legitimate availability. Find a balance and watch the availability metric.`
      : `Your filter is off, so no legitimate requests are being blocked by it. ${metrics.legitDropped} legitimate requests were dropped this tick because of processing or queue pressure. Blocking at the filter and dropping under load are different outcomes.`;
  }
  if (/rate|filter|limiting/.test(q)) {
    return `Rate limiting filters traffic before processing. ${(config.filterStrength > 0) ? `Your filter blocked ${metrics.blocked} requests this tick at ${Math.round(config.filterStrength * 100)}% strength.` : 'Your filter is currently off.'} In this educational model, stronger filtering blocks more surge traffic and a smaller share of legitimate traffic. Compare availability before and after each change.`;
  }
  if (/connection|slots|bandwidth/.test(q)) {
    return `Connections are at ${metrics.connectionPercent.toFixed(0)}% of ${config.perServerConnections * effectiveServers} effective slots. In this model, queued requests and half-open SYN connections occupy these slots. SYN traffic reduces queue room; it does not directly stop requests that can be processed immediately. Bandwidth is at ${metrics.bandwidthPercent.toFixed(0)}% of ${config.perServerBandwidth * effectiveServers} requests/s. Bandwidth reports utilization and does not throttle processing in this educational engine.`;
  }
  if (/queue|latency|waiting/.test(q)) {
    return `The queue holds requests that could not be processed immediately. It currently contains ${metrics.queueDepth} of ${config.perServerQueue * effectiveServers} configured requests, with estimated latency of ${metrics.latencyMs} ms. ${metrics.connectionPercent >= 90 ? 'Free connection slots also limit queue room, even when the configured queue is not full.' : metrics.queuePercent >= 90 ? 'The queue is close to full, so further arrivals can be dropped.' : 'More queue space can absorb a short burst, but it does not add processing capacity.'} Reducing demand or increasing effective capacity helps the backlog drain.`;
  }
  if (/defen|balanc|server|capacity|slow|struggl|cause|bottleneck|cpu/.test(q)) {
    if (challenge) return `At the last simulated tick, incoming traffic was ${metrics.incoming} requests/s and effective capacity was ${capacity} requests/s. CPU is ${metrics.cpuPercent.toFixed(0)}% and the queue is ${metrics.queuePercent.toFixed(0)}% full. Compare these signals, then test one defense at a time. Ask for a hint when you need another clue.`;
    return `${metrics.incoming} requests/s arrived at the last tick, with ${capacity} requests/s of effective processing capacity. CPU is ${metrics.cpuPercent.toFixed(0)}% and availability is ${metrics.legitAvailabilityPercent.toFixed(0)}%. ${config.serverCount > 1 && !config.loadBalancer ? 'You have extra servers, but the load balancer is off: only one server handles traffic.' : metrics.connectionPercent >= 90 ? 'Connections are under pressure. Half-open SYN connections and queued requests compete for these slots; compare the connection and queue meters.' : metrics.cpuPercent >= 90 ? 'Processing is under pressure. Try filtering excess traffic or distributing work across more servers.' : 'Processing has headroom. Watch the queue and availability as you increase traffic.'}`;
  }
  return 'I can explain traffic, resource pressure, queues, filtering, and load balancing using this lab’s current metrics. I’m a deterministic learning guide, not a general AI chatbot. Choose one of the suggested questions or ask about those topics.';
}
