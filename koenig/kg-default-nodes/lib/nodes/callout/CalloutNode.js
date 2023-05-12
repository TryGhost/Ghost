import {createCommand} from 'lexical';
import {KoenigDecoratorNode} from '../../KoenigDecoratorNode';
import {renderCalloutNodeToDOM} from './CalloutRenderer';
import {CalloutParser} from './CalloutParser';

export const INSERT_CALLOUT_COMMAND = createCommand();
const NODE_TYPE = 'callout';

export class CalloutNode extends KoenigDecoratorNode {
    // payload properties
    __calloutText;
    __calloutEmoji;
    __backgroundColor;

    static getType() {
        return NODE_TYPE;
    }

    static clone(node) {
        return new this(
            node.getDataset(),
            node.__key
        );
    }

    getDataset() {
        const self = this.getLatest();
        return {
            calloutText: self.__calloutText,
            calloutEmoji: self.__calloutEmoji,
            backgroundColor: self.__backgroundColor
        };
    }

    constructor({calloutText, calloutEmoji, backgroundColor} = {}, key) {
        super(key);
        this.__calloutText = calloutText || '';
        this.__calloutEmoji = calloutEmoji || '💡';
        this.__backgroundColor = backgroundColor || 'blue';
    }

    static importJSON(serializedNode) {
        const {calloutText, backgroundColor, calloutEmoji} = serializedNode;
        return new this({
            calloutText,
            calloutEmoji,
            backgroundColor
        });
    }

    exportJSON() {
        const dataset = {
            type: NODE_TYPE,
            version: 1,
            calloutText: this.getCalloutText(),
            calloutEmoji: this.getCalloutEmoji(),
            backgroundColor: this.getBackgroundColor()
        };
        return dataset;
    }

    static importDOM() {
        const parser = new CalloutParser(this);
        return parser.DOMConversionMap;
    }

    exportDOM(options = {}) {
        const element = renderCalloutNodeToDOM(this, options);
        return {element};
    }

    createDom() {
        const element = document.createElement('div');
        return element;
    }

    updateDom() {
        return false;
    }

    isInline() {
        return false;
    }

    getCalloutText() {
        const self = this.getLatest();
        return self.__calloutText;
    }

    setCalloutText(text) {
        const writeable = this.getWritable();
        writeable.__calloutText = text;
    }

    getBackgroundColor() {
        const self = this.getLatest();
        return self.__backgroundColor;
    }

    setBackgroundColor(color) {
        const writeable = this.getWritable();
        writeable.__backgroundColor = color;
    }

    getCalloutEmoji() {
        const self = this.getLatest();
        return self.__calloutEmoji;
    }

    setCalloutEmoji(emoji) {
        const writeable = this.getWritable();
        writeable.__calloutEmoji = emoji;
    }

    decorate() {
        return '';
    }

    hasEditMode() {
        return true;
    }
}

export function $isCalloutNode(node) {
    return node instanceof CalloutNode;
}

export const $createCalloutNode = (dataset) => {
    return new CalloutNode(dataset);
};
