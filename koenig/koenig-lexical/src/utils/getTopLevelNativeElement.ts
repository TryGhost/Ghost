export function getTopLevelNativeElement(node: Node | null): Element | null {
    if (!node) {
        return null;
    }
    let element: Element | null;

    if (node.nodeType === Node.TEXT_NODE) {
        element = node.parentElement;
    } else {
        element = node as Element;
    }

    const selector = '[data-lexical-editor] > *';
    return element?.closest(selector) ?? null;
}
