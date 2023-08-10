/* eslint-disable ghost/filenames/match-exported-class */
import {signupParser} from './signup-parser';
import {renderSignupCardToDOM} from './signup-renderer';
import {generateDecoratorNode} from '../../generate-decorator-node';

export class SignupNode extends generateDecoratorNode({nodeType: 'signup',
    properties: [
        {name: 'alignment', default: 'left'},
        {name: 'backgroundColor', default: '#F0F0F0'},
        {name: 'backgroundImageSrc', default: ''},
        {name: 'backgroundSize', default: 'cover'},
        {name: 'textColor', default: '#000000'},
        {name: 'buttonColor', default: 'accent'},
        {name: 'buttonTextColor', default: '#FFFFFF'},
        {name: 'buttonText', default: 'Subscribe'},
        {name: 'disclaimer', default: '', wordCount: true},
        {name: 'header', default: '', wordCount: true},
        {name: 'labels', default: []},
        {name: 'layout', default: 'wide'},
        {name: 'subheader', default: '', wordCount: true},
        {name: 'successMessage', default: 'Email sent! Check your inbox to complete your signup.'},
        {name: 'swapped', default: false}
    ]}) {
    static importDOM() {
        return signupParser(this);
    }

    exportDOM(options = {}) {
        return renderSignupCardToDOM(this, options);
    }

    // keeping some custom methods for labels as it requires some special handling

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
}

export const $createSignupNode = (dataset) => {
    return new SignupNode(dataset);
};

export function $isSignupNode(node) {
    return node instanceof SignupNode;
}
