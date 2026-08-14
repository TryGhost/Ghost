import {generateDecoratorNode, type DecoratorNodeData, type DecoratorNodeProperty} from '../../generate-decorator-node.js';
import {parsePaywallNode} from './paywall-parser.js';
import {renderPaywallNode} from './paywall-renderer.js';

const paywallProperties = [] as const satisfies readonly DecoratorNodeProperty[];

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
