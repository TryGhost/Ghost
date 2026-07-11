import {createDocument, html} from '../test-utils/index.js';
import {$getRoot, $createParagraphNode, $createTextNode} from 'lexical';
import {createHeadlessEditor} from '@lexical/headless';
import {$generateNodesFromDOM} from '@lexical/html';
import {AsideNode, $createAsideNode, $isAsideNode} from '../../src/index.js';
import type {LexicalEditor} from 'lexical';

const editorNodes = [AsideNode];

describe('AsideNode', function () {
    let editor: LexicalEditor;

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
    });

    it('matches node with $isAsideNode', editorTest(function () {
        const asideNode = $createAsideNode();
        expect($isAsideNode(asideNode)).toBe(true);
    }));

    describe('importDOM', function () {
        it('parses an aside element', editorTest(function () {
            const document = createDocument(html`
                <blockquote class="kg-blockquote-alt">Hello</blockquote>
            `);
            const nodes = $generateNodesFromDOM(editor, document);

            expect(nodes.length).toBe(1);
            expect(nodes[0]).toBeInstanceOf(AsideNode);
        }));
    });

    describe('exportJSON', function () {
        it('contains all data', editorTest(function () {
            const asideNode = $createAsideNode();
            const json = asideNode.exportJSON();

            expect(json).toEqual({
                type: 'aside',
                version: 1,
                children: [],
                direction: null,
                format: '',
                indent: 0
            });
        }));
    });

    describe('importJSON', function () {
        it('imports all data', function () {
            return new Promise<void>((resolve, reject) => {
                const serializedState = JSON.stringify({
                    root: {
                        children: [{
                            type: 'aside'
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
                        const [asideNode] = $getRoot().getChildren();
                        expect(asideNode).toBeInstanceOf(AsideNode);

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
            const node = $createAsideNode();
            expect(node.getTextContent()).toBe('');

            const paragraph = $createParagraphNode();
            paragraph.append($createTextNode('Hello'));

            node.append(paragraph);

            expect(node.getTextContent()).toBe('Hello');
        }));
    });
});
