import {createCommand} from 'lexical';
import {KoenigDecoratorNode} from '../../KoenigDecoratorNode';
import {ButtonParser} from './ButtonParser';
import {renderButtonNodeToDOM} from './ButtonRenderer';

export const INSERT_BUTTON_COMMAND = createCommand();

export class ButtonNode extends KoenigDecoratorNode {
    // payload properties
    __title;
    __alignment;
    __href;

    static getType() {
        return 'button';
    }

    static clone(node) {
        return new this(
            node.getDataset(),
            node.__key
        );
    }

    // used by `@tryghost/url-utils` to transform URLs contained in the serialized JSON
    static get urlTransformMap() {
        return {
            href: 'url'
        };
    }

    getDataset() {
        const self = this.getLatest();
        return {
            title: self.__title,
            alignment: self.__alignment,
            href: self.__href
        };
    }

    constructor({title, alignment, href} = {}, key) {
        super(key);
        this.__title = title || '';
        this.__alignment = alignment || '';
        this.__href = href || '';
    }

    static importJSON(serializedNode) {
        const {title, alignment, href} = serializedNode;
        const node = new this({
            title,
            alignment,
            href
        });
        return node;
    }

    exportJSON() {
        const dataset = {
            type: 'button',
            version: 1,
            title: this.getTitle(),
            alignment: this.getAlignment(),
            href: this.getHref()
        };
        return dataset;
    }

    // parser used when pasting html >> node
    static importDOM() {
        const parser = new ButtonParser(this);
        return parser.DOMConversionMap;
    }

    // renderer used when copying node >> html
    exportDOM(options = {}) {
        const element = renderButtonNodeToDOM(this, options);
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

    getTitle() {
        const self = this.getLatest();
        return self.__title;
    }

    setTitle(title) {
        const writable = this.getWritable();
        return writable.__title = title;
    }

    getAlignment() {
        const self = this.getLatest();
        return self.__alignment;
    }

    setAlignment(alignment) {
        const writable = this.getWritable();
        return writable.__alignment = alignment;
    }

    getHref() {
        const self = this.getLatest();
        return self.__href;
    }

    setHref(href) {
        const writable = this.getWritable();
        return writable.__href = href;
    }

    // should be overridden
    /* c8 ignore next 3 */
    decorate() {
        return '';
    }
}

export const $createButtonNode = (dataset) => {
    return new ButtonNode(dataset);
};

export function $isButtonNode(node) {
    return node instanceof ButtonNode;
}
