import {createCommand} from 'lexical';
import {KoenigDecoratorNode} from '../../KoenigDecoratorNode';
import {renderSignupCardToDOM} from './SignupRenderer';

export const INSERT_SIGNUP_COMMAND = createCommand();
const NODE_TYPE = 'signup';

export class SignupNode extends KoenigDecoratorNode {
    // payload properties
    __style;
    __buttonText;
    __header;
    __subheader;
    __disclaimer;
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
            backgroundImageSrc: 'url',
            header: 'html',
            subheader: 'html',
            disclaimer: 'html'
        };
    }

    getDataset() {
        const self = this.getLatest();
        return {
            style: self.__style,
            buttonText: self.__buttonText,
            header: self.__header,
            subheader: self.__subheader,
            disclaimer: self.__disclaimer,
            backgroundImageSrc: self.__backgroundImageSrc
        };
    }

    constructor({style,
        buttonText,
        header,
        subheader,
        disclaimer,
        backgroundImageSrc} = {}, key) {
        super(key);
        this.__style = style || 'dark';
        this.__buttonText = buttonText || '';
        this.__header = header || '';
        this.__subheader = subheader || '';
        this.__disclaimer = disclaimer || '';
        this.__backgroundImageSrc = backgroundImageSrc || '';
    }

    exportDOM(options = {}) {
        const element = renderSignupCardToDOM(this, options);
        return {
            element,
            type: 'inner'
        };
    }

    static importJSON(serializedNode) {
        const {style, buttonText, header, subheader, disclaimer, backgroundImageSrc} = serializedNode;
        const node = new this({
            style,
            buttonText,
            header,
            subheader,
            disclaimer,
            backgroundImageSrc
        });
        return node;
    }

    exportJSON() {
        const dataset = {
            type: NODE_TYPE,
            version: 1,
            style: this.getStyle(),
            buttonText: this.getButtonText(),
            header: this.getHeader(),
            subheader: this.getSubheader(),
            disclaimer: this.getDisclaimer(),
            backgroundImageSrc: this.getBackgroundImageSrc()
        };
        return dataset;
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

    getStyle() {
        const self = this.getLatest();
        return self.__style;
    }

    setStyle(style) {
        const writable = this.getWritable();
        writable.__style = style;
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

    getDisclaimer() {
        const self = this.getLatest();
        return self.__disclaimer;
    }

    setDisclaimer(disclaimer) {
        const writable = this.getWritable();
        writable.__disclaimer = disclaimer;
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
        return !this.__header && !this.__subheader && !this.__disclaimer && !this.__buttonText && !this.__backgroundImageSrc;
    }

    // should be overridden
    /* c8 ignore next 3 */
    decorate() {
        return '';
    }
}

export const $createSignupNode = (dataset) => {
    return new SignupNode(dataset);
};

export function $isSignupNode(node) {
    return node instanceof SignupNode;
}
