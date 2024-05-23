/* eslint-disable ghost/filenames/match-exported-class */
import {TextNode} from 'lexical';

// This is used in places where we need an extra cursor position at the
// beginning of an element node as it prevents Lexical normalizing the
// cursor position to the end of the previous node.
export class ZWNJNode extends TextNode {
    static getType() {
        return 'zwnj';
    }

    static clone(node) {
        return new ZWNJNode('', node.__key);
    }

    createDOM(config) {
        const span = super.createDOM(config);
        span.innerHTML = '&zwnj;';
        return span;
    }

    updateDOM() {
        return false;
    }

    exportJSON() {
        return {
            ...super.exportJSON(),
            type: 'zwnj',
            version: 1
        };
    }

    getTextContent() {
        return '';
    }

    isToken() {
        return true;
    }
}

export function $createZWNJNode() {
    return new ZWNJNode('');
}

export function $isZWNJNode(node) {
    return node instanceof ZWNJNode;
}
