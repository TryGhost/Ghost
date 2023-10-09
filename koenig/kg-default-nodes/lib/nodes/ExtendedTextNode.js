/* eslint-disable ghost/filenames/match-exported-class */
import {TextNode} from 'lexical';

// Since the TextNode is foundational to all Lexical packages, including the
// plain text use case. Handling any rich text logic is undesirable. This creates
// the need to override the TextNode to handle serialization and deserialization
// of HTML/CSS styling properties to achieve full fidelity between JSON <-> HTML.
//
// https://lexical.dev/docs/concepts/serialization#handling-extended-html-styling

export const extendedTextNodeReplacement = {replace: TextNode, with: node => new ExtendedTextNode(node.__text)};

export class ExtendedTextNode extends TextNode {
    constructor(text, key) {
        super(text, key);
    }

    static getType() {
        return 'extended-text';
    }

    static clone(node) {
        return new ExtendedTextNode(node.__text, node.__key);
    }

    static importDOM() {
        const importers = TextNode.importDOM();
        return {
            ...importers
        };
    }

    static importJSON(serializedNode) {
        return TextNode.importJSON(serializedNode);
    }

    exportJSON() {
        const json = super.exportJSON();
        json.type = 'extended-text';
        return json;
    }

    isSimpleText() {
        return (
            (this.__type === 'text' || this.__type === 'extended-text') &&
            this.__mode === 0
        );
    }
}
