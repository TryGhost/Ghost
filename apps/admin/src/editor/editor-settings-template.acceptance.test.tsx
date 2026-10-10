import { describe, expect, it } from 'vitest';

import {
  fakeAdminEndpoint,
  fakeEditorChrome,
  fakeEditorPost,
  fakeThemes,
  post,
  renderAdminApp,
  settleTransitions,
  submittedPost,
  theme,
  withoutAutosave,
  type ThemeTemplate,
} from '@test-utils/acceptance';
import { editorScreen } from '@/editor/editor.screen';

const POST_ID = 'abc123';
const LOADED_AT = '2026-01-01T00:00:00.000Z';
const FLAG_ON = withoutAutosave({ labs: { editorReact: true } });
const PUBLISHED_AT = '2025-12-01T10:00:00.000Z';

const POLL = { timeout: 10_000 };

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
  await settleTransitions();
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
  it('persists a draft’s template on its own', async () => {
    fakeSiteThemes([SHARED_TEMPLATE, LONGREAD_TEMPLATE]);
    const saveApi = fakeSavablePost();
    await renderAdminApp(`/editor/post/${POST_ID}`, FLAG_ON);
    await openTemplate();

    await expect.element(editorScreen.settingsTemplate()).toHaveTextContent('Default');

    await chooseTemplate('Longread');

    await expect(saveApi).toHaveSavedFields({ custom_template: 'custom-longread' });
    await expect.element(editorScreen.settingsTemplate()).toHaveTextContent('Longread');
  });

  it('clears the template when the default is chosen again', async () => {
    fakeSiteThemes([SHARED_TEMPLATE, LONGREAD_TEMPLATE]);
    const saveApi = fakeSavablePost({ custom_template: 'custom-longread' });
    await renderAdminApp(`/editor/post/${POST_ID}`, FLAG_ON);
    await openTemplate();

    await expect.element(editorScreen.settingsTemplate()).toHaveTextContent('Longread');

    await chooseTemplate('Default');

    await expect(saveApi).toHaveSavedFields({ custom_template: null });
    await expect.element(editorScreen.settingsTemplate()).toHaveTextContent('Default');
  });

  it('reports a failed theme lookup and lets the writer retry', async () => {
    fakeSiteThemes([SHARED_TEMPLATE, LONGREAD_TEMPLATE]);
    fakeSavablePost();
    const themesApi = fakeAdminEndpoint(
      'GET',
      /^\/themes\//,
      { errors: [{ message: 'Authorization failed', type: 'UnauthorizedError' }] },
      { status: 401 },
    );
    await renderAdminApp(`/editor/post/${POST_ID}`, FLAG_ON);
    await editorScreen.settingsToggle().click();
    await expect.element(editorScreen.settingsSidebar()).toBeVisible();
    await settleTransitions();

    await expect
      .element(editorScreen.settingsLoadError())
      .toHaveTextContent('Couldn’t load templates.');
    await expect(editorScreen.settingsTemplate()).toHaveCount(0);
    expect(themesApi.requests).toHaveLength(1);

    // Once the session is restored, retry the lookup in the existing editor.
    fakeSiteThemes([SHARED_TEMPLATE, LONGREAD_TEMPLATE]);
    await editorScreen.settingsLoadErrorRetry().click();

    await expect.element(editorScreen.settingsTemplate()).toHaveTextContent('Default');
    await expect(editorScreen.settingsLoadError()).toHaveCount(0);
    expect(themesApi.requests).toHaveLength(1);
  });

  it('leaves the section out when the active theme offers no templates', async () => {
    // Slug templates are the theme's, never the writer's, to pick.
    fakeSiteThemes([SLUG_TEMPLATE]);
    fakeSavablePost();
    await renderAdminApp(`/editor/post/${POST_ID}`, FLAG_ON);
    await editorScreen.settingsToggle().click();
    await expect.element(editorScreen.settingsSidebar()).toBeVisible();
    await expect.element(editorScreen.settingsExcerpt()).toBeVisible();

    await expect(editorScreen.settingsTemplate()).toHaveCount(0);
  });

  it('hands the choice to the theme when the post’s URL matches a template', async () => {
    fakeSiteThemes([SHARED_TEMPLATE, SLUG_TEMPLATE]);
    fakeSavablePost();
    await renderAdminApp(`/editor/post/${POST_ID}`, FLAG_ON);
    await openTemplate();

    await expect
      .element(editorScreen.settingsTemplateSlugMatch())
      .toHaveTextContent('Post URL matches post-hello-from-react');
    await expect.element(editorScreen.settingsTemplate()).toBeDisabled();
  });

  it('saves a published post’s template on its own', async () => {
    fakeSiteThemes([SHARED_TEMPLATE, LONGREAD_TEMPLATE]);
    const saveApi = fakeSavablePost({ status: 'published', published_at: PUBLISHED_AT });
    await renderAdminApp(`/editor/post/${POST_ID}`, FLAG_ON);
    await openTemplate();

    await chooseTemplate('Full Feature');

    await expect.poll(() => saveApi.requests.length, POLL).toBe(1);
    expect(submittedPost(saveApi)).toMatchObject({
      id: POST_ID,
      updated_at: LOADED_AT,
      custom_template: 'custom-full-feature',
    });
    await expect.element(editorScreen.updateButton()).toBeDisabled();
  });
});
