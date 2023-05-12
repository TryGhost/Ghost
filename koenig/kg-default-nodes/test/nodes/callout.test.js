const {html} = require('../utils');
const {$getRoot} = require('lexical');
const {createHeadlessEditor} = require('@lexical/headless');
const {$generateNodesFromDOM} = require('@lexical/html');
const {JSDOM} = require('jsdom');
const {CalloutNode, $createCalloutNode, $isCalloutNode} = require('../../');

const editorNodes = [CalloutNode];

describe('CalloutNode', function () {
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
        editor = createHeadlessEditor({
            nodes: editorNodes
        });
        dataset = {
            calloutText: 'This is a callout',
            calloutEmoji: '💡',
            backgroundColor: 'blue'
        };
        exportOptions = {
            exportFormat: 'html',
            createDocument() {
                return (new JSDOM()).window.document;
            }
        };
    });

    it('can match node with calloutNode', editorTest(function () {
        const node = $createCalloutNode(dataset);
        $isCalloutNode(node).should.be.true;
    }));

    describe('hasEditMode', function () {
        it('returns true', editorTest(function () {
            const calloutNode = $createCalloutNode(dataset);
            calloutNode.hasEditMode().should.be.true;
        }));
    });

    describe('data access', function (){
        it('has getters for all properties', editorTest(function () {
            const node = $createCalloutNode(dataset);
            node.getCalloutText().should.equal(dataset.calloutText);
            node.getCalloutEmoji().should.equal(dataset.calloutEmoji);
            node.getBackgroundColor().should.equal(dataset.backgroundColor);
        }));

        it('has setters for all properties', editorTest(function () {
            const node = $createCalloutNode(dataset);
            node.setCalloutText('new text');
            node.getCalloutText().should.equal('new text');
            node.setBackgroundColor('red');
            node.getBackgroundColor().should.equal('red');
            node.setCalloutEmoji('👍');
            node.getCalloutEmoji().should.equal('👍');
        }));

        it('has getDataset() method', editorTest(function () {
            const node = $createCalloutNode(dataset);
            const nodeDataset = node.getDataset();
            nodeDataset.should.deepEqual(dataset);
        }));
    });

    describe('exporting', function () {
        it('can render to HTML', editorTest(function () {
            const node = $createCalloutNode(dataset);
            const {element} = node.exportDOM(exportOptions);
            element.outerHTML.should.prettifyTo(html`
                <div class="kg-card kg-callout-card kg-callout-card-blue">
                    <div class="kg-callout-emoji">💡</div>
                    <div class="kg-callout-text">This is a callout</div>
                </div>
                `);
        }));
        it('can render to HTML with no emoji', editorTest(function () {
            const node = $createCalloutNode(dataset);
            node.setCalloutEmoji(null);
            const {element} = node.exportDOM(exportOptions);
            element.outerHTML.should.prettifyTo(html`
                <div class="kg-card kg-callout-card kg-callout-card-blue">
                    <div class="kg-callout-text">This is a callout</div>
                </div>
                `);
        }));

        it('can export JSON', editorTest(function () {
            const node = $createCalloutNode(dataset);
            console.log(dataset);
            const json = node.exportJSON();
            json.should.deepEqual({
                type: 'callout',
                version: 1,
                ...dataset
            });
        }));
    });

    describe('importDOM', function () {
        it('parses callout card', editorTest(function () {
            const dom = (new JSDOM(html`
                <div class="kg-card kg-callout-card kg-callout-card-red">
                    <div class="kg-callout-emoji">💡</div>
                    <div class="kg-callout-text">This is a callout</div>
                </div>
                    `)).window.document;
            const nodes = $generateNodesFromDOM(editor, dom);
            // console.log(nodes);
            nodes.length.should.equal(1);
            nodes[0].getBackgroundColor().should.equal('red');
            nodes[0].getCalloutText().should.equal('This is a callout');
            nodes[0].getCalloutEmoji().should.equal('💡');
        }));
    });

    describe('static clone', function () {
        it('can clone a node', editorTest(function () {
            const node = $createCalloutNode(dataset);
            const clone = CalloutNode.clone(node);
            clone.getBackgroundColor().should.equal(node.getBackgroundColor());
            clone.getCalloutText().should.equal(node.getCalloutText());
            clone.getCalloutEmoji().should.equal(node.getCalloutEmoji());
        }));
    });

    describe('importJSON', function () {
        it('imports all data', function (done) {
            const serializedState = JSON.stringify({
                root: {
                    children: [{
                        type: 'callout',
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
                    const [calloutNode] = $getRoot().getChildren();
                    calloutNode.getCalloutText().should.equal(dataset.calloutText);
                    calloutNode.getCalloutEmoji().should.equal(dataset.calloutEmoji);
                    calloutNode.getBackgroundColor().should.equal(dataset.backgroundColor);
                    done();
                } catch (e) {
                    done(e);
                }
            });
        });
    });
});