import type {
  AppInstallation,
  AppManifest,
} from '@tryghost/admin-x-framework/api/app-installations';
import {
  failFrameOrigin,
  fakeAdminEndpoint,
  fakeFrameOrigin,
  fakeOriginRequests,
} from '@test-utils/acceptance';

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

export const ICON_URL = 'https://podcast.example.com/icon.svg';
export const ICON_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M2 2h20v20H2z"></path></svg>';
/** The stored copy of `ICON_SVG`, as Admin draws it. */
export const STORED_ICON = `data:image/svg+xml,${encodeURIComponent(ICON_SVG)}`;

/** The `src` of every image in `container`. */
export const imageSources = (container: Element) =>
  [...container.querySelectorAll('img')].map((img) => img.getAttribute('src'));

export const installation = (overrides: Partial<AppInstallation> = {}): AppInstallation => ({
  id: 'installation-1',
  app_id: 'com.example.podcast',
  status: 'active',
  manifest_url: MANIFEST_URL,
  manifest: manifest(),
  icon_svg: null,
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
 * The app's page at its own URL: what its frame loads, and the answer to the probe Admin
 * sends there first. `delayMs` holds the page back, for an app that's slow to answer.
 *
 * TODO(BER-3983): the probe goes with the bridge handshake. Once it has, this is
 * `fakeFrameOrigin` alone, and `fakeOriginRequests` can go unless another spec needs it.
 */
export async function fakeAppFrame({
  html = '<h1>Podcast app</h1>',
  delayMs = 0,
}: { html?: string; delayMs?: number } = {}) {
  await fakeFrameOrigin(APP_PAGE_URL, html, delayMs);
  fakeOriginRequests(APP_PAGE_URL, { html });
}

/** An app whose server can't be reached: neither the frame nor the probe gets an answer. */
export async function failAppFrame() {
  await failFrameOrigin(APP_PAGE_URL);
  fakeOriginRequests(APP_PAGE_URL, { down: true });
}

/** The app's page as Admin opens it: the installation it reads, and the page it frames. */
export async function fakeAppPage(read: AppInstallation, html = '<h1>Podcast app</h1>') {
  const readApi = fakeAdminEndpoint('GET', readPath(read.id), () => ({
    app_installations: [read],
  }));
  await fakeAppFrame({ html });
  return readApi;
}
