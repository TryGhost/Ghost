import { describe, expect, it } from 'vitest';
import { userEvent, type Locator } from 'vitest/browser';
import { buildLexicalParagraph } from '@tryghost/test-data';

import {
  fakeAdminEndpoint,
  fakeEditorChrome,
  post,
  renderAdminApp,
  withoutAutosave,
} from '@test-utils/acceptance';
import { editorScreen } from '@/editor/editor.screen';

function fakeDraft() {
  fakeEditorChrome();
  fakeAdminEndpoint('GET', /^\/posts\/abc123\/\?/, {
    posts: [
      post({
        id: 'abc123',
        title: 'A draft',
        lexical: buildLexicalParagraph('Some words to write after.'),
        status: 'draft',
        tags: [],
        authors: [{ id: '1' }],
      }),
    ],
  });
}

/** How the piece of chrome holding `control` stands, or null where nothing hides. */
function writingFocusOf(control: Locator) {
  return control.element().closest('[data-writing-focus]')?.getAttribute('data-writing-focus');
}

function chrome() {
  return [
    editorScreen.status(),
    editorScreen.publishButton(),
    editorScreen.settingsToggle(),
    editorScreen.wordCount(),
    editorScreen.featureImageInput(),
  ];
}

describe('Writing focus', () => {
  it('hides the chrome while the writer types and shows it again when the mouse moves', async () => {
    fakeDraft();
    await renderAdminApp('/editor/post/abc123', withoutAutosave());
    await expect.element(editorScreen.body()).toBeVisible();
    for (const control of chrome()) {
      expect(writingFocusOf(control)).toBe('shown');
    }

    await userEvent.click(editorScreen.body());
    await userEvent.keyboard('More');
    await expect.poll(() => chrome().map(writingFocusOf)).toEqual(chrome().map(() => 'hidden'));
    // The way out stays in view, and takes the pointer.
    expect(writingFocusOf(editorScreen.backLink('post'))).toBeUndefined();
    expect(getComputedStyle(editorScreen.backLink('post').element()).pointerEvents).not.toBe(
      'none',
    );

    // The pointer travels from where it was, even in a single jump.
    await userEvent.hover(editorScreen.titleInput());
    await expect.poll(() => chrome().map(writingFocusOf)).toEqual(chrome().map(() => 'shown'));
  });

  it('shows the chrome again when the writer scrolls with a wheel or trackpad', async () => {
    fakeDraft();
    await renderAdminApp('/editor/post/abc123', withoutAutosave());
    await expect.element(editorScreen.body()).toBeVisible();
    await userEvent.click(editorScreen.body());
    await userEvent.keyboard('More');
    await expect.poll(() => writingFocusOf(editorScreen.settingsToggle())).toBe('hidden');

    editorScreen.scrollPane().dispatchEvent(new WheelEvent('wheel', { bubbles: true, deltaY: 40 }));

    await expect.poll(() => chrome().map(writingFocusOf)).toEqual(chrome().map(() => 'shown'));
  });

  it('keeps the chrome while the settings panel is open', async () => {
    fakeDraft();
    await renderAdminApp('/editor/post/abc123', withoutAutosave());
    await expect.element(editorScreen.body()).toBeVisible();
    await editorScreen.settingsToggle().click();
    await expect.element(editorScreen.settingsSidebar()).toBeVisible();

    await userEvent.click(editorScreen.body());
    await userEvent.keyboard('More');

    await expect.element(editorScreen.body()).toHaveTextContent(/More/);
    expect(writingFocusOf(editorScreen.settingsToggle())).toBe('shown');
    expect(writingFocusOf(editorScreen.wordCount())).toBe('shown');
  });
});
