import { afterEach, expect, it } from 'vitest';
import { page } from 'vitest/browser';
import {
  currentUserResponse,
  fakeAdminStats,
  fakeTags,
  renderAdminApp,
} from '@test-utils/acceptance';
import { sidebarScreen } from './sidebar.screen';

afterEach(async () => {
  await page.viewport(1280, 800);
});

it.each([
  { appearance: 'light', mode: 'full' },
  { appearance: 'dark', mode: 'full' },
  { appearance: 'light', mode: 'compact' },
  { appearance: 'dark', mode: 'compact' },
])(
  'extends the footer fade to the capsule bottom in $appearance appearance, $mode mode',
  async ({ appearance, mode }) => {
    await page.viewport(1280, 800);
    fakeTags([]);
    fakeAdminStats.memberCount();
    fakeAdminStats.mrr();
    const me = currentUserResponse();
    me.users[0].accessibility = JSON.stringify({
      nightShift: appearance,
      navigation: { expanded: { posts: true, members: true }, menu: { visible: true, mode } },
    });
    await renderAdminApp('/tags', {
      labs: { admin7Design: true },
      boot: { browseMe: { response: me } },
    });
    if (mode === 'compact') {
      await expect.poll(sidebarScreen.floatingState).toBe('closed');
      await sidebarScreen.floatingTrigger('Test Site').click();
    }
    await expect.poll(sidebarScreen.floatingState).toBe(mode === 'full' ? 'pinned' : 'open');
    await expect.element(sidebarScreen.userMenuTrigger()).toBeVisible();
    await expect
      .poll(() => document.documentElement.classList.contains('dark'))
      .toBe(appearance === 'dark');
    await expect
      .poll(() => {
        const nav = sidebarScreen.shellNav().element();
        const footer = nav.querySelector('[data-sidebar=footer-region]');
        const capsule = nav.querySelector('[data-slot=floating-sidebar]');
        if (!footer || !capsule) {
          return 100;
        }
        // The capsule's border is the only gap permitted below the gradient.
        return capsule.getBoundingClientRect().bottom - footer.getBoundingClientRect().bottom;
      })
      .toBeLessThanOrEqual(1);
  },
);
