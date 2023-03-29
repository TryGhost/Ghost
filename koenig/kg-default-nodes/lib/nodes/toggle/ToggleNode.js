import {createCommand} from 'lexical';
import {KoenigDecoratorNode} from '../../KoenigDecoratorNode';
import {ToggleParser} from './ToggleParser';
import {renderToggleNodeToDOM} from './ToggleRenderer';

export const INSERT_TOGGLE_COMMAND = createCommand();
const NODE_TYPE = 'toggle';

export class ToggleNode extends KoenigDecoratorNode {
    // payload properties
    __content;
    __header;

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
            content: 'html',
            header: 'html'
        };
    }

    getDataset() {
        const self = this.getLatest();
        return {
            content: self.__content,
            header: self.__header
        };
    }

    constructor({content, header} = {}, key) {
        super(key);
        this.__content = content || '';
        this.__header = header || '';
    }

    static importJSON(serializedNode) {
        const {content, header} = serializedNode;
        return new this({
            content,
            header
        });
    }

    exportJSON() {
        const dataset = {
            type: NODE_TYPE,
            version: 1,
            content: this.getContent(),
            header: this.getHeader()
        };
        return dataset;
    }

    static importDOM() {
        const parser = new ToggleParser(this);
        return parser.DOMConversionMap;
    }

    exportDOM(options = {}) {
        const element = renderToggleNodeToDOM(this, options);
        return {element};
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

    getContent() {
        const self = this.getLatest();
        return self.__content;
    }

    setContent(content) {
        const writable = this.getWritable();
        return writable.__content = content;
    }

    getHeader() {
        const self = this.getLatest();
        return self.__header;
    }

    setHeader(header) {
        const writable = this.getWritable();
        return writable.__header = header;
    }

    hasEditMode() {
        return true;
    }

    isEmpty() {
        return !this.__header && !this.__content;
    }

    // should be overridden
    /* c8 ignore next 3 */
    decorate() {
        return '';
    }
}

export const $createToggleNode = (dataset) => {
    return new ToggleNode(dataset);
};

export function $isToggleNode(node) {
    return node instanceof ToggleNode;
}
