export function clamp(val: number, min: number, max: number): number {
  if (val < min) return min;
  if (val > max) return max;
  return val;
}

/**
 * Split rule (MODEL.md Steps 6, 8, and Split Rule section).
 * Apportions total between legitimate and attack traffic without integer rounding drift.
 */
export function split(
  total: number,
  wLegit: number,
  wAttack: number
): [number, number] {
  if (total <= 0) {
    return [0, 0];
  }

  const weightSum = wLegit + wAttack;
  if (weightSum === 0) {
    return [0, 0];
  }

  const rawLegit = Math.round((total * wLegit) / weightSum);
  const minLegit = Math.max(0, total - wAttack);
  const maxLegit = Math.min(wLegit, total);

  const legitPart = clamp(rawLegit, minLegit, maxLegit);
  const attackPart = total - legitPart;

  return [legitPart, attackPart];
}
