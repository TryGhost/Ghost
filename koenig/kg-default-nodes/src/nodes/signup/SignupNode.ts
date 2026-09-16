import {signupParser} from './signup-parser.js';
import {renderSignupCardToDOM} from './signup-renderer.js';
import {generateDecoratorNode, type DecoratorNodeData, type DecoratorNodePropertyMap} from '../../generate-decorator-node.js';

const signupProperties = {
    alignment: {default: 'left'},
    backgroundColor: {default: '#F0F0F0'},
    backgroundImageSrc: {default: ''},
    backgroundSize: {default: 'cover'},
    textColor: {default: ''},
    buttonColor: {default: 'accent'},
    buttonTextColor: {default: '#FFFFFF'},
    buttonText: {default: 'Subscribe'},
    disclaimer: {default: '', wordCount: true},
    header: {default: '', wordCount: true},
    layout: {default: 'wide'},
    subheader: {default: '', wordCount: true},
    successMessage: {default: 'Email sent! Check your inbox to complete your signup.'},
    swapped: {default: false}
} satisfies DecoratorNodePropertyMap;

export type SignupData = DecoratorNodeData<typeof signupProperties> & {labels?: string[]};

export class SignupNode extends generateDecoratorNode({
    nodeType: 'signup',
    properties: signupProperties,
    defaultRenderFn: renderSignupCardToDOM
}) {
    /* override */
    constructor({alignment, backgroundColor, backgroundImageSrc, backgroundSize, textColor, buttonColor, buttonTextColor, buttonText, disclaimer, header, labels, layout, subheader, successMessage, swapped} : SignupData = {}, key?: string) {
        super({}, key);
        this.__alignment = alignment || 'left';
        this.__backgroundColor = backgroundColor || '#F0F0F0';
        this.__backgroundImageSrc = backgroundImageSrc || '';
        this.__backgroundSize = backgroundSize || 'cover';
        this.__textColor = (backgroundColor === 'transparent' && (layout === 'split' || !backgroundImageSrc)) ? '' : textColor || '#000000'; // text color should inherit with a transparent bg color unless we're using an image for the background (which supercedes the bg color)
        this.__buttonColor = buttonColor || 'accent';
        this.__buttonTextColor = buttonTextColor || '#FFFFFF';
        this.__buttonText = buttonText || 'Subscribe';
        this.__disclaimer = disclaimer || '';
        this.__header = header || '';
        this.__labels = labels ? [...labels] : [];
        this.__layout = layout || 'wide';
        this.__subheader = subheader || '';
        this.__successMessage = successMessage || 'Email sent! Check your inbox to complete your signup.';
        this.__swapped = swapped || false;
    }

    static importDOM() {
        return signupParser(this);
    }

    static getPropertyDefaults() {
        return {
            ...super.getPropertyDefaults(),
            labels: [] as string[]
        };
    }

    static importJSON(serializedNode: Record<string, unknown>) {
        return new this(serializedNode as SignupData);
    }

    get labels() {
        const self = this.getLatest();
        return [...(self.__labels as string[])];
    }

    getDataset() {
        return {
            ...super.getDataset(),
            labels: this.labels
        };
    }

    exportJSON() {
        return {
            ...super.exportJSON(),
            labels: this.labels
        };
    }

    // keeping some custom methods for labels as it requires some special handling

    setLabels(labels: string[]) {
        if (!Array.isArray(labels) || !labels.every(item => typeof item === 'string')) {
            throw new Error('Invalid argument: Expected an array of strings.');
        }

        const writable = this.getWritable();
        writable.__labels = [...labels];
    }

    addLabel(label: string) {
        if (typeof label !== 'string') {
            throw new Error('Invalid argument: Expected a string.');
        }

        const writable = this.getWritable();
        (writable.__labels as string[]).push(label);
    }

    removeLabel(label: string) {
        if (typeof label !== 'string') {
            throw new Error('Invalid argument: Expected a string.');
        }

        const writable = this.getWritable();
        writable.__labels = (writable.__labels as string[]).filter((l: string) => l !== label);
    }
}

export const $createSignupNode = (dataset?: SignupData) => {
    return new SignupNode(dataset);
};

export function $isSignupNode(node: unknown): node is SignupNode {
    return node instanceof SignupNode;
}
