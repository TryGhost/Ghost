import { afterEach, describe, expect, it, onTestFinished } from 'vitest';
import {
  allowUnhandledRequests,
  configResponse,
  currentRoute,
  currentUserResponse,
  fakeAdminEndpoint,
  fakeFrameOrigin,
  fakeTags,
  renderAdminApp,
  staffRole,
  type StaffRoleName,
} from '@test-utils/acceptance';
import { DUNNING_PAY_RETURN_ROUTE_STORAGE_KEY } from '@tryghost/admin-x-framework/api/dunning';
import { alertsScreen } from '@/alerts/alerts.screen';
import { sidebarScreen } from '@/layout/sidebar.screen';
import { tagsScreen } from '@/tags/tags.screen';
import { billingScreen } from './billing.screen';

const BILLING_ORIGIN = 'https://billing.example.com';
const BILLING_URL = `${BILLING_ORIGIN}/`;

// Stands in for the billing app: reports each load with its own id, echoes
// pings with that id, relays `{relay}` payloads to Admin as its own messages,
// reports every other message it receives, then runs `script`.
function billingStandIn(script = '') {
  return `<!doctype html><script>
    const loadId = Math.random().toString(36).slice(2);
    window.addEventListener('message', (event) => {
      if (event.data?.ping) {
        parent.postMessage({ pong: loadId }, '*');
        return;
      }
      if (event.data?.relay) {
        parent.postMessage(event.data.relay, '*');
        return;
      }
      parent.postMessage({ received: event.data }, '*');
    });
    parent.postMessage({ loaded: location.href, loadId }, '*');
    ${script}
  </script>`;
}

const READY = `parent.postMessage({ request: 'billingAppReady', route: location.pathname }, '*');`;

interface StandInMessage {
  loaded?: string;
  loadId?: string;
  pong?: string;
  received?: { request?: string; query?: string; response?: unknown };
}

