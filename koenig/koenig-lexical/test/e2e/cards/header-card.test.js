import path from 'path';
import {assertHTML, focusEditor, html, initialize, isMac} from '../../utils/e2e';
import {expect, test} from '@playwright/test';
import {fileURLToPath} from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function createHeaderCard({page, version = 1}) {
    await focusEditor(page);
    if (version === 1) {
        await page.keyboard.type('/v1_header');
        await page.waitForSelector('[data-kg-card-menu-item="Header1"][data-kg-cardmenu-selected="true"]');
        await page.keyboard.press('Enter');
        await page.waitForSelector('[data-kg-card="header"]');
    }

    if (version === 2) {
        await page.keyboard.type('/header');
        await page.waitForSelector('[data-kg-card-menu-item="Header"][data-kg-cardmenu-selected="true"]');
        await page.keyboard.press('Enter');
        await page.waitForSelector('[data-kg-card="header"]');
    }
}

test.describe('Header card V1', async () => {
    const ctrlOrCmd = isMac() ? 'Meta' : 'Control';
    let page;

    test.beforeAll(async ({browser}) => {
        page = await browser.newPage();
    });

    test.beforeEach(async () => {
        await initialize({page});
    });

    test.afterAll(async () => {
        await page.close();
    });

    test('can import serialized header card nodes', async function () {
        const contentParam = encodeURIComponent(JSON.stringify({
            root: {
                children: [{
                    version: 1,
                    type: 'header',
                    size: 'small',
                    style: 'image',
                    buttonEnabled: false,
                    buttonUrl: '',
                    buttonText: '',
                    header: '<span>hello world</span>',
                    subheader: '<span>hello sub</span>',
                    backgroundImageSrc: 'blob:http://localhost:5173/fa0956a8-5fb4-4732-9368-18f9d6d8d25a'
                }],
                direction: null,
                format: '',
                indent: 0,
                type: 'root',
                version: 1
            }
        }));

        await initialize({page, uri: `/#/?content=${contentParam}`});

        await assertHTML(page, html`
            <div data-lexical-decorator="true" contenteditable="false" data-kg-card-width="full">
            <div data-kg-card-editing="false" data-kg-card-selected="false" data-kg-card="header">
                <div>
                    <div>
                        <div data-kg="editor">
                        <div
                            contenteditable="false"
                            role="textbox"
                            spellcheck="true"
                            data-lexical-editor="true"
                            aria-autocomplete="none"
                            aria-readonly="true">
                            <p dir="ltr"><span data-lexical-text="true">hello world</span></p>
                        </div>
                        </div>
                    </div>
                    <div>
                        <div data-kg="editor">
                        <div
                            contenteditable="false"
                            role="textbox"
                            spellcheck="true"
                            data-lexical-editor="true"
                            aria-autocomplete="none"
                            aria-readonly="true">
                            <p dir="ltr"><span data-lexical-text="true">hello sub</span></p>
                        </div>
                        </div>
                    </div>
                    <div></div>
                </div>
            </div>
            </div>
        `, {});
    });

    test('renders header card node', async function () {
        await createHeaderCard({page, version: 1});

        await assertHTML(page, html`
            <div data-lexical-decorator="true" contenteditable="false" data-kg-card-width="full">
                <div data-kg-card-editing="true" data-kg-card-selected="true" data-kg-card="header">
                </div>
            </div>
            <p><br /></p>
        `, {ignoreCardContents: true});
    });

    test('can edit header', async function () {
        await createHeaderCard({page});

        await page.keyboard.type('Hello world');
        const firstEditor = page.locator('[data-kg-card="header"] [data-kg="editor"]').nth(0);
        await expect(firstEditor).toHaveText('Hello world');
    });

    test('can edit sub header', async function () {
        await createHeaderCard({page});

        await page.keyboard.type('Hello world');

        await page.keyboard.press('Enter');
        await page.keyboard.type('Hello subheader');

        const firstEditor = page.locator('[data-kg-card="header"] [data-kg="editor"]').nth(0);
        const secondEditor = page.locator('[data-kg-card="header"] [data-kg="editor"]').nth(1);

        await expect(firstEditor).toHaveText('Hello world');
        await expect(secondEditor).toHaveText('Hello subheader');
    });

    test('can edit sub header via arrow keys', async function () {
        await createHeaderCard({page});

        await page.keyboard.type('Hello');

        await page.keyboard.press('ArrowDown');
        await page.keyboard.type('blah blah blah something very long');

        // Go back up again and add an extra word
        await page.keyboard.press('ArrowUp');
        await page.keyboard.type(' world');

        const firstEditor = page.locator('[data-kg-card="header"] [data-kg="editor"]').nth(0);
        const secondEditor = page.locator('[data-kg-card="header"] [data-kg="editor"]').nth(1);

        await expect(firstEditor).toHaveText('Hello world');
        await expect(secondEditor).toHaveText('blah blah blah something very long');
    });

    test('can add and remove button', async function () {
        await createHeaderCard({page});

        // click on the toggle with data-testid="header-button-toggle"
        await page.click('[data-testid="header-button-toggle"]');

        // check button is visible
        await expect(page.getByTestId('header-card-button')).toHaveText('Add button text');

        // Enter some text for the button in data-testid="header-button-text"
        await page.click('[data-testid="header-button-text"]');
        await page.keyboard.type('Click me');

        // Enter some url for the button in data-testid="header-button-url"
        await page.click('[data-testid="header-button-url"]');
        await page.keyboard.type('https://example.com');

        // check button is visible, and not an <a> tag (so not clickable)
        // Page contains `<button type="button"><span>Click me</span></button>`
        await expect(page.getByTestId('header-card-button')).toHaveText('Click me');

        // Can toggle button off again
        await page.click('[data-testid="header-button-toggle"]');

        // check button is not visible by using expect
        await expect(page.getByTestId('header-card-button')).toHaveCount(0);
    });

    test('can change the size', async function () {
        await createHeaderCard({page});

        // Check that the default size is small
        await expect(page.getByLabel('S')).toHaveClass(/ bg-grey-150 /);
        await expect(page.getByLabel('M')).not.toHaveClass(/ bg-grey-150 /);

        // Get height of the card
        const box = await page.locator('[data-kg-card="header"] > div:first-child').nth(0).boundingBox();
        const height = box.height;

        // Click on the medium button
        await page.getByLabel('M').click();
        await expect(page.getByLabel('M')).toHaveClass(/ bg-grey-150 /);

        // Check that the height has changed
        const box2 = await page.locator('[data-kg-card="header"] > div:first-child').nth(0).boundingBox();
        const height2 = box2.height;

        expect(height2).toBeGreaterThan(height);

        // Switch to large
        const largeButton = page.locator('[aria-label="L"]');
        await largeButton.click();
        await expect(largeButton).toHaveClass(/ bg-grey-150 /);

        // Check that the height has changed
        const box3 = await page.locator('[data-kg-card="header"] > div:first-child').nth(0).boundingBox();
        const height3 = box3.height;

        expect(height3).toBeGreaterThan(height2);
    });

    test('can change the background color', async function () {
        await createHeaderCard({page});

        const lightButton = page.locator('[aria-label="Light"]');
        const darkButton = page.locator('[aria-label="Dark"]');
        const accentButton = page.locator('[aria-label="Accent"]');

        // Default class should be 'bg-black' on the card
        await expect(page.locator('[data-kg-card="header"] > div:first-child')).toHaveClass(/ bg-black /);

        // Switch to light
        await lightButton.click();

        // Check that the background color has changed
        await expect(page.locator('[data-kg-card="header"] > div:first-child')).toHaveClass(/ bg-grey-100 /);

        // Switch back to dark
        await darkButton.click();

        // Check that the background color has changed
        await expect(page.locator('[data-kg-card="header"] > div:first-child')).toHaveClass(/ bg-black /);

        // Switch to accent
        await accentButton.click();

        // Check that the background color has changed
        await expect(page.locator('[data-kg-card="header"] > div:first-child')).toHaveClass(/ bg-accent /);
    });

    test('can add and remove background image', async function () {
        const filePath = path.relative(process.cwd(), __dirname + `/../fixtures/large-image.jpeg`);

        await createHeaderCard({page});

        const fileChooserPromise = page.waitForEvent('filechooser');

        // Click data-testid="background-image-color-button"
        await page.click('[data-testid="background-image-color-button"]');

        // Set files
        const fileChooser = await fileChooserPromise;
        await fileChooser.setFiles([filePath]);

        // Check if it is set as a background image
        await expect(page.locator('[data-kg-card="header"] > div:first-child')).toHaveCSS('background-image', /blob:/);

        // Check if it is also set as an image in the panel
        await expect(page.getByTestId('image-picker-background')).toHaveAttribute('src', /blob:/);
    });

    test('can select the text by dragging and replace it', async function () {
        await createHeaderCard({page});

        await page.keyboard.type('HelloHello');

        // Get locator to 'Hello Hello' span
        const helloSpan = page.locator('[data-kg-card="header"] [data-kg="editor"] span').nth(0);

        // Get the bounding box of the span
        const box = await helloSpan.boundingBox();
        const y = box.y + box.height / 2;
        const startX = box.x + box.width / 2;
        const endX = box.x + box.width;

        await page.mouse.move(startX, y);
        await page.mouse.down();
        await page.mouse.move(endX, y);
        await page.mouse.up();

        await page.keyboard.type(' world');
        await expect(page.locator('[data-kg-card="header"] [data-kg="editor"]').nth(0)).toHaveText('Hello world');
    });

    test('can select the text by dragging and bold it', async function () {
        await createHeaderCard({page});

        await page.keyboard.type('HelloHello');

        // Get locator to 'Hello Hello' span
        const helloSpan = page.locator('[data-kg-card="header"] [data-kg="editor"] span').nth(0);

        // Get the bounding box of the span
        const box = await helloSpan.boundingBox();
        const y = box.y + box.height / 2;
        const startX = box.x + box.width / 2;
        const endX = box.x + box.width;

        await page.mouse.move(startX, y);
        await page.mouse.down();
        await page.mouse.move(endX, y);
        await page.mouse.up();

        // click data-kg-toolbar-button="bold"
        await page.locator('[data-kg-toolbar-button="bold"]').click();

        // check it is now bold
        const boldSpan = page.locator('[data-kg-card="header"] [data-kg="editor"] strong').nth(0);
        await expect(boldSpan).toHaveText('Hello');
        await expect(helloSpan).toHaveText('Hello');

        // check if text is still selected by continuing typing
        await page.keyboard.type(' world');

        // check the typed text is still bold
        await expect(boldSpan).toHaveText(' world');
        await expect(helloSpan).toHaveText('Hello');
    });

    test('keeps focus on previous editor when changing size opts', async function () {
        await createHeaderCard({page});

        // Start editing the header
        await page.keyboard.type('Hello ');

        // Change size to medium
        await page.getByLabel('M').click();

        // Continue editing the subheader
        await page.keyboard.type('world');

        // Expect header to have 'Hello World'
        const header = page.locator('[data-kg-card="header"] [data-kg="editor"]').nth(0);
        await expect(header).toHaveText('Hello world');
    });

    test('can undo/redo without losing nested editor content', async () => {
        await createHeaderCard({page});

        await page.keyboard.type('Test title');
        await page.keyboard.press('Enter');
        await page.keyboard.type('Test description');
        await page.keyboard.press('Escape');
        await page.keyboard.press('Backspace');
        await page.keyboard.press(`${ctrlOrCmd}+z`);

        await assertHTML(page, html`
            <div data-lexical-decorator="true" contenteditable="false" data-kg-card-width="full">
                <div data-kg-card-editing="false" data-kg-card-selected="false" data-kg-card="header">
                    <div>
                        <div>
                            <div data-kg="editor">
                                <div
                                    contenteditable="false"
                                    role="textbox"
                                    spellcheck="true"
                                    data-lexical-editor="true"
                                    aria-autocomplete="none"
                                    aria-readonly="true">
                                    <p dir="ltr"><span data-lexical-text="true">Test title</span></p>
                                </div>
                            </div>
                        </div>
                        <div>
                            <div data-kg="editor">
                                <div
                                    contenteditable="false"
                                role="textbox"
                                    spellcheck="true"
                                    data-lexical-editor="true"
                                    aria-autocomplete="none"
                                    aria-readonly="true">
                                    <p dir="ltr"><span data-lexical-text="true">Test description</span></p>
                                </div>
                            </div>
                        </div>
                        <div></div>
                    </div>
                </div>
            </div>
            <p><br /></p>
        `, {});
    });
});

