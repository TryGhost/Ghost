import {createCommand} from 'lexical';
import {KoenigDecoratorNode} from '../../KoenigDecoratorNode';
import {SignupParser} from './SignupParser';
import {renderSignupCardToDOM} from './SignupRenderer';

export const INSERT_SIGNUP_COMMAND = createCommand();
const NODE_TYPE = 'signup';

export class SignupNode extends KoenigDecoratorNode {
    // payload properties
    __buttonText;
    __header;
    __subheader;
    __disclaimer;
    __backgroundImageSrc;
    __backgroundColor;
    __buttonColor;
    __labels;

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
            buttonText: self.__buttonText,
            header: self.__header,
            subheader: self.__subheader,
            disclaimer: self.__disclaimer,
            backgroundImageSrc: self.__backgroundImageSrc,
            backgroundColor: self.__backgroundColor,
            buttonColor: self.__buttonColor,
            labels: self.__labels
        };
    }

    constructor({buttonText,
        header,
        subheader,
        disclaimer,
        backgroundImageSrc,
        backgroundColor,
        buttonColor,
        labels} = {}, key) {
        super(key);
        this.__buttonText = buttonText || '';
        this.__header = header || '';
        this.__subheader = subheader || '';
        this.__disclaimer = disclaimer || '';
        this.__backgroundImageSrc = backgroundImageSrc || '';
        this.__backgroundColor = backgroundColor || '';
        this.__buttonColor = buttonColor || '';
        this.__labels = labels || [];
    }

    exportDOM(options = {}) {
        const element = renderSignupCardToDOM(this, options);
        return {
            element,
            type: 'inner'
        };
    }

    static importJSON(serializedNode) {
        const {buttonText, header, subheader, disclaimer, backgroundImageSrc, backgroundColor, buttonColor, labels} = serializedNode;
        const node = new this({
            buttonText,
            header,
            subheader,
            disclaimer,
            backgroundImageSrc,
            backgroundColor,
            buttonColor,
            labels
        });
        return node;
    }

    static importDOM() {
        const parser = new SignupParser(this);
        return parser.DOMConversionMap;
    }

    exportJSON() {
        const dataset = {
            type: NODE_TYPE,
            version: 1,
            buttonText: this.getButtonText(),
            header: this.getHeader(),
            subheader: this.getSubheader(),
            disclaimer: this.getDisclaimer(),
            backgroundImageSrc: this.getBackgroundImageSrc(),
            backgroundColor: this.getBackgroundColor(),
            buttonColor: this.getButtonColor(),
            labels: this.getLabels()
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

    getBackgroundColor() {
        const self = this.getLatest();
        return self.__backgroundColor;
    }

    setBackgroundColor(backgroundColor) {
        const writable = this.getWritable();
        writable.__backgroundColor = backgroundColor;
    }

    getButtonColor() {
        const self = this.getLatest();
        return self.__buttonColor;
    }

    setButtonColor(buttonColor) {
        const writable = this.getWritable();
        writable.__buttonColor = buttonColor;
    }

    getLabels() {
        const self = this.getLatest();
        return self.__labels;
    }

    setLabels(labels) {
        if (!Array.isArray(labels) || !labels.every(item => typeof item === 'string')) {
            throw new Error('Invalid argument: Expected an array of strings.'); // eslint-disable-line
        }

        const writable = this.getWritable();
        writable.__labels = labels;
    }

    addLabel(label) {
        const writable = this.getWritable();
        writable.__labels.push(label);
    }

    removeLabel(label) {
        const writable = this.getWritable();
        writable.__labels = writable.__labels.filter(l => l !== label);
    }

    hasEditMode() {
        return true;
    }

    isEmpty() {
        return !this.__header && !this.__subheader && !this.__disclaimer && !this.__buttonText && !this.__backgroundImageSrc && !this.__backgroundColor;
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
