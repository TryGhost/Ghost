const VERTICAL_GAP = 10;

export function setFloatingElemPosition(
    targetRect,
    floatingElem,
    anchorElem,
    options = {}
) {
    options = Object.assign({
        verticalGap: VERTICAL_GAP,
        controlOpacity: false
    }, options);

    const scrollerElem = anchorElem.parentElement;

    if (!targetRect || !scrollerElem || !floatingElem) {
        return;
    }

    const floatingElemRect = floatingElem.getBoundingClientRect();
    const editorScrollerRect = scrollerElem.getBoundingClientRect();

    let top = targetRect.top - floatingElemRect.height - options.verticalGap;
    let left = targetRect.left + targetRect.width / 2 - floatingElemRect.width / 2;

    if (left < editorScrollerRect.left) {
        left = editorScrollerRect.left;
    }

    if (left + floatingElemRect.width > editorScrollerRect.right) {
        left = editorScrollerRect.right - floatingElemRect.width;
    }

    if (options.controlOpacity) {
        floatingElem.style.opacity = '1';
    }
    floatingElem.style.top = `${top}px`;
    floatingElem.style.left = `${left}px`;
}
