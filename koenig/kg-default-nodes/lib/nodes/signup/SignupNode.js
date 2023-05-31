import {createCommand} from 'lexical';
import {KoenigDecoratorNode} from '../../KoenigDecoratorNode';
import {SignupParser} from './SignupParser';
import {renderSignupCardToDOM} from './SignupRenderer';

export const INSERT_SIGNUP_COMMAND = createCommand();
const NODE_TYPE = 'signup';

export class SignupNode extends KoenigDecoratorNode {
    // payload properties
    __alignment;
    __backgroundColor;
    __backgroundImageSrc;
    __textColor;
    __buttonColor;
    __buttonText;
    __buttonTextColor;
    __disclaimer;
    __header;
    __labels;
    __layout;
    __subheader;
    __successMessage;
    __swapped;

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
            disclaimer: 'html',
            header: 'html',
            subheader: 'html'
        };
    }

    getDataset() {
        const self = this.getLatest();
        return {
            alignment: self.__alignment,
            backgroundColor: self.__backgroundColor,
            backgroundImageSrc: self.__backgroundImageSrc,
            textColor: self.__textColor,
            buttonColor: self.__buttonColor,
            buttonText: self.__buttonText,
            buttonTextColor: self.__buttonTextColor,
            disclaimer: self.__disclaimer,
            header: self.__header,
            labels: self.__labels,
            layout: self.__layout,
            subheader: self.__subheader,
            successMessage: self.__successMessage,
            swapped: self.__swapped
        };
    }

    constructor({alignment,
        backgroundColor,
        backgroundImageSrc,
        textColor,
        buttonColor,
        buttonTextColor,
        buttonText,
        disclaimer,
        header,
        labels,
        layout,
        subheader,
        swapped,
        successMessage} = {}, key) {
        super(key);
        this.__alignment = alignment || 'left';
        this.__backgroundColor = backgroundColor || '#F0F0F0';
        this.__backgroundImageSrc = backgroundImageSrc || '';
        this.__textColor = textColor || (backgroundColor === 'transparent' ? '' : '#000000');
        this.__buttonColor = buttonColor || 'accent';
        this.__buttonTextColor = buttonTextColor || '#FFFFFF';
        this.__buttonText = buttonText || '';
        this.__disclaimer = disclaimer || '';
        this.__header = header || '';
        this.__labels = labels || [];
        this.__layout = layout || 'wide';
        this.__subheader = subheader || '';
        this.__successMessage = successMessage || 'Email sent! Check your inbox to complete your signup.';
        this.__swapped = swapped || false;
    }

    exportDOM(options = {}) {
        const element = renderSignupCardToDOM(this, options);
        return {element};
    }

    static importJSON(serializedNode) {
        const {alignment,
            backgroundColor,
            backgroundImageSrc,
            textColor,
            buttonColor,
            buttonTextColor,
            buttonText,
            disclaimer,
            header,
            labels,
            layout,
            subheader,
            swapped,
            successMessage} = serializedNode;
        const node = new this({
            alignment,
            backgroundColor,
            backgroundImageSrc,
            textColor,
            buttonColor,
            buttonTextColor,
            buttonText,
            disclaimer,
            header,
            labels,
            layout,
            subheader,
            successMessage,
            swapped
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
            alignment: this.getAlignment(),
            backgroundColor: this.getBackgroundColor(),
            backgroundImageSrc: this.getBackgroundImageSrc(),
            textColor: this.getTextColor(),
            buttonColor: this.getButtonColor(),
            buttonTextColor: this.getButtonTextColor(),
            buttonText: this.getButtonText(),
            disclaimer: this.getDisclaimer(),
            header: this.getHeader(),
            labels: this.getLabels(),
            layout: this.getLayout(),
            subheader: this.getSubheader(),
            successMessage: this.getSuccessMessage(),
            swapped: this.getSwapped()
        };
        return dataset;
    }

    getAlignment() {
        const self = this.getLatest();
        return self.__alignment;
    }

    setAlignment(alignment) {
        const writable = this.getWritable();
        writable.__alignment = alignment;
    }

    getBackgroundColor() {
        const self = this.getLatest();
        return self.__backgroundColor;
    }

    setBackgroundColor(backgroundColor) {
        const writable = this.getWritable();
        writable.__backgroundColor = backgroundColor;
    }

    getBackgroundImageSrc() {
        const self = this.getLatest();
        return self.__backgroundImageSrc;
    }

    setBackgroundImageSrc(backgroundImageSrc) {
        const writable = this.getWritable();
        writable.__backgroundImageSrc = backgroundImageSrc;
    }

    getTextColor() {
        const self = this.getLatest();
        return self.__textColor;
    }

    setTextColor(textColor) {
        const writable = this.getWritable();
        writable.__textColor = textColor;
    }

    getButtonColor() {
        const self = this.getLatest();
        return self.__buttonColor;
    }

    setButtonColor(buttonColor) {
        const writable = this.getWritable();
        writable.__buttonColor = buttonColor;
    }

    getButtonTextColor() {
        const self = this.getLatest();
        return self.__buttonTextColor;
    }

    setButtonTextColor(buttonTextColor) {
        const writable = this.getWritable();
        writable.__buttonTextColor = buttonTextColor;
    }

    getButtonText() {
        const self = this.getLatest();
        return self.__buttonText;
    }

    setButtonText(buttonText) {
        const writable = this.getWritable();
        writable.__buttonText = buttonText;
    }

    getDisclaimer() {
        const self = this.getLatest();
        return self.__disclaimer;
    }

    setDisclaimer(disclaimer) {
        const writable = this.getWritable();
        writable.__disclaimer = disclaimer;
    }

    getHeader() {
        const self = this.getLatest();
        return self.__header;
    }

    setHeader(header) {
        const writable = this.getWritable();
        writable.__header = header;
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

    getLayout() {
        const self = this.getLatest();
        return self.__layout;
    }

    setLayout(layout) {
        const writable = this.getWritable();
        writable.__layout = layout;
    }

    getSubheader() {
        const self = this.getLatest();
        return self.__subheader;
    }

    setSubheader(subheader) {
        const writable = this.getWritable();
        writable.__subheader = subheader;
    }

    getSuccessMessage() {
        const self = this.getLatest();
        return self.__successMessage;
    }

    setSuccessMessage(successMessage) {
        const writable = this.getWritable();
        writable.__successMessage = successMessage;
    }

    getSwapped() {
        const self = this.getLatest();
        return self.__swapped;
    }

    setSwapped(swapped) {
        const writable = this.getWritable();
        writable.__swapped = swapped;
    }

    hasEditMode() {
        return true;
    }

    isEmpty() {
        return !this.__backgroundColor &&
            !this.__backgroundImageSrc &&
            !this.__buttonColor &&
            !this.__buttonText &&
            !this.__disclaimer &&
            !this.__header &&
            !this.__labels.length &&
            !this.__subheader &&
            !this.__successMessage;
    }
}

export const $createSignupNode = (dataset) => {
    return new SignupNode(dataset);
};

export function $isSignupNode(node) {
    return node instanceof SignupNode;
}
