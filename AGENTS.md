# CyberLab engine rules
- Pure TypeScript. No network calls, no backend, no random numbers, no new dependencies.
- Only edit src/engine/. Never edit src/components, src/hooks, src/mocks, src/adapters, src/App.tsx, src/index.css, or src/shared/.
- The shared contract in src/shared/simulationTypes.ts is read-only. If it must change, stop and report.
- Follow MODEL.md exactly. If MODEL.md and the code disagree, stop and report.
- One tick = one simulated second. Rates are requests per second.
- Never mutate the previous state. Return a new state.
- Work in small steps: change one file, run the typecheck, then continue.
- Never claim a test passed unless it ran and you saw the output.