// eslint-disable-next-line ghost/filenames/match-exported-class
import {generateDecoratorNode} from '../../generate-decorator-node';

export class CallToActionNode extends generateDecoratorNode({nodeType: 'call-to-action',
    properties: [
        {name: 'layout', default: 'minimal'},
        {name: 'textValue', default: '', wordCount: true},
        {name: 'showButton', default: false},
        {name: 'buttonText', default: ''},
        {name: 'buttonUrl', default: ''},
        {name: 'buttonColor', default: ''},
        {name: 'buttonTextColor', default: ''},
        {name: 'hasSponsorLabel', default: false},
        {name: 'hasBackground', default: false},
        {name: 'backgroundColor', default: 'none'},
        {name: 'hasImage', default: false},
        {name: 'imageUrl', default: ''}
    ]}
) {
    /* override */
    constructor({
        layout,
        textValue,
        showButton,
        buttonText,
        buttonUrl,
        buttonColor,
        buttonTextColor,
        hasSponsorLabel,
        hasBackground,
        backgroundColor,
        hasImage,
        imageUrl
    } = {}, key) {
        super(key);
        this.__layout = layout || 'minimal';
        this.__textValue = textValue || '';
        this.__showButton = showButton || false;
        this.__buttonText = buttonText || '';
        this.__buttonUrl = buttonUrl || '';
        this.__buttonColor = buttonColor || 'none';
        this.__buttonTextColor = buttonTextColor || 'none';
        this.__hasSponsorLabel = hasSponsorLabel || false;
        this.__hasBackground = hasBackground || false;
        this.__backgroundColor = backgroundColor || 'none';
        this.__hasImage = hasImage || false;
        this.__imageUrl = imageUrl || '';
    }
}

export const $createCallToActionNode = (dataset) => {
    return new CallToActionNode(dataset);
};

export const $isCallToActionNode = (node) => {
    return node instanceof CallToActionNode;
};
