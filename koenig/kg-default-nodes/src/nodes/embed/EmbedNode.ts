import {generateDecoratorNode, type DecoratorNodeData, type DecoratorNodePropertyMap} from '../../generate-decorator-node.js';
import {parseEmbedNode} from './embed-parser.js';
import {renderEmbedNode} from './embed-renderer.js';

const embedProperties = {
    url: {default: '', urlType: 'url'},
    embedType: {default: ''},
    html: {default: ''},
    metadata: {
        get default() {
            return {} as Record<string, unknown>;
        }
    },
    caption: {default: '', wordCount: true}
} satisfies DecoratorNodePropertyMap;

export type EmbedData = DecoratorNodeData<typeof embedProperties>;

export class EmbedNode extends generateDecoratorNode({
    nodeType: 'embed',
    properties: embedProperties,
    defaultRenderFn: renderEmbedNode
}) {
    static importDOM() {
        return parseEmbedNode(this);
    }

    isEmpty() {
        return !this.__url && !this.__html;
    }
}

export const $createEmbedNode = (dataset: EmbedData = {}) => {
    return new EmbedNode(dataset);
};

export function $isEmbedNode(node: unknown): node is EmbedNode {
    return node instanceof EmbedNode;
}
