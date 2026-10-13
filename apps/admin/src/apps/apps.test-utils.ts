import type {
  AppInstallation,
  AppManifest,
} from '@tryghost/admin-x-framework/api/app-installations';
import {
  type AppFrameFlags,
  type AppFramePageKind,
  appFramePage,
  failFrameOrigin,
  fakeAdminEndpoint,
  fakeFrameOrigin,
} from '@test-utils/acceptance';

export const MANIFEST_URL = 'https://podcast.example.com/ghost-app.json';
export const APP_PAGE_URL = 'https://podcast.example.com/admin';
export const APP_ORIGIN = 'https://podcast.example.com';
export const labs = { apps: true };

export const manifest = (overrides: Partial<AppManifest> = {}): AppManifest => ({
  id: 'com.example.podcast',
  name: 'Podcast',
  description: 'Publish episodes and embed players.',
  author: { name: 'Example Audio', url: 'https://example.com/' },
  accent_color: '#ff5500',
  icon: { name: 'audio-lines' },
  surfaces: [{ type: 'admin_page', url: 'https://podcast.example.com/admin' }],
  ...overrides,
});

export const installation = (overrides: Partial<AppInstallation> = {}): AppInstallation => ({
  id: 'installation-1',
  app_id: 'com.example.podcast',
  status: 'active',
  revision: 0,
  manifest_url: MANIFEST_URL,
  manifest: manifest(),
  created_at: '2026-10-01T10:00:00.000Z',
  updated_at: '2026-10-01T10:00:00.000Z',
  ...overrides,
});

export function fakeInstallations(initial: AppInstallation[] = []) {
  let installed = initial;
  fakeAdminEndpoint('GET', '/apps/installations/', () => ({ app_installations: installed }));
  return {
    set: (next: AppInstallation[]) => {
      installed = next;
    },
  };
}

export const readPath = (id: string) => new RegExp(`^/apps/installations/${id}/(\\?|$)`);

/**
 * The app's page at its own URL, which its frame loads: by default one built on the SDK
 * (see `appFramePage`), with `flags` to tune it. `kind: 'raw'` is one that speaks the
 * bridge without the SDK, for `callHostRaw`; `html` replaces the page.
 */
export async function fakeAppFrame({
  html,
  flags,
  kind,
}: { html?: string; flags?: AppFrameFlags; kind?: AppFramePageKind } = {}) {
  await fakeFrameOrigin(APP_PAGE_URL, html ?? (await appFramePage(flags, kind)));
}

/** An app whose server can't be reached: its frame gets no answer. */
export function failAppFrame() {
  return failFrameOrigin(APP_PAGE_URL);
}

/** Starting a session of one installation, which opening its page does. */
export const sessionsPath = (id: string) => `/apps/installations/${id}/sessions/`;

/**
 * Starting a session of the installation `id`, answered with `answer`: the installation as
 * Ghost found it, pinning its revision, or a `Response` such as an error. `set` changes the
 * answer for the sessions that follow.
 */
export function fakeSessionStart(id: string, answer: AppInstallation | Response) {
  let next = answer;
  const capture = fakeAdminEndpoint('POST', sessionsPath(id), () =>
    next instanceof Response
      ? next
      : {
          app_sessions: [
            { revision: next.revision, started_at: '2026-10-13T10:00:00.000Z', installation: next },
          ],
        },
  );
  return Object.assign(capture, {
    set: (nextAnswer: AppInstallation | Response) => {
      next = nextAnswer;
    },
  });
}

/**
 * The app's page as Admin opens it: the session it starts, the installation it reads to
 * tell when the session ends, and the page it frames, which by default is built on the SDK
 * (see `appFramePage`). `kind: 'raw'` frames one that speaks the bridge without the SDK,
 * for `callHostRaw`; `html` replaces the page; `flags` tune the SDK's. `set` moves the
 * installation on, for the sessions and reads that follow.
 */
export async function fakeAppPage(
  read: AppInstallation,
  { html, flags, kind }: { html?: string; flags?: AppFrameFlags; kind?: AppFramePageKind } = {},
) {
  let current = read;
  const sessionsApi = fakeSessionStart(read.id, read);
  const readApi = fakeAdminEndpoint('GET', readPath(read.id), () => ({
    app_installations: [current],
  }));
  await fakeAppFrame({ html, flags, kind });
  return {
    sessionsApi,
    readApi,
    set: (next: AppInstallation) => {
      current = next;
      sessionsApi.set(next);
    },
  };
}
