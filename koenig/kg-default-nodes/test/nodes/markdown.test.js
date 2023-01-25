const {html} = require('../utils');
const {createHeadlessEditor} = require('@lexical/headless');
const {JSDOM} = require('jsdom');
const {$getRoot} = require('lexical');
const {MarkdownNode, $createMarkdownNode, $isMarkdownNode} = require('../../');

const editorNodes = [MarkdownNode];

describe('MarkdownNode', function () {
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
            markdown: '#HEADING\r\n- list\r\n- items'
        };

        exportOptions = {
            createDocument() {
                return (new JSDOM()).window.document;
            }
        };
    });

    it('matches node with $isImageNode', editorTest(function () {
        const markdownNode = $createMarkdownNode(dataset);
        $isMarkdownNode(markdownNode).should.be.true;
    }));

    describe('data access', function () {
        it('has getters for all properties', editorTest(function () {
            const markdownNode = $createMarkdownNode(dataset);

            markdownNode.getMarkdown().should.equal('#HEADING\r\n- list\r\n- items');
        }));

        it('has setters for all properties', editorTest(function () {
            const markdownNode = $createMarkdownNode(dataset);

            markdownNode.getMarkdown().should.equal('#HEADING\r\n- list\r\n- items');
            markdownNode.setMarkdown('#HEADING 2\r\n- list\r\n- items');
            markdownNode.getMarkdown().should.equal('#HEADING 2\r\n- list\r\n- items');
        }));

        it('has getDataset() convenience method', editorTest(function () {
            const markdownNode = $createMarkdownNode(dataset);
            const markdownNodeDataset = markdownNode.getDataset();

            markdownNodeDataset.should.deepEqual({
                ...dataset
            });
        }));

        it('has isEmpty() convenience method', editorTest(function () {
            const markdownNode = $createMarkdownNode(dataset);

            markdownNode.isEmpty().should.be.false;
            markdownNode.setMarkdown('');
            markdownNode.isEmpty().should.be.true;
        }));
    });

    describe('exportDOM', function () {
        it('creates a markdown card', editorTest(function () {
            const markdownNode = $createMarkdownNode(dataset);
            const {element, type} = markdownNode.exportDOM(exportOptions);
            type.should.equal('inner');
            element.innerHTML.should.prettifyTo(html`
                <h1 id="heading">HEADING</h1>
                <ul>
                <li>list</li>
                <li>items</li>
                </ul>
            `);
        }));

        it('renders nothing with a missing src', editorTest(function () {
            const markdownNode = $createMarkdownNode();
            const {element} = markdownNode.exportDOM(exportOptions);

            element.innerHTML.should.equal('');
        }));
    });

    describe('exportJSON', function () {
        it('contains all data', editorTest(function () {
            const markdownNode = $createMarkdownNode(dataset);
            const json = markdownNode.exportJSON();

            json.should.deepEqual({
                type: 'markdown',
                version: 1,
                markdown: '#HEADING\r\n- list\r\n- items'
            });
        }));
    });

    describe('importJSON', function () {
        it('imports all data', function (done) {
            const serializedState = JSON.stringify({
                root: {
                    children: [{
                        type: 'markdown',
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
                    const [markdownNode] = $getRoot().getChildren();

                    markdownNode.getMarkdown().should.equal('#HEADING\r\n- list\r\n- items');

                    done();
                } catch (e) {
                    done(e);
                }
            });
        });
    });

    describe('hasEditMode', function () {
        it('returns true', editorTest(function () {
            const markdownNode = $createMarkdownNode(dataset);
            markdownNode.hasEditMode().should.be.true;
        }));
    });

    describe('clone', function () {
        it('clones the node', editorTest(function () {
            const markdownNode = $createMarkdownNode(dataset);
            const clonedMarkdownNode = MarkdownNode.clone(markdownNode);
            $isMarkdownNode(clonedMarkdownNode).should.be.true;
            clonedMarkdownNode.getMarkdown().should.equal('#HEADING\r\n- list\r\n- items');
        }));
    });

    describe('static properties', function () {
        it('getType', editorTest(function () {
            MarkdownNode.getType().should.equal('markdown');
        }));

        it('urlTransformMap', editorTest(function () {
            MarkdownNode.urlTransformMap.should.deepEqual({
                markdown: 'markdown'
            });
        }));
    });
});
