import type { Plugin, ProxyOptions, ViteDevServer } from 'vite';
import type { IncomingMessage, ServerResponse } from 'http';
import { getSubdir, GHOST_URL } from './vite.config';

/**
 * Resolves the configured Ghost site URL by calling the admin api site endpoint
 * with retries (up to 20 seconds).
 */
async function resolveGhostSiteUrl() {
  const MAX_ATTEMPTS = 20;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const siteEndpoint = new URL('ghost/api/admin/site/', GHOST_URL);
      const response = await fetch(siteEndpoint);
      const data = (await response.json()) as { site: { url: string } };
      return {
        url: data.site.url,
        host: new URL(data.site.url).host,
      };
    } catch (error) {
      if (attempt === MAX_ATTEMPTS) {
        throw error;
      }
      await new Promise((resolve) => {
        setTimeout(resolve, attempt * 1000);
      });
    }
  }

  throw new Error('Failed to resolve Ghost site URL');
}

/**
 * Creates proxy configuration for Ghost Admin API requests. Rewrites cookies
 * and headers to work with Ghost's security middleware.
 */
function createAdminApiProxy(site: { url: string; host: string }): Record<string, ProxyOptions> {
  // When running the dev server against the backend on HTTPS, we need to
  // remove the same site and secure flags from the cookie. Otherwise, the
  // browser won't set it correctly since the dev server is running on HTTP.
  const rewriteCookies = (proxyRes: IncomingMessage) => {
    const cookies = proxyRes.headers['set-cookie'];
    if (Array.isArray(cookies)) {
      proxyRes.headers['set-cookie'] = cookies.map((cookie) => {
        return cookie
          .split(';')
          .filter((v) => v.trim().toLowerCase() !== 'secure')
          .filter((v) => v.trim().toLowerCase() !== 'samesite=none')
          .join('; ');
      });
    }
  };

  const subdir = getSubdir();

  return {
    [`^${subdir}/ghost/api/.*`]: {
      target: site.url,
      changeOrigin: true,
      followRedirects: true,
      autoRewrite: true,
      cookieDomainRewrite: {
        '*': site.host,
      },
      configure(proxy) {
        proxy.on('proxyRes', rewriteCookies);
      },
    },
  };
}

/**
 * Creates proxy configuration for Ember CLI live reload script.
 */
function createEmberLiveReloadProxy(): Record<string, ProxyOptions> {
  return {
    '^/ember-cli-live-reload.js': {
      target: 'http://localhost:4200',
      changeOrigin: true,
    },
  };
}

const CODEX_PROXY_MAX_BYTES = 16 * 1024 * 1024;

function requestHeader(request: IncomingMessage, name: string): string | undefined {
  const value = request.headers[name];
  return Array.isArray(value) ? value[0] : value;
}

async function requestBody(request: IncomingMessage): Promise<string> {
  const chunks: Uint8Array[] = [];
  let bytes = 0;
  for await (const chunk of request as AsyncIterable<Uint8Array>) {
    const buffer = Buffer.from(chunk);
    bytes += buffer.byteLength;
    if (bytes > CODEX_PROXY_MAX_BYTES) {
      throw new Error('Codex request is too large');
    }
    chunks.push(buffer);
  }
  return Buffer.concat(chunks, bytes).toString('utf8');
}

/**
 * The ChatGPT Codex endpoint does not allow browser CORS requests. This
 * development-only middleware forwards only the fixed Codex Responses route,
 * with bounded input and a small header allowlist. It does not persist or log
 * the user's session credential.
 */
async function writeResponseChunk(
  response: ServerResponse,
  chunk: Uint8Array,
  signal: AbortSignal,
): Promise<void> {
  if (response.destroyed || signal.aborted) {
    throw new DOMException('Aborted', 'AbortError');
  }
  if (response.write(Buffer.from(chunk))) {
    return;
  }
  await new Promise<void>((resolve, reject) => {
    const cleanup = () => {
      response.removeListener('drain', onDrain);
      signal.removeEventListener('abort', onAbort);
    };
    const onDrain = () => {
      cleanup();
      resolve();
    };
    const onAbort = () => {
      cleanup();
      reject(new DOMException('Aborted', 'AbortError'));
    };
    response.once('drain', onDrain);
    signal.addEventListener('abort', onAbort, { once: true });
  });
}

