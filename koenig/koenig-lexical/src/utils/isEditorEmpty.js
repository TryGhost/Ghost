import {$canShowPlaceholderCurry} from '@lexical/text';

export function isEditorEmpty(editor) {
    // NOTE: This feels hacky but was required because we check editor empty state
    // when rendering cards to determine whether to show nested editors. But
    // _after an undo_ at the point we check the nested editor state is not yet fully committed
    const editorState = editor._pendingEditorState || editor.getEditorState();
    return editorState.read($canShowPlaceholderCurry(false));
}
