import { describe, expect, it } from 'vitest';
import { getImageUrl } from '../../../src/api/images';

describe('getImageUrl', () => {
  it.each(['https://example.com/image.png', '/content/images/image.png'])(
    'accepts an uploaded image URL (%s)',
    (url) => {
      expect(getImageUrl({ images: [{ url, ref: null }] })).toBe(url);
    },
  );

  it.each([
    null,
    {},
    { images: [] },
    { images: [{}] },
    { images: [{ url: 123 }] },
    { images: [{ url: true }] },
    { images: [{ url: '' }] },
  ])('rejects a malformed upload response (%j)', (response) => {
    expect(() => getImageUrl(response)).toThrow();
  });
});
