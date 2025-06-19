const {createHeadlessEditor} = require('@lexical/headless');
const {$getRoot} = require('lexical');
const {dom, html} = require('../test-utils');
const {EmailNode, $createEmailNode, $isEmailNode} = require('../../');

const editorNodes = [EmailNode];

describe('EmailNode', function () {
    let editor;
    let dataset;
    let exportOptions;

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
        editor = createHeadlessEditor({
            nodes: editorNodes
        });

        dataset = {
            html: ''
        };

        exportOptions = {
            exportFormat: 'html',
            dom
        };
    });

    it('matches node with $isEmailNode', editorTest(function () {
        const emailNode = $createEmailNode(dataset);
        $isEmailNode(emailNode).should.be.true();
    }));

    describe('data access', function () {
        it('has getters for all properties', editorTest(function () {
            const emailNode = $createEmailNode(dataset);

            emailNode.html.should.equal(dataset.html);
        }));

        it('has setters for all properties', editorTest(function () {
            const emailNode = $createEmailNode();

            emailNode.html.should.equal('');
            emailNode.html = '<p>Hello World</p>';
            emailNode.html.should.equal('<p>Hello World</p>');
        }));

        it('has getDataset() convenience method', editorTest(function () {
            const emailNode = $createEmailNode(dataset);
            const emailNodeDataset = emailNode.getDataset();

            emailNodeDataset.should.deepEqual({
                ...dataset
            });
        }));
    });

    describe('getType', function () {
        it('returns the correct node type', editorTest(function () {
            EmailNode.getType().should.equal('email');
        }));
    });

    describe('clone', function () {
        it('returns a copy of the current node', editorTest(function () {
            const emailNode = $createEmailNode(dataset);
            const emailNodeDataset = emailNode.getDataset();
            const clone = EmailNode.clone(emailNode);
            const cloneDataset = clone.getDataset();

            cloneDataset.should.deepEqual({...emailNodeDataset});
        }));
    });

    describe('urlTransformMap', function () {
        it('contains the expected URL mapping', editorTest(function () {
            EmailNode.urlTransformMap.should.deepEqual({
                html: 'html'
            });
        }));
    });

    describe('hasEditMode', function () {
        it('returns true', editorTest(function () {
            const emailNode = $createEmailNode(dataset);
            emailNode.hasEditMode().should.be.true();
        }));
    });

    describe('exportJSON', function () {
        it('contains all data', editorTest(function () {
            const emailNode = $createEmailNode(dataset);
            const json = emailNode.exportJSON();

            json.should.deepEqual({
                type: 'email',
                version: 1,
                html: dataset.html
            });
        }));
    });

    describe('importJSON', function () {
        it('imports all data', function (done) {
            const serializedState = JSON.stringify({
                root: {
                    children: [{
                        type: 'email',
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
                    const [emailNode] = $getRoot().getChildren();

                    emailNode.html.should.equal(dataset.html);
                    done();
                } catch (e) {
                    done(e);
                }
            });
        });
    });

    describe('getTextContent', function () {
        it('returns contents', editorTest(function () {
            const node = $createEmailNode();
            node.html = 'Testing';

            // email nodes don't have text content
            node.getTextContent().should.equal('');
        }));
    });
});
