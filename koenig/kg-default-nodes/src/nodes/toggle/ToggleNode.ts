import {generateDecoratorNode, type DecoratorNodeData, type DecoratorNodePropertyMap} from '../../generate-decorator-node.js';
import {parseToggleNode} from './toggle-parser.js';
import {renderToggleNode} from './toggle-renderer.js';

const toggleProperties = {
    heading: {default: '', urlType: 'html', wordCount: true},
    content: {default: '', urlType: 'html', wordCount: true}
} satisfies DecoratorNodePropertyMap;

export type ToggleData = DecoratorNodeData<typeof toggleProperties>;

export class ToggleNode extends generateDecoratorNode({
    nodeType: 'toggle',
    properties: toggleProperties,
    defaultRenderFn: renderToggleNode
}) {
    static importDOM() {
        return parseToggleNode(this);
    }
}

export const $createToggleNode = (dataset: ToggleData = {}) => {
    return new ToggleNode(dataset);
};

export function $isToggleNode(node: unknown): node is ToggleNode {
    return node instanceof ToggleNode;
}
