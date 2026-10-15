import { HumanReadableError } from '../errors';
import { t } from '../i18n';
import { cloudflare } from './cloudflare';
import { fastly } from './fastly';

// A CDN or WAF in front of Ghost can answer a members API request with a bot challenge (HTML
// page) or a block instead of the API response. A fetch() can't solve a challenge, so we solve
// it in a frame and retry the request once.

const CHALLENGE_TIMEOUT_MS = 60 * 1000;
// A visitor solving a CAPTCHA gets longer, but the retried request carries an integrity token
// fetched before the challenge, which Ghost only accepts for 5 minutes
const INTERACTIVE_CHALLENGE_TIMEOUT_MS = 4 * 60 * 1000;

export const EDGE_CHALLENGE_FAILED_MESSAGE = 'Unable to verify your request, please try again';

export class EdgeChallengeError extends HumanReadableError {
  constructor() {
    super(EDGE_CHALLENGE_FAILED_MESSAGE, { code: 'EDGE_CHALLENGE_FAILED' });
  }
}

export interface ChallengeControls {
  complete(): void;
  fail(): void;
  // Call again for every new document the frame loads while interactive
  showInteractive(frameDocument: Document): void;
  readonly interactive: boolean;
}

export interface EdgeChallenge {
  // Challenge scripts resolve URLs against the frame's location, so it can't be about:blank
  frameUrl: string;
  // Runs for every document the frame loads, until the challenge finishes
  onFrameLoad(frameDocument: Document, controls: ChallengeControls): void;
  // Runs once when the challenge finishes
  dispose?(): void;
}

export interface EdgeProvider {
  isBlock(res: Response): boolean;
  challengeOf(res: Response, requestUrl: string): Promise<EdgeChallenge | null>;
}

const PROVIDERS: EdgeProvider[] = [fastly, cloudflare];

async function challengeOf(res: Response, requestUrl: string): Promise<EdgeChallenge | null> {
  for (const provider of PROVIDERS) {
    const challenge = await provider.challengeOf(res, requestUrl);
    if (challenge) {
      return challenge;
    }
  }
  return null;
}

export async function isEdgeChallengeResponse(res: Response, requestUrl = res.url) {
  return (await challengeOf(res, requestUrl)) !== null;
}

export function isEdgeBlockResponse(res: Response) {
  return PROVIDERS.some((provider) => provider.isBlock(res));
}

function isSameOrigin(url: string) {
  try {
    return new URL(url, window.location.href).origin === window.location.origin;
  } catch (e) {
    return false;
  }
}

// Hidden until the edge needs the visitor
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
const CLOSE_BUTTON_CLASS = 'edge-challenge-close';
const CLOSE_BUTTON_STYLE = {
  position: 'fixed',
  top: '16px',
  right: '16px',
  zIndex: '2147483647',
  width: '40px',
  height: '40px',
  border: '0',
  borderRadius: '50%',
  background: '#fff',
  boxShadow: '0 1px 4px rgba(0, 0, 0, 0.25)',
  color: '#15212a',
  font: '24px/1 sans-serif',
  cursor: 'pointer',
};

let pendingChallenge: Promise<void> | null = null;

/**
 * Solves an edge challenge in its own same-origin frame, which shares the site's cookies.
 * Rejects with EdgeChallengeError if it fails, times out or the visitor closes it.
 */
export function solveEdgeChallenge(challenge: EdgeChallenge): Promise<void> {
  if (pendingChallenge) {
    return pendingChallenge;
  }

  pendingChallenge = new Promise<void>((resolve, reject) => {
    const frame = document.createElement('iframe');
    frame.setAttribute('aria-hidden', 'true');
    frame.setAttribute('tabindex', '-1');
    Object.assign(frame.style, HIDDEN_FRAME_STYLE);
    frame.src = new URL(challenge.frameUrl, window.location.origin).href;

    const startedAt = Date.now();
    let timer: number | undefined;
    let interactive = false;
    let finished = false;
    const cancelOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        finish(new EdgeChallengeError());
      }
    };
    const finish = (error?: EdgeChallengeError) => {
      if (finished) {
        return;
      }
      finished = true;
      challenge.dispose?.();
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

    // The challenge covers the page, so give the visitor a way back out of it
    const addCloseButton = (frameDocument: Document) => {
      if (!frameDocument.body || frameDocument.querySelector(`.${CLOSE_BUTTON_CLASS}`)) {
        return;
      }
      const close = frameDocument.createElement('button');
      close.type = 'button';
      close.className = CLOSE_BUTTON_CLASS;
      close.textContent = '\u00d7';
      close.setAttribute('aria-label', t('Close'));
      Object.assign(close.style, CLOSE_BUTTON_STYLE);
      close.addEventListener('click', () => finish(new EdgeChallengeError()));
      frameDocument.body.appendChild(close);
      // Focus is inside the frame while the visitor solves the challenge, so listen in both
      frameDocument.addEventListener('keydown', cancelOnEscape);
    };

    const controls: ChallengeControls = {
      complete: () => finish(),
      fail: () => finish(new EdgeChallengeError()),
      showInteractive: (frameDocument) => {
        if (finished) {
          return;
        }
        addCloseButton(frameDocument);
        if (interactive) {
          return;
        }
        interactive = true;
        document.addEventListener('keydown', cancelOnEscape);
        Object.assign(frame.style, INTERACTIVE_FRAME_STYLE);
        frame.title = t('Security verification');
        frame.removeAttribute('aria-hidden');
        frame.removeAttribute('tabindex');
        frame.focus();
        clearTimeout(timer);
        timer = window.setTimeout(
          () => finish(new EdgeChallengeError()),
          INTERACTIVE_CHALLENGE_TIMEOUT_MS - (Date.now() - startedAt),
        );
      },
      get interactive() {
        return interactive;
      },
    };

    const onFrameLoad = () => {
      let frameDocument: Document | null = null;
      try {
        frameDocument = frame.contentDocument;
      } catch (e) {
        // the frame ended up on another origin
      }
      // Some browsers fire load for the initial about:blank document before navigating to src
      if (frameDocument?.URL === 'about:blank') {
        return;
      }
      // null when the frame failed to load and is showing the browser's error page
      if (!frameDocument) {
        finish(new EdgeChallengeError());
        return;
      }
      challenge.onFrameLoad(frameDocument, controls);
    };

    // Covers the frame failing to load as well as a challenge that never finishes
    timer = window.setTimeout(() => finish(new EdgeChallengeError()), CHALLENGE_TIMEOUT_MS);
    frame.addEventListener('load', onFrameLoad);
    document.body.appendChild(frame);
  });

  return pendingChallenge;
}

/**
 * fetch() for members API endpoints an edge may challenge. Solves a challenge and retries
 * once; throws EdgeChallengeError when the request is blocked or still challenged.
 */
export async function fetchWithEdgeChallenge(url: string, options?: RequestInit) {
  const res = await fetch(url, options);
  if (isEdgeBlockResponse(res)) {
    throw new EdgeChallengeError();
  }
  const challenge = await challengeOf(res, url);
  if (!challenge) {
    return res;
  }

  // Clearance cookies are set on the page's origin, so solving a challenge can't help a request
  // to another site (e.g. subscribing to a recommendation)
  if (!isSameOrigin(url)) {
    throw new EdgeChallengeError();
  }

  await solveEdgeChallenge(challenge);

  const retry = await fetch(url, options);
  if (isEdgeBlockResponse(retry) || (await isEdgeChallengeResponse(retry, url))) {
    throw new EdgeChallengeError();
  }
  return retry;
}
