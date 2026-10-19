import { describe, expect, it } from 'vitest';

import { fakeMembers, fakeTags, member, renderAdminApp } from '@test-utils/acceptance';
import { sidebarScreen } from '@/layout/sidebar.screen';
import { membersScreen } from './members.screen';

describe('Members list scroll restoration', () => {
  it('opens a fresh list at the top from the sidebar after restoring a scrolled one', async () => {
    fakeMembers(Array.from({ length: 1200 }, (_, index) => member({ name: `Member ${index}` })));
    fakeTags([]);
    await renderAdminApp('/members');

    // Scroll past the first 1000-row window, beyond the end of a fresh list.
    await membersScreen.loadMoreButton().click();
    await expect.element(membersScreen.loadMoreButton()).not.toBeInTheDocument();
    membersScreen.listScrollElement()?.scrollTo({ top: Number.MAX_SAFE_INTEGER });
    await expect.poll(membersScreen.lastRenderedRowIndex).toBeGreaterThan(1000);

    await sidebarScreen.navLink('Tags').click();
    await expect(membersScreen.memberRows()).toHaveCount(0);
    window.history.back();
    await expect.poll(membersScreen.lastRenderedRowIndex).toBeGreaterThan(1000);

    // On a busy main thread the reset's scroll event lands after the list
    // re-renders; holding the browser's own scroll events back forces that order.
    const holdScrollEvent = (event: Event) => {
      if (event.isTrusted) {
        event.stopImmediatePropagation();
      }
    };
    window.addEventListener('scroll', holdScrollEvent, true);
    try {
      await sidebarScreen.navLink('Members').click();

      await expect.element(membersScreen.loadMoreButton()).toBeVisible();
      await expect.element(membersScreen.link('Member 0')).toBeVisible();
    } finally {
      window.removeEventListener('scroll', holdScrollEvent, true);
    }
    await expect.poll(() => membersScreen.listScrollElement()?.scrollTop).toBe(0);
  });
});
