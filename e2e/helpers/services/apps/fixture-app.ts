import { CONNECT_MESSAGE_TYPE, HELLO_MESSAGE_TYPE } from '@tryghost/app-contracts';
import { FakeServer } from '@/helpers/services/fake-server';

/** The test ID of the element where the fixture app's page shows the path it was served from. */
export const FIXTURE_APP_PATH_TEST_ID = 'fixture-app-path';

/**
 * How long the page waits for Admin to start it and answer a bridge call before it gives up, so a
 * call Admin drops fails with a clear error well before the test times out.
 */
const BRIDGE_TIMEOUT_MS = 10_000;

/** The manifest the fixture app serves. Its fields follow `@tryghost/app-contracts`' manifest. */
export interface FixtureAppManifest {
  id: string;
  name: string;
  description: string;
  author: { name: string; url: string };
  accent_color: string;
  icon: { name: string };
  surfaces: [{ type: 'admin_page'; url: string }];
}

/** A request the app sends Admin through the bridge, as the SDK's `ghost.fetch` would. */
export interface BridgeFetchRequest {
  path: string;
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  headers?: Record<string, string>;
  body?: string;
}

/**
 * How Admin answered a bridge call: the response, or the error's message, which Admin starts with
 * the error's code, as in `blocked: …`.
 */
export type BridgeFetchResult =
  | { status: number; body: string; error?: undefined }
  | { error: string; status?: undefined; body?: undefined };

/** What the fixture app's page exposes to the test as `window.__fixtureApp`. */
export interface FixtureAppHooks {
  /** Resolves with the start context once Admin has started the page. */
  started: Promise<{ session: { revision: number } }>;
  fetch(request: BridgeFetchRequest): Promise<BridgeFetchResult>;
}

/**
 * The page's script. It speaks the bridge without the SDK, so the fixture needs no build: it says
 * hello to Admin until Admin answers with a port, then exchanges `@quilted/threads` messages on it,
 * `[1, id, name, args]` for a call and `[2, id, value, error]` for its result. Admin's acceptance
 * tests frame a page that does the same (`apps/admin/test-utils/acceptance/app-frame-raw.ts`).
 */
const PAGE_SCRIPT = `
(() => {
  document.querySelector('[data-testid=${JSON.stringify(FIXTURE_APP_PATH_TEST_ID)}]').textContent = location.pathname;
  const documentId = Date.now().toString(36) + '-' + Math.random().toString(36).slice(2);
  const pending = new Map();
  let port;
  let nextId = 0;
  let markStarted;
  const started = new Promise((resolve) => { markStarted = resolve; });

  const call = (name, args) => new Promise((resolve) => {
    const id = 'fixture-' + (nextId += 1);
    pending.set(id, resolve);
    port.postMessage([1, id, name, args]);
  });

  const timedOut = () => new Promise((resolve) => window.setTimeout(
    () => resolve({ error: 'fixture: Admin did not answer the call within ${BRIDGE_TIMEOUT_MS}ms' }),
    ${BRIDGE_TIMEOUT_MS},
  ));

  const fetchThroughBridge = async (request) => {
    await started;
    const [value, error] = await call('fetch', [request]);
    if (error != null) {
      return { error: typeof error.message === 'string' ? error.message : String(error) };
    }
    return { status: value.status, body: value.body };
  };

  window.__fixtureApp = {
    started,
    fetch: (request) => Promise.race([fetchThroughBridge(request), timedOut()]),
  };

  const hello = () => window.parent.postMessage(
    { type: ${JSON.stringify(HELLO_MESSAGE_TYPE)}, sdk: 'e2e-fixture', document: documentId },
    '*',
  );
  const helloTimer = window.setInterval(hello, 250);
  hello();

  window.addEventListener('message', (event) => {
    const [connectPort] = event.ports;
    if (port || !connectPort || event.source !== window.parent || event.data?.type !== ${JSON.stringify(CONNECT_MESSAGE_TYPE)}) {
      return;
    }
    window.clearInterval(helloTimer);
    port = connectPort;
    port.onmessage = ({ data }) => {
      if (!Array.isArray(data)) {
        return;
      }
      const [kind, id, nameOrValue, argsOrError] = data;
      if (kind === 1) {
        // Admin's calls: start, themeChanged and pathChanged. Each only needs an answer.
        if (nameOrValue === 'start') {
          markStarted(argsOrError[0]);
        }
        port.postMessage([2, id]);
      } else if (kind === 2) {
        pending.get(id)?.([nameOrValue, argsOrError]);
        pending.delete(id);
      }
    };
  });
})();
`;

const PAGE_HTML = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><title>Fixture app</title></head>
<body>
<h1>Fixture app</h1>
<p>Served from <code data-testid="${FIXTURE_APP_PATH_TEST_ID}"></code></p>
<script>${PAGE_SCRIPT}</script>
</body>
</html>`;

/**
 * A small app for the apps E2E tests. It serves its manifest, which a test can change between
 * steps the way a developer would redeploy, and an Admin page that connects to Admin's bridge.
 *
 * The page URL in the manifest is relative to the manifest, and every path ending in `.html` serves
 * the page, which shows the path it was served from. A second fixture app with the same ID is the
 * same app served from another host, as when a developer's tunnel URL changes.
 *
 * Tests that use it set the `fixtureAppEnabled` option, so Ghost can fetch its manifest.
 */
export class FixtureApp extends FakeServer {
  manifest: FixtureAppManifest;

  constructor({ appId, name = 'Fixture App' }: { appId: string; name?: string }) {
    super({ debugNamespace: 'e2e:fixture-app' });
    this.manifest = {
      id: appId,
      name,
      description: 'An app the E2E tests install.',
      author: { name: 'Ghost E2E', url: 'https://ghost.org/' },
      accent_color: '#15171a',
      icon: { name: 'blocks' },
      surfaces: [{ type: 'admin_page', url: 'app.html' }],
    };
  }

  get origin(): string {
    return `http://localhost:${this.port}`;
  }

  get manifestUrl(): string {
    return `${this.origin}/manifest.json`;
  }

  /** Changes what the manifest URL serves from now on, as a redeploy of the app would. */
  updateManifest(changes: Partial<FixtureAppManifest>): void {
    this.manifest = { ...this.manifest, ...changes };
  }

  /** Points the app's Admin page at another path, relative to the manifest. */
  setPageUrl(url: string): void {
    this.updateManifest({ surfaces: [{ type: 'admin_page', url }] });
  }

  protected setupRoutes(): void {
    this.app.get('/manifest.json', (_req, res) => {
      res.json(this.manifest);
    });

    this.app.get(/\.html$/, (_req, res) => {
      res.type('html').send(PAGE_HTML);
    });
  }
}
