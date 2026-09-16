import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { resolveEpisode } from './src/resolve-episode.ts';

const port = Number(process.env.PORT ?? 4652);
const dist = join(import.meta.dirname, 'dist');
const contentTypes: Record<string, string> = {
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
};

function sendJson(response: import('node:http').ServerResponse, status: number, body: unknown) {
  response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  response.end(JSON.stringify(body));
}

async function readJson(request: import('node:http').IncomingMessage) {
  let raw = '';
  for await (const chunk of request) {
    raw += chunk;
    if (raw.length > 16_384) {
      throw new Error('Request body is too large');
    }
  }
  return JSON.parse(raw || '{}') as Record<string, unknown>;
}

createServer(async (request, response) => {
  response.setHeader('Access-Control-Allow-Origin', '*');
  response.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  response.setHeader('Access-Control-Allow-Headers', 'content-type, x-ghost-dev-identity');
  response.setHeader('Cache-Control', 'no-store');
  if (request.method === 'OPTIONS') {
    response.writeHead(204).end();
    return;
  }

  const url = new URL(request.url ?? '/', `http://localhost:${port}`);
  if (url.pathname === '/api/resolve' && request.method === 'POST') {
    if (!request.headers['x-ghost-dev-identity']) {
      sendJson(response, 401, { error: 'Episode resolution is only available through Ghost' });
      return;
    }
    try {
      const body = await readJson(request);
      const episode = await resolveEpisode(typeof body.url === 'string' ? body.url : '');
      sendJson(response, 200, { episode });
    } catch (error) {
      sendJson(response, 400, {
        error: error instanceof Error ? error.message : 'Episode resolution failed',
      });
    }
    return;
  }

  const pathname = url.pathname === '/' ? '/manifest.json' : url.pathname;
  const filePath = normalize(join(dist, pathname));
  if (!filePath.startsWith(dist)) {
    response.writeHead(403).end();
    return;
  }
  try {
    const body = await readFile(filePath);
    response.writeHead(200, {
      'Content-Type': contentTypes[extname(filePath)] ?? 'application/octet-stream',
    });
    response.end(body);
  } catch {
    sendJson(response, 404, { error: `Not found: ${pathname}. Run pnpm build first.` });
  }
}).listen(port, () => {
  console.log(`Podcast demo provider serving on http://localhost:${port}`); // eslint-disable-line no-console
});
