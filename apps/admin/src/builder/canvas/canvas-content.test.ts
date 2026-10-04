import { afterEach, expect, it, vi } from 'vitest';
import { createCanvasContent } from './canvas-content';

afterEach(() => vi.unstubAllGlobals());

it.each(['page', 'tag', 'author'] as const)(
  'loads real %s contexts and independently verifies selected content',
  async (kind) => {
    const item = {
      id: 'resource-id',
      name: 'Archive',
      title: 'About',
      url: `https://example.com/${kind}/`,
    };
    const request = vi
      .fn()
      .mockResolvedValueOnce(
        Response.json({ [`${kind}s`]: [item], meta: { pagination: { next: null } } }),
      )
      .mockResolvedValueOnce(Response.json({ [`${kind}s`]: [item] }))
      .mockResolvedValueOnce(Response.json({ [`${kind}s`]: [{ ...item, id: 'other' }] }));
    vi.stubGlobal('fetch', request);
    const content = createCanvasContent(kind, 'https://example.com/', 'key');
    const signal = new AbortController().signal;
    expect((await content.list(1, signal)).posts[0]).toMatchObject({
      id: item.id,
      title: kind === 'page' ? 'About' : 'Archive',
    });
    expect(await content.read(item.id, signal)).toMatchObject({ id: item.id, url: item.url });
    expect((request.mock.calls[0][0] as URL).pathname).toBe(`/ghost/api/content/${kind}s/`);
    expect((request.mock.calls[1][0] as URL).pathname).toBe(
      `/ghost/api/content/${kind}s/resource-id/`,
    );
    await expect(content.read(item.id, signal)).rejects.toThrow('no longer available');
  },
);
