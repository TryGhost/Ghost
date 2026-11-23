import {E2E_PORT} from '../../playwright.config';
import {ctrlOrCmd, dragMouse, focusEditor, initialize, insertCard, selectBackwards} from '../utils/e2e';
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

// the tab stays busy after the change, so the key arrives before React has rendered it. Modifiers
// go down first and the key is sent once the change is made, then checked to have arrived in time
async function pressBeforeReadOnlyRenders(page, shortcut) {
    const modifiers = shortcut.split('+');
    const key = modifiers.pop();
    for (const modifier of modifiers) {
        await page.keyboard.down(modifier);
    }

    const changed = page.waitForEvent('console', message => message.text() === 'read-only');
    const arrivedInTime = page.evaluate(() => new Promise((resolve) => {
        window.addEventListener('keydown', () => {
            const root = document.querySelector('[data-lexical-editor]');
            resolve(!window.lexicalEditor.isEditable() && root.getAttribute('contenteditable') === 'true');
        }, {capture: true, once: true});
        window.lexicalEditor.setEditable(false);
        console.log('read-only');
        const end = performance.now() + 500;
        while (performance.now() < end) {
            // busy
        }
    }));
    await changed;
    await page.keyboard.press(key);
    expect(await arrivedInTime).toBe(true);

    for (const modifier of modifiers) {
        await page.keyboard.up(modifier);
    }
}

const documentJson = page => page.evaluate(() => JSON.stringify(window.lexicalEditor.getEditorState().toJSON().root.children));
const documentTypes = async page => JSON.parse(await documentJson(page)).map(node => node.type).join(',');
const text = value => ({detail: 0, format: 0, mode: 'normal', style: '', text: value, type: 'text', version: 1});
const paragraph = (...children) => ({children: children.map(child => (typeof child === 'string' ? text(child) : child)), direction: 'ltr', format: '', indent: 0, type: 'paragraph', version: 1});
const withContent = children => `/#/?content=${encodeURIComponent(JSON.stringify({root: {children, direction: null, format: '', indent: 0, type: 'root', version: 1}}))}`;
const SVG = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400"><rect width="600" height="400" fill="teal"/></svg>';
const PNG = `http://localhost:${E2E_PORT}/Koenig-editor-1.png`;
const imageCard = (fields = {}) => ({type: 'image', version: 1, src: PNG, width: 600, height: 300, title: '', alt: '', caption: '', cardWidth: 'regular', href: '', ...fields});
const signupCard = {type: 'signup', version: 1, alignment: 'left', backgroundColor: 'accent', backgroundImageSrc: SVG, buttonColor: '#ffffff', buttonText: '', buttonTextColor: '#000000', disclaimer: '<span>Disclaimer</span>', header: '<span>Header</span>', labels: [], layout: 'split', subheader: '<span>Subheader</span>', textColor: '#FFFFFF', swaped: false};
const headerCard = {type: 'header', version: 2, size: 'small', style: 'dark', buttonEnabled: false, buttonUrl: '', buttonText: '', header: '<span>Header</span>', subheader: '<span>Sub</span>', backgroundImageSrc: SVG, alignment: 'center', backgroundColor: '#000000', backgroundSize: 'cover', textColor: '#FFFFFF', buttonColor: '#ffffff', buttonTextColor: '#000000', layout: 'split', swapped: false};
const callToActionCard = {type: 'call-to-action', version: 1, backgroundColor: 'green', buttonColor: '#F0F0F0', buttonText: 'Get access now', buttonTextColor: '#000000', buttonUrl: 'http://someblog.com/somepost', hasImage: false, hasSponsorLabel: true, sponsorLabel: '<p><span style="white-space: pre-wrap;">SPONSORED</span></p>', imageUrl: '', layout: 'minimal', showButton: true, showDividers: true, textValue: '<p><span style="white-space: pre-wrap;">This is a new CTA Card.</span></p>'};

// a press and release where the pointer is, which is what reaches a control the
// page says takes no pointer input
async function pressAt(page, locator) {
    const box = await locator.boundingBox();
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.up();
    await page.waitForTimeout(300);
}

