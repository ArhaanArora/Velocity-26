# CyberLab engine model
One tick = one simulated second. Rates are requests per second.

## Inputs
legitRate, attackType, attackRate, filterStrength (0 to 1, 0 = off), loadBalancer, serverCount,
perServerCapacity, perServerBandwidth, perServerConnections, perServerQueue.

## Effective servers
effectiveServers = loadBalancer ? serverCount : 1
capacity       = perServerCapacity × effectiveServers
bandwidthCap   = perServerBandwidth × effectiveServers
connectionSlots = perServerConnections × effectiveServers
queueCapacity  = perServerQueue × effectiveServers

## Tick steps
1. Arrivals: legitIn = legitRate. attackIn = 0 if attackType is 'none', otherwise attackRate.
2. [PHASE 2] Filter: attackBlocked = round(attackIn × filterStrength). legitBlocked = round(legitIn × filterStrength × 0.1).
   Phase 1: both are 0.
   attackPassed = attackIn − attackBlocked. legitPassed = legitIn − legitBlocked.
3. Half-open connections (SYN flood):
   halfOpenKept = halfOpen − floor(halfOpen / 3). Half-open connections time out after about 3 seconds.
   synPassed = attackType is 'syn' ? attackPassed : 0.
   volumePassed = attackType is 'volume' ? attackPassed : 0.
   halfOpenNew = min(connectionSlots, halfOpenKept + synPassed).
   Every SYN request counts as dropped, because its handshake never finishes.
4. Queue room: queueLimit = max(0, min(queueCapacity, connectionSlots − halfOpenNew)).
   Half-open connections use up slots, which leaves less room for waiting requests.
5. Available: legitAvail = queueLegit + legitPassed. attackAvail = queueAttack + volumePassed.
6. Served: servedTotal = min(capacity, legitAvail + attackAvail).
   Split servedTotal into legitServed and attackServed using availability as the weights.
7. Remaining: legitRem = legitAvail − legitServed. attackRem = attackAvail − attackServed.
8. New queue: queueTotal = min(queueLimit, legitRem + attackRem).
   Split queueTotal into queueLegit (new) and queueAttack (new) using remaining as the weights.
9. Dropped: legitDropped = legitRem − queueLegit(new). attackDropped = attackRem − queueAttack(new).
   totalDropped = legitDropped + attackDropped + synPassed.

## Split rule (used in steps 6 and 8)
split(total, wLegit, wAttack):
  if wLegit + wAttack = 0, return (0, 0).
  legitPart = clamp( round(total × wLegit / (wLegit + wAttack)), max(0, total − wAttack), min(wLegit, total) )
  attackPart = total − legitPart

## Metrics
served = legitServed + attackServed
blocked = attackBlocked + legitBlocked
legitAvailabilityPercent = legitIn is 0 ? 100 : legitServed / legitIn × 100
cpuPercent = served / capacity × 100
bandwidthPercent = min(100, (legitPassed + attackPassed) / bandwidthCap × 100)
connectionsInUse = halfOpenNew + queueTotal
connectionPercent = connectionsInUse / connectionSlots × 100
queuePercent = queueTotal / queueCapacity × 100 (0 if queueCapacity is 0)
latencyMs = 50 + round(queueTotal / capacity × 1000)
status = 'normal' if availability ≥ 90, 'degraded' if ≥ 50, otherwise 'down'

## Accounting check (must hold every tick, for each type)
legitIn = legitBlocked + legitServed + legitDropped + (queueLegit new − queueLegit old)
attackIn = attackBlocked + attackServed + attackDropped + synPassed + (queueAttack new − queueAttack old)
Total: incoming = blocked + served + dropped + (queue new − queue old)

## Next state
tick + 1. queueLegit, queueAttack, halfOpen updated. Append metrics to history and keep the newest 60.

## Config safety
Clamp negative numbers to 0. Clamp filterStrength to 0 to 1. serverCount is at least 1. perServerCapacity is at least 1.