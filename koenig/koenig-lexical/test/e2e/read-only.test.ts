import {ctrlOrCmd, focusEditor, initialize, insertCard, selectBackwards} from '../utils/e2e';
import {expect, test} from '@playwright/test';

async function setEditable(page, editable) {
    await page.evaluate((value) => {
        window.lexicalEditor.setEditable(value);
    }, editable);
}

// waits for React to have rendered the change, which Lexical's own attribute shows
async function setEditableAndRender(page, editable) {
    await setEditable(page, editable);
    const root = page.locator('[data-lexical-editor]').first();
    if (editable) {
        await expect(root).not.toHaveAttribute('aria-readonly', 'true');
    } else {
        await expect(root).toHaveAttribute('aria-readonly', 'true');
    }
}

function calloutText(page) {
    return page.evaluate(() => {
        const callout = window.lexicalEditor.getEditorState().toJSON().root.children.find(child => child.type === 'callout');
        return callout.calloutText.replace(/<[^>]+>/g, '');
    });
}

test.describe('Read-only', async () => {
    let page;

    test.beforeAll(async ({browser}) => {
        page = await browser.newPage();
    });

    test.beforeEach(async () => {
        await initialize({page});
    });

    // the page is shared, and the other tests need an editable editor
    test.afterEach(async () => {
        await setEditable(page, true);
    });

    test.afterAll(async () => {
        await page.close();
    });

    test('takes no typing', async function () {
        await focusEditor(page);
        await page.keyboard.type('before');

        await setEditable(page, false);
        await page.keyboard.type(' after');

        await expect(page.locator('[data-lexical-editor] > p')).toHaveText('before');
    });

    test('closes the format toolbar and offers it again once editable', async function () {
        await focusEditor(page);
        await page.keyboard.type('text for selection');
        await selectBackwards(page, 'for selection'.length);
        await expect(page.locator('[data-kg-floating-toolbar]')).toBeVisible();

        await setEditable(page, false);
        await expect(page.locator('[data-kg-floating-toolbar]')).toHaveCount(0);

        // locking took the focus, so the caret comes back with a click
        await setEditable(page, true);
        await page.locator('[data-lexical-editor] > p').click();
        await page.keyboard.press('End');
        await selectBackwards(page, 'for selection'.length);
        await expect(page.locator('[data-kg-floating-toolbar]')).toBeVisible();
    });

    test('shows no plus button, and offers the card menus again once editable', async function () {
        await focusEditor(page);
        await expect(page.locator('[data-kg-plus-button]')).toBeVisible();

        await setEditable(page, false);

        await expect(page.locator('[data-kg-plus-button]')).toHaveCount(0);

        await setEditableAndRender(page, true);
        await page.locator('[data-lexical-editor] > p').click();
        await expect(page.locator('[data-kg-plus-button]')).toBeVisible();
        await page.keyboard.type('/');
        await expect(page.locator('[data-kg-slash-menu]')).toBeVisible();
    });

    test('closes a card that was being edited and takes no input in it', async function () {
        await focusEditor(page);
        const card = await insertCard(page, {cardName: 'callout'});
        await page.keyboard.type('Card text');
        await expect(card).toHaveAttribute('data-kg-card-editing', 'true');
        await expect(page.locator('[data-kg-settings-panel]')).toBeVisible();

        await setEditable(page, false);

        await expect(card).toHaveAttribute('data-kg-card-editing', 'false');
        await expect(card).toHaveAttribute('data-kg-card-selected', 'false');
        await expect(page.locator('[data-kg-settings-panel]')).toHaveCount(0);
        await expect(card.locator('[data-lexical-editor]')).toHaveAttribute('contenteditable', 'false');
        await expect(card).toHaveCSS('pointer-events', 'none');

        await page.keyboard.type(' more');
        await expect(card.locator('[data-lexical-editor]')).toHaveText('Card text');

        // editable again, the card is as any card that is not being edited
        await setEditableAndRender(page, true);
        await expect(card).not.toHaveCSS('pointer-events', 'none');
        await expect(card.locator('[data-lexical-editor]')).toHaveAttribute('contenteditable', 'false');
    });

    test('selects no card that is clicked, and lets nothing in one take focus', async function () {
        await focusEditor(page);
        const card = await insertCard(page, {cardName: 'image'});
        await page.keyboard.press('ArrowDown');
        await expect(card).toHaveAttribute('data-kg-card-selected', 'false');

        await setEditableAndRender(page, false);

        // forced, as the card takes no pointer input at all
        await card.click({force: true});
        await expect(card).toHaveAttribute('data-kg-card-selected', 'false');
        await expect(page.locator('[data-kg-card-toolbar]')).toHaveCount(0);

        // the keyboard reaches a control the pointer cannot
        await expect(card.locator('button').first()).toBeAttached();
        const focusedInCard = await card.evaluate((element) => {
            element.querySelector('button')?.focus();
            return element.contains(document.activeElement);
        });
        expect(focusedInCard).toBe(false);
    });

    test('keeps an empty card that was selected', async function () {
        await focusEditor(page);
        const card = await insertCard(page, {cardName: 'image'});
        await expect(card).toHaveAttribute('data-kg-card-selected', 'true');

        await setEditable(page, false);

        await expect(card).toHaveAttribute('data-kg-card-selected', 'false');
        await expect(page.locator('[data-kg-card="image"]')).toHaveCount(1);
    });
});

