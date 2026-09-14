import { describe, expect, it } from 'vitest';
import { userEvent } from 'vitest/browser';
import { buildLexicalParagraph } from '@tryghost/test-data';

import {
  currentUserResponse,
  fakeAdminEndpoint,
  fakeMembers,
  fakeNewsletters,
  fakePosts,
  fakeSnippets,
  fakeTags,
  post,
  renderAdminApp,
  staffRole,
  tag,
  unsavedChangesGuarded,
  type EndpointCapture,
  type StaffRoleName,
} from '@test-utils/acceptance';
import { editorScreen } from '@/editor/editor.screen';

const POST_ID = 'abc123';
const CURRENT_USER_ID = '1';
const FLAG_ON = { labs: { editorReact: true } };
const LOADED_AT = '2026-01-01T00:00:00.000Z';
const PUBLISHED_AT = '2025-12-01T10:00:00.000Z';
const ROUTE = new RegExp(`^/posts/${POST_ID}/\\?`);

// A settings save waits on the engine's queue, so these journeys outlast the default timeout.
const SLOW = 20_000;
const POLL = { timeout: 10_000 };
// Under the 3s autosave debounce, so only an undebounced field save can satisfy it.
const FIELD_POLL = { timeout: 2_000 };

type SavedPost = ReturnType<typeof post>;
type SavedTag = ReturnType<typeof tag>;

const NEWS = tag({ id: 'tag1', name: 'News', slug: 'news', visibility: 'public' });
const SPORT = tag({ id: 'tag2', name: 'Sport', slug: 'sport', visibility: 'public' });
const NOTICE = tag({ id: 'tag3', name: 'Notice', slug: 'notice', visibility: 'public' });
// Same name, different tag: what tells them apart is the id, not what they read as.
const NEWS_2 = tag({ id: 'tag4', name: 'News', slug: 'news-2', visibility: 'public' });
const SITE_TAGS = [NEWS, SPORT, NOTICE, NEWS_2];

function submittedPost(capture: EndpointCapture): Record<string, unknown> {
  const body = capture.lastRequest?.body as { posts: Record<string, unknown>[] } | undefined;
  return body?.posts[0] ?? {};
}

function submittedTags(capture: EndpointCapture): Array<Record<string, unknown>> {
  return (submittedPost(capture).tags ?? []) as Array<Record<string, unknown>>;
}

function editorChrome() {
  fakeSnippets([]);
  fakePosts([]);
  fakeMembers([]);
  fakeNewsletters([]);
  fakeAdminEndpoint('GET', /^\/slugs\/post\//, ({ url }) => ({
    slugs: [{ slug: decodeURIComponent(url.split('/slugs/post/')[1].split('/')[0]) }],
  }));
}

/**
 * A post whose saves answer the way Ghost does, including the tag relation: a
 * tag submitted by name alone comes back saved with an id, and one submitted by
 * id comes back as the whole record the site holds for it.
 */
function fakeTaggablePost(overrides: Partial<SavedPost> = {}, siteTags: SavedTag[] = SITE_TAGS) {
  editorChrome();
  let current = post({
    id: POST_ID,
    title: 'Hello from React',
    slug: 'hello-from-react',
    status: 'draft',
    lexical: buildLexicalParagraph('Hello from React'),
    updated_at: LOADED_AT,
    published_at: null,
    featured: false,
    custom_excerpt: null,
    tags: [],
    ...overrides,
  });
  let saves = 0;

  fakeAdminEndpoint('GET', ROUTE, () => ({ posts: [current] }));

  const saveApi = fakeAdminEndpoint('PUT', ROUTE, ({ body }) => {
    saves += 1;
    const submitted = (body as { posts: Partial<SavedPost>[] }).posts[0];
    const tags = (submitted.tags ?? current.tags ?? []).map((submittedTag) =>
      submittedTag.id
        ? (siteTags.find((known) => known.id === submittedTag.id) ?? submittedTag)
        : tag({ id: `made-${submittedTag.name}`, name: submittedTag.name }),
    );
    current = {
      ...current,
      ...submitted,
      tags,
      updated_at: `2026-01-01T00:00:0${saves}.000Z`,
    };
    return { posts: [current] };
  });

  return {
    saveApi,
    /** Someone else adds a tag to the post between this editor's reads. */
    addTagElsewhere: (added: SavedTag) => {
      current = { ...current, tags: [...(current.tags ?? []), added] };
    },
  };
}

