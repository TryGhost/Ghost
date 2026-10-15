import { describe, expect, it } from 'vitest';
import { userEvent } from 'vitest/browser';
import { buildLexicalParagraph } from '@tryghost/test-data';

import {
  currentUserResponse,
  fakeAdminEndpoint,
  fakeEditorChrome,
  post,
  renderAdminApp,
  withoutAutosave,
} from '@test-utils/acceptance';
import type { EditorFont } from '@/editor/editor-font';
import { EDITOR_HELP_URL } from '@/editor/editor-help';
import { editorScreen } from '@/editor/editor.screen';

function fakeDraft() {
  fakeEditorChrome();
  fakeAdminEndpoint('GET', /^\/posts\/abc123\/\?/, {
    posts: [
      post({
        id: 'abc123',
        title: 'A draft',
        lexical: buildLexicalParagraph('Some words to read in another font.'),
        status: 'draft',
        tags: [],
        authors: [{ id: '1' }],
      }),
    ],
  });
}

/** The flag, and the font the writer saved before (none: never chosen). */
function editorOptions({ flag, saved }: { flag: boolean; saved?: EditorFont }) {
  const me = currentUserResponse();
  if (saved) {
    me.users[0].accessibility = JSON.stringify({ editor: { bodyFont: saved } });
  }
  return {
    ...withoutAutosave(),
    labs: { admin7EditorImprovements: flag },
    boot: { browseMe: { response: me } },
  };
}

/** Echoes preference writes, so they persist, and reads back the fonts they saved. */
function fakePreferencesApi() {
  const api = fakeAdminEndpoint('PUT', /^\/users\/\w+\//, ({ body }) => body);
  const savedFonts = () =>
    api.requests.map(({ body }) => {
      const { users } = body as { users: Array<{ accessibility: string }> };
      const preferences = JSON.parse(users[0].accessibility) as {
        editor?: { bodyFont?: EditorFont };
      };
      return preferences.editor?.bodyFont;
    });
  return { savedFonts };
}

/** Opens the settings panel and expands its Editor font row. */
async function openFontChoices() {
  await userEvent.click(editorScreen.settingsToggle());
  await expect.element(editorScreen.fontToggle()).toBeVisible();
  await userEvent.click(editorScreen.fontToggle());
  await expect.element(editorScreen.fontToggle()).toHaveAttribute('aria-expanded', 'true');
}

describe('Editor font (admin7EditorImprovements)', () => {
  it('sets the editor in each font the writer picks and saves it as it is picked', async () => {
    fakeDraft();
    const preferences = fakePreferencesApi();
    await renderAdminApp('/editor/post/abc123', editorOptions({ flag: true }));
    await expect.element(editorScreen.body()).toBeVisible();
    await expect.element(editorScreen.root()).toHaveAttribute('data-editor-font', 'serif');

    await openFontChoices();
    await expect.element(editorScreen.fontOption('Serif')).toHaveAttribute('aria-checked', 'true');

    await userEvent.click(editorScreen.fontOption('Sans'));
    await expect.element(editorScreen.root()).toHaveAttribute('data-editor-font', 'sans');
    await expect.poll(() => preferences.savedFonts()).toEqual(['sans']);
    await userEvent.click(editorScreen.fontOption('Mono'));
    await expect.element(editorScreen.root()).toHaveAttribute('data-editor-font', 'mono');
    await expect.poll(() => preferences.savedFonts()).toEqual(['sans', 'mono']);

    // The row folds the choices away again; Escape leaves them be.
    await userEvent.keyboard('{Escape}');
    await expect.element(editorScreen.fontOption('Mono')).toBeVisible();
    await userEvent.click(editorScreen.fontToggle());
    await expect.element(editorScreen.fontToggle()).toHaveAttribute('aria-expanded', 'false');
    // Folded, the choices stay mounted to animate shut but take no focus.
    const choices = () =>
      document.getElementById(
        editorScreen.fontToggle().element().getAttribute('aria-controls') ?? '',
      );
    await expect.poll(() => choices()?.inert).toBe(true);
    await expect.element(editorScreen.root()).toHaveAttribute('data-editor-font', 'mono');
  });

  it('opens in the font the writer saved', async () => {
    fakeDraft();
    await renderAdminApp('/editor/post/abc123', editorOptions({ flag: true, saved: 'mono' }));
    await expect.element(editorScreen.body()).toBeVisible();

    await expect.element(editorScreen.root()).toHaveAttribute('data-editor-font', 'mono');
    await openFontChoices();
    await expect.element(editorScreen.fontOption('Mono')).toHaveAttribute('aria-checked', 'true');
  });

  it('moves the help link and the font out of the footer into the settings panel', async () => {
    fakeDraft();
    await renderAdminApp('/editor/post/abc123', editorOptions({ flag: true }));
    await expect.element(editorScreen.body()).toBeVisible();
    await expect.element(editorScreen.helpLink()).not.toBeInTheDocument();
    await expect.element(editorScreen.fontToggle()).not.toBeInTheDocument();

    await userEvent.click(editorScreen.settingsToggle());
    await expect.element(editorScreen.fontToggle()).toBeVisible();
    await expect.element(editorScreen.fontToggle()).toHaveAttribute('aria-expanded', 'false');
    await expect
      .element(editorScreen.settingsEditorHelp())
      .toHaveAttribute('href', EDITOR_HELP_URL);
    await expect.element(editorScreen.settingsEditorHelp()).toHaveAttribute('target', '_blank');
  });

  it('leaves the editor as it was while the flag is off', async () => {
    fakeDraft();
    await renderAdminApp('/editor/post/abc123', editorOptions({ flag: false, saved: 'mono' }));
    await expect.element(editorScreen.body()).toBeVisible();

    await expect.element(editorScreen.root()).toHaveAttribute('data-editor-font', 'serif');
    await expect.element(editorScreen.helpLink()).toHaveAttribute('href', EDITOR_HELP_URL);

    await userEvent.click(editorScreen.settingsToggle());
    await expect.element(editorScreen.settingsSidebar()).toBeVisible();
    await expect.element(editorScreen.fontToggle()).not.toBeInTheDocument();
    await expect.element(editorScreen.settingsEditorHelp()).not.toBeInTheDocument();
  });
});
