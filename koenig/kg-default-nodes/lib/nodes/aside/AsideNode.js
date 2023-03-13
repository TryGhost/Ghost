import {ElementNode} from 'lexical';
import {AsideParser} from './AsideParser';
import {renderAsideToDOM} from './AsideRenderer';

export class AsideNode extends ElementNode {
    static getType() {
        return 'aside';
    }

    static clone(node) {
        return new this(
            node.__key
        );
    }

    // used by `@tryghost/url-utils` to transform URLs contained in the serialized JSON
    static get urlTransformMap() {
        return {};
    }

    constructor(key) {
        super(key);
    }

    static importJSON(serializedNode) {
        const node = new this();
        node.setFormat(serializedNode.format);
        node.setIndent(serializedNode.indent);
        node.setDirection(serializedNode.direction);
        return node;
    }

    exportJSON() {
        const dataset = {
            ...super.exportJSON(),
            type: 'aside',
            version: 1
        };
        return dataset;
    }

    static importDOM() {
        const parser = new AsideParser(this);
        return parser.DOMConversionMap;
    }

    exportDOM(options = {}) {
        const element = renderAsideToDOM(this, options);
        return {element};
    }

    /* c8 ignore start */
    createDOM() {
        const element = document.createElement('div');
        return element;
    }

    updateDOM() {
        return false;
    }

    isInline() {
        return false;
    }
    /* c8 ignore stop */
}

export function $createAsideNode() {
    return new AsideNode();
}

export function $isAsideNode(node) {
    return node instanceof AsideNode;
}
