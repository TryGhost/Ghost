import {assertPrettifiesTo, createDocument, dom, html} from '../test-utils/index.js';
import {$getRoot} from 'lexical';
import type {LexicalEditor} from 'lexical';
import {createHeadlessEditor} from '@lexical/headless';
import {$generateNodesFromDOM} from '@lexical/html';

import {ButtonNode, $createButtonNode, $isButtonNode} from '../../src/index.js';

const editorNodes = [ButtonNode];

describe('ButtonNode', function () {
    let editor: LexicalEditor;
    let dataset: {buttonText: string; buttonUrl: string; alignment: string};
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
        editor = createHeadlessEditor({nodes: editorNodes});
        dataset = {
            buttonText: 'click me',
            buttonUrl: 'http://blog.com/post1',
            alignment: 'center'
        };
        exportOptions = {
            dom
        };
    });

    it('matches node with $isButtonNode', editorTest(function () {
        const buttonNode = $createButtonNode(dataset);
        expect($isButtonNode(buttonNode)).toBe(true);
    }));

    describe('data access', function () {
        it('has getters for all properties', editorTest(function () {
            const buttonNode = $createButtonNode(dataset);

            expect(buttonNode.buttonUrl).toBe(dataset.buttonUrl);
            expect(buttonNode.buttonText).toBe(dataset.buttonText);
            expect(buttonNode.alignment).toBe(dataset.alignment);
        }));

        it('has setters for all properties', editorTest(function () {
            const buttonNode = $createButtonNode();

            expect(buttonNode.buttonUrl).toBe('');
            buttonNode.buttonUrl = 'http://someblog.com/somepost';
            expect(buttonNode.buttonUrl).toBe('http://someblog.com/somepost');

            expect(buttonNode.buttonText).toBe('');
            buttonNode.buttonText = 'button text';
            expect(buttonNode.buttonText).toBe('button text');

            expect(buttonNode.alignment).toBe('center');
            buttonNode.alignment = 'left';
            expect(buttonNode.alignment).toBe('left');
        }));

        it('has getDataset() convenience method', editorTest(function () {
            const buttonNode = $createButtonNode(dataset);
            const buttonNodeDataset = buttonNode.getDataset();

            expect(buttonNodeDataset).toEqual({
                ...dataset
            });
        }));
    });

    describe('getType', function () {
        it('returns the correct node type', editorTest(function () {
            expect(ButtonNode.getType()).toBe('button');
        }));
    });

    describe('clone', function () {
        it('returns a copy of the current node', editorTest(function () {
            const buttonNode = $createButtonNode(dataset);
            const buttonNodeDataset = buttonNode.getDataset();
            const clone = ButtonNode.clone(buttonNode) as ButtonNode;
            const cloneDataset = clone.getDataset();

            expect(cloneDataset).toEqual({...buttonNodeDataset});
        }));
    });

    describe('urlTransformMap', function () {
        it('contains the expected URL mapping', editorTest(function () {
            expect(ButtonNode.urlTransformMap).toEqual({
                buttonUrl: 'url'
            });
        }));
    });

    describe('hasEditMode', function () {
        it('returns true', editorTest(function () {
            const buttonNode = $createButtonNode(dataset);
            expect(buttonNode.hasEditMode()).toBe(true);
        }));
    });

    describe('exportDOM', function () {
        it('creates a button card', editorTest(function () {
            const buttonNode = $createButtonNode(dataset);
            const result = buttonNode.exportDOM(editor, exportOptions);
            const element = result.element as HTMLElement;

            assertPrettifiesTo(element.outerHTML, html`<div class="kg-card kg-button-card kg-align-center"><a href="http://blog.com/post1" class="kg-btn kg-btn-accent">click me</a></div>`);
        }));

        it('renders for email target', editorTest(function () {
            const buttonNode = $createButtonNode(dataset);
            const options = {
                target: 'email'
            };
            const result = buttonNode.exportDOM(editor, {...exportOptions, ...options});
            const element = result.element as HTMLElement;
            const output = element.innerHTML;

            assertPrettifiesTo(output, html`
                <table class="kg-card kg-button-card" border="0" cellpadding="0" cellspacing="0">
                    <tbody>
                        <tr>
                            <td class="kg-card-spacing">
                                <table class="btn" border="0" cellspacing="0" cellpadding="0" align="center">
                                    <tbody>
                                        <tr>
                                            <td align="center">
                                                <a href="http://blog.com/post1">click me</a>
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </td>
                        </tr>
                    </tbody>
                </table>
            `);
        }));
    });

    describe('exportJSON', function () {
        it('contains all data', editorTest(function () {
            const buttonNode = $createButtonNode(dataset);
            const json = buttonNode.exportJSON();

            expect(json).toEqual({
                type: 'button',
                version: 1,
                buttonUrl: dataset.buttonUrl,
                buttonText: dataset.buttonText,
                alignment: dataset.alignment
            });
        }));
    });

    describe('importJSON', function () {
        it('imports all data', function () {
            return new Promise<void>((resolve, reject) => {
                const serializedState = JSON.stringify({
                    root: {
                        children: [{
                            type: 'button',
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
                        const [buttonNode] = $getRoot().getChildren() as ButtonNode[];

                        expect(buttonNode.buttonUrl).toBe(dataset.buttonUrl);
                        expect(buttonNode.buttonText).toBe(dataset.buttonText);
                        expect(buttonNode.alignment).toBe(dataset.alignment);

                        resolve();
                    } catch (e) {
                        reject(e);
                    }
                });
            });
        });
    });

    describe('static properties', function () {
        it('getType', editorTest(function () {
            expect(ButtonNode.getType()).toBe('button');
        }));

        it('urlTransformMap', editorTest(function () {
            expect(ButtonNode.urlTransformMap).toEqual({
                buttonUrl: 'url'
            });
        }));
    });

    describe('importDOM', function () {
        it('parses button card', editorTest(function () {
            const document = createDocument(html`
                <div class="kg-card kg-button-card kg-align-center"><a href="http://someblog.com/somepost" class="kg-btn kg-btn-accent">click me</a></div>
            `);
            const nodes = $generateNodesFromDOM(editor, document) as ButtonNode[];
            expect(nodes.length).toBe(1);
            expect(nodes[0].buttonUrl).toBe('http://someblog.com/somepost');
            expect(nodes[0].buttonText).toBe('click me');
            expect(nodes[0].alignment).toBe('center');
        }));

        it('preserves relative urls in content', editorTest(function () {
            const document = createDocument(html`
                <div class="kg-card kg-button-card kg-align-center">
                    <a href="#/portal/signup" class="kg-btn kg-btn-accent">Subscribe 1</a>
                </div>
            `);
            const nodes = $generateNodesFromDOM(editor, document) as ButtonNode[];
            expect(nodes.length).toBe(1);
            expect(nodes[0].buttonUrl).toBe('#/portal/signup');
            expect(nodes[0].buttonText).toBe('Subscribe 1');
            expect(nodes[0].alignment).toBe('center');
        }));
    });

    describe('getTextContent', function () {
        it('returns contents', editorTest(function () {
            const node = $createButtonNode();
            node.buttonText = 'Testing';
            node.buttonUrl = 'http://someblog.com/somepost';

            // button nodes don't have text content
            expect(node.getTextContent()).toBe('');
        }));
    });
});
