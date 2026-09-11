import { describe, expect, it } from 'vitest';
import { userEvent } from 'vitest/browser';
import { buildLexicalParagraph } from '@tryghost/test-data';

import {
  activeThemeResponse,
  currentUserResponse,
  fakeAdminEndpoint,
  fakeNewsletters,
  fakePages,
  fakePosts,
  fakeSnippets,
  post,
  renderAdminApp,
  staffRole,
  unsavedChangesGuarded,
  type EndpointCapture,
} from '@test-utils/acceptance';
import { editorScreen } from '@/editor/editor.screen';

const PAGE_ID = 'pg123';
const NEW_PAGE_ID = 'pg789';
const POST_ID = 'abc123';
const FLAG_ON = { labs: { editorReact: true } };
const LOADED_AT = '2026-01-01T00:00:00.000Z';
const PUBLISHED_AT = '2025-12-01T10:00:00.000Z';
const PAGE_ROUTE = new RegExp(`^/pages/${PAGE_ID}/\\?`);
const POST_ROUTE = new RegExp(`^/posts/${POST_ID}/\\?`);

// A settings save waits on the engine's queue, so these journeys outlast the default timeout.
const SLOW = 20_000;
const POLL = { timeout: 10_000 };
// Under the 3s autosave debounce, so only an undebounced field save can satisfy it.
const FIELD_POLL = { timeout: 2_000 };

type SavedPage = ReturnType<typeof post>;

/** A gscan report for a theme whose templates never ask for the page-builder helper. */
const PAGE_BUILDER_PROBLEM = {
  code: 'GS110-NO-MISSING-PAGE-BUILDER-USAGE',
  rule: 'Missing page builder usage',
  details: 'The theme does not use the page builder helpers.',
  failures: [{ ref: 'page.hbs', message: '{{@page.show_title_and_feature_image}} is not used' }],
  fatal: false,
  level: 'error',
};

/** A gscan report about something else entirely, so the helper counts as supported. */
const UNRELATED_PROBLEM = {
  code: 'GS001-DEPR-PURL',
  rule: 'Replace deprecated helper',
  details: 'The <code>{{pageUrl}}</code> helper has been deprecated.',
  failures: [{ ref: 'default.hbs', message: 'deprecated usage' }],
  fatal: false,
  level: 'error',
};

/** The page-builder report, but naming a different page attribute. */
const OTHER_ATTRIBUTE_PROBLEM = {
  ...PAGE_BUILDER_PROBLEM,
  failures: [{ ref: 'page.hbs', message: '{{@page.show_page_title}} is not used' }],
};

/** The attribute named under a code that is not the page-builder one. */
const OTHER_CODE_PROBLEM = {
  ...PAGE_BUILDER_PROBLEM,
  code: 'GS010-PJ-GHOST-API',
};

function withTheme(report: { errors?: unknown[]; warnings?: unknown[] }) {
  return {
    ...FLAG_ON,
    boot: { browseActiveTheme: { response: activeThemeResponse(report) } },
  };
}

function asContributor() {
  const me = currentUserResponse();
  me.users[0].roles = [staffRole({ name: 'Contributor' })];
  return { ...FLAG_ON, boot: { browseMe: { response: me } } };
}

function fakeActiveTheme(report: { errors?: unknown[]; warnings?: unknown[] }): EndpointCapture {
  return fakeAdminEndpoint('GET', '/themes/active/', activeThemeResponse(report));
}

function submittedPage(capture: EndpointCapture): Record<string, unknown> {
  const body = capture.lastRequest?.body as { pages?: Record<string, unknown>[] } | undefined;
  return body?.pages?.[0] ?? {};
}

function editorChrome() {
  fakeSnippets([]);
  fakePosts([]);
  fakePages([]);
  // The header's publish inputs read the newsletter list.
  fakeNewsletters([]);
  fakeAdminEndpoint('GET', /^\/slugs\/post\//, ({ url }) => ({
    slugs: [{ slug: decodeURIComponent(url.split('/slugs/post/')[1].split('/')[0]) }],
  }));
}

/** A page that answers saves the way Ghost does: submitted fields back, fresh token. */
function fakeSavablePage(overrides: Partial<SavedPage> = {}) {
  editorChrome();
  let current: SavedPage = {
    ...post({
      id: PAGE_ID,
      title: 'Hello from React',
      slug: 'hello-from-react',
      status: 'draft',
      lexical: buildLexicalParagraph('Hello from React'),
      updated_at: LOADED_AT,
      published_at: null,
      tags: [],
      tiers: [],
    }),
    show_title_and_feature_image: true,
    ...overrides,
  };
  let saves = 0;

  fakeAdminEndpoint('GET', PAGE_ROUTE, () => ({ pages: [current] }));

  return fakeAdminEndpoint('PUT', PAGE_ROUTE, ({ body }) => {
    saves += 1;
    const submitted = (body as { pages: Partial<SavedPage>[] }).pages[0];
    current = { ...current, ...submitted, updated_at: `2026-01-01T00:00:0${saves}.000Z` };
    return { pages: [current] };
  });
}

