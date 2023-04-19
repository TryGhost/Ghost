import {afterAll, beforeAll, beforeEach, describe, it} from 'vitest';
import {assertHTML, html, initialize, startApp} from '../../utils/e2e';

describe('Gallery card', async () => {
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

    it('can import serialized gallery card nodes', async function () {
        await page.evaluate(() => {
            const serializedState = JSON.stringify({
                root: {
                    children: [{
                        type: 'gallery',
                        version: 1,
                        images: [{
                            row: 0,
                            fileName: 'retreat-1.jpg',
                            src: '/content/images/2023/04/retreat-1.jpg',
                            width: 3840,
                            height: 2160,
                            title: 'Title 1',
                            alt: 'Alt 1',
                            caption: 'This is the <b>first caption</b>'
                        }, {
                            row: 0,
                            fileName: 'retreat-2.jpg',
                            src: '/content/images/2023/04/retreat-2.jpg',
                            width: 3840,
                            height: 2160,
                            title: 'Title 2',
                            alt: 'Alt 2',
                            caption: 'This is another caption'
                        }]
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
                <div data-kg-card-editing="false" data-kg-card-selected="false" data-kg-card="gallery">
                    <figure>
                        <div data-gallery="true">
                            <div data-row="0">
                                <div data-image="true">
                                    <img
                                        alt="Alt 1"
                                        height="2160"
                                        src="/content/images/2023/04/retreat-1.jpg"
                                        width="3840" />
                                    <div>
                                        <div>
                                            <button type="button"><svg></svg></button>
                                        </div>
                                    </div>
                                </div>
                                <div data-image="true">
                                    <img
                                        alt="Alt 2"
                                        height="2160"
                                        src="/content/images/2023/04/retreat-2.jpg"
                                        width="3840" />
                                    <div>
                                        <div>
                                            <button type="button"><svg></svg></button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <form>
                            <input
                                accept="image/gif,image/jpg,image/jpeg,image/png,image/svg+xml,image/webp"
                                hidden=""
                                multiple=""
                                name="image-input"
                                type="file" />
                        </form>
                    </figure>
                </div>
            </div>
        `, {ignoreCardContents: false});
    });
});
