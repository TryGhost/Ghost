import {generateDecoratorNode, type DecoratorNodeData, type DecoratorNodeProperty, type DecoratorNodeValueMap} from '../../generate-decorator-node.js';
import {renderEmailCtaNode} from './email-cta-renderer.js';

const emailCtaProperties = [
    {name: 'alignment', default: 'left'},
    {name: 'buttonText', default: ''},
    {name: 'buttonUrl', default: '', urlType: 'url'},
    {name: 'html', default: '', urlType: 'html'},
    {name: 'segment', default: 'status:free'},
    {name: 'showButton', default: false},
    {name: 'showDividers', default: true}
] as const satisfies readonly DecoratorNodeProperty[];

export type EmailCtaData = DecoratorNodeData<typeof emailCtaProperties>;

export interface EmailCtaNode extends DecoratorNodeValueMap<typeof emailCtaProperties> {}

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
