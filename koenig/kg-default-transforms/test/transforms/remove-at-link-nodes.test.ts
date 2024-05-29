import {LexicalEditor, ParagraphNode, TextNode} from 'lexical';
import {registerRemoveAtLinkNodesTransform} from '../../build';
import {assertTransform, createEditor} from '../utils';
import {AtLinkNode, AtLinkSearchNode, ZWNJNode} from '@tryghost/kg-default-nodes';

const nodes = [AtLinkNode, AtLinkSearchNode, ZWNJNode, TextNode, ParagraphNode];

describe('Remove AtLink nodes transform', function () {
    it('removes when only node in paragraph', function () {
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
                                        text: '',
                                        type: 'zwnj',
                                        version: 1
                                    },
                                    {
                                        detail: 0,
                                        format: 0,
                                        mode: 'normal',
                                        style: '',
                                        text: 'test',
                                        type: 'at-link-search',
                                        version: 1,
                                        placeholder: null
                                    }
                                ],
                                direction: 'ltr',
                                format: '',
                                indent: 0,
                                type: 'at-link',
                                version: 1,
                                linkFormat: 0
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

        const after = {
            root: {
                children: [
                    {
                        children: [],
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
            registerRemoveAtLinkNodesTransform(editor);
        };

        const editor = createEditor({nodes});

        assertTransform(editor, registerTransforms, before, after);
    });

    it('removes when at start of paragraph', function () {
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
                                        text: '',
                                        type: 'zwnj',
                                        version: 1
                                    },
                                    {
                                        detail: 0,
                                        format: 0,
                                        mode: 'normal',
                                        style: '',
                                        text: 'test',
                                        type: 'at-link-search',
                                        version: 1,
                                        placeholder: null
                                    }
                                ],
                                direction: 'ltr',
                                format: '',
                                indent: 0,
                                type: 'at-link',
                                version: 1,
                                linkFormat: 0
                            },
                            {
                                detail: 0,
                                format: 0,
                                mode: 'normal',
                                style: '',
                                text: ' After',
                                type: 'text',
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
                                text: 'After',
                                type: 'text',
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
            registerRemoveAtLinkNodesTransform(editor);
        };

        const editor = createEditor({nodes});

        assertTransform(editor, registerTransforms, before, after);
    });

    it('removes when at end of paragraph', function () {
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
                                text: 'Before ',
                                type: 'text',
                                version: 1
                            },
                            {
                                children: [
                                    {
                                        detail: 0,
                                        format: 0,
                                        mode: 'normal',
                                        style: '',
                                        text: '',
                                        type: 'zwnj',
                                        version: 1
                                    },
                                    {
                                        detail: 0,
                                        format: 0,
                                        mode: 'normal',
                                        style: '',
                                        text: 'test',
                                        type: 'at-link-search',
                                        version: 1,
                                        placeholder: null
                                    }
                                ],
                                direction: 'ltr',
                                format: '',
                                indent: 0,
                                type: 'at-link',
                                version: 1,
                                linkFormat: 0
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
                                text: 'Before',
                                type: 'text',
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
            registerRemoveAtLinkNodesTransform(editor);
        };

        const editor = createEditor({nodes});

        assertTransform(editor, registerTransforms, before, after);
    });

    it('removes when surrounded by text', function () {
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
                                text: 'Testing Before ',
                                type: 'text',
                                version: 1
                            },
                            {
                                children: [
                                    {
                                        detail: 0,
                                        format: 0,
                                        mode: 'normal',
                                        style: '',
                                        text: '',
                                        type: 'zwnj',
                                        version: 1
                                    },
                                    {
                                        detail: 0,
                                        format: 0,
                                        mode: 'normal',
                                        style: '',
                                        text: 'search',
                                        type: 'at-link-search',
                                        version: 1,
                                        placeholder: null
                                    }
                                ],
                                direction: 'ltr',
                                format: '',
                                indent: 0,
                                type: 'at-link',
                                version: 1,
                                linkFormat: 0
                            },
                            {
                                detail: 0,
                                format: 0,
                                mode: 'normal',
                                style: '',
                                text: ' After',
                                type: 'text',
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
                                text: 'Testing Before After',
                                type: 'text',
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
            registerRemoveAtLinkNodesTransform(editor);
        };

        const editor = createEditor({nodes});

        assertTransform(editor, registerTransforms, before, after);
    });

    it('can register without node loaded in editor', function () {
        const registerTransforms = (editor: LexicalEditor) => {
            registerRemoveAtLinkNodesTransform(editor);
        };

        const editor = createEditor({nodes: []});

        registerTransforms(editor);
        editor.update(() => {}, {discrete: true});
    });
});
