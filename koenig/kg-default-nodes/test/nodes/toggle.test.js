const {createHeadlessEditor} = require('@lexical/headless');
const {$getRoot} = require('lexical');
const {createDocument, html} = require('../test-utils');
const {ToggleNode, $createToggleNode, $isToggleNode} = require('../../');
const {$generateNodesFromDOM} = require('@lexical/html');

const editorNodes = [ToggleNode];

describe('ToggleNode', function () {
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
        editor = createHeadlessEditor({
            nodes: editorNodes
        });

        dataset = {
            heading: 'Toggle Heading',
            content: 'Collapsible content'
        };
    });

    it('matches node with $isToggleNode', editorTest(function () {
        const toggleNode = $createToggleNode(dataset);
        $isToggleNode(toggleNode).should.be.true();
    }));

    describe('data access', function () {
        it('has getters for all properties', editorTest(function () {
            const toggleNode = $createToggleNode(dataset);

            toggleNode.heading.should.equal(dataset.heading);
            toggleNode.content.should.equal(dataset.content);
        }));

        it('has setters for all properties', editorTest(function () {
            const toggleNode = $createToggleNode();

            toggleNode.heading.should.equal('');
            toggleNode.heading = 'Heading';
            toggleNode.heading.should.equal('Heading');

            toggleNode.content.should.equal('');
            toggleNode.content = 'Content';
            toggleNode.content.should.equal('Content');
        }));

        it('has getDataset() convenience method', editorTest(function () {
            const toggleNode = $createToggleNode(dataset);
            const toggleNodeDataset = toggleNode.getDataset();

            toggleNodeDataset.should.deepEqual({
                ...dataset
            });
        }));
    });

    describe('getType', function () {
        it('returns the correct node type', editorTest(function () {
            ToggleNode.getType().should.equal('toggle');
        }));
    });

    describe('clone', function () {
        it('returns a copy of the current node', editorTest(function () {
            const toggleNode = $createToggleNode(dataset);
            const toggleNodeDataset = toggleNode.getDataset();
            const clone = ToggleNode.clone(toggleNode);
            const cloneDataset = clone.getDataset();

            cloneDataset.should.deepEqual({...toggleNodeDataset});
        }));
    });

    describe('urlTransformMap', function () {
        it('contains the expected URL mapping', editorTest(function () {
            ToggleNode.urlTransformMap.should.deepEqual({
                heading: 'html',
                content: 'html'
            });
        }));
    });

    describe('hasEditMode', function () {
        it('returns true', editorTest(function () {
            const toggleNode = $createToggleNode(dataset);
            toggleNode.hasEditMode().should.be.true();
        }));
    });

    describe('exportJSON', function () {
        it('contains all data', editorTest(function () {
            const toggleNode = $createToggleNode(dataset);
            const json = toggleNode.exportJSON();

            json.should.deepEqual({
                type: 'toggle',
                version: 1,
                heading: dataset.heading,
                content: dataset.content
            });
        }));
    });

    describe('importJSON', function () {
        it('imports all data', function (done) {
            const serializedState = JSON.stringify({
                root: {
                    children: [{
                        type: 'toggle',
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
                    const [toggleNode] = $getRoot().getChildren();

                    toggleNode.heading.should.equal(dataset.heading);
                    toggleNode.content.should.equal(dataset.content);

                    done();
                } catch (e) {
                    done(e);
                }
            });
        });
    });

    describe('importDOM', function () {
        it('parses toggle card', editorTest(function () {
            const document = createDocument(html`
                <div class="kg-card kg-toggle-card" data-kg-toggle-state="close"><div class="kg-toggle-heading"><h4 class="kg-toggle-heading-text">Heading</h4><button class="kg-toggle-card-icon" aria-label="Expand toggle to read content"><svg id="Regular" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path class="cls-1" d="M23.25,7.311,12.53,18.03a.749.749,0,0,1-1.06,0L.75,7.311"></path></svg></button></div><div class="kg-toggle-content">Content</div></div>
            `);
            const nodes = $generateNodesFromDOM(editor, document);
            nodes.length.should.equal(1);
            nodes[0].heading.should.equal('Heading');
            nodes[0].content.should.equal('Content');
        }));
    });

    describe('getTextContent', function () {
        it('returns contents', editorTest(function () {
            const node = $createToggleNode();
            node.getTextContent().should.equal('');

            node.heading = 'header';
            node.getTextContent().should.equal('header\n\n');

            node.content = 'content';
            node.getTextContent().should.equal('header\ncontent\n\n');
        }));
    });
});
