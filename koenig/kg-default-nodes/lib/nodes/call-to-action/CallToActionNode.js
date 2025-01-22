// eslint-disable-next-line ghost/filenames/match-exported-class
import {generateDecoratorNode} from '../../generate-decorator-node';

export class CallToActionNode extends generateDecoratorNode({nodeType: 'call-to-action',
    properties: [
        {name: 'layout', default: 'immersive'},
        {name: 'textValue', default: '', wordCount: true},
        {name: 'showButton', default: false},
        {name: 'buttonText', default: ''},
        {name: 'buttonUrl', default: ''},
        {name: 'hasSponsorLabel', default: false},
        {name: 'hasBackground', default: false},
        {name: 'backgroundColor', default: '#123456'},
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
        hasSponsorLabel,
        hasBackground,
        backgroundColor,
        hasImage,
        imageUrl
    } = {}, key) {
        super(key);
        this.__layout = layout || 'immersive';
        this.__textValue = textValue || '';
        this.__showButton = showButton || false;
        this.__buttonText = buttonText || '';
        this.__buttonUrl = buttonUrl || '';
        this.__hasSponsorLabel = hasSponsorLabel || false;
        this.__hasBackground = hasBackground || false;
        this.__backgroundColor = backgroundColor || '#123456';
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
