const {html} = require('../utils');
const {createHeadlessEditor} = require('@lexical/headless');
const {JSDOM} = require('jsdom');
const {$getRoot} = require('lexical');
const {HtmlNode, $createHtmlNode, $isHtmlNode} = require('../../');
const {$generateNodesFromDOM} = require('@lexical/html');

const editorNodes = [HtmlNode];

describe('HtmlNode', function () {
    let editor;
    let dataset;
    let exportOptions;

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
            html: '<p>Paragraph with:</p><ul><li>list</li><li>items</li></ul>'
        };

        exportOptions = {
            createDocument() {
                return (new JSDOM()).window.document;
            }
        };
    });

    it('matches node with $isImageNode', editorTest(function () {
        const htmlNode = $createHtmlNode(dataset);
        $isHtmlNode(htmlNode).should.be.true;
    }));

    describe('data access', function () {
        it('has getters for all properties', editorTest(function () {
            const htmlNode = $createHtmlNode(dataset);

            htmlNode.getHtml().should.equal('<p>Paragraph with:</p><ul><li>list</li><li>items</li></ul>');
        }));

        it('has setters for all properties', editorTest(function () {
            const htmlNode = $createHtmlNode(dataset);

            htmlNode.getHtml().should.equal('<p>Paragraph with:</p><ul><li>list</li><li>items</li></ul>');
            htmlNode.setHtml('<p>Paragraph 1</p><p>Paragraph 2</p>');
            htmlNode.getHtml().should.equal('<p>Paragraph 1</p><p>Paragraph 2</p>');
        }));

        it('has getDataset() convenience method', editorTest(function () {
            const htmlNode = $createHtmlNode(dataset);
            const htmlNodeDataset = htmlNode.getDataset();

            htmlNodeDataset.should.deepEqual({
                ...dataset
            });
        }));

        it('has isEmpty() convenience method', editorTest(function () {
            const htmlNode = $createHtmlNode(dataset);

            htmlNode.isEmpty().should.be.false;
            htmlNode.setHtml('');
            htmlNode.isEmpty().should.be.true;
        }));
    });

    describe('exportDOM', function () {
        it('creates a html card', editorTest(function () {
            const htmlNode = $createHtmlNode(dataset);
            const {element, type} = htmlNode.exportDOM(exportOptions);
            type.should.equal('inner');
            element.innerHTML.should.prettifyTo(html`
                <p>Paragraph with:</p>
                <ul>
                    <li>list</li>
                    <li>items</li>
                </ul>
            `);
        }));

        it('renders nothing with a missing src', editorTest(function () {
            const htmlNode = $createHtmlNode();
            const {element} = htmlNode.exportDOM(exportOptions);

            element.innerHTML.should.equal('');
        }));
    });

    describe('importDOM', function () {
        it('parses a html node', editorTest(function () {
            const dom = (new JSDOM(html`
                <span><!--kg-card-begin: html--><p>here's html</p><!--kg-card-end: html--></span>
            `)).window.document;
            const nodes = $generateNodesFromDOM(editor, dom);
            nodes.length.should.equal(1);
            nodes[0].should.be.instanceof(HtmlNode);
        }));
    });

    describe('exportJSON', function () {
        it('contains all data', editorTest(function () {
            const htmlNode = $createHtmlNode(dataset);
            const json = htmlNode.exportJSON();

            json.should.deepEqual({
                type: 'html',
                version: 1,
                html: '<p>Paragraph with:</p><ul><li>list</li><li>items</li></ul>'
            });
        }));
    });

    describe('importJSON', function () {
        it('imports all data', function (done) {
            const serializedState = JSON.stringify({
                root: {
                    children: [{
                        type: 'html',
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
                    const [htmlNode] = $getRoot().getChildren();

                    htmlNode.getHtml().should.equal('<p>Paragraph with:</p><ul><li>list</li><li>items</li></ul>');

                    done();
                } catch (e) {
                    done(e);
                }
            });
        });
    });

    describe('hasEditMode', function () {
        it('returns true', editorTest(function () {
            const htmlNode = $createHtmlNode(dataset);
            htmlNode.hasEditMode().should.be.true;
        }));
    });

    describe('clone', function () {
        it('clones the node', editorTest(function () {
            const htmlNode = $createHtmlNode(dataset);
            const clonedHtmlNode = HtmlNode.clone(htmlNode);
            $isHtmlNode(clonedHtmlNode).should.be.true;
            clonedHtmlNode.getHtml().should.equal('<p>Paragraph with:</p><ul><li>list</li><li>items</li></ul>');
        }));
    });

    describe('static properties', function () {
        it('getType', editorTest(function () {
            HtmlNode.getType().should.equal('html');
        }));

        it('urlTransformMap', editorTest(function () {
            HtmlNode.urlTransformMap.should.deepEqual({
                html: 'html'
            });
        }));
    });
});
