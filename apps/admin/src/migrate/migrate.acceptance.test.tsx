import { describe, expect, it, onTestFinished } from 'vitest';
import { page } from 'vitest/browser';
import {
  allowUnhandledRequests,
  currentRoute,
  fakeFrameOrigin,
  fakeIntegrations,
  fakeUsers,
  renderAdminApp,
  staffRole,
  staffUser,
} from '@test-utils/acceptance';
import type { Integration } from '@tryghost/admin-x-framework/api/integrations';

const MIGRATE_ORIGIN = 'https://migrate.ghost.org';
const flagOn = { labs: { iframeRoutesReact: true } };

// Stands in for the migration app: reports its URL, relays every message it
// receives back to Admin's window, then runs `script`.
function migrateStandIn(script = '') {
  return `<!doctype html><script>
    window.addEventListener('message', (event) => parent.postMessage({ received: event.data }, '*'));
    parent.postMessage({ loaded: location.href }, '*');
    ${script}
  </script>`;
}

interface StandInMessage {
  loaded?: string;
  received?: { request: string; response: Record<string, unknown> };
}

function standInMessages(): StandInMessage[] {
  const messages: StandInMessage[] = [];
  const listener = (event: MessageEvent<StandInMessage | null>) => {
    if (
      event.origin === MIGRATE_ORIGIN &&
      event.data &&
      ('loaded' in event.data || 'received' in event.data)
    ) {
      messages.push(event.data);
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

const migrateFrame = () => page.getByTitle('Migrate');

describe('Migrate', () => {
  it.each([false, undefined])('leaves the page with Ember when the flag is %s', async (enabled) => {
    await renderAdminApp('/migrate/substack', {
      labs: enabled === undefined ? {} : { iframeRoutesReact: enabled },
    });

    // There is no Ember runtime in this tier; the shell exposes its host
    // instead.
    await expect
      .poll(() => document.getElementById('ember-app')?.parentElement?.hidden)
      .toBe(false);
    await expect.element(migrateFrame()).not.toBeInTheDocument();
  });

  it('opens the migration app for the chosen platform', async () => {
    await fakeFrameOrigin(MIGRATE_ORIGIN, migrateStandIn());
    const messages = standInMessages();
    await renderAdminApp('/migrate/substack', flagOn);

    await expect.poll(() => messages[0]?.loaded).toBe(`${MIGRATE_ORIGIN}/?platform=substack`);
    await expect
      .element(page.getByRole('link', { name: 'View site', exact: true }))
      .not.toBeInTheDocument();
  });

  it('sends the migration app its credentials when asked', async () => {
    const users = fakeUsers([siteOwner()]);
    fakeIntegrations([selfServeMigration('ssm-secret')]);
    await fakeFrameOrigin(
      MIGRATE_ORIGIN,
      migrateStandIn(`parent.postMessage({ request: 'apiUrl' }, '*');`),
    );
    const messages = standInMessages();
    await renderAdminApp('/migrate', flagOn);

    await expect
      .poll(() => messages.find((message) => message.received)?.received)
      .toEqual({
        request: 'initialData',
        response: {
          apiUrl: `${window.location.origin}/ghost`,
          apiKey: 'ssm-secret',
          stripe: false,
          csvContentImporter: false,
          ghostVersion: '6.52',
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

  it('follows the routes the migration app sends without reloading it', async () => {
    await fakeFrameOrigin(
      MIGRATE_ORIGIN,
      migrateStandIn(`parent.postMessage({ route: '/migrate/beehiiv' }, '*');`),
    );
    const messages = standInMessages();
    await renderAdminApp('/migrate/substack', flagOn);

    await expect.poll(currentRoute).toBe('/migrate/beehiiv');
    await expect.element(migrateFrame()).toBeInTheDocument();
    expect(messages.filter((message) => message.loaded)).toHaveLength(1);
  });

  it('ignores messages from other origins', async () => {
    await fakeFrameOrigin(MIGRATE_ORIGIN, migrateStandIn());
    await renderAdminApp('/migrate', flagOn);
    await expect.element(migrateFrame()).toBeInTheDocument();

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

    await page.getByRole('button', { name: 'Close' }).click();

    await expect.poll(currentRoute).toBe('/settings/migration');
    await expect.element(migrateFrame()).not.toBeInTheDocument();
  });
});
