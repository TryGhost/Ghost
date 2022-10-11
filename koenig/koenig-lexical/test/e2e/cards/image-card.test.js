import {afterAll, beforeAll, beforeEach, describe, test} from 'vitest';
import {startApp, initialize, focusEditor, assertHTML, html} from '../../utils/e2e';

describe('Image card', async () => {
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

    test('renders image card node', async function () {
        await focusEditor(page);
        await page.keyboard.type('image! ');
        await assertHTML(page, html`
            <div data-lexical-decorator="true" contenteditable="false">
            <div data-kg-card="true" data-kg-card-selected="false">
            <div>
            <div>
            <figure>
            <div>
            <button>
            <svg width="134" height="135" viewBox="0 0 134 135" xmlns="http://www.w3.org/2000/svg"></svg>
            <p>Click to select an image</p>
            </button>
            </div>
            </figure>
            <form>
            <input type="file" accept="image/*" name="image" hidden="">
            </form>
            </div>
            <input placeholder="Type caption for image (optional)" />
            <button>Alt</button>
            </div>
            </div>
            </div>
        `, {ignoreInlineStyles: true, ignoreClasses: true, ignoreInnerSVG: true});
    });
});
