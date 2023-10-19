import assert from 'assert/strict';
import {HeadingNode, QuoteNode} from '@lexical/rich-text';
import {ListItemNode, ListNode} from '@lexical/list';
import {LinkNode} from '@lexical/link';
import {DEFAULT_NODES} from '@tryghost/kg-default-nodes';
import {createHeadlessEditor} from '@lexical/headless';
import {CreateEditorArgs, LexicalEditor} from 'lexical';

export const defaultNodes: any[] = [
    // basic HTML nodes
    HeadingNode,
    LinkNode,
    ListItemNode,
    ListNode,
    QuoteNode,

    // Koenig nodes
    ...DEFAULT_NODES
];

export const defaultEditorConfig: CreateEditorArgs = {
    nodes: defaultNodes,
    onError(e: Error) {
        throw e;
    }
};

export const createEditor = function (config?: CreateEditorArgs) {
    const editorConfig: CreateEditorArgs = Object.assign({}, defaultEditorConfig, config);
    const editor = createHeadlessEditor(editorConfig);

    return editor;
};

export const assertTransform = function (editor: LexicalEditor, registerTransforms: Function, before: object, after: object) {
    const serializedBefore = JSON.stringify(before);

    const beforeState = editor.parseEditorState(serializedBefore);
    editor.setEditorState(beforeState);

    // - setEditorState does not trigger transforms as expected
    //   so we need to register them here instead then they are called as they're registers
    registerTransforms(editor);

    // trigger a discrete update to make sure we're comparing finalised editor state
    // because the transforms get batched and run "async"
    editor.update(() => {}, {discrete: true});

    const afterState = editor.getEditorState().toJSON();

    assert.deepEqual(afterState, after);
};
