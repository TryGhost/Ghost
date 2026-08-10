import {createHeadlessEditor} from '@lexical/headless';
import {TKNode, $createTKNode, $isTKNode} from '../../src/index.js';
import {$getRoot} from 'lexical';
import type {ElementNode, LexicalEditor} from 'lexical';

const editorNodes = [TKNode];

describe('TKNode', function () {
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

    it('matches node with $isTKNode', editorTest(function () {
        const tkNode = $createTKNode('TK');
        expect($isTKNode(tkNode)).toBe(true);
    }));

    it('is a text entity', editorTest(function () {
        const tkNode = $createTKNode('TK');
        expect((tkNode as TKNode).isTextEntity()).toBe(true);
    }));

    it('can not insert text before', editorTest(function () {
        const tkNode = $createTKNode('TK');
        expect((tkNode as TKNode).canInsertTextBefore()).toBe(false);
    }));

    describe('exportJSON', function () {
        it('contains all data', editorTest(function () {
            const tkNode = $createTKNode('TK');
            const json = tkNode.exportJSON();

            expect(json).toEqual({
                detail: 0,
                format: 0,
                mode: 'normal',
                style: '',
                type: 'tk',
                version: 1,
                text: 'TK'
            });
        }));
    });

    describe('importJSON', function () {
        it('imports all data', function () {
            return new Promise<void>((resolve, reject) => {
                const serializedState = JSON.stringify({
                    root: {
                        children: [
                            {
                                children: [
                                    {
                                        detail: 0,
                                        format: 0,
                                        mode: 'normal',
                                        style: '',
                                        text: 'TK',
                                        type: 'tk',
                                        version: 1
                                    }
                                ],
                                direction: 'ltr',
                                format: '',
                                indent: 0,
                                type: 'paragraph',
                                version: 1
                            }
                        ],
                        direction: 'ltr',
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
                        const [tkNode] = $getRoot().getChildren();
                        expect((tkNode as ElementNode).getChildren()[0]).toBeInstanceOf(TKNode);

                        resolve();
                    } catch (e) {
                        reject(e);
                    }
                });
            });
        });
    });

    it('can clone', editorTest(function () {
        const tkNode = $createTKNode('TK');
        const clonedNode = TKNode.clone(tkNode as TKNode);

        expect(clonedNode).not.toBe(tkNode);
        expect(clonedNode.getTextContent()).toBe(tkNode.getTextContent());
    }));
});
