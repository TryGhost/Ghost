import { afterEach, describe, expect, it, onTestFinished, vi } from 'vitest';
import {
  allowUnhandledRequests,
  configResponse,
  currentRoute,
  currentUserResponse,
  fakeAdminEndpoint,
  fakeFrameOrigin,
  fakeTags,
  fakeUsers,
  renderAdminApp,
  staffRole,
  staffUser,
  type StaffRoleName,
} from '@test-utils/acceptance';
import {
  DUNNING_PAYMENT_SETTLED_STORAGE_KEY,
  DUNNING_PAY_RETURN_ROUTE_STORAGE_KEY,
} from '@tryghost/admin-x-framework/api/dunning';
import { page } from 'vitest/browser';
import { dunningWindow } from '@test-utils/fixtures/dunning';
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
  // A ping to a frame still loading is dropped like any other message
  await expect.poll(() => loads(messages).length).toBeGreaterThan(0);
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
    labs = {},
    billingReact = true,
    appearance,
  }: {
    role?: StaffRoleName;
    appearance?: 'dark' | 'light';
    /** Read on every `/config/` request, so a function can change what a refetch returns. */
    hostSettings?: Record<string, unknown> | (() => Record<string, unknown>);
    labs?: Record<string, boolean>;
    billingReact?: boolean;
  } = {},
) {
  const config = configResponse();
  const me = currentUserResponse();
  me.users[0].roles = [staffRole({ name: role })];
  if (appearance) {
    me.users[0].accessibility = JSON.stringify({ nightShift: appearance });
  }
  const hostSettingsNow = typeof hostSettings === 'function' ? hostSettings : () => hostSettings;

  await renderAdminApp(path, {
    labs: { ...labs, billingReact },
    boot: {
      browseConfig: {
        response: () => ({
          config: {
            ...config.config,
            hostSettings: {
              ...hostSettingsNow(),
              billing: {
                enabled: true,
                url: BILLING_URL,
                ...(hostSettingsNow().billing as Record<string, unknown> | undefined),
              },
            },
          },
        }),
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
        },
      });
  });

  it('tells the billing app the Admin theme when asked', async () => {
    await fakeFrameOrigin(BILLING_ORIGIN, billingStandIn(READY));
    const messages = standInMessages();
    await renderBilling('/pro', { appearance: 'dark' });
    await expect.poll(() => document.documentElement.classList.contains('dark')).toBe(true);

    await postFromBillingApp(messages, { request: 'theme' });

    await expect
      .poll(() => received(messages, 'request').find(({ request }) => request === 'theme'))
      .toEqual({ request: 'theme', response: 'dark' });
  });

  it('pushes Admin theme changes to the loaded billing app', async () => {
    await fakeFrameOrigin(BILLING_ORIGIN, billingStandIn(READY));
    const messages = standInMessages();
    await renderBilling('/pro');
    await expect.element(billingScreen.frame()).toBeVisible();
    await billingAppSettled(messages);
    const themeUpdates = () =>
      received(messages, 'query').filter(({ query }) => query === 'themeUpdate');
    expect(themeUpdates()).toEqual([]);

    await sidebarScreen.selectAppearance('dark');
    await expect.poll(themeUpdates).toEqual([{ query: 'themeUpdate', response: 'dark' }]);

    await sidebarScreen.selectAppearance('light');
    await expect.poll(themeUpdates).toEqual([
      { query: 'themeUpdate', response: 'dark' },
      { query: 'themeUpdate', response: 'light' },
    ]);
  });

  it('ignores a theme request from outside the billing app', async () => {
    await fakeFrameOrigin(BILLING_ORIGIN, billingStandIn(READY));
    const messages = standInMessages();
    await renderBilling('/pro');
    await billingAppSettled(messages);

    window.postMessage({ request: 'theme' }, window.location.origin);
    await billingAppSettled(messages);

    expect(received(messages, 'request').filter(({ request }) => request === 'theme')).toEqual([]);
  });

  it('keeps the Admin URL in step with the billing app without reloading it', async () => {
    await fakeFrameOrigin(BILLING_ORIGIN, billingStandIn(READY));
    const messages = standInMessages();
    await renderBilling('/pro');
    // Route reports only sync the URL while the screen is showing
    await expect.element(billingScreen.frame()).toBeVisible();
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

  it('resyncs the billing app when history returns to a route it reported', async () => {
    await fakeFrameOrigin(BILLING_ORIGIN, billingStandIn(READY));
    const messages = standInMessages();
    await renderBilling('/pro');
    await expect.element(billingScreen.frame()).toBeVisible();
    await postFromBillingApp(messages, { route: '/plans' });
    await expect.poll(currentRoute).toBe('/pro/plans');

    window.location.hash = '#/pro/domain';
    await expect
      .poll(() => received(messages, 'query').at(-1))
      .toEqual({ query: 'routeUpdate', response: '/domain' });
    window.history.back();

    await expect.poll(currentRoute).toBe('/pro/plans');
    await expect
      .poll(() => received(messages, 'query').at(-1))
      .toEqual({ query: 'routeUpdate', response: '/plans' });
  });

  it('opens plans from the exceeded member limit banner', async () => {
    await fakeFrameOrigin(BILLING_ORIGIN, billingStandIn(READY));
    const messages = standInMessages();
    await renderBilling('/pro');
    await postFromBillingApp(messages, {
      subscription: { status: 'active', isActiveTrial: false, trial_end: null },
      exceededLimits: ['members'],
    });
    await billingAppSettled(messages);

    const link = page.getByRole('link', { name: 'confirm pricing for this number of members' });
    await expect.element(link).toHaveAttribute('href', '#/pro/plans');
    await link.click();
    await expect.poll(currentRoute).toBe('/pro/plans');

    await expect
      .poll(() => received(messages, 'query').at(-1))
      .toEqual({ query: 'routeUpdate', response: '/plans' });
  });

  it('withholds the token from staff who are not the owner', async () => {
    fakeTags([]);
    fakeUsers([
      staffUser({
        name: 'Site Owner',
        email: 'owner@example.com',
        roles: [staffRole({ name: 'Owner' })],
      }),
    ]);
    await fakeFrameOrigin(
      BILLING_ORIGIN,
      billingStandIn(`parent.postMessage({ request: 'token' }, '*');`),
    );
    const messages = standInMessages();
    await renderBilling('/pro', { role: 'Editor', hostSettings: { forceUpgrade: true } });

    await expect
      .poll(() => received(messages, 'request').find(({ request }) => request === 'token'))
      .toEqual({ request: 'token', response: null });

    await postFromBillingApp(messages, { request: 'forceUpgradeInfo' });
    await expect
      .poll(() =>
        received(messages, 'request').find(({ request }) => request === 'forceUpgradeInfo'),
      )
      .toMatchObject({
        response: {
          forceUpgrade: true,
          isOwner: false,
          ownerUser: { name: 'Site Owner', email: 'owner@example.com' },
        },
      });
  });

  it('opens approved Admin destinations and ignores anything else', async () => {
    // The settings app owns its request graph; this spec asserts the handoff.
    allowUnhandledRequests();
    await fakeFrameOrigin(BILLING_ORIGIN, billingStandIn(READY));
    const messages = standInMessages();
    await renderBilling('/pro');
    await expect.element(billingScreen.frame()).toBeVisible();

    for (const destination of ['/members', '__proto__', 'https://example.com']) {
      await postFromBillingApp(messages, { request: 'navigateToAdmin', destination });
    }
    await postFromBillingApp(messages, { route: '/../tags' });
    await billingAppSettled(messages);
    expect(currentRoute()).toBe('/pro');

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

  it.each([
    { automations: true, route: '/settings/emails' },
    { automations: false, route: '/settings/newsletters' },
  ])(
    'opens the newsletters destination at $route with automations $automations',
    async ({ automations, route }) => {
      // The settings app owns its request graph; this spec asserts the handoff.
      allowUnhandledRequests();
      await fakeFrameOrigin(BILLING_ORIGIN, billingStandIn(READY));
      const messages = standInMessages();
      await renderBilling('/pro', { labs: { automations } });
      await expect.element(billingScreen.frame()).toBeVisible();

      await postFromBillingApp(messages, {
        request: 'navigateToAdmin',
        destination: 'newsletters',
      });

      await expect.poll(currentRoute).toBe(route);
    },
  );

  describe('returning from a payment', () => {
    // Before the app teardown, which waits on real timers
    afterEach(() => vi.useRealTimers());

    const settledDunning = {
      active: true,
      paymentFailedAt: '2026-09-01T04:00:00+04:00',
      suspendsAt: '2026-09-29T00:00:00Z',
    };

    async function returnFromPayment(hostSettings: Record<string, unknown> = {}) {
      allowUnhandledRequests();
      await fakeFrameOrigin(BILLING_ORIGIN, billingStandIn(READY));
      const messages = standInMessages();
      await renderBilling('/pro/update-card/return', { hostSettings });
      await expect.element(billingScreen.frame()).toBeVisible();

      await postFromBillingApp(messages, {
        request: 'navigateToAdmin',
        destination: 'previousPage',
      });
    }

    it.each(['2026-07-01T00:00:00Z', '2026-11-01T00:00:00Z'])(
      'records the settled failure with the client clock at %s',
      async (now) => {
        // Freeze only Date so network, polling, and UI timers still run normally
        vi.useFakeTimers({ toFake: ['Date'] });
        vi.setSystemTime(new Date(now));

        await returnFromPayment({ billing: { dunning: settledDunning } });

        // Identified by the host's timestamp, never the browser clock
        await expect
          .poll(() => window.sessionStorage.getItem(DUNNING_PAYMENT_SETTLED_STORAGE_KEY))
          .toBe('2026-09-01T00:00:00.000Z');
      },
    );

    it.each([
      { label: 'missing config', dunning: undefined },
      {
        label: 'malformed config',
        dunning: { active: true, paymentFailedAt: 'invalid', suspendsAt: '2026-09-29' },
      },
    ])('does not record a settled failure with $label', async ({ dunning }) => {
      await returnFromPayment({ billing: { dunning } });

      await expect.poll(currentRoute).toBe('/pro');
      expect(window.sessionStorage.getItem(DUNNING_PAYMENT_SETTLED_STORAGE_KEY)).toBeNull();
    });

    it('falls back to the billing overview without a recorded return route', async () => {
      await returnFromPayment();

      await expect.poll(currentRoute).toBe('/pro');
    });

    it.each([
      { label: 'not an absolute path', route: 'https://evil.example' },
      // '//host' passes a bare startsWith('/') check but is a URL, not a route
      { label: 'protocol-relative', route: '//evil.example' },
    ])('ignores a recorded return route that is $label', async ({ route }) => {
      window.sessionStorage.setItem(DUNNING_PAY_RETURN_ROUTE_STORAGE_KEY, route);

      await returnFromPayment();

      await expect.poll(currentRoute).toBe('/pro');
      expect(window.sessionStorage.getItem(DUNNING_PAY_RETURN_ROUTE_STORAGE_KEY)).toBeNull();
    });
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
        `${READY} parent.postMessage({ subscription: { status: 'active', isActiveTrial: false, trial_end: null }, exceededLimits: ['members'] }, '*');`,
      ),
    );
    await renderBilling('/tags', { role: 'Editor' });

    await expect.element(alertsScreen.alert(/Your audience has grown/)).toBeVisible();
    await expect.element(billingScreen.frame()).not.toBeVisible();
    await expect.element(tagsScreen.newTagLink()).toBeVisible();
  });

  it('clears the exceeded alert once a report no longer exceeds the member limit', async () => {
    fakeTags([]);
    await fakeFrameOrigin(BILLING_ORIGIN, billingStandIn(READY));
    const messages = standInMessages();
    await renderBilling('/tags', { role: 'Editor' });
    const subscription = { status: 'active', isActiveTrial: false, trial_end: null };

    await postFromBillingApp(messages, {
      subscription,
      exceededLimits: ['members'],
    });
    await expect.element(alertsScreen.alert(/Your audience has grown/)).toBeVisible();

    await postFromBillingApp(messages, { subscription, exceededLimits: [] });
    await expect.element(alertsScreen.alert(/Your audience has grown/)).not.toBeInTheDocument();
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

  it('keeps staff on billing when a force upgrade lifts mid-visit, until they leave', async () => {
    fakeTags([]);
    await fakeFrameOrigin(BILLING_ORIGIN, billingStandIn(READY));
    const messages = standInMessages();
    await renderBilling('/pro', { role: 'Administrator', hostSettings: { forceUpgrade: true } });
    await expect.element(billingScreen.frame()).toBeVisible();

    await postFromBillingApp(messages, {
      subscription: { status: 'active', isActiveTrial: false, trial_end: null },
    });
    await billingAppSettled(messages);

    expect(currentRoute()).toBe('/pro');
    await expect.element(billingScreen.frame()).toBeVisible();

    window.location.hash = '#/tags';
    await expect.element(tagsScreen.newTagLink()).toBeVisible();
  });

  it('reads only well-formed trial details from a subscription report', async () => {
    fakeTags([]);
    await fakeFrameOrigin(BILLING_ORIGIN, billingStandIn(READY));
    const messages = standInMessages();
    await renderBilling('/tags');
    await expect.element(tagsScreen.newTagLink()).toBeVisible();

    await postFromBillingApp(messages, {
      subscription: { status: 'trialing', isActiveTrial: true, trial_end: null },
    });
    await expect.element(sidebarScreen.upgradeNowLink()).toBeVisible();

    // Visible first, so its disappearing proves the malformed report was read
    await postFromBillingApp(messages, {
      subscription: { status: 'trialing', isActiveTrial: 'yes', trial_end: 'soon' },
    });
    await expect.element(sidebarScreen.upgradeNowLink()).not.toBeInTheDocument();
  });

  it('shows the dunning warnings from the config refreshed for the report', async () => {
    fakeTags([]);
    let hostSettings: Record<string, unknown> = {};
    await fakeFrameOrigin(BILLING_ORIGIN, billingStandIn(READY));
    const messages = standInMessages();
    await renderBilling('/tags', {
      hostSettings: () => hostSettings,
    });
    await expect.element(tagsScreen.newTagLink()).toBeVisible();

    // The refetch the report triggers brings the host's dunning block; the
    // dunning warnings are the only payment-failure surface
    hostSettings = { billing: { dunning: dunningWindow(2) } };
    await postFromBillingApp(messages, {
      subscription: { status: 'past_due', isActiveTrial: false, trial_end: null },
    });

    await expect.element(page.getByTestId('dunning-banner')).toBeVisible();
    await billingAppSettled(messages);
    // The report itself raises no alert of any kind
    await expect(alertsScreen.alerts()).toHaveCount(0);
  });

  it('loads a deep-linked billing route once, without its query', async () => {
    await fakeFrameOrigin(BILLING_ORIGIN, billingStandIn(READY));
    const messages = standInMessages();
    await renderBilling('/pro/plans?interval=year');
    await expect.element(billingScreen.frame()).toBeVisible();
    await billingAppSettled(messages);

    expect(loads(messages).map((url) => url.pathname)).toEqual(['/plans']);
    expect(loads(messages)[0]?.searchParams.has('interval')).toBe(false);
  });

  it('ignores the retired checkout action on the overview', async () => {
    await fakeFrameOrigin(BILLING_ORIGIN, billingStandIn(READY));
    const messages = standInMessages();
    await renderBilling('/pro?action=checkout');
    await expect.element(billingScreen.frame()).toBeVisible();
    await billingAppSettled(messages);

    expect(loads(messages)).toHaveLength(1);
    expect(loads(messages)[0]?.searchParams.has('action')).toBe(false);
  });

  it('holds the Ember editor on billing during a force upgrade', async () => {
    await fakeFrameOrigin(BILLING_ORIGIN, billingStandIn(READY));
    await renderBilling('/editor/post', {
      role: 'Administrator',
      hostSettings: { forceUpgrade: true },
    });

    await expect.poll(currentRoute).toBe('/pro');
  });

  it('loads the hidden billing app at the size it will show at', async () => {
    fakeTags([]);
    await fakeFrameOrigin(BILLING_ORIGIN, billingStandIn(READY));
    await renderBilling('/tags');
    await expect.element(tagsScreen.newTagLink()).toBeVisible();

    const frame = billingScreen.frame().element();
    await expect.element(billingScreen.frame()).not.toBeVisible();
    const hidden = frame.getBoundingClientRect();
    expect(hidden.width).toBeGreaterThan(200);
    expect(hidden.height).toBeGreaterThan(200);

    window.location.hash = '#/pro';
    await expect.element(billingScreen.frame()).toBeVisible();
    const shown = frame.getBoundingClientRect();
    expect(shown.width).toBe(hidden.width);
    expect(shown.height).toBe(hidden.height);
  });

  it('shows billing full size to contributors held by a force upgrade', async () => {
    await fakeFrameOrigin(BILLING_ORIGIN, billingStandIn(READY));
    await renderBilling('/pro', { role: 'Contributor', hostSettings: { forceUpgrade: true } });

    await expect.element(billingScreen.frame()).toBeVisible();
    const { height, width } = billingScreen.frame().element().getBoundingClientRect();
    expect(height).toBeGreaterThan(200);
    expect(width).toBeGreaterThan(200);
  });

  it('sends a hidden billing app nothing when Admin leaves billing', async () => {
    fakeTags([]);
    await fakeFrameOrigin(BILLING_ORIGIN, billingStandIn(READY));
    const messages = standInMessages();
    await renderBilling('/pro');
    await expect.element(billingScreen.frame()).toBeVisible();
    await billingAppSettled(messages);
    const sent = received(messages, 'query').length;

    window.location.hash = '#/tags';
    await expect.element(tagsScreen.newTagLink()).toBeVisible();
    await billingAppSettled(messages);

    expect(received(messages, 'query').slice(sent)).toEqual([]);
    expect(loads(messages)).toHaveLength(1);
  });

  it('does not resend a deep-linked route once the billing app is ready', async () => {
    await fakeFrameOrigin(BILLING_ORIGIN, billingStandIn(READY));
    const messages = standInMessages();
    await renderBilling('/pro/domain');
    await expect.element(billingScreen.frame()).toBeVisible();
    await billingAppSettled(messages);

    expect(received(messages, 'query').filter(({ query }) => query === 'routeUpdate')).toEqual([]);
  });

  it('leaves billing to Ember while the flag is off', async () => {
    await fakeFrameOrigin(BILLING_ORIGIN, billingStandIn(READY));
    await renderBilling('/pro', { billingReact: false });

    await expect.element(sidebarScreen.shellNav()).toBeVisible();
    await expect.element(billingScreen.frame()).not.toBeInTheDocument();
  });
});
