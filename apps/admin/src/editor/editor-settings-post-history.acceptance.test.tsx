import { describe, expect, it } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { buildLexicalParagraph } from '@tryghost/test-data';
import {
  postHistoryLatestText,
  postHistoryPublishedText,
  postHistoryUnpublishedText,
} from '@tryghost/test-data/selectors/editor';

import {
  fakeAdminEndpoint,
  fakeEditorChrome,
  fakeEditorPost,
  fakeTiers,
  post,
  postRevision,
  renderAdminApp,
  settingsResponse,
  staffUser,
  submittedPost,
} from '@test-utils/acceptance';
import { editorScreen } from '@/editor/editor.screen';
import { deferred } from '@/utils/deferred';

const POST_ID = 'abc123';
const FLAG_ON = { labs: { editorReact: true } };
const LOADED_AT = '2026-01-01T00:00:00.000Z';
const PUBLISHED_AT = '2025-12-01T10:00:00.000Z';
const ROUTE = new RegExp(`^/posts/${POST_ID}/\\?`);

// A restore waits on the engine's save queue behind a second Koenig instance.
const SLOW = 30_000;
const POLL = { timeout: 15_000 };

type SavedPost = ReturnType<typeof post>;

const ADA = staffUser({ name: 'Ada Lovelace' });
const GRACE = staffUser({ name: 'Grace Hopper' });

const OLDEST = postRevision({
  id: 'rev-oldest',
  title: 'The first draft',
  lexical: buildLexicalParagraph('The very first words'),
  custom_excerpt: 'The first summary',
  post_status: 'draft',
  created_at: '2026-02-01T09:00:00.000Z',
  author: { id: ADA.id, name: ADA.name },
});
const MIDDLE = postRevision({
  id: 'rev-middle',
  title: 'Published at last',
  lexical: buildLexicalParagraph('The published words'),
  feature_image: 'https://images.example.org/middle.jpg',
  feature_image_alt: 'A middle image',
  post_status: 'published',
  created_at: '2026-02-02T09:00:00.000Z',
  author: { id: GRACE.id, name: GRACE.name },
});
const NEWEST = postRevision({
  id: 'rev-newest',
  title: 'Hello from React',
  lexical: buildLexicalParagraph('Hello from React'),
  post_status: 'draft',
  reason: 'unpublished',
  created_at: '2026-02-03T09:00:00.000Z',
  author: null,
});

// Written before a revision carried a title or an excerpt of its own.
const BARE = postRevision({
  id: 'rev-bare',
  title: null,
  custom_excerpt: null,
  lexical: buildLexicalParagraph('The bare words'),
  post_status: 'draft',
  created_at: '2026-01-15T09:00:00.000Z',
  author: { id: ADA.id, name: ADA.name },
});

// Deliberately out of order: the list is the component's to sort.
const REVISIONS = [MIDDLE, NEWEST, OLDEST];

function editorChrome() {
  fakeEditorChrome();
  fakeTiers([]);
  fakeAdminEndpoint('GET', /^\/slugs\/post\//, ({ url }) => ({
    slugs: [{ slug: decodeURIComponent(url.split('/slugs/post/')[1].split('/')[0]) }],
  }));
}

function savedPost(overrides: Partial<SavedPost> = {}): SavedPost {
  return post({
    id: POST_ID,
    title: 'Hello from React',
    slug: 'hello-from-react',
    status: 'draft',
    lexical: buildLexicalParagraph('Hello from React'),
    custom_excerpt: 'The summary as it stands',
    updated_at: LOADED_AT,
    published_at: null,
    post_revisions: REVISIONS,
    tags: [],
    tiers: [],
    ...overrides,
  });
}

/** A post that answers saves the way Ghost does: submitted fields back, fresh token. */
function fakeSavablePost(overrides: Partial<SavedPost> = {}) {
  editorChrome();
  return fakeEditorPost(savedPost(overrides));
}

/** The same post, but every save is refused. */
function fakeUnsavablePost() {
  editorChrome();
  fakeAdminEndpoint('GET', ROUTE, () => ({ posts: [savedPost()] }));

  return fakeAdminEndpoint(
    'PUT',
    ROUTE,
    { errors: [{ type: 'InternalServerError', message: 'Saving failed.' }] },
    { status: 500 },
  );
}