test.describe('Header card V2', () => {
    // const ctrlOrCmd = isMac() ? 'Meta' : 'Control';
    let page;

    test.beforeAll(async ({browser}) => {
        page = await browser.newPage();
    });

    test.beforeEach(async () => {
        await initialize({page});
    });

    test.afterAll(async () => {
        await page.close();
    });

    test('can import serialized header card nodes', async function () {
        const contentParam = encodeURIComponent(JSON.stringify({
            root: {
                children: [{
                    version: 2,
                    type: 'header',
                    size: 'small',
                    style: 'image',
                    buttonEnabled: false,
                    buttonUrl: '',
                    buttonText: '',
                    header: '<span>hello world</span>',
                    subheader: '<span>hello sub</span>',
                    backgroundImageSrc: 'blob:http://localhost:5173/fa0956a8-5fb4-4732-9368-18f9d6d8d25a',
                    alignment: 'left',
                    buttonColor: '#ffffff',
                    buttonTextColor: '#000000',
                    backgroundColor: 'accent',
                    textColor: '#ffffff',
                    swapped: false

                }],
                direction: null,
                format: '',
                indent: 0,
                type: 'root',
                version: 1
            }
        }));

        await initialize({page, uri: `/#/?content=${contentParam}`});
        await page.waitForSelector('[data-kg-card="header"]');
        await page.waitForSelector('[data-kg-card="header"] [data-kg="editor"]');
        await expect(page.locator('[data-kg-card="header"] [data-kg="editor"]').nth(0)).toHaveText('hello world');
    });

    test('renders header card node', async function () {
        await createHeaderCard({page, version: 2});

        await assertHTML(page, html`
            <div data-lexical-decorator="true" contenteditable="false" data-kg-card-width="full">
                <div data-kg-card-editing="true" data-kg-card-selected="true" data-kg-card="header">
                </div>
            </div>
            <p><br /></p>
        `, {ignoreCardContents: true});
    });

    test('can edit header', async function () {
        await createHeaderCard({page, version: 2});

        await page.keyboard.type('Hello world');
        const firstEditor = page.locator('[data-kg-card="header"] [data-kg="editor"]').nth(0);
        await expect(firstEditor).toHaveText('Hello world');
    });

    test('can edit sub header', async function () {
        await createHeaderCard({page, version: 2});

        await page.keyboard.type('Hello world');

        await page.keyboard.press('Enter');
        await page.keyboard.type('Hello subheader');

        const firstEditor = page.locator('[data-kg-card="header"] [data-kg="editor"]').nth(0);
        const secondEditor = page.locator('[data-kg-card="header"] [data-kg="editor"]').nth(1);

        await expect(firstEditor).toHaveText('Hello world');
        await expect(secondEditor).toHaveText('Hello subheader');
    });

    test('can edit sub header via arrow keys', async function () {
        await createHeaderCard({page, version: 2});

        await page.keyboard.type('Hello');

        await page.keyboard.press('ArrowDown');
        await page.keyboard.type('blah blah blah something very long');

        // Go back up again and add an extra word
        await page.keyboard.press('ArrowUp');
        await page.keyboard.type(' world');

        const firstEditor = page.locator('[data-kg-card="header"] [data-kg="editor"]').nth(0);
        const secondEditor = page.locator('[data-kg-card="header"] [data-kg="editor"]').nth(1);

        await expect(firstEditor).toHaveText('Hello world');
        await expect(secondEditor).toHaveText('blah blah blah something very long');
    });

    test('can add and remove button', async function () {
        await createHeaderCard({page, version: 2});

        // click on the toggle with data-testid="header-button-toggle"
        await page.click('[data-testid="header-button-toggle"]');

        // check button is visible
        await expect(page.getByTestId('header-card-button')).toHaveText('Add button text');

        // Enter some text for the button in data-testid="header-button-text"
        await page.click('[data-testid="header-button-text"]');
        await page.keyboard.type('Click me');

        // Enter some url for the button in data-testid="header-button-url"
        await page.click('[data-testid="header-button-url"]');
        await page.keyboard.type('https://example.com');

        // check button is visible, and not an <a> tag (so not clickable)
        // Page contains `<button type="button"><span>Click me</span></button>`
        await expect(page.getByTestId('header-card-button')).toHaveText('Click me');

        // Can toggle button off again
        await page.click('[data-testid="header-button-toggle"]');

        // check button is not visible by using expect
        await expect(page.getByTestId('header-card-button')).toHaveCount(0);
    });

    test('can change the button background color and text color', async function () {
        await createHeaderCard({page, version: 2});

        await page.click('[data-testid="header-button-toggle"]');

        await page.click('[data-testid="header-button-color"] [aria-label="Pick color"]');

        await page.fill('[data-testid="header-button-color"] input', '');
        await page.keyboard.type('ff0000');

        // Selected colour should be applied inline
        await expect(page.locator('[data-testid="header-card-button"]')).toHaveCSS('background-color', 'rgb(255, 0, 0)');
        await expect(page.locator('[data-testid="header-card-button"]')).toHaveCSS('color', 'rgb(255, 255, 255)');

        // Check that the text colour updates to contrast with the background
        await page.fill('[data-testid="header-button-color"] input', '');
        await page.keyboard.type('f7f7f7');

        await expect(page.locator('[data-testid="header-card-button"]')).toHaveCSS('background-color', 'rgb(247, 247, 247)');
        await expect(page.locator('[data-testid="header-card-button"]')).toHaveCSS('color', 'rgb(0, 0, 0)');
    });

    test('can change the background color and text color', async function () {
        await createHeaderCard({page, version: 2});

        await page.click('[data-testid="header-background-color"] [aria-label="Pick color"]');

        await page.fill('[data-testid="header-background-color"] input', '');
        await page.keyboard.type('ff0000');

        // Selected colour should be applied inline
        const container = page.getByTestId('header-card-container');
        await expect(container).toHaveCSS('background-color', 'rgb(255, 0, 0)');
        await expect(container).toHaveCSS('color', 'rgb(255, 255, 255)');

        // Check that the text colour updates to contrast with the background
        await page.fill('[data-testid="header-background-color"] input', '');
        await page.keyboard.type('f7f7f7');

        await expect(container).toHaveCSS('background-color', 'rgb(247, 247, 247)');
        await expect(container).toHaveCSS('color', 'rgb(0, 0, 0)');
    });

    test('can switch between background image and color', async function () {
        const filePath = path.relative(process.cwd(), __dirname + `/../fixtures/large-image.jpeg`);
        await createHeaderCard({page, version: 2});
        // Choose an image

        const fileChooserPromise = page.waitForEvent('filechooser');

        await page.click('[data-testid="header-background-image-toggle"]');

        const fileChooser = await fileChooserPromise;
        await fileChooser.setFiles([filePath]);

        await expect(page.locator('[data-kg-card="header"] > div:first-child')).toHaveCSS('background-image', /blob:/);
        await expect(page.locator('[data-testid="media-upload-setting"]')).toBeVisible();
        await expect(page.locator('[data-testid="media-upload-filled"] img')).toHaveAttribute('src', /blob:/);

        // Switch to a color swatch

        await page.click('[data-testid="header-background-color"] button[title="Black"]');

        await expect(page.locator('[data-kg-card="header"] > div:first-child')).not.toHaveCSS('background-image', /blob:/);
        await expect(page.locator('[data-kg-card="header"] > div:first-child')).toHaveCSS('background-color', 'rgb(0, 0, 0)');
        await expect(page.locator('[data-testid="media-upload-setting"]')).not.toBeVisible();

        // Switch back to the image

        await page.click('[data-testid="header-background-image-toggle"]');

        await expect(page.locator('[data-kg-card="header"] > div:first-child')).toHaveCSS('background-image', /blob:/);
        await expect(page.locator('[data-testid="media-upload-setting"]')).toBeVisible();
        await expect(page.locator('[data-testid="media-upload-filled"] img')).toHaveAttribute('src', /blob:/);

        // Open the color picker

        await page.click('[data-testid="header-background-color"] [aria-label="Pick color"]');

        await expect(page.locator('[data-kg-card="header"] > div:first-child')).not.toHaveCSS('background-image', /blob:/);
        await expect(page.locator('[data-kg-card="header"] > div:first-child')).toHaveCSS('background-color', 'rgb(0, 0, 0)');
        await expect(page.locator('[data-testid="media-upload-setting"]')).not.toBeVisible();
    });

    test('can add and remove background image in split layout', async function () {
        const filePath = path.relative(process.cwd(), __dirname + `/../fixtures/large-image.jpeg`);
        const fileChooserPromise = page.waitForEvent('filechooser');

        await createHeaderCard({page, version: 2});

        await page.locator('[data-testid="header-layout-split"]').click();

        await expect(page.locator('[data-testid="header-background-image-toggle"]')).toHaveCount(0);
        await expect(page.locator('[data-testid="media-upload-setting"]')).not.toBeVisible();

        await page.click('[data-testid="header-card-container"] [data-testid="media-upload-placeholder"]');

        // Set files
        const fileChooser = await fileChooserPromise;
        await fileChooser.setFiles([filePath]);

        await expect(page.locator('[data-testid="header-card-container"] [data-testid="media-upload-filled"] img')).toHaveAttribute('src', /blob:/);
    });

    test('changes the alignment options from the settings panel', async function () {
        await createHeaderCard({page, version: 2});

        // Default: centre alignment
        const header = page.getByTestId('header-heading-editor');
        await expect(header).toHaveClass(/text-center/);

        // Change aligment to left
        const alignmentLeft = page.locator('[data-testid="header-alignment-left"]');
        await alignmentLeft.click();
        await expect(header).not.toHaveClass(/text-center/);
    });

    test('keeps focus on previous editor when changing layout opts', async function () {
        await createHeaderCard({page, version: 2});

        // Start editing the header
        await page.locator('[data-kg-card="header"] [data-kg="editor"] [contenteditable]').nth(0).fill('');
        await page.keyboard.type('Hello ');

        // Change layout to regular
        await page.locator('[data-testid="header-layout-regular"]').click();

        // Continue editing the header
        await page.keyboard.type('world');

        // Expect header to have 'Hello World'
        const header = page.locator('[data-kg-card="header"] [data-kg="editor"]').nth(0);
        await expect(header).toHaveText('Hello world');
    });

    test('keeps focus on previous editor when changing alignment opts', async function () {
        await createHeaderCard({page, version: 2});

        // Start editing the subheader
        await page.keyboard.press('Enter');
        await page.locator('[data-kg-card="header"] [data-kg="editor"] [contenteditable]').nth(1).fill('');
        await page.keyboard.type('Hello ');

        // Change alignment to center
        await page.locator('[data-testid="header-alignment-center"]').click();

        // Continue editing the subheader
        await page.keyboard.type('world');

        // Expect subheader to have 'Hello World'
        const subheader = page.locator('[data-kg-card="header"] [data-kg="editor"]').nth(1);
        await expect(subheader).toHaveText('Hello world');
    });

    test('can swap split layout sides on image', async function () {
        const filePath = path.relative(process.cwd(), __dirname + `/../fixtures/large-image.jpeg`);
        await createHeaderCard({page, version: 2});
        // Mouse position from earlier test can mean a tooltip is covering the split layout button
        await page.mouse.move(0, 0);
        await page.locator('[data-testid="header-layout-split"]').click();
        await expect(page.locator('[data-testid="header-background-image-toggle"]')).toHaveCount(0);
        // Set files
        const fileChooserPromise = page.waitForEvent('filechooser');
        await page.click('[data-testid="media-upload-placeholder"]');
        const fileChooser = await fileChooserPromise;
        await fileChooser.setFiles([filePath]);
        await expect(page.locator('[data-testid="header-card-container"] [data-testid="media-upload-filled"] img')).toHaveAttribute('src', /blob:/);
        // Click swap
        await page.click('[data-testid="header-swapped"]');
        // Check the parent class name was updated
        const swappedContainer = await page.locator('[data-testid="header-card-content"]');
        await expect(swappedContainer).toHaveClass(/sm:flex-row-reverse/);
    });
    test('can import serialized header card nodes with br', async function () {
        const contentParam = encodeURIComponent(JSON.stringify({
            root: {
                children: [{
                    version: 2,
                    type: 'header',
                    size: 'small',
                    style: 'image',
                    buttonEnabled: false,
                    buttonUrl: '',
                    buttonText: '',
                    header: '<span>hello world</span><br /><span>byebye world</span>',
                    subheader: '<span>hello sub</span><br /><span>byebye sub</span>',
                    backgroundImageSrc: 'blob:http://localhost:5173/fa0956a8-5fb4-4732-9368-18f9d6d8d25a',
                    alignment: 'left',
                    buttonColor: '#ffffff',
                    buttonTextColor: '#000000',
                    backgroundColor: 'accent',
                    textColor: '#ffffff',
                    swapped: false
                }],
                direction: null,
                format: '',
                indent: 0,
                type: 'root',
                version: 1
            }
        }));

        await initialize({page, uri: `/#/?content=${contentParam}`});
        await page.waitForSelector('[data-kg-card="header"]');
        await page.waitForSelector('[data-kg-card="header"] [data-kg="editor"]');
        await expect(page.locator('[data-kg-card="header"] [data-kg="editor"] p span').nth(0)).toHaveText('hello world');
        await expect(page.locator('[data-kg-card="header"] [data-kg="editor"] p br').nth(0)).toBeAttached();
        await expect(page.locator('[data-kg-card="header"] [data-kg="editor"] p span').nth(1)).toHaveText('byebye world');
        await expect(page.getByTestId('header-subheader-editor').locator('p span').nth(0)).toHaveText('hello sub');
        await expect(page.getByTestId('header-subheader-editor').locator('p br').nth(0)).toBeAttached();
        await expect(page.getByTestId('header-subheader-editor').locator('p span').nth(1)).toHaveText('byebye sub');
    });
    test('can add a shift-enter to header and subheader', async function () {
        await createHeaderCard({page, version: 2});

        await page.keyboard.type('Hello world');
        await page.keyboard.press('Shift+Enter');
        await page.keyboard.type('This is second line');
        await page.keyboard.press('Enter');
        await page.keyboard.type('Hello subheader');
        await page.keyboard.press('Shift+Enter');
        await page.keyboard.type('This is second subheader');
        await page.keyboard.press('Escape');
        await page.waitForSelector('[data-kg-card-editing="false"]');
        await assertHTML(page, html`
                        <div
                            contenteditable="false"
                            role="textbox"
                            spellcheck="true"
                            data-lexical-editor="true"
                            aria-autocomplete="none"
                            aria-readonly="true">
                            <p dir="ltr"><span data-lexical-text="true">Hello world</span>
                            <br /> 
                            <span data-lexical-text="true">This is second line</span>
                            </p>
                        </div>`, 
        {selector: '[data-kg-card="header"] [data-kg="editor"]'});
        await assertHTML(page, html`
                        <div
                            contenteditable="false"
                            role="textbox"
                            spellcheck="true"
                            data-lexical-editor="true"
                            aria-autocomplete="none"
                            aria-readonly="true">
                            <p dir="ltr"><span data-lexical-text="true">Hello subheader</span>
                            <br /> 
                            <span data-lexical-text="true">This is second subheader</span>
                            </p>
                        </div>`,
        {selector: '[data-kg-card="header"] [data-testid="header-subheader-editor"] [data-kg="editor"]'});    
    });
});
