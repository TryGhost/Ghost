import { beforeEach, expect, it, vi } from 'vitest';
import { page } from 'vitest/browser';
import { configResponse, fakeAdminEndpoint, renderAdminApp, tag } from '@test-utils/acceptance';
import { tagDetailScreen } from '@/tags/detail/tag-detail.screen';
import { DAY_MS, dunningWindow } from '@test-utils/fixtures/dunning';

// Control only the dunning clock: the dialog's browser focus and pointer-event
// handling must stay real to reproduce the conflict at the phase boundary.
const clock = vi.hoisted(() => ({ now: Date.now(), listeners: new Set<() => void>() }));
vi.mock('./minute-ticker', () => ({
  readSharedNow: () => clock.now,
  subscribeSharedNow: (listener: () => void) => {
    clock.listeners.add(listener);
    return () => {
      clock.listeners.delete(listener);
    };
  },
  retainMinuteTicker: () => () => {},
}));

beforeEach(() => {
  clock.now = Date.now();
  clock.listeners.clear();
});

it.each(['Dismiss', 'Pay now'])(
  'waits for an existing dialog to close before showing a usable %s action',
  async (action) => {
    const news = tag({ name: 'News', slug: 'news' });
    fakeAdminEndpoint('GET', new RegExp(`^/tags/slug/${news.slug}/`), () => ({ tags: [news] }));
    const response = configResponse();
    await renderAdminApp('/tags/news', {
      labs: { dunningWarnings: true },
      boot: {
        browseConfig: {
          response: {
            config: {
              ...response.config,
              hostSettings: {
                billing: { enabled: true, dunning: dunningWindow(20, { now: clock.now }) },
              },
            },
          },
        },
      },
    });

    await tagDetailScreen.actionsButton().click();
    await tagDetailScreen.deleteTagMenuItem().click();
    await expect.element(tagDetailScreen.deleteModal()).toBeVisible();

    clock.now += 2 * DAY_MS;
    clock.listeners.forEach((listener) => listener());

    // The existing dialog keeps its controls until the user closes it. The
    // warning remains in the page; the takeover must not cover the dialog.
    await expect.element(page.getByTestId('dunning-banner')).toHaveTextContent(/6 days left/);
    await expect(page.getByTestId('dunning-overlay')).toHaveCount(0);
    await tagDetailScreen
      .deleteModal()
      .getByRole('button', { name: 'Cancel', exact: true })
      .click();

    const takeover = page.getByRole('alertdialog');
    await expect.element(takeover).toBeVisible();
    await expect.element(takeover).toHaveFocus();

    if (action === 'Dismiss') {
      await takeover.getByRole('button', { name: 'Dismiss', exact: true }).click();
      await expect(takeover).toHaveCount(0);
      await tagDetailScreen.nameInput().click();
      await expect.element(tagDetailScreen.nameInput()).toHaveFocus();
    } else {
      await takeover.getByRole('link', { name: 'Pay now', exact: true }).click();
      await expect.poll(() => window.location.hash).toBe('#/pro/update-card/return');
    }
  },
);
