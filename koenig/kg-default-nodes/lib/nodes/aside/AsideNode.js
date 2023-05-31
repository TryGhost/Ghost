import {ElementNode} from 'lexical';
import {AsideParser} from './AsideParser';

export class AsideNode extends ElementNode {
    static getType() {
        return 'aside';
    }

    static clone(node) {
        return new this(
            node.__key
        );
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
}

export function $createAsideNode() {
    return new AsideNode();
}

export function $isAsideNode(node) {
    return node instanceof AsideNode;
}
