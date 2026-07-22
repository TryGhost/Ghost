import {generateDecoratorNode, type DecoratorNodeData, type DecoratorNodePropertyMap} from '../../generate-decorator-node.js';
import {renderMarkdownNode} from './markdown-renderer.js';

const markdownProperties = {
    markdown: {default: '', urlType: 'markdown', wordCount: true}
} satisfies DecoratorNodePropertyMap;

export type MarkdownData = DecoratorNodeData<typeof markdownProperties>;

export class MarkdownNode extends generateDecoratorNode({
    nodeType: 'markdown',
    properties: markdownProperties,
    defaultRenderFn: renderMarkdownNode
}) {
    isEmpty() {
        return !this.__markdown;
    }
}

export function $createMarkdownNode(dataset: MarkdownData = {}) {
    return new MarkdownNode(dataset);
}

export function $isMarkdownNode(node: unknown): node is MarkdownNode {
    return node instanceof MarkdownNode;
}