export function createCodexRequestHandler(fetchRequest: typeof fetch = fetch) {
  return async (request: IncomingMessage, response: ServerResponse) => {
    if (request.method !== 'POST' || request.url !== '/codex/responses') {
      response.statusCode = 404;
      response.end('Not Found');
      return;
    }

    const controller = new AbortController();
    let reader: ReadableStreamDefaultReader<Uint8Array> | undefined;
    let finished = false;
    const abortUpstream = () => {
      if (finished) {
        return;
      }
      controller.abort();
      void reader?.cancel().catch(() => {});
    };
    const cleanup = () => {
      request.removeListener('aborted', abortUpstream);
      response.removeListener('close', abortUpstream);
    };
    request.once('aborted', abortUpstream);
    response.once('close', abortUpstream);

    try {
      const headers = new Headers();
      [
        'authorization',
        'chatgpt-account-id',
        'originator',
        'openai-beta',
        'content-type',
        'accept',
        'session-id',
        'x-client-request-id',
      ].forEach((name) => {
        const value = requestHeader(request, name);
        if (value) {
          headers.set(name, value);
        }
      });
      headers.set('user-agent', 'pi (browser)');

      const upstream = await fetchRequest('https://chatgpt.com/backend-api/codex/responses', {
        method: 'POST',
        headers,
        body: await requestBody(request),
        signal: controller.signal,
      });
      response.statusCode = upstream.status;
      ['content-type', 'cache-control'].forEach((name) => {
        const value = upstream.headers.get(name);
        if (value) {
          response.setHeader(name, value);
        }
      });
      if (!upstream.body) {
        finished = true;
        cleanup();
        response.end();
        return;
      }
      reader = upstream.body.getReader();
      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          break;
        }
        await writeResponseChunk(response, value, controller.signal);
      }
      finished = true;
      cleanup();
      response.end();
    } catch (error) {
      if (controller.signal.aborted || response.destroyed || response.writableEnded) {
        return;
      }
      response.statusCode =
        error instanceof Error && error.message === 'Codex request is too large' ? 413 : 502;
      finished = true;
      cleanup();
      response.end(
        response.statusCode === 413 ? 'Codex request is too large' : 'Codex request failed',
      );
    } finally {
      cleanup();
      if (controller.signal.aborted) {
        await reader?.cancel().catch(() => {});
      } else {
        reader?.releaseLock();
      }
    }
  };
}

function installCodexMiddleware(server: ViteDevServer): void {
  const prefix = `${getSubdir()}/__admin-dev__/builder/codex-proxy`;
  const handleRequest = createCodexRequestHandler();
  server.middlewares.use(prefix, (request, response) => {
    void handleRequest(request, response);
  });
}

/**
 * Vite plugin that injects proxy configurations for:
 * 1. Ghost Admin API - proxies /ghost/api requests to the Ghost backend
 * 2. Ember Live Reload - proxies ember-cli-live-reload.js to Ember dev server
 */
export function ghostBackendProxyPlugin(): Plugin {
  let siteUrl!: { url: string; host: string };

  return {
    name: 'ghost-backend-proxy',

    async configResolved(config) {
      // Only resolve backend URL for dev/preview, not for builds or tests
      if (config.command !== 'serve' || config.mode === 'test') {
        return;
      }

      try {
        // We expect this to succeed immediately, but if the backend
        // server is getting started, it might need some time.
        // In that case, this lets the user know in case we're barking
        // up the wrong tree (aka the GHOST_URL is wrong.)
        const timeout = setTimeout(() => {
          config.logger.info(`Trying to reach Ghost Admin API at ${GHOST_URL}...`);
        }, 1000);

        siteUrl = await resolveGhostSiteUrl();
        clearTimeout(timeout);

        config.logger.info(`👻 Using backend url: ${siteUrl.url}`);
      } catch (error) {
        config.logger.error(`Could not reach Ghost Admin API at: ${GHOST_URL}

Ensure the Ghost backend is running. If needed, set the GHOST_URL environment variable to the correct URL.
    `);

        throw error;
      }
    },

    configureServer(server) {
      if (!siteUrl) {
        return;
      }

      installCodexMiddleware(server);

      server.config.server.proxy = {
        ...server.config.server.proxy,
        ...createAdminApiProxy(siteUrl),
        ...createEmberLiveReloadProxy(),
      };
    },

    configurePreviewServer(server) {
      if (!siteUrl) {
        return;
      }

      server.config.preview.proxy = {
        ...server.config.preview.proxy,
        ...createAdminApiProxy(siteUrl),
      };
    },
  } as const satisfies Plugin;
}
