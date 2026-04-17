import {generateDecoratorNode, type DecoratorNodeData, type DecoratorNodeProperty, type DecoratorNodeValueMap} from '../../generate-decorator-node.js';
import {parseButtonNode} from './button-parser.js';
import {renderButtonNode} from './button-renderer.js';

const buttonProperties = [
    {name: 'buttonText', default: ''},
    {name: 'alignment', default: 'center'},
    {name: 'buttonUrl', default: '', urlType: 'url'}
] as const satisfies readonly DecoratorNodeProperty[];

export type ButtonData = DecoratorNodeData<typeof buttonProperties>;

export interface ButtonNode extends DecoratorNodeValueMap<typeof buttonProperties> {}

export class ButtonNode extends generateDecoratorNode({
    nodeType: 'button',
    properties: buttonProperties,
    defaultRenderFn: renderButtonNode
}) {
    static importDOM() {
        return parseButtonNode(this);
    }
}

export const $createButtonNode = (dataset: ButtonData = {}) => {
    return new ButtonNode(dataset);
};

export function $isButtonNode(node: unknown): node is ButtonNode {
    return node instanceof ButtonNode;
}
