import assert from 'node:assert/strict';
import { vi } from 'vitest';
import type {
  AppFetchFailure,
  AppFetchResult,
  FetchFromApp,
} from '../../../../../core/server/services/app-installations/fetch-from-app';
import {
  createIconFetcher,
  type SanitizeSvg,
} from '../../../../../core/server/services/app-installations/fetch-icon';

const ICON_URL = 'https://podcast.example.com/icon.svg';
const ICON =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M0 0h24v24H0z"/></svg>';

type Refusal = {
  code?: string;
  message?: string;
  context?: string;
  errorDetails?: Array<{ path: string; message: string }>;
};

async function refusal(loading: Promise<unknown>): Promise<Refusal> {
  try {
    await loading;
  } catch (err) {
    return err as Refusal;
  }
  assert.fail('Expected the icon to be refused');
}

/** Checks the icon was refused as the manifest's `icon.url` problem, with this message. */
function assertRefused(err: Refusal, message: string) {
  assert.equal(err.code, 'APP_MANIFEST_INVALID');
  assert.equal(err.message, 'The app manifest is not valid.');
  assert.equal(err.context, `icon.url: ${message}`);
  assert.deepEqual(err.errorDetails, [{ path: 'icon.url', message }]);
}

const failing = (failure: AppFetchFailure): AppFetchResult => ({ success: false, failure });

function setup({
  fetched = { success: true, url: ICON_URL, text: ICON },
  sanitized = ICON,
}: { fetched?: AppFetchResult; sanitized?: string | null } = {}) {
  const fetchFromApp = vi.fn<FetchFromApp>(async () => fetched);
  const sanitizeSvg = vi.fn<SanitizeSvg>(() => sanitized);
  const warn = vi.fn();
  const fetchIcon = createIconFetcher({ fetchFromApp, logging: { warn }, sanitizeSvg });
  return { fetchIcon, fetchFromApp, sanitizeSvg, warn };
}

describe('createIconFetcher', function () {
  it('keeps nothing for an icon Admin ships, without fetching it', async function () {
    const { fetchIcon, fetchFromApp } = setup();

    assert.equal(await fetchIcon({ name: 'audio-lines' }), null);
    assert.equal(fetchFromApp.mock.calls.length, 0);
  });

  it('asks the app for an SVG of at most 16 KB', async function () {
    const { fetchIcon, fetchFromApp } = setup();

    await fetchIcon({ url: ICON_URL });

    assert.deepEqual(fetchFromApp.mock.calls, [
      [ICON_URL, { accept: 'image/svg+xml', maxBytes: 16 * 1024 }],
    ]);
  });

  it('keeps the sanitized copy of the SVG the app serves', async function () {
    const sanitized = '<svg xmlns="http://www.w3.org/2000/svg"><path d="M0 0h1v1H0z"/></svg>';
    const { fetchIcon, sanitizeSvg } = setup({ sanitized });

    assert.equal(await fetchIcon({ url: ICON_URL }), sanitized);
    assert.deepEqual(sanitizeSvg.mock.calls, [[ICON]]);
  });

  it('refuses an icon that is not an SVG image', async function () {
    const { fetchIcon } = setup({ sanitized: null });

    assertRefused(await refusal(fetchIcon({ url: ICON_URL })), 'Expected an SVG image');
  });

  describe('with as many elements as an icon can have', function () {
    const withElements = (count: number): AppFetchResult => ({
      success: true,
      url: ICON_URL,
      text: `<svg xmlns="http://www.w3.org/2000/svg">${'<g>'.repeat(count - 1)}</svg>`,
    });

    it('takes an icon of 500 elements', async function () {
      const { fetchIcon, sanitizeSvg } = setup({ fetched: withElements(500) });

      assert.equal(await fetchIcon({ url: ICON_URL }), ICON);
      assert.equal(sanitizeSvg.mock.calls.length, 1);
    });

    it('refuses an icon of more than 500 elements without sanitizing it', async function () {
      const { fetchIcon, sanitizeSvg } = setup({ fetched: withElements(501) });

      assertRefused(
        await refusal(fetchIcon({ url: ICON_URL })),
        'Expected an icon of at most 500 elements',
      );
      assert.equal(sanitizeSvg.mock.calls.length, 0);
    });
  });

  it('takes a sanitized copy of exactly 16 KB', async function () {
    const sanitized = 'x'.repeat(16 * 1024);
    const { fetchIcon } = setup({ sanitized });

    assert.equal(await fetchIcon({ url: ICON_URL }), sanitized);
  });

  // Sanitizing escapes text, so the copy can be larger than the download it came from.
  it('refuses a sanitized copy larger than 16 KB, counted in bytes', async function () {
    const sanitized = 'é'.repeat(8 * 1024 + 1);
    assert.ok(sanitized.length < 16 * 1024);
    const { fetchIcon } = setup({ sanitized });

    assertRefused(await refusal(fetchIcon({ url: ICON_URL })), 'Expected an icon of at most 16 KB');
  });

  describe('when the app can’t be read', function () {
    it('refuses an icon that does not load, saying only the status and logging why', async function () {
      const cause = new Error('Response code 404 (Not Found)');
      const { fetchIcon, warn } = setup({
        fetched: failing({ reason: 'unreachable', status: 404, cause }),
      });

      const err = await refusal(fetchIcon({ url: ICON_URL }));

      assertRefused(err, 'Expected an icon that loads, not HTTP 404');
      assert.deepEqual(warn.mock.calls, [[`Could not load the app icon at ${ICON_URL}`], [cause]]);
    });

    it('refuses an icon that can’t be reached, logging why without saying it', async function () {
      const cause = new Error('Connection failed at a private upstream address');
      const { fetchIcon, warn } = setup({ fetched: failing({ reason: 'unreachable', cause }) });

      const err = await refusal(fetchIcon({ url: ICON_URL }));

      assertRefused(err, 'Expected an icon that loads');
      assert.deepEqual(warn.mock.calls, [[`Could not load the app icon at ${ICON_URL}`], [cause]]);
    });

    it('refuses a redirect to a Location that is not a URL as an icon that does not load', async function () {
      const { fetchIcon, warn } = setup({
        fetched: failing({ reason: 'location_not_url', status: 302 }),
      });

      const err = await refusal(fetchIcon({ url: ICON_URL }));

      assertRefused(err, 'Expected an icon that loads, not HTTP 302');
      assert.deepEqual(warn.mock.calls, [
        [`Could not load the app icon at ${ICON_URL}`],
        [`${ICON_URL} answered with HTTP 302 and a Location that is not a URL`],
      ]);
    });

    it('refuses an icon that redirects to another host', async function () {
      const { fetchIcon } = setup({
        fetched: failing({ reason: 'redirected', host: 'elsewhere.example.net' }),
      });

      assertRefused(
        await refusal(fetchIcon({ url: ICON_URL })),
        'Expected an icon on its own host, not a redirect to elsewhere.example.net',
      );
    });

    it('refuses an icon larger than 16 KB', async function () {
      const { fetchIcon } = setup({ fetched: failing({ reason: 'too_large' }) });

      assertRefused(
        await refusal(fetchIcon({ url: ICON_URL })),
        'Expected an icon of at most 16 KB',
      );
    });
  });
});
