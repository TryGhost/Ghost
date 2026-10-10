import { describe, expect, it } from 'vitest';
import type { ServerNotification } from '@tryghost/admin-x-framework/api/notifications';
import {
  currentUserResponse,
  fakeAdminEndpoint,
  fakePosts,
  fakePostsListScreen,
  fakeTags,
  renderAdminApp,
  staffRole,
} from '@test-utils/acceptance';
import { sidebarScreen } from '@/layout/sidebar.screen';
import { tagsScreen } from '@/tags/tags.screen';
import { alertsScreen } from './alerts.screen';

function serverNotification(overrides: Partial<ServerNotification>): ServerNotification {
  return {
    id: 'notification-id',
    type: 'info',
    status: 'alert',
    message: 'Notice',
    custom: true,
    dismissible: true,
    location: 'bottom',
    ...overrides,
  };
}

async function renderWithNotifications(notifications: ServerNotification[]) {
  fakeTags([]);
  await renderAdminApp('/tags', {
    boot: { browseNotifications: { response: { notifications } } },
  });
}

const upgradeRequiredText =
  'Ghost has been upgraded, please copy any unsaved data and refresh the page to continue.';

const versionMismatchBody = {
  errors: [
    { type: 'VersionMismatchError', message: 'Client request for v5 does not match server v6' },
  ],
};

/** Holds the tags request until `respond()`, then answers with a version mismatch. */
function fakeTagsVersionMismatchOnCue() {
  let respond!: () => void;
  const cue = new Promise<void>((resolve) => {
    respond = resolve;
  });
  fakeAdminEndpoint('GET', /^\/tags\//, async () => {
    await cue;
    return Response.json(versionMismatchBody, { status: 400 });
  });
  return { respond };
}

describe('Server notifications', () => {
  it('shows custom notices as alerts with their markup', async () => {
    await renderWithNotifications([
      serverNotification({
        id: 'security',
        type: 'warn',
        message: 'A security update is available. <a href="https://ghost.org/">Learn more</a>',
      }),
    ]);

    await expect
      .element(alertsScreen.alert(/security update is available/))
      .toHaveTextContent('A security update is available. Learn more');
    await expect
      .element(alertsScreen.alert(/security update/).getByRole('link', { name: 'Learn more' }))
      .toHaveAttribute('href', 'https://ghost.org/');
  });

  it('shows only the last custom notice per location and skips the rest', async () => {
    await renderWithNotifications([
      serverNotification({ id: 'older', message: 'Older notice' }),
      serverNotification({ id: 'newer', message: 'Newer notice' }),
      serverNotification({ id: 'top', message: 'Top notice', location: 'top' }),
      serverNotification({ id: 'upgrade', message: 'Upgrade notice', custom: false }),
    ]);

    await expect.element(alertsScreen.alert('Newer notice')).toBeVisible();
    await expect.element(alertsScreen.alert('Top notice')).toBeVisible();
    await expect(alertsScreen.alerts()).toHaveCount(2);
  });

  it('deletes a notice when it is closed, marking it seen', async () => {
    const deleteApi = fakeAdminEndpoint('DELETE', '/notifications/security/', null);
    await renderWithNotifications([
      serverNotification({ id: 'security', message: 'Security notice' }),
    ]);

    await alertsScreen.closeButton('Security notice').click();

    await expect.element(alertsScreen.alert('Security notice')).not.toBeInTheDocument();
    await expect.poll(() => deleteApi.requests.length).toBe(1);
  });

  it('never loads notices for authors', async () => {
    const notificationsApi = fakeAdminEndpoint('GET', '/notifications/', {
      notifications: [serverNotification({ message: 'Security notice' })],
    });
    const me = currentUserResponse();
    me.users[0].roles = [staffRole({ name: 'Author' })];
    fakePostsListScreen();
    fakePosts([]);
    await renderAdminApp('/posts', { boot: { browseMe: { response: me } } });

    // The sidebar waits for the current user, whose role gates the request.
    await expect.element(sidebarScreen.shellNav()).toBeVisible();
    await expect(alertsScreen.alerts()).toHaveCount(0);
    expect(notificationsApi.requests).toHaveLength(0);
  });
});

describe('Upgrade status alerts', () => {
  it('shows the upgrade alert once per page load when React requests reach an upgraded Ghost', async () => {
    const tagsApi = fakeTagsVersionMismatchOnCue();
    await renderAdminApp('/tags', {
      boot: { browseNotifications: { response: versionMismatchBody, responseStatus: 400 } },
    });

    await expect.element(alertsScreen.alert(upgradeRequiredText)).toBeVisible();
    await alertsScreen.closeButton(upgradeRequiredText).click();
    await expect.element(alertsScreen.alert(upgradeRequiredText)).not.toBeInTheDocument();

    tagsApi.respond();

    await expect.element(tagsScreen.errorHeading()).toBeVisible();
    await expect(alertsScreen.alerts()).toHaveCount(0);
  });
});
