import {generateDecoratorNode, type DecoratorNodeData, type DecoratorNodePropertyMap} from '../../generate-decorator-node.js';
import {renderEmailNode} from './email-renderer.js';

const emailProperties = {
    html: {default: '', urlType: 'html'}
} satisfies DecoratorNodePropertyMap;

export type EmailData = DecoratorNodeData<typeof emailProperties>;

export class EmailNode extends generateDecoratorNode({
    nodeType: 'email',
    properties: emailProperties,
    defaultRenderFn: renderEmailNode
}) {
}

export const $createEmailNode = (dataset: EmailData = {}) => {
    return new EmailNode(dataset);
};

export function $isEmailNode(node: unknown): node is EmailNode {
    return node instanceof EmailNode;
}
