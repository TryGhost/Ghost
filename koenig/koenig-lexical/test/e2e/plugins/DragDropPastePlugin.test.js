import {afterAll, beforeAll, beforeEach, describe, test} from 'vitest';
import {startApp, initialize, focusEditor, assertHTML, html} from '../../utils/e2e';
import path from 'path';
import fs from 'fs';

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

    test('can drag and drop an image on the editor', async function () {
        await focusEditor(page);

        const filePath = path.relative(process.cwd(), __dirname + '/../fixtures/large-image.png');
        const buffer = fs.readFileSync(filePath);

        const dataTransfer = await page.evaluateHandle((data) => {
            const dt = new DataTransfer();
            const file = new File([data.toString('hex')], 'large-image.png', {type: 'image/png'});
            dt.items.add(file);
            return dt;
        }, buffer);

        await page.dispatchEvent(
            '.kg-prose',
            'dragenter',
            {dataTransfer}
        );
        await page.dispatchEvent(
            '.kg-prose',
            'drop',
            {dataTransfer}
        );

        await assertHTML(page, html`
            <div data-lexical-decorator="true" contenteditable="false">
                <div data-kg-card-selected="true" data-kg-card-editing="false" data-kg-card="image">
                    <figure data-kg-card-width="regular">
                        <div>
                            <img src="blob:..." alt="" />
                        </div>

                        <figcaption>
                            <input placeholder="Type caption for image (optional)" value="" />
                            <button name="alt-toggle-button">Alt</button>
                        </figcaption>
                    </figure>
                </div>
            </div>
        `);
    });

    test('can drag and drop multiple images on the editor', async function () {
        await focusEditor(page);
        const filePath = path.relative(process.cwd(), __dirname + '/../fixtures/large-image.png');
        const filePath2 = path.relative(process.cwd(), __dirname + '/../fixtures/large-image.jpeg');
        const buffer = fs.readFileSync(filePath);
        const buffer2 = fs.readFileSync(filePath2);

        const dataTransfer = await page.evaluateHandle((dataset) => {
            const dt = new DataTransfer();
            const file = new File([dataset.buffer.toString('hex')], 'large-image.png', {type: 'image/png'});
            const file2 = new File([dataset.buffer2.toString('hex')], 'large-image.jpeg', {type: 'image/jpeg'});
            dt.items.add(file);
            dt.items.add(file2);
            return dt;
        }, {buffer, buffer2});

        await page.dispatchEvent(
            '.kg-prose',
            'dragenter',
            {dataTransfer}
        );
        await page.dispatchEvent(
            '.kg-prose',
            'drop',
            {dataTransfer}
        );

        await assertHTML(page, html`
            <div data-lexical-decorator="true" contenteditable="false">
                <div data-kg-card-selected="false" data-kg-card-editing="false" data-kg-card="image">
                    <figure data-kg-card-width="regular">
                        <div>
                            <img
                                src="blob:..."
                                alt="" />
                        </div>
                    </figure>
                </div>
            </div>
            <div data-lexical-decorator="true" contenteditable="false">
                <div data-kg-card-selected="true" data-kg-card-editing="false" data-kg-card="image">
                    <figure data-kg-card-width="regular">
                        <div>
                            <img
                                src="blob:..."
                                alt="" />
                        </div>
                        <figcaption>
                            <input placeholder="Type caption for image (optional)" value="" />
                            <button name="alt-toggle-button">Alt</button>
                        </figcaption>
                    </figure>
                </div>
            </div>
        `);
    });

    test('can drag and drop an audio file on the editor', async function () {
        await focusEditor(page);

        const filePath = path.relative(process.cwd(), __dirname + '/../fixtures/audio-sample.mp3');
        const buffer = fs.readFileSync(filePath);

        const dataTransfer = await page.evaluateHandle((data) => {
            const dt = new DataTransfer();
            const file = new File([data.toString('hex')], 'audio-sample.mp3', {type: 'audio/mp3'});
            dt.items.add(file);
            return dt;
        }, buffer);

        await page.dispatchEvent(
            '.kg-prose',
            'dragenter',
            {dataTransfer}
        );
        await page.dispatchEvent(
            '.kg-prose',
            'drop',
            {dataTransfer}
        );

        await assertHTML(page, html`
            <div data-lexical-decorator="true" contenteditable="false">
                <div data-kg-card-selected="true" data-kg-card-editing="false" data-kg-card="audio">

                </div>
            </div>
        `, {ignoreCardContents: true});
    });

    test('can drag and drop multiple audio files on the editor', async function () {
        await focusEditor(page);
        const filePath = path.relative(process.cwd(), __dirname + '/../fixtures/audio-sample.mp3');
        const filePath2 = path.relative(process.cwd(), __dirname + '/../fixtures/audio-sample.mp3');
        const buffer = fs.readFileSync(filePath);
        const buffer2 = fs.readFileSync(filePath2);

        const dataTransfer = await page.evaluateHandle((dataset) => {
            const dt = new DataTransfer();
            const file = new File([new Uint8Array(dataset.buffer)], 'audio-sample-1.mp3', {type: 'audio/mp3'});
            const file2 = new File([new Uint8Array(dataset.buffer2)], 'audio-sample-2.mp3', {type: 'audio/mp3'});
            dt.items.add(file);
            dt.items.add(file2);
            return dt;
        }, {buffer: buffer.toJSON().data, buffer2: buffer2.toJSON().data});

        await page.dispatchEvent(
            '.kg-prose',
            'dragenter',
            {dataTransfer}
        );
        await page.dispatchEvent(
            '.kg-prose',
            'drop',
            {dataTransfer}
        );

        await page.waitForSelector('input[value="Audio sample 1"]');
        await page.waitForSelector('input[value="Audio sample 2"]');

        await assertHTML(page, html`
            <div data-lexical-decorator="true" contenteditable="false">
                <div data-kg-card-selected="false" data-kg-card-editing="false" data-kg-card="audio">
                </div>
            </div>
            <div data-lexical-decorator="true" contenteditable="false">
                <div data-kg-card-selected="true" data-kg-card-editing="false" data-kg-card="audio">
                    
                </div>
            </div>
        `, {ignoreCardContents: true, ignoreInnerSVG: false});
    });

    test('can drag and drop a video file on the editor', async function () {
        await focusEditor(page);

        const filePath = path.relative(process.cwd(), __dirname + '/../fixtures/video.mp4');
        const buffer = fs.readFileSync(filePath);

        const dataTransfer = await page.evaluateHandle((data) => {
            const dt = new DataTransfer();
            const file = new File([data.toString('hex')], 'video.mp4', {type: 'video/mp4'});
            dt.items.add(file);
            return dt;
        }, buffer);

        await page.dispatchEvent(
            '.kg-prose',
            'dragenter',
            {dataTransfer}
        );
        await page.dispatchEvent(
            '.kg-prose',
            'drop',
            {dataTransfer}
        );

        await assertHTML(page, html`
            <div data-lexical-decorator="true" contenteditable="false">
                <div data-kg-card-selected="true" data-kg-card-editing="false" data-kg-card="video">

                </div>
            </div>
        `, {ignoreCardContents: true});
    });

    test('can drag and drop multiple video files on the editor', async function () {
        await focusEditor(page);
        const filePath = path.relative(process.cwd(), __dirname + '/../fixtures/video.mp4');
        const filePath2 = path.relative(process.cwd(), __dirname + '/../fixtures/video.mp4');
        const buffer = fs.readFileSync(filePath);
        const buffer2 = fs.readFileSync(filePath2);

        const dataTransfer = await page.evaluateHandle((dataset) => {
            const dt = new DataTransfer();
            const file = new File([new Uint8Array(dataset.buffer)], 'video-1.mp4', {type: 'video/mp4'});
            const file2 = new File([new Uint8Array(dataset.buffer2)], 'video-2.mp3', {type: 'video/mp4'});
            dt.items.add(file);
            dt.items.add(file2);
            return dt;
        }, {buffer: buffer.toJSON().data, buffer2: buffer2.toJSON().data});

        await page.dispatchEvent(
            '.kg-prose',
            'dragenter',
            {dataTransfer}
        );
        await page.dispatchEvent(
            '.kg-prose',
            'drop',
            {dataTransfer}
        );

        await assertHTML(page, html`
            <div data-lexical-decorator="true" contenteditable="false">
                <div data-kg-card-selected="false" data-kg-card-editing="false" data-kg-card="video">
                </div>
            </div>
            <div data-lexical-decorator="true" contenteditable="false">
                <div data-kg-card-selected="true" data-kg-card-editing="false" data-kg-card="video">
                </div>
            </div>
        `, {ignoreCardContents: true, ignoreInnerSVG: false});
    });

    test('can drag and drop multiple different types of files on the editor', async function () {
        await focusEditor(page);
        const filePath = path.relative(process.cwd(), __dirname + '/../fixtures/large-image.png');
        const filePath2 = path.relative(process.cwd(), __dirname + '/../fixtures/audio-sample.mp3');
        const filePath3 = path.relative(process.cwd(), __dirname + '/../fixtures/video.mp4');
        const buffer = fs.readFileSync(filePath);
        const buffer2 = fs.readFileSync(filePath2);
        const buffer3 = fs.readFileSync(filePath3);

        const dataTransfer = await page.evaluateHandle((dataset) => {
            const dt = new DataTransfer();
            const file = new File([new Uint8Array(dataset.buffer)], 'large-image.png', {type: 'image/png'});
            const file2 = new File([new Uint8Array(dataset.buffer2)], 'audio-sample.mp3', {type: 'audio/mp3'});
            const file3 = new File([new Uint8Array(dataset.buffer3)], 'video.mp4', {type: 'video/mp4'});
            dt.items.add(file);
            dt.items.add(file2);
            dt.items.add(file3);
            return dt;
        }, {buffer: buffer.toJSON().data, buffer2: buffer2.toJSON().data, buffer3: buffer3.toJSON().data});

        await page.dispatchEvent(
            '.kg-prose',
            'dragenter',
            {dataTransfer}
        );
        await page.dispatchEvent(
            '.kg-prose',
            'drop',
            {dataTransfer}
        );

        // Wait for uploads to complete
        await page.waitForSelector('input[value="Audio sample"]');
        await page.waitForSelector('img[alt=""]');

        await assertHTML(page, html`
            <div data-lexical-decorator="true" contenteditable="false">
                <div data-kg-card-selected="false" data-kg-card-editing="false" data-kg-card="image">
                </div>
            </div>
            <div data-lexical-decorator="true" contenteditable="false">
                <div data-kg-card-selected="false" data-kg-card-editing="false" data-kg-card="audio">
                </div>
            </div>
            <div data-lexical-decorator="true" contenteditable="false">
                <div data-kg-card-selected="true" data-kg-card-editing="false" data-kg-card="video">
                </div>
            </div>
        `, {ignoreCardContents: true, ignoreInnerSVG: false});
    });
});
