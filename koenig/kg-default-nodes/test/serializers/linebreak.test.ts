import {createDocument} from '../test-utils/index.js';
import {createHeadlessEditor} from '@lexical/headless';
import {$generateNodesFromDOM} from '@lexical/html';
import {DEFAULT_CONFIG, DEFAULT_NODES} from '../../src/index.js';
import type {HTMLConfig, LexicalEditor} from 'lexical';
import type {ElementNode} from 'lexical';

describe('Serializers: linebreak', function () {
    let editor: LexicalEditor;

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
        editor = createHeadlessEditor({nodes: DEFAULT_NODES, html: DEFAULT_CONFIG.html as HTMLConfig});
    });

    describe('import', function () {
        describe('Inside a paragraph', function () {
            it('(non GDoc) default conversion between text', editorTest(function () {
                const htmlString = 'Before<br>After';
                const document = createDocument(htmlString);
                const nodes = $generateNodesFromDOM(editor, document);

                expect(nodes.length).toBe(3);
                expect(nodes[0].getType()).toBe('extended-text');
                expect(nodes[1].getType()).toBe('linebreak');
                expect(nodes[2].getType()).toBe('extended-text');
            }));

            it('(GDoc) default conversion for breaks inside paragraphs', editorTest(function () {
                const htmlString = '<div id="docs-internal-guid-1234"><p>Before<br>After</p></div>';
                const document = createDocument(htmlString);
                const nodes = $generateNodesFromDOM(editor, document);

                expect(nodes.length).toBe(1);
                expect(nodes[0].getType()).toBe('paragraph');
                expect((nodes[0] as ElementNode).getChildren().length).toBe(3);
                expect((nodes[0] as ElementNode).getChildren()[0].getType()).toBe('extended-text');
                expect((nodes[0] as ElementNode).getChildren()[1].getType()).toBe('linebreak');
                expect((nodes[0] as ElementNode).getChildren()[2].getType()).toBe('extended-text');
            }));
        });

        describe('Between paragraphs', function () {
            it('(non GDoc) default conversion between paragraphs', editorTest(function () {
                const htmlString = '<p>Before</p><br><p>After</p>';
                const document = createDocument(htmlString);
                const nodes = $generateNodesFromDOM(editor, document);

                expect(nodes.length).toBe(3);

                expect(nodes[0].getType()).toBe('paragraph');
                expect((nodes[0] as ElementNode).getChildren().length).toBe(1);
                expect((nodes[0] as ElementNode).getChildren()[0].getType()).toBe('extended-text');
                expect((nodes[0] as ElementNode).getChildren()[0].getTextContent()).toBe('Before');

                expect(nodes[1].getType()).toBe('linebreak');

                expect(nodes[2].getType()).toBe('paragraph');
                expect((nodes[2] as ElementNode).getChildren().length).toBe(1);
                expect((nodes[2] as ElementNode).getChildren()[0].getType()).toBe('extended-text');
                expect((nodes[2] as ElementNode).getChildren()[0].getTextContent()).toBe('After');
            }));

            it('(GDoc) no conversion for breaks between paragraphs', editorTest(function () {
                const htmlString = '<div id="docs-internal-guid-1234"><p>Before</p><br><p>After</p></div>';
                const document = createDocument(htmlString);
                const nodes = $generateNodesFromDOM(editor, document);

                expect(nodes.length).toBe(2);
                expect(nodes[0].getType()).toBe('paragraph');
                expect((nodes[0] as ElementNode).getChildren().length).toBe(1);
                expect((nodes[0] as ElementNode).getChildren()[0].getType()).toBe('extended-text');
                expect((nodes[0] as ElementNode).getChildren()[0].getTextContent()).toBe('Before');

                expect(nodes[1].getType()).toBe('paragraph');
                expect((nodes[1] as ElementNode).getChildren().length).toBe(1);
                expect((nodes[1] as ElementNode).getChildren()[0].getType()).toBe('extended-text');
                expect((nodes[1] as ElementNode).getChildren()[0].getTextContent()).toBe('After');
            }));
        });

        describe('Between lists and paragraphs', function () {
            it('(non GDoc) default conversion for linebreaks between unordered list and paragraph', editorTest(function () {
                const htmlString = '<p>Paragraph></p><br><ul><li>Item</li></ul><br><p>Paragraph></p>';
                const document = createDocument(htmlString);
                const nodes = $generateNodesFromDOM(editor, document);

                expect(nodes.length).toBe(5);
                expect(nodes[0].getType()).toBe('paragraph');
                expect(nodes[1].getType()).toBe('linebreak');
                expect(nodes[2].getType()).toBe('extended-text');
                expect(nodes[3].getType()).toBe('linebreak');
                expect(nodes[4].getType()).toBe('paragraph');
            }));

            it('(GDoc) skips linebreaks between unordered list and paragraph', editorTest(function () {
                const htmlString = '<div id="docs-internal-guid-1234"><p>Paragraph></p><br><ul><li>Item</li></ul><br><p>Paragraph></p>';
                const document = createDocument(htmlString);
                const nodes = $generateNodesFromDOM(editor, document);

                expect(nodes.length).toBe(3);
                expect(nodes[0].getType()).toBe('paragraph');
                expect(nodes[1].getType()).toBe('extended-text');
                expect(nodes[2].getType()).toBe('paragraph');
            }));

            it('(non GDoc) default conversion for linebreaks between ordered list and paragraph', editorTest(function () {
                const htmlString = '<p>Paragraph></p><br><ol><li>Item</li></ol><br><p>Paragraph></p>';
                const document = createDocument(htmlString);
                const nodes = $generateNodesFromDOM(editor, document);

                expect(nodes.length).toBe(5);
                expect(nodes[0].getType()).toBe('paragraph');
                expect(nodes[1].getType()).toBe('linebreak');
                expect(nodes[2].getType()).toBe('extended-text');
                expect(nodes[3].getType()).toBe('linebreak');
                expect(nodes[4].getType()).toBe('paragraph');
            }));

            it('(GDoc) skips linebreaks between ordered list and paragraph', editorTest(function () {
                const htmlString = '<div id="docs-internal-guid-1234"><p>Paragraph></p><br><ol><li>Item</li></ol><br><p>Paragraph></p>';
                const document = createDocument(htmlString);
                const nodes = $generateNodesFromDOM(editor, document);

                expect(nodes.length).toBe(3);
                expect(nodes[0].getType()).toBe('paragraph');
                expect(nodes[1].getType()).toBe('extended-text');
                expect(nodes[2].getType()).toBe('paragraph');
            }));

            it('(non GDoc) default conversion for linebreaks between description list and paragraph', editorTest(function () {
                const htmlString = '<p>Paragraph></p><br><dl><li>Item</li></dl><br><p>Paragraph></p>';
                const document = createDocument(htmlString);
                const nodes = $generateNodesFromDOM(editor, document);

                expect(nodes.length).toBe(5);
                expect(nodes[0].getType()).toBe('paragraph');
                expect(nodes[1].getType()).toBe('linebreak');
                expect(nodes[2].getType()).toBe('extended-text');
                expect(nodes[3].getType()).toBe('linebreak');
                expect(nodes[4].getType()).toBe('paragraph');
            }));

            it('(GDoc) skips linebreaks between description list and paragraph', editorTest(function () {
                const htmlString = '<div id="docs-internal-guid-1234"><p>Paragraph></p><br><dl><li>Item</li></dl><br><p>Paragraph></p>';
                const document = createDocument(htmlString);
                const nodes = $generateNodesFromDOM(editor, document);

                expect(nodes.length).toBe(3);
                expect(nodes[0].getType()).toBe('paragraph');
                expect(nodes[1].getType()).toBe('extended-text');
                expect(nodes[2].getType()).toBe('paragraph');
            }));
        });

        describe('Between headings and paragraphs', function () {
            it('(non GDoc) default conversion for a linebreak between a H1 and paragraph', editorTest(function () {
                const htmlString = '<p>Paragraph></p><br><h1>Heading</h1><br><p>Paragraph></p>';
                const document = createDocument(htmlString);
                const nodes = $generateNodesFromDOM(editor, document);

                expect(nodes.length).toBe(5);
                expect(nodes[0].getType()).toBe('paragraph');
                expect(nodes[1].getType()).toBe('linebreak');
                expect(nodes[2].getType()).toBe('extended-heading');
                expect(nodes[3].getType()).toBe('linebreak');
                expect(nodes[4].getType()).toBe('paragraph');
            }));

            it('(GDoc) skips linebreaks between H1 and paragraph', editorTest(function () {
                const htmlString = '<div id="docs-internal-guid-1234"><p>Paragraph></p><br><h1>Heading</h1><br><p>Paragraph></p>';
                const document = createDocument(htmlString);
                const nodes = $generateNodesFromDOM(editor, document);

                expect(nodes.length).toBe(3);
                expect(nodes[0].getType()).toBe('paragraph');
                expect(nodes[1].getType()).toBe('extended-heading');
                expect(nodes[2].getType()).toBe('paragraph');
            }));

            it('(non GDoc) default conversion for a linebreak between a H2 and paragraph', editorTest(function () {
                const htmlString = '<p>Paragraph></p><br><h2>Heading</h2><br><p>Paragraph></p>';
                const document = createDocument(htmlString);
                const nodes = $generateNodesFromDOM(editor, document);

                expect(nodes.length).toBe(5);
                expect(nodes[0].getType()).toBe('paragraph');
                expect(nodes[1].getType()).toBe('linebreak');
                expect(nodes[2].getType()).toBe('extended-heading');
                expect(nodes[3].getType()).toBe('linebreak');
                expect(nodes[4].getType()).toBe('paragraph');
            }));

            it('(GDoc) skips linebreaks between H2 and paragraph', editorTest(function () {
                const htmlString = '<div id="docs-internal-guid-1234"><p>Paragraph></p><br><h2>Heading</h2><br><p>Paragraph></p>';
                const document = createDocument(htmlString);
                const nodes = $generateNodesFromDOM(editor, document);

                expect(nodes.length).toBe(3);
                expect(nodes[0].getType()).toBe('paragraph');
                expect(nodes[1].getType()).toBe('extended-heading');
                expect(nodes[2].getType()).toBe('paragraph');
            }));

            it('(non GDoc) default conversion for a linebreak between a H3 and paragraph', editorTest(function () {
                const htmlString = '<p>Paragraph></p><br><h3>Heading</h3><br><p>Paragraph></p>';
                const document = createDocument(htmlString);
                const nodes = $generateNodesFromDOM(editor, document);

                expect(nodes.length).toBe(5);
                expect(nodes[0].getType()).toBe('paragraph');
                expect(nodes[1].getType()).toBe('linebreak');
                expect(nodes[2].getType()).toBe('extended-heading');
                expect(nodes[3].getType()).toBe('linebreak');
                expect(nodes[4].getType()).toBe('paragraph');
            }));

            it('(GDoc) skips linebreaks between H3 and paragraph', editorTest(function () {
                const htmlString = '<div id="docs-internal-guid-1234"><p>Paragraph></p><br><h3>Heading</h3><br><p>Paragraph></p>';
                const document = createDocument(htmlString);
                const nodes = $generateNodesFromDOM(editor, document);

                expect(nodes.length).toBe(3);
                expect(nodes[0].getType()).toBe('paragraph');
                expect(nodes[1].getType()).toBe('extended-heading');
                expect(nodes[2].getType()).toBe('paragraph');
            }));

            it('(non GDoc) default conversion for a linebreak between a H4 and paragraph', editorTest(function () {
                const htmlString = '<p>Paragraph></p><br><h4>Heading</h4><br><p>Paragraph></p>';
                const document = createDocument(htmlString);
                const nodes = $generateNodesFromDOM(editor, document);

                expect(nodes.length).toBe(5);
                expect(nodes[0].getType()).toBe('paragraph');
                expect(nodes[1].getType()).toBe('linebreak');
                expect(nodes[2].getType()).toBe('extended-heading');
                expect(nodes[3].getType()).toBe('linebreak');
                expect(nodes[4].getType()).toBe('paragraph');
            }));

            it('(GDoc) skips linebreaks between H4 and paragraph', editorTest(function () {
                const htmlString = '<div id="docs-internal-guid-1234"><p>Paragraph></p><br><h4>Heading</h4><br><p>Paragraph></p>';
                const document = createDocument(htmlString);
                const nodes = $generateNodesFromDOM(editor, document);

                expect(nodes.length).toBe(3);
                expect(nodes[0].getType()).toBe('paragraph');
                expect(nodes[1].getType()).toBe('extended-heading');
                expect(nodes[2].getType()).toBe('paragraph');
            }));

            it('(non GDoc) default conversion for a linebreak between a H5 and paragraph', editorTest(function () {
                const htmlString = '<p>Paragraph></p><br><h5>Heading</h5><br><p>Paragraph></p>';
                const document = createDocument(htmlString);
                const nodes = $generateNodesFromDOM(editor, document);

                expect(nodes.length).toBe(5);
                expect(nodes[0].getType()).toBe('paragraph');
                expect(nodes[1].getType()).toBe('linebreak');
                expect(nodes[2].getType()).toBe('extended-heading');
                expect(nodes[3].getType()).toBe('linebreak');
                expect(nodes[4].getType()).toBe('paragraph');
            }));

            it('(GDoc) skips linebreaks between H5 and paragraph', editorTest(function () {
                const htmlString = '<div id="docs-internal-guid-1234"><p>Paragraph></p><br><h5>Heading</h5><br><p>Paragraph></p>';
                const document = createDocument(htmlString);
                const nodes = $generateNodesFromDOM(editor, document);

                expect(nodes.length).toBe(3);
                expect(nodes[0].getType()).toBe('paragraph');
                expect(nodes[1].getType()).toBe('extended-heading');
                expect(nodes[2].getType()).toBe('paragraph');
            }));

            it('(non GDoc) default conversion for a linebreak between a H6 and paragraph', editorTest(function () {
                const htmlString = '<p>Paragraph></p><br><h6>Heading</h6><br><p>Paragraph></p>';
                const document = createDocument(htmlString);
                const nodes = $generateNodesFromDOM(editor, document);

                expect(nodes.length).toBe(5);
                expect(nodes[0].getType()).toBe('paragraph');
                expect(nodes[1].getType()).toBe('linebreak');
                expect(nodes[2].getType()).toBe('extended-heading');
                expect(nodes[3].getType()).toBe('linebreak');
                expect(nodes[4].getType()).toBe('paragraph');
            }));

            it('(GDoc) skips linebreaks between H6 and paragraph', editorTest(function () {
                const htmlString = '<div id="docs-internal-guid-1234"><p>Paragraph></p><br><h6>Heading</h6><br><p>Paragraph></p>';
                const document = createDocument(htmlString);
                const nodes = $generateNodesFromDOM(editor, document);

                expect(nodes.length).toBe(3);
                expect(nodes[0].getType()).toBe('paragraph');
                expect(nodes[1].getType()).toBe('extended-heading');
                expect(nodes[2].getType()).toBe('paragraph');
            }));
        });

        describe('Multiple linebreaks', function () {
            it('(non GDoc) default conversion for multiple linebreaks between paragraphs', editorTest(function () {
                const htmlString = '<p>Paragraph></p><br><br><br><p>Paragraph></p>';
                const document = createDocument(htmlString);
                const nodes = $generateNodesFromDOM(editor, document);

                expect(nodes.length).toBe(5);
                expect(nodes[0].getType()).toBe('paragraph');
                expect(nodes[1].getType()).toBe('linebreak');
                expect(nodes[2].getType()).toBe('linebreak');
                expect(nodes[3].getType()).toBe('linebreak');
                expect(nodes[4].getType()).toBe('paragraph');
            }));

            it('(GDoc) skips empty paragraphs if there are multiple linebreaks', editorTest(function () {
                const htmlString = '<div id="docs-internal-guid-1234"><p>Paragraph></p><br><br><br><p>Paragraph></p></div>';
                const document = createDocument(htmlString);
                const nodes = $generateNodesFromDOM(editor, document);

                expect(nodes.length).toBe(2);
                expect(nodes[0].getType()).toBe('paragraph');
                expect(nodes[1].getType()).toBe('paragraph');
            }));
        });
    });
});
