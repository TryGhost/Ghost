import { type Locator, page, userEvent } from 'vitest/browser';
import {
  noResultsText,
  searchDialog,
  searchSiteButton,
  shortcutHintText,
} from '@tryghost/test-data/selectors/global-search';

import { isMacPlatform } from '@/utils/is-mac-platform';

const modifier = isMacPlatform() ? 'Meta' : 'Control';

/** Cmd-K search locators and gestures for acceptance specs; no assertions. */
export const globalSearchScreen = {
  openButton: () => page.getByRole('button', { name: searchSiteButton }),
  dialog: () => page.getByRole('dialog', { name: searchDialog }),
  input: () => globalSearchScreen.dialog().getByRole('combobox'),
  group: (name: string) => globalSearchScreen.dialog().getByRole('group', { name }),
  option: (name: string | RegExp) => globalSearchScreen.dialog().getByRole('option', { name }),
  noResults: () => globalSearchScreen.dialog().getByText(noResultsText),
  shortcutHint: () => globalSearchScreen.dialog().getByText(shortcutHintText),
  highlight: (option: string | RegExp) => globalSearchScreen.option(option).getByRole('mark'),

  async pressShortcut(): Promise<void> {
    await userEvent.keyboard(`{${modifier}>}k{/${modifier}}`);
  },

  /**
   * Dispatches the shortcut on the document and reports whether anything
   * handled it, which is observable without waiting for the modal to load.
   */
  dispatchShortcut(): boolean {
    const event = new KeyboardEvent('keydown', {
      key: 'k',
      code: 'KeyK',
      metaKey: modifier === 'Meta',
      ctrlKey: modifier === 'Control',
      bubbles: true,
      cancelable: true,
    });
    document.dispatchEvent(event);
    return event.defaultPrevented;
  },

  /** Clicks the page at the centre of `locator`'s box, landing on whatever is on top there. */
  async clickAt(locator: Locator): Promise<void> {
    const box = locator.element().getBoundingClientRect();
    await userEvent.click(page.elementLocator(document.body), {
      position: { x: box.x + box.width / 2, y: box.y + box.height / 2 },
    });
  },

  async search(term: string): Promise<void> {
    await globalSearchScreen.input().fill(term);
  },
};
