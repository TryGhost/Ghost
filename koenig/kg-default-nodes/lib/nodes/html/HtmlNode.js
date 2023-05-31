import {createCommand} from 'lexical';
import {KoenigDecoratorNode} from '../../KoenigDecoratorNode';
import {renderHtmlNodeToDOM} from './HtmlRenderer';
import {HtmlParser} from './HtmlParser';

export const INSERT_HTML_COMMAND = createCommand();

export class HtmlNode extends KoenigDecoratorNode {
    // payload properties
    __html;

    static getType() {
        return 'html';
    }

    static clone(node) {
        return new this(node.getDataset(), node.__key);
    }

    static get urlTransformMap() {
        return {
            html: 'html'
        };
    }

    getDataset() {
        const self = this.getLatest();
        return {
            html: self.__html
        };
    }

    static importJSON(serializedNode) {
        const {html} = serializedNode;
        const node = new this({html});
        return node;
    }

    exportJSON() {
        return {
            type: 'html',
            version: 1,
            html: this.getHtml()
        };
    }

    constructor({html} = {}, key) {
        super(key);
        this.__html = html;
    }

    static importDOM() {
        const parser = new HtmlParser(this);
        return parser.DOMConversionMap;
    }

    exportDOM(options = {}) {
        const element = renderHtmlNodeToDOM(this, options);
        return {
            element,
            type: 'inner'
        };
    }

    getHtml() {
        const self = this.getLatest();
        return self.__html;
    }

    setHtml(html) {
        const writable = this.getWritable();
        return writable.__html = html;
    }

    hasEditMode() {
        return true;
    }

    isEmpty() {
        return !this.__html;
    }
}

export function $createHtmlNode(dataset) {
    return new HtmlNode(dataset);
}

export function $isHtmlNode(node) {
    return node instanceof HtmlNode;
}
