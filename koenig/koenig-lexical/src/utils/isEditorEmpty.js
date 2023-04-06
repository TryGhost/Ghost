import {$canShowPlaceholderCurry} from '@lexical/text';

export function isEditorEmpty(editor) {
    return editor.getEditorState().read($canShowPlaceholderCurry(false));
}
