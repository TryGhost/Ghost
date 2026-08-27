import { beforeEach, describe, expect, it } from 'vitest';
import { userEvent } from 'vitest/browser';

import {
  fakeAdminEndpoint,
  fakePosts,
  fakePostsListScreen,
  fakeTags,
  fakeTiers,
  post,
  renderAdminApp,
  tag,
} from '@test-utils/acceptance';
import { postsListScreen } from './posts-list.screen';

const FLAG_ON = { labs: { postsListReact: true } };

/**
 * Bulk actions send an NQL *filter*, never a list of ids — that is what lets
 * Cmd+A cover posts that were never loaded. These tests assert the outgoing
 * request, because the filter string is the thing with the blast radius: it is
 * appended straight to `DELETE /posts/?filter=`.
 */
describe('Posts list bulk actions', () => {
  beforeEach(() => {
    fakePostsListScreen();
  });

  it('deletes one post by id, not by the list filter', async () => {
    const target = post({ title: 'Doomed', status: 'published' });
    fakePosts([target]);
    const deletion = fakeAdminEndpoint('DELETE', /^\/posts\//, {});
    await renderAdminApp('/posts?type=published', FLAG_ON);
    await expect.element(postsListScreen.listItems().first()).toBeVisible();

    await postsListScreen.listItems().first().click({ button: 'right' });
    await postsListScreen.contextMenuItem('Delete').click();
    await postsListScreen.confirmButton('Delete').click();

    await expect.poll(() => deletion.requests.length).toBe(1);
    expect(new URL(deletion.requests[0].url).searchParams.get('filter')).toBe(
      `id:['${target.id}']`,
    );
  });

  /**
   * The reason selection is inverted rather than enumerated. On a site with
   * thousands of posts, Cmd+A then Delete must send the *filter* — enumerating
   * ids would silently spare every post that had not been scrolled into view,
   * and would build a URL long enough to be rejected outright.
   */
  it('deletes everything matching the filter after Cmd+A, not the loaded ids', async () => {
    fakePosts([
      post({ title: 'First', status: 'published' }),
      post({ title: 'Second', status: 'published' }),
    ]);
    const deletion = fakeAdminEndpoint('DELETE', /^\/posts\//, {});
    await renderAdminApp('/posts?type=published', FLAG_ON);
    await expect.element(postsListScreen.listItems().nth(1)).toBeVisible();

    await userEvent.keyboard('{Meta>}a{/Meta}');
    await postsListScreen.listItems().first().click({ button: 'right' });
    await postsListScreen.contextMenuItem('Delete').click();
    await postsListScreen.confirmButton('Delete').click();

    await expect.poll(() => deletion.requests.length).toBe(1);
    const filter = new URL(deletion.requests[0].url).searchParams.get('filter');
    expect(filter).toBe('status:published');
    expect(filter).not.toContain('id:');
  });

  // Cmd+A minus a few is the shape that most easily goes wrong: it has to
  // subtract the deselected ids from the list filter, parenthesised.
  it('subtracts deselected posts from the filter', async () => {
    const spared = post({ title: 'Spared', status: 'published' });
    fakePosts([post({ title: 'First', status: 'published' }), spared]);
    const deletion = fakeAdminEndpoint('DELETE', /^\/posts\//, {});
    await renderAdminApp('/posts?type=published', FLAG_ON);
    await expect.element(postsListScreen.listItems().nth(1)).toBeVisible();

    await userEvent.keyboard('{Meta>}a{/Meta}');
    await postsListScreen
      .listItems()
      .nth(1)
      .click({ modifiers: ['Meta'] });
    await postsListScreen.listItems().first().click({ button: 'right' });
    await postsListScreen.contextMenuItem('Delete').click();
    await postsListScreen.confirmButton('Delete').click();

    await expect.poll(() => deletion.requests.length).toBe(1);
    expect(new URL(deletion.requests[0].url).searchParams.get('filter')).toBe(
      `(status:published)+id:-['${spared.id}']`,
    );
  });

  /**
   * The client-side prune. Unpublishing a post while viewing `?type=published`
   * takes it out of the list straight away — no refetch, no lost scroll
   * position — because NQL is re-run in the browser against the list's own
   * filter. See prune-non-matching-posts.ts.
   *
   * `type=published` rather than `type=featured` deliberately: featured fans
   * out across all four status buckets, and the fakes don't implement NQL, so
   * every bucket would serve the same rows and the counts would be fiction.
   */
  describe('pruning after an edit', () => {
    it('removes an unpublished post from a published-only view', async () => {
      fakePosts([
        post({ title: 'Live one', status: 'published' }),
        post({ title: 'Live two', status: 'published' }),
      ]);
      fakeAdminEndpoint('PUT', /^\/posts\/bulk/, {});
      await renderAdminApp('/posts?type=published', FLAG_ON);
      await expect.element(postsListScreen.listItems().nth(1)).toBeVisible();

      await postsListScreen.listItems().first().click({ button: 'right' });
      await postsListScreen.contextMenuItem('Unpublish').click();
      await postsListScreen.confirmButton('Unpublish').click();

      await expect(postsListScreen.listItems()).toHaveCount(1);
      await expect.element(postsListScreen.listItems().first()).toHaveTextContent('Live two');
    });

    /**
     * The unfiltered list shows every status, so the *list-wide* filter
     * still matches an unpublished row — it is the published *bucket's*
     * filter the row no longer satisfies. Pruning against the wrong one
     * left the row sitting in the published section labelled Draft.
     */
    it('moves an unpublished post out of the published bucket on the unfiltered list', async () => {
      fakePosts(({ filter }) => {
        if (filter?.includes('status:draft')) {
          return [post({ title: 'Existing draft', status: 'draft', featured: false })];
        }
        if (filter?.includes('status:scheduled')) {
          return [];
        }
        return [post({ title: 'Was published', status: 'published', featured: false })];
      });
      fakeAdminEndpoint('PUT', /^\/posts\/bulk/, {});
      await renderAdminApp('/posts', FLAG_ON);
      await expect.element(postsListScreen.listItems().nth(1)).toBeVisible();

      await postsListScreen.listItems().nth(1).click({ button: 'right' });
      await postsListScreen.contextMenuItem('Unpublish').click();
      await postsListScreen.confirmButton('Unpublish').click();

      await expect(postsListScreen.listItems()).toHaveCount(1);
      await expect.element(postsListScreen.listItems().first()).toHaveTextContent('Existing draft');
    });

    // The rule with the worst failure mode: an edit must never remove rows
    // it did not touch, however the filter reads.
    it('leaves the posts it did not edit alone', async () => {
      fakePosts([
        post({ title: 'Edited', status: 'published' }),
        // Already a draft, so it does not match `status:published`
        // either — but the action never touched it, so it stays.
        post({ title: 'Untouched', status: 'draft' }),
      ]);
      fakeAdminEndpoint('PUT', /^\/posts\/bulk/, {});
      await renderAdminApp('/posts?type=published', FLAG_ON);
      await expect.element(postsListScreen.listItems().nth(1)).toBeVisible();

      await postsListScreen.listItems().first().click({ button: 'right' });
      await postsListScreen.contextMenuItem('Unpublish').click();
      await postsListScreen.confirmButton('Unpublish').click();

      await expect(postsListScreen.listItems()).toHaveCount(1);
      await expect.element(postsListScreen.listItems().first()).toHaveTextContent('Untouched');
    });
  });

  /**
   * The edit path had no request assertions at all, so a typo in the action
   * verb — `feature` for `unfeature`, say — would pass every other test in
   * this file, because the prune tests are satisfied entirely by the local
   * edit and never look at what was sent.
   */
  describe('the outgoing bulk edit', () => {
    it.each([
      { label: 'Unpublish', verb: 'unpublish', type: 'published', confirm: true },
      { label: 'Unschedule', verb: 'unschedule', type: 'scheduled', confirm: true },
      { label: 'Feature', verb: 'feature', type: 'draft', confirm: false },
    ] as const)('sends $verb', async ({ label, verb, type, confirm }) => {
      // `featured` is randomised by the builder, and it decides whether
      // the menu offers Feature or Unfeature — pin it, or this test is
      // flaky by construction.
      fakePosts([post({ title: 'Target', status: type, featured: false })]);
      const edit = fakeAdminEndpoint('PUT', /^\/posts\/bulk/, {});
      await renderAdminApp(`/posts?type=${type}`, FLAG_ON);
      await expect.element(postsListScreen.listItems().first()).toBeVisible();

      await postsListScreen.listItems().first().click({ button: 'right' });
      await postsListScreen.contextMenuItem(label).click();

      if (confirm) {
        await postsListScreen.confirmButton(label).click();
      }

      await expect.poll(() => edit.requests.length).toBe(1);
      expect(edit.requests[0].body).toEqual({ bulk: { action: verb, meta: {} } });
    });

    it('sends the chosen tags for Add a tag', async () => {
      fakePosts([post({ title: 'Target', status: 'draft' })]);
      fakeTags([tag({ id: 't1', name: 'News', slug: 'news' })]);
      const edit = fakeAdminEndpoint('PUT', /^\/posts\/bulk/, {});
      await renderAdminApp('/posts?type=draft', FLAG_ON);
      await expect.element(postsListScreen.listItems().first()).toBeVisible();

      await postsListScreen.listItems().first().click({ button: 'right' });
      await postsListScreen.contextMenuItem('Add a tag').click();
      await postsListScreen.tagPickerField().click();
      await postsListScreen.tagOption('News').click();
      // The list floats over the dialog's footer, so it has to be
      // dismissed before the confirm button can be reached — clicking
      // outside it, as a user would.
      await postsListScreen.dialogHeading('Add tags').click();
      await postsListScreen.dialogButton('Add').click();

      await expect.poll(() => edit.requests.length).toBe(1);
      expect(edit.requests[0].body).toEqual({
        bulk: { action: 'addTag', meta: { tags: [{ id: 't1', name: 'News', slug: 'news' }] } },
      });
    });

    /**
     * The dialog can only add, so it shows only what you are adding. An
     * earlier version listed the post's existing tags ticked and disabled,
     * which read as a set you could edit while offering no way to untick
     * one.
     */
    it('does not offer the tags a post already has', async () => {
      fakePosts([
        post({
          title: 'Target',
          status: 'draft',
          tags: [tag({ id: 't1', name: 'News', slug: 'news' })],
        }),
      ]);
      fakeTags([tag({ id: 't1', name: 'News', slug: 'news' })]);
      await renderAdminApp('/posts?type=draft', FLAG_ON);
      await expect.element(postsListScreen.listItems().first()).toBeVisible();

      await postsListScreen.listItems().first().click({ button: 'right' });
      await postsListScreen.contextMenuItem('Add a tag').click();
      await postsListScreen.tagPickerField().click();

      // Present to pick, but nothing is pre-selected: no chip, and the
      // confirm button stays disabled until you choose something.
      await expect.element(postsListScreen.tagOption('News')).toBeVisible();
      await expect.element(postsListScreen.dialogButton('Add')).toBeDisabled();
    });

    // Ember allows creating a tag inline; the server creates one from a
    // name it does not recognise, so no id is sent.
    it('sends a typed tag that does not exist yet', async () => {
      fakePosts([post({ title: 'Target', status: 'draft' })]);
      fakeTags([]);
      const edit = fakeAdminEndpoint('PUT', /^\/posts\/bulk/, {});
      await renderAdminApp('/posts?type=draft', FLAG_ON);
      await expect.element(postsListScreen.listItems().first()).toBeVisible();

      await postsListScreen.listItems().first().click({ button: 'right' });
      await postsListScreen.contextMenuItem('Add a tag').click();
      await postsListScreen.tagSearchInput().fill('Fresh tag');
      await postsListScreen.tagOption(/Create/).click();
      await postsListScreen.dialogHeading('Add tags').click();
      await postsListScreen.dialogButton('Add').click();

      await expect.poll(() => edit.requests.length).toBe(1);
      expect(edit.requests[0].body).toEqual({
        bulk: { action: 'addTag', meta: { tags: [{ name: 'Fresh tag' }] } },
      });
    });

    it('searches tags on the server before offering creation', async () => {
      const existing = tag({ id: 't1', name: 'C++', slug: 'c-plus-plus' });
      fakePosts([post({ title: 'Target', status: 'draft' })]);
      const tags = fakeTags(({ filter }) => (filter?.includes('tags.name:~') ? [existing] : []));
      await renderAdminApp('/posts?type=draft', FLAG_ON);
      await expect.element(postsListScreen.listItems().first()).toBeVisible();

      await postsListScreen.listItems().first().click({ button: 'right' });
      await postsListScreen.contextMenuItem('Add a tag').click();
      await postsListScreen.tagSearchInput().fill('C++');

      await expect.poll(() => tags.lastRequest?.filter).toContain("tags.name:~'C++'");
      await expect.element(postsListScreen.tagOption('C++')).toBeVisible();
      await expect(postsListScreen.tagOption(/Create/)).toHaveCount(0);
    });

    /**
     * A tag typed here is created server-side as a side effect of the post
     * save, so nothing in the tag cache knows it exists. Without this the
     * new tag is missing from the filter and from this dialog until the
     * browser is refreshed.
     */
    it('refetches tags after creating one', async () => {
      fakePosts([post({ title: 'Target', status: 'draft' })]);
      const tags = fakeTags([]);
      fakeAdminEndpoint('PUT', /^\/posts\/bulk/, {});
      await renderAdminApp('/posts?type=draft', FLAG_ON);
      await expect.element(postsListScreen.listItems().first()).toBeVisible();

      await postsListScreen.listItems().first().click({ button: 'right' });
      await postsListScreen.contextMenuItem('Add a tag').click();
      const before = tags.requests.length;
      await postsListScreen.tagSearchInput().fill('Fresh tag');
      await postsListScreen.tagOption(/Create/).click();
      await postsListScreen.dialogHeading('Add tags').click();
      await postsListScreen.dialogButton('Add').click();

      await expect.poll(() => tags.requests.length).toBeGreaterThan(before);
    });

    /**
     * Names are not unique — a site can carry two tags called "broaf" that
     * differ only by slug. Selection used to compare names, so clicking one
     * ticked both and sent a tag the user had not chosen.
     */
    it('selects only the tag clicked when two share a name', async () => {
      fakePosts([post({ title: 'Target', status: 'draft' })]);
      fakeTags([
        tag({ id: 't1', name: 'broaf', slug: 'broaf' }),
        tag({ id: 't2', name: 'broaf', slug: 'broaf-2' }),
      ]);
      const edit = fakeAdminEndpoint('PUT', /^\/posts\/bulk/, {});
      await renderAdminApp('/posts?type=draft', FLAG_ON);
      await expect.element(postsListScreen.listItems().first()).toBeVisible();

      await postsListScreen.listItems().first().click({ button: 'right' });
      await postsListScreen.contextMenuItem('Add a tag').click();
      await postsListScreen.tagPickerField().click();
      await postsListScreen.tagOption(/broaf-2/).click();
      await postsListScreen.dialogHeading('Add tags').click();
      await postsListScreen.dialogButton('Add').click();

      await expect.poll(() => edit.requests.length).toBe(1);
      expect(edit.requests[0].body).toEqual({
        bulk: { action: 'addTag', meta: { tags: [{ id: 't2', name: 'broaf', slug: 'broaf-2' }] } },
      });
    });

    /**
     * Radix reads Escape as "dismiss the dialog", so the key you press to
     * back out of the open list was also the key that discarded every tag
     * picked so far. It reaches the dialog only when there is nothing to
     * lose.
     */
    it('keeps the dialog open on Escape once a tag is picked', async () => {
      fakePosts([post({ title: 'Target', status: 'draft' })]);
      fakeTags([tag({ id: 't1', name: 'News', slug: 'news' })]);
      await renderAdminApp('/posts?type=draft', FLAG_ON);
      await expect.element(postsListScreen.listItems().first()).toBeVisible();

      await postsListScreen.listItems().first().click({ button: 'right' });
      await postsListScreen.contextMenuItem('Add a tag').click();
      await postsListScreen.tagPickerField().click();
      await postsListScreen.tagOption('News').click();

      await userEvent.keyboard('{Escape}');
      await expect.element(postsListScreen.dialogButton('Add')).toBeVisible();

      await userEvent.keyboard('{Escape}');
      await expect.element(postsListScreen.dialogButton('Add')).toBeVisible();
    });

    it('closes on Escape while the field is still empty', async () => {
      fakePosts([post({ title: 'Target', status: 'draft' })]);
      fakeTags([tag({ id: 't1', name: 'News', slug: 'news' })]);
      await renderAdminApp('/posts?type=draft', FLAG_ON);
      await expect.element(postsListScreen.listItems().first()).toBeVisible();

      await postsListScreen.listItems().first().click({ button: 'right' });
      await postsListScreen.contextMenuItem('Add a tag').click();
      await postsListScreen.tagPickerField().click();

      // First closes the list, second reaches the dialog.
      await userEvent.keyboard('{Escape}');
      await userEvent.keyboard('{Escape}');

      await expect.element(postsListScreen.dialogButton('Add')).not.toBeInTheDocument();
    });

    it('sends the chosen visibility for Change access', async () => {
      fakePosts([post({ title: 'Target', status: 'draft' })]);
      // The modal offers a tier picker once "Specific tier(s)" is chosen.
      fakeTiers([]);
      const edit = fakeAdminEndpoint('PUT', /^\/posts\/bulk/, {});
      await renderAdminApp('/posts?type=draft', FLAG_ON);
      await expect.element(postsListScreen.listItems().first()).toBeVisible();

      await postsListScreen.listItems().first().click({ button: 'right' });
      await postsListScreen.contextMenuItem('Change access').click();
      await postsListScreen.dialogButton('Save').click();

      await expect.poll(() => edit.requests.length).toBe(1);
      expect(edit.requests[0].body).toEqual({
        bulk: { action: 'access', meta: { visibility: 'public', tiers: [] } },
      });
    });
  });
});
