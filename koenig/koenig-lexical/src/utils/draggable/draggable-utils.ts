// TODO: more or less duplicated in koenig-card-gallery other than direction
export function isCardDropAllowed(draggableIndex: number, droppableIndex: number, position = ''): boolean {
    // images can be dragged out of a gallery to any position
    if (draggableIndex === -1) {
        return true;
    }

    // can't drop on itself or when droppableIndex doesn't exist
    if (draggableIndex === droppableIndex || typeof droppableIndex === 'undefined') {
        return false;
    }

    // account for dropping at beginning or end of a row
    if (position.match(/top/)) {
        droppableIndex -= 1;
    }

    if (position.match(/bottom/)) {
        droppableIndex += 1;
    }

    return droppableIndex !== draggableIndex;
}

// TODO: rename to closest? getParent can actually match passed in element
export function getParent(element: Element | null, value: string | ((el: Element) => boolean)): Element | null {
    return getWithMatch(element, value, current => current.parentNode as Element | null);
}

export function getNextSibling(element: Element | null, value: string | ((el: Element) => boolean)): Element | null {
    // don't match the passed in element
    element = element?.nextElementSibling ?? null;
    return getWithMatch(element, value, current => current.nextElementSibling);
}

export function getPreviousSibling(element: Element | null, value: string | ((el: Element) => boolean)): Element | null {
    // don't match the passed in element
    element = element?.previousElementSibling ?? null;
    return getWithMatch(element, value, current => current.previousElementSibling);
}

export function getParentScrollableElement(element: Element | null): Element | null {
    if (!element) {
        return getDocumentScrollingElement();
    }

    const position = getComputedStyle(element).getPropertyValue('position');
    const excludeStaticParents = position === 'absolute';

    const scrollableElement = getParent(element, (parent) => {
        if (excludeStaticParents && isStaticallyPositioned(parent)) {
            return false;
        }
        return hasOverflow(parent);
    });

    if (position === 'fixed' && !scrollableElement) {
        return getDocumentScrollingElement();
    } else {
        return scrollableElement;
    }
}

export function getDocumentScrollingElement(): Element | null {
    return (document.scrollingElement as HTMLElement)?.querySelector('body') || document.scrollingElement || document.documentElement;
}

export function applyUserSelect(element: HTMLElement, value: string): void {
    element.style.webkitUserSelect = value;
    (element.style as unknown as Record<string, string>).mozUserSelect = value;
    (element.style as unknown as Record<string, string>).msUserSelect = value;
    (element.style as unknown as Record<string, string>).oUserSelect = value;
    element.style.userSelect = value;
}

/* Not exported --------------------------------------------------------------*/

function getWithMatch(element: Element | null, value: string | ((el: Element) => boolean), next: (el: Element) => Element | null): Element | null {
    if (!element) {
        return null;
    }

    const isSelector = typeof value === 'string';

    function matches(currentElement: Element | null): boolean {
        if (!currentElement) {
            return false;
        } else if (isSelector) {
            return currentElement.matches(value as string);
        } else {
            return (value as (el: Element) => boolean)(currentElement);
        }
    }

    let current: Element | null = element;

    do {
        if (matches(current)) {
            return current;
        }

        current = next(current);
    } while (current && current !== document.body && current !== document.documentElement);

    return null;
}

function isStaticallyPositioned(element: Element): boolean {
    const position = getComputedStyle(element).getPropertyValue('position');
    return position === 'static';
}

function hasOverflow(element: Element): boolean {
    const overflowRegex = /(auto|scroll)/;
    const computedStyles = getComputedStyle(element, null);

    const overflow =
        computedStyles.getPropertyValue('overflow') +
        computedStyles.getPropertyValue('overflow-y') +
        computedStyles.getPropertyValue('overflow-x');

    return overflowRegex.test(overflow);
}
