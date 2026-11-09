import { vi } from 'vitest';
import {
  EdgeChallengeError,
  fetchWithEdgeChallenge,
  isEdgeBlockResponse,
  isEdgeChallengeResponse,
} from '../../src/utils/edge-challenge';

const siteUrl = window.location.origin;
const magicLinkUrl = `${siteUrl}/members/api/send-magic-link/`;
const integrityTokenUrl = `${siteUrl}/members/api/integrity-token/`;

// Cloudflare serves every challenge type as a 403 HTML page with cf-mitigated
function challengePage() {
  return new Response('<!DOCTYPE html><html><head><title>Just a moment...</title></head></html>', {
    status: 403,
    headers: {
      'Content-Type': 'text/html; charset=UTF-8',
      'cf-mitigated': 'challenge',
      'cf-ray': 'a4ae75264b5b5b9c-VIE',
    },
  });
}

function blockPage(status = 403) {
  return new Response('<html><head><title>Attention Required! | Cloudflare</title></head></html>', {
    status,
    headers: { 'Content-Type': 'text/html; charset=UTF-8', 'cf-ray': 'a4ae8176e9d9b825-VIE' },
  });
}

function fastlyChallengePage() {
  return new Response(
    '<html><head><script src="/_fs-ch-1T1wmsGaOgGaSxcX/script.js"></script></head></html>',
    { status: 403, headers: { 'Content-Type': 'text/html; charset=utf-8' } },
  );
}

function jsonResponse(body: unknown, status = 201) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'cf-ray': 'a4ae8176e9d9b825-VIE' },
  });
}

function challengeFrame() {
  return document.querySelector('iframe');
}

function waitForChallengeFrame() {
  return vi.waitFor(() => {
    const frame = challengeFrame();
    if (!frame) {
      throw new Error('No challenge frame yet');
    }
    return frame;
  });
}

function frameDocumentOf(frame: HTMLIFrameElement) {
  const doc = frame.contentDocument;
  if (!doc) {
    throw new Error('Challenge frame has no document');
  }
  return doc;
}

function closeButtonOf(frame: HTMLIFrameElement) {
  const button = frameDocumentOf(frame).querySelector('button');
  if (!button) {
    throw new Error('Challenge frame has no close button');
  }
  return button;
}

function writeFrame(frame: HTMLIFrameElement, html: string) {
  const doc = frameDocumentOf(frame);
  doc.open();
  doc.write(html);
  doc.close();
}

// jsdom doesn't load frames, so write the challenge page into the frame instead
function loadChallengePage(frame: HTMLIFrameElement) {
  writeFrame(frame, '<html><body><h1>Performing security verification</h1></body></html>');
  Reflect.set(frame.contentWindow ?? {}, '_cf_chl_opt', { cType: 'managed' });
  frame.dispatchEvent(new Event('load'));
}

function loadGhostResponse(frame: HTMLIFrameElement) {
  Reflect.deleteProperty(frame.contentWindow ?? {}, '_cf_chl_opt');
  writeFrame(frame, '<html><body><pre>{"errors":[]}</pre></body></html>');
  frame.dispatchEvent(new Event('load'));
}

// Stands in for the browser loading challenge.js and the script reporting it passed
function completeFastlyChallenge(frame: HTMLIFrameElement) {
  writeFrame(frame, '<html><head></head><body><pre></pre></body></html>');
  frame.dispatchEvent(new Event('load'));
  frameDocumentOf(frame)
    .querySelector('.fastly-challenge')
    ?.setAttribute('data-challenge-status', 'complete');
}

describe('Cloudflare challenge detection', () => {
  test('recognises a challenge page by its cf-mitigated header', async () => {
    expect(await isEdgeChallengeResponse(challengePage(), magicLinkUrl)).toBe(true);
    expect(isEdgeBlockResponse(challengePage())).toBe(false);
  });

  test('recognises block and rate limit pages', () => {
    expect(isEdgeBlockResponse(blockPage(403))).toBe(true);
    expect(isEdgeBlockResponse(blockPage(429))).toBe(true);
  });

  test('does not mistake members API errors passing through Cloudflare for a block', async () => {
    const forbidden = jsonResponse({ errors: [] }, 403);
    const tooMany = jsonResponse({ errors: [] }, 429);
    expect(isEdgeBlockResponse(forbidden)).toBe(false);
    expect(isEdgeBlockResponse(tooMany)).toBe(false);
    expect(await isEdgeChallengeResponse(forbidden, magicLinkUrl)).toBe(false);
  });
});

