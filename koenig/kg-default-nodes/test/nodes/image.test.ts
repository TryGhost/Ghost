import {assertPrettifiesTo, createDocument, dom, html} from '../test-utils/index.js';
import {$getRoot, LexicalEditor} from 'lexical';
import {createHeadlessEditor} from '@lexical/headless';
import {$generateNodesFromDOM} from '@lexical/html';
import {ImageNode, $createImageNode, $isImageNode} from '../../src/index.js';

const editorNodes = [ImageNode];

describe('ImageNode', function () {
    let editor: LexicalEditor;
    let dataset: Record<string, unknown>;
    let exportOptions: Record<string, unknown>;

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
            src: '/content/images/2022/11/koenig-lexical.jpg',
            width: 3840,
            height: 2160,
            href: '',
            title: 'This is a title',
            alt: 'This is some alt text',
            caption: 'This is a <b>caption</b>'
        };

        exportOptions = {
            imageOptimization: {
                contentImageSizes: {
                    w600: {width: 600},
                    w1000: {width: 1000},
                    w1600: {width: 1600},
                    w2400: {width: 2400}
                }
            },
            canTransformImage: () => true,
            dom
        };
    });

    it('matches node with $isImageNode', editorTest(function () {
        const imageNode = $createImageNode(dataset);
        expect($isImageNode(imageNode)).toBe(true);
    }));

    describe('data access', function () {
        it('has getters for all properties', editorTest(function () {
            const imageNode = $createImageNode(dataset);

            expect(imageNode.src).toBe('/content/images/2022/11/koenig-lexical.jpg');
            expect(imageNode.width!).toBe(3840);
            expect(imageNode.height!).toBe(2160);
            expect(imageNode.title).toBe('This is a title');
            expect(imageNode.alt).toBe('This is some alt text');
            expect(imageNode.caption).toBe('This is a <b>caption</b>');
            expect(imageNode.cardWidth).toBe('regular');
            expect(imageNode.href).toBe('');
        }));

        it('can be created without a dataset', editorTest(function () {
            const imageNode = $createImageNode();

            expect(imageNode.getDataset()).toEqual({
                src: '',
                caption: '',
                title: '',
                alt: '',
                cardWidth: 'regular',
                width: null,
                height: null,
                href: ''
            });
        }));

        it('has setters for all properties', editorTest(function () {
            const imageNode = $createImageNode({} as Record<string, unknown>);

            expect(imageNode.src).toBe('');
            imageNode.src = '/content/images/2022/11/koenig-lexical.jpg';
            expect(imageNode.src).toBe('/content/images/2022/11/koenig-lexical.jpg');

            expect(imageNode.width).toBe(null);
            imageNode.width = 3840;
            expect(imageNode.width).toBe(3840);

            expect(imageNode.height).toBe(null);
            imageNode.height = 2160;
            expect(imageNode.height).toBe(2160);

            expect(imageNode.title).toBe('');
            imageNode.title = 'I am a title';
            expect(imageNode.title).toBe('I am a title');

            expect(imageNode.alt).toBe('');
            imageNode.alt = 'I am alt text';
            expect(imageNode.alt).toBe('I am alt text');

            expect(imageNode.caption).toBe('');
            imageNode.caption = 'I am a <b>Caption</b>';
            expect(imageNode.caption).toBe('I am a <b>Caption</b>');

            expect(imageNode.cardWidth).toBe('regular');
            imageNode.cardWidth = 'wide';
            expect(imageNode.cardWidth).toBe('wide');

            expect(imageNode.href).toBe('');
            imageNode.href = 'https://example.com';
            expect(imageNode.href).toBe('https://example.com');
        }));

        it('has getDataset() convenience method', editorTest(function () {
            const imageNode = $createImageNode(dataset);
            const imageNodeDataset = imageNode.getDataset();

            expect(imageNodeDataset).toEqual({
                ...dataset,
                cardWidth: 'regular'
            });
        }));
    });

    describe('exportDOM', function () {
        it('creates a full-featured image card', editorTest(function () {
            const imageNode = $createImageNode(dataset);
            const {element} = imageNode.exportDOM(editor, exportOptions);

            assertPrettifiesTo((element as HTMLElement).outerHTML, html`
                <figure class="kg-card kg-image-card kg-card-hascaption">
                    <img
                        src="/content/images/2022/11/koenig-lexical.jpg"
                        class="kg-image"
                        alt="This is some alt text"
                        loading="lazy"
                        title="This is a title"
                        width="3840"
                        height="2160"
                        srcset="/content/images/size/w600/2022/11/koenig-lexical.jpg 600w, /content/images/size/w1000/2022/11/koenig-lexical.jpg 1000w, /content/images/size/w1600/2022/11/koenig-lexical.jpg 1600w, /content/images/size/w2400/2022/11/koenig-lexical.jpg 2400w" sizes="(min-width: 720px) 720px"
                    >
                    <figcaption>This is a <b>caption</b></figcaption>
                </figure>
            `);
        }));

        it('omits srcset attribute when target is email', editorTest(function () {
            exportOptions.target = 'email';

            const imageNode = $createImageNode(dataset);
            const {element} = imageNode.exportDOM(editor, exportOptions);
            const output = (element as HTMLElement).outerHTML;

            expect(output).not.toContain('srcset');
        }));
    });

    describe('importDOM', function () {
        it('parses an img element', editorTest(function () {
            const document = createDocument(html`
                <img
                    src="/image.png"
                    alt="Alt text"
                    title="Title text"
                    width="3000"
                    height="2000"
                />
            `);
            const nodes = $generateNodesFromDOM(editor, document) as ImageNode[];

            expect(nodes.length).toBe(1);
            expect(nodes[0].src).toBe('/image.png');
            expect(nodes[0].alt).toBe('Alt text');
            expect(nodes[0].title).toBe('Title text');
            expect(nodes[0].width!).toBe(3000);
            expect(nodes[0].height!).toBe(2000);
        }));

        it('parses IMG inside FIGURE to image card without caption', editorTest(function () {
            const document = createDocument(html`
                <figure>
                    <img src="http://example.com/test.png" alt="Alt test" title="Title test" />
                </figure>
            `);
            const nodes = $generateNodesFromDOM(editor, document) as ImageNode[];

            expect(nodes.length).toBe(1);
            expect(nodes[0].src).toBe('http://example.com/test.png');
            expect(nodes[0].alt).toBe('Alt test');
            expect(nodes[0].title).toBe('Title test');
        }));

        it('parses IMG inside FIGURE to image card with caption', editorTest(function () {
            const document = createDocument(html`
                <figure>
                    <img src="http://example.com/test.png">
                    <figcaption>&nbsp; <strong>Caption test</strong></figcaption>
                </figure>
            `);
            const nodes = $generateNodesFromDOM(editor, document) as ImageNode[];

            expect(nodes.length).toBe(1);
            expect(nodes[0].src).toBe('http://example.com/test.png');
            expect(nodes[0].caption).toBe('<strong>Caption test</strong>');
        }));

        it('extracts Koenig card widths', editorTest(function () {
            const document = createDocument(html`
                <figure class="kg-card kg-width-wide">
                    <img src="http://example.com/test.png">
                </figure>
            `);
            const nodes = $generateNodesFromDOM(editor, document) as ImageNode[];
            expect(nodes.length).toBe(1);
            expect(nodes[0].cardWidth).toBe('wide');
        }));

        it('extracts Medium card widths', editorTest(function () {
            const document = createDocument(html`
                <figure class="graf--layoutFillWidth">
                    <img src="http://example.com/test.png">
                </figure>
            `);
            const nodes = $generateNodesFromDOM(editor, document) as ImageNode[];

            expect(nodes.length).toBe(1);
            expect(nodes[0].cardWidth).toBe('full');
        }));

        it('extracts IMG dimensions from width/height attrs', editorTest(function () {
            const document = createDocument(html`
                <figure>
                    <img src="http://example.com/test.png" width="640" height="480">
                </figure>
            `);
            const nodes = $generateNodesFromDOM(editor, document) as ImageNode[];

            expect(nodes.length).toBe(1);
            expect(nodes[0].src).toBe('http://example.com/test.png');
            expect(nodes[0].width!).toBe(640);
            expect(nodes[0].height!).toBe(480);
        }));

        it('extracts IMG dimensions from dataset', editorTest(function () {
            const document = createDocument(html`
                <figure>
                    <img src="http://example.com/test.png" width="640" height="480">
                </figure>
            `);
            const nodes = $generateNodesFromDOM(editor, document) as ImageNode[];

            expect(nodes.length).toBe(1);
            expect(nodes[0].src).toBe('http://example.com/test.png');
            expect(nodes[0].width!).toBe(640);
            expect(nodes[0].height!).toBe(480);
        }));

        it('extracts IMG dimensions from data-image-dimensions', editorTest(function () {
            const document = createDocument(html`
                <figure>
                    <img src="http://example.com/test.png" data-image-dimensions="640x480">
                </figure>
            `);
            const nodes = $generateNodesFromDOM(editor, document) as ImageNode[];

            expect(nodes.length).toBe(1);
            expect(nodes[0].src).toBe('http://example.com/test.png');
            expect(nodes[0].width!).toBe(640);
            expect(nodes[0].height!).toBe(480);
        }));

        it('extracts href when img wrapped in anchor tag', editorTest(function () {
            const document = createDocument(html`
                <figure>
                    <a href="https://example.com/link">
                        <img src="http://example.com/test.png">
                    </a>
                </figure>
            `);
            const nodes = $generateNodesFromDOM(editor, document) as ImageNode[];

            expect(nodes.length).toBe(1);
            expect(nodes[0].src).toBe('http://example.com/test.png');
            expect(nodes[0].href).toBe('https://example.com/link');
        }));

        it('extracts href when img wrapped in anchor tag not within figure', editorTest(function () {
            const document = createDocument(html`
                <a href="https://example.com/link">
                    <img src="http://example.com/test.png">
                </a>
            `);
            const nodes = $generateNodesFromDOM(editor, document) as ImageNode[];

            expect(nodes.length).toBe(1);
            expect(nodes[0].src).toBe('http://example.com/test.png');
            expect(nodes[0].href).toBe('https://example.com/link');
        }));
    });

    describe('exportJSON', function () {
        it('contains all data', editorTest(function () {
            dataset.cardWidth = 'wide';

            const imageNode = $createImageNode(dataset);
            const json = imageNode.exportJSON();

            expect(json).toEqual({
                type: 'image',
                version: 1,
                src: '/content/images/2022/11/koenig-lexical.jpg',
                width: 3840,
                height: 2160,
                title: 'This is a title',
                alt: 'This is some alt text',
                caption: 'This is a <b>caption</b>',
                cardWidth: 'wide',
                href: ''
            });
        }));
    });

    describe('importJSON', function () {
        it('imports all data', function () {
            return new Promise<void>((resolve, reject) => {
                const serializedState = JSON.stringify({
                    root: {
                        children: [{
                            type: 'image',
                            ...dataset,
                            cardWidth: 'wide'
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
                        const [imageNode] = $getRoot().getChildren() as ImageNode[];

                        expect(imageNode.src).toBe('/content/images/2022/11/koenig-lexical.jpg');
                        expect(imageNode.width!).toBe(3840);
                        expect(imageNode.height!).toBe(2160);
                        expect(imageNode.title).toBe('This is a title');
                        expect(imageNode.alt).toBe('This is some alt text');
                        expect(imageNode.caption).toBe('This is a <b>caption</b>');
                        expect(imageNode.cardWidth).toBe('wide');

                        resolve();
                    } catch (e) {
                        reject(e);
                    }
                });
            });
        });
    });

    describe('getTextContent', function () {
        it('returns contents', editorTest(function () {
            const node = $createImageNode({} as Record<string, unknown>);
            expect(node.getTextContent()).toBe('');

            node.caption = 'Test caption';
            expect(node.getTextContent()).toBe('Test caption\n\n');
        }));
    });
});
