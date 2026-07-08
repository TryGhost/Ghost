import {ElementNode} from 'lexical';
import type {EditorConfig, LexicalEditor, SerializedElementNode} from 'lexical';
import {AsideParser} from './AsideParser.js';

export class AsideNode extends ElementNode {
    static getType() {
        return 'aside';
    }

    static clone(node: AsideNode) {
        return new this(
            node.__key
        );
    }

    static get urlTransformMap() {
        return {};
    }

    constructor(key?: string) {
        super(key);
    }

    static importJSON(serializedNode: SerializedElementNode) {
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

    /* c8 ignore start */
    createDOM(_config?: EditorConfig, _editor?: LexicalEditor): HTMLElement {
        return document.createElement('div');
    }

    updateDOM() {
        return false;
    }

    isInline() {
        return false;
    }

    extractWithChild() {
        return true;
    }
    /* c8 ignore stop */
}

export function $createAsideNode() {
    return new AsideNode();
}

export function $isAsideNode(node: unknown): node is AsideNode {
    return node instanceof AsideNode;
}
