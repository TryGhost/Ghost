import { commands } from 'vitest/browser';

import type { RawAppFrameHooks } from './app-frame-raw';
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
 * The scripts an app's page runs: the one place that names them. `sdk` is an app built on
 * the SDK, the real one, exposing the hooks `callAppFrame` calls; `raw` speaks the bridge
 * without it, for `callHostRaw`.
 */
const APP_FRAME_SCRIPTS = {
  sdk: 'test-utils/acceptance/app-frame-stand-in.ts',
  raw: 'test-utils/acceptance/app-frame-raw.ts',
} as const;

export type AppFramePageKind = keyof typeof APP_FRAME_SCRIPTS;

/**
 * An app's page that speaks the bridge, for `fakeFrameOrigin`: by default the SDK's (see
 * app-frame-stand-in.ts), with `flags` set for it to read first; `raw` for one without the
 * SDK (see app-frame-raw.ts), which takes no flags.
 */
export async function appFramePage(
  flags: AppFrameFlags = {},
  kind: AppFramePageKind = 'sdk',
): Promise<string> {
  const source = await commands.bundleFrameScript(APP_FRAME_SCRIPTS[kind]);
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
 * Calls one of the hooks of the SDK's page framed from `origin` (see
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

/**
 * Calls Admin's export `name` with `args` as given, from the raw page framed from `origin`
 * (`appFramePage(flags, 'raw')`): what an app that skips the SDK could send.
 */
export function callHostRaw(
  origin: string,
  name: string,
  ...args: unknown[]
): ReturnType<RawAppFrameHooks['call']> {
  return commands.callInFrame(new URL(origin).origin, 'call', [name, args]) as ReturnType<
    RawAppFrameHooks['call']
  >;
}

/** Answers unfaked external iframe navigations with a 418 so no spec reaches the network. */
export function guardFrameNavigations(): Promise<void> {
  return commands.guardFrameNavigations();
}

export function resetFakeFrameOrigins(): Promise<void> {
  return commands.resetFakeFrameOrigins();
}
