import { describe, expect, it } from 'vitest';
import { renderHookWithProviders } from '../../../src/test/test-utils';
import { useGenerateSlug } from '../../../src/api/slugs';
import { withMockFetch } from '../../utils/mock-fetch';

const slugResponse = {
  json: { slugs: [{ slug: 'hello-world-cafe-quotes-1-100-2' }] },
  headers: { 'content-type': 'application/json' },
};

describe('slugs api', () => {
  it('slugifies and encodes the text client-side, then returns the deduplicated server slug', async () => {
    await withMockFetch(slugResponse, async (mock) => {
      const { result } = renderHookWithProviders(() => useGenerateSlug());

      const slug = await result.current({
        type: 'post',
        text: 'Hello World! Café & "Quotes" #1 / 100%',
      });

      expect(mock.calls[0][0]).toBe(
        'http://localhost:3000/ghost/api/admin/slugs/post/hello-world-cafe-quotes-1-100/',
      );
      expect(mock.calls[0][1].method).toBe('GET');
      expect(slug).toBe('hello-world-cafe-quotes-1-100-2');
    });
  });

  it('strips characters that would otherwise be sent as raw path escapes', async () => {
    await withMockFetch(slugResponse, async (mock) => {
      const { result } = renderHookWithProviders(() => useGenerateSlug());

      await result.current({ type: 'post', text: 'Line one\nLine two' });
      await result.current({ type: 'post', text: '  Ünïcode — dash… 50% off?  ' });

      expect(mock.calls[0][0]).toBe(
        'http://localhost:3000/ghost/api/admin/slugs/post/line-oneline-two/',
      );
      expect(mock.calls[1][0]).toBe(
        'http://localhost:3000/ghost/api/admin/slugs/post/unicode-dash-50-off/',
      );
    });
  });

  it('appends the record id so its own slug is not counted as a collision', async () => {
    await withMockFetch(slugResponse, async (mock) => {
      const { result } = renderHookWithProviders(() => useGenerateSlug());

      await result.current({ type: 'post', text: 'Hello world', id: '64f1c0ffee0000000000abcd' });

      expect(mock.calls[0][0]).toBe(
        'http://localhost:3000/ghost/api/admin/slugs/post/hello-world/64f1c0ffee0000000000abcd/',
      );
    });
  });

  it('resolves an empty slug for empty text without calling the API', async () => {
    await withMockFetch(slugResponse, async (mock) => {
      const { result } = renderHookWithProviders(() => useGenerateSlug());

      await expect(result.current({ type: 'post', text: '' })).resolves.toBe('');

      expect(mock.calls).toHaveLength(0);
    });
  });
});
