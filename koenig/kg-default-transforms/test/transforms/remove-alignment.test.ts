import {LexicalEditor, ParagraphNode, TextNode} from 'lexical';
import {registerRemoveAlignmentTransform} from '../../build';
import {assertTransform, createEditor} from '../utils';
import {HeadingNode} from '@lexical/rich-text';

describe('Remove element alignment transform', function () {
    it('strips paragraph text-align', function () {
        const before = {
            root: {
                children: [
                    {
                        children: [
                            {
                                detail: 0,
                                format: 0,
                                mode: 'normal',
                                style: '',
                                text: 'Normal',
                                type: 'extended-text',
                                version: 1
                            }
                        ],
                        direction: 'ltr',
                        format: 'center',
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
        };

        const after = {
            root: {
                children: [
                    {
                        children: [
                            {
                                detail: 0,
                                format: 0,
                                mode: 'normal',
                                style: '',
                                text: 'Normal',
                                type: 'extended-text',
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
        };

        const registerTransforms = (editor: LexicalEditor) => {
            registerRemoveAlignmentTransform(editor, ParagraphNode);
        };

        const editor = createEditor();

        assertTransform(editor, registerTransforms, before, after);
    });

    it('handles being called for a node that isn\'t registered in the editor', function () {
        const unchangedState = {
            root: {
                children: [
                    {
                        children: [
                            {
                                detail: 0,
                                format: 0,
                                mode: 'normal',
                                style: '',
                                text: 'Normal',
                                type: 'text',
                                version: 1
                            }
                        ],
                        direction: 'ltr',
                        format: 'center',
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
        };

        const registerTransforms = (editor: LexicalEditor) => {
            registerRemoveAlignmentTransform(editor, HeadingNode);
        };

        const editor = createEditor({nodes: [ParagraphNode, TextNode]});

        assertTransform(editor, registerTransforms, unchangedState, unchangedState);
    });
});
