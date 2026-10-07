import { beforeEach, describe, expect, it, onTestFinished } from 'vitest';
import { page } from 'vitest/browser';
import {
  currentRoute,
  currentUserResponse,
  fakeAdminEndpoint,
  fakeEndpoint,
  fakeFrameOrigin,
  fakeTags,
  fakeUsers,
  renderAdminApp,
  staffRole,
  staffUser,
} from '@test-utils/acceptance';
import { ADMINISTRATOR_FILTER, ADMINISTRATOR_LIMIT, OWNER_FILTER } from './lib/app-managers';
import { appsScreen } from './apps.screen';
import { globalSearchScreen } from '@/global-search/global-search.screen';
import { installApp, resetInstallationsCache } from './lib/installations';
import { resetPinsCache, setAppPinned } from './lib/pins';
import type { AppInstallation } from './types';

const APP_ORIGIN = 'https://calendar.example';
const MANIFEST_URL = `${APP_ORIGIN}/manifest.json`;
const INSTALL_ROUTE = `/apps/install?manifest=${encodeURIComponent(MANIFEST_URL)}`;

const manifest = {
  name: 'Content calendar',
  description: 'See every scheduled and published post on a calendar.',
  url: './',
  surfaces: ['page'],
};

// Stands in for the app: says it's ready, then tries a good API read, a path
// that climbs out of the API, and an operation the bridge doesn't support.
// Every reply it receives is reported back to the test.
const appStandIn = `<!doctype html><script>
  let n = 0;
  const send = (op, payload) => parent.postMessage({ source: 'ghost-app', id: String(++n), op, payload }, '*');
  addEventListener('message', (event) => {
    if (event.data && event.data.source === 'ghost-admin' && event.data.id) {
      parent.postMessage({ report: event.data }, '*');
    }
  });
  send('ready');
  send('api.get', { path: '/posts/?limit=1' });
  send('api.get', { path: '/../../settings/' });
  send('launch');
</script>`;

type Reply = { id: string; ok: boolean; result?: unknown; error?: string };

function appReplies(): Reply[] {
  const replies: Reply[] = [];
  const listener = (event: MessageEvent<{ report?: Reply } | null>) => {
    if (event.origin === APP_ORIGIN && event.data?.report) {
      replies.push(event.data.report);
    }
  };
  window.addEventListener('message', listener);
  onTestFinished(() => window.removeEventListener('message', listener));
  return replies;
}

// Stands in for an app that reports everything Admin sends it, and runs `steps`
// once Admin has answered `ready`.
const reportingApp = (steps = '') => `<!doctype html><script>
  let n = 0;
  const send = (op, payload) => parent.postMessage({ source: 'ghost-app', id: String(++n), op, payload }, '*');
  addEventListener('message', (event) => {
    if (event.data && event.data.source === 'ghost-admin') {
      parent.postMessage({ report: event.data }, '*');
      if (event.data.id === '1') { ${steps} }
    }
  });
  send('ready');
</script>`;

type Message = { id?: string; event?: string; data?: { route?: string }; ok?: boolean };

function adminMessages(): Message[] {
  const messages: Message[] = [];
  const listener = (event: MessageEvent<{ report?: Message } | null>) => {
    if (event.origin === APP_ORIGIN && event.data?.report) {
      messages.push(event.data.report);
    }
  };
  window.addEventListener('message', listener);
  onTestFinished(() => window.removeEventListener('message', listener));
  return messages;
}

const calendarManifest = {
  name: 'Content calendar',
  url: './',
  surfaces: ['page'],
  nav: [
    { label: 'Week', path: '/week' },
    { label: 'Upcoming', path: '/upcoming' },
  ],
};

const installCalendar = () =>
  installApp(MANIFEST_URL, {
    name: 'Content calendar',
    url: `${APP_ORIGIN}/`,
    surfaces: ['page'],
    nav: [
      { label: 'Week', path: '/week' },
      { label: 'Upcoming', path: '/upcoming' },
    ],
  });

