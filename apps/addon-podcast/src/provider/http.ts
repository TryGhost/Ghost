import type { IncomingMessage, ServerResponse } from 'node:http';
import { feedCredential, MemberCredentialError, type GhostClient } from './ghost-client.ts';
import { player, type PlayerRequest } from './player.ts';
import { renderFeed } from './feeds.ts';
import type { MediaFormat } from './selection.ts';

class InputError extends Error {}

async function readPlayerRequest(request: IncomingMessage): Promise<PlayerRequest> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of request) {
    const bytes = Buffer.from(chunk);
    size += bytes.length;
    if (size > 16384) {
      throw new InputError();
    }
    chunks.push(bytes);
  }
  let input;
  try {
    input = JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    throw new InputError();
  }
  if (
    !input ||
    typeof input.post_id !== 'string' ||
    !/^[\da-f]{24}$/i.test(input.post_id) ||
    typeof input.card_id !== 'string' ||
    !input.card_id.trim() ||
    input.card_id.length > 256
  ) {
    throw new InputError();
  }
  if (
    input.member !== undefined &&
    input.member !== null &&
    (typeof input.member !== 'object' ||
      typeof input.member.uuid !== 'string' ||
      !input.member.uuid ||
      input.member.uuid.length > 100 ||
      typeof input.member.key !== 'string' ||
      !input.member.key ||
      input.member.key.length > 200)
  ) {
    throw new InputError();
  }
  return { post_id: input.post_id, card_id: input.card_id, member: input.member };
}

export function createProviderHandler(
  ghost: Pick<GhostClient, 'configuration' | 'post' | 'access' | 'postPages'> | null,
  siteUrl: string,
  providerUrl: string,
) {
  const siteOrigin = siteUrl ? new URL(siteUrl).origin : '';
  return async (request: IncomingMessage, response: ServerResponse) => {
    response.setHeader('Cache-Control', 'private, no-store');
    response.setHeader('Content-Type', 'application/json; charset=utf-8');
    response.setHeader('Vary', 'Origin');
    if (request.headers.origin === siteOrigin) {
      response.setHeader('Access-Control-Allow-Origin', siteOrigin);
      response.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      response.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    }
    if (request.method === 'OPTIONS') {
      response.writeHead(204).end();
      return;
    }
    try {
      const url = new URL(request.url ?? '/', 'http://provider');
      const feed = /^\/feeds\/([a-zA-Z0-9_-]{1,100})\/(audio|video)\.xml$/.exec(url.pathname);
      if (request.method === 'GET' && feed) {
        const member = feedCredential(url.searchParams);
        if (!ghost) {
          throw new Error('Provider not configured.');
        }
        const xml = await renderFeed(
          ghost,
          feed[1],
          feed[2] as MediaFormat,
          member,
          siteUrl,
          providerUrl,
        );
        if (xml === null) {
          response.writeHead(404).end(JSON.stringify({ error: 'Show not found.' }));
          return;
        }
        response.setHeader('Content-Type', 'application/rss+xml; charset=utf-8');
        response.end(xml);
        return;
      }
      if (request.method !== 'POST' || url.pathname !== '/api/player') {
        response.writeHead(404).end(JSON.stringify({ error: 'Not found.' }));
        return;
      }
      const input = await readPlayerRequest(request);
      if (!ghost) {
        throw new Error('Provider not configured.');
      }
      response.end(JSON.stringify(await player(ghost, input, providerUrl)));
    } catch (error) {
      const status =
        error instanceof InputError ? 400 : error instanceof MemberCredentialError ? 401 : 503;
      response.writeHead(status).end(
        JSON.stringify({
          error:
            status === 400
              ? 'Invalid request.'
              : status === 401
                ? 'Invalid member credentials.'
                : 'Podcast unavailable.',
        }),
      );
    }
  };
}
