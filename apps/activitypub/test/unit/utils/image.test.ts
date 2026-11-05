/**
 * @vitest-environment jsdom
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { imageUrlToDataUrl } from '../../../src/utils/image';

describe('imageUrlToDataUrl', function () {
  const fetchMock = vi.fn();

  beforeEach(function () {
    vi.stubGlobal('fetch', fetchMock);
    fetchMock.mockReset();
  });

  afterEach(function () {
    vi.unstubAllGlobals();
  });

  it('returns a data URL when the fetch succeeds', async function () {
    // Mock the response directly (rather than a real Response): the blob
    // must be a jsdom Blob so FileReader can read it in the test env
    fetchMock.mockResolvedValue({
      ok: true,
      blob: async () => new Blob(['fake-image-bytes'], { type: 'image/png' }),
    });

    const result = await imageUrlToDataUrl('https://cdn.example.com/avatar.png');

    expect(fetchMock).toHaveBeenCalledWith('https://cdn.example.com/avatar.png', { mode: 'cors' });
    expect(result).toMatch(/^data:image\/png;base64,/);
  });

  it('returns null when the fetch is blocked by CORS instead of falling back to the raw URL', async function () {
    // A CORS failure surfaces as a rejected fetch (TypeError: Failed to fetch)
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));

    const result = await imageUrlToDataUrl('https://cdn.example.com/avatar.png');

    expect(result).toBeNull();
  });

  it('returns null when the fetch responds with an error status', async function () {
    fetchMock.mockResolvedValue({ ok: false, status: 403 });

    const result = await imageUrlToDataUrl('https://cdn.example.com/avatar.png');

    expect(result).toBeNull();
  });
});
