const VERTICAL_GAP = 10;

interface FloatingElemOptions {
    verticalGap?: number;
    controlOpacity?: boolean;
}

export function setFloatingElemPosition(
    targetRect: DOMRect | null,
    floatingElem: HTMLElement,
    anchorElem: HTMLElement,
    options: FloatingElemOptions = {}
) {
    const resolvedOptions = Object.assign({
        verticalGap: VERTICAL_GAP,
        controlOpacity: false
    }, options);

    const scrollerElem = anchorElem.parentElement;

    if (!targetRect || !scrollerElem || !floatingElem) {
        return;
    }

    const floatingElemRect = floatingElem.getBoundingClientRect();
    const editorScrollerRect = scrollerElem.getBoundingClientRect();

    const top = targetRect.top - floatingElemRect.height - resolvedOptions.verticalGap;
    let left = targetRect.left + targetRect.width / 2 - floatingElemRect.width / 2;

    if (left < editorScrollerRect.left) {
        left = editorScrollerRect.left;
    }

    if (left + floatingElemRect.width > editorScrollerRect.right) {
        left = editorScrollerRect.right - floatingElemRect.width;
    }

    if (resolvedOptions.controlOpacity) {
        floatingElem.style.opacity = '1';
    }
    floatingElem.style.top = `${top}px`;
    floatingElem.style.left = `${left}px`;
}
