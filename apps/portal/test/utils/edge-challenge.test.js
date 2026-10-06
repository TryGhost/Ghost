import { vi } from 'vitest';
import {
  EdgeChallengeError,
  fetchWithEdgeChallenge,
  isEdgeChallengeEnabled,
  isEdgeBlockResponse,
  isEdgeChallengeResponse,
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

// Mirrors the structure of the real interstitial: it loads script.js (not challenge.js) from
// inline JS, alongside its own assets
function challengePage({ status = 200, token = '1T1wmsGaOgGaSxcX' } = {}) {
  return new Response(
    `<html><head><title>Client Challenge</title>
      <link rel="stylesheet" href="/_fs-ch-${token}/assets/styles.css">
      <script>loadScript('/_fs-ch-${token}/errors.js').then(() => loadScript('/_fs-ch-${token}/script.js'));</script>
      </head><body><noscript>JavaScript is disabled in your browser.</noscript><div id="loading-error" role="alert" aria-live="assertive"></div></body></html>`,
    { status, headers: { 'Content-Type': 'text/html; charset=utf-8' } },
  );
}

function jsonResponse(body, status = 201) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function challengeFrame() {
  return document.querySelector('iframe');
}

function frameContainer(frame = challengeFrame()) {
  return frame?.contentDocument.querySelector('.fastly-challenge');
}

function waitForChallengeFrame() {
  return vi.waitFor(() => {
    expect(challengeFrame()).toBeTruthy();
    return challengeFrame();
  });
}

function removeChallengeFrames() {
  document.querySelectorAll('iframe').forEach((el) => el.remove());
}

// jsdom doesn't load frames, so stand in for the browser loading the challenge script as the
// frame's document, which it renders as plain text
function loadFrame(frame) {
  const doc = frame.contentDocument;
  doc.open();
  doc.write(
    '<html><head><meta name="color-scheme" content="light dark"></head>' +
      '<body><pre>(function(){var _0x5115a2;})();</pre></body></html>',
  );
  doc.close();
  frame.dispatchEvent(new Event('load'));
}

// Loads every challenge frame as it's added; returns a function to stop watching
function loadChallengeFramesWhenAdded(onLoaded = () => {}) {
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) =>
      mutation.addedNodes.forEach((node) => {
        if (node.tagName === 'IFRAME') {
          loadFrame(node);
          onLoaded(node);
        }
      }),
    );
  });
  observer.observe(document.body, { childList: true });
  return () => observer.disconnect();
}

// Stands in for Fastly's challenge.js reporting a state on each embedded challenge
function completeChallengesWhenEmbedded(status = 'complete') {
  const frames = [];
  const stop = loadChallengeFramesWhenAdded((frame) => {
    frames.push(frame);
    frameContainer(frame).setAttribute('data-challenge-status', status);
  });
  return { frames, stop };
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
    expect(challengeFrame()).toBeNull();
  });
});

