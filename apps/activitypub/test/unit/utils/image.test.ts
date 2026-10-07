import { beforeEach, describe, expect, it, vi } from 'vitest';

import { imageUrlToDataUrl } from '../../../src/utils/image';

describe('imageUrlToDataUrl', function () {
  beforeEach(function () {
    vi.restoreAllMocks();
  });

  it('returns a data URL when the host allows the cross-origin fetch', async function () {
    const blob = new Blob(['image-bytes'], { type: 'image/png' });
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      blob: async () => blob,
    } as unknown as Response);

    const dataUrl = await imageUrlToDataUrl('https://example.com/cover.png');

    expect(dataUrl).toMatch(/^data:image\/png;base64,/);
  });

  it('returns null when the cross-origin fetch is blocked', async function () {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('Failed to fetch'));

    expect(await imageUrlToDataUrl('https://cdn.example.com/cover.png')).toBeNull();
  });

  it('returns null when the host answers with an error status', async function () {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: false,
      status: 403,
      blob: async () => new Blob([]),
    } as unknown as Response);

    expect(await imageUrlToDataUrl('https://example.com/missing.png')).toBeNull();
  });
});
