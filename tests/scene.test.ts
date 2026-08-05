import { describe, expect, it } from 'vitest';

import { referenceCameraForAspect } from '../src/scene/createScene';

describe('reference camera framing', () => {
  it('backs away far enough to keep the full bow visible on a phone', () => {
    const desktop = referenceCameraForAspect(1);
    const mobile = referenceCameraForAspect(390 / 844);

    expect(mobile.length()).toBeGreaterThan(desktop.length() * 1.9);
  });
});
