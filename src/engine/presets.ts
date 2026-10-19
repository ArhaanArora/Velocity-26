import { SimulationConfig } from '../shared/simulationTypes';

/**
 * Normal Traffic Preset:
 * Stable service with low utilization and 100% legitimate availability.
 */
export const normalTrafficPreset: SimulationConfig = {
  legitRate: 50,
  attackType: 'none',
  attackRate: 0,
  filterStrength: 0,
  loadBalancer: false,
  serverCount: 1,
  perServerCapacity: 300,
  perServerBandwidth: 1000,
  perServerConnections: 200,
  perServerQueue: 500,
};

/**
 * Traffic Surge Preset:
 * Workload exceeds single-server capacity, causing queuing, packet drops, and degraded service.
 */
export const trafficSurgePreset: SimulationConfig = {
  legitRate: 50,
  attackType: 'volume',
  attackRate: 800,
  filterStrength: 0,
  loadBalancer: false,
  serverCount: 1,
  perServerCapacity: 300,
  perServerBandwidth: 1000,
  perServerConnections: 200,
  perServerQueue: 500,
};

/**
 * Midnight Outage Preset:
 * The primary challenge scenario with massive volume overload (5000 rps attack).
 * Without defenses, service drops below 60% availability.
 * With filterStrength 0.9, loadBalancer true, and serverCount 3, availability recovers to >= 85%.
 */
export const midnightOutagePreset: SimulationConfig = {
  legitRate: 50,
  attackType: 'volume',
  attackRate: 5000,
  filterStrength: 0,
  loadBalancer: false,
  serverCount: 1,
  perServerCapacity: 300,
  perServerBandwidth: 1000,
  perServerConnections: 200,
  perServerQueue: 500,
};
