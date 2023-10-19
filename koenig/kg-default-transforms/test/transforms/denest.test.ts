import {assertTransform, createEditor} from '../utils';
import {$createParagraphNode, LexicalEditor, ParagraphNode, TextNode} from 'lexical';
import {ImageNode} from '@tryghost/kg-default-nodes';
import {registerDenestTransform} from '../../';
import {$createListItemNode, $createListNode, ListItemNode, ListNode} from '@lexical/list';
import {$createHeadingNode, HeadingNode} from '@lexical/rich-text';

describe('Denest transform', function () {
    it('handles images inside paragraphs', function () {
        const registerTransforms = (editor: LexicalEditor) => {
            registerDenestTransform(editor, ParagraphNode, () => ($createParagraphNode()));
        };

        // invalid state with image inside paragraph
        const before = {
            root: {
                children: [
                    {
                        children: [
                            {
                                type: 'image',
                                version: 1,
                                src: 'blob:https://koenig.ghost.org/aafa977a-7cc3-44fc-96ca-f7befd38343a',
                                width: 1240,
                                height: 744,
                                title: '',
                                alt: '',
                                caption: '',
                                cardWidth: 'regular',
                                href: ''
                            }
                        ],
                        direction: null,
                        format: '',
                        indent: 0,
                        type: 'paragraph',
                        version: 1
                    }
                ],
                direction: null,
                format: '',
                indent: 0,
                type: 'root',
                version: 1
            }
        };

        // image pulled out to top-level
        const after = {
            root: {
                children: [
                    {
                        type: 'image',
                        version: 1,
                        src: 'blob:https://koenig.ghost.org/aafa977a-7cc3-44fc-96ca-f7befd38343a',
                        width: 1240,
                        height: 744,
                        title: '',
                        alt: '',
                        caption: '',
                        cardWidth: 'regular',
                        href: ''
                    }
                ],
                direction: null,
                format: '',
                indent: 0,
                type: 'root',
                version: 1
            }
        };

        const editor = createEditor();

        assertTransform(editor, registerTransforms, before, after);
    });

    it('handles images inside lists', function () {
        const registerTransforms = (editor: LexicalEditor) => {
            registerDenestTransform(editor, ListNode, node => ($createListNode(node.getListType(), node.getStart())));
            registerDenestTransform(editor, ListItemNode, () => ($createListItemNode()));
        };

        // invalid state with image inside paragraph
        const before = {
            root: {
                children: [
                    {
                        children: [
                            {
                                children: [
                                    {
                                        type: 'image',
                                        version: 1,
                                        src: 'blob:https://koenig.ghost.org/aafa977a-7cc3-44fc-96ca-f7befd38343a',
                                        width: 1240,
                                        height: 744,
                                        title: '',
                                        alt: '',
                                        caption: '',
                                        cardWidth: 'regular',
                                        href: ''
                                    }
                                ],
                                direction: null,
                                format: '',
                                indent: 0,
                                type: 'listitem',
                                version: 1,
                                value: 1
                            }
                        ],
                        direction: null,
                        format: '',
                        indent: 0,
                        type: 'list',
                        version: 1,
                        listType: 'bullet',
                        start: 1,
                        tag: 'ul'
                    }
                ],
                direction: null,
                format: '',
                indent: 0,
                type: 'root',
                version: 1
            }
        };

        // image pulled out to top-level
        const after = {
            root: {
                children: [
                    {
                        type: 'image',
                        version: 1,
                        src: 'blob:https://koenig.ghost.org/aafa977a-7cc3-44fc-96ca-f7befd38343a',
                        width: 1240,
                        height: 744,
                        title: '',
                        alt: '',
                        caption: '',
                        cardWidth: 'regular',
                        href: ''
                    }
                ],
                direction: null,
                format: '',
                indent: 0,
                type: 'root',
                version: 1
            }
        };

        const editor = createEditor({nodes: [ListNode, ListItemNode, ImageNode as any]});

        assertTransform(editor, registerTransforms, before, after);
    });

    it('handles images inside nested lists', function () {
        const registerTransforms = (editor: LexicalEditor) => {
            registerDenestTransform(editor, ListNode, node => ($createListNode(node.getListType(), node.getStart())));
            registerDenestTransform(editor, ListItemNode, () => ($createListItemNode()));
        };

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
                                        text: 'top-level',
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
                                                        text: 'nested',
                                                        type: 'extended-text',
                                                        version: 1
                                                    }
                                                ],
                                                direction: 'ltr',
                                                format: '',
                                                indent: 1,
                                                type: 'listitem',
                                                version: 1,
                                                value: 1
                                            },
                                            {
                                                children: [
                                                    {
                                                        type: 'image',
                                                        version: 1,
                                                        src: 'blob:https://koenig.ghost.org/aafa977a-7cc3-44fc-96ca-f7befd38343a',
                                                        width: 1240,
                                                        height: 744,
                                                        title: '',
                                                        alt: '',
                                                        caption: '',
                                                        cardWidth: 'regular',
                                                        href: ''
                                                    }
                                                ],
                                                direction: null,
                                                format: '',
                                                indent: 1,
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
                                        text: 'top-level',
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
                                        children: [
                                            {
                                                checked: undefined,
                                                children: [
                                                    {
                                                        detail: 0,
                                                        format: 0,
                                                        mode: 'normal',
                                                        style: '',
                                                        text: 'nested',
                                                        type: 'extended-text',
                                                        version: 1
                                                    }
                                                ],
                                                direction: 'ltr',
                                                format: '',
                                                indent: 1,
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
                    },
                    {
                        type: 'image',
                        version: 1,
                        src: 'blob:https://koenig.ghost.org/aafa977a-7cc3-44fc-96ca-f7befd38343a',
                        width: 1240,
                        height: 744,
                        title: '',
                        alt: '',
                        caption: '',
                        cardWidth: 'regular',
                        href: ''
                    }
                ],
                direction: 'ltr',
                format: '',
                indent: 0,
                type: 'root',
                version: 1
            }
        };

        const editor = createEditor();

        assertTransform(editor, registerTransforms, before, after);
    });

    it('handles images in deeply nested paragraphs', function () {
        const registerTransforms = (editor: LexicalEditor) => {
            registerDenestTransform(editor, ParagraphNode, () => ($createParagraphNode()));
        };

        // invalid state with image inside paragraph
        const before = {
            root: {
                children: [
                    {
                        children: [
                            {
                                children: [
                                    {
                                        type: 'image',
                                        version: 1,
                                        src: 'blob:https://koenig.ghost.org/aafa977a-7cc3-44fc-96ca-f7befd38343a',
                                        width: 1240,
                                        height: 744,
                                        title: '',
                                        alt: '',
                                        caption: '',
                                        cardWidth: 'regular',
                                        href: ''
                                    }
                                ],
                                direction: null,
                                format: '',
                                indent: 0,
                                type: 'paragraph',
                                version: 1
                            }
                        ],
                        direction: null,
                        format: '',
                        indent: 0,
                        type: 'paragraph',
                        version: 1
                    }
                ],
                direction: null,
                format: '',
                indent: 0,
                type: 'root',
                version: 1
            }
        };

        // image pulled out to top-level
        const after = {
            root: {
                children: [
                    {
                        type: 'image',
                        version: 1,
                        src: 'blob:https://koenig.ghost.org/aafa977a-7cc3-44fc-96ca-f7befd38343a',
                        width: 1240,
                        height: 744,
                        title: '',
                        alt: '',
                        caption: '',
                        cardWidth: 'regular',
                        href: ''
                    }
                ],
                direction: null,
                format: '',
                indent: 0,
                type: 'root',
                version: 1
            }
        };

        const editor = createEditor();

        assertTransform(editor, registerTransforms, before, after);
    });

    it('keeps original node when it also contains inline elements', function () {
        const registerTransforms = (editor: LexicalEditor) => {
            registerDenestTransform(editor, ParagraphNode, () => ($createParagraphNode()));
        };

        // invalid state with image inside paragraph
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
                                text: 'Content with ',
                                type: 'extended-text',
                                version: 1
                            },
                            {
                                children: [
                                    {
                                        detail: 0,
                                        format: 0,
                                        mode: 'normal',
                                        style: '',
                                        text: 'link',
                                        type: 'extended-text',
                                        version: 1
                                    }
                                ],
                                direction: 'ltr',
                                format: '',
                                indent: 0,
                                type: 'link',
                                version: 1,
                                rel: 'noreferrer',
                                target: null,
                                title: null,
                                url: 'https://ghost.org'
                            },
                            {
                                type: 'image',
                                version: 1,
                                src: 'blob:https://koenig.ghost.org/aafa977a-7cc3-44fc-96ca-f7befd38343a',
                                width: 1240,
                                height: 744,
                                title: '',
                                alt: '',
                                caption: '',
                                cardWidth: 'regular',
                                href: ''
                            }
                        ],
                        direction: 'ltr',
                        format: '',
                        indent: 0,
                        type: 'paragraph',
                        version: 1
                    }
                ],
                direction: null,
                format: '',
                indent: 0,
                type: 'root',
                version: 1
            }
        };

        // image pulled out to top-level
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
                                text: 'Content with ',
                                type: 'extended-text',
                                version: 1
                            },
                            {
                                children: [
                                    {
                                        detail: 0,
                                        format: 0,
                                        mode: 'normal',
                                        style: '',
                                        text: 'link',
                                        type: 'extended-text',
                                        version: 1
                                    }
                                ],
                                direction: 'ltr',
                                format: '',
                                indent: 0,
                                type: 'link',
                                version: 1,
                                rel: 'noreferrer',
                                target: null,
                                title: null,
                                url: 'https://ghost.org'
                            }
                        ],
                        direction: null,
                        format: '',
                        indent: 0,
                        type: 'paragraph',
                        version: 1
                    },
                    {
                        type: 'image',
                        version: 1,
                        src: 'blob:https://koenig.ghost.org/aafa977a-7cc3-44fc-96ca-f7befd38343a',
                        width: 1240,
                        height: 744,
                        title: '',
                        alt: '',
                        caption: '',
                        cardWidth: 'regular',
                        href: ''
                    }
                ],
                direction: null,
                format: '',
                indent: 0,
                type: 'root',
                version: 1
            }
        };

        const editor = createEditor();

        assertTransform(editor, registerTransforms, before, after);
    });

    it('splits paragraphs if image is in middle of paragraph', function () {
        const registerTransforms = (editor: LexicalEditor) => {
            registerDenestTransform(editor, ParagraphNode, () => ($createParagraphNode()));
        };

        // invalid state with image inside paragraph
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
                                text: 'Content before',
                                type: 'extended-text',
                                version: 1
                            },
                            {
                                type: 'image',
                                version: 1,
                                src: 'blob:https://koenig.ghost.org/aafa977a-7cc3-44fc-96ca-f7befd38343a',
                                width: 1240,
                                height: 744,
                                title: '',
                                alt: '',
                                caption: '',
                                cardWidth: 'regular',
                                href: ''
                            },
                            {
                                detail: 0,
                                format: 0,
                                mode: 'normal',
                                style: '',
                                text: 'Content after',
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
                direction: null,
                format: '',
                indent: 0,
                type: 'root',
                version: 1
            }
        };

        // image pulled out to top-level
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
                                text: 'Content before',
                                type: 'extended-text',
                                version: 1
                            }
                        ],
                        direction: null,
                        format: '',
                        indent: 0,
                        type: 'paragraph',
                        version: 1
                    },
                    {
                        type: 'image',
                        version: 1,
                        src: 'blob:https://koenig.ghost.org/aafa977a-7cc3-44fc-96ca-f7befd38343a',
                        width: 1240,
                        height: 744,
                        title: '',
                        alt: '',
                        caption: '',
                        cardWidth: 'regular',
                        href: ''
                    },
                    {
                        children: [
                            {
                                detail: 0,
                                format: 0,
                                mode: 'normal',
                                style: '',
                                text: 'Content after',
                                type: 'extended-text',
                                version: 1
                            }
                        ],
                        direction: null,
                        format: '',
                        indent: 0,
                        type: 'paragraph',
                        version: 1
                    }
                ],
                direction: null,
                format: '',
                indent: 0,
                type: 'root',
                version: 1
            }
        };

        const editor = createEditor();

        assertTransform(editor, registerTransforms, before, after);
    });

    it('doesn\'t error when targetted node isn\'t loaded in editor', function () {
        const registerTransforms = (editor: LexicalEditor) => {
            registerDenestTransform(editor, HeadingNode, (node: HeadingNode) => ($createHeadingNode(node.getTag())));
        };

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
                                text: 'Testing',
                                type: 'text',
                                version: 1
                            }
                        ],
                        direction: null,
                        format: '',
                        indent: 0,
                        type: 'paragraph',
                        version: 1
                    }
                ],
                direction: null,
                format: '',
                indent: 0,
                type: 'root',
                version: 1
            }
        };

        const editor = createEditor({nodes: [ParagraphNode, TextNode]});

        assertTransform(editor, registerTransforms, unchangedState, unchangedState);
    });
});
