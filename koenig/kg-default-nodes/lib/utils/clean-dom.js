export function cleanDOM(node, allowedTags) {
    for (let i = 0; i < node.childNodes.length; i++) {
        let child = node.childNodes[i];
        if (child.nodeType === 1 && !allowedTags.includes(child.tagName)) {
            while (child.firstChild) {
                node.insertBefore(child.firstChild, child);
            }
            node.removeChild(child);
            i -= 1;
        } else if (child.nodeType === 1) {
            cleanDOM(child, allowedTags);
        }
    }
}
