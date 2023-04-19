// import createDataTransfer from '../../utils/createDataTransfer';
// import path from 'path';
import {afterAll, beforeAll, beforeEach, describe, test} from 'vitest';
import {assertHTML, focusEditor, html, initialize, startApp} from '../../utils/e2e';
// import {expect} from '@playwright/test';

describe('File card', async () => {
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
                        header: '<p dir="ltr"><span>hello world</span></p>',
                        subheader: '<p dir="ltr"><span>hello sub</span></p>',
                        backgroundImageStyle: 'bg-image',
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

        // page.pause();
        await assertHTML(page, html`
            <div data-lexical-decorator="true" contenteditable="false">
                <div data-kg-card-editing="false" data-kg-card-selected="false" data-kg-card="header">
                </div>
            </div>
        `, {ignoreCardContents: true});
    });

    test('renders header card node', async function () {
        await focusEditor(page);
        await page.keyboard.type('/header');
        await page.waitForSelector('[data-kg-card-menu-item="Header"][data-kg-cardmenu-selected="true"]');
        await page.keyboard.press('Enter');
        await page.waitForSelector('[data-kg-card="header"]');

        await assertHTML(page, html`
            <div data-lexical-decorator="true" contenteditable="false">
                <div data-kg-card-editing="true" data-kg-card-selected="true" data-kg-card="header">
                </div>
            </div>
            <p><br /></p>
        `, {ignoreCardContents: true});
    });

    test('can edit header', async function () {
        await focusEditor(page);
        await page.keyboard.type('/header');
        await page.waitForSelector('[data-kg-card-menu-item="Header"][data-kg-cardmenu-selected="true"]');
        await page.keyboard.press('Enter');
        await page.waitForSelector('[data-kg-card="header"]');

        // await page.click('[data-kg-card="header"] [data-kg-card-input="header"]');

        await page.keyboard.type('Hello world');

        await assertHTML(page, html`
            <div data-lexical-decorator="true" contenteditable="false">
                <div data-kg-card-editing="true" data-kg-card-selected="true" data-kg-card="header">
                    <div data-kg-card-input="header">
                        <p><span>Hello world</span></p>
                    </div>
                </div>
            </div>
            <p><br /></p>
        `, {ignoreCardContents: true});
    });

    // test('can edit sub header', async function () {
    //     await focusEditor(page);
    //     await page.keyboard.type('/header');
    //     await page.waitForSelector('[data-kg-card-menu-item="Header"][data-kg-cardmenu-selected="true"]');
    //     await page.keyboard.press('Enter');
    //     await page.waitForSelector('[data-kg-card="header"]');

    //     await page.keyboard.type('Hello world');

    //     await page.keyboard.press('Enter');

    //     await assertHTML(page, html`
    //         <div data-lexical-decorator="true" contenteditable="false">
    //             <div data-kg-card-editing="false" data-kg-card-selected="true" data-kg-card="header">
    //                 <div data-kg-card-input="header">
    //                     <p><span>Hello world</span></p>
    //                 </div>
    //                 <div data-kg-card-input="subheader">
    //                     <p><span>Hello subheader</span></p>
    //                 </div>
    //             </div>
    //         </div>
    //         <p><br /></p>
    //     `, {ignoreCardContents: true});
    // });

    test('can toggle button on', async function () {
        await focusEditor(page);
        await page.keyboard.type('/header');
        await page.waitForSelector('[data-kg-card-menu-item="Header"][data-kg-cardmenu-selected="true"]');
        await page.keyboard.press('Enter');
        await page.waitForSelector('[data-kg-card="header"]');
    });
});

// async function uploadFile(page, fileName = 'print-img.pdf') {
//     const filePath = path.relative(process.cwd(), __dirname + `/../fixtures/${fileName}`);

//     const fileChooserPromise = page.waitForEvent('filechooser');
//     await page.keyboard.type('/file');
//     await page.waitForSelector('[data-kg-card-menu-item="File"][data-kg-cardmenu-selected="true"]');
//     await page.keyboard.press('Enter');
//     const fileChooser = await fileChooserPromise;
//     await fileChooser.setFiles([filePath]);
// }