function standInMessages(): StandInMessage[] {
  const messages: StandInMessage[] = [];
  const listener = (event: MessageEvent<StandInMessage | null>) => {
    const data = event.data;
    if (
      event.origin === BILLING_ORIGIN &&
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

/**
 * Makes the stand-in post `message` to Admin from inside the billing frame,
 * once it has loaded — a message to a frame still loading is dropped.
 */
async function postFromBillingApp(messages: StandInMessage[], message: unknown) {
  await expect.poll(() => loads(messages).length).toBeGreaterThan(0);
  const frame = billingScreen.frame().element() as HTMLIFrameElement;
  frame.contentWindow?.postMessage({ relay: message }, BILLING_ORIGIN);
}

/** Resolves once Admin has handled every message the stand-in posted before now. */
async function billingAppSettled(messages: StandInMessage[]) {
  const pongs = messages.filter((message) => message.pong).length;
  const frame = billingScreen.frame().element() as HTMLIFrameElement;
  frame.contentWindow?.postMessage({ ping: true }, BILLING_ORIGIN);
  await expect.poll(() => messages.filter((message) => message.pong).length).toBe(pongs + 1);
}

function received(messages: StandInMessage[], key: 'request' | 'query') {
  return messages.flatMap((message) => (message.received?.[key] ? [message.received] : []));
}

function loads(messages: StandInMessage[]) {
  return messages.flatMap((message) => (message.loaded ? [new URL(message.loaded)] : []));
}

async function renderBilling(
  path: string,
  {
    role = 'Owner',
    hostSettings = {},
    billingReact = true,
  }: { role?: StaffRoleName; hostSettings?: Record<string, unknown>; billingReact?: boolean } = {},
) {
  const config = configResponse();
  const me = currentUserResponse();
  me.users[0].roles = [staffRole({ name: role })];

  await renderAdminApp(path, {
    labs: { billingReact },
    boot: {
      browseConfig: {
        response: {
          config: {
            ...config.config,
            hostSettings: { billing: { enabled: true, url: BILLING_URL }, ...hostSettings },
          },
        },
      },
      browseMe: { response: me },
    },
  });
}

describe('Ghost(Pro) billing', () => {
  afterEach(() => window.sessionStorage.clear());

  it('opens the billing app beside the sidebar for the owner', async () => {
    await fakeFrameOrigin(BILLING_ORIGIN, billingStandIn(READY));
    const messages = standInMessages();
    await renderBilling('/pro');

    await expect.element(billingScreen.frame()).toBeVisible();
    await expect.element(sidebarScreen.shellNav()).toBeVisible();
    await expect.poll(() => loads(messages)[0]?.pathname).toBe('/');
    expect(loads(messages)[0]?.searchParams.get('bmaAttemptId')).toBeTruthy();
  });

  it('loads a deep-linked billing route', async () => {
    await fakeFrameOrigin(BILLING_ORIGIN, billingStandIn());
    const messages = standInMessages();
    await renderBilling('/pro/domain');

    await expect.poll(() => loads(messages)[0]?.pathname).toBe('/domain');
  });

  it('hands the owner an identity token and force upgrade details', async () => {
    fakeAdminEndpoint('GET', '/identities/', { identities: [{ token: 'identity-token' }] });
    await fakeFrameOrigin(
      BILLING_ORIGIN,
      billingStandIn(`parent.postMessage({ request: 'token' }, '*');`),
    );
    const messages = standInMessages();
    await renderBilling('/pro');

    await expect
      .poll(() => received(messages, 'request').find(({ request }) => request === 'token'))
      .toEqual({ request: 'token', response: 'identity-token' });

    await postFromBillingApp(messages, { request: 'forceUpgradeInfo' });
    await expect
      .poll(() =>
        received(messages, 'request').find(({ request }) => request === 'forceUpgradeInfo'),
      )
      .toEqual({
        request: 'forceUpgradeInfo',
        response: {
          forceUpgrade: false,
          isOwner: true,
          ownerUser: {
            name: currentUserResponse().users[0].name,
            email: currentUserResponse().users[0].email,
          },
          dunningReturnEnabled: false,
        },
      });
  });

  it('keeps the Admin URL in step with the billing app without reloading it', async () => {
    await fakeFrameOrigin(BILLING_ORIGIN, billingStandIn(READY));
    const messages = standInMessages();
    await renderBilling('/pro');
    await expect.poll(() => loads(messages)).toHaveLength(1);

    await postFromBillingApp(messages, { route: '/plans' });
    await expect.poll(currentRoute).toBe('/pro/plans');

    window.location.hash = '#/pro/domain';
    await expect
      .poll(() => received(messages, 'query').filter(({ query }) => query === 'routeUpdate'))
      .toContainEqual({ query: 'routeUpdate', response: '/domain' });
    expect(received(messages, 'query')).not.toContainEqual({
      query: 'routeUpdate',
      response: '/plans',
    });
    expect(loads(messages)).toHaveLength(1);
  });

  it('opens approved Admin destinations and ignores anything else', async () => {
    // The settings app owns its request graph; this spec asserts the handoff.
    allowUnhandledRequests();
    await fakeFrameOrigin(BILLING_ORIGIN, billingStandIn(READY));
    const messages = standInMessages();
    await renderBilling('/pro');
    await expect.element(billingScreen.frame()).toBeVisible();

    await postFromBillingApp(messages, { request: 'navigateToAdmin', destination: '/members' });
    await postFromBillingApp(messages, { request: 'navigateToAdmin', destination: 'staff' });

    await expect.poll(currentRoute).toBe('/settings/staff');
    await expect.element(billingScreen.frame()).not.toBeVisible();
  });

  it('returns to the page a payment started from', async () => {
    window.sessionStorage.setItem(DUNNING_PAY_RETURN_ROUTE_STORAGE_KEY, '/tags');
    fakeTags([]);
    await fakeFrameOrigin(BILLING_ORIGIN, billingStandIn(READY));
    const messages = standInMessages();
    await renderBilling('/pro/update-card/return');
    await expect.element(billingScreen.frame()).toBeVisible();

    await postFromBillingApp(messages, { request: 'navigateToAdmin', destination: 'previousPage' });

    await expect.poll(currentRoute).toBe('/tags');
    await expect.element(tagsScreen.newTagLink()).toBeVisible();
  });

  it('sends staff who cannot manage billing home', async () => {
    allowUnhandledRequests();
    await fakeFrameOrigin(BILLING_ORIGIN, billingStandIn(READY));
    await renderBilling('/pro', { role: 'Administrator' });

    await expect.poll(currentRoute).not.toMatch(/^\/pro/);
    await expect.element(billingScreen.frame()).not.toBeVisible();
  });

  it('reports subscription problems from any page while hidden', async () => {
    fakeTags([]);
    await fakeFrameOrigin(
      BILLING_ORIGIN,
      billingStandIn(
        `${READY} parent.postMessage({ subscription: { status: 'past_due', isActiveTrial: false, trial_end: null } }, '*');`,
      ),
    );
    await renderBilling('/tags', { role: 'Editor' });

    await expect.element(alertsScreen.alert(/Your billing details need updating/)).toBeVisible();
    await expect.element(billingScreen.frame()).not.toBeVisible();
    await expect.element(tagsScreen.newTagLink()).toBeVisible();
  });

  it('holds every page on billing during a force upgrade, for any staff role', async () => {
    fakeTags([]);
    await fakeFrameOrigin(BILLING_ORIGIN, billingStandIn(READY));
    await renderBilling('/tags', { role: 'Administrator', hostSettings: { forceUpgrade: true } });

    await expect.poll(currentRoute).toBe('/pro');
    await expect.element(billingScreen.frame()).toBeVisible();
  });

  it('lifts a force upgrade once the subscription is active', async () => {
    fakeTags([]);
    await fakeFrameOrigin(BILLING_ORIGIN, billingStandIn(READY));
    const messages = standInMessages();
    await renderBilling('/pro', { hostSettings: { forceUpgrade: true } });
    await expect.element(billingScreen.frame()).toBeVisible();

    await postFromBillingApp(messages, {
      subscription: { status: 'active', isActiveTrial: false, trial_end: null },
    });
    await billingAppSettled(messages);
    window.location.hash = '#/tags';

    await expect.element(tagsScreen.newTagLink()).toBeVisible();
    await expect.element(billingScreen.frame()).not.toBeVisible();
  });

  it('leaves billing to Ember while the flag is off', async () => {
    await fakeFrameOrigin(BILLING_ORIGIN, billingStandIn(READY));
    await renderBilling('/pro', { billingReact: false });

    await expect.element(sidebarScreen.shellNav()).toBeVisible();
    await expect.element(billingScreen.frame()).not.toBeInTheDocument();
  });
});
