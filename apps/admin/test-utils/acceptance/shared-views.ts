import { HttpResponse } from 'msw';
import { settingsResponse } from '@tryghost/test-data';

import type { BootOverrides } from './boot';
import type { RenderAdminAppOptions } from './render-admin-app';
import { registerAdminApiHandler, registerRoute } from './worker';

/**
 * The fake server's `shared_views` setting for the current test.
 *
 * Ghost keeps the saved member views and posts views in this one setting and serves it through
 * two APIs: `/settings/` returns the whole setting, and `/segments/` lists and changes the member
 * views in it. Admin uses both in one session, so the fake keeps one copy of the setting that both
 * serve, as Ghost does.
 *
 * A test starts with the `shared_views` value of its `browseSettings` boot response, or `[]`.
 * A `browseSettings` response given as a function isn't read, so its views reach `/settings/` but
 * not `/segments/`. Each write through either API replaces the value for the rest of the test, and
 * `GET /settings/` then serves the replacement.
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

interface StoredMemberView {
  name: string;
  route: 'members';
  filter: { filter: string };
}

function isStoredMemberView(view: unknown): view is StoredMemberView {
  return (
    isRecord(view) &&
    view.route === 'members' &&
    typeof view.name === 'string' &&
    isRecord(view.filter) &&
    typeof view.filter.filter === 'string' &&
    view.filter.filter.length > 0
  );
}

/**
 * The stored views, or `undefined` when the value can't be read. Like Ghost, an empty value, `null`
 * and `{}` count as no views.
 */
function storedViews(): unknown[] | undefined {
  const value = currentSharedViews();
  if (value === '') {
    return [];
  }

  try {
    const parsed: unknown = JSON.parse(value);
    if (parsed === null || (isRecord(parsed) && Object.keys(parsed).length === 0)) {
      return [];
    }
    return Array.isArray(parsed) ? parsed : undefined;
  } catch {
    return undefined;
  }
}

interface Segment {
  id: string;
  name: string;
  filter: string;
}

/**
 * A segment's id, as Ghost derives it: the first 24 hex characters of the SHA-256 hash of the
 * filter. The second and later views that share a filter hash a 0xFF byte followed by
 * `JSON.stringify([filter, occurrence])` instead.
 */
async function segmentId(filter: string, occurrence: number): Promise<string> {
  const encoder = new TextEncoder();
  const hashed =
    occurrence === 1
      ? encoder.encode(filter)
      : new Uint8Array([0xff, ...encoder.encode(JSON.stringify([filter, occurrence]))]);
  const digest = await crypto.subtle.digest('SHA-256', hashed);
  const hex = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0'));
  return hex.join('').slice(0, 24);
}

/** The member views in `views` as segments, each with its view and the view's position. */
async function listSegments(
  views: unknown[],
): Promise<Array<{ segment: Segment; view: StoredMemberView; index: number }>> {
  const occurrences = new Map<string, number>();
  const listed: Array<{ segment: Segment; view: StoredMemberView; index: number }> = [];

  for (const [index, view] of views.entries()) {
    if (!isStoredMemberView(view)) {
      continue;
    }
    const occurrence = (occurrences.get(view.filter.filter) ?? 0) + 1;
    occurrences.set(view.filter.filter, occurrence);
    const id = await segmentId(view.filter.filter, occurrence);
    listed.push({ segment: { id, name: view.name, filter: view.filter.filter }, view, index });
  }

  return listed;
}

/** `GET /segments/`: the member views in the setting, in order. */
export async function segmentsResponse(): Promise<{ segments: Segment[] }> {
  const listed = await listSegments(storedViews() ?? []);
  return { segments: listed.map(({ segment }) => segment) };
}

/**
 * Holds `GET /segments/` until the returned function is called, then answers it from the fake
 * setting, as a slow server would. Call the function before the test ends.
 */
export function holdSegmentsList(): () => void {
  let release = () => {};
  const released = new Promise<void>((resolve) => {
    release = resolve;
  });

  registerRoute('GET', '/segments/ (held)');
  registerAdminApiHandler(async (request, apiPath) => {
    if (request.method !== 'GET' || apiPath !== '/segments/') {
      return undefined;
    }
    await released;
    return HttpResponse.json(await segmentsResponse());
  });

  return release;
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

/** Boot overrides for a server older than the segments API, which answers its list with 404. */
export const withoutSegmentsApi: BootOverrides = {
  browseSegments: {
    response: { errors: [{ type: 'NotFoundError', message: 'Resource not found' }] },
    responseStatus: 404,
  },
};

/**
 * The servers Admin reads member views from, for a spec that runs against both: one with the
 * segments API, and one older than it, where member views come from the settings alone.
 */
export const segmentsApiServers: ReadonlyArray<{ server: string; boot: BootOverrides }> = [
  { server: 'with the segments API', boot: {} },
  { server: 'without the segments API', boot: withoutSegmentsApi },
];
