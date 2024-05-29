import {$isTextNode, LexicalEditor} from 'lexical';
import {AtLinkNode} from '@tryghost/kg-default-nodes';

// used when rendering to make sure we're not rendering the temporary
// nodes used for searching internal links
export function removeAtLinkNodesTransform(node: AtLinkNode) {
    const prevSibling = node.getPreviousSibling();
    const nextSibling = node.getNextSibling();

    // Remove a surrounding space if it exists to avoid double-spacing after removal
    // AtLink nodes should always exist surrounded by spaces unless at beginning or end of text
    if (prevSibling) {
        if ($isTextNode(prevSibling) && prevSibling.getTextContent().endsWith(' ')) {
            prevSibling.setTextContent(prevSibling.getTextContent().slice(0, -1));
        }
    } else if (nextSibling) {
        if ($isTextNode(nextSibling) && nextSibling.getTextContent().startsWith(' ')) {
            nextSibling.setTextContent(nextSibling.getTextContent().slice(1));
        }
    }

    node.remove();
}

export function registerRemoveAtLinkNodesTransform(editor: LexicalEditor) {
    if (editor.hasNodes([AtLinkNode])) {
        return editor.registerNodeTransform(AtLinkNode, removeAtLinkNodesTransform);
    }

    // eslint-disable-next-line @typescript-eslint/no-empty-function
    return () => {};
}