describe('fetchWithEdgeChallenge', () => {
  beforeEach(enableFlag);

  let challenges;

  afterEach(() => {
    challenges?.stop();
    challenges = null;
    disableFlag();
    vi.restoreAllMocks();
    removeChallengeFrames();
  });

  test('passes through normal responses without embedding a challenge', async () => {
    vi.spyOn(window, 'fetch').mockResolvedValue(jsonResponse({ ok: true }));

    const res = await fetchWithEdgeChallenge(`${siteUrl}/members/api/send-magic-link/`, {
      method: 'POST',
    });

    expect(res.status).toBe(201);
    expect(window.fetch).toHaveBeenCalledTimes(1);
    expect(challengeFrame()).toBeNull();
  });

  test('solves the challenge and retries the request once', async () => {
    vi.spyOn(window, 'fetch')
      .mockResolvedValueOnce(challengePage())
      .mockResolvedValueOnce(jsonResponse({ ok: true }));
    challenges = completeChallengesWhenEmbedded();

    const res = await fetchWithEdgeChallenge(`${siteUrl}/members/api/send-magic-link/`, {
      method: 'POST',
    });

    expect(res.status).toBe(201);
    expect(window.fetch).toHaveBeenCalledTimes(2);
    expect(challenges.frames).toHaveLength(1);
    expect(challengeFrame()).toBeNull();
  });

  test('runs the challenge script in its own hidden frame, not the page', async () => {
    challenges = { stop: loadChallengeFramesWhenAdded() };
    vi.spyOn(window, 'fetch')
      .mockResolvedValueOnce(challengePage())
      .mockResolvedValueOnce(jsonResponse({ ok: true }));
    const pending = fetchWithEdgeChallenge(`${siteUrl}/members/api/send-magic-link/`, {
      method: 'POST',
    });

    await vi.waitFor(() => expect(frameContainer()).toBeTruthy());
    const frame = challengeFrame();
    expect(frame.style.width).toBe('0px');
    expect(frame.getAttribute('aria-hidden')).toBe('true');
    expect(frame.getAttribute('tabindex')).toBe('-1');
    // challenge.js resolves URLs against the frame's location, so it can't be about:blank
    expect(frame.src).toBe(`${siteUrl}/_fs-ch-1T1wmsGaOgGaSxcX/challenge.js`);
    expect(frame.contentDocument.querySelector('script').src).toBe(
      `${siteUrl}/_fs-ch-1T1wmsGaOgGaSxcX/challenge.js`,
    );
    expect(document.querySelector('.fastly-challenge')).toBeNull();
    expect(document.querySelector('script[src*="/_fs-ch-"]')).toBeNull();
    // the script's source, as the browser rendered it, mustn't show behind a CAPTCHA
    expect(frame.contentDocument.querySelector('pre')).toBeNull();
    expect([...frame.contentDocument.body.children]).toEqual([frameContainer(frame)]);

    frameContainer(frame).setAttribute('data-challenge-status', 'complete');
    await expect(pending).resolves.toHaveProperty('status', 201);
  });

  test('loads challenge.js from the directory the interstitial uses', async () => {
    vi.spyOn(window, 'fetch')
      .mockResolvedValueOnce(challengePage({ token: 'OtherToken_123' }))
      .mockResolvedValueOnce(jsonResponse({ ok: true }));
    challenges = completeChallengesWhenEmbedded();

    await fetchWithEdgeChallenge(`${siteUrl}/members/api/send-magic-link/`, { method: 'POST' });

    expect(challenges.frames[0].src).toBe(`${siteUrl}/_fs-ch-OtherToken_123/challenge.js`);
  });

  test('a later challenge on the same page runs in a fresh frame', async () => {
    // challenge.js can't be loaded twice into one document, so each challenge needs its own
    vi.spyOn(window, 'fetch')
      .mockResolvedValueOnce(challengePage())
      .mockResolvedValueOnce(jsonResponse({ ok: true }))
      .mockResolvedValueOnce(challengePage())
      .mockResolvedValueOnce(jsonResponse({ ok: true }));
    challenges = completeChallengesWhenEmbedded();
    const url = `${siteUrl}/members/api/send-magic-link/`;

    await fetchWithEdgeChallenge(url, { method: 'POST' });
    const second = await fetchWithEdgeChallenge(url, { method: 'POST' });

    expect(second.status).toBe(201);
    expect(challenges.frames).toHaveLength(2);
    expect(challenges.frames[0]).not.toBe(challenges.frames[1]);
    expect(challengeFrame()).toBeNull();
  });

  test('ignores progress reported on other attributes', async () => {
    challenges = { stop: loadChallengeFramesWhenAdded() };
    vi.spyOn(window, 'fetch')
      .mockResolvedValueOnce(challengePage())
      .mockResolvedValueOnce(jsonResponse({ ok: true }));
    const pending = fetchWithEdgeChallenge(`${siteUrl}/members/api/send-magic-link/`, {
      method: 'POST',
    });

    await vi.waitFor(() => expect(frameContainer()).toBeTruthy());
    frameContainer().setAttribute('data-status', 'complete');
    await new Promise((resolve) => {
      setTimeout(resolve, 0);
    });
    expect(window.fetch).toHaveBeenCalledTimes(1);

    frameContainer().setAttribute('data-challenge-status', 'complete');
    await expect(pending).resolves.toHaveProperty('status', 201);
  });

  test('throws when the challenge fails', async () => {
    vi.spyOn(window, 'fetch').mockResolvedValue(challengePage());
    challenges = completeChallengesWhenEmbedded('error');

    await expect(
      fetchWithEdgeChallenge(`${siteUrl}/members/api/send-magic-link/`, { method: 'POST' }),
    ).rejects.toBeInstanceOf(EdgeChallengeError);
    expect(window.fetch).toHaveBeenCalledTimes(1);
  });

  test('throws when still challenged after solving', async () => {
    vi.spyOn(window, 'fetch').mockResolvedValue(challengePage());
    challenges = completeChallengesWhenEmbedded();

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
    expect(challengeFrame()).toBeNull();
  });

  test('throws on an NGWAF block without retrying', async () => {
    vi.spyOn(window, 'fetch').mockResolvedValue(new Response('', { status: 449 }));

    await expect(
      fetchWithEdgeChallenge(`${siteUrl}/members/api/send-magic-link/`, { method: 'POST' }),
    ).rejects.toBeInstanceOf(EdgeChallengeError);
    expect(window.fetch).toHaveBeenCalledTimes(1);
  });
});

