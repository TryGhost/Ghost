import { HumanReadableError } from './errors';

// Fastly Next-Gen WAF can answer a members API request with a client challenge (HTML
// page) or a block instead of the API response. A fetch() can't solve a
// HTML response, so when one comes back we embed the challenge in the page, wait for the
// visitor's browser to solve it (which sets the challenge cookie) and retry the request once.
// https://www.fastly.com/documentation/guides/security/bot-management/client-challenges/embedding-challenges-in-pages
const CHALLENGE_PATH_PREFIX = '/_fs-ch-';
const CHALLENGE_SCRIPT_PATH = '/_fs-ch-1T1wmsGaOgGaSxcX/challenge.js';
const CHALLENGE_TIMEOUT_MS = 60 * 1000;

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

// Error pages (503, maintenance, etc) are HTML too, so only treat a
// response as a challenge when it loads the challenge assets.
export async function isEdgeChallengeResponse(res) {
  if (!contentTypeOf(res).includes('text/html')) {
    return false;
  }
  try {
    const body = await res.clone().text();
    return body.includes(CHALLENGE_PATH_PREFIX);
  } catch (e) {
    return false;
  }
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
function challengeStatus(container) {
  return container
    .getAttributeNames()
    .map((name) => container.getAttribute(name))
    .find((value) => value === 'complete' || value === 'error');
}

let pendingChallenge = null;

/**
 * Embeds a Fastly challenge in the page and resolves once it has been solved.
 * @returns {Promise<void>}
 */
export function solveEdgeChallenge() {
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
    script.src = CHALLENGE_SCRIPT_PATH;
    script.defer = true;

    let observer = null;
    let timer = null;
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
  if (!(await isEdgeChallengeResponse(res))) {
    return res;
  }

  // The challenge cookie is set on the page's origin, so solving it can't help a request
  // to another site (e.g. subscribing to a recommendation)
  if (!isSameOrigin(url)) {
    throw new EdgeChallengeError();
  }

  await solveEdgeChallenge();

  const retry = await fetch(url, options);
  if (isEdgeBlockResponse(retry) || (await isEdgeChallengeResponse(retry))) {
    throw new EdgeChallengeError();
  }
  return retry;
}
