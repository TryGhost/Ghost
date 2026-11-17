import { beforeEach, afterEach, describe, expect, it } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import {
  currentRoute,
  fakeAdminEndpoint,
  fakeMembers,
  member,
  fakeAdminStats,
  renderAdminApp,
} from '@test-utils/acceptance';
import { sidebarScreen } from '@/layout/sidebar.screen';
import { membersScreen } from './members.screen';
import { rowSurfaceClasses } from '@tryghost/shade/components';

afterEach(async () => {
  await page.viewport(1280, 800);
});

beforeEach(() => {
  fakeAdminStats.memberCount();
  fakeAdminStats.mrr();
});

describe('Members row surfaces', () => {
  it.each([false, true])(
    'preserves legacy member insets with admin7Design %s',
    async (admin7Design) => {
      fakeMembers([member({ name: 'Ada Lovelace' })]);
      await renderAdminApp('/members', { labs: { admin7Design } });
      const row = membersScreen.memberRow('Ada Lovelace');
      await expect.element(row).toBeVisible();
      expect(getComputedStyle(row.getByRole('cell').elements()[0]).paddingLeft).toBe(
        admin7Design ? '0px' : '16px',
      );
      expect(getComputedStyle(membersScreen.horizontalScrollElement()!).paddingLeft).toBe(
        admin7Design ? '16px' : '0px',
      );
    },
  );

  it.each([390, 768])('extends and rounds the last visible cell at %spx', async (width) => {
    await page.viewport(width, 800);
    const ada = member({ name: 'Ada Lovelace' });
    fakeMembers([ada]);
    fakeAdminEndpoint('GET', new RegExp(`^/members/${ada.id}/`), { members: [ada] });
    fakeAdminEndpoint('GET', /^\/members\/events\//, {
      events: [],
      meta: { pagination: { page: 1, limit: 5, pages: 1, total: 0, next: null, prev: null } },
    });
    await renderAdminApp('/members', { labs: { admin7Design: true } });

    const row = membersScreen.memberRow('Ada Lovelace');
    await expect.element(row).toBeVisible();
    const cells = row.getByRole('cell').elements();
    expect(cells).toHaveLength(width < 480 ? 1 : 2);
    const end = cells.at(-1)!;
    await row.hover();
    const surface = getComputedStyle(end, '::before');
    expect(surface.right).toBe('-16px');
    expect(parseFloat(surface.borderTopRightRadius)).toBeGreaterThan(0);
    expect(parseFloat(surface.borderBottomRightRadius)).toBeGreaterThan(0);
    expect(getComputedStyle(end).paddingRight).toBe('0px');
    expect(surface.opacity).toBe('1');

    row.element().classList.add(rowSurfaceClasses.inset);
    expect(getComputedStyle(cells[0], '::before').left).toBe('0px');
    expect(getComputedStyle(end, '::before').right).toBe('0px');
    row.element().classList.remove(rowSurfaceClasses.inset);

    await row.click({ position: { x: row.element().getBoundingClientRect().width + 8, y: 12 } });
    await expect.poll(currentRoute).toBe(`/members/${ada.id}?back=%2Fmembers`);
  });

  it('opens a member from the expanded row gutter', async () => {
    const ada = member({ name: 'Ada Lovelace' });
    fakeMembers([ada]);
    fakeAdminEndpoint('GET', new RegExp(`^/members/${ada.id}/`), { members: [ada] });
    fakeAdminEndpoint('GET', /^\/members\/events\//, {
      events: [],
      meta: { pagination: { page: 1, limit: 5, pages: 1, total: 0, next: null, prev: null } },
    });
    await renderAdminApp('/members', { labs: { admin7Design: true } });

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
      await renderAdminApp('/members', { labs: { admin7Design: true } });
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
