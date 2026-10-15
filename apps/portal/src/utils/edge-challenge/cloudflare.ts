import type { EdgeChallenge, EdgeProvider } from '.';

// Set on every challenge page (managed, JS, interactive)
// https://developers.cloudflare.com/cloudflare-challenges/challenge-types/challenge-pages/detect-response/
const MITIGATED_HEADER = 'cf-mitigated';
// Set by every challenge page's inline script
const CHALLENGE_PAGE_GLOBAL = '_cf_chl_opt';
// Block (1020) and rate limiting (1015) pages; Ghost's own 403s and 429s are JSON
const BLOCK_STATUSES = [403, 429];
// Cloudflare doesn't signal when a challenge needs the visitor, so show it unless it clears
// itself quickly
const REVEAL_DELAY_MS = 1500;

/**
 * Challenge pages can be framed by the same origin. The frame loads the challenged URL with a
 * GET and reloads into Ghost's response once solved.
 */
export function cloudflareChallenge(url: string): EdgeChallenge {
  let revealTimer: number | undefined;

  return {
    frameUrl: url,
    onFrameLoad(frameDocument, controls) {
      clearTimeout(revealTimer);
      const frameWindow = frameDocument.defaultView as (Window & Record<string, unknown>) | null;
      if (frameWindow?.[CHALLENGE_PAGE_GLOBAL] === undefined) {
        controls.complete();
        return;
      }
      // The challenge page has no background of its own
      frameDocument.documentElement.style.background = '#fff';
      // A failed or escalated challenge loads a new challenge page
      if (controls.interactive) {
        controls.showInteractive(frameDocument);
        return;
      }
      revealTimer = window.setTimeout(
        () => controls.showInteractive(frameDocument),
        REVEAL_DELAY_MS,
      );
    },
    dispose() {
      clearTimeout(revealTimer);
    },
  };
}

export const cloudflare: EdgeProvider = {
  isBlock(res) {
    return (
      BLOCK_STATUSES.includes(res.status) &&
      res.headers.has('cf-ray') &&
      !res.headers.has(MITIGATED_HEADER) &&
      !(res.headers.get('content-type') || '').toLowerCase().includes('application/json')
    );
  },
  async challengeOf(res, requestUrl) {
    return res.headers?.get(MITIGATED_HEADER) === 'challenge'
      ? cloudflareChallenge(requestUrl)
      : null;
  },
};
