import { describe, expect, it } from 'vitest';

import { BALLISTA_SPEC } from '../src/model/spec';

describe('BALLISTA_SPEC', () => {
  it('keeps the reconstruction scale and identity contract', () => {
    expect(BALLISTA_SPEC.dimensions.base).toEqual([10, 0.9, 10]);
    expect(BALLISTA_SPEC.dimensions.bowSpan).toBeCloseTo(12.8);
    expect(BALLISTA_SPEC.dimensions.length).toBeCloseTo(10.5);
    expect(BALLISTA_SPEC.identityDetails).toHaveLength(18);
    expect(new Set(BALLISTA_SPEC.identityDetails).size).toBe(18);
    expect(BALLISTA_SPEC.seed).toBe(20260805);
  });

  it('keeps every approved material color distinct', () => {
    const values = Object.values(BALLISTA_SPEC.colors);
    expect(new Set(values).size).toBe(values.length);
  });
});
