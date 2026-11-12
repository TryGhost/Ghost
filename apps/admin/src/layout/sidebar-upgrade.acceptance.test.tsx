import { afterEach, expect, it } from 'vitest';
import { page } from 'vitest/browser';

import {
  allowUnhandledRequests,
  configResponse,
  currentRoute,
  currentUserResponse,
  fakeAdminStats,
  fakeFrameOrigin,
  fakeTags,
  renderAdminApp,
} from '@test-utils/acceptance';
import { setBillingSubscriptionState } from '@/billing/subscription-status';
import { sidebarScreen } from './sidebar.screen';

afterEach(async () => {
  setBillingSubscriptionState(null);
  await page.viewport(1280, 800);
});

it.each(['light', 'dark'])(
  'keeps the upgrade action in view and usable in a short %s sidebar',
  async (appearance) => {
    await page.viewport(1280, 420);
    fakeTags([]);
    fakeAdminStats.memberCount();
    fakeAdminStats.mrr();
    const me = currentUserResponse();
    me.users[0].accessibility = JSON.stringify({ nightShift: appearance });
    const config = configResponse();
    config.config.hostSettings = { billing: { enabled: true, url: 'https://billing.example.com' } };
    await renderAdminApp('/tags', {
      labs: { admin7Design: true },
      boot: {
        browseMe: { response: me },
        browseConfig: { response: config },
      },
    });
    // This is the subscription state normally reported by the embedded billing app.
    setBillingSubscriptionState({
      subscription: {
        status: 'trialing',
        isActiveTrial: true,
        trial_end: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      },
    });
    const upgrade = sidebarScreen.upgradeNowLink();
    await expect.element(upgrade).toBeVisible();
    await expect
      .element(page.getByText('7 days free trial remaining.', { exact: true }))
      .toBeVisible();
    // toBeVisible alone doesn't detect an action clipped by its scrollable banner container.
    await expect
      .poll(() => {
        const actionRect = upgrade.element().getBoundingClientRect();
        const banner = upgrade.element().closest('[data-slot=banner]');
        const container = banner?.parentElement;
        if (!container) {
          return false;
        }
        const containerRect = container.getBoundingClientRect();
        return actionRect.top >= containerRect.top && actionRect.bottom <= containerRect.bottom;
      })
      .toBe(true);

    // The billing app owns its request graph; this spec checks the sidebar's entry point.
    allowUnhandledRequests();
    await fakeFrameOrigin('https://billing.example.com', '<html><body>Billing</body></html>');
    await upgrade.click();
    await expect.poll(currentRoute).toBe('/pro/billing/plans');
  },
);
