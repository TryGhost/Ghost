import {createCommand} from 'lexical';
import {KoenigDecoratorNode} from '../../KoenigDecoratorNode';
import {ButtonParser} from './ButtonParser';
import {renderButtonNodeToDOM} from './ButtonRenderer';

export const INSERT_BUTTON_COMMAND = createCommand();

export class ButtonNode extends KoenigDecoratorNode {
    // payload properties
    __buttonText;
    __alignment;
    __buttonUrl;

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
            buttonUrl: 'url'
        };
    }

    getDataset() {
        const self = this.getLatest();
        return {
            buttonText: self.__buttonText,
            alignment: self.__alignment,
            buttonUrl: self.__buttonUrl
        };
    }

    constructor({buttonText, alignment, buttonUrl} = {}, key) {
        super(key);
        this.__buttonText = buttonText || '';
        this.__alignment = alignment || 'center';
        this.__buttonUrl = buttonUrl || '';
    }

    static importJSON(serializedNode) {
        const {alignment, buttonText, buttonUrl} = serializedNode;
        const node = new this({
            alignment,
            buttonText,
            buttonUrl
        });
        return node;
    }

    exportJSON() {
        const dataset = {
            type: 'button',
            version: 1,
            buttonText: this.getButtonText(),
            alignment: this.getAlignment(),
            buttonUrl: this.getButtonUrl()
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

    getButtonText() {
        const self = this.getLatest();
        return self.__buttonText;
    }

    setButtonText(buttonText) {
        const writable = this.getWritable();
        return writable.__buttonText = buttonText;
    }

    getAlignment() {
        const self = this.getLatest();
        return self.__alignment;
    }

    setAlignment(alignment) {
        const writable = this.getWritable();
        return writable.__alignment = alignment;
    }

    getButtonUrl() {
        const self = this.getLatest();
        return self.__buttonUrl;
    }

    setButtonUrl(buttonUrl) {
        const writable = this.getWritable();
        return writable.__buttonUrl = buttonUrl;
    }

    // should be overridden
    /* c8 ignore next 3 */
    decorate() {
        return '';
    }

    hasEditMode() {
        return true;
    }
}

export const $createButtonNode = (dataset) => {
    return new ButtonNode(dataset);
};

export function $isButtonNode(node) {
    return node instanceof ButtonNode;
}
