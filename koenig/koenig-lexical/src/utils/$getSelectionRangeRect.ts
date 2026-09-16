import {$isRangeSelection} from 'lexical';
import {createDOMRange, createRectsFromDOMRange} from '@lexical/selection';

export function $getSelectionRangeRect({selection, editor}) {
    if (!selection || !$isRangeSelection(selection)) {
        return null;
    }

    const anchor = selection.anchor;
    const focus = selection.focus;
    const selectionRange = createDOMRange(editor, anchor.getNode(), selection.anchor.offset, focus.getNode(), selection.focus.offset);

    if (!selectionRange) {
        return null;
    }

    const selectionRects = createRectsFromDOMRange(editor, selectionRange);
    const returnRect = selectionRects[0];

    // we can get multiple rects if the selection spans multiple lines or has inline nodes like links
    if (selectionRects.length > 1) {
        // add up the widths of all rects using the first top position
        for (let i = 1; i < selectionRects.length; i++) {
            const rect = selectionRects[i];
            if (rect.top === returnRect.top) {
                returnRect.width += rect.width;
            }
        }
    }

    return returnRect;
}
