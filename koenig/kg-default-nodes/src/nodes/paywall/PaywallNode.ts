import {generateDecoratorNode, type DecoratorNodeData, type DecoratorNodeProperty} from '../../generate-decorator-node.js';
import {parsePaywallNode} from './paywall-parser.js';
import {renderPaywallNode} from './paywall-renderer.js';

// The paywall presents a fully customisable, card-shaped call to action
// (title, body, button, colours, alignment) between the "public preview" and
// "members-only" dividers. It intentionally has no image, sponsor label or
// per-card visibility — visibility is driven by the paywall split itself.
//
// `variants` is a prototype-only field: a JSON string mapping each
// `${platform}:${audience}` permutation to its own content, so per-tab edits
// survive serialization/reload without a production-grade schema. The top-level
// content fields mirror the currently-active permutation.
const paywallProperties = [
    {name: 'alignment', default: 'left'},
    {name: 'heading', default: '', wordCount: true},
    {name: 'textValue', default: '', wordCount: true},
    {name: 'showButton', default: true},
    {name: 'buttonText', default: 'Subscribe'},
    {name: 'buttonUrl', default: '#/portal/signup'},
    {name: 'buttonColor', default: '#000000'},
    {name: 'buttonTextColor', default: '#ffffff'},
    {name: 'backgroundColor', default: 'grey'},
    {name: 'linkColor', default: 'text'},
    {name: 'variants', default: ''}
] as const satisfies readonly DecoratorNodeProperty[];

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