function asRole(name: StaffRoleName) {
  const me = currentUserResponse();
  me.users[0].roles = [staffRole({ name })];
  return { ...FLAG_ON, boot: { browseMe: { response: me } } };
}

async function openSidebar() {
  await editorScreen.settingsToggle().click();
  await expect.element(editorScreen.settingsSidebar()).toBeVisible();
}

async function openTagList() {
  await editorScreen.settingsTagsInput().click();
}

/**
 * The Tags section: what the writer picks becomes the post's tag relation, in
 * the order shown, through the same save policy as every other settings field.
 */
describe('Post settings tags', () => {
  it(
    'adds an existing tag to a draft and saves the relation in order',
    async () => {
      const { saveApi } = fakeTaggablePost({ tags: [NEWS] });
      const tagsApi = fakeTags([NEWS, SPORT]);
      await renderAdminApp(`/editor/post/${POST_ID}`, FLAG_ON);
      await openSidebar();
      await openTagList();

      // No row shows a post count, so the read does not ask for the join.
      await expect.poll(() => tagsApi.lastRequest?.url, POLL).not.toContain('count.posts');

      await editorScreen.settingsTagOption('Sport').click();

      await expect.poll(() => saveApi.requests.length, FIELD_POLL).toBe(1);
      // Identity only, the tag already on the post included. Order is `sort_order`.
      expect(submittedTags(saveApi)).toEqual([{ id: 'tag1' }, { id: 'tag2' }]);
    },
    SLOW,
  );

  it(
    'sends a tag the post was read with by id, leaving a rename elsewhere standing',
    async () => {
      const renamed = tag({ id: 'tag1', name: 'Breaking News', slug: 'news' });
      const { saveApi } = fakeTaggablePost({ tags: [NEWS] }, [renamed, SPORT]);
      fakeTags([renamed, SPORT]);
      await renderAdminApp(`/editor/post/${POST_ID}`, FLAG_ON);
      await openSidebar();
      await openTagList();

      await editorScreen.settingsTagOption('Sport').click();

      await expect.poll(() => saveApi.requests.length, FIELD_POLL).toBe(1);
      // A name in the payload is written onto the tag row, reverting the rename.
      expect(submittedTags(saveApi)[0]).toEqual({ id: 'tag1' });
      await expect.element(editorScreen.settingsTagsField()).toHaveTextContent('Breaking News');
    },
    SLOW,
  );

  it(
    'reads a tag swapped for a same-named one as a change',
    async () => {
      const { saveApi } = fakeTaggablePost({
        status: 'published',
        published_at: PUBLISHED_AT,
        tags: [NEWS],
      });
      fakeTags([NEWS, NEWS_2]);
      await renderAdminApp(`/editor/post/${POST_ID}`, FLAG_ON);
      await openSidebar();

      await editorScreen.removeSettingsTag('News').click();
      await openTagList();
      await editorScreen.settingsTagOption(/news-2/).click();

      await expect.element(editorScreen.updateButton()).toBeEnabled();
      await expect.poll(unsavedChangesGuarded).toBe(true);

      await userEvent.keyboard('{Meta>}s{/Meta}');

      await expect.poll(() => saveApi.requests.length, POLL).toBe(1);
      expect(submittedTags(saveApi)).toEqual([{ id: 'tag4' }]);
    },
    SLOW,
  );

  it(
    'creates a tag from a typed name through the post’s own save',
    async () => {
      const { saveApi } = fakeTaggablePost();
      fakeTags([NEWS]);
      const tagsApi = fakeAdminEndpoint('POST', '/tags/', { tags: [] });
      await renderAdminApp(`/editor/post/${POST_ID}`, FLAG_ON);
      await openSidebar();
      await openTagList();

      await editorScreen.settingsTagsInput().fill('Culture');
      await editorScreen.settingsTagOption('Create “Culture”').click();

      await expect.poll(() => saveApi.requests.length, POLL).toBe(1);
      // Named, not created first: an abandoned edit leaves no stray tag behind.
      expect(submittedTags(saveApi)).toEqual([{ name: 'Culture' }]);
      expect(tagsApi.requests).toHaveLength(0);
      await expect.element(editorScreen.settingsTagsField()).toHaveTextContent('Culture');
    },
    SLOW,
  );

  it(
    'drops an uncommitted term when the list closes',
    async () => {
      fakeTaggablePost();
      fakeTags([NEWS]);
      await renderAdminApp(`/editor/post/${POST_ID}`, FLAG_ON);
      await openSidebar();
      await openTagList();

      await editorScreen.settingsTagsInput().fill('Culture');
      await editorScreen.titleInput().click();

      // Left behind, the term reads as an edit nothing will ever commit.
      await expect.element(editorScreen.settingsTagsInput()).toHaveValue('');
    },
    SLOW,
  );

  it(
    'drops an uncommitted term when leaving the field after Escape',
    async () => {
      const { saveApi } = fakeTaggablePost();
      fakeTags([NEWS]);
      await renderAdminApp(`/editor/post/${POST_ID}`, FLAG_ON);
      await openSidebar();
      await openTagList();

      await editorScreen.settingsTagsInput().fill('Culture');
      await userEvent.keyboard('{Escape}');
      await expect.element(editorScreen.settingsTagsInput()).toHaveValue('Culture');
      await editorScreen.titleInput().click();

      await expect.element(editorScreen.settingsTagsInput()).toHaveValue('');
      expect(saveApi.requests).toHaveLength(0);
    },
    SLOW,
  );

  it(
    'commits the highlighted row on Tab, comma and all',
    async () => {
      const { saveApi } = fakeTaggablePost();
      fakeTags([NEWS]);
      await renderAdminApp(`/editor/post/${POST_ID}`, FLAG_ON);
      await openSidebar();
      await openTagList();

      // A comma is an ordinary character in a tag name, not a separator.
      await editorScreen.settingsTagsInput().fill('Arts, Culture');
      await expect.element(editorScreen.settingsTagOption(/Create/)).toBeVisible();
      await userEvent.keyboard('{Tab}');

      await expect.poll(() => saveApi.requests.length, POLL).toBe(1);
      expect(submittedTags(saveApi)).toEqual([{ name: 'Arts, Culture' }]);
    },
    SLOW,
  );

  it(
    'lets Tab out of an empty field without taking a tag',
    async () => {
      fakeTaggablePost();
      fakeTags([NEWS]);
      await renderAdminApp(`/editor/post/${POST_ID}`, FLAG_ON);
      await openSidebar();
      await openTagList();
      await expect.element(editorScreen.settingsTagOption('News')).toBeVisible();

      await userEvent.keyboard('{Tab}');

      // Nothing was typed, so there is nothing to commit and nothing to lose.
      await expect(editorScreen.settingsTagsTokens()).toHaveCount(0);
      await expect.element(editorScreen.settingsTagsInput()).not.toHaveFocus();
      await expect
        .element(editorScreen.settingsTagsInput())
        .toHaveAttribute('aria-expanded', 'false');
    },
    SLOW,
  );

  it(
    'points the field at the row the keyboard is on',
    async () => {
      fakeTaggablePost();
      fakeTags([NEWS, SPORT]);
      await renderAdminApp(`/editor/post/${POST_ID}`, FLAG_ON);
      await openSidebar();
      await openTagList();
      await expect.element(editorScreen.settingsTagOption('News')).toBeVisible();

      await userEvent.keyboard('{ArrowDown}');

      await expect
        .poll(() => {
          const active = editorScreen
            .settingsTagsInput()
            .element()
            .getAttribute('aria-activedescendant');
          return active ? document.getElementById(active)?.textContent : null;
        }, POLL)
        .toContain('Sport');
    },
    SLOW,
  );

  it(
    'takes the row under the highlight after a pick has shortened the list',
    async () => {
      fakeTaggablePost();
      fakeTags([NEWS, SPORT]);
      await renderAdminApp(`/editor/post/${POST_ID}`, FLAG_ON);
      await openSidebar();
      await openTagList();
      await expect.element(editorScreen.settingsTagOption('Sport')).toBeVisible();

      // The last row: taking it leaves one fewer row than the highlight points at.
      await userEvent.keyboard('{ArrowDown}{Enter}');
      await expect(editorScreen.settingsTagOption('Sport')).toHaveCount(0);
      await userEvent.keyboard('{Enter}');

      // Two chips: the second Enter took the row it was on, not nothing.
      await expect(editorScreen.settingsTagsTokens()).toHaveCount(2);
    },
    SLOW,
  );

  it(
    'removes a tag and saves what is left',
    async () => {
      const { saveApi } = fakeTaggablePost({ tags: [NEWS, SPORT] });
      fakeTags([NEWS, SPORT]);
      await renderAdminApp(`/editor/post/${POST_ID}`, FLAG_ON);
      await openSidebar();

      await editorScreen.removeSettingsTag('News').click();

      await expect.poll(() => saveApi.requests.length, FIELD_POLL).toBe(1);
      expect(submittedTags(saveApi)).toEqual([{ id: 'tag2' }]);
    },
    SLOW,
  );

  it(
    'stages a published post’s tags until Update',
    async () => {
      const { saveApi } = fakeTaggablePost({ status: 'published', published_at: PUBLISHED_AT });
      fakeTags([NEWS]);
      await renderAdminApp(`/editor/post/${POST_ID}`, FLAG_ON);
      await openSidebar();
      await openTagList();

      await expect.element(editorScreen.updateButton()).toBeDisabled();

      await editorScreen.settingsTagOption('News').click();

      await expect.element(editorScreen.updateButton()).toBeEnabled();
      await expect.poll(unsavedChangesGuarded).toBe(true);
      expect(saveApi.requests).toHaveLength(0);

      await userEvent.keyboard('{Meta>}s{/Meta}');

      await expect.poll(() => saveApi.requests.length, POLL).toBe(1);
      expect(submittedTags(saveApi)).toEqual([{ id: 'tag1' }]);
      expect(submittedPost(saveApi)).toMatchObject({ status: 'published' });
    },
    SLOW,
  );

  it(
    'adopts a tag added elsewhere while the writer has not touched tags',
    async () => {
      const { saveApi, addTagElsewhere } = fakeTaggablePost({ tags: [NEWS] });
      fakeTags([NEWS, NOTICE]);
      await renderAdminApp(`/editor/post/${POST_ID}`, FLAG_ON);
      await openSidebar();

      addTagElsewhere(NOTICE);

      // Any save refetches the post; the writer's own field is the excerpt here.
      await editorScreen.settingsExcerpt().fill('From the sidebar');
      await editorScreen.titleInput().click();

      await expect.poll(() => saveApi.requests.length, POLL).toBe(1);
      // Untouched, so it was never in the payload — and the server's copy wins.
      expect(submittedPost(saveApi)).not.toHaveProperty('tags');
      await expect.element(editorScreen.settingsTagsField()).toHaveTextContent('Notice');
    },
    SLOW,
  );

  it(
    'leaves the Tags section out for a contributor',
    async () => {
      // A contributor may only open a draft they authored.
      fakeTaggablePost({ authors: [{ id: CURRENT_USER_ID }] });
      fakeTags([NEWS]);
      await renderAdminApp(`/editor/post/${POST_ID}`, asRole('Contributor'));
      await openSidebar();

      await expect(editorScreen.settingsTagsField()).toHaveCount(0);
    },
    SLOW,
  );
});
