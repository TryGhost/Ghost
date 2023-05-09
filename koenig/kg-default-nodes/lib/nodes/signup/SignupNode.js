import {createCommand} from 'lexical';
import {KoenigDecoratorNode} from '../../KoenigDecoratorNode';
import {renderSignupCardToDOM} from './SignupRenderer';

export const INSERT_HTML_COMMAND = createCommand();

export class SignupNode extends KoenigDecoratorNode {
    static getType() {
        return 'signup';
    }

    // used by `@tryghost/url-utils` to transform URLs contained in the serialized JSON
    static get urlTransformMap() {
        return {
            html: 'html'
        };
    }

    exportJSON() {
        return {
            type: 'signup',
            version: 1
        };
    }

    exportDOM(options = {}) {
        const element = renderSignupCardToDOM(this, options);
        return {
            element,
            type: 'inner'
        };
    }

    /* c8 ignore start */
    createDOM() {
        const element = document.createElement('div');
        return element;
    }

    updateDOM() {
        return false;
    }

    isInline() {
        return false;
    }
    /* c8 ignore stop */

    // should be overwritten
    /* c8 ignore next 3 */
    decorate() {
        return '';
    }

    hasEditMode() {
        return true;
    }
}

export function $createSignupNode(dataset) {
    return new SignupNode(dataset);
}

export function $isSignupNode(node) {
    return node instanceof SignupNode;
}
