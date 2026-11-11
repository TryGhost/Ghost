/**
 * The theme a request previews, when it isn't the active one.
 *
 * Ghost Admin's Design settings can preview any installed theme without
 * activating it. Everything that asks for the active theme during such a
 * request (templates, config, assets, rendering) gets the previewed theme
 * instead, and every other request keeps the active theme.
 */
import { AsyncLocalStorage } from 'async_hooks';

interface PreviewStore {
  /** A PreviewTheme (see preview-theme.ts) */
  theme: object;
  /** The preview's asset token, for the theme's asset URLs */
  token: string;
}

const storage = new AsyncLocalStorage<PreviewStore>();

/**
 * Runs `fn`, with everything it calls, previewing the theme
 *
 * @param theme - a PreviewTheme
 * @param token - the preview's asset token, for the theme's asset URLs
 */
export function run<R>(theme: object, token: string, fn: () => R): R {
  return storage.run({ theme, token }, fn);
}

/** The PreviewTheme of the current request, if any */
export function get(): object | undefined {
  return storage.getStore()?.theme;
}

/** The asset token of the current request's preview, if any */
export function getToken(): string | undefined {
  return storage.getStore()?.token;
}
