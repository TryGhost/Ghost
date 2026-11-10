import { describe, expect, expectTypeOf, it } from 'vitest';
import type { z } from 'zod';

import { OverlayOptionsSchema, type OverlayOptions } from '../../src/bridge/index.ts';

describe('the overlay options', () => {
  it('parses to the OverlayOptions type, which is written out without zod', () => {
    expectTypeOf<z.output<typeof OverlayOptionsSchema>>().toEqualTypeOf<OverlayOptions>();
  });

  it('name a dialog’s tint or a sheet’s, and its width', () => {
    expect(OverlayOptionsSchema.parse({ tint: 'dialog', width: 512 })).toEqual({
      tint: 'dialog',
      width: 512,
    });
    expect(OverlayOptionsSchema.parse({ tint: 'sheet', width: 384 })).toEqual({
      tint: 'sheet',
      width: 384,
    });
  });

  it('refuse a tint Admin doesn’t know, a width that isn’t whole pixels, and a position', () => {
    for (const options of [
      { tint: 'none', width: 512 },
      { tint: 'dialog' },
      { tint: 'dialog', width: 0 },
      { tint: 'dialog', width: -512 },
      { tint: 'dialog', width: 512.5 },
      { tint: 'dialog', width: '512' },
      { tint: 'dialog', width: Number.POSITIVE_INFINITY },
      { tint: 'dialog', width: 512, left: 0 },
      { tint: 'dialog', rect: { x: 0, y: 0, width: 100, height: 100 } },
      {},
      'dialog',
      null,
    ]) {
      expect(OverlayOptionsSchema.safeParse(options).success).toBe(false);
    }
  });
});
