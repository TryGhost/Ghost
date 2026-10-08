import type {
  AppInstallation,
  AppManifest,
} from '@tryghost/admin-x-framework/api/app-installations';
import { fakeAdminEndpoint, fakeFrameOrigin } from '@test-utils/acceptance';

/** Shared by the apps acceptance specs. */
export const MANIFEST_URL = 'https://podcast.example.com/ghost-app.json';
export const APP_PAGE_URL = 'https://podcast.example.com/admin';
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
  manifest_url: MANIFEST_URL,
  manifest: manifest(),
  created_at: '2026-10-01T10:00:00.000Z',
  updated_at: '2026-10-01T10:00:00.000Z',
  ...overrides,
});

/** The site's installations, as the Apps screen lists them; `set` changes what comes next. */
export function fakeInstallations(initial: AppInstallation[] = []) {
  let installed = initial;
  fakeAdminEndpoint('GET', '/apps/installations/', () => ({ app_installations: installed }));
  return {
    set: (next: AppInstallation[]) => {
      installed = next;
    },
  };
}

/** Reading one installation, whatever it includes. */
export const readPath = (id: string) => new RegExp(`^/apps/installations/${id}/(\\?|$)`);

/** Re-checking one installation's manifest, which the app's page does when it opens. */
export const refreshPath = (id: string) => `/apps/installations/${id}/refresh/`;

/**
 * The app's page as Admin opens it: the refresh of its manifest, the installation it
 * reads, and the page it frames. `refreshed` is what the refresh answers, when it differs
 * from what was installed.
 */
export async function fakeAppPage(
  read: AppInstallation,
  {
    html = '<h1>Podcast app</h1>',
    refreshed = read,
  }: { html?: string; refreshed?: AppInstallation } = {},
) {
  let current = read;
  let next = refreshed;
  const refreshApi = fakeAdminEndpoint('POST', refreshPath(read.id), () => {
    current = next;
    return { app_installations: [next] };
  });
  const readApi = fakeAdminEndpoint('GET', readPath(read.id), () => ({
    app_installations: [current],
  }));
  await fakeFrameOrigin(APP_PAGE_URL, html);
  return {
    readApi,
    refreshApi: Object.assign(refreshApi, {
      /** What the next refresh answers, e.g. once changes have been approved. */
      set: (answer: AppInstallation) => {
        next = answer;
      },
    }),
  };
}
