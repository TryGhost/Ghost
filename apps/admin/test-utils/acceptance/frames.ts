import { commands } from 'vitest/browser';

import { fakeOriginRequests } from './worker';

declare module 'vitest/browser' {
  interface BrowserCommands {
    fakeFrameOrigin: (origin: string, html: string, delayMs?: number) => Promise<void>;
    failFrameOrigin: (origin: string) => Promise<void>;
    guardFrameNavigations: () => Promise<void>;
    resetFakeFrameOrigins: () => Promise<void>;
  }
}

/**
 * Serves `html` to every iframe navigation to `origin`, standing in for an
 * external app a screen embeds. The stand-in can script the embedding
 * protocol through `window.parent`. `delayMs` holds the answer back, for a
 * frame that's slow to load.
 */
export async function fakeFrameOrigin(origin: string, html: string, delayMs = 0): Promise<void> {
  await commands.fakeFrameOrigin(origin, html, delayMs);
  // The page's own requests there, such as the app page's probe, don't reach Playwright.
  fakeOriginRequests(origin, { html });
}

/** Refuses every connection to `origin`, standing in for an external app that is down. */
export async function failFrameOrigin(origin: string): Promise<void> {
  await commands.failFrameOrigin(origin);
  fakeOriginRequests(origin, { down: true });
}

/** Answers unfaked external iframe navigations with a 418 so no spec reaches the network. */
export function guardFrameNavigations(): Promise<void> {
  return commands.guardFrameNavigations();
}

export function resetFakeFrameOrigins(): Promise<void> {
  return commands.resetFakeFrameOrigins();
}
