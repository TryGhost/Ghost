import { beforeEach, describe, expect, it, onTestFinished } from 'vitest';
import { page } from 'vitest/browser';
import {
  allowUnhandledRequests,
  configResponse,
  currentRoute,
  emberScreenShown,
  fakeFrameOrigin,
  fakeIntegrations,
  fakeUsers,
  renderAdminApp,
  settingsResponse,
  staffRole,
  staffUser,
} from '@test-utils/acceptance';
import type { Integration } from '@tryghost/admin-x-framework/api/integrations';
import { sidebarScreen } from '@/layout/sidebar.screen';
import { migrateScreen } from './migrate.screen';

const MIGRATE_ORIGIN = 'https://migrate.ghost.org';
const flagOn = { labs: { iframeRoutesReact: true } };

// Stands in for the migration app: reports each load with its own id, echoes
// pings with that id, relays every other message back to Admin's window, then
// runs `script`.
function migrateStandIn(script = '') {
  return `<!doctype html><script>
    const loadId = Math.random().toString(36).slice(2);
    window.addEventListener('message', (event) => {
      if (event.data?.ping) {
        parent.postMessage({ pong: loadId }, '*');
        return;
      }
      parent.postMessage({ received: event.data }, '*');
    });
    parent.postMessage({ loaded: location.href, loadId }, '*');
    ${script}
  </script>`;
}

interface StandInMessage {
  loaded?: string;
  loadId?: string;
  pong?: string;
  received?: { request: string; response: Record<string, unknown> };
}

function standInMessages(): StandInMessage[] {
  const messages: StandInMessage[] = [];
  const listener = (event: MessageEvent<StandInMessage | null>) => {
    const data = event.data;
    if (
      event.origin === MIGRATE_ORIGIN &&
      data &&
      ('loaded' in data || 'pong' in data || 'received' in data)
    ) {
      messages.push(data);
    }
  };
  window.addEventListener('message', listener);
  onTestFinished(() => window.removeEventListener('message', listener));
  return messages;
}

function selfServeMigration(secret: string): Integration {
  const created = '2024-01-01T00:00:00.000Z';
  return {
    id: 'ssm-id',
    type: 'core',
    slug: 'self-serve-migration',
    name: 'Self-Serve Migration Integration',
    icon_image: null,
    description: null,
    created_at: created,
    updated_at: created,
    api_keys: [
      {
        id: 'ssm-key-id',
        type: 'admin',
        secret,
        role_id: 'role-id',
        integration_id: 'ssm-id',
        user_id: null,
        last_seen_at: null,
        last_seen_version: null,
        created_at: created,
        updated_at: created,
      },
    ],
  };
}

const siteOwner = () =>
  staffUser({ email: 'owner@example.com', roles: [staffRole({ name: 'Owner' })] });

const externalNavigation = (): unknown =>
  JSON.parse(document.body.dataset.externalNavigate ?? 'null');

