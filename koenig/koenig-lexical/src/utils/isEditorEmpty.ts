import {$canShowPlaceholderCurry} from '@lexical/text';
import {getPendingEditorState} from './lexical-internals';
import type {LexicalEditor} from 'lexical';

export function isEditorEmpty(editor: LexicalEditor): boolean {
    // NOTE: This feels hacky but was required because we check editor empty state
    // when rendering cards to determine whether to show nested editors. But
    // _after an undo_ at the point we check the nested editor state is not yet fully committed
    const editorState = getPendingEditorState(editor) || editor.getEditorState();
    return editorState.read($canShowPlaceholderCurry(false));
}
