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
  fakeTiers,
  post,
  renderAdminApp,
  settingsResponse,
  staffRole,
  tier,
  unsavedChangesGuarded,
  type EndpointCapture,
} from '@test-utils/acceptance';
import { editorScreen } from '@/editor/editor.screen';

const POST_ID = 'abc123';
const NEW_POST_ID = 'new123';
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

const GOLD = tier({ name: 'Gold', type: 'paid', active: true });
const SILVER = tier({ name: 'Silver', type: 'paid', active: true });
const BRONZE = tier({ name: 'Bronze', type: 'paid', active: false });
const FREE = tier({ name: 'Free', type: 'free', active: true });
const SITE_TIERS = [GOLD, SILVER, BRONZE, FREE];
// More paid tiers than a browse's default page holds, so a single page loses some.
const MANY_TIERS = Array.from({ length: 18 }, (_, index) =>
  tier({ name: `Tier ${String(index + 1).padStart(2, '0')}`, type: 'paid', active: true }),
);

function submittedPost(capture: EndpointCapture): Record<string, unknown> {
  const body = capture.lastRequest?.body as { posts: Record<string, unknown>[] } | undefined;
  return body?.posts[0] ?? {};
}

function asContributor() {
  const me = currentUserResponse();
  me.users[0].roles = [staffRole({ name: 'Contributor' })];
  return { ...FLAG_ON, boot: { browseMe: { response: me } } };
}

/** The site default the select stands in until a post carries its own visibility. */
function withDefaultVisibility(visibility: string) {
  return {
    ...FLAG_ON,
    boot: {
      browseSettings: {
        response: settingsResponse({ settings: { default_content_visibility: visibility } }),
      },
    },
  };
}

function editorChrome(tiers = SITE_TIERS) {
  fakeSnippets([]);
  fakePosts([]);
  // The header's publish inputs read the site's member total and newsletter list.
  fakeMembers([]);
  fakeNewsletters([]);
  // After fakeMembers, which serves its filter bar an empty tier list of its own.
  fakeTiers(tiers);
  fakeAdminEndpoint('GET', /^\/slugs\/post\//, ({ url }) => ({
    slugs: [{ slug: decodeURIComponent(url.split('/slugs/post/')[1].split('/')[0]) }],
  }));
}

