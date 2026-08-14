import {assertPrettifiesTo, dom, createDocument, html} from '../test-utils/index.js';
import {$getRoot} from 'lexical';
import type {LexicalEditor} from 'lexical';
import {createHeadlessEditor} from '@lexical/headless';
import {$generateNodesFromDOM} from '@lexical/html';

import {AudioNode, $createAudioNode, $isAudioNode, type ExportDOMOptions} from '../../src/index.js';

const editorNodes = [AudioNode];

function getHTMLElement(element: HTMLElement | Text | null): HTMLElement {
    if (!element || !('outerHTML' in element)) {
        throw new Error('Expected exportDOM to return an HTMLElement');
    }

    return element as HTMLElement;
}

describe('AudioNode', function () {
    let editor: LexicalEditor;
    let dataset: {src: string; title: string; duration: number; mimeType: string; thumbnailSrc: string};
    let exportOptions: ExportDOMOptions;

    // NOTE: all tests should use this function, without it you need manual
    // try/catch and done handling to avoid assertion failures not triggering
    // failed tests
    const editorTest = (testFn: () => void) => () => new Promise<void>((resolve, reject) => {
        editor.update(() => {
            try {
                testFn();
                resolve();
            } catch (e) {
                reject(e);
            }
        });
    });

    beforeEach(function () {
        editor = createHeadlessEditor({nodes: editorNodes});

        dataset = {
            src: '/content/audio/2022/11/koenig-lexical.mp3',
            title: 'Test Audio',
            duration: 60,
            mimeType: 'audio/mp3',
            thumbnailSrc: '/content/images/2022/11/koenig-audio-lexical.jpg'
        };

        exportOptions = {
            dom
        };
    });

    it('matches node with $isAudioNode', editorTest(function () {
        const audioNode = $createAudioNode(dataset);
        expect($isAudioNode(audioNode)).toBe(true);
    }));

    describe('data access', function () {
        it('has getters for all properties', editorTest(function () {
            const audioNode = $createAudioNode(dataset);

            expect(audioNode.src).toBe(dataset.src);
            expect(audioNode.title).toBe(dataset.title);
            expect(audioNode.duration).toBe(dataset.duration);
            expect(audioNode.mimeType).toBe(dataset.mimeType);
            expect(audioNode.thumbnailSrc).toBe(dataset.thumbnailSrc);
        }));

        it('has setters for all properties', editorTest(function () {
            const audioNode = $createAudioNode({});

            expect(audioNode.src).toBe('');
            audioNode.src = '/content/audio/2022/12/koenig-lexical.mp3';
            expect(audioNode.src).toBe('/content/audio/2022/12/koenig-lexical.mp3');

            expect(audioNode.title).toBe('');
            audioNode.title = 'Test Audio';
            expect(audioNode.title).toBe('Test Audio');

            expect(audioNode.duration).toBe(0);
            audioNode.duration = 70;
            expect(audioNode.duration).toBe(70);

            expect(audioNode.mimeType).toBe('');
            audioNode.mimeType = 'audio/mp3';
            expect(audioNode.mimeType).toBe('audio/mp3');

            expect(audioNode.thumbnailSrc).toBe('');
            audioNode.thumbnailSrc = '/content/images/2022/12/koenig-lexical.png';
            expect(audioNode.thumbnailSrc).toBe('/content/images/2022/12/koenig-lexical.png');
        }));

        it('can be created without a dataset', editorTest(function () {
            const audioNode = $createAudioNode();

            expect(audioNode.getDataset()).toEqual({
                duration: 0,
                mimeType: '',
                src: '',
                title: '',
                thumbnailSrc: ''
            });
        }));

        it('has getDataset() convenience method', editorTest(function () {
            const audioNode = $createAudioNode(dataset);
            const audioNodeDataset = audioNode.getDataset();

            expect(audioNodeDataset).toEqual({
                ...dataset
            });
        }));
    });

    describe('getType', function () {
        it('returns the correct node type', editorTest(function () {
            expect(AudioNode.getType()).toBe('audio');
        }));
    });

    describe('clone', function () {
        it('returns a copy of the current node', editorTest(function () {
            const audioNode = $createAudioNode(dataset);
            const audioNodeDataset = audioNode.getDataset();
            const clone = AudioNode.clone(audioNode) as AudioNode;
            const cloneDataset = clone.getDataset();

            expect(cloneDataset).toEqual({...audioNodeDataset});
        }));
    });

    describe('urlTransformMap', function () {
        it('contains the expected URL mapping', editorTest(function () {
            expect(AudioNode.urlTransformMap).toEqual({
                src: 'url'
            });
        }));
    });

    describe('hasEditMode', function () {
        it('returns true', editorTest(function () {
            const audioNode = $createAudioNode(dataset);
            expect(audioNode.hasEditMode()).toBe(true);
        }));
    });

    describe('exportJSON', function () {
        it('contains all data', editorTest(function () {
            const audioNode = $createAudioNode(dataset);
            const json = audioNode.exportJSON();

            expect(json).toEqual({
                type: 'audio',
                version: 1,
                src: dataset.src,
                title: dataset.title,
                duration: dataset.duration,
                mimeType: dataset.mimeType,
                thumbnailSrc: dataset.thumbnailSrc
            });
        }));
    });

    describe('importJSON', function () {
        it('imports all data', function () {
            return new Promise<void>((resolve, reject) => {
                const serializedState = JSON.stringify({
                    root: {
                        children: [{
                            type: 'audio',
                            ...dataset
                        }],
                        direction: null,
                        format: '',
                        indent: 0,
                        type: 'root',
                        version: 1
                    }
                });

                const editorState = editor.parseEditorState(serializedState);
                editor.setEditorState(editorState);

                editor.getEditorState().read(() => {
                    try {
                        const [audioNode] = $getRoot().getChildren() as AudioNode[];

                        expect(audioNode.src).toBe(dataset.src);
                        expect(audioNode.title).toBe(dataset.title);
                        expect(audioNode.duration).toBe(dataset.duration);
                        expect(audioNode.mimeType).toBe(dataset.mimeType);
                        expect(audioNode.thumbnailSrc).toBe(dataset.thumbnailSrc);

                        resolve();
                    } catch (e) {
                        reject(e);
                    }
                });
            });
        });
    });

    describe('exportDOM', function () {
        it('creates an audio card', editorTest(function () {
            const audioNode = $createAudioNode(dataset);
            const {element} = audioNode.exportDOM(editor, exportOptions);

            assertPrettifiesTo(getHTMLElement(element).outerHTML, html`<div class="kg-card kg-audio-card"><img src="/content/images/2022/11/koenig-audio-lexical.jpg" alt="audio-thumbnail" class="kg-audio-thumbnail"><div class="kg-audio-thumbnail placeholder kg-audio-hide"><svg width="24" height="24" fill="none"><path fill-rule="evenodd" clip-rule="evenodd" d="M7.5 15.33a.75.75 0 1 0 0 1.5.75.75 0 0 0 0-1.5Zm-2.25.75a2.25 2.25 0 1 1 4.5 0 2.25 2.25 0 0 1-4.5 0ZM15 13.83a.75.75 0 1 0 0 1.5.75.75 0 0 0 0-1.5Zm-2.25.75a2.25 2.25 0 1 1 4.5 0 2.25 2.25 0 0 1-4.5 0Z"></path><path fill-rule="evenodd" clip-rule="evenodd" d="M14.486 6.81A2.25 2.25 0 0 1 17.25 9v5.579a.75.75 0 0 1-1.5 0v-5.58a.75.75 0 0 0-.932-.727.755.755 0 0 1-.059.013l-4.465.744a.75.75 0 0 0-.544.72v6.33a.75.75 0 0 1-1.5 0v-6.33a2.25 2.25 0 0 1 1.763-2.194l4.473-.746Z"></path><path fill-rule="evenodd" clip-rule="evenodd" d="M3 1.5a.75.75 0 0 0-.75.75v19.5a.75.75 0 0 0 .75.75h18a.75.75 0 0 0 .75-.75V5.133a.75.75 0 0 0-.225-.535l-.002-.002-3-2.883A.75.75 0 0 0 18 1.5H3ZM1.409.659A2.25 2.25 0 0 1 3 0h15a2.25 2.25 0 0 1 1.568.637l.003.002 3 2.883a2.25 2.25 0 0 1 .679 1.61V21.75A2.25 2.25 0 0 1 21 24H3a2.25 2.25 0 0 1-2.25-2.25V2.25c0-.597.237-1.169.659-1.591Z"></path></svg></div><div class="kg-audio-player-container"><audio src="/content/audio/2022/11/koenig-lexical.mp3" preload="metadata"></audio><div class="kg-audio-title">Test Audio</div><div class="kg-audio-player"><button class="kg-audio-play-icon" aria-label="Play audio"><svg viewBox="0 0 24 24"><path d="M23.14 10.608 2.253.164A1.559 1.559 0 0 0 0 1.557v20.887a1.558 1.558 0 0 0 2.253 1.392L23.14 13.393a1.557 1.557 0 0 0 0-2.785Z"></path></svg></button><button class="kg-audio-pause-icon kg-audio-hide" aria-label="Pause audio"><svg viewBox="0 0 24 24"><rect x="3" y="1" width="7" height="22" rx="1.5" ry="1.5"></rect><rect x="14" y="1" width="7" height="22" rx="1.5" ry="1.5"></rect></svg></button><span class="kg-audio-current-time">0:00</span><div class="kg-audio-time">/<span class="kg-audio-duration">60</span></div><input type="range" class="kg-audio-seek-slider" max="100" value="0"><button class="kg-audio-playback-rate" aria-label="Adjust playback speed">1×</button><button class="kg-audio-unmute-icon" aria-label="Unmute"><svg viewBox="0 0 24 24"><path d="M15.189 2.021a9.728 9.728 0 0 0-7.924 4.85.249.249 0 0 1-.221.133H5.25a3 3 0 0 0-3 3v2a3 3 0 0 0 3 3h1.794a.249.249 0 0 1 .221.133 9.73 9.73 0 0 0 7.924 4.85h.06a1 1 0 0 0 1-1V3.02a1 1 0 0 0-1.06-.998Z"></path></svg></button><button class="kg-audio-mute-icon kg-audio-hide" aria-label="Mute"><svg viewBox="0 0 24 24"><path d="M16.177 4.3a.248.248 0 0 0 .073-.176v-1.1a1 1 0 0 0-1.061-1 9.728 9.728 0 0 0-7.924 4.85.249.249 0 0 1-.221.133H5.25a3 3 0 0 0-3 3v2a3 3 0 0 0 3 3h.114a.251.251 0 0 0 .177-.073ZM23.707 1.706A1 1 0 0 0 22.293.292l-22 22a1 1 0 0 0 0 1.414l.009.009a1 1 0 0 0 1.405-.009l6.63-6.631A.251.251 0 0 1 8.515 17a.245.245 0 0 1 .177.075 10.081 10.081 0 0 0 6.5 2.92 1 1 0 0 0 1.061-1V9.266a.247.247 0 0 1 .073-.176Z"></path></svg></button><input type="range" class="kg-audio-volume-slider" max="100" value="100"></div></div></div>`);
        }));

        it('renders email links with postUrl', editorTest(function () {
            const audioNode = $createAudioNode(dataset);
            const {element} = audioNode.exportDOM(editor, {...exportOptions, target: 'email', postUrl: 'https://example.com/posts/test-audio'});

            const output = getHTMLElement(element).outerHTML;
            expect(output).toContain('href="https://example.com/posts/test-audio"');
            expect(output).toContain('Click to play audio');
        }));
    });

    describe('importDOM', function () {
        it('parses audio card', editorTest(function () {
            const document = createDocument(html`
                <div class="kg-card kg-audio-card"><img src="/content/images/2022/11/koenig-audio-lexical.jpg" alt="audio-thumbnail" class="kg-audio-thumbnail"><div class="kg-audio-thumbnail placeholder kg-audio-hide"><svg width="24" height="24" fill="none"><path fill-rule="evenodd" clip-rule="evenodd" d="M7.5 15.33a.75.75 0 1 0 0 1.5.75.75 0 0 0 0-1.5Zm-2.25.75a2.25 2.25 0 1 1 4.5 0 2.25 2.25 0 0 1-4.5 0ZM15 13.83a.75.75 0 1 0 0 1.5.75.75 0 0 0 0-1.5Zm-2.25.75a2.25 2.25 0 1 1 4.5 0 2.25 2.25 0 0 1-4.5 0Z"></path><path fill-rule="evenodd" clip-rule="evenodd" d="M14.486 6.81A2.25 2.25 0 0 1 17.25 9v5.579a.75.75 0 0 1-1.5 0v-5.58a.75.75 0 0 0-.932-.727.755.755 0 0 1-.059.013l-4.465.744a.75.75 0 0 0-.544.72v6.33a.75.75 0 0 1-1.5 0v-6.33a2.25 2.25 0 0 1 1.763-2.194l4.473-.746Z"></path><path fill-rule="evenodd" clip-rule="evenodd" d="M3 1.5a.75.75 0 0 0-.75.75v19.5a.75.75 0 0 0 .75.75h18a.75.75 0 0 0 .75-.75V5.133a.75.75 0 0 0-.225-.535l-.002-.002-3-2.883A.75.75 0 0 0 18 1.5H3ZM1.409.659A2.25 2.25 0 0 1 3 0h15a2.25 2.25 0 0 1 1.568.637l.003.002 3 2.883a2.25 2.25 0 0 1 .679 1.61V21.75A2.25 2.25 0 0 1 21 24H3a2.25 2.25 0 0 1-2.25-2.25V2.25c0-.597.237-1.169.659-1.591Z"></path></svg></div><div class="kg-audio-player-container"><audio src="/content/audio/2022/11/koenig-lexical.mp3" preload="metadata"></audio><div class="kg-audio-title">Test Audio</div><div class="kg-audio-player"><button class="kg-audio-play-icon" aria-label="Play audio"><svg viewBox="0 0 24 24"><path d="M23.14 10.608 2.253.164A1.559 1.559 0 0 0 0 1.557v20.887a1.558 1.558 0 0 0 2.253 1.392L23.14 13.393a1.557 1.557 0 0 0 0-2.785Z"></path></svg></button><button class="kg-audio-pause-icon kg-audio-hide" aria-label="Pause audio"><svg viewBox="0 0 24 24"><rect x="3" y="1" width="7" height="22" rx="1.5" ry="1.5"></rect><rect x="14" y="1" width="7" height="22" rx="1.5" ry="1.5"></rect></svg></button><span class="kg-audio-current-time">0:00</span><div class="kg-audio-time">/<span class="kg-audio-duration">60</span></div><input type="range" class="kg-audio-seek-slider" max="100" value="0"><button class="kg-audio-playback-rate" aria-label="Adjust playback speed">1&amp;#215;</button><button class="kg-audio-unmute-icon" aria-label="Unmute"><svg viewBox="0 0 24 24"><path d="M15.189 2.021a9.728 9.728 0 0 0-7.924 4.85.249.249 0 0 1-.221.133H5.25a3 3 0 0 0-3 3v2a3 3 0 0 0 3 3h1.794a.249.249 0 0 1 .221.133 9.73 9.73 0 0 0 7.924 4.85h.06a1 1 0 0 0 1-1V3.02a1 1 0 0 0-1.06-.998Z"></path></svg></button><button class="kg-audio-mute-icon kg-audio-hide" aria-label="Mute"><svg viewBox="0 0 24 24"><path d="M16.177 4.3a.248.248 0 0 0 .073-.176v-1.1a1 1 0 0 0-1.061-1 9.728 9.728 0 0 0-7.924 4.85.249.249 0 0 1-.221.133H5.25a3 3 0 0 0-3 3v2a3 3 0 0 0 3 3h.114a.251.251 0 0 0 .177-.073ZM23.707 1.706A1 1 0 0 0 22.293.292l-22 22a1 1 0 0 0 0 1.414l.009.009a1 1 0 0 0 1.405-.009l6.63-6.631A.251.251 0 0 1 8.515 17a.245.245 0 0 1 .177.075 10.081 10.081 0 0 0 6.5 2.92 1 1 0 0 0 1.061-1V9.266a.247.247 0 0 1 .073-.176Z"></path></svg></button><input type="range" class="kg-audio-volume-slider" max="100" value="100"></div></div></div>
            `);
            const nodes = $generateNodesFromDOM(editor, document) as AudioNode[];
            expect(nodes.length).toBe(1);
            expect(nodes[0].src).toBe('/content/audio/2022/11/koenig-lexical.mp3');
            expect(nodes[0].thumbnailSrc).toBe('/content/images/2022/11/koenig-audio-lexical.jpg');
            expect(nodes[0].duration).toBe(3600);
            expect(nodes[0].title).toBe('Test Audio');
            expect(nodes[0].mimeType).toBe('');
        }));

        it('ignores malformed duration strings', editorTest(function () {
            const document = createDocument(html`
                <div class="kg-card kg-audio-card">
                    <div class="kg-audio-player-container">
                        <audio src="/content/audio/2022/11/koenig-lexical.mp3" preload="metadata"></audio>
                        <div class="kg-audio-title">Test Audio</div>
                        <div class="kg-audio-player">
                            <div class="kg-audio-time">/<span class="kg-audio-duration">abc:12</span></div>
                        </div>
                    </div>
                </div>
            `);
            const nodes = $generateNodesFromDOM(editor, document) as AudioNode[];

            expect(nodes.length).toBe(1);
            expect(nodes[0].duration).toBe(0);
        }));

        it('trims duration parts before parsing', editorTest(function () {
            const document = createDocument(html`
                <div class="kg-card kg-audio-card">
                    <div class="kg-audio-player-container">
                        <audio src="/content/audio/2022/11/koenig-lexical.mp3" preload="metadata"></audio>
                        <div class="kg-audio-title">Test Audio</div>
                        <div class="kg-audio-player">
                            <div class="kg-audio-time">/<span class="kg-audio-duration"> 1 : 02 </span></div>
                        </div>
                    </div>
                </div>
            `);
            const nodes = $generateNodesFromDOM(editor, document) as AudioNode[];

            expect(nodes.length).toBe(1);
            expect(nodes[0].duration).toBe(62);
        }));
    });

    describe('getTextContent', function () {
        it('returns contents', editorTest(function () {
            const node = $createAudioNode({});
            node.title = 'Testing';

            // audio nodes don't have text content
            expect(node.getTextContent()).toBe('');
        }));
    });
});
