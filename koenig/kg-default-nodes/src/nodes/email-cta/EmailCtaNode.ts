import {generateDecoratorNode, type DecoratorNodeData, type DecoratorNodePropertyMap} from '../../generate-decorator-node.js';
import {renderEmailCtaNode} from './email-cta-renderer.js';

const emailCtaProperties = {
    alignment: {default: 'left'},
    buttonText: {default: ''},
    buttonUrl: {default: '', urlType: 'url'},
    html: {default: '', urlType: 'html'},
    segment: {default: 'status:free'},
    showButton: {default: false},
    showDividers: {default: true}
} satisfies DecoratorNodePropertyMap;

export type EmailCtaData = DecoratorNodeData<typeof emailCtaProperties>;

export class EmailCtaNode extends generateDecoratorNode({
    nodeType: 'email-cta',
    properties: emailCtaProperties,
    defaultRenderFn: renderEmailCtaNode
}) {
}

export const $createEmailCtaNode = (dataset: EmailCtaData = {}) => {
    return new EmailCtaNode(dataset);
};

export function $isEmailCtaNode(node: unknown): node is EmailCtaNode {
    return node instanceof EmailCtaNode;
}
