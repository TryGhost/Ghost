import { beforeEach, describe, expect, it } from 'vitest';

import {
  currentUserResponse,
  fakeAdminStats,
  fakeTags,
  renderAdminApp,
} from '@test-utils/acceptance';
import { sidebarScreen } from './sidebar.screen';

// Trigger in this browser task so the assertions can sample the closing transition.
function clickPostsToggle() {
  const button = sidebarScreen.postsToggle().element();
  if (!(button instanceof HTMLButtonElement)) {
    throw new Error('Expected the Posts toggle button');
  }
  button.click();
}

async function renderSidebar(postsExpanded: boolean) {
  const me = currentUserResponse();
  me.users[0].accessibility = JSON.stringify({
    navigation: {
      expanded: { posts: postsExpanded, members: true },
      menu: { visible: true, mode: 'full' },
    },
  });
  fakeTags([]);
  await renderAdminApp('/tags', {
    labs: { admin7Design: true },
    boot: { browseMe: { response: me } },
  });
  await expect.poll(sidebarScreen.floatingState).toBe('pinned');
  await expect
    .element(sidebarScreen.postsToggle())
    .toHaveAttribute('aria-expanded', String(postsExpanded));
  const submenu = document.getElementById('posts-submenu');
  if (!submenu) {
    throw new Error('Expected the Posts submenu');
  }
  return submenu;
}

describe('Admin 7 sidebar submenu motion', () => {
  beforeEach(() => {
    fakeAdminStats.memberCount();
    fakeAdminStats.mrr();
  });

  it('keeps the closing rows visible while immediately removing them from keyboard and accessibility navigation', async () => {
    const submenu = await renderSidebar(true);
    expect(submenu.getBoundingClientRect().height).toBeGreaterThan(0);

    clickPostsToggle();
    await expect.element(sidebarScreen.postsToggle()).toHaveAttribute('aria-expanded', 'false');

    expect(submenu.querySelectorAll('a').length).toBeGreaterThan(0);
    expect(submenu.getBoundingClientRect().height).toBeGreaterThan(0);
    expect(submenu).toHaveAttribute('aria-hidden', 'true');
    expect(submenu.inert).toBe(true);
    await expect.poll(() => submenu.getBoundingClientRect().height).toBe(0);
  });

  it('reveals submenu entries in order and survives a close followed immediately by reopening', async () => {
    const submenu = await renderSidebar(false);
    const toggle = sidebarScreen.postsToggle();
    clickPostsToggle();
    await expect.element(toggle).toHaveAttribute('aria-expanded', 'true');

    await expect
      .poll(() => {
        const rows = Array.from(submenu.querySelectorAll<HTMLElement>('[data-sidebar=menu-item]'));
        if (rows.length < 2) {
          return false;
        }
        return (
          Number(getComputedStyle(rows[0]).opacity) > Number(getComputedStyle(rows.at(-1)!).opacity)
        );
      })
      .toBe(true);

    clickPostsToggle();
    await expect.element(toggle).toHaveAttribute('aria-expanded', 'false');
    clickPostsToggle();
    await expect.element(toggle).toHaveAttribute('aria-expanded', 'true');

    await expect.poll(() => submenu.inert).toBe(false);
    await expect
      .poll(() => Array.from(submenu.querySelectorAll('a')).every((link) => link.checkVisibility()))
      .toBe(true);
  });
});
