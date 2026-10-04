import { afterEach, expect, it, vi } from 'vitest';
import { canvasPost, createCanvasPostContent } from './canvas-posts';

afterEach(() => vi.unstubAllGlobals());

it('discovers bounded pages and independently reloads the selected published resource', async () => {
  const post = { id: 'post-id', title: 'Published', url: 'https://example.com/blog/published/' };
  const fetch = vi
    .fn()
    .mockResolvedValueOnce(Response.json({ posts: [post], meta: { pagination: { next: 3 } } }))
    .mockResolvedValueOnce(Response.json({ posts: [post] }));
  vi.stubGlobal('fetch', fetch);
  const content = createCanvasPostContent('https://example.com/blog/', 'private-public-key');
  const signal = new AbortController().signal;
  expect(await content.list(2, signal)).toEqual({ posts: [post], nextPage: 3 });
  const listed = fetch.mock.calls[0][0] as URL;
  expect(listed.pathname).toBe('/blog/ghost/api/content/posts/');
  expect(listed.searchParams.get('limit')).toBe('20');
  expect(listed.searchParams.get('page')).toBe('2');
  expect(await content.read(post.id, signal)).toEqual(post);
  expect((fetch.mock.calls[1][0] as URL).pathname).toBe('/blog/ghost/api/content/posts/post-id/');
});

it('rejects unavailable and mismatched selected Posts instead of adopting listed metadata', async () => {
  vi.stubGlobal(
    'fetch',
    vi
      .fn()
      .mockResolvedValueOnce(new Response(null, { status: 404 }))
      .mockResolvedValueOnce(
        Response.json({
          posts: [{ id: 'other', title: 'Other', url: 'https://example.com/other/' }],
        }),
      ),
  );
  const content = createCanvasPostContent('https://example.com/', 'key');
  const signal = new AbortController().signal;
  await expect(content.read('gone', signal)).rejects.toThrow('Could not load');
  await expect(content.read('gone', signal)).rejects.toThrow('no longer available');
});

it('rejects outside-site URLs and bounds returned title text', () => {
  const post = { id: 'id', title: 'x'.repeat(700), url: 'https://example.com/blog/post/' };
  expect(canvasPost(post, 'https://example.com/blog/').title).toHaveLength(512);
  for (const url of [
    'https://elsewhere.com/blog/post/',
    'https://example.com/outside/',
    'https://user:password@example.com/blog/post/',
    'https://example.com/blog/post/?key=secret',
  ]) {
    expect(() => canvasPost({ ...post, url }, 'https://example.com/blog/')).toThrow(
      'outside this site',
    );
  }
});

it('refuses oversized pages, invalid paging and invalid resource IDs before requesting', async () => {
  const fetch = vi
    .fn()
    .mockResolvedValueOnce(
      Response.json({ posts: Array(21).fill({}), meta: { pagination: { next: null } } }),
    )
    .mockResolvedValueOnce(Response.json({ posts: [], meta: { pagination: { next: 1 } } }));
  vi.stubGlobal('fetch', fetch);
  const content = createCanvasPostContent('https://example.com/', 'key');
  const signal = new AbortController().signal;
  await expect(content.list(0, signal)).rejects.toThrow('page');
  await expect(content.read('../settings', signal)).rejects.toThrow('discovered');
  expect(fetch).not.toHaveBeenCalled();
  await expect(content.list(1, signal)).rejects.toThrow('too many');
  await expect(content.list(1, signal)).rejects.toThrow('pagination');
});