function calloutText(page) {
    return page.evaluate(() => {
        const callout = window.lexicalEditor.getEditorState().toJSON().root.children.find(child => child.type === 'callout');
        return new DOMParser().parseFromString(callout.calloutText, 'text/html').body.textContent;
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
        // a control that does take focus while the editor is editable
        const takesFocus = await card.evaluate((element) => {
            const button = element.querySelector('button');
            button.focus();
            const focused = document.activeElement === button;
            button.blur();
            return focused;
        });
        expect(takesFocus).toBe(true);

        await setEditableAndRender(page, false);

        // forced, as the card takes no pointer input at all
        await card.click({force: true});
        await expect(card).toHaveAttribute('data-kg-card-selected', 'false');
        await expect(page.locator('[data-kg-card-toolbar]')).toHaveCount(0);

        // the keyboard reaches a control the pointer cannot
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

    test('a key pressed before the change reaches the screen does not change the text', async ({page}) => {
        await initialize({page});
        await focusEditor(page);
        await page.keyboard.type('Some text');
        await page.waitForTimeout(300);
        const before = await documentJson(page);

        await pressBeforeReadOnlyRenders(page, 'KeyX');

        await expect(page.locator('[data-lexical-editor] > p')).toHaveText('Some text');
        expect(await documentJson(page)).toBe(before);
    });

    test('a key pressed before the change reaches the screen does not change a card being edited', async ({page}) => {
        await initialize({page});
        await focusEditor(page);
        const card = await insertCard(page, {cardName: 'callout'});
        await page.keyboard.type('Card text');
        await expect(card).toHaveAttribute('data-kg-card-editing', 'true');
        // Lexical folds a DOM text change into its state only once typing has paused
        await page.waitForTimeout(300);

        await pressBeforeReadOnlyRenders(page, 'Backspace');

        await expect(card).toHaveAttribute('data-kg-card-editing', 'false');
        await expect(card.locator('[data-lexical-editor]')).toHaveText('Card text');
        expect(await calloutText(page)).toBe('Card text');
    });

    for (const key of ['KeyZ', 'Backspace']) {
        test(`a shortcut with ${key} pressed before the change reaches the screen does not change a code card being edited`, async ({page}) => {
            await initialize({page});
            await focusEditor(page);
            const card = await insertCard(page, {cardName: 'html'});
            await page.keyboard.type('Card text');
            await expect(card).toHaveAttribute('data-kg-card-editing', 'true');
            await page.waitForTimeout(500);
            const before = await documentJson(page);
            expect(before).toContain('Card text');

            // the code editor is still there to undo, or delete to the start of the line
            await pressBeforeReadOnlyRenders(page, `${ctrlOrCmd(page)}+${key}`);

            await expect(card).toHaveAttribute('data-kg-card-editing', 'false');
            await page.waitForTimeout(300);
            expect(await documentJson(page)).toBe(before);
        });
    }

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

        // and when React never gets to render the read-only state in between
        await page.evaluate(() => {
            window.lexicalEditor.setEditable(false);
            window.lexicalEditor.setEditable(true);
        });
        await page.waitForTimeout(500);
        await expect(card.locator('[data-lexical-editor]')).toHaveAttribute('contenteditable', 'false');
    });

    test('leaves both nested editors of a closed call to action card closed once editable again', async ({page}) => {
        await initialize({page, uri: withContent([callToActionCard, paragraph('After')])});
        const card = page.locator('[data-kg-card="call-to-action"]');
        await expect(card.locator('[data-lexical-editor]')).toHaveCount(2);
        await expect(card.locator('[data-lexical-editor][contenteditable="true"]')).toHaveCount(0);

        await setEditableAndRender(page, false);
        await setEditableAndRender(page, true);
        await page.waitForTimeout(300);

        await expect(card.locator('[data-lexical-editor][contenteditable="true"]')).toHaveCount(0);
    });

    test('does not bring an image card’s link field back once editable again', async ({page}) => {
        await initialize({page, uri: withContent([imageCard(), paragraph('After')])});
        await page.locator('[data-kg-card="image"] img').click();
        await page.locator('[data-kg-card-toolbar="image"] [aria-label="Link"]').click();
        await expect(page.getByTestId('link-input')).toBeVisible();
        const before = await documentJson(page);

        await setEditableAndRender(page, false);
        await setEditableAndRender(page, true);
        await page.waitForTimeout(300);

        await expect(page.getByTestId('link-input')).toHaveCount(0);
        expect(await documentJson(page)).toBe(before);
    });

    test('does not bring a video card’s thumbnail picker back once editable again', async ({page}) => {
        // not a video at all, so the picker needs no codec: it offers the thumbnail as it is
        const videoCard = {type: 'video', src: PNG, width: 100, height: 100, duration: 60, thumbnailSrc: PNG};
        await initialize({page, uri: withContent([videoCard, paragraph('After')])});
        await page.locator('[data-kg-card="video"]').click();
        await page.getByTestId('edit-video-card').click();
        await page.getByTestId('media-upload-placeholder').click();
        await expect(page.getByRole('dialog')).toBeVisible();
        const before = await documentJson(page);

        await setEditableAndRender(page, false);
        await expect(page.getByRole('dialog')).toHaveCount(0);
        await setEditableAndRender(page, true);
        await page.waitForTimeout(300);

        await expect(page.getByRole('dialog')).toHaveCount(0);
        expect(await documentJson(page)).toBe(before);
    });

    test('takes no file chosen in a dialog that was opened before it went read-only', async ({page}) => {
        await initialize({page, uri: withContent([imageCard({src: '', width: null, height: null}), paragraph('After')])});
        const fileChooserPromise = page.waitForEvent('filechooser');
        await page.locator('[data-kg-card="image"] button[name="placeholder-button"]').click();
        const fileChooser = await fileChooserPromise;
        const before = await documentJson(page);
        await setEditableAndRender(page, false);

        await fileChooser.setFiles('test/e2e/fixtures/large-image.png');
        await page.waitForTimeout(1500);
        expect(await documentJson(page)).toBe(before);

        // the input lets go of the file, or choosing the same one again later would tell the card nothing
        expect(await page.locator('[data-kg-card="image"] input[type="file"]').evaluate(input => input.files.length)).toBe(0);
    });

    test('does not bring a card’s snippet name field back once editable again', async ({page}) => {
        await initialize({page, uri: withContent([imageCard(), paragraph('After')])});
        await page.locator('[data-kg-card="image"] img').click();
        await page.getByTestId('create-snippet').click();
        await expect(page.getByTestId('snippet-name')).toBeVisible();

        await setEditableAndRender(page, false);
        await setEditableAndRender(page, true);
        await page.waitForTimeout(300);

        await expect(page.getByTestId('snippet-name')).toHaveCount(0);
    });

    test('drops nothing, and shows a card’s toolbar again, after going read-only in the middle of a drag', async ({page}) => {
        await initialize({page, uri: withContent([imageCard(), {type: 'horizontalrule', version: 1}, paragraph('This is some text')])});
        const card = page.locator('[data-kg-card="image"]');
        await expect(card.locator('img')).toBeVisible();
        const before = await documentJson(page);
        await dragMouse(page, await card.boundingBox(), await page.locator('p:not(figure p)').boundingBox(), 'start', 'start', false, 100, 100);
        await setEditableAndRender(page, false);
        await page.mouse.up();
        await page.waitForTimeout(300);
        expect(await documentJson(page)).toBe(before);
        await setEditableAndRender(page, true);

        await page.locator('p:not(figure p)').click();
        await card.locator('img').click();
        await expect(card).toHaveAttribute('data-kg-card-selected', 'true');
        await expect(page.locator('[data-kg-card-toolbar="image"]')).toBeVisible();
    });
});

