import type { SimulationConfig, SimulationMetrics } from '../shared/simulationTypes';

export const STABLE_TARGET = 15;
export const AVAILABILITY_TARGET = 85;

export function advanceStability(previous: number, availability: number): number {
  return availability >= AVAILABILITY_TARGET ? Math.min(STABLE_TARGET, previous + 1) : 0;
}

export function systemStatus(metrics: SimulationMetrics) {
  if (metrics.availabilityPct >= 90) return { label: 'Operational', tone: 'healthy' as const };
  if (metrics.availabilityPct >= 50) return { label: 'Degraded', tone: 'warning' as const };
  return { label: 'Service disrupted', tone: 'danger' as const };
}

export function resourcePressure(metrics: SimulationMetrics) {
  return Math.max(metrics.cpuPct, metrics.bandwidthPct, metrics.connectionPct, metrics.queuePct) >= 95;
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
  if (challenge && /hint|help|solution|solve/.test(q)) {
    const hints = [
      `Start with the evidence: availability is ${metrics.availabilityPct.toFixed(0)}% and CPU is ${metrics.cpuPct.toFixed(0)}%. Compare incoming traffic with processing capacity. Which resource is under the most pressure?`,
      'Inspect the two traffic sources. A filter can reduce unwanted traffic before it reaches your servers, but some legitimate requests may also be blocked. Try one change and observe several ticks.',
      'Additional servers only share work when the load balancer is enabled. Compare filtering with adding capacity, and watch legitimate availability rather than just the total requests served.',
    ];
    return hints[Math.min(hintLevel, hints.length - 1)];
  }
  if (/legitimate|false positive|being blocked|normal users/.test(q)) {
    return config.rateLimitEnabled
      ? `At ${Math.round(config.filterStrength * 100)}% filter strength, this mock blocks about ${Math.round(config.filterStrength * 10)}% of legitimate arrivals as false positives. Stronger filtering removes more surge traffic but can reduce legitimate availability. Find a balance and watch the availability metric.`
      : `Your filter is off, so no legitimate requests are being blocked by it. ${metrics.droppedNormal} legitimate requests were dropped this tick because of processing or queue pressure. Blocking at the filter and dropping under load are different outcomes.`;
  }
  if (/rate|filter|limiting/.test(q)) {
    return `Rate limiting filters traffic before processing. ${config.rateLimitEnabled ? `Your filter blocked ${metrics.blocked} requests this tick at ${Math.round(config.filterStrength * 100)}% strength.` : 'Your filter is currently off.'} In this educational model, stronger filtering blocks more surge traffic and a smaller share of legitimate traffic. Compare availability before and after each change.`;
  }
  if (/connection|slots|bandwidth/.test(q)) {
    return `Connection slots represent how many requests a server can keep active or waiting. The connected contract exposes utilization but no configurable connection or bandwidth limits. In this mock, these are normalized load estimates: connections ${metrics.connectionPct.toFixed(0)}%, bandwidth ${metrics.bandwidthPct.toFixed(0)}%. They are not measurements of a real network.`;
  }
  if (/queue|latency|waiting/.test(q)) {
    return `The queue holds requests that could not be processed immediately. It currently contains ${metrics.queueDepth} of ${config.queueCapacity} requests, with estimated latency of ${metrics.latencyMs} ms. ${metrics.queuePct >= 90 ? 'It is close to full, so further arrivals can be dropped.' : 'More queue space can absorb a short burst, but it does not add processing capacity.'} Reducing demand or increasing effective capacity helps the backlog drain.`;
  }
  if (/defen|balanc|server|capacity|slow|struggl|cause|bottleneck|cpu/.test(q)) {
    const capacity = config.serverCapacityRps * (config.balancerEnabled ? config.serverCount : 1);
    if (challenge) return `At tick ${metrics.incoming ? 'now' : 'zero'}, incoming traffic is ${metrics.incoming} requests/s and effective capacity is ${capacity} requests/s. CPU is ${metrics.cpuPct.toFixed(0)}% and the queue is ${metrics.queuePct.toFixed(0)}% full. Compare these signals, then test one defense at a time. Ask for a hint when you need another clue.`;
    return `${metrics.incoming} requests/s are arriving, with ${capacity} requests/s of effective processing capacity. CPU is ${metrics.cpuPct.toFixed(0)}% and availability is ${metrics.availabilityPct.toFixed(0)}%. ${config.serverCount > 1 && !config.balancerEnabled ? 'You have extra servers, but the load balancer is off: only one server handles traffic.' : metrics.cpuPct >= 90 ? 'Processing is under pressure. Try filtering surge traffic or distributing work across more servers.' : 'Processing has headroom. Watch the queue and availability as you increase traffic.'}`;
  }
  return 'I can explain traffic, resource pressure, queues, filtering, and load balancing using this lab’s current metrics. I’m a deterministic learning guide, not a general AI chatbot. Choose one of the suggested questions or ask about those topics.';
}
