import {createDOMRange, createRectsFromDOMRange} from '@lexical/selection';

export function $getSelectionRangeRect({selection, editor}) {
    if (!selection) {
        return null;
    }
    const anchor = selection.anchor;
    const focus = selection.focus;
    const selectionRange = createDOMRange(editor, anchor.getNode(), selection.anchor.offset, focus.getNode(), selection.focus.offset);
    const selectionRects = createRectsFromDOMRange(editor, selectionRange);
    return selectionRects[0];
}
