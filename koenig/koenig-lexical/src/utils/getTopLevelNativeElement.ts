export function getTopLevelNativeElement(node: Node | null): Element | null {
    const element = node?.nodeType === Node.TEXT_NODE ? node.parentElement : node;

    if (!(element instanceof Element)) {
        return null;
    }

    const selector = '[data-lexical-editor] > *';
    return element.closest(selector);
}
