const {createHeadlessEditor} = require('@lexical/headless');
const {JSDOM} = require('jsdom');
const {$getRoot} = require('lexical');
const {html} = require('../utils');
const {PaywallNode, $createPaywallNode, $isPaywallNode} = require('../../');
const {$generateNodesFromDOM} = require('@lexical/html');

const editorNodes = [PaywallNode];

describe('PaywallNode', function () {
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

        dataset = {};

        exportOptions = {
            exportFormat: 'html',
            createDocument() {
                return (new JSDOM()).window.document;
            }
        };
    });

    it('matches node with $isPaywallNode', editorTest(function () {
        const paywallNode = $createPaywallNode(dataset);
        $isPaywallNode(paywallNode).should.be.true;
    }));

    describe('exportJSON', function () {
        it('contains all data', editorTest(function () {
            const paywallNode = $createPaywallNode(dataset);
            const json = paywallNode.exportJSON();

            json.should.deepEqual({
                type: 'paywall',
                version: 1
            });
        }));
    });

    describe('importJSON', function () {
        it('imports all data', function (done) {
            const serializedState = JSON.stringify({
                root: {
                    children: [{
                        type: 'paywall',
                        ...dataset
                    }],
                    type: 'root',
                    version: 1
                }
            });

            const editorState = editor.parseEditorState(serializedState);
            editor.setEditorState(editorState);

            editor.getEditorState().read(() => {
                try {
                    const [paywallNode] = $getRoot().getChildren();
                    paywallNode.should.be.instanceof(PaywallNode);

                    done();
                } catch (e) {
                    done(e);
                }
            });
        });
    });

    describe('exportDOM', function () {
        it('creates a paywall element', editorTest(function () {
            const paywallNode = $createPaywallNode();
            const {element} = paywallNode.exportDOM(exportOptions);

            element.outerHTML.should.prettifyTo(html`
                <paywall></paywall>
            `);
        }));
    });

    describe('importDOM', function () {
        it('parses a paywall element', editorTest(function () {
            const dom = (new JSDOM(html`
                <paywall></paywall>
            `)).window.document;
            const nodes = $generateNodesFromDOM(editor, dom);

            nodes.length.should.equal(1);
            nodes[0].should.be.instanceof(PaywallNode);
        }));
    });
});