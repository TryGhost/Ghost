import { describe, expect, expectTypeOf, it } from 'vitest';
import type { z } from 'zod';

import { OverlayOptionsSchema, type OverlayOptions } from '../../src/bridge/index.ts';

describe('the overlay options', () => {
  it('parses to the OverlayOptions type, which is written out without zod', () => {
    expectTypeOf<z.output<typeof OverlayOptionsSchema>>().toEqualTypeOf<OverlayOptions>();
  });

  it('name a dialog’s tint or a sheet’s', () => {
    expect(OverlayOptionsSchema.parse({ tint: 'dialog' })).toEqual({ tint: 'dialog' });
    expect(OverlayOptionsSchema.parse({ tint: 'sheet' })).toEqual({ tint: 'sheet' });
  });

  it('refuse a tint Admin doesn’t know, and a size or position, which Admin decides', () => {
    for (const options of [
      { tint: 'none' },
      {},
      { tint: 'dialog', rect: { x: 0, y: 0, width: 100, height: 100 } },
      'dialog',
      null,
    ]) {
      expect(OverlayOptionsSchema.safeParse(options).success).toBe(false);
    }
  });
});
