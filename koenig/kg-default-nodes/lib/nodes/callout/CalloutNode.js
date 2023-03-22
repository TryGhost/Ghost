import {createCommand} from 'lexical';
import {KoenigDecoratorNode} from '../../KoenigDecoratorNode';
import {renderCalloutNodeToDOM} from './CalloutRenderer';
import {CalloutParser} from './CalloutParser';

export const INSERT_CALLOUT_COMMAND = createCommand();
const NODE_TYPE = 'callout';

export class CalloutNode extends KoenigDecoratorNode {
    // payload properties
    __text;
    __hasEmoji;
    __emojiValue;
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
            text: self.__text,
            hasEmoji: self.__hasEmoji,
            emojiValue: self.__emojiValue,
            backgroundColor: self.__backgroundColor
        };
    }

    constructor({text, hasEmoji = true, emojiValue, backgroundColor} = {}, key) {
        super(key);
        this.__text = text || '';
        this.__hasEmoji = hasEmoji;
        this.__emojiValue = emojiValue || '💡';
        this.__backgroundColor = backgroundColor || 'blue';
    }

    static importJSON(serializedNode) {
        const {text, hasEmoji, backgroundColor, emojiValue} = serializedNode;
        return new this({
            text,
            hasEmoji,
            emojiValue,
            backgroundColor
        });
    }

    exportJSON() {
        const dataset = {
            type: NODE_TYPE,
            version: 1,
            text: this.getText(),
            hasEmoji: this.__hasEmoji,
            emojiValue: this.__emojiValue,
            backgroundColor: this.__backgroundColor
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

    getText() {
        const self = this.getLatest();
        return self.__text;
    }

    setText(text) {
        const writeable = this.getWritable();
        writeable.__text = text;
    }

    getBackgroundColor() {
        const self = this.getLatest();
        return self.__backgroundColor;
    }

    setBackgroundColor(color) {
        const writeable = this.getWritable();
        writeable.__backgroundColor = color;
    }

    getHasEmoji() {
        const self = this.getLatest();
        return self.__hasEmoji;
    }

    setHasEmoji(hasEmoji) {
        const writeable = this.getWritable();
        writeable.__hasEmoji = hasEmoji;
    }

    getEmojiValue() {
        const self = this.getLatest();
        return self.__emojiValue;
    }

    setEmojiValue(emojiValue) {
        const writeable = this.getWritable();
        writeable.__emojiValue = emojiValue;
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
