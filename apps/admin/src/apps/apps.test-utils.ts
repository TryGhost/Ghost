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
  manifest_url: 'https://podcast.example.com/ghost-app.json',
  identity_key: { kty: 'OKP', crv: 'Ed25519', x: 'xQcVt_FXHEk7Uv4dKhUL2nR5DwwsLVW4pu2il-5sX_s' },
  backend_key: { kty: 'OKP', crv: 'Ed25519', x: 'H7aU67-okztSJD3-0znkVDiCU-izOI3I851CZX8XDyk' },
  development: false,
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
 * Fakes the app's page at its own URL, which its frame loads. By default the page is built on the
 * SDK (see `appFramePage`), and `flags` adjust its behaviour. `kind: 'raw'` gives a page that uses
 * the bridge without the SDK, for `callHostRaw`. `html` replaces the page entirely.
 */
export async function fakeAppFrame({
  html,
  flags,
  kind,
}: { html?: string; flags?: AppFrameFlags; kind?: AppFramePageKind } = {}) {
  await fakeFrameOrigin(APP_PAGE_URL, html ?? (await appFramePage(flags, kind)));
}

/** An app whose server can't be reached: its frame gets no response. */
export function failAppFrame() {
  return failFrameOrigin(APP_PAGE_URL);
}

const sessionsPath = (id: string) => `/apps/installations/${id}/sessions/`;

/**
 * Fakes starting a session of the installation `id`. Ghost responds with `answer`: either the
 * installation, whose revision the session is pinned to, or a `Response` such as an error. `set`
 * changes the response for later sessions.
 */
export function fakeSessionStart(id: string, answer: AppInstallation | Response) {
  let next = answer;
  const capture = fakeAdminEndpoint('POST', sessionsPath(id), () =>
    // A body can only be read once, so each request gets its own copy of a `Response`.
    next instanceof Response ? next.clone() : { app_sessions: [{ installation: next }] },
  );
  return Object.assign(capture, {
    set: (nextAnswer: AppInstallation | Response) => {
      next = nextAnswer;
    },
  });
}

/**
 * Fakes the app's page as Admin opens it: the session it starts, the installation it reads to
 * detect when the session ends, and the page it frames (options as for `fakeAppFrame`). `set`
 * changes the installation for later sessions and reads.
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
