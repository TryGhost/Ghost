import {generateDecoratorNode, type DecoratorNodeData, type DecoratorNodeProperty, type DecoratorNodeValueMap} from '../../generate-decorator-node.js';
import {renderEmailNode} from './email-renderer.js';

const emailProperties = [
    {name: 'html', default: '', urlType: 'html'}
] as const satisfies readonly DecoratorNodeProperty[];

export type EmailData = DecoratorNodeData<typeof emailProperties>;

export interface EmailNode extends DecoratorNodeValueMap<typeof emailProperties> {}

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
