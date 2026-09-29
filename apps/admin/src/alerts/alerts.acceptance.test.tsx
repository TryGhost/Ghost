import { afterEach, describe, expect, it } from 'vitest';
import type { EmberNotificationsHost, StateBridge } from '@/ember-bridge';
import type { ServerNotification } from '@tryghost/admin-x-framework/api/notifications';
import { fakeAdminEndpoint, fakeTags, renderAdminApp } from '@test-utils/acceptance';
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

/** Stands in for Ember's state bridge and hands back the host React connects. */
function connectFakeEmber(): Promise<EmberNotificationsHost> {
  return new Promise((resolve) => {
    window.EmberBridge = {
      state: {
        onUpdate: () => {},
        onInvalidate: () => {},
        onDelete: () => {},
        isFeatureEnabled: () => false,
        on: () => {},
        off: () => {},
        sidebarVisible: true,
        getRouteUrl: (routeName) => routeName,
        isRouteActive: () => false,
        connectNotificationsHost: (host) => {
          resolve(host);
          return () => {};
        },
      } satisfies StateBridge,
    };
  });
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
    await expect.poll(() => alertsScreen.alerts().elements().length).toBe(2);
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
});

describe('Ember notifications', () => {
  it('renders Ember alerts and removes them by key', async () => {
    const connected = connectFakeEmber();
    await renderWithNotifications([]);
    const host = await connected;

    host.show({ status: 'alert', type: 'error', message: 'Saving failed', key: 'post.save' });
    host.show({ status: 'alert', type: 'error', message: '<b>Not markup</b>' });

    await expect.element(alertsScreen.alert('Saving failed')).toBeVisible();
    await expect.element(alertsScreen.alert('<b>Not markup</b>')).toBeVisible();

    host.remove('alert', 'post.save');

    await expect.element(alertsScreen.alert('Saving failed')).not.toBeInTheDocument();
    await expect.element(alertsScreen.alert('<b>Not markup</b>')).toBeVisible();
  });

  it('renders Ember toasts with their description and action links', async () => {
    const connected = connectFakeEmber();
    await renderWithNotifications([]);
    const host = await connected;

    host.show({
      status: 'notification',
      type: 'success',
      message: 'Post published',
      actions: { html: '<a href="https://example.com/post/" target="_blank">View on site</a>' },
    });

    const toast = alertsScreen.toast('Post published');
    await expect.element(toast).toBeVisible();
    await expect
      .element(toast.getByRole('link', { name: 'View on site' }))
      .toHaveAttribute('href', 'https://example.com/post/');

    host.clearAll();

    await expect.element(toast).not.toBeInTheDocument();
  });
});
