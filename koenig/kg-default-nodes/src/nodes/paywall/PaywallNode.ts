import {generateDecoratorNode, type DecoratorNodeData, type DecoratorNodePropertyMap} from '../../generate-decorator-node.js';
import {parsePaywallNode} from './paywall-parser.js';
import {renderPaywallNode} from './paywall-renderer.js';

// Empty strings mean "use Ghost's default paywall copy"; the editor's
// customise modal writes overrides here so they travel with the post
const paywallProperties = {
    webHeading: {default: ''},
    webDescription: {default: ''},
    webButtonText: {default: ''},
    webButtonUrl: {default: '', urlType: 'url'},
    emailHeading: {default: ''},
    emailDescription: {default: ''},
    emailButtonText: {default: ''},
    emailButtonUrl: {default: '', urlType: 'url'}
} satisfies DecoratorNodePropertyMap;

export type PaywallData = DecoratorNodeData<typeof paywallProperties>;

export class PaywallNode extends generateDecoratorNode({
    nodeType: 'paywall',
    properties: paywallProperties,
    defaultRenderFn: renderPaywallNode
}) {
    static importDOM() {
        return parsePaywallNode(this);
    }
}

export const $createPaywallNode = (dataset: PaywallData = {}) => {
    return new PaywallNode(dataset);
};

export function $isPaywallNode(node: unknown): node is PaywallNode {
    return node instanceof PaywallNode;
}
