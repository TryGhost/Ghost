import { commands } from 'vitest/browser';

declare module 'vitest/browser' {
  interface BrowserCommands {
    fakeFrameOrigin: (origin: string, html: string, delayMs?: number) => Promise<void>;
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
export function fakeFrameOrigin(origin: string, html: string, delayMs = 0): Promise<void> {
  return commands.fakeFrameOrigin(origin, html, delayMs);
}

/** Answers unfaked external iframe navigations with a 418 so no spec reaches the network. */
export function guardFrameNavigations(): Promise<void> {
  return commands.guardFrameNavigations();
}

export function resetFakeFrameOrigins(): Promise<void> {
  return commands.resetFakeFrameOrigins();
}
