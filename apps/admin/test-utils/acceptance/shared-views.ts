import { settingsResponse } from '@tryghost/test-data';

import type { RenderAdminAppOptions } from './render-admin-app';

/**
 * The fake server's `shared_views` setting for the current test, which holds the saved member
 * views and posts views.
 *
 * A test starts with the `shared_views` value of its `browseSettings` boot response, or `[]`. A
 * `browseSettings` response given as a function isn't read. A `shared_views` saved through
 * `fakeEditSettings` replaces the value for the rest of the test: later `GET /settings/`
 * responses serve it, and so does the echo of a PUT that leaves it out, as Ghost's would.
 */

let declared: string | undefined;
let written: string | undefined;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** The `shared_views` value in a settings response body, or `undefined` when it has none. */
function sharedViewsIn(body: unknown): string | undefined {
  if (!isRecord(body) || !Array.isArray(body.settings)) {
    return undefined;
  }

  const settings: unknown[] = body.settings;
  const setting = settings.find((entry) => isRecord(entry) && entry.key === 'shared_views');
  return isRecord(setting) && typeof setting.value === 'string' ? setting.value : undefined;
}

/** Starts the test from the `shared_views` value in its `browseSettings` boot response. */
export function declareSharedViews(settingsBody: unknown): void {
  if (typeof settingsBody !== 'function') {
    declared = sharedViewsIn(settingsBody);
  }
}

/** The setting's current value. */
export function currentSharedViews(): string {
  return written ?? declared ?? sharedViewsIn(settingsResponse()) ?? '[]';
}

/** Replaces the setting's value for the rest of the test. */
export function writeSharedViews(value: string): void {
  written = value;
}

/** A settings response body with the setting's value as written in this test, if it was. */
export function withWrittenSharedViews(settingsBody: unknown): unknown {
  if (written === undefined || !isRecord(settingsBody) || !Array.isArray(settingsBody.settings)) {
    return settingsBody;
  }

  const value = written;
  const settings: unknown[] = settingsBody.settings;
  return {
    ...settingsBody,
    settings: settings.map((entry) =>
      isRecord(entry) && entry.key === 'shared_views' ? { ...entry, value } : entry,
    ),
  };
}

/** Called by the harness between tests, alongside the fake API reset. */
export function resetSharedViews(): void {
  declared = undefined;
  written = undefined;
}

/** A saved view in the `shared_views` setting's stored form. */
export interface StoredView {
  name: string;
  route: 'members' | 'posts' | 'pages';
  color?: string;
  filter: Record<string, string>;
}

/** Views saved before the test, through the `browseSettings` boot response. */
export function withSavedViews(...views: StoredView[]): RenderAdminAppOptions {
  return {
    boot: {
      browseSettings: {
        response: settingsResponse({ settings: { shared_views: JSON.stringify(views) } }),
      },
    },
  };
}
