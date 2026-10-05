import { HumanReadableError } from './errors';

// Fastly Next-Gen WAF can answer a members API request with a client challenge (HTML
// page) or a block instead of the API response. A fetch() can't solve a
// HTML response, so when one comes back we embed the challenge in the page, wait for the
// visitor's browser to solve it (which sets the challenge cookie) and retry the request once.
// https://www.fastly.com/documentation/guides/security/bot-management/client-challenges/embedding-challenges-in-pages
const CHALLENGE_PATH_PREFIX = '/_fs-ch-';
// The interstitial names the challenge script it loads; this is the fallback if it can't be
// read from there
const DEFAULT_CHALLENGE_SCRIPT_PATH = '/_fs-ch-1T1wmsGaOgGaSxcX/challenge.js';
const CHALLENGE_SCRIPT_PATTERN = /(\/_fs-ch-[A-Za-z0-9_-]+\/challenge\.js)/;
const CHALLENGE_TIMEOUT_MS = 60 * 1000;
// A visitor solving a CAPTCHA gets longer, but the retried request carries an integrity token
// fetched before the challenge, which Ghost only accepts for 5 minutes
const INTERACTIVE_CHALLENGE_TIMEOUT_MS = 4 * 60 * 1000;

// 406/449 are NGWAF block status
const EDGE_BLOCK_STATUSES = [406, 449];

// Opt-in per browser while the flow is verified against live NGWAF rules. Fastly strips
// non-`ghost-*` cookies before origin, so this never reaches Ghost or the cache key.
//   enable:  document.cookie = 'waf_challenge=1; Max-Age=2592000; Path=/; SameSite=Lax'
//   disable: document.cookie = 'waf_challenge=; Max-Age=0; Path=/'
const FEATURE_FLAG_COOKIE = 'waf_challenge=1';

export function isEdgeChallengeEnabled() {
  return document.cookie.split('; ').includes(FEATURE_FLAG_COOKIE);
}

export const EDGE_CHALLENGE_FAILED_MESSAGE = 'Unable to verify your request, please try again';

export class EdgeChallengeError extends HumanReadableError {
  constructor() {
    super(EDGE_CHALLENGE_FAILED_MESSAGE, { code: 'EDGE_CHALLENGE_FAILED' });
  }
}

function contentTypeOf(res) {
  return (res.headers?.get('content-type') || '').toLowerCase();
}

// Error pages (503, maintenance, etc) are HTML too, so only treat a response as a challenge
// when it loads the challenge assets. Returns the challenge script to embed, or null.
export async function readEdgeChallenge(res) {
  if (!contentTypeOf(res).includes('text/html')) {
    return null;
  }
  let body;
  try {
    body = await res.clone().text();
  } catch (e) {
    return null;
  }
  if (!body.includes(CHALLENGE_PATH_PREFIX)) {
    return null;
  }
  return { scriptPath: body.match(CHALLENGE_SCRIPT_PATTERN)?.[1] ?? DEFAULT_CHALLENGE_SCRIPT_PATH };
}

export async function isEdgeChallengeResponse(res) {
  return (await readEdgeChallenge(res)) !== null;
}

export function isEdgeBlockResponse(res) {
  return (
    EDGE_BLOCK_STATUSES.includes(res.status) && !contentTypeOf(res).includes('application/json')
  );
}

function isSameOrigin(url) {
  try {
    return new URL(url, window.location.href).origin === window.location.origin;
  } catch (e) {
    return false;
  }
}

// The docs list the challenge states (started, processing, captcha_prompted, complete,
// error) but not the attribute that carries them, so match on the value.
const WATCHED_STATES = ['complete', 'error', 'captcha_prompted'];

function challengeStatus(container) {
  return container
    .getAttributeNames()
    .map((name) => container.getAttribute(name))
    .find((value) => WATCHED_STATES.includes(value));
}

let pendingChallenge = null;

/**
 * Embeds a Fastly challenge in the page and resolves once it has been solved.
 * @param {string} [scriptPath] the challenge script named by the interstitial
 * @returns {Promise<void>}
 */
export function solveEdgeChallenge(scriptPath = DEFAULT_CHALLENGE_SCRIPT_PATH) {
  if (pendingChallenge) {
    return pendingChallenge;
  }

  pendingChallenge = new Promise((resolve, reject) => {
    const container = document.createElement('div');
    container.className = 'fastly-challenge';
    // Sit above the Portal popup so an interactive challenge (CAPTCHA) is visible
    Object.assign(container.style, {
      position: 'fixed',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      zIndex: '4000000',
    });

    // A fresh script element each time so the challenge script picks up the new container
    const script = document.createElement('script');
    script.src = scriptPath;

    const startedAt = Date.now();
    let observer = null;
    let timer = null;
    let interactive = false;
    const finish = (error) => {
      observer?.disconnect();
      clearTimeout(timer);
      container.remove();
      script.remove();
      pendingChallenge = null;
      if (error) {
        reject(error);
      } else {
        resolve();
      }
    };

    observer = new MutationObserver(() => {
      const status = challengeStatus(container);
      if (status === 'complete') {
        finish();
      } else if (status === 'error') {
        finish(new EdgeChallengeError());
      } else if (status === 'captcha_prompted' && !interactive) {
        interactive = true;
        clearTimeout(timer);
        timer = setTimeout(
          () => finish(new EdgeChallengeError()),
          INTERACTIVE_CHALLENGE_TIMEOUT_MS - (Date.now() - startedAt),
        );
      }
    });
    observer.observe(container, { attributes: true });
    timer = setTimeout(() => finish(new EdgeChallengeError()), CHALLENGE_TIMEOUT_MS);
    script.addEventListener('error', () => finish(new EdgeChallengeError()));

    document.body.appendChild(container);
    document.head.appendChild(script);
  });

  return pendingChallenge;
}

/**
 * fetch() for members API endpoints that NGWAF may challenge. Solves a challenge and retries
 * once; throws EdgeChallengeError when the request is blocked or still challenged. A plain
 * fetch() unless the waf_challenge flag is set.
 * @param {string} url
 * @param {RequestInit} [options]
 * @returns {Promise<Response>}
 */
export async function fetchWithEdgeChallenge(url, options) {
  if (!isEdgeChallengeEnabled()) {
    return fetch(url, options);
  }

  const res = await fetch(url, options);
  if (isEdgeBlockResponse(res)) {
    throw new EdgeChallengeError();
  }
  const challenge = await readEdgeChallenge(res);
  if (!challenge) {
    return res;
  }

  // The challenge cookie is set on the page's origin, so solving it can't help a request
  // to another site (e.g. subscribing to a recommendation)
  if (!isSameOrigin(url)) {
    throw new EdgeChallengeError();
  }

  await solveEdgeChallenge(challenge.scriptPath);

  const retry = await fetch(url, options);
  if (isEdgeBlockResponse(retry) || (await isEdgeChallengeResponse(retry))) {
    throw new EdgeChallengeError();
  }
  return retry;
}
