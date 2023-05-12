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
    __buttonColor;
    __buttonText;
    __disclaimer;
    __header;
    __labels;
    __layout;
    __subheader;

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
            buttonColor: self.__buttonColor,
            buttonText: self.__buttonText,
            disclaimer: self.__disclaimer,
            header: self.__header,
            labels: self.__labels,
            layout: self.__layout,
            subheader: self.__subheader
        };
    }

    constructor({alignment,
        backgroundColor,
        backgroundImageSrc,
        buttonColor,
        buttonText,
        disclaimer,
        header,
        labels,
        layout,
        subheader} = {}, key) {
        super(key);
        this.__alignment = alignment || 'center';
        this.__backgroundColor = backgroundColor || '';
        this.__backgroundImageSrc = backgroundImageSrc || '';
        this.__buttonColor = buttonColor || '';
        this.__buttonText = buttonText || '';
        this.__disclaimer = disclaimer || '';
        this.__header = header || '';
        this.__labels = labels || [];
        this.__layout = layout || 'regular';
        this.__subheader = subheader || '';
    }

    exportDOM(options = {}) {
        const element = renderSignupCardToDOM(this, options);
        return {
            element,
            type: 'inner'
        };
    }

    static importJSON(serializedNode) {
        const {alignment,
            backgroundColor,
            backgroundImageSrc,
            buttonColor,
            buttonText,
            disclaimer,
            header,
            labels,
            layout,
            subheader} = serializedNode;
        const node = new this({
            alignment,
            backgroundColor,
            backgroundImageSrc,
            buttonColor,
            buttonText,
            disclaimer,
            header,
            labels,
            layout,
            subheader
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
            buttonColor: this.getButtonColor(),
            buttonText: this.getButtonText(),
            disclaimer: this.getDisclaimer(),
            header: this.getHeader(),
            labels: this.getLabels(),
            layout: this.getLayout(),
            subheader: this.getSubheader()
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
    /* c8 ignore stop */

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

    getButtonColor() {
        const self = this.getLatest();
        return self.__buttonColor;
    }

    setButtonColor(buttonColor) {
        const writable = this.getWritable();
        writable.__buttonColor = buttonColor;
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
            !this.__subheader;
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