async function openSettings() {
  await editorScreen.settingsToggle().click();
  await expect.element(editorScreen.settingsSidebar()).toBeVisible();
}

/**
 * The sidebar's Show title and feature image section: a page-only field, with
 * the warning a theme that cannot honour it earns.
 */
describe('Post settings show title and feature image', () => {
  it(
    'persists a draft page’s choice on its own',
    async () => {
      const saveApi = fakeSavablePage();
      await renderAdminApp(`/editor/page/${PAGE_ID}`, FLAG_ON);
      await openSettings();

      await expect
        .element(editorScreen.settingsShowTitle())
        .toHaveAttribute('data-state', 'checked');

      await editorScreen.settingsShowTitle().click();

      // A field save has no debounce, so it lands well inside the autosave's 3s.
      await expect.poll(() => saveApi.requests.length, FIELD_POLL).toBe(1);
      expect(submittedPage(saveApi)).toMatchObject({ show_title_and_feature_image: false });
      await expect
        .element(editorScreen.settingsShowTitle())
        .toHaveAttribute('data-state', 'unchecked');
    },
    SLOW,
  );

  it(
    'turns the choice back on',
    async () => {
      const saveApi = fakeSavablePage({ show_title_and_feature_image: false });
      await renderAdminApp(`/editor/page/${PAGE_ID}`, FLAG_ON);
      await openSettings();

      await expect
        .element(editorScreen.settingsShowTitle())
        .toHaveAttribute('data-state', 'unchecked');

      await editorScreen.settingsShowTitle().click();

      await expect.poll(() => saveApi.requests.length, FIELD_POLL).toBe(1);
      expect(submittedPage(saveApi)).toMatchObject({ show_title_and_feature_image: true });
    },
    SLOW,
  );

  it(
    'stages a published page’s choice until Update',
    async () => {
      const saveApi = fakeSavablePage({ status: 'published', published_at: PUBLISHED_AT });
      await renderAdminApp(`/editor/page/${PAGE_ID}`, FLAG_ON);
      await openSettings();

      await expect.element(editorScreen.updateButton()).toBeDisabled();

      await editorScreen.settingsShowTitle().click();

      await expect.element(editorScreen.updateButton()).toBeEnabled();
      await expect.poll(unsavedChangesGuarded).toBe(true);
      expect(saveApi.requests).toHaveLength(0);

      await userEvent.keyboard('{Meta>}s{/Meta}');

      await expect.poll(() => saveApi.requests.length, POLL).toBe(1);
      expect(submittedPage(saveApi)).toMatchObject({
        show_title_and_feature_image: false,
        status: 'published',
      });
      await expect.element(editorScreen.updateButton()).toBeDisabled();
    },
    SLOW,
  );

  it(
    'leaves the section out for a post',
    async () => {
      editorChrome();
      fakeAdminEndpoint('GET', POST_ROUTE, () => ({
        posts: [post({ id: POST_ID, status: 'draft', published_at: null, tags: [], tiers: [] })],
      }));
      await renderAdminApp(`/editor/post/${POST_ID}`, FLAG_ON);
      await openSettings();

      // A section the sidebar does render, so the panel is settled before the check.
      await expect.element(editorScreen.settingsFeatured()).toBeVisible();
      await expect(editorScreen.settingsShowTitle()).toHaveCount(0);
    },
    SLOW,
  );

  it(
    'offers the choice to a role that cannot manage the rest of the page',
    async () => {
      fakeSavablePage({ authors: [{ id: '1' }] });
      await renderAdminApp(`/editor/page/${PAGE_ID}`, asContributor());
      await openSettings();

      await expect.element(editorScreen.settingsShowTitle()).toBeVisible();
      // The sections that are role-gated stay out, so this one is not riding on them.
      await expect(editorScreen.settingsFeatured()).toHaveCount(0);
    },
    SLOW,
  );

  it(
    'never asks for the active theme as a role that cannot read it',
    async () => {
      const saveApi = fakeSavablePage({
        authors: [{ id: '1' }],
        show_title_and_feature_image: false,
      });
      // Reading it needs a permission Contributors lack, so the report that
      // would earn a warning must never be requested.
      const themesApi = fakeActiveTheme({ errors: [PAGE_BUILDER_PROBLEM] });
      await renderAdminApp(`/editor/page/${PAGE_ID}`, asContributor());
      await openSettings();

      await expect
        .element(editorScreen.settingsShowTitle())
        .toHaveAttribute('data-state', 'unchecked');

      await editorScreen.settingsShowTitle().click();

      await expect.poll(() => saveApi.requests.length, FIELD_POLL).toBe(1);
      expect(submittedPage(saveApi)).toMatchObject({ show_title_and_feature_image: true });
      await expect(editorScreen.settingsShowTitleWarning()).toHaveCount(0);
      expect(themesApi.requests).toHaveLength(0);
    },
    SLOW,
  );

  it(
    'defaults a new page to showing its title and feature image',
    async () => {
      editorChrome();
      let created: SavedPage = post({
        id: NEW_PAGE_ID,
        title: '(Untitled)',
        slug: 'untitled',
        status: 'draft',
        updated_at: LOADED_AT,
        published_at: null,
        tags: [],
        tiers: [],
      });
      const createApi = fakeAdminEndpoint('POST', /^\/pages\/\?/, ({ body }) => {
        const submitted = (body as { pages: Partial<SavedPage>[] }).pages[0];
        created = { ...created, ...submitted, id: NEW_PAGE_ID, updated_at: LOADED_AT };
        return { pages: [created] };
      });
      const NEW_PAGE_ROUTE = new RegExp(`^/pages/${NEW_PAGE_ID}/\\?`);
      fakeAdminEndpoint('GET', NEW_PAGE_ROUTE, () => ({ pages: [created] }));
      // The autosave that follows the create can land before the test ends.
      fakeAdminEndpoint('PUT', NEW_PAGE_ROUTE, () => ({ pages: [created] }));

      await renderAdminApp('/editor/page', FLAG_ON);
      await openSettings();

      await expect
        .element(editorScreen.settingsShowTitle())
        .toHaveAttribute('data-state', 'checked');

      await editorScreen.settingsShowTitle().click();

      await expect.poll(() => createApi.requests.length, POLL).toBe(1);
      expect(submittedPage(createApi)).toMatchObject({ show_title_and_feature_image: false });
    },
    SLOW,
  );

  it(
    'warns about a theme without the page-builder helper once the choice is off',
    async () => {
      fakeSavablePage();
      await renderAdminApp(
        `/editor/page/${PAGE_ID}`,
        withTheme({ errors: [PAGE_BUILDER_PROBLEM] }),
      );
      await openSettings();

      // Nothing is hidden yet, so the theme's gap does not matter.
      await expect(editorScreen.settingsShowTitleWarning()).toHaveCount(0);

      await editorScreen.settingsShowTitle().click();

      await expect
        .element(editorScreen.settingsShowTitleWarning())
        .toHaveTextContent("Uh-oh. Looks like your theme doesn't support this feature.");
      await expect
        .element(editorScreen.settingsShowTitleLearnMore())
        .toHaveAttribute('href', 'https://docs.ghost.org/themes/helpers/');

      await editorScreen.settingsShowTitle().click();

      await expect(editorScreen.settingsShowTitleWarning()).toHaveCount(0);
    },
    SLOW,
  );

  it(
    'warns on a theme report that carries the gap as a warning',
    async () => {
      fakeSavablePage({ show_title_and_feature_image: false });
      await renderAdminApp(
        `/editor/page/${PAGE_ID}`,
        withTheme({ warnings: [{ ...PAGE_BUILDER_PROBLEM, level: 'warning' }] }),
      );
      await openSettings();

      await expect.element(editorScreen.settingsShowTitleWarning()).toBeVisible();
    },
    SLOW,
  );

  it(
    'stays quiet for a theme whose report says nothing about the helper',
    async () => {
      fakeSavablePage({ show_title_and_feature_image: false });
      await renderAdminApp(`/editor/page/${PAGE_ID}`, withTheme({ errors: [UNRELATED_PROBLEM] }));
      await openSettings();

      await expect
        .element(editorScreen.settingsShowTitle())
        .toHaveAttribute('data-state', 'unchecked');
      await expect(editorScreen.settingsShowTitleWarning()).toHaveCount(0);
    },
    SLOW,
  );

  it(
    'stays quiet for a report that names another page-builder attribute',
    async () => {
      fakeSavablePage({ show_title_and_feature_image: false });
      await renderAdminApp(
        `/editor/page/${PAGE_ID}`,
        withTheme({ errors: [OTHER_ATTRIBUTE_PROBLEM] }),
      );
      await openSettings();

      await expect
        .element(editorScreen.settingsShowTitle())
        .toHaveAttribute('data-state', 'unchecked');
      await expect(editorScreen.settingsShowTitleWarning()).toHaveCount(0);
    },
    SLOW,
  );

  it(
    'stays quiet for the attribute reported under another code',
    async () => {
      fakeSavablePage({ show_title_and_feature_image: false });
      await renderAdminApp(`/editor/page/${PAGE_ID}`, withTheme({ errors: [OTHER_CODE_PROBLEM] }));
      await openSettings();

      await expect
        .element(editorScreen.settingsShowTitle())
        .toHaveAttribute('data-state', 'unchecked');
      await expect(editorScreen.settingsShowTitleWarning()).toHaveCount(0);
    },
    SLOW,
  );

  it(
    'stays quiet when the backend reports no theme at all',
    async () => {
      fakeSavablePage({ show_title_and_feature_image: false });
      await renderAdminApp(`/editor/page/${PAGE_ID}`, {
        ...FLAG_ON,
        boot: { browseActiveTheme: { response: { themes: [] } } },
      });
      await openSettings();

      await expect
        .element(editorScreen.settingsShowTitle())
        .toHaveAttribute('data-state', 'unchecked');
      await expect(editorScreen.settingsShowTitleWarning()).toHaveCount(0);
    },
    SLOW,
  );
});