// An installed app whose update asks for more access than was approved.
const installUpdatedCalendar = () => {
  const installation = installCalendar();
  const updated = {
    ...installation,
    permissions: [{ resource: 'post', actions: ['browse', 'read'] }],
    pendingPermissions: [
      { resource: 'post', actions: ['edit'] },
      { resource: 'member', actions: ['browse'] },
    ],
  };
  localStorage.setItem('ghost-admin:apps:installations', JSON.stringify([updated]));
  resetInstallationsCache();
  return updated;
};

describe('Apps', () => {
  beforeEach(() => {
    localStorage.removeItem('ghost-admin:apps:installations');
    localStorage.removeItem('ghost-admin:apps:pinned');
    resetInstallationsCache();
    resetPinsCache();
    // The sidebar re-fetches installed apps' manifests on load (BER-3990).
    fakeEndpoint('GET', MANIFEST_URL, calendarManifest);
    fakeEndpoint('GET', 'https://seo.example/manifest.json', {
      name: 'SEO checker',
      url: './',
      surfaces: ['page'],
    });
  });

  it('is hidden without the apps flag', async () => {
    await renderAdminApp('/apps');

    await expect.element(page.getByText('Page not found')).toBeVisible();
    await expect.element(appsScreen.navLink()).not.toBeInTheDocument();
  });

  it('leaves Apps out of the sidebar until an app is installed', async () => {
    fakeTags([]);

    await renderAdminApp('/tags', { labs: { apps: true } });

    await expect.element(page.getByTestId('admin-sidebar')).toBeVisible();
    await expect.element(appsScreen.navLink()).not.toBeInTheDocument();
  });

  it('installs an app from an install link and opens it', async () => {
    fakeEndpoint('GET', MANIFEST_URL, manifest);
    fakeAdminEndpoint('GET', /^\/posts\//, { posts: [{ id: 'p1', title: 'Hello' }] });
    await fakeFrameOrigin(APP_ORIGIN, appStandIn);
    const replies = appReplies();

    await renderAdminApp(INSTALL_ROUTE, { labs: { apps: true } });

    await expect.element(appsScreen.installDialog()).toHaveTextContent('Content calendar');
    await expect
      .element(appsScreen.installDialog().getByTestId('app-development-badge'))
      .not.toBeInTheDocument();
    await expect
      .element(page.getByTestId('app-install-source'))
      .toHaveTextContent('calendar.example');
    await expect
      .element(appsScreen.installDialog().getByTestId('app-surface'))
      .toHaveTextContent('A dedicated page in Admin');
    await expect
      .element(appsScreen.installDialog().getByTestId('app-permissions'))
      .toHaveTextContent('Posts and pages');
    await appsScreen.installButton().click();

    await expect.poll(currentRoute).toMatch(/^\/apps\/[\w-]+$/);
    await expect.element(appsScreen.frame()).toBeVisible();
    await expect.poll(() => replies.length).toBe(4);
    // A fresh install pins itself, so it stays in the sidebar outside Apps.
    await expect
      .element(
        page
          .getByTestId('admin-sidebar')
          .getByRole('button', { name: 'Unpin Content calendar from the sidebar' }),
      )
      .toHaveAttribute('aria-pressed', 'true');

    const byId = Object.fromEntries(replies.map((reply) => [reply.id, reply]));
    expect(byId['1'].ok).toBe(true);
    expect(byId['2']).toMatchObject({ ok: true, result: { posts: [{ id: 'p1' }] } });
    expect(byId['3'].ok).toBe(false);
    expect(byId['4']).toMatchObject({ ok: false, error: 'Unsupported operation: launch' });
  });

  it('explains an invalid manifest and installs nothing', async () => {
    fakeEndpoint('GET', MANIFEST_URL, { ...manifest, surfaces: ['card'], scopes: [] });

    await renderAdminApp(INSTALL_ROUTE, { labs: { apps: true } });

    await expect.element(appsScreen.installDialog()).toHaveTextContent('Can’t install this app');
    await expect.element(appsScreen.installDialog()).toHaveTextContent('Unknown field: scopes');
    await expect.element(appsScreen.installDialog()).toHaveTextContent('Unsupported surface: card');
    await appsScreen.okButton().click();

    await expect.poll(currentRoute).toBe('/apps');
    await expect.element(appsScreen.emptyState()).toBeVisible();
    await expect(appsScreen.rows()).toHaveCount(0);
  });

  it('tells staff who can’t install apps who can, and installs nothing', async () => {
    const owner = staffUser({
      name: 'Site Owner',
      email: 'owner@example.com',
      roles: [staffRole({ name: 'Owner' })],
    });
    const admins = [1, 2, 3, 4].map((n) =>
      staffUser({
        name: `Admin ${n}`,
        email: `admin${n}@example.com`,
        roles: [staffRole({ name: 'Administrator' })],
      }),
    );
    const usersApi = fakeUsers(({ filter }) => (filter === OWNER_FILTER ? [owner] : admins));
    const me = currentUserResponse();
    me.users[0].roles = [staffRole({ name: 'Contributor' })];

    await renderAdminApp(INSTALL_ROUTE, {
      labs: { apps: true },
      boot: { browseMe: { response: me } },
    });

    await expect.element(appsScreen.notAllowedDialog()).toBeVisible();
    await expect(appsScreen.managers()).toHaveCount(5);
    await expect.element(appsScreen.managers().first()).toHaveTextContent('Site Owner');
    await expect.element(appsScreen.managers().first()).toHaveTextContent('Owner');
    await expect.element(appsScreen.managers().last()).toHaveTextContent('admin4@example.com');
    const filters = usersApi.requests.map(({ filter }) => filter);
    expect(filters).toContain(OWNER_FILTER);
    expect(filters).toContain(ADMINISTRATOR_FILTER);
    expect(usersApi.requests.find(({ filter }) => filter === ADMINISTRATOR_FILTER)?.limit).toBe(
      ADMINISTRATOR_LIMIT,
    );
    await expect.element(appsScreen.installDialog()).not.toBeInTheDocument();
  });

  it('uninstalls an app from the Apps list', async () => {
    const { id } = installApp(MANIFEST_URL, {
      name: 'Content calendar',
      description: 'See every scheduled and published post on a calendar.',
      url: `${APP_ORIGIN}/`,
      surfaces: ['page'],
    });
    setAppPinned(id, true);

    await renderAdminApp('/apps', { labs: { apps: true } });

    await expect.element(appsScreen.navLink()).toBeVisible();
    await expect(appsScreen.rows()).toHaveCount(1);
    await expect
      .element(appsScreen.row('Content calendar').getByTestId('app-development-badge'))
      .toHaveTextContent('Dev');
    await expect.element(appsScreen.row('Content calendar')).toHaveTextContent('calendar.example');
    await expect
      .element(appsScreen.row('Content calendar'))
      .toHaveTextContent('See every scheduled and published post on a calendar.');

    await appsScreen.actionsButton('Content calendar').click();
    await appsScreen.uninstallMenuItem().click();
    await expect.element(appsScreen.uninstallDialog()).toBeVisible();
    await expect
      .element(page.getByTestId('uninstall-integration-key-note'))
      .toHaveTextContent('Settings › Integrations');
    await appsScreen.confirmUninstall().click();

    await expect.element(appsScreen.emptyState()).toBeVisible();
    await expect(appsScreen.rows()).toHaveCount(0);
    // Uninstalling unpins too, so the app doesn't hold one of the sidebar's slots.
    expect(JSON.parse(localStorage.getItem('ghost-admin:apps:pinned') ?? '[]')).toEqual([]);
  });

  it('lists installed apps in the sidebar, with the open app’s own pages', async () => {
    const { id } = installCalendar();
    await fakeFrameOrigin(APP_ORIGIN, reportingApp());
    const messages = adminMessages();

    await renderAdminApp(`/apps/${id}`, { labs: { apps: true } });

    await expect.element(page.getByRole('link', { name: 'Content calendar' })).toBeVisible();
    await expect.poll(() => messages.some((message) => message.id === '1')).toBe(true);

    await page.getByRole('link', { name: 'Week', exact: true }).click();

    await expect.poll(currentRoute).toBe(`/apps/${id}/week`);
    await expect
      .poll(() =>
        messages.some((message) => message.event === 'context' && message.data?.route === '/week'),
      )
      .toBe(true);
    // The frame stays put while the app's page changes.
    await expect(appsScreen.frame()).toHaveCount(1);
  });

  it('follows the app when it moves to one of its own pages', async () => {
    const { id } = installCalendar();
    await fakeFrameOrigin(APP_ORIGIN, reportingApp(`send('setRoute', { path: '/upcoming' });`));

    await renderAdminApp(`/apps/${id}`, { labs: { apps: true } });

    await expect.poll(currentRoute).toBe(`/apps/${id}/upcoming`);
    await expect
      .element(page.getByRole('link', { name: 'Upcoming', exact: true }))
      .toHaveAttribute('aria-current', 'page');
  });

  it('finds installed apps in global search', async () => {
    const { id } = installCalendar();
    for (const [key, list] of [
      ['posts', 'posts'],
      ['pages', 'pages'],
      ['tags', 'tags'],
      ['users', 'users'],
    ]) {
      fakeAdminEndpoint('GET', `/search-index/${key}/`, { [list]: [] });
    }

    await renderAdminApp('/apps', { labs: { apps: true, globalSearchReact: true } });
    await globalSearchScreen.openButton().click();
    await globalSearchScreen.search('calendar');

    await expect.element(globalSearchScreen.group('Apps')).toBeVisible();
    await globalSearchScreen.option('Content calendar').click();

    await expect.poll(currentRoute).toBe(`/apps/${id}`);
  });

  it('keeps only pinned apps in the sidebar outside Apps', async () => {
    const calendar = installCalendar();
    installApp('https://seo.example/manifest.json', {
      name: 'SEO checker',
      url: 'https://seo.example/',
      surfaces: ['page'],
    });
    setAppPinned(calendar.id, true);
    fakeTags([]);

    await renderAdminApp('/tags', { labs: { apps: true } });

    const sidebar = page.getByTestId('admin-sidebar');
    await expect.element(sidebar.getByRole('link', { name: 'Content calendar' })).toBeVisible();
    await expect
      .element(sidebar.getByRole('link', { name: 'SEO checker' }))
      .not.toBeInTheDocument();
  });

  it('keeps only pinned apps and the open one in the sidebar inside an app', async () => {
    const calendar = installCalendar();
    const seo = installApp('https://seo.example/manifest.json', {
      name: 'SEO checker',
      url: 'https://seo.example/',
      surfaces: ['page'],
    });
    installApp('https://links.example/manifest.json', {
      name: 'Link checker',
      url: 'https://links.example/',
      surfaces: ['page'],
    });
    fakeEndpoint('GET', 'https://links.example/manifest.json', {
      name: 'Link checker',
      url: './',
      surfaces: ['page'],
    });
    setAppPinned(calendar.id, true);

    await renderAdminApp(`/apps/${seo.id}`, { labs: { apps: true } });

    const sidebar = page.getByTestId('admin-sidebar');
    await expect.element(sidebar.getByRole('link', { name: 'Content calendar' })).toBeVisible();
    await expect.element(sidebar.getByRole('link', { name: 'SEO checker' })).toBeVisible();
    await expect
      .element(sidebar.getByRole('link', { name: 'Link checker' }))
      .not.toBeInTheDocument();
  });

  it('lists every app in Apps, pinned ones first, and pins from the sidebar', async () => {
    installCalendar();
    installApp('https://seo.example/manifest.json', {
      name: 'SEO checker',
      url: 'https://seo.example/',
      surfaces: ['page'],
    });

    await renderAdminApp('/apps', { labs: { apps: true } });

    const sidebar = page.getByTestId('admin-sidebar');
    const appLinks = () =>
      sidebar
        .getByRole('link')
        .elements()
        .map((link) => link.textContent?.trim())
        .filter((name) => name === 'Content calendar' || name === 'SEO checker');

    await expect.poll(appLinks).toEqual(['Content calendar', 'SEO checker']);

    await sidebar.getByRole('button', { name: 'Pin SEO checker to the sidebar' }).click();

    await expect.poll(appLinks).toEqual(['SEO checker', 'Content calendar']);
    await expect
      .element(sidebar.getByRole('button', { name: 'Unpin SEO checker from the sidebar' }))
      .toHaveAttribute('aria-pressed', 'true');
  });

  it('pins an app from its row on the Apps page', async () => {
    installCalendar();

    await renderAdminApp('/apps', { labs: { apps: true } });
    await appsScreen.actionsButton('Content calendar').click();
    await appsScreen.pinMenuItem().click();

    await expect
      .element(
        page.getByTestId('admin-sidebar').getByRole('button', {
          name: 'Unpin Content calendar from the sidebar',
        }),
      )
      .toHaveAttribute('aria-pressed', 'true');
  });

  it('picks up a changed manifest without reinstalling, like a new icon', async () => {
    const { id } = installApp(MANIFEST_URL, {
      name: 'Content calendar',
      url: `${APP_ORIGIN}/`,
      surfaces: ['page'],
    });
    setAppPinned(id, true);
    fakeEndpoint('GET', MANIFEST_URL, { ...calendarManifest, icon: 'calendar-days' });
    fakeTags([]);

    await renderAdminApp('/tags', { labs: { apps: true } });

    const sidebar = page.getByTestId('admin-sidebar');
    const appLink = sidebar.getByRole('link', { name: 'Content calendar' });
    await expect.element(appLink).toBeVisible();
    // The Apps grid icon is the fallback; once the manifest refreshes it's replaced.
    await expect.poll(() => appLink.element().querySelector('.lucide-layout-grid')).toBeNull();

    const iconBox = (link: Element) => {
      const svg = link.querySelector('svg')!;
      const icon = svg.getBoundingClientRect();
      const style = getComputedStyle(svg);
      return {
        width: icon.width,
        height: icon.height,
        left: Math.round(icon.left - link.getBoundingClientRect().left),
        stroke: style.strokeWidth,
        color: style.color,
      };
    };
    expect(iconBox(appLink.element())).toEqual(
      iconBox(sidebar.getByRole('link', { name: 'Tags' }).element()),
    );
  });

  it('asks to approve more access before an updated app opens from the list', async () => {
    installUpdatedCalendar();

    await renderAdminApp('/apps', { labs: { apps: true } });

    await expect
      .element(appsScreen.row('Content calendar').getByTestId('app-needs-approval-badge'))
      .toBeVisible();
    await appsScreen.reviewAccessButton().click();

    const dialog = appsScreen.updateDialog();
    await expect.element(dialog).toHaveTextContent('needs more access');
    await expect
      .element(dialog.getByTestId('app-permissions'))
      .toHaveTextContent(
        'View and edit all posts and pages, including drafts and scheduled ones · was view',
      );
    await expect
      .element(dialog.getByTestId('app-permissions'))
      .toHaveTextContent('View names, email addresses and subscription status');
    await expect.element(dialog.getByTestId('app-permissions')).toHaveTextContent('Members');
    await appsScreen.allowAccessButton().click();

    await expect.element(dialog).not.toBeInTheDocument();
    await expect
      .element(appsScreen.row('Content calendar').getByRole('link', { name: 'Open' }))
      .toBeVisible();
    const [stored] = JSON.parse(
      localStorage.getItem('ghost-admin:apps:installations') ?? '[]',
    ) as AppInstallation[];
    expect(stored.pendingPermissions).toBeUndefined();
  });

  it('shows the review instead of the app when an updated app is visited', async () => {
    const installation = installUpdatedCalendar();

    await renderAdminApp(`/apps/${installation.id}`, { labs: { apps: true } });

    await expect.element(appsScreen.updateDialog()).toBeVisible();
    await expect.element(appsScreen.frame()).not.toBeInTheDocument();
    await expect.element(page.getByTestId('nav-app-needs-approval')).toBeInTheDocument();
  });
});
