import {createDocument, dom, html} from '../test-utils/index.js';
import {$getRoot} from 'lexical';
import type {LexicalEditor} from 'lexical';
import {createHeadlessEditor} from '@lexical/headless';
import {$generateNodesFromDOM} from '@lexical/html';
import {CalloutNode, $createCalloutNode, $isCalloutNode} from '../../src/index.js';

const editorNodes = [CalloutNode];

describe('CalloutNode', function () {
    let editor: LexicalEditor;
    let dataset: {calloutText: string; calloutEmoji: string; backgroundColor: string};
    let exportOptions: Record<string, unknown>;

    // NOTE: all tests should use this function, without it you need manual
    // try/catch and done handling to avoid assertion failures not triggering
    // failed tests
    const editorTest = (testFn: () => void) => function (done: (err?: unknown) => void) {
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
            calloutText: '<p dir="ltr"><b><strong>Hello!</strong></b><span> Check </span><i><em class="italic">this</em></i> <a href="https://ghost.org" rel="noopener"><span>out</span></a><span>.</span></p>',
            calloutEmoji: '\u{1F4A1}',
            backgroundColor: 'blue'
        };

        exportOptions = {
            exportFormat: 'html',
            dom
        };
    });

    it('can match node with calloutNode', editorTest(function () {
        const node = $createCalloutNode(dataset);
        $isCalloutNode(node).should.be.true();
    }));

    describe('data access', function (){
        it('has getters for all properties', editorTest(function () {
            const node = $createCalloutNode(dataset);
            node.calloutText.should.equal(dataset.calloutText);
            node.calloutEmoji.should.equal(dataset.calloutEmoji);
            node.backgroundColor.should.equal(dataset.backgroundColor);
        }));

        it('has setters for all properties', editorTest(function () {
            const node = $createCalloutNode(dataset);
            node.calloutText = 'new text';
            node.calloutText.should.equal('new text');
            node.backgroundColor = 'red';
            node.backgroundColor.should.equal('red');
            node.calloutEmoji = '\u{1F44D}';
            node.calloutEmoji.should.equal('\u{1F44D}');
        }));

        it('has getDataset() method', editorTest(function () {
            const node = $createCalloutNode(dataset);
            const nodeDataset = node.getDataset();
            nodeDataset.should.deepEqual(dataset);
        }));
    });

    describe('getType', function () {
        it('returns the correct node type', editorTest(function () {
            CalloutNode.getType().should.equal('callout');
        }));
    });

    describe('clone', function () {
        it('returns a copy of the current node', editorTest(function () {
            const calloutNode = $createCalloutNode(dataset);
            const calloutNodeDataset = calloutNode.getDataset();
            const clone = CalloutNode.clone(calloutNode) as CalloutNode;
            const cloneDataset = clone.getDataset();

            cloneDataset.should.deepEqual({...calloutNodeDataset});
        }));
    });

    describe('urlTransformMap', function () {
        it('contains the expected URL mapping', editorTest(function () {
            CalloutNode.urlTransformMap.should.deepEqual({});
        }));
    });

    describe('hasEditMode', function () {
        it('returns true', editorTest(function () {
            const calloutNode = $createCalloutNode(dataset);
            calloutNode.hasEditMode().should.be.true();
        }));
    });

    describe('exportJSON', function () {
        it('contains all data', editorTest(function () {
            const calloutNode = $createCalloutNode(dataset);
            const json = calloutNode.exportJSON();

            json.should.deepEqual({
                type: 'callout',
                version: 1,
                ...dataset
            });
        }));
    });

    describe('exportDOM', function () {
        it('can render to HTML', editorTest(function () {
            const node = $createCalloutNode(dataset);
            const result = node.exportDOM(exportOptions);
            const element = result.element as HTMLElement;
            element.outerHTML.should.prettifyTo(html`
                <div class="kg-card kg-callout-card kg-callout-card-blue">
                    <div class="kg-callout-emoji">\u{1F4A1}</div>
                    <div class="kg-callout-text">
                        <b><strong>Hello!</strong></b
                        >Check<i><em class="italic">this</em></i
                        ><a href="https://ghost.org" rel="noopener">out</a>.
                    </div>
                </div>
                `);
        }));

        it('can render to HTML with no emoji', editorTest(function () {
            const dataset2 = {
                calloutText: '<p dir="ltr"><b><strong>Hello!</strong></b><span> Check </span><i><em class="italic">this</em></i> <a href="https://ghost.org" rel="noopener"><span>out</span></a><span>.</span></p>',
                calloutEmoji: '',
                backgroundColor: 'blue'
            };
            const node = $createCalloutNode(dataset2);
            const result = node.exportDOM(exportOptions);
            const element = result.element as HTMLElement;
            element.outerHTML.should.prettifyTo(html`
                <div class="kg-card kg-callout-card kg-callout-card-blue">
                    <div class="kg-callout-text">
                        <b><strong>Hello!</strong></b
                        >Check<i><em class="italic">this</em></i
                        ><a href="https://ghost.org" rel="noopener">out</a>.
                    </div>
                </div>
                `);
        }));

        it('can render to HTML with invalid backgroundColor', editorTest(function () {
            dataset.backgroundColor = 'rgba(124, 139, 154, 0.13)';

            const node = $createCalloutNode(dataset);
            const result = node.exportDOM(exportOptions);
            const element = result.element as HTMLElement;

            element.outerHTML.should.prettifyTo(html`
                <div class="kg-card kg-callout-card kg-callout-card-white">
                    <div class="kg-callout-emoji">\u{1F4A1}</div>
                    <div class="kg-callout-text">
                        <b><strong>Hello!</strong></b
                        >Check<i><em class="italic">this</em></i
                        ><a href="https://ghost.org" rel="noopener">out</a>.
                    </div>
                </div>
            `);
        }));

        it('can render with inline code', editorTest(function () {
            dataset.calloutText = '<p><span style="white-space: pre-wrap;">Does </span><code spellcheck="false" style="white-space: pre-wrap;"><span>inline code</span></code><span style="white-space: pre-wrap;"> render properly?</span></p>';

            const node = $createCalloutNode(dataset);
            const result = node.exportDOM(exportOptions);
            const element = result.element as HTMLElement;

            element.outerHTML.should.prettifyTo(html`
                <div class="kg-card kg-callout-card kg-callout-card-blue">
                    <div class="kg-callout-emoji">\u{1F4A1}</div>
                    <div class="kg-callout-text">
                        Does <code spellcheck="false" style="white-space: pre-wrap">inline code</code> render properly?
                    </div>
                </div>
            `);
        }));
    });

    describe('importDOM', function () {
        it('parses callout card', editorTest(function () {
            const document = createDocument(html`
                <div class="kg-card kg-callout-card kg-callout-card-red">
                    <div class="kg-callout-emoji">\u{1F4A1}</div>
                    <div class="kg-callout-text">This is a callout</div>
                </div>
            `);
            const nodes = $generateNodesFromDOM(editor, document) as CalloutNode[];
            nodes.length.should.equal(1);
            nodes[0].backgroundColor.should.equal('red');
            nodes[0].calloutText.should.equal('This is a callout');
            nodes[0].calloutEmoji.should.equal('\u{1F4A1}');
        }));

        it('parses callout card with no emoji', editorTest(function () {
            const document = createDocument(html`
                <div class="kg-card kg-callout-card kg-callout-card-red">
                    <div class="kg-callout-text">This is a callout</div>
                </div>
            `);
            const nodes = $generateNodesFromDOM(editor, document) as CalloutNode[];
            nodes.length.should.equal(1);
            nodes[0].backgroundColor.should.equal('red');
            nodes[0].calloutText.should.equal('This is a callout');
            nodes[0].calloutEmoji.should.equal('');
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
                    const [calloutNode] = $getRoot().getChildren() as CalloutNode[];
                    calloutNode.calloutText.should.equal(dataset.calloutText);
                    calloutNode.calloutEmoji.should.equal(dataset.calloutEmoji);
                    calloutNode.backgroundColor.should.equal(dataset.backgroundColor);
                    done();
                } catch (e) {
                    done(e);
                }
            });
        });
    });

    describe('getTextContent', function () {
        it('returns contents', editorTest(function () {
            const node = $createCalloutNode();
            node.getTextContent().should.equal('');

            node.calloutText = 'Test';

            node.getTextContent().should.equal('Test\n\n');
        }));
    });
});
