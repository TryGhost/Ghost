import {createCommand} from 'lexical';
import {KoenigDecoratorNode} from '../../KoenigDecoratorNode';
import {renderMarkdownNodeToDOM} from './MarkdownRenderer';

export const INSERT_MARKDOWN_COMMAND = createCommand();

export class MarkdownNode extends KoenigDecoratorNode {
    __markdown;

    static getType() {
        return 'markdown';
    }

    static clone(node) {
        return new this(node.getDataset(), node.__key);
    }

    // used by `@tryghost/url-utils` to transform URLs contained in the serialized JSON
    static get urlTransformMap() {
        return {
            markdown: 'markdown'
        };
    }

    getDataset() {
        const self = this.getLatest();
        return {
            markdown: self.__markdown
        };
    }

    static importJSON(serializedNode) {
        const {markdown} = serializedNode;
        const node = new this({markdown});
        return node;
    }

    exportJSON() {
        return {
            type: 'markdown',
            version: 1,
            markdown: this.getMarkdown()
        };
    }

    constructor({markdown} = {}, key) {
        super(key);
        this.__markdown = markdown;
    }

    exportDOM(options = {}) {
        const element = renderMarkdownNodeToDOM(this, options);
        return {
            element,
            type: 'inner'
        };
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

    getMarkdown() {
        return this.__markdown;
    }

    setMarkdown(markdown) {
        const writable = this.getWritable();
        return writable.__markdown = markdown;
    }

    // should be overwritten
    /* c8 ignore next 3 */
    decorate() {
        return '';
    }

    hasEditMode() {
        return true;
    }

    isEmpty() {
        return !this.__markdown;
    }
}

export function $createMarkdownNode(dataset) {
    return new MarkdownNode(dataset);
}

export function $isMarkdownNode(node) {
    return node instanceof MarkdownNode;
}
