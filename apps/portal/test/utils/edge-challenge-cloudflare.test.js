import { vi } from 'vitest';
import {
  EdgeChallengeError,
  fetchWithEdgeChallenge,
  isEdgeBlockResponse,
  isEdgeChallengeResponse,
} from '../../src/utils/edge-challenge';

const siteUrl = window.location.origin;
const magicLinkUrl = `${siteUrl}/members/api/send-magic-link/`;

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

function jsonResponse(body, status = 201) {
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
    expect(challengeFrame()).toBeTruthy();
    return challengeFrame();
  });
}

// jsdom doesn't load frames, so write the challenge page into the frame instead
function loadChallengePage(frame) {
  const doc = frame.contentDocument;
  doc.open();
  doc.write('<html><body><h1>Performing security verification</h1></body></html>');
  doc.close();
  frame.contentWindow._cf_chl_opt = { cType: 'managed' };
  frame.dispatchEvent(new Event('load'));
}

function loadGhostResponse(frame) {
  delete frame.contentWindow._cf_chl_opt;
  const doc = frame.contentDocument;
  doc.open();
  doc.write('<html><body><pre>{"errors":[]}</pre></body></html>');
  doc.close();
  frame.dispatchEvent(new Event('load'));
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
    expect(frame.contentDocument.querySelector('button').getAttribute('aria-label')).toBe('Close');

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

    frame.contentDocument.querySelector('button').click();

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
});
