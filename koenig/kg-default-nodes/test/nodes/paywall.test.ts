import {createHeadlessEditor} from '@lexical/headless';
import {$getRoot} from 'lexical';
import {createDocument, dom, html} from '../test-utils/index.js';
import {PaywallNode, $createPaywallNode, $isPaywallNode, type ExportDOMOptions} from '../../src/index.js';
import {$generateNodesFromDOM} from '@lexical/html';
import type {LexicalEditor} from 'lexical';

const editorNodes = [PaywallNode];

function getHTMLElement(element: HTMLElement | Text | null): HTMLElement {
    if (!element || !('innerHTML' in element)) {
        throw new Error('Expected exportDOM to return an HTMLElement');
    }

    return element as HTMLElement;
}

describe('PaywallNode', function () {
    let editor: LexicalEditor;
    let dataset: Record<string, unknown>;
    let exportOptions: ExportDOMOptions;

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

        dataset = {};

        exportOptions = {
            exportFormat: 'html',
            dom
        };
    });

    it('matches node with $isPaywallNode', editorTest(function () {
        const paywallNode = $createPaywallNode(dataset);
        expect($isPaywallNode(paywallNode)).toBe(true);
    }));

    describe('exportJSON', function () {
        it('contains all data', editorTest(function () {
            const paywallNode = $createPaywallNode(dataset);
            const json = paywallNode.exportJSON();

            expect(json).toEqual({
                type: 'paywall',
                version: 1
            });
        }));
    });

    describe('importJSON', function () {
        it('imports all data', function () {
            return new Promise<void>((resolve, reject) => {
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
                        expect(paywallNode).toBeInstanceOf(PaywallNode);

                        resolve();
                    } catch (e) {
                        reject(e);
                    }
                });
            });
        });
    });

    describe('exportDOM', function () {
        it('renders a paywall node', editorTest(function () {
            const paywallNode = $createPaywallNode(dataset);
            const {element, type} = paywallNode.exportDOM(editor, exportOptions);

            expect(type).toBe('inner');
            expect(getHTMLElement(element).innerHTML).toBe('<!--members-only-->');
        }));
    });

    describe('importDOM', function () {
        it('parses a paywall node', editorTest(function () {
            const document = createDocument(html`
                <span><!--members-only--></span>
            `);
            const nodes = $generateNodesFromDOM(editor, document);

            expect(nodes.length).toBe(1);
            expect(nodes[0]).toBeInstanceOf(PaywallNode);
        }));
    });

    describe('getTextContent', function () {
        it('returns contents', editorTest(function () {
            const node = $createPaywallNode(dataset);

            // paywall nodes don't have text content
            expect(node.getTextContent()).toBe('');
        }));
    });
});
