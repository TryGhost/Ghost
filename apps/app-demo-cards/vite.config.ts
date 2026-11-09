// The demo app's dev server, on http://cards.localhost:5181: the signed manifest, the editor
// bundles `vite.editor.config.ts` builds into public/editor/, the live frames, and the podcast
// resolver, which is the app's backend.
import type { IncomingMessage, ServerResponse } from 'node:http';

import { ghostApp } from '@tryghost/app-sdk/vite';
import { defaultClientConditions, defineConfig, type Plugin } from 'vite';

import { resolveEpisode } from './src/podcast/resolve-episode.ts';

const MAX_BODY = 16_384;

async function readJson(request: IncomingMessage): Promise<Record<string, unknown>> {
  let raw = '';
  for await (const chunk of request) {
    raw += chunk;
    if (raw.length > MAX_BODY) {
      throw new Error('Request body is too large');
    }
  }
  return JSON.parse(raw || '{}') as Record<string, unknown>;
}

function sendJson(response: ServerResponse, status: number, body: unknown) {
  response.writeHead(status, { 'content-type': 'application/json; charset=utf-8' });
  response.end(JSON.stringify(body));
}

/** The app's backend: `POST /api/resolve` looks up a podcast episode for the settings panel. */
function podcastResolver(): Plugin {
  return {
    name: 'demo-cards:podcast-resolver',
    configureServer(server) {
      server.middlewares.use('/api/resolve', async (request, response) => {
        // Ghost Admin calls this from the editor, without credentials.
        response.setHeader('access-control-allow-origin', '*');
        response.setHeader('access-control-allow-methods', 'POST, OPTIONS');
        response.setHeader('access-control-allow-headers', 'content-type');
        response.setHeader('cache-control', 'no-store');
        if (request.method === 'OPTIONS') {
          response.writeHead(204).end();
          return;
        }
        if (request.method !== 'POST') {
          sendJson(response, 405, { error: 'Use POST' });
          return;
        }
        try {
          const body = await readJson(request);
          const episode = await resolveEpisode(typeof body.url === 'string' ? body.url : '');
          sendJson(response, 200, { episode });
        } catch (error) {
          sendJson(response, 400, {
            error: error instanceof Error ? error.message : 'The episode could not be found',
          });
        }
      });
    },
  };
}

export default defineConfig({
  plugins: [ghostApp(), podcastResolver()],
  resolve: { conditions: ['source', ...defaultClientConditions] },
  oxc: { jsx: { runtime: 'automatic', importSource: 'preact' } },
  server: {
    port: 5181,
    strictPort: true,
    // Ghost Admin and the site load the editor bundles and frames from another origin.
    cors: true,
  },
  build: {
    rolldownOptions: {
      input: { podcast: 'frames/podcast.html', chart: 'frames/chart.html' },
    },
  },
});