describe('fetchWithEdgeChallenge with Cloudflare', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    document.querySelectorAll('iframe').forEach((el) => el.remove());
  });

  test('solves the challenge in a hidden frame on the challenged URL and retries the request', async () => {
    vi.spyOn(window, 'fetch')
      .mockResolvedValueOnce(challengePage())
      .mockResolvedValueOnce(jsonResponse({ ok: true }));
    const options = { method: 'POST', body: '{"email":"jamie@example.com"}' };
    const pending = fetchWithEdgeChallenge(magicLinkUrl, options);

    const frame = await waitForChallengeFrame();
    expect(frame.src).toBe(magicLinkUrl);
    loadChallengePage(frame);
    await vi.advanceTimersByTimeAsync(1000);
    expect(frame.style.width).toBe('0px');
    expect(frame.getAttribute('aria-hidden')).toBe('true');

    loadGhostResponse(frame);

    await expect(pending).resolves.toHaveProperty('status', 201);
    expect(window.fetch).toHaveBeenCalledTimes(2);
    expect(window.fetch).toHaveBeenLastCalledWith(magicLinkUrl, options);
    expect(challengeFrame()).toBeNull();
  });

  test('shows the challenge page when it does not clear itself', async () => {
    vi.spyOn(window, 'fetch')
      .mockResolvedValueOnce(challengePage())
      .mockResolvedValueOnce(jsonResponse({ ok: true }));
    const pending = fetchWithEdgeChallenge(magicLinkUrl, { method: 'POST' });

    const frame = await waitForChallengeFrame();
    loadChallengePage(frame);
    await vi.advanceTimersByTimeAsync(1500);

    expect(frame.style.width).toBe('100%');
    expect(frame.hasAttribute('aria-hidden')).toBe(false);
    expect(frame.title).toBe('Security verification');
    expect(closeButtonOf(frame).getAttribute('aria-label')).toBe('Close');

    loadGhostResponse(frame);
    await expect(pending).resolves.toHaveProperty('status', 201);
  });

  test('keeps a way out when Cloudflare loads a new challenge page', async () => {
    vi.spyOn(window, 'fetch').mockResolvedValue(challengePage());
    const pending = fetchWithEdgeChallenge(magicLinkUrl, { method: 'POST' }).catch((e) => e);

    const frame = await waitForChallengeFrame();
    loadChallengePage(frame);
    await vi.advanceTimersByTimeAsync(1500);
    // e.g. a failed attempt, which reloads into a fresh challenge page
    loadChallengePage(frame);

    closeButtonOf(frame).click();

    expect(await pending).toBeInstanceOf(EdgeChallengeError);
    expect(window.fetch).toHaveBeenCalledTimes(1);
    expect(challengeFrame()).toBeNull();
  });

  test('gives a visitor four minutes in total once the challenge is shown', async () => {
    vi.spyOn(window, 'fetch').mockResolvedValue(challengePage());
    let settled = false;
    const pending = fetchWithEdgeChallenge(magicLinkUrl, { method: 'POST' })
      .catch((e) => e)
      .finally(() => {
        settled = true;
      });

    loadChallengePage(await waitForChallengeFrame());
    await vi.advanceTimersByTimeAsync(90 * 1000);
    expect(settled).toBe(false);

    await vi.advanceTimersByTimeAsync(150 * 1000);
    expect(await pending).toBeInstanceOf(EdgeChallengeError);
  });

  test('fails when solving in the frame does not clear the request', async () => {
    // e.g. a WAF rule that only challenges POSTs, so the frame's GET never sees a challenge
    vi.spyOn(window, 'fetch').mockResolvedValue(challengePage());
    const pending = fetchWithEdgeChallenge(magicLinkUrl, { method: 'POST' }).catch((e) => e);

    loadGhostResponse(await waitForChallengeFrame());

    expect(await pending).toBeInstanceOf(EdgeChallengeError);
    expect(window.fetch).toHaveBeenCalledTimes(2);
  });

  test('throws on a block without embedding a challenge or retrying', async () => {
    vi.spyOn(window, 'fetch').mockResolvedValue(blockPage());

    await expect(fetchWithEdgeChallenge(magicLinkUrl, { method: 'POST' })).rejects.toBeInstanceOf(
      EdgeChallengeError,
    );
    expect(window.fetch).toHaveBeenCalledTimes(1);
    expect(challengeFrame()).toBeNull();
  });

  test('requests challenged at the same time share one solve, whichever URL they were for', async () => {
    const fetchSpy = vi
      .spyOn(window, 'fetch')
      .mockResolvedValueOnce(challengePage())
      .mockResolvedValueOnce(challengePage())
      .mockResolvedValue(jsonResponse({ ok: true }));
    const signIn = fetchWithEdgeChallenge(magicLinkUrl, { method: 'POST' });
    const frame = await waitForChallengeFrame();
    const token = fetchWithEdgeChallenge(integrityTokenUrl);
    await vi.waitFor(() => expect(window.fetch).toHaveBeenCalledTimes(2));
    await vi.advanceTimersByTimeAsync(0);
    expect(document.querySelectorAll('iframe')).toHaveLength(1);

    loadChallengePage(frame);
    loadGhostResponse(frame);

    await expect(signIn).resolves.toHaveProperty('status', 201);
    await expect(token).resolves.toHaveProperty('status', 201);
    expect(window.fetch).toHaveBeenCalledTimes(4);
    expect(fetchSpy.mock.calls.slice(2)).toEqual(
      expect.arrayContaining([
        [magicLinkUrl, { method: 'POST' }],
        [integrityTokenUrl, undefined],
      ]),
    );
  });

  test('a request still challenged after a shared solve solves its own challenge', async () => {
    // e.g. a JS challenge on the magic link URL and a managed challenge on the token URL, so
    // the magic link's solve clears only itself
    let magicLinkCleared = false;
    let tokenCleared = false;
    vi.spyOn(window, 'fetch').mockImplementation(async (input) => {
      const cleared = input === magicLinkUrl ? magicLinkCleared : tokenCleared;
      return cleared ? jsonResponse({ ok: true }) : challengePage();
    });
    const signIn = fetchWithEdgeChallenge(magicLinkUrl, { method: 'POST' });
    const sharedFrame = await waitForChallengeFrame();
    const token = fetchWithEdgeChallenge(integrityTokenUrl);
    await vi.waitFor(() => expect(window.fetch).toHaveBeenCalledTimes(2));
    await vi.advanceTimersByTimeAsync(0);

    loadChallengePage(sharedFrame);
    magicLinkCleared = true;
    loadGhostResponse(sharedFrame);
    await expect(signIn).resolves.toHaveProperty('status', 201);

    const ownFrame = await waitForChallengeFrame();
    expect(ownFrame).not.toBe(sharedFrame);
    expect(ownFrame.src).toBe(integrityTokenUrl);
    loadChallengePage(ownFrame);
    tokenCleared = true;
    loadGhostResponse(ownFrame);

    await expect(token).resolves.toHaveProperty('status', 201);
    expect(window.fetch).toHaveBeenCalledTimes(5);
    expect(challengeFrame()).toBeNull();
  });

  test('solves a Fastly challenge that arrives while a Cloudflare one is pending', async () => {
    vi.spyOn(window, 'fetch')
      .mockResolvedValueOnce(challengePage())
      .mockResolvedValueOnce(fastlyChallengePage())
      .mockResolvedValue(jsonResponse({ ok: true }));
    const signIn = fetchWithEdgeChallenge(magicLinkUrl, { method: 'POST' });
    const cloudflareFrame = await waitForChallengeFrame();
    const token = fetchWithEdgeChallenge(integrityTokenUrl);
    const fastlyFrame = await vi.waitFor(() => {
      const frame = [...document.querySelectorAll('iframe')].find((f) => f !== cloudflareFrame);
      if (!frame) {
        throw new Error('No Fastly challenge frame yet');
      }
      return frame;
    });
    expect(fastlyFrame.src).toBe(`${siteUrl}/_fs-ch-1T1wmsGaOgGaSxcX/challenge.js`);

    completeFastlyChallenge(fastlyFrame);
    await expect(token).resolves.toHaveProperty('status', 201);
    expect(cloudflareFrame.isConnected).toBe(true);

    loadChallengePage(cloudflareFrame);
    loadGhostResponse(cloudflareFrame);
    await expect(signIn).resolves.toHaveProperty('status', 201);
    expect(window.fetch).toHaveBeenCalledTimes(4);
    expect(challengeFrame()).toBeNull();
  });
});