// the writers that are not typing: each of these changed a read-only document
test.describe('Read-only document', () => {
    test('is not changed by dragging a link within it', async ({page}) => {
        const link = {children: [text('Ghost link')], direction: 'ltr', format: '', indent: 0, type: 'link', rel: null, target: null, title: null, url: 'https://ghost.org/', version: 1};
        await initialize({page, uri: withContent([paragraph(link), paragraph('Second paragraph here')])});
        await setEditableAndRender(page, false);
        const before = await documentJson(page);

        const anchor = await page.locator('[data-lexical-editor] a').first().boundingBox();
        const second = await page.locator('[data-lexical-editor]').first().locator('> p').nth(1).boundingBox();
        await page.mouse.move(anchor.x + anchor.width / 2, anchor.y + anchor.height / 2);
        await page.mouse.down();
        // a drag starts only after a short hold
        await page.waitForTimeout(500);
        await page.mouse.move(anchor.x + anchor.width / 2 + 10, anchor.y + anchor.height / 2 + 10, {steps: 5});
        await page.mouse.move(second.x + 200, second.y + second.height / 2, {steps: 10});
        await page.waitForTimeout(200);
        await page.mouse.up();
        await page.waitForTimeout(400);

        expect(await documentJson(page)).toBe(before);
    });

    test('is not changed by HTML dropped on it from outside', async ({page}) => {
        await initialize({page, uri: withContent([paragraph('Para one')])});
        await setEditableAndRender(page, false);
        const before = await documentJson(page);

        const refused = await page.evaluate(() => {
            const dataTransfer = new DataTransfer();
            dataTransfer.setData('text/html', '<p>DROPPED</p>');
            const drop = new DragEvent('drop', {dataTransfer, bubbles: true, cancelable: true});
            document.querySelector('[data-lexical-editor] > p').dispatchEvent(drop);
            return drop.defaultPrevented;
        });
        await page.waitForTimeout(300);

        expect(await documentJson(page)).toBe(before);
        // or the browser would open what was dropped
        expect(refused).toBe(true);
    });

    // these buttons ask for pointer input themselves, over what their card says
    for (const [cardName, testId, changed] of [['signup', 'media-upload-remove', 'backgroundImageSrc'], ['header', 'media-upload-size', 'backgroundSize']]) {
        test(`is not changed by the image button of a ${cardName} card`, async ({page}) => {
            await initialize({page, uri: withContent([cardName === 'signup' ? signupCard : headerCard, paragraph('After')])});
            await setEditableAndRender(page, false);
            const card = page.locator(`[data-kg-card="${cardName}"]`);
            await expect(card).toHaveCSS('pointer-events', 'none');
            const before = JSON.parse(await documentJson(page))[0][changed];

            await pressAt(page, card.getByTestId(testId));

            expect(JSON.parse(await documentJson(page))[0][changed]).toBe(before);
        });
    }

    test('keeps an empty card that was being edited when a click lands outside the editor', async ({page}) => {
        await initialize({page});
        await focusEditor(page);
        await page.keyboard.type('Para');
        await page.keyboard.press('Enter');
        const card = await insertCard(page, {cardName: 'html'});
        await expect(card).toHaveAttribute('data-kg-card-editing', 'true');
        await setEditableAndRender(page, false);
        await expect(page.locator('[data-kg-card="html"]')).toHaveCount(1);

        await page.getByTestId('post-title').click();
        await page.waitForTimeout(300);

        await expect(page.locator('[data-kg-card="html"]')).toHaveCount(1);
    });

    test('keeps an empty bookmark card when Escape is pressed', async ({page}) => {
        await initialize({page});
        await focusEditor(page);
        await page.keyboard.type('Para');
        await page.keyboard.press('Enter');
        await insertCard(page, {cardName: 'bookmark'});
        await setEditableAndRender(page, false);

        await page.keyboard.press('Escape');
        await page.waitForTimeout(300);

        await expect(page.locator('[data-kg-card="bookmark"]')).toHaveCount(1);
    });

    test('closes an emoji menu that was open, so nothing is picked from it', async ({page}) => {
        await initialize({page});
        await focusEditor(page);
        await page.keyboard.type('Hi :smil');
        await expect(page.getByTestId('emoji-menu')).toBeVisible();
        const before = await documentJson(page);
        await setEditableAndRender(page, false);

        await expect(page.getByTestId('emoji-menu')).toHaveCount(0);
        expect(await documentJson(page)).toBe(before);
    });

    test('closes the link search results that were open, so nothing is picked from them', async ({page}) => {
        await initialize({page});
        await focusEditor(page);
        await page.keyboard.type('First paragraph');
        await page.keyboard.press('Enter');
        await page.keyboard.type('@');
        await expect(page.getByTestId('at-link-popup').locator('li[role="option"]').first()).toBeVisible();
        const before = await documentJson(page);
        await setEditableAndRender(page, false);

        await expect(page.getByTestId('at-link-popup')).toHaveCount(0);
        expect(await documentJson(page)).toBe(before);

        // moving the selection away ends a search, which rewrites it as text
        await page.locator('[data-lexical-editor]').first().locator('> p').first().click();
        await page.waitForTimeout(300);
        expect(await documentJson(page)).toBe(before);

        // and the results are not offered again for a search the cursor has left
        await setEditableAndRender(page, true);
        await page.waitForTimeout(300);
        await expect(page.getByTestId('at-link-popup')).toHaveCount(0);
    });

    test('does not offer link search results again by itself once editable, only when the search is typed in', async ({page}) => {
        await initialize({page});
        await focusEditor(page);
        await page.keyboard.type('First paragraph');
        await page.keyboard.press('Enter');
        await page.keyboard.type('@');
        await expect(page.getByTestId('at-link-popup').locator('li[role="option"]').first()).toBeVisible();
        const before = await documentJson(page);

        // the cursor stays in the search
        await setEditableAndRender(page, false);
        await setEditableAndRender(page, true);
        await page.waitForTimeout(300);
        await expect(page.getByTestId('at-link-popup')).toHaveCount(0);

        // shown, they would take Enter from wherever focus is
        await page.keyboard.press('Enter');
        await page.waitForTimeout(300);
        expect(await documentJson(page)).toBe(before);

        await page.locator('[data-lexical-editor]').first().focus();
        await page.keyboard.type('E');
        await expect(page.getByTestId('at-link-popup').locator('li[role="option"]').first()).toBeVisible();
    });

    test('closes an image selector that was open, and keeps its card', async ({page}) => {
        await page.route('https://api.unsplash.com/**', route => route.fulfill({status: 200, body: '[]'}));
        await initialize({page});
        await focusEditor(page);
        await page.keyboard.type('Para');
        await page.keyboard.press('Enter');
        await page.click('[data-kg-plus-button]');
        await page.click('button[data-kg-card-menu-item="Unsplash"]');
        await expect(page.locator('[data-kg-modal="unsplash"]')).toBeVisible();
        const before = await documentTypes(page);
        await setEditableAndRender(page, false);

        await expect(page.locator('[data-kg-modal="unsplash"]')).toHaveCount(0);
        expect(await documentTypes(page)).toBe(before);
    });

    test('is not changed by going read-only while a card’s emptied field has focus', async ({page}) => {
        await initialize({page});
        await focusEditor(page);
        const card = await insertCard(page, {cardName: 'signup'});
        await expect(card).toHaveAttribute('data-kg-card-editing', 'true');
        await page.getByTestId('signup-button-text').click();
        await page.keyboard.press(`${ctrlOrCmd(page)}+A`);
        await page.keyboard.press('Backspace');
        await expect(page.getByTestId('signup-button-text')).toHaveValue('');
        await page.waitForTimeout(300);
        const before = await documentJson(page);

        await setEditableAndRender(page, false);
        await page.waitForTimeout(300);

        expect(await documentJson(page)).toBe(before);
    });

    test('is not changed by dragging a card', async ({page}) => {
        await initialize({page, uri: withContent([imageCard(), {type: 'horizontalrule', version: 1}, paragraph('This is some text')])});
        const card = page.locator('[data-kg-card="image"]');
        await expect(card.locator('img')).toBeVisible();
        await setEditableAndRender(page, false);
        const before = await documentJson(page);

        await dragMouse(page, await card.boundingBox(), await page.locator('p:not(figure p)').boundingBox(), 'start', 'start', true, 100, 100);
        await page.waitForTimeout(300);
        expect(await documentJson(page)).toBe(before);

        // the app renders the editor again, which makes its drag container anew
        await page.getByTestId('post-title').fill('A title');
        await page.waitForTimeout(300);
        await dragMouse(page, await card.boundingBox(), await page.locator('p:not(figure p)').boundingBox(), 'start', 'start', true, 100, 100);
        await page.waitForTimeout(300);
        expect(await documentJson(page)).toBe(before);
    });

    // placing the cursor is an update too, and these shortcuts rewrite the text it lands in
    test('is not changed by a click in text that reads as a shortcut', async ({page}) => {
        await initialize({page, uri: withContent([paragraph('alpha -- beta'), paragraph('gamma---delta'), paragraph('---'), paragraph('==='), paragraph('Last')])});
        await setEditableAndRender(page, false);
        const before = await documentJson(page);
        expect(await documentTypes(page)).toBe('paragraph,paragraph,paragraph,paragraph,paragraph');

        for (const index of [0, 1, 2, 3]) {
            await page.locator('[data-lexical-editor]').first().locator('> *').nth(index).click();
            await page.waitForTimeout(200);
        }

        expect(await documentJson(page)).toBe(before);
    });

    for (const [cardName, menuItem] of [['bookmark', 'Bookmark'], ['embed', 'Other...']]) {
        test(`is not changed by Enter in the URL field of a ${cardName} card`, async ({page}) => {
            await initialize({page});
            await focusEditor(page);
            await page.keyboard.type('Para');
            await page.keyboard.press('Enter');
            await page.keyboard.type(`/${cardName}`);
            await expect(page.locator(`[data-kg-card-menu-item="${menuItem}"][data-kg-cardmenu-selected="true"]`)).toBeVisible();
            await page.keyboard.press('Enter');
            await page.keyboard.type('https://ghost.org/');
            await expect(page.getByTestId(`${cardName}-url`)).toHaveValue('https://ghost.org/');
            const before = await documentJson(page);
            await setEditableAndRender(page, false);

            await page.keyboard.press('Enter');
            await page.waitForTimeout(1500);

            expect(await documentJson(page)).toBe(before);
        });
    }

    test('is not changed by a key on a card button that already had focus', async ({page}) => {
        await initialize({page, uri: withContent([headerCard, paragraph('After')])});
        const button = page.locator('[data-kg-card="header"]').getByTestId('media-upload-size');
        await button.focus();
        await expect(button).toBeFocused();
        await setEditableAndRender(page, false);
        await expect(button).toBeFocused();
        const before = await documentJson(page);

        await page.keyboard.press('Enter');
        await page.keyboard.press('Space');
        await page.waitForTimeout(300);
        expect(await documentJson(page)).toBe(before);

        // a click that is not the pointer's, as assistive technology makes
        await button.evaluate(element => element.click());
        await page.waitForTimeout(300);
        expect(await documentJson(page)).toBe(before);

        // a shortcut is the browser's and the app's, and reaches them untouched. A plain key does not
        await page.evaluate(() => {
            window._seenKeys = [];
            window.addEventListener('keydown', event => window._seenKeys.push(`${event.key}:${event.defaultPrevented}`));
        });
        await page.keyboard.press(`${ctrlOrCmd(page)}+KeyS`);
        await page.keyboard.press('KeyX');
        const seenKeys = await page.evaluate(() => window._seenKeys);
        expect(seenKeys.filter(seen => /^[sx]:/.test(seen))).toEqual(['s:false']);

        // Tab is left to the browser, so focus is not held in the card
        await page.keyboard.press('Tab');
        await expect(button).not.toBeFocused();
    });

    test('lets a shortcut through from a card that was selected when it went read-only', async ({page}) => {
        await initialize({page, uri: withContent([headerCard, paragraph('After')])});
        const card = page.locator('[data-kg-card="header"]');
        await card.click();
        await expect(card).toHaveAttribute('data-kg-card-selected', 'true');
        const button = card.getByTestId('media-upload-size');
        await button.focus();
        await setEditableAndRender(page, false);
        await expect(card).toHaveAttribute('data-kg-card-selected', 'false');
        await expect(button).toBeFocused();

        await page.evaluate(() => {
            window._seenKeys = [];
            window.addEventListener('keydown', event => window._seenKeys.push(`${event.key}:${event.defaultPrevented}`));
        });
        await page.keyboard.press(`${ctrlOrCmd(page)}+KeyS`);
        const seenKeys = await page.evaluate(() => window._seenKeys);
        expect(seenKeys.filter(seen => /^s:/.test(seen))).toEqual(['s:false']);
    });

    test('does not select again, once editable, a card that was selected when it went read-only', async ({page}) => {
        await initialize({page});
        await focusEditor(page);
        await page.keyboard.type('Para');
        await page.keyboard.press('Enter');
        const card = await insertCard(page, {cardName: 'image'});
        await expect(card).toHaveAttribute('data-kg-card-selected', 'true');

        await setEditableAndRender(page, false);
        await setEditableAndRender(page, true);
        // an update that leaves the selection where it was
        await page.evaluate(() => window.lexicalEditor.focus());
        await page.waitForTimeout(300);

        await expect(card).toHaveAttribute('data-kg-card-selected', 'false');
    });
});

// no read-only involved: a format toolbar's link shortcut must work again after
// the toolbar has unmounted and mounted, as a caption's does when Alt is toggled
test.describe('Format toolbar link shortcut', () => {
    test('opens the link prompt in an image caption after toggling Alt and back', async ({page}) => {
        await initialize({page, uri: withContent([paragraph('Before'), {type: 'image', version: 1, src: PNG, width: 600, height: 300, title: '', alt: '', caption: 'A caption here', cardWidth: 'regular', href: ''}, paragraph('After')])});
        const card = page.locator('[data-kg-card="image"]');
        await card.locator('img').click();
        await page.click('[data-testid="alt-toggle-button"]');
        await page.click('[data-testid="alt-toggle-button"]');
        await card.getByTestId('image-caption-editor').locator('[data-lexical-editor]').click();
        await page.keyboard.press(`${ctrlOrCmd(page)}+A`);
        await page.waitForTimeout(200);

        await page.keyboard.press(`${ctrlOrCmd(page)}+K`);
        await expect(page.getByTestId('link-input')).toBeVisible();
    });
});
