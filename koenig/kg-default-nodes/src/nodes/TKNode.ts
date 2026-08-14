import {$applyNodeReplacement, TextNode} from 'lexical';
import type {EditorConfig, SerializedTextNode, TextModeType} from 'lexical';

export class TKNode extends TextNode {
    static getType() {
        return 'tk';
    }

    static clone(node: TKNode) {
        return new TKNode(node.__text, node.__key);
    }

    constructor(text: string, key?: string) {
        super(text, key);
    }

    createDOM(config: EditorConfig) {
        const element = super.createDOM(config);
        const classes = config.theme.tk?.split(' ') || [];
        element.classList.add(...classes);
        element.dataset.kgTk = 'true';
        return element;
    }

    static importJSON(serializedNode: SerializedTextNode): TKNode {
        const node = new TKNode(serializedNode.text);
        node.setFormat(serializedNode.format as number);
        node.setDetail(serializedNode.detail as number);
        node.setMode(serializedNode.mode as TextModeType);
        node.setStyle(serializedNode.style);
        return node;
    }

    exportJSON() {
        return {
            ...super.exportJSON(),
            type: 'tk'
        };
    }

    canInsertTextBefore() {
        return false;
    }

    isTextEntity() {
        return true;
    }
}

/**
 * Generates a TKNode, which is a string following the format of a # followed by some text, eg. #lexical.
 * @param text - The text used inside the TKNode.
 * @returns - The TKNode with the embedded text.
 */
export function $createTKNode(text: string) {
    return $applyNodeReplacement(new TKNode(text));
}

/**
 * Determines if node is a TKNode.
 * @param node - The node to be checked.
 * @returns true if node is a TKNode, false otherwise.
 */
export function $isTKNode(node: unknown): node is TKNode {
    return node instanceof TKNode;
}
