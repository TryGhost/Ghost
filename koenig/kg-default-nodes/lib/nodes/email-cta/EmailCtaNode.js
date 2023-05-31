import {createCommand} from 'lexical';
import {KoenigDecoratorNode} from '../../KoenigDecoratorNode';
import {renderEmailCtaNodeToDOM} from './EmailCtaRenderer';

export const INSERT_EMAIL_CTA_COMMAND = createCommand();
const NODE_TYPE = 'email-cta';

export class EmailCtaNode extends KoenigDecoratorNode {
    // payload properties
    __alignment;
    __buttonText;
    __buttonUrl;
    __html;
    __segment;
    __showButton;
    __showDividers;

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
            html: 'html'
        };
    }

    getDataset() {
        const self = this.getLatest();
        return {
            alignment: self.__alignment,
            buttonText: self.__buttonText,
            buttonUrl: self.__buttonUrl,
            html: self.__html,
            segment: self.__segment,
            showButton: self.__showButton,
            showDividers: self.__showDividers
        };
    }

    constructor({alignment, buttonText, buttonUrl, html, segment, showButton, showDividers} = {}, key) {
        super(key);
        this.__alignment = alignment || 'left';
        this.__buttonText = buttonText || '';
        this.__buttonUrl = buttonUrl || '';
        this.__html = html || '';
        this.__segment = segment || 'status:free';
        this.__showButton = showButton || false;
        this.__showDividers = showDividers ?? true;
    }

    static importJSON(serializedNode) {
        const {alignment, buttonText, buttonUrl, html, segment, showButton, showDividers} = serializedNode;
        return new this({
            alignment,
            buttonText,
            buttonUrl,
            html,
            segment,
            showButton,
            showDividers
        });
    }

    exportJSON() {
        const dataset = {
            type: NODE_TYPE,
            version: 1,
            alignment: this.getAlignment(),
            buttonText: this.getButtonText(),
            buttonUrl: this.getButtonUrl(),
            html: this.getHtml(),
            segment: this.getSegment(),
            showButton: this.getShowButton(),
            showDividers: this.getShowDividers()
        };
        return dataset;
    }

    exportDOM(options = {}) {
        const element = renderEmailCtaNodeToDOM(this, options);
        return {element};
    }

    getAlignment() {
        const self = this.getLatest();
        return self.__alignment;
    }

    setAlignment(alignment) {
        const writable = this.getWritable();
        return writable.__alignment = alignment;
    }

    getButtonText() {
        const self = this.getLatest();
        return self.__buttonText;
    }

    setButtonText(buttonText) {
        const writable = this.getWritable();
        return writable.__buttonText = buttonText;
    }

    getButtonUrl() {
        const self = this.getLatest();
        return self.__buttonUrl;
    }

    setButtonUrl(buttonUrl) {
        const writable = this.getWritable();
        return writable.__buttonUrl = buttonUrl;
    }

    getHtml() {
        const self = this.getLatest();
        return self.__html;
    }

    setHtml(html) {
        const writable = this.getWritable();
        return writable.__html = html;
    }

    getSegment() {
        const self = this.getLatest();
        return self.__segment;
    }

    setSegment(segment) {
        const writable = this.getWritable();
        return writable.__segment = segment;
    }

    getShowButton() {
        const self = this.getLatest();
        return self.__showButton;
    }

    setShowButton(showButton) {
        const writable = this.getWritable();
        return writable.__showButton = showButton;
    }

    getShowDividers() {
        const self = this.getLatest();
        return self.__showDividers;
    }

    setShowDividers(showDividers) {
        const writable = this.getWritable();
        return writable.__showDividers = showDividers;
    }

    hasEditMode() {
        return true;
    }

    isEmpty() {
        return !this.__html && (!this.__showButton || (!this.__buttonText && !this.__buttonUrl));
    }
}

export const $createEmailCtaNode = (dataset) => {
    return new EmailCtaNode(dataset);
};

export function $isEmailCtaNode(node) {
    return node instanceof EmailCtaNode;
}
