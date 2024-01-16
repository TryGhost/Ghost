import {ElementNode, Klass, LexicalEditor} from 'lexical';

export function removeAlignmentTransform(node: ElementNode) {
    // on element nodes format===text-align in Lexical
    if (node.getFormatType() !== '') {
        node.setFormat('');
    }
}

export function registerRemoveAlignmentTransform<T extends ElementNode>(editor: LexicalEditor, klass: Klass<T>) {
    if (editor.hasNodes([klass])) {
        return editor.registerNodeTransform(klass, removeAlignmentTransform);
    }

    // eslint-disable-next-line @typescript-eslint/no-empty-function
    return () => {};
}
