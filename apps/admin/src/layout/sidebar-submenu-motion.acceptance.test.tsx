import { beforeEach, describe, expect, it } from 'vitest';

import {
  currentRoute,
  currentUserResponse,
  fakeAdminEndpoint,
  fakeAdminStats,
  fakeMembers,
  fakePosts,
  fakePostsListScreen,
  fakeTags,
  renderAdminApp,
  settingsResponse,
} from '@test-utils/acceptance';
import { sidebarScreen } from './sidebar.screen';

// Navigate in this browser task so assertions can sample the submenu transitions.
function navigateTo(label: string) {
  const link = sidebarScreen.navLink(label).element();
  if (!(link instanceof HTMLAnchorElement)) {
    throw new Error(`Expected the ${label} navigation link`);
  }
  link.click();
}

function submenu(id: 'posts' | 'members') {
  const menu = document.getElementById(`${id}-submenu`);
  if (!menu) {
    throw new Error(`Expected the ${id} submenu`);
  }
  return menu;
}

async function renderSidebar(route: string) {
  const me = currentUserResponse();
  me.users[0].accessibility = JSON.stringify({
    whatsNew: { lastSeenDate: '2025-01-01T00:00:00.000Z' },
    navigation: {
      expanded: { posts: false, members: false },
      menu: { visible: true, mode: 'full' },
    },
  });
  fakeTags([]);
  fakePostsListScreen();
  fakePosts([]);
  fakeMembers([]);
  const preferences = fakeAdminEndpoint('PUT', /^\/users\/\w+\//, ({ body }) => body);
  await renderAdminApp(route, {
    labs: { admin7Design: true },
    boot: {
      browseMe: { response: me },
      browseSettings: {
        response: settingsResponse({
          settings: {
            shared_views: JSON.stringify([
              { name: 'VIPs', route: 'members', filter: { filter: 'label:[VIP]' } },
            ]),
          },
        }),
      },
    },
  });
  await expect.poll(sidebarScreen.floatingState).toBe('pinned');
  await expect.element(sidebarScreen.navLink('Tags')).toBeVisible();
  return preferences;
}

describe('Admin 7 sidebar submenu navigation and motion', () => {
  beforeEach(() => {
    fakeAdminStats.memberCount();
    fakeAdminStats.mrr();
  });

  it('opens the current section, closes the others, and follows history without saving expansion preferences', async () => {
    const preferences = await renderSidebar('/posts');
    await expect.poll(() => submenu('posts').inert).toBe(false);
    expect(submenu('members').inert).toBe(true);
    await expect(sidebarScreen.postsToggle()).toHaveCount(0);
    await expect(
      sidebarScreen.shellNav().getByRole('button', { name: 'Toggle member views' }),
    ).toHaveCount(0);

    navigateTo('Members');
    await expect.poll(currentRoute).toBe('/members');
    await expect.poll(() => submenu('members').inert).toBe(false);
    expect(submenu('posts').inert).toBe(true);

    navigateTo('Tags');
    await expect.poll(() => submenu('members').inert).toBe(true);
    expect(submenu('posts').inert).toBe(true);

    window.history.back();
    await expect.poll(() => submenu('members').inert).toBe(false);
    expect(submenu('posts').inert).toBe(true);
    expect(preferences.requests).toHaveLength(0);
  });

  it.each([
    { route: '/posts?type=scheduled', section: 'posts', parent: 'Posts', child: 'Scheduled' },
    {
      route: '/members?filter=label%3A%5BVIP%5D',
      section: 'members',
      parent: 'Members',
      child: 'VIPs',
    },
  ] as const)(
    'opens $parent on a direct filtered route and keeps the matching child selected',
    async ({ route, section, parent, child }) => {
      await renderSidebar(route);
      await expect.poll(() => submenu(section).inert).toBe(false);
      await expect.element(sidebarScreen.navLink(child)).toHaveAttribute('aria-current', 'page');
      await expect.element(sidebarScreen.navLink(parent)).not.toHaveAttribute('aria-current');
    },
  );

  it('keeps closing rows visible while immediately removing them from keyboard and accessibility navigation', async () => {
    await renderSidebar('/posts');
    const menu = submenu('posts');
    await expect.poll(() => menu.getBoundingClientRect().height).toBeGreaterThan(0);

    navigateTo('Tags');
    await expect.poll(() => menu.inert).toBe(true);

    expect(menu.querySelectorAll('a').length).toBeGreaterThan(0);
    expect(menu.getBoundingClientRect().height).toBeGreaterThan(0);
    expect(menu).toHaveAttribute('aria-hidden', 'true');
    await expect.poll(() => menu.getBoundingClientRect().height).toBe(0);
  });

  it('reveals entries in order and survives leaving and immediately reopening a section', async () => {
    await renderSidebar('/tags');
    const menu = submenu('posts');
    navigateTo('Posts');
    await expect.poll(() => menu.inert).toBe(false);

    await expect
      .poll(() => {
        const rows = Array.from(menu.querySelectorAll<HTMLElement>('[data-sidebar=menu-item]'));
        if (rows.length < 2) {
          return false;
        }
        return (
          Number(getComputedStyle(rows[0]).opacity) > Number(getComputedStyle(rows.at(-1)!).opacity)
        );
      })
      .toBe(true);

    navigateTo('Tags');
    await expect.poll(() => menu.inert).toBe(true);
    navigateTo('Posts');
    await expect.poll(() => menu.inert).toBe(false);
    await expect
      .poll(() => Array.from(menu.querySelectorAll('a')).every((link) => link.checkVisibility()))
      .toBe(true);
  });
});
