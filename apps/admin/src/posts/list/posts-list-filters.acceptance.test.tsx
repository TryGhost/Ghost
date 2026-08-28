import { beforeEach, describe, expect, it } from 'vitest';

import {
  currentRoute,
  currentUserResponse,
  fakeAdminEndpoint,
  fakePosts,
  fakePostsListScreen,
  post,
  renderAdminApp,
  staffRole,
  staffUser,
  tag,
} from '@test-utils/acceptance';
import { postsListScreen } from './posts-list.screen';
import type { StaffRoleName } from '@tryghost/test-data';

const FLAG_ON = { labs: { postsListReact: true } };

function asRole(name: StaffRoleName) {
  const me = currentUserResponse();
  me.users[0].roles = [staffRole({ name })];
  return { ...FLAG_ON, boot: { browseMe: { response: me } } };
}

/**
 * The filter bar. What matters most is that chips and the URL stay in lockstep:
 * the five params are what sidebar saved views persist, and the Ember screen
 * reads the same ones while both implementations exist.
 */
describe('Posts list filters', () => {
  // The author and tag fields hydrate their selected values as soon as the
  // bar mounts, so both endpoints are probed on every render here.
  beforeEach(() => {
    fakePostsListScreen();
  });

  it('hydrates a chip from the URL', async () => {
    fakePosts([post({ title: 'A draft', status: 'draft' })]);
    await renderAdminApp('/posts?type=draft', FLAG_ON);

    await expect.element(postsListScreen.filterBar()).toBeVisible();
    await expect.element(postsListScreen.filterBar()).toHaveTextContent('Draft posts');
  });

  // The slug-to-name lookup is its own request, and `fakeTags` only declares
  // semantics for `visibility` filters — so declare this one explicitly
  // rather than teaching a fake to run NQL.
  it('resolves a tag slug in the URL to its name', async () => {
    fakePosts([post({ title: 'Tagged', status: 'published' })]);
    fakeAdminEndpoint('GET', /^\/tags\/\?.*slug/, {
      tags: [tag({ name: 'Engineering', slug: 'engineering' })],
    });
    await renderAdminApp('/posts?tag=engineering', FLAG_ON);

    // The URL carries a slug; the chip has to read as the tag's name.
    await expect.element(postsListScreen.filterBar()).toHaveTextContent('Engineering');
  });

  // Isolated behind a slug-matching endpoint like the tag case: `fakeUsers`
  // is passthrough, so serving Ada from the plain browse too would let this
  // pass with hydration removed entirely.
  it('resolves an author slug in the URL to their name', async () => {
    fakePosts([post({ title: 'Authored', status: 'published' })]);
    fakeAdminEndpoint('GET', /^\/users\/\?.*slug/, {
      users: [staffUser({ name: 'Ada Lovelace', slug: 'ada' })],
    });
    await renderAdminApp('/posts?author=ada', FLAG_ON);

    await expect.element(postsListScreen.filterBar()).toHaveTextContent('Ada Lovelace');
  });

  // A saved view can point at a tag that was later renamed or deleted.
  // The chip has to say *something* — without a fallback option Shade shows
  // "Select…", so the filter vanishes from the UI while staying in the URL
  // and the list looks empty for no visible reason.
  it('shows an unknown-value chip rather than an empty one', async () => {
    fakePosts([]);
    fakeAdminEndpoint('GET', /^\/tags\/\?.*slug/, { tags: [] });
    await renderAdminApp('/posts?tag=deleted-tag', FLAG_ON);

    await expect.element(postsListScreen.filterBar()).toHaveTextContent('Unknown tag');
    await expect.element(postsListScreen.filterBar()).not.toHaveTextContent('Select');
    await expect.poll(currentRoute).toBe('/posts?tag=deleted-tag');
  });

  it('shows an unknown-value chip for an unrecognised type', async () => {
    fakePosts([]);
    await renderAdminApp('/posts?type=bogus', FLAG_ON);

    await expect.element(postsListScreen.filterBar()).toHaveTextContent('Unknown type');
    await expect.poll(currentRoute).toBe('/posts?type=bogus');
  });

  // Each field maps to one URL param, which holds one value. Shade defaults
  // to allowing several chips per field, and the serializer keeps the last —
  // so without allowMultiple={false} a user could sit looking at two "Post
  // type" chips while only one of them was in the URL or a saved view.
  it('does not offer a field that already has a chip', async () => {
    fakePosts([]);
    await renderAdminApp('/posts?type=draft', FLAG_ON);

    await postsListScreen.addFilterButton().click();

    await expect.element(postsListScreen.filterFieldOption('Tag')).toBeVisible();
    await expect(postsListScreen.filterFieldOption('Post type')).toHaveCount(0);
  });

  describe('the sort control', () => {
    it('shows the default when no order is set', async () => {
      fakePosts([post({ title: 'One', status: 'published' })]);
      await renderAdminApp('/posts', FLAG_ON);

      await expect.element(postsListScreen.sortButton()).toHaveTextContent('Newest first');
    });

    it('names the order from the URL', async () => {
      fakePosts([post({ title: 'One', status: 'published' })]);
      await renderAdminApp('/posts?order=updated_at+desc', FLAG_ON);

      await expect.element(postsListScreen.sortButton()).toHaveTextContent('Recently updated');
    });

    it('writes the chosen order to the URL', async () => {
      fakePosts([post({ title: 'One', status: 'published' })]);
      await renderAdminApp('/posts', FLAG_ON);

      await postsListScreen.sortButton().click();
      await postsListScreen.sortOption('Oldest first').click();

      await expect.poll(currentRoute).toBe('/posts?order=published_at+asc');
    });

    // "Newest first" is the absence of the param, not a value.
    it('drops the param when returning to the default', async () => {
      fakePosts([post({ title: 'One', status: 'published' })]);
      await renderAdminApp('/posts?order=published_at+asc', FLAG_ON);

      await postsListScreen.sortButton().click();
      await postsListScreen.sortOption('Newest first').click();

      await expect.poll(currentRoute).toBe('/posts');
    });

    it('leaves the filters alone when the sort changes', async () => {
      fakePosts([post({ title: 'One', status: 'draft' })]);
      await renderAdminApp('/posts?type=draft', FLAG_ON);

      await postsListScreen.sortButton().click();
      await postsListScreen.sortOption('Oldest first').click();

      await expect.poll(currentRoute).toBe('/posts?type=draft&order=published_at+asc');
    });
  });

  // Ember hides these for roles that can only see their own posts.
  describe('role restrictions', () => {
    it('offers only the type filter to a contributor', async () => {
      fakePosts([]);
      await renderAdminApp('/posts', asRole('Contributor'));

      await postsListScreen.addFilterButton().click();

      await expect.element(postsListScreen.filterFieldOption('Post type')).toBeVisible();
      await expect(postsListScreen.filterFieldOption('Author')).toHaveCount(0);
      await expect(postsListScreen.filterFieldOption('Access')).toHaveCount(0);
      await expect(postsListScreen.filterFieldOption('Tag')).toHaveCount(0);
    });

    it('hides the author filter from an author', async () => {
      fakePosts([]);
      await renderAdminApp('/posts', asRole('Author'));

      await postsListScreen.addFilterButton().click();

      await expect.element(postsListScreen.filterFieldOption('Tag')).toBeVisible();
      await expect(postsListScreen.filterFieldOption('Author')).toHaveCount(0);
    });

    it('offers all four to an administrator', async () => {
      fakePosts([]);
      await renderAdminApp('/posts', asRole('Administrator'));

      await postsListScreen.addFilterButton().click();

      await expect.element(postsListScreen.filterFieldOption('Post type')).toBeVisible();
      await expect.element(postsListScreen.filterFieldOption('Access')).toBeVisible();
      await expect.element(postsListScreen.filterFieldOption('Author')).toBeVisible();
      await expect.element(postsListScreen.filterFieldOption('Tag')).toBeVisible();
    });
  });
});
