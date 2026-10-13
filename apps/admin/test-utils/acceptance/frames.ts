import { commands } from 'vitest/browser';

import type { AppFrameFlags, AppFrameHooks } from './app-frame-stand-in';

declare module 'vitest/browser' {
  interface BrowserCommands {
    bundleFrameScript: (entry: string) => Promise<string>;
    callInFrame: (origin: string, hook: string, args: unknown[]) => Promise<unknown>;
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

/**
 * The script an app's page runs: the one place that names it. A stand-in for an app built
 * on the SDK, which speaks the bridge and exposes the hooks `callAppFrame` calls.
 */
const APP_FRAME_SCRIPT = 'test-utils/acceptance/app-frame-stand-in.ts';

/**
 * An app's page that speaks the bridge, for `fakeFrameOrigin`: `script`, by default the
 * stand-in, inlined into the page, with `flags` set for it to read first.
 */
export async function appFramePage(flags: AppFrameFlags = {}, script?: string): Promise<string> {
  const source = script ?? (await commands.bundleFrameScript(APP_FRAME_SCRIPT));
  return [
    '<!doctype html>',
    '<html><head><title>Podcast app</title>',
    `<script>window.__appFlags = ${JSON.stringify(flags)};</script>`,
    '</head><body><h1>Podcast app</h1>',
    // A closing tag inside the script would end it early.
    `<script type="module">${source.replaceAll('</script', '<\\/script')}</script>`,
    '</body></html>',
  ].join('');
}

/**
 * Calls one of the hooks of the app's page framed from `origin` (see
 * app-frame-stand-in.ts), as the app itself would act. The frame is another origin's, so
 * the call goes through the browser driver.
 */
export function callAppFrame<Hook extends keyof AppFrameHooks>(
  origin: string,
  hook: Hook,
  ...args: Parameters<AppFrameHooks[Hook]>
): Promise<Awaited<ReturnType<AppFrameHooks[Hook]>>> {
  return commands.callInFrame(new URL(origin).origin, hook, args) as Promise<
    Awaited<ReturnType<AppFrameHooks[Hook]>>
  >;
}

/** Answers unfaked external iframe navigations with a 418 so no spec reaches the network. */
export function guardFrameNavigations(): Promise<void> {
  return commands.guardFrameNavigations();
}

export function resetFakeFrameOrigins(): Promise<void> {
  return commands.resetFakeFrameOrigins();
}
