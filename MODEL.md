# CyberLab engine model
One tick = one simulated second. Rates are requests per second.

> **Educational Model Note**: CyberLab models server and network dynamics as an educational discrete-time approximation rather than a cycle-accurate packet emulator. Network flows, TCP state tracking, and queueing are modeled via aggregated rates, finite connection slot pools, and deterministic proportional sharing.

## Inputs
- `legitRate`: Normal user inbound request rate (requests/sec).
- `attackType`: `'none' | 'volume' | 'syn'`.
- `attackRate`: Attack inbound request rate (requests/sec).
- `filterStrength`: Traffic filter aggressiveness (`0` to `1`, `0` = disabled).
- `loadBalancer`: Boolean switch enabling horizontal scaling across `serverCount`.
- `serverCount`: Number of backend servers (integer $\ge 1$).
- `perServerCapacity`: Request processing capacity per server (requests/sec, integer $\ge 1$).
- `perServerBandwidth`: Bandwidth ceiling per server (requests/sec, integer $\ge 1$).
- `perServerConnections`: Concurrent TCP connection capacity per server (slots, integer $\ge 1$).
- `perServerQueue`: Request buffer capacity per server (requests, integer $\ge 0$).

## Effective Server Resources
```text
effectiveServers = loadBalancer ? max(1, serverCount) : 1
capacity         = perServerCapacity × effectiveServers
bandwidthCap     = perServerBandwidth × effectiveServers
connectionSlots  = perServerConnections × effectiveServers
queueCapacity    = perServerQueue × effectiveServers
```

## Tick Execution Steps

### 1. Arrivals
- `legitIn = legitRate`
- `attackIn = attackType === 'none' ? 0 : attackRate`

### 2. Traffic Filtering
- **Phase 1**: Filter disabled. `legitBlocked = 0`, `attackBlocked = 0`.
- **Phase 2**:
  - `attackBlocked = round(attackIn × filterStrength)`
  - `legitBlocked = round(legitIn × filterStrength × 0.1)` (10% collateral drop of legitimate traffic)
- `legitPassed = legitIn − legitBlocked`
- `attackPassed = attackIn − attackBlocked`

### 3. Half-Open Connections (SYN Flood Accounting)
- Old half-open connections time out across ~3 seconds using ceiling decay:
  - `halfOpenKept = halfOpen − ceil(halfOpen / 3)`
- Inbound connection classification:
  - `synPassed = attackType === 'syn' ? attackPassed : 0`
  - `volumePassed = attackType === 'volume' ? attackPassed : 0`
- New half-open connections fill connection slots:
  - `halfOpenNew = min(connectionSlots, halfOpenKept + synPassed)`
- SYN requests never complete their 3-way handshake and therefore never enter the service queue. They count as dropped attack traffic.

### 4. Queue Room
- Half-open connections tie up connection slots, reducing available queue room:
  - `queueLimit = max(0, min(queueCapacity, connectionSlots − halfOpenNew))`
- If configuration changes dynamically (e.g. server count or queue size reduced mid-run), `queueLimit` automatically constrains the new queue size.

### 5. Available Requests
- Carried-over queued requests combine with newly passed requests:
  - `legitAvail = queueLegit + legitPassed`
  - `attackAvail = queueAttack + volumePassed`

### 6. Processing (Served)
- Total requests served:
  - `servedTotal = min(capacity, legitAvail + attackAvail)`
- Apportion `servedTotal` into `legitServed` and `attackServed` using available requests as weights:
  - `(legitServed, attackServed) = split(servedTotal, legitAvail, attackAvail)`

### 7. Remaining Unserved
- `legitRem = legitAvail − legitServed`
- `attackRem = attackAvail − attackServed`

### 8. Queue Buffering
- Unserved requests occupy available queue room:
  - `queueTotal = min(queueLimit, legitRem + attackRem)`
- Split `queueTotal` into new queue state using remaining requests as weights:
  - `(queueLegitNew, queueAttackNew) = split(queueTotal, legitRem, attackRem)`

### 9. Dropped Requests
- Requests that exceed `queueLimit` are dropped:
  - `legitDropped = legitRem − queueLegitNew`
  - `volumeDropped = attackRem − queueAttackNew`
  - `attackDropped = volumeDropped + synPassed`
  - `totalDropped = legitDropped + attackDropped`

## Split Rule (Integer Conservation)
Used in steps 6 and 8 to apportion `total` between legitimate and attack traffic without rounding errors:
```text
split(total, wLegit, wAttack):
  if wLegit + wAttack === 0:
    return (0, 0)
  legitPart = clamp(
    round(total × wLegit / (wLegit + wAttack)),
    max(0, total − wAttack),
    min(wLegit, total)
  )
  attackPart = total − legitPart
  return (legitPart, attackPart)
```

## Metrics Calculation (Deterministic & Safe Division)
- `incoming = legitIn + attackIn`
- `blocked = legitBlocked + attackBlocked`
- `legitServed`, `attackServed` (from Step 6)
- `legitDropped`, `attackDropped` (from Step 9)
- `queueDepth = queueTotal`
- `legitAvailabilityPercent = legitIn === 0 ? 100 : clamp(round((legitServed / legitIn) * 1000) / 10, 0, 100)`
- `cpuPercent = capacity === 0 ? 0 : clamp(((legitServed + attackServed) / capacity) * 100, 0, 100)`
- `bandwidthPercent = bandwidthCap === 0 ? 0 : clamp(((legitPassed + attackPassed) / bandwidthCap) * 100, 0, 100)`
- `connectionsInUse = halfOpenNew + queueTotal`
- `connectionPercent = connectionSlots === 0 ? 0 : clamp((connectionsInUse / connectionSlots) * 100, 0, 100)`
- `queuePercent = queueCapacity === 0 ? 0 : clamp((queueTotal / queueCapacity) * 100, 0, 100)`
- `latencyMs = capacity === 0 ? 50 : 50 + round((queueTotal / capacity) * 1000)`
- `status`:
  - `'normal'` if `legitAvailabilityPercent >= 90`
  - `'degraded'` if `legitAvailabilityPercent >= 50`
  - `'down'` otherwise

## Conservation of Flow Accounting
Every incoming request must be strictly accounted for across each tick:
- **Legitimate Traffic**:
  `legitIn === legitBlocked + legitServed + legitDropped + (queueLegitNew − queueLegitOld)`
- **Attack Traffic**:
  `attackIn === attackBlocked + attackServed + attackDropped + (queueAttackNew − queueAttackOld)`
- **Total Traffic**:
  `incoming === blocked + (legitServed + attackServed) + (legitDropped + attackDropped) + (queueTotalNew − queueTotalOld)`

## State Transition
- Advance `tick = tick + 1`
- Update persistent state: `queueLegit = queueLegitNew`, `queueAttack = queueAttackNew`, `halfOpen = halfOpenNew`
- Append current snapshot (`SimulationSnapshot`) to `history`, retaining a rolling buffer of the newest 60 ticks.

## Config Safety & Validation
- Clamp negative rates and values to `0`.
- Clamp `filterStrength` to `[0, 1]`.
- Enforce `serverCount >= 1`, `perServerCapacity >= 1`, `perServerBandwidth >= 1`, `perServerConnections >= 1`, `perServerQueue >= 0`.