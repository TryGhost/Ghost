import path from 'path';
import {afterAll, beforeAll, beforeEach, describe, test} from 'vitest';
import {assertHTML, focusEditor, html, initialize, startApp} from '../../utils/e2e';

async function createHeaderCard({page}) {
    await focusEditor(page);
    await page.keyboard.type('/header');
    await page.waitForSelector('[data-kg-card-menu-item="Header"][data-kg-cardmenu-selected="true"]');
    await page.keyboard.press('Enter');
    await page.waitForSelector('[data-kg-card="header"]');
}

describe('Header card', async () => {
    let app;
    let page;

    beforeAll(async () => {
        ({app, page} = await startApp());
    });

    afterAll(async () => {
        await app.stop();
    });

    beforeEach(async () => {
        await initialize({page});
    });

    test('can import serialized header card nodes', async function () {
        await page.evaluate(() => {
            const serializedState = JSON.stringify({
                root: {
                    children: [{
                        type: 'header',
                        size: 'small',
                        style: 'image',
                        buttonEnabled: false,
                        buttonUrl: '',
                        buttonText: '',
                        header: '<span>hello world</span>',
                        subheader: '<span>hello sub</span>',
                        backgroundImageStyle: 'image',
                        backgroundImageSrc: 'blob:http://localhost:5173/fa0956a8-5fb4-4732-9368-18f9d6d8d25a'
                    }],
                    direction: null,
                    format: '',
                    indent: 0,
                    type: 'root',
                    version: 1
                }
            });
            const editor = window.lexicalEditor;
            const editorState = editor.parseEditorState(serializedState);
            editor.setEditorState(editorState);
        });

        await assertHTML(page, html`
            <div data-lexical-decorator="true" contenteditable="false">
            <div data-kg-card-editing="false" data-kg-card-selected="false" data-kg-card="header">
                <div>
                    <div>
                        <div data-kg="editor">
                        <div
                            contenteditable="false"
                            spellcheck="true"
                            data-lexical-editor="true"
                            aria-autocomplete="none">
                            <p dir="ltr"><span data-lexical-text="true">hello world</span></p>
                        </div>
                        </div>
                    </div>
                    <div>
                        <div data-kg="editor">
                        <div
                            contenteditable="false"
                            spellcheck="true"
                            data-lexical-editor="true"
                            aria-autocomplete="none">
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
        await createHeaderCard({page});

        await assertHTML(page, html`
            <div data-lexical-decorator="true" contenteditable="false">
                <div data-kg-card-editing="true" data-kg-card-selected="true" data-kg-card="header">
                </div>
            </div>
            <p><br /></p>
        `, {ignoreCardContents: true});
    });

    test('can edit header', async function () {
        await createHeaderCard({page});

        // await page.click('[data-kg-card="header"] [data-kg-card-input="header"]');

        await page.keyboard.type('Hello world');

        await assertHTML(page, html`
            <div data-lexical-decorator="true" contenteditable="false">
            <div
                data-kg-card-editing="true"
                data-kg-card-selected="true"
                data-kg-card="header">
                <div>
                <div>
                    <div data-kg="editor">
                    <div
                        contenteditable="true"
                        spellcheck="true"
                        data-lexical-editor="true"
                        role="textbox">
                        <p dir="ltr"><span data-lexical-text="true">Hello world</span></p>
                    </div>
                    </div>
                </div>
                <div>
                    <div data-kg="editor">
                    <div
                        contenteditable="true"
                        spellcheck="true"
                        data-lexical-editor="true"
                        role="textbox">
                        <p><br /></p>
                    </div>
                    </div>
                    <div>Enter subheading text</div>
                </div>
                </div>
                <div>
                <div draggable="true">
                    <div>
                    <div>Size</div>
                    <div>
                        <div>
                        <ul>
                            <li><button aria-label="S" type="button">S</button></li>
                            <li><button aria-label="M" type="button">M</button></li>
                            <li><button aria-label="L" type="button">L</button></li>
                        </ul>
                        </div>
                    </div>
                    </div>
                    <div>
                    <div>Style</div>
                    <div>
                        <div>
                        <ul>
                            <li>
                            <button
                                aria-label="Dark"
                                data-test-id="color-picker-dark"
                                type="button">
                                <span></span>
                            </button>
                            </li>
                            <li>
                            <button
                                aria-label="Light"
                                data-test-id="color-picker-light"
                                type="button">
                                <span></span>
                            </button>
                            </li>
                            <li>
                            <button
                                aria-label="Accent"
                                data-test-id="color-picker-accent"
                                type="button">
                                <span></span>
                            </button>
                            </li>
                            <li type="button">
                            <span><svg></svg></span>
                            </li>
                        </ul>
                        </div>
                    </div>
                    </div>
                    <form>
                    <input accept="image/*" hidden="" name="image-input" type="file" />
                    </form>
                    <hr />
                    <div>
                    <div><div>Button</div></div>
                    <div>
                        <label id="header-button-toggle">
                        <input type="checkbox" />
                        <div></div>
                        </label>
                    </div>
                    </div>
                </div>
                </div>
            </div>
            </div>
            <p><br /></p>
        `, {});
    });

    test('can edit sub header', async function () {
        await createHeaderCard({page});

        await page.keyboard.type('Hello world');

        await page.keyboard.press('Enter');
        await page.keyboard.type('Hello subheader');

        await assertHTML(page, html`
            <div data-lexical-decorator="true" contenteditable="false">
                <div
                    data-kg-card-editing="true"
                    data-kg-card-selected="true"
                    data-kg-card="header">
                    <div>
                    <div>
                        <div data-kg="editor">
                        <div
                            contenteditable="true"
                            spellcheck="true"
                            data-lexical-editor="true"
                            role="textbox">
                            <p dir="ltr"><span data-lexical-text="true">Hello world</span></p>
                        </div>
                        </div>
                    </div>
                    <div>
                        <div data-kg="editor">
                        <div
                            contenteditable="true"
                            spellcheck="true"
                            data-lexical-editor="true"
                            role="textbox">
                            <p dir="ltr">
                            <span data-lexical-text="true">Hello subheader</span>
                            </p>
                        </div>
                        </div>
                    </div>
                    </div>
                    <div>
                    <div draggable="true">
                        <div>
                        <div>Size</div>
                        <div>
                            <div>
                            <ul>
                                <li><button aria-label="S" type="button">S</button></li>
                                <li><button aria-label="M" type="button">M</button></li>
                                <li><button aria-label="L" type="button">L</button></li>
                            </ul>
                            </div>
                        </div>
                        </div>
                        <div>
                        <div>Style</div>
                        <div>
                            <div>
                            <ul>
                                <li>
                                <button
                                    aria-label="Dark"
                                    data-test-id="color-picker-dark"
                                    type="button">
                                    <span></span>
                                </button>
                                </li>
                                <li>
                                <button
                                    aria-label="Light"
                                    data-test-id="color-picker-light"
                                    type="button">
                                    <span></span>
                                </button>
                                </li>
                                <li>
                                <button
                                    aria-label="Accent"
                                    data-test-id="color-picker-accent"
                                    type="button">
                                    <span></span>
                                </button>
                                </li>
                                <li type="button">
                                <span><svg></svg></span>
                                </li>
                            </ul>
                            </div>
                        </div>
                        </div>
                        <form>
                        <input accept="image/*" hidden="" name="image-input" type="file" />
                        </form>
                        <hr />
                        <div>
                        <div><div>Button</div></div>
                        <div>
                            <label id="header-button-toggle">
                            <input type="checkbox" />
                            <div></div>
                            </label>
                        </div>
                        </div>
                    </div>
                    </div>
                </div>
                </div>
                <p><br /></p>
         `, {});
    });

    test('can add and remove button', async function () {
        await createHeaderCard({page});

        // click on the toggle with data-testid="header-button-toggle"
        await page.click('[data-testid="header-button-toggle"]');

        // check button is visible
        await assertHTML(page, html`<div data-lexical-decorator="true" contenteditable="false">
        <div
          data-kg-card-editing="true"
          data-kg-card-selected="true"
          data-kg-card="header">
          <div>
            <div>
              <div data-kg="editor">
                <div
                  contenteditable="true"
                  spellcheck="true"
                  data-lexical-editor="true"
                  role="textbox">
                  <p><br /></p>
                </div>
              </div>
              <div>Enter heading text</div>
            </div>
            <div>
              <div data-kg="editor">
                <div
                  contenteditable="true"
                  spellcheck="true"
                  data-lexical-editor="true"
                  role="textbox">
                  <p><br /></p>
                </div>
              </div>
              <div>Enter subheading text</div>
            </div>
            <div>
              <button type="button"><span>Add button text</span></button>
            </div>
          </div>
          <div>
            <div draggable="true">
              <div>
                <div>Size</div>
                <div>
                  <div>
                    <ul>
                      <li><button aria-label="S" type="button">S</button></li>
                      <li><button aria-label="M" type="button">M</button></li>
                      <li><button aria-label="L" type="button">L</button></li>
                    </ul>
                  </div>
                </div>
              </div>
              <div>
                <div>Style</div>
                <div>
                  <div>
                    <ul>
                      <li>
                        <button
                          aria-label="Dark"
                          data-test-id="color-picker-dark"
                          type="button">
                          <span></span>
                        </button>
                      </li>
                      <li>
                        <button
                          aria-label="Light"
                          data-test-id="color-picker-light"
                          type="button">
                          <span></span>
                        </button>
                      </li>
                      <li>
                        <button
                          aria-label="Accent"
                          data-test-id="color-picker-accent"
                          type="button">
                          <span></span>
                        </button>
                      </li>
                      <li type="button">
                        <span><svg></svg></span>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
              <form>
                <input accept="image/*" hidden="" name="image-input" type="file" />
              </form>
              <hr />
              <div>
                <div><div>Button</div></div>
                <div>
                  <label id="header-button-toggle">
                    <input type="checkbox" />
                    <div></div>
                  </label>
                </div>
              </div>
              <div>
                <div>Button text</div>
                <div><input placeholder="Add button text" value="" /></div>
              </div>
              <div>
                <div>Button URL</div>
                <div>
                  <div>
                    <input
                      placeholder="https://yoursite.com/#/portal/signup/"
                      value="" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <p><br /></p>`, {});

        // Enter some text for the button in data-testid="header-button-text"
        await page.click('[data-testid="header-button-text"]');
        await page.keyboard.type('Click me');

        // Enter some url for the button in data-testid="header-button-url"
        await page.click('[data-testid="header-button-url"]');
        await page.keyboard.type('https://example.com');

        // check button is visible, and not an <a> tag (so not clickable)
        await assertHTML(page, html`<div data-lexical-decorator="true" contenteditable="false">
        <div
          data-kg-card-editing="true"
          data-kg-card-selected="true"
          data-kg-card="header">
          <div>
            <div>
              <div data-kg="editor">
                <div
                  contenteditable="true"
                  spellcheck="true"
                  data-lexical-editor="true"
                  role="textbox">
                  <p><br /></p>
                </div>
              </div>
              <div>Enter heading text</div>
            </div>
            <div>
              <div data-kg="editor">
                <div
                  contenteditable="true"
                  spellcheck="true"
                  data-lexical-editor="true"
                  role="textbox">
                  <p><br /></p>
                </div>
              </div>
              <div>Enter subheading text</div>
            </div>
            <div>
              <button type="button"><span>Click me</span></button>
            </div>
          </div>
          <div>
            <div draggable="true">
              <div>
                <div>Size</div>
                <div>
                  <div>
                    <ul>
                      <li><button aria-label="S" type="button">S</button></li>
                      <li><button aria-label="M" type="button">M</button></li>
                      <li><button aria-label="L" type="button">L</button></li>
                    </ul>
                  </div>
                </div>
              </div>
              <div>
                <div>Style</div>
                <div>
                  <div>
                    <ul>
                      <li>
                        <button
                          aria-label="Dark"
                          data-test-id="color-picker-dark"
                          type="button">
                          <span></span>
                        </button>
                      </li>
                      <li>
                        <button
                          aria-label="Light"
                          data-test-id="color-picker-light"
                          type="button">
                          <span></span>
                        </button>
                      </li>
                      <li>
                        <button
                          aria-label="Accent"
                          data-test-id="color-picker-accent"
                          type="button">
                          <span></span>
                        </button>
                      </li>
                      <li type="button">
                        <span><svg></svg></span>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
              <form>
                <input accept="image/*" hidden="" name="image-input" type="file" />
              </form>
              <hr />
              <div>
                <div><div>Button</div></div>
                <div>
                  <label id="header-button-toggle">
                    <input type="checkbox" />
                    <div></div>
                  </label>
                </div>
              </div>
              <div>
                <div>Button text</div>
                <div><input placeholder="Add button text" value="Click me" /></div>
              </div>
              <div>
                <div>Button URL</div>
                <div>
                  <div>
                    <input
                      placeholder="https://yoursite.com/#/portal/signup/"
                      value="https://example.com" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <p><br /></p>`, {});

        // Can toggle button off again
        await page.click('[data-testid="header-button-toggle"]');

        // check button is not visible
        await assertHTML(page, html`<div data-lexical-decorator="true" contenteditable="false">
        <div
          data-kg-card-editing="true"
          data-kg-card-selected="true"
          data-kg-card="header">
          <div>
            <div>
              <div data-kg="editor">
                <div
                  contenteditable="true"
                  spellcheck="true"
                  data-lexical-editor="true"
                  role="textbox">
                  <p><br /></p>
                </div>
              </div>
              <div>Enter heading text</div>
            </div>
            <div>
              <div data-kg="editor">
                <div
                  contenteditable="true"
                  spellcheck="true"
                  data-lexical-editor="true"
                  role="textbox">
                  <p><br /></p>
                </div>
              </div>
              <div>Enter subheading text</div>
            </div>
          </div>
          <div>
            <div draggable="true">
              <div>
                <div>Size</div>
                <div>
                  <div>
                    <ul>
                      <li><button aria-label="S" type="button">S</button></li>
                      <li><button aria-label="M" type="button">M</button></li>
                      <li><button aria-label="L" type="button">L</button></li>
                    </ul>
                  </div>
                </div>
              </div>
              <div>
                <div>Style</div>
                <div>
                  <div>
                    <ul>
                      <li>
                        <button
                          aria-label="Dark"
                          data-test-id="color-picker-dark"
                          type="button">
                          <span></span>
                        </button>
                      </li>
                      <li>
                        <button
                          aria-label="Light"
                          data-test-id="color-picker-light"
                          type="button">
                          <span></span>
                        </button>
                      </li>
                      <li>
                        <button
                          aria-label="Accent"
                          data-test-id="color-picker-accent"
                          type="button">
                          <span></span>
                        </button>
                      </li>
                      <li type="button">
                        <span><svg></svg></span>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
              <form>
                <input accept="image/*" hidden="" name="image-input" type="file" />
              </form>
              <hr />
              <div>
                <div><div>Button</div></div>
                <div>
                  <label id="header-button-toggle">
                    <input type="checkbox" />
                    <div></div>
                  </label>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <p><br /></p>`, {});
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

        // check background image is visible
        await assertHTML(page, html`
            <div data-lexical-decorator="true" contenteditable="false">
            <div
                data-kg-card-editing="true"
                data-kg-card-selected="true"
                data-kg-card="header">
                <div style='background-image: url("blob:...'>
                <div>
                    <div data-kg="editor">
                    <div
                        contenteditable="true"
                        spellcheck="true"
                        data-lexical-editor="true"
                        style="
                        user-select: text;
                        white-space: pre-wrap;
                        word-break: break-word;
                        "
                        role="textbox">
                        <p><br /></p>
                    </div>
                    </div>
                    <div>Enter heading text</div>
                </div>
                <div>
                    <div data-kg="editor">
                    <div
                        contenteditable="true"
                        spellcheck="true"
                        data-lexical-editor="true"
                        style="
                        user-select: text;
                        white-space: pre-wrap;
                        word-break: break-word;
                        "
                        role="textbox">
                        <p><br /></p>
                    </div>
                    </div>
                    <div>Enter subheading text</div>
                </div>
                </div>
                <div>
                <div
                    draggable="true"
                    style="position: fixed; top: 318.047px; left: 660px">
                    <div>
                    <div>Size</div>
                    <div>
                        <div>
                        <ul>
                            <li><button aria-label="S" type="button">S</button></li>
                            <li><button aria-label="M" type="button">M</button></li>
                            <li><button aria-label="L" type="button">L</button></li>
                        </ul>
                        </div>
                    </div>
                    </div>
                    <div>
                    <div>Style</div>
                    <div>
                        <div>
                        <ul>
                            <li>
                            <button
                                aria-label="Dark"
                                data-test-id="color-picker-dark"
                                type="button">
                                <span></span>
                            </button>
                            </li>
                            <li>
                            <button
                                aria-label="Light"
                                data-test-id="color-picker-light"
                                type="button">
                                <span></span>
                            </button>
                            </li>
                            <li>
                            <button
                                aria-label="Accent"
                                data-test-id="color-picker-accent"
                                type="button">
                                <span></span>
                            </button>
                            </li>
                            <li type="button">
                            <span><svg></svg></span>
                            </li>
                        </ul>
                        </div>
                    </div>
                    </div>
                    <form>
                    <input accept="image/*" hidden="" name="image-input" type="file" />
                    </form>
                    <div>
                    <div>
                        <div>
                        <div>
                            <div></div>
                            <div>
                            <button type="button"><svg></svg></button>
                            </div>
                            <img alt="backgroundHeaderImage" src="blob:..." />
                        </div>
                        </div>
                    </div>
                    </div>
                    <hr />
                    <div>
                    <div><div>Button</div></div>
                    <div>
                        <label id="header-button-toggle">
                        <input type="checkbox" />
                        <div></div>
                        </label>
                    </div>
                    </div>
                </div>
                </div>
            </div>
            </div>
            <p><br /></p>
        `, {ignoreCardToolbarContents: true, ignoreInlineStyles: false});
    });
});
