import { HumanReadableError } from './errors';
import { t } from './i18n';

// Fastly Next-Gen WAF can answer a members API request with a client challenge (HTML
// page) or a block instead of the API response. A fetch() can't solve a
// HTML response, so when one comes back we embed the challenge in a frame, wait for the
// visitor's browser to solve it (which sets the challenge cookie) and retry the request once.
// https://www.fastly.com/documentation/guides/security/bot-management/client-challenges/embedding-challenges-in-pages
const CHALLENGE_PATH_PREFIX = '/_fs-ch-';
// The interstitial loads script.js rather than challenge.js, but its assets share a directory
// with challenge.js, so read that from the page and fall back to the documented one
const CHALLENGE_DIRECTORY_PATTERN = /\/_fs-ch-[\w-]+\//;
const DEFAULT_CHALLENGE_DIRECTORY = '/_fs-ch-1T1wmsGaOgGaSxcX/';
const CHALLENGE_SCRIPT_NAME = 'challenge.js';
// challenge.js reports progress here: started, processing, captcha_prompted, complete, error
const CHALLENGE_STATUS_ATTRIBUTE = 'data-challenge-status';
const CHALLENGE_TIMEOUT_MS = 60 * 1000;
// A visitor solving a CAPTCHA gets longer, but the retried request carries an integrity token
// fetched before the challenge, which Ghost only accepts for 5 minutes
const INTERACTIVE_CHALLENGE_TIMEOUT_MS = 4 * 60 * 1000;

// 406/449 are NGWAF block status
const EDGE_BLOCK_STATUSES = [406, 449];

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
// when it loads the challenge assets. Returns the path to challenge.js, or null.
async function challengeScriptPathOf(res) {
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
  const directory = body.match(CHALLENGE_DIRECTORY_PATTERN)?.[0] || DEFAULT_CHALLENGE_DIRECTORY;
  return `${directory}${CHALLENGE_SCRIPT_NAME}`;
}

