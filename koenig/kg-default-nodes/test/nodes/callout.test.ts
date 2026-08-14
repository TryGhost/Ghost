import {assertPrettifiesTo, createDocument, dom, html} from '../test-utils/index.js';
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
    const editorTest = (testFn: () => void) => () => new Promise<void>((resolve, reject) => {
        editor.update(() => {
            try {
                testFn();
                resolve();
            } catch (e) {
                reject(e);
            }
        });
    });

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
        expect($isCalloutNode(node)).toBe(true);
    }));

    describe('data access', function (){
        it('has getters for all properties', editorTest(function () {
            const node = $createCalloutNode(dataset);
            expect(node.calloutText).toBe(dataset.calloutText);
            expect(node.calloutEmoji).toBe(dataset.calloutEmoji);
            expect(node.backgroundColor).toBe(dataset.backgroundColor);
        }));

        it('has setters for all properties', editorTest(function () {
            const node = $createCalloutNode(dataset);
            node.calloutText = 'new text';
            expect(node.calloutText).toBe('new text');
            node.backgroundColor = 'red';
            expect(node.backgroundColor).toBe('red');
            node.calloutEmoji = '\u{1F44D}';
            expect(node.calloutEmoji).toBe('\u{1F44D}');
        }));

        it('has getDataset() method', editorTest(function () {
            const node = $createCalloutNode(dataset);
            const nodeDataset = node.getDataset();
            expect(nodeDataset).toEqual(dataset);
        }));
    });

    describe('getType', function () {
        it('returns the correct node type', editorTest(function () {
            expect(CalloutNode.getType()).toBe('callout');
        }));
    });

    describe('clone', function () {
        it('returns a copy of the current node', editorTest(function () {
            const calloutNode = $createCalloutNode(dataset);
            const calloutNodeDataset = calloutNode.getDataset();
            const clone = CalloutNode.clone(calloutNode) as CalloutNode;
            const cloneDataset = clone.getDataset();

            expect(cloneDataset).toEqual({...calloutNodeDataset});
        }));
    });

    describe('urlTransformMap', function () {
        it('contains the expected URL mapping', editorTest(function () {
            expect(CalloutNode.urlTransformMap).toEqual({});
        }));
    });

    describe('hasEditMode', function () {
        it('returns true', editorTest(function () {
            const calloutNode = $createCalloutNode(dataset);
            expect(calloutNode.hasEditMode()).toBe(true);
        }));
    });

    describe('exportJSON', function () {
        it('contains all data', editorTest(function () {
            const calloutNode = $createCalloutNode(dataset);
            const json = calloutNode.exportJSON();

            expect(json).toEqual({
                type: 'callout',
                version: 1,
                ...dataset
            });
        }));
    });

    describe('exportDOM', function () {
        it('can render to HTML', editorTest(function () {
            const node = $createCalloutNode(dataset);
            const result = node.exportDOM(editor, exportOptions);
            const element = result.element as HTMLElement;
            assertPrettifiesTo(element.outerHTML, html`
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
            expect(nodes.length).toBe(1);
            expect(nodes[0].backgroundColor).toBe('red');
            expect(nodes[0].calloutText).toBe('This is a callout');
            expect(nodes[0].calloutEmoji).toBe('\u{1F4A1}');
        }));

        it('parses callout card with no emoji', editorTest(function () {
            const document = createDocument(html`
                <div class="kg-card kg-callout-card kg-callout-card-red">
                    <div class="kg-callout-text">This is a callout</div>
                </div>
            `);
            const nodes = $generateNodesFromDOM(editor, document) as CalloutNode[];
            expect(nodes.length).toBe(1);
            expect(nodes[0].backgroundColor).toBe('red');
            expect(nodes[0].calloutText).toBe('This is a callout');
            expect(nodes[0].calloutEmoji).toBe('');
        }));
    });

    describe('importJSON', function () {
        it('imports all data', function () {
            return new Promise<void>((resolve, reject) => {
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
                        expect(calloutNode.calloutText).toBe(dataset.calloutText);
                        expect(calloutNode.calloutEmoji).toBe(dataset.calloutEmoji);
                        expect(calloutNode.backgroundColor).toBe(dataset.backgroundColor);
                        resolve();
                    } catch (e) {
                        reject(e);
                    }
                });
            });
        });
    });

    describe('getTextContent', function () {
        it('returns contents', editorTest(function () {
            const node = $createCalloutNode();
            expect(node.getTextContent()).toBe('');

            node.calloutText = 'Test';

            expect(node.getTextContent()).toBe('Test\n\n');
        }));
    });
});
