import fs from 'fs';
import path from 'path';
import {assertHTML, ctrlOrCmd, focusEditor,html, initialize, insertCard, paste, pasteFiles, pasteFilesWithText, pasteHtml, pasteText} from '../utils/e2e';
import {expect, test} from '@playwright/test';
import {fileURLToPath} from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

test.describe('Paste behaviour', async () => {
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

    test.describe('Text', function () {
        test('converts line breaks to paragraphs', async function () {
            await focusEditor(page);
            await pasteText(page, 'One\n\nTwo\n\nThree');
            await assertHTML(page, html`
                <p dir="ltr"><span data-lexical-text="true">One</span></p>
                <p dir="ltr"><span data-lexical-text="true">Two</span></p>
                <p dir="ltr"><span data-lexical-text="true">Three</span></p>
            `);
        });
    });

    test.describe('URLs', function () {
        test('pasted at start of populated paragraph creates a link', async function () {
            await focusEditor(page);
            await page.keyboard.type('1 2');
            await page.keyboard.press('ArrowLeft');
            await page.keyboard.press('ArrowLeft');
            await page.keyboard.press('ArrowLeft');
            await page.keyboard.press('Space');

            await pasteText(page, 'https://ghost.org');

            await assertHTML(page, html`
                <p>
                    <span data-lexical-text="true"></span>
                    <a href="https://ghost.org" dir="ltr">
                        <span data-lexical-text="true">https://ghost.org</span>
                    </a>
                    <span data-lexical-text="true">1 2</span>
                </p>
            `);
        });

        test('pasted mid populated paragraph creates a link', async function () {
            await focusEditor(page);
            await page.keyboard.type('1 2');
            await page.keyboard.press('ArrowLeft');
            await page.keyboard.press('ArrowLeft');
            await page.keyboard.press('Space');

            await pasteText(page, 'https://ghost.org');

            await assertHTML(page, html`
                <p>
                    <span data-lexical-text="true">1</span>
                    <a href="https://ghost.org" dir="ltr">
                        <span data-lexical-text="true">https://ghost.org</span>
                    </a>
                    <span data-lexical-text="true">2</span>
                </p>
            `);
        });

        test('pasted at end of populated paragraph creates a link', async function () {
            await focusEditor(page);
            await page.keyboard.type('1 2 ');
            await pasteText(page, 'https://ghost.org');

            await assertHTML(page, html`
                <p>
                    <span data-lexical-text="true">1 2</span>
                    <a href="https://ghost.org" dir="ltr">
                        <span data-lexical-text="true">https://ghost.org</span>
                    </a>
                </p>
            `);
        });

        test('pasted on selected text converts to link', async function () {
            await focusEditor(page);
            await page.keyboard.type('1 test');
            await page.keyboard.press('Shift+ArrowLeft');
            await page.keyboard.press('Shift+ArrowLeft');
            await page.keyboard.press('Shift+ArrowLeft');
            await page.keyboard.press('Shift+ArrowLeft');
            await pasteText(page, 'https://ghost.org');

            await assertHTML(page, html`
                <p>
                    <span data-lexical-text="true">1</span>
                    <a href="https://ghost.org" dir="ltr">
                        <span data-lexical-text="true">test</span>
                    </a>
                </p>
            `);
        });

        test('pasted on selected text containing formats converts to link', async function () {
            await focusEditor(page);
            await page.keyboard.type('Text with ');
            await page.keyboard.press(`${ctrlOrCmd()}+B`);
            await page.keyboard.type('bold');
            await page.keyboard.press(`${ctrlOrCmd()}+B`);
            await page.keyboard.type(' and ');
            await page.keyboard.press(`${ctrlOrCmd()}+I`);
            await page.keyboard.type('italic');
            await page.keyboard.press(`${ctrlOrCmd()}+I`);
            await page.keyboard.type(' text.');

            await assertHTML(page, html`
                <p dir="ltr">
                    <span data-lexical-text="true">Text with </span>
                    <strong data-lexical-text="true">bold</strong>
                    <span data-lexical-text="true"> and </span>
                    <em data-lexical-text="true">italic</em>
                    <span data-lexical-text="true"> text.</span>
                </p>
            `);

            await page.keyboard.press(`${ctrlOrCmd()}+A`);
            await pasteText(page, 'https://ghost.org');

            await assertHTML(page, html`
                <p dir="ltr">
                    <a href="https://ghost.org" dir="ltr">
                        <span data-lexical-text="true">Text with </span>
                        <strong data-lexical-text="true">bold</strong>
                        <span data-lexical-text="true"> and </span>
                        <em data-lexical-text="true">italic</em>
                        <span data-lexical-text="true"> text.</span>
                    </a>
                </p>
            `);
        });

        test('pasted on selected text within a nested editor converts to link', async function () {
            await focusEditor(page);
            await page.keyboard.type('/callout', {delay: 10});
            await page.keyboard.press('Enter');
            await page.keyboard.type('1 test');
            await page.keyboard.press('Shift+ArrowLeft');
            await page.keyboard.press('Shift+ArrowLeft');
            await page.keyboard.press('Shift+ArrowLeft');
            await page.keyboard.press('Shift+ArrowLeft');
            await pasteText(page, 'https://ghost.org');
            await page.keyboard.press(`${ctrlOrCmd()}+Enter`); // exit edit mode

            await assertHTML(page, html`
            <div data-lexical-decorator="true" contenteditable="false">
              <div
                data-kg-card-editing="false"
                data-kg-card-selected="true"
                data-kg-card="callout">
                <div>
                  <div><button type="button">💡</button></div>
                  <div>
                    <div data-kg="editor">
                      <div
                        contenteditable="false"
                        role="textbox"
                        spellcheck="true"
                        data-lexical-editor="true"
                        aria-autocomplete="none"
                        aria-readonly="true">
                        <p>
                          <span data-lexical-text="true">1</span>
                          <a href="https://ghost.org" dir="ltr">
                            <span data-lexical-text="true">test</span>
                          </a>
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
                <div></div>
                <div data-kg-card-toolbar="callout">
                  <ul>
                    <li>
                      <button
                        aria-label="Edit"
                        data-kg-active="false"
                        type="button">
                        <svg></svg>
                      </button>
                      <div><span>Edit</span></div>
                    </li>
                    <li></li>
                    <li>
                      <button
                        aria-label="Save as snippet"
                        data-kg-active="false"
                        type="button">
                        <svg></svg>
                      </button>
                      <div><span>Save as snippet</span></div>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
            <p><br /></p>
            `);
        });

        test('pasted on blank paragraph creates embed/bookmark', async function () {
            await focusEditor(page);
            await pasteText(page, 'https://ghost.org/');
            await expect(page.getByTestId('embed-url-loading-container')).toBeVisible();
            await expect(page.getByTestId('embed-url-loading-container')).toBeHidden();
            await expect(page.getByTestId('embed-iframe')).toBeVisible();
        });

        test('pasted on blank paragraph with shift creates a link', async function () {
            await focusEditor(page);
            await page.keyboard.down('Shift');
            await pasteText(page, 'https://ghost.org/');
            await page.keyboard.up('Shift');

            await assertHTML(page, html`
                <p>
                    <a href="https://ghost.org/" dir="ltr">
                        <span data-lexical-text="true">https://ghost.org/</span>
                    </a>
                </p>
            `);
        });

        test('pasted on a card shortcut avoids conversion', async function () {
            await focusEditor(page);
            await page.keyboard.type('/embed ');
            await pasteText(page, 'https://ghost.org/');

            await assertHTML(page, html`
                <p dir="ltr">
                    <span data-lexical-text="true">/embed https://ghost.org/</span>
                </p>
            `);

            await page.keyboard.press('Enter');

            await expect(page.getByTestId('embed-url-loading-container')).toBeVisible();
            await expect(page.getByTestId('embed-url-loading-container')).toBeHidden();
            await expect(page.getByTestId('embed-iframe')).toBeVisible();
        });
    });

    test.describe('Styles', function () {
        test('text alignment styles are stripped from paragraphs on paste', async function () {
            await focusEditor(page);
            await pasteHtml(page, '<p style="text-align: center">Testing</p>');

            await assertHTML(page, html`
                <p dir="ltr">
                    <span data-lexical-text="true">Testing</span>
                </p>
            `, {ignoreClasses: false, ignoreInlineStyles: false});
        });

        test('text alignment styles are stripped from headings on paste', async function () {
            await focusEditor(page);
            await pasteHtml(page, '<h1 style="text-align: center">Testing</h1>');

            await assertHTML(page, html`
                <h1 dir="ltr"><span data-lexical-text="true">Testing</span></h1>
            `, {ignoreClasses: false, ignoreInlineStyles: false});
        });

        test('text alignment styles are stripped from quotes on paste', async function () {
            await focusEditor(page);
            await pasteHtml(page, '<blockquote style="text-align: center">Testing</blockquote>');

            await assertHTML(page, html`
                <blockquote dir="ltr"><span data-lexical-text="true">Testing</span></blockquote>
            `, {ignoreClasses: false, ignoreInlineStyles: false});
        });

        test('text alignment styles are not copied over for lists on paste', async function () {
            await focusEditor(page);
            await pasteHtml(page, '<ul style="text-align: center"><li style="text-align: center">Testing</li></ul>');

            await assertHTML(page, html`
                <ul>
                    <li value="1" dir="ltr"><span data-lexical-text="true">Testing</span></li>
                </ul>
            `, {ignoreClasses: false, ignoreInlineStyles: false});
        });

        test('text format styles are not copied over on paste', async function () {
            await focusEditor(page);
            await pasteHtml(page, '<p style="color: red"><span style="color: red">Testing</span></p>');

            await assertHTML(page, html`
                <p dir="ltr">
                    <span data-lexical-text="true">Testing</span>
                </p>
            `, {ignoreClasses: false, ignoreInlineStyles: false});
        });
    });

    test.describe('Office.com Word', function () {
        test('supports basic text formatting', async function () {
            const copiedHtml = fs.readFileSync('test/e2e/fixtures/paste/office-com-text-formats.html', 'utf8');

            await focusEditor(page);
            await pasteHtml(page, copiedHtml);

            await assertHTML(page, html`
                <p dir="ltr">
                    <span data-lexical-text="true">Testing</span>
                    <strong data-lexical-text="true">bold</strong>
                    <span data-lexical-text="true"></span>
                    <em class="italic" data-lexical-text="true">italic</em>
                    <span class="underline" data-lexical-text="true">underline</span>
                    <span data-lexical-text="true"></span>
                    <span class="line-through" data-lexical-text="true">strikethrough</span>
                    <span data-lexical-text="true"></span>
                    <sub data-lexical-text="true"><span>subscript</span></sub>
                    <sup data-lexical-text="true"><span>supscript</span></sup>
                    <a href="https://ghost.org/" target="_blank" rel="noreferrer noopener" dir="ltr">
                        <span class="underline" data-lexical-text="true">link</span>
                    </a>
                    <span data-lexical-text="true">&nbsp;</span>
                </p>
                <p dir="ltr">
                    <strong class="italic underline" data-lexical-text="true">Bold+italic+underline</strong>
                    <span data-lexical-text="true">&nbsp;</span>
                </p>
                <p>
                    <a href="https://ghost.org/" target="_blank" rel="noreferrer noopener" dir="ltr">
                        <strong class="italic" data-lexical-text="true">Bold+italic+link</strong>
                    </a>
                    <span data-lexical-text="true">&nbsp;</span>
                </p>
                <p dir="ltr">
                    <mark data-lexical-text="true"><span>highlight</span></mark>
                    <span data-lexical-text="true">&nbsp;</span>
                </p>
            `, {ignoreClasses: false, ignoreInlineStyles: false});
        });

        test('supports headings', async function () {
            const copiedHtml = fs.readFileSync('test/e2e/fixtures/paste/office-com-headings.html', 'utf8');

            await focusEditor(page);
            await pasteHtml(page, copiedHtml);

            await assertHTML(page, html`
                <h1 dir="ltr"><span data-lexical-text="true">Heading one&nbsp;</span></h1>
                <h2 dir="ltr"><span data-lexical-text="true">Heading two&nbsp;</span></h2>
                <h3 dir="ltr"><span data-lexical-text="true">Heading three&nbsp;</span></h3>
                <h4 dir="ltr"><em data-lexical-text="true">Heading four&nbsp;</em></h4>
            `);
        });
    });

    test.describe('Google Docs', function () {
        test('ignores line breaks between paragraphs', async function () {
            const copiedHtml = fs.readFileSync('test/e2e/fixtures/paste/google-docs-empty-paragraphs.html', 'utf8');

            await focusEditor(page);
            await pasteHtml(page, copiedHtml);

            await assertHTML(page, html`
                <p dir="ltr">
                <span data-lexical-text="true">
                    Start of the article. Here is the 1st paragraph, followed by two line breaks then a paragraph.
                </span>
                </p>
                <p dir="ltr">
                <span data-lexical-text="true">
                    Here is the 2nd paragraph, followed by a line break then a heading.
                </span>
                </p>
                <h1 dir="ltr"><span data-lexical-text="true">Heading 1</span></h1>
                <p dir="ltr">
                <span data-lexical-text="true">
                    Here is the 3rd paragraph, with a line break before and a line break after, followed by a list.
                </span>
                </p>
                <ul>
                <li value="1" dir="ltr">
                    <br />
                    <span data-lexical-text="true">List item 1</span>
                    <br />
                    <span data-lexical-text="true"></span>
                </li>
                <li value="2" dir="ltr">
                    <br />
                    <span data-lexical-text="true">List item 2</span>
                    <br />
                    <span data-lexical-text="true"></span>
                </li>
                </ul>
                <p dir="ltr">
                <span data-lexical-text="true">
                    Here is the 4th paragraph, with a line break before and a divider after.
                </span>
                </p>
                <div data-lexical-decorator="true" contenteditable="false">
                    <div
                        data-kg-card-editing="false"
                        data-kg-card-selected="false"
                        data-kg-card="horizontalrule">
                        <hr />
                    </div>
                </div>
                <p dir="ltr">
                <span data-lexical-text="true">
                    Here is the 5th paragraph. End of the article.
                </span>
                </p>
                <p><br /></p>
            `);
        });
    });

    test.describe('Invalid nesting', function () {
        // if we have inline elements converting to block elements such as Google Docs
        // spans converting to headings then we need to make sure we don't end up with
        // invalid nesting in the editor

        test('paragraphs containing Google Docs heading span at start', async function () {
            const copiedHtml = `<p><span style="font-size: 26pt">Nested heading</span> Text after</p>`;

            await focusEditor(page);
            await pasteHtml(page, copiedHtml);

            await assertHTML(page, html`
                <h1 dir="ltr">
                    <span data-lexical-text="true">Nested heading</span>
                </h1>
                <p dir="ltr">
                    <span data-lexical-text="true">Text after</span>
                </p>
            `);
        });

        test('paragraphs containing Google Docs heading span at end', async function () {
            const copiedHtml = `<p>Paragraph <strong>with</strong> <em>elements</em><span style="font-size: 26pt">Nested heading</span></p>`;

            await focusEditor(page);
            await pasteHtml(page, copiedHtml);

            await assertHTML(page, html`
                <p dir="ltr">
                    <span data-lexical-text="true">Paragraph</span>
                    <strong data-lexical-text="true">with</strong>
                    <span data-lexical-text="true"></span>
                    <em data-lexical-text="true">elements</em>
                </p>
                <h1 dir="ltr">
                    <span data-lexical-text="true">Nested heading</span>
                </h1>
            `);
        });

        test('paragraphs containing Google Docs heading span in middle', async function () {
            const copiedHtml = `<p>Text before <span style="font-size: 26pt">Nested heading</span> Text after</p>`;

            await focusEditor(page);
            await pasteHtml(page, copiedHtml);

            await assertHTML(page, html`
                <p dir="ltr">
                    <span data-lexical-text="true">Text before</span>
                </p>
                <h1 dir="ltr">
                    <span data-lexical-text="true">Nested heading</span>
                </h1>
                <p dir="ltr">
                    <span data-lexical-text="true">Text after</span>
                </p>
            `);
        });

        test('headings containing Google Docs title span', async function () {
            const copiedHtml = `<h2>Normal H2 <span style="font-size: 26pt">Nested Google heading</span></h2>`;

            await focusEditor(page);
            await pasteHtml(page, copiedHtml);

            await assertHTML(page, html`
                <h2 dir="ltr">
                    <span data-lexical-text="true">Normal H2</span>
                </h2>
                <h1 dir="ltr">
                    <span data-lexical-text="true">Nested Google heading</span>
                </h1>
            `);
        });
    });

    test.describe('Inside cards', function () {
        test('pasting inside HTML card CodeMirror editor works', async function () {
            await focusEditor(page);
            await insertCard(page, {cardName: 'html'});

            await expect(page.locator('.cm-content[contenteditable="true"]')).toBeVisible();

            await paste(page, {
                'text/plain': 'ignore default Lexical behaviour',
                'text/html': '<meta charset=\'utf-8\'><div style="color: #abb2bf;background-color: #282c34;font-family: \'Operator Mono Lig\', Menlo, Monaco, \'Courier New\', monospace;font-weight: normal;font-size: 12px;line-height: 14px;white-space: pre;"><div><span style="color: #7f848e;font-style: italic;">ignore default Lexical behaviour</span></div></div>'
            });

            await assertHTML(page, html`
                <div data-lexical-decorator="true" contenteditable="false">
                    <div><svg></svg></div>
                    <div
                        data-kg-card-editing="true"
                        data-kg-card-selected="true"
                        data-kg-card="html">
                        <div>
                            <div>
                                <div>
                                    <div aria-live="polite"></div>
                                    <div tabindex="-1">
                                        <div aria-hidden="true">
                                            <div>
                                                <div>9</div>
                                                <div>1</div>
                                            </div>
                                        </div>
                                        <div
                                            spellcheck="false"
                                            autocorrect="off"
                                            autocapitalize="off"
                                            translate="no"
                                            contenteditable="true"
                                            role="textbox"
                                            aria-multiline="true"
                                            data-language="html">
                                            <div>ignore default Lexical behaviour</div>
                                        </div>
                                        <div aria-hidden="true"><div></div></div>
                                        <div aria-hidden="true"></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div>
                            <div draggable="true">
                                <div>
                                    <button type="button">Visibility</button>
                                </div>
                                <div>
                                    <label>
                                        <div><div>Show on web</div></div>
                                        <div>
                                            <label id="visibility-show-on-web">
                                                <input type="checkbox" checked="" />
                                                <div></div>
                                            </label>
                                        </div>
                                    </label>
                                    <label>
                                        <div><div>Show in email newsletter</div></div>
                                        <div>
                                            <label id="visibility-show-on-email">
                                                <input type="checkbox" checked="" />
                                                <div></div>
                                            </label>
                                        </div>
                                    </label>
                                    <div>
                                        <div>Email audience</div>
                                        <div>
                                            <button type="button">
                                                All members
                                                <svg></svg>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <p><br /></p>
            `, {ignoreCardContents: false});
        });
    });

    test.describe('Files', function () {
        test('pastes an .png file as Image card', async function () {
            const filePath = path.relative(process.cwd(), __dirname + '/fixtures/large-image.png');

            await focusEditor(page);
            await pasteFiles(page, [{filePath, fileName: 'large-image.png', fileType: 'image/png'}]);

            const imageCard = await page.locator('[data-kg-card="image"]');
            await expect(imageCard).toHaveCount(1);
        });

        test('pastes an .jpeg file as Image card', async function () {
            const filePath = path.relative(process.cwd(), __dirname + '/fixtures/large-image.jpeg');

            await focusEditor(page);
            await pasteFiles(page, [{filePath, fileName: 'large-image.jpeg', fileType: 'image/jpeg'}]);

            const imageCard = await page.locator('[data-kg-card="image"]');
            await expect(imageCard).toHaveCount(1);
        });

        test('pastes an .mp4 file as Video card', async function () {
            const filePath = path.relative(process.cwd(), __dirname + '/fixtures/video.mp4');

            await focusEditor(page);
            await pasteFiles(page, [{filePath, fileName: 'video.mp4', fileType: 'video/mp4'}]);

            const videoCard = await page.locator('[data-kg-card="video"]');
            await expect(videoCard).toHaveCount(1);
        });

        test('does not paste an image file if there is text/html content in the clipboard', async function () {
            const filePath = path.relative(process.cwd(), __dirname + '/fixtures/large-image.png');
            const files = [{filePath, fileName: 'large-image.png', fileType: 'image/png'}];
            const textHtml = {'text/html': '<p>Some text</p>'};

            await focusEditor(page);
            await pasteFilesWithText(page, files, textHtml);

            const text = await page.locator('p').filter({hasText: 'Some text'});
            expect(text).not.toBeNull();

            const imageCard = await page.locator('[data-kg-card="image"]');
            await expect(imageCard).toHaveCount(0);
        });

        // By default, Lexical dispatches the file paste command (DRAG_DROP_PASTE) only if there is no text content in the clipboard
        // We override this behaviour in KoenigBehaviourPlugin > PASTE_COMMAND, to support copy/pasting files from e.g. Slack
        test('pastes a image file if the clipboard contains a single image file and text/html with a <img> tag', async function () {
            const filePath = path.relative(process.cwd(), __dirname + '/fixtures/large-image.png');
            const files = [{filePath, fileName: 'large-image.png', fileType: 'image/png'}];
            const textHtml = {'text/html': '<img src="https://files.slack.com/foo-bar" />'};

            await focusEditor(page);
            await pasteFilesWithText(page, files, textHtml);

            const imageCard = await page.locator('[data-kg-card="image"]');
            const imgSrc = await page.locator('[data-kg-card="image"] img').getAttribute('src');

            await expect(imageCard).toHaveCount(1);

            // Check that the image src is not coming from the text/html content
            expect(imgSrc).not.toContain('https://files.slack.com/foo-bar');
        });
    });
});
