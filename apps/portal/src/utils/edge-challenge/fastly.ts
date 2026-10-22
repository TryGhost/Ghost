import type { EdgeChallenge, EdgeProvider } from '.';

// Fastly Next-Gen WAF client challenges. Only dynamic challenges can be embedded, but Fastly can
// still escalate to a CAPTCHA.
// https://www.fastly.com/documentation/guides/security/bot-management/client-challenges/embedding-challenges-in-pages
// https://www.fastly.com/documentation/guides/security/bot-management/client-challenges/about-client-challenges/
const CHALLENGE_PATH_PREFIX = '/_fs-ch-';
// The interstitial loads script.js rather than challenge.js, but its assets share a directory
// with challenge.js, so read that from the page and fall back to the documented one
const CHALLENGE_DIRECTORY_PATTERN = /\/_fs-ch-[\w-]+\//;
const DEFAULT_CHALLENGE_DIRECTORY = '/_fs-ch-1T1wmsGaOgGaSxcX/';
const CHALLENGE_SCRIPT_NAME = 'challenge.js';
// challenge.js reports progress here: started, processing, captcha_prompted, complete, error
const CHALLENGE_STATUS_ATTRIBUTE = 'data-challenge-status';

// 406/449 are NGWAF block status
const BLOCK_STATUSES = [406, 449];

const FRAME_DOCUMENT_STYLE =
  'html,body{margin:0;height:100%;background:transparent}' +
  'body{display:flex;align-items:center;justify-content:center}';

function contentTypeOf(res: Response) {
  return (res.headers?.get('content-type') || '').toLowerCase();
}

// Error pages (503, maintenance, etc) are HTML too, so only treat a response as a challenge
// when it loads the challenge assets. Returns the path to challenge.js, or null.
async function challengeScriptPathOf(res: Response) {
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

/**
 * challenge.js defines a non-configurable global `init`, so it can only run once per document
 * and each challenge needs its own frame.
 */
export function fastlyChallenge(
  scriptPath = `${DEFAULT_CHALLENGE_DIRECTORY}${CHALLENGE_SCRIPT_NAME}`,
): EdgeChallenge {
  const scriptUrl = new URL(scriptPath, window.location.origin).href;
  let observer: MutationObserver | null = null;

  return {
    frameUrl: scriptUrl,
    onFrameLoad(frameDocument, controls) {
      // challenge.js never navigates the frame
      if (observer) {
        return;
      }
      if (!frameDocument.head || !frameDocument.body) {
        controls.fail();
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
          controls.complete();
        } else if (status === 'error') {
          controls.fail();
        } else if (status === 'captcha_prompted') {
          controls.showInteractive(frameDocument);
        }
      });
      observer.observe(container, {
        attributes: true,
        attributeFilter: [CHALLENGE_STATUS_ATTRIBUTE],
      });

      const script = frameDocument.createElement('script');
      script.src = scriptUrl;
      script.addEventListener('error', () => controls.fail());
      frameDocument.head.appendChild(script);
    },
    dispose() {
      observer?.disconnect();
    },
  };
}

export const fastly: EdgeProvider = {
  isBlock(res) {
    return BLOCK_STATUSES.includes(res.status) && !contentTypeOf(res).includes('application/json');
  },
  async challengeOf(res) {
    const scriptPath = await challengeScriptPathOf(res);
    return scriptPath ? fastlyChallenge(scriptPath) : null;
  },
};
