# CyberLab frontend integration

The frontend runs with no `src/engine/` directory. Its only simulation import is
`simulationEngine` from `src/adapters/engineAdapter.ts`. Presets currently live in
`src/lib/presets.ts` and use the checked-in shared contract.

To integrate an engine that implements that exact contract, replace the adapter
export with `export { simulationEngine } from '../engine';`. Replace the temporary
presets with the engine's compatible presets. Run `npm test` and `npm run build`,
then verify normal traffic, overload, filtering, balancing, and the challenge.

## Contract difference requiring coordination

The master prompt and MODEL.md describe a richer engine than the checked-in
`src/shared/simulationTypes.ts`. This frontend preserves the actual file exactly:

- Config: `normalRps`, `surgeRps`, `serverCapacityRps`, `serverCount`,
  `queueCapacity`, `rateLimitEnabled`, `filterStrength`, `balancerEnabled`.
- Metrics: `servedNormal`, `servedSurge`, `droppedNormal`, `droppedSurge`,
  `cpuPct`, `bandwidthPct`, `connectionPct`, `queuePct`, `availabilityPct`,
  `incoming`, `blocked`, `queueDepth`, `latencyMs`.
- State: `tick`, `metrics`, `history` only. No per-source queues or half-open state.
- No attack-type field, SYN mode, editable bandwidth/connection limits, or status.

The UI derives Operational/Degraded/Disrupted status at 90%/50% availability.
Bandwidth and connections in the mock are explicitly labeled normalized estimates.
The mock proportionally splits total backlog by current passing demand because
the contract cannot retain queue composition. Tick zero is a load preview.

The engine team must resolve the difference between MODEL.md and the shared
contract before integration. Neither protected file was changed for this task.

## Run locally

`npm install`, then `npm run dev`. `npm test` runs mock and learning-rule checks;
`npm run build` runs TypeScript and produces a production bundle in `dist/`.
All assets and simulation logic are local. No accounts, external APIs, or backend.
