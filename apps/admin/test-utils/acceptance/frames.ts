import { commands } from 'vitest/browser';

declare module 'vitest/browser' {
  interface BrowserCommands {
    fakeFrameOrigin: (origin: string, html: string) => Promise<void>;
    resetFakeFrameOrigins: () => Promise<void>;
  }
}

/**
 * Serves `html` to every iframe navigation to `origin`, standing in for an
 * external app a screen embeds — MSW cannot intercept frame navigations.
 * The stand-in can script the embedding protocol with `window.parent`.
 */
export function fakeFrameOrigin(origin: string, html: string): Promise<void> {
  return commands.fakeFrameOrigin(origin, html);
}

export function resetFakeFrameOrigins(): Promise<void> {
  return commands.resetFakeFrameOrigins();
}
