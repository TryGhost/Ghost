import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  feedCredential,
  GhostClient,
  MemberCredentialError,
} from '../src/provider/ghost-client.ts';

const id = '0123456789abcdef01234567';
const ghost = () => new GhostClient('https://publisher.test/blog/', `${id}:${'ab'.repeat(32)}`);
afterEach(() => vi.unstubAllGlobals());

describe('Ghost API boundary', () => {
  it('queries exact card candidates in stable order and traverses empty pages', async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ posts: [], meta: { pagination: { next: 2 } } })),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ posts: [{ id }], meta: { pagination: { next: null } } })),
      );
    vi.stubGlobal('fetch', fetch);
    const pages = [];
    for await (const page of ghost().postPages()) {
      pages.push(page);
    }
    expect(pages).toEqual([[], [{ id }]]);
    const urls = fetch.mock.calls.map(([url]) => url as URL);
    expect(urls.map((url) => url.searchParams.get('page'))).toEqual(['1', '2']);
    for (const url of urls) {
      expect(url.searchParams.get('has_card')).toBe('addon:podcast:episode');
      expect(url.searchParams.get('order')).toBe('published_at desc,id desc');
      expect(url.searchParams.get('filter')).toBe('status:published');
      expect(url.searchParams.get('include')).toBe('tiers');
    }
  });
  it('rejects broken pagination and malformed private feed credentials', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () => new Response(JSON.stringify({ posts: [], meta: { pagination: { next: 1 } } })),
      ),
    );
    await expect(
      (async () => {
        for await (const page of ghost().postPages()) {
          expect(page).toEqual([]);
        }
      })(),
    ).rejects.toThrow();
    for (const query of ['uuid=u', 'key=k', 'uuid=u&key=', 'uuid=u&key=k&key=other']) {
      expect(() => feedCredential(new URLSearchParams(query))).toThrow(MemberCredentialError);
    }
    expect(feedCredential(new URLSearchParams())).toBeNull();
  });
  it('reads current published lexical data with a server-only short-lived integration token', async () => {
    const fetch = vi.fn(
      async () =>
        new Response(JSON.stringify({ posts: [{ id, status: 'published', lexical: '{}' }] })),
    );
    vi.stubGlobal('fetch', fetch);
    expect(await ghost().post(id)).toMatchObject({ id, lexical: '{}' });
    const [url, options] = fetch.mock.calls[0] as unknown as [URL, RequestInit];
    expect(url.pathname).toBe('/blog/ghost/api/admin/posts/');
    expect(url.searchParams.get('formats')).toBe('lexical');
    expect(url.searchParams.get('filter')).toBe(`id:${id}+status:published`);
    expect(options.redirect).toBe('error');
    const jwt = (options.headers as Record<string, string>).Authorization.slice(6);
    const claims = JSON.parse(Buffer.from(jwt.split('.')[1], 'base64url').toString());
    expect(claims.exp - claims.iat).toBe(300);
    expect(claims.aud).toBe('/admin/');
  });
  it('preserves card visibility and fails on missing decisions', async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ post_access: [{ id, access: false, visible_card_ids: ['card'] }] }),
        ),
      )
      .mockResolvedValueOnce(new Response(JSON.stringify({ post_access: [] })));
    vi.stubGlobal('fetch', fetch);
    expect((await ghost().access([id])).get(id)).toEqual({
      access: false,
      visible_card_ids: ['card'],
    });
    await expect(ghost().access([id])).rejects.toThrow('Ghost request failed');
  });
  it('distinguishes invalid member credentials from upstream failures', async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ errors: [{ code: 'MEMBER_CREDENTIAL_INVALID' }] }), {
          status: 401,
        }),
      )
      .mockRejectedValueOnce(new Error('Offline'));
    vi.stubGlobal('fetch', fetch);
    await expect(ghost().access([id], { uuid: 'uuid', key: 'invalid' })).rejects.toBeInstanceOf(
      MemberCredentialError,
    );
    await expect(ghost().post(id)).rejects.toThrow('Ghost request failed');
  });
});
