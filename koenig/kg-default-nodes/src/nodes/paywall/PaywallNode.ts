import {generateDecoratorNode, type DecoratorNodeData, type DecoratorNodePropertyMap} from '../../generate-decorator-node.js';
import {parsePaywallNode} from './paywall-parser.js';
import {renderPaywallNode} from './paywall-renderer.js';

const paywallProperties = {
    // which non-access groups receive the preview by email: 'all' = everyone
    // without access, '' = nobody, or a CSV of member segments
    previewEmailTo: {default: 'all'},
    // per-post overrides of what the upgrade prompt shows, one dataset per
    // channel: {image, imageBottom, imageSmall, heading, description,
    // buttonText, buttonUrl, backgroundColor, buttonColor}. Each channel has a
    // site-wide default, so an empty dataset means "render the default" —
    // which makes "reset to default" a deletion, not a copy
    webCta: {default: {}},
    emailCta: {default: {}}
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
