import {afterAll, beforeAll, beforeEach, describe, test} from 'vitest';
import {startApp, initialize} from '../../utils/e2e';
// import path from 'path';
// import fs from 'fs';

describe('Drag Drop Paste Plugin', async function () {
    let app;
    let page;

    beforeAll(async function () {
        ({app, page} = await startApp());
    });

    afterAll(async function () {
        await app.stop();
    });

    beforeEach(async function () {
        await initialize({page});
    });

    test.todo('can drag and drop an image into the editor');

    // test('can drop an image on the editor', async function () {
    //     const fp = path.relative(process.cwd(), __dirname + '/../fixtures/large-image.png');
    //     const buffer = fs.readFileSync(fp);
    //     await focusEditor(page);
    //     // eslint - disable - next - line
    //     const dataset = await page.evaluate(async (fileBuffer) => {
    //         const dt = new DataTransfer();
    //         const file = new File([fileBuffer], 'large.png', {type: 'image/png'});
    //         dt.items.add(file);
    //         return dt;
    //     }, buffer.toString('hex'));
    //     // await page.dispatchEvent('.koenig-lexical', 'drop', {dataset});
    //     await page.evaluateHandle(async (data) => {
    //         const dropEvent = new DragEvent(data);
    //         await document.dispatchEvent(dropEvent);
    //     }, await dataset);
    //     // set timeout
    //     await page.waitForTimeout(3000);
    //     await assertHTML(page, html`
    //         <div data-lexical-decorator="true" contenteditable="false">
    //             <div data-kg-card-selected="true" data-kg-card="image">
    //                 <figure>
    //                     <img src="data:image/png;base64,BASE64DATA" alt="" />
    //                     <figcaption>
    //                         <input placeholder="Type caption for image (optional)" value="" />
    //                         <button name="alt-toggle-button">Alt</button>
    //                     </figcaption>
    //                 </figure>
    //                 <div data-kg-card-toolbar="image"></div>
    //             </div>
    //         </div>
    //     `);
    // });
});
