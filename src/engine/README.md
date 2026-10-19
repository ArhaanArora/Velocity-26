# CyberLab Simulation Engine

The **CyberLab Simulation Engine** is a pure, deterministic TypeScript discrete-time simulator designed for browser-based cybersecurity education. It models web traffic dynamics, Denial of Service (DoS/DDoS) attacks, and defensive mitigation strategies tick by tick (where 1 tick = 1 simulated second).

---

## 1. What the Engine Simulates

The engine models how web applications and server infrastructures behave under varying traffic loads and cyberattacks:

- **Legitimate User Traffic**: Regular inbound requests arriving at a configured rate (`legitRate` requests/second).
- **Attack Traffic**: Malicious request floods at a configured rate (`attackRate`):
  - **Volume Flood (`attackType: 'volume'`)**: High-rate HTTP/application floods aimed at saturating bandwidth, server processing CPU, and request buffers.
  - **SYN Flood (`attackType: 'syn'`)**: TCP-level connection-exhaustion attacks where uncompleted three-way handshakes occupy concurrent connection slots (`halfOpen`), starving room for legitimate traffic.
- **Resource Bottlenecks**:
  - Processing capacity (`perServerCapacity` requests/second).
  - Network bandwidth limits (`perServerBandwidth` requests/second).
  - Concurrent connection slot limits (`perServerConnections` slots).
  - Request queuing buffers (`perServerQueue` slots).
- **System Health & Observability**:
  - Real-time utilization percentages (CPU %, Bandwidth %, Connection %, Queue %).
  - Estimated round-trip latency (`latencyMs`).
  - Legitimate availability percentage (`legitAvailabilityPercent`).
  - System status (`'normal'`, `'degraded'`, `'down'`).

---

## 2. What It Intentionally Simplifies (Educational Model)

To deliver instant, interactive, deterministic performance in the browser without network latency or heavy computing overhead, the engine incorporates educational abstractions:

1. **Discrete-Time 1-Second Ticks**: Instead of processing nanosecond-level packet arrivals, all events are aggregated into 1-second ticks.
2. **Deterministic Proportional Sharing (Weighted Fair Queuing)**: Unserved requests and available capacities are shared proportionally between legitimate and attack traffic using an exact integer split rule, rather than cycle-accurate per-packet FIFO ordering.
3. **Simplified TCP Handshake Decay**: Half-open SYN connections decay deterministically (`halfOpenKept = halfOpen − ceil(halfOpen / 3)`), simulating approximately 3-second TCP SYN timeout behavior.
4. **Aggregate Bandwidth**: Bandwidth is modeled in requests per second rather than raw byte/packet frame counting.
5. **No Backend or Randomness**: The engine is 100% pure TypeScript with no dependencies, math randomness, or network calls.

---

## 3. How to Import the Engine

Import the engine directly from `src/engine`:

```typescript
import {
  simulationEngine,
  createInitialState,
  stepSimulation,
  normalTrafficPreset,
  trafficSurgePreset,
  midnightOutagePreset,
} from './engine';
```

---

## 4. How to Run One Tick

Advancing the simulation requires an immutable state transition:

```typescript
import { simulationEngine, normalTrafficPreset } from './engine';

// 1. Create the initial state at tick 0
let state = simulationEngine.createInitialState(normalTrafficPreset);

// 2. Advance the simulation by 1 tick (1 simulated second)
state = simulationEngine.stepSimulation(normalTrafficPreset, state);

console.log(`Tick: ${state.tick}`);
console.log(`Availability: ${state.metrics.legitAvailabilityPercent}%`);
console.log(`CPU Utilization: ${state.metrics.cpuPercent}%`);
console.log(`Status: ${state.metrics.status}`);
```

The engine never mutates `state`. It always returns a newly allocated `SimulationState` containing updated metrics, updated internal queues, and a rolling buffer of the newest 60 snapshots in `state.history`.

---

## 5. How Each Defense Setting Affects the Model

| Defense Setting | Type | Effect on the Model |
|---|---|---|
| `filterStrength` | `number` (0 to 1) | **Traffic Filtering**: Blocks a proportion of attack traffic (`attackBlocked = round(attackRate × filterStrength)`). Crucially models real-world collateral damage: drops 10% of that strength from legitimate traffic as false positives (`legitBlocked = round(legitRate × filterStrength × 0.1)`). |
| `loadBalancer` | `boolean` | **Horizontal Scaling Switch**: When `false`, only 1 server processes traffic regardless of `serverCount`. When `true`, enables multi-server scaling (`effectiveServers = serverCount`). |
| `serverCount` | `number` ($\ge 1$) | **Server Cluster Size**: Multiplies `capacity`, `bandwidthCap`, `connectionSlots`, and `queueCapacity` by `serverCount` when `loadBalancer: true`. Has **no effect** if `loadBalancer` is `false`. |
| `perServerCapacity` | `number` ($\ge 1$) | **Vertical Server Scaling**: Direct request processing capability per server. Raising capacity increases total served throughput and reduces queue latency. |
