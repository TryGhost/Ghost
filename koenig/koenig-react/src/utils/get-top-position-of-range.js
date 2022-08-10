const getTopPositionOfRange = (range, containerElem) => {
    const {head: {section}} = range;

    if (section) {
        const containerRect = containerElem.parentNode.getBoundingClientRect();
        const selectedElement = section.renderNode.element;
        if (selectedElement) {
            const selectedElementRect = selectedElement.getBoundingClientRect();
            const top = selectedElementRect.top - containerRect.top;

            return top;
        }
    }

    return undefined;
};

export default getTopPositionOfRange;
