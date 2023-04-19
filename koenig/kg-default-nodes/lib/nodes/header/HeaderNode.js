import {KoenigDecoratorNode} from '../../KoenigDecoratorNode';
import {renderHeaderNodeToDOM} from './HeaderRenderer';
import {HeaderParser} from './HeaderParser';
import {createCommand} from 'lexical';

export const INSERT_HEADER_COMMAND = createCommand();

export class HeaderNode extends KoenigDecoratorNode {
    // header payload properties

    __size;
    __style;
    __buttonEnabled;
    __buttonUrl;
    __buttonText;
    __header;
    __subheader;
    __hasHeader;
    __hasSubheader;
    __backgroundImageStyle;
    __backgroundImageSrc;

    static getType() {
        return 'header';
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
            hasHeader: self.__hasHeader,
            hasSubheader: self.__hasSubheader,
            backgroundImageStyle: self.__backgroundImageStyle,
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
        hasHeader, 
        hasSubheader, 
        backgroundImageStyle, 
        backgroundImageSrc} = {}, key) {
        super(key);
        this.__size = size || 'small';
        this.__style = style || 'image';
        this.__buttonEnabled = buttonEnabled || false;
        this.__buttonUrl = buttonUrl || '';
        this.__buttonText = buttonText || '';
        this.__header = header || '';
        this.__subheader = subheader || '';
        this.__hasHeader = hasHeader || false;
        this.__hasSubheader = hasSubheader || false;
        this.__backgroundImageStyle = backgroundImageStyle || 'dark';
        this.__backgroundImageSrc = backgroundImageSrc || '';
    }

    static importJSON(serializedNode) {
        const {size, style, buttonEnabled, buttonUrl, buttonText, header, subheader, hasHeader, hasSubheader, backgroundImageStyle, backgroundImageSrc} = serializedNode;
        const node = new this({
            size,
            style,
            buttonEnabled,
            buttonUrl,
            buttonText,
            header,
            subheader,
            hasHeader,
            hasSubheader,
            backgroundImageStyle,
            backgroundImageSrc
        });
        return node;
    }

    exportJSON() {
        const dataset = {
            type: 'header',
            size: this.__size,
            style: this.__style,
            buttonEnabled: this.__buttonEnabled,
            buttonUrl: this.__buttonUrl,
            buttonText: this.__buttonText,
            header: this.__header,
            subheader: this.__subheader,
            hasHeader: this.__hasHeader,
            hasSubheader: this.__hasSubheader,
            backgroundImageStyle: this.__backgroundImageStyle,
            backgroundImageSrc: this.__backgroundImageSrc
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
    
    // c8 ignore start
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

    getHasHeader() {
        const self = this.getLatest();
        return self.__hasHeader;
    }

    setHasHeader(hasHeader) {
        const writable = this.getWritable();
        writable.__hasHeader = hasHeader;
    }

    getHasSubheader() {
        const self = this.getLatest();
        return self.__hasSubheader;
    }

    setHasSubheader(hasSubheader) {
        const writable = this.getWritable();
        writable.__hasSubheader = hasSubheader;
    }

    getBackgroundImageStyle() {
        const self = this.getLatest();
        return self.__backgroundImageStyle;
    }

    setBackgroundImageStyle(backgroundImageStyle) {
        const writable = this.getWritable();
        writable.__backgroundImageStyle = backgroundImageStyle;
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

    // c8 ignore stop
    decorate(){
        return '';
    }
}

export function $isHeaderNode(node) {
    return node instanceof HeaderNode;
}

export const $createHeaderNode = (dataset) => {
    return new HeaderNode(dataset);
};
