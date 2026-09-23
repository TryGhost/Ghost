import { afterEach, describe, expect, it, vi } from 'vitest';

import { imageUrlToDataUrl } from '../../../src/utils/image';

describe('imageUrlToDataUrl', function () {
  afterEach(function () {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('returns a data URL when the image can be read', async function () {
    const blob = new Blob(['fake-image-data'], { type: 'image/png' });
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        blob: async () => blob,
      }),
    );

    const result = await imageUrlToDataUrl('https://example.com/image.png');

    expect(fetch).toHaveBeenCalledWith('https://example.com/image.png', { mode: 'cors' });
    expect(result).toMatch(/^data:image\/png;base64,/);
  });

  it('returns null when the fetch fails, e.g. a CORS-blocked host', async function () {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));

    await expect(imageUrlToDataUrl('https://example.com/image.png')).resolves.toBeNull();
  });

  it('returns null when the response is not ok', async function () {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 403,
        blob: async () => new Blob([]),
      }),
    );

    await expect(imageUrlToDataUrl('https://example.com/image.png')).resolves.toBeNull();
  });
});
