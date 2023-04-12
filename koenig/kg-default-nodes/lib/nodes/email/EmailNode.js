import {createCommand} from 'lexical';
import {KoenigDecoratorNode} from '../../KoenigDecoratorNode';
import {renderEmailNodeToDOM} from './EmailRenderer';

export const INSERT_EMAIL_COMMAND = createCommand();
const NODE_TYPE = 'email';

export class EmailNode extends KoenigDecoratorNode {
    // payload properties
    __html;

    static getType() {
        return NODE_TYPE;
    }

    static clone(node) {
        return new this(
            node.getDataset(),
            node.__key
        );
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

    constructor({html} = {}, key) {
        super(key);
        this.__html = html || '';
    }

    static importJSON(serializedNode) {
        const {html} = serializedNode;
        return new this({
            html
        });
    }

    exportJSON() {
        const dataset = {
            type: NODE_TYPE,
            version: 1,
            html: this.getHtml()
        };
        return dataset;
    }

    exportDOM(options = {}) {
        const element = renderEmailNodeToDOM(this, options);
        return {element, type: 'inner'};
    }

    /* c8 ignore start */
    createDOM() {
        return document.createElement('div');
    }

    updateDOM() {
        return false;
    }

    isInline() {
        return false;
    }
    /* c8 ignore stop */

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

    // should be overridden
    /* c8 ignore next 3 */
    decorate() {
        return '';
    }
}

export const $createEmailNode = (dataset) => {
    return new EmailNode(dataset);
};

export function $isEmailNode(node) {
    return node instanceof EmailNode;
}
