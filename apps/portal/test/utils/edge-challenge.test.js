import { vi } from 'vitest';
import {
  EdgeChallengeError,
  fetchWithEdgeChallenge,
  isEdgeChallengeEnabled,
  isEdgeBlockResponse,
  isEdgeChallengeResponse,
  readEdgeChallenge,
  solveEdgeChallenge,
} from '../../src/utils/edge-challenge';
import setupGhostApi from '../../src/utils/api';
import { chooseBestErrorMessage } from '../../src/utils/errors';

const siteUrl = window.location.origin;

function enableFlag() {
  document.cookie = 'waf_challenge=1; Path=/';
}

function disableFlag() {
  document.cookie = 'waf_challenge=; Max-Age=0; Path=/';
}

function challengePage({
  status = 200,
  scriptPath = '/_fs-ch-1T1wmsGaOgGaSxcX/challenge.js',
} = {}) {
  return new Response(`<html><head><script src="${scriptPath}"></script></head></html>`, {
    status,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}

function jsonResponse(body, status = 201) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

// Stands in for Fastly's challenge.js reporting a state on the embedded challenge
function completeChallengeWhenEmbedded(status = 'complete') {
  const observer = new MutationObserver(() => {
    const container = document.querySelector('.fastly-challenge');
    if (container) {
      observer.disconnect();
      container.setAttribute('data-status', status);
    }
  });
  observer.observe(document.body, { childList: true });
  return observer;
}

describe('edge challenge detection', () => {
  test('recognises a challenge interstitial', async () => {
    expect(await isEdgeChallengeResponse(challengePage())).toBe(true);
    expect(await isEdgeChallengeResponse(challengePage({ status: 403 }))).toBe(true);
  });

  test('does not mistake gateway error pages or API responses for a challenge', async () => {
    const sleptPage = new Response('<html><body>This site is asleep</body></html>', {
      status: 503,
      headers: { 'Content-Type': 'text/html' },
    });
    expect(await isEdgeChallengeResponse(sleptPage)).toBe(false);
    expect(await isEdgeChallengeResponse(jsonResponse({}))).toBe(false);
    expect(await isEdgeChallengeResponse(new Response('123:abc:def', { status: 200 }))).toBe(false);
  });

  test('reads the challenge script from the interstitial', async () => {
    const challenge = await readEdgeChallenge(
      challengePage({ scriptPath: '/_fs-ch-OtherToken_123/challenge.js' }),
    );
    expect(challenge).toEqual({ scriptPath: '/_fs-ch-OtherToken_123/challenge.js' });
  });

  test('falls back to the default challenge script when the interstitial does not name one', async () => {
    const page = new Response('<html><body><img src="/_fs-ch-abc/logo.png"></body></html>', {
      status: 200,
      headers: { 'Content-Type': 'text/html' },
    });
    expect(await readEdgeChallenge(page)).toEqual({
      scriptPath: '/_fs-ch-1T1wmsGaOgGaSxcX/challenge.js',
    });
  });

  test('recognises NGWAF blocks but not members API JSON errors', () => {
    expect(isEdgeBlockResponse(new Response('', { status: 449 }))).toBe(true);
    expect(isEdgeBlockResponse(new Response('', { status: 406 }))).toBe(true);
    expect(isEdgeBlockResponse(jsonResponse({ errors: [] }, 429))).toBe(false);
  });
});

describe('waf_challenge feature flag', () => {
  afterEach(() => {
    disableFlag();
    vi.restoreAllMocks();
  });

  test('is off unless the cookie is set', () => {
    expect(isEdgeChallengeEnabled()).toBe(false);
    document.cookie = 'waf_challenge=0; Path=/';
    expect(isEdgeChallengeEnabled()).toBe(false);
    enableFlag();
    expect(isEdgeChallengeEnabled()).toBe(true);
  });

  test('when off, responses are returned untouched', async () => {
    vi.spyOn(window, 'fetch').mockResolvedValue(challengePage());

    const res = await fetchWithEdgeChallenge(`${siteUrl}/members/api/send-magic-link/`, {
      method: 'POST',
    });

    expect(res.status).toBe(200);
    expect(window.fetch).toHaveBeenCalledTimes(1);
    expect(document.querySelector('.fastly-challenge')).toBeNull();
  });
});

describe('fetchWithEdgeChallenge', () => {
  beforeEach(enableFlag);

  afterEach(() => {
    disableFlag();
    vi.restoreAllMocks();
    document.querySelectorAll('.fastly-challenge').forEach((el) => el.remove());
  });

  test('passes through normal responses without embedding a challenge', async () => {
    vi.spyOn(window, 'fetch').mockResolvedValue(jsonResponse({ ok: true }));

    const res = await fetchWithEdgeChallenge(`${siteUrl}/members/api/send-magic-link/`, {
      method: 'POST',
    });

    expect(res.status).toBe(201);
    expect(window.fetch).toHaveBeenCalledTimes(1);
    expect(document.querySelector('.fastly-challenge')).toBeNull();
  });

  test('solves the challenge and retries the request once', async () => {
    vi.spyOn(window, 'fetch')
      .mockResolvedValueOnce(challengePage())
      .mockResolvedValueOnce(jsonResponse({ ok: true }));
    completeChallengeWhenEmbedded();

    const res = await fetchWithEdgeChallenge(`${siteUrl}/members/api/send-magic-link/`, {
      method: 'POST',
    });

    expect(res.status).toBe(201);
    expect(window.fetch).toHaveBeenCalledTimes(2);
    expect(document.querySelector('.fastly-challenge')).toBeNull();
    expect(document.querySelector('script[src*="/_fs-ch-"]')).toBeNull();
  });

  test('embeds the challenge script named by the interstitial', async () => {
    vi.spyOn(window, 'fetch')
      .mockResolvedValueOnce(challengePage({ scriptPath: '/_fs-ch-OtherToken_123/challenge.js' }))
      .mockResolvedValueOnce(jsonResponse({ ok: true }));
    const embeddedScripts = [];
    const observer = new MutationObserver(() => {
      document
        .querySelectorAll('script[src*="/_fs-ch-"]')
        .forEach((el) => embeddedScripts.push(el.getAttribute('src')));
    });
    observer.observe(document.head, { childList: true });
    completeChallengeWhenEmbedded();

    await fetchWithEdgeChallenge(`${siteUrl}/members/api/send-magic-link/`, { method: 'POST' });
    observer.disconnect();

    expect(embeddedScripts).toContain('/_fs-ch-OtherToken_123/challenge.js');
  });

  test('throws when the challenge fails', async () => {
    vi.spyOn(window, 'fetch').mockResolvedValue(challengePage());
    completeChallengeWhenEmbedded('error');

    await expect(
      fetchWithEdgeChallenge(`${siteUrl}/members/api/send-magic-link/`, { method: 'POST' }),
    ).rejects.toBeInstanceOf(EdgeChallengeError);
    expect(window.fetch).toHaveBeenCalledTimes(1);
  });

  test('throws when still challenged after solving', async () => {
    vi.spyOn(window, 'fetch').mockResolvedValue(challengePage());
    completeChallengeWhenEmbedded();

    await expect(
      fetchWithEdgeChallenge(`${siteUrl}/members/api/send-magic-link/`, { method: 'POST' }),
    ).rejects.toBeInstanceOf(EdgeChallengeError);
    expect(window.fetch).toHaveBeenCalledTimes(2);
  });

  test('does not try to solve a challenge for another site', async () => {
    vi.spyOn(window, 'fetch').mockResolvedValue(challengePage());

    await expect(
      fetchWithEdgeChallenge('https://other.example/members/api/send-magic-link/', {
        method: 'POST',
      }),
    ).rejects.toBeInstanceOf(EdgeChallengeError);
    expect(document.querySelector('.fastly-challenge')).toBeNull();
  });

  test('throws on an NGWAF block without retrying', async () => {
    vi.spyOn(window, 'fetch').mockResolvedValue(new Response('', { status: 449 }));

    await expect(
      fetchWithEdgeChallenge(`${siteUrl}/members/api/send-magic-link/`, { method: 'POST' }),
    ).rejects.toBeInstanceOf(EdgeChallengeError);
    expect(window.fetch).toHaveBeenCalledTimes(1);
  });
});

describe('challenge timeout', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] });
  });

  afterEach(() => {
    vi.useRealTimers();
    document.querySelectorAll('.fastly-challenge').forEach((el) => el.remove());
  });

  test('gives up after a minute when the challenge never finishes', async () => {
    const result = solveEdgeChallenge().catch((e) => e);

    await vi.advanceTimersByTimeAsync(60 * 1000);

    expect(await result).toBeInstanceOf(EdgeChallengeError);
    expect(document.querySelector('.fastly-challenge')).toBeNull();
  });

  test('gives a visitor solving a CAPTCHA up to four minutes in total', async () => {
    let settled = false;
    const result = solveEdgeChallenge()
      .catch((e) => e)
      .finally(() => {
        settled = true;
      });

    await vi.advanceTimersByTimeAsync(30 * 1000);
    document.querySelector('.fastly-challenge').setAttribute('data-status', 'captcha_prompted');
    await vi.advanceTimersByTimeAsync(60 * 1000);
    expect(settled).toBe(false);

    await vi.advanceTimersByTimeAsync(150 * 1000);
    expect(await result).toBeInstanceOf(EdgeChallengeError);
  });

  test('a CAPTCHA solved within the extended window succeeds', async () => {
    const result = solveEdgeChallenge();

    const container = document.querySelector('.fastly-challenge');
    container.setAttribute('data-status', 'captcha_prompted');
    await vi.advanceTimersByTimeAsync(90 * 1000);
    container.setAttribute('data-status', 'complete');

    await expect(result).resolves.toBeUndefined();
  });
});

describe('members API with edge challenges', () => {
  beforeEach(enableFlag);

  afterEach(() => {
    disableFlag();
    vi.restoreAllMocks();
  });

  test('sendMagicLink no longer reports a challenge page as success', async () => {
    const ghostApi = setupGhostApi({ siteUrl: 'https://other.example' });
    vi.spyOn(window, 'fetch').mockResolvedValue(challengePage());

    await expect(
      ghostApi.member.sendMagicLink({ email: 'jamie@example.com' }),
    ).rejects.toBeInstanceOf(EdgeChallengeError);
  });

  test('getIntegrityToken does not return a challenge page as the token', async () => {
    const ghostApi = setupGhostApi({ siteUrl: 'https://other.example' });
    vi.spyOn(window, 'fetch').mockResolvedValue(challengePage());

    await expect(ghostApi.member.getIntegrityToken()).rejects.toBeInstanceOf(EdgeChallengeError);
  });

  test('a challenge failure shows a specific message', () => {
    expect(
      chooseBestErrorMessage(new EdgeChallengeError(), 'Failed to log in, please try again'),
    ).toBe('Unable to verify your request, please try again');
  });
});
