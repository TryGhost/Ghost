import {getTopLevelNativeElement} from './getTopLevelNativeElement';

/**
 * 
 * @param {Selection} nativeSelection – Window selection (window.getSelection())
 * @param {number} [threshold=10] – Estimated height of one line, in pixels
 * @returns {boolean}
 */
export function $isAtTopOfNode(nativeSelection, threshold = 10) {
    const range = nativeSelection.getRangeAt(0).cloneRange();
    const rects = range.getClientRects();

    if (rects.length > 0) {
        // try second rect first because when the caret is at the beginning
        // of a line the first rect will be positioned on line above breaking
        // the top position check
        const rangeRect = rects[1] || rects[0];
        const nativeTopLevelElement = getTopLevelNativeElement(nativeSelection.anchorNode);
        const elemRect = nativeTopLevelElement.getBoundingClientRect();

        return Math.abs(rangeRect.top - elemRect.top) <= threshold;
    } 
}