import { afterEach, describe, expect, it } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { buildLexicalParagraph } from '@tryghost/test-data';

import {
  currentUserResponse,
  fakeAdminEndpoint,
  fakeMembers,
  fakeNewsletters,
  fakePosts,
  fakeSnippets,
  post,
  renderAdminApp,
  staffRole,
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
// The suite's own viewport, restored after the case that narrows it.
const WIDE_VIEWPORT = { width: 1280, height: 800 };

// A settings save waits on the engine's queue, so these journeys outlast the default timeout.
const SLOW = 20_000;
const POLL = { timeout: 10_000 };
// Under the 3s autosave debounce, so only an undebounced field save can satisfy it.
const FIELD_POLL = { timeout: 2_000 };

type SavedPost = ReturnType<typeof post>;

function submittedPost(capture: EndpointCapture): Record<string, unknown> {
  const body = capture.lastRequest?.body as { posts: Record<string, unknown>[] } | undefined;
  return body?.posts[0] ?? {};
}

function asRole(name: StaffRoleName) {
  const me = currentUserResponse();
  me.users[0].roles = [staffRole({ name })];
  return { ...FLAG_ON, boot: { browseMe: { response: me } } };
}

function editorChrome() {
  fakeSnippets([]);
  fakePosts([]);
  // The header's publish inputs read the site's member total and newsletter list.
  fakeMembers([]);
  fakeNewsletters([]);
  fakeAdminEndpoint('GET', /^\/slugs\/post\//, ({ url }) => ({
    slugs: [{ slug: decodeURIComponent(url.split('/slugs/post/')[1].split('/')[0]) }],
  }));
}

/** A post that answers saves the way Ghost does: submitted fields back, fresh token. */
function fakeSavablePost(overrides: Partial<SavedPost> = {}) {
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

  return fakeAdminEndpoint('PUT', ROUTE, ({ body }) => {
    saves += 1;
    const submitted = (body as { posts: Partial<SavedPost>[] }).posts[0];
    current = { ...current, ...submitted, updated_at: `2026-01-01T00:00:0${saves}.000Z` };
    return { posts: [current] };
  });
}

/** The same post, but every update is refused as a stale-token collision. */
function fakeCollidingPost(overrides: Partial<SavedPost> = {}) {
  editorChrome();
  const server = post({
    id: POST_ID,
    title: 'Hello from React',
    slug: 'hello-from-react',
    status: 'published',
    published_at: PUBLISHED_AT,
    lexical: buildLexicalParagraph('Hello from React'),
    updated_at: LOADED_AT,
    featured: false,
    custom_excerpt: null,
    tags: [],
    ...overrides,
  });
  let saves = 0;

  fakeAdminEndpoint('GET', ROUTE, () => ({
    posts: [saves === 0 ? server : { ...server, updated_at: '2026-01-01T09:00:00.000Z' }],
  }));

  return fakeAdminEndpoint(
    'PUT',
    ROUTE,
    () => {
      saves += 1;
      return {
        errors: [
          {
            code: 'UPDATE_COLLISION',
            type: 'UpdateCollisionError',
            message: 'Saving failed! Someone else is editing this post.',
          },
        ],
      };
    },
    { status: 409 },
  );
}

async function openSidebar() {
  await editorScreen.settingsToggle().click();
  await expect.element(editorScreen.settingsSidebar()).toBeVisible();
}

function editorWidthPx(): number {
  return editorScreen.root().element().getBoundingClientRect().width;
}

afterEach(async () => {
  await page.viewport(WIDE_VIEWPORT.width, WIDE_VIEWPORT.height);
});

/**
 * The post settings sidebar and its save policy: a draft persists a settings
 * field on its own, every other status stages it until an explicit save.
 */