// each test gets its own page: these leave the editor in states that the shared
// page's return to editable would not undo
test.describe('Read-only and back', () => {
    for (const gap of ['in the same tick', 'a microtask later']) {
        test(`can be typed in after going read-only and back ${gap}`, async ({page}) => {
            await initialize({page});
            await focusEditor(page);
            await page.keyboard.type('before');

            await page.evaluate(async (awaitMicrotask) => {
                window.lexicalEditor.setEditable(false);
                if (awaitMicrotask) {
                    await Promise.resolve();
                }
                window.lexicalEditor.setEditable(true);
            }, gap === 'a microtask later');

            await expect(page.locator('[data-lexical-editor]').first()).toHaveAttribute('contenteditable', 'true');

            await page.locator('[data-lexical-editor] > p').click();
            await page.keyboard.press('End');
            await page.keyboard.type(' after');
            await expect(page.locator('[data-lexical-editor] > p')).toHaveText('before after');
        });
    }

    test('copies a card’s text in a selection made across the card', async ({page, context}) => {
        await context.grantPermissions(['clipboard-read', 'clipboard-write']);
        await initialize({page});
        await focusEditor(page);
        await page.keyboard.type('Para one');
        await page.keyboard.press('Enter');
        const card = await insertCard(page, {cardName: 'callout'});
        await page.keyboard.type('Card text');
        await page.keyboard.press(`${ctrlOrCmd(page)}+Enter`);
        await page.keyboard.press('Enter');
        await page.keyboard.type('Para two');
        await expect(card).toHaveAttribute('data-kg-card-selected', 'false');

        await setEditableAndRender(page, false);

        const paragraphs = page.locator('[data-lexical-editor]').first().locator('> p');
        const first = await paragraphs.first().boundingBox();
        const last = await paragraphs.last().boundingBox();
        await page.mouse.move(first.x + 1, first.y + first.height / 2);
        await page.mouse.down();
        await page.mouse.move(first.x + 40, first.y + first.height, {steps: 5});
        await page.mouse.move(last.x + 120, last.y + last.height / 2, {steps: 10});
        await page.mouse.up();

        const selected = await page.evaluate(() => window.getSelection().toString());
        expect(selected).toContain('Para one');
        expect(selected).toContain('Card text');
        expect(selected).toContain('Para two');

        await page.keyboard.press(`${ctrlOrCmd(page)}+KeyC`);
        await expect.poll(() => page.evaluate(() => navigator.clipboard.readText())).toContain('Card text');
    });

    test('a key pressed before the change reaches the screen does not change a card being edited', async ({page}) => {
        await initialize({page});
        await focusEditor(page);
        const card = await insertCard(page, {cardName: 'callout'});
        await page.keyboard.type('Card text');
        await expect(card).toHaveAttribute('data-kg-card-editing', 'true');
        // Lexical folds a DOM text change into its state only once typing has paused
        await page.waitForTimeout(300);

        // the tab stays busy after the change, so the key arrives before React has rendered it
        const locked = page.evaluate(() => {
            window.lexicalEditor.setEditable(false);
            const end = performance.now() + 500;
            while (performance.now() < end) {
                // busy
            }
        });
        await page.waitForTimeout(150);
        await page.keyboard.press('Backspace');
        await locked;

        await expect(card).toHaveAttribute('data-kg-card-editing', 'false');
        await expect(card.locator('[data-lexical-editor]')).toHaveText('Card text');
        expect(await calloutText(page)).toBe('Card text');
    });

    test('takes no input in a card where the browser has no inert', async ({page}) => {
        // a browser without the property: setting it does nothing
        await page.addInitScript(() => {
            Object.defineProperty(HTMLElement.prototype, 'inert', {configurable: true, get() {
                return undefined;
            }, set() {}});
        });
        await initialize({page});
        await focusEditor(page);
        const card = await insertCard(page, {cardName: 'callout'});
        await page.keyboard.type('Card text');
        await page.keyboard.press(`${ctrlOrCmd(page)}+Enter`);
        await page.keyboard.press('Enter');
        await page.keyboard.type('Para after');
        await expect(card).toHaveAttribute('data-kg-card-selected', 'false');

        await setEditableAndRender(page, false);

        const text = await card.locator('[data-lexical-editor] p').boundingBox();
        await page.mouse.click(text.x + 18, text.y + text.height / 2);
        // give a wrongly selected card time to show
        await page.waitForTimeout(300);

        await expect(card).toHaveAttribute('data-kg-card-selected', 'false');
        await expect(page.locator('[data-kg-card-toolbar]')).toHaveCount(0);
        expect(await calloutText(page)).toBe('Card text');
    });

    test('opens the link prompt with the shortcut once editable again', async ({page}) => {
        await initialize({page});
        await focusEditor(page);
        await page.keyboard.type('text for selection');

        await setEditableAndRender(page, false);
        await setEditableAndRender(page, true);

        await page.locator('[data-lexical-editor] > p').click();
        await page.keyboard.press('End');
        await selectBackwards(page, 'selection'.length);
        await expect(page.locator('[data-kg-floating-toolbar]')).toBeVisible();

        await page.keyboard.press(`${ctrlOrCmd(page)}+K`);
        await expect(page.getByTestId('link-input')).toBeVisible();
    });

    test('moves from the title into the body once editable again', async ({page}) => {
        await initialize({page});
        await focusEditor(page);
        await page.keyboard.type('hello');
        // let the editor go quiet, so nothing of its own runs between the two changes
        await page.waitForTimeout(300);

        await setEditableAndRender(page, false);
        await setEditableAndRender(page, true);

        await page.getByTestId('post-title').click();
        await page.keyboard.type('Title');
        await page.keyboard.press('Tab');

        await expect(page.locator('[data-lexical-editor]').first()).toBeFocused();
        await page.keyboard.type('X');
        await expect(page.getByTestId('post-title')).toHaveValue('Title');
        await expect(page.locator('[data-lexical-editor] > p')).toContainText('X');
    });

    test('leaves a card that is not being edited closed once editable again', async ({page}) => {
        await initialize({page});
        await focusEditor(page);
        const card = await insertCard(page, {cardName: 'callout'});
        await page.keyboard.type('Card text');
        await page.keyboard.press(`${ctrlOrCmd(page)}+Enter`);
        await page.keyboard.press('Enter');
        await expect(card).toHaveAttribute('data-kg-card-selected', 'false');
        await expect(card.locator('[data-lexical-editor]')).toHaveAttribute('contenteditable', 'false');

        await setEditableAndRender(page, false);
        await setEditableAndRender(page, true);

        // Lexical makes every nested editor editable along with the top-level one
        await expect(card.locator('[data-lexical-editor]')).toHaveAttribute('contenteditable', 'false');
    });
});

// no read-only involved: the format toolbar of a card's editor comes and goes with
// the card's edit mode, and must work each time
test.describe('Card editor format toolbar', () => {
    test('opens the link prompt with the shortcut the second time a card is edited', async ({page}) => {
        await initialize({page});
        await focusEditor(page);
        const card = await insertCard(page, {cardName: 'callout'});
        await page.keyboard.type('Card text here');

        await page.keyboard.press(`${ctrlOrCmd(page)}+Enter`);
        await expect(card).toHaveAttribute('data-kg-card-editing', 'false');
        await page.keyboard.press(`${ctrlOrCmd(page)}+Enter`);
        await expect(card).toHaveAttribute('data-kg-card-editing', 'true');
        await expect(card.locator('[data-lexical-editor]')).toBeFocused();

        await selectBackwards(page, 'here'.length);
        await expect(page.locator('[data-kg-floating-toolbar]')).toBeVisible();

        await page.keyboard.press(`${ctrlOrCmd(page)}+K`);
        await expect(page.getByTestId('link-input')).toBeVisible();
    });
});
