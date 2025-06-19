const {createDocument, html} = require('../test-utils');
const {$getRoot} = require('lexical');
const {createHeadlessEditor} = require('@lexical/headless');
const {$generateNodesFromDOM} = require('@lexical/html');
const {ImageNode, $createImageNode, $isImageNode} = require('../../');

const editorNodes = [ImageNode];

describe('ImageNode', function () {
    let editor;
    let dataset;

    // NOTE: all tests should use this function, without it you need manual
    // try/catch and done handling to avoid assertion failures not triggering
    // failed tests
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
    });

    it('matches node with $isImageNode', editorTest(function () {
        const imageNode = $createImageNode(dataset);
        $isImageNode(imageNode).should.be.true();
    }));

    describe('data access', function () {
        it('has getters for all properties', editorTest(function () {
            const imageNode = $createImageNode(dataset);

            imageNode.src.should.equal('/content/images/2022/11/koenig-lexical.jpg');
            imageNode.width.should.equal(3840);
            imageNode.height.should.equal(2160);
            imageNode.title.should.equal('This is a title');
            imageNode.alt.should.equal('This is some alt text');
            imageNode.caption.should.equal('This is a <b>caption</b>');
            imageNode.cardWidth.should.equal('regular');
            imageNode.href.should.equal('');
        }));

        it('has setters for all properties', editorTest(function () {
            const imageNode = $createImageNode();

            imageNode.src.should.equal('');
            imageNode.src = '/content/images/2022/11/koenig-lexical.jpg';
            imageNode.src.should.equal('/content/images/2022/11/koenig-lexical.jpg');

            should(imageNode.width).equal(null);
            imageNode.width = 3840;
            imageNode.width.should.equal(3840);

            should(imageNode.height).equal(null);
            imageNode.height = 2160;
            imageNode.height.should.equal(2160);

            imageNode.title.should.equal('');
            imageNode.title = 'I am a title';
            imageNode.title.should.equal('I am a title');

            imageNode.alt.should.equal('');
            imageNode.alt = 'I am alt text';
            imageNode.alt.should.equal('I am alt text');

            imageNode.caption.should.equal('');
            imageNode.caption = 'I am a <b>Caption</b>';
            imageNode.caption.should.equal('I am a <b>Caption</b>');

            imageNode.cardWidth.should.equal('regular');
            imageNode.cardWidth = 'wide';
            imageNode.cardWidth.should.equal('wide');

            imageNode.href.should.equal('');
            imageNode.href = 'https://example.com';
            imageNode.href.should.equal('https://example.com');
        }));

        it('has getDataset() convenience method', editorTest(function () {
            const imageNode = $createImageNode(dataset);
            const imageNodeDataset = imageNode.getDataset();

            imageNodeDataset.should.deepEqual({
                ...dataset,
                cardWidth: 'regular'
            });
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
            const nodes = $generateNodesFromDOM(editor, document);

            nodes.length.should.equal(1);
            nodes[0].src.should.equal('/image.png');
            nodes[0].alt.should.equal('Alt text');
            nodes[0].title.should.equal('Title text');
            nodes[0].width.should.equal(3000);
            nodes[0].height.should.equal(2000);
        }));

        it('parses IMG inside FIGURE to image card without caption', editorTest(function () {
            const document = createDocument(html`
                <figure>
                    <img src="http://example.com/test.png" alt="Alt test" title="Title test" />
                </figure>
            `);
            const nodes = $generateNodesFromDOM(editor, document);

            nodes.length.should.equal(1);
            nodes[0].src.should.equal('http://example.com/test.png');
            nodes[0].alt.should.equal('Alt test');
            nodes[0].title.should.equal('Title test');
        }));

        it('parses IMG inside FIGURE to image card with caption', editorTest(function () {
            const document = createDocument(html`
                <figure>
                    <img src="http://example.com/test.png">
                    <figcaption>&nbsp; <strong>Caption test</strong></figcaption>
                </figure>
            `);
            const nodes = $generateNodesFromDOM(editor, document);

            nodes.length.should.equal(1);
            nodes[0].src.should.equal('http://example.com/test.png');
            nodes[0].caption.should.equal('<strong>Caption test</strong>');
        }));

        it('extracts Koenig card widths', editorTest(function () {
            const document = createDocument(html`
                <figure class="kg-card kg-width-wide">
                    <img src="http://example.com/test.png">
                </figure>
            `);
            const nodes = $generateNodesFromDOM(editor, document);
            nodes.length.should.equal(1);
            nodes[0].cardWidth.should.equal('wide');
        }));

        it('extracts Medium card widths', editorTest(function () {
            const document = createDocument(html`
                <figure class="graf--layoutFillWidth">
                    <img src="http://example.com/test.png">
                </figure>
            `);
            const nodes = $generateNodesFromDOM(editor, document);

            nodes.length.should.equal(1);
            nodes[0].cardWidth.should.equal('full');
        }));

        it('extracts IMG dimensions from width/height attrs', editorTest(function () {
            const document = createDocument(html`
                <figure>
                    <img src="http://example.com/test.png" width="640" height="480">
                </figure>
            `);
            const nodes = $generateNodesFromDOM(editor, document);

            nodes.length.should.equal(1);
            nodes[0].src.should.equal('http://example.com/test.png');
            nodes[0].width.should.equal(640);
            nodes[0].height.should.equal(480);
        }));

        it('extracts IMG dimensions from dataset', editorTest(function () {
            const document = createDocument(html`
                <figure>
                    <img src="http://example.com/test.png" width="640" height="480">
                </figure>
            `);
            const nodes = $generateNodesFromDOM(editor, document);

            nodes.length.should.equal(1);
            nodes[0].src.should.equal('http://example.com/test.png');
            nodes[0].width.should.equal(640);
            nodes[0].height.should.equal(480);
        }));

        it('extracts IMG dimensions from data-image-dimensions', editorTest(function () {
            const document = createDocument(html`
                <figure>
                    <img src="http://example.com/test.png" data-image-dimensions="640x480">
                </figure>
            `);
            const nodes = $generateNodesFromDOM(editor, document);

            nodes.length.should.equal(1);
            nodes[0].src.should.equal('http://example.com/test.png');
            nodes[0].width.should.equal(640);
            nodes[0].height.should.equal(480);
        }));

        it('extracts href when img wrapped in anchor tag', editorTest(function () {
            const document = createDocument(html`
                <figure>
                    <a href="https://example.com/link">
                        <img src="http://example.com/test.png">
                    </a>
                </figure>
            `);
            const nodes = $generateNodesFromDOM(editor, document);

            nodes.length.should.equal(1);
            nodes[0].src.should.equal('http://example.com/test.png');
            nodes[0].href.should.equal('https://example.com/link');
        }));

        it('extracts href when img wrapped in anchor tag not within figure', editorTest(function () {
            const document = createDocument(html`
                <a href="https://example.com/link">
                    <img src="http://example.com/test.png">
                </a>
            `);
            const nodes = $generateNodesFromDOM(editor, document);

            nodes.length.should.equal(1);
            nodes[0].src.should.equal('http://example.com/test.png');
            nodes[0].href.should.equal('https://example.com/link');
        }));
    });

    describe('exportJSON', function () {
        it('contains all data', editorTest(function () {
            dataset.cardWidth = 'wide';

            const imageNode = $createImageNode(dataset);
            const json = imageNode.exportJSON();

            json.should.deepEqual({
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
        it('imports all data', function (done) {
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
                    const [imageNode] = $getRoot().getChildren();

                    imageNode.src.should.equal('/content/images/2022/11/koenig-lexical.jpg');
                    imageNode.width.should.equal(3840);
                    imageNode.height.should.equal(2160);
                    imageNode.title.should.equal('This is a title');
                    imageNode.alt.should.equal('This is some alt text');
                    imageNode.caption.should.equal('This is a <b>caption</b>');
                    imageNode.cardWidth.should.equal('wide');

                    done();
                } catch (e) {
                    done(e);
                }
            });
        });
    });

    describe('getTextContent', function () {
        it('returns contents', editorTest(function () {
            const node = $createImageNode();
            node.getTextContent().should.equal('');

            node.caption = 'Test caption';
            node.getTextContent().should.equal('Test caption\n\n');
        }));
    });
});