export async function isEdgeChallengeResponse(res) {
  return (await challengeScriptPathOf(res)) !== null;
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

// Only dynamic challenges can be embedded, and they normally solve without showing anything,
// so the frame stays hidden. Fastly can still escalate to a CAPTCHA when it judges the traffic
// suspicious, in which case the frame covers the page, above the Portal popup.
// https://www.fastly.com/documentation/guides/security/bot-management/client-challenges/about-client-challenges/
const HIDDEN_FRAME_STYLE = {
  position: 'fixed',
  top: '0',
  left: '0',
  width: '0',
  height: '0',
  border: '0',
  zIndex: '4000000',
};
const INTERACTIVE_FRAME_STYLE = {
  width: '100%',
  height: '100%',
  background: 'rgba(0, 0, 0, 0.4)',
};
const FRAME_DOCUMENT_STYLE =
  'html,body{margin:0;height:100%;background:transparent}' +
  'body{display:flex;align-items:center;justify-content:center}' +
  '.fastly-challenge-close{position:fixed;top:16px;right:16px;width:40px;height:40px;' +
  'border:0;border-radius:50%;background:#fff;color:#15212a;font:24px/1 sans-serif;cursor:pointer}';

let pendingChallenge = null;

/**
 * Solves a Fastly challenge and resolves once the challenge cookie has been set. Rejects with
 * EdgeChallengeError if it fails, times out or the visitor closes a CAPTCHA.
 *
 * challenge.js defines a non-configurable global `init`, so it can only run once per document:
 * loading it into the page a second time (e.g. once the challenge cookie has expired) throws.
 * Each challenge therefore runs in its own same-origin frame, which also keeps the script's
 * globals out of the site's theme code. The frame shares the site's cookies.
 *
 * challenge.js resolves URLs against the frame's own location, so the frame has to load a real
 * page on the site rather than stay on about:blank; it loads the challenge script itself, which
 * is fetched anyway and always exists where a challenge is served.
 * @param {string} [scriptPath] path to challenge.js on this site
 * @returns {Promise<void>}
 */
export function solveEdgeChallenge(
  scriptPath = `${DEFAULT_CHALLENGE_DIRECTORY}${CHALLENGE_SCRIPT_NAME}`,
) {
  if (pendingChallenge) {
    return pendingChallenge;
  }

  pendingChallenge = new Promise((resolve, reject) => {
    const scriptUrl = new URL(scriptPath, window.location.origin).href;
    const frame = document.createElement('iframe');
    frame.setAttribute('aria-hidden', 'true');
    frame.setAttribute('tabindex', '-1');
    Object.assign(frame.style, HIDDEN_FRAME_STYLE);
    frame.src = scriptUrl;

    const startedAt = Date.now();
    let observer = null;
    let timer = null;
    let interactive = false;
    const cancelOnEscape = (event) => {
      if (event.key === 'Escape') {
        finish(new EdgeChallengeError());
      }
    };
    const finish = (error) => {
      observer?.disconnect();
      clearTimeout(timer);
      document.removeEventListener('keydown', cancelOnEscape);
      frame.remove();
      pendingChallenge = null;
      if (error) {
        reject(error);
      } else {
        resolve();
      }
    };

    // The CAPTCHA covers the page, so give the visitor a way back out of it
    const showCaptcha = (frameDocument) => {
      const close = frameDocument.createElement('button');
      close.type = 'button';
      close.className = 'fastly-challenge-close';
      close.textContent = '\u00d7';
      close.setAttribute('aria-label', t('Close'));
      close.addEventListener('click', () => finish(new EdgeChallengeError()));
      frameDocument.body.appendChild(close);
      // Focus is inside the frame while the visitor solves the CAPTCHA, so listen in both
      frameDocument.addEventListener('keydown', cancelOnEscape);
      document.addEventListener('keydown', cancelOnEscape);

      Object.assign(frame.style, INTERACTIVE_FRAME_STYLE);
      frame.title = t('Security verification');
      frame.removeAttribute('aria-hidden');
      frame.removeAttribute('tabindex');
      frame.focus();
    };

    const embedChallenge = () => {
      // null when the frame failed to load and is showing the browser's error page
      const frameDocument = frame.contentDocument;
      if (!frameDocument?.head || !frameDocument.body) {
        finish(new EdgeChallengeError());
        return;
      }

      // The browser shows the challenge script it loaded as plain text, which would sit behind
      // a CAPTCHA, so start from an empty document
      frameDocument.head.replaceChildren();
      frameDocument.body.replaceChildren();

      const style = frameDocument.createElement('style');
      style.textContent = FRAME_DOCUMENT_STYLE;
      frameDocument.head.appendChild(style);

      const container = frameDocument.createElement('div');
      container.className = 'fastly-challenge';
      frameDocument.body.appendChild(container);

      observer = new MutationObserver(() => {
        const status = container.getAttribute(CHALLENGE_STATUS_ATTRIBUTE);
        if (status === 'complete') {
          finish();
        } else if (status === 'error') {
          finish(new EdgeChallengeError());
        } else if (status === 'captcha_prompted' && !interactive) {
          interactive = true;
          showCaptcha(frameDocument);
          clearTimeout(timer);
          timer = setTimeout(
            () => finish(new EdgeChallengeError()),
            INTERACTIVE_CHALLENGE_TIMEOUT_MS - (Date.now() - startedAt),
          );
        }
      });
      observer.observe(container, {
        attributes: true,
        attributeFilter: [CHALLENGE_STATUS_ATTRIBUTE],
      });

      const script = frameDocument.createElement('script');
      script.src = scriptUrl;
      script.addEventListener('error', () => finish(new EdgeChallengeError()));
      frameDocument.head.appendChild(script);
    };

    const onFrameLoad = () => {
      // Some browsers fire load for the initial about:blank document before navigating to src
      if (frame.contentDocument?.URL === 'about:blank') {
        return;
      }
      frame.removeEventListener('load', onFrameLoad);
      embedChallenge();
    };

    // Covers the frame failing to load as well as a challenge that never finishes
    timer = setTimeout(() => finish(new EdgeChallengeError()), CHALLENGE_TIMEOUT_MS);
    frame.addEventListener('load', onFrameLoad);
    document.body.appendChild(frame);
  });

  return pendingChallenge;
}

/**
 * fetch() for members API endpoints that NGWAF may challenge. Solves a challenge and retries
 * once; throws EdgeChallengeError when the request is blocked or still challenged.
 * @param {string} url
 * @param {RequestInit} [options]
 * @returns {Promise<Response>}
 */
export async function fetchWithEdgeChallenge(url, options) {
  const res = await fetch(url, options);
  if (isEdgeBlockResponse(res)) {
    throw new EdgeChallengeError();
  }
  const scriptPath = await challengeScriptPathOf(res);
  if (!scriptPath) {
    return res;
  }

  // The challenge cookie is set on the page's origin, so solving it can't help a request
  // to another site (e.g. subscribing to a recommendation)
  if (!isSameOrigin(url)) {
    throw new EdgeChallengeError();
  }

  await solveEdgeChallenge(scriptPath);

  const retry = await fetch(url, options);
  if (isEdgeBlockResponse(retry) || (await isEdgeChallengeResponse(retry))) {
    throw new EdgeChallengeError();
  }
  return retry;
}
