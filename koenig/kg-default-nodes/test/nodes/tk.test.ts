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
        editor = createHeadlessEditor({nodes: editorNodes});
    });

    it('matches node with $isTKNode', editorTest(function () {
        const tkNode = $createTKNode('TK');
        $isTKNode(tkNode).should.be.true();
    }));

    it('is a text entity', editorTest(function () {
        const tkNode = $createTKNode('TK');
        (tkNode as TKNode).isTextEntity().should.be.true();
    }));

    it('can not insert text before', editorTest(function () {
        const tkNode = $createTKNode('TK');
        (tkNode as TKNode).canInsertTextBefore().should.be.false();
    }));

    describe('exportJSON', function () {
        it('contains all data', editorTest(function () {
            const tkNode = $createTKNode('TK');
            const json = tkNode.exportJSON();

            json.should.deepEqual({
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
        it('imports all data', function (done) {
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
                    (tkNode as ElementNode).getChildren()[0].should.be.instanceof(TKNode);

                    done();
                } catch (e) {
                    done(e);
                }
            });
        });
    });

    it('can clone', editorTest(function () {
        const tkNode = $createTKNode('TK');
        const clonedNode = TKNode.clone(tkNode as TKNode);

        clonedNode.should.not.equal(tkNode);
        clonedNode.getTextContent().should.equal(tkNode.getTextContent());
    }));
});
