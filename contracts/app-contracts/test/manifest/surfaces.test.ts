import { describe, expect, it } from 'vitest';

import { errorsOf, manifest } from './helpers.ts';

describe('surfaces', () => {
  it('rejects a manifest that asks for nothing', () => {
    expect(errorsOf(manifest({ surfaces: [] }))).toEqual([
      { path: 'surfaces', message: 'Expected at least one surface' },
    ]);
    expect(errorsOf(manifest({ surfaces: undefined }))[0]?.path).toBe('surfaces');
  });

  it('rejects surfaces Ghost does not support', () => {
    expect(errorsOf(manifest({ surfaces: [{ type: 'card', url: '/card' }] }))).toEqual([
      { path: 'surfaces[0].type', message: expect.stringContaining('admin_page') },
    ]);
  });

  it('rejects a second admin page', () => {
    expect(
      errorsOf(
        manifest({
          surfaces: [
            { type: 'admin_page', url: '/admin' },
            { type: 'admin_page', url: '/other' },
          ],
        }),
      ),
    ).toEqual([{ path: 'surfaces[1]', message: 'Expected at most one admin_page surface' }]);
  });
});
