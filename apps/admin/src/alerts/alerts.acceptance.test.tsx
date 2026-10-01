import { afterEach, describe, expect, it } from 'vitest';
import type { EmberNotificationsHost, StateBridge } from '@/ember-bridge';
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

/** Stands in for Ember's state bridge; resolves to the host that is still connected once React settles. */
async function renderWithEmber(notifications: ServerNotification[] = []) {
  let current: EmberNotificationsHost | undefined;
  window.EmberBridge = {
    state: {
      onUpdate: () => {},
      onInvalidate: () => {},
      onDelete: () => {},
      isFeatureEnabled: () => false,
      on: () => {},
      off: () => {},
      sidebarVisible: true,
      connectNotificationsHost: (host) => {
        current = host;
        return () => {
          if (current === host) {
            current = undefined;
          }
        };
      },
    } satisfies StateBridge,
  };

  await renderWithNotifications(notifications);
  await expect.poll(() => current).toBeDefined();
  return current!;
}

afterEach(() => {
  delete window.EmberBridge;
});

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

  it('clears a notice without deleting it when Ember clears all alerts', async () => {
    // Any DELETE would be served a 418 and fail the test.
    const host = await renderWithEmber([
      serverNotification({ id: 'security', message: 'Security notice' }),
    ]);
    await expect.element(alertsScreen.alert('Security notice')).toBeVisible();

    host.clearAll();

    await expect.element(alertsScreen.alert('Security notice')).not.toBeInTheDocument();
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

describe('Ember notifications', () => {
  it('renders Ember alerts and removes them by key', async () => {
    const host = await renderWithEmber();

    host.show({ status: 'alert', type: 'error', message: 'Saving failed', key: 'post.save' });
    host.show({ status: 'alert', type: 'error', message: '<b>Not markup</b>' });

    await expect.element(alertsScreen.alert('Saving failed')).toBeVisible();
    await expect.element(alertsScreen.alert('<b>Not markup</b>')).toBeVisible();

    host.remove('alert', 'post.save');

    await expect.element(alertsScreen.alert('Saving failed')).not.toBeInTheDocument();
    await expect.element(alertsScreen.alert('<b>Not markup</b>')).toBeVisible();
  });

  it('renders Ember toasts with their description and action links', async () => {
    const host = await renderWithEmber();

    host.show({
      status: 'notification',
      type: 'success',
      message: 'Post scheduled',
      description: { html: 'Will be published on <strong>1 Jan 2050</strong>' },
      actions: { html: '<a href="https://example.com/post/" target="_blank">Show preview</a>' },
    });

    const toast = alertsScreen.toast('Post scheduled');
    await expect.element(toast).toHaveTextContent('Will be published on 1 Jan 2050');
    await expect
      .element(toast.getByRole('link', { name: 'Show preview' }))
      .toHaveAttribute('href', 'https://example.com/post/');

    host.clearAll();

    await expect.element(toast).not.toBeInTheDocument();
  });
});
