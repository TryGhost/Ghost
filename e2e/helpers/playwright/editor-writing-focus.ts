import { BrowserContext, Page } from '@playwright/test';

/**
 * While the writer types, the editor hides its chrome (the header's actions,
 * the settings toggle, the word count) and the hidden chrome takes no pointer
 * input until the pointer travels. Playwright checks what a click would hit
 * before it moves the mouse, so a click on hidden chrome would never bring it
 * back. Whenever hidden
 * chrome is on screen before an action, the pointer moves, as a writer's does.
 */
async function revealHiddenEditorChrome(page: Page): Promise<void> {
  await page.addLocatorHandler(
    page.locator('[data-writing-focus="hidden"]').first(),
    async () => {
      // The left edge, clear of every control.
      await page.mouse.move(1, 1);
      await page.mouse.move(1, 40);
    },
    // Typing still under way can hide the chrome again, and a handler waiting
    // for it to stay shown would never finish or run again. Playwright checks
    // before every retry, so the next attempt moves the pointer once more.
    { noWaitAfter: true },
  );
}

/** Reveals hidden editor chrome before actions on every page the context opens. */
export function revealHiddenEditorChromeIn(context: BrowserContext): void {
  context.on('page', (page) => {
    // A page closed straight after opening has nothing to reveal.
    revealHiddenEditorChrome(page).catch(() => {});
  });
}