async function openSidebar() {
  await editorScreen.settingsToggle().click();
  await expect.element(editorScreen.settingsSidebar()).toBeVisible();
}

async function openHistory() {
  await openSidebar();
  await editorScreen.settingsPostHistory().click();
  await expect.element(editorScreen.postHistoryModal()).toBeVisible();
}

/** The sidebar's Post history row and the versions it opens. */
describe('Post settings post history', () => {
  it.each([null, {}, [null], [{ title: 42 }]])(
    'keeps the editor usable when the API returns malformed history %j',
    async (postRevisions) => {
      editorChrome();
      fakeAdminEndpoint('GET', ROUTE, {
        posts: [{ ...savedPost(), post_revisions: postRevisions }],
      });
      await renderAdminApp(`/editor/post/${POST_ID}`, FLAG_ON);
      await openHistory();

      await expect
        .element(editorScreen.postHistoryPreview())
        .toHaveTextContent('This post has no saved versions yet.');
      await userEvent.keyboard('{Escape}');
      await expect.element(editorScreen.titleInput()).toHaveValue('Hello from React');
    },
    SLOW,
  );

  it(
    'leaves the row out until the post has been saved',
    async () => {
      editorChrome();
      fakeAdminEndpoint('POST', /^\/posts\/\?/, { posts: [post({ id: 'new123' })] });
      await renderAdminApp('/editor/post', FLAG_ON);
      await openSidebar();

      await expect(editorScreen.settingsPostHistory()).toHaveCount(0);
    },
    SLOW,
  );

  it(
    'leaves the row out for a post with no lexical content',
    async () => {
      fakeSavablePost({ lexical: null, mobiledoc: null, post_revisions: [] });
      await renderAdminApp(`/editor/post/${POST_ID}`, FLAG_ON);
      await openSidebar();

      await expect(editorScreen.settingsPostHistory()).toHaveCount(0);
    },
    SLOW,
  );

  it(
    'leaves the row out for a published post that only went out as an email',
    async () => {
      fakeSavablePost({ status: 'published', published_at: PUBLISHED_AT, email_only: true });
      await renderAdminApp(`/editor/post/${POST_ID}`, FLAG_ON);
      await openSidebar();

      await expect(editorScreen.settingsPostHistory()).toHaveCount(0);
    },
    SLOW,
  );

  it(
    'offers the row for a published post that also has a web version',
    async () => {
      fakeSavablePost({ status: 'published', published_at: PUBLISHED_AT, email_only: false });
      await renderAdminApp(`/editor/post/${POST_ID}`, FLAG_ON);
      await openSidebar();

      await expect.element(editorScreen.settingsPostHistory()).toBeVisible();
    },
    SLOW,
  );

  it(
    'lists a draft’s versions newest first, with their labels and authors',
    async () => {
      fakeSavablePost();
      await renderAdminApp(`/editor/post/${POST_ID}`, {
        ...FLAG_ON,
        boot: {
          browseSettings: { response: settingsResponse({ settings: { timezone: 'Etc/UTC' } }) },
        },
      });
      await openHistory();

      await expect(editorScreen.postHistoryRevisions()).toHaveCount(3);

      // The newest is selected on open and cannot be restored onto itself.
      await expect
        .element(editorScreen.postHistoryRevision(0))
        .toHaveTextContent('3 Feb 2026, 09:00');
      await expect
        .element(editorScreen.postHistoryRevision(0))
        .toHaveTextContent(postHistoryLatestText);
      // The newest version was written by an unpublish, so it carries both labels.
      await expect
        .element(editorScreen.postHistoryRevision(0))
        .toHaveTextContent(postHistoryUnpublishedText);
      await expect
        .element(editorScreen.postHistoryRevision(0))
        .toHaveTextContent('Deleted staff user');
      await expect(editorScreen.postHistoryRevision(0).restore()).toHaveCount(0);

      // The version that first took the post to published carries that label.
      await expect
        .element(editorScreen.postHistoryRevision(1))
        .toHaveTextContent(postHistoryPublishedText);
      await expect.element(editorScreen.postHistoryRevision(1)).toHaveTextContent('Grace Hopper');

      await expect.element(editorScreen.postHistoryRevision(2)).toHaveTextContent('Ada Lovelace');
      await expect
        .element(editorScreen.postHistoryRevision(2))
        .toHaveTextContent('1 Feb 2026, 09:00');
    },
    SLOW,
  );

  it(
    'previews the version the writer selects',
    async () => {
      fakeSavablePost();
      await renderAdminApp(`/editor/post/${POST_ID}`, FLAG_ON);
      await openHistory();

      await expect
        .element(editorScreen.postHistoryPreviewTitle())
        .toHaveTextContent('Hello from React');
      await expect
        .element(editorScreen.postHistoryPreviewBody(), POLL)
        .toHaveTextContent('Hello from React');

      await editorScreen.postHistoryRevision(2).select().click();

      await expect
        .element(editorScreen.postHistoryPreviewTitle())
        .toHaveTextContent('The first draft');
      await expect
        .element(editorScreen.postHistoryPreviewBody(), POLL)
        .toHaveTextContent('The very first words');
      // Selecting is a preview, not an edit: the post is untouched.
      await expect.element(editorScreen.titleInput()).toHaveValue('Hello from React');
    },
    SLOW,
  );

  it(
    'shows the version’s feature image in the preview',
    async () => {
      fakeSavablePost();
      await renderAdminApp(`/editor/post/${POST_ID}`, FLAG_ON);
      await openHistory();

      await expect(editorScreen.postHistoryPreviewFeatureImage()).toHaveCount(0);

      await editorScreen.postHistoryRevision(1).select().click();

      await expect
        .element(editorScreen.postHistoryPreviewFeatureImage())
        .toHaveAttribute('src', 'https://images.example.org/middle.jpg');
    },
    SLOW,
  );

  it(
    'restores a version into the editor and saves it as a new one',
    async () => {
      const saveApi = fakeSavablePost();
      await renderAdminApp(`/editor/post/${POST_ID}`, FLAG_ON);
      await openHistory();

      await editorScreen.postHistoryRevision(1).select().click();
      await editorScreen.postHistoryRevision(1).restore().click();

      await expect
        .element(editorScreen.restoreConfirm())
        .toHaveTextContent('Restore this version?');
      await editorScreen.confirmRestore().click();

      await expect.poll(() => saveApi.requests.length, POLL).toBe(1);
      expect(submittedPost(saveApi)).toMatchObject({
        title: 'Published at last',
        lexical: MIDDLE.lexical,
        feature_image: 'https://images.example.org/middle.jpg',
        feature_image_alt: 'A middle image',
      });
      // An explicit save, so the server is asked to keep a version of it.
      await expect.poll(() => saveApi.lastRequest?.url).toMatch(/save_revision=true/);

      // The editor surface shows the restored version, and the modal closes.
      await expect.element(editorScreen.titleInput()).toHaveValue('Published at last');
      await expect.element(editorScreen.body(), POLL).toHaveTextContent('The published words');
      await expect(editorScreen.postHistoryModal()).toHaveCount(0);
      await expect.element(editorScreen.featureImage()).toBeVisible();
      await expect.element(page.getByText('Revision restored.')).toBeVisible();
    },
    SLOW,
  );

  it(
    'stands the post in for a version carrying neither title nor excerpt',
    async () => {
      const saveApi = fakeSavablePost({ post_revisions: [NEWEST, BARE] });
      await renderAdminApp(`/editor/post/${POST_ID}`, {
        labs: { editorReact: true, editorExcerpt: true },
      });
      await openHistory();

      await editorScreen.postHistoryRevision(1).select().click();
      await expect
        .element(editorScreen.postHistoryPreviewBody(), POLL)
        .toHaveTextContent('The bare words');
      await expect
        .element(editorScreen.postHistoryPreviewTitle())
        .toHaveTextContent('Hello from React');
      await expect
        .element(editorScreen.postHistoryPreviewExcerpt())
        .toHaveTextContent('The summary as it stands');

      await editorScreen.postHistoryRevision(1).restore().click();
      await editorScreen.confirmRestore().click();

      // A restored title the version never had persists as the default.
      await expect.poll(() => saveApi.requests.length, POLL).toBe(1);
      expect(submittedPost(saveApi)).toMatchObject({ title: '(Untitled)' });
      await expect.element(editorScreen.titleInput()).toHaveValue('');
    },
    SLOW,
  );

  it(
    'does not offer to restore a version with missing body content',
    async () => {
      const saveApi = fakeSavablePost({
        post_revisions: [NEWEST, { ...OLDEST, lexical: null }],
      });
      await renderAdminApp(`/editor/post/${POST_ID}`, FLAG_ON);
      await openHistory();
      await editorScreen.postHistoryRevision(1).select().click();

      await expect
        .element(editorScreen.postHistoryPreview())
        .toHaveTextContent('This version has no body content to restore.');
      await expect(editorScreen.postHistoryRevision(1).restore()).toHaveCount(0);
      expect(saveApi.requests).toHaveLength(0);
    },
    SLOW,
  );

  it(
    'keeps the restore confirmation open until its save finishes',
    async () => {
      fakeSavablePost();
      const response = deferred<void>();
      const saveApi = fakeAdminEndpoint('PUT', ROUTE, async ({ body }) => {
        await response.promise;
        const submitted = (body as { posts: Partial<SavedPost>[] }).posts[0];
        return { posts: [savedPost({ ...submitted, updated_at: '2026-01-01T00:00:01.000Z' })] };
      });
      await renderAdminApp(`/editor/post/${POST_ID}`, FLAG_ON);
      await openHistory();
      await editorScreen.postHistoryRevision(1).select().click();
      await editorScreen.postHistoryRevision(1).restore().click();
      await editorScreen.confirmRestore().click();

      try {
        await expect.poll(() => saveApi.requests.length, POLL).toBe(1);
        await expect
          .element(editorScreen.restoreConfirm().getByRole('button', { name: 'Cancel' }))
          .toBeDisabled();
        await userEvent.keyboard('{Escape}');
        await expect.element(editorScreen.restoreConfirm()).toBeVisible();
      } finally {
        response.resolve();
      }
      await expect(editorScreen.postHistoryModal()).toHaveCount(0);
      await expect.element(editorScreen.body(), POLL).toHaveTextContent('The published words');
    },
    SLOW,
  );

  it(
    'leaves the post’s slug alone when the restored title differs',
    async () => {
      const saveApi = fakeSavablePost();
      await renderAdminApp(`/editor/post/${POST_ID}`, FLAG_ON);
      await openHistory();

      await editorScreen.postHistoryRevision(1).select().click();
      await editorScreen.postHistoryRevision(1).restore().click();
      await editorScreen.confirmRestore().click();

      await expect.poll(() => saveApi.requests.length, POLL).toBe(1);
      // A title the writer never typed does not move the post's URL.
      expect(submittedPost(saveApi)).toMatchObject({
        title: 'Published at last',
        slug: 'hello-from-react',
      });
    },
    SLOW,
  );

  it(
    'puts the post back when the restore cannot be saved',
    async () => {
      const saveApi = fakeUnsavablePost();
      await renderAdminApp(`/editor/post/${POST_ID}`, FLAG_ON);
      await openHistory();

      await editorScreen.postHistoryRevision(1).select().click();
      await editorScreen.postHistoryRevision(1).restore().click();
      await editorScreen.confirmRestore().click();

      await expect.poll(() => saveApi.requests.length, POLL).toBe(1);
      await expect.element(page.getByText('Failed to restore revision.')).toBeVisible();

      await userEvent.keyboard('{Escape}');
      await expect(editorScreen.postHistoryModal()).toHaveCount(0);
      await userEvent.keyboard('{Meta>}s{/Meta}');

      // The refused version left the post, so the next save cannot carry it.
      await expect.poll(() => saveApi.requests.length, POLL).toBe(2);
      const submitted = submittedPost(saveApi);
      expect(submitted).toMatchObject({
        title: 'Hello from React',
        slug: 'hello-from-react',
        feature_image: null,
        feature_image_alt: null,
      });
      expect(String(submitted.lexical)).toContain('Hello from React');
      expect(String(submitted.lexical)).not.toContain('The published words');
    },
    SLOW,
  );

  it(
    'keeps the editor and the versions on screen when the restore cannot be saved',
    async () => {
      const saveApi = fakeUnsavablePost();
      await renderAdminApp(`/editor/post/${POST_ID}`, FLAG_ON);
      await openHistory();

      await editorScreen.postHistoryRevision(1).select().click();
      await editorScreen.postHistoryRevision(1).restore().click();
      await editorScreen.confirmRestore().click();

      await expect.element(page.getByText('Failed to restore revision.')).toBeVisible();
      await expect.poll(() => saveApi.requests.length, POLL).toBe(1);
      await expect.element(editorScreen.postHistoryModal()).toBeVisible();
      await expect.element(editorScreen.titleInput()).toHaveValue('Hello from React');
    },
    SLOW,
  );

  it(
    'releases an expired-session restore and keeps the original content',
    async () => {
      fakeSavablePost();
      fakeAdminEndpoint(
        'PUT',
        ROUTE,
        { errors: [{ type: 'UnauthorizedError', message: 'Please sign in again.' }] },
        { status: 401 },
      );
      await renderAdminApp(`/editor/post/${POST_ID}`, FLAG_ON);
      await openHistory();
      await editorScreen.postHistoryRevision(1).select().click();
      await editorScreen.postHistoryRevision(1).restore().click();
      await editorScreen.confirmRestore().click();

      await expect
        .element(editorScreen.postHistoryModal().getByRole('alert'))
        .toHaveTextContent(
          'Your session expired. Sign in again in a new tab, then try restoring again.',
        );
      await expect(editorScreen.restoreConfirm()).toHaveCount(0);
      await userEvent.keyboard('{Escape}');
      await expect(editorScreen.postHistoryModal()).toHaveCount(0);
      await expect.element(editorScreen.body()).toHaveTextContent('Hello from React');
      await expect.element(editorScreen.titleInput()).toHaveValue('Hello from React');
    },
    SLOW,
  );

  it(
    'restores the version’s excerpt while the inline excerpt is on',
    async () => {
      const saveApi = fakeSavablePost();
      await renderAdminApp(`/editor/post/${POST_ID}`, {
        labs: { editorReact: true, editorExcerpt: true },
      });
      await openHistory();

      await editorScreen.postHistoryRevision(2).select().click();
      await expect
        .element(editorScreen.postHistoryPreviewExcerpt())
        .toHaveTextContent('The first summary');

      await editorScreen.postHistoryRevision(2).restore().click();
      await editorScreen.confirmRestore().click();

      await expect.poll(() => saveApi.requests.length, POLL).toBe(1);
      expect(submittedPost(saveApi)).toMatchObject({ custom_excerpt: 'The first summary' });
      await expect.element(editorScreen.excerptInput()).toHaveValue('The first summary');
    },
    SLOW,
  );

  it(
    'warns that restoring updates a published post on the site',
    async () => {
      fakeSavablePost({ status: 'published', published_at: PUBLISHED_AT });
      await renderAdminApp(`/editor/post/${POST_ID}`, FLAG_ON);
      await openHistory();

      await editorScreen.postHistoryRevision(1).select().click();
      await editorScreen.postHistoryRevision(1).restore().click();

      await expect
        .element(editorScreen.restoreConfirm())
        .toHaveTextContent('Restore version for published post?');
    },
    SLOW,
  );

  it(
    'leaves the post alone when the restore is cancelled',
    async () => {
      const saveApi = fakeSavablePost();
      await renderAdminApp(`/editor/post/${POST_ID}`, FLAG_ON);
      await openHistory();

      await editorScreen.postHistoryRevision(2).select().click();
      await editorScreen.postHistoryRevision(2).restore().click();
      await editorScreen.restoreConfirm().getByRole('button', { name: 'Cancel' }).click();

      await expect(editorScreen.restoreConfirm()).toHaveCount(0);
      await expect.element(editorScreen.postHistoryModal()).toBeVisible();
      await expect.element(editorScreen.titleInput()).toHaveValue('Hello from React');
      expect(saveApi.requests).toHaveLength(0);
    },
    SLOW,
  );

  it(
    'closes on Escape',
    async () => {
      fakeSavablePost();
      await renderAdminApp(`/editor/post/${POST_ID}`, FLAG_ON);
      await openHistory();

      await userEvent.keyboard('{Escape}');

      await expect(editorScreen.postHistoryModal()).toHaveCount(0);
      await expect.element(editorScreen.settingsPostHistory()).toBeVisible();
      await expect.element(editorScreen.settingsPostHistory()).toHaveFocus();
    },
    SLOW,
  );
});
