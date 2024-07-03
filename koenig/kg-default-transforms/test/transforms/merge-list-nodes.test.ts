import {LexicalEditor} from 'lexical';
import {assertTransform, createEditor} from '../utils';
import {ListNode} from '@lexical/list';

// Since Lexical 0.14.3 the default List nodes have a built-in transform
// for merging adjacent lists. This test has been kept as a regression test.

describe('Merge adjacent lists transform', function () {
    it('handles adjacent ULs', function () {
        const before = {
            root: {
                children: [
                    {
                        children: [
                            {
                                children: [
                                    {
                                        detail: 0,
                                        format: 0,
                                        mode: 'normal',
                                        style: '',
                                        text: 'one',
                                        type: 'extended-text',
                                        version: 1
                                    }
                                ],
                                direction: 'ltr',
                                format: '',
                                indent: 0,
                                type: 'listitem',
                                version: 1,
                                value: 1
                            }
                        ],
                        direction: 'ltr',
                        format: '',
                        indent: 0,
                        type: 'list',
                        version: 1,
                        listType: 'bullet',
                        start: 1,
                        tag: 'ul'
                    },
                    {
                        children: [
                            {
                                children: [
                                    {
                                        detail: 0,
                                        format: 0,
                                        mode: 'normal',
                                        style: '',
                                        text: 'two',
                                        type: 'extended-text',
                                        version: 1
                                    }
                                ],
                                direction: 'ltr',
                                format: '',
                                indent: 0,
                                type: 'listitem',
                                version: 1,
                                value: 1
                            }
                        ],
                        direction: 'ltr',
                        format: '',
                        indent: 0,
                        type: 'list',
                        version: 1,
                        listType: 'bullet',
                        start: 1,
                        tag: 'ul'
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
                                checked: undefined,
                                children: [
                                    {
                                        detail: 0,
                                        format: 0,
                                        mode: 'normal',
                                        style: '',
                                        text: 'one',
                                        type: 'extended-text',
                                        version: 1
                                    }
                                ],
                                direction: 'ltr',
                                format: '',
                                indent: 0,
                                type: 'listitem',
                                version: 1,
                                value: 1
                            },
                            {
                                checked: undefined,
                                children: [
                                    {
                                        detail: 0,
                                        format: 0,
                                        mode: 'normal',
                                        style: '',
                                        text: 'two',
                                        type: 'extended-text',
                                        version: 1
                                    }
                                ],
                                direction: 'ltr',
                                format: '',
                                indent: 0,
                                type: 'listitem',
                                version: 1,
                                value: 2
                            }
                        ],
                        direction: 'ltr',
                        format: '',
                        indent: 0,
                        type: 'list',
                        version: 1,
                        listType: 'bullet',
                        start: 1,
                        tag: 'ul'
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
            // We still need to perform a registration to trigger core transforms
            editor.registerNodeTransform(ListNode, () => {});
        };

        const editor = createEditor();

        assertTransform(editor, registerTransforms, before, after);
    });
});
