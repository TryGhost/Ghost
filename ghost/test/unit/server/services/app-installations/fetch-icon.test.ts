import assert from 'node:assert/strict';
import got from 'got';
import nock from 'nock';
import sinon from 'sinon';
import { sanitizeSvgContent } from '../../../../../core/server/lib/image/svg-sanitizer';
import { createAppFetcher } from '../../../../../core/server/services/app-installations/fetch-from-app';
import {
  createIconFetcher,
  type SanitizeSvg,
} from '../../../../../core/server/services/app-installations/fetch-icon';

const ICON_HOST = 'https://podcast.example.com';
const ICON_URL = `${ICON_HOST}/icon.svg`;
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

describe('createIconFetcher', function () {
  beforeAll(function () {
    nock.disableNetConnect();
  });

  afterEach(function () {
    nock.cleanAll();
  });

  afterAll(function () {
    nock.enableNetConnect();
  });

  const selfContained: SanitizeSvg = (svg) => sanitizeSvgContent(svg, { selfContained: true });

  const fetcher = ({
    alias = null,
    logging = { warn: sinon.stub() },
    sanitizeSvg = selfContained,
  }: {
    alias?: string | null;
    logging?: { warn(value: unknown): void };
    sanitizeSvg?: SanitizeSvg;
  } = {}) =>
    createIconFetcher({
      fetchFromApp: createAppFetcher({ request: got, getLocalhostAlias: () => alias }),
      logging,
      sanitizeSvg,
    });

  it('keeps nothing for an icon Admin ships, without any request', async function () {
    assert.equal(await fetcher()({ name: 'audio-lines' }), null);
  });

  it('keeps a sanitized copy of an SVG the app serves', async function () {
    nock(ICON_HOST, { reqheaders: { accept: 'image/svg+xml' } })
      .get('/icon.svg')
      .reply(200, ICON);

    assert.equal(await fetcher()({ url: ICON_URL }), ICON);
  });

  it('keeps nothing that could run, or load anything, when the copy is drawn', async function () {
    nock(ICON_HOST)
      .get('/icon.svg')
      .reply(
        200,
        `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" onload="alert(1)">
          <script>alert(2)</script>
          <image href="https://tracker.example.net/pixel.png" width="1" height="1"/>
          <foreignObject><img src="x" onerror="alert(3)"/></foreignObject>
          <path d="M0 0h24v24H0z"/>
        </svg>`,
      );

    const svg = (await fetcher()({ url: ICON_URL }))!;

    assert.doesNotMatch(svg, /script|alert|onload|onerror|<image|foreignObject|<img|tracker/i);
    assert.match(svg, /^<svg [^>]*viewBox="0 0 24 24">/);
    assert.match(svg, /<path d="M0 0h24v24H0z"\/>/);
  });

  it('reads a localhost icon through the alias, with its own host', async function () {
    nock('http://host.docker.internal:8787', { reqheaders: { host: 'localhost:8787' } })
      .get('/icon.svg')
      .reply(200, ICON);

    assert.equal(
      await fetcher({ alias: 'host.docker.internal' })({ url: 'http://localhost:8787/icon.svg' }),
      ICON,
    );
  });

  it('follows a redirect on the same host', async function () {
    nock(ICON_HOST)
      .get('/icon.svg')
      .reply(302, '', { location: '/v2/icon.svg' })
      .get('/v2/icon.svg')
      .reply(200, ICON);

    assert.equal(await fetcher()({ url: ICON_URL }), ICON);
  });

  it('refuses an icon that redirects to another host, without following it', async function () {
    nock(ICON_HOST)
      .get('/icon.svg')
      .reply(302, '', { location: 'https://elsewhere.example.net/icon.svg' });
    const elsewhere = nock('https://elsewhere.example.net').get('/icon.svg').reply(200, ICON);

    const err = await refusal(fetcher()({ url: ICON_URL }));

    assertRefused(err, 'Expected an icon on its own host, not a redirect to elsewhere.example.net');
    assert.equal(elsewhere.isDone(), false);
  });

  it('refuses an icon that does not load, saying only how the app answered', async function () {
    const warn = sinon.stub();
    nock(ICON_HOST).get('/icon.svg').reply(404);

    const err = await refusal(fetcher({ logging: { warn } })({ url: ICON_URL }));

    assertRefused(err, 'Expected an icon that loads, not HTTP 404');
    sinon.assert.calledWith(warn, `Could not load the app icon at ${ICON_URL}`);
  });

  it('logs why an icon could not be reached, without saying so to the caller', async function () {
    const warn = sinon.stub();
    nock(ICON_HOST)
      .get('/icon.svg')
      .replyWithError('Connection failed at a private upstream address');

    const err = await refusal(fetcher({ logging: { warn } })({ url: ICON_URL }));

    assertRefused(err, 'Expected an icon that loads');
    sinon.assert.calledTwice(warn);
    sinon.assert.calledWithExactly(warn.firstCall, `Could not load the app icon at ${ICON_URL}`);
    const failure = warn.secondCall.args[0];
    assert.ok(failure instanceof Error);
    assert.equal(failure.message, 'Connection failed at a private upstream address');
  });

  it('refuses a redirect to a Location that is not a URL as an icon that does not load', async function () {
    const warn = sinon.stub();
    nock(ICON_HOST).get('/icon.svg').reply(302, '', { location: 'http://[bad' });

    const err = await refusal(fetcher({ logging: { warn } })({ url: ICON_URL }));

    assertRefused(err, 'Expected an icon that loads, not HTTP 302');
    sinon.assert.calledWith(warn, `Could not load the app icon at ${ICON_URL}`);
    sinon.assert.calledWith(
      warn,
      `${ICON_URL} answered with HTTP 302 and a Location that is not a URL`,
    );
  });

  it('refuses an icon larger than 16 KB', async function () {
    nock(ICON_HOST)
      .get('/icon.svg')
      .reply(200, ICON.replace('</svg>', `<desc>${'x'.repeat(16 * 1024)}</desc></svg>`));

    assertRefused(await refusal(fetcher()({ url: ICON_URL })), 'Expected an icon of at most 16 KB');
  });

  it('takes an icon of exactly 16 KB', async function () {
    const padded = ICON.replace(
      '</svg>',
      `<desc>${'x'.repeat(16 * 1024 - ICON.length - '<desc></desc>'.length)}</desc></svg>`,
    );
    assert.equal(Buffer.byteLength(padded), 16 * 1024);
    nock(ICON_HOST).get('/icon.svg').reply(200, padded);

    assert.equal(await fetcher()({ url: ICON_URL }), padded);
  });

  // Sanitizing escapes text, so an icon can grow past the limit.
  it('refuses an icon that is larger than 16 KB once sanitized', async function () {
    const icon = `<svg xmlns="http://www.w3.org/2000/svg"><desc>${'>'.repeat(9000)}</desc></svg>`;
    assert.ok(Buffer.byteLength(icon) < 16 * 1024);
    nock(ICON_HOST).get('/icon.svg').reply(200, icon);

    assertRefused(await refusal(fetcher()({ url: ICON_URL })), 'Expected an icon of at most 16 KB');
  });

  it('refuses an icon that is not an SVG image', async function () {
    for (const body of [
      '<html><body>Not found</body></html>',
      'GIF89a',
      '<svg></svg>',
      // An app's own page, served for any path, with its logo in it.
      `<!doctype html><html><body><header>${ICON} Podcast</header></body></html>`,
    ]) {
      nock(ICON_HOST).get('/icon.svg').reply(200, body);

      assertRefused(await refusal(fetcher()({ url: ICON_URL })), 'Expected an SVG image');
    }
  });
});
