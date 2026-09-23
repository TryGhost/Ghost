import { Readable } from 'node:stream';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { describe, expect, it, vi } from 'vitest';
import { createProviderHandler } from '../src/provider/http.ts';
import { MemberCredentialError } from '../src/provider/ghost-client.ts';

const id = '0123456789abcdef01234567';
async function request(body: unknown, options: { origin?: string; failAuth?: boolean } = {}) {
  const ghost = {
    post: vi.fn(async () => null),
    configuration: vi.fn(async () => ({ shows: [] })),
    access: vi.fn(async () => {
      if (options.failAuth) {
        throw new MemberCredentialError();
      }
      return new Map([[id, { access: false, visible_card_ids: [] }]]);
    }),
  };
  const req = Object.assign(Readable.from([JSON.stringify(body)]), {
    method: 'POST',
    url: '/api/player',
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
  await createProviderHandler(ghost, 'https://site.test')(
    req as unknown as IncomingMessage,
    res as unknown as ServerResponse,
  );
  return { status, output: JSON.parse(output), headers, ghost };
}
describe('player HTTP boundary', () => {
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
