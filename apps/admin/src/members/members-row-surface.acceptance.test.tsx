import { afterEach, describe, expect, it } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import {
  currentRoute,
  fakeAdminEndpoint,
  fakeMembers,
  member,
  renderAdminApp,
} from '@test-utils/acceptance';
import { sidebarScreen } from '@/layout/sidebar.screen';
import { membersScreen } from './members.screen';

afterEach(async () => {
  await page.viewport(1280, 800);
});

describe('Members row surfaces', () => {
  it('opens a member from the expanded row gutter', async () => {
    const ada = member({ name: 'Ada Lovelace' });
    fakeMembers([ada]);
    fakeAdminEndpoint('GET', new RegExp(`^/members/${ada.id}/`), { members: [ada] });
    fakeAdminEndpoint('GET', /^\/members\/events\//, {
      events: [],
      meta: { pagination: { page: 1, limit: 5, pages: 1, total: 0, next: null, prev: null } },
    });
    await renderAdminApp('/members');

    const row = membersScreen.memberRow('Ada Lovelace');
    await expect.element(row).toBeVisible();
    await row.click({ position: { x: -8, y: 12 } });

    await expect.poll(currentRoute).toBe(`/members/${ada.id}?back=%2Fmembers`);
  });

  it.each(['light', 'dark'] as const)(
    'keeps the pinned cell aligned and highlighted with keyboard focus in %s mode',
    async (theme) => {
      await page.viewport(1100, 800);
      fakeMembers([member({ name: 'Ada Lovelace' }), member({ name: 'Grace Hopper' })]);
      await renderAdminApp('/members');
      await sidebarScreen.selectAppearance(theme);
      const ada = membersScreen.memberRow('Ada Lovelace');
      const grace = membersScreen.memberRow('Grace Hopper');
      await expect.element(ada).toBeVisible();
      const memberHeader = membersScreen.pinnedHeaderCell('Member')!;
      const pinnedCell = grace.getByRole('cell').elements()[0];
      const originalBackground = getComputedStyle(pinnedCell).backgroundColor;
      const headerBackground = getComputedStyle(memberHeader).backgroundColor;
      const headerLeft = memberHeader.getBoundingClientRect().left;
      const scroller = membersScreen.horizontalScrollElement()!;
      expect(scroller.scrollWidth).toBeGreaterThan(scroller.clientWidth);

      scroller.scrollLeft = 160;
      await expect.poll(() => scroller.scrollLeft).toBeGreaterThan(0);
      await expect
        .poll(() => Math.abs(pinnedCell.getBoundingClientRect().left - headerLeft))
        .toBeLessThanOrEqual(1);
      membersScreen.link('Ada Lovelace').element().focus();
      await userEvent.keyboard('{Tab}');

      await expect.element(membersScreen.link('Grace Hopper')).toHaveFocus();
      await expect
        .poll(() => getComputedStyle(pinnedCell).backgroundColor)
        .not.toBe(originalBackground);
      expect(getComputedStyle(pinnedCell).backgroundColor).toBe(
        getComputedStyle(grace.element(), '::before').backgroundColor,
      );
      expect(getComputedStyle(memberHeader).backgroundColor).toBe(headerBackground);
    },
  );
});
