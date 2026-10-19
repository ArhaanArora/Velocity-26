export interface AccountingVerification {
  legitOk: boolean;
  attackOk: boolean;
  totalOk: boolean;
  allOk: boolean;
  details: {
    legitIn: number;
    legitSum: number;
    attackIn: number;
    attackSum: number;
    incoming: number;
    totalSum: number;
  };
}

/**
 * Validates the conservation-of-flow accounting equations defined in MODEL.md.
 * Returns true only if every incoming request is strictly accounted for.
 */
export function verifyAccounting(
  legitIn: number,
  attackIn: number,
  legitBlocked: number,
  attackBlocked: number,
  legitServed: number,
  attackServed: number,
  legitDropped: number,
  attackDropped: number,
  queueLegitOld: number,
  queueLegitNew: number,
  queueAttackOld: number,
  queueAttackNew: number
): AccountingVerification {
  const legitSum =
    legitBlocked + legitServed + legitDropped + (queueLegitNew - queueLegitOld);
  const attackSum =
    attackBlocked + attackServed + attackDropped + (queueAttackNew - queueAttackOld);

  const incoming = legitIn + attackIn;
  const blocked = legitBlocked + attackBlocked;
  const served = legitServed + attackServed;
  const dropped = legitDropped + attackDropped;
  const queueTotalOld = queueLegitOld + queueAttackOld;
  const queueTotalNew = queueLegitNew + queueAttackNew;
  const totalSum = blocked + served + dropped + (queueTotalNew - queueTotalOld);

  const legitOk = legitIn === legitSum;
  const attackOk = attackIn === attackSum;
  const totalOk = incoming === totalSum;

  return {
    legitOk,
    attackOk,
    totalOk,
    allOk: legitOk && attackOk && totalOk,
    details: {
      legitIn,
      legitSum,
      attackIn,
      attackSum,
      incoming,
      totalSum,
    },
  };
}
