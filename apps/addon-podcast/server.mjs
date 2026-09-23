import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { GhostClient } from './src/provider/ghost-client.ts';
import { createProviderHandler } from './src/provider/http.ts';

const port = Number(process.env.PORT ?? 4655);
const dist = join(import.meta.dirname, 'dist');
const siteUrl = process.env.GHOST_URL ?? '';
const adminKey = process.env.GHOST_ADMIN_API_KEY ?? '';
const provider = createProviderHandler(
  siteUrl && adminKey ? new GhostClient(siteUrl, adminKey) : null,
  siteUrl,
);
const contentTypes = {
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
};

createServer(async (request, response) => {
  if (request.url?.startsWith('/api/')) {
    await provider(request, response);
    return;
  }
  response.setHeader('Access-Control-Allow-Origin', '*');
  response.setHeader('Cache-Control', 'no-store');
  const url = new URL(request.url ?? '/', `http://localhost:${port}`);
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
    response.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
    response.end(JSON.stringify({ error: `Not found: ${pathname}. Run pnpm build first.` }));
  }
}).listen(port, () => {
  console.log(`Podcast provider serving on http://localhost:${port}`); // eslint-disable-line no-console
});
