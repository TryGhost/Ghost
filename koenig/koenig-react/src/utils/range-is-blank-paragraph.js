const rangeIsABlankParagraph = (range) => {
    if (!range) {
        return false;
    }

    const {head: {section}} = range;

    return range
        && range.isCollapsed
        && section
        && !section.isListItem
        && (section.isBlank || section.text === '');
};

export default rangeIsABlankParagraph;
