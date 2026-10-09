import { describe, expect, it } from 'vitest';
import type { Locator } from 'vitest/browser';

import {
  fakeEditorChrome,
  fakeEditorPost,
  fakeLabels,
  renderAdminApp,
} from '@test-utils/acceptance';
import { editorScreen } from '@/editor/editor.screen';

const POST_ID = 'abc123';
const FLAG_ON = { labs: { editorReact: true } };

const SIGNUP_CARD_LEXICAL = JSON.stringify({
  root: {
    children: [
      {
        type: 'signup',
        version: 1,
        alignment: 'left',
        backgroundColor: '#F0F0F0',
        backgroundImageSrc: '',
        backgroundSize: 'cover',
        buttonColor: '#000000',
        buttonText: 'Subscribe',
        buttonTextColor: '#FFFFFF',
        disclaimer: '',
        header: '<span>Join us</span>',
        labels: [],
        layout: 'regular',
        subheader: '',
        textColor: '#000000',
        swapped: false,
      },
    ],
    direction: null,
    format: '',
    indent: 0,
    type: 'root',
    version: 1,
  },
});

/** Moves the panel's corner onto the control's, through Koenig's own mouse handlers. */
function dragOnto(panel: Locator, control: Locator) {
  const from = panel.element().getBoundingClientRect();
  const to = control.element().getBoundingClientRect();
  panel
    .element()
    .dispatchEvent(
      new MouseEvent('mousedown', { bubbles: true, clientX: from.left + 8, clientY: from.top + 8 }),
    );
  window.dispatchEvent(new MouseEvent('mousemove', { clientX: to.left + 8, clientY: to.top + 8 }));
  window.dispatchEvent(new MouseEvent('mouseup', { clientX: to.left + 8, clientY: to.top + 8 }));
}

function isCoveredBy(control: Locator, cover: Locator) {
  const { left, top, width, height } = control.element().getBoundingClientRect();
  const topmost = document.elementFromPoint(left + width / 2, top + height / 2);
  return cover.element().contains(topmost);
}

describe('Card settings panel', () => {
  it.each([
    ['Publish', () => editorScreen.publishButton()],
    ['the settings toggle', () => editorScreen.settingsToggle()],
    ['the help link', () => editorScreen.helpLink()],
  ])('stays above %s when dragged onto it', async (_, control) => {
    fakeEditorChrome();
    fakeEditorPost({ id: POST_ID, lexical: SIGNUP_CARD_LEXICAL, authors: [{ id: '1' }] });
    fakeLabels([]);
    await renderAdminApp(`/editor/post/${POST_ID}`, FLAG_ON);

    const card = editorScreen.signupCard();
    // The first click selects the card, the second opens its settings.
    await card.click({ position: { x: 4, y: 4 } });
    await card.click({ position: { x: 4, y: 4 } });
    const panel = editorScreen.cardSettingsPanel();
    await expect.element(panel).toBeVisible();

    dragOnto(panel, control());

    // Koenig ignores the pointer over the panel for a moment after a drag.
    await expect.poll(() => isCoveredBy(control(), panel)).toBe(true);
  });
});
