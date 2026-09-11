import { describe, expect, it } from 'vitest';
import { userEvent } from 'vitest/browser';

import {
  fakeAdminEndpoint,
  fakeEditorChrome,
  fakeEditorPost,
  fakeThemes,
  post,
  renderAdminApp,
  submittedPost,
  theme,
  unsavedChangesGuarded,
  type ThemeTemplate,
} from '@test-utils/acceptance';
import { editorScreen } from '@/editor/editor.screen';

const POST_ID = 'abc123';
const FLAG_ON = { labs: { editorReact: true } };
const PUBLISHED_AT = '2025-12-01T10:00:00.000Z';

// A settings save waits on the engine's queue, so these journeys outlast the default timeout.
const SLOW = 20_000;
const POLL = { timeout: 10_000 };
// Under the 3s autosave debounce, so only an undebounced field save can satisfy it.
const FIELD_POLL = { timeout: 2_000 };

type SavedPost = ReturnType<typeof post>;

// The shapes the themes API reports for `custom-*.hbs`, `post-*.hbs` and `page-*.hbs`.
const SHARED_TEMPLATE = {
  filename: 'custom-full-feature',
  name: 'Full Feature',
  for: ['page', 'post'],
  slug: null,
};
const LONGREAD_TEMPLATE = {
  filename: 'custom-longread',
  name: 'Longread',
  for: ['page', 'post'],
  slug: null,
};
const SLUG_TEMPLATE = {
  filename: 'post-hello-from-react',
  name: 'Hello From React',
  for: ['post'],
  slug: 'hello-from-react',
};

/** The active theme's templates, alongside an installed theme whose templates never count. */
function fakeSiteThemes(templates: ThemeTemplate[]) {
  fakeThemes([
    theme({ name: 'casper', templates: [SHARED_TEMPLATE, LONGREAD_TEMPLATE] }),
    theme({ name: 'edition', active: true, templates }),
  ]);
}

function editorChrome() {
  fakeEditorChrome();
  fakeAdminEndpoint('GET', /^\/slugs\/post\//, ({ url }) => ({
    slugs: [{ slug: decodeURIComponent(url.split('/slugs/post/')[1].split('/')[0]) }],
  }));
}

/** A post that answers saves the way Ghost does: submitted fields back, fresh token. */
function fakeSavablePost(overrides: Partial<SavedPost> = {}) {
  editorChrome();
  return fakeEditorPost({
    custom_template: null,
    tags: [],
    ...overrides,
  });
}

async function openTemplate() {
  await editorScreen.settingsToggle().click();
  await expect.element(editorScreen.settingsSidebar()).toBeVisible();
  await expect.element(editorScreen.settingsTemplate()).toBeVisible();
}

async function chooseTemplate(label: string) {
  await editorScreen.settingsTemplate().click();
  await editorScreen.settingsTemplateOption(label).click();
}

/**
 * The sidebar's Template section: the active theme's custom templates, and the
 * one a post's own URL already picks.
 */
describe('Post settings template', () => {
  it(
    'persists a draft’s template on its own',
    async () => {
      fakeSiteThemes([SHARED_TEMPLATE, LONGREAD_TEMPLATE]);
      const saveApi = fakeSavablePost();
      await renderAdminApp(`/editor/post/${POST_ID}`, FLAG_ON);
      await openTemplate();

      await expect.element(editorScreen.settingsTemplate()).toHaveTextContent('Default');

      await chooseTemplate('Longread');

      // A field save has no debounce, so it lands well inside the autosave's 3s.
      await expect.poll(() => saveApi.requests.length, FIELD_POLL).toBe(1);
      expect(submittedPost(saveApi)).toMatchObject({ custom_template: 'custom-longread' });
      await expect.element(editorScreen.settingsTemplate()).toHaveTextContent('Longread');
    },
    SLOW,
  );

  it(
    'clears the template when the default is chosen again',
    async () => {
      fakeSiteThemes([SHARED_TEMPLATE, LONGREAD_TEMPLATE]);
      const saveApi = fakeSavablePost({ custom_template: 'custom-longread' });
      await renderAdminApp(`/editor/post/${POST_ID}`, FLAG_ON);
      await openTemplate();

      await expect.element(editorScreen.settingsTemplate()).toHaveTextContent('Longread');

      await chooseTemplate('Default');

      await expect.poll(() => saveApi.requests.length, FIELD_POLL).toBe(1);
      expect(submittedPost(saveApi).custom_template).toBeNull();
      await expect.element(editorScreen.settingsTemplate()).toHaveTextContent('Default');
    },
    SLOW,
  );

  it(
    'leaves the section out when the active theme offers no templates',
    async () => {
      // Slug templates are the theme's, never the writer's, to pick.
      fakeSiteThemes([SLUG_TEMPLATE]);
      fakeSavablePost();
      await renderAdminApp(`/editor/post/${POST_ID}`, FLAG_ON);
      await editorScreen.settingsToggle().click();
      await expect.element(editorScreen.settingsSidebar()).toBeVisible();
      await expect.element(editorScreen.settingsExcerpt()).toBeVisible();

      await expect(editorScreen.settingsTemplate()).toHaveCount(0);
    },
    SLOW,
  );

  it(
    'hands the choice to the theme when the post’s URL matches a template',
    async () => {
      fakeSiteThemes([SHARED_TEMPLATE, SLUG_TEMPLATE]);
      fakeSavablePost();
      await renderAdminApp(`/editor/post/${POST_ID}`, FLAG_ON);
      await openTemplate();

      await expect
        .element(editorScreen.settingsTemplateSlugMatch())
        .toHaveTextContent('Post URL matches post-hello-from-react');
      await expect.element(editorScreen.settingsTemplate()).toBeDisabled();
    },
    SLOW,
  );

  it(
    'stages a published post’s template until Update',
    async () => {
      fakeSiteThemes([SHARED_TEMPLATE, LONGREAD_TEMPLATE]);
      const saveApi = fakeSavablePost({ status: 'published', published_at: PUBLISHED_AT });
      await renderAdminApp(`/editor/post/${POST_ID}`, FLAG_ON);
      await openTemplate();

      await expect.element(editorScreen.updateButton()).toBeDisabled();

      await chooseTemplate('Full Feature');

      await expect.element(editorScreen.updateButton()).toBeEnabled();
      await expect.poll(unsavedChangesGuarded).toBe(true);
      expect(saveApi.requests).toHaveLength(0);

      await userEvent.keyboard('{Meta>}s{/Meta}');

      await expect.poll(() => saveApi.requests.length, POLL).toBe(1);
      expect(submittedPost(saveApi)).toMatchObject({
        custom_template: 'custom-full-feature',
        status: 'published',
      });
      await expect.element(editorScreen.updateButton()).toBeDisabled();
    },
    SLOW,
  );
});
