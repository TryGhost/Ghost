export function getTopLevelNativeElement(node) {
    if (node.nodeType === Node.TEXT_NODE) {
        node = node.parentNode;
    }

    const selector = '[data-lexical-editor] > *';
    return node.closest(selector);
}