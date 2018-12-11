// we use datasets rather than classes even though they are slower because in
// many instances our draggable/droppable element's classes could be clobbered
// due to being a dynamically generated attribute
// -
// NOTE: if performance is an issue we could put data directly on the element
// object without using dataset but that won't be visible in DevTools without
// explicitly checking elements via the Console
export function getParent(element, dataAttribute) {
    let current = element;
    while (current) {
        if (current.dataset[dataAttribute]) {
            return current;
        }
        current = current.parentElement;
    }

    return null;
}

export function applyUserSelect(element, value) {
    element.style.webkitUserSelect = value;
    element.style.mozUserSelect = value;
    element.style.msUserSelect = value;
    element.style.oUserSelect = value;
    element.style.userSelect = value;
}
