import {KoenigDecoratorNode} from '../../KoenigDecoratorNode';
import {renderHeaderNodeToDOM} from './HeaderRenderer';
import {HeaderParser} from './HeaderParser';
import {createCommand} from 'lexical';

export const INSERT_HEADER_COMMAND = createCommand();
const NODE_TYPE = 'header';

export class HeaderNode extends KoenigDecoratorNode {
    // payload properties
    __size;
    __style;
    __buttonEnabled;
    __buttonUrl;
    __buttonText;
    __header;
    __subheader;
    __backgroundImageSrc;

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
            buttonUrl: 'url',
            backgroundImageSrc: 'url',
            header: 'html',
            subheader: 'html'
        };
    }

    getDataset() {
        const self = this.getLatest();
        return {
            size: self.__size,
            style: self.__style,
            buttonEnabled: self.__buttonEnabled,
            buttonUrl: self.__buttonUrl,
            buttonText: self.__buttonText,
            header: self.__header,
            subheader: self.__subheader,
            backgroundImageSrc: self.__backgroundImageSrc
        };
    }

    constructor({size,
        style,
        buttonEnabled,
        buttonUrl,
        buttonText,
        header,
        subheader,
        backgroundImageSrc} = {}, key) {
        super(key);
        this.__size = size || 'small';
        this.__style = style || 'dark';
        this.__buttonEnabled = buttonEnabled || false;
        this.__buttonUrl = buttonUrl || '';
        this.__buttonText = buttonText || '';
        this.__header = header || '';
        this.__subheader = subheader || '';
        this.__backgroundImageSrc = backgroundImageSrc || '';
    }

    static importJSON(serializedNode) {
        const {size, style, buttonEnabled, buttonUrl, buttonText, header, subheader, backgroundImageSrc} = serializedNode;
        const node = new this({
            size,
            style,
            buttonEnabled,
            buttonUrl,
            buttonText,
            header,
            subheader,
            backgroundImageSrc
        });
        return node;
    }

    exportJSON() {
        const dataset = {
            type: NODE_TYPE,
            version: 1,
            size: this.getSize(),
            style: this.getStyle(),
            buttonEnabled: this.getButtonEnabled(),
            buttonUrl: this.getButtonUrl(),
            buttonText: this.getButtonText(),
            header: this.getHeader(),
            subheader: this.getSubheader(),
            backgroundImageSrc: this.getBackgroundImageSrc()
        };
        return dataset;
    }

    static importDOM() {
        const parser = new HeaderParser(this);
        return parser.DOMConversionMap;
    }

    exportDOM(options = {}) {
        const element = renderHeaderNodeToDOM(this, options);
        return {element};
    }

    getSize() {
        const self = this.getLatest();
        return self.__size;
    }

    setSize(size) {
        const writable = this.getWritable();
        writable.__size = size;
    }

    getStyle() {
        const self = this.getLatest();
        return self.__style;
    }

    setStyle(style) {
        const writable = this.getWritable();
        writable.__style = style;
    }

    getButtonEnabled() {
        const self = this.getLatest();
        return self.__buttonEnabled;
    }

    setButtonEnabled(buttonEnabled) {
        const writable = this.getWritable();
        writable.__buttonEnabled = buttonEnabled;
    }

    getButtonUrl() {
        const self = this.getLatest();
        return self.__buttonUrl;
    }

    setButtonUrl(buttonUrl) {
        const writable = this.getWritable();
        writable.__buttonUrl = buttonUrl;
    }

    getButtonText() {
        const self = this.getLatest();
        return self.__buttonText;
    }

    setButtonText(buttonText) {
        const writable = this.getWritable();
        writable.__buttonText = buttonText;
    }

    getHeader() {
        const self = this.getLatest();
        return self.__header;
    }

    setHeader(header) {
        const writable = this.getWritable();
        writable.__header = header;
    }

    getSubheader() {
        const self = this.getLatest();
        return self.__subheader;
    }

    setSubheader(subheader) {
        const writable = this.getWritable();
        writable.__subheader = subheader;
    }

    getBackgroundImageSrc() {
        const self = this.getLatest();
        return self.__backgroundImageSrc;
    }

    setBackgroundImageSrc(backgroundImageSrc) {
        const writable = this.getWritable();
        writable.__backgroundImageSrc = backgroundImageSrc;
    }

    hasEditMode() {
        return true;
    }

    isEmpty() {
        return !this.header && !this.subheader && (!this.__buttonEnabled || (!this.__buttonText && !this.__buttonUrl)) && !this.__backgroundImageSrc;
    }
}

export const $createHeaderNode = (dataset) => {
    return new HeaderNode(dataset);
};

export function $isHeaderNode(node) {
    return node instanceof HeaderNode;
}
