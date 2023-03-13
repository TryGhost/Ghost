const {html} = require('../utils');
const {$getRoot} = require('lexical');
const {createHeadlessEditor} = require('@lexical/headless');
const {$generateNodesFromDOM} = require('@lexical/html');
const {JSDOM} = require('jsdom');
const {HorizontalRuleNode, $createHorizontalRuleNode, $isHorizontalRuleNode} = require('../../');

const editorNodes = [HorizontalRuleNode];

describe('HorizontalNode', function () {
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

        dataset = {};

        exportOptions = {
            createDocument() {
                return (new JSDOM()).window.document;
            }
        };
    });

    it('matches node with $isHorizontalRuleNode', editorTest(function () {
        const hrNode = $createHorizontalRuleNode();
        $isHorizontalRuleNode(hrNode).should.be.true;
    }));

    describe('exportDOM', function () {
        it('creates hr element', editorTest(function () {
            const hrNode = $createHorizontalRuleNode();
            const {element} = hrNode.exportDOM(exportOptions);

            element.outerHTML.should.prettifyTo(html`
                <hr />
            `);
        }));
    });

    describe('importDOM', function () {
        it('parses an hr element', editorTest(function () {
            const dom = (new JSDOM(html`
                <hr />
            `)).window.document;
            const nodes = $generateNodesFromDOM(editor, dom);

            nodes.length.should.equal(1);
            nodes[0].should.be.instanceof(HorizontalRuleNode);
        }));
    });

    describe('exportJSON', function () {
        it('contains all data', editorTest(function () {
            dataset.cardWidth = 'wide';

            const asideNode = $createHorizontalRuleNode(dataset);
            const json = asideNode.exportJSON();

            json.should.deepEqual({
                type: 'horizontalrule',
                version: 1
            });
        }));
    });

    describe('importJSON', function () {
        it('imports all data', function (done) {
            const serializedState = JSON.stringify({
                root: {
                    children: [{
                        type: 'horizontalrule'
                    }],
                    type: 'root',
                    version: 1
                }
            });

            const editorState = editor.parseEditorState(serializedState);
            editor.setEditorState(editorState);

            editor.getEditorState().read(() => {
                try {
                    const [hrNode] = $getRoot().getChildren();
                    hrNode.should.be.instanceof(HorizontalRuleNode);

                    done();
                } catch (e) {
                    done(e);
                }
            });
        });
    });
});
