export function getParent(element, value) {
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

        current = current.parentNode;
    } while (current && current !== document.body && current !== document);
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
