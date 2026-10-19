import { SimulationMetrics, SystemStatus } from '../shared/simulationTypes';
import { clamp } from './split';

export interface ComputeMetricsParams {
  legitIn: number;
  attackIn: number;
  legitBlocked: number;
  attackBlocked: number;
  legitPassed: number;
  attackPassed: number;
  legitServed: number;
  attackServed: number;
  legitDropped: number;
  attackDropped: number;
  queueTotal: number;
  halfOpenNew: number;
  capacity: number;
  bandwidthCap: number;
  connectionSlots: number;
  queueCapacity: number;
}

/**
 * Computes deterministic simulation metrics with safe division guards.
 */
export function computeMetrics(params: ComputeMetricsParams): SimulationMetrics {
  const {
    legitIn,
    attackIn,
    legitBlocked,
    attackBlocked,
    legitPassed,
    attackPassed,
    legitServed,
    attackServed,
    legitDropped,
    attackDropped,
    queueTotal,
    halfOpenNew,
    capacity,
    bandwidthCap,
    connectionSlots,
    queueCapacity,
  } = params;

  const incoming = legitIn + attackIn;
  const blocked = legitBlocked + attackBlocked;
  const served = legitServed + attackServed;

  const rawAvailability =
    legitIn === 0 ? 100 : (legitServed / legitIn) * 100;
  const legitAvailabilityPercent = clamp(
    Math.round(rawAvailability * 10) / 10,
    0,
    100
  );

  const rawCpu = capacity === 0 ? 0 : (served / capacity) * 100;
  const cpuPercent = clamp(Math.round(rawCpu * 10) / 10, 0, 100);

  const rawBandwidth =
    bandwidthCap === 0
      ? 0
      : ((legitPassed + attackPassed) / bandwidthCap) * 100;
  const bandwidthPercent = clamp(Math.round(rawBandwidth * 10) / 10, 0, 100);

  const connectionsInUse = halfOpenNew + queueTotal;
  const rawConnections =
    connectionSlots === 0 ? 0 : (connectionsInUse / connectionSlots) * 100;
  const connectionPercent = clamp(
    Math.round(rawConnections * 10) / 10,
    0,
    100
  );

  const rawQueue =
    queueCapacity === 0 ? 0 : (queueTotal / queueCapacity) * 100;
  const queuePercent = clamp(Math.round(rawQueue * 10) / 10, 0, 100);

  const latencyMs =
    capacity === 0 ? 50 : 50 + Math.round((queueTotal / capacity) * 1000);

  let status: SystemStatus = 'down';
  if (legitAvailabilityPercent >= 90) {
    status = 'normal';
  } else if (legitAvailabilityPercent >= 50) {
    status = 'degraded';
  }

  return {
    incoming,
    blocked,
    legitServed,
    attackServed,
    legitDropped,
    attackDropped,
    queueDepth: queueTotal,
    cpuPercent,
    bandwidthPercent,
    connectionPercent,
    queuePercent,
    latencyMs,
    legitAvailabilityPercent,
    status,
  };
}
