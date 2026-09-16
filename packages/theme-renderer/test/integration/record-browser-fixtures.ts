/* eslint-disable no-console */
/**
 * Fixture recorder for the browser-mode worker-parity suite (slice 2).
 *
 * Run against the local dev instance (Ghost running at localhost:2368, or
 * GHOST_URL):
 *
 *     node test/integration/record-browser-fixtures.ts
 *
 * It renders the home route and the first post route in Node through
 * `createRenderer` with a RECORDING fetch (every Content API request/response
 * pair is captured), then commits to test/browser/fixtures/:
 *
 *   - instance.json      site URL, Content API key, scraped instance config
 *                        (asset hash + portal/sodo-search URLs, as in
 *                        test/integration/parity.test.ts), and the routes
 *   - casper-theme.json  Casper's theme files (the browser can't fs-read them)
 *   - content-api.json   URL → {status, body} map replayed by the tests' fetch
 *   - expected-home.html / expected-post.html
 *                        the NODE-rendered HTML for those routes
 *
 * The replay tests are hermetic (no Ghost needed): the Node guard test
 * (test/integration/fixture-parity.test.ts) proves the Node render still
 * matches the committed HTML, and the worker test
 * (test/browser/worker-render.test.ts) proves a real Web Worker render
 * matches it too — together: worker output ≡ Node output for the same data.
 *
 * The recorded Content API key only exists on the local dev instance — it is
 * meaningless outside this machine's database, so committing it is safe.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { createRenderer } from '../../src/index.ts';
import {
  GHOST_URL,
  fetchFirstPost,
  loadCasperTheme,
  probeLive,
  scrapeInstanceConfig,
} from './harness.ts';

const FIXTURES_DIR = join(import.meta.dirname, '../browser/fixtures');

const probe = await probeLive();
if (probe.unavailableReason) {
  console.error(`Cannot record fixtures: ${probe.unavailableReason}`);
  process.exit(1);
}

// Instance config the Content API cannot supply — the exact scrapes
// parity.test.ts uses (harness.ts scrapeInstanceConfig). A missed scrape means
// the fixtures would silently record a degraded render (missing asset hash or
// frontend-app script tags), so refuse to record rather than commit them.
const scrape = scrapeInstanceConfig(probe.liveHomeHtml);
if (scrape.missing.length > 0) {
  console.error(
    `Cannot record fixtures: live page scrape missed ${scrape.missing.join(', ')} — refusing to record degraded fixtures`,
  );
  process.exit(1);
}
const config = scrape.config;

// First post (for the entry route), as in parity.test.ts
const firstPost = await fetchFirstPost(probe.contentApiKey);
if (!firstPost) {
  console.error('Cannot record fixtures: dev instance has no posts');
  process.exit(1);
}
const postPath = new URL(firstPost.url).pathname;

// Recording fetch: capture every request the renderer makes
const apiFixtures: Record<string, { status: number; body: string }> = {};
const recordingFetch: typeof globalThis.fetch = async (input, init) => {
  const url =
    typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
  const response = await globalThis.fetch(input, init);
  apiFixtures[url] = { status: response.status, body: await response.clone().text() };
  return response;
};

const theme = loadCasperTheme();
const siteUrl = `${GHOST_URL}/`;
const renderer = await createRenderer({
  siteUrl,
  contentApiKey: probe.contentApiKey,
  theme,
  config,
  fetch: recordingFetch,
});

async function renderRoute(path: string): Promise<string> {
  const response = await renderer.render(new Request(new URL(path, siteUrl)));
  if (response.status !== 200) {
    console.error(`Render of ${path} returned ${response.status} — refusing to record`);
    process.exit(1);
  }
  return response.text();
}

const homeHtml = await renderRoute('/');
const postHtml = await renderRoute(postPath);

mkdirSync(FIXTURES_DIR, { recursive: true });
const write = (name: string, content: string) => {
  writeFileSync(join(FIXTURES_DIR, name), content);
  console.log(`wrote ${name} (${content.length} bytes)`);
};

write(
  'instance.json',
  JSON.stringify(
    {
      siteUrl,
      contentApiKey: probe.contentApiKey,
      config,
      routes: { home: '/', post: postPath },
    },
    null,
    4,
  ) + '\n',
);
write('casper-theme.json', JSON.stringify(theme, null, 4) + '\n');
write('content-api.json', JSON.stringify(apiFixtures, null, 4) + '\n');
write('expected-home.html', homeHtml);
write('expected-post.html', postHtml);
