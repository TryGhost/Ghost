// TODO: more or less duplicated in koenig-card-gallery other than direction
export function isCardDropAllowed(draggableIndex: number, droppableIndex: number | undefined, position = ''): boolean {
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

// a CSS selector, or a predicate that is called with each candidate element
export type ElementMatcher = string | ((element: Element) => boolean);

// TODO: rename to closest? getParent can actually match passed in element
export function getParent(element: Element | null, value: ElementMatcher): Element | null {
    return getWithMatch(element, value, current => current.parentElement);
}

export function getNextSibling(element: Element, value: ElementMatcher): Element | null {
    // don't match the passed in element
    return getWithMatch(element.nextElementSibling, value, current => current.nextElementSibling);
}

export function getPreviousSibling(element: Element, value: ElementMatcher): Element | null {
    // don't match the passed in element
    return getWithMatch(element.previousElementSibling, value, current => current.previousElementSibling);
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

export function getDocumentScrollingElement(): Element {
    return document.scrollingElement || document.documentElement;
}

// vendor-prefixed properties that the DOM typings no longer declare
interface PrefixedUserSelectStyle extends CSSStyleDeclaration {
    mozUserSelect?: string;
    msUserSelect?: string;
    oUserSelect?: string;
}

export function applyUserSelect(element: HTMLElement, value: string): void {
    const style: PrefixedUserSelectStyle = element.style;
    style.webkitUserSelect = value;
    style.mozUserSelect = value;
    style.msUserSelect = value;
    style.oUserSelect = value;
    style.userSelect = value;
}

/* Not exported --------------------------------------------------------------*/

function getWithMatch(element: Element | null, value: ElementMatcher, next: (current: Element) => Element | null): Element | null {
    function matches(currentElement: Element): boolean {
        return typeof value === 'string' ? currentElement.matches(value) : value(currentElement);
    }

    if (!element) {
        return null;
    }

    let current: Element | null = element;

    do {
        if (matches(current)) {
            return current;
        }

        current = next(current);
    } while (current && current !== document.body);

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
