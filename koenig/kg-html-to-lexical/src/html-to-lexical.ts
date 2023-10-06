/* eslint-disable ghost/filenames/match-exported-class */
import {$createParagraphNode, $getRoot, CreateEditorArgs, type SerializedEditorState} from 'lexical';
import {createHeadlessEditor} from '@lexical/headless';
import {$generateNodesFromDOM} from '@lexical/html';
import {HeadingNode, QuoteNode} from '@lexical/rich-text';
import {ListItemNode, ListNode} from '@lexical/list';
import {LinkNode} from '@lexical/link';
import {DEFAULT_NODES} from '@tryghost/kg-default-nodes';
import {JSDOM} from 'jsdom';

export interface htmlToLexicalOptions {
    editorConfig: CreateEditorArgs
}

const TEXT_NODE_TYPES = ['text', 'extended-text'];

const defaultNodes = [
    // basic HTML nodes
    HeadingNode,
    LinkNode,
    ListItemNode,
    ListNode,
    QuoteNode,

    // Koenig nodes
    ...DEFAULT_NODES
];

export function htmlToLexical(html: string, options?: htmlToLexicalOptions): SerializedEditorState {
    const defaultEditorConfig = {
        nodes: defaultNodes
    };
    const editorConfig = Object.assign({}, defaultEditorConfig, options?.editorConfig);

    const dom = new JSDOM(`<body>${html?.trim()}</body>`);
    const editor = createHeadlessEditor(editorConfig);

    editor.update(() => {
        const nodes = $generateNodesFromDOM(editor, dom.window.document);

        // $generateNodesFromDOM returns top-level text nodes for any unknown elements
        // which will break `rootNode.append()` so we need to wrap them in a paragraph
        // so contents don't get lost when converting
        const normalizedNodes = nodes.map((node) => {
            if (TEXT_NODE_TYPES.includes(node.getType())) {
                const p = $createParagraphNode();
                p.append(node);
                return p;
            } else {
                return node;
            }
        });

        $getRoot().clear();
        $getRoot().append(...normalizedNodes);
    }, {discrete: true});

    const editorState = editor.getEditorState();

    return editorState.toJSON();
}
