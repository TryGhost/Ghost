import {createCommand} from 'lexical';
import {KoenigDecoratorNode} from '../../KoenigDecoratorNode';
import {PaywallParser} from './PaywallParser';
import {renderPaywallNodeToDOM} from './PaywallRenderer';

export const INSERT_PAYWALL_COMMAND = createCommand();
const NODE_TYPE = 'paywall';

export class PaywallNode extends KoenigDecoratorNode {
    static getType() {
        return NODE_TYPE;
    }

    static clone(node) {
        return new this(
            node.__key
        );
    }

    static get urlTransformMap() {
        return {};
    }

    constructor(key) {
        super(key);
    }

    static importJSON() {
        const node = new this();
        return node;
    }

    exportJSON() {
        const dataset = {
            type: NODE_TYPE,
            version: 1
        };
        return dataset;
    }

    static importDOM() {
        const parser = new PaywallParser(this);
        return parser.DOMConversionMap;
    }

    exportDOM(options = {}) {
        const element = renderPaywallNodeToDOM(this, options);
        return {element, type: 'inner'};
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

    // should be overridden
    /* c8 ignore next 3 */
    decorate() {
        return '';
    }
}

export const $createPaywallNode = (dataset) => {
    return new PaywallNode(dataset);
};

export function $isPaywallNode(node) {
    return node instanceof PaywallNode;
}
