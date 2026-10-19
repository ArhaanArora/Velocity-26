# CyberLab frontend integration

The production adapter re-exports `simulationEngine` and all three presets from
Agam's `src/engine/index.ts`. The frontend preset module is now only a re-export.
There is no automatic mock fallback and no competing simulation state.

## Shared contract

The frontend consumes the current shared types directly: `legitRate`,
`attackType`, `attackRate`, `filterStrength`, `loadBalancer`, `serverCount`, and
all four `perServer*` capacities. The limiter is enabled by `filterStrength > 0`;
removing it sets strength to zero. Balancing activates the configured servers.

Meters and charts use the engine's `*Percent`, `legitServed`, `attackServed`,
`legitDropped`, `attackDropped`, latency, and history. Status labels map the
engine's `status`; the frontend does not recalculate status from availability.
The SYN view exposes the returned `halfOpen` count. At tick zero, metrics and
history are empty, exactly as returned by the engine.

Configuration edits do not step time. Metrics, source labels, and tutor answers
retain the last applied configuration until Run or Step advances the engine.
Network infrastructure shows the current configuration with a pending notice.
There is one timer, and switching modes pauses the inactive session. The
challenge locks incident traffic and requires 15 advancing ticks at >=85%
legitimate availability; a failing tick resets that consecutive counter.

## Educational model limits

Bandwidth is utilization against configured requests/s, not a processing cap.
Connection slots are occupied by queued requests and half-open SYN connections.
SYN traffic reduces queue room but does not directly block immediate processing.
These are engine behaviors, reflected in the tutor and integration checks.
Filtering uses integer-rounded collateral losses, including for small rates.
High resource pressure or a degraded engine status still produces a warning
when the challenge's availability target is met.

## Development fallback

`src/mocks/mockEngine.ts` remains a standalone, contract-compatible deterministic
development mock. To opt in, explicitly change the adapter's engine export to
that file. The default adapter and all UI sessions use the real engine.

## Run and verify

- `npm run dev`: local development server.
- `npm run typecheck`: TypeScript validation, including imported engine modules.
- `npm test`: real-engine integration, learning, and mock tests plus the engine's
  existing 10-area test runner. Vite bundles TypeScript test entries into a
  temporary folder so extensionless engine imports run without new dependencies
  or edits to the protected engine files. Failed legacy engine results also
  return a nonzero exit code.
- `npm run build`: typecheck and production bundle in `dist/`.
- `npm run preview`: serve the production bundle locally.

Integration does not modify `src/engine/`, the shared contract, or `MODEL.md`.
No external AI, accounts, network traffic generation, or backend is used.
