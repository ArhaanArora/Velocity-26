export interface FilterResult {
  attackBlocked: number;
  legitBlocked: number;
  attackPassed: number;
  legitPassed: number;
}

/**
 * Step 2: Traffic Filtering (MODEL.md Phase 2).
 * Stronger filtering blocks more attack traffic, but incurs a 10% collateral drop of legitimate traffic.
 */
export function filterTraffic(
  legitIn: number,
  attackIn: number,
  filterStrength: number
): FilterResult {
  const clampedFilter = Math.max(0, Math.min(1, filterStrength));
  const attackBlocked = Math.round(attackIn * clampedFilter);
  const legitBlocked = Math.round(legitIn * clampedFilter * 0.1);
  const attackPassed = attackIn - attackBlocked;
  const legitPassed = legitIn - legitBlocked;

  return {
    attackBlocked,
    legitBlocked,
    attackPassed,
    legitPassed,
  };
}

