/* c8 ignore next */
import type {ElementNode, Klass, LexicalEditor} from 'lexical';

/* c8 ignore next */
export function removeAlignmentTransform(node: ElementNode) {
    // on element nodes format===text-align in Lexical
    if (node.getFormatType() !== '') {
        node.setFormat('');
    }
}

/* c8 ignore next */
export function registerRemoveAlignmentTransform<T extends ElementNode>(editor: LexicalEditor, klass: Klass<T>) {
    if (editor.hasNodes([klass])) {
        return editor.registerNodeTransform(klass, removeAlignmentTransform);
    }

    return () => {};
}
