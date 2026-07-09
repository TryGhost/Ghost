import {assertPrettifiesTo, createDocument, dom, html} from '../test-utils/index.js';
import {$getRoot} from 'lexical';
import {createHeadlessEditor} from '@lexical/headless';
import {$generateNodesFromDOM} from '@lexical/html';
import {HorizontalRuleNode, $createHorizontalRuleNode, $isHorizontalRuleNode} from '../../src/index.js';
import type {LexicalEditor} from 'lexical';

const editorNodes = [HorizontalRuleNode];

describe('HorizontalNode', function () {
    let editor: LexicalEditor;
    let dataset: Record<string, unknown>;
    let exportOptions: {dom: typeof dom};

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
        editor = createHeadlessEditor({nodes: editorNodes});

        dataset = {};

        exportOptions = {
            dom
        };
    });

    it('matches node with $isHorizontalRuleNode', editorTest(function () {
        const hrNode = $createHorizontalRuleNode();
        expect($isHorizontalRuleNode(hrNode)).toBe(true);
    }));

    describe('exportDOM', function () {
        it('creates hr element', editorTest(function () {
            const hrNode = $createHorizontalRuleNode();
            const result = hrNode.exportDOM(editor, exportOptions);

            expect((result as unknown as {type?: string}).type!).toBe('inner');
            assertPrettifiesTo((result.element as HTMLElement).innerHTML, html`
                <hr />
            `);
        }));
    });

    describe('importDOM', function () {
        it('parses an hr element', editorTest(function () {
            const document = createDocument(html`
                <hr />
            `);
            const nodes = $generateNodesFromDOM(editor, document);

            expect(nodes.length).toBe(1);
            expect(nodes[0]).toBeInstanceOf(HorizontalRuleNode);
        }));
    });

    describe('exportJSON', function () {
        it('contains all data', editorTest(function () {
            dataset.cardWidth = 'wide';

            const asideNode = $createHorizontalRuleNode();
            const json = asideNode.exportJSON();

            expect(json).toEqual({
                type: 'horizontalrule',
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
                        expect(hrNode).toBeInstanceOf(HorizontalRuleNode);

                        resolve();
                    } catch (e) {
                        reject(e);
                    }
                });
            });
        });
    });

    describe('getTextContent', function () {
        it('returns plaintext representation', editorTest(function () {
            const node = $createHorizontalRuleNode();
            expect(node.getTextContent()).toBe('---\n\n');
        }));
    });

    describe('getIsVisibilityActive', function () {
        it('returns false (has no visibility property)', editorTest(function () {
            const node = $createHorizontalRuleNode();
            expect(node.getIsVisibilityActive()).toBe(false);
        }));
    });
});