describe('Migrate', () => {
  // The recorded handoff lives on the host page, which outlives a single test.
  beforeEach(() => {
    delete document.body.dataset.externalNavigate;
  });

  it.each([false, undefined])('leaves the page with Ember when the flag is %s', async (enabled) => {
    await renderAdminApp('/migrate/substack', {
      labs: enabled === undefined ? {} : { iframeRoutesReact: enabled },
    });

    await expect.poll(emberScreenShown).toBe(true);
    await expect.element(migrateScreen.frame()).not.toBeInTheDocument();
  });

  it('opens the migration app for the chosen platform', async () => {
    await fakeFrameOrigin(MIGRATE_ORIGIN, migrateStandIn());
    const messages = standInMessages();
    await renderAdminApp('/migrate/substack', flagOn);

    await expect.poll(() => messages[0]?.loaded).toBe(`${MIGRATE_ORIGIN}/?platform=substack`);
    await expect.element(sidebarScreen.shellNav()).not.toBeInTheDocument();
  });

  it('sends the migration app its credentials when asked', async () => {
    const users = fakeUsers([siteOwner()]);
    fakeIntegrations([selfServeMigration('ssm-secret')]);
    await fakeFrameOrigin(
      MIGRATE_ORIGIN,
      migrateStandIn(`parent.postMessage({ request: 'apiUrl' }, '*');`),
    );
    const messages = standInMessages();
    await renderAdminApp('/migrate', {
      ...flagOn,
      boot: {
        browseSettings: {
          response: settingsResponse({
            settings: {
              stripe_connect_account_id: 'acct_123',
              stripe_connect_publishable_key: 'pk_live_123',
              stripe_connect_livemode: true,
            },
          }),
        },
      },
    });

    await expect
      .poll(() => messages.find((message) => message.received)?.received)
      .toEqual({
        request: 'initialData',
        response: {
          apiUrl: `${window.location.origin}/ghost`,
          apiKey: 'ssm-secret',
          stripe: true,
          csvContentImporter: false,
          ghostVersion: String(configResponse().config.version).split('.').slice(0, 2).join('.'),
          ownerEmail: 'owner@example.com',
        },
      });
    await expect(users).toHaveSentFilter("roles.name:'Owner'");
  });

  it('returns to migration settings with an error when the credentials cannot be loaded', async () => {
    // The settings app owns its request graph; this spec asserts the handoff.
    allowUnhandledRequests();
    fakeUsers([siteOwner()]);
    fakeIntegrations([]);
    await fakeFrameOrigin(
      MIGRATE_ORIGIN,
      migrateStandIn(`parent.postMessage({ request: 'apiUrl' }, '*');`),
    );
    await renderAdminApp('/migrate', flagOn);

    await expect.poll(currentRoute).toBe('/settings/migration');
    await expect
      .element(page.getByText('Error initialising migration. Please try again later.'))
      .toBeVisible();
  });

  it('follows migration routes without reloading the app', async () => {
    await fakeFrameOrigin(
      MIGRATE_ORIGIN,
      migrateStandIn(`parent.postMessage({ route: '/migrate/beehiiv' }, '*');`),
    );
    const messages = standInMessages();
    await renderAdminApp('/migrate/substack', flagOn);
    await expect.poll(currentRoute).toBe('/migrate/beehiiv');

    const frame = migrateScreen.frame().element() as HTMLIFrameElement;
    frame.contentWindow?.postMessage({ ping: true }, MIGRATE_ORIGIN);

    await expect
      .poll(() => messages.find((message) => message.pong)?.pong)
      .toBe(messages[0]?.loadId);
    expect(messages.filter((message) => message.loaded)).toHaveLength(1);
  });

  it('hands routes Ember owns to Ember', async () => {
    await fakeFrameOrigin(
      MIGRATE_ORIGIN,
      migrateStandIn(`parent.postMessage({ route: '/pro' }, '*');`),
    );
    await renderAdminApp('/migrate', flagOn);

    await expect.poll(externalNavigation).toMatchObject({ route: '/pro', isExternal: true });
  });

  it('ignores messages from other origins', async () => {
    await fakeFrameOrigin(MIGRATE_ORIGIN, migrateStandIn());
    const messages = standInMessages();
    await renderAdminApp('/migrate', flagOn);
    await expect.poll(() => messages.length).toBeGreaterThan(0);

    // Handled in order, so honouring the second would supersede the first.
    window.dispatchEvent(
      new MessageEvent('message', { origin: MIGRATE_ORIGIN, data: { route: '/migrate/beehiiv' } }),
    );
    window.dispatchEvent(
      new MessageEvent('message', {
        origin: 'https://example.com',
        data: { route: '/migrate/wordpress' },
      }),
    );

    await expect.poll(currentRoute).toBe('/migrate/beehiiv');
  });

  it('closes to migration settings', async () => {
    // The settings app owns its request graph; this spec asserts the handoff.
    allowUnhandledRequests();
    await fakeFrameOrigin(MIGRATE_ORIGIN, migrateStandIn());
    await renderAdminApp('/migrate/substack', flagOn);

    await migrateScreen.closeButton().click();

    await expect.poll(currentRoute).toBe('/settings/migration');
    await expect.element(migrateScreen.frame()).not.toBeInTheDocument();
  });
});
