const {createDocument} = require('../utils');
const {createHeadlessEditor} = require('@lexical/headless');
const {$generateNodesFromDOM} = require('@lexical/html');
const {DEFAULT_CONFIG, DEFAULT_NODES} = require('../../');

describe('Serializers: linebreak', function () {
    let editor;

    const editorTest = testFn => function (done) {
        editor.update(() => {
            try {
                testFn();
                done();
            } catch (e) {
                done(e);
            }
        });
    };

    beforeEach(function () {
        editor = createHeadlessEditor({nodes: DEFAULT_NODES, html: DEFAULT_CONFIG.html});
    });

    describe('import', function () {
        describe('Inside a paragraph', function () {
            it('(non GDoc) default conversion between text', editorTest(function () {
                const htmlString = 'Before<br>After';
                const document = createDocument(htmlString);
                const nodes = $generateNodesFromDOM(editor, document);

                should.equal(nodes.length, 3);
                should.equal(nodes[0].getType(), 'extended-text');
                should.equal(nodes[1].getType(), 'linebreak');
                should.equal(nodes[2].getType(), 'extended-text');
            }));

            it('(GDoc) default conversion for breaks inside paragraphs', editorTest(function () {
                const htmlString = '<div id="docs-internal-guid-1234"><p>Before<br>After</p></div>';
                const document = createDocument(htmlString);
                const nodes = $generateNodesFromDOM(editor, document);

                should.equal(nodes.length, 1);
                should.equal(nodes[0].getType(), 'paragraph');
                should.equal(nodes[0].getChildren().length, 3);
                should.equal(nodes[0].getChildren()[0].getType(), 'extended-text');
                should.equal(nodes[0].getChildren()[1].getType(), 'linebreak');
                should.equal(nodes[0].getChildren()[2].getType(), 'extended-text');
            }));
        });

        describe('Between paragraphs', function () {
            it('(non GDoc) default conversion between paragraphs', editorTest(function () {
                const htmlString = '<p>Before</p><br><p>After</p>';
                const document = createDocument(htmlString);
                const nodes = $generateNodesFromDOM(editor, document);

                should.equal(nodes.length, 3);

                should.equal(nodes[0].getType(), 'paragraph');
                should.equal(nodes[0].getChildren().length, 1);
                should.equal(nodes[0].getChildren()[0].getType(), 'extended-text');
                should.equal(nodes[0].getChildren()[0].getTextContent(), 'Before');

                should.equal(nodes[1].getType(), 'linebreak');

                should.equal(nodes[2].getType(), 'paragraph');
                should.equal(nodes[2].getChildren().length, 1);
                should.equal(nodes[2].getChildren()[0].getType(), 'extended-text');
                should.equal(nodes[2].getChildren()[0].getTextContent(), 'After');
            }));

            it('(GDoc) no conversion for breaks between paragraphs', editorTest(function () {
                const htmlString = '<div id="docs-internal-guid-1234"><p>Before</p><br><p>After</p></div>';
                const document = createDocument(htmlString);
                const nodes = $generateNodesFromDOM(editor, document);

                should.equal(nodes.length, 2);
                should.equal(nodes[0].getType(), 'paragraph');
                should.equal(nodes[0].getChildren().length, 1);
                should.equal(nodes[0].getChildren()[0].getType(), 'extended-text');
                should.equal(nodes[0].getChildren()[0].getTextContent(), 'Before');

                should.equal(nodes[1].getType(), 'paragraph');
                should.equal(nodes[1].getChildren().length, 1);
                should.equal(nodes[1].getChildren()[0].getType(), 'extended-text');
                should.equal(nodes[1].getChildren()[0].getTextContent(), 'After');
            }));
        });

        describe('Between lists and paragraphs', function () {
            it('(non GDoc) default conversion for linebreaks between unordered list and paragraph', editorTest(function () {
                const htmlString = '<p>Paragraph></p><br><ul><li>Item</li></ul><br><p>Paragraph></p>';
                const document = createDocument(htmlString);
                const nodes = $generateNodesFromDOM(editor, document);

                should.equal(nodes.length, 5);
                should.equal(nodes[0].getType(), 'paragraph');
                should.equal(nodes[1].getType(), 'linebreak');
                should.equal(nodes[2].getType(), 'extended-text');
                should.equal(nodes[3].getType(), 'linebreak');
                should.equal(nodes[4].getType(), 'paragraph');
            }));

            it('(GDoc) skips linebreaks between unordered list and paragraph', editorTest(function () {
                const htmlString = '<div id="docs-internal-guid-1234"><p>Paragraph></p><br><ul><li>Item</li></ul><br><p>Paragraph></p>';
                const document = createDocument(htmlString);
                const nodes = $generateNodesFromDOM(editor, document);

                should.equal(nodes.length, 3);
                should.equal(nodes[0].getType(), 'paragraph');
                should.equal(nodes[1].getType(), 'extended-text');
                should.equal(nodes[2].getType(), 'paragraph');
            }));

            it('(non GDoc) default conversion for linebreaks between ordered list and paragraph', editorTest(function () {
                const htmlString = '<p>Paragraph></p><br><ol><li>Item</li></ol><br><p>Paragraph></p>';
                const document = createDocument(htmlString);
                const nodes = $generateNodesFromDOM(editor, document);

                should.equal(nodes.length, 5);
                should.equal(nodes[0].getType(), 'paragraph');
                should.equal(nodes[1].getType(), 'linebreak');
                should.equal(nodes[2].getType(), 'extended-text');
                should.equal(nodes[3].getType(), 'linebreak');
                should.equal(nodes[4].getType(), 'paragraph');
            }));

            it('(GDoc) skips linebreaks between ordered list and paragraph', editorTest(function () {
                const htmlString = '<div id="docs-internal-guid-1234"><p>Paragraph></p><br><ol><li>Item</li></ol><br><p>Paragraph></p>';
                const document = createDocument(htmlString);
                const nodes = $generateNodesFromDOM(editor, document);

                should.equal(nodes.length, 3);
                should.equal(nodes[0].getType(), 'paragraph');
                should.equal(nodes[1].getType(), 'extended-text');
                should.equal(nodes[2].getType(), 'paragraph');
            }));

            it('(non GDoc) default conversion for linebreaks between description list and paragraph', editorTest(function () {
                const htmlString = '<p>Paragraph></p><br><dl><li>Item</li></dl><br><p>Paragraph></p>';
                const document = createDocument(htmlString);
                const nodes = $generateNodesFromDOM(editor, document);

                should.equal(nodes.length, 5);
                should.equal(nodes[0].getType(), 'paragraph');
                should.equal(nodes[1].getType(), 'linebreak');
                should.equal(nodes[2].getType(), 'extended-text');
                should.equal(nodes[3].getType(), 'linebreak');
                should.equal(nodes[4].getType(), 'paragraph');
            }));

            it('(GDoc) skips linebreaks between description list and paragraph', editorTest(function () {
                const htmlString = '<div id="docs-internal-guid-1234"><p>Paragraph></p><br><dl><li>Item</li></dl><br><p>Paragraph></p>';
                const document = createDocument(htmlString);
                const nodes = $generateNodesFromDOM(editor, document);

                should.equal(nodes.length, 3);
                should.equal(nodes[0].getType(), 'paragraph');
                should.equal(nodes[1].getType(), 'extended-text');
                should.equal(nodes[2].getType(), 'paragraph');
            }));
        });

        describe('Between headings and paragraphs', function () {
            it('(non GDoc) default conversion for a linebreak between a H1 and paragraph', editorTest(function () {
                const htmlString = '<p>Paragraph></p><br><h1>Heading</h1><br><p>Paragraph></p>';
                const document = createDocument(htmlString);
                const nodes = $generateNodesFromDOM(editor, document);

                should.equal(nodes.length, 5);
                should.equal(nodes[0].getType(), 'paragraph');
                should.equal(nodes[1].getType(), 'linebreak');
                should.equal(nodes[2].getType(), 'extended-heading');
                should.equal(nodes[3].getType(), 'linebreak');
                should.equal(nodes[4].getType(), 'paragraph');
            }));

            it('(GDoc) skips linebreaks between H1 and paragraph', editorTest(function () {
                const htmlString = '<div id="docs-internal-guid-1234"><p>Paragraph></p><br><h1>Heading</h1><br><p>Paragraph></p>';
                const document = createDocument(htmlString);
                const nodes = $generateNodesFromDOM(editor, document);

                should.equal(nodes.length, 3);
                should.equal(nodes[0].getType(), 'paragraph');
                should.equal(nodes[1].getType(), 'extended-heading');
                should.equal(nodes[2].getType(), 'paragraph');
            }));

            it('(non GDoc) default conversion for a linebreak between a H2 and paragraph', editorTest(function () {
                const htmlString = '<p>Paragraph></p><br><h2>Heading</h2><br><p>Paragraph></p>';
                const document = createDocument(htmlString);
                const nodes = $generateNodesFromDOM(editor, document);

                should.equal(nodes.length, 5);
                should.equal(nodes[0].getType(), 'paragraph');
                should.equal(nodes[1].getType(), 'linebreak');
                should.equal(nodes[2].getType(), 'extended-heading');
                should.equal(nodes[3].getType(), 'linebreak');
                should.equal(nodes[4].getType(), 'paragraph');
            }));

            it('(GDoc) skips linebreaks between H2 and paragraph', editorTest(function () {
                const htmlString = '<div id="docs-internal-guid-1234"><p>Paragraph></p><br><h2>Heading</h2><br><p>Paragraph></p>';
                const document = createDocument(htmlString);
                const nodes = $generateNodesFromDOM(editor, document);

                should.equal(nodes.length, 3);
                should.equal(nodes[0].getType(), 'paragraph');
                should.equal(nodes[1].getType(), 'extended-heading');
                should.equal(nodes[2].getType(), 'paragraph');
            }));
        });

        it('(non GDoc) default conversion for a linebreak between a H3 and paragraph', editorTest(function () {
            const htmlString = '<p>Paragraph></p><br><h3>Heading</h3><br><p>Paragraph></p>';
            const document = createDocument(htmlString);
            const nodes = $generateNodesFromDOM(editor, document);

            should.equal(nodes.length, 5);
            should.equal(nodes[0].getType(), 'paragraph');
            should.equal(nodes[1].getType(), 'linebreak');
            should.equal(nodes[2].getType(), 'extended-heading');
            should.equal(nodes[3].getType(), 'linebreak');
            should.equal(nodes[4].getType(), 'paragraph');
        }));

        it('(GDoc) skips linebreaks between H3 and paragraph', editorTest(function () {
            const htmlString = '<div id="docs-internal-guid-1234"><p>Paragraph></p><br><h3>Heading</h3><br><p>Paragraph></p>';
            const document = createDocument(htmlString);
            const nodes = $generateNodesFromDOM(editor, document);

            should.equal(nodes.length, 3);
            should.equal(nodes[0].getType(), 'paragraph');
            should.equal(nodes[1].getType(), 'extended-heading');
            should.equal(nodes[2].getType(), 'paragraph');
        }));

        it('(non GDoc) default conversion for a linebreak between a H4 and paragraph', editorTest(function () {
            const htmlString = '<p>Paragraph></p><br><h4>Heading</h4><br><p>Paragraph></p>';
            const document = createDocument(htmlString);
            const nodes = $generateNodesFromDOM(editor, document);

            should.equal(nodes.length, 5);
            should.equal(nodes[0].getType(), 'paragraph');
            should.equal(nodes[1].getType(), 'linebreak');
            should.equal(nodes[2].getType(), 'extended-heading');
            should.equal(nodes[3].getType(), 'linebreak');
            should.equal(nodes[4].getType(), 'paragraph');
        }));

        it('(GDoc) skips linebreaks between H4 and paragraph', editorTest(function () {
            const htmlString = '<div id="docs-internal-guid-1234"><p>Paragraph></p><br><h4>Heading</h4><br><p>Paragraph></p>';
            const document = createDocument(htmlString);
            const nodes = $generateNodesFromDOM(editor, document);

            should.equal(nodes.length, 3);
            should.equal(nodes[0].getType(), 'paragraph');
            should.equal(nodes[1].getType(), 'extended-heading');
            should.equal(nodes[2].getType(), 'paragraph');
        }));

        it('(non GDoc) default conversion for a linebreak between a H5 and paragraph', editorTest(function () {
            const htmlString = '<p>Paragraph></p><br><h5>Heading</h5><br><p>Paragraph></p>';
            const document = createDocument(htmlString);
            const nodes = $generateNodesFromDOM(editor, document);

            should.equal(nodes.length, 5);
            should.equal(nodes[0].getType(), 'paragraph');
            should.equal(nodes[1].getType(), 'linebreak');
            should.equal(nodes[2].getType(), 'extended-heading');
            should.equal(nodes[3].getType(), 'linebreak');
            should.equal(nodes[4].getType(), 'paragraph');
        }));

        it('(GDoc) skips linebreaks between H5 and paragraph', editorTest(function () {
            const htmlString = '<div id="docs-internal-guid-1234"><p>Paragraph></p><br><h5>Heading</h5><br><p>Paragraph></p>';
            const document = createDocument(htmlString);
            const nodes = $generateNodesFromDOM(editor, document);

            should.equal(nodes.length, 3);
            should.equal(nodes[0].getType(), 'paragraph');
            should.equal(nodes[1].getType(), 'extended-heading');
            should.equal(nodes[2].getType(), 'paragraph');
        }));

        it('(non GDoc) default conversion for a linebreak between a H6 and paragraph', editorTest(function () {
            const htmlString = '<p>Paragraph></p><br><h6>Heading</h6><br><p>Paragraph></p>';
            const document = createDocument(htmlString);
            const nodes = $generateNodesFromDOM(editor, document);

            should.equal(nodes.length, 5);
            should.equal(nodes[0].getType(), 'paragraph');
            should.equal(nodes[1].getType(), 'linebreak');
            should.equal(nodes[2].getType(), 'extended-heading');
            should.equal(nodes[3].getType(), 'linebreak');
            should.equal(nodes[4].getType(), 'paragraph');
        }));

        it('(GDoc) skips linebreaks between H6 and paragraph', editorTest(function () {
            const htmlString = '<div id="docs-internal-guid-1234"><p>Paragraph></p><br><h6>Heading</h6><br><p>Paragraph></p>';
            const document = createDocument(htmlString);
            const nodes = $generateNodesFromDOM(editor, document);

            should.equal(nodes.length, 3);
            should.equal(nodes[0].getType(), 'paragraph');
            should.equal(nodes[1].getType(), 'extended-heading');
            should.equal(nodes[2].getType(), 'paragraph');
        }));
    });
});
