/* eslint-disable ghost/filenames/match-exported-class */
import {$applyNodeReplacement, TextNode} from 'lexical';

export class TKNode extends TextNode {
    static getType() {
        return 'tk';
    }

    static clone(node) {
        return new TKNode(node.__text, node.__key);
    }

    constructor(text, key) {
        super(text, key);
    }

    createDOM(config) {
        const element = super.createDOM(config);
        const classes = config.theme.tk?.split(' ') || [];
        element.classList.add(...classes);
        return element;
    }

    static importJSON(serializedNode) {
        const node = $createTKNode(serializedNode.text);
        node.setFormat(serializedNode.format);
        node.setDetail(serializedNode.detail);
        node.setMode(serializedNode.mode);
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
export function $createTKNode(text) {
    return $applyNodeReplacement(new TKNode(text));
}

/**
 * Determines if node is a TKNode.
 * @param node - The node to be checked.
 * @returns true if node is a TKNode, false otherwise.
 */
export function $isTKNode(node) {
    return node instanceof TKNode;
}
