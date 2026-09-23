import { Readable } from 'node:stream';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { describe, expect, it, vi } from 'vitest';
import { createProviderHandler } from '../src/provider/http.ts';
import { MemberCredentialError } from '../src/provider/ghost-client.ts';

const id = '0123456789abcdef01234567';
async function request(
  body: unknown,
  options: {
    origin?: string;
    failAuth?: boolean;
    path?: string;
    method?: string;
    failPage?: boolean;
  } = {},
) {
  const ghost = {
    async *postPages() {
      yield [];
      if (options.failPage) {
        throw new Error('Upstream page failed');
      }
    },
    post: vi.fn(async () => null),
    configuration: vi.fn(async () => ({
      shows: [
        {
          id: 'one',
          title: 'Show',
          description: '',
          artwork: '',
          author: '',
          language: 'en',
          explicit: false,
        },
      ],
    })),
    access: vi.fn(async () => {
      if (options.failAuth) {
        throw new MemberCredentialError();
      }
      return new Map([[id, { access: false, visible_card_ids: [] }]]);
    }),
  };
  const req = Object.assign(Readable.from([JSON.stringify(body)]), {
    method: options.method ?? 'POST',
    url: options.path ?? '/api/player',
    headers: { origin: options.origin ?? 'https://site.test' },
  });
  let status = 200;
  let output = '';
  const headers: Record<string, string> = {};
  const res = {
    setHeader: (name: string, value: string) => {
      headers[name] = value;
    },
    writeHead: (value: number) => {
      status = value;
      return res;
    },
    end: (value: string) => {
      output = value;
    },
  };
  await createProviderHandler(
    ghost,
    'https://site.test',
    'https://provider.test',
  )(req as unknown as IncomingMessage, res as unknown as ServerResponse);
  return {
    status,
    output: headers['Content-Type'].startsWith('application/rss+xml') ? output : JSON.parse(output),
    headers,
    ghost,
  };
}
describe('player HTTP boundary', () => {
  it('serves uncached XML and fails closed for invalid credentials or incomplete feeds', async () => {
    const feed = { method: 'GET', path: '/feeds/one/audio.xml' };
    const publicResponse = await request(null, feed);
    expect(publicResponse.status).toBe(200);
    expect(publicResponse.headers['Content-Type']).toBe('application/rss+xml; charset=utf-8');
    expect(publicResponse.headers['Cache-Control']).toBe('private, no-store');
    expect(publicResponse.output).toContain('<rss');
    expect((await request(null, { ...feed, path: `${feed.path}?uuid=member` })).status).toBe(401);
    expect(
      (
        await request(null, {
          ...feed,
          path: `${feed.path}?uuid=member&key=invalid`,
          failAuth: true,
        })
      ).status,
    ).toBe(401);
    const failed = await request(null, { ...feed, failPage: true });
    expect(failed.status).toBe(503);
    expect(failed.headers['Content-Type']).toContain('application/json');
    expect(failed.output).toEqual({ error: 'Podcast unavailable.' });
    expect((await request(null, { ...feed, path: '/feeds/missing/video.xml' })).status).toBe(404);
  });
  it('is uncached, limits CORS, and ignores browser media/access claims', async () => {
    const result = await request({
      post_id: id,
      card_id: 'one',
      access: true,
      full_audio: { url: 'https://evil.test' },
    });
    expect(result.status).toBe(200);
    expect(result.output).toEqual({ state: 'missing' });
    expect(result.headers['Cache-Control']).toBe('private, no-store');
    expect(result.headers['Access-Control-Allow-Origin']).toBe('https://site.test');
    expect(
      (await request({ post_id: id, card_id: 'one' }, { origin: 'https://evil.test' })).headers[
        'Access-Control-Allow-Origin'
      ],
    ).toBeUndefined();
  });
  it('rejects malformed and oversized inputs before calling Ghost', async () => {
    for (const body of [
      { post_id: 'bad', card_id: 'one' },
      { post_id: id, card_id: '' },
      { post_id: id, card_id: 'one', member: {} },
      { post_id: id, card_id: 'one', extra: 'a'.repeat(17000) },
    ]) {
      const result = await request(body);
      expect(result.status).toBe(400);
      expect(result.ghost.post).not.toHaveBeenCalled();
    }
  });
  it('returns 401 for invalid credentials even when the post is absent', async () => {
    expect(
      (
        await request(
          { post_id: id, card_id: 'one', member: { uuid: 'u', key: 'bad' } },
          { failAuth: true },
        )
      ).status,
    ).toBe(401);
  });
});
