const {createHeadlessEditor} = require('@lexical/headless');
const {$getRoot} = require('lexical');
const {MarkdownNode, $createMarkdownNode, $isMarkdownNode} = require('../../');

const editorNodes = [MarkdownNode];

describe('MarkdownNode', function () {
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
            markdown: '#HEADING\r\n- list\r\n- items'
        };
    });

    it('matches node with $isImageNode', editorTest(function () {
        const markdownNode = $createMarkdownNode(dataset);
        $isMarkdownNode(markdownNode).should.be.true();
    }));

    describe('data access', function () {
        it('has getters for all properties', editorTest(function () {
            const markdownNode = $createMarkdownNode(dataset);

            markdownNode.markdown.should.equal('#HEADING\r\n- list\r\n- items');
        }));

        it('has setters for all properties', editorTest(function () {
            const markdownNode = $createMarkdownNode(dataset);

            markdownNode.markdown.should.equal('#HEADING\r\n- list\r\n- items');
            markdownNode.markdown = '#HEADING 2\r\n- list\r\n- items';
            markdownNode.markdown.should.equal('#HEADING 2\r\n- list\r\n- items');
        }));

        it('has getDataset() convenience method', editorTest(function () {
            const markdownNode = $createMarkdownNode(dataset);
            const markdownNodeDataset = markdownNode.getDataset();

            markdownNodeDataset.should.deepEqual({
                ...dataset
            });
        }));
    });

    describe('isEmpty()', function () {
        it('returns true if markdown is empty', editorTest(function () {
            const markdownNode = $createMarkdownNode(dataset);

            markdownNode.isEmpty().should.be.false();
            markdownNode.markdown = '';
            markdownNode.isEmpty().should.be.true();
        }));
    });

    describe('getType', function () {
        it('returns the correct node type', editorTest(function () {
            MarkdownNode.getType().should.equal('markdown');
        }));
    });

    describe('clone', function () {
        it('returns a copy of the current node', editorTest(function () {
            const markdownNode = $createMarkdownNode(dataset);
            const markdownNodeDataset = markdownNode.getDataset();
            const clone = MarkdownNode.clone(markdownNode);
            const cloneDataset = clone.getDataset();

            cloneDataset.should.deepEqual({...markdownNodeDataset});
        }));
    });

    describe('urlTransformMap', function () {
        it('contains the expected URL mapping', editorTest(function () {
            MarkdownNode.urlTransformMap.should.deepEqual({
                markdown: 'markdown'
            });
        }));
    });

    describe('hasEditMode', function () {
        it('returns true', editorTest(function () {
            const markdownNode = $createMarkdownNode(dataset);
            markdownNode.hasEditMode().should.be.true();
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

                    markdownNode.markdown.should.equal('#HEADING\r\n- list\r\n- items');

                    done();
                } catch (e) {
                    done(e);
                }
            });
        });
    });

    describe('getTextContent', function () {
        it('returns contents', editorTest(function () {
            const node = $createMarkdownNode();
            node.getTextContent().should.equal('');

            node.markdown = '#HEADING\r\n- list\r\n- items';

            node.getTextContent().should.equal('#HEADING\r\n- list\r\n- items\n\n');
        }));
    });
});
