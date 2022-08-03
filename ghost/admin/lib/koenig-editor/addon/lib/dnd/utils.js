// TODO: rename to closest? getParent can actually match passed in element
export function getParent(element, value) {
    return getWithMatch(element, value, current => current.parentNode);
}

export function getNextSibling(element, value) {
    // don't match the passed in element
    element = element.nextElementSibling;
    return getWithMatch(element, value, current => current.nextElementSibling);
}

export function getPreviousSibling(element, value) {
    // don't match the passed in element
    element = element.previousElementSibling;
    return getWithMatch(element, value, current => current.previousElementSibling);
}

export function getParentScrollableElement(element) {
    if (!element) {
        return getDocumentScrollingElement();
    }

    let position = getComputedStyle(element).getPropertyValue('position');
    let excludeStaticParents = position === 'absolute';

    let scrollableElement = getParent(element, (parent) => {
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

export function getDocumentScrollingElement() {
    return document.scrollingElement || document.element;
}

export function applyUserSelect(element, value) {
    element.style.webkitUserSelect = value;
    element.style.mozUserSelect = value;
    element.style.msUserSelect = value;
    element.style.oUserSelect = value;
    element.style.userSelect = value;
}

/* Not exported --------------------------------------------------------------*/

function getWithMatch(element, value, next) {
    if (!element) {
        return null;
    }

    let selector = value;
    let callback = value;

    let isSelector = typeof value === 'string';
    let isFunction = typeof value === 'function';

    function matches(currentElement) {
        if (!currentElement) {
            return currentElement;
        } else if (isSelector) {
            return currentElement.matches(selector);
        } else if (isFunction) {
            return callback(currentElement);
        }
    }

    let current = element;

    do {
        if (matches(current)) {
            return current;
        }

        current = next(current);
    } while (current && current !== document.body && current !== document);
}

function isStaticallyPositioned(element) {
    let position = getComputedStyle(element).getPropertyValue('position');
    return position === 'static';
}

function hasOverflow(element) {
    let overflowRegex = /(auto|scroll)/;
    let computedStyles = getComputedStyle(element, null);

    let overflow =
        computedStyles.getPropertyValue('overflow') +
        computedStyles.getPropertyValue('overflow-y') +
        computedStyles.getPropertyValue('overflow-x');

    return overflowRegex.test(overflow);
}