describe('challenge frame failures', () => {
  afterEach(() => {
    removeChallengeFrames();
  });

  test('waits past a load event for the initial blank document', async () => {
    const result = solveEdgeChallenge();
    const frame = await waitForChallengeFrame();

    // jsdom never shows the blank document, so stand in for it
    Object.defineProperty(frame, 'contentDocument', {
      value: { URL: 'about:blank' },
      configurable: true,
    });
    frame.dispatchEvent(new Event('load'));
    delete frame.contentDocument;
    expect(challengeFrame()).toBe(frame);

    loadFrame(frame);
    frameContainer(frame).setAttribute('data-challenge-status', 'complete');
    await expect(result).resolves.toBeUndefined();
  });

  test('fails when the frame has no usable document', async () => {
    const result = solveEdgeChallenge();
    const frame = await waitForChallengeFrame();

    // e.g. the browser's own error page after the frame failed to load
    Object.defineProperty(frame, 'contentDocument', { value: null });
    frame.dispatchEvent(new Event('load'));

    await expect(result).rejects.toBeInstanceOf(EdgeChallengeError);
    expect(challengeFrame()).toBeNull();
  });

  test('fails when the challenge script fails to load', async () => {
    const result = solveEdgeChallenge();
    const frame = await waitForChallengeFrame();
    loadFrame(frame);

    frame.contentDocument.querySelector('script').dispatchEvent(new Event('error'));

    await expect(result).rejects.toBeInstanceOf(EdgeChallengeError);
    expect(challengeFrame()).toBeNull();
  });

  test('gives up after a minute when the frame never loads', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] });
    try {
      const result = solveEdgeChallenge().catch((e) => e);

      await vi.advanceTimersByTimeAsync(60 * 1000);

      expect(await result).toBeInstanceOf(EdgeChallengeError);
      expect(challengeFrame()).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });
});

describe('challenge timeout', () => {
  let stopLoadingFrames;

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] });
    stopLoadingFrames = loadChallengeFramesWhenAdded();
  });

  afterEach(() => {
    stopLoadingFrames();
    vi.useRealTimers();
    removeChallengeFrames();
  });

  test('gives up after a minute when the challenge never finishes', async () => {
    const result = solveEdgeChallenge().catch((e) => e);

    await vi.advanceTimersByTimeAsync(60 * 1000);

    expect(await result).toBeInstanceOf(EdgeChallengeError);
    expect(challengeFrame()).toBeNull();
  });

  test('gives a visitor solving a CAPTCHA up to four minutes in total', async () => {
    let settled = false;
    const result = solveEdgeChallenge()
      .catch((e) => e)
      .finally(() => {
        settled = true;
      });

    await vi.advanceTimersByTimeAsync(30 * 1000);
    frameContainer().setAttribute('data-challenge-status', 'captcha_prompted');
    await vi.advanceTimersByTimeAsync(60 * 1000);
    expect(settled).toBe(false);

    await vi.advanceTimersByTimeAsync(150 * 1000);
    expect(await result).toBeInstanceOf(EdgeChallengeError);
  });

  test('shows the frame over the page while a CAPTCHA is being solved', async () => {
    const result = solveEdgeChallenge();
    await vi.advanceTimersByTimeAsync(0);

    frameContainer().setAttribute('data-challenge-status', 'captcha_prompted');
    await vi.advanceTimersByTimeAsync(0);

    expect(challengeFrame().style.width).toBe('100%');
    expect(challengeFrame().style.height).toBe('100%');
    expect(challengeFrame().hasAttribute('aria-hidden')).toBe(false);
    expect(challengeFrame().hasAttribute('tabindex')).toBe(false);
    expect(challengeFrame().title).toBe('Security verification');

    frameContainer().setAttribute('data-challenge-status', 'complete');
    await expect(result).resolves.toBeUndefined();
  });

  test('the visitor can close a CAPTCHA', async () => {
    const result = solveEdgeChallenge();
    await vi.advanceTimersByTimeAsync(0);

    frameContainer().setAttribute('data-challenge-status', 'captcha_prompted');
    await vi.advanceTimersByTimeAsync(0);

    const close = challengeFrame().contentDocument.querySelector('button');
    expect(close.getAttribute('aria-label')).toBe('Close');
    close.click();

    await expect(result).rejects.toBeInstanceOf(EdgeChallengeError);
    expect(challengeFrame()).toBeNull();
  });

  test.each([
    ['the CAPTCHA', () => challengeFrame().contentDocument],
    ['the page', () => document],
  ])('Escape in %s closes a CAPTCHA', async (_, target) => {
    const result = solveEdgeChallenge();
    await vi.advanceTimersByTimeAsync(0);

    frameContainer().setAttribute('data-challenge-status', 'captcha_prompted');
    await vi.advanceTimersByTimeAsync(0);
    target().dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));

    await expect(result).rejects.toBeInstanceOf(EdgeChallengeError);
    expect(challengeFrame()).toBeNull();
  });

  test('Escape does nothing while the challenge is hidden', async () => {
    const result = solveEdgeChallenge();
    await vi.advanceTimersByTimeAsync(0);

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(challengeFrame()).toBeTruthy();

    frameContainer().setAttribute('data-challenge-status', 'complete');
    await expect(result).resolves.toBeUndefined();
  });

  test('a CAPTCHA solved within the extended window succeeds', async () => {
    const result = solveEdgeChallenge();
    await vi.advanceTimersByTimeAsync(0);

    const container = frameContainer();
    container.setAttribute('data-challenge-status', 'captcha_prompted');
    await vi.advanceTimersByTimeAsync(90 * 1000);
    container.setAttribute('data-challenge-status', 'complete');

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
