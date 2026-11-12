import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { page, userEvent } from 'vitest/browser';

import {
  browseResponse,
  fakeAdminStats,
  fakeTags,
  member,
  renderAdminApp,
} from '@test-utils/acceptance';
import { sidebarScreen } from './sidebar.screen';

describe('Sidebar controls', () => {
  beforeEach(() => {
    fakeTags([]);
    fakeAdminStats.memberCount();
    fakeAdminStats.mrr();
  });

  afterEach(async () => {
    await page.viewport(1280, 800);
  });

  it.each([false, true])(
    'shows the member count only in the legacy sidebar: admin7Design %s',
    async (admin7Design) => {
      await renderAdminApp('/tags', {
        labs: { admin7Design },
        boot: { browseMembersCount: { response: browseResponse('members', [member()]) } },
      });
      if (admin7Design) {
        await expect.poll(sidebarScreen.floatingState).toBe('pinned');
      }

      await expect.element(sidebarScreen.navLink('Members')).toBeVisible();
      await expect(sidebarScreen.shellNav().getByText('1', { exact: true })).toHaveCount(
        admin7Design ? 0 : 1,
      );
      if (!admin7Design) {
        await userEvent.hover(sidebarScreen.shellMain());
        await expect
          .poll(() => getComputedStyle(sidebarScreen.createPostLink().element()).opacity)
          .toBe('1');
      }
    },
  );

  it('reveals the create-post action on sidebar hover and keyboard focus', async () => {
    await renderAdminApp('/tags', { labs: { admin7Design: true } });
    await expect.poll(sidebarScreen.floatingState).toBe('pinned');
    const action = sidebarScreen.createPostLink();
    const opacity = () => getComputedStyle(action.element()).opacity;

    await userEvent.hover(sidebarScreen.shellMain());
    await expect.poll(opacity).toBe('0');
    await userEvent.hover(sidebarScreen.navLink('Tags'));
    await expect.poll(opacity).toBe('1');
    await userEvent.hover(sidebarScreen.shellMain());
    await expect.poll(opacity).toBe('0');

    // Opacity keeps the action in the tab order, revealing it before activation.
    for (let tabs = 0; tabs < 30 && document.activeElement !== action.element(); tabs++) {
      await userEvent.tab();
    }
    await expect.element(action).toHaveFocus();
    await expect.poll(opacity).toBe('1');
    await expect.element(action).toHaveAttribute('href', '#/editor/post');
  });

  it('keeps the create-post action visible in the mobile sidebar', async () => {
    await page.viewport(390, 844);
    await renderAdminApp('/tags', { labs: { admin7Design: true } });

    await page.getByRole('button', { name: 'Toggle Sidebar' }).click();

    const action = sidebarScreen.createPostLink();
    await expect.element(action).toBeVisible();
    await expect.poll(() => getComputedStyle(action.element()).opacity).toBe('1');
  });
});
