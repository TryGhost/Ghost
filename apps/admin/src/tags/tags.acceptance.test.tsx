import { beforeEach, describe, expect, it } from 'vitest';

import {
  currentRoute,
  fakeAdminEndpoint,
  fakePosts,
  fakePostsListScreen,
  fakeTags,
  fakeAdminStats,
  renderAdminApp,
  tag,
} from '@test-utils/acceptance';
import { tagsScreen } from './tags.screen';

beforeEach(() => {
  fakeAdminStats.memberCount();
  fakeAdminStats.mrr();
});

describe('Tags list', () => {
  it('lists public tags with description and posts count', async () => {
    fakeTags([
      tag({ name: 'News', slug: 'news', description: 'News description', count: { posts: 1 } }),
    ]);
    await renderAdminApp('/tags');

    const row = tagsScreen.tagRows();
    await expect.element(row).toBeVisible();
    await expect.element(row).toHaveTextContent('News');
    await expect.element(row).toHaveTextContent('News description');
    await expect.element(row).toHaveTextContent('1 post');
    await expect.element(tagsScreen.link('News')).toHaveAttribute('href', '#/tags/news');

    // The tabs are a single-select toggle group: role="radio" + aria-checked.
    await expect.element(tagsScreen.publicTab()).toHaveAttribute('aria-checked', 'true');
    await expect.element(tagsScreen.internalTab()).toHaveAttribute('aria-checked', 'false');
  });

  it('lists public and internal tags separately', async () => {
    fakeTags([
      tag({ name: 'Public Tag Name' }),
      tag({ name: 'Other Public Tag Name' }),
      tag({ name: '#Internal Tag Name', visibility: 'internal' }),
    ]);
    await renderAdminApp('/tags');

    await expect.element(tagsScreen.link('Public Tag Name')).toBeVisible();
    await expect(tagsScreen.tagRows()).toHaveCount(2);

    await tagsScreen.internalTab().click();
    await expect.element(tagsScreen.link('#Internal Tag Name')).toBeVisible();
    await expect(tagsScreen.tagRows()).toHaveCount(1);

    await tagsScreen.publicTab().click();
    await expect.element(tagsScreen.link('Public Tag Name')).toBeVisible();
    await expect(tagsScreen.tagRows()).toHaveCount(2);
  });

  it.each([false, true])(
    'preserves tag navigation and gates its outer inset with admin7Design %s',
    async (admin7Design) => {
      const news = tag({ name: 'News', slug: 'news', count: { posts: 1 } });
      fakeTags([news]);
      fakeAdminEndpoint('GET', /^\/tags\/slug\/news\//, { tags: [news] });
      await renderAdminApp('/tags', { labs: { admin7Design } });

      const row = tagsScreen.tagRows();
      await expect.element(row).toBeVisible();
      const firstCell = row.getByRole('cell').elements()[0];
      expect(getComputedStyle(firstCell).paddingLeft).toBe(admin7Design ? '0px' : '16px');
      if (admin7Design) {
        await row.click({ position: { x: -8, y: 12 } });
      } else {
        await tagsScreen.link('News').click();
      }

      await expect.poll(currentRoute).toBe('/tags/news');
    },
  );

  it('keeps the posts count link independent from the tag action', async () => {
    fakePostsListScreen();
    fakePosts([]);
    fakeTags([tag({ name: 'News', slug: 'news', count: { posts: 1 } })]);
    await renderAdminApp('/tags', { labs: { admin7Design: true } });

    await tagsScreen.link('1 post').click();

    await expect.poll(currentRoute).toBe('/posts?tag=news');
  });

  it('shows the empty state with a call to action when there are no tags', async () => {
    fakeTags([]);
    await renderAdminApp('/tags');

    await expect.element(tagsScreen.emptyStateHeading()).toBeVisible();
    await expect.element(tagsScreen.createNewTagLink()).toBeVisible();
    await expect.element(tagsScreen.createNewTagLink()).toHaveAttribute('href', '#/tags/new');
  });

  it('navigates to the new tag editor from the header button', async () => {
    fakeTags([]);
    await renderAdminApp('/tags');

    await expect.element(tagsScreen.newTagLink()).toHaveAttribute('href', '#/tags/new');
    await tagsScreen.newTagLink().click();

    // /tags/new opens the tag detail screen in create mode.
    await expect.poll(currentRoute).toBe('/tags/new');
  });

  it('fetches the next page when scrolling to the end of the list', async () => {
    // 120 tags: the browse page size is 100, so the tail needs a second fetch.
    // Default tag names can repeat; the strict link locators need unique names.
    const tagsApi = fakeTags(tag.many(120, (i) => ({ name: `Tag ${i + 1}` })));
    await renderAdminApp('/tags');

    await expect.element(tagsScreen.link('Tag 1')).toBeVisible();
    expect(tagsApi.lastRequest?.page).toBe(1);

    tagsScreen.scrollListToEnd();

    await expect.poll(() => tagsApi.lastRequest?.page).toBe(2);
    await expect.element(tagsScreen.link('Tag 120')).toBeVisible();
    // Virtualized: only a window of rows is in the DOM at once.
    await expect.poll(() => tagsScreen.tagRows().elements().length).toBeLessThan(120);
  });
});