/** A post that answers saves the way Ghost does: submitted fields back, fresh token. */
function fakeSavablePost(overrides: Partial<SavedPost> = {}, tiers = SITE_TIERS) {
  editorChrome(tiers);
  let current = post({
    id: POST_ID,
    title: 'Hello from React',
    slug: 'hello-from-react',
    status: 'draft',
    lexical: buildLexicalParagraph('Hello from React'),
    updated_at: LOADED_AT,
    published_at: null,
    visibility: 'public',
    tiers: [],
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

async function openAccess() {
  await editorScreen.settingsToggle().click();
  await expect.element(editorScreen.settingsSidebar()).toBeVisible();
  await expect.element(editorScreen.settingsVisibility()).toBeVisible();
}

async function typeIntoBody(text: string) {
  await editorScreen.body().click();
  await userEvent.keyboard(`{End}${text}`);
}

async function chooseVisibility(label: string) {
  await editorScreen.settingsVisibility().click();
  await editorScreen.settingsVisibilityOption(label).click();
}

/**
 * The sidebar's Access section: the post's visibility and, for `Specific
 * tier(s)`, the tiers that visibility grants.
 */
describe('Post settings access', () => {
  it(
    'persists a draft’s visibility on its own',
    async () => {
      const saveApi = fakeSavablePost();
      await renderAdminApp(`/editor/post/${POST_ID}`, FLAG_ON);
      await openAccess();

      await expect.element(editorScreen.settingsVisibility()).toHaveTextContent('Public');

      await chooseVisibility('Members only');

      // A field save has no debounce, so it lands well inside the autosave's 3s.
      await expect.poll(() => saveApi.requests.length, FIELD_POLL).toBe(1);
      expect(submittedPost(saveApi)).toMatchObject({ visibility: 'members' });
      await expect.element(editorScreen.settingsVisibility()).toHaveTextContent('Members only');
    },
    SLOW,
  );

  it(
    'keeps specific-tier access when the paid tier IDs have not changed',
    async () => {
      const saveApi = fakeSavablePost({ visibility: 'paid', tiers: [GOLD, SILVER] });
      await renderAdminApp(`/editor/post/${POST_ID}`, FLAG_ON);
      await openAccess();

      await chooseVisibility('Specific tier(s)');

      await expect.poll(() => saveApi.requests.length, FIELD_POLL).toBe(1);
      expect(submittedPost(saveApi)).toMatchObject({
        visibility: 'tiers',
        tiers: [{ id: GOLD.id }, { id: SILVER.id }],
      });
      await expect.element(editorScreen.settingsVisibility()).toHaveTextContent('Specific tier(s)');
    },
    SLOW,
  );

  it(
    'requires a paid tier when a public post only carries the free tier',
    async () => {
      const saveApi = fakeSavablePost({ visibility: 'public', tiers: [FREE] });
      await renderAdminApp(`/editor/post/${POST_ID}`, FLAG_ON);
      await openAccess();

      await chooseVisibility('Specific tier(s)');

      await expect.element(editorScreen.settingsTiersError()).toBeVisible();
      expect(saveApi.requests).toHaveLength(0);
      await editorScreen.settingsTier('Gold').click();
      await expect.poll(() => saveApi.requests.length, FIELD_POLL).toBe(1);
      expect(submittedPost(saveApi)).toMatchObject({
        visibility: 'tiers',
        tiers: [{ id: GOLD.id }],
      });
    },
    SLOW,
  );

  it(
    'refuses the first save until an explicitly selected tier access has a tier',
    async () => {
      editorChrome();
      const createApi = fakeAdminEndpoint('POST', /^\/posts\/\?/, {
        posts: [post({ id: NEW_POST_ID, visibility: 'public' })],
      });
      await renderAdminApp('/editor/post', FLAG_ON);
      await openAccess();

      await chooseVisibility('Specific tier(s)');
      await userEvent.keyboard('{Meta>}s{/Meta}');

      await expect
        .element(editorScreen.saveErrorBanner())
        .toHaveTextContent('Please select at least one tier');
      expect(createApi.requests).toHaveLength(0);
      await expect.element(editorScreen.settingsVisibility()).toHaveTextContent('Specific tier(s)');
      await expect.poll(unsavedChangesGuarded).toBe(true);
    },
    SLOW,
  );

  it(
    'sends the visibility and the tiers together once a tier is picked',
    async () => {
      const saveApi = fakeSavablePost();
      await renderAdminApp(`/editor/post/${POST_ID}`, FLAG_ON);
      await openAccess();

      await chooseVisibility('Specific tier(s)');

      // Nothing is selected yet, so the choice is held back rather than stripped.
      await expect.element(editorScreen.settingsTiersError()).toBeVisible();
      expect(saveApi.requests).toHaveLength(0);
      // Archived paid tiers are offered after the active ones; free tiers are not.
      await expect.element(editorScreen.settingsTier('Bronze')).toBeVisible();
      await expect(editorScreen.settingsTier('Free')).toHaveCount(0);
      // Staged rather than refused, so the writer sees no save error for it.
      await expect.element(editorScreen.status()).toHaveTextContent('Draft');
      await expect(editorScreen.saveErrorBanner()).toHaveCount(0);

      await editorScreen.settingsTier('Gold').click();

      await expect.poll(() => saveApi.requests.length, FIELD_POLL).toBe(1);
      expect(submittedPost(saveApi)).toMatchObject({
        visibility: 'tiers',
        tiers: [{ id: GOLD.id }],
      });
      await expect(editorScreen.settingsTiersError()).toHaveCount(0);

      await editorScreen.settingsTier('Silver').click();

      await expect.poll(() => saveApi.requests.length, POLL).toBe(2);
      expect(submittedPost(saveApi).tiers).toEqual([{ id: GOLD.id }, { id: SILVER.id }]);
    },
    SLOW,
  );

  it(
    'stages a published post’s visibility until Update',
    async () => {
      const saveApi = fakeSavablePost({ status: 'published', published_at: PUBLISHED_AT });
      await renderAdminApp(`/editor/post/${POST_ID}`, FLAG_ON);
      await openAccess();

      await expect.element(editorScreen.updateButton()).toBeDisabled();

      await chooseVisibility('Paid-members only');

      await expect.element(editorScreen.updateButton()).toBeEnabled();
      await expect.poll(unsavedChangesGuarded).toBe(true);
      expect(saveApi.requests).toHaveLength(0);

      await userEvent.keyboard('{Meta>}s{/Meta}');

      await expect.poll(() => saveApi.requests.length, POLL).toBe(1);
      expect(submittedPost(saveApi)).toMatchObject({ visibility: 'paid', status: 'published' });
      await expect.element(editorScreen.updateButton()).toBeDisabled();
    },
    SLOW,
  );

  it(
    'shows the site default for a post that carries no visibility yet',
    async () => {
      editorChrome();
      let created = post({
        id: NEW_POST_ID,
        title: '(Untitled)',
        status: 'draft',
        visibility: 'paid',
        tiers: [],
        tags: [],
      });
      const createApi = fakeAdminEndpoint('POST', /^\/posts\/\?/, ({ body }) => {
        const submitted = (body as { posts: Partial<SavedPost>[] }).posts[0];
        created = { ...created, ...submitted, id: NEW_POST_ID, updated_at: LOADED_AT };
        return { posts: [created] };
      });
      fakeAdminEndpoint('GET', new RegExp(`^/posts/${NEW_POST_ID}/\\?`), () => ({
        posts: [created],
      }));
      // The autosave that follows the create can land before the test ends.
      fakeAdminEndpoint('PUT', new RegExp(`^/posts/${NEW_POST_ID}/\\?`), () => ({
        posts: [created],
      }));

      await renderAdminApp('/editor/post', withDefaultVisibility('paid'));
      await openAccess();

      await expect
        .element(editorScreen.settingsVisibility())
        .toHaveTextContent('Paid-members only');
      await expect(editorScreen.settingsTiers()).toHaveCount(0);

      await typeIntoBody('First words');

      // The default is the server's to apply on create, so nothing is sent for it.
      await expect.poll(() => createApi.requests.length, POLL).toBe(1);
      expect(submittedPost(createApi)).not.toHaveProperty('visibility');
      expect(submittedPost(createApi)).not.toHaveProperty('tiers');
    },
    SLOW,
  );

  it(
    'offers every paid tier, past the first page of the browse',
    async () => {
      const last = MANY_TIERS[MANY_TIERS.length - 1];
      const saveApi = fakeSavablePost(
        { visibility: 'tiers', tiers: [{ id: last.id }] },
        MANY_TIERS,
      );
      await renderAdminApp(`/editor/post/${POST_ID}`, FLAG_ON);
      await openAccess();

      await expect.element(editorScreen.settingsTier(last.name)).toBeVisible();
      await expect
        .element(editorScreen.settingsTier(last.name))
        .toHaveAttribute('data-state', 'checked');

      await editorScreen.settingsTier('Tier 01').click();

      // The last tier survives the toggle only because the browse loaded past page one.
      await expect.poll(() => saveApi.requests.length, FIELD_POLL).toBe(1);
      expect(submittedPost(saveApi).tiers).toEqual([{ id: MANY_TIERS[0].id }, { id: last.id }]);
    },
    SLOW,
  );

  it(
    'asks for a tier again when the last one is unpicked',
    async () => {
      const saveApi = fakeSavablePost({ visibility: 'tiers', tiers: [{ id: GOLD.id }] });
      await renderAdminApp(`/editor/post/${POST_ID}`, FLAG_ON);
      await openAccess();

      await expect
        .element(editorScreen.settingsTier('Gold'))
        .toHaveAttribute('data-state', 'checked');
      await expect(editorScreen.settingsTiersError()).toHaveCount(0);

      await editorScreen.settingsTier('Gold').click();

      await expect.element(editorScreen.settingsTiersError()).toBeVisible();
      await expect
        .element(editorScreen.settingsTier('Gold'))
        .toHaveAttribute('data-state', 'unchecked');
      expect(saveApi.requests).toHaveLength(0);
    },
    SLOW,
  );

  it(
    'refuses an explicit save while no tier is picked',
    async () => {
      const saveApi = fakeSavablePost({
        status: 'published',
        published_at: PUBLISHED_AT,
        visibility: 'tiers',
        tiers: [{ id: GOLD.id }],
      });
      await renderAdminApp(`/editor/post/${POST_ID}`, FLAG_ON);
      await openAccess();

      await editorScreen.settingsTier('Gold').click();

      // The empty selection is staged, so it is the writer's unsaved work.
      await expect.element(editorScreen.updateButton()).toBeEnabled();
      await expect.poll(unsavedChangesGuarded).toBe(true);

      await userEvent.keyboard('{Meta>}s{/Meta}');

      await expect
        .element(editorScreen.saveErrorBanner())
        .toHaveTextContent('Please select at least one tier');
      expect(saveApi.requests).toHaveLength(0);
      await expect.element(editorScreen.updateButton()).toBeEnabled();
    },
    SLOW,
  );

  it(
    'leaves Access out for a role that cannot set it',
    async () => {
      fakeSavablePost({ authors: [{ id: '1' }] });
      await renderAdminApp(`/editor/post/${POST_ID}`, asContributor());
      await editorScreen.settingsToggle().click();
      await expect.element(editorScreen.settingsSidebar()).toBeVisible();

      await expect(editorScreen.settingsVisibility()).toHaveCount(0);
    },
    SLOW,
  );
});
