import {signupParser} from './signup-parser.js';
import {renderSignupCardToDOM} from './signup-renderer.js';
import {generateDecoratorNode, type DecoratorNodeProperty} from '../../generate-decorator-node.js';

export interface SignupData {
    alignment?: string;
    backgroundColor?: string;
    backgroundImageSrc?: string;
    backgroundSize?: string;
    textColor?: string;
    buttonColor?: string;
    buttonTextColor?: string;
    buttonText?: string;
    disclaimer?: string;
    header?: string;
    labels?: string[];
    layout?: string;
    subheader?: string;
    successMessage?: string;
    swapped?: boolean;
}

export interface SignupNode {
    alignment: string;
    backgroundColor: string;
    backgroundImageSrc: string;
    backgroundSize: string;
    textColor: string;
    buttonColor: string;
    buttonTextColor: string;
    buttonText: string;
    disclaimer: string;
    header: string;
    layout: string;
    subheader: string;
    successMessage: string;
    swapped: boolean;
}

const signupProperties = [
    {name: 'alignment', default: 'left'},
    {name: 'backgroundColor', default: '#F0F0F0'},
    {name: 'backgroundImageSrc', default: ''},
    {name: 'backgroundSize', default: 'cover'},
    {name: 'textColor', default: ''},
    {name: 'buttonColor', default: 'accent'},
    {name: 'buttonTextColor', default: '#FFFFFF'},
    {name: 'buttonText', default: 'Subscribe'},
    {name: 'disclaimer', default: '', wordCount: true},
    {name: 'header', default: '', wordCount: true},
    {name: 'layout', default: 'wide'},
    {name: 'subheader', default: '', wordCount: true},
    {name: 'successMessage', default: 'Email sent! Check your inbox to complete your signup.'},
    {name: 'swapped', default: false}
] as const satisfies readonly DecoratorNodeProperty[];

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
