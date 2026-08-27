export function cleanDOM(element: Element, allowedTags: ReadonlyArray<string>): void {
    for (let i = 0; i < element.children.length; i++) {
        const child = element.children[i];
        if (child.nodeType === 1 && !allowedTags.includes(child.tagName)) {
            while (child.firstChild) {
                element.insertBefore(child.firstChild, child);
            }
            element.removeChild(child);
            i -= 1;
        } else if (child.nodeType === 1) {
            cleanDOM(child, allowedTags);
        }
    }
}
