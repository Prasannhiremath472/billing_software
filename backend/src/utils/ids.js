import { randomBytes } from 'node:crypto';

/** Collision-safe string id such as `inv-mhx3k9a1b2c3d4e5` (max 40 chars). */
export function newId(prefix) {
  return `${prefix}-${Date.now().toString(36)}${randomBytes(5).toString('hex')}`;
}

export const round2 = n => Math.round((Number(n) + Number.EPSILON) * 100) / 100;
export const round3 = n => Math.round((Number(n) + Number.EPSILON) * 1000) / 1000;
