export function cleanDOM(node: Element, allowedTags: string[]) {
    for (let i = 0; i < node.childNodes.length; i++) {
        const child = node.childNodes[i];
        if (child.nodeType === 1 && !allowedTags.includes((child as Element).tagName)) {
            while (child.firstChild) {
                node.insertBefore(child.firstChild, child);
            }
            node.removeChild(child);
            i -= 1;
        } else if (child.nodeType === 1) {
            cleanDOM(child as Element, allowedTags);
        }
    }
}
