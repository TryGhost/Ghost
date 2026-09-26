import { commands } from 'vitest/browser';

declare module 'vitest/browser' {
  interface BrowserCommands {
    fakeFrameOrigin: (origin: string, html: string) => Promise<void>;
    guardFrameNavigations: () => Promise<void>;
    resetFakeFrameOrigins: () => Promise<void>;
  }
}

/**
 * Serves `html` to every iframe navigation to `origin`, standing in for an
 * external app a screen embeds. The stand-in can script the embedding
 * protocol through `window.parent`.
 */
export function fakeFrameOrigin(origin: string, html: string): Promise<void> {
  return commands.fakeFrameOrigin(origin, html);
}

/** Answers unfaked external iframe navigations with a 418 so no spec reaches the network. */
export function guardFrameNavigations(): Promise<void> {
  return commands.guardFrameNavigations();
}

export function resetFakeFrameOrigins(): Promise<void> {
  return commands.resetFakeFrameOrigins();
}
