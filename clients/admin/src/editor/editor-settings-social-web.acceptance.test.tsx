import { describe, expect, it } from 'vitest';
import { userEvent } from 'vitest/browser';

import {
  fakeAdminEndpoint,
  fakeEditorChrome,
  fakeEditorPost,
  post,
  renderAdminApp,
  settingsResponse,
  settleTransitions,
  withoutAutosave,
} from '@test-utils/acceptance';
import { editorScreen } from '@/editor/editor.screen';

const POST_ID = 'abc123';
const PUBLISHED_AT = '2025-12-01T10:00:00.000Z';

type SavedPost = ReturnType<typeof post>;

/** A site with Network on, sharing new posts the way `defaultShare` says. */
function withSocialWeb({ enabled = true, defaultShare = 'article' } = {}) {
  return withoutAutosave({
    boot: {
      browseSettings: {
        response: settingsResponse({
          settings: {
            social_web: enabled,
            social_web_enabled: enabled,
            default_social_web_share: defaultShare,
          },
        }),
      },
    },
  });
}

function fakeSavablePost(overrides: Partial<SavedPost> = {}) {
  fakeEditorChrome();
  fakeAdminEndpoint('GET', /^\/slugs\/post\//, ({ url }) => ({
    slugs: [{ slug: decodeURIComponent(url.split('/slugs/post/')[1].split('/')[0]) }],
  }));
  return fakeEditorPost({
    tags: [],
    social_web_share: 'article',
    social_web_note: null,
    ...overrides,
  });
}

async function openSettings() {
  await editorScreen.settingsToggle().click();
  await expect.element(editorScreen.settingsSidebar()).toBeVisible();
  await settleTransitions();
}

async function chooseShare(label: string) {
  await editorScreen.settingsSocialWebShare().click();
  await editorScreen.settingsSocialWebShareOption(label).click();
}

/** The sidebar's Social web section: how the post is shared once it is published. */
describe('Post settings social web', () => {
  it('saves a draft’s choice to share it as a note', async () => {
    const saveApi = fakeSavablePost();
    await renderAdminApp(`/editor/post/${POST_ID}`, withSocialWeb());
    await openSettings();

    await expect.element(editorScreen.settingsSocialWebShare()).toHaveTextContent('Full article');
    await expect(editorScreen.settingsSocialWebNote()).toHaveCount(0);

    await chooseShare('Short note');

    await expect(saveApi).toHaveSavedFields({ social_web_share: 'note' });
    await expect.element(editorScreen.settingsSocialWebShare()).toHaveTextContent('Short note');
    await expect.element(editorScreen.settingsSocialWebNote()).toBeVisible();
  });

  it('saves a draft’s choice not to share it', async () => {
    const saveApi = fakeSavablePost();
    await renderAdminApp(`/editor/post/${POST_ID}`, withSocialWeb());
    await openSettings();

    await chooseShare('Don’t share');

    await expect(saveApi).toHaveSavedFields({ social_web_share: 'none' });
  });

  it('saves the custom note text and counts what fits before the link', async () => {
    const saveApi = fakeSavablePost({ social_web_share: 'note' });
    await renderAdminApp(`/editor/post/${POST_ID}`, withSocialWeb());
    await openSettings();

    await expect
      .element(editorScreen.settingsSocialWebNoteCount())
      .toHaveTextContent('Leave empty to use the title and excerpt.');

    await editorScreen.settingsSocialWebNote().fill('New post is out!');
    await expect
      .element(editorScreen.settingsSocialWebNoteCount())
      .toHaveTextContent(/characters left/);
    // The blur that ends the edit saves it.
    await userEvent.tab();

    await expect(saveApi).toHaveSavedFields({ social_web_note: 'New post is out!' });
  });

  it('warns when the note text is longer than fits before the link', async () => {
    fakeSavablePost({ social_web_share: 'note' });
    await renderAdminApp(`/editor/post/${POST_ID}`, withSocialWeb());
    await openSettings();

    await editorScreen.settingsSocialWebNote().fill('a'.repeat(500));

    await expect
      .element(editorScreen.settingsSocialWebNoteCount())
      .toHaveTextContent(/characters too many, so the note will be shortened/);
  });

  it('keeps a published post’s choice and note text fixed', async () => {
    fakeSavablePost({
      status: 'published',
      published_at: PUBLISHED_AT,
      url: 'https://example.com/hello-from-react/',
      social_web_share: 'note',
    });
    await renderAdminApp(`/editor/post/${POST_ID}`, withSocialWeb());
    await openSettings();

    await expect.element(editorScreen.settingsSocialWebShare()).toBeDisabled();
    await expect
      .element(editorScreen.settingsSidebar())
      .toHaveTextContent(/Can’t be changed after the post is published/);
    await expect.element(editorScreen.settingsSocialWebNote()).toBeDisabled();
    await expect
      .element(editorScreen.settingsSocialWebNoteCount())
      .toHaveTextContent('A link to the post is added at the end.');
  });

  it('leaves the section out while Network is off', async () => {
    fakeSavablePost();
    await renderAdminApp(`/editor/post/${POST_ID}`, withSocialWeb({ enabled: false }));
    await openSettings();

    await expect(editorScreen.settingsSocialWebShare()).toHaveCount(0);
  });

  it('leaves the section out when the server does not support it', async () => {
    fakeEditorChrome();
    fakeEditorPost({ tags: [] });
    await renderAdminApp(`/editor/post/${POST_ID}`, withSocialWeb());
    await openSettings();

    await expect(editorScreen.settingsSocialWebShare()).toHaveCount(0);
  });

  it('leaves the section out for an email-only post', async () => {
    fakeSavablePost({ email_only: true });
    await renderAdminApp(`/editor/post/${POST_ID}`, withSocialWeb());
    await openSettings();

    await expect(editorScreen.settingsSocialWebShare()).toHaveCount(0);
  });
});
