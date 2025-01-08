import path from 'path';
import {assertHTML, focusEditor, html, initialize, insertCard} from '../../utils/e2e';
import {expect, test} from '@playwright/test';
import {fileURLToPath} from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

test.describe('Signup card', async () => {
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

    test('can import serialized signup card nodes', async function () {
        const contentParam = encodeURIComponent(JSON.stringify({
            root: {
                children: [{
                    alignment: 'left',
                    backgroundColor: 'accent',
                    backgroundImageSrc: '__GHOST_URL__/content/images/2023/05/fake-image.jpg',
                    buttonColor: '#ffffff',
                    buttonText: '',
                    buttonTextColor: '#000000',
                    disclaimer: '<span>Disclaimer</span>',
                    header: '<span>Header</span>',
                    labels: [],
                    layout: 'split',
                    subheader: '<span>Subheader</span>',
                    textColor: '#FFFFFF',
                    type: 'signup',
                    swaped: false,
                    version: 1
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
                <div data-kg-card-editing="false" data-kg-card-selected="false" data-kg-card="signup">
                    <div>
                        <div>
                            <div>
                                <img alt="Background image"
                                    src="__GHOST_URL__/content/images/2023/05/fake-image.jpg" />
                                <div></div>
                                <div>
                                    <button aria-label="Contain" type="button">
                                        <svg></svg>
                                        <div><span>Contain</span></div>
                                    </button>
                                    <button aria-label="Delete" type="button">
                                        <svg></svg>
                                        <div><span>Delete</span></div>
                                    </button>
                                </div>
                            </div>
                            <div>
                                <div>
                                    <div data-kg="editor">
                                        <div contenteditable="false" role="textbox" spellcheck="true" data-lexical-editor="true" aria-autocomplete="none" aria-readonly="true">
                                            <p dir="ltr"><span data-lexical-text="true">Header</span></p>
                                        </div>
                                    </div>
                                </div>
                                <div>
                                    <div data-kg="editor">
                                        <div contenteditable="false" role="textbox" spellcheck="true" data-lexical-editor="true" aria-autocomplete="none" aria-readonly="true">
                                            <p dir="ltr"><span data-lexical-text="true">Subheader</span></p>
                                        </div>
                                    </div>
                                </div>
                                <div>
                                    <div>
                                        <input placeholder="Your email" tabindex="-1" readonly="" value="" />
                                        <button disabled="" type="button"><span>Subscribe</span></button>
                                    </div>
                                </div>
                                <div>
                                    <div data-kg="editor">
                                        <div contenteditable="false" role="textbox" spellcheck="true" data-lexical-editor="true" aria-autocomplete="none" aria-readonly="true">
                                            <p dir="ltr"><span data-lexical-text="true">Disclaimer</span></p>
                                        </div>
                                    </div>
                                    </div>
                                </div>
                            </div><div>
                        </div>
                    </div>
                </div>
            </div>
        `);
    });

    test('renders signup card node', async function () {
        await focusEditor(page);
        await insertCard(page, {cardName: 'signup'});

        await assertHTML(page, html`
            <div data-lexical-decorator="true" contenteditable="false" data-kg-card-width="wide">
                <div data-kg-card-editing="true" data-kg-card-selected="true" data-kg-card="signup">
                </div>
            </div>
            <p><br /></p>
        `, {ignoreCardContents: true});
    });

    test('can edit header', async function () {
        await focusEditor(page);
        await insertCard(page, {cardName: 'signup'});

        const firstEditor = page.locator('[data-kg-card="signup"] [data-kg="editor"]').nth(0);
        await expect(firstEditor).toHaveText('Sign up for Koenig Lexical');

        await page.keyboard.type(', my friends');
        await expect(firstEditor).toHaveText('Sign up for Koenig Lexical, my friends');
    });

    test('can edit subheader', async function () {
        await focusEditor(page);
        await insertCard(page, {cardName: 'signup'});

        const secondEditor = page.locator('[data-kg-card="signup"] [data-kg="editor"]').nth(1);
        await expect(secondEditor).toHaveText(`There's a whole lot to discover in this editor. Let us help you settle in.`);

        await page.keyboard.press('Enter');
        await page.keyboard.type(' Cool.');

        await expect(secondEditor).toHaveText(`There's a whole lot to discover in this editor. Let us help you settle in. Cool.`);
    });

    test('can edit disclaimer', async function () {
        await focusEditor(page);
        await insertCard(page, {cardName: 'signup'});

        const thirdEditor = page.locator('[data-kg-card="signup"] [data-kg="editor"]').nth(2);
        await expect(thirdEditor).toHaveText('No spam. Unsubscribe anytime.');

        await page.keyboard.press('Enter');
        await page.keyboard.press('Enter');
        await page.keyboard.type(' For real.');

        await expect(thirdEditor).toHaveText('No spam. Unsubscribe anytime. For real.');
    });

    test('header, subheader and disclaimer texts are prepopulated', async function () {
        await focusEditor(page);
        await insertCard(page, {cardName: 'signup'});

        const firstEditor = page.locator('[data-kg-card="signup"] [data-kg="editor"]').nth(0);
        const secondEditor = page.locator('[data-kg-card="signup"] [data-kg="editor"]').nth(1);
        const thirdEditor = page.locator('[data-kg-card="signup"] [data-kg="editor"]').nth(2);

        await expect(firstEditor).toHaveText(/Sign up for Koenig Lexical/);
        await expect(secondEditor).toHaveText(/There's a whole lot to discover in this editor. Let us help you settle in./);
        await expect(thirdEditor).toHaveText(/No spam. Unsubscribe anytime./);
    });

    test('nested editors are hidden when not in edit mode', async function () {
        await focusEditor(page);
        await insertCard(page, {cardName: 'signup'});

        const firstEditor = page.locator('[data-kg-card="signup"] .koenig-lexical').nth(0);

        for (let i = 0; i < 'Sign up for Koenig Lexical'.length; i++) {
            await page.keyboard.press('Backspace');
        }
        await page.keyboard.press('Escape');

        await expect(firstEditor).toHaveClass(/hidden/);
    });

    test('can edit button text', async function () {
        await focusEditor(page);
        await insertCard(page, {cardName: 'signup'});

        await page.click('[data-testid="signup-button-text"]');

        // Default text
        await expect(page.getByTestId('signup-card-button')).toHaveText('Subscribe');

        await page.keyboard.type(' now');
        await expect(page.getByTestId('signup-card-button')).toHaveText('Subscribe now');
    });

    test('can change the button background color and text color', async function () {
        await focusEditor(page);
        await insertCard(page, {cardName: 'signup'});

        await page.click('[data-testid="signup-button-color"] [aria-label="Pick color"]');

        await page.fill('[data-testid="signup-button-color"] input', '');
        await page.keyboard.type('ff0000');

        // Selected colour should be applied inline
        await expect(page.locator('[data-testid="signup-card-button"]')).toHaveCSS('background-color', 'rgb(255, 0, 0)');
        await expect(page.locator('[data-testid="signup-card-button"]')).toHaveCSS('color', 'rgb(255, 255, 255)');

        // Check that the text colour updates to contrast with the background
        await page.fill('[data-testid="signup-button-color"] input', '');
        await page.keyboard.type('f7f7f7');

        await expect(page.locator('[data-testid="signup-card-button"]')).toHaveCSS('background-color', 'rgb(247, 247, 247)');
        await expect(page.locator('[data-testid="signup-card-button"]')).toHaveCSS('color', 'rgb(0, 0, 0)');
    });

    test('can change the background color and text color', async function () {
        await focusEditor(page);
        await insertCard(page, {cardName: 'signup'});

        await page.click('[data-testid="signup-background-color"] [aria-label="Pick color"]');

        await page.fill('[data-testid="signup-background-color"] input', '');
        await page.keyboard.type('ff0000');

        // Selected colour should be applied inline
        const container = page.getByTestId('signup-card-container');
        await expect(container).toHaveCSS('background-color', 'rgb(255, 0, 0)');
        await expect(container).toHaveCSS('color', 'rgb(255, 255, 255)');

        // Check that the text colour updates to contrast with the background
        await page.fill('[data-testid="signup-background-color"] input', '');
        await page.keyboard.type('f7f7f7');

        await expect(container).toHaveCSS('background-color', 'rgb(247, 247, 247)');
        await expect(container).toHaveCSS('color', 'rgb(0, 0, 0)');
    });

    test('can add and remove background image', async function () {
        const filePath = path.relative(process.cwd(), __dirname + `/../fixtures/large-image.jpeg`);

        await focusEditor(page);
        await insertCard(page, {cardName: 'signup'});

        const fileChooserPromise = page.waitForEvent('filechooser');

        await page.click('[data-testid="signup-background-image-toggle"]');

        // Set files
        const fileChooser = await fileChooserPromise;
        await fileChooser.setFiles([filePath]);

        // Check if it is set as a background image
        await expect(page.locator('[data-kg-card="signup"] > div:first-child')).toHaveCSS('background-image', /blob:/);

        // Check if it is also set as an image in the panel
        await expect(page.locator('[data-testid="media-upload-filled"] img')).toHaveAttribute('src', /blob:/);

        // Remove the image
        await page.click('[data-testid="media-upload-remove"]');

        await expect(page.locator('[data-kg-card="signup"] > div:first-child')).not.toHaveCSS('background-image', /blob:/);
        await expect(page.locator('[data-testid="media-upload-placeholder"]')).toBeVisible();

        // Add it again by clicking the placeholder
        const fileChooserPromise2 = page.waitForEvent('filechooser');

        await page.click('[data-testid="media-upload-placeholder"]');

        const fileChooser2 = await fileChooserPromise2;
        await fileChooser2.setFiles([filePath]);

        await expect(page.locator('[data-kg-card="signup"] > div:first-child')).toHaveCSS('background-image', /blob:/);
        await expect(page.locator('[data-testid="media-upload-filled"] img')).toHaveAttribute('src', /blob:/);
    });

    test('can switch between background image and color', async function () {
        const filePath = path.relative(process.cwd(), __dirname + `/../fixtures/large-image.jpeg`);

        await focusEditor(page);
        await insertCard(page, {cardName: 'signup'});

        // Choose an image

        const fileChooserPromise = page.waitForEvent('filechooser');

        await page.click('[data-testid="signup-background-image-toggle"]');

        const fileChooser = await fileChooserPromise;
        await fileChooser.setFiles([filePath]);

        await expect(page.locator('[data-kg-card="signup"] > div:first-child')).toHaveCSS('background-image', /blob:/);
        await expect(page.locator('[data-testid="media-upload-setting"]')).toBeVisible();
        await expect(page.locator('[data-testid="media-upload-filled"] img')).toHaveAttribute('src', /blob:/);

        // Switch to a color swatch

        await page.click('[data-testid="signup-background-color"] button[title="Black"]');

        await expect(page.locator('[data-kg-card="signup"] > div:first-child')).not.toHaveCSS('background-image', /blob:/);
        await expect(page.locator('[data-kg-card="signup"] > div:first-child')).toHaveCSS('background-color', 'rgb(0, 0, 0)');
        await expect(page.locator('[data-testid="media-upload-setting"]')).not.toBeVisible();

        // Switch back to the image

        await page.click('[data-testid="signup-background-image-toggle"]');

        await expect(page.locator('[data-kg-card="signup"] > div:first-child')).toHaveCSS('background-image', /blob:/);
        await expect(page.locator('[data-testid="media-upload-setting"]')).toBeVisible();
        await expect(page.locator('[data-testid="media-upload-filled"] img')).toHaveAttribute('src', /blob:/);

        // Open the color picker

        await page.click('[data-testid="signup-background-color"] [aria-label="Pick color"]');

        await expect(page.locator('[data-kg-card="signup"] > div:first-child')).not.toHaveCSS('background-image', /blob:/);
        await expect(page.locator('[data-kg-card="signup"] > div:first-child')).toHaveCSS('background-color', 'rgb(0, 0, 0)');
        await expect(page.locator('[data-testid="media-upload-setting"]')).not.toBeVisible();
    });

    test('can update the text color in split vs regular layout', async function () {
        const filePath = path.relative(process.cwd(), __dirname + `/../fixtures/large-image.jpeg`);

        await focusEditor(page);
        await insertCard(page, {cardName: 'signup'});

        // Text colour is updated based on the background colour

        await page.click('[data-testid="signup-background-color"] button[title="Grey"]');

        await expect(page.locator('[data-kg-card="signup"] > div:first-child')).toHaveCSS('background-color', 'rgb(240, 240, 240)');
        await expect(page.locator('[data-kg-card="signup"] > div:first-child')).toHaveCSS('color', 'rgb(0, 0, 0)');

        // Text colour is updated based on the background image

        const fileChooserPromise = page.waitForEvent('filechooser');

        await page.click('[data-testid="signup-background-image-toggle"]');

        const fileChooser = await fileChooserPromise;
        await fileChooser.setFiles([filePath]);

        await expect(page.locator('[data-kg-card="signup"] > div:first-child')).toHaveCSS('background-image', /blob:/);
        await expect(page.locator('[data-kg-card="signup"] > div:first-child')).toHaveCSS('color', 'rgb(255, 255, 255)');

        // When switching to split layout, text colour is set based on the background colour

        await page.locator('[data-testid="signup-layout-split"]').click();

        await expect(page.locator('[data-kg-card="signup"] > div:first-child')).not.toHaveCSS('background-image', /blob:/);
        await expect(page.locator('[data-kg-card="signup"] > div:first-child')).toHaveCSS('background-color', 'rgb(240, 240, 240)');
        await expect(page.locator('[data-kg-card="signup"] > div:first-child')).toHaveCSS('color', 'rgb(0, 0, 0)');

        // When switching back from split layout, text colour is set based on the background colour

        await page.locator('[data-testid="signup-layout-wide"]').click();

        await expect(page.locator('[data-kg-card="signup"] > div:first-child')).toHaveCSS('background-image', /blob:/);
        await expect(page.locator('[data-kg-card="signup"] > div:first-child')).toHaveCSS('color', 'rgb(255, 255, 255)');
    });

    test('can add and remove background image in split layout', async function () {
        const filePath = path.relative(process.cwd(), __dirname + `/../fixtures/large-image.jpeg`);
        const fileChooserPromise = page.waitForEvent('filechooser');

        await focusEditor(page);
        await insertCard(page, {cardName: 'signup'});

        await page.locator('[data-testid="signup-layout-split"]').click();

        await expect(page.locator('[data-testid="signup-background-image-toggle"]')).toHaveCount(0);
        await expect(page.locator('[data-testid="media-upload-setting"]')).not.toBeVisible();

        await page.click('[data-testid="signup-card-container"] [data-testid="media-upload-placeholder"]');

        // Set files
        const fileChooser = await fileChooserPromise;
        await fileChooser.setFiles([filePath]);

        await expect(page.locator('[data-testid="signup-card-container"] [data-testid="media-upload-filled"] img')).toHaveAttribute('src', /blob:/);
    });

    test('can add and remove labels', async function () {
        await focusEditor(page);
        await insertCard(page, {cardName: 'signup'});

        await page.click('[data-testid="labels-dropdown"] input');

        // Add existing label
        await page.keyboard.type('Label 1');
        await page.click('[data-testid="labels-dropdown"] [data-testid="multiselect-dropdown-item"]');

        await expect(page.locator('[data-testid="labels-dropdown"] [data-testid="multiselect-dropdown-selected"]')).toHaveCount(1);
        await expect(page.locator('[data-testid="labels-dropdown"] [data-testid="multiselect-dropdown-selected"]')).toHaveText('Label 1');

        // Add new label
        await page.keyboard.type('Some new label');
        await page.keyboard.press('Enter');

        await expect(page.locator('[data-testid="labels-dropdown"] [data-testid="multiselect-dropdown-selected"]')).toHaveCount(2);
        await expect(page.locator('[data-testid="labels-dropdown"] [data-testid="multiselect-dropdown-selected"]:nth-child(2)')).toHaveText('Some new label');

        // Remove label with backspace
        await page.keyboard.press('Backspace');
        await expect(page.locator('[data-testid="labels-dropdown"] [data-testid="multiselect-dropdown-selected"]')).toHaveCount(1);

        // Remove label by clicking
        await page.click('[data-testid="labels-dropdown"] [data-testid="multiselect-dropdown-selected"]');
        await expect(page.locator('[data-testid="labels-dropdown"] [data-testid="multiselect-dropdown-selected"]')).toHaveCount(0);
    });

    test('changes the alignment options from the settings panel', async function () {
        await focusEditor(page);
        await insertCard(page, {cardName: 'signup'});

        // Default: left alignment
        const header = page.getByTestId('signup-header-editor');
        await expect(header).not.toHaveClass(/text-center/);

        // Change aligment to center
        const alignmentCenter = page.locator('[data-testid="signup-alignment-center"]');
        await alignmentCenter.click();
        await expect(header).toHaveClass(/text-center/);
    });

    // TODO: fix and restore after the layout changes are finialized in the signup card
    test.skip('changes the layout options from the settings panel', async function () {
        await focusEditor(page);
        await insertCard(page, {cardName: 'signup'});

        // Default: wise layout
        const container = page.locator('[data-testid="signup-card-container"]');
        await expect(container).toHaveClass(/min-h-\[56vh\]/);

        // Change layout to regular
        const layoutRegular = page.locator('[data-testid="signup-layout-regular"]');
        await layoutRegular.click();
        await expect(container).toHaveClass(/min-h-\[32vh\]/);

        // Change layout to full
        const layoutFull = page.locator('[data-testid="signup-layout-full"]');
        await layoutFull.click();
        await expect(container).toHaveClass(/min-h-\[80vh\]/);

        // Change layout to split
        const layoutSplit = page.locator('[data-testid="signup-layout-split"]');
        await layoutSplit.click();
        await expect(container).toHaveClass(/h-auto sm:h-\[80vh\]/);
    });

    test('keeps focus on previous editor when changing layout opts', async function () {
        await focusEditor(page);
        await insertCard(page, {cardName: 'signup'});

        // Start editing the header
        await page.locator('[data-kg-card="signup"] [data-kg="editor"] [contenteditable]').nth(0).fill('');
        await page.keyboard.type('Hello ');

        // Change layout to regular
        await page.locator('[data-testid="signup-layout-regular"]').click();

        // Continue editing the header
        await page.keyboard.type('world');

        // Expect header to have 'Hello World'
        const header = page.locator('[data-kg-card="signup"] [data-kg="editor"]').nth(0);
        await expect(header).toHaveText('Hello world');
    });

    test('keeps focus on previous editor when changing alignment opts', async function () {
        await focusEditor(page);
        await insertCard(page, {cardName: 'signup'});

        // Start editing the subheader
        await page.keyboard.press('Enter');
        await page.locator('[data-kg-card="signup"] [data-kg="editor"] [contenteditable]').nth(1).fill('');
        await page.keyboard.type('Hello ');

        // Change alignment to center
        await page.locator('[data-testid="signup-alignment-center"]').click();

        // Continue editing the subheader
        await page.keyboard.type('world');

        // Expect subheader to have 'Hello World'
        const subheader = page.locator('[data-kg-card="signup"] [data-kg="editor"]').nth(1);
        await expect(subheader).toHaveText('Hello world');
    });

    test('can swap split layout sides on image', async function () {
        const filePath = path.relative(process.cwd(), __dirname + `/../fixtures/large-image.jpeg`);
        const fileChooserPromise = page.waitForEvent('filechooser');
        await focusEditor(page);
        await insertCard(page, {cardName: 'signup'});
        await page.locator('[data-testid="signup-layout-split"]').click();
        await expect(page.locator('[data-testid="signup-background-image-toggle"]')).toHaveCount(0);
        await page.click('[data-testid="media-upload-placeholder"]');
        // Set files
        const fileChooser = await fileChooserPromise;
        await fileChooser.setFiles([filePath]);
        await expect(page.locator('[data-testid="signup-card-container"] [data-testid="media-upload-filled"] img')).toHaveAttribute('src', /blob:/);
        // Click swap
        await page.click('[data-testid="signup-swapped"]');
        // Check the parent class name was updated
        const swappedContainer = await page.locator('[data-testid="signup-card-content"]');
        await expect(swappedContainer).toHaveClass(/sm:flex-row-reverse/);
    });
    test('can import when brs are present in the serialized content', async function () {
        const contentParam = encodeURIComponent(JSON.stringify({
            root: {
                children: [{
                    alignment: 'left',
                    backgroundColor: 'accent',
                    backgroundImageSrc: '__GHOST_URL__/content/images/2023/05/fake-image.jpg',
                    buttonColor: '#ffffff',
                    buttonText: '',
                    buttonTextColor: '#000000',
                    disclaimer: '<span>Disclaimer</span><br /><span>Moar legal stuffz</span>',
                    header: '<span>Header</span><br /><span>More header</span>',
                    labels: [],
                    layout: 'split',
                    subheader: '<span>Subheader</span><br /><span>More subheader</span>',
                    textColor: '#FFFFFF',
                    type: 'signup',
                    swaped: false,
                    version: 1
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
                <div data-kg-card-editing="false" data-kg-card-selected="false" data-kg-card="signup">
                    <div>
                        <div>
                            <div>
                                <img alt="Background image"
                                    src="__GHOST_URL__/content/images/2023/05/fake-image.jpg" />
                                <div></div>
                                <div>
                                    <button aria-label="Contain" type="button">
                                        <svg></svg>
                                        <div><span>Contain</span></div>
                                    </button>
                                    <button aria-label="Delete" type="button">
                                        <svg></svg>
                                        <div><span>Delete</span></div>
                                    </button>
                                </div>
                            </div>
                            <div>
                                <div>
                                    <div data-kg="editor">
                                        <div contenteditable="false" role="textbox" spellcheck="true" data-lexical-editor="true" aria-autocomplete="none" aria-readonly="true">
                                            <p dir="ltr"><span data-lexical-text="true">Header</span>
                                            <br />
                                            <span data-lexical-text="true">More header</span>
                                            </p>
                                        </div>
                                    </div>
                                </div>
                                <div>
                                    <div data-kg="editor">
                                        <div contenteditable="false" role="textbox" spellcheck="true" data-lexical-editor="true" aria-autocomplete="none" aria-readonly="true">
                                            <p dir="ltr"><span data-lexical-text="true">Subheader</span>
                                            <br />
                                            <span data-lexical-text="true">More subheader</span>
                                            </p>
                                        </div>
                                    </div>
                                </div>
                                <div>
                                    <div>
                                        <input placeholder="Your email" tabindex="-1" readonly="" value="" />
                                        <button disabled="" type="button"><span>Subscribe</span></button>
                                    </div>
                                </div>
                                <div>
                                    <div data-kg="editor">
                                        <div contenteditable="false" role="textbox" spellcheck="true" data-lexical-editor="true" aria-autocomplete="none" aria-readonly="true">
                                            <p dir="ltr"><span data-lexical-text="true">Disclaimer</span>
                                            <br />
                                            <span data-lexical-text="true">Moar legal stuffz</span>
                                            </p>
                                        </div>
                                    </div>
                                    </div>
                                </div>
                            </div><div>
                        </div>
                    </div>
                </div>
            </div>
        `);
    });
    test('can put a br anywhere', async function () {
        await focusEditor(page);
        await insertCard(page, {cardName: 'signup'});
        await page.keyboard.press('Shift+Enter');
        await page.keyboard.type('line two');
        await page.keyboard.press('Enter');
        await page.keyboard.press('Shift+Enter');
        await page.keyboard.type('line two');
        await page.keyboard.press('Enter');
        await page.keyboard.press('Shift+Enter');
        await page.keyboard.type('pickles');
        await page.keyboard.press('Escape');
        await assertHTML(page, html`
            <div data-lexical-decorator="true" contenteditable="false" data-kg-card-width="wide">
                <div data-kg-card-editing="false" data-kg-card-selected="true" data-kg-card="signup">
                    <div>
                        <div>
                            <div>
                                <div>
                                    <div data-kg="editor">
                                        <div contenteditable="false" role="textbox" spellcheck="true" data-lexical-editor="true" aria-autocomplete="none" aria-readonly="true">
                                            <p dir="ltr"><span data-lexical-text="true">Sign up for Koenig Lexical</span>
                                            <br />
                                            <span data-lexical-text="true">line two</span>
                                            </p>
                                        </div>
                                    </div>
                                </div>
                                <div>
                                    <div data-kg="editor">
                                        <div contenteditable="false" role="textbox" spellcheck="true" data-lexical-editor="true" aria-autocomplete="none" aria-readonly="true">
                                            <p dir="ltr"><span data-lexical-text="true">There's a whole lot to discover in this editor. Let us help you settle in.</span>
                                            <br />
                                            <span data-lexical-text="true">line two</span>
                                            </p>
                                        </div>
                                    </div>
                                </div>
                                <div>
                                    <div>
                                        <input placeholder="Your email" tabindex="-1" readonly="" value="" />
                                        <button disabled="" type="button"><span>Subscribe</span></button>
                                    </div>
                                </div>
                                <div>
                                    <div data-kg="editor">
                                        <div contenteditable="false" role="textbox" spellcheck="true" data-lexical-editor="true" aria-autocomplete="none" aria-readonly="true">
                                            <p dir="ltr"><span data-lexical-text="true">No spam. Unsubscribe anytime.</span>
                                            <br />
                                            <span data-lexical-text="true">pickles</span>
                                            </p>
                                        </div>
                                    </div>
                                    </div>
                                </div>
                            </div><div>
                        </div>
                    </div>
                    <div data-kg-card-toolbar="signup"></div>
                </div>
            </div>
            <p><br /></p>
        `, {ignoreCardToolbarContents: true});
    });
    /*test('can undo/redo without losing nested editor content', async () => {
        await focusEditor(page);
        await insertCard(page, {cardName: 'signup'});

        await page.keyboard.press('Shift+Tab');
        await page.keyboard.press('Shift+Tab');
        await page.keyboard.type('Header. ');

        await page.keyboard.press('Enter');
        await page.keyboard.type(' Subheader');

        await page.keyboard.press('Enter');
        await page.keyboard.type(' Disclaimer');

        await page.keyboard.press('Escape');
        await page.keyboard.press('Backspace');
        await page.keyboard.press(`${ctrlOrCmd()}+z`);

        await assertHTML(page, html`
            <div data-lexical-decorator="true" contenteditable="false">
                <div data-kg-card-editing="false" data-kg-card-selected="true" data-kg-card="signup">
                    <div>
                        <div>
                            <div>
                                <div data-kg="editor">
                                    <div contenteditable="false" role="textbox" spellcheck="true" data-lexical-editor="true" aria-autocomplete="none" aria-readonly="true">
                                        <p dir="ltr"><span data-lexical-text="true">
                                            Header. Sign up for Koenig Lexical
                                        </span></p>
                                    </div>
                                </div>
                            </div>
                            <div>
                                <div data-kg="editor">
                                    <div contenteditable="false" role="textbox" spellcheck="true" data-lexical-editor="true" aria-autocomplete="none" aria-readonly="true">
                                        <p dir="ltr"><span data-lexical-text="true">
                                            There's a whole lot to discover in this editor. Let us help you settle in. Subheader
                                        </span></p>
                                    </div>
                                </div>
                            </div>
                            <div>
                                <div>
                                    <input placeholder="Your email" tabindex="-1" readonly="" value="" />
                                    <button disabled="" type="button"><span>Subscribe</span></button>
                                </div>
                            </div>
                            <div>
                                <div data-kg="editor">
                                    <div contenteditable="true" role="textbox" spellcheck="true" data-lexical-editor="true">
                                        <p dir="ltr"><span data-lexical-text="true">
                                            No spam. Unsubscribe anytime. Disclaimer
                                        </span></p>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div></div>
                    </div>
                    <div data-kg-card-toolbar="signup"></div>
                </div>
            </div>
            <p><br /></p>
        `, {ignoreCardToolbarContents: true, ignoreInnerSVG: true});
    });*/
});
