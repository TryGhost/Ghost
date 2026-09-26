import { beforeEach, describe, expect, it, vi } from 'vitest';

import { imageUrlToDataUrl } from '../../../src/utils/image';

describe('imageUrlToDataUrl', function () {
  beforeEach(function () {
    vi.restoreAllMocks();
  });

  it('returns a data URL when the host allows the cross-origin fetch', async function () {
    const blob = new Blob(['image-bytes'], { type: 'image/png' });
    // The only two members of `Response` the conversion reads.
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      blob: async () => blob,
    } as unknown as Response);

    const dataUrl = await imageUrlToDataUrl('https://example.com/cover.png');

    expect(dataUrl).toMatch(/^data:image\/png;base64,/);
  });

  it('returns null when the host sends no Access-Control-Allow-Origin', async function () {
    // What a CDN without a CORS rule does to a `mode: 'cors'` fetch:
    // the request is blocked before any response arrives. The answer
    // must be `null` and not the raw URL — a raw-URL fallback is the
    // bug this replaces, because html2canvas drops an image whose host
    // does not opt into cross-origin reads, so the fallback produced a
    // copied card with the image missing and no way for the caller to
    // know.
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
