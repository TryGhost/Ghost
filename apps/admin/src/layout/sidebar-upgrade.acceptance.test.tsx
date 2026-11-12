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

it.each([
  { appearance: 'light', customMessage: undefined, target: 'cta' },
  { appearance: 'dark', customMessage: undefined, target: 'cta' },
  {
    appearance: 'light',
    customMessage:
      'This hosting plan includes the full publishing workspace. Choose a plan when you are ready to launch, and contact our team if you need help selecting the right option for your publication.',
    target: 'cta',
  },
  { appearance: 'light', customMessage: undefined, target: 'title' },
])(
  'keeps the upgrade $target action usable in a short $appearance sidebar with custom copy: $customMessage',
  async ({ appearance, customMessage, target }) => {
    await page.viewport(1280, 420);
    fakeTags([]);
    fakeAdminStats.memberCount();
    fakeAdminStats.mrr();
    const me = currentUserResponse();
    me.users[0].accessibility = JSON.stringify({ nightShift: appearance });
    const config = configResponse();
    config.config.hostSettings = {
      billing: {
        enabled: true,
        url: 'https://billing.example.com',
        ...(customMessage ? { upgradeBanner: { message: customMessage } } : {}),
      },
    };
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
    if (customMessage) {
      await expect.element(page.getByText(customMessage, { exact: true })).toBeVisible();
    } else {
      await expect
        .element(page.getByText(/Choose a plan to access the full power of Ghost/))
        .toBeVisible();
    }
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

    const scroller = upgrade.element().closest('[data-slot=banner]')?.parentElement;
    if (!(scroller instanceof HTMLElement)) {
      throw new Error('Expected scrollable sidebar banner');
    }
    scroller.scrollTop = scroller.scrollHeight;
    await expect
      .poll(() => {
        const actionRect = upgrade.element().getBoundingClientRect();
        const containerRect = scroller.getBoundingClientRect();
        return actionRect.top >= containerRect.top && actionRect.bottom <= containerRect.bottom;
      })
      .toBe(true);
    if (customMessage) {
      await expect.poll(() => scroller.scrollTop).toBeGreaterThan(0);
      await expect
        .poll(() => {
          const messageBottom = page
            .getByText(customMessage, { exact: true })
            .element()
            .getBoundingClientRect().bottom;
          return (
            messageBottom >= scroller.getBoundingClientRect().top &&
            messageBottom <= upgrade.element().getBoundingClientRect().top
          );
        })
        .toBe(true);
    }

    // The billing app owns its request graph; this spec checks the sidebar's entry point.
    allowUnhandledRequests();
    await fakeFrameOrigin('https://billing.example.com', '<html><body>Billing</body></html>');
    if (target === 'title') {
      scroller.scrollTop = 0;
      const banner = sidebarScreen
        .shellNav()
        .getByRole('status')
        .filter({ hasText: 'Unlock every feature' });
      const titleRect = page
        .getByText('Unlock every feature', { exact: true })
        .element()
        .getBoundingClientRect();
      const bannerRect = banner.element().getBoundingClientRect();
      // Click the card at the title's position; its stretched link intentionally covers the text.
      await banner.click({
        position: {
          x: titleRect.left - bannerRect.left + 2,
          y: titleRect.top - bannerRect.top + 2,
        },
      });
    } else {
      await upgrade.click();
    }
    await expect.poll(currentRoute).toBe('/pro/billing/plans');
  },
);
