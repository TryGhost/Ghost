/**
 * Node half of the worker-parity claim (slice 2): renders the recorded routes
 * from the committed fixtures (test/browser/fixtures/) with a replayed fetch —
 * fully hermetic, no live Ghost needed — and asserts the output still equals
 * the committed expected HTML.
 *
 * The browser suite (test/browser/worker-render.test.ts) asserts a real Web
 * Worker render equals the same files; both green ⇒ worker output ≡ Node
 * output for identical data. If a renderer change legitimately alters the
 * output, re-record: node test/integration/record-browser-fixtures.ts
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'vitest';
import { createRenderer, type ThemeRenderer } from '../../src/index.ts';
import { createReplayFetch, type ApiFixtures } from '../browser/replay-fetch.ts';

const FIXTURES_DIR = join(import.meta.dirname, '../browser/fixtures');

const read = (name: string): string => readFileSync(join(FIXTURES_DIR, name), 'utf8');

const instance = JSON.parse(read('instance.json')) as {
  siteUrl: string;
  contentApiKey: string;
  config: Record<string, unknown>;
  routes: { home: string; post: string };
};

let rendererPromise: Promise<ThemeRenderer> | null = null;
function getRenderer(): Promise<ThemeRenderer> {
  rendererPromise ??= createRenderer({
    siteUrl: instance.siteUrl,
    contentApiKey: instance.contentApiKey,
    theme: JSON.parse(read('casper-theme.json')) as Record<string, string>,
    config: instance.config,
    fetch: createReplayFetch(JSON.parse(read('content-api.json')) as ApiFixtures),
  });
  return rendererPromise;
}

async function renderRoute(path: string): Promise<string> {
  const renderer = await getRenderer();
  const response = await renderer.render(new Request(new URL(path, instance.siteUrl).toString()));
  assert.equal(response.status, 200);
  return response.text();
}

describe('fixture parity (hermetic Node render over recorded fixtures)', function () {
  it('renders the home route identical to the committed expected HTML', async function () {
    assert.equal(await renderRoute(instance.routes.home), read('expected-home.html'));
  });

  it('renders the post route identical to the committed expected HTML', async function () {
    assert.equal(await renderRoute(instance.routes.post), read('expected-post.html'));
  });
});