describe('Post settings sidebar', () => {
  it(
    'persists a draft’s Featured toggle on its own',
    async () => {
      const saveApi = fakeSavablePost();
      await renderAdminApp(`/editor/post/${POST_ID}`, FLAG_ON);
      await openSidebar();

      await editorScreen.settingsFeatured().click();

      // A field save has no debounce, so it lands well inside the autosave's 3s.
      await expect.poll(() => saveApi.requests.length, FIELD_POLL).toBe(1);
      expect(submittedPost(saveApi)).toMatchObject({ featured: true });
      await expect.element(editorScreen.status()).toHaveTextContent('Draft - Saved');
    },
    SLOW,
  );

  it(
    'stages a published post’s Featured toggle until Update',
    async () => {
      const saveApi = fakeSavablePost({ status: 'published', published_at: PUBLISHED_AT });
      await renderAdminApp(`/editor/post/${POST_ID}`, FLAG_ON);
      await openSidebar();

      await expect.element(editorScreen.updateButton()).toBeDisabled();

      await editorScreen.settingsFeatured().click();

      // The unsaved signal for a published post is the Update button, not the chip.
      await expect.element(editorScreen.updateButton()).toBeEnabled();
      await expect.poll(unsavedChangesGuarded).toBe(true);
      expect(saveApi.requests).toHaveLength(0);

      await userEvent.keyboard('{Meta>}s{/Meta}');

      await expect.poll(() => saveApi.requests.length, POLL).toBe(1);
      expect(submittedPost(saveApi)).toMatchObject({ featured: true, status: 'published' });
      await expect.element(editorScreen.updateButton()).toBeDisabled();
    },
    SLOW,
  );

  it(
    'keeps a staged field through a collision and drops it on reload',
    async () => {
      const saveApi = fakeCollidingPost();
      await renderAdminApp(`/editor/post/${POST_ID}`, FLAG_ON);
      await openSidebar();

      await editorScreen.settingsFeatured().click();
      await editorScreen.updateButton().click();

      await expect.poll(() => saveApi.requests.length, POLL).toBe(1);
      await expect.element(editorScreen.conflictBanner()).toBeVisible();
      // The rejected save keeps what the writer staged.
      await expect
        .element(editorScreen.settingsFeatured())
        .toHaveAttribute('data-state', 'checked');

      await editorScreen.reloadAfterConflict().click();
      await editorScreen.confirmConflictReload().click();

      await expect(editorScreen.conflictBanner()).toHaveCount(0);
      await expect
        .element(editorScreen.settingsFeatured())
        .toHaveAttribute('data-state', 'unchecked');
    },
    SLOW,
  );

  it(
    'saves the sidebar excerpt when the inline one is off',
    async () => {
      const saveApi = fakeSavablePost();
      await renderAdminApp(`/editor/post/${POST_ID}`, FLAG_ON);
      await openSidebar();

      await editorScreen.settingsExcerpt().fill('From the sidebar');
      await editorScreen.titleInput().click();

      await expect.poll(() => submittedPost(saveApi).custom_excerpt, POLL).toBe('From the sidebar');
    },
    SLOW,
  );

  it(
    'leaves the excerpt out of the sidebar when it renders under the title',
    async () => {
      fakeSavablePost();
      await renderAdminApp(`/editor/post/${POST_ID}`, {
        labs: { editorReact: true, editorExcerpt: true },
      });
      await openSidebar();

      await expect(editorScreen.settingsExcerpt()).toHaveCount(0);
      await expect.element(editorScreen.excerptInput()).toBeVisible();
    },
    SLOW,
  );

  it(
    'overlays the editor rather than narrowing it on a narrow viewport',
    async () => {
      fakeSavablePost();
      await page.viewport(900, 800);
      await renderAdminApp(`/editor/post/${POST_ID}`, FLAG_ON);
      await expect.element(editorScreen.root()).toBeVisible();

      const editorWidth = editorWidthPx();

      await openSidebar();

      expect(editorWidthPx()).toBe(editorWidth);
    },
    SLOW,
  );

  it(
    'gives a contributor the sidebar without the fields their role cannot write',
    async () => {
      // A contributor may only open a draft they authored.
      const saveApi = fakeSavablePost({ authors: [{ id: CURRENT_USER_ID }] });
      await renderAdminApp(`/editor/post/${POST_ID}`, asRole('Contributor'));
      await openSidebar();

      await expect(editorScreen.settingsFeatured()).toHaveCount(0);

      await editorScreen.settingsExcerpt().fill('A contributor’s excerpt');
      await editorScreen.titleInput().click();

      await expect
        .poll(() => submittedPost(saveApi).custom_excerpt, POLL)
        .toBe('A contributor’s excerpt');
    },
    SLOW,
  );
});
