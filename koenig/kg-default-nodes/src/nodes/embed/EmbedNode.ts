import {generateDecoratorNode, type DecoratorNodeData, type DecoratorNodeProperty, type DecoratorNodeValueMap} from '../../generate-decorator-node.js';
import {parseEmbedNode} from './embed-parser.js';
import {renderEmbedNode} from './embed-renderer.js';

const embedProperties = [
    {name: 'url', default: '', urlType: 'url'},
    {name: 'embedType', default: ''},
    {name: 'html', default: ''},
    {
        name: 'metadata',
        get default() {
            return {} as Record<string, unknown>;
        }
    },
    {name: 'caption', default: '', wordCount: true}
] as const satisfies readonly DecoratorNodeProperty[];

export type EmbedData = DecoratorNodeData<typeof embedProperties>;

export interface EmbedNode extends DecoratorNodeValueMap<typeof embedProperties> {}

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
