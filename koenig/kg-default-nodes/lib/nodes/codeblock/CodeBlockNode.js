import {createCommand} from 'lexical';
import {KoenigDecoratorNode} from '../../KoenigDecoratorNode';
import {CodeBlockParser} from './CodeBlockParser';
import {renderCodeBlockNodeToDOM} from './CodeBlockRenderer';

export const INSERT_CODE_BLOCK_COMMAND = createCommand();

export class CodeBlockNode extends KoenigDecoratorNode {
    __code;
    __language;
    __caption;

    static getType() {
        return 'codeblock';
    }

    static clone(node) {
        // must use `this` so the extended class in the Editor uses the correct class when cloning
        // without needing to override this method
        return new this(
            node.getDataset(),
            node.__key
        );
    }

    // used by `@tryghost/url-utils` to transform URLs contained in the serialized JSON
    static get urlTransformMap() {
        return {
            caption: 'html'
        };
    }

    getDataset() {
        const self = this.getLatest();
        return {
            code: self.__code,
            language: self.__language,
            caption: self.__caption
        };
    }

    static importJSON(serializedNode) {
        const {code, language, caption} = serializedNode;
        const node = new this({code, language, caption});
        return node;
    }

    exportJSON() {
        return {
            type: 'codeblock',
            version: 1,
            code: this.__code,
            language: this.__language,
            caption: this.__caption
        };
    }

    constructor({code, language, caption} = {}, key) {
        super(key);
        this.__code = code;
        this.__language = language;
        this.__caption = caption;
    }

    static importDOM() {
        const parser = new CodeBlockParser(this);
        return parser.DOMConversionMap;
    }

    exportDOM(options = {}) {
        const element = renderCodeBlockNodeToDOM(this, options);
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

    getCaption() {
        const self = this.getLatest();
        return self.__caption;
    }

    setCaption(caption) {
        const self = this.getWritable();
        self.__caption = caption;
    }

    getCode() {
        const self = this.getLatest();
        return self.__code;
    }

    setCode(code) {
        const self = this.getWritable();
        self.__code = code;
    }

    getLanguage() {
        const self = this.getLatest();
        return self.__language;
    }

    setLanguage(language) {
        const self = this.getWritable();
        self.__language = language;
    }

    getTextContent() {
        const self = this.getLatest();
        return self.__code;
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
        return !this.__code;
    }
}

export function $createCodeBlockNode(dataset) {
    return new CodeBlockNode(dataset);
}

export function $isCodeBlockNode(node) {
    return node instanceof CodeBlockNode;
}
