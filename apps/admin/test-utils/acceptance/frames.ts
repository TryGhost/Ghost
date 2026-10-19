import { commands } from 'vitest/browser';

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
 * frame that's slow to load. Only the frame's own navigations: a request the
 * page itself makes to that origin is the worker's business, as ever.
 */
export function fakeFrameOrigin(origin: string, html: string, delayMs = 0): Promise<void> {
  return commands.fakeFrameOrigin(origin, html, delayMs);
}

/** Refuses every iframe navigation to `origin`, standing in for an external app that is down. */
export function failFrameOrigin(origin: string): Promise<void> {
  return commands.failFrameOrigin(origin);
}

/** Answers unfaked external iframe navigations with a 418 so no spec reaches the network. */
export function guardFrameNavigations(): Promise<void> {
  return commands.guardFrameNavigations();
}

export function resetFakeFrameOrigins(): Promise<void> {
  return commands.resetFakeFrameOrigins();
}
